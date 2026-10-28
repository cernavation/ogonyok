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
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2.69l5.66 5.66a8 8 0 0 1 2.34 5.65v5.5a2.5 2.5 0 0 1-2.5 2.5H15v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H6.5A2.5 2.5 0 0 1 4 19.5V14a8 8 0 0 1 2.34-5.65L12 2.69z" />
          </svg>
        )
      case 'explore':
        return <Search size={24} strokeWidth={2.8} className="stroke-[2.8px] text-current shrink-0" />
      case 'messages':
        return <MessageCircle size={24} strokeWidth={2} className="fill-current stroke-current text-current shrink-0" />
      case 'profile':
        return <User size={24} strokeWidth={2} className="fill-current stroke-current text-current shrink-0" />
      case 'vault':
        return <Zap size={24} strokeWidth={2} className="fill-current stroke-current text-current shrink-0" />
      case 'premium':
        return (
          <svg viewBox="0 0 24 24" width={24} height={24} className="text-current shrink-0" fill="none">
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
            <rect width="24" height="24" fill="currentColor" mask="url(#sidebar-badge-check-mask)" />
          </svg>
        )
      case 'analytics':
        return (
          <div className="w-8 h-8 rounded-lg bg-[var(--text)] flex items-center justify-center shrink-0">
            <BarChart3 size={18} strokeWidth={2.5} className="text-[var(--bg)] shrink-0" />
          </div>
        )
      case 'leaderboard':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M5 3h14v2h2a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5h-.09A6 6 0 0 1 13 17.91V20h4v2H7v-2h4v-2.09A6 6 0 0 1 6.09 14H6a5 5 0 0 1-5-5V7a2 2 0 0 1 2-2h2V3zm-2 4v2a3 3 0 0 0 3 3h.24A6.04 6.04 0 0 1 5.1 7H3zm18 0h-2.1a6.04 6.04 0 0 1-1.14 5H18a3 3 0 0 0 3-3V7z" />
          </svg>
        )
      case 'intentions':
        return (
          <div className="w-8 h-8 rounded-lg bg-[var(--text)] flex items-center justify-center shrink-0">
            <Target size={18} strokeWidth={2.5} className="text-[var(--bg)] shrink-0" />
          </div>
        )
      case 'settings':
        return <Settings size={24} strokeWidth={2.8} className="stroke-[2.8px] text-current shrink-0" fill="none" />
      default:
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2.69l5.66 5.66a8 8 0 0 1 2.34 5.65v5.5a2.5 2.5 0 0 1-2.5 2.5H15v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H6.5A2.5 2.5 0 0 1 4 19.5V14a8 8 0 0 1 2.34-5.65L12 2.69z" />
          </svg>
        )
    }
  }

  // Неактивные пункты: контурные stroke-[2px] text-[var(--muted)] hover:text-[var(--text)]
  switch (id) {
    case 'home':
      return <Home size={24} className="stroke-2 stroke-current fill-none text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'explore':
      return <Search size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'messages':
      return <MessageCircle size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'profile':
      return <User size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'vault':
      return <Zap size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'premium':
      return <BadgeCheck size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'analytics':
      return <BarChart3 size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'leaderboard':
      return <Trophy size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'intentions':
      return <Target size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'settings':
      return <Settings size={24} strokeWidth={2} className="stroke-2 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    default:
      return <Home size={24} className="stroke-2 stroke-current fill-none text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
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
              : 'w-[50px] xl:w-full h-[50px] xl:h-auto p-0 xl:gap-3.5 xl:pl-3 xl:pr-4 py-0 xl:py-2.5 justify-center xl:justify-start rounded-full hover:bg-[var(--bg-hover)] mx-auto xl:mx-0'
          } ${isActive ? 'active text-[var(--text)] fill-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)] font-medium'}`}
          onClick={handleClick}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <NavIcon id={id} isActive={isActive} size={24} />
          </div>
          <span
            className={
              isCollapsed
                ? 'hidden'
                : `hidden xl:inline text-[16px] leading-tight ${
                    isActive ? 'font-bold text-[var(--text)]' : 'font-medium text-[var(--muted)] group-hover:text-[var(--text)]'
                  }`
            }
          >
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
      className={`sidebar ${
        isCollapsed
          ? 'w-[72px] px-[11px] items-center'
          : 'w-[72px] xl:w-[275px] px-[11px] xl:px-3 items-center xl:items-stretch'
      } shrink-0 sticky top-0 h-screen border-r border-[var(--line)] hidden md:flex flex-col justify-between overflow-y-auto scrollbar-none z-30 select-none py-2.5 xl:py-4 ${className || ''}`}
      aria-label="Боковая панель"
    >
      <div className="flex flex-col gap-1 w-full items-center xl:items-stretch">
        {/* Brand mark */}
        <div
          className={`brand cursor-pointer group min-h-[40px] flex items-center ${
            isCollapsed
              ? 'justify-center w-[50px] h-[50px] px-0 mb-2 mx-auto rounded-full hover:bg-[var(--bg-hover)] transition-colors'
              : 'justify-center xl:justify-start w-[50px] xl:w-full h-[50px] xl:h-auto px-0 xl:pl-1 xl:pr-3 py-1 mb-1 rounded-full hover:bg-[var(--bg-hover)] transition-colors gap-2.5 mx-auto xl:mx-0'
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
            <span className="font-bold tracking-tight text-[19px] text-[var(--text)] hidden xl:inline">Огонёк</span>
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
                ? 'w-[50px] h-[50px] p-0 rounded-full flex items-center justify-center mx-auto my-2 min-h-[50px] min-w-[50px]'
                : 'w-[50px] xl:w-full h-[50px] xl:h-auto p-0 xl:py-3.5 rounded-full flex items-center justify-center mx-auto my-2 min-h-[50px] min-w-[50px]'
            }`}
            onClick={onCompose}
            aria-label="Записать день"
          >
            <Plus size={22} strokeWidth={2.5} className="compose-btn-icon-only xl:hidden" />
            {!isCollapsed && <span className="compose-btn-label hidden xl:inline">Записать</span>}
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
          className={`profile-mini cursor-pointer relative z-50 flex items-center rounded-full hover:bg-[var(--surface2)] transition-colors text-left border-0 bg-transparent ${
            isCollapsed
              ? 'w-[50px] h-[50px] p-0 justify-center mx-auto'
              : 'w-[50px] xl:w-full h-[50px] xl:h-auto p-0 xl:gap-3 xl:pl-1 xl:pr-3 xl:py-2 justify-center xl:justify-start rounded-2xl mx-auto xl:mx-0'
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
              <div className="flex-1 min-w-0 hidden xl:block">
                <p className="text-[14px] font-bold text-[var(--text)] truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[12px] text-[var(--text-3)] truncate font-mono">
                  @{username}
                </p>
              </div>

              <MoreHorizontal size={18} className="text-[var(--text-3)] shrink-0 hidden xl:block" />
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
