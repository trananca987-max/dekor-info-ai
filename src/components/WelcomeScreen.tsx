// Онбординг PATCH v2.2: до результата — никаких решений о деньгах.
// Стартовый грант: 15 кредитов уже на балансе (§5).
// Ассеты — из конвейера (§1), LQIP-заглушки.
import type { User } from '../types'
import { asset, lqip } from '../lib/assets'
import BeforeAfter from './BeforeAfter'

interface Props {
  user: User
  onSubscribe: () => void
}

export default function WelcomeScreen({ user, onSubscribe }: Props) {
  const tg = window.Telegram?.WebApp

  const handleStart = () => {
    tg?.HapticFeedback.impactOccurred('medium')
    onSubscribe()
  }

  return (
    <>
      <div className="app__body">
        <h1 className="h" style={{ marginTop: 14 }}>
          Посмотрите, как будет выглядеть ваша комната
        </h1>
        <p className="sub" style={{ marginBottom: 16 }}>
          Загрузите фото — получите дизайн за 30 секунд
        </p>

        <BeforeAfter
          before={asset('_base/living_before', 'preview')}
          after={asset('scandi/living_after', 'preview')}
          beforeLqip={lqip('_base/living_before')}
          afterLqip={lqip('scandi/living_after')}
          height={250}
          labelAfter="После"
        />

        <div className="banner" onClick={handleStart}>
          <span style={{ fontSize: 20 }}>🎁</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {user.credits_paid ?? 15} кредитов уже на балансе
            </div>
            <div className="tiny">хватит на 3 дизайна · без карты</div>
          </div>
        </div>
      </div>

      <div className="app__foot">
        <button className="btn" onClick={handleStart}>Сделать дизайн</button>
        <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => {
          tg?.openTelegramLink('https://t.me/stroitelinfo')
        }}>
          Посмотреть примеры
        </button>
      </div>
    </>
  )
}
