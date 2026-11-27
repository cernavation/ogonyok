'use client'

import {
  Ban,
  Check,
  ExternalLink,
  Flame,
  MessageCircle,
  MoreHorizontal,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getFriend, type FriendProfile } from '@/lib/ogonek/friends'
import { getInitials } from '@/lib/ogonek/initials'
import { canMessageUser } from '@/lib/ogonek/privacy'
import { blockUserApi } from '@/lib/ogonek/social'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  getCachedProfileSync,
  getProfile,
  getSocialGraphFromFollows,
  type ProfileRecord,
} from '@/lib/supabase/api'
import { UserAvatar, VerifiedBadge } from './ui'

type Props = {
  friendId: string
  onClose: () => void
  onNotify: (message: string) => void
  onStartChat?: (friendId: string) => void
  onOpenProfile?: (friendId: string) => void
  soundEnabled?: boolean
}

function recordToFriendView(p: ProfileRecord): FriendProfile {
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
    presence: 'online',
  }
}

/**
 * Компактная тёмная карточка друга в стиле Priday (без лишнего мусора).
 */
export function FriendDetailModal({
  friendId,
  onClose,
  onNotify,
  onStartChat,
  onOpenProfile,
  soundEnabled = true,
}: Props) {
  useBodyScrollLock(true)

  const {
    state,
    currentUser,
    addFriend,
    removeFriend,
    toggleFollow,
    setActiveChatFriend,
    updateStore,
  } = useOgonekStore()

  const viewerId = currentUser?.id || state.auth?.activeAccountId || null
  const [liveRecord, setLiveRecord] = useState<ProfileRecord | null>(() => getCachedProfileSync(friendId))
  const [mutualCount, setMutualCount] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const friendIds = useMemo(() => state.friendIds ?? [], [state.friendIds])
  const followingIds = useMemo(() => state.followingIds ?? [], [state.followingIds])

  // Закрытие по Escape и клику вне выпадающего меню
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false)
        else onClose()
      }
    }
    const onDown = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [menuOpen, onClose])

  // Загрузка актуального профиля и реального количества общих друзей из БД
  useEffect(() => {
    let cancelled = false
    const cached = getCachedProfileSync(friendId)
    if (cached) setLiveRecord(cached)

    const loadDetails = async () => {
      try {
        const [profile, targetGraph, myGraph] = await Promise.all([
          getProfile(friendId),
          getSocialGraphFromFollows(friendId),
          viewerId && !viewerId.startsWith('anon-') && !viewerId.startsWith('acct-guest')
            ? getSocialGraphFromFollows(viewerId)
            : Promise.resolve(null),
        ])
        if (cancelled) return
        if (profile) setLiveRecord(profile)

        const myFriendsSet = new Set(myGraph ? myGraph.friendIds : friendIds)
        const realMutual = targetGraph.friendIds.filter(
          (id) => id !== viewerId && myFriendsSet.has(id)
        ).length
        setMutualCount(realMutual)
      } catch {
        if (!cancelled) setMutualCount(0)
      }
    }

    void loadDetails()
    return () => {
      cancelled = true
    }
  }, [friendId, viewerId, friendIds])

  const fallbackFriend = getFriend(friendId)
  const friend: FriendProfile | null = useMemo(() => {
    if (liveRecord) return recordToFriendView(liveRecord)
    return fallbackFriend ?? null
  }, [liveRecord, fallbackFriend])

  const isFriend = friendIds.includes(friendId)
  const isFollowing = followingIds.includes(friendId) || isFriend
  const isOnline = friend?.presence === 'online'

  const statusText = isFriend ? 'Друзья ✓' : isFollowing ? 'Вы подписаны' : 'Не в друзьях'
  const dmPerm = useMemo(() => {
    return canMessageUser({
      viewerId,
      targetProfile: liveRecord,
      isMutualFriend: isFriend,
    })
  }, [viewerId, liveRecord, isFriend])

  if (typeof document === 'undefined') return null

  const handleMessage = () => {
    if (!dmPerm.allowed) {
      onNotify(dmPerm.reason || 'Пользователь ограничил получение личных сообщений')
      return
    }
    playClick(soundEnabled)
    setActiveChatFriend(friendId)
    onClose()
    if (onStartChat) {
      onStartChat(friendId)
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ogonek:navigate-view', {
          detail: { view: 'messages', chatId: friendId },
        })
      )
    }
  }

  const handleOpenProfile = () => {
    playClick(soundEnabled)
    onClose()
    if (onOpenProfile) {
      onOpenProfile(friendId)
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ogonek:navigate-view', {
          detail: { view: 'profile', userId: friendId },
        })
      )
    }
  }

  const handleToggleFriend = () => {
    playClick(soundEnabled)
    setMenuOpen(false)
    if (!friend) return
    if (isFriend) {
      removeFriend(friendId)
      if (followingIds.includes(friendId)) {
        void toggleFollow(friendId)
      }
      onNotify(`@${friend.username} убран из друзей`)
      return
    }
    addFriend(friendId)
    if (!followingIds.includes(friendId)) {
      void toggleFollow(friendId)
    }
    playSuccess(soundEnabled)
    onNotify(`@${friend.username} добавлен в друзья ✓`)
  }

  const handleBlock = async () => {
    playClick(soundEnabled)
    setMenuOpen(false)
    if (!friend) return
    removeFriend(friendId)
    updateStore((prev) => ({
      ...prev,
      blockedUserIds: Array.from(new Set([...(prev.blockedUserIds ?? []), friendId])),
    }))
    if (viewerId) {
      await blockUserApi(friendId, viewerId).catch(() => {})
    }
    onNotify(`@${friend.username} заблокирован`)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[4px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={friend ? `Профиль ${friend.name}` : 'Карточка друга'}
        className="relative w-full max-w-md rounded-2xl bg-[#060608] border border-white/[0.14] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.95)] text-[var(--text,#fff)]"
      >
        {/* Верхние кнопки: ... меню и X закрыть */}
        <div className="flex items-center justify-end gap-1.5 mb-1">
          {friend && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setMenuOpen((v) => !v)
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Дополнительные действия"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-black border border-white/[0.14] shadow-[0_12px_36px_rgba(0,0,0,0.9)] p-1.5 z-30 flex flex-col gap-0.5 text-xs">
                  <button
                    type="button"
                    onClick={handleToggleFriend}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-left font-semibold text-[var(--text,#fff)] transition-colors cursor-pointer"
                  >
                    {isFriend ? <UserMinus size={14} className="text-amber-400" /> : <UserPlus size={14} className="text-[#ff5a1f]" />}
                    <span>{isFriend ? 'Убрать из друзей' : 'Добавить в друзья'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBlock}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left font-semibold transition-colors cursor-pointer"
                  >
                    <Ban size={14} />
                    <span>Заблокировать</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Закрыть карточку друга"
          >
            <X size={18} />
          </button>
        </div>

        {!friend ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-[var(--muted,#71767b)]">
              Профиль недоступен — возможно, связь была удалена.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full text-xs font-bold bg-black border border-white/[0.18] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Шапка: Аватар, Имя + синяя галочка, @username, компактный статус */}
            <div className="flex items-center gap-3.5">
              <UserAvatar
                avatarUrl={friend.avatarUrl}
                avatarColor={friend.avatarColor}
                displayName={friend.name}
                username={friend.username}
                initials={friend.initials}
                size={64}
                isOnline={isOnline}
                ringColor="#060608"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-[18px] font-extrabold text-[var(--text,#fff)] truncate leading-tight">
                    {friend.name}
                  </h3>
                  {friend.verified && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-[13px] text-[var(--muted,#71767b)] truncate mt-0.5">
                  @{friend.username}
                </p>
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.04] border border-white/[0.1]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#00ba7c]' : 'bg-zinc-500'}`}
                    aria-hidden="true"
                  />
                  <span className={isOnline ? 'text-[#00ba7c]' : 'text-[var(--muted,#71767b)]'}>
                    {isOnline ? 'В сети' : 'Не в сети'}
                  </span>
                </div>
              </div>
            </div>

            {friend.bio && friend.bio.trim().length > 0 && (
              <p className="text-[13px] text-[var(--text-2,#a1a1aa)] leading-relaxed line-clamp-2">
                {friend.bio}
              </p>
            )}

            {/* Строка из 3 чистых метрик в стиле X.com с тонкими разделителями */}
            <div className="grid grid-cols-3 rounded-2xl bg-white/[0.02] border border-white/[0.1] divide-x divide-white/[0.1]">
              <div className="px-3 py-2.5 text-center">
                <div className="text-[14px] font-extrabold text-[var(--text,#fff)] inline-flex items-center justify-center gap-1">
                  <Flame size={13} className="text-[#ff5a1f] fill-[#ff5a1f]" />
                  <span>{friend.streak} дн.</span>
                </div>
                <div className="text-[11px] text-[var(--muted,#71767b)] mt-0.5">Стрик</div>
              </div>

              <div className="px-3 py-2.5 text-center">
                <div className="text-[13px] font-bold text-emerald-400 inline-flex items-center justify-center gap-1 truncate max-w-full">
                  {isFriend && <Check size={12} />}
                  <span className="truncate">{isFriend ? 'Друзья' : statusText}</span>
                </div>
                <div className="text-[11px] text-[var(--muted,#71767b)] mt-0.5">Статус</div>
              </div>

              <div className="px-3 py-2.5 text-center">
                <div className="text-[14px] font-extrabold text-[var(--text,#fff)] inline-flex items-center justify-center gap-1">
                  <Users size={13} className="text-[var(--muted,#71767b)]" />
                  <span>{mutualCount === null ? '…' : mutualCount}</span>
                </div>
                <div className="text-[11px] text-[var(--muted,#71767b)] mt-0.5">Общие</div>
              </div>
            </div>

            {/* Две чистые основные кнопки */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                aria-disabled={!dmPerm.allowed}
                title={!dmPerm.allowed ? dmPerm.reason : undefined}
                onClick={handleMessage}
                className={`h-11 px-4 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                  dmPerm.allowed
                    ? 'bg-[#ff5a1f] hover:opacity-90 text-white active:scale-[0.98] cursor-pointer'
                    : 'bg-white/[0.04] border border-white/[0.1] text-[var(--text-3)] opacity-60 cursor-not-allowed'
                }`}
              >
                <MessageCircle size={15} />
                <span>{dmPerm.allowed ? 'Написать' : 'ЛС закрыты'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenProfile}
                className="h-11 px-4 rounded-full bg-black hover:bg-white/[0.06] border border-white/[0.18] text-[var(--text,#fff)] text-[13px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <ExternalLink size={15} />
                <span>Открыть профиль</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
