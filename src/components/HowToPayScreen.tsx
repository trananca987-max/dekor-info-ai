// Экран «Как оплатить?» — пошаговая инструкция покупки Звёзд для пользователей 60+
import type { User } from '../types';

interface Props {
  user: User;
  onBack: () => void;
}

export default function HowToPayScreen({ onBack }: Props) {
  const tg = window.Telegram?.WebApp;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto animate-fade-in-up">
        <button onClick={onBack} className="btn btn-outline mb-4">← Назад</button>

        <h2 className="text-2xl font-bold mb-1">⭐ Как купить звёзды</h2>
        <p className="text-white/60 text-sm mb-5">
          Звёзды — внутренние деньги Телеграма. Нужны для оплаты тарифов.
        </p>

        {/* Android */}
        <div className="card mb-4">
          <h3 className="font-bold text-accent mb-3">🤖 Телефон Android (Samsung, Xiaomi…)</h3>
          <ol className="space-y-2.5 text-sm text-white/85 list-none">
            <li>1️⃣ Откройте <strong>Телеграм</strong></li>
            <li>2️⃣ Нажмите на своё имя сверху слева → «Мой профиль»</li>
            <li>3️⃣ Нажмите на <strong>звёздочку ⭐</strong></li>
            <li>4️⃣ Выберите пакет звёзд и нажмите «Купить»</li>
            <li>5️⃣ Готово! Звёзды в вашем профиле ✨</li>
          </ol>
          <p className="text-xs text-white/50 mt-3">
            Если пишет «Ошибка оплаты»: Play Маркет → профиль → «Платежи» → «Пополнить»
          </p>
        </div>

        {/* iPhone */}
        <div className="card mb-4">
          <h3 className="font-bold text-premium mb-3">🍎 iPhone</h3>
          <ol className="space-y-2.5 text-sm text-white/85 list-none">
            <li>1️⃣ Купите карточку App Store в салоне связи (МТС, Связной)</li>
            <li>2️⃣ App Store → ваша фотография → «Пополнить Apple ID» → введите код</li>
            <li>3️⃣ Телеграм → имя сверху → звёздочка ⭐</li>
            <li>4️⃣ Пакет → «Купить». Готово! ✨</li>
          </ol>
        </div>

        {/* Помощь */}
        <div className="card bg-accent/5 border-accent/20 mb-4">
          <h4 className="font-bold mb-2">🆘 Не получается?</h4>
          <p className="text-sm text-white/80 mb-3">
            Попросите помочь близких — покажите им эту инструкцию. Или напишите нам:
          </p>
          <button
            className="btn btn-primary w-full ripple"
            onClick={() => tg?.openTelegramLink('https://t.me/stroitelinfo')}
          >
            💬 Написать в поддержку
          </button>
        </div>

        {/* FAQ */}
        <div className="card text-sm space-y-3">
          <div>
            <p className="font-semibold">Звёзды пропадут?</p>
            <p className="text-white/70">Нет, остаются на балансе, пока не потратите.</p>
          </div>
          <div>
            <p className="font-semibold">Заплатил, а тариф не открылся?</p>
            <p className="text-white/70">Закройте приложение полностью и откройте снова. Не помогло — напишите в поддержку.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
