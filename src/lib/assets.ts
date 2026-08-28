// PATCH v2.2 §1.1/§2: доступ к манифесту ассетов.
// Пути в catalog.ts — без расширений и размеров; компонент сам достаёт
// full (слайдер), preview (карточка витрины), thumb (переключатель комнат), lqip (заглушка).
import manifest from '../manifest.json'

export type Variant = 'full' | 'preview' | 'thumb' | 'lqip'

type Entry = { full: string; preview: string; thumb: string; lqip: string }

const M = manifest as Record<string, Entry>

/** URL нужного варианта ассета. ref — идентификатор из catalog.ts. */
export function asset(ref: string, variant: Variant = 'full'): string {
  const e = M[ref]
  if (!e) return ''
  return e[variant]
}

/** LQIP base64-заглушка: показывается до загрузки основного файла (§1.1). */
export function lqip(ref: string): string {
  return M[ref]?.lqip || ''
}

/** Есть ли ассет в манифесте. */
export function hasAsset(ref: string): boolean {
  return Boolean(M[ref])
}
