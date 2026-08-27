import { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import { User, Generation } from '../types'
import { getUserGenerations, API_URL } from '../api'
import { getStyleById } from '../config/styles'

interface Props {
  user: User
  onBack: () => void
}

// SPEC 2.6: даты без секунд — «Сегодня, 17:39», «12 марта, 09:14»
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
  const [filter, setFilter] = useState<'all' | 'interior' | 'outdoor'>('all')

  useEffect(() => {
    loadGenerations()
  }, [user.telegram_id])

  const loadGenerations = async () => {
    try {
      const data = await getUserGenerations(user.telegram_id)
      setGenerations(data)
    } catch (error) {
      console.error('Failed to load generations:', error)
      WebApp.showPopup({
        title: '❌ Ошибка',
        message: 'Не удалось загрузить историю',
        buttons: [{ type: 'ok' }]
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredGenerations = filter === 'all' 
    ? generations 
    : generations.filter(g => g.category === filter)

  const handleImageClick = (generation: Generation) => {
    WebApp.HapticFeedback.impactOccurred('light')
    WebApp.openLink(generation.result_image_url)
  }

  return (
    <div className="container">
      <button className="btn btn-outline mb-2" onClick={onBack}>
        ← Назад
      </button>

      <h2 className="mb-2">📚 История генераций</h2>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <div className="card mb-2">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter('all')}
                style={{ flex: 1 }}
              >
                Все ({generations.length})
              </button>
              <button 
                className={`btn ${filter === 'interior' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter('interior')}
                style={{ flex: 1 }}
              >
                🏠 Интерьеры
              </button>
              <button 
                className={`btn ${filter === 'outdoor' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter('outdoor')}
                style={{ flex: 1 }}
              >
                🌳 Дом и дача
              </button>
            </div>
          </div>

          {filteredGenerations.length === 0 ? (
            <div className="card text-center" style={{ padding: '48px 24px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
              <h3>История пуста</h3>
              <p style={{ 
                color: 'var(--tg-theme-hint-color)',
                marginTop: '8px'
              }}>
                Создайте первую генерацию, чтобы она появилась здесь
              </p>
            </div>
          ) : (
            <div className="grid grid-2">
              {filteredGenerations.map(generation => {
                const style = getStyleById(generation.style_id)
                return (
                  <div 
                    key={generation.id}
                    className="card"
                    onClick={() => handleImageClick(generation)}
                    style={{ 
                      cursor: 'pointer',
                      padding: '0',
                      overflow: 'hidden'
                    }}
                  >
                    {/* SPEC 1.2: превью webp + fallback-плейсхолдер вместо «?» */}
                    <img 
                      src={`${API_URL}${generation.preview_url || generation.result_image_url}`}
                      alt={style?.name || 'Result'}
                      style={{ 
                        width: '100%',
                        height: '180px',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        const ph = document.createElement('div')
                        ph.className = 'ph'
                        ph.style.height = '180px'
                        ph.textContent = style?.name || 'Дизайн'
                        img.replaceWith(ph)
                      }}
                    />
                    <div style={{ padding: '12px' }}>
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{ fontSize: '20px' }}>
                          {style?.emoji || '🎨'}
                        </span>
                        <strong>{style?.name || 'Стиль'}</strong>
                      </div>
                      <div style={{ 
                        fontSize: '12px',
                        color: 'var(--tg-theme-hint-color)'
                      }}>
                        {formatDate(generation.created_at)}
                      </div>
                      {generation.cost_stars > 0 && (
                        <div style={{ 
                          fontSize: '12px',
                          color: 'var(--primary-color)',
                          marginTop: '4px'
                        }}>
                          {generation.cost_stars} кредитов
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
