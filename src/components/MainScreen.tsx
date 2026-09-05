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
import { JOBS, stylesA, type Style, type Job, getJob } from '../config/catalog'
import { asset, lqip } from '../lib/assets'
import { useBackButton } from '../hooks/useTelegramChrome'
import PricingSheet from './PricingSheet'

interface Props {
  user: User
  onUserUpdate: (user: User) => void
}

const POPULAR_STYLE_IDS = ['scandi', 'modern', 'classic', 'loft', 'minimal', 'japandi']

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

      {/* «Дизайн комнаты» (§3.1) — HIGH-2: горизонтальная карусель стилей со сплитом до/после
          (единый паттерн §6.3 с задачами: ~80% вьюпорта, 4:3, подглядывание, точки).
          HIGH-3: блок «Так выглядит исходная комната» убран — сплит говорит сам за себя.
          Сетка 2×2 со сплитом не работала: каждая половина ~80px — не читается.
          Сетка 2×2 БЕЗ сплита остаётся только на /styles, где стилей 20+. */}
      <section className="home-v3__section">
        <h2 className="home-v3__h2">Дизайн комнаты</h2>
        <p className="home-v3__sub">Скандинавский, лофт, минимализм и другие</p>

        <div className="home-v3__carousel home-v3__carousel--styles" role="list">
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
        <StyleDots count={popularStyles.length} />

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
      {isReturning && <WorksStrip userId={user.telegram_id} onOpen={(id) => {
        haptic()
        navigate(`/result/${id}`)
      }} />}
    </div>
  )
}

// Карточка стиля: HIGH-2 — сплит-превью «до/после» (§6.3, единый паттерн с job-card).
// На широкой карточке (80% вьюпорта) каждая половина ~165px — сплит читается.
// На узкой карточке сетки (160px) сплит нечитабельный, поэтому на /styles — обложка.
function StyleCard({ style, onClick }: { style: Style; onClick: () => void }) {
  const room = style.rooms[0]
  const beforeSrc = asset(room.before, 'thumb')
  const afterSrc = asset(room.after, 'thumb')
  return (
    <button className="job-card style-card-split" onClick={onClick} role="listitem"
      style={{ background: `url(${lqip(room.before)}) center/cover` }}>
      <div className="job-card__split">
        <img src={beforeSrc} alt="" loading="lazy" />
        <img src={afterSrc} alt="" loading="lazy" />
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

// HIGH-2: точки-индикатор карусели стилей (тот же паттерн, что у JobDots)
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

// «Ваши работы»: §3.1, §6.4 — подпись «Гостиная · Сканди · 3 сен».
// BLOCKER-1: реальный fallback на битый/отсутствующий src.
// HIGH-5: пустой сегмент стиля → тип задачи. MED-6: ровные ряды (фикс высоты подписи + min-height контейнера).
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
          // HIGH-5/новый: вместо пустого среднего сегмента — тип задачи,
          // если display_name неизвестен (например, для старых генераций).
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
                      // BLOCKER-1: битый src → скелетон-заглушка вместо белого прямоугольника.
                      // img скрываем, на родителя навешиваем класс с плейсхолдером.
                      const img = e.target as HTMLImageElement
                      img.style.display = 'none'
                      img.parentElement?.classList.add('work-card__btn--broken')
                    }}
                  />
                ) : (
                  // BLOCKER-1: если API не вернул ни preview_url, ни result_image_url —
                  // сразу показываем скелетон, а не белый прямоугольник.
                  <div className="work-card__placeholder" aria-hidden />
                )}
              </button>
              {/* HIGH-5: «Комната · Стиль · Дата» / если стиля нет — «Тип задачи · Дата» */}
              <div className="work-card__cap">{captionFor(w, room, style, jobLabel)}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// HIGH-5/§6.4: подпись работы.
// Полная: «Комната · Стиль · 26 авг».
// Если display_name неизвестен, средний сегмент заменяется на тип задачи
// («Убрать лишнее · 26 авг»), чтобы не оставалось пустого «Комната · 26 авг».
function captionFor(w: Generation, room: string, style: string, jobTitle: string): string {
  const middle = style || jobTitle
  let date = ''
  try {
    const d = new Date(w.created_at)
    if (!Number.isNaN(d.getTime())) date = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  } catch { /* bad date */ }
  return [room, middle, date].filter(Boolean).join(' · ')
}
