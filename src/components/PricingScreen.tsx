// Шторка пополнения (SPEC 4): валюта — кредиты, оплата в ⭐.
// Пакеты: S (60⭐) → M (160⭐) → PRO (149⭐/мес) → PREMIUM (299⭐/мес)
import { User } from '../types';
import { buyPack, PACKS, PACK_ORDER, type PackId } from '../api';

interface Props {
  user: User;
  onBack: () => void;
  onUpgradeSuccess: () => void;
}

export default function PricingScreen({ user, onBack, onUpgradeSuccess }: Props) {
  const tg = window.Telegram?.WebApp;

  const handleBuy = async (pack: PackId) => {
    tg?.HapticFeedback.impactOccurred('medium');
    try {
      const { invoice_url } = await buyPack(user.telegram_id, pack);
      tg?.openInvoice(invoice_url, (status) => {
        if (status === 'paid') {
          tg.HapticFeedback.notificationOccurred('success');
          tg.showAlert('✅ Оплата прошла! Кредиты зачислены', () => onUpgradeSuccess());
        } else if (status === 'failed') {
          tg.showAlert('❌ Ошибка оплаты. Попробуйте ещё раз');
        }
      });
    } catch {
      tg?.showAlert('❌ Не удалось создать счёт. Попробуйте позже');
    }
  };

  return (
    <div className="screen">
      <div className="nav">
        <button className="link" onClick={onBack}>← Назад</button>
        <span className="bal-nav">{user.credits || 0} кредитов</span>
      </div>
      <div className="body">
        <h1 className="screen" style={{ marginTop: 8 }}>Пополнить баланс</h1>
        <p className="sub" style={{ marginBottom: 14 }}>
          Дизайн — 5 кредитов · HD-улучшение — 15 · 3 варианта — 10
        </p>

        {PACK_ORDER.map((id) => {
          const p = PACKS[id];
          const isBest = id === 'sub_pro';
          return (
            <div key={id} className={`pack ${isBest ? 'best' : ''}`}>
              {p.badge && <span className="badge">{p.badge}</span>}
              <div className="pr">
                <b>{p.title}</b>
                <span>{p.kind === 'pack' ? `${p.credits} кредитов` : ''}</span>
              </div>
              <div className="tiny">{p.desc}</div>
              <button className="btn sm" style={{ marginTop: 10 }} onClick={() => handleBuy(id)}>
                Купить за {p.price} ⭐
              </button>
            </div>
          );
        })}

        {/* Правила кредитов (SPEC 4) */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="pad">
            <h2 className="card-t" style={{ marginBottom: 6 }}>Правила</h2>
            <p className="tiny" style={{ lineHeight: 1.6 }}>
              • Купленные кредиты не сгорают<br />
              • Квота подписки обновляется ежемесячно, переносится максимум на 2 месяца<br />
              • Первые 2 дизайна — бесплатно
            </p>
          </div>
        </div>

        {/* Бонусы за действия (SPEC 4) */}
        <div className="card" style={{ marginTop: 10 }}>
          <div className="pad">
            <h2 className="card-t" style={{ marginBottom: 6 }}>Бесплатные кредиты</h2>
            <p className="tiny" style={{ lineHeight: 1.6 }}>
              • Пригласил друга — <b style={{ color: 'var(--t1)' }}>+10 кредитов</b> после его первой генерации (макс 5 в месяц)<br />
              • Подписка на канал — <b style={{ color: 'var(--t1)' }}>+5 кредитов</b>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
