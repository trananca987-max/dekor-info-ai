// FIX-1 §5: Шторка оплаты — пакеты Telegram Stars (10 / 30 / 100 дизайнов).
// Никаких подписок, кредитов, уровней HD/Low. Единица измерения — дизайн.
// Один бейдж «Выгодно» на 120★, процент экономии 20% / 30%.
// Единый глиф звезды ★ на всём экране. Ссылка «Условия и поддержка».
import { useState, useEffect } from 'react'
import type { User } from '../types'
import { buyPack, PACKS, PACK_ORDER, type PackId, logEvent } from '../api'

interface Props {
  user: User
  onClose: () => void
  onPaid: () => void
}

// §5.2: Единый глиф звезды ★
const Star = () => <span className="star-glyph" aria-hidden style={{ color: 'var(--tg-theme-accent-text-color, #2481cc)', fontWeight: 'bold' }}>★</span>

export default function PricingSheet({ user, onClose, onPaid }: Props) {
  const tg = window.Telegram?.WebApp
  const [selected, setSelected] = useState<PackId>('pack_30') // по умолчанию рекомендуемый "Выгодно"
  const [busy, setBusy] = useState(false)

  const pack = PACKS[selected]

  useEffect(() => {
    // Включаем подтверждение закрытия только при активной шторке/оплате
    return () => {
      try {
        tg?.disableClosingConfirmation?.()
      } catch { /* ignore */ }
    }
  }, [tg])

  const handlePay = async () => {
    if (busy) return
    tg?.HapticFeedback.impactOccurred('medium')
    setBusy(true)
    try {
      tg?.enableClosingConfirmation?.()
    } catch { /* ignore */ }

    logEvent(user.telegram_id, 'package_selected', { pack: selected })

    try {
      const { invoice_url } = await buyPack(user.telegram_id, selected)

      if (!tg?.openInvoice) {
        // Фолбэк для обычного браузера при тестировании
        window.open(invoice_url, '_blank')
        setBusy(false)
        try { tg?.disableClosingConfirmation?.() } catch {}
        return
      }

      tg.openInvoice(invoice_url, (status) => {
        setBusy(false)
        try { tg?.disableClosingConfirmation?.() } catch {}

        if (status === 'paid') {
          tg.HapticFeedback?.notificationOccurred('success')
          onPaid()
          onClose()
        } else if (status === 'cancelled') {
          // Отмена пользователем — просто возвращаем кнопку в исходное состояние
        } else if (status === 'failed') {
          tg.showPopup?.({
            title: 'Ошибка оплаты',
            message: 'Не удалось завершить оплату в Telegram. Попробуйте ещё раз.',
            buttons: [{ type: 'ok', text: 'Понятно' }],
          })
        }
      })
    } catch (err) {
      setBusy(false)
      try { tg?.disableClosingConfirmation?.() } catch {}
      tg?.showPopup?.({
        title: 'Ошибка создания счёта',
        message: 'Не удалось инициализировать оплату. Пожалуйста, попробуйте позже.',
        buttons: [{ type: 'ok', text: 'Понятно' }],
      })
    }
  }

  const handleShowTerms = () => {
    tg?.HapticFeedback?.selectionChanged()
    if (tg?.showPopup) {
      tg.showPopup({
        title: 'Условия и поддержка',
        message: 'Купленные пакеты дизайнов действуют бессрочно. По всем вопросам обращений, списаний и работы сервиса пишите администратору: @stroitelinfo (официальная поддержка Telegram не обрабатывает запросы по ботам). Команды в чате бота: /terms, /support, /paysupport.',
        buttons: [{ type: 'ok', text: 'Закрыть' }],
      })
    } else {
      alert('Условия и поддержка: по всем вопросам пишите @stroitelinfo. Команды бота: /terms, /support, /paysupport.')
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bar" />
        <h2 className="card-t" style={{ fontSize: 18, marginBottom: 4 }}>Пополнить баланс</h2>
        <p className="sub" style={{ marginBottom: 14 }}>
          {user.total_designs !== undefined
            ? `Баланс: ${user.balance_line || `${user.total_designs} дизайнов`}`
            : user.sheet_line || 'Выберите подходящий пакет дизайнов'}
        </p>

        <div className="pack-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PACK_ORDER.map((pid) => {
            const p = PACKS[pid]
            const isSelected = selected === pid

            return (
              <button
                key={pid}
                type="button"
                className={`pack ${isSelected ? 'on' : ''}`}
                onClick={() => {
                  setSelected(pid)
                  tg?.HapticFeedback?.selectionChanged()
                }}
              >
                {/* Бейдж только на Выгодно (§5.2) */}
                {p.badge && <span className="badge">{p.badge}</span>}
                <span className="radio" />
                <div className="pr">
                  <b>
                    {p.title} ·{' '}
                    <span style={{ color: 'var(--tg-theme-accent-text-color, #2481cc)', fontWeight: 600 }}>
                      {p.price} <Star />
                    </span>
                  </b>
                </div>
                {p.saving && <div className="saving">{p.saving}</div>}
              </button>
            )
          })}
        </div>

        {/* §5.2: Три строки правил */}
        <p className="sheet-rules" style={{ marginTop: 14, marginBottom: 14, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
          • Купленные дизайны не сгорают<br />
          • При неудачной генерации дизайн возвращается на баланс<br />
          • Бесплатные обновляются каждую неделю
        </p>

        {/* §5.2: Первичная кнопка с подстановкой номинала */}
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={handlePay}
          style={{ width: '100%', marginBottom: 10 }}
        >
          {busy ? 'Создание счёта...' : `Оплатить · ${pack.price} ★`}
        </button>

        {/* §5.5: Ссылка на условия и поддержку */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleShowTerms}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary, #888)',
              fontSize: 12,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            Условия использования и поддержка
          </button>
        </div>
      </div>
    </div>
  )
}
