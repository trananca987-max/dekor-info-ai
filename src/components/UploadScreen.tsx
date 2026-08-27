// Флоу: фото → (режим) → стили → «Создать дизайн · 5★» → генерация → результат + апселлы
import { useState, useEffect, useRef } from 'react'
import type { User } from '../types'
import { GEN_MODES, getStyleById, STYLES, type GenModeInfo } from '../config/styles'
import {
  uploadPhoto, generateDesign, checkGenerationStatus, enhanceHd, makeVariations,
  API_URL, DESIGN_COST, HD_COST, VARIATIONS_COST,
} from '../api'
import BeforeAfter from './BeforeAfter'
import { buyPack, PACKS, PACK_ORDER } from '../api'

interface Props {
  user: User
  category?: 'interior' | 'outdoor'
  onBack: () => void
  onUserUpdate: (user: User) => void
}

type Step = 'upload' | 'mode' | 'category' | 'style' | 'processing' | 'result'

const GEN_STEPS = ['Читаю геометрию комнаты', 'Подбираю мебель', 'Рисую свет и тени']

export default function UploadScreen({ user, category, onBack, onUserUpdate }: Props) {
  const tg = window.Telegram?.WebApp
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [mode, setMode] = useState<GenModeInfo>(GEN_MODES[0])
  const [styleId, setStyleId] = useState('')
  const [keepFurniture, setKeepFurniture] = useState(true)
  const [resultUrl, setResultUrl] = useState('')
  const [originalUrl, setOriginalUrl] = useState('') // для шторки До/После
  const [generationId, setGenerationId] = useState<number | null>(null)
  const [chargeLabel, setChargeLabel] = useState('')
  const [resultQuality, setResultQuality] = useState<'low' | 'medium' | 'hd'>('medium')
  const [progress, setProgress] = useState(8)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [noStars, setNoStars] = useState<{ need: number } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // Прогресс-кольцо: мягкий фейковый прогресс до 90%, докручивается по факту
  useEffect(() => {
    if (step !== 'processing') return
    const t = setInterval(() => setProgress(p => Math.min(90, p + 3 + Math.random() * 5)), 900)
    return () => clearInterval(t)
  }, [step])

  const pollTask = (taskId: string, onDone: (url: string) => void) => {
    pollRef.current = setInterval(async () => {
      const st = await checkGenerationStatus(taskId)
      if (st.status === 'completed' && st.result_url) {
        clearInterval(pollRef.current!)
        setProgress(100)
        onDone(st.result_url)
        tg?.HapticFeedback.notificationOccurred('success')
      } else if (st.status === 'failed') {
        clearInterval(pollRef.current!)
        setError(st.error || 'Ошибка генерации. Звёзды вернутся автоматически')
        setBusy(false)
        setStep(styleId ? 'style' : 'upload')
        tg?.HapticFeedback.notificationOccurred('error')
      }
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
    setStep('mode')
  }

  const pickMode = (m: GenModeInfo) => {
    setMode(m)
    if (m.id === 'empty') { start(m.id === 'empty' ? 'empty_room' : '', undefined); return }
    setStep('category')
  }

  const start = async (sid: string, _q?: undefined) => {
    if (!file || !user) return
    setProgress(8)
    setStep('processing')
    setError('')
    try {
      const fileId = await uploadPhoto(user.telegram_id, file)
      setStyleId(sid)
      setOriginalUrl(fileId)
      const res = await generateDesign({
        user_id: user.telegram_id,
        file_id: fileId,
        style_id: sid,
        mode: keepFurniture ? mode.id : mode.id,
      })
      setGenerationId(parseInt(res.task_id.split('_')[1], 10))
      setResultQuality(res.quality || 'medium')
      setChargeLabel(
        res.charge === 'free' ? 'Бесплатно' :
        res.charge === 'free_draft' ? 'Черновик · бесплатно' :
        res.charge === 'quota' ? 'Из подписки' : `−${DESIGN_COST} кредитов`
      )
      onUserUpdate({ ...user, credits: res.credits_left, free_generations: res.free_left })
      pollTask(res.task_id, (url) => { setResultUrl(url); setStep('result') })
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
      if (resp?.status === 402) {
        setNoStars({ need: DESIGN_COST })
        setStep(styleId ? 'style' : 'upload')
      } else {
        setError(resp?.data?.detail || 'Не удалось запустить генерацию')
      }
      setStep(styleId ? 'style' : (resp?.status === 402 ? styleId ? 'style' : 'upload' : 'upload'))
    }
  }

  const creditsAfter = user.free_generations > 0
    ? (user.credits || 0)
    : Math.max(0, (user.credits || 0) - DESIGN_COST)

  // ===== STEP: upload =====
  if (step === 'upload') {
    return (
      <div className="screen">
        <div className="nav">
          <button className="link" onClick={onBack}>← Назад</button>
          <span className="bal-nav">{user.credits || 0} кредитов</span>
        </div>
        <div className="body">
          <h1 className="screen" style={{ marginTop: 8 }}>Фото комнаты</h1>
          <p className="sub" style={{ marginBottom: 14 }}>
            Снимите комнату целиком, при дневном свете
          </p>

          {!previewUrl ? (
            <label className="drop">
              <span style={{ fontSize: 28 }}>📷</span>
              <span>Нажмите, чтобы выбрать фото</span>
              <span className="tiny">JPG или PNG, до 10 МБ</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
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

          {/* Автоопределение типа помещения */}
          {previewUrl && (
            <button className="act" onClick={() => setStep('category')}>
              <div>
                <div className="t" style={{ fontSize: 13, fontWeight: 600 }}>
                  Похоже, это {category === 'outdoor' ? 'участок' : 'гостиная'}
                </div>
                <div className="tiny">Нажмите, чтобы изменить</div>
              </div>
              <span className="p" style={{ color: 'var(--acc)' }}>Изменить</span>
            </button>
          )}
          {error && <div className="err">{error}</div>}
        </div>

        <div className="foot">
          <div className="row">
            <button className="btn ghost sm" onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
              📷 Сделать фото
            </button>
            <button className="btn ghost sm" onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
              🖼 Галерея
            </button>
          </div>
          <button className="btn" style={{ marginTop: 8 }} disabled={!file}
            onClick={() => setStep(file ? 'category' : 'upload')}>
            Продолжить
          </button>
          <label style={{ display: 'none' }}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
          </label>
        </div>
      </div>
    )
  }

  // ===== STEP: mode =====
  if (step === 'mode') {
    return (
      <div className="screen">
        <div className="nav">
          <button className="link" onClick={() => setStep('upload')}>← Назад</button>
          <span className="bal-nav">{user.credits || 0} кредитов</span>
        </div>
        <div className="body">
          <h1 className="screen" style={{ marginTop: 8 }}>Что сделать?</h1>
          <div style={{ display: 'grid', gap: 10 }}>
            {GEN_MODES.map((m) => (
              <button key={m.id} className="act" onClick={() => pickMode(m)}>
                <span style={{ fontSize: 26 }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                  <div className="tiny">{m.hint}</div>
                </div>
                <span style={{ color: 'var(--t3)' }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ===== STEP: category =====
  if (step === 'category') {
    const goEmpty = () => start(mode.id === 'empty' ? 'empty_room' : 'empty_furnish_base')
    return (
      <div className="screen">
        <div className="nav">
          <button className="link" onClick={() => setStep('mode')}>← Назад</button>
          <span className="bal-nav">{user.credits || 0} кредитов</span>
        </div>
        <div className="body">
          <h1 className="screen" style={{ marginTop: 8 }}>Где находится помещение?</h1>
          <button className="act" onClick={() => { goEmpty(); }} style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 30 }}>🏠</span>
            <div><div style={{ fontWeight: 700 }}>В квартире/доме</div></div>
          </button>
          <button className="act" onClick={goEmpty}>
            <span style={{ fontSize: 30 }}>🌳</span>
            <div><div style={{ fontWeight: 700 }}>На участке</div></div>
          </button>
        </div>
      </div>
    )
  }

  // ===== STEP: style (сетка 2×N с реальными рендерами одной комнаты) =====
  if (step === 'style') {
    const cat = category || 'interior'
    const list = STYLES.filter(s => s.category === cat)
    return (
      <div className="screen">
        <div className="nav">
          <button className="link" onClick={() => setStep('upload')}>← Назад</button>
          <span className="bal-nav">{user.credits || 0} кредитов</span>
        </div>
        <div className="body">
          <h1 className="screen" style={{ marginTop: 8 }}>Выберите стиль</h1>
          <p className="sub" style={{ marginBottom: 12 }}>
            Одна и та же комната в каждом стиле — разница видна сразу
          </p>
          <div className="chips">
            <button className={`c ${keepFurniture ? 'on' : ''}`}
              onClick={() => setKeepFurniture(true)}>Оставить мебель</button>
            <button className={`c ${!keepFurniture ? 'on' : ''}`}
              onClick={() => setKeepFurniture(false)}>Полная перепланировка</button>
          </div>
          <div className="styles">
            {list.map((s) => (
              <button key={s.id} className={`st ${styleId === s.id ? 'on' : ''}`}
                onClick={() => {
                  setStyleId(s.id)
                  tg?.HapticFeedback.selectionChanged()
                }}>
                <img className="img" src={`/styles/${s.id}.jpg`} alt={s.name} loading="lazy" />
                {styleId === s.id && <span className="tick">✓</span>}
                <span className="nm">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="foot">
          <button className="btn" disabled={!styleId} onClick={() => start(styleId)}>
            Создать дизайн{user.free_generations > 0 ? ' · бесплатно' : ` · ${DESIGN_COST} кредитов`}
          </button>
          <div className="tiny" style={{ textAlign: 'center', marginTop: 7 }}>
            {user.free_generations > 0
              ? `Бесплатных осталось: ${user.free_generations}`
              : `Останется ${creditsAfter} кредитов`}
          </div>
        </div>
      </div>
    )
  }

  // ===== STEP: processing =====
  if (step === 'processing') {
    return (
      <div className="screen">
        <div className="body" style={{ textAlign: 'center' }}>
          <div className="ring" style={{ '--p': `${Math.round(progress)}%` } as React.CSSProperties}>
            <i>{Math.round(progress)}%</i>
          </div>
          <h1 className="screen" style={{ fontSize: 19 }}>Создаём дизайн</h1>
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
        <div className="foot">
          <button className="btn ghost" onClick={onBack}>Свернуть — пришлём в чат</button>
        </div>
      </div>
    )
  }

  // ===== STEP: result + апселлы =====
  const style = getStyleById(styleId)

  const doUpsell = async (kind: 'hd' | 'variations') => {
    if (!user || !generationId) return
    setBusy(true)
    setError('')
    try {
      if (kind === 'hd') {
        const res = await enhanceHd(user.telegram_id, generationId)
        onUserUpdate({ ...user, credits: res.credits_left })
        pollTask(res.task_id, (url) => {
          setResultUrl(url)
          setResultQuality('hd')
          setGenerationId(parseInt(res.task_id.split('_')[1], 10))
          setChargeLabel(res.cost === 0 ? 'HD · из подписки' : `HD · −${HD_COST} кредитов`)
          setBusy(false)
        })
      } else {
        const res = await makeVariations(user.telegram_id, generationId)
        onUserUpdate({ ...user, credits: res.credits_left })
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
        setNoStars({ need: kind === 'hd' ? HD_COST : VARIATIONS_COST })
      } else {
        setError(resp?.data?.detail || 'Не удалось выполнить')
      }
      setBusy(false)
    }
  }

  // SPEC 3.6: черновик (Low) → финальный рендер Medium за 5 кредитов
  const doFinalRender = async () => {
    if (!user || !originalUrl || !styleId) return
    setBusy(true)
    setError('')
    try {
      const res = await generateDesign({
        user_id: user.telegram_id,
        file_id: originalUrl,
        style_id: styleId,
        mode: mode.id,
      })
      onUserUpdate({ ...user, credits: res.credits_left, free_generations: res.free_left })
      setGenerationId(parseInt(res.task_id.split('_')[1], 10))
      setChargeLabel(`Финальный рендер · −${DESIGN_COST} кредитов`)
      pollTask(res.task_id, (url) => {
        setResultUrl(url)
        setResultQuality(res.quality || 'medium')
        setBusy(false)
      })
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
      if (resp?.status === 402) {
        setNoStars({ need: DESIGN_COST })
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

  return (
    <div className="screen">
      <div className="nav">
        <button className="link" onClick={onBack}>← На главную</button>
        <span className="bal-nav">{user.credits || 0} кредитов</span>
      </div>
      <div className="body">
        {originalUrl && (
          <BeforeAfter
            before={`${API_URL}/uploads/${originalUrl}`}
            after={`${API_URL}${resultUrl}`}
            height={260}
            labelAfter={style ? style.name : 'После'}
          />
        )}
        {chargeLabel && (
          <p className="tiny" style={{ textAlign: 'center', marginBottom: 10 }}>{chargeLabel}</p>
        )}

        {/* SPEC 3.6: для черновика (Low) — одна кнопка финального рендера, платные апселлы скрыты */}
        {resultQuality === 'low' ? (
          <button className="act" disabled={busy} onClick={doFinalRender}>
            <div>
              <div className="t" style={{ fontSize: 13, fontWeight: 600 }}>Сделать финальный рендер</div>
              <div className="tiny">Убрать черновик, полное качество</div>
            </div>
            <span className="p">{DESIGN_COST} кредитов</span>
          </button>
        ) : (
          <>
            <button className="act" disabled={busy} onClick={() => doUpsell('hd')}>
              <div>
                <div className="t" style={{ fontSize: 13, fontWeight: 600 }}>Улучшить в HD</div>
                <div className="tiny">Максимум деталей, для печати</div>
              </div>
              <span className="p">{HD_COST} кредитов</span>
            </button>
            <button className="act" disabled={busy} onClick={() => doUpsell('variations')}>
              <div>
                <div className="t" style={{ fontSize: 13, fontWeight: 600 }}>Ещё 3 варианта</div>
                <div className="tiny">Тот же стиль, другая расстановка</div>
              </div>
              <span className="p">{VARIATIONS_COST} кредитов</span>
            </button>
            <button className="act" disabled title="Скоро: убирайте и меняйте объекты на фото">
              <div>
                <div className="t" style={{ fontSize: 13, fontWeight: 600 }}>Изменить деталь</div>
                <div className="tiny">Убрать или заменить объект</div>
              </div>
              <span className="p">5 кредитов</span>
            </button>
          </>
        )}
        <button className="act" onClick={handleDownload}>
          <div>
            <div className="t" style={{ fontSize: 13, fontWeight: 600 }}>Список мебели</div>
            <div className="tiny">Что купить и за сколько</div>
          </div>
          <span className="p free">Скоро</span>
        </button>

        {error && <div className="err">{error}</div>}
        {busy && <p className="tiny" style={{ textAlign: 'center', marginTop: 8 }}>Работаем…</p>}
      </div>

      <div className="foot">
        <div className="row">
          <button className="btn ghost sm" onClick={handleDownload}>💾 Сохранить</button>
          <button className="btn ghost sm" onClick={() => {
            tg?.HapticFeedback.impactOccurred('light');
            tg?.openTelegramLink('https://t.me/stroitelinfo')
          }}>В чат</button>
          <button className="btn ghost sm" onClick={() => { setResultUrl(''); setChargeLabel(''); setStep('style') }}>
            Другой стиль
          </button>
        </div>
      </div>

      {/* Шторка «Не хватает кредитов» — поверх контекста, сценарий не теряется */}
      {noStars && (
        <div className="overlay" onClick={() => setNoStars(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bar" />
            <h2 className="card-t" style={{ fontSize: 18, marginBottom: 2 }}>
              Не хватает {Math.max(0, noStars.need - (user.credits || 0))} кредитов
            </h2>
            <p className="sub" style={{ marginBottom: 14 }}>Купленные кредиты не сгорают</p>

            {PACK_ORDER.map((pid) => {
              const p = PACKS[pid]
              return (
                <div key={pid} className={`pack ${pid === 'sub_pro' ? 'best' : ''}`}>
                  {p.badge && <span className="badge">{p.badge}</span>}
                  <div className="pr"><b>{p.title}</b><span>{p.kind === 'pack' ? `${p.credits} кредитов` : ''}</span></div>
                  <div className="tiny">{p.desc}</div>
                  <button className="btn sm" style={{ marginTop: 10 }}
                    onClick={async () => {
                      try {
                        const { invoice_url } = await buyPack(user.telegram_id, pid)
                        tg?.openInvoice(invoice_url, (status) => {
                          if (status === 'paid') {
                            setNoStars(null)
                            window.location.reload()
                          }
                        })
                      } catch { tg?.showAlert?.('Не удалось создать счёт') }
                    }}>
                    Купить за {p.price} ⭐
                  </button>
                </div>
              )
            })}

            <button className="btn ghost sm"
              onClick={() => {
                setNoStars(null)
                navigator.clipboard?.writeText(`https://t.me/dekor_info_ai_bot?start=ref_${user.telegram_id}`)
                tg?.showAlert?.('Ссылка-приглашение скопирована. +10 кредитов после первой генерации друга')
              }}>
              Пригласить друга: +10 кредитов
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
