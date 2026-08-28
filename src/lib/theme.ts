// PATCH v2.2 §4: тема из tg.themeParams, переключатель auto/light/dark в CloudStorage.
// При старте и на themeChanged — setHeaderColor/setBackgroundColor
// (убирает полосу над системным хедером).
export type ThemeMode = 'auto' | 'light' | 'dark'

const KEY = 'dekor_theme'
export const BG_LIGHT = '#F6F4F1'
export const BG_DARK = '#0F1013'

type Tg = {
  colorScheme?: string
  setHeaderColor?: (c: string) => void
  setBackgroundColor?: (c: string) => void
  CloudStorage?: {
    getItem: (k: string, cb: (err: unknown, val: string) => void) => void
    setItem: (k: string, v: string, cb?: (err: unknown, ok: boolean) => void) => void
  }
} | undefined

const getTg = (): Tg => window.Telegram?.WebApp as unknown as Tg

export function isDarkMode(mode: ThemeMode): boolean {
  const tg = getTg()
  const systemDark = tg?.colorScheme === 'dark'
  return mode === 'dark' || (mode === 'auto' && Boolean(systemDark))
}

export function applyTheme(mode: ThemeMode): void {
  const dark = isDarkMode(mode)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  const bg = dark ? BG_DARK : BG_LIGHT
  const tg = getTg()
  try {
    tg?.setHeaderColor?.(bg)
    tg?.setBackgroundColor?.(bg)
  } catch { /* старые версии Telegram */ }
}

export function loadTheme(cb: (m: ThemeMode) => void): void {
  const tg = getTg()
  if (tg?.CloudStorage?.getItem) {
    try {
      tg.CloudStorage.getItem(KEY, (_err, val) => {
        cb(val === 'light' || val === 'dark' ? val : 'auto')
      })
      return
    } catch { /* fallback ниже */ }
  }
  cb('auto')
}

export function saveTheme(mode: ThemeMode): void {
  const tg = getTg()
  try { tg?.CloudStorage?.setItem?.(KEY, mode) } catch { /* ignore */ }
}

export function nextTheme(mode: ThemeMode): ThemeMode {
  return mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto'
}

export function themeIcon(mode: ThemeMode): string {
  return mode === 'auto' ? '🌗' : mode === 'light' ? '☀️' : '🌙'
}

/** §7.4: полноэкранный просмотр результата — принудительно тёмный. */
export function forceDark(on: boolean, fallbackMode: ThemeMode): void {
  if (on) {
    document.documentElement.setAttribute('data-theme', 'dark')
    const tg = getTg()
    try {
      tg?.setHeaderColor?.(BG_DARK)
      tg?.setBackgroundColor?.(BG_DARK)
    } catch { /* ignore */ }
  } else {
    applyTheme(fallbackMode)
  }
}
