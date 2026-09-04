// PATCH v3 Шаг 2 (рефакторинг §2.5/§3.5): useUploadFlow — вся невизуальная логика
// экрана /upload, вынесенная из старого UploadScreen v2.2.
// Представление (JSX) — в UploadScreen.tsx v3. Старый путь не рендерится вообще.
//
// Покрывает:
// - выбор файла (камера/галерея как источник — для аналитики upload_source)
// - валидация: тип (JPG/PNG/WebP), вес ≤10 МБ, мин. разрешение 1024×768 (§5)
// - uploadPhoto → generateDesign → polling checkGenerationStatus
// - анти-абуз: cached-результат без списания (§7.6 — ошибка не списывает лимит,
//   сервер возвращает failed и мы НЕ трогаем баланс)
// - апсейлы: enhanceHd, makeVariations
// - скачивание/шеринг
// - аналитика §8: upload_start/source/success/error, generation_start/success/error,
//   download, share, refine_tap
import { useState, useEffect, useRef, useCallback } from 'react'
import type { User } from '../types'
import {
  uploadPhoto, generateDesign, checkGenerationStatus,
  enhanceHd, makeVariations, shareResult, logEvent,
} from '../api'

/** §3.6: вариант результата (первичная генерация или вариация) */
export interface Variant {
  url: string
  quality: ResultQuality
  taskId?: string
}

/** §3.6: чипсы уточнения — пока без серверного refine, ведут на вариацию с пометкой */
export const REFINE_CHIPS = [
  { id: 'warm', label: 'Теплее' },
  { id: 'light', label: 'Светлее' },
  { id: 'less_furn', label: 'Меньше мебели' },
  { id: 'floor', label: 'Другой пол' },
  { id: 'keep_furn', label: 'Сохранить мебель' },
] as const

export type FlowStep = 'upload' | 'quality' | 'processing' | 'result'
export type Quality = 'low' | 'medium'
/** Качество результата может стать 'hd' после апсейла */
export type ResultQuality = Quality | 'hd'

const MAX_SIZE = 10 * 1024 * 1024
const MIN_W = 1024
const MIN_H = 768
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const GEN_STEPS = ['Читаю геометрию комнаты', 'Подбираю мебель', 'Рисую свет и тени']

interface Options {
  user: User
  onUserUpdate: (u: User) => void
  jobId: string
  styleId?: string
  directionId?: string
}

