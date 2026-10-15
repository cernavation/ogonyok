'use client'

import {
  Bookmark,
  Check,
  Flame,
  Calendar,
  MapPin,
  MessageCircle,
  Plus,
  Share2,
} from 'lucide-react'
import { useMemo } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  formatCommunityCount,
  getCommunityPost,
  getCommunityUser,
} from '@/lib/ogonek/explore-content'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { CommentsThread } from '../comments-thread'
import { ModalShell } from '../modal-shell'
import { CommunityAvatar } from './community-avatar'

type Props = {
  postId: string
  onClose: () => void
  onNotify: (message: string) => void
  onOpenUser: (userId: string) => void
  onFilterTag: (tag: string) => void
  soundEnabled?: boolean
}

/**
 * ДЕТАЛИ ДОСТИЖЕНИЯ СООБЩЕСТВА.
 * Полноэкранная карточка публикации: живое фото-полотно, автор, теги,
 * огонёк, сохранение, шеринг и настоящая ветка поддержки под достижением.
 */
export function ExplorePostModal({
  postId,
  onClose,
  onNotify,
  onOpenUser,
  onFilterTag,
  soundEnabled = true,
}: Props) {
  const { state, toggleExplorePostLike, toggleExplorePostSave, toggleExploreFollow } = useOgonekStore()

  const post = useMemo(() => getCommunityPost(postId), [postId])
  const author = useMemo(
    () => (post ? getCommunityUser(post.authorId) : undefined),
    [post]
  )

  const liked = state.exploreLikedPosts ?? []
  const saved = state.exploreSavedPosts ?? []
  const following = state.exploreFollowingIds ?? []

  if (!post) {
    return (
      <ModalShell title="Достижение не найдено" onClose={onClose}>
        <div className="xh-user__empty">
          <p>Публикация недоступна — возможно, она была удалена.</p>
          <button type="button" className="xh-btn xh-btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </ModalShell>
    )
  }

  const isLiked = liked.includes(post.id)
  const isSaved = saved.includes(post.id)
  const isFollowing = author ? following.includes(author.id) : false

  const handleShare = async () => {
    playClick(soundEnabled)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      await navigator.clipboard.writeText(`${origin}/?achievement=${post.id}`)
      playSuccess(soundEnabled)
      onNotify('Ссылка на достижение скопирована')
    } catch {
      onNotify('Не удалось скопировать ссылку')
    }
  }

  return (
    <ModalShell title={post.kicker} onClose={onClose}>
      <div className="xh-post">
        <div
          className="xh-post__visual"
          style={{ background: `linear-gradient(150deg, ${post.from}, ${post.to})` }}
        >
          <span className="xh-post__glow" style={{ background: post.accent }} aria-hidden="true" />
          <span className="xh-post__emoji" aria-hidden="true">
            {post.emoji}
          </span>
          <span className="xh-post__kicker" style={{ color: post.accent }}>
            {post.kicker}
          </span>
          {post.isToday && <span className="xh-post__today">лучшее сегодня</span>}
        </div>

        {author && (
          <div className="xh-post__author-row">
            <button
              type="button"
              className="xh-author xh-author--lg"
              onClick={() => onOpenUser(author.id)}
            >
              <CommunityAvatar user={author} size={44} ring={isFollowing} />
              <span className="xh-author__text">
                <b>{author.name}</b>
                <small>
                  @{author.username} · <MapPin size={11} /> {post.city}
                </small>
              </span>
            </button>

            {!author.isMe && (
              <button
                type="button"
                className={`xh-follow ${isFollowing ? 'is-following' : ''}`}
                onClick={() => {
                  const now = toggleExploreFollow(author.id)
                  playClick(soundEnabled)
                  onNotify(now ? `Ты читаешь @${author.username} ✓` : `Отписка от @${author.username}`)
                }}
                aria-pressed={isFollowing}
              >
                {isFollowing ? <><Check size={13} /> Читаю</> : <><Plus size={13} /> Читать</>}
              </button>
            )}
          </div>
        )}

        <p className="xh-post__caption">{post.caption}</p>

        <div className="xh-post__tags">
          {post.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="xh-post__tag"
              onClick={() => {
                playClick(soundEnabled)
                onFilterTag(tag)
                onClose()
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="xh-post__meta">
          <span>
            <Calendar size={13} /> {post.dateLabel}
          </span>
          <span>
            <Flame size={13} /> {formatCommunityCount(post.likes)} огоньков
          </span>
          <span>
            <MessageCircle size={13} /> {formatCommunityCount(post.comments)} поддержки
          </span>
        </div>

        <div className="xh-post__actions">
          <button
            type="button"
            className={`xh-btn ${isLiked ? 'xh-btn--like' : 'xh-btn--soft'}`}
            onClick={() => {
              const now = toggleExplorePostLike(post.id)
              playClick(soundEnabled)
              onNotify(now ? '🔥 Огонёк зажжён!' : 'Огонёк снят')
            }}
            aria-pressed={isLiked}
          >
            <Flame size={15} fill={isLiked ? 'currentColor' : 'none'} />
            {isLiked ? 'Горит' : 'Зажечь огонёк'}
          </button>

          <button
            type="button"
            className={`xh-btn ${isSaved ? 'xh-btn--saved' : 'xh-btn--soft'}`}
            onClick={() => {
              const now = toggleExplorePostSave(post.id)
              playClick(soundEnabled)
              onNotify(now ? '🔖 Сохранено в коллекцию' : 'Убрано из коллекции')
            }}
            aria-pressed={isSaved}
          >
            <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
            {isSaved ? 'В коллекции' : 'Сохранить'}
          </button>

          <button type="button" className="xh-btn xh-btn--ghost" onClick={handleShare}>
            <Share2 size={15} /> Поделиться
          </button>
        </div>

        <div className="xh-post__comments">
          <CommentsThread
            target={`post:${post.id}`}
            variant="day"
            defaultOpen
            soundEnabled={soundEnabled}
            onNotify={onNotify}
          />
        </div>
      </div>
    </ModalShell>
  )
}
