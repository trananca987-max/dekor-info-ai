# -*- coding: utf-8 -*-
"""Эталонные превью стилей: одна и та же комната во всех стилях через klein t2i."""
import json, base64, re, time, urllib.request, os

def _load_key():
    for line in open("/Users/andrey/dekor-info-ai-designer/.env"):
        if line.startswith("ANYMODEL_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")

AUTH = _load_key()
H = {"Content-Type": "application/json", "Authorization": "Bearer " + AUTH,
     "User-Agent": "Mozilla/5.0"}
OUT = "/Users/andrey/dekor-info-ai-designer/public/styles"
os.makedirs(OUT, exist_ok=True)

# Список стилей берём из backend STYLES — читаем имена из main.py
import importlib.util, sys
sys.path.insert(0, "/Users/andrey/dekor-info-ai-designer/backend")

# Простой парсинг STYLES без запуска FastAPI
src = open("/Users/andrey/dekor-info-ai-designer/backend/main.py").read()
m = re.search(r"STYLES = \{(.*?)\n\}", src, re.S)
styles_block = m.group(1)
pairs = re.findall(r'"([a-z_0-9]+)":\s*\{.*?"prompt":\s*"([^"]*)"', styles_block, re.S)
VIRTUAL = {"empty_room", "empty_furnish_base"}
styles = [(sid, prompt) for sid, prompt in pairs if sid not in VIRTUAL]
print(f"{len(styles)} styles to render")

BASE_SCENE = ("photorealistic interior photo of the SAME living room with large window, "
              "sofa and coffee table; ")

def gen(prompt, out_path):
    body = {"model": "am/flux.2-klein-4b",
            "prompt": BASE_SCENE + prompt + ". No text, no words. Square composition.",
            "n": 1, "size": "1024x1024", "response_format": "b64_json"}
    req = urllib.request.Request("https://anymodel.org/v1/images/generations",
                                 data=json.dumps(body).encode(), method="POST")
    for k, v in H.items():
        req.add_header(k, v)
    raw = urllib.request.urlopen(req, timeout=120).read().decode()
    if raw.lstrip().startswith("{"):
        j = json.loads(raw)
    else:
        mm = re.search(r"event: done\ndata: (.+)", raw)
        j = json.loads(mm.group(1))
    open(out_path, "wb").write(base64.b64decode(j["data"][0]["b64_json"]))

done = []
for sid, prompt in styles:
    out_path = os.path.join(OUT, f"{sid}.jpg")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 30000:
        print(f"skip {sid} (exists)")
        continue
    for attempt in range(2):
        try:
            gen(prompt, out_path)
            print(f"OK {sid} {os.path.getsize(out_path)//1024}KB", flush=True)
            done.append(sid)
            break
        except Exception as e:
            print(f"ERR {sid}: {str(e)[:100]}", flush=True)
            time.sleep(5)
    time.sleep(1)
print(f"DONE {len(done)}/{len(styles)}")
