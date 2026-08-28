"""Перцептивный хеш фото (SPEC v2.0 §4.5) — анти-абуз бесплатных генераций.

aHash 8x8: изображение сводится к 8x8 grayscale, каждый пиксель сравнивается
со средним -> 64 бита. Расстояние Хэмминга <= 5 считаем тем же изображением.
Повторная отправка того же фото не сжигает лимит и не порождает новую
бесплатную генерацию — пользователю показывается ранее сгенерированный результат.
"""
import io


def phash(image_bytes: bytes) -> str:
    """Возвращает 16-hex-символьный хеш или '' если не удалось."""
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(image_bytes)).convert("L")
        im = im.resize((8, 8), Image.Resampling.LANCZOS)
        px = list(im.getdata())
        avg = sum(px) / len(px)
        bits = 0
        for p in px:
            bits = (bits << 1) | (1 if p > avg else 0)
        return format(bits, "016x")
    except Exception as e:
        print(f"phash error: {e}")
        return ""


def hamming(a: str, b: str) -> int:
    try:
        return bin(int(a, 16) ^ int(b, 16)).count("1")
    except (ValueError, TypeError):
        return 64


def is_same(a: str, b: str, threshold: int = 5) -> bool:
    if not a or not b:
        return False
    return hamming(a, b) <= threshold
