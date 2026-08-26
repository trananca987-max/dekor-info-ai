# 🚀 Быстрый старт (10 минут)

## Шаг 1: Получите токены (3 минуты)

### 1.1 Telegram Bot Token

1. Откройте @BotFather в Telegram
2. Отправьте `/newbot`
3. Введите имя: `Декор Инфо AI`
4. Введите username: `dekorinfo_designer_bot` (или любой свободный)
5. Скопируйте токен (формат: `1234567890:ABCdef...`)

### 1.2 Replicate API Token

1. Откройте https://replicate.com/
2. Войдите через GitHub
3. Перейдите в Settings → API Tokens
4. Создайте новый токен
5. Скопируйте (формат: `r8_...`)

У вас уже есть эти токены:
- Bot Token: `YOUR_TELEGRAM_BOT_TOKEN`
- Replicate Token: `r8_YOUR_REPLICATE_TOKEN`

## Шаг 2: Установите зависимости (2 минуты)

### macOS (ваша система):

```bash
# Перейдите в папку проекта
cd ~/path/to/dekor-info-ai-designer

# Установите Python зависимости
pip3 install -r requirements.txt

# Установите Node.js зависимости
npm install
```

## Шаг 3: Настройте .env (1 минута)

```bash
# Скопируйте пример
cp .env.example .env

# Откройте в редакторе
nano .env
```

Содержимое `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
CHANNEL_USERNAME=@stroitelinfo
REPLICATE_API_TOKEN=r8_YOUR_REPLICATE_TOKEN
DATABASE_URL=sqlite:///./dekorinfo.db
VITE_API_URL=http://localhost:8000
SECRET_KEY=my-secret-key-change-in-production
NODE_ENV=development
```

Сохраните: `Ctrl + X` → `Y` → `Enter`

## Шаг 4: Запустите проект (2 минуты)

### Терминал 1 - Backend:

```bash
cd backend
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Вы увидите:
```
🚀 Декор Инфо AI Designer API started!
📢 Channel: @stroitelinfo
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Терминал 2 - Frontend:

Откройте **новый терминал**:

```bash
npm run dev
```

Вы увидите:
```
  VITE v6.0.3  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

## Шаг 5: Настройте Menu Button (2 минуты)

1. Откройте @BotFather в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота (`dekorinfo_designer_bot`)
4. Нажмите `Bot Settings`
5. Нажмите `Menu Button`
6. Нажмите `Configure Menu Button`
7. Введите URL: `http://localhost:5173`
8. Введите текст: `Открыть AI Designer`
9. Нажмите `Send`

## ✅ Готово! Тестируйте бота

1. Откройте вашего бота в Telegram
2. Нажмите `/start`
3. Вы увидите кнопку внизу "Открыть AI Designer"
4. Нажмите на неё
5. Откроется Mini App!

## 🧪 Первая генерация

1. Подпишитесь на @stroitelinfo (или пропустите для теста)
2. Нажмите "🎨 Преобразить пространство"
3. Загрузите фото любого помещения
4. Выберите "🏠 Интерьеры"
5. Выберите "🏙️ Современный" (бесплатный)
6. Дождитесь генерации (20-40 секунд)
7. Наслаждайтесь результатом! ✨

## 🎉 Поздравляю!

Ваш AI Designer работает локально!

## 🚀 Следующие шаги

1. **Протестируйте все стили** (2 бесплатных доступны)
2. **Прочитайте [DEPLOYMENT.md](./DEPLOYMENT.md)** для деплоя на Railway
3. **Изучите [MONETIZATION.md](./MONETIZATION.md)** для маркетинга

## ⚠️ Частые проблемы

### Ошибка "ModuleNotFoundError: No module named 'X'"

```bash
pip3 install -r requirements.txt
```

### Ошибка "ENOENT: no such file or directory"

```bash
npm install
```

### Backend не запускается

Убедитесь, что:
1. Python 3.11+ установлен: `python3 --version`
2. Все зависимости установлены: `pip3 list`
3. `.env` файл существует и заполнен

### Frontend не запускается

Убедитесь, что:
1. Node.js 18+ установлен: `node --version`
2. Все зависимости установлены: `npm list`

### Telegram бот не открывает Mini App

1. Проверьте, что frontend запущен на http://localhost:5173
2. Проверьте, что Menu Button настроен правильно в @BotFather
3. Попробуйте перезапустить бота: `/start`

## 💡 Советы

- **Используйте 2 терминала** - один для backend, один для frontend
- **Не закрывайте терминалы** пока тестируете
- **Проверяйте логи** в терминалах при ошибках
- **Сначала протестируйте локально**, затем деплойте

## 📞 Нужна помощь?

Спрашивайте в @stroitelinfo!
