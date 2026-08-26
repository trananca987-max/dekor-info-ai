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

from .database import get_db, init_db
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

# Create uploads/results directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("results", exist_ok=True)

# Serve generation results statically
from fastapi.staticfiles import StaticFiles
app.mount("/results", StaticFiles(directory="results"), name="results")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")  # для шторки До/После

# Store generation tasks
generation_tasks = {}

@app.on_event("startup")
async def startup_event():
    print("🚀 Декор Инфо AI Designer API started!")
    print(f"📢 Channel: {os.getenv('CHANNEL_USERNAME')}")
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
    
    # Create new user
    user = User(
        telegram_id=telegram_id,
        username=username,
        first_name=first_name,
        tier="free",
        is_subscribed=False
    )
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
    file_path = os.path.join("uploads", filename)
    
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
        
        # Update database
        generation = db_session.query(Generation).filter(Generation.id == generation_id).first()
        if generation:
            generation.result_image_url = result_url
            generation.processing_time = processing_time
            generation.status = "completed"
            db_session.commit()
        
        generation_tasks[task_id] = {
            "status": "completed",
            "result_url": result_url
        }
        
    except Exception as e:
        print(f"Generation error: {str(e)}")
        generation_tasks[task_id] = {
            "status": "failed",
            "error": str(e)
        }
        
        # Update database
        generation = db_session.query(Generation).filter(Generation.id == generation_id).first()
        if generation:
            generation.status = "failed"
            generation.error_message = str(e)
            db_session.commit()


# === Единая валюта: звёзды (решение Андрея 25.08 по обзору конкурентов) ===
# Генерация дизайна — 5★ (или бесплатная из free_generations).
# Апселлы на экране результата (там, где эмоция максимальна):
HD_COST = 15        # «Улучшить детали в HD»
VARIATIONS_COST = 10  # «Ещё 3 варианта этого стиля» (за тройку)
EDIT_OBJECT_COST = 5  # «Убрать/заменить объект» (заготовка под будущий редактор)
DESIGN_COST = 5     # базовая генерация дизайна

# Пакеты звёзд: мелкий для пробы / средний с выгодой / подписка 300★/мес
STAR_PACKS = {
    "stars50":  {"stars": 50,  "price": 50,  "title": "⭐️ 50 звёзд", "desc": "Попробовать: ~10 дизайнов"},
    "stars150": {"stars": 150, "price": 120, "title": "⭐️ 150 звёзд −20%", "desc": "~30 дизайнов, лучшая цена"},
    "sub300":   {"stars": 300, "price": 250, "title": "🚀 Подписка 300★/мес", "desc": "60 дизайнов + приоритетная очередь, не сгорает"},
}

# Бонусы за действия (рост удержания)
BONUS_REWARDS = {
    "invite_friend": 30,   # пригласил друга — +30★
    "subscribe_channel": 20,  # подписался на канал — +20★
    "return_week": 10,     # вернулся через неделю — +10★
}


def _charge_for_design(user) -> str:
    """Списывает оплату за дизайн. Возвращает 'free' или 'stars'. Бросает 402 если нечем платить."""
    if user.free_generations and user.free_generations > 0:
        user.free_generations -= 1
        return "free"
    if user.stars >= DESIGN_COST:
        user.stars -= DESIGN_COST
        return "stars"
    raise HTTPException(
        status_code=402,
        detail="Не хватает звёзд. Первые 2 генерации бесплатны — пополните баланс в разделе «Пакеты»"
    )


def _refund_design(user, charge_type: str):
    """Возврат списания при ошибке запуска."""
    if charge_type == "free":
        user.free_generations += 1
    else:
        user.stars += DESIGN_COST


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
    """Start AI design generation. Одна валюта: free (2 новичку) или 5★."""
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
    
    # Оплата: сначала бесплатные, потом звёзды
    charge_type = _charge_for_design(user)
    db.commit()
    
    engine_tier = "pro"  # единое качество для всех — гейт «купи подороже» убран
    
    # Create generation record
    generation = Generation(
        user_id=user_id,
        original_image_url=file_id,
        style_id=style_id,
        category=style["category"],
        cost_stars=0 if charge_type == "free" else DESIGN_COST,
        kind="design",
        status="pending"
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)
    
    # Generate task ID
    task_id = f"{user_id}_{generation.id}"
    
    # Get file path (может быть _opt версией)
    file_path = os.path.join("uploads", file_id)
    if not os.path.exists(file_path):
        opt_path = file_path.rsplit(".", 1)[0] + "_opt.jpg"
        if os.path.exists(opt_path):
            file_path = opt_path
        else:
            _refund_design(user, charge_type)
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
        "stars_left": user.stars,
        "free_left": user.free_generations,
    }

