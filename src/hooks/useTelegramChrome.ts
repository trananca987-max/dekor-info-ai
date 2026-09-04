// PATCH v3 §4: единый владелец системных кнопок Telegram.
// Один компонент одновременно вызывает useMainButton/useBackButton
// — иначе обработчики накапливаются, и один тап запускает действие дважды.
//
// Требования:
// 1) hide() + offClick() на размонтировании (cleanup)
// 2) show() только если enabled === true
// 3) цвет берём из tg.themeParams.button_color (требование §4.1)
// 4) никаких setTimeout без cleanup — если text меняется async, вызывающий код отвечает
//
// Использование:
//   useMainButton({ text: 'Загрузить', enabled: !!file, onClick: submit })
//   useBackButton(() => navigate(-1))

import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'

type Tg = typeof WebApp

const getTg = (): Tg | undefined => {
  if (typeof window === 'undefined') return undefined
  return window.Telegram?.WebApp as unknown as Tg | undefined
}

function getThemeButtonColor(): string {
  const tg = getTg()
  // §4.1: цвет из themeParams, fallback к #3390EC (Telegram default)
  return tg?.themeParams?.button_color || '#3390EC'
}

function getThemeButtonTextColor(): string {
  const tg = getTg()
  return tg?.themeParams?.button_text_color || '#FFFFFF'
}

interface MainButtonOptions {
  /** Текст кнопки. Передайте '' чтобы скрыть без размонтирования. */
  text: string
  /** Если false — кнопка скрыта, даже если text задан. */
  enabled?: boolean
  /** Колбэк при клике. */
  onClick: () => void
  /** Показывать ли индикатор загрузки (полупрозрачный текст). */
  loading?: boolean
  /**
   * Если true — клик будет отброшен после первого вызова,
   * пока enabled не вернётся в true (защита от двойного запуска генерации).
   */
  consumeClick?: boolean
}

/**
 * Единственный владелец MainButton.
 * Не вызывайте одновременно в двух компонентах — будет гонка.
 */
export function useMainButton({
  text,
  enabled = true,
  onClick,
  loading = false,
  consumeClick = true,
}: MainButtonOptions): void {
  // Храним самый свежий onClick в ref, чтобы не пересоздавать effect
  // при каждом рендере (иначе offClick + onClick будет дёргаться без нужды).
  const onClickRef = useRef(onClick)
  const consumedRef = useRef(false)
  const lastTextRef = useRef(text)
  const lastEnabledRef = useRef(enabled)

  useEffect(() => {
    onClickRef.current = onClick
  }, [onClick])

  // Сброс consume-флага при смене условий
  useEffect(() => {
    if (enabled && text !== lastTextRef.current) {
      consumedRef.current = false
    }
    lastTextRef.current = text
    lastEnabledRef.current = enabled
  }, [text, enabled])

  useEffect(() => {
    const tg = getTg()
    const main = tg?.MainButton
    if (!main) return // не в Telegram — no-op

    const apply = () => {
      if (!enabled || !text) {
        try {
          main.hide()
        } catch { /* old client */ }
        return
      }
      try {
        main.setParams({
          text: loading ? '...' : text,
          color: getThemeButtonColor(),
          text_color: getThemeButtonTextColor(),
          is_active: !loading,
          is_visible: true,
        })
        main.show()
      } catch { /* old client */ }
    }
    apply()

    const handler = () => {
      if (consumeClick && consumedRef.current) return
      if (consumeClick) consumedRef.current = true
      try {
        onClickRef.current()
      } catch (e) {
        // на ошибке снимаем блокировку, чтобы пользователь мог повторить
        consumedRef.current = false
        // eslint-disable-next-line no-console
        console.error('MainButton onClick error', e)
      }
    }

    try {
      main.onClick(handler)
    } catch { /* old client */ }

    return () => {
      // Строго обязательная очистка — иначе накапливаются обработчики.
      try {
        main.offClick(handler)
        main.hide()
      } catch { /* old client */ }
    }
    // Зависимости: при смене этих пропсов effect пересоздаёт обработчик.
    // onClickRef всегда свежий, поэтому onClick в deps не нужен.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled, loading, consumeClick])
}

/**
 * Единственный владелец BackButton.
 * - На корневом экране (depth === 1) — кнопку не показываем,
 *   иначе аппаратная «назад» уведёт в пустоту (§4.3, §3.1).
 * - depth > 1 — вызываем onBack (по умолчанию navigate(-1)).
 */
interface BackButtonOptions {
  /** Колбэк. По умолчанию — navigate(-1). */
  onBack?: () => void
  /** Принудительно показать (override проверки глубины). */
  force?: boolean
}

export function useBackButton(options: BackButtonOptions = {}): void {
  const { onBack, force = false } = options
  const navigate = useNavigate()
  const location = useLocation()
  const onBackRef = useRef(onBack)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    const tg = getTg()
    const bb = tg?.BackButton
    if (!bb) return

    // Глубина истории. window.history.length зависит от клиента,
    // более надёжно — отслеживать через sessionStorage.
    const depthKey = 'tg_nav_depth'
    const depth = Number(sessionStorage.getItem(depthKey) || '0')
    const nextDepth = depth + 1
    sessionStorage.setItem(depthKey, String(nextDepth))

    const handler = () => {
      if (onBackRef.current) {
        onBackRef.current()
      } else {
        navigate(-1)
      }
    }

    if (force || depth >= 1) {
      try {
        bb.show()
      } catch { /* old client */ }
    } else {
      try {
        bb.hide()
      } catch { /* old client */ }
    }

    try {
      bb.onClick(handler)
    } catch { /* old client */ }

    return () => {
      try {
        bb.offClick(handler)
        bb.hide()
      } catch { /* old client */ }
      sessionStorage.setItem(depthKey, String(depth))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, force])
}

/**
 * Сброс счётчика глубины при логауте или перезагрузке.
 */
export function resetNavigationDepth(): void {
  try {
    sessionStorage.removeItem('tg_nav_depth')
  } catch { /* SSR or no sessionStorage */ }
}
