'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { X, Flame, Check, Loader2 } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import { getInitials } from '@/lib/ogonek/initials'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  getProfileFollowers,
  getProfileFollowing,
  checkFriendshipFollow,
  type ProfileRecord,
} from '@/lib/supabase/api'
import { UserAvatar, VerifiedBadge } from './ui'

export type FollowTabId = 'following' | 'followers'

interface Props {
  profileUserId: string
  profileUsername?: string
  profileDisplayName?: string
  initialTab?: FollowTabId
  currentUserId?: string | null
  onClose: () => void
  onOpenProfile?: (userId: string) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

export function FollowListModal({
  profileUserId,
  profileUsername,
  profileDisplayName,
  initialTab = 'followers',
  currentUserId,
  onClose,
  onOpenProfile,
  onNotify,
  soundEnabled = true,
}: Props) {
  useBodyScrollLock(true)

  const { state, toggleExploreFollow } = useOgonekStore()

  const [tab, setTab] = useState<FollowTabId>(initialTab)
  const [followers, setFollowers] = useState<ProfileRecord[]>([])
  const [following, setFollowing] = useState<ProfileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [myFollowingMap, setMyFollowingMap] = useState<Record<string, boolean>>({})
  const [pendingFollowIds, setPendingFollowIds] = useState<Record<string, boolean>>({})

  // Загрузка списков читателей и читаемых из Supabase
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const loadData = async () => {
      try {
        const [followersList, followingList] = await Promise.all([
          getProfileFollowers(profileUserId),
          getProfileFollowing(profileUserId),
        ])

        if (cancelled) return
        setFollowers(followersList)
        setFollowing(followingList)

        // Проверяем статус подписки текущего авторизованного пользователя на людей из обоих списков
        if (currentUserId) {
          const allUserIds = Array.from(
            new Set([...followersList.map((u) => u.id), ...followingList.map((u) => u.id)])
          ).filter((id) => id !== currentUserId)

          const followingUnion = new Set([
            ...(state.followingIds ?? []),
            ...(state.exploreFollowingIds ?? []),
          ])
          const statusEntries = await Promise.all(
            allUserIds.map(async (targetId) => {
              const inStore = followingUnion.has(targetId)
              const isFollowed = inStore || (await checkFriendshipFollow(currentUserId, targetId))
              return [targetId, isFollowed] as const
            })
          )

          if (!cancelled) {
            setMyFollowingMap(Object.fromEntries(statusEntries))
          }
        }
      } catch (err) {
        console.error('Failed to load follow list:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [profileUserId, currentUserId, state.exploreFollowingIds])

  // Закрытие по ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleTabChange = (nextTab: FollowTabId) => {
    playClick(soundEnabled)
    setTab(nextTab)
  }

  const handleToggleFollow = async (e: React.MouseEvent, user: ProfileRecord) => {
    e.stopPropagation()
    playClick(soundEnabled)

    if (!currentUserId) {
      onNotify('Войдите, чтобы подписываться на пользователей')
      return
    }

    if (currentUserId === user.id) return

    const currentlyFollowed = Boolean(myFollowingMap[user.id])
    const nextStatus = !currentlyFollowed

    setMyFollowingMap((prev) => ({ ...prev, [user.id]: nextStatus }))
    const nowFollowing = toggleExploreFollow(user.id)
    onNotify(
      nowFollowing
        ? `Вы читаете @${user.username} ✓`
        : `Отписка от @${user.username}`
    )
  }

  const activeList = tab === 'following' ? following : followers

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-[4px] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-[520px] max-h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.95)] transition-all bg-[#060608] border border-white/[0.14] text-[var(--text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модалки */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-[var(--line)]"
        >
          <div className="min-w-0 pr-3">
            <h2 id="follow-modal-title" className="text-[17px] font-bold text-[var(--text)] truncate">
              {profileDisplayName || (profileUsername ? `@${profileUsername}` : 'Профиль')}
            </h2>
            {profileUsername && (
              <p className="text-[13px] text-[var(--muted)] truncate">@{profileUsername}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              onClose()
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Две вкладки X.com: "Читаемые" (Following) и "Читатели" (Followers) */}
        <div
          className="flex items-center shrink-0 border-b border-[var(--line)]"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'following'}
            onClick={() => handleTabChange('following')}
            className={`flex-1 py-3 text-center text-[15px] font-bold transition-colors relative min-h-[44px] ${
              tab === 'following'
                ? 'text-[var(--text)]'
                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <span>В читаемых</span>
            {following.length > 0 && (
              <span className="ml-1.5 text-xs text-[#71767b]">({following.length})</span>
            )}
            {tab === 'following' && (
              <span
                className="absolute bottom-0 left-1/4 right-1/4 h-[3px] rounded-full bg-[var(--accent,#ff5c00)]"
              />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'followers'}
            onClick={() => handleTabChange('followers')}
            className={`flex-1 py-3 text-center text-[15px] font-bold transition-colors relative min-h-[44px] ${
              tab === 'followers'
                ? 'text-white'
                : 'text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/5'
            }`}
          >
            <span>Читатели</span>
            {followers.length > 0 && (
              <span className="ml-1.5 text-xs text-[#71767b]">({followers.length})</span>
            )}
            {tab === 'followers' && (
              <span
                className="absolute bottom-0 left-1/4 right-1/4 h-[3px] rounded-full bg-[var(--accent,#ff5c00)]"
              />
            )}
          </button>
        </div>

        {/* Контент списка */}
        <div className="flex-1 overflow-y-auto min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#71767b] gap-3">
              <Loader2 size={24} className="animate-spin text-[var(--accent,#ff5c00)]" />
              <span className="text-sm">Загрузка списка...</span>
            </div>
          ) : activeList.length === 0 ? (
            <div className="py-16 px-6 text-center text-[#71767b]">
              <p className="text-[16px] font-medium text-[#71767b]">
                Здесь пока никого нет
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {activeList.map((user) => {
                const isMe = currentUserId === user.id
                const isFollowed = Boolean(myFollowingMap[user.id])
                const isPending = Boolean(pendingFollowIds[user.id])
                const avatarSrc = user.avatar_image || user.avatar_url
                const initials = getInitials(user.display_name, user.username)
                const streak = user.streak_count ?? user.streak ?? 0

                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      playClick(soundEnabled)
                      onOpenProfile?.(user.id)
                    }}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  >
                    {/* Аватар + Имя + @username + Стрик */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UserAvatar
                        avatarUrl={avatarSrc}
                        avatarColor={user.avatar_color}
                        displayName={user.display_name}
                        username={user.username}
                        initials={initials}
                        size={44}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[15px] text-[var(--text)] hover:underline truncate">
                            {user.display_name || `@${user.username}`}
                          </span>
                          {user.verified && <VerifiedBadge size="xs" />}
                        </div>

                        <div className="flex items-center gap-2 text-[13px] text-[var(--muted)] flex-wrap">
                          <span>@{user.username}</span>
                          {streak > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-orange-400 font-semibold">
                              <Flame size={13} className="fill-orange-400 text-orange-400" />
                              <span>{streak} дн.</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Кнопка "Читать / Читаю" */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isMe ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold text-[var(--muted)] bg-[var(--surface-subtle,#16181c)] border border-[var(--line)]">
                          Это вы
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={(e) => handleToggleFollow(e, user)}
                          className={`px-4 py-1.5 rounded-full text-[14px] font-bold transition-all min-h-[32px] select-none ${
                            isFollowed
                              ? 'border border-[var(--line)] text-[var(--text)] hover:border-red-500 hover:text-red-500 hover:bg-red-500/10'
                              : 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90'
                          } ${isPending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                        >
                          {isPending ? (
                            <Loader2 size={14} className="animate-spin inline" />
                          ) : isFollowed ? (
                            'Читаю'
                          ) : (
                            'Читать'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
