// Экран просмотра результата генерации из «Ваши работы» (/result/:id).
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { User, Generation } from '../types'
import { getUserGenerations, getUser, logEvent, API_URL } from '../api'
import { useBackButton } from '../hooks/useTelegramChrome'
import BeforeAfter from './BeforeAfter'
import BalanceRow from './BalanceRow'
import PricingSheet from './PricingSheet'

interface Props {
  user: User
  onUserUpdate?: (user: User) => void
}

export default function ResultScreen({ user, onUserUpdate }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const genId = Number(id)
  const [work, setWork] = useState<Generation | null>(null)
  const [loading, setLoading] = useState(true)
  const [pricingOpen, setPricingOpen] = useState(false)

  useBackButton({ onBack: () => navigate('/home'), force: true })

  useEffect(() => {
    let alive = true
    logEvent(user.telegram_id, 'result_view', { generation_id: genId })
    getUserGenerations(user.telegram_id)
      .then((list) => {
        if (!alive) return
        const found = list.find((g) => g.id === genId)
        setWork(found || null)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [user.telegram_id, genId])

  const handleDownload = useCallback(() => {
    if (!work?.result_image_url) return
    logEvent(user.telegram_id, 'result_download_tap', { generation_id: genId })
    const fullUrl = work.result_image_url.startsWith('http')
      ? work.result_image_url
      : `${API_URL}${work.result_image_url}`
    const a = document.createElement('a')
    a.href = fullUrl
    a.download = `dekorinfo-design-${genId}.jpg`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [work, genId, user.telegram_id])

  if (loading) {
    return (
      <div className="app__body result-v3">
        <BalanceRow user={user} loading={true} onTap={() => {}} />
        <div className="skel" style={{ height: 360, borderRadius: 24, marginTop: 16, marginBottom: 16 }} />
        <div className="skel" style={{ width: '60%', height: 20, margin: '0 auto 12px' }} />
      </div>
    )
  }

  if (!work) {
    return (
      <div className="app__body result-v3">
        <BalanceRow user={user} onTap={() => setPricingOpen(true)} />
        <p style={{ textAlign: 'center', marginTop: 40 }}>Работа не найдена</p>
        <button
          className="btn-primary"
          style={{ marginTop: 20 }}
          onClick={() => navigate('/home')}
        >
          На главную
        </button>
      </div>
    )
  }

  const beforeFull = work.original_image_url.startsWith('http')
    ? work.original_image_url
    : `${API_URL}${work.original_image_url}`
  const afterFull = work.result_image_url.startsWith('http')
    ? work.result_image_url
    : `${API_URL}${work.result_image_url}`

  return (
    <div className="app__body result-v3">
      {pricingOpen && (
        <PricingSheet
          user={user}
          onClose={() => setPricingOpen(false)}
          onPaid={async () => {
            if (onUserUpdate) {
              try {
                const fresh = await getUser(user.telegram_id)
                onUserUpdate(fresh)
              } catch {
                onUserUpdate({ ...user })
              }
            }
            setPricingOpen(false)
          }}
        />
      )}

      {/* §6: Дублирование строки баланса на экране /result */}
      <BalanceRow
        user={user}
        onTap={() => setPricingOpen(true)}
      />

      <div className="result-v3__compare" style={{ marginTop: 14 }}>
        <BeforeAfter
          before={beforeFull}
          after={afterFull}
          sweep={true}
        />
      </div>

      <div className="result-v3__actions" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <button
          className="btn-primary"
          style={{ flex: 1 }}
          onClick={handleDownload}
        >
          Сохранить фото
        </button>
        <button
          className="btn-secondary"
          style={{ flex: 1 }}
          onClick={() => navigate('/home')}
        >
          На главную
        </button>
      </div>
    </div>
  )
}
