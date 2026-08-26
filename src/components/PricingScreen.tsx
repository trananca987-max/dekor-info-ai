// Экран пакетов: одна валюта — звёзды. Мелкий пак / средний −20% / подписка 300★/мес
import { User } from '../types';
import { buyPack, PACKS, type PackId } from '../api';

interface Props {
  user: User;
  onBack: () => void;
  onUpgradeSuccess: () => void;
}

const PACK_ORDER: PackId[] = ['stars50', 'stars150', 'sub300'];
const PACK_EMOJI: Record<PackId, string> = { stars50: '⭐️', stars150: '💰', sub300: '🚀' };
const PACK_BADGE: Record<PackId, string | null> = { stars50: null, stars150: '−20%', sub300: 'лучшая цена' };

export default function PricingScreen({ user, onBack, onUpgradeSuccess }: Props) {
  const tg = window.Telegram?.WebApp;

  const handleBuy = async (pack: PackId) => {
    tg?.HapticFeedback.impactOccurred('medium');
    try {
      const { invoice_url } = await buyPack(user.telegram_id, pack);
      tg?.openInvoice(invoice_url, (status) => {
        if (status === 'paid') {
          tg.HapticFeedback.notificationOccurred('success');
          tg.showAlert('✅ Оплата прошла! Звёзды зачислены', () => onUpgradeSuccess());
        } else if (status === 'failed') {
          tg.showAlert('❌ Ошибка оплаты. Попробуйте ещё раз');
        }
      });
    } catch {
      tg?.showAlert('❌ Не удалось создать счёт. Попробуйте позже');
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="btn btn-outline mb-4">← Назад</button>

        <h2 className="text-3xl font-bold mb-2 text-center">
          🛒 Пакеты <span className="text-gradient-accent">звёзд</span>
        </h2>
        <p className="text-white/60 text-center mb-2">Дизайн — 5★ · HD-улучшение — 15★ · 3 варианта — 10★</p>
        <p className="text-center text-sm mb-6">
          Ваш баланс: <strong className="text-accent">⭐ {user.stars}</strong>
          {user.free_generations > 0 && (
            <> · <strong className="text-success">{user.free_generations} бесплатно</strong></>
          )}
        </p>

        <div className="space-y-4">
          {PACK_ORDER.map((id) => {
            const p = PACKS[id];
            return (
              <div key={id} className={`card p-5 border border-white/10 ${id === 'sub300' ? 'bg-premium/10 border-premium/30' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold">{PACK_EMOJI[id]} {p.title}</h3>
                  {PACK_BADGE[id] && <span className="badge badge-pro">{PACK_BADGE[id]}</span>}
                </div>
                <p className="text-white/60 text-sm mb-4">{p.desc}</p>
                <button
                  className={`btn w-full ripple ${id !== 'stars50' ? 'btn-primary' : ''}`}
                  style={id === 'stars50' ? { background: 'rgba(255,255,255,0.08)' } : undefined}
                  onClick={() => handleBuy(id)}
                >
                  Купить за {p.price} ⭐
                </button>
              </div>
            );
          })}
        </div>

        {/* Бонусы за действия */}
        <div className="card mt-5 p-5 bg-accent/5 border-accent/20">
          <h3 className="font-bold mb-1">🎁 Бесплатные звёзды</h3>
          <ul className="text-sm text-white/70 space-y-1">
            <li>• Пригласил друга — <strong className="text-white">+30★</strong></li>
            <li>• Подписка на канал — <strong className="text-white">+20★</strong></li>
            <li>• Зашёл через неделю — <strong className="text-white">+10★</strong></li>
          </ul>
        </div>

        {/* Как оплатить */}
        <div className="card mt-4 p-5 bg-accent/5 border-accent/20 text-sm text-white/80">
          💡 Нужны Звёзды? Нажмите «⭐ Как оплатить?» в главном меню — там пошаговая инструкция.
        </div>
      </div>
    </div>
  );
}
