import { useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import './styles.css'
import { User } from './types'
import { getUser, createUser, checkSubscription } from './api'
import WelcomeScreen from './components/WelcomeScreen'
import MainScreen from './components/MainScreen'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    // Initialize Telegram Web App
    WebApp.ready()
    WebApp.expand()
    
    // Set theme colors
    WebApp.setHeaderColor('#2196F3')
    WebApp.setBackgroundColor('#ffffff')
    
    initUser()
  }, [])

  const initUser = async () => {
    try {
      const tgUser = WebApp.initDataUnsafe?.user
      
      if (!tgUser) {
        // Вне Telegram (браузер/dev): тестовый юзер, чтобы флоу открывался
        // и локальный прогон UI был возможен. На проде внутри Telegram
        // initData всегда присутствует и эта ветка не выполняется.
        const DEV_USER_ID = Number(import.meta.env?.VITE_DEV_USER_ID || 900001)
        try {
          const userData = await getUser(DEV_USER_ID)
          setUser(userData)
        } catch {
          const newUser = await createUser({
            telegram_id: DEV_USER_ID,
            username: 'dev_user',
            first_name: 'Dev'
          })
          setUser(newUser)
        }
        return
      }

      // Check subscription first
      const subscribed = await checkSubscription(tgUser.id)
      setIsSubscribed(subscribed)

      // Get or create user
      try {
        const userData = await getUser(tgUser.id)
        setUser(userData)
      } catch (error) {
        // User doesn't exist, create new one
        const newUser = await createUser({
          telegram_id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name
        })
        setUser(newUser)
      }
    } catch (error) {
      console.error('Failed to initialize user:', error)
      WebApp.showPopup({
        title: '❌ Ошибка',
        message: 'Не удалось загрузить данные пользователя',
        buttons: [{ type: 'ok' }]
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
        WebApp.showPopup({
          title: '✅ Отлично!',
          message: 'Подписка подтверждена',
          buttons: [{ type: 'ok' }]
        })
      } else {
        WebApp.HapticFeedback.notificationOccurred('error')
        WebApp.showPopup({
          title: '❌ Ошибка',
          message: 'Вы ещё не подписались на канал @stroitelinfo',
          buttons: [{ type: 'ok' }]
        })
      }
    } catch (error) {
      console.error('Failed to check subscription:', error)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container text-center">
        <div className="error-message">
          ❌ Не удалось загрузить данные пользователя
        </div>
        <button className="btn btn-primary" onClick={initUser}>
          Попробовать снова
        </button>
      </div>
    )
  }

  if (!isSubscribed) {
    return (
      <WelcomeScreen
        user={user}
        onSubscribe={handleSubscriptionCheck}
      />
    )
  }

  return (
    <MainScreen 
      user={user}
      onUserUpdate={setUser}
    />
  )
}

export default App
