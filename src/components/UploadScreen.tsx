// Флоу SPEC v2.0: фото (Камера/Галерея/Пример) → тип помещения → стиль → палитра
// → качество → генерация → результат (до/после, HD-апгрейд, шеринг).
// Прогресс-бар только для содержательных шагов (§9): оплата в прогресс не входит.
import { useState, useEffect, useRef } from 'react'
import type { User, Catalog } from '../types'
import { getStylesByCategory } from '../config/styles'
import {
  uploadPhoto, generateDesign, generateExample, checkGenerationStatus,
  enhanceHd, makeVariations, shareResult, logEvent,
  API_URL, COST_LOW, COST_MEDIUM, COST_HD, COST_VARIATIONS,
} from '../api'
import BeforeAfter from './BeforeAfter'

interface Props {
  user: User
  jobId: string
  catalog: Catalog | null
  onBack: () => void
  onUserUpdate: (user: User) => void
  onOpenPricing: () => void
}

type Step = 'upload' | 'room' | 'style' | 'palette' | 'quality' | 'processing' | 'result'

const GEN_STEPS = ['Читаю геометрию комнаты', 'Подбираю мебель', 'Рисую свет и тени']

const EXAMPLES = [
  { id: 'living_room', name: 'Гостиная' },
  { id: 'bedroom', name: 'Спальня' },
  { id: 'kitchen', name: 'Кухня' },
  { id: 'bathroom', name: 'Ванная' },
  { id: 'kids_room', name: 'Детская' },
  { id: 'balcony', name: 'Балкон' },
]

