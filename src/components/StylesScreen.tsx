// SPEC §3.2 (Этап B - PATCH v5): экран всех стилей /styles (Уровень 2).
// 16 стилей в строгом порядке выдачи манифеста (1. Максимализм ... 16. Ваби-саби).
// При открытии выбор пустой, CTA неактивна «Продолжить»; после выбора — «Продолжить · {Название}».
// Индикация выбора: обводка 2px accent_text_color вокруг всего кадра + галочка в круге в углу кадра.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../types'
import { STYLES_TIER2 } from '../config/catalog'
import { asset } from '../lib/assets'
import { logEvent } from '../api'
import { useMainButton, useBackButton } from '../hooks/useTelegramChrome'

export default function StylesScreen({ user }: { user: User }) {
  const navigate = useNavigate()
  // Выбор при открытии всегда пустой (§4)
  const [selectedId, setSelectedId] = useState<string>('')

  const selectedStyle = STYLES_TIER2.find((s) => s.id === selectedId)

  const handleSelect = (id: string) => {
    setSelectedId(id)
    window.Telegram?.WebApp?.HapticFeedback.selectionChanged()
    logEvent(user.telegram_id, 'style_selected', { style_id: id })
  }

  const handleConfirm = (id: string) => {
    navigate(`/upload?jobId=room_design&styleId=${encodeURIComponent(id)}`)
  }

  // §4.3: BackButton — назад на главную
  const goBack = () => {
    const idx = (window.history.state as { idx?: number })?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/home')
  }
  useBackButton({ onBack: goBack, force: true })

  // §4.1: Telegram MainButton
  useMainButton({
    text: selectedStyle ? `Продолжить · ${selectedStyle.title}` : 'Продолжить',
    enabled: Boolean(selectedStyle),
    onClick: () => selectedStyle && handleConfirm(selectedStyle.id),
  })

  return (
    <div className="app__body styles-v3">
      <h1 className="styles-v3__title">Стили интерьера</h1>

      <div className="styles-v3__grid">
        {STYLES_TIER2.map((s) => {
          const isSelected = s.id === selectedId
          const overlayClass =
            s.overlay === 'gradient'
              ? 'styles-v3__card--gradient'
              : s.overlay === 'frame'
              ? 'styles-v3__card--frame'
              : ''

          return (
            <div
              key={s.id}
              className={`styles-v3__card ${isSelected ? 'styles-v3__card--selected' : ''} ${overlayClass}`}
              onClick={() => handleSelect(s.id)}
              role="button"
              tabIndex={0}
            >
              <div className="styles-v3__card-img-wrap">
                <img src={asset(s.after, 'card')} alt={s.title} loading="lazy" className="styles-v3__card-img" />

                {/* Галочка выбора в круге */}
                {isSelected && (
                  <div className="styles-v3__card-check" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="styles-v3__card-title">{s.title}</span>
            </div>
          )
        })}
      </div>

      {/* Фолбэк CTA-кнопка для браузера / десктопа */}
      <div className="styles-v3__cta-bar">
        <button
          type="button"
          className="btn-primary styles-v3__cta-btn"
          disabled={!selectedStyle}
          onClick={() => selectedStyle && handleConfirm(selectedStyle.id)}
        >
          {selectedStyle ? `Продолжить · ${selectedStyle.title}` : 'Продолжить'}
        </button>
      </div>
    </div>
  )
}
