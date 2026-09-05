// Каталог стилей и задач DekorInfo AI (SPEC v3 - Этап B).
// Единственный источник правды согласован с assets.json / public/assets/manifest.json.

export type OverlayType = 'plain' | 'gradient' | 'frame';
export type CompareType = 'static_seam' | 'toggle' | 'slider';

export interface Style {
  id: string;
  title: string;
  hint?: string;
  tier: 1 | 2;
  order: number;
  after: string; // Имя ассета без расширения (напр. '02_scandi_after')
  overlay: OverlayType;
  promptRef: string;
}

export interface Job {
  id: string;
  title: string;
  subtitle: string;
  hint?: string;
  before: string; // Имя ассета без расширения (напр. '22_declutter_before')
  after: string;  // Имя ассета без расширения (напр. '23_declutter_after')
  compare: CompareType;
  seam: number | null;
  promptRef: string;
  directions?: { id: string; label: string; before: string; after: string; promptRef: string }[];
}

// Глобальная базовая комната «до» для всех стилей Уровня 1 (Слот 01)
export const BASE_BEFORE = '01_base_before';

// === УРОВЕНЬ 1: Стили главного экрана (карусель / сплит до/после) ===
export const STYLES_TIER1: Style[] = [
  {
    id: 'scandi',
    title: 'Скандинавский',
    hint: 'Светлое дерево, белые стены, много света',
    tier: 1,
    order: 1,
    after: '02_scandi_after',
    overlay: 'plain',
    promptRef: 'scandinavian interior, white matte walls, light oak flooring, pale grey linen sofa, jute rug, soft daylight',
  },
  {
    id: 'modern',
    title: 'Современный',
    hint: 'Чистые линии, спокойные тона, ничего лишнего',
    tier: 1,
    order: 2,
    after: '03_modern_after',
    overlay: 'plain',
    promptRef: 'contemporary interior, clean lines, neutral tones, wood and matte surfaces, large windows',
  },
  {
    id: 'quietlux',
    title: 'Тихая роскошь',
    hint: 'Сдержанный шик, премиальные ткани и текстуры',
    tier: 1,
    order: 3,
    after: '04_quietlux_after',
    overlay: 'gradient',
    promptRef: 'quiet luxury interior, cream and taupe tones, herringbone parquet, cashmere throw, brass details, warm lighting',
  },
  {
    id: 'loft',
    title: 'Лофт',
    hint: 'Кирпич, бетон, металл и кожа',
    tier: 1,
    order: 4,
    after: '05_loft_after',
    overlay: 'plain',
    promptRef: 'loft interior, exposed brick walls, concrete ceiling, metal and leather furniture, warm edison bulbs',
  },
];

