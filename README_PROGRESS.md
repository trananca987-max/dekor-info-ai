# 🏠 Декор Инфо AI Designer - Улучшенная версия

> Telegram Mini App для AI-дизайна интерьеров и дачных участков с монетизацией через Telegram Stars

## 🎯 Что создано

### ✅ **Базовая структура:**
- ✅ package.json (с Vercel Postgres)
- ✅ tailwind.config.js (уникальные градиенты и анимации)
- ✅ src/config/styles.ts (18 стилей: 8 интерьеров + 10 дом/дача)
- ✅ src/index.css (уникальный дизайн с blur, gradients, animations)
- ✅ src/types.ts (TypeScript типы)
- ✅ src/components/WelcomeScreen.tsx (проверка подписки @stroitelinfo)

### ⏳ **Что нужно добавить:**
- ⏳ Остальные React компоненты (CategoryScreen, StyleGrid, PricingScreen, etc.)
- ⏳ Vercel Functions API (api/generate.ts, api/webhook.ts, etc.)
- ⏳ Vercel Postgres схема
- ⏳ Главный App.tsx

---

## 📦 Полная структура проекта

```
roomstyle-ai-enhanced/
│
├── package.json                    ✅ СОЗДАН (с @vercel/postgres)
├── tailwind.config.js              ✅ СОЗДАН (уникальный дизайн)
├── tsconfig.json                   ⏳ Используйте из готового проекта
├── vite.config.ts                  ⏳ Используйте из готового проекта
├── index.html                      ⏳ Используйте из готового проекта
├── vercel.json                     ⏳ Создайте (см. ниже)
│
├── src/
│   ├── config/
│   │   └── styles.ts               ✅ СОЗДАН (18 стилей + 3 тарифа)
│   │
│   ├── components/
│   │   ├── WelcomeScreen.tsx       ✅ СОЗДАН (проверка подписки)
│   │   ├── CategoryScreen.tsx      ⏳ НУЖНО СОЗДАТЬ
│   │   ├── StyleGrid.tsx           ⏳ НУЖНО СОЗДАТЬ
│   │   ├── UploadScreen.tsx        ⏳ Адаптировать из готового
│   │   ├── ResultScreen.tsx        ⏳ Адаптировать из готового
│   │   ├── HistoryScreen.tsx       ⏳ НУЖНО СОЗДАТЬ
│   │   └── PricingScreen.tsx       ⏳ НУЖНО СОЗДАТЬ
│   │
│   ├── types.ts                    ✅ СОЗДАН
│   ├── index.css                   ✅ СОЗДАН (уникальный дизайн)
│   ├── App.tsx                     ⏳ НУЖНО СОЗДАТЬ
│   └── main.tsx                    ⏳ Используйте из готового
│
├── api/                            ⏳ Vercel Functions
│   ├── generate.ts                 ⏳ НУЖНО СОЗДАТЬ (Kie.ai)
│   ├── check-subscription.ts       ⏳ НУЖНО СОЗДАТЬ
│   ├── create-invoice.ts           ⏳ НУЖНО СОЗДАТЬ (Stars)
│   ├── webhook.ts                  ⏳ НУЖНО СОЗДАТЬ (Stars)
│   └── user.ts                     ⏳ НУЖНО СОЗДАТЬ (CRUD)
│
└── db/
    └── schema.sql                  ⏳ НУЖНО СОЗДАТЬ (Postgres)
```

---

## 🚀 Как продолжить доработку

### **Вариант 1: Я продолжу создание (РЕКОМЕНДУЮ)**

Скажите "**продолжай**" и я создам:
1. Все остальные React компоненты
2. Vercel Functions API
3. Vercel Postgres схему
4. Полную документацию

**Время:** ~30-40 минут

---

### **Вариант 2: Вы доработаете сами**

Используйте готовый проект как основу и добавьте созданные мной файлы:

#### **Шаг 1:** Скопируйте созданные файлы
```bash
# Из готового проекта возьмите:
- vite.config.ts
- tsconfig.json  
- index.html
- src/main.tsx
- src/App.tsx (нужно доработать)
- api/* (нужно доработать)

# Замените на мои:
- package.json          ✅
- tailwind.config.js    ✅  
- src/index.css         ✅
- src/types.ts          ✅
- src/config/styles.ts  ✅
- src/components/WelcomeScreen.tsx ✅
```

#### **Шаг 2:** Создайте недостающие компоненты

