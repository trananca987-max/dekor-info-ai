"""Декор Инфо AI Designer — backend (PATCH v2.2).

Все лимиты, цены и списания проверяются на сервере; клиент только отображает.
Экономика — в economy.py, каталог стилей/задач — в catalog.py.

Изменения v2.2:
- Удалена механика генерации по примеру и флаг example_gen_used (§9).
- Первая генерация пользователя по своему фото — Medium без вотермарки,
  за счёт стартовых кредитов (§5).
- Пакеты 50/250/150/350, разовые и подписки разделены (§6).
- Каталог: 22 стиля (A/B) + 5 задач, у «Сада» 4 направления (§2).
- Новые тексты баланса и уведомлений (§7.1, §7.5, §8).
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import shutil
import json
from dotenv import load_dotenv

from .database import get_db, init_db, SessionLocal, engine
from .models import User, Generation, Payment, UserPhotoHash, AnalyticsEvent
from .ai_generator import AIGenerator
from .telegram_helper import check_subscription, send_message, create_invoice_link, bot
from . import economy as eco
from .catalog import JOBS, JOB_ORDER, STYLES, GARDEN_DIRECTIONS, display_name
from .imghash import phash, is_same

load_dotenv()

app = FastAPI(title="Декор Инфо AI Designer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_gen = AIGenerator()
init_db()

DATA_DIR = os.getenv("DATA_DIR", ".")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
RESULTS_DIR = os.path.join(DATA_DIR, "results")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

from fastapi.staticfiles import StaticFiles
app.mount("/results", StaticFiles(directory=RESULTS_DIR), name="results")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

generation_tasks = {}


@app.on_event("startup")
async def startup_event():
    print("🚀 Декор Инфо AI Designer API started! (PATCH v2.2)")
    # --- Миграция схемы: колонки SPEC v2.0 (остаются валидными в v2.2) ---
    try:
        from sqlalchemy import inspect, text
        insp = inspect(engine)
        want_users = {
            "credits_paid": "INTEGER DEFAULT 0",
            "credits_free_daily": "INTEGER DEFAULT 0",
            "free_daily_date": "VARCHAR",
            "free_week_date": "VARCHAR",
            "starter_grant_given": "BOOLEAN DEFAULT 0",
            "example_gen_used": "BOOLEAN DEFAULT 0",  # legacy: механика удалена (§9), колонка остаётся
            "has_ever_paid": "BOOLEAN DEFAULT 0",
            "first_seen_at": "DATETIME",
            "timezone": "VARCHAR DEFAULT 'Europe/Moscow'",
            "day6_notified_at": "DATETIME",
        }
        want_gens = {
            "wallet": "VARCHAR",
            "job_id": "VARCHAR",
            "room_type": "VARCHAR",
            "palette_id": "VARCHAR",
            "photo_hash": "VARCHAR",
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

    # --- Миграция валют SPEC 1.x → v2.x: credits/stars → credits_paid ---
    try:
        db = SessionLocal()
        migrated = 0
        for u in db.query(User).all():
            changed = False
            legacy = (u.credits or 0) + (u.stars or 0)
            if legacy > 0:
                u.credits_paid = (u.credits_paid or 0) + legacy
                u.credits = 0
                u.stars = 0
                changed = True
            if not u.starter_grant_given:
                eco.grant_starter(u)
                changed = True
                migrated += 1
            if changed:
                db.commit()
        if migrated:
            print(f"🎁 Стартовый грант {eco.STARTER_GRANT} кредитов: {migrated} юзеров")
        db.close()
    except Exception as e:
        print(f"⚠️ Currency migration skipped: {e}")

    # --- Webhook ---
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
    return {"message": "Декор Инфо AI Designer API", "version": "2.2.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# === АНАЛИТИКА ===

@app.post("/api/event")
async def log_event(request: dict, db: Session = Depends(get_db)):
    """Клиентские события: app_open, viewport_ok, style_selected, generation_started, ..."""
    user_id = request.get("user_id")
    event = request.get("event")
    if not event:
        raise HTTPException(status_code=400, detail="event is required")
    db.add(AnalyticsEvent(
        user_id=user_id,
        event=str(event)[:64],
        payload=json.dumps(request.get("payload") or {}, ensure_ascii=False)[:2000],
    ))
    db.commit()
    return {"ok": True}


def _notify_day6(user, db):
    """Уведомление на 6-й день пробной недели — однократно (§8, дословно)."""
    try:
        if user.day6_notified_at:
            return
        if eco.account_age_days(user) == 5:  # день 6 (день регистрации = день 1)
            user.day6_notified_at = datetime.utcnow()
            db.commit()
            import asyncio
            asyncio.create_task(send_message(
                user.telegram_id,
                "Завтра заканчивается пробная неделя — 10 бесплатных дизайнов в день. "
                "Дальше 2 в неделю, полный доступ от 50 ⭐",
            ))
    except Exception as e:
        print(f"day6 notify error: {e}")


# === USER ENDPOINTS ===

@app.post("/api/check-subscription")
async def check_user_subscription(request: dict):
    user_id = request.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    is_subscribed = await check_subscription(user_id)
    return {"is_subscribed": is_subscribed}


def _user_response(user, db) -> dict:
    """Публичный профиль: кошельки + строки баланса (§7.1, §7.5)."""
    eco.ensure_daily_wallet(user)
    _notify_day6(user, db)
    db.commit()
    bal = eco.balance_line(user)
    return {
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "credits_paid": user.credits_paid or 0,
        "credits_free_daily": user.credits_free_daily or 0,
        # §7.1: нейтральная строка главного экрана, без слов «кредит»/«черновик»
        "balance_line": bal["line"],
        # §7.5: верхняя строка шита пополнения — текущее состояние
        "sheet_line": bal["sheet_line"],
        "balance_state": bal["state"],
        "exhausted": bal["exhausted"],
        "trial_days_left": bal["trial_days_left"],
        "tier": user.tier or "free",
        "quota_medium": user.quota_medium or 0,
        "quota_low": user.quota_low or 0,
        "quota_hd": user.quota_hd or 0,
        "is_subscribed": bool(user.is_subscribed),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        # совместимость со старым фронтом
        "credits": user.credits_paid or 0,
        "free_generations": 0,
    }


@app.get("/api/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_response(user, db)


@app.post("/api/users")
async def create_user(request: dict, db: Session = Depends(get_db)):
    telegram_id = request.get("telegram_id")
    username = request.get("username")
    first_name = request.get("first_name")
    if not telegram_id or not first_name:
        raise HTTPException(status_code=400, detail="telegram_id and first_name are required")

    existing = db.query(User).filter(User.telegram_id == telegram_id).first()
    if existing:
        return _user_response(existing, db)

    user = User(
        telegram_id=telegram_id,
        username=username,
        first_name=first_name,
        tier="free",
        is_subscribed=False,
        first_seen_at=datetime.utcnow(),
        timezone=request.get("timezone") or "Europe/Moscow",
    )
    ref = request.get("ref")
    if ref:
        try:
            ref_id = int(str(ref).replace("ref_", ""))
            if ref_id != telegram_id:
                user.referred_by = ref_id
        except (ValueError, TypeError):
            pass
    db.add(user)
    db.flush()
    # Стартовый грант: 15 кредитов, один раз, идемпотентно (§5)
    eco.grant_starter(user)
    db.commit()
    db.refresh(user)
    return _user_response(user, db)


# === КАТАЛОГ (§2): 22 стиля + 5 задач ===

@app.get("/api/catalog")
async def catalog():
    return {
        "styles": {sid: {"title": s["title"], "tier": s["tier"]} for sid, s in STYLES.items()},
        "jobs": {jid: {"title": j["title"]} for jid, j in JOBS.items()},
        "job_order": JOB_ORDER,
        "garden_directions": {gid: {"title": g["title"]} for gid, g in GARDEN_DIRECTIONS.items()},
        "costs": {"low": eco.COST_LOW, "medium": eco.COST_MEDIUM,
                  "hd": eco.COST_HD, "variations": eco.COST_VARIATIONS},
    }


@app.get("/api/packs")
async def list_packs():
    """Каталог пакетов для шторки пополнения (§6)."""
    return {
        "order": eco.PACK_ORDER,
        "packs": {pid: eco.PACKS[pid] for pid in eco.PACK_ORDER},
        "design_cost": eco.COST_MEDIUM,
        "hd_cost": eco.COST_HD,
        "variations_cost": eco.COST_VARIATIONS,
    }


# === PHOTO UPLOAD ===

@app.post("/api/upload")
async def upload_photo(file: UploadFile = File(...), user_id: int = Form(None)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG and WebP are supported")

    timestamp = int(datetime.now().timestamp())
    filename = f"{user_id}_{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOADS_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    optimized_path = ai_gen.optimize_image(file_path)

    # Перцептивный хеш для анти-абуза (§5)
    h = ""
    try:
        with open(optimized_path, "rb") as f:
            h = phash(f.read())
    except Exception:
        pass

    return {"file_id": filename, "file_path": optimized_path, "phash": h}

# === СПИСАНИЯ (§5): единственный источник истины — сервер ===

def _charge(user, quality: str, db) -> tuple:
    """
    Списывает оплату за генерацию. Возвращает (wallet, engine_tier, cost).
    wallet: 'free_daily' | 'quota' | 'paid' — куда возвращать при ошибке.

    Правила (§5): credits_free_daily тратится ТОЛЬКО на Low,
    на Medium и HD не применяется даже как частичная доплата.
    """
    eco.ensure_daily_wallet(user)

    if quality == "low":
        if eco.sub_active(user) and (user.quota_low or 0) > 0:
            user.quota_low -= 1
            return "quota", "free_low", 0
        if (user.credits_free_daily or 0) >= eco.COST_LOW:
            user.credits_free_daily -= eco.COST_LOW
            return "free_daily", "free_low", eco.COST_LOW
        if (user.credits_paid or 0) >= eco.COST_LOW:
            user.credits_paid -= eco.COST_LOW
            return "paid", "free_low", eco.COST_LOW
        raise HTTPException(status_code=402, detail="Не хватает кредитов. Пополните баланс")

    if quality == "medium":
        if eco.sub_active(user) and (user.quota_medium or 0) > 0:
            user.quota_medium -= 1
            return "quota", "premium", 0
        if (user.credits_paid or 0) >= eco.COST_MEDIUM:
            user.credits_paid -= eco.COST_MEDIUM
            return "paid", "premium", eco.COST_MEDIUM
        raise HTTPException(
            status_code=402,
            detail=f"Нужно {eco.COST_MEDIUM} кредитов. Пополните баланс")

    if quality == "hd":
        if eco.sub_active(user) and user.tier == "premium" and (user.quota_hd or 0) > 0:
            user.quota_hd -= 1
            return "quota", "premium_pro", 0
        if (user.credits_paid or 0) >= eco.COST_HD:
            user.credits_paid -= eco.COST_HD
            return "paid", "premium_pro", eco.COST_HD
        raise HTTPException(
            status_code=402,
            detail=f"Нужно {eco.COST_HD} кредитов. Пополните баланс")

    raise HTTPException(status_code=400, detail="Invalid quality")


def _refund(user, wallet: str, cost: int, quality: str):
    """Возврат на тот кошелёк, с которого списано (§7.5)."""
    if wallet == "free_daily":
        user.credits_free_daily = (user.credits_free_daily or 0) + cost
    elif wallet == "paid":
        user.credits_paid = (user.credits_paid or 0) + cost
    elif wallet == "quota":
        if quality == "low":
            user.quota_low = (user.quota_low or 0) + 1
        elif quality == "hd":
            user.quota_hd = (user.quota_hd or 0) + 1
        else:
            user.quota_medium = (user.quota_medium or 0) + 1


async def process_generation(task_id: str, file_path: str, style_prompt: str,
                             engine_tier: str, generation_id: int, db_session,
                             mode: str = "style"):
    """Background: генерация через anymodel.org."""
    try:
        generation_tasks[task_id] = {"status": "processing", "progress": 0}
        import asyncio
        loop = asyncio.get_running_loop()
        result_path, processing_time = await loop.run_in_executor(
            None,
            lambda: ai_gen.generate_interior(file_path, style_prompt, engine_tier, mode))

        result_filename = os.path.basename(result_path)
        result_url = f"/results/{result_filename}"

        preview_url = None
        try:
            prev_path = ai_gen.make_preview(result_path)
            if prev_path:
                preview_url = f"/results/{os.path.basename(prev_path)}"
        except Exception as e:
            print(f"Preview generation failed: {e}")

        generation = db_session.query(Generation).filter(Generation.id == generation_id).first()
        if generation:
            generation.result_image_url = result_url
            generation.preview_url = preview_url
            generation.processing_time = processing_time
            generation.status = "completed"
            db_session.commit()
            # Реферальный бонус: +10 кредитов пригласившему после ПЕРВОЙ генерации друга
            try:
                gen_user = db_session.query(User).filter(
                    User.telegram_id == generation.user_id).first()
                if gen_user and gen_user.referred_by:
                    first_gen_count = db_session.query(Generation).filter(
                        Generation.user_id == gen_user.telegram_id,
                        Generation.status == "completed").count()
                    if first_gen_count == 1:
                        referrer = db_session.query(User).filter(
                            User.telegram_id == gen_user.referred_by).first()
                        if referrer:
                            referrer.credits_paid = (referrer.credits_paid or 0) + \
                                eco.BONUS_REWARDS["invite_friend"]
                            db_session.commit()
                            print(f"🎁 Рефбонус +{eco.BONUS_REWARDS['invite_friend']} → {referrer.telegram_id}")
            except Exception as e:
                print(f"Referral bonus error: {e}")

        generation_tasks[task_id] = {
            "status": "completed", "result_url": result_url, "preview_url": preview_url}

    except Exception as e:
        print(f"Generation error: {str(e)}")
        generation_tasks[task_id] = {"status": "failed", "error": str(e)}
        generation = db_session.query(Generation).filter(Generation.id == generation_id).first()
        if generation:
            generation.status = "failed"
            generation.error_message = str(e)
            user = db_session.query(User).filter(
                User.telegram_id == generation.user_id).first()
            if user:
                _refund(user, generation.wallet or "paid",
                        generation.cost_stars or 0, generation.quality or "medium")
            db_session.commit()


# === GENERATION (§2, §5, §7) ===

def _build_prompt(job_id: str, style_id: str) -> str:
    """Собирает промпт: стиль (room_design) | задача | направление сада."""
    if job_id == "room_design":
        style = STYLES.get(style_id, STYLES["modern"])
        return f"{style['prompt']}. Keep the room structure, windows and layout unchanged."
    if job_id == "garden":
        g = GARDEN_DIRECTIONS.get(style_id) or JOBS["garden"]
        return f"{g['prompt']}. Keep the house and plot layout unchanged. Photorealistic."
    job = JOBS.get(job_id)
    if not job:
        return "modern interior design"
    return job["prompt"]


@app.post("/api/generate")
async def generate_design(request: dict, background_tasks: BackgroundTasks,
                          db: Session = Depends(get_db)):
    """Запуск генерации. v2.2: стиль (room_design) или задача (5).

    quality: 'low' (быстрый вариант, 1 кредит, с вотермаркой) | 'medium' (5 кредитов).
    §5: первая генерация пользователя по своему фото — Medium без вотермарки,
    за счёт стартовых кредитов.
    Анти-абуз (§5): повтор того же фото не сжигает лимит — возвращается
    ранее сгенерированный результат.
    """
    user_id = request.get("user_id")
    file_id = request.get("file_id")
    style_id = request.get("style_id", "modern")
    job_id = request.get("job_id", "room_design")
    quality = request.get("quality", "medium")
    photo_hash = request.get("phash") or ""

    if not user_id or not file_id:
        raise HTTPException(status_code=400, detail="user_id and file_id are required")
    if job_id != "room_design" and job_id not in JOBS:
        raise HTTPException(status_code=400, detail="Invalid job_id")
    if quality not in ("low", "medium"):
        raise HTTPException(status_code=400, detail="quality must be low or medium")
    if job_id == "room_design" and style_id not in STYLES:
        raise HTTPException(status_code=400, detail="Invalid style_id")
    if job_id == "garden" and style_id and style_id not in GARDEN_DIRECTIONS:
        raise HTTPException(status_code=400, detail="Invalid garden direction")

    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Анти-абуз: то же фото уже генерировали за последние 30 дней → вернуть старый результат
    if photo_hash:
        cutoff = datetime.utcnow() - timedelta(days=30)
        hashes = db.query(UserPhotoHash).filter(
            UserPhotoHash.user_id == user_id,
            UserPhotoHash.created_at >= cutoff).all()
        for h in hashes:
            if is_same(h.phash, photo_hash):
                old = db.query(Generation).filter(
                    Generation.id == h.generation_id,
                    Generation.status == "completed").first()
                if old and old.result_image_url:
                    return {
                        "task_id": None,
                        "cached": True,
                        "generation_id": old.id,
                        "result_url": old.result_image_url,
                        "preview_url": old.preview_url,
                        "quality": old.quality,
                        "note": "Это фото уже обрабатывали — вот готовый результат",
                    }

    # Путь к файлу
    file_path = os.path.join(UPLOADS_DIR, file_id)
    if not os.path.exists(file_path):
        opt_path = file_path.rsplit(".", 1)[0] + "_opt.jpg"
        if os.path.exists(opt_path):
            file_path = opt_path
        else:
            raise HTTPException(status_code=404, detail="Uploaded file not found")

    # §5: первая генерация по своему фото — Medium без вотермарки, за счёт стартовых
    first_design = db.query(Generation).filter(
        Generation.user_id == user_id,
        Generation.kind == "design").count() == 0
    if first_design and quality == "low" and (user.credits_paid or 0) >= eco.COST_MEDIUM:
        quality = "medium"

    # Списание (сервер — единственный источник истины)
    wallet, engine_tier, cost = _charge(user, quality, db)
    db.commit()

    prompt = _build_prompt(job_id, style_id)

    generation = Generation(
        user_id=user_id,
        original_image_url=file_id,
        style_id=style_id if job_id == "room_design" else (style_id or job_id),
        category="outdoor" if job_id in ("garden", "facade") else "interior",
        cost_stars=cost,
        wallet=wallet,
        kind="design",
        quality=quality,
        job_id=job_id,
        photo_hash=photo_hash or None,
        status="pending",
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)

    if photo_hash:
        db.add(UserPhotoHash(user_id=user_id, phash=photo_hash, generation_id=generation.id))
        db.commit()

    task_id = f"{user_id}_{generation.id}"
    background_tasks.add_task(
        process_generation, task_id, file_path, prompt, engine_tier,
        generation.id, db, "style")

    eco.ensure_daily_wallet(user)
    db.commit()
    return {
        "task_id": task_id,
        "cached": False,
        "charge": wallet,
        "quality": quality,
        "cost": cost,
        "first_design": first_design,
        "credits_paid_left": user.credits_paid or 0,
        "credits_free_daily_left": user.credits_free_daily or 0,
        # совместимость
        "credits_left": user.credits_paid or 0,
        "free_left": 0,
        "daily_free_left": user.credits_free_daily or 0,
        "stars_left": user.credits_paid or 0,
    }


@app.post("/api/enhance-hd/{generation_id}")
async def enhance_hd(generation_id: int, request: dict,
                     background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """«Сделать в высоком качестве» — 15 кредитов (§7.4, §8)."""
    user_id = request.get("user_id")
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    src = db.query(Generation).filter(
        Generation.id == generation_id, Generation.user_id == user_id,
        Generation.status == "completed").first()
    if not src or not src.result_image_url:
        raise HTTPException(status_code=404, detail="Исходная генерация не найдена")

    wallet, engine_tier, cost = _charge(user, "hd", db)
    db.commit()

    result_file = src.result_image_url.replace("/results/", "")
    result_path = os.path.join(RESULTS_DIR, result_file)
    if not os.path.exists(result_path):
        _refund(user, wallet, cost, "hd")
        db.commit()
        raise HTTPException(status_code=404, detail="Файл результата не найден")

    generation = Generation(
        user_id=user_id,
        original_image_url=result_file,
        style_id=src.style_id,
        category=src.category,
        cost_stars=cost,
        wallet=wallet,
        kind="enhance_hd",
        quality="hd",
        parent_id=src.id,
        status="pending",
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)

    task_id = f"{user_id}_{generation.id}"
    background_tasks.add_task(
        process_generation, task_id, result_path,
        "Enhance this interior design photo: increase sharpness and micro-detail, "
        "refine textures and lighting, keep composition, colors and all objects exactly "
        "the same. Photorealistic high definition.",
        engine_tier, generation.id, db, "enhance")
    return {"task_id": task_id, "cost": cost,
            "credits_left": user.credits_paid or 0, "stars_left": user.credits_paid or 0}


@app.post("/api/variations/{generation_id}")
async def make_variations(generation_id: int, request: dict,
                          background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """«Другой вариант» — пакет из 3 Medium, 10 кредитов (§5, §7.4)."""
    user_id = request.get("user_id")
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    src = db.query(Generation).filter(
        Generation.id == generation_id, Generation.user_id == user_id,
        Generation.status == "completed").first()
    if not src:
        raise HTTPException(status_code=404, detail="Исходная генерация не найдена")

    eco.ensure_daily_wallet(user)
    if (user.credits_paid or 0) < eco.COST_VARIATIONS:
        raise HTTPException(
            status_code=402,
            detail=f"Нужно {eco.COST_VARIATIONS} кредитов, на балансе {user.credits_paid or 0}")
    user.credits_paid -= eco.COST_VARIATIONS
    db.commit()

    original_file = src.original_image_url
    original_path = os.path.join(UPLOADS_DIR, original_file)
    if not os.path.exists(original_path):
        alt = original_path.rsplit(".", 1)[0] + "_opt.jpg"
        if os.path.exists(alt):
            original_path = alt
        else:
            user.credits_paid = (user.credits_paid or 0) + eco.COST_VARIATIONS
            db.commit()
            raise HTTPException(status_code=404, detail="Исходное фото не найдено")

    style_prompt = _build_prompt(src.job_id or "room_design", src.style_id)
    tasks = []
    for i in range(3):
        generation = Generation(
            user_id=user_id,
            original_image_url=original_file,
            style_id=src.style_id,
            category=src.category,
            cost_stars=eco.COST_VARIATIONS // 3,
            wallet="paid",
            kind="variations",
            quality="medium",
            job_id=src.job_id,
            parent_id=src.id,
            status="pending",
        )
        db.add(generation)
        db.commit()
        db.refresh(generation)
        task_id = f"{user_id}_{generation.id}"
        seed_hint = (f" Variation {i+1}: vary furniture arrangement, decor accents and "
                     "camera angle slightly while keeping the same room.")
        background_tasks.add_task(
            process_generation, task_id, original_path,
            f"{style_prompt}{seed_hint}",
            "premium", generation.id, db, "style")
        tasks.append(task_id)
    return {"task_ids": tasks, "cost": eco.COST_VARIATIONS,
            "credits_left": user.credits_paid or 0, "stars_left": user.credits_paid or 0}


@app.get("/api/generate/{task_id}")
async def get_generation_status(task_id: str):
    if task_id not in generation_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return generation_tasks[task_id]


@app.get("/api/users/{user_id}/generations")
async def get_user_generations(user_id: int, db: Session = Depends(get_db)):
    """История работ. Названия — только человекочитаемые (§7.1)."""
    generations = db.query(Generation).filter(
        Generation.user_id == user_id,
        Generation.status == "completed"
    ).order_by(Generation.created_at.desc()).all()

    out = []
    for g in generations:
        d = {
            "id": g.id,
            "user_id": g.user_id,
            "style_id": g.style_id,
            "display_name": display_name(g.style_id),
            "category": g.category,
            "original_image_url": g.original_image_url,
            "result_image_url": g.result_image_url,
            "preview_url": g.preview_url,
            "cost_stars": g.cost_stars or 0,
            "kind": g.kind,
            "quality": g.quality,
            "job_id": g.job_id,
            "parent_id": g.parent_id,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        }
        out.append(d)
    return out


@app.post("/api/share/{generation_id}")
async def share_result(generation_id: int, request: dict, db: Session = Depends(get_db)):
    """«Поделиться» (§7.4): склейка «до/после» на фоне share_template/bg
    + подпись + ссылка на бота в чат."""
    user_id = request.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    user = db.query(User).filter(User.telegram_id == user_id).first()
    gen = db.query(Generation).filter(
        Generation.id == generation_id, Generation.user_id == user_id,
        Generation.status == "completed").first()
    if not gen or not gen.result_image_url:
        raise HTTPException(status_code=404, detail="Генерация не найдена")

    base_url = os.getenv("PUBLIC_URL", os.getenv("WEBHOOK_URL", "").rsplit("/", 1)[0])
    result_url = f"{base_url}{gen.result_image_url}"
    before_url = None
    if gen.original_image_url and not gen.original_image_url.startswith("examples/"):
        before_url = f"{base_url}/uploads/{gen.original_image_url}"

    # Фон шеринга (§1.3, §7.4): share_template/bg из бандла фронта
    share_bg = None
    for cand in ("/app/static_dist/s/share_template/bg.full.webp",
                 os.path.join(os.path.dirname(__file__), "..", "public", "s",
                              "share_template", "bg.full.webp")):
        if os.path.exists(cand):
            share_bg = cand
            break

    # Склейка до/после на сервере
    collage_url = result_url
    try:
        if before_url:
            before_path = os.path.join(UPLOADS_DIR, os.path.basename(gen.original_image_url))
            if not os.path.exists(before_path):
                before_path = before_path.rsplit(".", 1)[0] + "_opt.jpg"
            if os.path.exists(before_path):
                collage_path = ai_gen.make_before_after_collage(
                    before_path,
                    os.path.join(RESULTS_DIR, gen.result_image_url.replace("/results/", "")),
                    bg_path=share_bg)
                if collage_path:
                    collage_url = f"{base_url}/results/{os.path.basename(collage_path)}"
    except Exception as e:
        print(f"Collage error: {e}")

    caption = (f"✨ {display_name(gen.style_id)} — сделано в Декор Инфо AI Designer\n"
               f"Попробуйте сами: https://t.me/DekorInfoAIBot_bot")
    try:
        if bot is not None:
            import urllib.request
            import io
            with urllib.request.urlopen(collage_url, timeout=30) as r:
                img_bytes = r.read()
            await bot.send_photo(chat_id=user_id, photo=io.BytesIO(img_bytes),
                                 caption=caption[:1000])
        else:
            await send_message(user_id, caption)
    except Exception as e:
        print(f"Share error: {e}")
        raise HTTPException(status_code=503, detail="Не удалось отправить в чат")

    db.add(AnalyticsEvent(user_id=user_id, event="result_shared",
                          payload=json.dumps({"generation_id": generation_id})))
    db.commit()
    return {"ok": True, "collage_url": collage_url}


# === БОНУСЫ (перенесены из SPEC 1.x) ===

@app.post("/api/bonus")
async def claim_bonus(request: dict, db: Session = Depends(get_db)):
    user_id = request.get("user_id")
    action = request.get("action")
    if not user_id or action not in eco.BONUS_REWARDS:
        raise HTTPException(status_code=400, detail="user_id and valid action required")

    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    marker = f"bonus:{action}"
    if action == "subscribe_channel":
        already = db.query(Payment).filter(
            Payment.user_id == user_id, Payment.product == marker).first()
        if already:
            raise HTTPException(status_code=409, detail="Бонус уже получен")
        is_sub = await check_subscription(user_id)
        if not is_sub:
            raise HTTPException(status_code=403, detail="Сначала подпишитесь на канал @stroitelinfo")
        user.is_subscribed = True
    elif action == "invite_friend":
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        count_this_month = db.query(Payment).filter(
            Payment.user_id == user_id,
            Payment.product == marker,
            Payment.created_at >= month_start).count()
        if count_this_month >= eco.FRIEND_BONUS_MONTHLY_CAP:
            raise HTTPException(status_code=409, detail="Лимит: 5 друзей в месяц")

    user.credits_paid = (user.credits_paid or 0) + eco.BONUS_REWARDS[action]
    db.add(Payment(
        user_id=user_id,
        telegram_payment_charge_id=f"bonus-{action}-{user_id}-{int(datetime.now().timestamp())}",
        product=marker,
        stars_paid=0,
        status="completed",
    ))
    db.commit()
    return {"ok": True, "reward": eco.BONUS_REWARDS[action],
            "credits_left": user.credits_paid or 0, "stars_left": user.credits_paid or 0}


# === ОПЛАТА (§6): Telegram Stars, номиналы 50/250/150/350 ===

@app.post("/api/buy")
async def create_invoice(request: dict):
    user_id = request.get("user_id")
    pack_id = request.get("pack", "pack_s")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if pack_id not in eco.PACKS:
        raise HTTPException(status_code=400, detail=f"Unknown pack: {pack_id}")
    pack = eco.PACKS[pack_id]

    payload = json.dumps({
        "user_id": user_id,
        "product": pack_id,
        "timestamp": int(datetime.now().timestamp())
    })
    try:
        invoice_url = await create_invoice_link(
            title=pack["title"],
            description=pack["desc"],
            payload=payload,
            currency="XTR",  # Telegram Stars
            prices=[{"label": pack["title"], "amount": pack["price"]}]
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"invoice_url": invoice_url}


@app.post("/api/telegram-webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    update = await request.json()

    if "pre_checkout_query" in update:
        pcq = update["pre_checkout_query"]
        if bot is not None:
            await bot.answer_pre_checkout_query(pre_checkout_query_id=pcq["id"], ok=True)
        return {"ok": True}

    if "message" in update and "successful_payment" in update["message"]:
        payment_data = update["message"]["successful_payment"]
        user_id = update["message"]["from"]["id"]
        payload = json.loads(payment_data["invoice_payload"])

        db.add(Payment(
            user_id=user_id,
            telegram_payment_charge_id=payment_data["telegram_payment_charge_id"],
            product=payload["product"],
            stars_paid=payment_data["total_amount"],
            status="completed",
        ))

        user = db.query(User).filter(User.telegram_id == user_id).first()
        credited_desc = payload["product"]
        if user:
            pack = eco.PACKS.get(payload["product"])
            user.has_ever_paid = True  # §5: после первой покупки 10/день навсегда
            if pack:
                if pack["kind"] == "pack":
                    user.credits_paid = (user.credits_paid or 0) + pack["credits"]
                    credited_desc = f"{pack['credits']} кредитов"
                else:
                    tier = "pro" if payload["product"] == "sub_pro" else "premium"
                    user.tier = tier
                    user.tier_expires_at = datetime.utcnow() + timedelta(days=30)
                    q = pack["quota"]
                    user.quota_medium = q["medium"]
                    user.quota_low = q["low"]
                    user.quota_hd = q["hd"]
                    credited_desc = f"Подписка {tier.upper()} на 30 дней"
        db.commit()

        db.add(AnalyticsEvent(user_id=user_id, event="payment_success",
                              payload=json.dumps({"product": payload["product"],
                                                  "stars": payment_data["total_amount"]})))
        db.commit()

        await send_message(
            user_id,
            f"✅ Оплата прошла успешно!\n\n"
            f"Зачислено: {credited_desc}\n"
            f"Баланс: {user.credits_paid if user else '?'} кредитов\n"
            f"Receipt ID: `{payment_data['telegram_payment_charge_id']}`",
            parse_mode="Markdown",
        )
        return {"ok": True}

    if "message" in update and update["message"].get("text") == "/paysupport":
        user_id = update["message"]["from"]["id"]
        await send_message(user_id, "🛟 По вопросам оплаты обращайтесь: @stroitelinfo")
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
