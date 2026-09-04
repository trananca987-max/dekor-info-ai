// PATCH v2.2 §2: каталог — конфиг вместо хардкода.
// Добавление стиля = правка этого файла, не кода.
// Пути — без расширений и размеров; компонент сам достаёт из манифеста
// full (слайдер), preview (карточка витрины), thumb (переключатель комнат), lqip (заглушка).

export type Room = { room: string; label: string; before: string; after: string };

export type Style = {
  id: string;
  title: string;
  hint: string;
  tier: 'A' | 'B';
  cover: string;
  rooms: Room[];
  promptRef: string;
};

export type JobDirection = {
  id: string;
  label: string;
  before: string;
  after: string;
  promptRef: string;
};

export type Job = {
  id: string;
  title: string;
  hint: string;
  before: string;
  after: string;
  promptRef: string;
  directions?: JobDirection[];
};

// === УРОВЕНЬ A: 8 стилей с готовыми парами «до/после» (гостиная + спальня) ===
// === УРОВЕНЬ B: 14 стилей с обложками ===
export const STYLES: Style[] = [
  {
    id: 'scandi', title: 'Скандинавский', hint: 'Светлое дерево, белые стены, много света',
    tier: 'A', cover: 'scandi/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base/living_before', after: 'scandi/living_after' },
      { room: 'bedroom', label: 'Спальня', before: '_base/bedroom_before', after: 'scandi/bedroom_after' },
    ],
    promptRef: 'scandinavian interior, white matte walls, light oak flooring, pale grey linen sofa, jute rug, soft daylight',
  },
  {
    id: 'modern', title: 'Современный', hint: 'Чистые линии, спокойные тона, ничего лишнего',
    tier: 'A', cover: 'modern/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base/living_before', after: 'modern/living_after' },
      { room: 'bedroom', label: 'Спальня', before: '_base/bedroom_before', after: 'modern/bedroom_after' },
    ],
    promptRef: 'contemporary interior, clean lines, neutral tones, wood and matte surfaces, large windows',
  },
  {
    id: 'classic', title: 'Классический', hint: 'Элегантная мебель, лепнина, тёплый свет',
    tier: 'A', cover: 'classic/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base/living_before', after: 'classic/living_after' },
      { room: 'bedroom', label: 'Спальня', before: '_base/bedroom_before', after: 'classic/bedroom_after' },
    ],
    promptRef: 'classic elegant interior, mouldings, parquet floor, refined furniture, warm light, restrained luxury',
  },
  {
    id: 'provence', title: 'Прованс', hint: 'Пастельные тона, винтажная мебель, цветы',
    tier: 'A', cover: 'provence/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base/living_before', after: 'provence/living_after' },
      { room: 'bedroom', label: 'Спальня', before: '_base/bedroom_before', after: 'provence/bedroom_after' },
    ],
    promptRef: 'french provence interior, pastel tones, vintage wooden furniture, floral textiles, warm sunlight',
  },
  {
    id: 'loft', title: 'Лофт', hint: 'Кирпич, бетон, металл и кожа',
    tier: 'A', cover: 'loft/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base/living_before', after: 'loft/living_after' },
      { room: 'bedroom', label: 'Спальня', before: '_base/bedroom_before', after: 'loft/bedroom_after' },
    ],
    promptRef: 'loft interior, exposed brick walls, concrete ceiling, metal and leather furniture, warm edison bulbs',
  },
  {
    id: 'minimal', title: 'Минимализм', hint: 'Пустые поверхности, скрытое хранение',
    tier: 'A', cover: 'minimal/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base/living_before', after: 'minimal/living_after' },
      { room: 'bedroom', label: 'Спальня', before: '_base/bedroom_before', after: 'minimal/bedroom_after' },
    ],
    promptRef: 'minimalist interior, empty clean surfaces, hidden storage, white and grey tones, soft light',
  },
  {
    id: 'wood', title: 'Тёплое дерево', hint: 'Тёплый дуб, природные фактуры',
    tier: 'A', cover: 'wood/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base/living_before', after: 'wood/living_after' },
    ],
    promptRef: 'warm wood interior, oak wall panels, wooden furniture, soft warm lighting, natural textures',
  },
  {
    id: 'neoclassic', title: 'Неоклассика', hint: 'Классика без излишеств, светлые тона',
    tier: 'A', cover: 'neoclassic/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base/living_before', after: 'neoclassic/living_after' },
    ],
    promptRef: 'neoclassical interior, classic proportions without excess, light tones, elegant mouldings, modern furniture',
  },
  // --- Уровень B: обложки, без слайдера и переключателя комнат (§7.2) ---
  { id: 'artdeco', title: 'Ар-деко', hint: 'Латунь, глубокие цвета, геометрия', tier: 'B', cover: 'artdeco/cover', rooms: [], promptRef: 'art deco interior, brass details, deep emerald and gold, geometric patterns, velvet furniture' },
  { id: 'mediterranean', title: 'Средиземноморский', hint: 'Белая штукатурка, терракота, арки', tier: 'B', cover: 'mediterranean/cover', rooms: [], promptRef: 'mediterranean interior, white stucco walls, terracotta floor, arches, airy sea-light atmosphere' },
  { id: 'boho', title: 'Бохо', hint: 'Текстиль, ротанг, растения, тёплые тона', tier: 'B', cover: 'boho/cover', rooms: [], promptRef: 'boho interior, layered textiles, rattan furniture, many plants, warm earthy tones, eclectic decor' },
  { id: 'country', title: 'Кантри', hint: 'Деревянные стены, уютный деревенский стиль', tier: 'B', cover: 'country/cover', rooms: [], promptRef: 'country house interior, wooden walls, cozy plaid textiles, rustic furniture, warm light' },
  { id: 'chalet', title: 'Шале', hint: 'Брус, каменный камин, тепло', tier: 'B', cover: 'chalet/cover', rooms: [], promptRef: 'alpine chalet interior, rough timber walls, stone fireplace, warm wool textiles, soft light' },
  {
    id: 'japandi', title: 'Джапанди', hint: 'Японский минимализм и скандинавское тепло',
    tier: 'A', cover: 'japandi/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base2/living_before', after: 'japandi/living_after' },
    ],
    promptRef: 'japandi interior, japanese minimalism with scandinavian warmth, low furniture, natural materials, harmony',
  },
  {
    id: 'quietluxury', title: 'Тихая роскошь', hint: 'Сдержанность и дорогие материалы',
    tier: 'A', cover: 'quietluxury/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base2/living_before', after: 'quietluxury/living_after' },
    ],
    promptRef: 'quiet luxury interior, understated expensive materials, cashmere textures, marble, muted refined tones',
  },
  { id: 'biophilic', title: 'Эко и биофильный', hint: 'Живые растения, натуральные материалы', tier: 'B', cover: 'biophilic/cover', rooms: [], promptRef: 'biophilic interior, many live plants, natural wood, green accents, abundant daylight' },
  { id: 'hitech', title: 'Хай-тек', hint: 'Умный свет, стекло и хром', tier: 'B', cover: 'hitech/cover', rooms: [], promptRef: 'high-tech interior, smart lighting, glass and chrome surfaces, minimal decor, cool tones' },
  {
    id: 'contemporary', title: 'Контемпорари', hint: 'Современная мебель, акцентный арт',
    tier: 'A', cover: 'contemporary/living_after',
    rooms: [
      { room: 'living', label: 'Гостиная', before: '_base2/living_before', after: 'contemporary/living_after' },
    ],
    promptRef: 'contemporary interior, modern furniture, neutral palette, accent artwork, soft lighting',
  },
  { id: 'retro', title: 'Ретро-винтаж', hint: '60–70-е, тёплая ностальгия', tier: 'B', cover: 'retro/cover', rooms: [], promptRef: 'retro vintage interior, 1960s-70s furniture, warm colors, patterned textiles, nostalgic mood' },
  { id: 'glam', title: 'Гламур', hint: 'Глянец, хрусталь, бархат', tier: 'B', cover: 'glam/cover', rooms: [], promptRef: 'glamorous interior, glossy surfaces, crystal chandelier, velvet furniture, rich jewel colors' },
  { id: 'industrial', title: 'Индустриальный', hint: 'Бетон, металл, брутальные фактуры', tier: 'B', cover: 'industrial/cover', rooms: [], promptRef: 'industrial interior, concrete walls, metal elements, open pipes, raw textures, loft mood' },
  { id: 'maximal', title: 'Максимализм', hint: 'Смелые цвета, много декора', tier: 'B', cover: 'maximal/cover', rooms: [], promptRef: 'maximalist interior, bold rich colors, layered patterns, gallery wall of art, expressive decor' },
];

