from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import os
import shutil
import json
import asyncio
from dotenv import load_dotenv

from .database import get_db, init_db, SessionLocal, engine
from .models import User, Generation, Payment
from .ai_generator import AIGenerator
from .telegram_helper import check_subscription, send_message, create_invoice_link, bot

load_dotenv()

app = FastAPI(title="Декор Инфо AI Designer API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI generator (anymodel.org: gemini / gpt-image-2)
ai_gen = AIGenerator()

# Initialize database
init_db()

# Persistent data dir (Railway volume /data; local dev: current dir)
DATA_DIR = os.getenv("DATA_DIR", ".")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
RESULTS_DIR = os.path.join(DATA_DIR, "results")

# Create uploads/results directories
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# Serve generation results statically
from fastapi.staticfiles import StaticFiles
app.mount("/results", StaticFiles(directory=RESULTS_DIR), name="results")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")  # для шторки До/После

# Store generation tasks
generation_tasks = {}

@app.on_event("startup")
async def startup_event():
    print("🚀 Декор Инфо AI Designer API started!")
    print(f"📢 Channel: {os.getenv('CHANNEL_USERNAME')}")
    # Лёгкая миграция схемы (SQLite ALTER TABLE ADD COLUMN для недостающих колонок)
    try:
        from sqlalchemy import inspect, text
        insp = inspect(engine)
        want_users = {
            "credits": "INTEGER DEFAULT 0",
            "starter_bonus_granted_at": "DATETIME",
            "quota_medium": "INTEGER DEFAULT 0",
            "quota_low": "INTEGER DEFAULT 0",
            "quota_hd": "INTEGER DEFAULT 0",
            "daily_free_used": "INTEGER DEFAULT 0",
            "daily_free_date": "VARCHAR",
            "monthly_free_used": "INTEGER DEFAULT 0",
            "monthly_free_month": "VARCHAR",
            "referred_by": "BIGINT",
        }
        want_gens = {
            "preview_url": "VARCHAR",
            "quality": "VARCHAR DEFAULT 'medium'",
        }
        with engine.begin() as conn:
            have_users = {c["name"] for c in insp.get_columns("users")}
            for col, typ in want_users.items():
                if col not in have_users:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typ}"))
                    print(f"🔧 ALTER users ADD {col}")
            have_gens = {c["name"] for c in insp.get_columns("generations")}
            for col, typ in want_gens.items():
                if col not in have_gens:
                    conn.execute(text(f"ALTER TABLE generations ADD COLUMN {col} {typ}"))
                    print(f"🔧 ALTER generations ADD {col}")
    except Exception as e:
        print(f"⚠️ Schema migration skipped: {e}")
    # Миграция БД (SPEC 1.3): старая валюта stars → внутренняя credits (1:1), один раз
    try:
        db = SessionLocal()
        migrated = 0
        for u in db.query(User).filter(User.stars > 0).all():
            u.credits = (u.credits or 0) + u.stars
            u.stars = 0
            migrated += 1
        if migrated:
            db.commit()
            print(f"💱 Миграция валют: {migrated} юзеров stars→credits")
        db.close()
    except Exception as e:
        print(f"⚠️ Currency migration skipped: {e}")
    # Автоустановка Telegram webhook (локальная машина не имеет доступа к api.telegram.org)
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    webhook_url = os.getenv("WEBHOOK_URL")
    if bot_token and webhook_url:
        import asyncio
        import urllib.request
        import urllib.parse

        async def _set_webhook():
            try:
                data = urllib.parse.urlencode({
                    "url": webhook_url,
                    "allowed_updates": '["message", "pre_checkout_query"]',
                }).encode()
                req = urllib.request.Request(
                    f"https://api.telegram.org/bot{bot_token}/setWebhook", data=data)
                with urllib.request.urlopen(req, timeout=20) as resp:
                    print("📡 Telegram webhook:", resp.read().decode()[:200])
            except Exception as e:
                print("⚠️ Webhook setup failed:", e)

        asyncio.create_task(_set_webhook())

