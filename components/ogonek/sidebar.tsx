'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  BarChart2,
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
import { playClick } from '@/lib/ogonek/sound'
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
 * ЕДИНЫЕ ИДЕНТИЧНЫЕ SVG-ИКОНКИ БЕЗ ПОДМЕНЫ КОМПОНЕНТОВ:
 * Каждый пункт навигации использует строго один и тот же геометрический контур!
 * - messages: СТРОГО MessageCircle (fill="none" stroke="currentColor" strokeWidth="2" в неактивном, fill="currentColor" stroke="none" в активном).
 * - home: один и тот же контур дома Lucide, в активном — заливка с прозрачным дверным проёмом (evenodd).
 * - leaderboard: кубок залит целиком (чаша, ножка и основание).
 */
function NavIcon({ id, isActive, size = 24 }: { id: ViewId; isActive: boolean; size?: number }) {
  const strokeClass = isActive
    ? 'text-[var(--text)] fill-current'
    : 'text-[var(--muted)] group-hover:text-[var(--text)] transition-colors'

  switch (id) {
    case 'home':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`w-6 h-6 shrink-0 ${strokeClass}`}
        >
          {isActive ? (
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              fill="currentColor"
              d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8H15z"
            />
          ) : (
            <>
              <path
                d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>
      )

    case 'messages':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`w-6 h-6 shrink-0 ${strokeClass}`}
          fill={isActive ? 'currentColor' : 'none'}
          stroke={isActive ? 'none' : 'currentColor'}
          strokeWidth={isActive ? 0 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
        </svg>
      )

    case 'leaderboard':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`w-6 h-6 shrink-0 ${strokeClass}`}
        >
          {isActive ? (
            <>
              {/* Чаша залита целиком */}
              <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" fill="currentColor" stroke="none" />
              {/* Ножка и основание залиты целиком */}
              <path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2h10v-2a2 2 0 0 0-2-2 1 1 0 0 1-1-1v-2.34z" fill="currentColor" stroke="none" />
              {/* Нижняя опора кубка */}
              <path d="M4 22h16" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
              {/* Ручки кубка */}
              <path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            <>
              <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 22h16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </>
          )}
        </svg>
      )

    case 'explore':
      return (
        <Search
          size={24}
          strokeWidth={isActive ? 3 : 2}
          className={`w-6 h-6 shrink-0 fill-none ${
            isActive
              ? 'text-[var(--text)] stroke-current'
              : 'text-[var(--muted)] group-hover:text-[var(--text)] transition-colors'
          }`}
        />
      )

    case 'profile':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`w-6 h-6 shrink-0 ${strokeClass}`}
          fill={isActive ? 'currentColor' : 'none'}
          stroke={isActive ? 'none' : 'currentColor'}
          strokeWidth={isActive ? 0 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )

    case 'vault':
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`w-6 h-6 shrink-0 ${strokeClass}`}
          fill={isActive ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={isActive ? 1 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )

    case 'premium':
      if (isActive) {
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
      }
      return (
        <BadgeCheck
          size={24}
          strokeWidth={2}
          className="w-6 h-6 shrink-0 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors"
        />
      )

    case 'analytics':
      if (isActive) {
        return (
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
            <BarChart2 className="w-4 h-4 text-black fill-none stroke-black" strokeWidth={2.5} />
          </div>
        )
      }
      return (
        <BarChart2
          size={24}
          strokeWidth={2}
          className="w-6 h-6 shrink-0 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors"
        />
      )

    case 'intentions':
      if (isActive) {
        return (
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
            <Target className="w-4 h-4 text-black fill-none stroke-black" strokeWidth={2.5} />
          </div>
        )
      }
      return (
        <Target
          size={24}
          strokeWidth={2}
          className="w-6 h-6 shrink-0 text-[var(--muted)] group-hover:text-[var(--text)] transition-colors"
        />
      )

    case 'settings':
      return (
        <Settings
          size={24}
          strokeWidth={isActive ? 2.8 : 2}
          className={`w-6 h-6 shrink-0 fill-none ${
            isActive
              ? 'text-[var(--text)] stroke-current'
              : 'text-[var(--muted)] group-hover:text-[var(--text)] transition-colors'
          }`}
        />
      )

    default:
      return (
        <Home
          size={24}
          strokeWidth={isActive ? 2.5 : 2}
          className={`w-6 h-6 shrink-0 ${strokeClass}`}
        />
      )
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
  const isAuthor =
    !username ||
    username.toLowerCase() === 'cernavation' ||
    username.toLowerCase() === 'alex_cerna' ||
    displayName.toLowerCase().includes('cerna') ||
    displayName.toLowerCase().includes('церна') ||
    displayName.toLowerCase().includes('черняк')
  const avatarImage =
    currentUser?.avatarImage ||
    state.profile.avatarImage ||
    (isAuthor ? '/author-avatar.png' : null)

  const handleSignOut = () => {
    setIsMenuOpen(false)
    signOut()
    onNotify('Вы вышли из аккаунта')
  }

  const renderNavItem = ({ id, label }: NavItemDef) => {
    const isActive = view === id
    const handleClick = () => {
      playClick(state.soundEnabled)
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
          className={`nav-item group relative flex items-center hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-150 rounded-full ${
            isCollapsed
              ? 'w-[50px] h-[50px] p-0 justify-center mx-auto'
              : 'w-[50px] xl:w-full h-[50px] xl:h-auto p-0 xl:gap-3.5 xl:pl-3 xl:pr-4 py-0 xl:py-2.5 justify-center xl:justify-start mx-auto xl:mx-0'
          } ${isActive ? 'active text-[var(--text)] fill-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)] font-medium'}`}
          onClick={handleClick}
          aria-label={label}
          aria-current={isActive ? 'page' : undefined}
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0 overflow-visible">
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
          className={`brand cursor-pointer group min-h-[40px] flex items-center hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-150 rounded-full ${
            isCollapsed
              ? 'justify-center w-[50px] h-[50px] px-0 mb-2 mx-auto'
              : 'justify-center xl:justify-start w-[50px] xl:w-full h-[50px] xl:h-auto px-0 xl:pl-1 xl:pr-3 py-1 mb-1 gap-2.5 mx-auto xl:mx-0'
          }`}
          onClick={() => {
            playClick(state.soundEnabled)
            onNavigate('home')
          }}
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
            className={`x-compose-btn hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-150 rounded-full ${
              isCollapsed
                ? 'w-[50px] h-[50px] p-0 rounded-full flex items-center justify-center mx-auto my-2 min-h-[50px] min-w-[50px]'
                : 'w-[50px] xl:w-full h-[50px] xl:h-auto p-0 xl:py-3.5 rounded-full flex items-center justify-center mx-auto my-2 min-h-[50px] min-w-[50px]'
            }`}
            onClick={() => {
              playClick(state.soundEnabled)
              onCompose()
            }}
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
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-[var(--text)] rounded-full hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-150 text-left"
                onClick={() => {
                  playClick(state.soundEnabled)
                  setIsMenuOpen(false)
                  if (onOpenProfile) onOpenProfile()
                  else onNavigate('profile')
                }}
              >
                <User size={16} /> Мой профиль
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-[var(--text)] rounded-full hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-150 text-left"
                onClick={() => {
                  playClick(state.soundEnabled)
                  setIsMenuOpen(false)
                  onNavigate('settings')
                }}
              >
                <Settings size={16} /> Настройки
              </button>

              <div className="my-1 border-t border-[var(--border)]" />

              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-semibold text-rose-500 rounded-full hover:bg-rose-500/10 active:scale-[0.98] transition-all duration-150 text-left"
                onClick={() => {
                  playClick(state.soundEnabled)
                  handleSignOut()
                }}
              >
                <LogOut size={16} /> Выйти
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          className={`profile-mini cursor-pointer relative z-50 flex items-center rounded-full hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-150 text-left border-0 bg-transparent ${
            isCollapsed
              ? 'w-[50px] h-[50px] p-0 justify-center mx-auto'
              : 'w-[50px] xl:w-full h-[50px] xl:h-auto p-0 xl:gap-3 xl:pl-1 xl:pr-3 xl:py-2 justify-center xl:justify-start rounded-full mx-auto xl:mx-0'
          }`}
          onClick={() => {
            playClick(state.soundEnabled)
            setIsMenuOpen(!isMenuOpen)
          }}
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
