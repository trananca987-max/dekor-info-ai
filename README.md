# 🏠 Декор Инфо AI Designer

> Telegram Mini App для AI-дизайна интерьеров и дачных участков

## 📋 Описание

**Декор Инфо AI Designer** — это полнофункциональное Telegram Mini App, которое позволяет пользователям создавать потрясающие дизайны интерьеров и дачных участков с помощью искусственного интеллекта.

### ✨ Основные возможности

- 🏙️ **8 стилей интерьеров**: Современный, Скандинавский, Лофт, Минимализм, Классика, Хай-тек, Прованс, Японский
- 🌳 **10 стилей для дома и дачи**: Детская площадка, Гриль-зона, Бассейн, Терраса, Беседка, Теплица, Огород, Ландшафт, Патио, Пергола
- 🔄 **Легко расширяется** — добавляйте новые стили без изменения кода ([см. гайд](./ADDING_STYLES.md))
- 🆓 **2 бесплатные генерации в день** (Современный + Скандинавский стили)
- ⭐ **PRO тариф** (99 Stars ≈ $2): безлимит генераций, все 18 стилей, турборежим
- 💎 **PREMIUM тариф** (299 Stars ≈ $6): всё из PRO + референс, коммерция, Ultra HD
- 🖼️ **Гиперреалистичный UI** с фотографиями настоящих интерьеров
- 📢 **Проверка подписки** на канал @stroitelinfo
- 💰 **Оплата через Telegram Stars** (встроенная валюта)
- 📚 **История генераций** с фильтрами
- 📱 **Адаптивный дизайн** для всех устройств

## 🛠️ Технологии

### Frontend
- **React 18** + TypeScript
- **Vite** для быстрой разработки
- **@twa-dev/sdk** для интеграции с Telegram
- **Axios** для HTTP-запросов

### Backend
- **Python 3.11** + FastAPI
- **SQLAlchemy** + SQLite (PostgreSQL ready)
- **Replicate API** для AI-генерации (Stable Diffusion XL)
- **python-telegram-bot** для работы с Telegram API
- **Pillow** для обработки изображений

### Платежи
- **Telegram Stars** (встроенная валюта)

### Деплой
- **Railway.app** (бесплатный хостинг)
- **Docker** support

## 📁 Структура проекта

```
dekor-info-ai-designer/
│
├── src/                          # Frontend (React + TypeScript)
│   ├── components/              # React компоненты
│   │   ├── WelcomeScreen.tsx    # Экран приветствия
│   │   ├── MainScreen.tsx       # Главный экран
│   │   ├── UploadScreen.tsx     # Экран загрузки и генерации
│   │   ├── HistoryScreen.tsx    # История генераций
│   │   └── PricingScreen.tsx    # Ценообразование и оплата
│   ├── types.ts                 # TypeScript типы
│   ├── config.ts                # Конфигурация стилей и тарифов
│   ├── api.ts                   # API клиент
│   ├── styles.css               # Глобальные стили
│   ├── App.tsx                  # Главный компонент
│   └── main.tsx                 # Точка входа
│
├── backend/                      # Backend (Python FastAPI)
│   ├── models.py                # SQLAlchemy модели
│   ├── database.py              # Настройка БД
│   ├── ai_generator.py          # AI генерация (Replicate)
│   ├── telegram_helper.py       # Telegram API helper
│   └── main.py                  # FastAPI приложение
│
├── index.html                    # HTML entry point
├── package.json                  # Node.js зависимости
├── requirements.txt              # Python зависимости
├── tsconfig.json                 # TypeScript конфиг
├── vite.config.ts                # Vite конфиг
├── railway.json                  # Railway деплой конфиг
├── .env.example                  # Пример переменных окружения
├── .gitignore                    # Git ignore
└── README.md                     # Эта документация
```

## 🚀 Быстрый старт

### Предварительные требования

- **Python 3.11+**
- **Node.js 18+**
- **Telegram Bot Token** (от @BotFather)
- **Replicate API Token** (от replicate.com)

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/yourusername/dekor-info-ai-designer.git
cd dekor-info-ai-designer
```

### 2. Настройте переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
CHANNEL_USERNAME=@stroitelinfo
REPLICATE_API_TOKEN=r8_YOUR_REPLICATE_TOKEN
DATABASE_URL=sqlite:///./dekorinfo.db
VITE_API_URL=http://localhost:8000
SECRET_KEY=your-secret-key-here
NODE_ENV=development
```

### 3. Установите зависимости

#### Backend (Python):

```bash
pip install -r requirements.txt
```

#### Frontend (Node.js):

```bash
npm install
```

### 4. Запустите проект

#### Терминал 1 - Backend:

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend запустится на http://localhost:8000

#### Терминал 2 - Frontend:

```bash
npm run dev
```

Frontend запустится на http://localhost:5173

### 5. Настройте Telegram бота

1. Откройте @BotFather в Telegram
2. Отправьте `/mybots` → выберите вашего бота
3. `Bot Settings` → `Menu Button` → `Configure Menu Button`
4. Введите **URL**: `http://localhost:5173` (для локальной разработки)
5. Введите **Text**: `Открыть AI Designer`

### 6. Настройте webhook (для оплат)

```bash
python setup_webhook.py
```

Или вручную:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram-webhook",
    "allowed_updates": ["message", "pre_checkout_query"]
  }'
