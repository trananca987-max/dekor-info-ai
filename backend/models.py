from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    telegram_id = Column(BigInteger, primary_key=True, index=True)
    username = Column(String, nullable=True)
    first_name = Column(String)

    # === SPEC v2.0 §4: ДВА независимых кошелька ===
    # credits_paid — купленные и бонусные кредиты: не сгорают, тратятся на любую модель.
    # credits_free_daily — бесплатные: обнуляются в 00:00 по таймзоне юзера (дни 1–7 и платившие)
    #   либо выдаются 2/неделю (день 8+, не платил). Тратятся ТОЛЬКО на Low.
    credits_paid = Column(Integer, default=0)
    credits_free_daily = Column(Integer, default=0)
    free_daily_date = Column(String, nullable=True)   # локальная дата последней дневной выдачи YYYY-MM-DD
    free_week_date = Column(String, nullable=True)    # ISO-неделя последней недельной выдачи (2026-W35)

    # Стартовый грант: 15 кредитов в credits_paid, ровно один раз (SPEC v2.0 §4.3)
    starter_grant_given = Column(Boolean, default=False)

    # Бесплатная Medium-генерация по примеру — 1 раз на пользователя (SPEC v2.0 §7)
    example_gen_used = Column(Boolean, default=False)

    # Платил хотя бы раз → дневной лимит 10 кредитов возвращается навсегда (SPEC v2.0 §4.4)
    has_ever_paid = Column(Boolean, default=False)

    first_seen_at = Column(DateTime(timezone=True), nullable=True)
    timezone = Column(String, default="Europe/Moscow")  # IANA; фолбэк UTC+3
    day6_notified_at = Column(DateTime, nullable=True)  # уведомление на 6-й день, однократно

    # Подписка: free | pro | premium
    tier = Column(String, default="free")
    tier_expires_at = Column(DateTime, nullable=True)
    # Квоты подписки (SPEC v2.0 §12.2): PRO = 40 Medium + 200 Low; PREMIUM = 20 HD + 60 Medium + 300 Low
    quota_medium = Column(Integer, default=0)
    quota_low = Column(Integer, default=0)
    quota_hd = Column(Integer, default=0)

    # Рефералы: +10 кредитов после первой генерации приглашённого, макс 5/мес
    referred_by = Column(BigInteger, nullable=True)

    is_subscribed = Column(Boolean, default=False)  # подписка на канал @stroitelinfo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # === LEGACY (SPEC 1.x) — только для миграции при старте ===
    credits = Column(Integer, default=0)          # → credits_paid при старте
    stars = Column(Integer, default=0)            # → credits_paid при старте (1:1)
    free_generations = Column(Integer, default=0)  # отменено; при миграции даёт стартовый грант
    starter_bonus_granted_at = Column(DateTime(timezone=True), nullable=True)
    daily_free_used = Column(Integer, default=0)   # отменено (SPEC v2.0)
    daily_free_date = Column(String, nullable=True)
    monthly_free_used = Column(Integer, default=0)   # отменено: месячного капа больше нет
    monthly_free_month = Column(String, nullable=True)


class Generation(Base):
    __tablename__ = "generations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    original_image_url = Column(String)
    result_image_url = Column(String, nullable=True)
    preview_url = Column(String, nullable=True)   # webp 400×300 для истории/главной
    style_id = Column(String)
    category = Column(String)  # interior, outdoor
    cost_stars = Column(Integer, default=0)  # legacy-имя; смысл: стоимость в КРЕДИТАХ (0 = бесплатная)
    wallet = Column(String, nullable=True)   # example | free_daily | quota | paid — куда возвращать при ошибке
    kind = Column(String, default="design")  # design | enhance_hd | variations
    quality = Column(String, default="medium")  # low (черновик+вотермарка) | medium | hd (gpt-image-2)
    job_id = Column(String, nullable=True)      # room_design | declutter | garden (SPEC v2.0 §6)
    room_type = Column(String, nullable=True)   # тип помещения (SPEC v2.0 §9)
    palette_id = Column(String, nullable=True)  # палитра (SPEC v2.0 §8)
    photo_hash = Column(String, nullable=True, index=True)  # перцептивный хеш фото (анти-абуз §4.5)
    parent_id = Column(Integer, nullable=True)
    processing_time = Column(Float, nullable=True)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserPhotoHash(Base):
    """Перцептивные хеши загруженных фото (SPEC v2.0 §4.5): повтор того же фото
    не сжигает лимит и не порождает новую бесплатную генерацию. TTL 30 дней."""
    __tablename__ = "user_photo_hashes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    phash = Column(String, index=True)
    generation_id = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnalyticsEvent(Base):
    """События продуктовой аналитики (SPEC v2.0 §15)."""
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    event = Column(String, index=True)
    payload = Column(String, nullable=True)  # JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    telegram_payment_charge_id = Column(String, unique=True)
    product = Column(String)  # pack_s, pack_m, sub_pro, sub_premium, bonus:*
    stars_paid = Column(Integer)
    status = Column(String, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
