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
      <div className="brand">
        <span className="brand-flame" aria-hidden="true">✦</span>
        <span>Огонёк</span>
      </div>

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

      <Tooltip content="Профиль исследователя" side="top" hotkey="P">
        <div
          className="profile-mini cursor-pointer hover:bg-white/5 transition-colors"
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
          <div className="avatar avatar-photo" aria-hidden="true">AC</div>
          <div>
            <strong>Alexei Cerna</strong>
            <small>@cernavation</small>
          </div>
          <button
            type="button"
            className="muted"
            aria-label="Меню профиля"
            style={{ padding: 4 }}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </Tooltip>

      <div className="streak-mini">
        <Flame size={18} fill="currentColor" />
        <span>Стрик: <b>{streak} дней</b></span>
      </div>
    </aside>
  )
}
