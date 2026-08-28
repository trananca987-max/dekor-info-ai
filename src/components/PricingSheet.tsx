// PATCH v2.2 §7.5: пополнение = bottom-sheet.
// Карточки пакетов — радио-опции, выровнены по верху с фиксированным отступом.
// Внизу ОДНА первичная кнопка «Оплатить · N ⭐» с подстановкой номинала.
// Верхняя строка — текущее состояние (§7.5), не онбординг.
// Разовые и подписки визуально разделены подзаголовками (§6).
// Один бейдж на весь список. Звезда — один SVG, не эмодзи (§7.5).
import { useState } from 'react'
import type { User } from '../types'
import { buyPack, PACKS, PACK_ORDER, type PackId, logEvent } from '../api'

interface Props {
  user: User
  onClose: () => void
  onPaid: () => void
}

// §7.5: звезда — один SVG (разный рендер эмодзи на iOS и Android)
const Star = () => (
  <svg className="star-ic" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.4 1.15 6.8L12 17.3l-5.9 3.2 1.15-6.8L2.5 9.3l6.6-1.04L12 2z" />
  </svg>
)

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

  // §6: разовые и подписки — отдельными группами
  const groups: Array<{ name: string; ids: PackId[] }> = [
    { name: 'Разовая покупка', ids: PACK_ORDER.filter(p => PACKS[p].kind === 'pack') },
    { name: 'Подписка', ids: PACK_ORDER.filter(p => PACKS[p].kind === 'sub') },
  ]

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bar" />
        <h2 className="card-t" style={{ fontSize: 18, marginBottom: 4 }}>Пополнить баланс</h2>
        {/* §7.5: верхняя строка показывает текущее состояние */}
        <p className="sub" style={{ marginBottom: 14 }}>{user.sheet_line}</p>

        {groups.map(g => (
          <div key={g.name}>
            <div className="pack-group">{g.name}</div>
            {g.ids.map((pid) => {
              const p = PACKS[pid]
              return (
                <button key={pid} className={`pack ${selected === pid ? 'on' : ''}`}
                  onClick={() => { setSelected(pid); tg?.HapticFeedback.selectionChanged() }}>
                  {/* §7.5: один бейдж на весь список */}
                  {p.badge && <span className="badge">{p.badge}</span>}
                  <span className="radio" />
                  <div className="pr">
                    <b>{p.title.replace(/·\s*\d+\s*⭐.*$/, '·').replace(/·$/, '')}
                      <span style={{ color: 'var(--star)', fontWeight: 600 }}>
                        {' '}{p.price} <Star />{p.kind === 'sub' ? '/мес' : ''}
                      </span>
                    </b>
                  </div>
                  <div className="tiny pd">{p.desc}</div>
                  {p.saving && <div className="saving">{p.saving}</div>}
                </button>
              )
            })}
          </div>
        ))}

        {/* §7.5: правила читаемым контрастом не ниже AA */}
        <p className="sheet-rules">
          • Купленные кредиты не сгорают<br />
          • Дизайн — 5 кредитов · HD — 15 · 3 варианта — 10<br />
          • При неудачной генерации кредиты возвращаются
        </p>

        {/* Одна первичная кнопка с подстановкой номинала (§7.5) */}
        <button className="btn" disabled={busy} onClick={handlePay}>
          Оплатить · {pack.price} ⭐
        </button>
      </div>
    </div>
  )
}