@app.get("/api/info")
async def root():
    return {
        "message": "Декор Инфо AI Designer API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

# === USER ENDPOINTS ===

@app.post("/api/check-subscription")
async def check_user_subscription(request: dict):
    """Check if user is subscribed to channel"""
    user_id = request.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    is_subscribed = await check_subscription(user_id)
    return {"is_subscribed": is_subscribed}

@app.get("/api/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by telegram_id"""
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/api/users")
async def create_user(request: dict, db: Session = Depends(get_db)):
    """Create new user"""
    telegram_id = request.get("telegram_id")
    username = request.get("username")
    first_name = request.get("first_name")
    
    if not telegram_id or not first_name:
        raise HTTPException(status_code=400, detail="telegram_id and first_name are required")
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if existing_user:
        return existing_user
    
    # Create new user (SPEC 4: стартовый бонус = 2 бесплатных дизайна Medium)
    user = User(
        telegram_id=telegram_id,
        username=username,
        first_name=first_name,
        credits=0,
        free_generations=STARTER_FREE_DESIGNS,
        tier="free",
        is_subscribed=False,
    )
    # Реферальный код: ?start=ref_<telegram_id> (SPEC 4)
    ref = request.get("ref")
    if ref:
        try:
            ref_id = int(str(ref).replace("ref_", ""))
            if ref_id != telegram_id:
                user.referred_by = ref_id
        except (ValueError, TypeError):
            pass
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

# === PHOTO UPLOAD ===

@app.post("/api/upload")
async def upload_photo(
    file: UploadFile = File(...),
    user_id: int = Form(None)
):
    """Upload photo for generation"""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG and WebP are supported")
    
    # Save file
    timestamp = int(datetime.now().timestamp())
    filename = f"{user_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOADS_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Optimize image
    optimized_path = ai_gen.optimize_image(file_path)
    
    return {
        "file_id": filename,
        "file_path": optimized_path
    }

# === AI GENERATION ===

STYLES = {
    "modern": {
        "name_ru": "Современный",
        "prompt": "modern minimalist interior, clean lines, neutral colors, contemporary furniture, bright natural lighting, white walls, wooden floor",
        "tier": "free",
        "category": "interior"
    },
    "scandinavian": {
        "name_ru": "Скандинавский",
        "prompt": "scandinavian interior design, cozy hygge style, natural materials, light wood furniture, white and pastel colors, soft textiles",
        "tier": "free",
        "category": "interior"
    },
    "loft": {
        "name_ru": "Лофт",
        "prompt": "industrial loft interior, exposed brick walls, metal pipes, concrete floor, vintage furniture, edison bulbs, urban style",
        "tier": "pro",
        "category": "interior"
    },
    "minimalism": {
        "name_ru": "Минимализм",
        "prompt": "pure minimalism interior, white walls, hidden storage, clean surfaces, minimal furniture, zen atmosphere, simple elegance",
        "tier": "pro",
        "category": "interior"
    },
    "classic": {
        "name_ru": "Классика",
        "prompt": "classic elegant interior, ornate moldings, crystal chandelier, antique furniture, rich fabrics, marble details, sophisticated style",
        "tier": "pro",
        "category": "interior"
    },
    "hightech": {
        "name_ru": "Хай-тек",
        "prompt": "high-tech futuristic interior, smart home technology, LED lighting, glass surfaces, chrome details, modern minimalism",
        "tier": "pro",
        "category": "interior"
    },
    "provence": {
        "name_ru": "Прованс",
        "prompt": "french provence interior, lavender colors, vintage furniture, floral patterns, shabby chic style, romantic atmosphere",
        "tier": "pro",
        "category": "interior"
    },
    "japanese": {
        "name_ru": "Японский",
        "prompt": "japanese zen interior, tatami mats, shoji screens, low furniture, natural materials, peaceful minimalism, harmony",
        "tier": "pro",
        "category": "interior"
    },
    "playground": {
        "name_ru": "Детская площадка",
        "prompt": "colorful kids playground, swing set, slides, climbing structures, safe soft ground, fun outdoor equipment, family friendly",
        "tier": "pro",
        "category": "outdoor"
    },
    "bbq": {
        "name_ru": "Гриль-зона",
        "prompt": "outdoor BBQ area, stone grill, dining table with benches, covered pergola, evening lighting, cozy gathering space",
        "tier": "pro",
        "category": "outdoor"
    },
    "pool": {
        "name_ru": "Бассейн",
        "prompt": "swimming pool with deck, sun loungers, pool tiles, surrounding landscape, umbrellas, summer relaxation area",
        "tier": "pro",
        "category": "outdoor"
    },
    "terrace": {
        "name_ru": "Терраса",
        "prompt": "wooden terrace deck, outdoor furniture, potted plants, comfortable seating, string lights, cozy outdoor living",
        "tier": "pro",
        "category": "outdoor"
    },
    "gazebo": {
        "name_ru": "Беседка",
        "prompt": "garden gazebo, climbing plants, wooden structure, comfortable seating, romantic atmosphere, peaceful retreat",
        "tier": "pro",
        "category": "outdoor"
    },
    "greenhouse": {
        "name_ru": "Теплица",
        "prompt": "modern greenhouse, organized plant shelves, glass structure, growing vegetables, garden tools, functional design",
        "tier": "pro",
        "category": "outdoor"
    },
    "vegetable_garden": {
        "name_ru": "Огород",
        "prompt": "organized vegetable garden, raised beds, neat rows of plants, garden paths, healthy vegetables, productive garden",
        "tier": "pro",
        "category": "outdoor"
    },
    "landscape": {
        "name_ru": "Ландшафт",
        "prompt": "beautiful landscape design, curved paths, variety of plants, decorative trees, garden lighting, harmonious composition",
        "tier": "pro",
        "category": "outdoor"
    },
    "patio": {
        "name_ru": "Патио",
        "prompt": "cozy patio area, stone paving, outdoor furniture, plants in pots, morning coffee spot, relaxing atmosphere",
        "tier": "pro",
        "category": "outdoor"
    },
    "pergola": {
        "name_ru": "Пергола",
        "prompt": "elegant pergola, climbing vines, shaded seating area, wooden beams, romantic garden feature, outdoor dining",
        "tier": "pro",
        "category": "outdoor"
    },
    # Виртуальные стили для режимов (промпт подставляется в генераторе по mode)
    "empty_room": {
        "name_ru": "Пустая комната",
        "prompt": "",  # используется EMPTY_ROOM_PROMPT из ai_generator
        "tier": "pro",
        "category": "interior"
    },
    "empty_furnish_base": {
        "name_ru": "Обставить комнату",
        "prompt": "",  # furnish-промпт собирается в генераторе
        "tier": "pro",
        "category": "interior"
    }
}

async def process_generation(task_id: str, file_path: str, style_prompt: str,
                             tier: str, generation_id: int, db_session,
                             mode: str = "style"):
    """Background task to process AI generation via anymodel.org"""
    try:
        generation_tasks[task_id] = {"status": "processing", "progress": 0}
        
        # Generate image (anymodel: gemini / gpt-image-2)
        # Синхронный urllib блокировал бы event loop -> гоняем в отдельном потоке
        import asyncio
        loop = asyncio.get_running_loop()
        result_path, processing_time = await loop.run_in_executor(
            None,
            lambda: ai_gen.generate_interior(
                file_path, style_prompt, tier, mode)
        )
        
        # Serve the result statically
        result_filename = os.path.basename(result_path)
        result_url = f"/results/{result_filename}"
        
        # Превью 400×300 webp для истории/главной (SPEC 1.2)
        preview_url = None
        try:
            prev_path = ai_gen.make_preview(result_path)
            if prev_path:
                preview_url = f"/results/{os.path.basename(prev_path)}"
        except Exception as e:
            print(f"Preview generation failed: {e}")
        
        # Update database
        generation = db_session.query(Generation).filter(Generation.id == generation_id).first()
        if generation:
            generation.result_image_url = result_url
            generation.preview_url = preview_url
            generation.processing_time = processing_time
            generation.status = "completed"
            db_session.commit()
            # Реферальный бонус (SPEC 4): +10 кредитов пригласившему после ПЕРВОЙ генерации друга
            try:
                gen_user = db_session.query(User).filter(User.telegram_id == generation.user_id).first()
                if gen_user and gen_user.referred_by:
                    first_gen_count = db_session.query(Generation).filter(
                        Generation.user_id == gen_user.telegram_id,
                        Generation.status == "completed",
                    ).count()
                    if first_gen_count == 1:
                        referrer = db_session.query(User).filter(
                            User.telegram_id == gen_user.referred_by).first()
                        if referrer:
                            referrer.credits = (referrer.credits or 0) + BONUS_REWARDS["invite_friend"]
                            db_session.commit()
                            print(f"🎁 Реферальный бонус +{BONUS_REWARDS['invite_friend']} кредитов → {referrer.telegram_id}")
            except Exception as e:
                print(f"Referral bonus error: {e}")
        
        generation_tasks[task_id] = {
            "status": "completed",
            "result_url": result_url,
            "preview_url": preview_url,
        }
        
    except Exception as e:
        print(f"Generation error: {str(e)}")
        generation_tasks[task_id] = {
            "status": "failed",
            "error": str(e)
        }
        
        # Update database + возврат списания (SPEC 4: за неудачную генерацию +3 кредита)
        generation = db_session.query(Generation).filter(Generation.id == generation_id).first()
        if generation:
            generation.status = "failed"
            generation.error_message = str(e)
            user = db_session.query(User).filter(User.telegram_id == generation.user_id).first()
            if user and (generation.cost_stars or 0) > 0:
                # платная генерация упала: вернуть стоимость + бонус 3 кредита
                user.credits = (user.credits or 0) + generation.cost_stars + FAILED_GEN_REFUND
            db_session.commit()


# === Экономика по SPEC_decor_ai (28.08) + правка Андрея: стартовый бонус = 2 бесплатных дизайна ===
# Валюты: ⭐ — внешняя (платят), кредиты — внутренняя (пользуются). Слово «звёзды» — только на экране оплаты.
DESIGN_COST = 5          # базовая генерация Medium — 5 кредитов
HD_COST = 15             # «Улучшить в HD» (GPT Image 2) — 15 кредитов
VARIATIONS_COST = 10     # «Ещё 3 варианта» (Medium ×3) — 10 кредитов
EDIT_OBJECT_COST = 5     # «Изменить деталь» — 5 кредитов
FINAL_RENDER_COST = 5    # черновик (Low) → финальный рендер (Medium) — 5 кредитов

# Бесплатные лимиты (SPEC 4): первые 2 дизайна Medium без вотермарки (решение Андрея),
# далее 2 черновика Low в день с вотермаркой, потолок 30/мес, аккаунты <7 дней — 1/день.
STARTER_FREE_DESIGNS = 2
DAILY_FREE_LIMIT = 2
DAILY_FREE_LIMIT_NEW_ACCOUNT = 1   # возраст аккаунта < 7 дней
MONTHLY_FREE_CAP = 30

# Пакеты и подписки (SPEC 4): цена в ⭐, начисление в кредитах
PACKS = {
    "pack_s":      {"credits": 60,  "price": 60,  "title": "60 кредитов",
                    "desc": "12 дизайнов Medium", "badge": None, "kind": "pack"},
    "pack_m":      {"credits": 200, "price": 160, "title": "200 кредитов −20%",
                    "desc": "40 дизайнов Medium", "badge": "Выгодно", "kind": "pack"},
    "sub_pro":     {"credits": 0,   "price": 149, "title": "PRO · 149 ⭐/мес",
                    "desc": "40 Medium + 200 черновиков Low", "badge": "Популярный", "kind": "sub",
                    "quota": {"medium": 40, "low": 200, "hd": 0}},
    "sub_premium": {"credits": 0,   "price": 299, "title": "PREMIUM · 299 ⭐/мес",
                    "desc": "20 HD + 50 Medium + 250 Low", "badge": "Лучшая цена за дизайн", "kind": "sub",
                    "quota": {"medium": 50, "low": 250, "hd": 20}},
}
PACK_ORDER = ["pack_s", "pack_m", "sub_pro", "sub_premium"]

# Бонусы (SPEC 4): друг +10 кредитов после первой генерации приглашённого (макс 5/мес),
# канал +5 разово, возврат при неудачной генерации.
BONUS_REWARDS = {
    "invite_friend": 10,
    "subscribe_channel": 5,
}
FRIEND_BONUS_MONTHLY_CAP = 5
FAILED_GEN_REFUND = 3


def _today_str() -> str:
    from datetime import date
    return date.today().isoformat()


def _month_str() -> str:
    from datetime import date
    return date.today().strftime("%Y-%m")


def _account_age_days(user) -> int:
    if not user.created_at:
        return 999
    try:
        return (datetime.utcnow() - user.created_at.replace(tzinfo=None)).days
    except Exception:
        return 999


def _daily_free_left(user) -> int:
    """Сколько бесплатных черновиков осталось сегодня."""
    limit = DAILY_FREE_LIMIT if _account_age_days(user) >= 7 else DAILY_FREE_LIMIT_NEW_ACCOUNT
    if user.daily_free_date != _today_str():
        return limit
    return max(0, limit - (user.daily_free_used or 0))


def _monthly_free_left(user) -> int:
    if user.monthly_free_month != _month_str():
        return MONTHLY_FREE_CAP
    return max(0, MONTHLY_FREE_CAP - (user.monthly_free_used or 0))


def _use_daily_free(user):
    if user.daily_free_date != _today_str():
        user.daily_free_date = _today_str()
        user.daily_free_used = 0
    user.daily_free_used = (user.daily_free_used or 0) + 1
    if user.monthly_free_month != _month_str():
        user.monthly_free_month = _month_str()
        user.monthly_free_used = 0
    user.monthly_free_used = (user.monthly_free_used or 0) + 1


def _sub_active(user) -> bool:
    if user.tier in ("pro", "premium") and user.tier_expires_at:
        try:
            exp = user.tier_expires_at.replace(tzinfo=None) if user.tier_expires_at.tzinfo else user.tier_expires_at
            return exp > datetime.utcnow()
        except Exception:
            return False
    return False


def _charge_for_design(user) -> tuple[str, str]:
    """
    Списывает оплату за дизайн. Возвращает (charge_type, engine_tier).
    charge_type: 'free' (стартовые 2 Medium) | 'free_draft' (дневной Low-черновик)
               | 'quota' (из подписки) | 'credits' (5 кредитов, Medium).
    Маршрутизация моделей — SPEC 5. Бросает 402, если платить нечем.
    """
    # 1) Стартовый бонус: 2 бесплатных дизайна Medium без вотермарки (решение Андрея)
    if user.free_generations and user.free_generations > 0:
        user.free_generations -= 1
        if not user.starter_bonus_granted_at:
            user.starter_bonus_granted_at = datetime.utcnow()
        return "free", "premium"  # Medium

    # 2) Квота подписки: сначала Medium, потом Low-черновики
    if _sub_active(user):
        if (user.quota_medium or 0) > 0:
            user.quota_medium -= 1
            return "quota", "premium"  # Medium
        if (user.quota_low or 0) > 0:
            user.quota_low -= 1
            return "quota", "free_low"  # Low + вотермарка

    # 3) Ежедневные бесплатные черновики Low (2/день, потолок 30/мес)
    if _daily_free_left(user) > 0 and _monthly_free_left(user) > 0:
        _use_daily_free(user)
        return "free_draft", "free_low"  # Low + вотермарка

    # 4) Кредиты: 5 кредитов = Medium
    if (user.credits or 0) >= DESIGN_COST:
        user.credits -= DESIGN_COST
        return "credits", "premium"  # Medium

    raise HTTPException(
        status_code=402,
        detail="Не хватает кредитов. Пополните баланс — пакеты от 60 ⭐"
    )


def _refund_design(user, charge_type: str, engine_tier: str):
    """Возврат списания при ошибке запуска."""
    if charge_type == "free":
        user.free_generations = (user.free_generations or 0) + 1
    elif charge_type == "free_draft":
        user.daily_free_used = max(0, (user.daily_free_used or 1) - 1)
        user.monthly_free_used = max(0, (user.monthly_free_used or 1) - 1)
    elif charge_type == "quota":
        if engine_tier == "free_low":
            user.quota_low = (user.quota_low or 0) + 1
        else:
            user.quota_medium = (user.quota_medium or 0) + 1
    else:
        user.credits = (user.credits or 0) + DESIGN_COST


def _today_count(db, user_id: int) -> int:
    """Сколько генераций юзер сделал сегодня."""
    from datetime import date
    today_start = datetime.combine(date.today(), datetime.min.time())
    return db.query(Generation).filter(
        Generation.user_id == user_id,
        Generation.created_at >= today_start,
        Generation.status.in_(["pending", "processing", "completed"]),
    ).count()

@app.post("/api/generate")
async def generate_design(
    request: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Start AI design generation. SPEC 5: free (2 Medium новичку) / free_draft (Low) / quota / credits."""
    user_id = request.get("user_id")
    file_id = request.get("file_id")
    style_id = request.get("style_id")
    mode = request.get("mode", "style")  # style | empty | furnish
    
    if not all([user_id, file_id, style_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    if mode not in ("style", "empty", "furnish"):
        raise HTTPException(status_code=400, detail="Invalid mode")
    
    # Get style prompt (для empty — стиль не нужен, берём EMPTY_ROOM_PROMPT внутри генератора)
    style = STYLES.get(style_id)
    if not style:
        raise HTTPException(status_code=400, detail="Invalid style_id")
    
    # Get user
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Оплата и маршрутизация модели (SPEC 5)
    charge_type, engine_tier = _charge_for_design(user)
    db.commit()
    
    # Create generation record
    generation = Generation(
        user_id=user_id,
        original_image_url=file_id,
        style_id=style_id,
        category=style["category"],
        cost_stars=DESIGN_COST if charge_type == "credits" else 0,
        kind="design",
        quality="low" if engine_tier == "free_low" else "medium",
        status="pending"
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)
    
    # Generate task ID
    task_id = f"{user_id}_{generation.id}"
    
    # Get file path (может быть _opt версией)
    file_path = os.path.join(UPLOADS_DIR, file_id)
    if not os.path.exists(file_path):
        opt_path = file_path.rsplit(".", 1)[0] + "_opt.jpg"
        if os.path.exists(opt_path):
            file_path = opt_path
        else:
            _refund_design(user, charge_type, engine_tier)
            db.commit()
            raise HTTPException(status_code=404, detail="Uploaded file not found")
    
    # Start background generation
    background_tasks.add_task(
        process_generation,
        task_id,
        file_path,
        style["prompt"],
        engine_tier,
        generation.id,
        db,
        mode
    )
    
    return {
        "task_id": task_id,
        "charge": charge_type,
        "quality": "low" if engine_tier == "free_low" else "medium",
        "credits_left": user.credits or 0,
        "free_left": user.free_generations or 0,
        "daily_free_left": _daily_free_left(user),
        # совместимость со старым фронтом
        "stars_left": user.credits or 0,
    }

@app.post("/api/enhance-hd/{generation_id}")
async def enhance_hd(generation_id: int, request: dict,
                     background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Апселл после результата: улучшить детали в HD — 15 кредитов. Рерайт той же комнаты gpt-image-2 (SPEC 5)."""
    user_id = request.get("user_id")
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    src = db.query(Generation).filter(
        Generation.id == generation_id, Generation.user_id == user_id,
        Generation.status == "completed").first()
    if not src or not src.result_image_url:
        raise HTTPException(status_code=404, detail="Исходная генерация не найдена")
    
    # HD из квоты PREMIUM — бесплатно (SPEC 5)
    from_quota = False
    if _sub_active(user) and user.tier == "premium" and (user.quota_hd or 0) > 0:
        user.quota_hd -= 1
        from_quota = True
    else:
        if (user.credits or 0) < HD_COST:
            raise HTTPException(status_code=402, detail=f"Нужно {HD_COST} кредитов, на балансе {user.credits or 0}")
        user.credits -= HD_COST
    db.commit()
    
    result_file = src.result_image_url.replace("/results/", "")
    result_path = os.path.join(RESULTS_DIR, result_file)
    if not os.path.exists(result_path):
        if from_quota:
            user.quota_hd = (user.quota_hd or 0) + 1
        else:
            user.credits = (user.credits or 0) + HD_COST
        db.commit()
        raise HTTPException(status_code=404, detail="Файл результата не найден")
    
    generation = Generation(
        user_id=user_id,
        original_image_url=result_file,
        style_id=src.style_id,
        category=src.category,
        cost_stars=0 if from_quota else HD_COST,
        kind="enhance_hd",
        quality="hd",
        parent_id=src.id,
        status="pending"
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)
    
    task_id = f"{user_id}_{generation.id}"
    background_tasks.add_task(
        process_generation,
        task_id,
        result_path,
        "Enhance this interior design photo: increase sharpness and micro-detail, refine textures and lighting, keep composition, colors and all objects exactly the same. Photorealistic high definition.",
        "premium_pro",  # gpt-image-2
        generation.id,
        db,
        "enhance",
    )
    return {"task_id": task_id, "cost": 0 if from_quota else HD_COST,
            "credits_left": user.credits or 0, "stars_left": user.credits or 0}

@app.post("/api/variations/{generation_id}")
async def make_variations(generation_id: int, request: dict,
                          background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Апселл: ещё 3 варианта этого стиля — 10 кредитов (Medium ×3, SPEC 5)."""
    user_id = request.get("user_id")
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    src = db.query(Generation).filter(
        Generation.id == generation_id, Generation.user_id == user_id,
        Generation.status == "completed").first()
    if not src:
        raise HTTPException(status_code=404, detail="Исходная генерация не найдена")
    
    if (user.credits or 0) < VARIATIONS_COST:
        raise HTTPException(status_code=402, detail=f"Нужно {VARIATIONS_COST} кредитов, на балансе {user.credits or 0}")
    user.credits -= VARIATIONS_COST
    db.commit()
    
    original_file = src.original_image_url
    original_path = os.path.join(UPLOADS_DIR, original_file)
    if not os.path.exists(original_path):
        alt = original_path.rsplit(".", 1)[0] + "_opt.jpg"
        if os.path.exists(alt):
            original_path = alt
        else:
            user.credits = (user.credits or 0) + VARIATIONS_COST
            db.commit()
            raise HTTPException(status_code=404, detail="Исходное фото не найдено")
    
    style = STYLES.get(src.style_id, {})
    style_prompt = style.get("prompt", "modern interior design")
    tasks = []
    for i in range(3):
        generation = Generation(
            user_id=user_id,
            original_image_url=original_file,
            style_id=src.style_id,
            category=src.category,
            cost_stars=VARIATIONS_COST // 3,
            kind="variations",
            quality="medium",
            parent_id=src.id,
            status="pending"
        )
        db.add(generation)
        db.commit()
        db.refresh(generation)
        task_id = f"{user_id}_{generation.id}"
        seed_hint = f" Variation {i+1}: vary furniture arrangement, decor accents and camera angle slightly while keeping the same room."
        background_tasks.add_task(
            process_generation,
            task_id,
            original_path,
            f"{style_prompt}.{seed_hint} Keep the room structure, windows and layout unchanged.",
            "premium",  # Medium (SPEC 5)
            generation.id,
            db,
            "style",
        )
        tasks.append(task_id)
    return {"task_ids": tasks, "cost": VARIATIONS_COST,
            "credits_left": user.credits or 0, "stars_left": user.credits or 0}

@app.get("/api/generate/{task_id}")
async def get_generation_status(task_id: str):
    """Check generation status"""
    if task_id not in generation_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return generation_tasks[task_id]

@app.get("/api/users/{user_id}/generations")
async def get_user_generations(user_id: int, db: Session = Depends(get_db)):
    """Get user's generation history"""
    generations = db.query(Generation).filter(
        Generation.user_id == user_id,
        Generation.status == "completed"
    ).order_by(Generation.created_at.desc()).all()
    
    return generations

@app.post("/api/bonus")
async def claim_bonus(request: dict, db: Session = Depends(get_db)):
    """Бонусы (SPEC 4): invite_friend +10 кредитов (макс 5/мес), subscribe_channel +5 разово."""
    user_id = request.get("user_id")
    action = request.get("action")
    if not user_id or action not in BONUS_REWARDS:
        raise HTTPException(status_code=400, detail="user_id and valid action required")
    
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    marker = f"bonus:{action}"
    
    if action == "subscribe_channel":
        # Разовый бонус: реальная проверка подписки при каждом запуске (SPEC 4)
        already = db.query(Payment).filter(
            Payment.user_id == user_id, Payment.product == marker).first()
        if already:
            raise HTTPException(status_code=409, detail="Бонус уже получен")
        is_sub = await check_subscription(user_id)
        if not is_sub:
            raise HTTPException(status_code=403, detail="Сначала подпишитесь на канал @stroitelinfo")
        user.is_subscribed = True
    elif action == "invite_friend":
        # Максимум 5 друзей в месяц (SPEC 4)
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        count_this_month = db.query(Payment).filter(
            Payment.user_id == user_id,
            Payment.product == marker,
            Payment.created_at >= month_start,
        ).count()
        if count_this_month >= FRIEND_BONUS_MONTHLY_CAP:
            raise HTTPException(status_code=409, detail="Лимит: 5 друзей в месяц")
    
    user.credits = (user.credits or 0) + BONUS_REWARDS[action]
    db.add(Payment(
        user_id=user_id,
        telegram_payment_charge_id=f"bonus-{action}-{user_id}-{int(datetime.now().timestamp())}",
        product=marker,
        stars_paid=0,
        status="completed",
    ))
    db.commit()
    return {"ok": True, "reward": BONUS_REWARDS[action],
            "credits_left": user.credits or 0, "stars_left": user.credits or 0}

@app.get("/api/packs")
async def list_packs():
    """Каталог пакетов и подписок для шторки пополнения (SPEC 4)."""
    return {
        "order": PACK_ORDER,
        "packs": {pid: PACKS[pid] for pid in PACK_ORDER},
        "design_cost": DESIGN_COST,
        "hd_cost": HD_COST,
        "variations_cost": VARIATIONS_COST,
        "note": "Купленные кредиты не сгорают. Квота подписки обновляется ежемесячно, переносится максимум на 2 месяца.",
    }

@app.post("/api/buy")
async def create_invoice(request: dict):
    """Create invoice for pack/subscription (pack_s | pack_m | sub_pro | sub_premium)."""
    user_id = request.get("user_id")
    pack_id = request.get("pack", "pack_s")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    if pack_id not in PACKS:
        raise HTTPException(status_code=400, detail=f"Unknown pack: {pack_id}")
    pack = PACKS[pack_id]
    title, description, amount = pack["title"], pack["desc"], pack["price"]
    
    payload = json.dumps({
        "user_id": user_id,
        "product": pack_id,
        "timestamp": int(datetime.now().timestamp())
    })
    
    try:
        invoice_url = await create_invoice_link(
            title=title,
            description=description,
            payload=payload,
            currency="XTR",  # Telegram Stars
            prices=[{
                "label": title,
                "amount": amount
            }]
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
    
    return {"invoice_url": invoice_url}

@app.post("/api/telegram-webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Telegram webhook for payments"""
    update = await request.json()
    
    # Pre-checkout query (approve payment)
    if "pre_checkout_query" in update:
        pre_checkout_query = update["pre_checkout_query"]
        await bot.answer_pre_checkout_query(
            pre_checkout_query_id=pre_checkout_query["id"],
            ok=True
        )
        return {"ok": True}
    
    # Successful payment
    if "message" in update and "successful_payment" in update["message"]:
        payment_data = update["message"]["successful_payment"]
        user_id = update["message"]["from"]["id"]
        payload = json.loads(payment_data["invoice_payload"])
        
        # Store payment
        payment = Payment(
            user_id=user_id,
            telegram_payment_charge_id=payment_data["telegram_payment_charge_id"],
            product=payload["product"],
            stars_paid=payment_data["total_amount"],
            status="completed"
        )
        db.add(payment)
        
        # Зачисление по купленному пакету/подписке (SPEC 4)
        user = db.query(User).filter(User.telegram_id == user_id).first()
        credited_desc = payload["product"]
        if user:
            pack = PACKS.get(payload["product"])
            if pack:
                if pack["kind"] == "pack":
                    user.credits = (user.credits or 0) + pack["credits"]
                    credited_desc = f"{pack['credits']} кредитов"
                else:  # подписка
                    tier = "pro" if payload["product"] == "sub_pro" else "premium"
                    user.tier = tier
                    user.tier_expires_at = datetime.utcnow() + timedelta(days=30)
                    q = pack["quota"]
                    user.quota_medium = q["medium"]
                    user.quota_low = q["low"]
                    user.quota_hd = q["hd"]
                    credited_desc = f"Подписка {tier.upper()} на 30 дней"
        
        db.commit()
        
        # Send confirmation
        await send_message(
            user_id,
            f"✅ Оплата прошла успешно!\n\n"
            f"Зачислено: {credited_desc}\n"
            f"Баланс: {user.credits if user else '?'} кредитов\n"
            f"Receipt ID: `{payment_data['telegram_payment_charge_id']}`",
            parse_mode="Markdown"
        )
        
        return {"ok": True}
    
    # /paysupport command
    if "message" in update and update["message"].get("text") == "/paysupport":
        user_id = update["message"]["from"]["id"]
        await send_message(
            user_id,
            "🛟 По вопросам оплаты обращайтесь: @stroitelinfo"
        )
        return {"ok": True}
    
    return {"ok": True}


# === SPA frontend (Docker-деплой): раздаём собранный Vite dist ===
from fastapi.staticfiles import StaticFiles as _SF

_DIST = "/app/static_dist"
if os.path.isdir(_DIST):
    app.mount("/assets", _SF(directory=os.path.join(_DIST, "assets")), name="spa-assets")

    @app.get("/")
    async def spa_index():
        from fastapi.responses import FileResponse
        return FileResponse(os.path.join(_DIST, "index.html"))

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        from fastapi.responses import FileResponse
        candidate = os.path.join(_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_DIST, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
