// FIX-1 §6: Нативная строка баланса (высота 48 px, Single Source of Truth).
// Заменяет старый баннер лимита.
// Показывает суммарный остаток («12 дизайнов») и точную дату обновления («Бесплатные обновятся 14 сентября»).
// Тап открывает шторку /pricing и отправляет событие balance_row_tap.
// Поддерживает скелетон при загрузке и состояние ошибки («—» с showPopup).
import type { User } from '../types'
import { logEvent } from '../api'

interface Props {
  user?: User | null
  loading?: boolean
  error?: boolean
  onTap: () => void
  onRetry?: () => void
}

export default function BalanceRow({ user, loading, error, onTap, onRetry }: Props) {
  const tg = window.Telegram?.WebApp

  const handleClick = () => {
    if (loading) return

    if (error || !user) {
      if (tg?.showPopup) {
        tg.showPopup(
          {
            title: 'Баланс',
            message: 'Не удалось получить актуальный баланс. Попробовать снова?',
            buttons: [
              { type: 'default', text: 'Повторить', id: 'retry' },
              { type: 'cancel', text: 'Закрыть' },
            ],
          },
          (btnId) => {
            if (btnId === 'retry') {
              onRetry?.()
            }
          }
        )
      } else {
        onRetry?.()
      }
      return
    }

    tg?.HapticFeedback?.impactOccurred('light')
    logEvent(user.telegram_id, 'balance_row_tap')
    onTap()
  }

  const isExhausted = Boolean(user?.exhausted)

  return (
    <div
      className={`balance-row ${isExhausted ? 'balance-row--exhausted' : ''} ${error ? 'balance-row--error' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Баланс дизайнов"
    >
      <div className="balance-row__left">
        {/* SVG иконка кошелька / баланса */}
        <div className="balance-row__icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </div>
        <span className="balance-row__label">Баланс</span>
      </div>

      <div className="balance-row__right">
        {loading ? (
          <div className="balance-row__skeleton" />
        ) : error || !user ? (
          <span className="balance-row__value balance-row__value--error">—</span>
        ) : (
          <div className="balance-row__info">
            <span className={`balance-row__value ${isExhausted ? 'balance-row__value--exhausted' : ''}`}>
              {user.balance_line || `${user.total_designs ?? 0} дизайнов`}
            </span>
            {user.balance_sub_line && (
              <span className="balance-row__sub">
                {user.balance_sub_line}
              </span>
            )}
          </div>
        )}
        <span className="balance-row__chevron" aria-hidden>›</span>
      </div>
    </div>
  )
}
