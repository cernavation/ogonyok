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
  isCollapsed?: boolean
}

interface NavItemDef {
  id: ViewId
  label: string
}

/**
 * ЕДИНЫЙ КАНОНИЧЕСКИЙ СПИСОК X.COM:
 * Главная, Поиск, Чаты, Профиль, Evidence Vault, Статистика, Рейтинг, Намерения, Настройки.
 */
const UNIFIED_NAV: NavItemDef[] = [
  { id: 'home', label: 'Главная' },
  { id: 'explore', label: 'Поиск' },
  { id: 'messages', label: 'Чаты' },
  { id: 'profile', label: 'Профиль' },
  { id: 'vault', label: 'Evidence Vault' },
  { id: 'premium', label: 'Премиум' },
  { id: 'analytics', label: 'Статистика' },
  { id: 'leaderboard', label: 'Рейтинг' },
  { id: 'intentions', label: 'Намерения' },
  { id: 'settings', label: 'Настройки' },
]

/**
 * Компонент иконки навигации в стиле X.com:
 * Активный: залитая (Solid Fill) иконка `fill-white stroke-none` или жирный контур `stroke-[2.8px]`
 * Неактивный: контурная `stroke-[2px] text-[#71767b] group-hover:text-white`
 */
function NavIcon({ id, isActive, size = 24 }: { id: ViewId; isActive: boolean; size?: number }) {
  if (isActive) {
    switch (id) {
      case 'home':
        return <Home size={24} className="fill-white stroke-none text-white shrink-0" />
      case 'explore':
        return <Search size={24} strokeWidth={2.8} className="stroke-[2.8px] text-white shrink-0" />
      case 'messages':
        return <MessageCircle size={24} strokeWidth={2} className="fill-white stroke-white text-white shrink-0" />
      case 'profile':
        return <User size={24} strokeWidth={2} className="fill-white stroke-white text-white shrink-0" />
      case 'vault':
        return <Zap size={24} strokeWidth={2} className="fill-white stroke-white text-white shrink-0" />
      case 'premium':
        return (
          <svg viewBox="0 0 24 24" width={24} height={24} className="text-white shrink-0" fill="none">
            <mask id="sidebar-badge-check-mask">
              <path
                d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z"
                fill="white"
              />
              <path
                d="m9 12 2 2 4-4"
                fill="none"
                stroke="black"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </mask>
            <rect width="24" height="24" fill="white" mask="url(#sidebar-badge-check-mask)" />
          </svg>
        )
      case 'analytics':
        return (
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
            <BarChart3 size={18} strokeWidth={2.5} className="text-black shrink-0" />
          </div>
        )
      case 'leaderboard':
        return <Trophy size={24} strokeWidth={2} className="fill-white stroke-white text-white shrink-0" />
      case 'intentions':
        return (
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
            <Target size={18} strokeWidth={2.5} className="text-black shrink-0" />
          </div>
        )
      case 'settings':
        return <Settings size={24} strokeWidth={2.8} className="stroke-[2.8px] text-white shrink-0" fill="none" />
      default:
        return <Home size={24} className="fill-white stroke-none text-white shrink-0" />
    }
  }

  // Неактивные пункты: контурные stroke-[2px] text-[#71767b] hover:text-white
  switch (id) {
    case 'home':
      return <Home size={24} className="stroke-2 stroke-current fill-none text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'explore':
      return <Search size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'messages':
      return <MessageCircle size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'profile':
      return <User size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'vault':
      return <Zap size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'premium':
      return <BadgeCheck size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'analytics':
      return <BarChart3 size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'leaderboard':
      return <Trophy size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'intentions':
      return <Target size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    case 'settings':
      return <Settings size={24} strokeWidth={2} className="stroke-2 text-[#71767b] group-hover:text-white transition-colors shrink-0" />
    default:
      return <Home size={24} className="stroke-2 stroke-current fill-none text-[#71767b] group-hover:text-white transition-colors shrink-0" />
  }
}

