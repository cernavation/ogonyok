'use client'

import { Home, MessageCircle, Plus, Search } from 'lucide-react'
import { getInitials } from '@/lib/ogonek/initials'
import { totalUnread } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'

const ITEMS = [
  { id: 'home' as ViewId, icon: Home, label: 'Главная' },
  { id: 'explore' as ViewId, icon: Search, label: 'Поиск' },
  { id: 'messages' as ViewId, icon: MessageCircle, label: 'Чаты' },
] as const

type Props = {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onCompose: () => void
}

export function BottomNav({ view, onNavigate, onCompose }: Props) {
  const { state, currentUser } = useOgonekStore()
  const unread = totalUnread(state.chatThreads ?? {})

  // Determine active state: profile/vault/intentions/analytics/leaderboard/settings/premium map to closest or none
  const activeId: ViewId =
    view === 'vault' || view === 'intentions' || view === 'analytics' || view === 'leaderboard' || view === 'premium'
      ? 'home'
      : view === 'settings'
      ? 'profile'
      : view

  const displayName = currentUser?.displayName || state.profile.displayName || 'Пользователь'
  const username = currentUser?.username || state.profile.username || 'user'
  const avatarImage = currentUser?.avatarImage || state.profile.avatarImage
  const initials = getInitials(displayName, username)

  return (
    <>
      {/* Bottom navigation bar — fixed, glass, X.com style */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-[53px] bg-[var(--surface)]/90 backdrop-blur-md border-t border-[var(--line)] flex items-center justify-around z-50 md:hidden bottom-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Основная навигация"
      >
        {ITEMS.map(({ id, icon: Icon, label }) => {
          const active = activeId === id
          return (
            <button
              key={id}
              type="button"
              className="flex-1 flex flex-col items-center justify-center h-full relative text-[var(--text)] active:scale-[0.98] transition-all duration-150"
              style={{ color: active ? 'var(--text)' : 'var(--muted)' }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                playClick(state.soundEnabled)
                onNavigate(id)
              }}
            >
              {id === 'home' && active ? (
                <svg viewBox="0 0 24 24" width={24} height={24} className="w-6 h-6 shrink-0 fill-current" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2.69l5.66 5.66a8 8 0 0 1 2.34 5.65v5.5a2.5 2.5 0 0 1-2.5 2.5H15v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H6.5A2.5 2.5 0 0 1 4 19.5V14a8 8 0 0 1 2.34-5.65L12 2.69z"
                  />
                </svg>
              ) : id === 'explore' && active ? (
                <svg viewBox="0 0 24 24" width={24} height={24} className="w-6 h-6 shrink-0 fill-current" aria-hidden="true">
                  <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.532.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
                </svg>
              ) : id === 'messages' && active ? (
                <svg viewBox="0 0 24 24" width={24} height={24} className="w-6 h-6 shrink-0 fill-current" aria-hidden="true">
                  <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 4.444 8-4.444V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-7.525 4.18c-.148.083-.313.124-.475.124-.162 0-.327-.041-.475-.124L4 10.463V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" />
                </svg>
              ) : (
                <Icon
                  size={24}
                  strokeWidth={2}
                  className="w-6 h-6 stroke-[2px]"
                />
              )}
              {id === 'messages' && unread > 0 && (
                <span
                  className="absolute top-2 right-[calc(50%-6px)] min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#ff5c00] text-white text-[10px] font-bold flex items-center justify-center"
                  aria-label={`${unread} непрочитанных`}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          )
        })}

        {/* Profile icon — circular avatar */}
        <button
          type="button"
          className="flex-1 flex flex-col items-center justify-center h-full active:scale-[0.98] transition-all duration-150"
          aria-label="Профиль"
          aria-current={activeId === 'profile' ? 'page' : undefined}
          onClick={() => {
            playClick(state.soundEnabled)
            onNavigate('profile')
          }}
        >
          {avatarImage ? (
            <img
              src={avatarImage}
              alt={displayName}
              className="w-[28px] h-[28px] rounded-full object-cover border border-[var(--line)]"
              style={{
                outline: activeId === 'profile' ? '2px solid var(--accent)' : 'none',
                outlineOffset: '1px',
              }}
            />
          ) : (
            <div
              className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold bg-[var(--surface2)] text-[var(--text)] border border-[var(--line)]"
              style={{
                outline: activeId === 'profile' ? '2px solid var(--accent)' : 'none',
                outlineOffset: '1px',
              }}
            >
              {initials.charAt(0)}
            </div>
          )}
        </button>
      </nav>

      {/* FAB — floating action button above bottom bar (только на контентных вкладках) */}
      {view !== 'settings' && view !== 'messages' && view !== 'leaderboard' && view !== 'premium' && (
        <button
          type="button"
          className="fixed bottom-16 right-4 z-[51] w-14 h-14 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform md:hidden"
          aria-label="Записать день"
          onClick={() => {
            playClick(state.soundEnabled)
            onCompose()
          }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}
