'use client'

import { Calendar, Check, Copy, Flame, MoreHorizontal, Plus, Image as ImageIcon, Users } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FEED_TABS } from '@/lib/ogonek/data'
import { computeFocusFlame } from '@/lib/ogonek/morning-focus'
import { playClick } from '@/lib/ogonek/sound'
import { getInitials } from '@/lib/ogonek/initials'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { StreakStatus } from '@/lib/ogonek/streak'
import type { ChatGroupMeta, Day, MorningFocusRecord, ViewId } from '@/lib/ogonek/types'
import dynamic from 'next/dynamic'
import { UserAvatar } from '../ui'
import { DayCard } from '../day-card'
import { EveningReview } from '../evening-review'
import { QuickFocus } from '../quick-focus'
import { StoriesBar } from '../stories-bar'
import { Tooltip } from '../tooltip'
import {
  getFeedUnreadSummary,
  getFollowingFeedPosts,
  getFriendFeedPosts,
  type FriendFeedPost,
} from '@/lib/ogonek/social'
import { scopedDayCommentTarget } from '@/lib/ogonek/comments'
import { subscribeToCommentsRealtime } from '@/lib/supabase/api'
import { NotificationsPopover } from '../notifications'

const FocusHistoryModal = dynamic(
  () => import('../focus-history-modal').then((m) => m.FocusHistoryModal),
  { ssr: false }
)

const CHUNK_SIZE = 20

type Props = {
  days: Day[]
  morningIntentions?: Record<string, [string, string, string]>
  /** ЭТАП 10: история утренних фокусов по дням с вечерней сверкой */
  morningFocusHistory?: Record<string, MorningFocusRecord>
  onSaveMorningIntentions?: (dateKey: string, focus: [string, string, string]) => void
  onMarkMorningFocusDone?: (dateKey: string, index: 0 | 1 | 2) => boolean
  onMarkMorningFocusMissed?: (dateKey: string, index: 0 | 1 | 2) => boolean
  onCompleteEveningReview?: (dateKey: string) => number
  onReopenEveningReview?: (dateKey: string) => void
  onRemoveMorningFocus?: (dateKey: string) => void
  onLightbox: (url: string) => void
  onNotify: (msg: string) => void
  onPinToVault?: (fact: string) => void
  onCompose?: () => void
  onComposeAction?: (action: 'photo' | 'date') => void
  onNavigate?: (view: ViewId) => void
  onEditDay?: (day: Day) => void
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
  onOpenProfile?: (userId?: string | null) => void
  onOpenFriends?: () => void
  soundEnabled?: boolean
  userId?: string
  currentUsername?: string
  isLoading?: boolean
}

