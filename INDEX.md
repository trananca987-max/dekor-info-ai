# 📑 Навигация по проекту

## 🚀 Начните отсюда!

Добро пожаловать в **Декор Инфо AI Designer** - Telegram Mini App для AI-дизайна интерьеров и дачных участков!

---

## 📖 Основная документация

### 1️⃣ [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) ⭐ НАЧНИТЕ ЗДЕСЬ
**Полный обзор проекта:**
- Что создано (статистика, файлы, строки кода)
- 18 стилей дизайна (с таблицами)
- Монетизация (прогнозы дохода)
- Checklist запуска
- План на первые месяцы

**Время чтения:** 10 минут  
**Когда читать:** Самым первым!

---

### 2️⃣ [README.md](./README.md)
**Техническая документация:**
- Описание технологий
- Структура проекта
- Установка и настройка
- API endpoints
- База данных
- Разработка

**Время чтения:** 15 минут  
**Когда читать:** После обзора, перед запуском

---

### 3️⃣ [QUICKSTART.md](./QUICKSTART.md) ⚡
**Запуск за 10 минут:**
- Шаг 1: Получить токены (3 мин)
- Шаг 2: Установить зависимости (2 мин)
- Шаг 3: Настроить .env (1 мин)
- Шаг 4: Запустить проект (2 мин)
- Шаг 5: Настроить Menu Button (2 мин)
- Первая генерация

**Время выполнения:** 10 минут  
**Когда следовать:** Для локального запуска

---

### 4️⃣ [DEPLOYMENT.md](./DEPLOYMENT.md) 🚢
**Деплой на Railway.app:**
- Подготовка GitHub репозитория
- Создание проекта на Railway
- Настройка переменных окружения
- Webhook конфигурация
- Мониторинг и отладка
- Стоимость хостинга

**Время выполнения:** 15 минут  
**Когда следовать:** Для production деплоя

---

### 5️⃣ [MONETIZATION.md](./MONETIZATION.md) 💰
**Маркетинг и монетизация:**
- Стратегия контента (как у Дениса Марченко)
- Форматы видео (примеры сценариев)
- Каналы продвижения (YouTube, Instagram, TikTok, VK)
- Тактики роста (массовая публикация, A/B тесты)
- Прогнозы дохода (100, 1K, 10K пользователей)
- Дополнительные источники дохода
- План запуска

**Время чтения:** 20 минут  
**Когда читать:** Перед маркетингом

---

## 📂 Структура файлов

### 🖥️ Frontend (src/)
```
src/
├── components/
│   ├── WelcomeScreen.tsx        Экран приветствия + подписка
│   ├── MainScreen.tsx           Главное меню + статистика
│   ├── UploadScreen.tsx         Загрузка фото + генерация AI
│   ├── HistoryScreen.tsx        История генераций
│   └── PricingScreen.tsx        Тарифы + Telegram Stars оплата
├── types.ts                     TypeScript типы
├── config.ts                    18 стилей + 3 тарифа
├── api.ts                       HTTP клиент (Axios)
├── styles.css                   Глобальные стили
├── App.tsx                      Главный компонент
└── main.tsx                     Entry point
```

### ⚙️ Backend (backend/)
```
backend/
├── models.py                    SQLAlchemy модели (User, Generation, Payment)
├── database.py                  База данных (SQLite/PostgreSQL)
├── ai_generator.py              Replicate API интеграция
├── telegram_helper.py           Telegram Bot API helper
└── main.py                      FastAPI сервер (16 endpoints)
```

### 🔧 Конфигурация
```
package.json                     Node.js зависимости
requirements.txt                 Python зависимости
.env.example                     Пример переменных окружения
railway.json                     Railway деплой конфиг
.gitignore                       Git ignore
vite.config.ts                   Vite конфигурация
tsconfig.json                    TypeScript конфигурация
index.html                       HTML entry point
```

### 🛠️ Утилиты
```
setup_webhook.py                 Скрипт настройки webhook
test_api.py                      Скрипт тестирования API
```

---

## 🎯 Быстрые ссылки

