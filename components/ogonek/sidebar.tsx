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
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.532.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
          </svg>
        )
      case 'messages':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 4.444 8-4.444V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-7.525 4.18c-.148.083-.313.124-.475.124-.162 0-.327-.041-.475-.124L4 10.463V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" />
          </svg>
        )
      case 'profile':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M12 11.813A4.912 4.912 0 0 1 7.094 6.9 4.912 4.912 0 0 1 12 1.987 4.912 4.912 0 0 1 16.906 6.9 4.912 4.912 0 0 1 12 11.813zm0-7.826a2.913 2.913 0 1 0 0 5.826 2.913 2.913 0 0 0 0-5.826zm9 17.513h-2c0-3.859-3.141-7-7-7s-7 3.141-7 7H3c0-4.962 4.037-9 9-9s9 4.038 9 9z" />
          </svg>
        )
      case 'vault':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        )
      case 'premium':
        return (
          <svg viewBox="0 0 24 24" width={24} height={24} className="w-6 h-6 text-current shrink-0" fill="none">
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
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M3 21h18v-2H3v2zm3-4h3V9H6v8zm5 0h3V3h-3v14zm5 0h3v-6h-3v6z" />
          </svg>
        )
      case 'leaderboard':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M5 3h14v2h2a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5h-.09A6 6 0 0 1 13 17.91V20h4v2H7v-2h4v-2.09A6 6 0 0 1 6.09 14H6a5 5 0 0 1-5-5V7a2 2 0 0 1 2-2h2V3zm-2 4v2a3 3 0 0 0 3 3h.24A6.04 6.04 0 0 1 5.1 7H3zm18 0h-2.1a6.04 6.04 0 0 1-1.14 5H18a3 3 0 0 0 3-3V7z" />
          </svg>
        )
      case 'intentions':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        )
      case 'settings':
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.484.484 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.63 8.47c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2.69l5.66 5.66a8 8 0 0 1 2.34 5.65v5.5a2.5 2.5 0 0 1-2.5 2.5H15v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H6.5A2.5 2.5 0 0 1 4 19.5V14a8 8 0 0 1 2.34-5.65L12 2.69z" />
          </svg>
        )
    }
  }

  // Неактивные пункты: строгий размер 24x24px, stroke-[2px] text-[var(--muted)] hover:text-[var(--text)]
  switch (id) {
    case 'home':
      return <Home size={24} className="w-6 h-6 stroke-[2px] stroke-current fill-none text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'explore':
      return <Search size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'messages':
      return <MessageCircle size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'profile':
      return <User size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'vault':
      return <Zap size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'premium':
      return <BadgeCheck size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'analytics':
      return <BarChart3 size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'leaderboard':
      return <Trophy size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'intentions':
      return <Target size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    case 'settings':
      return <Settings size={24} strokeWidth={2} className="w-6 h-6 stroke-[2px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
    default:
      return <Home size={24} className="w-6 h-6 stroke-[2px] stroke-current fill-none text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0" />
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
              : 'w-[50px] xl:w-full h-[50px] xl:h-auto p-0 xl:gap-3 xl:pl-1 xl:pr-3 xl:py-2 justify-center xl:justify-start rounded-full mx-auto xl:mx-0'
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
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--line)]"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm select-none bg-[var(--surface2)] text-[var(--text)] shrink-0 border border-[var(--line)]"
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
                <p className="text-[13px] text-[var(--muted)] font-normal truncate font-mono">
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
