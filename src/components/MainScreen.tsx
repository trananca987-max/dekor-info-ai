// PATCH v5 (SPEC §3.1 + Дополнение 1):
// 1) Хедер: статус лимита «Бесплатно на этой неделе: осталось 2 из 2 ›»
// 2) «Дизайн комнаты» — сетка 2×2, 4 стиля Уровня 1 со свитчером было/стало (76×28 px)
// 3) Чип-ссылка «Все стили ›» → /styles (16 стилей Уровня 2)
// 4) «Дом и участок» — карусель 5 задач: static_seam (Фасад 0.53, Сад 0.50, Уборка 0.45, Покраска 0.50, Мебель 0.50)
// 5) «Ваши работы» — последние результаты, клик открывает /result/:id
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { User, Generation } from '../types'
import { getUser, getUserGenerations, logEvent } from '../api'
import { JOBS, STYLES_TIER1, BASE_BEFORE, type Style, type Job, getJob } from '../config/catalog'
import { asset } from '../lib/assets'
import { useBackButton } from '../hooks/useTelegramChrome'
import PricingSheet from './PricingSheet'

interface Props {
  user: User
  onUserUpdate: (user: User) => void
}

export default function MainScreen({ user, onUserUpdate }: Props) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pricingOpen = searchParams.get('pricing') === '1'
  const haptic = useCallback(() => window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light'), [])
  const isReturning = (user.total_generations || 0) >= 1

  // §4.3: главная — корневой экран, BackButton скрыт
  useBackButton({ onBack: () => navigate('/home'), force: false })

  // === Аналитика: home_view (new|returning) ===
  useEffect(() => {
    logEvent(user.telegram_id, 'home_view', { state: isReturning ? 'returning' : 'new' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openPricing = () => {
    haptic()
    logEvent(user.telegram_id, 'limit_banner_tap')
    navigate('/home?pricing=1')
  }

  const closePricing = () => {
    setSearchParams({})
  }

  return (
    <div className="app__body home-v3">
      {pricingOpen && (
        <PricingSheet
          user={user}
          onClose={closePricing}
          onPaid={async () => {
            try {
              const fresh = await getUser(user.telegram_id)
              onUserUpdate(fresh)
            } catch {
              onUserUpdate({ ...user })
            }
            closePricing()
          }}
        />
      )}

      {/* Хедер: статус лимита (§7.1) */}
      <header className="home-v3__limit">
        <button
          className="home-v3__limit-btn"
          onClick={openPricing}
          aria-label="Статус лимита"
        >
          <strong>{user.balance_line}</strong>
          <span className="home-v3__limit-chev" aria-hidden>›</span>
        </button>
      </header>

      {/* «Дизайн комнаты» (§2) — Уровень 1: Сетка 2×2 с сегмент-контролом «до / после» */}
      <section className="home-v3__section">
        <h2 className="home-v3__h2">Дизайн комнаты</h2>
        <p className="home-v3__sub">Скандинавский, современный, тихая роскошь и лофт</p>

        <div className="home-v3__styles-grid">
          {STYLES_TIER1.map((s) => (
            <StyleGridCard
              key={s.id}
              style={s}
              onClick={() => {
                haptic()
                logEvent(user.telegram_id, 'style_card_tap', { style_id: s.id })
                navigate(`/upload?styleId=${encodeURIComponent(s.id)}`)
              }}
            />
          ))}
        </div>

        <button
          className="home-v3__pill"
          onClick={() => {
            haptic()
            logEvent(user.telegram_id, 'all_styles_open')
            navigate('/styles')
          }}
        >
          Все стили <span aria-hidden>›</span>
        </button>
      </section>

      {/* «Дом и участок» (Дополнение 1) — Карусель 5 задач со static_seam */}
      <section className="home-v3__section">
        <h2 className="home-v3__h2">Дом и участок</h2>
        <p className="home-v3__sub">Фасад, сад, уборка и не только</p>

        <TasksCarousel
          userId={user.telegram_id}
          onSelect={(job) => {
            haptic()
            logEvent(user.telegram_id, 'other_tasks_tap', { job_id: job.id })
            navigate(`/task/${encodeURIComponent(job.id)}`)
          }}
        />
      </section>

      {/* «Ваши работы» — сразу под хедером для вернувшихся (§3.1) */}
      {isReturning && (
        <WorksStrip
          userId={user.telegram_id}
          onOpen={(id) => {
            haptic()
            navigate(`/result/${id}`)
          }}
        />
      )}
    </div>
  )
}

// Карточка стиля для сетки 2×2: переключатель было/стало (76×28 px)
function StyleGridCard({ style, onClick }: { style: Style; onClick: () => void }) {
  const [viewState, setViewState] = useState<'after' | 'before'>('after')
  const beforeSrc = asset(BASE_BEFORE, 'card')
  const afterSrc = asset(style.after, 'card')
  const currentSrc = viewState === 'after' ? afterSrc : beforeSrc

  const overlayClass =
    style.overlay === 'gradient'
      ? 'style-grid-card--gradient'
      : style.overlay === 'frame'
      ? 'style-grid-card--frame'
      : ''

  const toggleView = (e: React.MouseEvent, mode: 'before' | 'after') => {
    e.stopPropagation()
    setViewState(mode)
  }

  return (
    <div className={`style-grid-card ${overlayClass}`} onClick={onClick} role="button" tabIndex={0}>
      <div className="style-grid-card__frame">
        <img src={currentSrc} alt={style.title} loading="lazy" className="style-grid-card__img" />

        {/* Сегмент-контрол было/стало 76×28 px в правом верхнем углу */}
        <div
          className="style-grid-card__switcher"
          onClick={(e) => e.stopPropagation()}
          aria-label="Переключение до и после"
        >
          <button
            type="button"
            className={`style-grid-card__switch-btn ${viewState === 'before' ? 'style-grid-card__switch-btn--active' : ''}`}
            onClick={(e) => toggleView(e, 'before')}
          >
            до
          </button>
          <button
            type="button"
            className={`style-grid-card__switch-btn ${viewState === 'after' ? 'style-grid-card__switch-btn--active' : ''}`}
            onClick={(e) => toggleView(e, 'after')}
          >
            после
          </button>
        </div>

        {/* Подпись стиля на кадре */}
        <div className="style-grid-card__plate">
          <span className="style-grid-card__title">{style.title}</span>
        </div>
      </div>
    </div>
  )
}

// Карусель 5 задач «Дом и участок» (static_seam)
function TasksCarousel({ userId, onSelect }: { userId: number; onSelect: (job: Job) => void }) {
  const [active, setActive] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Аналитика: task_card_impression с id и position (Дополнение 1 §3)
  useEffect(() => {
    const el = carouselRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const cardElements = el.querySelectorAll('.job-card')
    const observers: IntersectionObserver[] = []

    cardElements.forEach((card, idx) => {
      const job = JOBS[idx]
      if (!job) return
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          logEvent(userId, 'task_card_impression', { id: job.id, position: idx + 1 })
          io.disconnect()
        }
      }, { threshold: 0.6 })
      io.observe(card)
      observers.push(io)
    })

    return () => observers.forEach((io) => io.disconnect())
  }, [userId])

  // Синхронизация точек-индикаторов
  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    const onScroll = () => {
      const card = el.querySelector<HTMLElement>('.job-card')
      if (!card) return
      const itemWidth = card.offsetWidth + 12 // ширина + gap
      const index = Math.round(el.scrollLeft / itemWidth)
      setActive(Math.max(0, Math.min(JOBS.length - 1, index)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="home-v3__tasks-wrapper">
      <div className="home-v3__carousel home-v3__carousel--tasks" ref={carouselRef} role="list">
        {JOBS.map((j) => (
          <JobCard key={j.id} job={j} onClick={() => onSelect(j)} />
        ))}
      </div>

      <div className="home-v3__dots" role="tablist" aria-label="Индикатор задач">
        {JOBS.map((_, i) => (
          <button
            key={i}
            className={`home-v3__dot ${i === active ? 'on' : ''}`}
            role="tab"
            aria-selected={i === active}
            aria-label={`Задача ${i + 1}`}
            onClick={() => {
              const el = carouselRef.current
              const card = el?.querySelector<HTMLElement>('.job-card')
              if (el && card) {
                const itemWidth = card.offsetWidth + 12
                el.scrollTo({ left: itemWidth * i, behavior: 'smooth' })
              }
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Карточка задачи: строго static_seam (дефолт запрещен, seam берется из manifest/catalog)
function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const beforeSrc = asset(job.before, 'card')
  const afterSrc = asset(job.after, 'card')

  if (job.seam === null || typeof job.seam === 'undefined') {
    throw new Error(`Job ${job.id} is missing required 'seam' configuration!`)
  }

  const seamPercent = job.seam * 100

  return (
    <button className="job-card" onClick={onClick} role="listitem">
      <div className="job-card__frame">
        {/* Слой «до» (полный фон) */}
        <img src={beforeSrc} alt="До" loading="lazy" className="job-card__img" />

        {/* Слой «после», обрезанный по шву clip-path */}
        <div
          className="job-card__seam-clip"
          style={{ clipPath: `polygon(${seamPercent}% 0, 100% 0, 100% 100%, ${seamPercent}% 100%)` }}
        >
          <img src={afterSrc} alt="После" loading="lazy" className="job-card__img" />
        </div>

        {/* Линия шва */}
        <span className="job-card__divider" style={{ left: `${seamPercent}%` }} aria-hidden />

        {/* Бейджи до / после */}
        <span className="job-card__mini" style={{ left: 8 }}>до</span>
        <span className="job-card__mini job-card__mini--r" style={{ right: 8 }}>после</span>

        {/* Плашка с заголовком и подзаголовком */}
        <div className="job-card__plate">
          <span className="job-card__title">{job.title}</span>
          <span className="job-card__sub">{job.subtitle}</span>
        </div>
      </div>
    </button>
  )
}

// «Ваши работы»: §3.1, §6.4
function WorksStrip({ userId, onOpen }: { userId: number; onOpen: (id: number) => void }) {
  const [works, setWorks] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getUserGenerations(userId)
      .then((g) => {
        if (alive) setWorks(g.slice(0, 6))
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [userId])

  if (loading) {
    return (
      <section className="home-v3__section">
        <h2 className="home-v3__h2">Ваши работы</h2>
        <div className="home-v3__works" aria-busy>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skel" style={{ width: 140, height: 200 }} />
          ))}
        </div>
      </section>
    )
  }
  if (works.length === 0) return null

  return (
    <section className="home-v3__section">
      <h2 className="home-v3__h2">Ваши работы</h2>
      <div className="home-v3__works">
        {works.map((w) => {
          const src = w.preview_url || w.result_image_url
          const jobLabel = w.job_id ? getJob(w.job_id)?.title || '' : ''
          const style = w.display_name && w.display_name !== 'Дизайн комнаты' ? w.display_name : ''
          const room = w.category === 'outdoor' ? 'Участок' : 'Комната'
          return (
            <div key={w.id} className="work-card">
              <button className="work-card__btn" aria-label="Открыть" onClick={() => onOpen(w.id)}>
                {src ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL || ''}${src}`}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement
                      img.style.display = 'none'
                      img.parentElement?.classList.add('work-card__btn--broken')
                    }}
                  />
                ) : (
                  <div className="work-card__placeholder" aria-hidden />
                )}
              </button>
              <div className="work-card__cap">{captionFor(w, room, style, jobLabel)}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function captionFor(w: Generation, room: string, style: string, jobTitle: string): string {
  const middle = style || jobTitle
  let date = ''
  try {
    const d = new Date(w.created_at)
    if (!Number.isNaN(d.getTime())) date = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  } catch {
    /* bad date */
  }
  return [room, middle, date].filter(Boolean).join(' · ')
}