export function useUploadFlow({ user, onUserUpdate, jobId, styleId, directionId }: Options) {
  const [step, setStep] = useState<FlowStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileId, setFileId] = useState('')
  const [quality, setQuality] = useState<Quality>('medium')
  const [resultUrl, setResultUrl] = useState('')
  const [resultQuality, setResultQuality] = useState<ResultQuality>('medium')
  const [variants, setVariants] = useState<Variant[]>([])      // §3.6: все варианты (генерация + вариации)
  const [variantIdx, setVariantIdx] = useState(0)              // активный в слайдере
  const [refineTag, setRefineTag] = useState<string | null>(null) // пометка чипа для аналитики
  const [generationId, setGenerationId] = useState<number | null>(null)
  const [chargeLabel, setChargeLabel] = useState('')
  const [progress, setProgress] = useState(8)
  const [genStepIdx, setGenStepIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const objectUrlRef = useRef('')
  // snapshot актуального качества результата для замыкания внутри pollTask
  const resultQualityRef = useRef<ResultQuality>('medium')
  useEffect(() => { resultQualityRef.current = resultQuality }, [resultQuality])

  // Очистка: polling и objectURL
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  // Прогресс-анимация на processing (§ визуал): и проценты, и подписи этапов
  useEffect(() => {
    if (step !== 'processing') return
    const t = setInterval(() => {
      setProgress(p => Math.min(90, p + 3 + Math.random() * 5))
      setGenStepIdx(i => (i + 1) % GEN_STEPS.length)
    }, 1600)
    return () => clearInterval(t)
  }, [step])

  // ===== Аналитика upload_start при входе на шаг =====
  useEffect(() => {
    if (step === 'upload') logEvent(user.telegram_id, 'upload_start', { job_id: jobId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const pollTask = useCallback((taskId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const st = await checkGenerationStatus(taskId)
        if (st.status === 'completed' && st.result_url) {
          clearInterval(pollRef.current!)
          setProgress(100)
          logEvent(user.telegram_id, 'generation_success', {
            task_id: taskId,
            result_variants_count: variants.length + 1,
          })
          setResultUrl(st.result_url)
          setVariants(v => {
            // §3.6: новый вариант в хвост; сбрасываем слайдер на него
            const idx = v.length
            setVariantIdx(idx)
            return [...v, { url: st.result_url!, quality: resultQualityRef.current, taskId }]
          })
          setBusy(false)
          setStep('result')
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        } else if (st.status === 'failed') {
          clearInterval(pollRef.current!)
          // §7.6: техническая ошибка — лимит НЕ списан сервером, просто возвращаемся
          logEvent(user.telegram_id, 'generation_error', { task_id: taskId })
          setError(st.error || 'Ошибка генерации. Кредиты вернутся автоматически')
          setBusy(false)
          setStep('quality')
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
        }
      } catch { /* сеть — ждём следующего тика */ }
    }, 3000)
  }, [user.telegram_id])

  // ===== Выбор файла. source — для аналитики §8 =====
  const pick = useCallback(async (f: File | null | undefined, source: 'camera' | 'gallery') => {
    if (!f) return
    setError('')
    logEvent(user.telegram_id, 'upload_source', { source, job_id: jobId })

    if (!OK_TYPES.includes(f.type)) {
      setError('Поддерживаются JPG, PNG и WebP')
      logEvent(user.telegram_id, 'upload_error', { reason: 'type', job_id: jobId })
      return
    }
    if (f.size > MAX_SIZE) {
      setError('Файл больше 10 МБ')
      logEvent(user.telegram_id, 'upload_error', { reason: 'size', job_id: jobId })
      return
    }

    // §5: минимальное разрешение 1024×768 — проверяем через createImageBitmap
    try {
      const bmp = await createImageBitmap(f)
      const w = bmp.width
      const h = bmp.height
      bmp.close()
      if (w < MIN_W || h < MIN_H) {
        setError(`Минимальное разрешение — ${MIN_W}×${MIN_H}. Снимите ближе или включите полную камеру`)
        logEvent(user.telegram_id, 'upload_error', {
          reason: 'resolution', w, h, job_id: jobId,
        })
        return
      }
    } catch {
      // старый клиент без createImageBitmap — пропускаем проверку, сервер отклонит
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(f)
    objectUrlRef.current = url
    setFile(f)
    setPreviewUrl(url)
    logEvent(user.telegram_id, 'upload_success', { job_id: jobId, size: f.size })
  }, [user.telegram_id, jobId])

  const reset = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = ''
    setFile(null)
    setPreviewUrl('')
    setFileId('')
    setResultUrl('')
    setVariants([])
    setVariantIdx(0)
    setRefineTag(null)
    setGenerationId(null)
    setChargeLabel('')
    setError('')
    setProgress(8)
    setStep('upload')
  }, [])

  // §3.6: переключение между вариантами в результате
  const gotoVariant = useCallback((idx: number) => {
    setVariants(v => {
      const safe = Math.max(0, Math.min(idx, v.length - 1))
      setVariantIdx(safe)
      const vAt = v[safe]
      if (vAt) {
        setResultUrl(vAt.url)
        setResultQuality(vAt.quality)
        logEvent(user.telegram_id, 'variant_swipe', { idx: safe, generation_id: generationId })
      }
      return v
    })
  }, [user.telegram_id, generationId])

  // ===== Генерация =====
  const start = useCallback(async (forcedQuality?: Quality) => {
    if (!file || busy) return
    const q = forcedQuality || quality
    setProgress(8)
    setStep('processing')
    setError('')
    setBusy(true)
    try {
      const up = fileId
        ? { file_id: fileId, phash: '' }
        : await uploadPhoto(user.telegram_id, file)
      setFileId(up.file_id)
      logEvent(user.telegram_id, 'generation_start', { job_id: jobId, quality: q })

      // В старом API направление сада передаётся через style_id:
      // room → выбранный стиль | garden → выбранное направление | прочие задачи → jobId
      const sid = jobId === 'room_design'
        ? (styleId || 'modern')
        : jobId === 'garden'
          ? (directionId || 'garden_cozy')
          : jobId
      const res = await generateDesign({
        user_id: user.telegram_id,
        file_id: up.file_id,
        style_id: sid,
        job_id: jobId,
        quality: q,
        phash: up.phash,
      })

      if (res.cached && res.result_url) {
        // Анти-абуз §5: фото уже обрабатывали — показываем старый результат, ничего не списываем
        setResultUrl(res.result_url)
        setGenerationId(res.generation_id ?? null)
        setResultQuality((res.quality as Quality) || 'medium')
        setVariants([{ url: res.result_url, quality: (res.quality as Quality) || 'medium' }])
        setVariantIdx(0)
        setChargeLabel('Это фото уже обрабатывали')
        setBusy(false)
        setStep('result')
        return
      }

      if (!res.task_id) throw new Error('Сервер не вернул task_id')

      const gid = parseInt(res.task_id.split('_')[1], 10)
      setGenerationId(Number.isNaN(gid) ? null : gid)
      setResultQuality(res.quality || 'medium')
      setChargeLabel(
        res.charge === 'free_daily' ? 'Быстрый вариант · бесплатно'
        : res.charge === 'quota' ? 'Из подписки'
        : `−${res.cost} ${res.cost === 1 ? 'кредит' : 'кредитов'}`,
      )
      onUserUpdate({
        ...user,
        credits_paid: res.credits_paid_left,
        credits_free_daily: res.credits_free_daily_left,
      } as User)

      pollTask(res.task_id)
    } catch (e) {
      // §7.6: ошибка до старта задачи — сервер не списал, возвращаем на quality
      logEvent(user.telegram_id, 'generation_error', { job_id: jobId, stage: 'start' })
      setError('Не удалось запустить генерацию. Проверьте интернет и попробуйте снова')
      setBusy(false)
      setStep('quality')
    }
  }, [file, fileId, busy, quality, user, onUserUpdate, jobId, styleId, directionId, pollTask])

  // ===== Апсейлы на экране результата =====
  const doUpsell = useCallback(async (kind: 'hd' | 'variations') => {
    if (!generationId || busy) return
    setBusy(true)
    setError('')
    try {
      if (kind === 'hd') {
        const r = await enhanceHd(user.telegram_id, generationId)
        onUserUpdate({ ...user, credits_paid: r.credits_left } as User)
        setStep('processing')
        pollTask(r.task_id)
      } else {
        const r = await makeVariations(user.telegram_id, generationId, refineTag ? { refine: refineTag } : undefined)
        onUserUpdate({ ...user, credits_paid: r.credits_left } as User)
        setStep('processing')
        // берём первый вариант из пачки
        const first = r.task_ids?.[0]
        if (first) pollTask(first)
        else { setBusy(false); setStep('result') }
      }
      logEvent(user.telegram_id, 'refine_tap', { kind, refine: refineTag, generation_id: generationId })
      setRefineTag(null)
    } catch {
      setError('Не удалось выполнить. Попробуйте позже')
      setBusy(false)
    }
  }, [generationId, busy, user, onUserUpdate, pollTask, refineTag])

  // §3.6: чип уточнения — серверного refine-параметра пока нет → пускаем вариацию с пометкой
  const applyRefine = useCallback((chipId: string) => {
    if (busy || !generationId) return
    logEvent(user.telegram_id, 'refine_tap', { kind: 'chip', chip: chipId, generation_id: generationId })
    setRefineTag(chipId)
    void doUpsell('variations')
  }, [busy, generationId, user.telegram_id, doUpsell])

  // ===== Скачать / поделиться =====
  const download = useCallback(async () => {
    if (!resultUrl) return
    try {
      const a = document.createElement('a')
      a.href = resultUrl.startsWith('http') ? resultUrl : `${import.meta.env.VITE_API_URL || ''}${resultUrl}`
      a.download = `dekorinfo_${generationId ?? 'design'}.jpg`
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      logEvent(user.telegram_id, 'download', { generation_id: generationId })
    } catch {
      setError('Не удалось сохранить. Откройте изображение и удерживайте для сохранения')
    }
  }, [resultUrl, generationId, user.telegram_id])

  const share = useCallback(async () => {
    if (!resultUrl || !generationId) return
    try {
      await shareResult(user.telegram_id, generationId)
      const url = `${window.location.origin}/share/${generationId}`
      const tg = window.Telegram?.WebApp
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}`)
      } else if (navigator.share) {
        await navigator.share({ url, title: 'Мой дизайн от Декор Инфо AI' })
      } else {
        await navigator.clipboard.writeText(url)
        setChargeLabel('Ссылка скопирована')
      }
      logEvent(user.telegram_id, 'share', { generation_id: generationId })
    } catch {
      // пользователь закрыл шеринг — не ошибка
    }
  }, [resultUrl, generationId, user.telegram_id])

  return {
    // состояние
    step, setStep,
    file, previewUrl, fileId,
    quality, setQuality,
    resultUrl, resultQuality, generationId, chargeLabel,
    variants, variantIdx, refineTag,
    progress, genStepIdx, genSteps: GEN_STEPS,
    busy, error, setError,
    // действия
    pick, reset, start, doUpsell, applyRefine, gotoVariant, download, share,
  }
}
