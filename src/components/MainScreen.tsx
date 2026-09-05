// PATCH v3 (SPEC §3.1 - Этап B):
// 1) Хедер: статус лимита «Бесплатно на этой неделе: осталось 2 из 2 ›»
// 2) «Дизайн комнаты» — 4 стиля Уровня 1 (scandi, modern, quietlux, loft) со сплитом «до/после» от BASE_BEFORE
// 3) Пилюля-ссылка «Все стили ›» → /styles (16 стилей Уровня 2)
// 4) «Другие задачи» — горизонтальная карусель: static_seam (Убрать лишнее 0.45, Фасад 0.53), toggle (Сад)
// 5) «Ваши работы» (если есть ≥1) — последние 3–6 результатов
import { useEffect, useState, useCallback } from 'react'
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

  // §4.3: главная — корневой экран, BackButton скрыт (проверка глубины внутри хука)
  useBackButton({ onBack: () => navigate('/home'), force: false })

  // === Аналитика: home_view (new|returning) ===
  useEffect(() => {
    logEvent(user.telegram_id, 'home_view', { state: isReturning ? 'returning' : 'new' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // «Другие задачи» в зоне видимости первого экрана → other_tasks_impression один раз
  useEffect(() => {
    const el = document.querySelector('.home-v3__carousel')
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        logEvent(user.telegram_id, 'other_tasks_impression')
        io.disconnect()
      }
    }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
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

      {/* «Дизайн комнаты» (§3.1) — Уровень 1: 4 популярных стиля со сплитом до/после */}
      <section className="home-v3__section">
        <h2 className="home-v3__h2">Дизайн комнаты</h2>
        <p className="home-v3__sub">Скандинавский, современный, тихая роскошь и лофт</p>

        <div className="home-v3__carousel home-v3__carousel--styles" role="list">
          {STYLES_TIER1.map((s) => (
            <StyleCard
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
        <StyleDots count={STYLES_TIER1.length} />

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

      {/* «Другие задачи» — горизонтальная карусель (§3.1, compare: static_seam / toggle) */}
      <section className="home-v3__section">
        <h2 className="home-v3__h2">Другие задачи</h2>
        <p className="home-v3__sub">Уборка, фасад, сад и не только</p>

        <div className="home-v3__carousel" role="list">
          {JOBS.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              onClick={() => {
                haptic()
                logEvent(user.telegram_id, 'other_tasks_tap', { job_id: j.id })
                navigate(`/task/${encodeURIComponent(j.id)}`)
              }}
            />
          ))}
        </div>
        <JobDots count={JOBS.length} />
      </section>

      {/* «Ваши работы» — сразу под хедером для вернувшихся (§3.1) */}
      {isReturning && <WorksStrip userId={user.telegram_id} onOpen={(id) => {
        haptic()
        navigate(`/result/${id}`)
      }} />}
    </div>
  )
}

// Карточка стиля: сплит-превью «до/после» от BASE_BEFORE (01_base_before)
function StyleCard({ style, onClick }: { style: Style; onClick: () => void }) {
  const beforeSrc = asset(BASE_BEFORE, 'card')
  const afterSrc = asset(style.after, 'card')
  const overlayClass = style.overlay === 'gradient' ? 'style-card--gradient' : style.overlay === 'frame' ? 'style-card--frame' : ''

  return (
    <button className={`job-card style-card-split ${overlayClass}`} onClick={onClick} role="listitem">
      <div className="job-card__split">
        <img src={beforeSrc} alt="До" loading="lazy" />
        <img src={afterSrc} alt="После" loading="lazy" />
        <span className="job-card__divider" aria-hidden />
        <span className="job-card__mini">до</span>
        <span className="job-card__mini job-card__mini--r">после</span>
      </div>
      <div className="job-card__plate">
        <span className="job-card__title">{style.title}</span>
        <span className="job-card__hint">{style.hint}</span>
      </div>
    </button>
  )
}

// Точки-индикатор карусели стилей
function StyleDots({ count }: { count: number }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`.home-v3__carousel--styles`)
    if (!el) return
    const update = () => {
      const step = el.clientWidth * 0.82
      const i = Math.round(el.scrollLeft / step)
      setActive(Math.max(0, Math.min(count - 1, i)))
    }
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [count])
  if (count <= 1) return null
  return (
    <div className="home-v3__dots" role="tablist" aria-label="Страницы стилей">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          className={`home-v3__dot ${i === active ? 'on' : ''}`}
          role="tab"
          aria-selected={i === active}
          aria-label={`Стиль ${i + 1}`}
          onClick={() => {
            const el = document.querySelector<HTMLElement>(`.home-v3__carousel--styles`)
            if (el) el.scrollTo({ left: el.clientWidth * 0.82 * i, behavior: 'smooth' })
          }}
        />
      ))}
    </div>
  )
}