// === Задачи (§2): отдельный массив той же формы ===
export const JOBS: Job[] = [
  {
    id: 'declutter', title: 'Убрать лишнее', hint: 'Уберём хлам — мебель останется',
    before: '_base/declutter_before', after: 'declutter/after',
    promptRef: 'Declutter this room completely: remove all clutter, mess, random objects, clothes, boxes and trash. Keep the furniture and room structure, make it clean, tidy and organized. Photorealistic.',
  },
  {
    id: 'garden', title: 'Сад и участок', hint: 'Газон, дорожки, клумбы, зона отдыха',
    before: '_base/garden_cozy_before', after: 'garden_cozy/after',
    promptRef: 'beautiful landscaped garden, neat lawn, curved paths, flower beds, cozy seating area, garden lighting',
    directions: [
      { id: 'garden_cozy', label: 'Уютная дача', before: '_base/garden_cozy_before', after: 'garden_cozy/after', promptRef: 'cozy country garden: neat lawn, flower beds, garden path, outdoor seating area, warm evening lights' },
      { id: 'garden_english', label: 'Английский сад', before: '_base/garden_english_before', after: 'garden_english/after', promptRef: 'english garden: lush borders, roses, trimmed hedges, gravel paths, classic garden elegance' },
      { id: 'garden_terrace', label: 'Средиземноморская терраса', before: '_base/garden_terrace_before', after: 'garden_terrace/after', promptRef: 'mediterranean terrace: wooden deck, potted plants, outdoor lounge furniture, pergola with vines, string lights' },
      { id: 'garden_yard', label: 'Минималистичный двор', before: '_base/garden_yard_before', after: 'garden_yard/after', promptRef: 'minimalist yard: clean lawn, geometric paths, ornamental grasses, restrained modern landscaping' },
      { id: 'garden_landscape', label: 'Ландшафтный сад', before: 'garden_landscape/before', after: 'garden_landscape/after', promptRef: 'landscaped garden: manicured lawn, natural stone walkway, hydrangea borders, ornamental grasses, young trees, golden hour light' },
      { id: 'garden_lounge', label: 'Вечерняя зона отдыха', before: 'garden_landscape/before', after: 'garden_lounge/after', promptRef: 'evening garden lounge: wooden deck, modular sofa with cushions, fire pit, edison string lights, landscape lighting, blue hour atmosphere' },
    ],
  },
  {
    id: 'repaint', title: 'Перекрасить стены', hint: 'Свежая ровная краска вместо старых обоев',
    before: '_base/repaint_before', after: 'repaint/after',
    promptRef: 'Repaint the walls of this room: remove old wallpaper and peeling paint, apply fresh even paint in a modern neutral color. Keep furniture, floor and layout unchanged. Photorealistic.',
  },
  {
    id: 'furniture', title: 'Заменить мебель', hint: 'Современный гарнитур вместо старого',
    before: '_base/furniture_before', after: 'furniture/after',
    promptRef: 'Replace the old furniture in this room with a modern matching furniture set. Keep the room structure, floor and windows unchanged. Photorealistic.',
  },
  {
    id: 'facade', title: 'Фасад дома', hint: 'Аккуратный фасад без перестройки',
    before: '_base/facade_before', after: 'facade/after',
    promptRef: 'Renovate the facade of this house: fresh modern exterior finish, clean walls, updated windows and entrance, tidy surroundings. Keep the house shape and structure unchanged. Photorealistic.',
  },
  {
    id: 'facade_lighting', title: 'Вечерний фасад', hint: 'Подсветка дома и участка к вечеру',
    before: 'facade_renov/before', after: 'facade_lighting/after',
    promptRef: 'Evening house exterior: architectural facade lighting, warm window glow, landscape path lights, blue hour sky. Keep the house shape and structure unchanged. Photorealistic.',
  },
];

// Служебные ассеты (§1.3, §7.4)
export const SHARE_BG = { bg: 'share_template/bg' };
export const EMPTY_STATE = { placeholder: 'empty_state/placeholder' };

// === Хелперы ===
export const stylesA = STYLES.filter(s => s.tier === 'A');
export const stylesB = STYLES.filter(s => s.tier === 'B');
export const getStyle = (id: string) => STYLES.find(s => s.id === id);
export const getJob = (id: string) => JOBS.find(j => j.id === id);
