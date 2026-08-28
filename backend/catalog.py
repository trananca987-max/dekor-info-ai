"""Каталог SPEC v2.0: задачи (§6), палитры (§8), типы помещений (§9), стили (§11)."""

# === Задачи вместо стилей (SPEC §6). Вторая волна НЕ показывается (нет в спринте). ===
JOBS = {
    "room_design": {"title": "Дизайн комнаты", "sub": "Полный редизайн в выбранном стиле",
                    "wave": "core", "preview": "/examples/room_design.jpg"},
    "declutter": {"title": "Уборка комнаты", "sub": "Убрать хлам и лишние вещи",
                  "wave": "core", "preview": "/examples/declutter.jpg"},
    "garden": {"title": "Сад и участок", "sub": "Ландшафт, терраса, зона отдыха",
               "wave": "core", "preview": "/examples/garden.jpg"},
}
JOB_ORDER = ["room_design", "declutter", "garden"]

# === Палитры (SPEC §8): модификатор промпта, стоит 0 кредитов ===
PALETTES = {
    "surprise": {"name": "Удиви меня", "colors": [], "prompt": ""},
    "turquoise_lagoon": {"name": "Бирюзовая лагуна", "colors": ["#0FA3B1", "#B8E0D2", "#F7F7F2"],
                         "prompt": "color palette: turquoise, aqua blue, soft mint, warm white; materials: glass, light wood, linen"},
    "terracotta_mirage": {"name": "Терракотовый мираж", "colors": ["#C96F4A", "#E8B88A", "#F5E6D3"],
                          "prompt": "color palette: terracotta, warm sand, cream; materials: clay, rattan, matte ceramics"},
    "warm_grey": {"name": "Тёплый серый", "colors": ["#8D8680", "#C4BBAF", "#EFEAE3"],
                  "prompt": "color palette: warm greys, taupe, off-white; materials: wool, oak, stone"},
    "neon_sunset": {"name": "Неоновый закат", "colors": ["#FF5E7E", "#FF9A5A", "#5B2A86"],
                    "prompt": "color palette: neon pink, orange glow, deep violet accents; materials: glossy surfaces, LED accent lighting"},
    "milky_oak": {"name": "Молочный дуб", "colors": ["#F2EAD9", "#D9C1A3", "#A98963"],
                  "prompt": "color palette: milky white, light oak, caramel; materials: oak wood, boucle fabric, paper lamps"},
    "graphite_brass": {"name": "Графит и латунь", "colors": ["#3B3F46", "#B08D57", "#E5E1DA"],
                       "prompt": "color palette: graphite, brass gold, warm white; materials: dark metal, brass fixtures, marble"},
    "olive_grove": {"name": "Оливковая роща", "colors": ["#708238", "#B5C99A", "#F1EAD8"],
                    "prompt": "color palette: olive green, sage, ivory; materials: natural wood, ceramic, cotton"},
    "sand_linen": {"name": "Песок и лён", "colors": ["#D8C3A5", "#EAE0D5", "#8E8D8A"],
                   "prompt": "color palette: sand beige, linen white, stone grey; materials: linen, jute, light stone"},
}
PALETTE_ORDER = ["surprise", "turquoise_lagoon", "terracotta_mirage", "warm_grey",
                 "neon_sunset", "milky_oak", "graphite_brass", "olive_grove", "sand_linen"]

# === Типы помещений (SPEC §9): жилые + коммерческие (вход в B2B) ===
ROOM_TYPES = [
    {"id": "living_room", "name": "Гостиная"},
    {"id": "bedroom", "name": "Спальня"},
    {"id": "kitchen", "name": "Кухня"},
    {"id": "bathroom", "name": "Ванная"},
    {"id": "kids_room", "name": "Детская"},
    {"id": "hallway", "name": "Прихожая"},
    {"id": "balcony", "name": "Балкон"},
    {"id": "home_office", "name": "Кабинет"},
    {"id": "wardrobe", "name": "Гардеробная"},
    {"id": "cafe", "name": "Кофейня"},
    {"id": "restaurant", "name": "Ресторан"},
    {"id": "office", "name": "Офис"},
    {"id": "beauty_salon", "name": "Салон красоты"},
    {"id": "playroom", "name": "Игровая комната"},
    {"id": "attic", "name": "Мансарда"},
    {"id": "garage", "name": "Гараж"},
]

