'use client'

import { Crown, Medal, Plus, Trophy } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import { formatCommunityCount, type CommunityUser } from '@/lib/ogonek/explore-content'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { CommunityAvatar } from './community-avatar'

type Props = {
  users: CommunityUser[]
  onOpenUser: (id: string) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const RANK_ICON = [Crown, Medal, Trophy]

/**
 * ТОП ЛИДЕРОВ ПО СТРИКАМ.
 * Рейтинг самых длинных серий дней во всём сообществе. Кнопка подписки
 * реально меняет `exploreFollowingIds` в сторе; «Ты» отмечен короной.
 */
export function StreakLeaders({ users, onOpenUser, onNotify, soundEnabled = true }: Props) {
  const { state, toggleExploreFollow } = useOgonekStore()
  const following = state.exploreFollowingIds ?? []

  return (
    <section className="xh-leaders" aria-labelledby="xh-leaders-title">
      <div className="xh-section__head">
        <h2 id="xh-leaders-title">
          <Trophy size={16} className="xh-section__icon xh-section__icon--gold" /> Топ лидеров по стрикам
        </h2>
        <span className="xh-section__badge">глобальный рейтинг</span>
      </div>

      <ol className="xh-leaders__list">
        {users.map((user, index) => {
          const RankIcon = RANK_ICON[index]
          const isFollowing = following.includes(user.id)
          return (
            <li
              key={user.id}
              className={`xh-leader ${index < 3 ? 'is-top' : ''} ${user.isMe ? 'is-me' : ''}`}
            >
              <span className={`xh-leader__rank rank-${index + 1}`} aria-label={`Место ${index + 1}`}>
                {RankIcon ? <RankIcon size={15} /> : index + 1}
              </span>

              <button
                type="button"
                className="xh-leader__person"
                onClick={() => onOpenUser(user.id)}
                aria-label={`Открыть ${user.name}`}
              >
                <CommunityAvatar user={user} size={40} ring={isFollowing} />
                <span className="xh-leader__text">
                  <b>
                    {user.name}
                    {user.isMe && <em className="xh-leader__me">это ты</em>}
                  </b>
                  <small>
                    @{user.username} · {user.city}
                  </small>
                </span>
              </button>

              <span className="xh-leader__streak">
                🔥 <b>{user.streak}</b>
                <small>{formatCommunityCount(user.followers)} читателей</small>
              </span>

              {user.isMe ? (
                <span className="xh-leader__self">твоя серия</span>
              ) : (
                <button
                  type="button"
                  className={`xh-follow ${isFollowing ? 'is-following' : ''}`}
                  onClick={() => {
                    const now = toggleExploreFollow(user.id)
                    playClick(soundEnabled)
                    onNotify(
                      now
                        ? `Ты читаешь @${user.username} ✓`
                        : `Отписка от @${user.username}`
                    )
                  }}
                  aria-pressed={isFollowing}
                >
                  {isFollowing ? 'Читаю' : <><Plus size={14} /> Читать</>}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
