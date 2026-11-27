'use client'

import { useEffect, useState } from 'react'
import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getProfile, type ProfileRecord } from '@/lib/supabase/api'
import { getInitials } from '@/lib/ogonek/initials'
import { UserAvatar } from '../ui'

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Аватар собеседника в мессенджере на базе единого <UserAvatar />.
 * Подтягивает свежий avatar_url / avatar_image / avatar_color / verified
 * напрямую из public.profiles Supabase по userId собеседника.
 */
export function ChatAvatar({
  friendId,
  size = 44,
  showPresence = true,
  ringColor = '#0b0c0d',
  fallbackAvatar,
  fallbackName,
}: Props) {
  const { state, updateThreadPeerMeta } = useOgonekStore()
  const currentUserId = state.auth?.activeAccountId || null

  const targetUserId = (() => {
    if (!friendId) return undefined
    if (friendId.includes('_')) {
      const parts = friendId.split('_').filter(Boolean)
      return (currentUserId && parts.find((p) => p !== currentUserId)) || parts[0]
    }
    return friendId
  })()

  const friend = targetUserId ? getFriend(targetUserId) : undefined
  const thread = friendId ? state?.chatThreads?.[friendId] : undefined
  const peerMeta = thread?.peerMeta
  const [liveProfile, setLiveProfile] = useState<ProfileRecord | null>(null)

  useEffect(() => {
    if (!targetUserId || friend || !UUID_REGEX.test(targetUserId)) {
      setLiveProfile(null)
      return
    }

    let cancelled = false
    getProfile(targetUserId)
      .then((p) => {
        if (cancelled || !p) return
        setLiveProfile(p)
        const nextUrl = p.avatar_image || p.avatar_url || undefined
        const nextColor = p.avatar_color || undefined
        const nextVerified = Boolean(p.verified)
        const nextName = p.display_name || p.username || undefined
        if (
          peerMeta?.avatarUrl !== nextUrl ||
          peerMeta?.avatarColor !== nextColor ||
          peerMeta?.verified !== nextVerified ||
          peerMeta?.name !== nextName
        ) {
          updateThreadPeerMeta(friendId!, {
            name: nextName,
            username: p.username || undefined,
            avatarUrl: nextUrl,
            avatarColor: nextColor,
            verified: nextVerified,
            initials: getInitials(p.display_name, p.username),
          })
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [targetUserId, friend, friendId, updateThreadPeerMeta, peerMeta?.avatarUrl, peerMeta?.avatarColor, peerMeta?.verified, peerMeta?.name])

  const displayName =
    liveProfile?.display_name ||
    friend?.name ||
    peerMeta?.name ||
    fallbackName ||
    liveProfile?.username ||
    peerMeta?.username ||
    'Собеседник'

  const username = liveProfile?.username || friend?.username || peerMeta?.username || undefined
  const avatarUrl =
    liveProfile?.avatar_image ||
    liveProfile?.avatar_url ||
    peerMeta?.avatarUrl ||
    fallbackAvatar ||
    null
  const avatarColor =
    liveProfile?.avatar_color ||
    peerMeta?.avatarColor ||
    friend?.avatarColor ||
    '#FF5C00'
  const initials =
    peerMeta?.initials ||
    friend?.initials ||
    getInitials(displayName, username || 'user')

  const isOnline = showPresence && Boolean(friend && presenceMeta(friend.presence).short === 'онлайн')

  return (
    <UserAvatar
      avatarUrl={avatarUrl}
      avatarColor={avatarColor}
      displayName={displayName}
      username={username}
      initials={initials}
      size={size}
      isOnline={isOnline}
      ringColor={ringColor}
    />
  )
}
