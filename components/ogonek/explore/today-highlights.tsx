'use client'

import { Flame, Globe2, Star } from 'lucide-react'
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
  onOpenUser: (id: string) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

/**
 * ЛУЧШЕЕ ЗА СЕГОДНЯ В МИРЕ.
 * Горизонтальная карусель самых вовлекающих достижений дня со всей планеты.
 * Огонёк под карточкой реально зажигает реакцию в сторе.
 */
export function TodayHighlights({
  posts,
  onOpenPost,
  onOpenUser,
  onNotify,
  soundEnabled = true,
}: Props) {
  const { state, toggleExplorePostLike } = useOgonekStore()
  const liked = state.exploreLikedPosts ?? []

  if (posts.length === 0) return null

  return (
    <section className="xh-today" aria-labelledby="xh-today-title">
      <div className="xh-section__head">
        <h2 id="xh-today-title">
          <Globe2 size={16} className="xh-section__icon" /> Лучшее за сегодня в мире
        </h2>
        <span className="xh-section__badge">
          <Star size={11} /> {posts.length} в топе
        </span>
      </div>

      <div className="xh-today__row">
        {posts.map((post) => {
          const author = getCommunityUser(post.authorId)
          const isLiked = liked.includes(post.id)
          return (
            <article key={post.id} className="xh-today__card">
              <button
                type="button"
                className="xh-today__visual"
                style={{ background: `linear-gradient(150deg, ${post.from}, ${post.to})` }}
                onClick={() => onOpenPost(post.id)}
                aria-label={`Открыть достижение: ${post.kicker}`}
              >
                <span
                  className="xh-today__glow"
                  style={{ background: post.accent }}
                  aria-hidden="true"
                />
                <span className="xh-today__kicker" style={{ color: post.accent }}>
                  {post.kicker}
                </span>
                <span className="xh-today__emoji" aria-hidden="true">
                  {post.emoji}
                </span>
                <span className="xh-today__city">{post.city}</span>
              </button>

              <p className="xh-today__caption">{post.caption}</p>

              <div className="xh-today__foot">
                {author && (
                  <button
                    type="button"
                    className="xh-author"
                    onClick={() => onOpenUser(author.id)}
                    aria-label={`Открыть ${author.name}`}
                  >
                    <CommunityAvatar user={author} size={28} showVerified />
                    <span className="xh-author__text">
                      <b>{author.name}</b>
                      <small>🔥 {author.streak} дней</small>
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  className={`xh-like ${isLiked ? 'is-active' : ''}`}
                  onClick={() => {
                    const now = toggleExplorePostLike(post.id)
                    playClick(soundEnabled)
                    onNotify(now ? '🔥 Огонёк зажжён под достижением!' : 'Огонёк снят')
                  }}
                  aria-pressed={isLiked}
                  aria-label={isLiked ? 'Убрать огонёк' : 'Зажечь огонёк'}
                >
                  <Flame size={15} fill={isLiked ? 'currentColor' : 'none'} />
                  <span>{formatCommunityCount(post.likes + (isLiked ? 1 : 0))}</span>
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
