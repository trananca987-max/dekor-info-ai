// PATCH v3 (SPEC §3.1):
// 1) Хедер: статус лимита «Бесплатно на этой неделе: осталось 2 из 2 ›»
// 2) «Дизайн комнаты» — 4–6 популярных стилей с превью «до/после»
// 3) Пилюля-ссылка «Все стили ›» → /styles
// 4) «Другие задачи» — горизонтальная карусель, 4-я карточка подглядывает
// 5) «Ваши работы» (если есть ≥1) — последние 3–6 результатов,
//    у вернувшегося пользователя — сразу под хедером
//
// Без собственного переключателя темы на экране (только в настройках).
// Карточки рендерят <StyleCard/> и <JobCard/>, цвета — из var(--tg-theme-…).
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { User, Generation } from '../types'
import { getUser, getUserGenerations, logEvent } from '../api'
import { JOBS, stylesA, type Style, type Job } from '../config/catalog'
import { asset, lqip } from '../lib/assets'
import { useBackButton } from '../hooks/useTelegramChrome'
import PricingSheet from './PricingSheet'

interface Props {
  user: User
  onUserUpdate: (user: User) => void
}

const POPULAR_STYLE_IDS = ['scandi', 'modern', 'classic', 'loft', 'minimal', 'japandi']
// Общая «до»-комната: все карточки стилей сгенерированы из неё (промт 01, §3.1)
const ORIGIN_ROOM = '_base/living_before'

export default function MainScreen({ user, onUserUpdate }: Props) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pricingOpen = searchParams.get('pricing') === '1'
  const haptic = useCallback(() => window.Telegram?.WebApp?.HapticFeedback.impactOccurred('light'), [])
  const isReturning = (user.total_generations || 0) >= 1
  const popularStyles = useMemo(
    () => stylesA.filter((s) => POPULAR_STYLE_IDS.includes(s.id)),
    [],
  )

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

      {/* «Дизайн комнаты» (§3.1) */}
      <section className="home-v3__section">
        <h2 className="home-v3__h2">Дизайн комнаты</h2>

        {/* HIGH-5: общая «до»-комната один раз над сеткой — все стили сгенерированы
            из одной базовой комнаты (промт 01); бейдж на карточках убран */}
        <div className="origin-room">
          <div className="origin-room__img">
            <img src={asset(ORIGIN_ROOM, 'thumb')} alt="Исходная комната" loading="lazy" />
          </div>
          <span className="origin-room__label">Так выглядит исходная комната</span>
        </div>

        <div className="home-v3__grid">
          {popularStyles.map((s) => (
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

      {/* «Другие задачи» — горизонтальная карусель (§3.1) */}
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
        {/* MED-8: точки-индикатор — СНАРУЖИ карусели, не обрезаются нижним блоком */}
        <JobDots count={JOBS.length} />
      </section>

      {/* «Ваши работы» — сразу под хедером для вернувшихся (§3.1) */}
      {isReturning && <WorksStrip userId={user.telegram_id} />}
    </div>
  )
}

// =====================================================================
// Карточка стиля: фото 4:5, градиент-подложка снизу, заголовок 2 строки
// (§6.1, §6.2) — без эмодзи, без обрезки слов, бордер по теме.
function StyleCard({ style, onClick }: { style: Style; onClick: () => void }) {
  const cover = asset(style.cover, 'preview')
  return (
    <button className="style-card" onClick={onClick}>
      <div
        className="style-card__img"
        style={{ background: `url(${lqip(style.cover)}) center/cover` }}
      >
        {cover && <img src={cover} alt={style.title} loading="lazy" />}
        <div className="style-card__plate">
          <span className="style-card__title">{style.title}</span>
          <span className="style-card__hint">{style.hint}</span>
        </div>
      </div>
    </button>
  )
}

// Карточка задачи: сплит-превью «до/после» (§3.1, §6.3 — единый паттерн).
function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <button className="job-card" onClick={onClick} role="listitem"
      style={{ background: `url(${lqip(job.before)}) center/cover` }}>
      <div className="job-card__split">
        <img src={asset(job.before, 'thumb')} alt="" loading="lazy" />
        <img src={asset(job.after, 'thumb')} alt="" loading="lazy" />
        <span className="job-card__divider" aria-hidden />
        <span className="job-card__mini">до</span>
        <span className="job-card__mini job-card__mini--r">после</span>
      </div>
      {/* BLOCKER-2: крупный заголовок на карточке со скримом §6.2.2 */}
      <div className="job-card__plate">
        <span className="job-card__title">{job.title}</span>
        <span className="job-card__hint">{job.hint}</span>
      </div>
    </button>
  )
}

// MED-8: точки-индикатор карусели. Рендерятся ВНЕ .home-v3__carousel,
// поэтому не обрезаются нижним блоком; active — следим за скроллом.
function JobDots({ count }: { count: number }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`.home-v3__carousel`)
    if (!el) return
    const update = () => {
      const step = el.clientWidth * 0.82 // ширина карточки ≈ 80% + отступ
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

// «Ваши работы»: §3.1, §6.4 — подпись «Гостиная · Сканди · 3 сен»
function WorksStrip({ userId }: { userId: number }) {
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
            <div key={i} className="skel" style={{ width: 140, height: 168 }} />
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
          return (
            <div key={w.id} className="work-card">
              <button className="work-card__btn" aria-label="Открыть">
                {src && (
                  <img
                    src={`${import.meta.env.VITE_API_URL || ''}${src}`}
                    alt=""
                    loading="lazy"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                )}
              </button>
              {/* §6.4: «Гостиная · Сканди · 3 сен» — комната · стиль · дата */}
              <div className="work-card__cap">{workCaption(w)}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// §6.4: человекочитаемая подпись работы по схеме «Комната · Стиль · Дата».
// Комната — категория/задача; стиль — имя пресета; дата — день + короткий месяц.
function workCaption(w: Generation): string {
  const room = w.category === 'outdoor' ? 'Участок' : 'Комната'
  const style = w.display_name && w.display_name !== 'Дизайн комнаты' ? w.display_name : ''
  let date = ''
  try {
    const d = new Date(w.created_at)
    if (!Number.isNaN(d.getTime())) {
      date = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
    }
  } catch { /* bad date */ }
  return [room, style, date].filter(Boolean).join(' · ')
}
