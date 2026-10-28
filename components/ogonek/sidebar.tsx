'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  BarChart3,
  Flame,
  Home,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Target,
  Trophy,
  User,
  Zap,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import { getInitials } from '@/lib/ogonek/initials'
import { totalUnread } from '@/lib/ogonek/messenger'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
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
  className?: string
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
  { id: 'premium', icon: BadgeCheck, label: 'Премиум' },
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
  onNotify,
  streak = CURRENT_DAY,
  className,
}: Props) {
  const { state, signOut, currentUser } = useOgonekStore()
  const unread = totalUnread(state.chatThreads ?? {})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  const displayName = currentUser?.displayName || state.profile.displayName || 'Пользователь'
  const username = currentUser?.username || state.profile.username || 'user'
  const initials = getInitials(displayName, username)
  const avatarImage = currentUser?.avatarImage || state.profile.avatarImage

  const handleSignOut = () => {
    setIsMenuOpen(false)
    signOut()
    onNotify('Вы вышли из аккаунта')
  }

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
    <aside
      className={`w-[275px] shrink-0 sticky top-0 h-screen border-r border-[#2f3336] flex flex-col justify-between overflow-y-auto scrollbar-none z-30 select-none px-3 py-4 ${className || ''}`}
      aria-label="Боковая панель"
    >
      <div className="flex flex-col gap-1 w-full">
        {/* Brand mark */}
        <div
          className="brand cursor-pointer group min-h-[40px] flex items-center gap-2.5 px-3 py-1 mb-1"
          onClick={() => onNavigate('home')}
          role="button"
          tabIndex={0}
        >
          <span
            className="brand-flame flex items-center justify-center w-8 h-8 rounded-full bg-[#ff6b35]/10 text-[#ff6b35] group-hover:scale-110 transition-transform duration-200"
            aria-hidden="true"
          >
            <Flame size={20} className="fill-[#ff6b35]/20 text-[#ff6b35]" />
          </span>
          <span className="font-bold tracking-tight text-[19px] text-[var(--text)]">Огонёк</span>
        </div>

        {/* Navigation — единый список без искусственных групп */}
        <nav className="nav-list flex-1 w-full" aria-label="Разделы приложения">
          <div className="flex flex-col gap-0.5">
            {UNIFIED_NAV.map(renderNavItem)}
          </div>
        </nav>

        {/* Primary CTA — Flame Pill Button */}
        <Tooltip content="Записать день" side="top" hotkey="N">
          <button
            type="button"
            className="x-compose-btn my-3"
            onClick={onCompose}
            aria-label="Записать день"
          >
            <Plus size={20} strokeWidth={2.5} className="compose-btn-icon-only" />
            <span className="compose-btn-label">Записать</span>
          </button>
        </Tooltip>
      </div>

      {/* Profile block — карточка пользователя и меню выхода */}
      <div ref={menuRef} className="cursor-pointer relative z-50 w-full max-w-full overflow-visible mt-auto pt-2 shrink-0">
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="absolute left-0 bottom-[calc(100%+8px)] z-50 w-full min-w-[240px] max-w-[280px] p-2 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-2xl backdrop-blur-md"
              role="menu"
              aria-label="Меню профиля"
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.15 }}
            >
              <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                <p className="text-[14px] font-bold text-[var(--text)] truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[12px] text-[var(--text-3)] font-mono truncate">
                  @{username}
                </p>
              </div>

              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-[var(--text)] rounded-xl hover:bg-[var(--surface2)] transition-colors text-left"
                onClick={() => {
                  setIsMenuOpen(false)
                  if (onOpenProfile) onOpenProfile()
                  else onNavigate('profile')
                }}
              >
                <User size={16} /> Мой профиль
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-[var(--text)] rounded-xl hover:bg-[var(--surface2)] transition-colors text-left"
                onClick={() => {
                  setIsMenuOpen(false)
                  onNavigate('settings')
                }}
              >
                <Settings size={16} /> Настройки
              </button>

              <div className="my-1 border-t border-[var(--border)]" />

              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-semibold text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors text-left"
                onClick={handleSignOut}
              >
                <LogOut size={16} /> Выйти
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          className="cursor-pointer relative z-50 w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-[var(--surface2)] transition-colors text-left border-0 bg-transparent"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
        >
          {avatarImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarImage}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--border)]"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm select-none text-white shrink-0 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #FF6A1A 0%, #FF8533 50%, #2F3336 100%)',
              }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[var(--text)] truncate leading-tight">
              {displayName}
            </p>
            <p className="text-[12px] text-[var(--text-3)] truncate font-mono">
              @{username}
            </p>
          </div>

          <MoreHorizontal size={18} className="text-[var(--text-3)] shrink-0" />
        </button>
      </div>
    </aside>
  )
}
