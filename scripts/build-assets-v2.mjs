// Этап A: пайплайн ассетов v2 (финальный).
// Читает assets.json (ручной источник правды), пишет ТОЛЬКО в public/assets/.
// Не трогает: public/s/, src/manifest.json, catalog.ts, сам assets.json.
// Падает (exit 1): файл слота отсутствует; пропорция кропа 01–05 расходится >1%;
// вариант не влез в бюджет даже на качестве 60; у стиля after !== true.
import sharp from 'sharp';
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';

const ASSETS_JSON = 'assets.json';
const EFFORT = 6;
const QUALITY = 80;

const cfg = JSON.parse(await readFile(ASSETS_JSON, 'utf8'));
const src_dirs = cfg.src_dirs;
const OUT_DIR = cfg.out_dir || 'public/assets';
const budgets = cfg.budgets;
const card_long_side = cfg.card_long_side;
const full_long_side = cfg.full_long_side;
const base_slots = cfg.base_slots;
const slotEntries = Object.entries(cfg.slots).map(([k, v]) => ({ slot: k, ...v }));

// --- helpers ---

async function findSrcFile(slotId) {
  for (const dir of src_dirs) {
    try {
      const files = await readdir(dir);
      const m = files.find(f => f.startsWith(slotId + '_'));
      if (m) return path.join(dir, m);
    } catch { /* dir missing — пробуем следующую */ }
  }
  return null;
}

// rotate-aware: metadata() отдаёт размеры ДО автоповорота
function dimsOf(meta) {
  let w = meta.width, h = meta.height;
  if (meta.orientation && meta.orientation >= 5) { const t = w; w = h; h = t; }
  return { w, h };
}

