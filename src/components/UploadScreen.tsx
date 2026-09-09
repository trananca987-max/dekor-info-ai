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
import { logEvent, API_URL } from '../api'
import BeforeAfter from './BeforeAfter'

interface Props {
  user: User
  onUserUpdate: (u: User) => void
}

// ===== Утилиты =====
export function isFirstWeek(user: User): boolean {
  if (!user.first_seen_at) return true
  const first = new Date(user.first_seen_at).getTime()
  return (Date.now() - first) < 7 * 24 * 3600 * 1000
}

// ===== SVG-иконки в стилистике Telegram =====
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
  const { step, setStep, previewUrl, quality, busy, error } = flow
  const [hintsOpen, setHintsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [refineText, setRefineText] = useState('')

  const hints = SHOOT_HINTS[jobId] || DEFAULT_HINTS
  const title = TITLES[jobId] || 'Ваша комната'
  const pickCamera = (e: React.ChangeEvent<HTMLInputElement>) => { flow.pick(e.target.files?.[0], 'camera'); e.currentTarget.value = '' }
  const pickGallery = (e: React.ChangeEvent<HTMLInputElement>) => { flow.pick(e.target.files?.[0], 'gallery'); e.currentTarget.value = '' }

  // ===== §4.3 BackButton на каждом шаге; на processing — скрыта (нельзя уронить задачу) =====
  useBackButton({
    onBack: () => {
      if (step === 'upload') navigate('/home', { replace: true })
      else if (step === 'quality') setStep('upload')
      else if (step === 'result') navigate('/home', { replace: true })
      // processing: намеренно ничего — задача идёт
    },
    force: step !== 'processing',
  })

  // ===== §4.1 MainButton — главное действие шага =====
  const mainAction = useMemo(() => {
    switch (step) {
      case 'upload':
        return previewUrl
          ? { text: 'Создать дизайн', enabled: true, onClick: () => flow.start() }
          : { text: '', enabled: false, onClick: () => {} }
      case 'quality':
        return { text: 'Создать дизайн', enabled: !busy, onClick: () => flow.start() }
      case 'processing':
        return { text: '', enabled: false, onClick: () => {} }
      case 'result':
        return { text: 'Сохранить фото', enabled: !busy, onClick: flow.download }
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
          <div className="upload-v3__preview" aria-label="Превью фото">
            <span className="upload-v3__preview-empty">
              <IconGallery />
            </span>
          </div>
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
    return (
      <div className="app__body upload-v3">
        <h1 className="upload-v3__title">Создание дизайна</h1>
        <p className="upload-v3__hint">Фото готово к обработке в выбранном стиле</p>

        <button className="act on" onClick={() => flow.start()}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Полное качество</div>
            <div className="tiny">Без водяного знака · детальная проработка</div>
          </div>
          <span className="p">1 дизайн</span>
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
      <div className="app__body result-dark" style={{ background: '#0F1013', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            onClick={() => navigate('/home', { replace: true })}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 16,
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            ‹ На главную
          </button>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>
            Готовый результат
          </span>
        </div>

        <div onClick={() => setFullscreen(true)} style={{ cursor: 'zoom-in', borderRadius: 12, overflow: 'hidden' }}>
          <BeforeAfter
            before={`${API_URL}/uploads/${flow.fileId}`}
            after={`${API_URL}${flow.resultUrl}`}
            labelAfter="После"
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

        {/* Действия: Сохранить и Поделиться */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          <button
            className="btn"
            style={{ margin: 0, padding: '12px 8px', fontSize: 14, fontWeight: 600 }}
            disabled={busy}
            onClick={flow.download}
          >
            💾 Сохранить
          </button>
          <button
            className="btn ghost"
            style={{ margin: 0, padding: '12px 8px', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#fff' }}
            disabled={busy}
            onClick={flow.share}
          >
            💬 В чат
          </button>
        </div>

        {/* §3.6: чипсы уточнения — ведут на вариацию с пометкой */}
        <div className="refine-chips" style={{ marginTop: 14 }}>
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

        {/* Текстовая правка результата (1 дизайн): опишите, что изменить */}
        <div style={{ marginTop: 14, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
          <label htmlFor="refine-text" style={{ display: 'block', color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            ✏️ Точная правка текстом
          </label>
          <textarea
            id="refine-text"
            value={refineText}
            onChange={(e) => setRefineText(e.target.value.slice(0, 500))}
            disabled={busy}
            rows={3}
            placeholder="Например: вернуть предыдущий пол, а в нише сделать закрытый книжный шкаф из дерева"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              padding: '10px 12px',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.4,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              {refineText.length}/500 · −1 дизайн
            </span>
            <button
              className="btn"
              style={{ margin: 0, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
              disabled={busy || refineText.trim().length < 3}
              onClick={() => {
                const t = refineText
                setRefineText('')
                void flow.applyRefineText(t)
              }}
            >
              {busy ? 'Работаю…' : 'Применить'}
            </button>
          </div>
        </div>

        <button
          className="linkline"
          style={{ color: '#8AB4F8', marginTop: 12, padding: 8 }}
          onClick={() => navigate('/home', { replace: true })}
        >
          Сделать ещё один дизайн
        </button>

        {error && <div className="err">{error}</div>}
        {busy && <p className="tiny" style={{ textAlign: 'center', marginTop: 8, color: '#fff' }}>Работаем…</p>}
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