**CategoryScreen.tsx** - Выбор категории (🏠 Интерьеры / 🌳 Дом и дача):
```tsx
import { getStylesByCategory } from '../config/styles';

export default function CategoryScreen({ onSelect }: { onSelect: (category: 'interior' | 'outdoor') => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button onClick={() => onSelect('interior')} className="card p-8">
        <div className="text-6xl mb-4">🏠</div>
        <h3 className="text-xl font-bold">Интерьеры</h3>
        <p className="text-sm text-white/60">8 стилей</p>
      </button>
      <button onClick={() => onSelect('outdoor')} className="card p-8">
        <div className="text-6xl mb-4">🌳</div>
        <h3 className="text-xl font-bold">Дом и дача</h3>
        <p className="text-sm text-white/60">10 стилей</p>
      </button>
    </div>
  );
}
```

**StyleGrid.tsx** - Сетка стилей:
```tsx
import { getStylesByCategory, getStylesByTier } from '../config/styles';
import type { User } from '../types';

export default function StyleGrid({ 
  category, 
  user, 
  onStyleSelect 
}: { 
  category: 'interior' | 'outdoor';
  user: User;
  onStyleSelect: (styleId: string) => void;
}) {
  const categoryStyles = getStylesByCategory(category);
  const availableStyles = getStylesByTier(user.tier);

  return (
    <div className="grid grid-cols-2 gap-4">
      {categoryStyles.map((style, index) => {
        const isAvailable = availableStyles.some(s => s.id === style.id);
        const isUsed = user.tier === 'free' && (
          (style.id === 'modern' && user.free_modern_used) ||
          (style.id === 'scandinavian' && user.free_scandinavian_used)
        );

        return (
          <button
            key={style.id}
            onClick={() => isAvailable && !isUsed && onStyleSelect(style.id)}
            className={`style-card p-4 stagger-item ${!isAvailable || isUsed ? 'locked' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="text-4xl mb-2">{style.emoji}</div>
            <h3 className="font-bold mb-1">{style.name}</h3>
            <p className="text-xs text-white/60">{style.description}</p>
            
            {!isAvailable && (
              <span className="badge badge-pro absolute top-2 right-2">
                🔒 {style.tier === 'pro' ? 'PRO' : 'PREMIUM'}
              </span>
            )}
            
            {isUsed && (
              <span className="badge badge-free absolute top-2 right-2">
                ✓ Использован
              </span>
            )}
            
            {isAvailable && style.tier === 'free' && !isUsed && (
              <span className="badge badge-free absolute top-2 right-2">
                БЕСПЛАТНО
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

**PricingScreen.tsx** - Тарифы и оплата:
```tsx
import { TIERS } from '../config/styles';
import type { User } from '../types';

export default function PricingScreen({ user }: { user: User }) {
  const tg = window.Telegram?.WebApp;

  const handleBuyPro = async () => {
    try {
      const res = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.telegram_id, tier: 'pro' }),
      });
      const { invoice_url } = await res.json();
      
      tg?.openInvoice(invoice_url, (status) => {
        if (status === 'paid') {
          tg.showAlert('✅ Оплата прошла! Теперь у вас PRO тариф');
          window.location.reload();
        }
      });
    } catch (error) {
      tg?.showAlert('❌ Ошибка создания счёта');
    }
  };

  const handleBuyPremium = async () => {
    // Аналогично handleBuyPro
  };

  return (
    <div className="space-y-4">
      {Object.values(TIERS).map((tier) => (
        <div key={tier.id} className={`card ${tier.id === 'pro' ? 'border-2 border-accent animate-glow' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">{tier.name}</h3>
            {tier.price > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold">{tier.price} ⭐</div>
                <div className="text-sm text-white/60">≈ ${(tier.price * 0.02).toFixed(2)}</div>
              </div>
            )}
          </div>
          
          <ul className="space-y-2 mb-4">
            {tier.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-accent">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          
          {tier.id === 'pro' && user.tier === 'free' && (
            <button onClick={handleBuyPro} className="btn btn-primary w-full">
              Купить PRO за {tier.price} ⭐
            </button>
          )}
          
          {tier.id === 'premium' && user.tier !== 'premium' && (
            <button onClick={handleBuyPremium} className="btn btn-premium w-full">
              Купить PREMIUM за {tier.price} ⭐
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### **Шаг 3:** Создайте Vercel Functions

**api/check-subscription.ts**:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { user_id } = req.body;
  
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHANNEL = '@stroitelinfo';
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL}&user_id=${user_id}`
    );
    const data = await response.json();
    
    const isSubscribed = ['member', 'administrator', 'creator'].includes(data.result?.status);
    
    return res.json({ is_subscribed: isSubscribed });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check subscription' });
  }
}
```

**api/create-invoice.ts**:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

const TIERS = {
  pro: { price: 99, title: '⭐ PRO Тариф', description: 'Безлимит на 30 дней' },
  premium: { price: 299, title: '💎 PREMIUM Тариф', description: 'Всё + референс на 90 дней' },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { user_id, tier } = req.body;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  const tierInfo = TIERS[tier as keyof typeof TIERS];
  if (!tierInfo) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tierInfo.title,
          description: tierInfo.description,
          payload: JSON.stringify({ user_id, tier }),
          provider_token: '', // Empty for Stars
          currency: 'XTR', // Telegram Stars
          prices: [{ label: tierInfo.title, amount: tierInfo.price }],
        }),
      }
    );
    const data = await response.json();
    
    return res.json({ invoice_url: data.result });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create invoice' });
  }
}
```

**api/webhook.ts** - Обработка платежей:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const update = req.body;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  
  // Pre-checkout query
  if (update.pre_checkout_query) {
    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        }),
      }
    );
    return res.json({ ok: true });
  }
  
  // Successful payment
  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const user_id = update.message.from.id;
    const payload = JSON.parse(payment.invoice_payload);
    
    // Update user tier in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (payload.tier === 'pro' ? 30 : 90));
    
    await sql`
      UPDATE users 
      SET tier = ${payload.tier}, 
          tier_expires_at = ${expiresAt.toISOString()}
      WHERE telegram_id = ${user_id}
    `;
    
    // Send confirmation
    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user_id,
          text: `✅ Оплата прошла успешно! Теперь у вас ${payload.tier === 'pro' ? 'PRO' : 'PREMIUM'} тариф`,
        }),
      }
    );
    
    return res.json({ ok: true });
  }
  
  return res.json({ ok: true });
}
```

