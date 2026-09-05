// PATCH v3 (SPEC §3.4):
// Экран /task/:id — примеры для дополнительных задач
// 2–4 крупные пары до/после, подварианты, блок «что не изменится», закреплённый CTA

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { User } from '../types'
import { getJob, type JobDirection } from '../config/catalog'
import { asset, lqip } from '../lib/assets'
import { logEvent } from '../api'
import { useMainButton, useBackButton } from '../hooks/useTelegramChrome'

export default function TaskScreen({ user }: { user: User }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tg = window.Telegram?.WebApp
  const haptic = () => tg?.HapticFeedback.impactOccurred('light')
  const job = getJob(id || '')

  // §3.4/§8 skipExamples: первый просмотр задачи — показываем примеры,
  // записываем флаг; повторный вход на тот же job — сразу на /upload.
  const skipKey = `seen_task_${id}`
  const alreadySeen = typeof localStorage !== 'undefined' && localStorage.getItem(skipKey) === '1'

  useEffect(() => {
    if (!job) return
    logEvent(user.telegram_id, 'task_screen_view', { job_id: job.id, skipped: alreadySeen })
    if (!alreadySeen) {
      try { localStorage.setItem(skipKey, '1') } catch { /* private mode */ }
    }
    if (alreadySeen) {
      navigate(`/upload?jobId=${encodeURIComponent(job.id)}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id])

  // §4.3 BackButton — единый владелец (useTelegramChrome).
  // force: true — показываем даже при прямом входе по ссылке,
  // иначе hardware back закроет приложение (BLOCKER-2).
  const goBack = () => {
    const idx = (window.history.state as { idx?: number })?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/home')
  }
  useBackButton({ onBack: goBack, force: true })

  // §4.1 MainButton — единый владелец (useTelegramChrome)
  useMainButton({
    text: 'Загрузить фото',
    enabled: Boolean(job),
    onClick: () => {
      haptic()
      logEvent(user.telegram_id, 'task_variant_tap', { job_id: job?.id })
      navigate(`/upload?jobId=${encodeURIComponent(job?.id || '')}`)
    },
  })

  if (!job) {
    return (
      <div className="app__body task-v3">
        <p>Задача не найдена</p>
      </div>
    )
  }

  return (
    <div className="app__body task-v3">
      <header className="task-v3__header">
        <h1 className="task-v3__title">{job.title}</h1>
        <p className="task-v3__hint">{job.hint}</p>
      </header>

      {/* 2–4 крупные пары до/после */}
      <section className="task-v3__examples" aria-label="Что сделает нейросеть">
        {job.directions?.slice(0, 4).map((dir, idx) => (
          <TaskExampleCard key={dir.id} direction={dir} index={idx} />
        ))}
      </section>

      {/* Подварианты задачи */}
      {job.directions && job.directions.length > 0 && (
        <section className="task-v3__variants">
          <h2 className="task-v3__h2">Что именно вы хотите?</h2>
          <div className="task-v3__variant-grid">
            {job.directions.map((dir) => (
              <button
                key={dir.id}
                className="task-v3__variant"
                onClick={() => {
                  haptic()
                  logEvent(user.telegram_id, 'task_variant_tap', { job_id: job.id, direction_id: dir.id })
                  navigate(`/upload?jobId=${encodeURIComponent(job.id)}&directionId=${encodeURIComponent(dir.id)}`)
                }}
              >
                <span className="task-v3__variant-title">{dir.label}</span>
                <span className="task-v3__variant-hint">{dir.promptRef.slice(0, 60)}…</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Блок «что не изменится» — управление ожиданиями */}
      <section className="task-v3__unchanged">
        <h2 className="task-v3__h2">Что не изменится</h2>
        <ul className="task-v3__unchanged-list">
          <li>Планировка и несущие конструкции</li>
          <li>Расположение окон и дверей</li>
          <li>Инженерные коммуникации</li>
        </ul>
      </section>

      {/* Закреплённый снизу CTA — дублирует MainButton для десктопов/веба */}
      <div className="task-v3__cta-fixed">
        <button
          className="btn task-v3__cta-btn"
          onClick={() => {
            haptic()
            logEvent(user.telegram_id, 'task_variant_tap', { job_id: job.id })
            navigate(`/upload?jobId=${encodeURIComponent(job.id)}`)
          }}
        >
          Загрузить фото и начать
        </button>
      </div>
    </div>
  )
}

// Карточка примера: крупная пара до/после с разделителем
function TaskExampleCard({ direction, index }: { direction: JobDirection; index: number }) {
  return (
    <div className="task-v3__example" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="task-v3__example-split">
        <img
          src={asset(direction.before, 'preview')}
          alt="До"
          loading="lazy"
          style={{ background: `url(${lqip(direction.before)}) center/cover` }}
        />
        <img
          src={asset(direction.after, 'preview')}
          alt="После"
          loading="lazy"
          style={{ background: `url(${lqip(direction.after)}) center/cover` }}
        />
        <span className="task-v3__divider" aria-hidden />
      </div>
      <p className="task-v3__example-cap">{direction.label}</p>
    </div>
  )
}