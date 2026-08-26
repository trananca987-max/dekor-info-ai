# 🚀 Инструкция по установке проекта "Декор Инфо AI Designer"

**Дата:** 20 февраля 2026  
**Версия:** 1.1 (с фото-карточками и вашим логотипом)

---

## 📦 **Что в архиве:**

Полный проект Telegram Mini App для AI-дизайна интерьеров.

**Структура папок:**
```
dekor-info-ai-designer/
├── backend/                    # Python FastAPI backend
│   ├── __init__.py
│   ├── main.py                 # Главный файл сервера
│   ├── models.py               # Модели БД
│   ├── database.py             # Подключение к БД
│   ├── ai_generator.py         # AI генерация через Replicate
│   └── telegram_helper.py      # Telegram API хелперы
├── src/                        # React frontend
│   ├── components/             # React компоненты
│   │   ├── WelcomeScreen.tsx   # ✅ С вашим логотипом
│   │   ├── CategoryScreen.tsx  # Выбор категории
│   │   ├── StyleGrid.tsx       # ✅ Фото-карточки стилей
│   │   ├── MainScreen.tsx
│   │   ├── UploadScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── PricingScreen.tsx
│   ├── config/
│   │   └── styles.ts           # ✅ 18 стилей с photoUrl
│   ├── types.ts
│   ├── api.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css               # ✅ Стили для фото-карточек
│   └── styles.css
├── public/
│   └── logo.png                # ✅ Ваш логотип (650 KB)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
├── .env.example
├── .gitignore
├── requirements.txt            # Python зависимости
├── railway.json                # Конфиг для Railway
├── README.md                   # Основная документация
├── QUICKSTART.md               # Быстрый старт
├── DEPLOYMENT.md               # Инструкция по деплою
├── ADDING_STYLES.md            # ✅ Как добавлять новые стили
├── CHANGES_SUMMARY.md          # ✅ Отчёт об изменениях
└── INSTALLATION_GUIDE.md       # Этот файл
```

---

## ⚙️ **Требования:**

