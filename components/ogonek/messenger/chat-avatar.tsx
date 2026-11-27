'use client'

import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import { isPridayChat } from '@/lib/ogonek/priday-system-chat'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getCachedProfileSync, getProfile, type ProfileRecord } from '@/lib/supabase/api'
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
 * Использует синхронный кэш профиля + разовую подгрузку из public.profiles без зацикливания.
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

  const isPriday = isPridayChat(friendId) || isPridayChat(targetUserId)

  const friend = !isPriday && targetUserId ? getFriend(targetUserId) : undefined
  const thread = !isPriday && friendId ? state?.chatThreads?.[friendId] : undefined
  const peerMeta = thread?.peerMeta
  const cachedSync = !isPriday && targetUserId ? getCachedProfileSync(targetUserId) : null
  const [liveProfile, setLiveProfile] = useState<ProfileRecord | null>(cachedSync)

  useEffect(() => {
    if (isPriday || !targetUserId || friend || !UUID_REGEX.test(targetUserId)) {
      setLiveProfile(null)
      return
    }

    const cached = getCachedProfileSync(targetUserId)
    if (cached) setLiveProfile(cached)

    let cancelled = false
    getProfile(targetUserId)
      .then((p) => {
        if (cancelled || !p) return
        setLiveProfile(p)
        const nextUrl = p.avatar_image || p.avatar_url || undefined
        const nextColor = p.avatar_color || undefined
        const nextVerified = Boolean(p.verified)
        const nextName = p.display_name || p.username || undefined
        if (friendId) {
          updateThreadPeerMeta(friendId, {
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
  }, [isPriday, targetUserId, friend, friendId, updateThreadPeerMeta])

  if (isPriday) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-[#FF8A3D] via-[#FF5C00] to-[#E53900] text-white flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(255,92,0,0.4)] border border-white/20"
        style={{ width: size, height: size }}
        aria-label="Priday"
      >
        <Flame size={Math.max(16, Math.round(size * 0.54))} fill="currentColor" strokeWidth={1.8} />
      </div>
    )
  }

  const effectiveProfile = liveProfile || cachedSync
  const displayName =
    effectiveProfile?.display_name ||
    peerMeta?.name ||
    friend?.name ||
    fallbackName ||
    effectiveProfile?.username ||
    peerMeta?.username ||
    'Собеседник'

  const username = effectiveProfile?.username || peerMeta?.username || friend?.username || undefined
  const avatarUrl =
    effectiveProfile?.avatar_image ||
    effectiveProfile?.avatar_url ||
    peerMeta?.avatarUrl ||
    fallbackAvatar ||
    null
  const avatarColor =
    effectiveProfile?.avatar_color ||
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
