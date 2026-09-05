// Доступ к манифесту ассетов v2 (Этап B).
// Варианты: card (1024px ≤ 150КБ), full (1080px ≤ 400КБ).
import manifest from '../manifest.json'

export type Variant = 'card' | 'full'

export interface AssetEntry {
  card: string
  full: string
  card_w: number
  card_h: number
  card_size: number
  full_w: number
  full_h: number
  full_size: number
  title?: string
  id?: string
  kind?: string
  tier?: number
  order?: number
  overlay?: 'plain' | 'gradient' | 'frame'
  compare?: 'static_seam' | 'toggle'
  seam?: number | null
  subtitle?: string
  role?: string
  ratio?: string
  where?: string
}

const M = manifest as Record<string, AssetEntry>

/** URL нужного варианта ассета. ref — имя файла без расширения (напр. '01_base_before' или '02_scandi_after'). */
export function asset(ref: string, variant: Variant = 'card'): string {
  // Поддержка как чистого имени ('02_scandi_after'), так и старых путей если где-то остались
  const cleanRef = ref.replace(/\.(card|full|preview|thumb)\.webp$/, '')
  const e = M[cleanRef]
  if (!e) return ''
  return e[variant] || e.card || ''
}

/** Получить полные метаданные ассета из манифеста */
export function getAssetMeta(ref: string): AssetEntry | undefined {
  const cleanRef = ref.replace(/\.(card|full|preview|thumb)\.webp$/, '')
  return M[cleanRef]
}

/** Есть ли ассет в манифесте */
export function hasAsset(ref: string): boolean {
  const cleanRef = ref.replace(/\.(card|full|preview|thumb)\.webp$/, '')
  return Boolean(M[cleanRef])
}

// Заглушка lqip для обратной совместимости (в новом манифесте изображения оптимизированы до ~50-80КБ)
export function lqip(_ref: string): string {
  return ''
}