#### **Шаг 4:** Создайте Vercel Postgres схему

**db/schema.sql**:
```sql
CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  username VARCHAR(255),
  first_name VARCHAR(255) NOT NULL,
  tier VARCHAR(20) DEFAULT 'free',
  tier_expires_at TIMESTAMP,
  free_modern_used BOOLEAN DEFAULT false,
  free_scandinavian_used BOOLEAN DEFAULT false,
  is_subscribed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generations (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(telegram_id),
  style_id VARCHAR(50) NOT NULL,
  category VARCHAR(20) NOT NULL,
  original_url TEXT NOT NULL,
  result_url TEXT NOT NULL,
  cost_stars INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_id ON generations(user_id);
CREATE INDEX idx_created_at ON generations(created_at DESC);
```

#### **Шаг 5:** Настройте Vercel

1. **vercel.json**:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

2. **Environment Variables** (в Vercel Dashboard):
```
TELEGRAM_BOT_TOKEN=8581032888:AAETfwt1YqGIUepdD9L1BsvanH2JzSj8gHc
CHANNEL_USERNAME=@stroitelinfo
KIE_API_TOKEN=ваш-kie-ai-токен
POSTGRES_URL=автоматически-создастся-vercel
```

---

## 🎯 Что уже готово

### ✅ **Дизайн (100%)**
- Уникальные градиенты (не повторяется!)
- Плавные анимации (stagger, glow, fadeInUp)
- Blur эффекты на карточках
- Ripple эффект на кнопках
- Кастомные цвета и стили

### ✅ **Конфигурация (100%)**
- 18 стилей (8 интерьеров + 10 дом/дача)
- 3 тарифа (FREE/PRO/PREMIUM)
- TypeScript типы
- Tailwind настройки

### ✅ **Компоненты (20%)**
- WelcomeScreen (проверка подписки)
- Нужно: CategoryScreen, StyleGrid, PricingScreen, HistoryScreen

### ⏳ **API (0%)**
- Нужно: все Vercel Functions

### ⏳ **База данных (0%)**
- Нужно: Vercel Postgres схема

---

## 💡 Мой совет

**ДАЙТЕ МНЕ ПРОДОЛЖИТЬ!** 🚀

Я создам ВСЁ за 30-40 минут:
- Все React компоненты
- Все Vercel Functions
- Vercel Postgres схему
- Полную документацию на русском
- QUICKSTART гайд

**Просто скажите: "продолжай"**

---

## 📞 Нужна помощь?

Если хотите доработать сами - используйте этот README как гайд.
Если хотите, чтобы я закончил - скажите "продолжай" и я сделаю всё! 💪
