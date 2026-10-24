'use client'

import React from 'react'
import {
  BarChart3,
  Home,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Target,
  Trophy,
  User,
  Zap,
} from 'lucide-react'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import { totalUnread } from '@/lib/ogonek/messenger'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { AccountSwitcher } from './auth'
import { Tooltip } from './tooltip'

type Props = {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onFocusIntentions: () => void
  onCompose: () => void
  onOpenProfile?: () => void
  /** Открыть модальное окно входа/регистрации (реализуется в AppShell) */
  onOpenAuth: (mode: 'signin' | 'register') => void
  /** Всплывающее уведомление (тост) для обратной связи действий аккаунта */
  onNotify: (message: string) => void
  streak?: number
}

interface NavItemDef {
  id: ViewId
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
}

/**
 * ЕДИНЫЙ КАНОНИЧЕСКИЙ СПИСОК X.COM (ЗАДАЧА 2):
 * Главная, Поиск, Чаты, Профиль, Evidence Vault, Статистика, Рейтинг, Намерения, Настройки.
 * Заголовок «ИНСТРУМЕНТЫ» и разделитель удалены.
 * «Гайд» перенесён в меню аккаунта и настройки.
 */
const UNIFIED_NAV: NavItemDef[] = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'explore', icon: Search, label: 'Поиск' },
  { id: 'messages', icon: MessageCircle, label: 'Чаты' },
  { id: 'profile', icon: User, label: 'Профиль' },
  { id: 'vault', icon: Zap, label: 'Evidence Vault' },
  { id: 'analytics', icon: BarChart3, label: 'Статистика' },
  { id: 'leaderboard', icon: Trophy, label: 'Рейтинг' },
  { id: 'intentions', icon: Target, label: 'Намерения' },
  { id: 'settings', icon: Settings, label: 'Настройки' },
]

export function Sidebar({
  view,
  onNavigate,
  onFocusIntentions,
  onCompose,
  onOpenProfile,
  onOpenAuth,
  onNotify,
  streak = CURRENT_DAY,
}: Props) {
  const { state } = useOgonekStore()
  const unread = totalUnread(state.chatThreads ?? {})

  const renderNavItem = ({ id, icon: Icon, label }: NavItemDef) => {
    const isActive = view === id
    const handleClick = () => {
      if (id === 'intentions') {
        onFocusIntentions()
      } else {
        onNavigate(id)
      }
    }

    return (
      <Tooltip key={id} content={label} side="right">
        <button
          type="button"
          className={`nav-item ${isActive ? 'active' : ''}`}
          onClick={handleClick}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} className="shrink-0" />
          <span className="text-[16px] leading-tight font-medium">{label}</span>
          {id === 'messages' && unread > 0 && (
            <span
              className="nav-item__badge"
              aria-label={`${unread} непрочитанных`}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </Tooltip>
    )
  }

  return (
    <aside className="sidebar select-none" aria-label="Боковая панель">
      {/* Brand mark */}
      <div
        className="brand cursor-pointer group min-h-[40px] flex items-center"
        onClick={() => onNavigate('home')}
        role="button"
        tabIndex={0}
      >
        <span
          className="brand-flame group-hover:scale-110 transition-transform duration-200"
          aria-hidden="true"
          style={{ fontSize: 26, letterSpacing: '-0.04em', fontWeight: 900 }}
        >
          ✦
        </span>
        <span className="font-bold tracking-tight text-[19px]">Огонёк</span>
      </div>

      {/* Navigation — единый список без искусственных групп */}
      <nav className="nav-list flex-1" aria-label="Разделы приложения">
        <div className="flex flex-col gap-0.5">
          {UNIFIED_NAV.map(renderNavItem)}
        </div>
      </nav>

      {/* Primary CTA — Flame Pill Button */}
      <Tooltip content="Записать день" side="top" hotkey="N">
        <button
          type="button"
          className="x-compose-btn"
          onClick={onCompose}
          aria-label="Записать день"
        >
          <Plus size={20} strokeWidth={2.5} className="compose-btn-icon-only" />
          <span className="compose-btn-label">Записать</span>
        </button>
      </Tooltip>

      {/* Profile block — карточка пользователя и меню аккаунта */}
      <AccountSwitcher
        streak={streak}
        onOpenProfile={onOpenProfile}
        onNavigate={onNavigate}
        onNotify={onNotify}
        onOpenAuth={onOpenAuth}
      />
    </aside>
  )
}