# === Стили: preset_id -> display_name (SPEC §11) + промпты ===
STYLES = {
    "modern": {"name_ru": "Современный", "category": "interior",
               "prompt": "modern minimalist interior, clean lines, neutral colors, contemporary furniture, bright natural lighting, white walls, wooden floor"},
    "scandinavian": {"name_ru": "Скандинавский", "category": "interior",
                     "prompt": "scandinavian interior design, cozy hygge style, natural materials, light wood furniture, white and pastel colors, soft textiles"},
    "loft": {"name_ru": "Лофт", "category": "interior",
             "prompt": "industrial loft interior, exposed brick walls, metal pipes, concrete floor, vintage furniture, edison bulbs, urban style"},
    "minimalism": {"name_ru": "Минимализм", "category": "interior",
                   "prompt": "pure minimalism interior, white walls, hidden storage, clean surfaces, minimal furniture, zen atmosphere, simple elegance"},
    "classic": {"name_ru": "Классика", "category": "interior",
                "prompt": "classic elegant interior, ornate moldings, crystal chandelier, antique furniture, rich fabrics, marble details, sophisticated style"},
    "hightech": {"name_ru": "Хай-тек", "category": "interior",
                 "prompt": "high-tech futuristic interior, smart home technology, LED lighting, glass surfaces, chrome details, modern minimalism"},
    "provence": {"name_ru": "Прованс", "category": "interior",
                 "prompt": "french provence interior, lavender colors, vintage furniture, floral patterns, shabby chic style, romantic atmosphere"},
    "japanese": {"name_ru": "Японский", "category": "interior",
                 "prompt": "japanese zen interior, tatami mats, shoji screens, low furniture, natural materials, peaceful minimalism, harmony"},
    # Участок
    "landscape": {"name_ru": "Ландшафт", "category": "outdoor",
                  "prompt": "beautiful landscape design, curved paths, variety of plants, decorative trees, garden lighting, harmonious composition"},
    "terrace": {"name_ru": "Терраса", "category": "outdoor",
                "prompt": "wooden terrace deck, outdoor furniture, potted plants, comfortable seating, string lights, cozy outdoor living"},
    "patio": {"name_ru": "Патио", "category": "outdoor",
              "prompt": "cozy patio area, stone paving, outdoor furniture, plants in pots, morning coffee spot, relaxing atmosphere"},
    "gazebo": {"name_ru": "Беседка", "category": "outdoor",
               "prompt": "garden gazebo, climbing plants, wooden structure, comfortable seating, romantic atmosphere, peaceful retreat"},
    "bbq": {"name_ru": "Гриль-зона", "category": "outdoor",
            "prompt": "outdoor BBQ area, stone grill, dining table with benches, covered pergola, evening lighting, cozy gathering space"},
    "pool": {"name_ru": "Бассейн", "category": "outdoor",
             "prompt": "swimming pool with deck, sun loungers, pool tiles, surrounding landscape, umbrellas, summer relaxation area"},
    "pergola": {"name_ru": "Пергола", "category": "outdoor",
                "prompt": "elegant pergola, climbing vines, shaded seating area, wooden beams, romantic garden feature, outdoor dining"},
    "greenhouse": {"name_ru": "Теплица", "category": "outdoor",
                   "prompt": "modern greenhouse, organized plant shelves, glass structure, growing vegetables, garden tools, functional design"},
    "vegetable_garden": {"name_ru": "Огород", "category": "outdoor",
                         "prompt": "organized vegetable garden, raised beds, neat rows of plants, garden paths, healthy vegetables, productive garden"},
    "playground": {"name_ru": "Детская площадка", "category": "outdoor",
                   "prompt": "colorful kids playground, swing set, slides, climbing structures, safe soft ground, fun outdoor equipment, family friendly"},
}

# Маппинг preset_id -> человекочитаемое название (SPEC §11).
# Технические имена пресетов не должны попадать в UI. Фолбэк — «Дизайн комнаты».
PRESET_DISPLAY_NAME = {
    **{sid: s["name_ru"] for sid, s in STYLES.items()},
    "empty_room": "Пустая комната",
    "empty_furnish_base": "Дизайн комнаты",
    "declutter": "Уборка комнаты",
    "room_design": "Дизайн комнаты",
    "garden": "Сад и участок",
}


def display_name(preset_id: str) -> str:
    return PRESET_DISPLAY_NAME.get(preset_id or "", "Дизайн комнаты")


# === Промпты задач ===
JOB_PROMPTS = {
    "room_design": "",  # промпт = стиль + палитра + тип помещения
    "declutter": ("Declutter this room completely: remove all clutter, mess, random objects, "
                  "clothes, boxes and trash. Keep the furniture and room structure, "
                  "make it clean, tidy and organized. Photorealistic."),
    "garden": "",  # промпт = стиль участка + палитра
}
