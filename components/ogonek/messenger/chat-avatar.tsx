'use client'

import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getInitials } from '@/lib/ogonek/initials'

type Props = {
  friendId: string
  size?: number
  /** Показывать ли точку онлайн-статуса */
  showPresence?: boolean
  /** Цвет рамки точки (под фон контейнера) */
  ringColor?: string
}

/**
 * Аватар собеседника в мессенджере.
 * Поддерживает как друзей из социальной карты, так и реальных пользователей Supabase.
 */
export function ChatAvatar({ friendId, size = 44, showPresence = true, ringColor = '#0b0c0d' }: Props) {
  const { state } = useOgonekStore()
  const friend = getFriend(friendId)
  const thread = friendId ? state.chatThreads?.[friendId] : undefined
  const peerMeta = thread?.peerMeta

  if (!friend && !peerMeta && !friendId) return null

  const presence = friend ? presenceMeta(friend.presence) : { label: 'Офлайн', color: '#71767b' }
  const name = friend?.name || peerMeta?.name || (peerMeta?.username ? `@${peerMeta.username}` : friendId)
  const initials = friend?.initials || peerMeta?.initials || getInitials(peerMeta?.name || '', peerMeta?.username || friendId)
  const avatarUrl = peerMeta?.avatarUrl

  return (
    <span className="relative inline-flex flex-none" style={{ width: size, height: size }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="rounded-full object-cover shrink-0"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full font-bold text-white shrink-0"
          style={{
            background: friend?.avatarColor || 'linear-gradient(135deg, #ff7a18 0%, #af002d 100%)',
            textShadow: '0 1px 2px #000',
            fontSize: Math.round(size * 0.36),
          }}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
      {showPresence && friend && (
        <span
          className="absolute bottom-0 right-0 rounded-full"
          style={{
            width: Math.max(10, size * 0.28),
            height: Math.max(10, size * 0.28),
            background: presence.color,
            border: `2px solid ${ringColor}`,
          }}
          title={presence.label}
          aria-hidden="true"
        />
      )}
    </span>
  )
}
