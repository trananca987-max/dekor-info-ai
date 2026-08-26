"""
AnyModel AI Generator — генерация дизайна интерьера через anymodel.org
Замена Replicate SDXL. Схема проверена живыми тестами 2026-08-24 (см. Obsidian серию 3-7).

Движки:
- img2img (фото пользователя): ag/gemini-3.1-flash-image через /v1/chat/completions
  quality: low (PRO) | medium (PREMIUM) — параметр reasoning_effort
- premium t2i/img2img: cx/gpt-image-2 через /v1/images/generations, поле images, quality low/medium (PREMIUM PRO)
- t2i без фото: am/flux.2-klein-4b (бесплатно)

Важно:
- Обязателен User-Agent заголовок (иначе Cloudflare 403)
- Ответ images API: чистый JSON или SSE (event: done) — парсить оба
- Таймаут >= 60с
"""
import os
import base64
import json
import time
import re
import urllib.request
from dotenv import load_dotenv

load_dotenv()

ANYMODEL_KEY = os.getenv("ANYMODEL_API_KEY", "")
ANYMODEL_BASE = "https://anymodel.org"

# Модели и качество по тарифам (юнит-экономика: серия 6d)
TIER_ENGINE = {
    # tier: (model, mode, quality_param)
    "pro":     ("ag/gemini-3.1-flash-image", "chat", {"reasoning_effort": "low"}),
    "premium": ("ag/gemini-3.1-flash-image", "chat", {"reasoning_effort": "medium"}),
    "premium_pro": ("cx/gpt-image-2", "images", {"quality": "low"}),
}

# Промпт режима «Пустая комната» (серия 7b — vision-верифицирован)
EMPTY_ROOM_PROMPT = (
    "Empty this room completely. Remove every piece of furniture, rug, plant and "
    "decoration. Keep only the architecture: walls, floor, ceiling, windows, doors. "
    "Photorealistic."
)


class AnyModelGenerator:
    """Генератор дизайна на anymodel.org"""

    def __init__(self):
        if not ANYMODEL_KEY:
            raise ValueError("ANYMODEL_API_KEY not found in environment")

    def _headers(self):
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ANYMODEL_KEY}",
            "User-Agent": "dekor-info-app/1.0",
        }

    def _parse_image_response(self, raw: bytes) -> bytes:
        """Парсит оба формата ответа: чистый JSON и SSE-стрим."""
        txt = raw.decode("utf-8", errors="replace")
        if txt.startswith("{"):
            j = json.loads(txt)
        else:
            m = re.search(r"event: done\ndata: (.+)", txt)
            if not m:
                raise Exception(f"No image in response: {txt[:200]}")
            j = json.loads(m.group(1).strip())
        b64 = j["data"][0].get("b64_json")
        if not b64:
            raise Exception("Empty b64_json in response")
        return base64.b64decode(b64)

    def _img2img_chat(self, image_bytes: bytes, prompt: str, extra: dict) -> bytes:
        """gemini-3.1-flash-image: референс через chat/completions."""
        b64 = base64.b64encode(image_bytes).decode()
        body = {
            "model": "ag/gemini-3.1-flash-image",
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {
                    "url": f"data:image/jpeg;base64,{b64}"}},
            ]}],
        }
        body.update(extra)
        req = urllib.request.Request(
            f"{ANYMODEL_BASE}/v1/chat/completions",
            data=json.dumps(body).encode(), method="POST")
        for k, v in self._headers().items():
            req.add_header(k, v)
        with urllib.request.urlopen(req, timeout=120) as r:
            j = json.loads(r.read().decode())
        content = j["choices"][0]["message"].get("content", "")
        m = re.search(r"data:image/[a-z]+;base64,([A-Za-z0-9+/=]+)", content)
        if not m:
            raise Exception(f"No image in chat response: {content[:150]}")
        return base64.b64decode(m.group(1))

    def _images_api(self, prompt: str, extra: dict,
                    ref_bytes: bytes = None, model: str = "cx/gpt-image-2") -> bytes:
        """images/generations: t2i или img2img для gpt-image-2."""
        body = {
            "model": model,
            "prompt": prompt,
            "n": 1,
            "size": "1024x1024",
            "response_format": "b64_json",
            "output_format": "jpeg",
        }
        body.update(extra)
        if ref_bytes is not None:
            b64 = base64.b64encode(ref_bytes).decode()
            body["images"] = [f"data:image/jpeg;base64,{b64}"]
        req = urllib.request.Request(
            f"{ANYMODEL_BASE}/v1/images/generations",
            data=json.dumps(body).encode(), method="POST")
        for k, v in self._headers().items():
            req.add_header(k, v)
        with urllib.request.urlopen(req, timeout=150) as r:
            raw = r.read()
        return self._parse_image_response(raw)

    def generate(self, image_path: str, style_prompt: str,
                 tier: str = "pro", mode: str = "style") -> tuple[str, float]:
        """
        Главная точка входа.
        mode: 'style' (редизайн комнаты) | 'empty' (удалить мебель)
              | 'furnish' (обставить пустую комнату в стиле)
        Возвращает (path_to_result, processing_time).
        """
        start = time.time()

        with open(image_path, "rb") as f:
            img_bytes = f.read()
        # провайдер отклоняет крупные референсы — ресайз до <=1024px
        try:
            from PIL import Image
            import io
            im = Image.open(io.BytesIO(img_bytes))
            if max(im.size) > 1024:
                im.thumbnail((1024, 1024))
            buf = io.BytesIO()
            im.convert("RGB").save(buf, "JPEG", quality=85)
            img_bytes = buf.getvalue()
        except Exception:
            pass

        model, api_mode, extra = TIER_ENGINE.get(tier, TIER_ENGINE["pro"])

        if mode == "empty":
            prompt = EMPTY_ROOM_PROMPT
        elif mode == "furnish":
            prompt = (f"Furnish this empty room in this style: {style_prompt}. "
                      "Photorealistic interior design.")
        else:  # style
            prompt = f"{style_prompt}. Keep the room structure, windows and layout unchanged."

        if api_mode == "chat":
            result = self._img2img_chat(img_bytes, prompt, extra)
        else:
            result = self._images_api(prompt, extra, ref_bytes=img_bytes, model=model)

        os.makedirs("results", exist_ok=True)
        out_path = os.path.join(
            "results",
            os.path.basename(image_path).rsplit(".", 1)[0] + f"_result_{int(time.time())}.jpg",
        )
        with open(out_path, "wb") as f:
            f.write(result)

        processing_time = time.time() - start
        print(f"✅ Generated via {model} ({tier}/{mode}) in {processing_time:.1f}s")
        return out_path, processing_time


# Совместимость со старым кодом main.py
class AIGenerator(AnyModelGenerator):
    def generate_interior(self, image_path: str, style_prompt: str,
                          tier: str = "pro", mode: str = "style"):
        return self.generate(image_path, style_prompt, tier, mode)

    def optimize_image(self, image_path: str, max_size: int = 1536) -> str:
        try:
            from PIL import Image
            img = Image.open(image_path)
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            if img.mode != "RGB":
                img = img.convert("RGB")
            optimized = image_path.rsplit(".", 1)[0] + "_opt.jpg"
            img.save(optimized, "JPEG", quality=85, optimize=True)
            return optimized
        except Exception as e:
            print(f"Optimization error: {str(e)}")
            return image_path
