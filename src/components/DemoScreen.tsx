// PATCH v2.2 §7.2: мгновенная демонстрация.
// Открывается по тапу на стиль, появляется СРАЗУ, без обращения к API и без
// спиннера — показываются заранее подготовленные ассеты.
// Уровень A: слайдер «до/после» на всю ширину, стартовая позиция 50%,
// однократная анимация проводки от края; переключатель комнат.
// Уровень B: только обложка, без слайдера и переключателя.
// Заголовок — название стиля, подпись «Так может выглядеть ваша комната».
// Первичная «Сделать так же со своей комнатой», под ней серым «Первый дизайн бесплатно».
// Вторичная ссылка «Другие стили».
import { useEffect, useRef, useState } from 'react'
import { getStyle } from '../config/catalog'
import { asset, lqip } from '../lib/assets'
import BeforeAfter from './BeforeAfter'

interface Props {
  styleId: string
  onBack: () => void
  onMakeOwn: (styleId: string) => void
}

export default function DemoScreen({ styleId, onBack, onMakeOwn }: Props) {
  const tg = window.Telegram?.WebApp
  const style = getStyle(styleId)
  const [roomIdx, setRoomIdx] = useState(0)
  const backRef = useRef(onBack)
  backRef.current = onBack

  // §7.3: кастомные кнопки «Назад» удалены — используем tg.BackButton
  useEffect(() => {
    const bb = tg?.BackButton
    if (!bb) return
    const handler = () => backRef.current()
    bb.show()
    bb.onClick(handler)
    return () => {
      try { bb.offClick(handler); bb.hide() } catch { /* ignore */ }
    }
  }, [tg])

  if (!style) return null
  const room = style.rooms[roomIdx]
  const isA = style.tier === 'A'

  return (
    <>
      <div className="app__body">
        <h1 className="demo-title">{style.title}</h1>
        <p className="demo-sub">Так может выглядеть ваша комната</p>

        {isA && room ? (
          <>
            <BeforeAfter
              key={room.room}
              before={asset(room.before, 'full')}
              after={asset(room.after, 'full')}
              beforeLqip={lqip(room.before)}
              afterLqip={lqip(room.after)}
              initial={50}
              sweep
            />
            {/* Переключатель комнат — только уровень A (§7.2) */}
            {style.rooms.length > 1 && (
              <div className="roomswitch">
                {style.rooms.map((r, i) => (
                  <button key={r.room} className={i === roomIdx ? 'on' : ''}
                    onClick={() => { setRoomIdx(i); tg?.HapticFeedback.selectionChanged() }}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Уровень B: только обложка (§7.2) */
          <div className="ba">
            <img className="im" src={asset(style.cover, 'full')} alt={style.title}
              style={{ background: `url(${lqip(style.cover)}) center/cover` }} />
          </div>
        )}

        <p className="sub" style={{ marginBottom: 14 }}>{style.hint}</p>
      </div>

      <div className="app__foot">
        <button className="btn" onClick={() => {
          tg?.HapticFeedback.impactOccurred('medium')
          onMakeOwn(style.id)
        }}>
          Сделать так же со своей комнатой
        </button>
        <p className="free-note">Первый дизайн бесплатно</p>
        <button className="linkline" onClick={onBack}>Другие стили</button>
      </div>
    </>
  )
}