export function Sidebar({
  view,
  onNavigate,
  onFocusIntentions,
  onCompose,
  onOpenProfile,
  onNotify,
  streak = CURRENT_DAY,
  className,
  isCollapsed: propIsCollapsed,
}: Props) {
  const { state, signOut, currentUser } = useOgonekStore()
  const unread = totalUnread(state.chatThreads ?? {})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isCollapsed = Boolean(propIsCollapsed ?? (view === 'messages'))

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

  const renderNavItem = ({ id, label }: NavItemDef) => {
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
          className={`nav-item group relative flex items-center transition-colors ${
            isCollapsed
              ? 'w-[50px] h-[50px] p-0 justify-center rounded-full mx-auto'
              : 'w-full gap-4 pl-3 pr-4 py-3 rounded-full hover:bg-[#181818]'
          } ${isActive ? 'active font-bold text-white' : 'text-[#71767b] hover:text-white'}`}
          onClick={handleClick}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <NavIcon id={id} isActive={isActive} size={24} />
          </div>
          <span className={isCollapsed ? 'hidden' : 'inline text-[16px] leading-tight font-medium'}>
            {label}
          </span>
          {id === 'messages' && unread > 0 && (
            <span
              className={
                isCollapsed
                  ? 'absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff5c00] text-white text-[10px] font-bold flex items-center justify-center shadow'
                  : 'nav-item__badge'
              }
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
      className={`${
        isCollapsed ? 'w-[72px] px-[11px] items-center' : 'w-[275px] px-3'
      } shrink-0 sticky top-0 h-screen border-r border-[#2f3336] flex flex-col justify-between overflow-y-auto scrollbar-none z-30 select-none py-4 ${className || ''}`}
      aria-label="Боковая панель"
    >
      <div className="flex flex-col gap-1 w-full items-center">
        {/* Brand mark */}
        <div
          className={`brand cursor-pointer group min-h-[40px] flex items-center ${
            isCollapsed
              ? 'justify-center w-[50px] h-[50px] px-0 mb-2 mx-auto rounded-full hover:bg-[#181818] transition-colors'
              : 'gap-2.5 pl-1 pr-3 py-1 mb-1 w-full rounded-full hover:bg-[#181818]/60 transition-colors'
          }`}
          onClick={() => onNavigate('home')}
          role="button"
          tabIndex={0}
          title="Огонёк"
        >
          <span
            className="brand-flame flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] group-hover:scale-110 transition-transform duration-200 shrink-0"
            aria-hidden="true"
          >
            <Flame size={22} className="fill-[var(--accent)]/20 text-[var(--accent)]" />
          </span>
          {!isCollapsed && (
            <span className="font-bold tracking-tight text-[19px] text-[var(--text)]">Огонёк</span>
          )}
        </div>

        {/* Navigation — единый список без искусственных групп */}
        <nav className="nav-list flex-1 w-full" aria-label="Разделы приложения">
          <div className="flex flex-col gap-1 w-full">
            {UNIFIED_NAV.map(renderNavItem)}
          </div>
        </nav>

        {/* Primary CTA — Flame Pill / Round Icon Button */}
        <Tooltip content="Записать день" side={isCollapsed ? 'right' : 'top'} hotkey="N">
          <button
            type="button"
            className={`x-compose-btn ${
              isCollapsed
                ? 'w-[50px] h-[50px] p-0 rounded-full flex items-center justify-center mx-auto my-3 min-h-[50px] min-w-[50px]'
                : 'my-3 w-full'
            }`}
            onClick={onCompose}
            aria-label="Записать день"
          >
            <Plus size={22} strokeWidth={2.5} className="compose-btn-icon-only" />
            {!isCollapsed && <span className="compose-btn-label">Записать</span>}
          </button>
        </Tooltip>
      </div>

      {/* Profile block — карточка пользователя и меню выхода */}
      <div
        ref={menuRef}
        className={`cursor-pointer relative z-50 overflow-visible mt-auto pt-2 shrink-0 ${
          isCollapsed ? 'w-full flex justify-center' : 'w-full max-w-full'
        }`}
      >
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className={`absolute bottom-[calc(100%+8px)] z-50 p-2 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-2xl backdrop-blur-md ${
                isCollapsed
                  ? 'left-0 min-w-[240px]'
                  : 'left-0 w-full min-w-[240px] max-w-[280px]'
              }`}
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
          className={`cursor-pointer relative z-50 flex items-center rounded-full hover:bg-[var(--surface2)] transition-colors text-left border-0 bg-transparent ${
            isCollapsed
              ? 'w-[50px] h-[50px] p-0 justify-center mx-auto'
              : 'w-full gap-3 pl-1 pr-3 py-2 rounded-2xl'
          }`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          title={displayName}
        >
          {avatarImage ? (
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

          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[var(--text)] truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[12px] text-[var(--text-3)] truncate font-mono">
                  @{username}
                </p>
              </div>

              <MoreHorizontal size={18} className="text-[var(--text-3)] shrink-0" />
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
