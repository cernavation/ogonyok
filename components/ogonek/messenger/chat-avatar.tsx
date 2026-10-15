'use client'

import { getFriend, presenceMeta } from '@/lib/ogonek/friends'

type Props = {
  friendId: string
  size?: number
  /** Показывать ли точку онлайн-статуса */
  showPresence?: boolean
  /** Цвет рамки точки (под фон контейнера) */
  ringColor?: string
}

/**
 * ЭТАП 13 — Аватар собеседника в мессенджере.
 * Использует палитру и присутствие из социальной карты друзей.
 */
export function ChatAvatar({ friendId, size = 44, showPresence = true, ringColor = '#0b0c0d' }: Props) {
  const friend = getFriend(friendId)
  if (!friend) return null
  const presence = presenceMeta(friend.presence)

  return (
    <span className="relative inline-flex flex-none" style={{ width: size, height: size }}>
      <span
        className="grid h-full w-full place-items-center rounded-full font-bold text-white"
        style={{
          background: friend.avatarColor,
          textShadow: '0 1px 2px #000',
          fontSize: Math.round(size * 0.36),
        }}
        aria-hidden="true"
      >
        {friend.initials}
      </span>
      {showPresence && (
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
