// Каталог стилей и задач DekorInfo AI (SPEC v3 - PATCH v5).
// Единственный источник правды согласован с assets.json / public/assets/manifest.json.

export type OverlayType = 'plain' | 'gradient' | 'frame';
export type CompareType = 'static_seam' | 'slider';

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
  order: number;
  before: string; // Имя ассета без расширения (напр. '24_facade_before')
  after: string;  // Имя ассета без расширения (напр. '25_facade_after')
  compare: 'static_seam';
  seam: number;
  seam_verified: boolean;
  promptRef: string;
  directions?: { id: string; label: string; before: string; after: string; promptRef: string }[];
}

// Глобальная базовая комната «до» для всех стилей Уровня 1 и покраски стен (Слот 01)
export const BASE_BEFORE = '01_base_before';

// === УРОВЕНЬ 1: Стили главного экрана (сетка 2х2 со свитчером до/после) ===
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
    hint: 'Текстиль, макраме, винтаж и этника',
    tier: 2,
    order: 3,
    after: '12_boho_after',
    overlay: 'plain',
    promptRef: 'boho interior, layered rugs, rattan furniture, macrame, warm earthy colors, dried flowers, eclectic relaxed vibe',
  },
  {
    id: 'artdeco',
    title: 'Ар-деко',
    hint: 'Геометрия, глянец, латунь и бархат',
    tier: 2,
    order: 4,
    after: '13_artdeco_after',
    overlay: 'plain',
    promptRef: 'art deco interior, geometric brass patterns, dark velvet upholstery, glossy marble, rich jewel tones, bold luxury',
  },
  {
    id: 'midcentury',
    title: 'Мид-сенчури',
    hint: 'Ретро 60-х, конические ножки, тёплый орех',
    tier: 2,
    order: 5,
    after: '14_midcentury_after',
    overlay: 'plain',
    promptRef: 'mid-century modern interior, teak and walnut wood, tapered legs, organic curved furniture, mustard and olive accents',
  },
  {
    id: 'neoclassic',
    title: 'Неоклассика',
    hint: 'Молдинги, симметрия, современная элегантность',
    tier: 2,
    order: 6,
    after: '09_neoclassic_after',
    overlay: 'plain',
    promptRef: 'neoclassical interior, wall moldings, symmetrical layout, crystal chandelier, soft grey and cream palette, refined elegance',
  },
  {
    id: 'provence',
    title: 'Прованс',
    hint: 'Пастель, лаванда, состаренное дерево',
    tier: 2,
    order: 7,
    after: '11_provence_after',
    overlay: 'gradient',
    promptRef: 'provence french country interior, distressed white wood, lavender and sage accents, floral linen, wrought iron details, rustic warmth',
  },
  {
    id: 'english',
    title: 'Английский',
    hint: 'Клетка, тёмное дерево, книжные полки',
    tier: 2,
    order: 8,
    after: '19_english_after',
    overlay: 'plain',
    promptRef: 'english traditional interior, dark mahogany wood, chesterfield leather armchair, plaid wool throw, built-in bookshelves, cozy fireplace',
  },
  {
    id: 'ecoorganic',
    title: 'Эко-органика',
    hint: 'Живые растения, глина, необработанное дерево',
    tier: 2,
    order: 9,
    after: '20_ecoorganic_after',
    overlay: 'plain',
    promptRef: 'eco-organic interior, live plants, curved clay plastered walls, raw untreated timber, linen and stone textures, natural biophilic design',
  },
  {
    id: 'mediterranean',
    title: 'Средиземноморский',
    hint: 'Терракота, арки, белые оштукатуренные стены',
    tier: 2,
    order: 10,
    after: '17_mediterranean_after',
    overlay: 'frame',
    promptRef: 'mediterranean interior, terracotta tile floor, whitewashed stucco walls, arched doorway, olive branch in terracotta vase, warm coastal breeze',
  },
  {
    id: 'glamour',
    title: 'Гламур',
    hint: 'Зеркала, золото, шёлк и хрусталь',
    tier: 2,
    order: 11,
    after: '21_glamour_after',
    overlay: 'gradient',
    promptRef: 'glamour interior, high gloss surfaces, gold metal finishes, silk cushions, polished marble floor, sparkling statement lighting',
  },
  {
    id: 'classic',
    title: 'Классика',
    hint: 'Традиционные формы, лепнина, благородные тона',
    tier: 2,
    order: 12,
    after: '10_classic_after',
    overlay: 'plain',
    promptRef: 'classic traditional interior, ornate plaster cornice, rich wood panelling, damask wallpaper, antique furniture, dignified warmth',
  },
  {
    id: 'hitech',
    title: 'Хай-тек · вечер',
    hint: 'Контурный неон, скрытая подсветка, стекло и глянец',
    tier: 2,
    order: 13,
    after: '16_hitech_after',
    overlay: 'plain',
    promptRef: 'high-tech interior evening, dark minimalist aesthetic, linear neon and led strip lighting, tinted glass, smart home panel, futuristic vibe',
  },
  {
    id: 'chalet',
    title: 'Шале',
    hint: 'Брус, камин, шкуры и грубый камень',
    tier: 2,
    order: 14,
    after: '18_chalet_after',
    overlay: 'plain',
    promptRef: 'alpine chalet interior, heavy timber ceiling beams, natural stone fireplace, fur throws, rustic pine furniture, warm mountain cabin mood',
  },
  {
    id: 'minimalism',
    title: 'Минимализм',
    hint: 'Максимум пространства, скрытые системы хранения',
    tier: 2,
    order: 15,
    after: '08_minimalism_after',
    overlay: 'frame',
    promptRef: 'minimalist interior, vast uncluttered space, seamless flush cabinetry, monochrome palette, indirect soft lighting, absolute simplicity',
  },
  {
    id: 'wabisabi',
    title: 'Ваби-саби',
    hint: 'Красота несовершенства, натуральные фактуры',
    tier: 2,
    order: 16,
    after: '15_wabisabi_after',
    overlay: 'frame',
    promptRef: 'wabi-sabi interior, imperfect textured lime wash walls, aged weathered wood bench, asymmetrical ceramic vessel, warm earth tones, serene mindful space',
  },
];

