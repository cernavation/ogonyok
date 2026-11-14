'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
  X,
  Users,
  Search,
  UserPlus,
  UserCheck,
  UserMinus,
  Check,
  MoreHorizontal,
  MessageSquare,
  Bookmark,
  ShieldAlert,
  Ban,
  QrCode,
  Copy,
  Flame,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getInitials } from '@/lib/ogonek/initials'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  type SocialUser,
  type FriendshipStatus,
  searchSocialUsers,
  sendFriendRequestApi,
  acceptFriendRequestApi,
  declineFriendRequestApi,
  cancelFriendRequestApi,
  removeFriendApi,
  blockUserApi,
  reportUserApi,
  getFriendsListApi,
  getFriendRequestsApi,
  subscribeToFriendships,
} from '@/lib/ogonek/social'
import { buildInviteUrl } from '@/lib/ogonek/profile-share'
import { QrModal } from './qr-modal'

export type FriendsTab = 'friends' | 'requests' | 'search' | 'following'

interface Props {
  initialTab?: FriendsTab
  onClose: () => void
  onNavigateToUser?: (userId: string) => void
  onStartChatWithUser?: (userId: string) => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
}

export function FriendsModal({
  initialTab = 'friends',
  onClose,
  onNavigateToUser,
  onStartChatWithUser,
  onNotify,
  soundEnabled = true,
}: Props) {
  useBodyScrollLock(true)

  const { state, currentUser, addFriend: storeAddFriend, removeFriend: storeRemoveFriend } = useOgonekStore()
  const viewerId = currentUser?.id || state.auth.activeAccountId || null
  const currentUsername = currentUser?.username || state.profile.username || 'user'
  const currentDisplayName = currentUser?.displayName || state.profile.displayName || 'Пользователь'

  const [activeTab, setActiveTab] = useState<FriendsTab>(initialTab)

  // Данные списков
  const [friends, setFriends] = useState<SocialUser[]>([])
  const [incomingRequests, setIncomingRequests] = useState<SocialUser[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<SocialUser[]>([])
  const [searchResults, setSearchResults] = useState<SocialUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Пагинация поиска
  const [searchOffset, setSearchOffset] = useState(0)
  const [hasMoreSearch, setHasMoreSearch] = useState(true)

  // Всплывающие меню и модалки
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [reportingUser, setReportingUser] = useState<SocialUser | null>(null)
  const [reportReason, setReportReason] = useState('')

  // Hover состояния для кнопок «Друзья ✓» -> «Удалить»
  const [hoveredFriendBtnId, setHoveredFriendBtnId] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Загрузка друзей и заявок
  const loadSocialData = useCallback(async () => {
    if (!viewerId) return
    setLoading(true)
    try {
      const [friendsList, reqs] = await Promise.all([
        getFriendsListApi(viewerId),
        getFriendRequestsApi(viewerId),
      ])
      setFriends(friendsList)
      setIncomingRequests(reqs.incoming)
      setOutgoingRequests(reqs.outgoing)
    } catch (err) {
      console.error('Failed to load social data:', err)
    } finally {
      setLoading(false)
    }
  }, [viewerId])

  useEffect(() => {
    loadSocialData()
  }, [loadSocialData])

  // Realtime подписка на изменения дружбы
  useEffect(() => {
    if (!viewerId) return
    const unsubscribe = subscribeToFriendships(viewerId, () => {
      loadSocialData()
    })
    return () => {
      unsubscribe()
    }
  }, [viewerId, loadSocialData])

  // Дебаунс серверного поиска (300ms)
  useEffect(() => {
    if (activeTab !== 'search') return

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      setSearchError(null)
      setSearchOffset(0)

      try {
        const { users, error } = await searchSocialUsers(searchQuery, {
          limit: 20,
          offset: 0,
          viewerId,
        })
        if (error) {
          setSearchError(error)
        } else {
          setSearchResults(users)
          setHasMoreSearch(users.length >= 20)
        }
      } catch (err: any) {
        setSearchError('Ошибка выполнения поиска')
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, viewerId])

  // Дозагрузка результатов поиска при скролле (бесконечный скролл)
  const loadMoreSearchResults = useCallback(async () => {
    if (searchLoading || !hasMoreSearch || activeTab !== 'search') return
    const nextOffset = searchOffset + 20
    setSearchLoading(true)

    try {
      const { users } = await searchSocialUsers(searchQuery, {
        limit: 20,
        offset: nextOffset,
        viewerId,
      })
      if (users.length > 0) {
        setSearchResults((prev) => [...prev, ...users])
        setSearchOffset(nextOffset)
        setHasMoreSearch(users.length >= 20)
      } else {
        setHasMoreSearch(false)
      }
    } catch {
      setHasMoreSearch(false)
    } finally {
      setSearchLoading(false)
    }
  }, [searchLoading, hasMoreSearch, activeTab, searchOffset, searchQuery, viewerId])

  // Наблюдатель бесконечного скролла
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMoreSearch || searchLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreSearchResults()
        }
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMoreSearch, searchLoading, loadMoreSearchResults])

  // Действия над заявками и дружбой
  const handleSendRequest = async (targetUser: SocialUser) => {
    playClick(soundEnabled)
    // Оптимистичное обновление
    targetUser.friendshipStatus = 'outgoing_pending'
    setSearchResults([...searchResults])

    const res = await sendFriendRequestApi(targetUser.id, viewerId)
    if (res.ok) {
      playSuccess(soundEnabled)
      onNotify(`Заявка в друзья отправлена ${targetUser.displayName}`)
      loadSocialData()
    } else {
      onNotify(res.error || 'Не удалось отправить заявку')
      loadSocialData()
    }
  }

  const handleAcceptRequest = async (targetUser: SocialUser) => {
    playClick(soundEnabled)
    targetUser.friendshipStatus = 'accepted'
    setIncomingRequests((prev) => prev.filter((u) => u.id !== targetUser.id))
    setFriends((prev) => [targetUser, ...prev])
    storeAddFriend(targetUser.id)

    const res = await acceptFriendRequestApi(targetUser.id, viewerId)
    if (res.ok) {
      playSuccess(soundEnabled)
      onNotify(`${targetUser.displayName} теперь у тебя в друзьях ✓`)
      loadSocialData()
    } else {
      onNotify(res.error || 'Ошибка принятия заявки')
      loadSocialData()
    }
  }

  const handleDeclineRequest = async (targetUser: SocialUser) => {
    playClick(soundEnabled)
    setIncomingRequests((prev) => prev.filter((u) => u.id !== targetUser.id))
    const res = await declineFriendRequestApi(targetUser.id, viewerId)
    if (res.ok) {
      onNotify('Заявка отклонена')
      loadSocialData()
    }
  }

  const handleCancelRequest = async (targetUser: SocialUser) => {
    playClick(soundEnabled)
    targetUser.friendshipStatus = 'none'
    setOutgoingRequests((prev) => prev.filter((u) => u.id !== targetUser.id))
    setSearchResults([...searchResults])

    const res = await cancelFriendRequestApi(targetUser.id, viewerId)
    if (res.ok) {
      onNotify('Заявка отменена')
      loadSocialData()
    }
  }

  const handleRemoveFriend = async (targetUser: SocialUser) => {
    playClick(soundEnabled)
    setFriends((prev) => prev.filter((u) => u.id !== targetUser.id))
    targetUser.friendshipStatus = 'none'
    storeRemoveFriend(targetUser.id)

    const res = await removeFriendApi(targetUser.id, viewerId)
    if (res.ok) {
      onNotify(`${targetUser.displayName} удалён из друзей`)
      loadSocialData()
    }
  }

  const handleBlockUser = async (targetUser: SocialUser) => {
    playClick(soundEnabled)
    setActiveMenuUserId(null)
    setFriends((prev) => prev.filter((u) => u.id !== targetUser.id))
    setSearchResults((prev) => prev.filter((u) => u.id !== targetUser.id))

    const res = await blockUserApi(targetUser.id, viewerId)
    if (res.ok) {
      onNotify(`Пользователь ${targetUser.displayName} заблокирован`)
      loadSocialData()
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

  const handleOpenSearchTab = () => {
    playClick(soundEnabled)
    setActiveTab('search')
    setTimeout(() => searchInputRef.current?.focus(), 150)
  }

  const inviteUrl = useMemo(() => buildInviteUrl(currentUsername), [currentUsername])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Окно друзей"
        className="w-full sm:max-w-[600px] h-full sm:h-[85vh] sm:max-h-[750px] rounded-none sm:rounded-3xl bg-[var(--card-bg,#16181c)] border-0 sm:border border-[var(--line,#2f3336)] shadow-2xl flex flex-col text-[var(--text,#fff)] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модального окна */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--line,#2f3336)] bg-[var(--card-bg,#16181c)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Users size={20} className="text-[var(--accent,#ff5722)]" />
            <h2 className="text-xl font-black tracking-tight text-[var(--text,#fff)]">
              Друзья
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] hover:bg-[var(--bg-hover,#1d1f23)] transition-colors"
            aria-label="Закрыть окно"
          >
            <X size={20} />
          </button>
        </header>

        {/* Навигационные табы: Друзья | Заявки (N) | Найти | Подписки */}
        {/* Вкладка «Группы» скрыта до Шага 9 согласно требованиям */}
        <nav
          className="flex items-center border-b border-[var(--line,#2f3336)] bg-[var(--card-bg,#16181c)] shrink-0 overflow-x-auto no-scrollbar"
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
              loadSocialData()
            }}
            className={`flex-1 py-3.5 px-3 text-center text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center gap-1.5 ${
              activeTab === 'friends'
                ? 'border-[var(--accent,#ff5722)] text-[var(--text,#fff)]'
                : 'border-transparent text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)]'
            }`}
          >
            <span>Друзья</span>
            {friends.length > 0 && (
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-[var(--surface2,#202327)] text-[var(--muted,#71767b)] font-normal">
                {friends.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'requests'}
            onClick={() => {
              playClick(soundEnabled)
              setActiveTab('requests')
              loadSocialData()
            }}
            className={`flex-1 py-3.5 px-3 text-center text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-[var(--accent,#ff5722)] text-[var(--text,#fff)]'
                : 'border-transparent text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)]'
            }`}
          >
            <span>Заявки</span>
            {incomingRequests.length > 0 && (
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-[var(--accent,#ff5722)] text-white font-bold animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'search'}
            onClick={() => {
              playClick(soundEnabled)
              setActiveTab('search')
              setTimeout(() => searchInputRef.current?.focus(), 150)
            }}
            className={`flex-1 py-3.5 px-3 text-center text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center gap-1.5 ${
              activeTab === 'search'
                ? 'border-[var(--accent,#ff5722)] text-[var(--text,#fff)]'
                : 'border-transparent text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)]'
            }`}
          >
            <Search size={15} />
            <span>Найти</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'following'}
            onClick={() => {
              playClick(soundEnabled)
              setActiveTab('following')
            }}
            className={`flex-1 py-3.5 px-3 text-center text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[44px] flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'border-[var(--accent,#ff5722)] text-[var(--text,#fff)]'
                : 'border-transparent text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)]'
            }`}
          >
            <span>Подписки</span>
          </button>
        </nav>

        {/* Контент табов */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-[var(--line,#2f3336)]">
          {/* ────────────────── ТАБ 1: ДРУЗЬЯ ────────────────── */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center mb-3">
                    <Users size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text,#fff)] mb-1">
                    Пока никого нет
                  </h3>
                  <p className="text-xs text-[var(--muted,#71767b)] max-w-sm leading-relaxed mb-6">
                    Добавляй друзей по нику или делись персональной ссылкой-приглашением, чтобы вести дневник вместе и поддерживать огонь.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-md">
                    <button
                      type="button"
                      onClick={handleOpenSearchTab}
                      className="w-full sm:flex-1 min-h-[40px] flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-[var(--accent,#ff5722)] hover:opacity-95 text-white text-xs font-bold transition-all shadow-md active:scale-98"
                    >
                      <Search size={15} />
                      <span>Найти по нику</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="w-full sm:flex-1 min-h-[40px] flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-[var(--surface2,#202327)] hover:bg-[var(--line,#2f3336)] border border-[var(--line,#2f3336)] text-xs font-bold text-[var(--text,#fff)] transition-all"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Скопировано!' : 'Скопировать ссылку'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        setQrOpen(true)
                      }}
                      className="w-full sm:w-auto min-h-[40px] px-3.5 rounded-full bg-[var(--surface2,#202327)] hover:bg-[var(--line,#2f3336)] border border-[var(--line,#2f3336)] flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--text,#fff)] transition-all"
                      title="Показать QR-код"
                      aria-label="Показать QR-код"
                    >
                      <QrCode size={16} />
                      <span className="sm:hidden">Показать QR</span>
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--line,#2f3336)]">
                  {friends.map((friend) => (
                    <UserRow
                      key={friend.id}
                      user={friend}
                      onNavigate={() => {
                        onClose()
                        onNavigateToUser?.(friend.id)
                      }}
                      actionButton={
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredFriendBtnId(friend.id)}
                          onMouseLeave={() => setHoveredFriendBtnId(null)}
                          onClick={() => handleRemoveFriend(friend)}
                          className={`min-h-[32px] px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                            hoveredFriendBtnId === friend.id
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-[var(--surface2,#202327)] text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {hoveredFriendBtnId === friend.id ? (
                            <>
                              <UserMinus size={13} />
                              <span>Удалить</span>
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              <span>Друзья ✓</span>
                            </>
                          )}
                        </button>
                      }
                      menuOpen={activeMenuUserId === friend.id}
                      onToggleMenu={() =>
                        setActiveMenuUserId((prev) => (prev === friend.id ? null : friend.id))
                      }
                      onChat={() => {
                        onClose()
                        onStartChatWithUser?.(friend.id)
                      }}
                      onBlock={() => handleBlockUser(friend)}
                      onReport={() => setReportingUser(friend)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ────────────────── ТАБ 2: ЗАЯВКИ ────────────────── */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Входящие заявки */}
              <section>
                <div className="flex items-center justify-between pb-2 mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#71767b)]">
                    Входящие заявки ({incomingRequests.length})
                  </h4>
                </div>

                {incomingRequests.length === 0 ? (
                  <p className="text-xs text-[var(--muted,#71767b)] py-4 text-center">
                    Нет новых входящих заявок
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--line,#2f3336)]">
                    {incomingRequests.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        onNavigate={() => {
                          onClose()
                          onNavigateToUser?.(user.id)
                        }}
                        actionButton={
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAcceptRequest(user)}
                              className="min-h-[32px] px-3 py-1 rounded-full text-xs font-bold bg-[var(--accent,#ff5722)] hover:opacity-90 text-white transition-all shadow-sm"
                            >
                              Принять
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeclineRequest(user)}
                              className="min-h-[32px] px-2.5 py-1 rounded-full text-xs font-medium text-[var(--muted,#71767b)] hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-[var(--line,#2f3336)]"
                            >
                              Отклонить
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* Исходящие заявки */}
              {outgoingRequests.length > 0 && (
                <section className="pt-4 border-t border-[var(--line,#2f3336)]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#71767b)] pb-2 mb-2">
                    Исходящие заявки ({outgoingRequests.length})
                  </h4>
                  <ul className="divide-y divide-[var(--line,#2f3336)]">
                    {outgoingRequests.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        onNavigate={() => {
                          onClose()
                          onNavigateToUser?.(user.id)
                        }}
                        actionButton={
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(user)}
                            className="min-h-[32px] px-3 py-1 rounded-full text-xs font-medium text-[var(--muted,#71767b)] hover:text-rose-400 hover:bg-rose-500/10 border border-[var(--line,#2f3336)] transition-all"
                          >
                            Заявка отправлена · Отменить
                          </button>
                        }
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {/* ────────────────── ТАБ 3: НАЙТИ ────────────────── */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Поисковый инпут с debounce 300ms */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted,#71767b)] pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по @нику или имени (например: ilon musk)..."
                  className="w-full min-h-[42px] pl-10 pr-10 py-2.5 rounded-2xl bg-[var(--surface2,#202327)] text-sm text-[var(--text,#fff)] placeholder-[var(--muted,#71767b)] border border-[var(--line,#2f3336)] focus:border-[var(--accent,#ff5722)] focus:outline-none transition-colors"
                  aria-label="Поиск пользователей по нику или имени"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] p-1 rounded-full"
                    aria-label="Очистить поиск"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Ошибки */}
              {searchError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle size={15} /> {searchError}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery((q) => q + ' ')}
                    className="underline font-bold"
                  >
                    Повторить
                  </button>
                </div>
              )}

              {/* Скелетоны во время загрузки */}
              {searchLoading && searchResults.length === 0 && (
                <div className="space-y-3 py-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl animate-pulse bg-[var(--surface2,#202327)]/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--surface2,#202327)]" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 rounded bg-[var(--surface2,#202327)]" />
                          <div className="w-16 h-2.5 rounded bg-[var(--surface2,#202327)]" />
                        </div>
                      </div>
                      <div className="w-24 h-7 rounded-full bg-[var(--surface2,#202327)]" />
                    </div>
                  ))}
                </div>
              )}

              {/* Пустое состояние */}
              {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
                <div className="py-12 text-center">
                  <p className="text-sm font-bold text-[var(--text,#fff)] mb-1">
                    Никого не найдено
                  </p>
                  <p className="text-xs text-[var(--muted,#71767b)]">
                    По запросу «{searchQuery.trim()}» пользователей не найдено. Проверь правильность написания или поделись ссылкой-приглашением.
                  </p>
                </div>
              )}

              {/* Результаты поиска */}
              {searchResults.length > 0 && (
                <ul className="divide-y divide-[var(--line,#2f3336)]">
                  {searchResults.map((user) => {
                    const isFriend =
                      user.friendshipStatus === 'accepted' ||
                      friends.some((f) => f.id === user.id)

                    const isOutgoing =
                      user.friendshipStatus === 'outgoing_pending' ||
                      outgoingRequests.some((o) => o.id === user.id)

                    const isIncoming =
                      user.friendshipStatus === 'incoming_pending' ||
                      incomingRequests.some((i) => i.id === user.id)

                    return (
                      <UserRow
                        key={user.id}
                        user={user}
                        onNavigate={() => {
                          onClose()
                          onNavigateToUser?.(user.id)
                        }}
                        actionButton={
                          isFriend ? (
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredFriendBtnId(user.id)}
                              onMouseLeave={() => setHoveredFriendBtnId(null)}
                              onClick={() => handleRemoveFriend(user)}
                              className={`min-h-[32px] px-3.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                hoveredFriendBtnId === user.id
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-[var(--surface2,#202327)] text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {hoveredFriendBtnId === user.id ? (
                                <>
                                  <UserMinus size={13} />
                                  <span>Удалить</span>
                                </>
                              ) : (
                                <>
                                  <Check size={13} />
                                  <span>Друзья ✓</span>
                                </>
                              )}
                            </button>
                          ) : isIncoming ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAcceptRequest(user)}
                                className="min-h-[32px] px-3 py-1 rounded-full text-xs font-bold bg-[var(--accent,#ff5722)] text-white hover:opacity-90 transition-all"
                              >
                                Принять
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeclineRequest(user)}
                                className="min-h-[32px] px-2 py-1 rounded-full text-xs font-medium text-[var(--muted,#71767b)] hover:text-rose-400 border border-[var(--line,#2f3336)] transition-all"
                              >
                                Отклонить
                              </button>
                            </div>
                          ) : isOutgoing ? (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(user)}
                              className="min-h-[32px] px-3 py-1 rounded-full text-xs font-medium text-[var(--muted,#71767b)] hover:text-rose-400 hover:bg-rose-500/10 border border-[var(--line,#2f3336)] transition-all"
                            >
                              Заявка отправлена · Отменить
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendRequest(user)}
                              className="min-h-[32px] px-3.5 py-1 rounded-full text-xs font-bold bg-[var(--accent,#ff5722)] hover:opacity-90 text-white transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <UserPlus size={13} />
                              <span>Добавить в друзья</span>
                            </button>
                          )
                        }
                        menuOpen={activeMenuUserId === user.id}
                        onToggleMenu={() =>
                          setActiveMenuUserId((prev) => (prev === user.id ? null : user.id))
                        }
                        onChat={() => {
                          onClose()
                          onStartChatWithUser?.(user.id)
                        }}
                        onBlock={() => handleBlockUser(user)}
                        onReport={() => setReportingUser(user)}
                      />
                    )
                  })}
                </ul>
              )}

              {/* Сентинел для бесконечного скролла */}
              <div ref={sentinelRef} className="h-6 flex items-center justify-center">
                {searchLoading && searchResults.length > 0 && (
                  <Loader2 size={16} className="animate-spin text-[var(--accent,#ff5722)]" />
                )}
              </div>
            </div>
          )}

          {/* ────────────────── ТАБ 4: ПОДПИСКИ ────────────────── */}
          {activeTab === 'following' && (
            <div className="py-8 text-center">
              <p className="text-xs text-[var(--muted,#71767b)]">
                Подписки отображают людей, за чьими публичными записями ты следишь.
              </p>
              <button
                type="button"
                onClick={handleOpenSearchTab}
                className="mt-3 px-4 py-2 rounded-full text-xs font-bold bg-[var(--surface2,#202327)] hover:bg-[var(--line,#2f3336)] text-[var(--text,#fff)] transition-all"
              >
                Найти людей для подписки
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QR модалка */}
      {qrOpen && (
        <QrModal
          url={inviteUrl}
          username={currentUsername}
          displayName={currentDisplayName}
          onClose={() => setQrOpen(false)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модалка жалобы */}
      {reportingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setReportingUser(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] p-6 shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[var(--text,#fff)]">
              Пожаловаться на @{reportingUser.username}
            </h3>
            <p className="text-xs text-[var(--muted,#71767b)]">
              Опиши причину жалобы (спам, оскорбления, фейковый профиль):
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Причина жалобы..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-[var(--surface2,#202327)] text-xs text-[var(--text,#fff)] border border-[var(--line,#2f3336)] focus:border-[var(--accent,#ff5722)] focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportingUser(null)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleReportUser}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Отправить жалобу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Строка пользователя с аватаром, ником, стриком и действиями
 */
function UserRow({
  user,
  onNavigate,
  actionButton,
  menuOpen,
  onToggleMenu,
  onChat,
  onBlock,
  onReport,
}: {
  user: SocialUser
  onNavigate: () => void
  actionButton?: React.ReactNode
  menuOpen?: boolean
  onToggleMenu?: () => void
  onChat?: () => void
  onBlock?: () => void
  onReport?: () => void
}) {
  const initials = getInitials(user.displayName, user.username)

  return (
    <li className="py-3 flex items-center justify-between gap-3 relative">
      <div
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        onClick={onNavigate}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--line,#2f3336)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--surface2,#202327)] text-[var(--text,#fff)] font-bold text-sm flex items-center justify-center shrink-0 border border-[var(--line,#2f3336)]">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-[var(--text,#fff)] truncate hover:underline">
              {user.displayName}
            </span>
            {user.verified && (
              <span
                className="w-3.5 h-3.5 rounded-full bg-[var(--accent,#ff5722)] text-white flex items-center justify-center text-[8px] shrink-0"
                title="Верифицирован"
              >
                ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted,#71767b)] mt-0.5">
            <span className="truncate">@{user.username}</span>
            {user.streak > 0 && (
              <>
                <span>·</span>
                <span className="text-[#ff5722] font-semibold flex items-center gap-0.5 shrink-0">
                  <Flame size={12} className="fill-[#ff5722]" />
                  {user.streak}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actionButton}

        {onToggleMenu && (
          <div className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] hover:bg-[var(--surface2,#202327)] transition-colors"
              aria-label={`Меню действий для ${user.displayName}`}
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] shadow-xl p-1 z-30 flex flex-col gap-0.5 text-xs text-[var(--text,#fff)] animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                {onChat && (
                  <button
                    type="button"
                    onClick={onChat}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-hover,#1d1f23)] text-left font-medium transition-colors"
                  >
                    <MessageSquare size={14} className="text-[var(--accent,#ff5722)]" />
                    <span>Написать</span>
                  </button>
                )}

                {onBlock && (
                  <button
                    type="button"
                    onClick={onBlock}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left font-medium transition-colors"
                  >
                    <Ban size={14} />
                    <span>Заблокировать</span>
                  </button>
                )}

                {onReport && (
                  <button
                    type="button"
                    onClick={onReport}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-hover,#1d1f23)] text-amber-400 text-left font-medium transition-colors"
                  >
                    <ShieldAlert size={14} />
                    <span>Пожаловаться</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
