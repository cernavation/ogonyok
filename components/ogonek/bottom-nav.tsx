'use client'

import { Home, MessageCircle, Plus, Search } from 'lucide-react'
import { getInitials } from '@/lib/ogonek/initials'
import { totalUnread } from '@/lib/ogonek/messenger'
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
              className="flex-1 flex flex-col items-center justify-center h-full relative text-[var(--text)]"
              style={{ color: active ? 'var(--text)' : 'var(--muted)' }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            >
              {id === 'home' && active ? (
                <svg viewBox="0 0 24 24" width={22} height={22} className="shrink-0 text-current" aria-hidden="true">
                  <path
                    d="M12 2.1L1 12h3v9h6v-5a2 2 0 0 1 4 0v5h6v-9h3L12 2.1z"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              ) : (
                <Icon
                  size={22}
                  strokeWidth={active ? 2.25 : 1.6}
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
          className="flex-1 flex flex-col items-center justify-center h-full"
          aria-label="Профиль"
          aria-current={activeId === 'profile' ? 'page' : undefined}
          onClick={() => onNavigate('profile')}
        >
          {avatarImage ? (
            <img
              src={avatarImage}
              alt={displayName}
              className="w-[26px] h-[26px] rounded-full object-cover border-2"
              style={{
                borderColor: activeId === 'profile' ? 'var(--accent, #FF6A1A)' : 'transparent',
              }}
            />
          ) : (
            <div
              className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2"
              style={{
                background: 'linear-gradient(135deg, #FF6A1A 0%, #FF8533 50%, #2F3336 100%)',
                borderColor: activeId === 'profile' ? 'var(--accent, #FF6A1A)' : 'transparent',
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
          className="fixed bottom-16 right-4 z-[51] w-14 h-14 rounded-full bg-[var(--accent,#FF6A1A)] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(255,106,26,0.45)] active:scale-90 transition-transform md:hidden"
          aria-label="Записать день"
          onClick={onCompose}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}
