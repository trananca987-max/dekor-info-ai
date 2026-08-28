"""Каталог PATCH v2.2 §2: 22 стиля (уровни A/B) + 5 задач.

Зеркало фронтенд-конфига src/config/catalog.ts: добавление стиля = правка
обоих файлов. Промпты (promptRef) — единственный источник для генерации.
"""

# === Стили: уровень A — готовые пары «до/после», уровень B — обложки (§2) ===
STYLES = {
    # --- Уровень A ---
    "scandi": {"title": "Скандинавский", "tier": "A",
               "prompt": "scandinavian interior, white matte walls, light oak flooring, pale grey linen sofa, jute rug, soft daylight"},
    "modern": {"title": "Современный", "tier": "A",
               "prompt": "contemporary interior, clean lines, neutral tones, wood and matte surfaces, large windows"},
    "classic": {"title": "Классический", "tier": "A",
                "prompt": "classic elegant interior, mouldings, parquet floor, refined furniture, warm light, restrained luxury"},
    "provence": {"title": "Прованс", "tier": "A",
                 "prompt": "french provence interior, pastel tones, vintage wooden furniture, floral textiles, warm sunlight"},
    "loft": {"title": "Лофт", "tier": "A",
             "prompt": "loft interior, exposed brick walls, concrete ceiling, metal and leather furniture, warm edison bulbs"},
    "minimal": {"title": "Минимализм", "tier": "A",
                "prompt": "minimalist interior, empty clean surfaces, hidden storage, white and grey tones, soft light"},
    "wood": {"title": "Тёплое дерево", "tier": "A",
             "prompt": "warm wood interior, oak wall panels, wooden furniture, soft warm lighting, natural textures"},
    "neoclassic": {"title": "Неоклассика", "tier": "A",
                   "prompt": "neoclassical interior, classic proportions without excess, light tones, elegant mouldings, modern furniture"},
    # --- Уровень B ---
    "artdeco": {"title": "Ар-деко", "tier": "B",
                "prompt": "art deco interior, brass details, deep emerald and gold, geometric patterns, velvet furniture"},
    "mediterranean": {"title": "Средиземноморский", "tier": "B",
                      "prompt": "mediterranean interior, white stucco walls, terracotta floor, arches, airy sea-light atmosphere"},
    "boho": {"title": "Бохо", "tier": "B",
             "prompt": "boho interior, layered textiles, rattan furniture, many plants, warm earthy tones, eclectic decor"},
    "country": {"title": "Кантри", "tier": "B",
                "prompt": "country house interior, wooden walls, cozy plaid textiles, rustic furniture, warm light"},
    "chalet": {"title": "Шале", "tier": "B",
               "prompt": "alpine chalet interior, rough timber walls, stone fireplace, warm wool textiles, soft light"},
    "japandi": {"title": "Японский", "tier": "B",
                "prompt": "japandi interior, japanese minimalism with scandinavian warmth, low furniture, natural materials, harmony"},
    "quietluxury": {"title": "Тихая роскошь", "tier": "B",
                    "prompt": "quiet luxury interior, understated expensive materials, cashmere textures, marble, muted refined tones"},
    "biophilic": {"title": "Эко и биофильный", "tier": "B",
                  "prompt": "biophilic interior, many live plants, natural wood, green accents, abundant daylight"},
    "hitech": {"title": "Хай-тек", "tier": "B",
               "prompt": "high-tech interior, smart lighting, glass and chrome surfaces, minimal decor, cool tones"},
    "contemporary": {"title": "Контемпорари", "tier": "B",
                     "prompt": "contemporary interior, modern furniture, neutral palette, accent artwork, soft lighting"},
    "retro": {"title": "Ретро-винтаж", "tier": "B",
              "prompt": "retro vintage interior, 1960s-70s furniture, warm colors, patterned textiles, nostalgic mood"},
    "glam": {"title": "Гламур", "tier": "B",
             "prompt": "glamorous interior, glossy surfaces, crystal chandelier, velvet furniture, rich jewel colors"},
    "industrial": {"title": "Индустриальный", "tier": "B",
                   "prompt": "industrial interior, concrete walls, metal elements, open pipes, raw textures, loft mood"},
    "maximal": {"title": "Максимализм", "tier": "B",
                "prompt": "maximalist interior, bold rich colors, layered patterns, gallery wall of art, expressive decor"},
}

# === Задачи (§2): Убрать лишнее, Сад и участок, Перекрасить стены, Заменить мебель, Фасад дома ===
JOBS = {
    "declutter": {"title": "Убрать лишнее",
                  "prompt": ("Declutter this room completely: remove all clutter, mess, random objects, "
                             "clothes, boxes and trash. Keep the furniture and room structure, "
                             "make it clean, tidy and organized. Photorealistic.")},
    "garden": {"title": "Сад и участок",
               "prompt": "beautiful landscaped garden, neat lawn, curved paths, flower beds, cozy seating area, garden lighting"},
    "repaint": {"title": "Перекрасить стены",
                "prompt": ("Repaint the walls of this room: remove old wallpaper and peeling paint, apply fresh "
                           "even paint in a modern neutral color. Keep furniture, floor and layout unchanged. Photorealistic.")},
    "furniture": {"title": "Заменить мебель",
                  "prompt": ("Replace the old furniture in this room with a modern matching furniture set. "
                             "Keep the room structure, floor and windows unchanged. Photorealistic.")},
    "facade": {"title": "Фасад дома",
               "prompt": ("Renovate the facade of this house: fresh modern exterior finish, clean walls, updated "
                          "windows and entrance, tidy surroundings. Keep the house shape and structure unchanged. Photorealistic.")},
}
JOB_ORDER = ["declutter", "garden", "repaint", "furniture", "facade"]

# Направления внутри «Сада и участка» (§2)
GARDEN_DIRECTIONS = {
    "garden_cozy": {"title": "Уютная дача",
                    "prompt": "cozy country garden: neat lawn, flower beds, garden path, outdoor seating area, warm evening lights"},
    "garden_english": {"title": "Английский сад",
                       "prompt": "english garden: lush borders, roses, trimmed hedges, gravel paths, classic garden elegance"},
    "garden_terrace": {"title": "Средиземноморская терраса",
                       "prompt": "mediterranean terrace: wooden deck, potted plants, outdoor lounge furniture, pergola with vines, string lights"},
    "garden_yard": {"title": "Минималистичный двор",
                    "prompt": "minimalist yard: clean lawn, geometric paths, ornamental grasses, restrained modern landscaping"},
}

# Маппинг preset_id -> человекочитаемое название (§7.1).
# Технические имена пресетов не должны попадать в UI. Фолбэк — «Дизайн комнаты».
PRESET_DISPLAY_NAME = {
    **{sid: s["title"] for sid, s in STYLES.items()},
    **{jid: j["title"] for jid, j in JOBS.items()},
    **{gid: g["title"] for gid, g in GARDEN_DIRECTIONS.items()},
    "room_design": "Дизайн комнаты",
    "empty_room": "Пустая комната",
    "empty_furnish_base": "Дизайн комнаты",
}


def display_name(preset_id: str) -> str:
    return PRESET_DISPLAY_NAME.get(preset_id or "", "Дизайн комнаты")
