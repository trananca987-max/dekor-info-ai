#!/usr/bin/env python3
"""
Скрипт для тестирования API
"""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("VITE_API_URL", "http://localhost:8000")

def test_health():
    """Тест health endpoint"""
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("✅ /health - OK")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ /health - Failed (status {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ /health - Error: {str(e)}")
        return False

def test_root():
    """Тест root endpoint"""
    try:
        response = requests.get(f"{API_URL}/")
        if response.status_code == 200:
            print("✅ / - OK")
            data = response.json()
            print(f"   Message: {data.get('message')}")
            print(f"   Version: {data.get('version')}")
            print(f"   Status: {data.get('status')}")
            return True
        else:
            print(f"❌ / - Failed (status {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ / - Error: {str(e)}")
        return False

def test_docs():
    """Тест docs endpoint"""
    try:
        response = requests.get(f"{API_URL}/docs")
        if response.status_code == 200:
            print("✅ /docs - OK (Swagger UI доступен)")
            return True
        else:
            print(f"❌ /docs - Failed (status {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ /docs - Error: {str(e)}")
        return False

if __name__ == "__main__":
    print(f"🧪 Тестирование API: {API_URL}\n")
    
    results = []
    
    print("1️⃣ Тестирование основных endpoints...\n")
    results.append(test_root())
    print()
    results.append(test_health())
    print()
    results.append(test_docs())
    
    print("\n" + "="*50)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ Все тесты пройдены ({passed}/{total})")
        print("\n💡 API работает корректно!")
        print(f"📖 Swagger UI: {API_URL}/docs")
        print(f"📖 ReDoc: {API_URL}/redoc")
    else:
        print(f"⚠️ Пройдено тестов: {passed}/{total}")
        print("\n❌ Некоторые тесты не прошли")
        print("💡 Проверьте, что backend запущен:")
        print("   cd backend")
        print("   python3 -m uvicorn main:app --reload")
