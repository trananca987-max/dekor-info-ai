// PATCH v2.2 §7.1: главный экран.
// Заголовок «Какой хотите дизайн?» (без приветствия с именем и эмодзи).
// Нейтральная кликабельная строка состояния (без слов «кредит»/«черновик»).
// Витрина: 8 стилей уровня A крупно (2 колонки, 4:5, стеклянная плашка, значок до/после),
// затем «Ещё стили» — 14 стилей уровня B (3 в ряд).
// Горизонтальный ряд «Другие задачи» со сплит-превью «до/после».
// «Ваши работы» только если есть: максимум 4, ссылка «Все».
// Нижний футер с тремя кнопками удалён (§9): карточки и есть CTA.
import { useState, useEffect } from 'react'
import type { User, Generation } from '../types'
import { getUserGenerations, logEvent } from '../api'
import { JOBS, stylesA, stylesB, type Style, type Job } from '../config/catalog'
import { asset, lqip } from '../lib/assets'
import { applyTheme, saveTheme, nextTheme, themeIcon, type ThemeMode } from '../lib/theme'
import UploadScreen from './UploadScreen'
import DemoScreen from './DemoScreen'
import HistoryScreen from './HistoryScreen'
import PricingSheet from './PricingSheet'

interface Props {
  user: User
  onUserUpdate: (user: User) => void
  themeMode: ThemeMode
}

type Screen =
  | { name: 'home' }
  | { name: 'demo'; styleId: string }
  | { name: 'job'; jobId: string; styleId?: string }
  | { name: 'history' }

export default function MainScreen({ user, onUserUpdate, themeMode }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [pricingOpen, setPricingOpen] = useState(false)
  const [mode, setMode] = useState<ThemeMode>(themeMode)
  const tg = window.Telegram?.WebApp
  const haptic = () => tg?.HapticFeedback.impactOccurred('light')

  // §3: при смене экрана скролл сбрасывается в ноль
  useEffect(() => {
    const b = document.querySelector('.app__body')
    if (b) b.scrollTop = 0
    window.scrollTo(0, 0)
  }, [screen.name])

  const cycleTheme = () => {
    const m = nextTheme(mode)
    setMode(m)
    saveTheme(m)
    applyTheme(m)
    haptic()
  }

  if (screen.name === 'demo') {
    return (
      <DemoScreen
        styleId={screen.styleId}
        onBack={() => setScreen({ name: 'home' })}
        onMakeOwn={(styleId: string) => {
          logEvent(user.telegram_id, 'demo_to_upload', { style_id: styleId })
          setScreen({ name: 'job', jobId: 'room_design', styleId })
        }}
      />
    )
  }
  if (screen.name === 'job') {
    return (
      <UploadScreen
        user={user}
        jobId={screen.jobId}
        initialStyleId={screen.styleId}
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
        <div className="topbar">
          <button className="theme-btn" onClick={cycleTheme} aria-label="Тема">
            {themeIcon(mode)}
          </button>
        </div>

        {/* §7.1: заголовок без приветствия с именем и эмодзи */}
        <h1 className="h">Какой хотите дизайн?</h1>

        {/* §7.1: нейтральная кликабельная строка состояния — вход в пополнение */}
        <button className="statusline" onClick={() => { haptic(); setPricingOpen(true) }}>
          <b>{user.balance_line}</b>
          <span className="chev">›</span>
        </button>

        {/* Уровень A: 8 стилей крупно */}
        <div className="sc">
          {stylesA.map((s) => (
            <StyleCard key={s.id} style={s} big onClick={() => {
              haptic()
              logEvent(user.telegram_id, 'style_selected', { style_id: s.id })
              setScreen({ name: 'demo', styleId: s.id })
            }} />
          ))}
        </div>

        {/* Уровень B: компактная сетка 3 в ряд */}
        <h2 className="card-t" style={{ marginBottom: 10 }}>Ещё стили</h2>
        <div className="sc-b">
          {stylesB.map((s) => (
            <StyleCard key={s.id} style={s} onClick={() => {
              haptic()
              logEvent(user.telegram_id, 'style_selected', { style_id: s.id })
              setScreen({ name: 'demo', styleId: s.id })
            }} />
          ))}
        </div>

        {/* §7.1: другие задачи со сплит-превью «до/после» */}
        <h2 className="card-t" style={{ marginBottom: 10 }}>Другие задачи</h2>
        <div className="jobsrow">
          {JOBS.map((j) => (
            <JobCard key={j.id} job={j} onClick={() => {
              haptic()
              logEvent(user.telegram_id, 'job_selected', { job_id: j.id })
              setScreen({ name: 'job', jobId: j.id })
            }} />
          ))}
        </div>

        <WorksStrip userId={user.telegram_id} onOpen={() => { haptic(); setScreen({ name: 'history' }) }} />
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

// Карточка стиля: фото 4:5, стеклянная плашка с названием и подсказкой (§7.1)
function StyleCard({ style, big, onClick }: { style: Style; big?: boolean; onClick: () => void }) {
  const ref = style.cover
  return (
    <button className="sc-card" onClick={onClick}>
      <img src={asset(ref, big ? 'preview' : 'thumb')} alt={style.title} loading="lazy"
        style={{ background: `url(${lqip(ref)}) center/cover` }} />
      <div className="card__scrim" />
      {style.tier === 'A' && <span className="ba-badge">до/после</span>}
      <div className="card__plate">
        <span className="nm">{style.title}</span>
        <span className="hint">{style.hint}</span>
      </div>
    </button>
  )
}

// Карточка задачи: сплит-превью «до/после» — для задачи «до» обязательно (§7.1)
function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <button className="jobcard" onClick={onClick}>
      <div className="split">
        <img src={asset(job.before, 'thumb')} alt="До" loading="lazy"
          style={{ background: `url(${lqip(job.before)}) center/cover` }} />
        <img src={asset(job.after, 'thumb')} alt="После" loading="lazy"
          style={{ background: `url(${lqip(job.after)}) center/cover` }} />
        <span className="divider" />
        <span className="mini-lbl" style={{ left: 6 }}>до</span>
        <span className="mini-lbl" style={{ right: 6 }}>после</span>
      </div>
      <span className="jt">{job.title}</span>
      <span className="js">{job.hint}</span>
    </button>
  )
}

// «Ваши работы»: только если работы есть, максимум 4, ссылка «Все» (§7.1)
function WorksStrip({ userId, onOpen }: { userId: number; onOpen: () => void }) {
  const [works, setWorks] = useState<Generation[]>([])
  useEffect(() => {
    getUserGenerations(userId).then(g => setWorks(g.slice(0, 4))).catch(() => {})
  }, [userId])
  if (works.length === 0) return null
  return (
    <>
      <div className="sec-head">
        <h2 className="card-t">Ваши работы</h2>
        <button className="all" onClick={onOpen}>Все</button>
      </div>
      <div className="works">
        {works.map(w => (
          <div key={w.id}>
            <button className="w" onClick={onOpen}>
              {w.preview_url || w.result_image_url ? (
                <img src={`${import.meta.env.VITE_API_URL || ''}${w.preview_url || w.result_image_url}`}
                  alt="" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : null}
            </button>
            {/* §7.1: одна подпись под карточкой, формат «Дизайн комнаты · Сканди» */}
            <div className="cap">{w.display_name || 'Дизайн комнаты'}</div>
          </div>
        ))}
      </div>
    </>
  )
}
