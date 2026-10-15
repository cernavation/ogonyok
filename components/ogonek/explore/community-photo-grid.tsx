'use client'

import { Bookmark, Flame, ImageOff, MessageCircle } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import {
  formatCommunityCount,
  getCommunityUser,
  type CommunityPost,
} from '@/lib/ogonek/explore-content'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { CommunityAvatar } from './community-avatar'

type Props = {
  posts: CommunityPost[]
  onOpenPost: (id: string) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
  emptyTitle?: string
  emptyDesc?: string
}

/** Ритм бенто-сетки: часть плиток шире/выше для живой композиции */
function tileLayout(index: number): string {
  const mod = index % 7
  if (mod === 0) return 'is-wide'
  if (mod === 4) return 'is-tall'
  return ''
}

/**
 * ФОТО-СЕТКА ДОСТИЖЕНИЙ СООБЩЕСТВА.
 * Бенто-галерея публикаций людей со всего мира: огонёк и сохранение
 * работают прямо в плитке, тап по плитке открывает полное достижение.
 */
export function CommunityPhotoGrid({
  posts,
  onOpenPost,
  onNotify,
  soundEnabled = true,
  emptyTitle = 'Пока пусто',
  emptyDesc = 'Под этот фильтр достижений пока нет. Попробуй другую категорию или тег.',
}: Props) {
  const { state, toggleExplorePostLike, toggleExplorePostSave } = useOgonekStore()
  const liked = state.exploreLikedPosts ?? []
  const saved = state.exploreSavedPosts ?? []

  if (posts.length === 0) {
    return (
      <div className="xh-grid-empty" role="status">
        <ImageOff size={26} />
        <p className="xh-grid-empty__title">{emptyTitle}</p>
        <p className="xh-grid-empty__desc">{emptyDesc}</p>
      </div>
    )
  }

  return (
    <div className="xh-grid">
      {posts.map((post, index) => {
        const author = getCommunityUser(post.authorId)
        const isLiked = liked.includes(post.id)
        const isSaved = saved.includes(post.id)
        return (
          <article key={post.id} className={`xh-tile ${tileLayout(index)}`}>
            <button
              type="button"
              className="xh-tile__visual"
              style={{ background: `linear-gradient(150deg, ${post.from}, ${post.to})` }}
              onClick={() => onOpenPost(post.id)}
              aria-label={`Открыть достижение: ${post.kicker}`}
            >
              <span className="xh-tile__glow" style={{ background: post.accent }} aria-hidden="true" />
              <span className="xh-tile__emoji" aria-hidden="true">
                {post.emoji}
              </span>
              <span className="xh-tile__kicker" style={{ color: post.accent }}>
                {post.kicker}
              </span>
              <span className="xh-tile__city">{post.city}</span>
              {post.isToday && <span className="xh-tile__today">сегодня</span>}
            </button>

            <div className="xh-tile__foot">
              {author && (
                <span className="xh-tile__author" title={author.name}>
                  <CommunityAvatar user={author} size={24} showVerified={false} />
                  <b>{author.name.split(/\s+/)[0]}</b>
                </span>
              )}

              <div className="xh-tile__actions">
                <button
                  type="button"
                  className={`xh-icon-btn ${isLiked ? 'is-like' : ''}`}
                  onClick={() => {
                    const now = toggleExplorePostLike(post.id)
                    playClick(soundEnabled)
                    onNotify(now ? '🔥 Зажёг огонёк!' : 'Огонёк снят')
                  }}
                  aria-pressed={isLiked}
                  aria-label={isLiked ? 'Убрать огонёк' : 'Зажечь огонёк'}
                >
                  <Flame size={14} fill={isLiked ? 'currentColor' : 'none'} />
                  <span>{formatCommunityCount(post.likes + (isLiked ? 1 : 0))}</span>
                </button>

                <span className="xh-icon-btn xh-icon-btn--static" aria-hidden="true">
                  <MessageCircle size={13} />
                  {formatCommunityCount(post.comments)}
                </span>

                <button
                  type="button"
                  className={`xh-icon-btn ${isSaved ? 'is-save' : ''}`}
                  onClick={() => {
                    const now = toggleExplorePostSave(post.id)
                    playClick(soundEnabled)
                    onNotify(now ? '🔖 Сохранено в коллекцию' : 'Убрано из коллекции')
                  }}
                  aria-pressed={isSaved}
                  aria-label={isSaved ? 'Убрать из коллекции' : 'Сохранить в коллекцию'}
                >
                  <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
