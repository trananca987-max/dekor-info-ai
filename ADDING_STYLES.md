# 📖 Как добавить новые стили в Декор Инфо AI

## 🎨 Быстрый старт

Все стили находятся в одном файле: **`src/config/styles.ts`**

### 1️⃣ Откройте файл

```bash
src/config/styles.ts
```

### 2️⃣ Добавьте новый объект в массив `STYLES`

```typescript
export const STYLES: Style[] = [
  // ... существующие 18 стилей
  
  // 🆕 ВАШИ НОВЫЕ СТИЛИ
  {
    id: 'industrial',              // Уникальный ID (латиницей, без пробелов)
    name: 'Индустриальный',        // Название на русском
    emoji: '🏭',                   // Иконка-эмодзи
    category: 'interior',          // 'interior' или 'outdoor'
    tier: 'pro',                   // 'free', 'pro' или 'premium'
    photoUrl: 'https://images.unsplash.com/photo-1234567890',  // Фото для карточки
    prompt: 'industrial modern interior with exposed concrete...',  // Промпт для AI (на английском)
    description: 'Индустриальный стиль с бетоном и металлом',  // Описание на русском
  },
];
```

---

## 📋 Поля объекта Style

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `id` | `string` | ✅ | Уникальный идентификатор (латиница, без пробелов) |
| `name` | `string` | ✅ | Название стиля на русском |
| `emoji` | `string` | ✅ | Эмодзи-иконка (один символ) |
| `category` | `'interior' \| 'outdoor'` | ✅ | Категория: интерьер или дом/дача |
| `tier` | `'free' \| 'pro' \| 'premium'` | ✅ | Доступность тарифа |
| `photoUrl` | `string` | ✅ | Ссылка на фото для карточки (800px ширина) |
| `prompt` | `string` | ✅ | Промпт для AI (на английском) |
| `description` | `string` | ✅ | Краткое описание (на русском) |

---

## 🖼️ Где взять photoUrl?

### Рекомендуемые источники:

1. **Unsplash** (бесплатные HD фото):
   ```
   https://unsplash.com/
   Формат: https://images.unsplash.com/photo-1234567890?w=800
   ```

2. **Pexels** (бесплатные стоковые фото):
   ```
   https://www.pexels.com/
   ```

3. **Pixabay** (бесплатные изображения):
   ```
   https://pixabay.com/
   ```

4. **Собственные фото** (загрузите на CDN):
   - ImgBB: https://imgbb.com/
   - Cloudinary: https://cloudinary.com/

### ⚠️ Требования к фото:

- ✅ Разрешение: минимум **800px по ширине**
- ✅ Формат: JPG или PNG
- ✅ Соотношение сторон: **4:3 или 16:9**
- ✅ Качество: высокое (без размытия)
- ✅ Содержание: соответствует стилю
- ❌ Без водяных знаков

---

## 🎯 Как писать prompt для AI

Промпты пишутся **на английском языке** для модели kie.ai.

### Структура хорошего промпта:

```
[стиль] interior/outdoor design, [ключевые элементы], [цветовая гамма], 
[материалы], [освещение], [атмосфера]
```

### ✅ Примеры хороших промптов:

**Интерьер — Лофт:**
```
industrial loft interior, exposed brick walls, metal pipes, concrete floor, 
vintage furniture, edison bulbs, urban style, raw materials
```

**Интерьер — Хай-тек:**
```
high-tech futuristic interior, smart home technology, LED lighting, 
glass surfaces, chrome details, modern minimalism, digital aesthetic
```

**Экстерьер — Бассейн:**
```
swimming pool with deck, sun loungers, pool tiles, surrounding landscape, 
umbrellas, summer relaxation area, resort style
```

### 📝 Советы по промптам:

- ✅ Используйте конкретные детали (`exposed brick`, `LED lighting`)
- ✅ Указывайте материалы (`wood`, `concrete`, `glass`)
- ✅ Добавляйте атмосферу (`cozy`, `elegant`, `modern`)
- ❌ Избегайте абстрактных слов (`beautiful`, `nice`)
- ❌ Не используйте отрицания (`no clutter`, `without`)

