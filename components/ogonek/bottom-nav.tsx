'use client'

import { BarChart3, Home, Plus, Search, Settings } from 'lucide-react'
import type { ViewId } from '@/lib/ogonek/types'

const ITEMS = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'explore', icon: Search, label: 'Поиск и теги' },
  { id: 'analytics', icon: BarChart3, label: 'Аналитика и стрик' },
  { id: 'settings', icon: Settings, label: 'Настройки и экспорт' },
] as const

type Props = {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onCompose: () => void
}

export function BottomNav({ view, onNavigate, onCompose }: Props) {
  const activeId: ViewId = view === 'vault' ? 'explore' : view
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
            </button>
          )
        })}
      </nav>
      <button type="button" className="fab" aria-label="Записать день" onClick={onCompose}>
        <Plus size={22} strokeWidth={2.25} />
      </button>
    </>
  )
}