export default function UploadScreen({ user, jobId, catalog, onBack, onUserUpdate, onOpenPricing }: Props) {
  const tg = window.Telegram?.WebApp
  const isDeclutter = jobId === 'declutter'
  const isGarden = jobId === 'garden'
  const category = isGarden ? 'outdoor' : 'interior'

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileId, setFileId] = useState('')
  const [, setPhotoHash] = useState('')
  const [roomType, setRoomType] = useState('')
  const [styleId, setStyleId] = useState('')
  const [paletteId, setPaletteId] = useState('')
  const [quality, setQuality] = useState<'low' | 'medium'>('medium')
  const [examplesOpen, setExamplesOpen] = useState(false)
  const [resultUrl, setResultUrl] = useState('')
  const [generationId, setGenerationId] = useState<number | null>(null)
  const [chargeLabel, setChargeLabel] = useState('')
  const [resultQuality, setResultQuality] = useState<'low' | 'medium' | 'hd'>('medium')
  const [progress, setProgress] = useState(8)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // SPEC §3.3: сброс скролла при смене шага
  useEffect(() => {
    const b = document.querySelector('.app__body')
    if (b) b.scrollTop = 0
  }, [step])

  useEffect(() => {
    if (step !== 'processing') return
    const t = setInterval(() => setProgress(p => Math.min(90, p + 3 + Math.random() * 5)), 900)
    return () => clearInterval(t)
  }, [step])

  const pollTask = (taskId: string, onDone: (url: string) => void) => {
    pollRef.current = setInterval(async () => {
      try {
        const st = await checkGenerationStatus(taskId)
        if (st.status === 'completed' && st.result_url) {
          clearInterval(pollRef.current!)
          setProgress(100)
          logEvent(user.telegram_id, 'generation_success', { task_id: taskId })
          onDone(st.result_url)
          tg?.HapticFeedback.notificationOccurred('success')
        } else if (st.status === 'failed') {
          clearInterval(pollRef.current!)
          logEvent(user.telegram_id, 'generation_failed', { task_id: taskId })
          setError(st.error || 'Ошибка генерации. Кредиты вернутся автоматически')
          setBusy(false)
          setStep('quality')
          tg?.HapticFeedback.notificationOccurred('error')
        }
      } catch { /* сеть — попробуем на следующем тике */ }
    }, 3000)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError('Файл больше 10 МБ'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('Поддерживаются JPG, PNG и WebP'); return
    }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setError('')
    logEvent(user.telegram_id, 'photo_uploaded', { job_id: jobId })
    setStep('room')
  }

  // SPEC §7: генерация по примеру — бесплатная Medium без вотермарки, 1 раз
  const startExample = async (exampleId: string) => {
    if (user.example_gen_used) return
    setBusy(true)
    setError('')
    setProgress(8)
    setStep('processing')
    logEvent(user.telegram_id, 'example_photo_used', { example_id: exampleId })
    try {
      const res = await generateExample({
        user_id: user.telegram_id,
        example_id: exampleId,
        style_id: 'modern',
      })
      setGenerationId(parseInt(res.task_id.split('_')[1], 10))
      setResultQuality('medium')
      setChargeLabel('Бесплатно · пример')
      onUserUpdate({ ...user, example_gen_used: true })
      pollTask(res.task_id, (url) => { setResultUrl(url); setBusy(false); setStep('result') })
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
      setError(resp?.data?.detail || 'Не удалось запустить генерацию')
      setBusy(false)
      setStep('upload')
    }
  }

  const start = async () => {
    if (!file || !user) return
    setProgress(8)
    setStep('processing')
    setError('')
    setBusy(true)
    try {
      const up = await uploadPhoto(user.telegram_id, file)
      setFileId(up.file_id)
      setPhotoHash(up.phash)
      const sid = isDeclutter ? 'declutter' : (styleId || 'modern')
      logEvent(user.telegram_id, 'generation_started', {
        job_id: jobId, quality, wallet: quality === 'low' ? 'free_daily_or_paid' : 'paid',
      })
      const res = await generateDesign({
        user_id: user.telegram_id,
        file_id: up.file_id,
        style_id: sid,
        job_id: jobId,
        room_type: roomType || undefined,
        palette_id: paletteId || undefined,
        quality,
        phash: up.phash,
      })
      if (res.cached && res.result_url) {
        // Анти-абуз §4.5: это фото уже обрабатывали — показываем старый результат
        clearInterval(pollRef.current!)
        setResultUrl(res.result_url)
        setGenerationId(res.generation_id ?? null)
        setResultQuality((res.quality as 'low' | 'medium') || 'medium')
        setChargeLabel('Это фото уже обрабатывали')
        setBusy(false)
        setStep('result')
        return
      }
      setGenerationId(parseInt(res.task_id!.split('_')[1], 10))
      setResultQuality(res.quality || 'medium')
      setChargeLabel(
        res.charge === 'free_daily' ? 'Черновик · бесплатно' :
        res.charge === 'quota' ? 'Из подписки' :
        `−${res.cost} ${res.cost === 1 ? 'кредит' : 'кредитов'}`
      )
      onUserUpdate({
        ...user,
        credits_paid: res.credits_paid_left,
        credits_free_daily: res.credits_free_daily_left,
      })
      pollTask(res.task_id!, (url) => { setResultUrl(url); setBusy(false); setStep('result') })
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
      if (resp?.status === 402) {
        logEvent(user.telegram_id, 'free_limit_reached', { job_id: jobId })
        setError(resp?.data?.detail || 'Не хватает кредитов')
        setStep('quality')
      } else {
        setError(resp?.data?.detail || 'Не удалось запустить генерацию')
        setStep('quality')
      }
      setBusy(false)
    }
  }

  // Прогресс-бар «Шаг N из 3» (§9): declutter — один содержательный шаг
  const totalSteps = isDeclutter ? 1 : 3
  const stepNum = step === 'room' ? 1 : step === 'style' ? 2 : step === 'palette' ? 3 : 0
  const progressBar = stepNum > 0 && (
    <div className="prog">
      <span className="lbl">Шаг {stepNum} из {totalSteps}</span>
      <div className="bar"><div className="fill" style={{ width: `${(stepNum / totalSteps) * 100}%` }} /></div>
    </div>
  )

  const nav = (back: () => void) => (
    <div className="app__nav">
      <button className="link" onClick={back}>← Назад</button>
      <span className="bal-nav">{user.balance_line}</span>
    </div>
  )

  // ===== STEP: upload (SPEC §7: Камера / Галерея / Пример) =====
  if (step === 'upload') {
    return (
      <>
        {nav(onBack)}
        <div className="app__body">
          <h1 className="h" style={{ marginTop: 8 }}>Фото комнаты</h1>
          <p className="sub" style={{ marginBottom: 14 }}>
            Снимите комнату целиком, при дневном свете
          </p>

          {!previewUrl ? (
            <label className="drop">
              <span className="cam">📷</span>
              <span>Нажмите, чтобы выбрать фото</span>
              <span className="tiny">JPG или PNG, до 10 МБ</span>
              <input type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={handleFile} />
            </label>
          ) : (
            <img src={previewUrl} alt="Превью"
              style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 18, marginBottom: 12 }} />
          )}

          <div className="chips">
            <span className="c">Один угол</span><span className="c">Без людей</span>
            <span className="c">Горизонтальный кадр</span>
          </div>
          {error && <div className="err">{error}</div>}
        </div>

        <div className="app__foot">
          <div className="src3">
            <button onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
              <span className="ic">📷</span>Камера
            </button>
            <button onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
              <span className="ic">🖼</span>Галерея
            </button>
            <button onClick={() => { setExamplesOpen(!examplesOpen); tg?.HapticFeedback.impactOccurred('light') }}
              disabled={user.example_gen_used}>
              <span className="ic">✨</span>{user.example_gen_used ? 'Пример использован' : 'Пример'}
            </button>
          </div>

          {/* SPEC §7: шесть готовых комнат — результат за 20 секунд без своего фото */}
          {examplesOpen && !user.example_gen_used && (
            <>
              <p className="tiny" style={{ marginBottom: 6 }}>
                Бесплатный дизайн по примеру — без вашего фото, один раз
              </p>
              <div className="exrow">
                {EXAMPLES.map(ex => (
                  <button key={ex.id} className="ex" onClick={() => startExample(ex.id)}>
                    <img src={`/examples/${ex.id}.jpg`} alt={ex.name} loading="lazy" />
                    <span className="nm">{ex.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <button className="btn" disabled={!file} onClick={() => setStep('room')}>
            Продолжить
          </button>
          <label style={{ display: 'none' }}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
          </label>
        </div>
      </>
    )
  }

  // ===== STEP: room — тип помещения (§9, шаг 1) =====
  if (step === 'room') {
    const rooms = catalog?.room_types ?? []
    const list = isGarden ? [] : rooms
    return (
      <>
        {nav(() => setStep('upload'))}
        <div className="app__body">
          {progressBar}
          <h1 className="h" style={{ marginTop: 8 }}>Что это за помещение?</h1>
          {isGarden ? (
            <p className="sub" style={{ marginBottom: 14 }}>
              Для участка тип не нужен — сразу к стилю
            </p>
          ) : (
            <p className="sub" style={{ marginBottom: 14 }}>
              Так результат будет точнее
            </p>
          )}
          {!isGarden && (
            <div className="rooms">
              {list.map(r => (
                <button key={r.id} className={`room ${roomType === r.id ? 'on' : ''}`}
                  onClick={() => { setRoomType(r.id); tg?.HapticFeedback.selectionChanged() }}>
                  {r.name}
                  {roomType === r.id && <span className="tick">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="app__foot">
          <button className="btn" disabled={!isGarden && !roomType}
            onClick={() => setStep(isDeclutter ? 'quality' : 'style')}>
            Продолжить
          </button>
        </div>
      </>
    )
  }

  // ===== STEP: style (§6: выбор стиля — второй шаг внутри задачи) =====
  if (step === 'style') {
    const list = getStylesByCategory(category)
    return (
      <>
        {nav(() => setStep('room'))}
        <div className="app__body">
          {progressBar}
          <h1 className="h" style={{ marginTop: 8 }}>Выберите стиль</h1>
          <p className="sub" style={{ marginBottom: 12 }}>
            Одна и та же комната в каждом стиле — разница видна сразу
          </p>
          <div className="styles">
            {list.map((s) => (
              <button key={s.id} className={`st ${styleId === s.id ? 'on' : ''}`}
                onClick={() => { setStyleId(s.id); tg?.HapticFeedback.selectionChanged() }}>
                <img className="img" src={`/styles/${s.id}.jpg`} alt={s.name} loading="lazy" />
                {styleId === s.id && <span className="tick">✓</span>}
                <span className="nm">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="app__foot">
          <button className="btn" disabled={!styleId} onClick={() => setStep('palette')}>
            Продолжить
          </button>
        </div>
      </>
    )
  }

  // ===== STEP: palette (§8, шаг 3) =====
  if (step === 'palette') {
    const pals = catalog?.palettes ?? {}
    const order = catalog?.palette_order ?? []
    return (
      <>
        {nav(() => setStep('style'))}
        <div className="app__body">
          {progressBar}
          <h1 className="h" style={{ marginTop: 8 }}>Цветовая палитра</h1>
          <p className="sub" style={{ marginBottom: 12 }}>
            Необязательно — можно оставить как есть
          </p>
          <div className="pals">
            {order.map(pid => {
              const p = pals[pid]
              if (!p) return null
              const selected = paletteId === pid || (pid === 'none' && paletteId === '')
              return (
                <button key={pid} className={`pal ${selected ? 'on' : ''}`}
                  onClick={() => {
                    setPaletteId(pid === 'surprise' ? 'surprise' : pid === 'none' ? '' : pid)
                    tg?.HapticFeedback.selectionChanged()
                    if (pid === 'surprise') logEvent(user.telegram_id, 'palette_selected', { palette_id: 'surprise' })
                  }}>
                  {p.colors.length > 0 && (
                    <span className="dots">
                      {p.colors.map(c => <span key={c} className="dot" style={{ background: c }} />)}
                    </span>
                  )}
                  {p.colors.length === 0 && <span className="dots"><span className="dot" style={{ background: 'conic-gradient(#FF5E7E,#FFC24B,#3DDC97,#2E90FA,#FF5E7E)' }} /></span>}
                  <span className="nm">{p.name}</span>
                  {selected && <span className="tick">✓</span>}
                </button>
              )
            })}
            <button className={`pal ${paletteId === '' ? 'on' : ''}`}
              onClick={() => setPaletteId('')}>
              <span className="nm">Без палитры</span>
              {paletteId === '' && <span className="tick">✓</span>}
            </button>
          </div>
        </div>
        <div className="app__foot">
          <button className="btn" onClick={() => {
            if (paletteId) logEvent(user.telegram_id, 'palette_selected', { palette_id: paletteId })
            setStep('quality')
          }}>
            Продолжить
          </button>
        </div>
      </>
    )
  }

  // ===== STEP: quality (коммерческий шаг — НЕ в прогресс-баре, §9) =====
  if (step === 'quality') {
    const freeLeft = user.credits_free_daily || 0
    const paidLeft = user.credits_paid || 0
    // SPEC §5: дневной лимит исчерпан
    const dailyExhausted = freeLeft <= 0
    return (
      <>
        {nav(() => setStep(isDeclutter ? 'room' : 'palette'))}
        <div className="app__body">
          <h1 className="h" style={{ marginTop: 8 }}>
            {dailyExhausted ? 'Черновики на сегодня закончились' : 'Качество результата'}
          </h1>
          <p className="sub" style={{ marginBottom: 14 }}>
            {dailyExhausted
              ? 'Создайте дизайн в полном качестве — без водяного знака'
              : 'Черновик подходит, чтобы быстро посмотреть идею'}
          </p>

          {!dailyExhausted && (
            <button className={`act ${quality === 'low' ? 'on' : ''}`}
              style={quality === 'low' ? { borderColor: 'var(--acc)' } : {}}
              onClick={() => setQuality('low')}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Черновик</div>
                <div className="tiny">Быстро · с водяным знаком · {freeLeft > 0 ? 'бесплатно сегодня' : `${COST_LOW} кредит`}</div>
              </div>
              <span className="p free">{freeLeft > 0 ? `Сегодня: ${freeLeft}` : `${COST_LOW} кр.`}</span>
            </button>
          )}

          <button className={`act`}
            style={quality === 'medium' ? { borderColor: 'var(--acc)' } : {}}
            onClick={() => setQuality('medium')}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Полное качество</div>
              <div className="tiny">Без водяного знака · детальная проработка</div>
            </div>
            <span className="p">{COST_MEDIUM} кредитов</span>
          </button>

          {error && <div className="err">{error}</div>}
        </div>
        <div className="app__foot">
          {/* SPEC §5: первичная кнопка «Создать дизайн · 5 кредитов» */}
          <button className="btn" onClick={start}>
            Создать дизайн · {quality === 'low' && freeLeft > 0 ? 'бесплатно' : `${quality === 'low' ? COST_LOW : COST_MEDIUM} ${quality === 'low' ? 'кредит' : 'кредитов'}`}
          </button>
          {(dailyExhausted || paidLeft < COST_MEDIUM) && (
            <button className="linkline" onClick={onOpenPricing}>Пополнить баланс</button>
          )}
        </div>
      </>
    )
  }

  // ===== STEP: processing =====
  if (step === 'processing') {
    return (
      <>
        <div className="app__body" style={{ textAlign: 'center' }}>
          <div className="ring" style={{ '--p': `${Math.round(progress)}%` } as React.CSSProperties}>
            <i>{Math.round(progress)}%</i>
          </div>
          <h1 className="h" style={{ fontSize: 19 }}>Создаём дизайн</h1>
          <p className="sub" style={{ textAlign: 'center', marginBottom: 22 }}>Обычно 20–40 секунд</p>
          <div style={{ maxWidth: 210, margin: '0 auto' }}>
            {GEN_STEPS.map((s, i) => (
              <div key={s} className={`step ${progress > (i + 1) * 28 ? 'on' : ''}`}>
                <span className={`dot ${progress > (i + 1) * 28 ? 'on' : ''}`} />{s}
              </div>
            ))}
          </div>
          {error && <div className="err" style={{ textAlign: 'left' }}>{error}</div>}
        </div>
        <div className="app__foot">
          <button className="btn ghost" onClick={onBack}>Свернуть — пришлём в чат</button>
        </div>
      </>
    )
  }

  // ===== STEP: result (SPEC §10: всегда тёмный, до/после, HD, варианты, шеринг) =====
  const doUpsell = async (kind: 'hd' | 'variations') => {
    if (!user || !generationId) return
    setBusy(true)
    setError('')
    try {
      if (kind === 'hd') {
        logEvent(user.telegram_id, 'hd_upgrade_clicked', { generation_id: generationId })
        const res = await enhanceHd(user.telegram_id, generationId)
        onUserUpdate({ ...user, credits_paid: res.credits_left })
        setStep('processing')
        pollTask(res.task_id, (url) => {
          setResultUrl(url)
          setResultQuality('hd')
          setGenerationId(parseInt(res.task_id.split('_')[1], 10))
          setChargeLabel(res.cost === 0 ? 'HD · из подписки' : `HD · −${COST_HD} кредитов`)
          setBusy(false)
          setStep('result')
        })
      } else {
        const res = await makeVariations(user.telegram_id, generationId)
        onUserUpdate({ ...user, credits_paid: res.credits_left })
        let remaining = res.task_ids.length
        let lastUrl = ''
        const checkAll = (url: string) => {
          remaining -= 1
          lastUrl = url
          if (remaining === 0) {
            setResultUrl(lastUrl)
            setBusy(false)
          }
        }
        res.task_ids.forEach(tid => pollTask(tid, checkAll))
      }
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
      if (resp?.status === 402) {
        setError(resp?.data?.detail || 'Не хватает кредитов')
        logEvent(user.telegram_id, 'paywall_shown', { reason: kind })
      } else {
        setError(resp?.data?.detail || 'Не удалось выполнить')
      }
      setBusy(false)
    }
  }

  const handleDownload = async () => {
    try {
      const resp = await fetch(`${API_URL}${resultUrl}`)
      const blob = await resp.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'dekor-info-design.jpg'
      a.click()
    } catch { tg?.openLink(`${API_URL}${resultUrl}`) }
  }

  const handleShare = async () => {
    if (!generationId) return
    setBusy(true)
    try {
      await shareResult(user.telegram_id, generationId)
      tg?.HapticFeedback.notificationOccurred('success')
      tg?.showAlert?.('Отправили «до/после» вам в чат с ботом')
    } catch {
      tg?.showAlert?.('Не удалось отправить. Попробуйте позже')
    }
    setBusy(false)
  }

  return (
    <>
      <div className="app__nav">
        <button className="link" onClick={onBack}>← На главную</button>
        <span className="bal-nav">{user.balance_line}</span>
      </div>
      {/* SPEC §10: экран результата всегда тёмный */}
      <div className="app__body" style={{ background: '#0D0E11' }}>
        {fileId ? (
          <BeforeAfter
            before={`${API_URL}/uploads/${fileId}`}
            after={`${API_URL}${resultUrl}`}
            height={260}
            labelAfter={resultQuality === 'hd' ? 'HD' : 'После'}
          />
        ) : (
          /* Генерация по примеру: «до» нет — показываем только результат */
          <img src={`${API_URL}${resultUrl}`} alt="Результат"
            style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 18, marginBottom: 14 }} />
        )}
        {chargeLabel && (
          <p className="tiny" style={{ textAlign: 'center', marginBottom: 10 }}>{chargeLabel}</p>
        )}

        {/* SPEC §10: первичная кнопка — «Улучшить в HD — 15 кредитов» */}
        {resultQuality !== 'hd' && (
          <button className="btn" disabled={busy} onClick={() => doUpsell('hd')}
            style={{ marginBottom: 10 }}>
            Улучшить в HD — {COST_HD} кредитов
          </button>
        )}
        <button className="act" disabled={busy} onClick={() => doUpsell('variations')}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ещё варианты</div>
            <div className="tiny">Тот же стиль, другая расстановка</div>
          </div>
          <span className="p">{COST_VARIATIONS} кредитов</span>
        </button>

        {error && <div className="err">{error}</div>}
        {busy && <p className="tiny" style={{ textAlign: 'center', marginTop: 8 }}>Работаем…</p>}
      </div>

      <div className="app__foot">
        <div className="row">
          <button className="btn ghost sm" onClick={handleDownload}>💾 Сохранить</button>
          <button className="btn ghost sm" onClick={handleShare}>📤 Поделиться</button>
        </div>
      </div>
    </>
  )
}
