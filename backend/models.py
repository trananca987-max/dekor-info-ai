from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    telegram_id = Column(BigInteger, primary_key=True, index=True)
    username = Column(String, nullable=True)
    first_name = Column(String)

    # === Валюты (SPEC_decor_ai 1.3): ⭐ — внешняя (платят), кредиты — внутренняя (пользуются) ===
    credits = Column(Integer, default=0)          # внутренняя валюта
    stars = Column(Integer, default=0)            # legacy: мигрирует в credits при старте (1:1)

    # Стартовый бонус (решение Андрея 28.08): 2 бесплатных дизайна Medium, без вотермарки.
    # Не 15 кредитов из SPEC — оставляем 2 генерации.
    free_generations = Column(Integer, default=2)
    starter_bonus_granted_at = Column(DateTime(timezone=True), nullable=True)

    # Подписка: free | pro | premium
    tier = Column(String, default="free")
    tier_expires_at = Column(DateTime, nullable=True)
    # Квоты подписки (SPEC 4): PRO = 40 Medium + 200 Low; PREMIUM = 20 HD + 50 Medium + 250 Low
    quota_medium = Column(Integer, default=0)
    quota_low = Column(Integer, default=0)
    quota_hd = Column(Integer, default=0)

    # Лимиты бесплатных черновиков (SPEC 4): 2/день (1 если аккаунту <7 дней), потолок 30/мес
    daily_free_used = Column(Integer, default=0)
    daily_free_date = Column(String, nullable=True)    # YYYY-MM-DD
    monthly_free_used = Column(Integer, default=0)
    monthly_free_month = Column(String, nullable=True)  # YYYY-MM

    # Рефералы (SPEC 4): +10 кредитов после первой генерации приглашённого, макс 5/мес
    referred_by = Column(BigInteger, nullable=True)

    is_subscribed = Column(Boolean, default=False)  # подписка на канал @stroitelinfo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Generation(Base):
    __tablename__ = "generations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    original_image_url = Column(String)
    result_image_url = Column(String, nullable=True)
    preview_url = Column(String, nullable=True)   # webp 400×300 для истории/главной (SPEC 1.2)
    style_id = Column(String)
    category = Column(String)  # interior, outdoor
    cost_stars = Column(Integer, default=0)  # legacy-имя колонки; смысл: стоимость в КРЕДИТАХ (0 = бесплатная)
    kind = Column(String, default="design")  # design | enhance_hd | variations | edit_object
    quality = Column(String, default="medium")  # low (черновик+вотермарка) | medium | hd (gpt-image-2)
    parent_id = Column(Integer, nullable=True)
    processing_time = Column(Float, nullable=True)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(String, nullable=True)
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
