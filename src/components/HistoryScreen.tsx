// «Ваши работы» SPEC v2.0 §11: только человекочитаемые названия (display_name
// приходит с сервера), одна подпись на карточку, градиентный плейсхолдер
// вместо битой картинки, скелетоны при загрузке.
import { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import type { User, Generation } from '../types'
import { getUserGenerations, API_URL } from '../api'

interface Props {
  user: User
  onBack: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const hm = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Сегодня, ${hm}`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + `, ${hm}`
}

export default function HistoryScreen({ user, onBack }: Props) {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserGenerations(user.telegram_id)
      .then(setGenerations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.telegram_id])

  return (
    <>
      <div className="app__nav">
        <button className="link" onClick={onBack}>← Назад</button>
        <span className="bal-nav">{user.balance_line}</span>
      </div>
      <div className="app__body">
        <h1 className="h" style={{ marginTop: 8 }}>Ваши работы</h1>
        <p className="sub" style={{ marginBottom: 14 }}>
          {generations.length > 0 ? `${generations.length} ${generations.length === 1 ? 'работа' : 'работ'}` : ''}
        </p>

        {loading ? (
          <>
            <div className="skel" style={{ height: 76, borderRadius: 14, marginBottom: 10 }} />
            <div className="skel" style={{ height: 76, borderRadius: 14, marginBottom: 10 }} />
            <div className="skel" style={{ height: 76, borderRadius: 14, marginBottom: 10 }} />
          </>
        ) : generations.length === 0 ? (
          <div className="card">
            <div className="pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📭</div>
              <h2 className="card-t" style={{ marginBottom: 6 }}>Пока пусто</h2>
              <p className="sub">Создайте первый дизайн — он появится здесь</p>
            </div>
          </div>
        ) : (
          generations.map(g => (
            <button key={g.id} className="hist" onClick={() => {
              WebApp.HapticFeedback.impactOccurred('light')
              WebApp.openLink(`${API_URL}${g.result_image_url}`)
            }}>
              {(g.preview_url || g.result_image_url) ? (
                <img className="th" src={`${API_URL}${g.preview_url || g.result_image_url}`}
                  alt="" loading="lazy"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    const ph = document.createElement('div')
                    ph.className = 'ph'
                    ph.style.width = '56px'
                    ph.style.height = '46px'
                    ph.style.minHeight = '46px'
                    ph.style.borderRadius = '9px'
                    ph.textContent = '🎨'
                    img.replaceWith(ph)
                  }} />
              ) : (
                <div className="ph" style={{ width: 56, height: 46, minHeight: 46, borderRadius: 9 }}>🎨</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Одна подпись: название + дата, без дублирования (§11) */}
                <div style={{ fontSize: 13, fontWeight: 600 }}>{g.display_name || 'Дизайн комнаты'}</div>
                <div className="tiny">{formatDate(g.created_at)}</div>
              </div>
              {g.quality === 'hd' && <span className="badge b-gold">HD</span>}
              {g.quality === 'low' && <span className="badge b-blue">Черновик</span>}
            </button>
          ))
        )}
      </div>
    </>
  )
}
