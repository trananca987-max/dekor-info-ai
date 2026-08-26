// Конфигурация приложения: стили, тарифы, режимы
// Юнит-экономика: серия 6d (Obsidian DekorInfo-AI-Designer)

export type TierId = 'pro' | 'premium' | 'premium_pro'

export interface Style {
  id: string;
  name: string;
  emoji: string;
  category: 'interior' | 'outdoor';
  tier: TierId;
  photoUrl: string; // фото для карточки
  prompt: string;
  description: string;
}

export const STYLES: Style[] = [
  // 🏠 ИНТЕРЬЕРЫ (8 стилей)
  {
    id: 'modern', name: 'Современный', emoji: '🏙️',
    category: 'interior', tier: 'pro',
    photoUrl: '/styles/modern.jpg',
    prompt: 'modern minimalist interior design, clean lines, neutral colors, contemporary furniture, bright natural lighting, white walls, wooden floor',
    description: 'Минималистичный современный стиль с чистыми линиями',
  },
  {
    id: 'scandinavian', name: 'Скандинавский', emoji: '🌲',
    category: 'interior', tier: 'pro',
    photoUrl: '/styles/scandinavian.jpg',
    prompt: 'scandinavian interior design, cozy hygge style, natural materials, light wood furniture, white and pastel colors, soft textiles',
    description: 'Уютный скандинавский стиль с натуральными материалами',
  },
  {
    id: 'loft', name: 'Лофт', emoji: '🏭',
    category: 'interior', tier: 'premium',
    photoUrl: '/styles/loft.jpg',
    prompt: 'loft style interior design, brick accent wall, leather sofa, metal light fixtures, wooden floor',
    description: 'Индустриальный лофт с кирпичной стеной',
  },
  {
    id: 'minimalism', name: 'Минимализм', emoji: '⚪',
    category: 'interior', tier: 'premium',
    photoUrl: '/styles/minimalism.jpg',
    prompt: 'pure minimalism interior design, white walls, hidden storage, clean surfaces, zen atmosphere',
    description: 'Чистый минимализм с белыми стенами',
  },
  {
    id: 'classic', name: 'Классика', emoji: '👑',
    category: 'interior', tier: 'premium',
    photoUrl: '/styles/classic.jpg',
    prompt: 'classic elegant interior design, ornate moldings, chandelier, antique furniture, rich fabrics, marble details',
    description: 'Элегантная классика с лепниной',
  },
  {
    id: 'hightech', name: 'Хай-тек', emoji: '🤖',
    category: 'interior', tier: 'premium',
    photoUrl: '/styles/hightech.jpg',
    prompt: 'high-tech futuristic interior design, smart home technology, LED lighting, glass surfaces, chrome details',
    description: 'Футуристичный хай-тек с умными технологиями',
  },
  {
    id: 'provence', name: 'Прованс', emoji: '🌸',
    category: 'interior', tier: 'premium',
    photoUrl: '/styles/provence.jpg',
    prompt: 'french provence interior design, lavender colors, vintage furniture, floral patterns, romantic atmosphere',
    description: 'Французский прованс с цветочными узорами',
  },
  {
    id: 'japanese', name: 'Японский', emoji: '🎌',
    category: 'interior', tier: 'premium',
    photoUrl: '/styles/japanese.jpg',
    prompt: 'japanese zen interior design, tatami mats, shoji screens, low furniture, natural materials, harmony',
    description: 'Японский дзен-минимализм с татами',
  },

  // 🌳 ДОМ И ДАЧА (10 стилей)
  {
    id: 'playground', name: 'Детская площадка', emoji: '🎪',
    category: 'outdoor', tier: 'premium',
    photoUrl: '/styles/playground.jpg',
    prompt: 'colorful kids playground design, swing set, slides, safe soft ground, family friendly outdoor area',
    description: 'Яркая детская площадка с качелями и горками',
  },
  {
    id: 'bbq', name: 'Гриль-зона', emoji: '🔥',
    category: 'outdoor', tier: 'premium',
    photoUrl: '/styles/bbq.jpg',
    prompt: 'outdoor BBQ area design, stone grill, dining table with benches, pergola, evening lighting',
    description: 'Зона барбекю с каменным грилем и столом',
  },
  {
    id: 'pool', name: 'Бассейн', emoji: '🏊',
    category: 'outdoor', tier: 'premium_pro',
    photoUrl: '/styles/pool.jpg',
    prompt: 'swimming pool with deck design, sun loungers, pool tiles, umbrellas, summer relaxation area',
    description: 'Бассейн с зоной отдыха и шезлонгами',
  },
  {
    id: 'terrace', name: 'Терраса', emoji: '🏡',
    category: 'outdoor', tier: 'premium',
    photoUrl: '/styles/terrace.jpg',
    prompt: 'wooden terrace deck design, outdoor furniture, potted plants, string lights, cozy outdoor living',
    description: 'Деревянная терраса с зоной отдыха',
  },
  {
    id: 'gazebo', name: 'Беседка', emoji: '⛩️',
    category: 'outdoor', tier: 'premium',
    photoUrl: '/styles/gazebo.jpg',
    prompt: 'garden gazebo design, climbing plants, wooden structure, comfortable seating, peaceful retreat',
    description: 'Садовая беседка с вьющимися растениями',
  },
  {
    id: 'greenhouse', name: 'Теплица', emoji: '🪴',
    category: 'outdoor', tier: 'premium',
    photoUrl: '/styles/greenhouse.jpg',
    prompt: 'modern greenhouse design, organized plant shelves, glass structure, growing vegetables',
    description: 'Современная теплица с полками растений',
  },
  {
    id: 'vegetable_garden', name: 'Огород', emoji: '🥕',
    category: 'outdoor', tier: 'premium',
    photoUrl: '/styles/vegetable_garden.jpg',
    prompt: 'organized vegetable garden design, raised beds, neat rows of plants, garden paths',
    description: 'Организованный огород с высокими грядками',
  },
  {
    id: 'landscape', name: 'Ландшафт', emoji: '🌳',
    category: 'outdoor', tier: 'premium',
    photoUrl: '/styles/landscape.jpg',
    prompt: 'landscape design, curved paths, variety of plants, decorative trees, garden lighting',
    description: 'Ландшафтный дизайн участка со светом',
  },
  {
    id: 'patio', name: 'Патио', emoji: '☕',
    category: 'outdoor', tier: 'premium',
    photoUrl: '/styles/patio.jpg',
    prompt: 'cozy patio design, stone paving, outdoor furniture, plants in pots, morning coffee spot',
    description: 'Уютное патио с утренним кофе',
  },
  {
    id: 'pergola', name: 'Пергола', emoji: '🌿',
    category: 'outdoor', tier: 'premium_pro',
    photoUrl: '/styles/pergola.jpg',
    prompt: 'elegant pergola design, climbing vines, shaded seating area, wooden beams, outdoor dining',
    description: 'Элегантная пергола с зоной обеда',
  },
];

