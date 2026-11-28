'use client'

import { Flame, Settings, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getInitials } from '@/lib/ogonek/initials'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import type { StreakStatus } from '@/lib/ogonek/streak'
import type { ViewId } from '@/lib/ogonek/types'
import { NotificationsPopover } from './notifications'

type Props = {
  onNavigate: (view: ViewId) => void
  onNotify: (msg: string) => void
  onOpenFriends?: () => void
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
}

export function MobileTopBar({ onNavigate, onNotify, onOpenFriends, streak }: Props) {
  const { state, currentUser, signOut, markAllNotificationsRead, markNotificationRead } = useOgonekStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  useBodyScrollLock(drawerOpen)

  useEffect(() => {
    const handleToggleDrawer = (e: any) => {
      if (typeof e.detail?.open === 'boolean') {
        setDrawerOpen(e.detail.open)
      } else {
        setDrawerOpen((prev) => !prev)
      }
    }
    window.addEventListener('ogonek:toggle-mobile-drawer', handleToggleDrawer)
    return () => window.removeEventListener('ogonek:toggle-mobile-drawer', handleToggleDrawer)
  }, [])

  const displayName = currentUser?.displayName || state.profile.displayName || 'Пользователь'
  const username = currentUser?.username || state.profile.username || 'user'
  const avatarImage = currentUser?.avatarImage || state.profile.avatarImage
  const initials = getInitials(displayName, username)

  return (
    <>
      {/* Sticky top bar */}
      <header className="sticky top-0 h-[53px] bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--line)] flex items-center justify-between px-4 z-40 md:hidden select-none shrink-0 mobile-header">
        {/* Left: mini avatar — opens side drawer */}
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
          aria-label="Открыть меню профиля"
          onClick={() => setDrawerOpen(true)}
        >
          {avatarImage ? (
            <img
              src={avatarImage}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover border border-[var(--line)]"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-[var(--surface2)] text-[var(--text)] border border-[var(--line)]"
            >
              {initials.charAt(0)}
            </div>
          )}
        </button>

        {/* Center: Winlog logo */}
        <button
          type="button"
          className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
          onClick={() => onNavigate('home')}
          aria-label="На главную"
        >
          <span className="w-7 h-7 rounded-full bg-[#d76737]/15 flex items-center justify-center">
            <Flame size={16} className="text-[#d76737] fill-[#d76737]/20" />
          </span>
          <span className="font-bold text-[17px] tracking-tight text-[var(--text)]">Winlog</span>
        </button>

        {/* Right: Streak badge + Settings icon */}
        <div className="flex items-center gap-1.5">
          {streak != null && (
            <button
              type="button"
              data-tour="nav-streak"
              onClick={() => onNavigate('leaderboard')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--surface-subtle,#1d1f23)] border border-[var(--border)] active:scale-95 transition-transform"
              aria-label={`Текущий стрик: ${streak} дней`}
            >
              <Flame size={14} className="text-[#d76737] fill-[#d76737]" />
              <span className="text-[12px] font-bold text-[var(--text)]">{streak}</span>
            </button>
          )}
          {onOpenFriends && (
            <button
              type="button"
              data-tour="nav-friends"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] active:opacity-70 transition-colors relative"
              aria-label="Друзья"
              onClick={onOpenFriends}
            >
              <Users size={19} strokeWidth={1.8} />
              {(state.incomingFriendRequests?.length ?? 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          )}
          <NotificationsPopover
            notifications={state.notifications || []}
            unreadCount={state.unreadNotificationsCount || 0}
            onMarkAllRead={markAllNotificationsRead}
            onMarkRead={markNotificationRead}
            onOpenFriends={onOpenFriends}
            onOpenChat={() => onNavigate('messages')}
            onNavigate={onNavigate}
          />
          <button
            type="button"
            data-tour="nav-settings"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] active:opacity-70 transition-colors"
            aria-label="Настройки"
            onClick={() => onNavigate('settings')}
          >
            <Settings size={20} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Side drawer backdrop */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-[60] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-[var(--surface)] border-r border-[var(--line)] z-[61] flex flex-col p-5 gap-4 md:hidden shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              role="dialog"
              aria-modal="true"
              aria-label="Меню профиля"
            >
              {/* User info */}
              <div className="flex items-center gap-3 pt-8 pb-4 border-b border-[var(--line)]">
                {avatarImage ? (
                  <img
                    src={avatarImage}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover border border-[var(--line)]"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--surface2)] text-[var(--text)] border border-[var(--line)]"
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[var(--text)] truncate">{displayName}</p>
                  <p className="text-[12px] text-[var(--text-3)] font-mono truncate">@{username}</p>
                </div>
              </div>

              {/* Menu items */}
              <nav className="flex flex-col gap-1 flex-1">
                {[
                  { id: 'profile' as ViewId, label: 'Мой профиль' },
                  { id: 'settings' as ViewId, label: 'Настройки', tour: 'nav-settings' },
                  { id: 'premium' as ViewId, label: 'Премиум', tour: 'nav-premium' },
                  { id: 'leaderboard' as ViewId, label: 'Рейтинг' },
                  { id: 'vault' as ViewId, label: 'Evidence Vault', tour: 'nav-vault' },
                  { id: 'analytics' as ViewId, label: 'Аналитика', tour: 'nav-analytics' },
                  { id: 'intentions' as ViewId, label: 'Намерения' },
                ].map(({ id, label, tour }) => (
                  <button
                    key={id}
                    type="button"
                    data-tour={tour}
                    className="w-full text-left px-3 py-3 rounded-xl text-[15px] text-[var(--text)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] transition-colors"
                    onClick={() => {
                      onNavigate(id)
                      setDrawerOpen(false)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* Sign out */}
              <button
                type="button"
                className="w-full text-left px-3 py-3 rounded-xl text-[15px] text-rose-500 hover:bg-rose-500/10 transition-colors mt-auto font-medium"
                onClick={() => {
                  setDrawerOpen(false)
                  signOut()
                  onNotify('Вы вышли из аккаунта')
                }}
              >
                Выйти из аккаунта
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
