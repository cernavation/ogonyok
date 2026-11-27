'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Ban,
  Check,
  ChevronLeft,
  Copy,
  Flame,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getFriend } from '@/lib/ogonek/friends'
import { buildInviteUrl } from '@/lib/ogonek/profile-share'
import {
  type SocialUser,
  blockUserApi,
  getFriendsListApi,
  matchesSearchQuery,
  removeFriendApi,
  reportUserApi,
} from '@/lib/ogonek/social'
import { canAddGroupMember, canCreateGroup } from '@/lib/ogonek/permissions'
import { resolveAllowGroupInvitesFrom, resolveAllowMessagesFrom } from '@/lib/ogonek/privacy'
import type { ChatGroupMeta } from '@/lib/ogonek/types'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getCachedProfileSync, subscribeToFollows, type ProfileRecord } from '@/lib/supabase/api'
import { UserAvatar, VerifiedBadge } from '../ui'

export type FriendsTab = 'friends' | 'groups'

interface Props {
  initialTab?: FriendsTab | string
  onClose: () => void
  onNavigateToUser?: (userId: string) => void
  onStartChatWithUser?: (userId: string) => void
  onOpenExplore?: () => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
}

function profileRecordToSocialUser(p: ProfileRecord): SocialUser {
  return {
    id: p.id,
    username: p.username || 'user',
    displayName: p.display_name || `@${p.username || 'user'}`,
    avatarUrl: p.avatar_image || p.avatar_url || null,
    avatarColor: p.avatar_color || '#FF5C00',
    bio: p.bio || '',
    city: p.city || '',
    streak: Number(p.streak_count ?? p.streak ?? 0),
    verified: Boolean(p.verified),
    difficultyLevel: Number(p.level || 1),
    friendshipStatus: 'accepted',
    isFollowing: true,
    allowMessagesFrom: resolveAllowMessagesFrom(p),
    allowGroupInvitesFrom: resolveAllowGroupInvitesFrom(p),
  }
}