```

## 🎨 Использование

### Для пользователей

1. Откройте бота в Telegram
2. Нажмите кнопку "Открыть AI Designer"
3. Подпишитесь на канал @stroitelinfo
4. Загрузите фото помещения или участка
5. Выберите категорию (Интерьеры / Дом и дача)
6. Выберите стиль дизайна
7. Дождитесь генерации (20-40 секунд)
8. Скачайте результат или попробуйте другой стиль

### Монетизация

#### 🆓 FREE тариф
- 2 генерации в день (по 1 для каждого стиля)
- Современный и Скандинавский стили
- Стандартная скорость (30-40 сек)

#### ⭐ PRO тариф (99 Stars ≈ $2)
- Безлимит генераций
- Все 18 стилей (интерьеры + дом/дача)
- Турборежим (15-20 сек)
- Без водяного знака
- Действует 30 дней

#### 💎 PREMIUM тариф (299 Stars ≈ $6)
- Всё из PRO +
- Загрузка референса (Pinterest)
- Коммерческое использование
- Ultra HD качество (4K)
- Мгновенная обработка (10-15 сек)
- Пакетная обработка (до 5 фото)
- Действует 90 дней

## 🚢 Деплой на Railway

### 1. Создайте аккаунт на Railway.app

Перейдите на https://railway.app и зарегистрируйтесь.

### 2. Создайте новый проект

1. Нажмите "New Project"
2. Выберите "Deploy from GitHub repo"
3. Выберите ваш репозиторий

### 3. Настройте переменные окружения

В Railway Dashboard добавьте:

```
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
CHANNEL_USERNAME=@stroitelinfo
REPLICATE_API_TOKEN=r8_YOUR_REPLICATE_TOKEN
DATABASE_URL=<Railway предоставит автоматически>
SECRET_KEY=<сгенерируйте случайную строку>
NODE_ENV=production
```

### 4. Обновите webhook URL

После деплоя получите URL вашего приложения (например, `https://your-app.up.railway.app`) и обновите webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.up.railway.app/api/telegram-webhook",
    "allowed_updates": ["message", "pre_checkout_query"]
  }'
```

### 5. Обновите Menu Button URL

В @BotFather обновите URL на production:

```
https://your-app.up.railway.app
```

## 📊 База данных

### Таблицы

#### users
- `telegram_id` (BigInteger, PK) - ID пользователя Telegram
- `username` (String) - Username пользователя
- `first_name` (String) - Имя пользователя
- `tier` (String) - Тариф (free, pro, premium)
- `tier_expires_at` (DateTime) - Дата окончания платного тарифа
- `free_modern_used` (Boolean) - Использован ли Современный стиль сегодня
- `free_scandinavian_used` (Boolean) - Использован ли Скандинавский стиль сегодня
- `is_subscribed` (Boolean) - Подписан ли на канал
- `created_at` (DateTime) - Дата регистрации
- `updated_at` (DateTime) - Дата последнего обновления

#### generations
- `id` (Integer, PK, Auto) - ID генерации
- `user_id` (BigInteger, FK) - ID пользователя
- `original_image_url` (String) - URL оригинального фото
- `result_image_url` (String) - URL результата
- `style_id` (String) - ID стиля
- `category` (String) - Категория (interior, outdoor)
- `cost_stars` (Integer) - Стоимость в Stars
- `processing_time` (Float) - Время обработки (секунды)
- `status` (String) - Статус (pending, processing, completed, failed)
- `error_message` (String) - Сообщение об ошибке
- `created_at` (DateTime) - Дата создания

#### payments
- `id` (Integer, PK, Auto) - ID платежа
- `user_id` (BigInteger, FK) - ID пользователя
- `telegram_payment_charge_id` (String, Unique) - ID платежа Telegram
- `product` (String) - Продукт (pro, premium)
- `stars_paid` (Integer) - Оплачено Stars
- `status` (String) - Статус (completed)
- `created_at` (DateTime) - Дата платежа

## 🎯 API Endpoints

### Пользователи
- `POST /api/check-subscription` - Проверить подписку на канал
- `GET /api/users/{user_id}` - Получить данные пользователя
- `POST /api/users` - Создать нового пользователя

### Генерация
- `POST /api/upload` - Загрузить фото
- `POST /api/generate` - Запустить AI генерацию
- `GET /api/generate/{task_id}` - Проверить статус генерации
- `GET /api/users/{user_id}/generations` - История генераций

### Платежи
- `POST /api/buy-pro` - Создать счёт на PRO тариф
- `POST /api/buy-premium` - Создать счёт на PREMIUM тариф
- `POST /api/telegram-webhook` - Webhook для обработки платежей

## 🔧 Разработка

### Frontend

```bash
npm run dev        # Запуск dev сервера
npm run build      # Сборка production
npm run preview    # Просмотр production сборки
npm run lint       # Проверка кода
```

### Backend

```bash
# Запуск с автоперезагрузкой
uvicorn backend.main:app --reload

# Запуск production
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### База данных

SQLite используется для локальной разработки. Для production рекомендуется PostgreSQL.

Миграция на PostgreSQL:

1. Обновите `DATABASE_URL` в `.env`:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

2. Установите `asyncpg`:
```bash
pip install asyncpg
```

3. Перезапустите backend

## 📖 Дополнительная документация

- [QUICKSTART.md](./QUICKSTART.md) - Быстрый старт за 10 минут
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Подробный гайд по деплою
- [MONETIZATION.md](./MONETIZATION.md) - Маркетинг и монетизация

## 🤝 Поддержка

- **Telegram канал**: [@stroitelinfo](https://t.me/stroitelinfo)
- **Email**: support@stroitelinfo.ru

## 📄 Лицензия

MIT License - свободно используйте для коммерческих проектов!

## 👨‍💻 Автор

Создано с ❤️ для @stroitelinfo

**Версия**: 1.0.0  
**Статус**: ✅ Production Ready  
**Дата**: Февраль 2026