### Для разработки (локально):
- **Node.js** 18+ — [скачать](https://nodejs.org/)
- **Python** 3.11+ — [скачать](https://www.python.org/)
- **npm** или **yarn** — установится с Node.js
- **Git** (опционально) — [скачать](https://git-scm.com/)

### Для деплоя:
- Аккаунт **Railway.app** (бесплатный) — [регистрация](https://railway.app/)
- Или аккаунт **Vercel** (альтернатива) — [регистрация](https://vercel.com/)

### API токены:
- **Telegram Bot Token** — получить у [@BotFather](https://t.me/BotFather)
- **Replicate API Token** — получить на [replicate.com](https://replicate.com/)
- **KIE API Token** (альтернатива Replicate, дешевле) — получить на [kie.ai](https://kie.ai/)

---

## 🛠️ **Установка (локально):**

### Шаг 1: Распаковать архив

Распакуйте ZIP-архив в любую папку, например:
```
C:\Projects\dekor-info-ai-designer\
```
или
```
~/Projects/dekor-info-ai-designer/
```

### Шаг 2: Открыть папку в терминале

**Windows:**
```bash
cd C:\Projects\dekor-info-ai-designer
```

**Mac/Linux:**
```bash
cd ~/Projects/dekor-info-ai-designer
```

### Шаг 3: Установить зависимости

#### Frontend (React):
```bash
npm install
```

#### Backend (Python) — опционально для локального тестирования:
```bash
pip install -r requirements.txt
```

### Шаг 4: Создать файл .env

Скопируйте `.env.example` в `.env`:
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Откройте `.env` и заполните:
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=8581032888:AAE...  # Ваш токен от @BotFather
CHANNEL_USERNAME=@stroitelinfo        # Ваш канал

# AI (выберите один из двух)
REPLICATE_API_TOKEN=r8_...            # Replicate ($0.01-0.05/запрос)
# ИЛИ
KIE_API_TOKEN=kie_...                 # KIE.ai ($0.002/запрос, дешевле!)

# База данных (локально SQLite, на проде PostgreSQL)
DATABASE_URL=sqlite:///./app.db

# Остальное (можно оставить как есть)
SECRET_KEY=your-secret-key-here
WEBHOOK_URL=https://your-app.railway.app/api/webhook
NODE_ENV=development
```

---

## 🚀 **Запуск проекта:**

### Только Frontend (рекомендуется для начала):

```bash
npm run dev
```

Откройте браузер:
```
http://localhost:5173
```

**Что вы увидите:**
- ✅ Экран приветствия с вашим логотипом
- ✅ Выбор категории (🏠 Интерьеры / 🌳 Дом и дача)
- ✅ Сетка стилей с реальными фотографиями
- ⚠️ **Генерация не будет работать** (нужен backend)

---

### Frontend + Backend (полная версия):

**Терминал 1 (Backend):**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Терминал 2 (Frontend):**
```bash
npm run dev
```

Откройте браузер:
```
http://localhost:5173
```

Теперь **всё работает**, включая AI-генерацию!

---

## 🎨 **Проверка изменений:**

### 1. Экран приветствия (WelcomeScreen):
- ✅ Должен отображаться **ваш логотип** (круглый, бежевый с лампой/картиной)
- ❌ НЕ должно быть эмодзи 🏠

### 2. Главное меню (CategoryScreen):
- ✅ Должны быть эмодзи 🏠 "Интерьеры" и 🌳 "Дом и дача"
- ✅ Карточки с glassmorphism эффектом

### 3. Сетка стилей (StyleGrid):
- ✅ Должны быть **реальные фотографии** интерьеров
- ✅ Текст поверх фото с градиентом снизу
- ✅ Hover-эффект с подъёмом и свечением
- ❌ НЕ должно быть эмодзи 🏙️🌲🏭

**Если что-то не так — см. раздел "Решение проблем" ниже.**

---

## 🌐 **Деплой на Railway.app:**

### Шаг 1: Создать аккаунт

Зарегистрируйтесь на [railway.app](https://railway.app/) (можно через GitHub).

### Шаг 2: Создать новый проект

1. Нажмите **New Project**
2. Выберите **Deploy from GitHub repo**
3. Выберите свой репозиторий (предварительно загрузите проект на GitHub)

**ИЛИ**

1. Нажмите **New Project**
2. Выберите **Empty Project**
3. Загрузите файлы вручную

### Шаг 3: Добавить переменные окружения

В Railway dashboard → **Variables** → добавьте:
```
TELEGRAM_BOT_TOKEN=8581032888:AAE...
CHANNEL_USERNAME=@stroitelinfo
REPLICATE_API_TOKEN=r8_...
DATABASE_URL=postgresql://...  # Railway сгенерирует автоматически
SECRET_KEY=your-secret-key
WEBHOOK_URL=https://your-app.railway.app/api/webhook
NODE_ENV=production
```

### Шаг 4: Настроить webhook

После деплоя выполните:
```bash
curl -X POST "https://api.telegram.org/bot8581032888:AAE.../setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.railway.app/api/webhook"}'
```

Замените `your-app` на ваш домен Railway.

### Шаг 5: Настроить Menu Button в BotFather

Откройте [@BotFather](https://t.me/BotFather):
```
/mybots
→ Выберите вашего бота
→ Bot Settings
→ Menu Button
→ Edit Menu Button URL
→ Введите: https://your-app.railway.app
→ Text: Открыть AI Designer
```

**Готово!** Теперь бот доступен в Telegram.

---

## 🔧 **Решение проблем:**

### Проблема: Логотип не отображается
**Причина:** Файл `public/logo.png` отсутствует  
**Решение:** Убедитесь, что файл на месте (650 KB)

### Проблема: Фотографии стилей не загружаются
**Причина:** Нет интернета или Unsplash заблокирован  
**Решение:** Проверьте интернет-соединение. Фото загружаются с `images.unsplash.com`

### Проблема: Карточки стилей показывают эмодзи вместо фото
**Причина:** Не применились изменения в `StyleGrid.tsx` или `styles.ts`  
**Решение:**
1. Проверьте, что `src/config/styles.ts` содержит поле `photoUrl`
2. Проверьте, что `StyleGrid.tsx` использует класс `.style-card-photo`
3. Перезапустите `npm run dev`

### Проблема: `npm install` выдаёт ошибку
**Причина:** Устаревшая версия Node.js  
**Решение:** Обновите Node.js до версии 18+ с [nodejs.org](https://nodejs.org/)

### Проблема: Backend не запускается
**Причина:** Не установлены Python-зависимости  
**Решение:**
```bash
pip install -r requirements.txt
```

### Проблема: Ошибка при генерации AI
**Причина:** Неверный токен Replicate/KIE  
**Решение:** Проверьте токен в `.env` файле

---

## 📚 **Дополнительная документация:**

После установки обязательно прочитайте:

1. **README.md** — основная информация о проекте
2. **QUICKSTART.md** — быстрый старт для разработчиков
3. **DEPLOYMENT.md** — подробная инструкция по деплою
4. **ADDING_STYLES.md** — как добавлять новые стили дизайна
5. **CHANGES_SUMMARY.md** — что изменилось в версии 1.1

---

## ✅ **Чек-лист перед запуском:**

- [ ] Node.js 18+ установлен
- [ ] Python 3.11+ установлен (если нужен backend)
- [ ] `npm install` выполнен без ошибок
- [ ] Файл `.env` создан и заполнен
- [ ] `npm run dev` запускается успешно
- [ ] Браузер открывается на `localhost:5173`
- [ ] Логотип отображается на экране приветствия
- [ ] Фото-карточки стилей показываются
- [ ] Главное меню имеет эмодзи 🏠 и 🌳

---

## 🎉 **Готово!**

Проект полностью настроен и готов к использованию!

**Следующие шаги:**
1. Локальное тестирование (`npm run dev`)
2. Деплой на Railway.app
3. Настройка webhook
4. Тестирование в Telegram
5. Запуск рекламной кампании

---

## 🆘 **Нужна помощь?**

- **Telegram:** @stroitelinfo
- **Документация:** см. README.md
- **GitHub Issues:** (если используете GitHub)

---

**Удачи с проектом! 🚀**