### Локальная разработка
1. [Установка зависимостей](./QUICKSTART.md#шаг-2-установите-зависимости-2-минуты)
2. [Настройка .env](./QUICKSTART.md#шаг-3-настройте-env-1-минута)
3. [Запуск backend](./QUICKSTART.md#терминал-1---backend)
4. [Запуск frontend](./QUICKSTART.md#терминал-2---frontend)
5. [Настройка Menu Button](./QUICKSTART.md#шаг-5-настройте-menu-button-2-минуты)

### Production деплой
1. [Создание GitHub репозитория](./DEPLOYMENT.md#11-создайте-github-репозиторий)
2. [Деплой на Railway](./DEPLOYMENT.md#шаг-2-создайте-проект-3-минуты)
3. [Настройка Webhook](./DEPLOYMENT.md#шаг-5-настройте-webhook-2-минуты)
4. [Обновление Menu Button](./DEPLOYMENT.md#шаг-6-обновите-menu-button-1-минута)

### Маркетинг
1. [Форматы видео](./MONETIZATION.md#формат-видео)
2. [Каналы продвижения](./MONETIZATION.md#📢-каналы-продвижения)
3. [План запуска](./MONETIZATION.md#🚀-план-запуска)
4. [Прогнозы дохода](./MONETIZATION.md#📊-прогноз-дохода)

---

## 🎨 Стили дизайна

### 🏠 Интерьеры (8 стилей)
| Стиль | Emoji | Тариф |
|-------|-------|-------|
| Современный | 🏙️ | FREE |
| Скандинавский | 🌲 | FREE |
| Лофт | 🏭 | PRO |
| Минимализм | ⚪ | PRO |
| Классика | 👑 | PRO |
| Хай-тек | 🤖 | PRO |
| Прованс | 🌸 | PRO |
| Японский | 🎌 | PRO |

### 🌳 Дом и дача (10 стилей)
| Стиль | Emoji | Тариф |
|-------|-------|-------|
| Детская площадка | 🎪 | PRO |
| Гриль-зона | 🔥 | PRO |
| Бассейн | 🏊 | PRO |
| Терраса | 🌅 | PRO |
| Беседка | 🏡 | PRO |
| Теплица | 🌱 | PRO |
| Огород | 🥕 | PRO |
| Ландшафт | 🌳 | PRO |
| Патио | ☕ | PRO |
| Пергола | 🌿 | PRO |

---

## 💰 Тарифы

| Тариф | Цена | Срок | Описание |
|-------|------|------|----------|
| 🆓 FREE | $0 | ∞ | 2 генерации/день, 2 стиля |
| ⭐ PRO | 99★ (~$2) | 30 дней | Безлимит, 18 стилей, турбо |
| 💎 PREMIUM | 299★ (~$6) | 90 дней | PRO + референс, коммерция, Ultra HD |

---

## 🔧 API Endpoints

### Пользователи
- `POST /api/check-subscription` - Проверка подписки
- `GET /api/users/{user_id}` - Получить пользователя
- `POST /api/users` - Создать пользователя

### Генерация
- `POST /api/upload` - Загрузить фото
- `POST /api/generate` - Запустить AI генерацию
- `GET /api/generate/{task_id}` - Статус генерации
- `GET /api/users/{user_id}/generations` - История

### Платежи
- `POST /api/buy-pro` - Счёт на PRO
- `POST /api/buy-premium` - Счёт на PREMIUM
- `POST /api/telegram-webhook` - Webhook для платежей

---

## 📊 База данных

### Таблицы
- **users** - Пользователи (telegram_id, tier, подписка)
- **generations** - Генерации (стиль, результат, статус)
- **payments** - Платежи (Stars, продукт, дата)

---

## ✅ Checklist запуска

### Локальная разработка
- [ ] Python 3.11+ установлен
- [ ] Node.js 18+ установлен
- [ ] Получены токены (Telegram Bot + Replicate)
- [ ] .env файл настроен
- [ ] Backend запущен (http://localhost:8000)
- [ ] Frontend запущен (http://localhost:5173)
- [ ] Menu Button настроен в @BotFather
- [ ] Бот открывается в Telegram
- [ ] Первая генерация успешна

### Production деплой
- [ ] Код загружен на GitHub
- [ ] Проект создан на Railway
- [ ] Переменные окружения установлены
- [ ] Деплой завершён успешно
- [ ] Public URL получен
- [ ] Webhook настроен
- [ ] Menu Button обновлён на production URL
- [ ] Платежи работают (тест с 1 Star)

### Маркетинг
- [ ] 20-30 видео сняты
- [ ] Аккаунты созданы (YouTube, Instagram, TikTok, VK)
- [ ] Анонс опубликован в @stroitelinfo
- [ ] Ежедневные публикации запущены (3-5 видео/день)
- [ ] Метрики отслеживаются

---

## 🎉 Готово к запуску!

Ваш Telegram Mini App готов покорить мир AI-дизайна! 🚀

### Следующие шаги:
1. 📖 Прочитайте [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
2. ⚡ Следуйте [QUICKSTART.md](./QUICKSTART.md)
3. 🚢 Деплойте через [DEPLOYMENT.md](./DEPLOYMENT.md)
4. 💰 Монетизируйте с [MONETIZATION.md](./MONETIZATION.md)

---

**Создано с ❤️ для @stroitelinfo**

**Версия:** 1.0.0  
**Статус:** ✅ Production Ready  
**Дата:** Февраль 2026
