// PATCH v3 Шаг 3 (§3.5, §5, §4): экран /upload — ТОЛЬКО JSX.
// Вся логика — в useUploadFlow (Шаг 2), системные кнопки — useTelegramChrome (Шаг 1).
// Старый v2.2 не рендерится вообще (критерий приёмки: старый путь не отрисовывает ничего).
//
// Что изменилось против v2.2:
// - Шаги style/direction убраны: стиль выбирается на главной//styles (§3.3),
//   направление — на /task/:id (§3.4). Здесь: upload → quality → processing → result.
// - Пунктирная дропзона убрана: крупная превью-зона (§3.5).
// - Эмодзи 📷🖼 → SVG-иконки (§4.6).
// - «Камера» и «Галерея» — два разных input (у камеры capture="environment";
//   в v2.2 обе кнопки открывали один и тот же input — баг).
// - Подсказки по съёмке — свои для каждой задачи (§5): 2–3 инлайн, остальные под «Как снять лучше».
// - Формат/вес — мелким серым под зоной (§3.5), ошибки — только в тексте ошибки.
// - Главное действие каждого шага — MainButton (§4.1), BackButton — на всех шагах (§4.3).
// - taskId/styleId/directionId — в URL (§4.4): возврат сохраняет выбор.
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { User } from '../types'
import { useUploadFlow, REFINE_CHIPS } from '../hooks/useUploadFlow'
import { useMainButton, useBackButton } from '../hooks/useTelegramChrome'
import { COST_LOW, COST_MEDIUM, COST_HD, COST_VARIATIONS, logEvent, API_URL } from '../api'
import BeforeAfter from './BeforeAfter'

interface Props {
  user: User
  onUserUpdate: (u: User) => void
}

// ===== SVG-иконки в стилистике Telegram (§4.6) =====
const IconCamera = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)
const IconGallery = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
)

// ===== Подсказки по съёмке — свои для каждой задачи (§5) =====
const SHOOT_HINTS: Record<string, { title: string; inline: string[]; more: string[] }> = {
  room_design: {
    title: 'Как снять комнату',
    inline: [
      'От дверного проёма или из угла — чтобы попало максимум пространства',
      'Камера на высоте груди; в кадре — стык двух стен и часть пола',
      'В хороший дневной свет выключите верхний свет',
    ],
    more: [
      'Прибираться перед съёмкой не нужно',
      'Не используйте фишай — обычная камера телефона лучше всего',
      'Минимальное разрешение — 1024×768',
    ],
  },
  declutter: {
    title: 'Как снять комнату',
    inline: [
      'Тот же кадр, что и для дизайна комнаты — ракурс не меняйте',
      'Камера на высоте груди; в кадре — стык двух стен и часть пола',
    ],
    more: ['Минимальное разрешение — 1024×768'],
  },
  facade: {
    title: 'Как снять фасад',
    inline: [
      'Фронтально, с отступа — дом целиком в кадре',
      'Днём, без контрового солнца',
    ],
    more: ['Минимальное разрешение — 1024×768'],
  },
  garden: {
    title: 'Как снять участок',
    inline: [
      'С одной точки — чтобы были видны границы участка и горизонт',
      'Лучше днём при ровном свете',
    ],
    more: ['Минимальное разрешение — 1024×768'],
  },
}
const DEFAULT_HINTS = SHOOT_HINTS.room_design

const TITLES: Record<string, string> = {
  room_design: 'Ваша комната',
  declutter: 'Ваша комната',
  facade: 'Фасад дома',
  garden: 'Ваш участок',
}

