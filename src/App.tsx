// PATCH v2.2: каркас .app/.app__body + syncViewport (§3) + тема (§4).
// Тема: tg.themeParams, переключатель auto/light/dark в CloudStorage,
// setHeaderColor/setBackgroundColor при старте и на themeChanged.
import { useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import './styles.css'
import { User } from './types'
import { getUser, createUser, checkSubscription, logEvent } from './api'
import { applyTheme, loadTheme, type ThemeMode } from './lib/theme'
import WelcomeScreen from './components/WelcomeScreen'
import MainScreen from './components/MainScreen'

// === §3: инициализация вьюпорта ===
function syncViewport() {
  const tg = window.Telegram?.WebApp as unknown as {
    viewportStableHeight?: number; viewportHeight?: number; isExpanded?: boolean;
    expand?: () => void; contentSafeAreaInset?: { top?: number };
    safeAreaInset?: { bottom?: number };
  } | undefined
  if (!tg) return
  const h = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight
  const top = tg.contentSafeAreaInset?.top ?? 0
  const bottom = tg.safeAreaInset?.bottom ?? 0
  const root = document.documentElement.style
  root.setProperty('--vh', h + 'px')
  root.setProperty('--inset-top', top + 'px')
  root.setProperty('--inset-bottom', bottom + 'px')
  if (!tg.isExpanded) tg.expand?.()
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const tg = window.Telegram?.WebApp as unknown as {
      ready: () => void; expand: () => void; disableVerticalSwipes?: () => void;
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
      tg.disableVerticalSwipes?.()
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
    } catch (error) {
      console.error('Failed to initialize user:', error)
      WebApp.showPopup({
        title: '❌ Ошибка',
        message: 'Не удалось загрузить данные пользователя',
        buttons: [{ type: 'ok' }],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubscriptionCheck = async () => {
    if (!user) return
    try {
      const subscribed = await checkSubscription(user.telegram_id)
      setIsSubscribed(subscribed)
      if (subscribed) {
        WebApp.HapticFeedback.notificationOccurred('success')
      } else {
        WebApp.HapticFeedback.notificationOccurred('error')
        WebApp.showPopup({
          title: '❌ Ошибка',
          message: 'Вы ещё не подписались на канал @stroitelinfo',
          buttons: [{ type: 'ok' }],
        })
      }
    } catch (error) {
      console.error('Failed to check subscription:', error)
    }
  }

  if (loading) {
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

  if (!user) {
    return (
      <div className="app">
        <div className="app__body" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="err" style={{ marginBottom: 14 }}>❌ Не удалось загрузить данные пользователя</div>
          <button className="btn" onClick={initUser}>Попробовать снова</button>
        </div>
      </div>
    )
  }

  if (!isSubscribed) {
    return (
      <div className="app">
        <WelcomeScreen user={user} onSubscribe={handleSubscriptionCheck} />
      </div>
    )
  }

  return (
    <div className="app">
      <MainScreen user={user} onUserUpdate={setUser} themeMode={themeMode} />
    </div>
  )
}

export default App
