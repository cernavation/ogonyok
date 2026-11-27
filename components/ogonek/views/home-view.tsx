'use client'

import { Check, Copy, Flame, MoreHorizontal, Plus, Image as ImageIcon, Sparkles, Smile, Users } from 'lucide-react'
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
import { Button, UserAvatar } from '../ui'
import { DayCard } from '../day-card'
import { EveningReview } from '../evening-review'
import { QuickFocus } from '../quick-focus'
import { StoriesBar } from '../stories-bar'
import { Tooltip } from '../tooltip'
import { LegacyMigrationBanner } from '../settings/legacy-migration-banner'
import { getFriendFeedPosts } from '@/lib/ogonek/social'
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
  const { state, currentUser, loadDaysFromCloud, loadCommentsForTargets, markAllNotificationsRead, markNotificationRead } = useOgonekStore()
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
  const [loadingFriendFeed, setLoadingFriendFeed] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const userGroups = useMemo(() => {
    const threads = state.chatThreads ?? {}
    const list: ChatGroupMeta[] = []
    Object.values(threads).forEach((t) => {
      if (t.groupMeta) list.push(t.groupMeta)
    })
    return list
  }, [state.chatThreads])

  const currentUserId = currentUser?.id || state.auth.activeAccountId || userId

  // Загрузка постов друзей с сервера Supabase при выборе вкладки «Друзья»
  useEffect(() => {
    if (filter !== 'Друзья') return
    let cancelled = false
    const fetchFriendsFeed = async () => {
      setLoadingFriendFeed(true)
      try {
        const posts = await getFriendFeedPosts({ viewerId: currentUserId })
        if (cancelled) return
        if (Array.isArray(posts) && posts.length > 0) {
          const mapped: Day[] = posts.map((p) => ({
            id: Number(p.dayNumber || p.id) || 1,
            cloudId: String(p.dayUuid || p.id),
            user_id: p.userId,
            userId: p.userId,
            day_number: Number(p.dayNumber || 1),
            dateISO: p.dayDate || new Date().toISOString(),
            title: p.title || `День пользователя @${p.username}`,
            visibility: p.visibility || 'friends',
            tags: [],
            prides: p.prides.map((pr, idx) => ({
              num: String(idx + 1),
              text: pr.text,
              scale: Number(pr.scale ?? 8),
              overcome: 1,
              category: pr.category,
              visibility: (p.visibility || 'friends') as any,
            })),
            gratitudes: p.gratitudes.map((gr, idx) => ({
              num: String(idx + 1),
              text: gr.text,
              category: gr.category,
              visibility: (p.visibility || 'friends') as any,
            })),
            author: {
              id: p.userId,
              username: p.username,
              displayName: p.displayName,
              avatarImage: p.avatarUrl || undefined,
              avatarColor: p.avatarColor || undefined,
              verified: p.verified,
              streak: p.streak,
            } as any,
          }))
          setServerFriendDays(mapped)
        }
      } catch (err) {
        console.error('Failed to load friends feed:', err)
      } finally {
        if (!cancelled) setLoadingFriendFeed(false)
      }
    }
    fetchFriendsFeed()
    return () => {
      cancelled = true
    }
  }, [filter, currentUserId])
  const followingIds = useMemo(() => {
    return Array.from(new Set([...(state.followingIds ?? []), ...(state.exploreFollowingIds ?? [])]))
  }, [state.followingIds, state.exploreFollowingIds])

  const handleCopyInvite = () => {
    playClick(soundEnabled)
    const refUser = username || 'cernavation'
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${refUser}` : 'https://ogonek.app'
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
      let baseList = serverFriendDays.length > 0 ? serverFriendDays : days.filter((d) => {
        const uid = d.user_id || (d as any).userId
        if (!uid) return false
        const isMine =
          (currentUserId && uid === currentUserId) ||
          (currentUser?.id && uid === currentUser.id) ||
          (state.auth.activeAccountId && uid === state.auth.activeAccountId)
        if (isMine) return false
        return (state.friendIds ?? []).includes(uid)
      })

      if (selectedGroupFilter) {
        baseList = baseList.filter((d) => {
          if (d.groupId === selectedGroupFilter || d.groupName === selectedGroupFilter) return true
          const inPrides = d.prides?.some((p) => p.groupId === selectedGroupFilter || p.groupName === selectedGroupFilter)
          if (inPrides) return true
          const inGrats = (d.gratitudes as any)?.some((g: any) => typeof g === 'object' && (g.groupId === selectedGroupFilter || g.groupName === selectedGroupFilter))
          return inGrats
        })
      }
      return baseList
    }
    if (filter === 'Подписки') {
      return days.filter((d) => {
        const uid = d.user_id || (d as any).userId
        if (!uid) return false
        const isMine =
          (currentUserId && uid === currentUserId) ||
          (currentUser?.id && uid === currentUser.id) ||
          (state.auth.activeAccountId && uid === state.auth.activeAccountId)
        if (isMine) return false
        return followingIds.includes(uid)
      })
    }
    return days.filter((d) => d.tags && d.tags.includes(filter))
  }, [days, filter, currentUserId, currentUser?.id, state.auth.activeAccountId, followingIds, serverFriendDays, state.friendIds])

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

        {/* Tabs with Twitter Blue underline indicator */}
        <div className="tabs" role="tablist" aria-label="Фильтры ленты">
          {FEED_TABS.map((tab) => {
            const isSelected = filter === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={isSelected ? 'selected' : ''}
                onClick={() => handleTabClick(tab)}
              >
                {tab}
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
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-white/5 text-[var(--muted)] hover:text-white'
            }`}
          >
            Все друзья
          </button>
          {userGroups.map((g) => {
            const isSelected = selectedGroupFilter === g.id || selectedGroupFilter === g.title
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroupFilter(isSelected ? null : g.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white/5 text-[var(--muted)] hover:text-white'
                }`}
              >
                <span>{g.avatarEmoji || '👥'}</span>
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
              <div className="flex items-center gap-1 -ml-2 text-[var(--accent)]" aria-label="Инструменты записи">
                <span className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--accent-soft)] transition-colors">
                  <ImageIcon size={18} />
                </span>
                <span className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--accent-soft)] transition-colors">
                  <Sparkles size={18} />
                </span>
                <span className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--accent-soft)] transition-colors">
                  <Smile size={18} />
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onCompose?.()
                }}
                className="font-bold min-h-[36px]"
              >
                Записать
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="feed-content">
        {isOwner && userId && (
          <div className="px-4 pt-3">
            <LegacyMigrationBanner
              userId={userId}
              localDaysCount={days.length}
              localDays={days}
              soundEnabled={soundEnabled}
              onNotify={onNotify}
              onCompleted={() => {
                setTimeout(() => {
                  window.location.reload()
                }, 1200)
              }}
            />
          </div>
        )}

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

        {isLoading && days.length === 0 ? (
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
        ) : days.length === 0 ? (
          <div className="empty-state py-12 text-center" role="status">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[#ff6b35]/10 text-[#ff6b35] mx-auto mb-2" aria-hidden="true">
              <Flame size={28} className="fill-[#ff6b35]/20 text-[#ff6b35]" />
            </span>
            <h2 className="empty-state__title text-lg font-bold mt-2">Твой путь в Priday готов к первому дню</h2>
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
            {visibleDays.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                onLightbox={onLightbox}
                onNotify={onNotify}
                onPinToVault={onPinToVault}
                onEdit={onEditDay}
                soundEnabled={soundEnabled}
              />
            ))}

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
        ) : filter === 'Друзья' || filter === 'Подписки' ? (
          <div className="empty-state p-8 my-6 mx-4 rounded-3xl bg-[var(--bg-elev)] border border-[var(--border)] text-center flex flex-col items-center justify-center gap-3">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[#ff6b35]/10 text-[#ff6b35] mb-1" aria-hidden="true">
              <Users size={24} className="text-[#ff6b35]" />
            </span>
            <p className="font-semibold text-base text-[var(--text)] max-w-md mx-auto leading-relaxed">
              Здесь будут победы ваших друзей. Поделитесь ссылкой с друзьями, чтобы держать стрик вместе!
            </p>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--text)] text-[var(--bg)] font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Ссылка скопирована!' : 'Скопировать приглашение'}</span>
            </button>
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
