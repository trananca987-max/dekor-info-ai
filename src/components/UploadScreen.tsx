// PATCH v2.2: экран фото (§7.3) и результата (§7.4).
// Флоу: фото → [стиль | направление сада] → качество → генерация → результат.
// §7.3: заголовок «Ваша комната», входы только «Камера» и «Галерея»,
// дропзона растягивается, одна строка-подсказка вместо чипсов,
// кастомные «Назад» удалены — tg.BackButton.
// §7.4: результат всегда тёмный, слайдер до/после, тап — полноэкранный просмотр,
// «Сделать в высоком качестве» (+15 кредитов мелким), «Другой вариант»,
// «Сохранить», «Поделиться». Для Low — строка «Без водяного знака — в полном качестве».
// §9: механика генерации по примеру удалена.
import { useState, useEffect, useRef } from 'react'
import type { User } from '../types'
import {
  uploadPhoto, generateDesign, checkGenerationStatus,
  enhanceHd, makeVariations, shareResult, logEvent,
  API_URL, COST_LOW, COST_MEDIUM, COST_HD, COST_VARIATIONS,
} from '../api'
import { STYLES, getJob, type Style } from '../config/catalog'
import { asset, lqip } from '../lib/assets'
import BeforeAfter from './BeforeAfter'

interface Props {
  user: User
  jobId: string
  initialStyleId?: string
  onBack: () => void
  onUserUpdate: (user: User) => void
  onOpenPricing: () => void
}

type Step = 'upload' | 'style' | 'direction' | 'quality' | 'processing' | 'result'

const GEN_STEPS = ['Читаю геометрию комнаты', 'Подбираю мебель', 'Рисую свет и тени']

