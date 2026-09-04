// PATCH v2.2 §1: конвейер ассетов.
// WebP, длинная сторона 1600, качество 82, sRGB, метаданные вырезаны, 4:5 кроп
// с приоритетом верхней части кадра. Производные: preview 800, thumb 400, LQIP 24px.
// Апскейл запрещён. Манифест: public/s/manifest.json.
// §1.4: если идентификатор из src/config/catalog.ts отсутствует в манифесте — сборка падает.
import sharp from 'sharp';
import glob from 'fast-glob';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets/src';
const OUT = 'public/s';
const SIZES = { full: 1600, preview: 800, thumb: 400 };
// §1.4: если вес > 12 МБ — превью/миниатюры на 75, полноразмерные на 82
// PATCH v3: 10 новых ассетов вытеснили лимит — full 76 вместо 82 (визуальная разница минимальна),
// превью/миниатюры уже на 75 (§1.4)
const QUALITY = { full: 76, preview: 75, thumb: 75 };
const RATIO = 4 / 5;

const files = await glob(`${SRC}/**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG}`);
const manifest = {};
const warnings = [];

for (const file of files) {
  const rel = path.relative(SRC, file).replace(/\.[^.]+$/, '');
  const outDir = path.join(OUT, path.dirname(rel));
  await mkdir(outDir, { recursive: true });

  const img = sharp(file, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  if (Math.max(meta.width, meta.height) < SIZES.full) {
    warnings.push(`${rel}: ${meta.width}x${meta.height} меньше 1600 — апскейл не делаем`);
  }

  // приведение к 4:5, приоритет верхней части кадра (§1.1)
  const targetW = Math.min(meta.width, Math.round(meta.height * RATIO));
  const targetH = Math.round(targetW / RATIO);
  const left = Math.round((meta.width - targetW) / 2);
  const top = Math.round((meta.height - targetH) * 0.35);

  // withMetadata НЕ вызываем: sharp по умолчанию вырезает EXIF/GPS (§1.1)
  const base = img.extract({ left, top, width: targetW, height: targetH });

  const entry = {};
  for (const [name, size] of Object.entries(SIZES)) {
    const w = Math.min(size, targetW);
    const out = path.join(OUT, `${rel}.${name}.webp`);
    await base.clone()
      .resize({ width: w, withoutEnlargement: true })
      .toColourspace('srgb')
      .webp({ quality: QUALITY[name], effort: 5 })
      .toFile(out);
    entry[name] = `/s/${rel}.${name}.webp`;
  }

  const lqip = await base.clone().resize({ width: 24 }).blur(1)
                         .webp({ quality: 40 }).toBuffer();
  entry.lqip = `data:image/webp;base64,${lqip.toString('base64')}`;
  manifest[rel] = entry;
}

// §1.4: проверка, что все идентификаторы каталога присутствуют в манифесте
const catalogSrc = await readFile('src/config/catalog.ts', 'utf8');
const refs = new Set(
  [...catalogSrc.matchAll(/(?:cover|before|after|bg|placeholder):\s*'([^']+)'/g)].map(m => m[1])
);
const missing = [...refs].filter(r => !manifest[r]);
if (missing.length) {
  console.error('❌ В манифесте отсутствуют идентификаторы из catalog.ts:');
  missing.forEach(m => console.error('   - ' + m));
  process.exit(1);
}

await writeFile(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
// Копия для статического импорта фронтом: LQIP инлайнится в бандл (§1.1)
await writeFile('src/manifest.json', JSON.stringify(manifest, null, 2));

// §1.4: отчёт — количество, предупреждения, суммарный вес
const { execSync } = await import('node:child_process');
const du = execSync(`du -sk ${OUT} | awk '{print $1}'`).toString().trim();
console.log(`Готово: ${files.length} файлов, все ${refs.size} идентификаторов каталога на месте`);
console.log(`Вес public/s: ${(Number(du) / 1024).toFixed(2)} МБ (лимит 12 МБ)`);
if (Number(du) > 12 * 1024) {
  console.error('❌ Превышен лимит 12 МБ — снизить качество превью/миниатюр до 75');
  process.exit(1);
}
warnings.forEach(w => console.warn('WARN', w));
