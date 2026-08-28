// Главный экран SPEC v2.0 §6: задачи вместо стилей (сетка 2×3),
// строка баланса с сервера (§5), лента «Ваши работы» (§11).
import { useState, useEffect } from 'react'
import type { User, Catalog } from '../types'
import { API_URL, getUserGenerations, getCatalog, logEvent } from '../api'
import UploadScreen from './UploadScreen'
import HistoryScreen from './HistoryScreen'
import PricingSheet from './PricingSheet'

interface Props {
  user: User
  onUserUpdate: (user: User) => void
}

type Screen =
  | { name: 'home' }
  | { name: 'job'; jobId: string }
  | { name: 'history' }

export default function MainScreen({ user, onUserUpdate }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [pricingOpen, setPricingOpen] = useState(false)
  const tg = window.Telegram?.WebApp
  const haptic = () => tg?.HapticFeedback.impactOccurred('light')

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => {})
  }, [])

  // SPEC §3.3: при смене экрана скролл сбрасывается в ноль
  useEffect(() => {
    const b = document.querySelector('.app__body')
    if (b) b.scrollTop = 0
    window.scrollTo(0, 0)
  }, [screen.name])

  if (screen.name === 'job') {
    return (
      <UploadScreen
        user={user}
        jobId={screen.jobId}
        catalog={catalog}
        onBack={() => setScreen({ name: 'home' })}
        onUserUpdate={onUserUpdate}
        onOpenPricing={() => setPricingOpen(true)}
      />
    )
  }
  if (screen.name === 'history') {
    return <HistoryScreen user={user} onBack={() => setScreen({ name: 'home' })} />
  }

  return (
    <>
      <div className="app__body">
        <h1 className="h" style={{ marginTop: 10 }}>Привет, {user.first_name} 👋</h1>
        {/* SPEC §5: строка баланса приходит готовой с сервера */}
        <div className="bal">
          <b>{user.balance_line}</b>
        </div>

        <h2 className="card-t" style={{ marginBottom: 10 }}>Что преобразим?</h2>

        {/* SPEC §6: сетка 2×3 карточек-задач с превью «до/после».
            Вторая волна не показывается — её нет в текущем спринте. */}
        <div className="jobs">
          {(catalog?.job_order ?? ['room_design', 'declutter', 'garden']).map((jid) => {
            const job = catalog?.jobs[jid] ?? FALLBACK_JOBS[jid]
            if (!job) return null
            return (
              <button key={jid} className="job" onClick={() => {
                haptic()
                logEvent(user.telegram_id, 'job_selected', { job_id: jid })
                setScreen({ name: 'job', jobId: jid })
              }}>
                <img className="img" src={job.preview} alt="" loading="lazy" />
                <span className="jt">{job.title}</span>
                <span className="js">{job.sub}</span>
              </button>
            )
          })}
        </div>

        <WorksStrip userId={user.telegram_id} onOpen={() => { haptic(); setScreen({ name: 'history' }) }} />
      </div>

      <div className="app__foot">
        {/* SPEC §2: одна первичная синяя кнопка на экран */}
        <button className="btn" onClick={() => {
          haptic()
          logEvent(user.telegram_id, 'job_selected', { job_id: 'room_design' })
          setScreen({ name: 'job', jobId: 'room_design' })
        }}>Создать дизайн</button>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn ghost sm" onClick={() => { haptic(); setScreen({ name: 'history' }) }}>Мои работы</button>
          <button className="btn ghost sm" onClick={() => { haptic(); setPricingOpen(true) }}>Пополнить</button>
        </div>
      </div>

      {pricingOpen && (
        <PricingSheet
          user={user}
          onClose={() => setPricingOpen(false)}
          onPaid={() => { setPricingOpen(false); window.location.reload() }}
        />
      )}
    </>
  )
}

// Фолбэк, если каталог ещё не загрузился (тексты дословно из SPEC §6)
const FALLBACK_JOBS: Record<string, { title: string; sub: string; preview: string }> = {
  room_design: { title: 'Дизайн комнаты', sub: 'Полный редизайн в выбранном стиле', preview: '/examples/room_design.jpg' },
  declutter: { title: 'Уборка комнаты', sub: 'Убрать хлам и лишние вещи', preview: '/examples/declutter.jpg' },
  garden: { title: 'Сад и участок', sub: 'Ландшафт, терраса, зона отдыха', preview: '/examples/garden.jpg' },
}

// Лента «Ваши работы» — горизонтальный скролл последних результатов (SPEC §11)
import type { Generation } from '../types'

function WorksStrip({ userId, onOpen }: { userId: number; onOpen: () => void }) {
  const [works, setWorks] = useState<Generation[]>([])
  useEffect(() => {
    getUserGenerations(userId).then(g => setWorks(g.slice(0, 6))).catch(() => {})
  }, [userId])
  if (works.length === 0) return null
  return (
    <>
      <h2 className="card-t" style={{ margin: '16px 0 10px' }}>Ваши работы</h2>
      <div className="works" onClick={onOpen} style={{ cursor: 'pointer' }}>
        {works.map(w => (
          <div className="w" key={w.id}>
            {w.preview_url || w.result_image_url ? (
              <img src={`${API_URL}${w.preview_url || w.result_image_url}`} alt=""
                onError={(e) => {
                  const img = e.target as HTMLImageElement
                  const ph = document.createElement('div')
                  ph.className = 'ph'
                  ph.textContent = w.display_name || 'Дизайн комнаты'
                  img.replaceWith(ph)
                }} />
            ) : (
              <div className="ph" style={{ width: 108, height: 76 }}>
                {w.display_name || 'Дизайн комнаты'}
              </div>
            )}
            {/* SPEC §11: только человекочитаемые названия */}
            <div className="tiny">{w.display_name || 'Дизайн комнаты'}</div>
          </div>
        ))}
      </div>
    </>
  )
}