// Карточка задачи: поддержка compare = 'static_seam' (фиксированный шов seam) | 'toggle' (Сад)
function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const [toggleState, setToggleState] = useState<'after' | 'before'>('after')
  const beforeSrc = asset(job.before, 'card')
  const afterSrc = asset(job.after, 'card')

  // Режим toggle (Сад и участок: seam = null)
  if (job.compare === 'toggle') {
    const isAfter = toggleState === 'after'
    const currentSrc = isAfter ? afterSrc : beforeSrc
    return (
      <button
        className="job-card job-card--toggle"
        onClick={onClick}
        role="listitem"
      >
        <div className="job-card__split">
          <img src={currentSrc} alt={isAfter ? 'После' : 'До'} loading="lazy" />
          <span
            className="job-card__mini job-card__mini--toggle"
            onClick={(e) => {
              e.stopPropagation()
              setToggleState(prev => prev === 'after' ? 'before' : 'after')
            }}
          >
            {isAfter ? 'после ⇄' : 'до ⇄'}
          </span>
        </div>
        <div className="job-card__plate">
          <span className="job-card__title">{job.title}</span>
          <span className="job-card__hint">{job.subtitle || job.hint}</span>
        </div>
      </button>
    )
  }

  // Режим static_seam (Убрать лишнее seam=0.45, Фасад дома seam=0.53)
  const seamPct = typeof job.seam === 'number' ? job.seam * 100 : 50

  return (
    <button className="job-card" onClick={onClick} role="listitem">
      <div className="job-card__split">
        {/* Базовый кадр "после" на весь фон */}
        <img src={afterSrc} alt="После" loading="lazy" />
        {/* Слой "до" с обрезкой по точному шву seam */}
        <div
          className="job-card__seam-clip"
          style={{ clipPath: `polygon(0 0, ${seamPct}% 0, ${seamPct}% 100%, 0 100%)` }}
        >
          <img src={beforeSrc} alt="До" loading="lazy" />
        </div>
        {/* Фиксированный вертикальный шов */}
        <span
          className="job-card__divider"
          style={{ left: `${seamPct}%` }}
          aria-hidden
        />
        <span className="job-card__mini">до</span>
        <span className="job-card__mini job-card__mini--r">после</span>
      </div>
      <div className="job-card__plate">
        <span className="job-card__title">{job.title}</span>
        <span className="job-card__hint">{job.subtitle || job.hint}</span>
      </div>
    </button>
  )
}

// Точки-индикатор карусели задач
function JobDots({ count }: { count: number }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`.home-v3__carousel`)
    if (!el) return
    const update = () => {
      const step = el.clientWidth * 0.82
      const i = Math.round(el.scrollLeft / step)
      setActive(Math.max(0, Math.min(count - 1, i)))
    }
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [count])
  if (count <= 1) return null
  return (
    <div className="home-v3__dots" role="tablist" aria-label="Страницы">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          className={`home-v3__dot ${i === active ? 'on' : ''}`}
          role="tab"
          aria-selected={i === active}
          aria-label={`Задача ${i + 1}`}
          onClick={() => {
            const el = document.querySelector<HTMLElement>(`.home-v3__carousel`)
            if (!el) return
            el.scrollTo({ left: el.clientWidth * 0.82 * i, behavior: 'smooth' })
          }}
        />
      ))}
    </div>
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
          const jobLabel = w.job_id ? (getJob(w.job_id)?.title || '') : ''
          const style = w.display_name && w.display_name !== 'Дизайн комнаты' ? w.display_name : ''
          const room = w.category === 'outdoor' ? 'Участок' : 'Комната'
          return (
            <div key={w.id} className="work-card">
              <button
                className="work-card__btn"
                aria-label="Открыть"
                onClick={() => onOpen(w.id)}
              >
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
  } catch { /* bad date */ }
  return [room, middle, date].filter(Boolean).join(' · ')
}
