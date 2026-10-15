'use client'

import {
  Award,
  Flame,
  MapPin,
  Send,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import { buildInviteUrl } from '@/lib/ogonek/profile-share'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getFriend } from '@/lib/ogonek/friends'
import {
  EXPLORE_CATEGORY_BY_ID,
  formatCommunityCount,
  getCommunityUser,
  getPostsByAuthor,
  type ExploreCategoryId,
} from '@/lib/ogonek/explore-content'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ModalShell } from '../modal-shell'
import { CommunityAvatar } from './community-avatar'

type Props = {
  userId: string
  onClose: () => void
  onNotify: (message: string) => void
  onOpenPost: (postId: string) => void
  onOpenCategory?: (id: ExploreCategoryId) => void
  soundEnabled?: boolean
}

/**
 * КАРТОЧКА УЧАСТНИКА СООБЩЕСТВА.
 * Открывается из поиска, лидеров, ленты и лайтбоксов. Показывает визитку,
 * интересы, свежие достижения и живые действия: чтение, дружба, подписка,
 * приглашение. Все кнопки меняют состояние в сторе.
 */
export function CommunityUserModal({
  userId,
  onClose,
  onNotify,
  onOpenPost,
  onOpenCategory,
  soundEnabled = true,
}: Props) {
  const {
    state,
    toggleExploreFollow,
    toggleFollow,
    addFriend,
    removeFriend,
  } = useOgonekStore()

  const user = getCommunityUser(userId)
  const friend = useMemo(() => (userId ? getFriend(userId) : undefined), [userId])
  const posts = useMemo(
    () => (userId ? getPostsByAuthor(userId, 6) : []),
    [userId]
  )

  const following = state.exploreFollowingIds ?? []
  const friendIds = state.friendIds ?? []
  const subscribedIds = state.followingIds ?? []

  if (!user) {
    return (
      <ModalShell title="Участник не найден" onClose={onClose}>
        <div className="xh-user__empty">
          <p>Профиль недоступен — возможно, он больше не в сообществе.</p>
          <button type="button" className="xh-btn xh-btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </ModalShell>
    )
  }

  const isReading = following.includes(user.id)
  const isFriend = friendIds.includes(user.id)
  const isSubscribed = subscribedIds.includes(user.id)

  const handleRead = () => {
    playClick(soundEnabled)
    const now = toggleExploreFollow(user.id)
    onNotify(now ? `Ты читаешь @${user.username} ✓` : `Отписка от @${user.username}`)
  }

  const handleFriend = () => {
    if (!friend) return
    playClick(soundEnabled)
    if (isFriend) {
      removeFriend(user.id)
      onNotify(`@${user.username} убран из друзей`)
    } else {
      addFriend(user.id)
      playSuccess(soundEnabled)
      onNotify(`@${user.username} теперь в друзьях ✓`)
    }
  }

  const handleSubscribe = () => {
    if (!friend) return
    playClick(soundEnabled)
    const now = toggleFollow(user.id)
    onNotify(now ? `Ты подписался на @${user.username} ✓` : `Отписка от @${user.username}`)
  }

  const handleInvite = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(buildInviteUrl(user.username))
      playSuccess(soundEnabled)
      onNotify(`Ссылка-приглашение для @${user.username} скопирована`)
    } catch {
      onNotify('Не удалось скопировать приглашение')
    }
  }

  return (
    <ModalShell title={user.name} onClose={onClose}>
      <div className="xh-user">
        <div className="xh-user__head">
          <CommunityAvatar user={user} size={64} ring={isReading} />
          <div className="xh-user__identity">
            <p className="xh-user__name">
              {user.name}
              {user.isMe && <span className="xh-user__you">это ты</span>}
            </p>
            <p className="xh-user__handle">@{user.username}</p>
            <p className="xh-user__place">
              <MapPin size={13} /> {user.city}, {user.country} · {user.activeLabel}
            </p>
          </div>
        </div>

        <p className="xh-user__bio">{user.bio}</p>

        <div className="xh-user__stats">
          <div className="xh-user__stat">
            <span className="xh-user__stat-value">🔥 {user.streak}</span>
            <span className="xh-user__stat-label">дней подряд</span>
          </div>
          <div className="xh-user__stat">
            <span className="xh-user__stat-value">
              <Award size={16} /> {user.achievements}
            </span>
            <span className="xh-user__stat-label">достижений</span>
          </div>
          <div className="xh-user__stat">
            <span className="xh-user__stat-value">
              <Users size={16} /> {formatCommunityCount(user.followers)}
            </span>
            <span className="xh-user__stat-label">читателей</span>
          </div>
        </div>

        <div className="xh-user__interests">
          <span className="xh-user__section-title">Интересы</span>
          <div className="xh-user__cats">
            {user.categories.map((id) => {
              const cat = EXPLORE_CATEGORY_BY_ID[id]
              if (!cat) return null
              return (
                <button
                  key={id}
                  type="button"
                  className="xh-user__cat"
                  style={{ borderColor: `${cat.accent}55`, color: cat.accent }}
                  onClick={() => {
                    playClick(soundEnabled)
                    onOpenCategory?.(id)
                    onClose()
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {posts.length > 0 && (
          <div className="xh-user__posts">
            <span className="xh-user__section-title">
              <Sparkles size={13} /> Достижения
            </span>
            <div className="xh-user__post-row">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="xh-user__post"
                  style={{ background: `linear-gradient(150deg, ${post.from}, ${post.to})` }}
                  onClick={() => {
                    playClick(soundEnabled)
                    onOpenPost(post.id)
                  }}
                  aria-label={`Открыть достижение: ${post.kicker}`}
                >
                  <span className="xh-user__post-emoji" aria-hidden="true">
                    {post.emoji}
                  </span>
                  <span className="xh-user__post-kicker">{post.kicker}</span>
                  <span className="xh-user__post-likes">
                    <Flame size={11} /> {formatCommunityCount(post.likes)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="xh-user__actions">
          <button
            type="button"
            className={`xh-btn ${isReading ? 'xh-btn--ghost' : 'xh-btn--primary'}`}
            onClick={handleRead}
            disabled={user.isMe}
          >
            {isReading ? <UserCheck size={15} /> : <UserPlus size={15} />}
            {user.isMe ? 'Это ты' : isReading ? 'Ты читаешь' : 'Читать'}
          </button>

          {friend && (
            <button
              type="button"
              className={`xh-btn ${isFriend ? 'xh-btn--ghost' : 'xh-btn--soft'}`}
              onClick={handleFriend}
            >
              {isFriend ? <UserMinus size={15} /> : <UserPlus size={15} />}
              {isFriend ? 'Убрать из друзей' : 'Добавить в друзья'}
            </button>
          )}

          {friend && (
            <button
              type="button"
              className={`xh-btn ${isSubscribed ? 'xh-btn--ghost' : 'xh-btn--soft'}`}
              onClick={handleSubscribe}
            >
              <UserCheck size={15} />
              {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
            </button>
          )}

          <button type="button" className="xh-btn xh-btn--ghost" onClick={handleInvite}>
            <Send size={15} /> Позвать
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
