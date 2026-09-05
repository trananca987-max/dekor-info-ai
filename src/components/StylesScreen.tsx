// PATCH v3 (SPEC §3.2): экран всех стилей /styles.
// Группировка по семействам, подсветка последнего выбранного стиля (localStorage).
// Поиск появится, когда стилей > 25 (сейчас 22 — скрыт, но каркас готов).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../types'
import { STYLES, type Style } from '../config/catalog'
import { asset, lqip } from '../lib/assets'
import { logEvent } from '../api'
import { useMainButton, useBackButton } from '../hooks/useTelegramChrome'

// Семейства стилей (§3.2)
const FAMILIES: { key: string; title: string; test: RegExp }[] = [
  { key: 'modern', title: 'Современные', test: /сканди|современ|минимализм|лофт|japandi|контемпорари|лофт/i },
  { key: 'classic', title: 'Классические', test: /классич|неоклассик|прованс|английск|американ/i },
  { key: 'ethno', title: 'Этнические', test: /этно|бохо|средиземномор|мароккан|японск|сканди-бохо/i },
  { key: 'dark', title: 'Тёмные', test: /тёмн|темн|дарк|люкс|тихая роскошь|индастриал/i },
]

function groupStyles(all: Style[]): { title: string; styles: Style[] }[] {
  const groups = FAMILIES.map(f => ({
    title: f.title,
    styles: all.filter(s => f.test.test(s.title) || f.test.test(s.hint)),
  }))
  // Не вошедшие никуда — в конец как «Другие»
  const matched = new Set(groups.flatMap(g => g.styles.map(s => s.id)))
  const rest = all.filter(s => !matched.has(s.id))
  if (rest.length) groups.push({ title: 'Другие', styles: rest })
  return groups.filter(g => g.styles.length > 0)
}

export default function StylesScreen({ user }: { user: User }) {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string>(() =>
    localStorage.getItem('dekor_last_style') || '',
  )
  const groups = useMemo(() => groupStyles(STYLES), [])
  const selectedStyle = STYLES.find(s => s.id === selectedId)

  const openUpload = (id: string) => {
    const last = localStorage.getItem('dekor_last_style')
    if (last !== id) {
      localStorage.setItem('dekor_last_style', id)
      logEvent(user.telegram_id, 'style_selected', { style_id: id })
    }
    setSelectedId(id)
    navigate(`/upload?jobId=room_design&styleId=${encodeURIComponent(id)}`)
  }

  // §4.3: BackButton — назад на главную. force: true — показываем даже
  // при прямом входе по ссылке (иначе hardware back закроет приложение).
  const goBack = () => {
    const idx = (window.history.state as { idx?: number })?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/home')
  }
  useBackButton({ onBack: goBack, force: true })

  // §4.1 + HIGH-5: MainButton — название стиля, а не группы;
  // без выбора — hide() (text:'' + enabled:false → скрыта).
  useMainButton({
    text: selectedStyle ? `Продолжить · ${selectedStyle.title}` : '',
    enabled: Boolean(selectedStyle),
    onClick: () => selectedStyle && openUpload(selectedStyle.id),
  })

  return (
    <div className="app__body styles-v3">
      <h1 className="styles-v3__title">Стили интерьера</h1>

      {/* Поиск — каркас на будущее (показывать, когда STYLES.length > 25) */}
      {STYLES.length > 25 && (
        <input
          className="styles-v3__search"
          placeholder="Поиск стиля…"
          onChange={(e) => logEvent(user.telegram_id, 'styles_search', { q: e.target.value })}
        />
      )}

      {groups.map(g => (
        <section key={g.title} className="styles-v3__family">
          <h2 className="styles-v3__family-title">{g.title}</h2>
          <div className="styles-v3__grid">
            {g.styles.map(s => (
              <button
                key={s.id}
                className={`styles-v3__card ${s.id === selectedId ? 'styles-v3__card--selected' : ''}`}
                onClick={() => { setSelectedId(s.id); window.Telegram?.WebApp?.HapticFeedback.selectionChanged() }}
                onDoubleClick={() => openUpload(s.id)}
              >
                <div className="styles-v3__card-img" style={{ background: `url(${lqip(s.cover)}) center/cover` }}>
                  <img src={asset(s.cover, 'thumb')} alt={s.title} loading="lazy" />
                </div>
                <span className="styles-v3__card-title">{s.title}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