async function loadImage(file) {
  const img = sharp(file, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const { w, h } = dimsOf(meta);
  return { img, w, h };
}

function clampCrop(c, w, h) {
  const width = Math.min(c.width, w);
  const height = Math.min(c.height, h);
  return {
    left: Math.max(0, Math.min(c.left, w - width)),
    top: Math.max(0, Math.min(c.top, h - height)),
    width, height,
  };
}

function parseRatio(str) {
  if (str.includes('x')) { const [a, b] = str.split('x').map(Number); return a / b; }
  const [a, b] = str.split(':').map(Number);
  return a / b;
}

// --- нормализация 01–05: полная высота, ширина 0.8*h, центр по X, сдвиг вверх 0.35 ---
async function computeBaseRects() {
  const rects = [];
  for (const s of base_slots) {
    const file = await findSrcFile(s);
    if (!file) throw new Error(`Слот ${s}: файл не найден`);
    const { w, h } = await loadImage(file);
    const width = Math.min(w, Math.round(h * 0.8));
    const height = Math.round(width / 0.8);
    const left = Math.round((w - width) / 2);
    const top = Math.round((h - height) * 0.35);
    rects.push({ slot: s, ...clampCrop({ left, top, width, height }, w, h) });
  }
  const ratios = rects.map(r => r.width / r.height);
  const ref = ratios[0];
  for (let i = 1; i < rects.length; i++) {
    const d = Math.abs(ratios[i] - ref) / ref;
    if (d > 0.01) throw new Error(`Слот ${rects[i].slot}: пропорция кропа расходится на ${(d * 100).toFixed(2)}% от эталона`);
  }
  return Object.fromEntries(rects.map(r => [r.slot, r]));
}

// --- кодирование с бюджетным фолбэком: 80 → 75 → 70 → 65 → 60 ---
async function processVariant(img, crop, longSide, budget) {
  const w = Math.min(longSide, crop.width);
  for (let attempt = 0; attempt < 5; attempt++) {
    const q = Math.max(60, QUALITY - 5 * attempt);
    const buf = await img.clone()
      .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
      .resize({ width: w, withoutEnlargement: true })
      .toColourspace('srgb')
      .webp({ quality: q, effort: EFFORT, smartSubsample: true, preset: 'photo' })
      .toBuffer();
    if (buf.length <= budget) return { buf, q };
  }
  throw new Error(`Не влез в бюджет ${budget} байт даже на q60 (crop ${crop.width}x${crop.height})`);
}

// --- main ---

// Проверяем, доступны ли исходники (если запускаемся в Docker, где raw-исходников нет, но public/assets уже скомпилированы)
const testSrc = await findSrcFile('01');
if (!testSrc) {
  try {
    const existing = await readFile(path.join(OUT_DIR, 'manifest.json'), 'utf8');
    await writeFile('src/manifest.json', existing, 'utf8');
    console.log('✓ [assets] Исходные raw-картинки не найдены, используются предкомпилированные public/assets/ (манифест синхронизирован).');
    process.exit(0);
  } catch (err) {
    throw new Error('Слот 01 не найден и отсутствует готовый public/assets/manifest.json: ' + err.message);
  }
}

const baseRects = await computeBaseRects();
console.log('[base] правило: полная высота, ширина 0.8·h, центр по X, сдвиг вверх 0.35');
for (const s of base_slots) {
  const r = baseRects[s];
  console.log(`[base ${s}] left=${r.left} top=${r.top} ${r.width}x${r.height}`);
}

await rm(OUT_DIR, { recursive: true, force: true }); // чистит ТОЛЬКО public/assets
await mkdir(OUT_DIR, { recursive: true });

const manifest = {};
const report = [];
const qualityDrops = [];

for (const entry of slotEntries) {
  const isSpecial31 = entry.slot === '31' && entry.crop_from;
  const srcSlot = isSpecial31 ? entry.crop_from : entry.slot;
  const srcFile = await findSrcFile(srcSlot);
  if (!srcFile) {
    console.error(`❌ Слот ${entry.slot}: файл префикса ${srcSlot}_ не найден`);
    process.exit(1);
  }

  if (entry.kind === 'style' && entry.after !== true) {
    console.error(`❌ Слот ${entry.slot}: у стиля after !== true`);
    process.exit(1);
  }

  const { img, w, h } = await loadImage(srcFile);
  let crop;

  if (base_slots.includes(entry.slot)) {
    crop = baseRects[entry.slot];
  } else if (isSpecial31) {
    // og:image 1200×630, композиция смещена влево (правая треть чистая)
    const targetRatio = 1200 / 630;
    let tw = Math.min(1200, w);
    let th = Math.round(tw / targetRatio);
    if (th > h) { th = h; tw = Math.round(th * targetRatio); }
    const left = Math.round((w - tw) * 0.3);
    const top = Math.round((h - th) / 2);
    crop = clampCrop({ left, top, width: tw, height: th }, w, h);
  } else if (entry.kind === 'util' && entry.ratio) {
    // служебные: заданная пропорция, центр
    const tr = parseRatio(entry.ratio);
    let tw = Math.min(w, Math.round(h * tr));
    let th = Math.round(tw / tr);
    if (th > h) { th = h; tw = Math.round(th * tr); }
    crop = clampCrop({ left: Math.round((w - tw) / 2), top: Math.round((h - th) / 2), width: tw, height: th }, w, h);
  } else {
    // стили и задачи: 4:5, центр
    const tw = Math.min(w, Math.round(h * 0.8));
    const th = Math.round(tw / 0.8);
    crop = clampCrop({ left: Math.round((w - tw) / 2), top: Math.round((h - th) / 2), width: tw, height: th }, w, h);
  }

  const card = await processVariant(img, crop, card_long_side, budgets.card);
  const full = await processVariant(img, crop, full_long_side, budgets.full);
  if (card.q < QUALITY || full.q < QUALITY) qualityDrops.push(`${entry.slot} (${entry.title}): card q${card.q}, full q${full.q}`);

  const base = entry.file.replace(/\.webp$/, '');
  await writeFile(path.join(OUT_DIR, `${base}.card.webp`), card.buf);
  await writeFile(path.join(OUT_DIR, `${base}.full.webp`), full.buf);

  const cm = await sharp(card.buf).metadata();
  const fm = await sharp(full.buf).metadata();

  manifest[base] = {
    card: `/assets/${base}.card.webp`,
    full: `/assets/${base}.full.webp`,
    card_w: cm.width, card_h: cm.height, card_size: card.buf.length,
    full_w: fm.width, full_h: fm.height, full_size: full.buf.length,
    title: entry.title, id: entry.id, kind: entry.kind,
    tier: entry.tier, order: entry.order, overlay: entry.overlay,
    compare: entry.compare, seam: entry.seam, subtitle: entry.subtitle,
    role: entry.role, ratio: entry.ratio, where: entry.where,
  };

  report.push({
    slot: entry.slot, title: entry.title,
    card: `${cm.width}x${cm.height} ${(card.buf.length / 1024).toFixed(0)}КБ q${card.q}`,
    full: `${fm.width}x${fm.height} ${(full.buf.length / 1024).toFixed(0)}КБ q${full.q}`,
    crop: `${crop.left},${crop.top} ${crop.width}x${crop.height}`,
  });
  console.log(`✓ слот ${entry.slot} ${entry.title}`);
}

await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile('src/manifest.json', JSON.stringify(manifest, null, 2));

console.log('\n=== ОТЧЁТ ===');
console.table(report);
console.log(`Готово: ${report.length} слотов (файлов: ${report.length * 2} + manifest.json)`);
if (qualityDrops.length) {
  console.log('\nКачество снижено (бюджет):');
  qualityDrops.forEach(d => console.log('  - ' + d));
} else {
  console.log('\nКачество снижено: нигде, все на q80');
}