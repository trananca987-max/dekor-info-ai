// Главный экран: приветствие, баланс в генерациях, две равноправные категории, лента работ
import { useState, useEffect } from 'react'
import type { User } from '../types'
import { DESIGN_COST, API_URL, getUserGenerations } from '../api'

interface Props {
  user: User
  onUserUpdate: (user: User) => void
}

type Screen =
  | { name: 'categories' }
  | { name: 'upload'; category?: 'interior' | 'outdoor' }
  | { name: 'history' }
  | { name: 'pricing' }
  | { name: 'howtopay' }

export default function MainScreen({ user, onUserUpdate }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: 'categories' })
  const tg = window.Telegram?.WebApp
  const haptic = () => tg?.HapticFeedback.impactOccurred('light')

  const affordable = user.free_generations + Math.floor(user.stars / DESIGN_COST)

  if (screen.name === 'upload') {
    return <UploadLazy user={user} category={screen.category}
      onBack={() => setScreen({ name: 'categories' })} onUserUpdate={onUserUpdate} />
  }
  if (screen.name === 'history') {
    return <HistoryLazy user={user} onBack={() => setScreen({ name: 'categories' })} />
  }
  if (screen.name === 'howtopay') {
    return <HowToPayLazy user={user} onBack={() => setScreen({ name: 'categories' })} />
  }
  if (screen.name === 'pricing') {
    return (
      <PricingLazy user={user} onBack={() => setScreen({ name: 'categories' })}
        onPaid={() => window.location.reload()} />
    )
  }

  return (
    <div className="screen">
      <div className="body">
        <h1 className="screen" style={{ marginTop: 10 }}>Привет, {user.first_name} 👋</h1>
        <div className="bal">
          Баланс: <b>{user.stars} ⭐</b>
          <span className="tiny">·</span>
          <span>хватит на {affordable} {affordable === 1 ? 'генерацию' : 'генераций'}</span>
          {user.free_generations > 0 && (
            <span className="badge b-green">{user.free_generations} бесплатно</span>
          )}
        </div>

        <h2 className="card-t" style={{ marginBottom: 10 }}>Что преобразим?</h2>

        {/* Две равноправные категории с реальными рендерами */}
        <button className="card" style={{ width: '100%', cursor: 'pointer', color: 'inherit', font: 'inherit', textAlign: 'left' }}
          onClick={() => { haptic(); setScreen({ name: 'upload', category: 'interior' }) }}>
          <img src="/styles/modern.jpg" alt="" className="im" style={{ height: 120, borderRadius: 0 }} />
          <div className="pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="card-t">Интерьеры</h2>
              <p className="sub">Гостиная, спальня, кухня, кабинет</p>
            </div>
            <span className="badge b-blue">8 стилей</span>
          </div>
        </button>

        <button className="card" style={{ width: '100%', cursor: 'pointer', color: 'inherit', font: 'inherit', textAlign: 'left' }}
          onClick={() => { haptic(); setScreen({ name: 'upload', category: 'outdoor' }) }}>
          <img src="/styles/landscape.jpg" alt="" className="im" style={{ height: 120, borderRadius: 0 }} />
          <div className="pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="card-t">Дом и участок</h2>
              <p className="sub">Двор, беседка, терраса, сад</p>
            </div>
            <span className="badge b-blue">10 стилей</span>
          </div>
        </button>

        <WorksStrip userId={user.telegram_id} onOpen={() => { haptic(); setScreen({ name: 'history' }) }} />
      </div>

      <div className="foot">
        <button className="btn" onClick={() => { haptic(); setScreen({ name: 'upload' }) }}>Новый дизайн</button>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn ghost sm" onClick={() => { haptic(); setScreen({ name: 'history' }) }}>История</button>
          <button className="btn ghost sm" onClick={() => { haptic(); setScreen({ name: 'pricing' }) }}>Звёзды</button>
        </div>
      </div>
    </div>
  )
}

// Ленивые импорты экранов — держим главный экран быстрым
import UploadScreen from './UploadScreen'
import HistoryScreen from './HistoryScreen'
import PricingScreen from './PricingScreen'
import HowToPayScreen from './HowToPayScreen'

function UploadLazy(props: { user: User; category?: 'interior' | 'outdoor';
  onBack: () => void; onUserUpdate: (u: User) => void }) {
  return <UploadScreen {...props} />
}
function HistoryLazy(props: { user: User; onBack: () => void }) {
  return <HistoryScreen {...props} />
}
function PricingLazy(props: { user: User; onBack: () => void; onPaid: () => void }) {
  return <PricingScreen {...props} onUpgradeSuccess={props.onPaid} />
}
function HowToPayLazy(props: { user: User; onBack: () => void }) {
  return <HowToPayScreen {...props} />
}

// Лента «Ваши работы» — горизонтальный скролл последних результатов
import type { Generation } from '../types'

function WorksStrip({ userId, onOpen }: { userId: number; onOpen: () => void }) {
  const [works, setWorks] = useState<Generation[]>([])
  useEffect(() => {
    getUserGenerations(userId).then(g => setWorks(g.slice(0, 6))).catch(() => {})
  }, [userId])
  if (works.length === 0) return null
  return (
    <>
      <h2 className="card-t" style={{ margin: '16px 0 10px' }}>Ваши работы</h2>
      <div className="works" onClick={onOpen} style={{ cursor: 'pointer' }}>
        {works.map(w => (
          <div className="w" key={w.id}>
            <img src={`${API_URL}${w.result_image_url}`} alt=""
              onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
            <div className="tiny">{getStyleName(w.style_id)}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function getStyleName(id: string): string {
  const names: Record<string, string> = {
    modern: 'Современный', scandinavian: 'Скандинавский', loft: 'Лофт',
    minimalism: 'Минимализм', classic: 'Классика', hightech: 'Хай-тек',
    provence: 'Прованс', japanese: 'Японский',
  }
  return names[id] || id
}