@app.post("/api/enhance-hd/{generation_id}")
async def enhance_hd(generation_id: int, request: dict,
                     background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Апселл после результата: улучшить детали в HD — 15★. Рерайт той же комнаты gpt-image-2."""
    user_id = request.get("user_id")
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    src = db.query(Generation).filter(
        Generation.id == generation_id, Generation.user_id == user_id,
        Generation.status == "completed").first()
    if not src or not src.result_image_url:
        raise HTTPException(status_code=404, detail="Исходная генерация не найдена")
    
    if user.stars < HD_COST:
        raise HTTPException(status_code=402, detail=f"Нужно {HD_COST}★, на балансе {user.stars}★")
    user.stars -= HD_COST
    db.commit()
    
    result_file = src.result_image_url.replace("/results/", "")
    result_path = os.path.join("results", result_file)
    if not os.path.exists(result_path):
        user.stars += HD_COST
        db.commit()
        raise HTTPException(status_code=404, detail="Файл результата не найден")
    
    generation = Generation(
        user_id=user_id,
        original_image_url=result_file,
        style_id=src.style_id,
        category=src.category,
        cost_stars=HD_COST,
        kind="enhance_hd",
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
    return {"task_id": task_id, "cost": HD_COST, "stars_left": user.stars}

@app.post("/api/variations/{generation_id}")
async def make_variations(generation_id: int, request: dict,
                          background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Апселл: ещё 3 варианта этого стиля — 10★."""
    user_id = request.get("user_id")
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    src = db.query(Generation).filter(
        Generation.id == generation_id, Generation.user_id == user_id,
        Generation.status == "completed").first()
    if not src:
        raise HTTPException(status_code=404, detail="Исходная генерация не найдена")
    
    if user.stars < VARIATIONS_COST:
        raise HTTPException(status_code=402, detail=f"Нужно {VARIATIONS_COST}★, на балансе {user.stars}★")
    user.stars -= VARIATIONS_COST
    db.commit()
    
    original_file = src.original_image_url
    original_path = os.path.join("uploads", original_file)
    if not os.path.exists(original_path):
        alt = original_path.rsplit(".", 1)[0] + "_opt.jpg"
        if os.path.exists(alt):
            original_path = alt
        else:
            user.stars += VARIATIONS_COST
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
            "pro",
            generation.id,
            db,
            "style",
        )
        tasks.append(task_id)
    return {"task_ids": tasks, "cost": VARIATIONS_COST, "stars_left": user.stars}

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
    """Бонусы за действия: invite_friend +30★, subscribe_channel +20★, return_week +10★."""
    user_id = request.get("user_id")
    action = request.get("action")
    if not user_id or action not in BONUS_REWARDS:
        raise HTTPException(status_code=400, detail="user_id and valid action required")
    
    user = db.query(User).filter(User.telegram_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # защита от повторного получения: ищем платёж-маркер с тем же product
    marker = f"bonus:{action}"
    already = db.query(Payment).filter(
        Payment.user_id == user_id,
        Payment.product == marker,
    ).first()
    if already:
        raise HTTPException(status_code=409, detail="Бонус уже получен")
    
    user.stars += BONUS_REWARDS[action]
    db.add(Payment(
        user_id=user_id,
        telegram_payment_charge_id=f"bonus-{action}-{user_id}-{int(datetime.now().timestamp())}",
        product=marker,
        stars_paid=0,
        status="completed",
    ))
    db.commit()
    return {"ok": True, "reward": BONUS_REWARDS[action], "stars_left": user.stars}

@app.post("/api/buy")
async def create_invoice(request: dict):
    """Create invoice for star pack (stars50 | stars150 | sub300)."""
    user_id = request.get("user_id")
    pack_id = request.get("pack", "stars50")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    if pack_id not in STAR_PACKS:
        raise HTTPException(status_code=400, detail=f"Unknown pack: {pack_id}")
    pack = STAR_PACKS[pack_id]
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
        
        # Зачисление звёзд по купленному пакету
        user = db.query(User).filter(User.telegram_id == user_id).first()
        credited_desc = payload["product"]
        if user:
            pack = STAR_PACKS.get(payload["product"])
            if pack:
                user.stars += pack["stars"]
                credited_desc = pack["title"]
        
        db.commit()
        
        # Send confirmation
        await send_message(
            user_id,
            f"✅ Оплата прошла успешно!\n\n"
            f"Зачислено: {credited_desc}\n"
            f"Баланс: ⭐ {user.stars if user else '?'} звёзд\n"
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