// === УРОВЕНЬ 2: Все стили каталога (/styles, сетка 2 колонки, порядок строго по выдаче) ===
export const STYLES_TIER2: Style[] = [
  {
    id: 'maximalism',
    title: 'Максимализм',
    hint: 'Яркие цвета, насыщенные фактуры, смелый декор',
    tier: 2,
    order: 1,
    after: '06_maximalism_after',
    overlay: 'plain',
    promptRef: 'maximalist interior, emerald green walls, velvet sofa, rich art gallery wall, ornate rug, eclectic bold style',
  },
  {
    id: 'japandi',
    title: 'Джапанди',
    hint: 'Скандинавский уют и японская простота',
    tier: 2,
    order: 2,
    after: '07_japandi_after',
    overlay: 'plain',
    promptRef: 'japandi interior, walnut wood, raw linen, handmade ceramic, paper pendant lamp, tranquil warm minimalism',
  },
  {
    id: 'boho',
    title: 'Бохо',
    hint: 'Плетение, макраме, ротанг и растения',
    tier: 2,
    order: 3,
    after: '12_boho_after',
    overlay: 'plain',
    promptRef: 'boho chic living room, macrame wall hanging, rattan armchair, textured cushions, indoor plants, warm cozy light',
  },
  {
    id: 'artdeco',
    title: 'Ар-деко',
    hint: 'Геометрия, латунь, мрамор и глянец',
    tier: 2,
    order: 4,
    after: '13_artdeco_after',
    overlay: 'plain',
    promptRef: 'art deco living room, navy blue velvet, gold brass accents, geometric marble coffee table, crystal chandelier, luxury',
  },
  {
    id: 'midcentury',
    title: 'Мид-сенчури',
    hint: 'Стиль 60-х: тиковое дерево, культовая мебель',
    tier: 2,
    order: 5,
    after: '14_midcentury_after',
    overlay: 'plain',
    promptRef: 'mid-century modern interior, teak sideboard, iconic egg armchair, mustard and olive accents, walnut floor',
  },
  {
    id: 'neoclassic',
    title: 'Неоклассика',
    hint: 'Классика без излишеств, светлые тона и молдинги',
    tier: 2,
    order: 6,
    after: '09_neoclassic_after',
    overlay: 'plain',
    promptRef: 'neoclassic elegant interior, dove grey wall mouldings, light chevron parquet, modern crystal chandelier, refined sofa',
  },
  {
    id: 'provence',
    title: 'Прованс',
    hint: 'Пастельные тона, лаванда, винтаж и терракота',
    tier: 2,
    order: 7,
    after: '11_provence_after',
    overlay: 'gradient',
    promptRef: 'french provence interior, lavender and cream palette, vintage distressed wood, terracotta tiles, floral textiles, warm sunlight',
  },
  {
    id: 'english',
    title: 'Английский',
    hint: 'Глубокий зелёный, книжные шкафы, кожа',
    tier: 2,
    order: 8,
    after: '19_english_after',
    overlay: 'plain',
    promptRef: 'traditional english study living room, deep green wall panelling, built-in mahogany bookcases, chesterfield leather sofa, plaid throw',
  },
  {
    id: 'ecoorganic',
    title: 'Эко-органика',
    hint: 'Живой край дерева, живые растения, глина',
    tier: 2,
    order: 9,
    after: '20_ecoorganic_after',
    overlay: 'plain',
    promptRef: 'organic modern interior, live edge solid wood table, clay plaster walls, lush indoor plants, travertine stone, raw textures',
  },
  {
    id: 'mediterranean',
    title: 'Средиземноморский',
    hint: 'Арочные ниши, оливковые тона, побелка',
    tier: 2,
    order: 10,
    after: '17_mediterranean_after',
    overlay: 'frame',
    promptRef: 'mediterranean villa living room, whitewashed curved walls, arched niches, terracotta pottery, olive tree in ceramic pot, natural linen',
  },
  {
    id: 'glamour',
    title: 'Гламур',
    hint: 'Пыльная роза, хрусталь, бархат и золото',
    tier: 2,
    order: 11,
    after: '21_glamour_after',
    overlay: 'gradient',
    promptRef: 'modern glam interior, dusty rose velvet, crystal accents, polished brass, blush marble coffee table, elegant plush rug',
  },
  {
    id: 'classic',
    title: 'Классика',
    hint: 'Орех, бордовые акценты, парадный стиль',
    tier: 2,
    order: 12,
    after: '10_classic_after',
    overlay: 'plain',
    promptRef: 'classic luxury interior, rich walnut panelling, deep burgundy velvet curtains, carved furniture, gilded frame mirror, warm chandelier',
  },
  {
    id: 'hitech',
    title: 'Хай-тек · вечер',
    hint: 'Графит, неоновая и светодиодная подсветка',
    tier: 2,
    order: 13,
    after: '16_hitech_after',
    overlay: 'plain',
    promptRef: 'high-tech evening interior, graphite matte surfaces, concealed LED cove lighting, smart glass, polished dark concrete, futuristic sleek lines',
  },
  {
    id: 'chalet',
    title: 'Шале',
    hint: 'Дикий камень, камин, балки и тёплый плед',
    tier: 2,
    order: 14,
    after: '18_chalet_after',
    overlay: 'plain',
    promptRef: 'alpine chalet living room, rough stone fireplace with glowing fire, heavy wooden ceiling beams, chunky knit wool throw, rustic warmth',
  },
  {
    id: 'minimalism',
    title: 'Минимализм',
    hint: 'Чистые белые стены, скрытое хранение',
    tier: 2,
    order: 15,
    after: '08_minimalism_after',
    overlay: 'frame',
    promptRef: 'extreme minimalism, seamless white walls, concealed frameless doors, singular floating bench, pure architectural light',
  },
  {
    id: 'wabisabi',
    title: 'Ваби-саби',
    hint: 'Неровная штукатурка, глина, красота несовершенства',
    tier: 2,
    order: 16,
    after: '15_wabisabi_after',
    overlay: 'frame',
    promptRef: 'wabi-sabi room, textured uneven clay plaster walls, aged weathered wood, handcrafted rough ceramic bowl, diffused natural light',
  },
];

