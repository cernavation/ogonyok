'use client'

import { AnimatePresence } from 'framer-motion'
import { Check, Eye, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { FRIEND_PROFILES, getFriend } from '@/lib/ogonek/friends'
import { playClick } from '@/lib/ogonek/sound'
import {
  buildFriendStories,
  friendStoryToViewable,
  myStoriesToViewable,
  type StoryTemplateContext,
  type ViewableStory,
} from '@/lib/ogonek/stories'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { calculateStreak } from '@/lib/ogonek/streak'
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
  const myStories = state.myStories ?? []

  // Только подписки; если список пуст — показываем весь круг
  const friendStories = useMemo(() => {
    const ids = followingIds.length > 0 ? followingIds : FRIEND_PROFILES.map((f) => f.id)
    return buildFriendStories(ids)
  }, [followingIds])

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

  // Друзья: непросмотренные — вперёд (как в Instagram)
  const friendViewables = useMemo(() => {
    const list = friendStories
      .map((story) => {
        const friend = getFriend(story.friendId)
        return friend ? friendStoryToViewable(friend, story) : null
      })
      .filter((v): v is ViewableStory => v !== null)
    return list.sort((a, b) => {
      const av = a.friendId ? viewedStoryIds.includes(a.friendId) : false
      const bv = b.friendId ? viewedStoryIds.includes(b.friendId) : false
      if (av === bv) return 0
      return av ? 1 : -1
    })
  }, [friendStories, viewedStoryIds])

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
      streak: state.days.length,
      latestTitle: latest?.prides[0]?.text || latest?.title || 'Новый день силы',
      latestDayId: latest?.id ?? null,
      totalPrides: state.days.reduce((sum, d) => sum + d.prides.length, 0),
      totalGratitudes: state.days.reduce((sum, d) => sum + d.gratitudes.length, 0),
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
                    (profile.displayName.split(/\s+/)[0]?.[0] ?? 'Я').toUpperCase()
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
