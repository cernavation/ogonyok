'use client'

import { ChevronRight, Copy, Check, Search, Flame } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  type FriendProfile,
  formatLastSeenStatus,
  getActiveFriends,
  pluralizeFriends,
  registerFriendProfile,
  sortFriendsForWidget,
} from '@/lib/ogonek/friends'
import { getInitials } from '@/lib/ogonek/initials'
import {
  getCachedProfileSync,
  getProfilesByIds,
  getMutualFriendProfiles,
  type ProfileRecord,
} from '@/lib/supabase/api'
import {
  getEffectiveLastSeenSync,
  usePresenceSnapshot,
} from '@/lib/supabase/presence'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ViewId } from '@/lib/ogonek/types'
import { FriendDetailModal } from './friend-detail-modal'
import { UserAvatar, VerifiedBadge } from './ui'

type Props = {
  onNavigate: (view: ViewId, targetUserId?: string | null) => void
  onNotify: (message: string) => void
  onOpenFriends?: () => void
  soundEnabled?: boolean
}

function profileToFriend(p: ProfileRecord): FriendProfile {
  return {
    id: p.id,
    name: p.display_name || `@${p.username}`,
    username: p.username,
    initials: getInitials(p.display_name, p.username),
    avatarUrl: p.avatar_image || p.avatar_url || null,
    avatarColor: p.avatar_color || '#FF5C00',
    bio: p.bio || '',
    city: p.city || '',
    streak: p.streak_count ?? p.streak ?? 0,
    together: 0,
    mutual: 0,
    verified: Boolean(p.verified),
    lastActive: 'недавно',
    lastSeenAt: p.last_seen_at || null,
    presence: 'offline',
  }
}