// Объединённый список всех стилей для роутов и совместимости
export const STYLES: Style[] = [...STYLES_TIER1, ...STYLES_TIER2];

// === ПАРЫ «ДРУГИЕ РАБОТЫ» (Карусель задач) ===
export const JOBS: Job[] = [
  {
    id: 'declutter',
    title: 'Убрать лишнее',
    subtitle: 'Уберём хлам — мебель останется',
    hint: 'Виртуальная уборка и расхламление комнаты',
    before: '22_declutter_before',
    after: '23_declutter_after',
    compare: 'static_seam',
    seam: 0.45,
    promptRef: 'Clean up this room: remove all clutter, boxes, clothes and scattered items from floor and furniture. Keep all original furniture, layout and structure exactly as is. Clean tidy room. Photorealistic.',
    directions: [
      {
        id: 'declutter_general',
        label: 'Генеральная уборка',
        before: '22_declutter_before',
        after: '23_declutter_after',
        promptRef: 'Tidy up the room, remove trash and scattered items, organize surfaces.',
      },
    ],
  },
  {
    id: 'facade',
    title: 'Фасад дома',
    subtitle: 'Отделка и окна за минуту',
    hint: 'Обновление фасада дома и входной группы',
    before: '24_facade_before',
    after: '25_facade_after',
    compare: 'static_seam',
    seam: 0.53,
    promptRef: 'Renovate the facade of this house: fresh modern exterior finish, clean walls, updated windows and entrance, tidy surroundings. Keep the house shape and structure unchanged. Photorealistic.',
    directions: [
      {
        id: 'facade_modern',
        label: 'Современный фасад',
        before: '24_facade_before',
        after: '25_facade_after',
        promptRef: 'Modern exterior wall finish, clean contemporary windows.',
      },
    ],
  },
  {
    id: 'garden',
    title: 'Сад и участок',
    subtitle: 'Газон, дорожки, посадки',
    hint: 'Ландшафтный дизайн и благоустройство двора',
    before: '26_garden_before',
    after: '27_garden_after',
    compare: 'toggle',
    seam: null,
    promptRef: 'Landscape design for this backyard garden: lush green neat lawn, natural stone paved walking path, beautiful flowering bushes and garden beds, clean cozy outdoor area. Photorealistic.',
    directions: [
      {
        id: 'garden_landscape',
        label: 'Ландшафтный сад',
        before: '26_garden_before',
        after: '27_garden_after',
        promptRef: 'Lawn, stone pathways, flower beds and decorative shrubs.',
      },
    ],
  },
];

// Служебные ассеты
export const UTILS = {
  shooting_guide: '28_shooting_guide',
  empty_state: '29_empty_state',
  limit: '30_limit',
  social_preview: '31_social_preview',
  progress_bg: '32_progress_bg',
};

// === Хелперы ===
export const stylesA = STYLES_TIER1;
export const stylesB = STYLES_TIER2;
export const getStyle = (id: string) => STYLES.find(s => s.id === id);
export const getJob = (id: string) => JOBS.find(j => j.id === id);