export default function UploadScreen({ user, jobId, initialStyleId, onBack, onUserUpdate, onOpenPricing }: Props) {
  const tg = window.Telegram?.WebApp
  const job = getJob(jobId)
  const isRoomDesign = jobId === 'room_design'
  const isGarden = jobId === 'garden'

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileId, setFileId] = useState('')
  const [styleId, setStyleId] = useState(initialStyleId || '')
  const [directionId, setDirectionId] = useState('')
  const [quality, setQuality] = useState<'low' | 'medium'>('medium')
  const [resultUrl, setResultUrl] = useState('')
  const [generationId, setGenerationId] = useState<number | null>(null)
  const [chargeLabel, setChargeLabel] = useState('')
  const [resultQuality, setResultQuality] = useState<'low' | 'medium' | 'hd'>('medium')
  const [progress, setProgress] = useState(8)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const backRef = useRef(onBack)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // §3: сброс скролла при смене шага
  useEffect(() => {
    const b = document.querySelector('.app__body')
    if (b) b.scrollTop = 0
  }, [step])

  useEffect(() => {
    if (step !== 'processing') return
    const t = setInterval(() => setProgress(p => Math.min(90, p + 3 + Math.random() * 5)), 900)
    return () => clearInterval(t)
  }, [step])

  // §7.3: навигация назад — tg.BackButton вместо кастомных кнопок
  const stepBack = () => {
    if (step === 'upload') onBack()
    else if (step === 'style' || step === 'direction') setStep('upload')
    else if (step === 'quality') setStep(isRoomDesign && !initialStyleId ? 'style' : isGarden ? 'direction' : 'upload')
    else if (step === 'result') onBack()
  }
  backRef.current = stepBack
  useEffect(() => {
    const bb = tg?.BackButton
    if (!bb) return
    const handler = () => backRef.current()
    bb.show()
    bb.onClick(handler)
    return () => { try { bb.offClick(handler) } catch { /* ignore */ } }
  }, [tg])
  useEffect(() => () => { try { tg?.BackButton.hide() } catch { /* ignore */ } }, [tg])

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
  }

  const afterUpload = () => {
    if (isRoomDesign && !initialStyleId) setStep('style')
    else if (isGarden) setStep('direction')
    else setStep('quality')
  }

  const start = async (forcedQuality?: 'low' | 'medium') => {
    if (!file || !user) return
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
      const sid = isRoomDesign ? (styleId || 'modern') : isGarden ? (directionId || 'garden_cozy') : jobId
      logEvent(user.telegram_id, 'generation_started', { job_id: jobId, quality: q })
      const res = await generateDesign({
        user_id: user.telegram_id,
        file_id: up.file_id,
        style_id: sid,
        job_id: jobId,
        quality: q,
        phash: up.phash,
      })
      if (res.cached && res.result_url) {
        // Анти-абуз §5: это фото уже обрабатывали — показываем старый результат
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
        res.charge === 'free_daily' ? 'Быстрый вариант · бесплатно' :
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
      }
      setError(resp?.data?.detail || 'Не удалось запустить генерацию')
      setStep('quality')
      setBusy(false)
    }
  }

  // Прогресс «Шаг N из M» — только содержательные шаги (§7.3)
  const substantive: Step[] = isRoomDesign
    ? (initialStyleId ? ['upload'] : ['upload', 'style'])
    : isGarden ? ['upload', 'direction'] : ['upload']
  const totalSteps = substantive.length
  const stepNum = substantive.indexOf(step) + 1
  const progressBar = totalSteps > 1 && stepNum > 0 && (
    <div className="prog">
      <span className="lbl">Шаг {stepNum} из {totalSteps}</span>
      <div className="bar"><div className="fill" style={{ width: `${(stepNum / totalSteps) * 100}%` }} /></div>
    </div>
  )

  // ===== STEP: upload (§7.3) =====
  if (step === 'upload') {
    return (
      <>
        <div className="app__body" style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="h" style={{ marginTop: 8 }}>Ваша комната</h1>
          <p className="sub" style={{ marginBottom: 14 }}>
            Подойдёт любое фото — можно из галереи
          </p>

          {!previewUrl ? (
            <label className="drop">
              <span className="cam">📷</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Сфотографируйте комнату</span>
              <span className="tiny">JPG или PNG, до 10 МБ</span>
              <input type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={handleFile} />
            </label>
          ) : (
            <div className="photo-wrap">
              <div className="drop has-photo" style={{ position: 'relative' }}>
                <img src={previewUrl} alt="Превью" />
              </div>
              <button className="replace-btn"
                onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
                Заменить
              </button>
            </div>
          )}

          {/* §7.3: одна строка вместо чипсов */}
          <p className="shoot-hint">Снимите комнату целиком, с одного угла</p>
          {error && <div className="err">{error}</div>}
        </div>

        <div className="app__foot">
          {!previewUrl && (
            <div className="src2">
              <button onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
                <span className="ic">📷</span>Камера
              </button>
              <button onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
                <span className="ic">🖼</span>Галерея
              </button>
            </div>
          )}
          {/* §7.3: кнопка появляется только после выбора фото */}
          {previewUrl && (
            <button className="btn" onClick={afterUpload}>Продолжить</button>
          )}
          <label style={{ display: 'none' }}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
          </label>
        </div>
      </>
    )
  }

  // ===== STEP: style — 22 стиля из конфига (§2) =====
  if (step === 'style') {
    return (
      <>
        <div className="app__body">
          {progressBar}
          <h1 className="h" style={{ marginTop: 8 }}>Выберите стиль</h1>
          <p className="sub" style={{ marginBottom: 12 }}>
            Одна и та же комната в каждом стиле — разница видна сразу
          </p>
          <div className="sc">
            {STYLES.map((s: Style) => (
              <button key={s.id}
                className="sc-card"
                style={styleId === s.id ? { boxShadow: '0 0 0 2px var(--primary)' } : undefined}
                onClick={() => { setStyleId(s.id); tg?.HapticFeedback.selectionChanged() }}>
                <img src={asset(s.cover, 'thumb')} alt={s.title} loading="lazy"
                  style={{ background: `url(${lqip(s.cover)}) center/cover` }} />
                <div className="card__scrim" />
                <div className="card__plate">
                  <span className="nm">{s.title}</span>
                  <span className="hint">{s.hint}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="app__foot">
          <button className="btn" disabled={!styleId} onClick={() => setStep('quality')}>
            Продолжить
          </button>
        </div>
      </>
    )
  }

  // ===== STEP: direction — четыре направления сада (§2) =====
  if (step === 'direction') {
    const dirs = job?.directions ?? []
    return (
      <>
        <div className="app__body">
          {progressBar}
          <h1 className="h" style={{ marginTop: 8 }}>Каким будет участок?</h1>
          <p className="sub" style={{ marginBottom: 12 }}>Выберите направление</p>
          <div className="dirs">
            {dirs.map(d => (
              <button key={d.id} className={`dir ${directionId === d.id ? 'on' : ''}`}
                onClick={() => { setDirectionId(d.id); tg?.HapticFeedback.selectionChanged() }}>
                <img src={asset(d.after, 'thumb')} alt={d.label} loading="lazy"
                  style={{ background: `url(${lqip(d.after)}) center/cover` }} />
                <div className="card__scrim" />
                <div className="card__plate"><span className="nm">{d.label}</span></div>
                {directionId === d.id && <span className="tick">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="app__foot">
          <button className="btn" disabled={!directionId} onClick={() => setStep('quality')}>
            Продолжить
          </button>
        </div>
      </>
    )
  }

  // ===== STEP: quality (коммерческий шаг — НЕ в прогресс-баре, §7.3) =====
  if (step === 'quality') {
    const freeLeft = user.credits_free_daily || 0
    const paidLeft = user.credits_paid || 0
    // §8: экран при исчерпанном лимите
    const dailyExhausted = freeLeft <= 0
    return (
      <>
        <div className="app__body">
          <h1 className="h" style={{ marginTop: 8 }}>
            {dailyExhausted ? 'Бесплатные дизайны на сегодня закончились' : 'Качество результата'}
          </h1>
          <p className="sub" style={{ marginBottom: 14 }}>
            {dailyExhausted
              ? 'Сделайте дизайн в полном качестве — без водяного знака'
              : 'Быстрый вариант подходит, чтобы мгновенно посмотреть идею'}
          </p>

          {!dailyExhausted && (
            <button className={`act ${quality === 'low' ? 'on' : ''}`}
              onClick={() => setQuality('low')}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Быстрый вариант</div>
                <div className="tiny">Мгновенно · с водяным знаком · {freeLeft > 0 ? 'бесплатно сегодня' : `${COST_LOW} кредит`}</div>
              </div>
              <span className="p free">{freeLeft > 0 ? `Сегодня: ${freeLeft}` : `${COST_LOW} кр.`}</span>
            </button>
          )}

          <button className={`act ${quality === 'medium' ? 'on' : ''}`}
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
          {/* §8: «Сделать дизайн» — без цены в кнопке */}
          <button className="btn" onClick={() => start()}>Сделать дизайн</button>
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
                <span className={`dotp ${progress > (i + 1) * 28 ? 'on' : ''}`} />{s}
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

  // ===== STEP: result (§7.4: всегда тёмный) =====
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
      {/* §7.4: экран результата всегда тёмный */}
      <div className="app__body result-dark" style={{ background: '#0F1013' }}>
        <div onClick={() => setFullscreen(true)} style={{ cursor: 'zoom-in' }}>
          <BeforeAfter
            before={`${API_URL}/uploads/${fileId}`}
            after={`${API_URL}${resultUrl}`}
            labelAfter={resultQuality === 'hd' ? 'HD' : 'После'}
          />
        </div>
        {chargeLabel && (
          <p className="tiny" style={{ textAlign: 'center', marginBottom: 10 }}>{chargeLabel}</p>
        )}

        {/* §7.4: для Low вотермарка наложена сервером — строка со ссылкой на Medium */}
        {resultQuality === 'low' && (
          <button className="wm-note" onClick={() => {
            logEvent(user.telegram_id, 'wm_upgrade_clicked', { generation_id: generationId })
            start('medium')
          }}>
            Без водяного знака — <b>в полном качестве</b>
          </button>
        )}

        {/* §7.4: первичная «Сделать в высоком качестве», под ней мелким «15 кредитов» */}
        {resultQuality !== 'hd' && (
          <>
            <button className="btn" disabled={busy} onClick={() => doUpsell('hd')}
              style={{ marginBottom: 4 }}>
              Сделать в высоком качестве
            </button>
            <p className="hd-price">{COST_HD} кредитов</p>
          </>
        )}
        <button className="act" disabled={busy} onClick={() => doUpsell('variations')}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Другой вариант</div>
            <div className="tiny">Тот же стиль, другая расстановка</div>
          </div>
          <span className="p">{COST_VARIATIONS} кредитов</span>
        </button>

        {error && <div className="err">{error}</div>}
        {busy && <p className="tiny" style={{ textAlign: 'center', marginTop: 8 }}>Работаем…</p>}
      </div>

      <div className="app__foot result-dark" style={{ background: '#0F1013' }}>
        <div className="row">
          <button className="btn ghost sm" onClick={handleDownload}>Сохранить</button>
          <button className="btn ghost sm" onClick={handleShare}>Поделиться</button>
        </div>
      </div>

      {/* §7.4: тап — полноэкранный просмотр */}
      {fullscreen && (
        <div className="fullscreen" onClick={() => setFullscreen(false)}>
          <img src={`${API_URL}${resultUrl}`} alt="Результат" />
        </div>
      )}
    </>
  )
}
