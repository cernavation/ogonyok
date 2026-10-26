'use client'

import { AnimatePresence } from 'framer-motion'
import { Check, Eye, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FRIEND_PROFILES, getFriend } from '@/lib/ogonek/friends'
import { playClick } from '@/lib/ogonek/sound'
import {
  buildFriendStories,
  formatStoryAge,
  friendStoryToViewable,
  myStoriesToViewable,
  type StoryTemplateContext,
  type ViewableStory,
} from '@/lib/ogonek/stories'
import { buildFriendDigest } from '@/lib/ogonek/story-digest'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { calculateStreak } from '@/lib/ogonek/streak'
import { getInitials } from '@/lib/ogonek/initials'
import { getActiveStories, subscribeToStories, type StoryRecord } from '@/lib/supabase/api'
import { StoryComposerModal } from './story-composer-modal'
import { StoryViewerModal } from './story-viewer-modal'

type Props = {
  /** 'feed' — горизонтальная лента вверху главной; 'rail' — карточка справа */
  variant?: 'feed' | 'rail'
  onNotify: (message: string) => void
  soundEnabled?: boolean
  onOpenProfile?: () => void
}

function firstName(name: string): string {
  return (name || '').split(/\s+/)[0] || name
}

export function StoriesBar({
  variant = 'feed',
  onNotify,
  soundEnabled = true,
  onOpenProfile,
}: Props) {
  const {
    state,
    markStoryViewed,
    markStoriesViewed,
    resetStoryViews,
    postMyStory,
    removeMyStory,
    toggleReaction,
    getMyReactionsFor,
    getReactionsFor,
    addComment,
  } = useOgonekStore()

  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  const profile = state.profile
  const myAvatarSrc = usePhotoUrl(profile.avatarImage)
  const followingIds = state.followingIds ?? []
  const viewedStoryIds = state.viewedStoryIds ?? []
  const currentUserId = state.auth?.activeAccountId ?? null

  const [remoteStories, setRemoteStories] = useState<StoryRecord[]>([])

  // Загрузка активных сторис (< 20 часов) из базы Supabase + Realtime подписка
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const list = await getActiveStories()
        if (!cancelled) {
          setRemoteStories(list)
        }
      } catch {}
    }

    load()
    const unsubscribe = subscribeToStories(() => {
      load()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Активные личные сторис (< 20 часов)
  const activeMyStories = useMemo(() => {
    const twentyHoursAgo = Date.now() - 20 * 60 * 60 * 1000
    const localActive = (state.myStories ?? []).filter((s) => {
      const ts = new Date(s.createdAtISO).getTime()
      return !Number.isNaN(ts) && ts >= twentyHoursAgo
    })

    // Дополняем серверными личными сторис (если зашли с другого устройства)
    if (currentUserId) {
      const remoteMine = remoteStories.filter((s) => s.user_id === currentUserId)
      for (const r of remoteMine) {
        const id = r.client_id || r.id
        if (!localActive.some((l) => l.id === id)) {
          localActive.push({
            id,
            emoji: r.emoji,
            kicker: r.kicker,
            headline: r.headline,
            detail: r.detail,
            from: r.from_color,
            to: r.to_color,
            accent: r.accent,
            photo: r.photo ?? null,
            backgroundId: r.background_id ?? undefined,
            sourceDayId: r.source_day_id ?? null,
            sourcePrideIndex: r.source_pride_index ?? null,
            visibility: (r.visibility as any) || 'public',
            createdAtISO: r.created_at,
          })
        }
      }
    }

    return localActive
  }, [state.myStories, remoteStories, currentUserId])

  const myStories = activeMyStories

  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

  // Превращаем удалённые активные сторис других пользователей в ViewableStory
  const remoteViewables = useMemo(() => {
    const twentyHoursAgo = Date.now() - 20 * 60 * 60 * 1000
    const now = Date.now()

    // Исключаем свои сторис и просроченные (> 20 часов)
    const others = remoteStories.filter((s) => {
      if (currentUserId && s.user_id === currentUserId) return false
      const createdTs = new Date(s.created_at).getTime()
      const expiresTs = s.expires_at ? new Date(s.expires_at).getTime() : createdTs + 20 * 60 * 60 * 1000
      return createdTs >= twentyHoursAgo && expiresTs > now
    })

    const byUser = new Map<string, StoryRecord[]>()
    for (const s of others) {
      const list = byUser.get(s.user_id) || []
      list.push(s)
      byUser.set(s.user_id, list)
    }

    const result: ViewableStory[] = []
    for (const [userId, stories] of byUser.entries()) {
      const author = stories[0].author
      const name = author?.display_name || author?.username || 'Соратник'
      const username = author?.username || 'user'
      const initials = getInitials(name, username)
      const avatarColor = author?.avatar_color || '#FF5C00'
      const verified = Boolean(author?.verified)

      // Сортировка по времени
      const sorted = [...stories].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      result.push({
        id: `remote-story-${userId}`,
        kind: 'friend',
        friendId: userId,
        name,
        username,
        initials,
        avatarColor,
        verified,
        postedLabel: formatStoryAge(sorted[sorted.length - 1].created_at),
        slides: sorted.map((s) => ({
          id: s.id,
          emoji: s.emoji || '🔥',
          kicker: s.kicker || '',
          headline: s.headline || '',
          detail: s.detail || '',
          from: s.from_color || '#2a1206',
          to: s.to_color || '#7a2f0c',
          accent: s.accent || '#ffa600',
          photo: s.photo ?? null,
        })),
        digest: buildFriendDigest({
          id: userId,
          name,
          username,
          initials,
          avatarColor,
          bio: author?.bio || '',
          city: author?.city || '',
          streak: author?.streak_count ?? author?.streak ?? 0,
          together: 0,
          mutual: 0,
          verified,
          lastActive: 'недавно',
          presence: 'online',
        }),
      })
    }

    return result
  }, [remoteStories, currentUserId])

  // В обычном режиме показываем только реальные подписки; демо-персонажи только при NEXT_PUBLIC_DEMO_MODE=1
  const friendStories = useMemo(() => {
    if (followingIds.length > 0) {
      return buildFriendStories(followingIds)
    }
    if (isDemo) {
      return buildFriendStories(FRIEND_PROFILES.map((f) => f.id))
    }
    return []
  }, [followingIds, isDemo])

  const myViewable = useMemo(
    () =>
      myStoriesToViewable(
        myStories,
        {
          displayName: profile.displayName,
          username: profile.username,
          avatarColor: profile.avatarColor,
          verified: profile.verified,
          city: profile.city,
          streak: calculateStreak(state.days),
        },
        state.days[0] ?? null
      ),
    [myStories, profile, state.days]
  )

  // Друзья: реальные сторис из Supabase + демо-подписки. Непросмотренные — вперёд (как в Instagram)
  const friendViewables = useMemo(() => {
    const list = friendStories
      .map((story) => {
        const friend = getFriend(story.friendId)
        return friend ? friendStoryToViewable(friend, story) : null
      })
      .filter((v): v is ViewableStory => v !== null)

    // Объединяем реальные сторис из Supabase и локальные, дедуплицируя по friendId
    const seenFriends = new Set<string>()
    const combined: ViewableStory[] = []

    for (const rv of remoteViewables) {
      if (rv.friendId && !seenFriends.has(rv.friendId)) {
        seenFriends.add(rv.friendId)
        combined.push(rv)
      }
    }

    for (const lv of list) {
      if (lv.friendId && !seenFriends.has(lv.friendId)) {
        seenFriends.add(lv.friendId)
        combined.push(lv)
      }
    }

    return combined.sort((a, b) => {
      const av = a.friendId ? viewedStoryIds.includes(a.friendId) : false
      const bv = b.friendId ? viewedStoryIds.includes(b.friendId) : false
      if (av === bv) return 0
      return av ? 1 : -1
    })
  }, [friendStories, remoteViewables, viewedStoryIds])

  const viewables = useMemo(
    () => (myViewable ? [myViewable, ...friendViewables] : friendViewables),
    [myViewable, friendViewables]
  )

  const unviewedCount = useMemo(
    () => friendViewables.filter((v) => v.friendId && !viewedStoryIds.includes(v.friendId)).length,
    [friendViewables, viewedStoryIds]
  )

  const storyContext: StoryTemplateContext = useMemo(() => {
    const latest = state.days[0]
    return {
      displayName: profile.displayName,
      streak: calculateStreak(state.days),
      latestTitle: latest?.prides[0]?.text || latest?.title || 'Новый день силы',
      latestDayId: latest?.id ?? null,
      totalPrides: state.days.reduce((sum, d) => sum + (d.prides ? d.prides.length : 0), 0),
      totalGratitudes: state.days.reduce((sum, d) => sum + (d.gratitudes ? d.gratitudes.length : 0), 0),
      monthlyGoal: profile.monthlyGoal,
    }
  }, [state.days, profile.displayName, profile.monthlyGoal])

  const openFriendStory = useCallback(
    (friendId: string) => {
      playClick(soundEnabled)
      const index = viewables.findIndex((v) => v.friendId === friendId)
      if (index >= 0) setViewerIndex(index)
    },
    [viewables, soundEnabled]
  )

  const openMyStory = useCallback(() => {
    playClick(soundEnabled)
    if (myStories.length === 0) {
      setComposerOpen(true)
      return
    }
    setViewerIndex(viewables.findIndex((v) => v.kind === 'mine'))
  }, [myStories.length, viewables, soundEnabled])

  const openAll = useCallback(() => {
    playClick(soundEnabled)
    if (viewables.length === 0) {
      setComposerOpen(true)
      return
    }
    setViewerIndex(0)
  }, [viewables.length, soundEnabled])

  const handleMarkAll = useCallback(() => {
    playClick(soundEnabled)
    markStoriesViewed(friendViewables.map((v) => v.friendId).filter((id): id is string => !!id))
    onNotify('Все истории отмечены просмотренными')
  }, [friendViewables, markStoriesViewed, onNotify, soundEnabled])

  const handleResetViews = useCallback(() => {
    playClick(soundEnabled)
    resetStoryViews()
    onNotify('Кружочки снова зажглись — истории как непросмотренные')
  }, [resetStoryViews, onNotify, soundEnabled])

  const shellClass = variant === 'rail' ? 'stories-rail' : 'stories-feed'

  return (
    <section className={shellClass} aria-label="Сторис друзей">
      {variant === 'rail' && (
        <header className="stories-rail__head">
          <h2 className="stories-rail__title">
            <Sparkles size={17} className="text-[#ff8a50]" aria-hidden="true" />
            Сторис друзей
          </h2>
          <span className="stories-rail__badge">
            {unviewedCount > 0 ? `${unviewedCount} новых` : 'все просмотрены'}
          </span>
        </header>
      )}

      <div className="stories-scroller" role="list">
        {/* Моя история + */}
        <div className="stories-item" role="listitem">
          <button
            type="button"
            className={`story-ring ${myStories.length > 0 ? 'is-mine-active' : 'is-empty'}`}
            onClick={openMyStory}
            aria-label={
              myStories.length > 0
                ? 'Смотреть мою историю'
                : 'Создать мою историю'
            }
          >
            <span
              className="story-ring__ring"
              style={myStories.length > 0 ? undefined : { background: 'transparent' }}
            >
              <span className="story-ring__inner">
                <span className="story-ring__avatar" style={{ background: profile.avatarColor }}>
                  {myAvatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={myAvatarSrc} alt="" />
                  ) : (
                    getInitials(profile.displayName, profile.username)
                  )}
                </span>
              </span>
            </span>
            <span className="story-ring__plus" aria-hidden="true">
              <Plus size={13} strokeWidth={3} />
            </span>
            <span className="story-ring__name">Моя история</span>
          </button>
        </div>

        {/* Кружочки друзей */}
        {friendViewables.map((viewable) => {
          const friend = viewable.friendId ? getFriend(viewable.friendId) : undefined
          const viewed = viewable.friendId ? viewedStoryIds.includes(viewable.friendId) : false
          return (
            <div className="stories-item" role="listitem" key={viewable.id}>
              <button
                type="button"
                className={`story-ring ${viewed ? 'is-viewed' : 'is-unviewed'}`}
                onClick={() => viewable.friendId && openFriendStory(viewable.friendId)}
                aria-label={`${viewed ? 'Смотреть' : 'Новая история'}: ${viewable.name}`}
              >
                <span
                  className="story-ring__ring"
                  style={{ background: viewed ? '#3a3f45' : viewable.avatarColor }}
                >
                  <span className="story-ring__inner">
                    <span className="story-ring__avatar" style={{ background: viewable.avatarColor }}>
                      {viewable.initials}
                    </span>
                  </span>
                </span>
                {viewable.verified && (
                  <span className="story-ring__verified flex items-center justify-center" aria-hidden="true">
                    <Check size={8} strokeWidth={3} />
                  </span>
                )}
                <span className="story-ring__name">{firstName(viewable.name)}</span>
              </button>
            </div>
          )
        })}

        {/* Кнопка «всё» — как продолжение ленты кружочков */}
        <div className="stories-item" role="listitem">
          <button
            type="button"
            className="story-ring is-all"
            onClick={openAll}
            aria-label="Смотреть все истории по порядку"
          >
            <span className="story-ring__ring" style={{ background: 'transparent' }}>
              <span className="story-ring__inner">
                <Eye size={18} className="text-[#1d9bf0]" aria-hidden="true" />
              </span>
            </span>
            <span className="story-ring__name">Все истории</span>
          </button>
        </div>
      </div>

      {variant === 'rail' && (
        <div className="stories-rail__actions">
          <button type="button" className="stories-rail__action" onClick={handleMarkAll}>
            <Eye size={14} /> Посмотреть всё
          </button>
          <button type="button" className="stories-rail__action" onClick={handleResetViews}>
            <RefreshCw size={14} /> Сбросить
          </button>
          {onOpenProfile && (
            <button type="button" className="stories-rail__action" onClick={() => { playClick(soundEnabled); onOpenProfile() }}>
              Профиль →
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {composerOpen && (
          <StoryComposerModal
            context={storyContext}
            myStories={myStories}
            myAvatarSrc={myAvatarSrc}
            displayName={profile.displayName}
            username={profile.username}
            onPublish={postMyStory}
            onDelete={removeMyStory}
            onClose={() => setComposerOpen(false)}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewerIndex !== null && viewables.length > 0 && (
          <StoryViewerModal
            stories={viewables}
            startIndex={viewerIndex}
            myAvatarSrc={myAvatarSrc}
            onClose={() => setViewerIndex(null)}
            onStoryViewed={markStoryViewed}
            onDeleteStory={removeMyStory}
            onToggleReaction={toggleReaction}
            myReactionsFor={getMyReactionsFor}
            reactionCountsFor={getReactionsFor}
            onSendReply={(target, text) => {
              addComment(target, text)
            }}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
