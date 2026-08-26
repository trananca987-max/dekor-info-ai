# 🚢 Деплой на Railway.app

## Почему Railway?

- ✅ **Бесплатно** ($5 кредитов/месяц)
- ✅ **Без кредитной карты** для старта
- ✅ **Автоматический деплой** из GitHub
- ✅ **HTTPS из коробки**
- ✅ **PostgreSQL** встроена
- ✅ **Простая настройка**

## Шаг 1: Подготовка (5 минут)

### 1.1 Создайте GitHub репозиторий

```bash
# В папке проекта
git init
git add .
git commit -m "Initial commit: Декор Инфо AI Designer"
git branch -M main
git remote add origin https://github.com/yourusername/dekor-info-ai-designer.git
git push -u origin main
```

### 1.2 Зарегистрируйтесь на Railway

1. Откройте https://railway.app
2. Нажмите "Login"
3. Войдите через GitHub
4. Разрешите доступ к репозиториям

## Шаг 2: Создайте проект (3 минуты)

### 2.1 Новый проект

1. Нажмите "New Project"
2. Выберите "Deploy from GitHub repo"
3. Выберите репозиторий `dekor-info-ai-designer`
4. Railway автоматически определит Python проект

### 2.2 Настройте переменные окружения

В Railway Dashboard перейдите в `Variables` и добавьте:

```
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
CHANNEL_USERNAME=@stroitelinfo
REPLICATE_API_TOKEN=r8_YOUR_REPLICATE_TOKEN
SECRET_KEY=your-random-secret-key-here
NODE_ENV=production
```

### 2.3 (Опционально) Добавьте PostgreSQL

1. Нажмите "New" → "Database" → "Add PostgreSQL"
2. Railway автоматически создаст `DATABASE_URL`
3. Ваше приложение будет использовать его вместо SQLite

## Шаг 3: Деплой (2 минуты)

Railway автоматически:
1. Клонирует репозиторий
2. Установит зависимости
3. Соберёт проект
4. Запустит приложение

Дождитесь статуса `Deployed` (займёт 3-5 минут).

## Шаг 4: Получите public URL (1 минута)

1. В Railway Dashboard откройте ваш проект
2. Перейдите в `Settings`
3. Найдите `Public Networking`
4. Нажмите `Generate Domain`
5. Скопируйте URL (например: `https://dekor-info-ai-designer.up.railway.app`)

## Шаг 5: Настройте Webhook (2 минуты)

### 5.1 Обновите webhook URL

```bash
curl -X POST "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.up.railway.app/api/telegram-webhook",
    "allowed_updates": ["message", "pre_checkout_query"]
  }'
```

Замените `your-app.up.railway.app` на ваш реальный домен.

Вы должны получить:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 5.2 Проверьте webhook

```bash
curl "https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

## Шаг 6: Обновите Menu Button (1 минута)

1. Откройте @BotFather
2. `/mybots` → ваш бот → `Bot Settings` → `Menu Button`
3. `Configure Menu Button`
4. URL: `https://your-app.up.railway.app`
5. Text: `Открыть AI Designer`

## ✅ Готово! Тестируйте production

1. Откройте бота в Telegram
2. Нажмите `/start`
3. Нажмите "Открыть AI Designer"
4. Mini App откроется с production backend!

## 📊 Мониторинг

### Railway Dashboard

- **Logs**: смотрите логи приложения в реальном времени
- **Metrics**: CPU, RAM, Network usage
- **Deploy History**: история всех деплоев

### Проверка здоровья API

```bash
curl https://your-app.up.railway.app/health
```

Ответ:
```json
{
  "status": "healthy"
}
```

## 🔄 Автоматический деплой

Railway автоматически деплоит при каждом push в main:

```bash
# Внесите изменения
git add .
git commit -m "Update feature"
git push origin main

# Railway автоматически:
# 1. Обнаружит push
# 2. Соберёт проект
# 3. Задеплоит обновление
```

## 💰 Стоимость

### Free Tier ($5/месяц)

- ✅ **500 часов выполнения** (≈20 дней непрерывной работы)
- ✅ **100 GB** egress трафика
- ✅ **PostgreSQL** database
- ✅ Достаточно для **сотен пользователей**

### Starter ($5/месяц)

- ✅ Всё из Free +
- ✅ Больше ресурсов
- ✅ Приоритетная поддержка

### Прогноз для вас:

- **100 пользователей**: Free tier достаточно
- **1000 пользователей**: $5-10/месяц
- **10000 пользователей**: $20-50/месяц

## 🐛 Отладка проблем

### Проблема: "Application failed to respond"

**Решение:**
1. Проверьте логи в Railway Dashboard
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что `railway.json` корректен

### Проблема: "Database connection failed"

**Решение:**
1. Добавьте PostgreSQL database в Railway
2. Убедитесь, что `DATABASE_URL` автоматически установлен
3. Перезапустите deployment

### Проблема: "Webhook not working"

**Решение:**
1. Проверьте webhook: `getWebhookInfo`
2. Убедитесь, что URL правильный
3. Проверьте логи в Railway при получении платежа

## 🔐 Безопасность

### Обязательно:

1. **Не коммитьте .env** в GitHub (уже в .gitignore)
2. **Используйте сильный SECRET_KEY** (генератор: https://djecrety.ir/)
3. **Ограничьте CORS** в production (замените `*` на ваш домен)

### Рекомендуется:

1. Включите **SSL/TLS** (Railway предоставляет автоматически)
2. Настройте **Rate Limiting**
3. Мониторьте **подозрительную активность**

## 📈 Масштабирование

### Горизонтальное

Railway автоматически масштабирует при высокой нагрузке.

### Вертикальное

1. Railway Dashboard → Settings
2. Увеличьте ресурсы (CPU/RAM)
3. Оплата пропорциональна использованию

## 🎉 Готово!

Ваш Telegram Mini App работает в production на Railway!

## Следующие шаги

1. **Прочитайте [MONETIZATION.md](./MONETIZATION.md)** для маркетинга
2. **Анонсируйте** в @stroitelinfo
3. **Собирайте обратную связь** от пользователей
4. **Мониторьте** метрики и логи

## 💬 Поддержка

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Ваш канал: @stroitelinfo
