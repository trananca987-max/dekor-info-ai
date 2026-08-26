from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    telegram_id = Column(BigInteger, primary_key=True, index=True)
    username = Column(String, nullable=True)
    first_name = Column(String)
    # Единая валюта — звёзды. Бесплатный вход: 2 генерации.
    stars = Column(Integer, default=0)
    free_generations = Column(Integer, default=2)  # «вау»-бонус новичку, не сгорает
    tier = Column(String, default="free")  # legacy
    tier_expires_at = Column(DateTime, nullable=True)
    is_subscribed = Column(Boolean, default=False)  # подписка на канал @stroitelinfo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Generation(Base):
    __tablename__ = "generations"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    original_image_url = Column(String)
    result_image_url = Column(String, nullable=True)
    style_id = Column(String)
    category = Column(String)  # interior, outdoor
    cost_stars = Column(Integer, default=0)  # 0 = бесплатная (free_generations)
    kind = Column(String, default="design")  # design | enhance_hd | variations | edit_object
    parent_id = Column(Integer, nullable=True)  # для вариаций/HD — ссылка на исходную генерацию
    processing_time = Column(Float, nullable=True)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    telegram_payment_charge_id = Column(String, unique=True)
    product = Column(String)  # pro, premium
    stars_paid = Column(Integer)
    status = Column(String, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