---

## 🚀 Примеры добавления стилей

### Пример 1: Интерьер — Эко-стиль

```typescript
{
  id: 'eco',
  name: 'Эко-стиль',
  emoji: '🌿',
  category: 'interior',
  tier: 'pro',
  photoUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800',
  prompt: 'eco-friendly interior design, natural materials, indoor plants, bamboo furniture, earthy colors, sustainable living, organic textures, green atmosphere',
  description: 'Экологичный стиль с натуральными материалами',
},
```

### Пример 2: Интерьер — Бохо

```typescript
{
  id: 'boho',
  name: 'Бохо',
  emoji: '🎨',
  category: 'interior',
  tier: 'premium',
  photoUrl: 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800',
  prompt: 'bohemian interior style, colorful textiles, macrame wall hangings, vintage rugs, mix of patterns, eclectic furniture, artistic atmosphere, cozy and relaxed',
  description: 'Богемный стиль с яркими текстилями',
},
```

### Пример 3: Экстерьер — Альпийская горка

```typescript
{
  id: 'rock_garden',
  name: 'Альпийская горка',
  emoji: '⛰️',
  category: 'outdoor',
  tier: 'pro',
  photoUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800',
  prompt: 'alpine rock garden, stone arrangement, alpine plants, natural rocks, tiered design, mountain flowers, decorative gravel, landscaping feature',
  description: 'Альпийская горка с камнями и горными растениями',
},
```

### Пример 4: Экстерьер — Фонтан

```typescript
{
  id: 'fountain',
  name: 'Фонтан',
  emoji: '⛲',
  category: 'outdoor',
  tier: 'premium',
  photoUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
  prompt: 'decorative garden fountain, water feature, stone basin, surrounding plants, tranquil atmosphere, outdoor centerpiece, flowing water, elegant design',
  description: 'Декоративный садовый фонтан',
},
```

---

## 📊 Управление тарифами

### Распределение стилей по тарифам:

```typescript
// Бесплатно (FREE) — 2 стиля
tier: 'free'     // Доступно всем, 2 генерации/день

// PRO — 99 Stars — $2
tier: 'pro'      // Безлимит, турборежим

// PREMIUM — 299 Stars — $6
tier: 'premium'  // PRO + референс, коммерция, Ultra HD
```

### 💡 Рекомендации:

- **FREE**: 2 самых популярных стиля (Современный, Скандинавский)
- **PRO**: 80% новых стилей
- **PREMIUM**: уникальные/сложные стили (требуют референсов)

---

## ✅ Чек-лист перед добавлением

- [ ] ID уникален и на латинице
- [ ] Название на русском, эмодзи подобрана
- [ ] Категория `interior` или `outdoor` указана верно
- [ ] Тариф `free`/`pro`/`premium` выбран
- [ ] Фото `photoUrl` — качественное, 800px+
- [ ] Промпт на английском, детальный
- [ ] Описание на русском, понятное
- [ ] Нет дубликатов ID/названий
- [ ] Код прошёл проверку синтаксиса

---

## 🔥 После добавления

### Автоматически обновятся:

✅ Сетка стилей на главном экране  
✅ Фильтрация по категориям (🏠 Интерьеры / 🌳 Дом и дача)  
✅ Ограничения по тарифам (FREE/PRO/PREMIUM)  
✅ Счётчик стилей в UI  
✅ Промпты для AI-генерации  

### Не нужно править:

❌ Компоненты React  
❌ API endpoints  
❌ База данных  
❌ Конфигурацию проекта  

---

## 📞 Поддержка

**Вопросы?** Пишите в Telegram: @stroitelinfo

**Нашли баг?** Создайте issue в репозитории

---

## 🎉 Готово!

Теперь вы можете легко добавлять **неограниченное количество стилей** без изменения кода!

Просто отредактируйте `src/config/styles.ts` и деплойте обновлённую версию.