export default function UploadScreen({ user, onUserUpdate }: Props) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const jobId = params.get('jobId') || 'room_design'
  const styleId = params.get('styleId') || undefined
  const directionId = params.get('directionId') || undefined

  const flow = useUploadFlow({ user, onUserUpdate, jobId, styleId, directionId })
  const { step, setStep, previewUrl, quality, setQuality, busy, error } = flow
  const [hintsOpen, setHintsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const hints = SHOOT_HINTS[jobId] || DEFAULT_HINTS
  const title = TITLES[jobId] || 'Ваша комната'
  const pickCamera = (e: React.ChangeEvent<HTMLInputElement>) => { flow.pick(e.target.files?.[0], 'camera'); e.currentTarget.value = '' }
  const pickGallery = (e: React.ChangeEvent<HTMLInputElement>) => { flow.pick(e.target.files?.[0], 'gallery'); e.currentTarget.value = '' }

  // ===== §4.3 BackButton на каждом шаге; на processing — скрыта (нельзя уронить задачу) =====
  useBackButton({
    onBack: () => {
      if (step === 'upload') navigate(-1)
      else if (step === 'quality') setStep('upload')
      else if (step === 'result') navigate('/home')
      // processing: намеренно ничего — задача идёт
    },
    force: step !== 'processing',
  })

  // ===== §4.1 MainButton — главное действие шага =====
  const mainAction = useMemo(() => {
    switch (step) {
      case 'upload':
        return previewUrl
          ? { text: 'Продолжить', enabled: true, onClick: () => setStep('quality') }
          : { text: '', enabled: false, onClick: () => {} }
      case 'quality':
        return { text: 'Создать дизайн', enabled: !busy, onClick: () => flow.start() }
      case 'processing':
        return { text: '', enabled: false, onClick: () => {} }
      case 'result':
        return { text: 'Сохранить', enabled: !busy, onClick: flow.download }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, previewUrl, busy, quality, flow.resultUrl])

  useMainButton({
    text: mainAction.text,
    enabled: mainAction.enabled,
    onClick: mainAction.onClick,
    loading: busy && step === 'quality',
  })

  // ===== Шаг: upload (§3.5) =====
  if (step === 'upload') {
    return (
      <div className="app__body upload-v3">
        <h1 className="upload-v3__title">{title}</h1>
        <p className="upload-v3__hint">Подойдёт любое фото — можно из галереи</p>

        {!previewUrl ? (
          <button
            className="upload-v3__preview"
            onClick={() => document.getElementById('upl-gallery')?.click()}
            aria-label="Выбрать фото"
          >
            <span className="upload-v3__preview-empty">
              <IconGallery />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Выберите фото</span>
            </span>
          </button>
        ) : (
          <div className="upload-v3__preview">
            <img src={previewUrl} alt="Превью" />
          </div>
        )}

        {/* §3.5: ограничения — мелким серым под зоной */}
        <p className="upload-v3__format-info">JPG, PNG или WebP · до 10 МБ · от 1024×768</p>

        {/* §5: контекстные подсказки — 2-3 инлайн, остальные под «Как снять лучше» */}
        <div className="upload-v3__shoot-hint">
          <span className="upload-v3__shoot-hint-title">{hints.title}</span>
          <ul>
            {hints.inline.map(h => <li key={h}>{h}</li>)}
          </ul>
          {!hintsOpen && (
            <button className="upload-v3__shoot-hint-toggle" onClick={() => setHintsOpen(true)}>
              Как снять лучше
            </button>
          )}
          {hintsOpen && (
            <ul>
              {hints.more.map(h => <li key={h}>{h}</li>)}
            </ul>
          )}
        </div>

        {error && <div className="err">{error}</div>}

        {/* Два источника: Камера и Галерея — SVG, раздельные input (§3.5) */}
        <div className="upload-v3__sources">
          <button className="upload-v3__src-btn" onClick={() => document.getElementById('upl-camera')?.click()}>
            <IconCamera />
            <span className="upload-v3__src-btn-title">Камера</span>
          </button>
          <button className="upload-v3__src-btn" onClick={() => document.getElementById('upl-gallery')?.click()}>
            <IconGallery />
            <span className="upload-v3__src-btn-title">Галерея</span>
          </button>
        </div>

        <input id="upl-camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
          style={{ display: 'none' }} onChange={pickCamera} />
        <input id="upl-gallery" type="file" accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }} onChange={pickGallery} />
      </div>
    )
  }

  // ===== Шаг: quality =====
  if (step === 'quality') {
    const freeLeft = user.credits_free_daily || 0
    const dailyExhausted = freeLeft <= 0
    return (
      <div className="app__body upload-v3">
        <h1 className="upload-v3__title">
          {dailyExhausted ? 'Бесплатные дизайны на сегодня закончились' : 'Качество результата'}
        </h1>
        <p className="upload-v3__hint">
          {dailyExhausted
            ? 'Сделайте дизайн в полном качестве — без водяного знака'
            : 'Быстрый вариант — чтобы мгновенно посмотреть идею'}
        </p>

        {!dailyExhausted && (
          <button className={`act ${quality === 'low' ? 'on' : ''}`} onClick={() => setQuality('low')}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Быстрый вариант</div>
              <div className="tiny">Мгновенно · с водяным знаком · {freeLeft > 0 ? 'бесплатно сегодня' : `${COST_LOW} кредит`}</div>
            </div>
            <span className="p free">{freeLeft > 0 ? `Сегодня: ${freeLeft}` : `${COST_LOW} кр.`}</span>
          </button>
        )}

        <button className={`act ${quality === 'medium' ? 'on' : ''}`} onClick={() => setQuality('medium')}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Полное качество</div>
            <div className="tiny">Без водяного знака · детальная проработка</div>
          </div>
          <span className="p">{COST_MEDIUM} кредитов</span>
        </button>

        {error && <div className="err">{error}</div>}

        <button
          className="linkline"
          onClick={() => { logEvent(user.telegram_id, 'limit_banner_tap', { from: 'quality' }); navigate('/home') }}
        >
          Пополнить баланс
        </button>
      </div>
    )
  }

  // ===== Шаг: processing =====
  if (step === 'processing') {
    return (
      <div className="app__body upload-v3" style={{ textAlign: 'center' }}>
        <div className="ring" style={{ '--p': `${Math.round(flow.progress)}%` } as React.CSSProperties}>
          <i>{Math.round(flow.progress)}%</i>
        </div>
        <h1 className="upload-v3__title" style={{ fontSize: 19 }}>Создаём дизайн</h1>
        <p className="upload-v3__hint" style={{ marginBottom: 22 }}>Обычно 20–40 секунд</p>
        <div style={{ maxWidth: 210, margin: '0 auto', textAlign: 'left' }}>
          {flow.genSteps.map((s, i) => (
            <div key={s} className={`step ${flow.progress > (i + 1) * 28 ? 'on' : ''}`}>
              <span className={`dotp ${flow.progress > (i + 1) * 28 ? 'on' : ''}`} />{s}
            </div>
          ))}
        </div>
        {error && <div className="err" style={{ textAlign: 'left' }}>{error}</div>}
        <button
          className="btn ghost"
          style={{ marginTop: 16 }}
          onClick={() => { window.Telegram?.WebApp?.close?.(); navigate('/home') }}
        >
          Свернуть — пришлём в чат
        </button>
      </div>
    )
  }

  // ===== Шаг: result (§7.4: тёмный; §3.6 свайпер вариантов + чипсы уточнения) =====
  const hasVariants = flow.variants.length > 1
  return (
    <>
      <div className="app__body result-dark" style={{ background: '#0F1013' }}>
        <div onClick={() => setFullscreen(true)} style={{ cursor: 'zoom-in' }}>
          <BeforeAfter
            before={`${API_URL}/uploads/${flow.fileId}`}
            after={`${API_URL}${flow.resultUrl}`}
            labelAfter={flow.resultQuality === 'hd' ? 'HD' : 'После'}
          />
        </div>

        {hasVariants && (
          <div className="variant-dots" role="tablist" aria-label="Варианты">
            {flow.variants.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === flow.variantIdx}
                className={`variant-dot ${i === flow.variantIdx ? 'on' : ''}`}
                onClick={() => flow.gotoVariant(i)}
                aria-label={`Вариант ${i + 1}`}
              />
            ))}
          </div>
        )}

        {flow.chargeLabel && (
          <p className="tiny" style={{ textAlign: 'center', marginBottom: 10 }}>{flow.chargeLabel}</p>
        )}

        {flow.resultQuality === 'low' && (
          <button className="wm-note" onClick={() => {
            logEvent(user.telegram_id, 'wm_upgrade_clicked', { generation_id: flow.generationId })
            flow.start('medium')
          }}>
            Без водяного знака — <b>в полном качестве</b>
          </button>
        )}

        {flow.resultQuality !== 'hd' && (
          <>
            <button className="btn" disabled={busy} onClick={() => flow.doUpsell('hd')} style={{ marginBottom: 4 }}>
              Сделать в высоком качестве
            </button>
            <p className="hd-price">{COST_HD} кредитов</p>
          </>
        )}
        <button className="act" disabled={busy} onClick={() => flow.doUpsell('variations')}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Другой вариант</div>
            <div className="tiny">Тот же стиль, другая расстановка · осталось {Math.max(0, 2 - flow.variants.length)}</div>
          </div>
          <span className="p">{COST_VARIATIONS} кредитов</span>
        </button>

        {/* §3.6: чипсы уточнения — ведут на вариацию с пометкой */}
        <div className="refine-chips">
          {REFINE_CHIPS.map(chip => (
            <button
              key={chip.id}
              className={`chip ${flow.refineTag === chip.id ? 'on' : ''}`}
              disabled={busy}
              onClick={() => flow.applyRefine(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <button className="linkline" style={{ color: '#8AB4F8' }} onClick={() => navigate('/home')}>
          Сделать ещё одну комнату
        </button>

        {error && <div className="err">{error}</div>}
        {busy && <p className="tiny" style={{ textAlign: 'center', marginTop: 8 }}>Работаем…</p>}
      </div>

      <div className="app__foot result-dark" style={{ background: '#0F1013' }}>
        <button className="btn ghost sm" onClick={flow.share}>Поделиться</button>
      </div>

      {fullscreen && (
        <div className="fullscreen" onClick={() => setFullscreen(false)}>
          <img src={`${API_URL}${flow.resultUrl}`} alt="Результат" />
        </div>
      )}
    </>
  )
}
