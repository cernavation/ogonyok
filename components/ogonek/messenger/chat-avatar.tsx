'use client'

import { useEffect, useState } from 'react'
import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getInitials } from '@/lib/ogonek/initials'
import { getProfile } from '@/lib/supabase/api'

type Props = {
  friendId?: string
  size?: number
  /** Показывать ли точку онлайн-статуса */
  showPresence?: boolean
  /** Цвет рамки точки (под фон контейнера) */
  ringColor?: string
  fallbackAvatar?: string | null
  fallbackName?: string | null
}

/**
 * Аватар собеседника в мессенджере.
 * Поддерживает как друзей из социальной карты, так и реальных пользователей Supabase.
 * Никогда не отображает сырой UUID пользователю.
 */
export function ChatAvatar({
  friendId,
  size = 44,
  showPresence = true,
  ringColor = '#0b0c0d',
  fallbackAvatar,
  fallbackName,
}: Props) {
  const { state } = useOgonekStore()
  const friend = friendId ? getFriend(friendId) : undefined
  const thread = friendId ? state?.chatThreads?.[friendId] : undefined
  const peerMeta = thread?.peerMeta

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(friendId || '')
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)
  const [profileInitials, setProfileInitials] = useState<string | null>(null)

  useEffect(() => {
    if (!fallbackAvatar && !friend && !peerMeta?.avatarUrl && friendId && isUuid) {
      getProfile(friendId)
        .then((p) => {
          if (p?.avatar_image) setProfileAvatar(p.avatar_image)
          if (p?.display_name || p?.username) {
            setProfileInitials(getInitials(p.display_name, p.username))
          }
        })
        .catch(() => {})
    }
  }, [fallbackAvatar, friend, peerMeta, friendId, isUuid])

  if (!friend && !peerMeta && !friendId && !fallbackAvatar && !fallbackName) return null

  const presence = friend ? presenceMeta(friend.presence) : { label: 'Офлайн', color: '#71767b' }
  const name =
    fallbackName ||
    friend?.name ||
    peerMeta?.name ||
    (peerMeta?.username ? `@${peerMeta.username}` : (isUuid ? 'Собеседник' : (friendId || 'Собеседник')))

  const initials =
    (fallbackName ? getInitials(fallbackName) : '') ||
    friend?.initials ||
    peerMeta?.initials ||
    profileInitials ||
    (peerMeta?.name || peerMeta?.username ? getInitials(peerMeta?.name || '', peerMeta?.username) : 'ОГ')

  const avatarUrl = fallbackAvatar || peerMeta?.avatarUrl || profileAvatar

  return (
    <span className="relative inline-flex flex-none" style={{ width: size, height: size }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="rounded-full object-cover shrink-0 border border-[var(--line)]"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full font-bold select-none shrink-0 border border-[var(--line)] bg-[var(--surface2)] text-[var(--text)]"
          style={{
            background: friend?.avatarColor || undefined,
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