export function FriendsModal({
  initialTab = 'friends',
  onClose,
  onNavigateToUser,
  onStartChatWithUser,
  onOpenExplore,
  onNotify,
  soundEnabled = true,
}: Props) {
  useBodyScrollLock(true)

  const {
    state,
    currentUser,
    removeFriend: storeRemoveFriend,
    toggleFollow,
    createGroupChat,
    updateGroupMeta,
    addGroupMembers,
    removeGroupMember,
    updateStore,
  } = useOgonekStore()

  const viewerId = currentUser?.id || state.auth.activeAccountId || null
  const currentUsername = currentUser?.username || state.profile.username || 'user'
  const currentDisplayName = currentUser?.displayName || state.profile.displayName || 'Пользователь'

  const [activeTab, setActiveTab] = useState<FriendsTab>(
    initialTab === 'groups' ? 'groups' : 'friends'
  )

  const friendIds = useMemo(() => state.friendIds ?? [], [state.friendIds])

  // Мгновенный синхронный старт из кэша/стора без пустого чёрного экрана
  const syncSeededFriends = useMemo(() => {
    const out: SocialUser[] = []
    for (const id of friendIds) {
      const cached = getCachedProfileSync(id)
      if (cached) {
        out.push(profileRecordToSocialUser(cached))
        continue
      }
      const mock = getFriend(id)
      if (mock) {
        out.push({
          id: mock.id,
          username: mock.username,
          displayName: mock.name,
          avatarUrl: mock.avatarUrl || null,
          avatarColor: mock.avatarColor,
          bio: mock.bio,
          city: mock.city,
          streak: mock.streak,
          verified: Boolean(mock.verified),
          friendshipStatus: 'accepted',
          isFollowing: true,
        })
      }
    }
    return out
  }, [friendIds])

  const [friends, setFriends] = useState<SocialUser[]>(syncSeededFriends)
  const [loading, setLoading] = useState<boolean>(() => Boolean(viewerId) && syncSeededFriends.length === 0)
  const [filterQuery, setFilterQuery] = useState('')
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [reportingUser, setReportingUser] = useState<SocialUser | null>(null)
  const [reportReason, setReportReason] = useState('')

  // Группы
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupSubTab, setGroupSubTab] = useState<'feed' | 'members'>('feed')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isEditingGroup, setIsEditingGroup] = useState(false)
  const [isInvitingMember, setIsInvitingMember] = useState(false)
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupEmoji, setNewGroupEmoji] = useState('👥')
  const [editGroupTitle, setEditGroupTitle] = useState('')
  const [editGroupDescription, setEditGroupDescription] = useState('')
  const [editGroupEmoji, setEditGroupEmoji] = useState('👥')

  const menuContainerRef = useRef<HTMLDivElement>(null)

  const chatGroups = useMemo(() => {
    const threads = state.chatThreads ?? {}
    const list: ChatGroupMeta[] = []
    Object.values(threads).forEach((t) => {
      if (t.groupMeta) list.push(t.groupMeta)
    })
    return list
  }, [state.chatThreads])

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null
    return chatGroups.find((g) => g.id === selectedGroupId) || null
  }, [chatGroups, selectedGroupId])

  const ownedGroupsCount = useMemo(() => {
    const myId = viewerId || 'cernavation'
    return chatGroups.filter((g) => g.createdBy === myId || g.role === 'owner').length
  }, [chatGroups, viewerId])

  const groupFeedDays = useMemo(() => {
    if (!selectedGroupId) return []
    return (state.days || []).filter((d) => {
      if (d.groupId === selectedGroupId) return true
      if (d.targetGroupIds && d.targetGroupIds.includes(selectedGroupId)) return true
      if (
        d.prides?.some(
          (p) =>
            p.groupId === selectedGroupId ||
            (p.targetGroupIds && p.targetGroupIds.includes(selectedGroupId))
        )
      ) {
        return true
      }
      return Boolean(
        (d.gratitudes as any)?.some(
          (g: any) =>
            typeof g === 'object' &&
            (g.groupId === selectedGroupId ||
              (g.targetGroupIds && g.targetGroupIds.includes(selectedGroupId)))
        )
      )
    })
  }, [state.days, selectedGroupId])

  const loadFriends = useCallback(async () => {
    if (!viewerId || viewerId.startsWith('anon-') || viewerId.startsWith('acct-guest')) {
      setLoading(false)
      return
    }
    setLoading((prev) => prev || friends.length === 0)
    try {
      const list = await getFriendsListApi(viewerId)
      setFriends(list)
    } catch (err) {
      console.error('Failed to load friends:', err)
    } finally {
      setLoading(false)
    }
  }, [viewerId, friends.length])

  useEffect(() => {
    void loadFriends()
  }, [loadFriends])

  useEffect(() => {
    if (!viewerId || viewerId.startsWith('anon-') || viewerId.startsWith('acct-guest')) return
    const unsubscribe = subscribeToFollows(viewerId, () => {
      void loadFriends()
    })
    return () => {
      unsubscribe()
    }
  }, [viewerId, loadFriends])

  // Закрытие выпадающего меню и модалки по Esc
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeMenuUserId) setActiveMenuUserId(null)
        else if (reportingUser) setReportingUser(null)
        else if (isCreatingGroup) setIsCreatingGroup(false)
        else if (isEditingGroup) setIsEditingGroup(false)
        else if (isInvitingMember) setIsInvitingMember(false)
        else onClose()
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      if (
        activeMenuUserId &&
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setActiveMenuUserId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [
    activeMenuUserId,
    reportingUser,
    isCreatingGroup,
    isEditingGroup,
    isInvitingMember,
    onClose,
  ])

  const filteredFriends = useMemo(() => {
    if (!filterQuery.trim()) return friends
    return friends.filter((f) => matchesSearchQuery(f, filterQuery))
  }, [friends, filterQuery])

  const handleRemoveFriend = async (targetUser: SocialUser) => {
    playClick(soundEnabled)
    setActiveMenuUserId(null)
    setFriends((prev) => prev.filter((u) => u.id !== targetUser.id))
    storeRemoveFriend(targetUser.id)
    if ((state.followingIds ?? []).includes(targetUser.id)) {
      void toggleFollow(targetUser.id)
    }

    const res = await removeFriendApi(targetUser.id, viewerId)
    if (res.ok) {
      onNotify(`${targetUser.displayName} удалён из друзей`)
    }
  }

  const handleBlockUser = async (targetUser: SocialUser) => {
    playClick(soundEnabled)
    setActiveMenuUserId(null)
    setFriends((prev) => prev.filter((u) => u.id !== targetUser.id))
    storeRemoveFriend(targetUser.id)
    updateStore((prev) => ({
      ...prev,
      blockedUserIds: Array.from(new Set([...(prev.blockedUserIds ?? []), targetUser.id])),
    }))
    const res = await blockUserApi(targetUser.id, viewerId)
    if (res.ok) {
      onNotify(`Пользователь ${targetUser.displayName} заблокирован`)
    }
  }

  const handleReportUser = async () => {
    if (!reportingUser) return
    playClick(soundEnabled)
    const res = await reportUserApi(reportingUser.id, reportReason, viewerId)
    if (res.ok) {
      onNotify('Жалоба отправлена модераторам')
      setReportingUser(null)
      setReportReason('')
    }
  }

  const handleCopyInviteLink = async () => {
    playClick(soundEnabled)
    const url = buildInviteUrl(currentUsername)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      playSuccess(soundEnabled)
      onNotify('Ссылка-приглашение скопирована!')
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      onNotify('Не удалось скопировать ссылку')
    }
  }

  const handleOpenExplore = () => {
    playClick(soundEnabled)
    onClose()
    if (onOpenExplore) {
      onOpenExplore()
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ogonek:navigate-view', { detail: { view: 'explore' } })
      )
    }
  }

  // Обработчики групп
  const handleStartCreateGroup = () => {
    playClick(soundEnabled)
    const tier = state.profile?.subscription_tier || (state.profile as any)?.subscriptionTier || 'free'
    const check = canCreateGroup(tier, ownedGroupsCount)
    if (!check.allowed) {
      window.dispatchEvent(
        new CustomEvent('ogonek:open-upgrade', {
          detail: { feature: 'groups', force: true },
        })
      )
      onNotify(check.error || 'Достигнут лимит созданных групп для вашего тарифа')
      return
    }
    setNewGroupTitle('')
    setNewGroupDescription('')
    setNewGroupEmoji('👥')
    setIsCreatingGroup(true)
  }

  const handleConfirmCreateGroup = () => {
    playClick(soundEnabled)
    const cleanTitle = newGroupTitle.trim()
    if (!cleanTitle) {
      onNotify('Введите название группы')
      return
    }
    const gid = createGroupChat(
      cleanTitle,
      [],
      'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      newGroupEmoji || '👥',
      newGroupDescription
    )
    playSuccess(soundEnabled)
    onNotify(`Группа «${cleanTitle}» создана!`)
    setIsCreatingGroup(false)
    setSelectedGroupId(gid)
  }

  const handleStartEditGroup = () => {
    if (!selectedGroup) return
    playClick(soundEnabled)
    setEditGroupTitle(selectedGroup.title)
    setEditGroupDescription(selectedGroup.description || '')
    setEditGroupEmoji(selectedGroup.avatarEmoji || '👥')
    setIsEditingGroup(true)
  }

  const handleSaveEditGroup = () => {
    if (!selectedGroup) return
    playClick(soundEnabled)
    const cleanTitle = editGroupTitle.trim()
    if (!cleanTitle) {
      onNotify('Название группы не может быть пустым')
      return
    }
    updateGroupMeta(selectedGroup.id, {
      title: cleanTitle,
      description: editGroupDescription,
      avatarEmoji: editGroupEmoji || '👥',
    })
    playSuccess(soundEnabled)
    onNotify('Настройки группы сохранены')
    setIsEditingGroup(false)
  }

  const handleOpenGroupChat = (groupId: string) => {
    playClick(soundEnabled)
    onStartChatWithUser?.(groupId)
    onClose()
  }

  const handleAddMemberToGroup = (memberId: string) => {
    if (!selectedGroup) return
    playClick(soundEnabled)
    const tier = state.profile?.subscription_tier || (state.profile as any)?.subscriptionTier || 'free'
    const check = canAddGroupMember(tier, selectedGroup.memberIds.length)
    if (!check.allowed) {
      onNotify(check.error || 'Достигнут лимит участников группы')
      return
    }
    addGroupMembers(selectedGroup.id, [memberId])
    playSuccess(soundEnabled)
    onNotify('Участник добавлен в группу!')
    setIsInvitingMember(false)
  }

  const handleRemoveMemberFromGroup = (memberId: string) => {
    if (!selectedGroup) return
    playClick(soundEnabled)
    removeGroupMember(selectedGroup.id, memberId)
    onNotify('Участник удалён из группы')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Окно друзей"
        className="w-full sm:max-w-[540px] max-h-[85vh] sm:max-h-[75vh] rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] shadow-2xl flex flex-col text-[var(--text,#fff)] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модалки */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#2f3336)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Users size={19} className="text-[#FF5C00]" />
            <h2 className="text-[18px] font-black tracking-tight text-[var(--text,#fff)]">
              Друзья
            </h2>
          </div>

          <button
            type="button"
            id="btn-close-friends-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] hover:bg-[var(--bg-hover,#1d1f23)] transition-colors cursor-pointer"
            aria-label="Закрыть окно"
          >
            <X size={18} />
          </button>
        </header>

        {/* 2 чистые вкладки: Друзья (N) | Группы */}
        <nav
          className="grid grid-cols-2 border-b border-[var(--line,#2f3336)] shrink-0"
          role="tablist"
          aria-label="Разделы друзей"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'friends'}
            onClick={() => {
              playClick(soundEnabled)
              setActiveTab('friends')
            }}
            className={`py-3 px-4 text-center text-[13px] font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'friends'
                ? 'border-[#FF5C00] text-[var(--text,#fff)]'
                : 'border-transparent text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)]'
            }`}
          >
            <span>Друзья ({friends.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            id="friends-tab-groups"
            aria-selected={activeTab === 'groups'}
            onClick={() => {
              playClick(soundEnabled)
              setActiveTab('groups')
              setSelectedGroupId(null)
            }}
            className={`py-3 px-4 text-center text-[13px] font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'groups'
                ? 'border-[#FF5C00] text-[var(--text,#fff)]'
                : 'border-transparent text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)]'
            }`}
          >
            <Users size={14} />
            <span>Группы{chatGroups.length > 0 ? ` (${chatGroups.length})` : ''}</span>
          </button>
        </nav>

        {/* Тело контента */}
        <div
          ref={menuContainerRef}
          className="flex-1 overflow-y-auto px-5 py-3.5 min-h-[180px]"
        >
          {/* ─── ВКЛАДКА 1: ДРУЗЬЯ (N) ─────────────────────────────────── */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {/* Быстрый фильтр по своим друзьям */}
              {(friends.length > 0 || filterQuery) && (
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted,#71767b)]"
                  />
                  <input
                    type="search"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Быстрый фильтр по друзьям..."
                    className="w-full h-9 rounded-full bg-[var(--surface2,#202327)] border border-[var(--line,#2f3336)] pl-9 pr-4 text-xs text-[var(--text,#fff)] placeholder:text-[var(--muted,#71767b)] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>
              )}

              {loading && friends.length === 0 ? (
                <div className="space-y-2.5 py-1" aria-busy="true" aria-label="Загрузка друзей">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--surface2,#202327)]/50 animate-pulse"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-white/10" />
                        <div className="h-2.5 w-20 rounded bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-8 px-4 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-[#FF5C00]/15 text-[#FF5C00] flex items-center justify-center mb-3">
                    <Users size={22} />
                  </div>
                  <h3 className="text-[15px] font-bold text-[var(--text,#fff)] mb-1">
                    {filterQuery ? 'Никого не найдено' : 'У тебя пока нет друзей'}
                  </h3>
                  <p className="text-xs text-[var(--muted,#71767b)] max-w-xs leading-relaxed">
                    {filterQuery
                      ? 'Попробуй другой запрос для фильтра.'
                      : 'Взаимная подписка в Priday автоматически делает вас друзьями. Найди знакомых или отправь приглашение!'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--line,#2f3336)]">
                  {filteredFriends.map((friend) => (
                    <li
                      key={friend.id}
                      className="py-2.5 flex items-center justify-between gap-3 relative"
                    >
                      <div
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                        onClick={() => {
                          playClick(soundEnabled)
                          onClose()
                          onNavigateToUser?.(friend.id)
                        }}
                      >
                        <UserAvatar
                          avatarUrl={friend.avatarUrl}
                          avatarColor={friend.avatarColor}
                          displayName={friend.displayName}
                          username={friend.username}
                          size={40}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-[14px] text-[var(--text,#fff)] truncate group-hover:underline">
                              {friend.displayName}
                            </span>
                            {friend.verified && <VerifiedBadge size="xs" />}
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] text-[var(--muted,#71767b)] mt-0.5">
                            <span className="truncate">@{friend.username}</span>
                            {friend.streak > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-[#FF5C00] font-semibold inline-flex items-center gap-0.5 shrink-0">
                                  <Flame size={11} className="fill-[#FF5C00]" />
                                  {friend.streak}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            playClick(soundEnabled)
                            onClose()
                            onStartChatWithUser?.(friend.id)
                          }}
                          className="w-8 h-8 rounded-full bg-[var(--surface2,#202327)] hover:bg-[#FF5C00] hover:text-white border border-[var(--line,#2f3336)] text-[var(--text,#fff)] flex items-center justify-center transition-colors cursor-pointer"
                          title={`Написать ${friend.displayName}`}
                          aria-label={`Написать ${friend.displayName}`}
                        >
                          <MessageCircle size={15} />
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              playClick(soundEnabled)
                              setActiveMenuUserId((prev) =>
                                prev === friend.id ? null : friend.id
                              )
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] hover:bg-[var(--surface2,#202327)] transition-colors cursor-pointer"
                            aria-label={`Действия для ${friend.displayName}`}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {activeMenuUserId === friend.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-44 rounded-2xl bg-[#1b1e23] border border-[var(--line,#2f3336)] shadow-2xl p-1 z-30 flex flex-col gap-0.5 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleRemoveFriend(friend)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-amber-400 text-left font-medium transition-colors cursor-pointer"
                              >
                                <UserMinus size={14} />
                                <span>Убрать из друзей</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBlockUser(friend)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left font-medium transition-colors cursor-pointer"
                              >
                                <Ban size={14} />
                                <span>Заблокировать</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuUserId(null)
                                  setReportingUser(friend)
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-[var(--muted,#71767b)] text-left font-medium transition-colors cursor-pointer"
                              >
                                <ShieldAlert size={14} />
                                <span>Пожаловаться</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ─── ВКЛАДКА 2: ГРУППЫ ─────────────────────────────────────── */}
          {activeTab === 'groups' && (
            <div className="space-y-3">
              {!selectedGroup ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text,#fff)]">Твои группы</h3>
                      <p className="text-[11px] text-[var(--muted,#71767b)]">
                        Закрытые круги для общения и записей дня
                      </p>
                    </div>
                    <button
                      type="button"
                      id="btn-create-group"
                      onClick={handleStartCreateGroup}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FF5C00] hover:opacity-90 text-white transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Создать группу</span>
                    </button>
                  </div>

                  {chatGroups.length === 0 ? (
                    <div className="py-8 px-4 text-center flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3">
                        <Users size={22} />
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text,#fff)] mb-1">
                        Пока нет групп
                      </h4>
                      <p className="text-xs text-[var(--muted,#71767b)] max-w-xs mb-4">
                        Создавай группы для семьи, спортивных команд или близких друзей.
                      </p>
                      <button
                        type="button"
                        onClick={handleStartCreateGroup}
                        className="px-4 py-2 rounded-full text-xs font-bold bg-[#FF5C00] text-white hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>+ Создать группу</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chatGroups.map((g) => {
                        const isOwner = g.createdBy === viewerId || g.role === 'owner'
                        return (
                          <div
                            key={g.id}
                            className="p-3 rounded-2xl bg-[var(--surface2,#202327)]/60 border border-[var(--line,#2f3336)] flex items-center justify-between gap-3 hover:border-purple-500/40 transition-colors"
                          >
                            <div
                              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                              onClick={() => {
                                playClick(soundEnabled)
                                setSelectedGroupId(g.id)
                                setGroupSubTab('feed')
                              }}
                            >
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                                style={{ background: g.avatarColor || '#a855f7' }}
                              >
                                {g.avatarEmoji || '👥'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-sm font-bold text-[var(--text,#fff)] truncate">
                                    {g.title}
                                  </h4>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 shrink-0">
                                    {isOwner ? 'Владелец' : 'Участник'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[var(--muted,#71767b)] truncate mt-0.5">
                                  {g.description || `${g.memberIds.length} участников`}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenGroupChat(g.id)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <MessageCircle size={13} />
                              <span>Чат</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--line,#2f3336)]">
                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        setSelectedGroupId(null)
                      }}
                      className="text-xs font-bold text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                      <span>Все группы</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        id="btn-open-group-chat"
                        onClick={() => handleOpenGroupChat(selectedGroup.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#FF5C00] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <MessageCircle size={13} />
                        <span>Открыть чат</span>
                      </button>
                      {(selectedGroup.createdBy === viewerId || selectedGroup.role === 'owner') && (
                        <button
                          type="button"
                          onClick={handleStartEditGroup}
                          className="p-1.5 rounded-full text-[var(--muted,#71767b)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Настройки группы"
                        >
                          <Settings size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface2,#202327)]/60 border border-[var(--line,#2f3336)] flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                      style={{ background: selectedGroup.avatarColor || '#a855f7' }}
                    >
                      {selectedGroup.avatarEmoji || '👥'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[var(--text,#fff)] truncate">
                        {selectedGroup.title}
                      </h3>
                      <p className="text-xs text-[var(--muted,#71767b)] mt-0.5 truncate">
                        {selectedGroup.description || `${selectedGroup.memberIds.length} участников`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center border-b border-[var(--line,#2f3336)]">
                    <button
                      type="button"
                      onClick={() => setGroupSubTab('feed')}
                      className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                        groupSubTab === 'feed'
                          ? 'border-[#FF5C00] text-[var(--text,#fff)]'
                          : 'border-transparent text-[var(--muted,#71767b)]'
                      }`}
                    >
                      Лента записей ({groupFeedDays.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupSubTab('members')}
                      className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors ${
                        groupSubTab === 'members'
                          ? 'border-[#FF5C00] text-[var(--text,#fff)]'
                          : 'border-transparent text-[var(--muted,#71767b)]'
                      }`}
                    >
                      Участники ({selectedGroup.memberIds.length})
                    </button>
                  </div>

                  {groupSubTab === 'feed' ? (
                    <div className="space-y-2">
                      {groupFeedDays.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[var(--muted,#71767b)]">
                          В этой группе пока нет записей.
                        </p>
                      ) : (
                        groupFeedDays.map((d) => (
                          <div
                            key={d.id}
                            className="p-3 rounded-xl bg-[var(--surface2,#202327)]/60 border border-[var(--line,#2f3336)] space-y-1"
                          >
                            <div className="text-xs font-bold text-[var(--text,#fff)]">
                              День #{d.id}
                            </div>
                            <p className="text-xs text-[var(--muted,#71767b)]">{d.title}</p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted,#71767b)]">
                          Участников: {selectedGroup.memberIds.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsInvitingMember(true)}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 hover:bg-white/15 flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus size={13} />
                          <span>Пригласить</span>
                        </button>
                      </div>

                      {selectedGroup.memberIds.map((mId) => {
                        const isMemberOwner = mId === selectedGroup.createdBy
                        const isMe = mId === viewerId
                        const friendInfo = friends.find((f) => f.id === mId)
                        const cached = getCachedProfileSync(mId)
                        const mName = isMe
                          ? currentDisplayName || `@${currentUsername}`
                          : friendInfo?.displayName ||
                            cached?.display_name ||
                            (cached?.username ? `@${cached.username}` : `@${mId.slice(0, 8)}`)
                        const mVerified = Boolean(
                          isMe ? state.profile.verified : friendInfo?.verified ?? cached?.verified
                        )

                        return (
                          <div
                            key={mId}
                            className="p-2.5 rounded-xl bg-[var(--surface2,#202327)]/60 border border-[var(--line,#2f3336)] flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <UserAvatar
                                avatarUrl={
                                  isMe
                                    ? state.profile.avatarImage
                                    : friendInfo?.avatarUrl || cached?.avatar_image || cached?.avatar_url
                                }
                                avatarColor={
                                  isMe
                                    ? state.profile.avatarColor
                                    : friendInfo?.avatarColor || cached?.avatar_color
                                }
                                displayName={mName}
                                size={32}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[var(--text,#fff)] truncate flex items-center gap-1">
                                  <span className="truncate">
                                    {mName} {isMe && '(Ты)'}
                                  </span>
                                  {mVerified && <VerifiedBadge size="xs" />}
                                </div>
                                <span className="text-[10px] text-[var(--muted,#71767b)]">
                                  {isMemberOwner ? 'Создатель группы' : 'Участник'}
                                </span>
                              </div>
                            </div>

                            {(selectedGroup.createdBy === viewerId || selectedGroup.role === 'owner') &&
                              !isMemberOwner &&
                              !isMe && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMemberFromGroup(mId)}
                                  className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10"
                                  title="Удалить из группы"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Компактная нижняя панель на вкладке «Друзья» */}
        {activeTab === 'friends' && (
          <footer className="px-5 py-3 border-t border-[var(--line,#2f3336)] bg-[var(--card-bg,#16181c)] flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenExplore}
              className="flex-1 h-10 px-4 rounded-full bg-[#FF5C00] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Search size={14} />
              <span>Найти людей</span>
            </button>

            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="flex-1 h-10 px-4 rounded-full bg-[var(--surface2,#202327)] hover:bg-[var(--bg-hover,#1d1f23)] border border-[var(--line,#2f3336)] text-[var(--text,#fff)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Скопировано!' : 'Скопировать приглашение'}</span>
            </button>
          </footer>
        )}
      </div>

      {/* Модалка жалобы */}
      {reportingUser && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setReportingUser(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] p-5 shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[var(--text,#fff)]">
              Пожаловаться на @{reportingUser.username}
            </h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Причина жалобы..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-[var(--surface2,#202327)] text-xs text-[var(--text,#fff)] border border-[var(--line,#2f3336)] focus:border-[#FF5C00] focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportingUser(null)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-[var(--muted,#71767b)]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleReportUser}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания группы */}
      {isCreatingGroup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setIsCreatingGroup(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] p-5 shadow-2xl flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line,#2f3336)]">
              <h3 className="text-base font-bold text-[var(--text,#fff)]">Создать группу</h3>
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="text-[var(--muted,#71767b)] hover:text-white p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                id="input-group-title"
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                placeholder="Название: Семья, Спортсмены..."
                className="w-full p-2.5 rounded-xl bg-[var(--surface2,#202327)] text-xs text-[var(--text,#fff)] border border-[var(--line,#2f3336)] focus:border-[#FF5C00] focus:outline-none"
                autoFocus
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {['👥', '🔥', '🏃', '❤️', '🏆', '⚡', '🌟', '🎯'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewGroupEmoji(emoji)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-all ${
                      newGroupEmoji === emoji
                        ? 'border-[#FF5C00] bg-[#FF5C00]/20 scale-110'
                        : 'border-transparent bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Описание группы..."
                rows={2}
                className="w-full p-2.5 rounded-xl bg-[var(--surface2,#202327)] text-xs text-[var(--text,#fff)] border border-[var(--line,#2f3336)] focus:border-[#FF5C00] focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line,#2f3336)]">
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-[var(--muted,#71767b)]"
              >
                Отмена
              </button>
              <button
                type="button"
                id="btn-confirm-create-group"
                onClick={handleConfirmCreateGroup}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#FF5C00] hover:opacity-90 text-white"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования группы */}
      {isEditingGroup && selectedGroup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setIsEditingGroup(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] p-5 shadow-2xl flex flex-col gap-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line,#2f3336)]">
              <h3 className="text-base font-bold text-[var(--text,#fff)]">Настройки группы</h3>
              <button
                type="button"
                onClick={() => setIsEditingGroup(false)}
                className="text-[var(--muted,#71767b)] hover:text-white p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={editGroupTitle}
              onChange={(e) => setEditGroupTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[var(--surface2,#202327)] text-xs text-[var(--text,#fff)] border border-[var(--line,#2f3336)] focus:border-[#FF5C00] focus:outline-none"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {['👥', '🔥', '🏃', '❤️', '🏆', '⚡', '🌟', '🎯'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setEditGroupEmoji(emoji)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-all ${
                    editGroupEmoji === emoji
                      ? 'border-[#FF5C00] bg-[#FF5C00]/20 scale-110'
                      : 'border-transparent bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <textarea
              value={editGroupDescription}
              onChange={(e) => setEditGroupDescription(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-xl bg-[var(--surface2,#202327)] text-xs text-[var(--text,#fff)] border border-[var(--line,#2f3336)] focus:border-[#FF5C00] focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line,#2f3336)]">
              <button
                type="button"
                onClick={() => setIsEditingGroup(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-[var(--muted,#71767b)]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveEditGroup}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#FF5C00] hover:opacity-90 text-white"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка приглашения в группу */}
      {isInvitingMember && selectedGroup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setIsInvitingMember(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] p-5 shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line,#2f3336)]">
              <h3 className="text-base font-bold text-[var(--text,#fff)]">Добавить в группу</h3>
              <button
                type="button"
                onClick={() => setIsInvitingMember(false)}
                className="text-[var(--muted,#71767b)] hover:text-white p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {friends.filter((f) => !selectedGroup.memberIds.includes(f.id) && f.allowGroupInvitesFrom !== 'nobody').length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--muted,#71767b)] leading-relaxed">
                  {friends.length === 0
                    ? 'Чтобы создать группу или добавить участников, сначала добавь друзей (взаимная подписка)'
                    : 'Нет доступных друзей для добавления (все уже в группе или ограничили приглашения)'}
                </p>
              ) : (
                friends
                  .filter((f) => !selectedGroup.memberIds.includes(f.id) && f.allowGroupInvitesFrom !== 'nobody')
                  .map((f) => (
                    <div
                      key={f.id}
                      className="p-2.5 rounded-xl bg-[var(--surface2,#202327)] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          avatarUrl={f.avatarUrl}
                          avatarColor={f.avatarColor}
                          displayName={f.displayName}
                          username={f.username}
                          size={30}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--text,#fff)] truncate flex items-center gap-1">
                            <span className="truncate">{f.displayName}</span>
                            {f.verified && <VerifiedBadge size="xs" />}
                          </div>
                          <div className="text-[10px] text-[var(--muted,#71767b)] truncate">
                            @{f.username}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddMemberToGroup(f.id)}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-[#FF5C00] text-white hover:opacity-90 shrink-0"
                      >
                        Добавить
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