export function ActiveFriendsWidget({ onNavigate, onNotify, onOpenFriends, soundEnabled = true }: Props) {
  const { state, setActiveChatFriend } = useOgonekStore()
  const [openFriendId, setOpenFriendId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [cloudFriends, setCloudFriends] = useState<FriendProfile[] | null>(null)
  const [loadingFriends, setLoadingFriends] = useState(false)

  const friendIds = useMemo(() => state.friendIds ?? [], [state.friendIds])
  const incoming = state.incomingFriendRequests ?? []
  const currentUserId = state.auth?.activeAccountId

  const canFetchCloud = Boolean(
    friendIds.length > 0 ||
      (currentUserId && !currentUserId.startsWith('anon-') && !currentUserId.startsWith('acct-guest'))
  )

  useEffect(() => {
    setCloudFriends(null)
  }, [currentUserId])

  useEffect(() => {
    let cancelled = false
    if (!canFetchCloud) {
      setCloudFriends([])
      setLoadingFriends(false)
      return () => {
        cancelled = true
      }
    }

    const loadMutuals = async () => {
      setLoadingFriends(true)
      try {
        const records =
          friendIds.length > 0
            ? Object.values(await getProfilesByIds(friendIds))
            : currentUserId
              ? await getMutualFriendProfiles(currentUserId)
              : []

        if (cancelled) return
        const mapped: FriendProfile[] = records.map((p) => {
          const fp = profileToFriend(p)
          registerFriendProfile(fp)
          return fp
        })
        setCloudFriends(mapped)
      } catch {
        if (!cancelled) setCloudFriends([])
      } finally {
        if (!cancelled) setLoadingFriends(false)
      }
    }
    void loadMutuals()
    return () => {
      cancelled = true
    }
  }, [canFetchCloud, currentUserId, friendIds])

  const syncCachedFriends = useMemo(() => {
    if (friendIds.length === 0) return []
    const out: FriendProfile[] = []
    for (const id of friendIds) {
      const cached = getCachedProfileSync(id)
      if (!cached) continue
      const fp = profileToFriend(cached)
      registerFriendProfile(fp)
      out.push(fp)
    }
    return out
  }, [friendIds])

  const resolvedFriends = useMemo(() => {
    if (cloudFriends !== null) {
      if (cloudFriends.length > 0) return cloudFriends
      return getActiveFriends(friendIds, 20)
    }
    if (syncCachedFriends.length > 0) return syncCachedFriends
    return getActiveFriends(friendIds, 20)
  }, [cloudFriends, syncCachedFriends, friendIds])

  const presenceSnap = usePresenceSnapshot()

  const active = useMemo(
    () =>
      sortFriendsForWidget(
        resolvedFriends,
        presenceSnap.onlineIds,
        presenceSnap.lastSeenOverrides,
        3
      ),
    [resolvedFriends, presenceSnap.onlineIds, presenceSnap.lastSeenOverrides]
  )
  const isInitialLoading = loadingFriends && cloudFriends === null && active.length === 0

  const onlineCount = resolvedFriends.filter((f) => presenceSnap.onlineIds.has(f.id)).length
  const badgeText = isInitialLoading
    ? friendIds.length > 0
      ? pluralizeFriends(friendIds.length)
      : 'Загрузка…'
    : `${onlineCount} в сети`

  const openFriend = (id: string) => {
    playClick(soundEnabled)
    setOpenFriendId(id)
  }

  const handleCopyInvite = () => {
    playClick(soundEnabled)
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${state.profile.username}` : 'https://ogonek.app'
    navigator.clipboard?.writeText(url)
    setCopied(true)
    playSuccess(soundEnabled)
    onNotify('Ссылка-приглашение скопирована в буфер обмена!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section
      className="rounded-2xl border border-white/[0.11] bg-black p-4 transition-colors"
      aria-labelledby="active-friends-title"
    >
      <header className="flex items-center justify-between gap-2 mb-3">
        <h2
          id="active-friends-title"
          className="text-[16px] font-bold tracking-tight text-[var(--text)]"
        >
          Друзья
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)]">
          {onlineCount > 0 && !isInitialLoading && (
            <span className="w-2 h-2 rounded-full bg-[#00ba7c]" aria-hidden="true" />
          )}
          <span>{badgeText}</span>
        </span>
      </header>

      {isInitialLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Загрузка друзей">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3 p-2 rounded-xl border border-white/[0.08] bg-white/[0.02] animate-pulse"
            >
              <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-2.5 w-16 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-center">
          <div className="w-8 h-8 rounded-full bg-[#ff5a1f]/15 text-[#ff5a1f] flex items-center justify-center mx-auto mb-2">
            <Flame size={16} />
          </div>
          <p className="text-xs font-semibold text-[var(--text)] mb-1">У тебя пока нет друзей</p>
          <p className="text-[11px] text-[var(--muted)] mb-3 leading-snug">
            Пригласи друзей вести дневник вместе, делиться гордостями и держать огонь.
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCopyInvite}
              className="w-full min-h-[36px] flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#ff5a1f] text-white text-xs font-bold hover:opacity-90 transition-all active:scale-95 cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Ссылка скопирована!' : 'Скопировать ссылку-приглашение'}</span>
            </button>

            <button
              type="button"
              id="btn-open-friends-modal"
              onClick={onOpenFriends || (() => onNavigate('explore'))}
              className="w-full min-h-[36px] flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-black hover:bg-white/[0.06] text-[var(--text)] text-xs font-medium border border-white/[0.14] transition-all cursor-pointer"
            >
              <Search size={14} /> <span>Найти друзей по нику</span>
            </button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-0.5 list-none m-0 p-0" role="group">
          {active.map((friend) => {
            const isFriendOnline = presenceSnap.onlineIds.has(friend.id)
            const lastSeenAt = getEffectiveLastSeenSync(friend.id, friend.lastSeenAt)
            const status = formatLastSeenStatus(lastSeenAt, isFriendOnline)
            return (
              <li key={friend.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-2 py-2 -mx-2 rounded-xl hover:bg-white/[0.04] transition-colors text-left cursor-pointer group"
                  onClick={() => openFriend(friend.id)}
                  aria-label={`Открыть ${friend.name}`}
                >
                  <UserAvatar
                    avatarUrl={friend.avatarUrl}
                    avatarColor={friend.avatarColor}
                    displayName={friend.name}
                    username={friend.username}
                    initials={friend.initials}
                    size={38}
                    isOnline={status.isOnline}
                    ringColor="#000000"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[14px] font-bold text-[var(--text)] truncate leading-tight">
                          {friend.name.split(/\s+/)[0]}
                        </span>
                        {friend.verified && <VerifiedBadge size="xs" />}
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-[#ff5a1f] font-semibold shrink-0">
                        <Flame size={10} className="fill-[#ff5a1f]" aria-hidden="true" />
                        {friend.streak}
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--muted)] truncate mt-0.5 flex items-center gap-1">
                      <span className={status.isOnline ? 'text-[#00ba7c] font-medium shrink-0' : 'truncate'}>
                        {status.label}
                      </span>
                      <span className="shrink-0">·</span>
                      <span className="truncate">@{friend.username}</span>
                    </div>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-[var(--muted)] group-hover:text-[var(--text)] shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </button>

                {incoming.includes(friend.id) && (
                  <span className="inline-block ml-11 mb-1 text-[11px] font-bold uppercase tracking-wider text-pink-400">
                    заявка в друзья
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {active.length > 0 && (
        <button
          type="button"
          id="btn-open-friends-modal"
          className="mt-1.5 -mx-2 w-[calc(100%+16px)] px-2 py-2 rounded-xl text-left text-[14px] font-medium text-[#ff5a1f] hover:bg-white/[0.03] hover:underline transition-colors cursor-pointer"
          onClick={onOpenFriends || (() => onNavigate('profile'))}
        >
          Показать всех
        </button>
      )}

      {openFriendId && (
        <FriendDetailModal
          friendId={openFriendId}
          onClose={() => setOpenFriendId(null)}
          onNotify={onNotify}
          onStartChat={(id) => {
            setActiveChatFriend(id)
            onNavigate('messages')
          }}
          onOpenProfile={(id) => onNavigate('profile', id)}
          soundEnabled={soundEnabled}
        />
      )}
    </section>
  )
}
