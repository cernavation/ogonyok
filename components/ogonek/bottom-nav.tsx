'use client'

import { BarChart3, Home, MessageCircle, Plus, Search, Settings } from 'lucide-react'
import { totalUnread } from '@/lib/ogonek/messenger'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'

const ITEMS = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'explore', icon: Search, label: 'Поиск и теги' },
  { id: 'messages', icon: MessageCircle, label: 'Чаты с друзьями' },
  { id: 'analytics', icon: BarChart3, label: 'Аналитика и стрик' },
  { id: 'settings', icon: Settings, label: 'Настройки и экспорт' },
] as const

type Props = {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onCompose: () => void
}

export function BottomNav({ view, onNavigate, onCompose }: Props) {
  const { state } = useOgonekStore()
  const unread = totalUnread(state.chatThreads ?? {})

  // Map view to highlighted nav item (profile/intentions/vault → no highlight or closest)
  const activeId: string =
    view === 'vault' || view === 'intentions' ? 'explore'
    : view === 'profile' ? 'settings'
    : view
  return (
    <>
      <nav className="bottom-nav" aria-label="Основная навигация">
        {ITEMS.map(({ id, icon: Icon, label }) => {
          const active = activeId === id
          return (
            <button
              key={id}
              type="button"
              className="bottom-nav__item"
              data-active={active}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.6} />
              {id === 'messages' && unread > 0 && (
                <span className="bottom-nav__badge" aria-hidden="true">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <button type="button" className="fab" aria-label="Записать день" onClick={onCompose}>
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </>
  )
}
