'use client'

import { BarChart3, Flame, Home, MoreHorizontal, Plus, Search, Settings, Target, Zap } from 'lucide-react'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import type { ViewId } from '@/lib/ogonek/types'
import { Tooltip } from './tooltip'

type Props = {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onFocusIntentions: () => void
  onCompose: () => void
  onOpenProfile?: () => void
  streak?: number
}

export function Sidebar({
  view,
  onNavigate,
  onFocusIntentions,
  onCompose,
  onOpenProfile,
  streak = CURRENT_DAY,
}: Props) {
  return (
    <aside className="sidebar" aria-label="Боковая панель">
      {/* Brand logo */}
      <div className="brand">
        <span className="brand-flame" aria-hidden="true">✦</span>
        <span>Огонёк</span>
      </div>

      {/* Navigation */}
      <nav className="nav-list" aria-label="Разделы приложения">
        <Tooltip content="Главная лента" side="right" hotkey="1">
          <button
            type="button"
            className={`nav-item ${view === 'home' ? 'active' : ''}`}
            onClick={() => onNavigate('home')}
            aria-label="Главная"
            aria-current={view === 'home' ? 'page' : undefined}
          >
            <Home size={22} />
            <span>Главная</span>
          </button>
        </Tooltip>

        <Tooltip content="Поиск и фильтры по тегам" side="right" hotkey="/">
          <button
            type="button"
            className={`nav-item ${view === 'explore' ? 'active' : ''}`}
            onClick={() => onNavigate('explore')}
            aria-label="Поиск & Теги"
            aria-current={view === 'explore' ? 'page' : undefined}
          >
            <Search size={22} />
            <span>Поиск & Теги</span>
          </button>
        </Tooltip>

        <Tooltip content="Сейф доказательств силы" side="right" hotkey="3">
          <button
            type="button"
            className={`nav-item ${view === 'vault' ? 'active' : ''}`}
            onClick={() => onNavigate('vault')}
            aria-label="Evidence Vault"
            aria-current={view === 'vault' ? 'page' : undefined}
          >
            <Zap size={22} />
            <span>Evidence Vault</span>
          </button>
        </Tooltip>

        <Tooltip content="Утренние намерения" side="right">
          <button
            type="button"
            className="nav-item"
            onClick={onFocusIntentions}
            aria-label="Утренние намерения"
          >
            <Target size={22} />
            <span>Утренние намерения</span>
          </button>
        </Tooltip>

        <Tooltip content="Аналитика и стрик" side="right" hotkey="4">
          <button
            type="button"
            className={`nav-item ${view === 'analytics' ? 'active' : ''}`}
            onClick={() => onNavigate('analytics')}
            aria-label="Аналитика & Стрик"
            aria-current={view === 'analytics' ? 'page' : undefined}
          >
            <BarChart3 size={22} />
            <span>Аналитика & Стрик</span>
          </button>
        </Tooltip>

        <Tooltip content="Настройки и бэкап" side="right" hotkey="S">
          <button
            type="button"
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => onNavigate('settings')}
            aria-label="Настройки & Экспорт"
            aria-current={view === 'settings' ? 'page' : undefined}
          >
            <Settings size={22} />
            <span>Настройки & Экспорт</span>
          </button>
        </Tooltip>
      </nav>

      {/* Compose button */}
      <Tooltip content="Записать день" side="top" hotkey="N">
        <button
          type="button"
          className="compose-button"
          onClick={onCompose}
          aria-label="Записать день"
        >
          <Plus size={20} />
          <span>Записать день</span>
        </button>
      </Tooltip>

      {/* Profile block — click opens profile overlay */}
      <Tooltip content="Профиль исследователя" side="top" hotkey="P">
        <div
          className="profile-mini cursor-pointer rounded-full hover:bg-white/[0.08] transition-colors duration-150 px-3 py-2.5 -mx-1"
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenProfile?.()
            }
          }}
          aria-label="Открыть профиль пользователя"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-none select-none"
            style={{
              background: 'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
              color: '#fff',
              textShadow: '0 1px 2px #000',
            }}
            aria-hidden="true"
          >
            AC
          </div>
          <div className="flex-1 min-w-0">
            <strong className="block text-[14px] font-bold text-[#e7e9ea] tracking-[-0.015em] truncate">
              Alexei Cerna
            </strong>
            <small className="block text-[#71767b] text-[13px] mt-0.5 truncate">@cernavation</small>
          </div>
          <button
            type="button"
            className="text-[#71767b] p-1 rounded-full hover:bg-white/[0.08] transition-colors"
            aria-label="Меню профиля"
            onClick={(e) => { e.stopPropagation(); onOpenProfile?.() }}
          >
            <MoreHorizontal size={17} />
          </button>
        </div>
      </Tooltip>

      {/* Streak mini indicator */}
      <div className="streak-mini">
        <Flame size={18} fill="currentColor" />
        <span>Стрик: <b>{streak} дней</b></span>
      </div>
    </aside>
  )
}
