import os
from telegram import Bot
from telegram.error import TelegramError
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHANNEL_USERNAME = os.getenv("CHANNEL_USERNAME", "@stroitelinfo")

# Токен обязателен только для продакшена (webhook/оплата/проверка подписки).
# Локальный тест генерации работает без него.
if BOT_TOKEN:
    bot = Bot(token=BOT_TOKEN)
else:
    bot = None
    print("⚠️ TELEGRAM_BOT_TOKEN не задан — Telegram-функции отключены (локальный режим)")

import urllib.parse
import hmac
import hashlib
import json

def verify_telegram_init_data(init_data: str) -> dict:
    """
    Проверяет подпись initData от Telegram Mini App.
    Возвращает словарь (распарсенный), если подпись верна.
    Иначе выбрасывает ValueError.
    """
    if not BOT_TOKEN:
        # Для локального тестирования без токена
        try:
            parsed = urllib.parse.parse_qsl(init_data)
            data_dict = dict(parsed)
            if "user" in data_dict:
                data_dict["user"] = json.loads(data_dict["user"])
            return data_dict
        except Exception:
            raise ValueError("Local mode parsing failed")

    parsed = urllib.parse.parse_qsl(init_data)
    data_dict = dict(parsed)
    
    if "hash" not in data_dict:
        raise ValueError("No hash in init_data")
        
    received_hash = data_dict.pop("hash")
    
    # Сортируем пары k=v алфавитно и объединяем через \n
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(data_dict.items())
    )
    
    # HMAC-SHA-256 ключ от WebAppData
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    
    # Хэш от data_check_string
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    
    if calculated_hash != received_hash:
        raise ValueError("Invalid init_data signature")
        
    if "user" in data_dict:
        data_dict["user"] = json.loads(data_dict["user"])
        
    return data_dict

async def check_subscription(user_id: int) -> bool:
    """
    Check if user is subscribed to the channel
    """
    if bot is None:
        # Локальный режим без токена: считаем подписку проверенной,
        # чтобы флоу приложения работал (гейт подписки не блокирует тесты).
        return True
    try:
        member = await bot.get_chat_member(chat_id=CHANNEL_USERNAME, user_id=user_id)
        return member.status in ['member', 'administrator', 'creator']
    except TelegramError as e:
        print(f"Error checking subscription: {e}")
        return False

async def send_message(user_id: int, text: str, parse_mode: str = None):
    """
    Send message to user via bot
    """
    if bot is None:
        print(f"[local-mode] send_message to {user_id}: {text[:80]}")
        return
    try:
        await bot.send_message(
            chat_id=user_id,
            text=text,
            parse_mode=parse_mode
        )
    except TelegramError as e:
        print(f"Error sending message: {e}")

async def send_photo(user_id: int, photo_bytes: bytes, caption: str = ""):
    """
    Send photo directly to user chat via bot
    """
    if bot is None:
        print(f"[local-mode] send_photo to {user_id}")
        return
    try:
        import io
        await bot.send_photo(
            chat_id=user_id,
            photo=io.BytesIO(photo_bytes),
            caption=caption
        )
    except TelegramError as e:
        print(f"Error sending photo: {e}")

async def create_invoice_link(
    title: str,
    description: str,
    payload: str,
    currency: str,
    prices: list
) -> str:
    """
    Create invoice link for Telegram Stars payment
    """
    if bot is None:
        raise Exception("TELEGRAM_BOT_TOKEN не задан — оплата недоступна в локальном режиме")
    try:
        invoice = await bot.create_invoice_link(
            title=title,
            description=description,
            payload=payload,
            provider_token="",  # Empty for Stars
            currency=currency,
            prices=prices
        )
        return invoice
    except TelegramError as e:
        print(f"Error creating invoice: {e}")
        raise Exception(f"Failed to create invoice: {str(e)}")
