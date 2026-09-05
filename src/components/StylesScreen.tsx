// SPEC §3.2 (Этап B): экран всех стилей /styles (Уровень 2).
// 16 стилей в строгом порядке выдачи манифеста (1. Максимализм ... 16. Ваби-саби).
// Поддержка оверлеев (plain, gradient, frame), выбор стиля, переход на /upload.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../types'
import { STYLES_TIER2 } from '../config/catalog'
import { asset } from '../lib/assets'
import { logEvent } from '../api'
import { useMainButton, useBackButton } from '../hooks/useTelegramChrome'

export default function StylesScreen({ user }: { user: User }) {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string>(() =>
    localStorage.getItem('dekor_last_style') || '',
  )

  const selectedStyle = STYLES_TIER2.find(s => s.id === selectedId)

  const openUpload = (id: string) => {
    const last = localStorage.getItem('dekor_last_style')
    if (last !== id) {
      localStorage.setItem('dekor_last_style', id)
      logEvent(user.telegram_id, 'style_selected', { style_id: id })
    }
    setSelectedId(id)
    navigate(`/upload?jobId=room_design&styleId=${encodeURIComponent(id)}`)
  }

  // §4.3: BackButton — назад на главную. force: true — показываем системную стрелку.
  const goBack = () => {
    const idx = (window.history.state as { idx?: number })?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/home')
  }
  useBackButton({ onBack: goBack, force: true })

  // §4.1: MainButton — название стиля
  useMainButton({
    text: selectedStyle ? `Продолжить · ${selectedStyle.title}` : '',
    enabled: Boolean(selectedStyle),
    onClick: () => selectedStyle && openUpload(selectedStyle.id),
  })

  return (
    <div className="app__body styles-v3">
      <h1 className="styles-v3__title">Стили интерьера</h1>

      <div className="styles-v3__grid">
        {STYLES_TIER2.map(s => {
          const isSelected = s.id === selectedId
          const overlayClass = s.overlay === 'gradient' ? 'styles-v3__card--gradient' : s.overlay === 'frame' ? 'styles-v3__card--frame' : ''
          return (
            <button
              key={s.id}
              className={`styles-v3__card ${isSelected ? 'styles-v3__card--selected' : ''} ${overlayClass}`}
              onClick={() => {
                setSelectedId(s.id)
                window.Telegram?.WebApp?.HapticFeedback.selectionChanged()
              }}
              onDoubleClick={() => openUpload(s.id)}
            >
              <div className="styles-v3__card-img">
                <img src={asset(s.after, 'card')} alt={s.title} loading="lazy" />
              </div>
              <span className="styles-v3__card-title">{s.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
