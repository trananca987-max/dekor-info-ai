#!/usr/bin/env python3
"""
Скрипт для настройки Telegram webhook
"""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")

if not BOT_TOKEN:
    print("❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env")
    sys.exit(1)

if not WEBHOOK_URL:
    print("❌ Ошибка: WEBHOOK_URL не найден в .env")
    print("💡 Добавьте в .env: WEBHOOK_URL=https://your-app.railway.app/api/telegram-webhook")
    sys.exit(1)

def delete_webhook():
    """Удалить существующий webhook"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook"
    response = requests.post(url)
    return response.json()

def set_webhook():
    """Установить новый webhook"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook"
    payload = {
        "url": WEBHOOK_URL,
        "allowed_updates": ["message", "pre_checkout_query"]
    }
    response = requests.post(url, json=payload)
    return response.json()

def get_webhook_info():
    """Получить информацию о webhook"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo"
    response = requests.get(url)
    return response.json()

if __name__ == "__main__":
    print("🔧 Настройка Telegram webhook\n")
    
    print("1️⃣ Удаление старого webhook...")
    result = delete_webhook()
    if result.get("ok"):
        print("✅ Старый webhook удалён\n")
    else:
        print(f"⚠️ Ошибка при удалении: {result.get('description')}\n")
    
    print("2️⃣ Установка нового webhook...")
    print(f"   URL: {WEBHOOK_URL}")
    result = set_webhook()
    if result.get("ok"):
        print("✅ Webhook успешно установлен!\n")
    else:
        print(f"❌ Ошибка при установке: {result.get('description')}\n")
        sys.exit(1)
    
    print("3️⃣ Проверка webhook...")
    info = get_webhook_info()
    if info.get("ok"):
        webhook_info = info.get("result", {})
        print(f"✅ Webhook активен:")
        print(f"   URL: {webhook_info.get('url')}")
        print(f"   Pending updates: {webhook_info.get('pending_update_count', 0)}")
        if webhook_info.get('last_error_message'):
            print(f"   ⚠️ Последняя ошибка: {webhook_info.get('last_error_message')}")
    else:
        print(f"❌ Не удалось получить информацию о webhook\n")
    
    print("\n✅ Готово! Webhook настроен и работает.")
    print("\n💡 Для проверки отправьте команду /paysupport боту")
