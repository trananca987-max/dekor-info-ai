// PATCH v3: каркас .app/.app__body + syncViewport (§3) + тема (§4).
// Тема: tg.themeParams (auto/light/dark в CloudStorage)
// + интегрирован react-router-dom для всех экранов
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import './styles.css'
import { User } from './types'
import { getUser, createUser, checkSubscription, logEvent } from './api'
import { applyTheme, loadTheme, type ThemeMode } from './lib/theme'
import WelcomeScreen from './components/WelcomeScreen'
import MainScreen from './components/MainScreen'
import StylesScreen from './components/StylesScreen'
import TaskScreen from './components/TaskScreen'
import UploadScreen from './components/UploadScreen'

// === §3: инициализация вьюпорта ===
function syncViewport() {
  const tg = window.Telegram?.WebApp as unknown as {
    viewportStableHeight?: number; viewportHeight?: number; isExpanded?: boolean;
    expand?: () => void; contentSafeAreaInset?: { top?: number };
    safeAreaInset?: { bottom?: number };
  } | undefined
  if (!tg) return
  // viewportStableHeight — реальная высота области; именно её (не viewportHeight)
  // документация Telegram рекомендует для привязки к низу экрана.
  const h = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight
  const top = tg.contentSafeAreaInset?.top ?? 0
  const bottom = tg.safeAreaInset?.bottom ?? 0
  const root = document.documentElement.style
  root.setProperty('--app-h', h + 'px')
  root.setProperty('--vh', h + 'px')
  root.setProperty('--inset-top', top + 'px')
  root.setProperty('--inset-bottom', bottom + 'px')
  if (!tg.isExpanded) tg.expand?.()
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [, setThemeMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const tg = window.Telegram?.WebApp as unknown as {
      ready: () => void; expand: () => void; disableVerticalSwipes?: () => void;
      isVersionAtLeast?: (v: string) => boolean;
      onEvent?: (ev: string, cb: () => void) => void;
    } | undefined

    // §4: тема из CloudStorage (фолбэк auto) — до первого рендера контента
    loadTheme((m) => {
      setThemeMode(m)
      applyTheme(m)
    })

    if (tg) {
      tg.ready()
      tg.expand()
      // 7.7+ — штатный запрет сворачивания свайпом вниз (вместо touchmove-перехвата)
      try {
        if (typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('7.7')) {
          tg.disableVerticalSwipes?.()
        } else {
          tg.disableVerticalSwipes?.() // фолбэк: метод опционален, если он есть — вызываем
        }
      } catch { /* старые клиенты без disableVerticalSwipes */ }
      // §3: подписки на изменения вьюпорта + отложенные синхронизации
      tg.onEvent?.('viewportChanged', syncViewport)
      tg.onEvent?.('safeAreaChanged', syncViewport)
      tg.onEvent?.('contentSafeAreaChanged', syncViewport)
      // §4: смена темы Telegram на лету
      tg.onEvent?.('themeChanged', () => {
        loadTheme((m) => { setThemeMode(m); applyTheme(m) })
      })
      window.addEventListener('orientationchange', () => setTimeout(syncViewport, 250))
      setTimeout(syncViewport, 100)
      setTimeout(syncViewport, 500)
      syncViewport()
    }

    initUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initUser = async () => {
    try {
      const tgUser = WebApp.initDataUnsafe?.user

      if (!tgUser) {
        // Вне Telegram (браузер/dev): тестовый юзер для локального прогона UI
        const DEV_USER_ID = Number(import.meta.env?.VITE_DEV_USER_ID || 900001)
        try {
          const userData = await getUser(DEV_USER_ID)
          setUser(userData)
        } catch {
          const newUser = await createUser({
            telegram_id: DEV_USER_ID, username: 'dev_user', first_name: 'Dev',
          })
          setUser(newUser)
        }
        logEvent(DEV_USER_ID, 'app_open')
        return
      }

      const subscribed = await checkSubscription(tgUser.id)
      setIsSubscribed(subscribed)

      try {
        const userData = await getUser(tgUser.id)
        setUser(userData)
      } catch {
        const newUser = await createUser({
          telegram_id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name,
        })
        setUser(newUser)
      }
      logEvent(tgUser.id, 'app_open')
    } catch (e) {
      console.error('Auth error', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscriptionCheck = async () => {
    const tgUser = WebApp.initDataUnsafe?.user
    const id = tgUser?.id ?? Number(import.meta.env?.VITE_DEV_USER_ID || 900001)
    const subscribed = await checkSubscription(id)
    setIsSubscribed(subscribed)
  }

  // === Рендер с роутингом ===
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            loading ? <SplashScreen /> :
            !user ? <SplashScreen /> :
            !isSubscribed ? <WelcomeScreen user={user} onSubscribe={handleSubscriptionCheck} /> :
            <Navigate to="/home" replace />
          }
        />
        <Route
          path="/home"
          element={
            !user ? <Navigate to="/" replace /> :
            <MainScreen user={user} onUserUpdate={setUser} />
          }
        />
        <Route
          path="/styles"
          element={
            !user ? <Navigate to="/" replace /> :
            <StylesScreen user={user} />
          }
        />
        <Route
          path="/task/:id"
          element={
            !user ? <Navigate to="/" replace /> :
            <TaskScreen user={user} />
          }
        />
        <Route
          path="/upload"
          element={
            !user ? <Navigate to="/" replace /> :
            <UploadScreen user={user} onUserUpdate={setUser} />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// === §3: Splash-экран ===
function SplashScreen() {
  return (
    <div className="app">
      <div className="app__body">
        <div className="skel" style={{ width: '55%', height: 24, marginBottom: 12 }} />
        <div className="skel" style={{ width: '80%', height: 14, marginBottom: 22 }} />
        <div className="skel" style={{ height: 200, borderRadius: 24, marginBottom: 12 }} />
        <div className="skel" style={{ height: 200, borderRadius: 24, marginBottom: 12 }} />
      </div>
    </div>
  )
}

export default App