// === ДОМ И УЧАСТОК: 5 задач в строгом порядке (Дополнение 1) ===
export const JOBS: Job[] = [
  {
    id: 'facade',
    title: 'Фасад дома',
    subtitle: 'Отделка и окна за минуту',
    hint: 'Обновление фасада дома и входной группы',
    order: 1,
    before: '24_facade_before',
    after: '25_facade_after',
    compare: 'static_seam',
    seam: 0.53,
    seam_verified: true,
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
    order: 2,
    before: '26_garden_before',
    after: '27_garden_after',
    compare: 'static_seam',
    seam: 0.50,
    seam_verified: true,
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
  {
    id: 'declutter',
    title: 'Убрать лишнее',
    subtitle: 'Уберём хлам — мебель останется',
    hint: 'Виртуальная уборка и расхламление комнаты',
    order: 3,
    before: '22_declutter_before',
    after: '23_declutter_after',
    compare: 'static_seam',
    seam: 0.45,
    seam_verified: true,
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
    id: 'paint',
    title: 'Покраска стен',
    subtitle: 'Цвет без ремонта',
    hint: 'Примерка цвета стен без ремонта',
    order: 4,
    before: '01_base_before',
    after: '33_paint_after',
    compare: 'static_seam',
    seam: 0.50,
    seam_verified: false,
    promptRef: 'Repaint walls in a deep muted sage green with a matte finish, crisp white ceiling and white window reveal. Same room, identical geometry.',
    directions: [
      {
        id: 'paint_sage',
        label: 'Шалфейный матовый',
        before: '01_base_before',
        after: '33_paint_after',
        promptRef: 'Repaint walls in a deep muted sage green with matte finish.',
      },
    ],
  },
  {
    id: 'furniture',
    title: 'Расстановка мебели',
    subtitle: 'Тот же метраж — больше места',
    hint: 'Оптимизация планировки и расстановки мебели',
    order: 5,
    before: '34_furniture_before',
    after: '35_furniture_after',
    compare: 'static_seam',
    seam: 0.50,
    seam_verified: false,
    promptRef: 'Rearrange the furniture sensibly for clear circulation and open balanced composition. Same furniture, same room.',
    directions: [
      {
        id: 'furniture_opt',
        label: 'Оптимальная расстановка',
        before: '34_furniture_before',
        after: '35_furniture_after',
        promptRef: 'Rearrange furniture for optimal space and open circulation.',
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
export const ALL_STYLES = [...STYLES_TIER1, ...STYLES_TIER2];

export function getStyle(id: string): Style | undefined {
  return ALL_STYLES.find((s) => s.id === id);
}

export function getJob(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id);
}

export function getStyleByOrder(order: number, tier: 1 | 2 = 2): Style | undefined {
  const list = tier === 1 ? STYLES_TIER1 : STYLES_TIER2;
  return list.find((s) => s.order === order);
}