export function HomeView({
  days,
  morningIntentions,
  morningFocusHistory,
  onSaveMorningIntentions,
  onMarkMorningFocusDone,
  onMarkMorningFocusMissed,
  onCompleteEveningReview,
  onReopenEveningReview,
  onRemoveMorningFocus,
  onLightbox,
  onNotify,
  onPinToVault,
  onCompose,
  onComposeAction,
  onNavigate,
  onEditDay,
  streak,
  streakStatus,
  hoursLeft,
  onOpenProfile,
  onOpenFriends,
  soundEnabled = true,
  userId,
  currentUsername,
  isLoading = false,
}: Props) {
  const {
    state,
    currentUser,
    loadDaysFromCloud,
    loadCommentsForTargets,
    markAllNotificationsRead,
    markNotificationRead,
    markFeedTabViewed,
  } = useOgonekStore()
  const displayName = currentUser?.displayName || state.profile.displayName || 'Пользователь'
  const username = currentUsername || currentUser?.username || state.profile.username || 'user'
  const initials = getInitials(displayName, username)
  const avatarImage = currentUser?.avatarImage || state.profile.avatarImage
  const isOwner = (username || '').toLowerCase() === 'cernavation'

  // Автозагрузка дней из облака Supabase для cernavation, если локальный стейт пуст (на новом устройстве или после очистки)
  useEffect(() => {
    if (isOwner && (!days || days.length === 0)) {
      const targetUid = userId || currentUser?.id || state.auth.activeAccountId || undefined
      loadDaysFromCloud?.(targetUid)
    }
  }, [isOwner, days?.length, userId, currentUser?.id, state.auth.activeAccountId, loadDaysFromCloud])

  const [filter, setFilter] = useState<string>('Мои гордости')
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState<number>(CHUNK_SIZE)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [serverFriendDays, setServerFriendDays] = useState<Day[]>([])
  const [serverFollowingDays, setServerFollowingDays] = useState<Day[]>([])
  const [loadingFriendFeed, setLoadingFriendFeed] = useState(false)
  const [loadingFollowingFeed, setLoadingFollowingFeed] = useState(false)
  const [friendsUnread, setFriendsUnread] = useState(0)
  const [followingUnread, setFollowingUnread] = useState(0)
  const [highlightedTarget, setHighlightedTarget] = useState<{ dayId: number; authorId?: string | null } | null>(null)
  const [feedReloadNonce, setFeedReloadNonce] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const userGroups = useMemo(() => {
    const threads = state.chatThreads ?? {}
    const seen = new Set<string>()
    const list: ChatGroupMeta[] = []
    Object.values(threads).forEach((t) => {
      if (t.groupMeta) {
        const key = t.groupMeta.dbId || t.groupMeta.id
        if (!seen.has(key)) {
          seen.add(key)
          list.push(t.groupMeta)
        }
      }
    })
    return list
  }, [state.chatThreads])

  const currentUserId = currentUser?.id || state.auth.activeAccountId || userId

  const mapFeedPostToDay = (p: FriendFeedPost): Day => ({
    id: Number(p.dayNumber || p.id) || 1,
    cloudId: String(p.dayUuid || p.id),
    user_id: p.userId,
    userId: p.userId,
    dateISO: p.dayDate || p.createdAt || new Date().toISOString(),
    title: p.title || `День #${p.dayNumber || 1}`,
    visibility: p.visibility || 'friends',
    groupId: p.groupId || null,
    groupName: p.groupName || undefined,
    photos: Array.isArray(p.photos) ? p.photos : [],
    score: typeof p.score === 'number' ? p.score : undefined,
    aiScore: typeof p.aiScore === 'number' ? p.aiScore : undefined,
    aiVerdict: p.aiVerdict || undefined,
    tags: [],
    prides: (p.prides || []).map((pr, idx) => ({
      num: String(idx + 1),
      text: pr.text,
      scale: Number(pr.scale ?? 8),
      overcome: (Number(pr.overcome ?? 1) as any),
      visibility: (pr.visibility || p.visibility || 'friends') as any,
      groupId: pr.groupId ?? p.groupId ?? null,
    })),
    gratitudes: (p.gratitudes || []).map((gr, idx) => ({
      num: String(idx + 1),
      text: gr.text,
      rating: typeof gr.rating === 'number' ? gr.rating : 10,
      visibility: (gr.visibility || p.visibility || 'friends') as any,
      groupId: gr.groupId ?? p.groupId ?? null,
    })),
    author: {
      id: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatarImage: p.avatarUrl || undefined,
      avatarColor: p.avatarColor || '#FF5C00',
      verified: p.verified,
      streak: p.streak,
    } as any,
  })

  const normGroupKey = (val?: string | null): string | null => {
    if (!val || typeof val !== 'string') return null
    const cleaned = val.trim().replace(/^group:(group-)?/i, '').replace(/^group-/i, '').toLowerCase()
    return cleaned || null
  }

  // Инициализация вкладки из URL (?tab=friends&groupId=...&highlightDay=...) и подписка на глубокие ссылки из чатов/уведомлений
  useEffect(() => {
    if (typeof window === 'undefined') return
    const applyDeepLink = (
      tabParam?: string | null,
      hlDay?: number | null,
      authorId?: string | null,
      groupIdParam?: string | null
    ) => {
      if (tabParam === 'friends') {
        setFilter('Друзья')
        markFeedTabViewed?.('friends')
        setFriendsUnread(0)
        setFeedReloadNonce((n) => n + 1)

        // Определяем целевую группу для фильтрации ленты
        let resolvedGroupFilter: string | null = null
        if (groupIdParam) {
          const normParam = normGroupKey(groupIdParam)
          const matchedGroup = userGroups.find(
            (g) =>
              g.id === groupIdParam ||
              g.dbId === groupIdParam ||
              (normParam && (normGroupKey(g.dbId) === normParam || normGroupKey(g.id) === normParam)) ||
              g.title === groupIdParam
          )
          resolvedGroupFilter = matchedGroup?.id || groupIdParam
        } else if (hlDay && Number.isFinite(hlDay)) {
          // Если groupId не передали в старом сообщении — ищем среди собственных/кэшированных дней
          const matchedOwn = days.find(
            (d) =>
              d.id === hlDay &&
              d.visibility === 'group' &&
              Boolean(d.groupId) &&
              (!authorId || d.user_id === authorId || d.userId === authorId)
          )
          if (matchedOwn?.groupId) {
            const normOwn = normGroupKey(matchedOwn.groupId)
            const matchedGroup = userGroups.find(
              (g) =>
                g.id === matchedOwn.groupId ||
                g.dbId === matchedOwn.groupId ||
                (normOwn && (normGroupKey(g.dbId) === normOwn || normGroupKey(g.id) === normOwn))
            )
            resolvedGroupFilter = matchedGroup?.id || matchedOwn.groupId
          }
        }
        setSelectedGroupFilter(resolvedGroupFilter)
      } else if (tabParam === 'following') {
        setFilter('Подписки')
        setSelectedGroupFilter(null)
        markFeedTabViewed?.('following')
        setFollowingUnread(0)
        setFeedReloadNonce((n) => n + 1)
      }
      if (hlDay && Number.isFinite(hlDay)) {
        setVisibleCount((prev) => Math.max(prev, 60))
        setHighlightedTarget({ dayId: hlDay, authorId: authorId || null })
      }
    }

    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    const hlRaw = params.get('highlightDay')
    const authorParam = params.get('authorId')
    const groupParam = params.get('groupId')
    if (tabParam || hlRaw) {
      applyDeepLink(tabParam, hlRaw ? Number(hlRaw) : null, authorParam, groupParam)
    }

    const onFocusDay = (e: any) => {
      const d = e?.detail || {}
      applyDeepLink(
        d.tab || 'friends',
        d.dayId ? Number(d.dayId) : null,
        d.userId || null,
        d.groupId || null
      )
    }
    window.addEventListener('ogonek:focus-feed-day', onFocusDay)
    return () => window.removeEventListener('ogonek:focus-feed-day', onFocusDay)
  }, [markFeedTabViewed, userGroups, days])

  // Плавный скролл и оранжевая подсветка дня на ~2.5 секунды
  useEffect(() => {
    if (!highlightedTarget?.dayId) return
    const timerFind = setTimeout(() => {
      const selector = highlightedTarget.authorId
        ? `[data-day-number="${highlightedTarget.dayId}"][data-day-author="${highlightedTarget.authorId}"]`
        : `[data-day-number="${highlightedTarget.dayId}"]`
      const el =
        document.querySelector(selector) ||
        document.getElementById(`day-card-${highlightedTarget.dayId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 180)
    const timerClear = setTimeout(() => {
      setHighlightedTarget(null)
    }, 2600)
    return () => {
      clearTimeout(timerFind)
      clearTimeout(timerClear)
    }
  }, [highlightedTarget, serverFriendDays.length, serverFollowingDays.length, filter])

  // Загрузка бейджей непрочитанных постов на вкладках «Друзья» и «Подписки»
  useEffect(() => {
    if (!currentUserId || currentUserId.startsWith('anon-') || currentUserId.startsWith('acct-guest')) {
      setFriendsUnread(0)
      setFollowingUnread(0)
      return
    }
    let cancelled = false
    const refreshBadges = async () => {
      const summary = await getFeedUnreadSummary({
        viewerId: currentUserId,
        sinceFriendsAt: state.lastViewedFriendsFeedAt ?? null,
        sinceFollowingAt: state.lastViewedFollowingFeedAt ?? null,
      })
      if (cancelled) return
      setFriendsUnread(filter === 'Друзья' ? 0 : summary.friendsUnread)
      setFollowingUnread(filter === 'Подписки' ? 0 : summary.followingUnread)
    }
    void refreshBadges()

    const onRefresh = () => void refreshBadges()
    if (typeof window !== 'undefined') {
      window.addEventListener('ogonek:refresh-feed-badges', onRefresh)
    }
    return () => {
      cancelled = true
      if (typeof window !== 'undefined') {
        window.removeEventListener('ogonek:refresh-feed-badges', onRefresh)
      }
    }
  }, [
    currentUserId,
    filter,
    state.lastViewedFriendsFeedAt,
    state.lastViewedFollowingFeedAt,
  ])

  // Загрузка реальной хронологической ленты «Друзья» из Supabase (public + friends + group участника)
  useEffect(() => {
    if (filter !== 'Друзья') return
    if (!currentUserId || currentUserId.startsWith('anon-') || currentUserId.startsWith('acct-guest')) {
      setServerFriendDays([])
      setLoadingFriendFeed(false)
      return
    }
    let cancelled = false
    const fetchFriendsFeed = async () => {
      setLoadingFriendFeed(true)
      try {
        const posts = await getFriendFeedPosts({
          viewerId: currentUserId,
          tab: 'friends',
          groupId: selectedGroupFilter || undefined,
          limit: 50,
        })
        if (cancelled) return
        setServerFriendDays(Array.isArray(posts) ? posts.map(mapFeedPostToDay) : [])
      } catch (err) {
        console.error('Failed to load friends feed:', err)
        if (!cancelled) setServerFriendDays([])
      } finally {
        if (!cancelled) setLoadingFriendFeed(false)
      }
    }
    void fetchFriendsFeed()
    return () => {
      cancelled = true
    }
  }, [filter, currentUserId, feedReloadNonce, selectedGroupFilter])

  // Загрузка реальной хронологической ленты «Подписки» (только public посты подписок) из Supabase
  useEffect(() => {
    if (filter !== 'Подписки') return
    if (!currentUserId || currentUserId.startsWith('anon-') || currentUserId.startsWith('acct-guest')) {
      setServerFollowingDays([])
      setLoadingFollowingFeed(false)
      return
    }
    let cancelled = false
    const fetchFollowingFeed = async () => {
      setLoadingFollowingFeed(true)
      try {
        const posts = await getFollowingFeedPosts({
          viewerId: currentUserId,
          limit: 40,
        })
        if (cancelled) return
        setServerFollowingDays(Array.isArray(posts) ? posts.map(mapFeedPostToDay) : [])
      } catch (err) {
        console.error('Failed to load following feed:', err)
        if (!cancelled) setServerFollowingDays([])
      } finally {
        if (!cancelled) setLoadingFollowingFeed(false)
      }
    }
    void fetchFollowingFeed()
    return () => {
      cancelled = true
    }
  }, [filter, currentUserId, feedReloadNonce])

  const handleCopyInvite = () => {
    playClick(soundEnabled)
    const refUser = username || 'cernavation'
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${refUser}` : 'https://winlog.life'
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
    }
    setCopied(true)
    onNotify('Ссылка-приглашение скопирована в буфер обмена!')
    setTimeout(() => setCopied(false), 2500)
  }

  const todayKey = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  const focusHistory = useMemo(() => morningFocusHistory ?? {}, [morningFocusHistory])
  const todayFocusRecord = focusHistory[todayKey]
  const focusFlameStats = useMemo(
    () => computeFocusFlame(focusHistory, todayKey),
    [focusHistory, todayKey]
  )

  const handleScrollToReview = () => {
    document.getElementById('evening-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const filteredDays = useMemo(() => {
    if (filter === 'Мои гордости') {
      return days.filter((d) => {
        const uid = d.user_id || (d as any).userId
        if (uid) {
          return (
            uid === currentUserId ||
            (currentUser?.id && uid === currentUser.id) ||
            (state.auth.activeAccountId && uid === state.auth.activeAccountId)
          )
        }
        return true
      })
    }
    if (filter === 'Друзья') {
      if (selectedGroupFilter) {
        const selectedGroupMeta = userGroups.find(
          (g) =>
            g.id === selectedGroupFilter ||
            g.dbId === selectedGroupFilter ||
            g.title === selectedGroupFilter ||
            (normGroupKey(g.dbId || g.id) && normGroupKey(g.dbId || g.id) === normGroupKey(selectedGroupFilter))
        )
        const targetNormId = normGroupKey(selectedGroupMeta?.dbId || selectedGroupMeta?.id || selectedGroupFilter)
        const targetTitle = selectedGroupMeta?.title || null

        const matchesSelectedGroup = (d: Day): boolean => {
          if (d.visibility === 'private') return false
          const dNorm = normGroupKey(d.groupId)
          if (targetNormId && dNorm && dNorm === targetNormId) return true
          if (d.groupId === selectedGroupFilter || (targetTitle && d.groupName === targetTitle)) return true
          if (
            targetNormId &&
            Array.isArray(d.targetGroupIds) &&
            d.targetGroupIds.some((tid) => normGroupKey(tid) === targetNormId)
          ) {
            return true
          }
          const inPrides = (d.prides || []).some(
            (p) =>
              p.visibility === 'group' &&
              (p.groupId === selectedGroupFilter ||
                (targetTitle && p.groupName === targetTitle) ||
                (targetNormId && normGroupKey(p.groupId) === targetNormId))
          )
          if (inPrides) return true
          const inGrats = (d.gratitudes as any)?.some(
            (g: any) =>
              typeof g === 'object' &&
              g.visibility === 'group' &&
              (g.groupId === selectedGroupFilter ||
                (targetTitle && g.groupName === targetTitle) ||
                (targetNormId && normGroupKey(g.groupId) === targetNormId))
          )
          return Boolean(inGrats)
        }

        // Объединяем посты друзей из сервера И собственные посты автора, опубликованные в эту группу
        const ownMatchingDays = days
          .filter(matchesSelectedGroup)
          .map((d) => ({
            ...d,
            groupName: d.groupName || targetTitle || undefined,
            user_id: d.user_id || d.userId || currentUserId,
            userId: d.userId || d.user_id || currentUserId,
            author: d.author || {
              id: currentUserId,
              username,
              displayName,
              avatarImage: avatarImage || undefined,
              avatarColor: state.profile.avatarColor || '#FF5C00',
              verified: Boolean(state.profile.verified),
              streak: streak ?? state.profile.streak ?? 0,
            },
          }))

        const serverMatchingDays = serverFriendDays.filter(matchesSelectedGroup)
        const mergedMap = new Map<string, Day>()
        for (const d of [...serverMatchingDays, ...ownMatchingDays]) {
          const authorKey = d.user_id || d.userId || currentUserId || 'me'
          const dedupeKey = `${authorKey}:${d.id}`
          if (!mergedMap.has(dedupeKey)) {
            mergedMap.set(dedupeKey, d)
          }
        }
        return Array.from(mergedMap.values()).sort((a, b) => {
          const tb = b.dateISO ? new Date(b.dateISO).getTime() : 0
          const ta = a.dateISO ? new Date(a.dateISO).getTime() : 0
          if (tb !== ta) return tb - ta
          return b.id - a.id
        })
      }
      return serverFriendDays
    }
    if (filter === 'Подписки') {
      return serverFollowingDays
    }
    return days.filter((d) => d.tags && d.tags.includes(filter))
  }, [
    days,
    filter,
    currentUserId,
    currentUser?.id,
    state.auth.activeAccountId,
    state.profile.avatarColor,
    state.profile.verified,
    state.profile.streak,
    displayName,
    username,
    avatarImage,
    streak,
    serverFriendDays,
    serverFollowingDays,
    selectedGroupFilter,
    userGroups,
  ])

  const visibleDays = useMemo(() => {
    return filteredDays.slice(0, visibleCount)
  }, [filteredDays, visibleCount])

  // Гидрация реальных комментариев и счётчиков 💬 для видимых дней + Realtime-обновление
  const visibleCommentTargetHints = useMemo(() => {
    const hints: Record<string, string | null> = {}
    for (const d of visibleDays) {
      const ownerId = d.user_id || d.userId || (d as any).author?.id || currentUserId || null
      const targetKey = scopedDayCommentTarget(d.id, ownerId)
      hints[targetKey] = ownerId
    }
    return hints
  }, [visibleDays, currentUserId])

  const visibleCommentTargetsKey = useMemo(
    () => Object.keys(visibleCommentTargetHints).sort().join('|'),
    [visibleCommentTargetHints]
  )

  useEffect(() => {
    if (!currentUserId || currentUserId.startsWith('anon-') || currentUserId.startsWith('acct-guest')) {
      return
    }
    const targets = Object.keys(visibleCommentTargetHints)
    if (targets.length === 0) return

    let cancelled = false
    void loadCommentsForTargets(targets, visibleCommentTargetHints).catch(() => {})

    let rtTimer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = subscribeToCommentsRealtime(() => {
      if (rtTimer) clearTimeout(rtTimer)
      rtTimer = setTimeout(() => {
        if (!cancelled) {
          void loadCommentsForTargets(targets, visibleCommentTargetHints).catch(() => {})
        }
      }, 260)
    })

    const onAuthHydrated = () => {
      if (!cancelled) {
        void loadCommentsForTargets(targets, visibleCommentTargetHints).catch(() => {})
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('ogonek:auth-hydrated', onAuthHydrated)
    }

    return () => {
      cancelled = true
      if (rtTimer) clearTimeout(rtTimer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('ogonek:auth-hydrated', onAuthHydrated)
      }
      unsubscribe()
    }
  }, [visibleCommentTargetsKey, currentUserId, loadCommentsForTargets, visibleCommentTargetHints])

  // Infinite scroll chunk loading sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (visibleCount >= filteredDays.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, filteredDays.length))
        }
      },
      { rootMargin: '600px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, filteredDays.length])

  // Fast scroll to bottom support from ScrollPill
  useEffect(() => {
    const onBottom = () => {
      setVisibleCount(filteredDays.length)
      setTimeout(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      }, 60)
    }
    window.addEventListener('ogonek:scroll-bottom', onBottom)
    return () => window.removeEventListener('ogonek:scroll-bottom', onBottom)
  }, [filteredDays.length])

  const handleTabClick = (tab: string) => {
    playClick(soundEnabled)
    setFilter(tab)
    setVisibleCount(CHUNK_SIZE)
    if (tab === 'Друзья') {
      setFriendsUnread(0)
      markFeedTabViewed?.('friends')
      setFeedReloadNonce((n) => n + 1)
    } else if (tab === 'Подписки') {
      setFollowingUnread(0)
      markFeedTabViewed?.('following')
      setFeedReloadNonce((n) => n + 1)
    }
  }

  return (
    <div className="view-home w-full min-h-screen shrink-0">
      {/* Sticky glassy feed header */}
      <header className="feed-header">
        {/* Title row */}
        <div className="feed-title">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Главная</h1>
          <div className="flex items-center gap-1">
            {onOpenFriends && (
              <Tooltip content="Друзья" side="bottom">
                <button
                  type="button"
                  data-tour="nav-friends"
                  onClick={onOpenFriends}
                  className="muted w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors relative"
                  aria-label="Друзья"
                >
                  <Users size={19} />
                  {(state.incomingFriendRequests?.length ?? 0) > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
                  )}
                </button>
              </Tooltip>
            )}
            <NotificationsPopover
              notifications={state.notifications || []}
              unreadCount={state.unreadNotificationsCount || 0}
              onMarkAllRead={markAllNotificationsRead}
              onMarkRead={markNotificationRead}
              onOpenFriends={onOpenFriends}
              onOpenChat={() => {
                if (onNavigate) onNavigate('messages')
              }}
              onNavigate={onNavigate}
            />
          </div>
        </div>

        {/* Tabs with X.com underline indicator & unread circular badges */}
        <div className="tabs" role="tablist" aria-label="Фильтры ленты">
          {FEED_TABS.map((tab) => {
            const isSelected = filter === tab
            const unreadBadge =
              tab === 'Друзья'
                ? (isSelected ? 0 : friendsUnread)
                : tab === 'Подписки'
                ? (isSelected ? 0 : followingUnread)
                : 0
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={isSelected ? 'selected' : ''}
                onClick={() => handleTabClick(tab)}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <span>{tab}</span>
                  {unreadBadge > 0 && (
                    <span
                      data-testid={tab === 'Друзья' ? 'friends-tab-unread' : 'following-tab-unread'}
                      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#d76737] text-black text-[10.5px] font-bold leading-none tabular-nums"
                    >
                      {unreadBadge > 99 ? '99+' : unreadBadge}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Фильтр по группе внутри вкладки «Друзья» (CONTRACT Шаг 09) */}
      {filter === 'Друзья' && userGroups.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--line)] overflow-x-auto no-scrollbar bg-[var(--surface-subtle,#16181c)]/40">
          <button
            type="button"
            onClick={() => setSelectedGroupFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGroupFilter === null
                ? 'bg-[#d76737] text-black font-bold shadow-sm'
                : 'bg-white/5 text-[var(--muted)] hover:text-white'
            }`}
          >
            Все друзья
          </button>
          {userGroups.map((g) => {
            const isSelected =
              selectedGroupFilter === g.id ||
              selectedGroupFilter === g.dbId ||
              selectedGroupFilter === g.title ||
              (normGroupKey(selectedGroupFilter) !== null &&
                normGroupKey(selectedGroupFilter) === normGroupKey(g.dbId || g.id))
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroupFilter(isSelected ? null : g.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-white/5 text-[var(--muted)] hover:text-white'
                }`}
              >
                {g.avatarImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.avatarImage}
                    alt={g.title}
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span>{g.avatarEmoji || '👥'}</span>
                )}
                <span>{g.title}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Сторис друзей — Instagram-кружочки вверху ленты */}
      <StoriesBar
        variant="feed"
        onNotify={onNotify}
        soundEnabled={soundEnabled}
        onOpenProfile={onOpenProfile}
      />

      {/* Inline composer — X.com canonical layout */}
      {onCompose && (
        <div
          className="flex gap-3 px-4 pt-3 pb-3 border-b border-[var(--line)] cursor-pointer hover:bg-[var(--bg-hover-post)] transition-colors duration-150"
          onClick={onCompose}
          role="region"
          aria-label="Создать запись дня"
        >
          <UserAvatar
            avatarUrl={avatarImage}
            avatarColor={state.profile.avatarColor}
            displayName={displayName}
            username={username}
            initials={initials}
            size={40}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="py-2 text-[var(--text-2)] text-[18px] font-normal select-none">
              Чем гордишься сегодня?
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--line)] mt-1">
              <div className="flex items-center gap-1 -ml-2" aria-label="Инструменты записи">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    playClick(soundEnabled)
                    if (onComposeAction) {
                      onComposeAction('photo')
                    } else {
                      onCompose?.()
                    }
                  }}
                  aria-label="Добавить фото к дню"
                  title="Добавить фото"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    playClick(soundEnabled)
                    if (onComposeAction) {
                      onComposeAction('date')
                    } else {
                      onCompose?.()
                    }
                  }}
                  aria-label="Выбрать дату дня"
                  title="Выбрать дату"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <Calendar size={18} />
                </button>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  playClick(soundEnabled)
                  onCompose?.()
                }}
                className="rounded-full bg-white/[0.08] border border-white/[0.14] text-white/90 hover:bg-white/[0.15] hover:text-white transition-colors px-4 h-9 text-sm font-medium cursor-pointer"
              >
                Записать
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="feed-content">
        {filter === 'Мои гордости' && (
          <>
            <QuickFocus
              initialFocus={morningIntentions?.[todayKey]}
              record={todayFocusRecord}
              stats={focusFlameStats}
              onSave={(focus) => onSaveMorningIntentions?.(todayKey, focus)}
              onOpenHistory={() => setHistoryOpen(true)}
              onFocusReview={handleScrollToReview}
              notify={onNotify}
              soundEnabled={soundEnabled}
            />

            {todayFocusRecord && onMarkMorningFocusDone && onMarkMorningFocusMissed && onCompleteEveningReview && onReopenEveningReview && (
              <EveningReview
                dateKey={todayKey}
                record={todayFocusRecord}
                notify={onNotify}
                soundEnabled={soundEnabled}
                onMarkDone={onMarkMorningFocusDone}
                onMarkMissed={onMarkMorningFocusMissed}
                onComplete={onCompleteEveningReview}
                onReopen={onReopenEveningReview}
              />
            )}
          </>
        )}

        {((filter === 'Мои гордости' && isLoading && filteredDays.length === 0) ||
          (filter === 'Друзья' && loadingFriendFeed && filteredDays.length === 0) ||
          (filter === 'Подписки' && loadingFollowingFeed && filteredDays.length === 0)) ? (
          <div className="py-16 text-center space-y-4 animate-pulse" role="status" aria-label="Загрузка летописи...">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mx-auto mb-2 animate-bounce" aria-hidden="true">
              <Flame size={28} className="text-[var(--accent)]" />
            </span>
            <div className="h-5 w-48 bg-[var(--border)]/40 rounded-full mx-auto" />
            <div className="h-3 w-64 bg-[var(--border)]/20 rounded-full mx-auto" />
            <div className="space-y-3 max-w-lg mx-auto pt-4">
              <div className="h-28 bg-[var(--card)]/60 rounded-2xl border border-[var(--border)]/20" />
              <div className="h-28 bg-[var(--card)]/60 rounded-2xl border border-[var(--border)]/20" />
            </div>
          </div>
        ) : filter === 'Мои гордости' && filteredDays.length === 0 ? (
          <div className="empty-state py-12 text-center" role="status">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[#d76737]/10 text-[#d76737] mx-auto mb-2" aria-hidden="true">
              <Flame size={28} className="fill-[#d76737]/20 text-[#d76737]" />
            </span>
            <h2 className="empty-state__title text-lg font-bold mt-2">Твой путь в Winlog готов к первому дню</h2>
            <p className="empty-state__desc text-muted text-sm max-w-sm mx-auto mt-1 mb-6">
              Фиксируй 5 поводов для гордости каждый день, чтобы замечать свою силу и сохранять внутреннюю опору.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4 mt-2">
              {onCompose && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap h-11 px-6 rounded-full bg-[var(--accent)] text-[var(--accent-contrast,#000000)] text-[14px] font-bold shadow-[0_4px_14px_var(--accent-soft)] hover:opacity-95 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
                  onClick={onCompose}
                >
                  <Plus size={16} className="shrink-0" />
                  <span>Записать первый день</span>
                </button>
              )}
              {onNavigate && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap h-11 px-6 rounded-full border border-[var(--line)] bg-transparent text-[var(--text)] text-[14px] font-semibold hover:bg-white/[0.06] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
                  onClick={() => onNavigate('settings')}
                >
                  <span>Импортировать архив</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredDays.length > 0 ? (
          <>
            {visibleDays.map((day) => {
              const cardAuthor = day.user_id || day.userId || null
              const isCardHighlighted = Boolean(
                highlightedTarget &&
                  highlightedTarget.dayId === day.id &&
                  (!highlightedTarget.authorId || highlightedTarget.authorId === cardAuthor)
              )
              return (
                <DayCard
                  key={`${cardAuthor || 'me'}-${day.cloudId || day.id}`}
                  day={day}
                  onLightbox={onLightbox}
                  onNotify={onNotify}
                  onPinToVault={onPinToVault}
                  onEdit={onEditDay}
                  onOpenProfile={onOpenProfile}
                  isHighlighted={isCardHighlighted}
                  isOwnerOverride={filter === 'Мои гордости' ? true : undefined}
                  soundEnabled={soundEnabled}
                />
              )
            })}

            {visibleCount < filteredDays.length && (
              <div ref={sentinelRef} className="feed-chunk-loader py-6 text-center">
                <button
                  type="button"
                  className="x-secondary-btn text-xs px-4 py-2 opacity-85 hover:opacity-100 transition-opacity"
                  onClick={() =>
                    setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, filteredDays.length))
                  }
                >
                  Показать ещё {CHUNK_SIZE} дней (показано {visibleDays.length} из {filteredDays.length})
                </button>
              </div>
            )}

            {visibleDays.length >= filteredDays.length && filteredDays.length > CHUNK_SIZE && (
              <div className="feed-chunk-end py-8 text-center text-xs text-muted">
                ✦ Начало пути · Летопись полностью загружена ({filteredDays.length} дней)
              </div>
            )}
          </>
        ) : filter === 'Друзья' ? (
          <div className="empty-state p-8 my-6 mx-4 rounded-2xl bg-[#060608] border border-white/[0.12] text-center flex flex-col items-center justify-center gap-3">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[#ff5a1f]/10 text-[#ff5a1f] mb-1" aria-hidden="true">
              <Users size={24} className="text-[#ff5a1f]" />
            </span>
            <p className="font-semibold text-[15px] text-white max-w-md mx-auto leading-relaxed">
              {selectedGroupFilter
                ? 'В этой группе пока нет публикаций от друзей'
                : 'Друзья ещё не публиковали гордости'}
            </p>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="mt-1 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-bold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Ссылка скопирована!' : 'Пригласить друзей'}</span>
            </button>
          </div>
        ) : filter === 'Подписки' ? (
          <div className="empty-state p-8 my-6 mx-4 rounded-2xl bg-[#060608] border border-white/[0.12] text-center flex flex-col items-center justify-center gap-2.5">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.06] text-white/70 mb-1" aria-hidden="true">
              <Flame size={22} />
            </span>
            <p className="font-semibold text-[15px] text-white max-w-md mx-auto leading-relaxed">
              В подписках пока нет публичных записей
            </p>
            <p className="text-xs text-[#71767b] max-w-sm">
              Подписывайтесь на интересных участников через поиск — здесь появятся их открытые гордости.
            </p>
          </div>
        ) : (
          <div className="empty-state p-8 text-center" role="status">
            <p className="empty-state__title font-bold text-sm text-[var(--text)] mb-1">
              Ничего не найдено
            </p>
            <p className="empty-state__desc text-xs text-[var(--text-2)]">
              {`Записей с тегом «${filter}» пока нет. Нажмите «+», чтобы создать запись.`}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {historyOpen && (
          <FocusHistoryModal
            history={focusHistory}
            todayKey={todayKey}
            onClose={() => setHistoryOpen(false)}
            onRemove={(dateKey) => onRemoveMorningFocus?.(dateKey)}
            notify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
