// SPEC v2.0 §12.3: пополнение = bottom-sheet, не полноэкранная страница.
// Карточки пакетов — выбираемые радио-опции, внизу ОДНА первичная кнопка
// «Оплатить · N ⭐» с подстановкой выбранного номинала. Заголовок один.
import { useState } from 'react'
import type { User } from '../types'
import { buyPack, PACKS, PACK_ORDER, type PackId, logEvent } from '../api'

interface Props {
  user: User
  onClose: () => void
  onPaid: () => void
}

export default function PricingSheet({ user, onClose, onPaid }: Props) {
  const tg = window.Telegram?.WebApp
  const [selected, setSelected] = useState<PackId>('pack_s')
  const [busy, setBusy] = useState(false)

  const pack = PACKS[selected]

  const handlePay = async () => {
    tg?.HapticFeedback.impactOccurred('medium')
    setBusy(true)
    logEvent(user.telegram_id, 'package_selected', { pack: selected })
    try {
      const { invoice_url } = await buyPack(user.telegram_id, selected)
      tg?.openInvoice(invoice_url, (status) => {
        setBusy(false)
        if (status === 'paid') {
          tg?.HapticFeedback.notificationOccurred('success')
          onPaid()
        } else if (status === 'failed') {
          tg?.showAlert?.('❌ Ошибка оплаты. Попробуйте ещё раз')
        }
      })
    } catch {
      setBusy(false)
      tg?.showAlert?.('❌ Не удалось создать счёт. Попробуйте позже')
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bar" />
        {/* Один заголовок, без дублирования (§12.3) */}
        <h2 className="card-t" style={{ fontSize: 18, marginBottom: 4 }}>Пополнить баланс</h2>
        <p className="sub" style={{ marginBottom: 14 }}>
          15 кредитов сразу, затем 10 черновиков в день первые 7 дней
        </p>

        {PACK_ORDER.map((pid) => {
          const p = PACKS[pid]
          return (
            <button key={pid} className={`pack ${selected === pid ? 'on' : ''}`}
              onClick={() => { setSelected(pid); tg?.HapticFeedback.selectionChanged() }}>
              {p.badge && <span className="badge">{p.badge}</span>}
              <span className="radio" />
              <div className="pr">
                <b>{p.title}</b>
                <span>{p.price} ⭐</span>
              </div>
              <div className="tiny pd">{p.desc}</div>
              {p.saving && <div className="saving">{p.saving}</div>}
            </button>
          )
        })}

        <p className="tiny" style={{ lineHeight: 1.6, margin: '10px 2px' }}>
          • Купленные кредиты не сгорают<br />
          • Дизайн — 5 кредитов · HD — 15 · 3 варианта — 10
        </p>

        {/* Одна первичная кнопка с подстановкой номинала (§12.3) */}
        <button className="btn" disabled={busy} onClick={handlePay}>
          Оплатить · {pack.price} ⭐
        </button>
      </div>
    </div>
  )
}