export interface TierInfo {
  id: TierId;
  name: string;
  price: number;
  duration: number;
  engine: string;
  features: string[];
}

export const TIERS: Record<TierId, TierInfo> = {
  pro: {
    id: 'pro', name: '⭐ PRO', price: 149, duration: 30,
    engine: 'gemini low',
    features: ['10 генераций в день', 'Все базовые стили интерьеров', 'Режим «Пустая комната»', 'История генераций', 'Без водяных знаков'],
  },
  premium: {
    id: 'premium', name: '💎 PREMIUM', price: 299, duration: 30,
    engine: 'gemini medium',
    features: ['10 генераций в день', 'Детальная проработка стиля', 'Дом и дача: все стили', 'Приоритет в очереди', 'Всё из PRO'],
  },
  premium_pro: {
    id: 'premium_pro', name: '🏆 PREMIUM PRO', price: 649, duration: 30,
    engine: 'gpt-image-2',
    features: ['10 генераций в день', 'Максимальное качество GPT Image', 'Премиум-стили (бассейн, пергола)', 'Приоритет в очереди', 'Всё из PREMIUM'],
  },
};

export const TIER_ORDER: TierId[] = ['pro', 'premium', 'premium_pro'];

// Режимы генерации
export interface GenModeInfo {
  id: 'style' | 'empty' | 'furnish';
  name: string;
  emoji: string;
  hint: string;
}

export const GEN_MODES: GenModeInfo[] = [
  { id: 'style', name: 'Редизайн', emoji: '🎨', hint: 'Комната останется вашей — изменится стиль' },
  { id: 'empty', name: 'Пустая комната', emoji: '🧹', hint: 'Уберём всю мебель и декор' },
  { id: 'furnish', name: 'Обставить', emoji: '🛋️', hint: 'Заполним пустую комнату мебелью' },
];

// Хелперы
export const getStylesByCategory = (category: 'interior' | 'outdoor') =>
  STYLES.filter((style) => style.category === category);

export const getStylesByTier = (tier: TierId) => {
  const order: Record<string, number> = { pro: 0, premium: 1, premium_pro: 2 };
  const userLevel = order[tier] ?? 0;
  return STYLES.filter((s) => (order[s.tier] ?? 0) <= userLevel);
};

export const getStyleById = (id: string) => STYLES.find((style) => style.id === id);
