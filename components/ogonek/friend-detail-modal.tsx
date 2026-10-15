'use client'

import {
  Check,
  MapPin,
  Send,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { useMemo } from 'react'
import { buildInviteUrl } from '@/lib/ogonek/profile-share'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  FRIEND_PROFILES,
  getFriend,
  presenceMeta,
} from '@/lib/ogonek/friends'
import { buildFriendSlides } from '@/lib/ogonek/stories'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ModalShell } from './modal-shell'

type Props = {
  friendId: string
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

/**
 * ЭТАП 11 — Карточка друга.
 * Открывается из менеджера друзей и виджета активных друзей: показывает
 * визитку, живой статус, свежие кадры сторис и действия (дружба, подписка,
 * приглашение). Все кнопки реально меняют состояние в сторе.
 */
export function FriendDetailModal({ friendId, onClose, onNotify, soundEnabled = true }: Props) {
  const {
    state,
    toggleFollow,
    addFriend,
    removeFriend,
    sendFriendRequest,
    cancelFriendRequest,
  } = useOgonekStore()

  const friend = getFriend(friendId)

  const friendIds = state.friendIds ?? []
  const followingIds = state.followingIds ?? []
  const outgoing = state.outgoingFriendRequests ?? []
  const incoming = state.incomingFriendRequests ?? []

  const slides = useMemo(() => {
    if (!friend) return []
    const index = Math.max(0, FRIEND_PROFILES.findIndex((f) => f.id === friend.id))
    return buildFriendSlides(friend, index)
  }, [friend])

  if (!friend) {
    return (
      <ModalShell title="Друг не найден" onClose={onClose}>
        <div className="friend-detail__empty">
          <p>Профиль недоступен — возможно, связь была удалена.</p>
          <button type="button" className="fm-btn fm-btn--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </ModalShell>
    )
  }

  const presence = presenceMeta(friend.presence)
  const isFriend = friendIds.includes(friend.id)
  const isFollowing = followingIds.includes(friend.id)
  const hasOutgoing = outgoing.includes(friend.id)
  const hasIncoming = incoming.includes(friend.id)

  const handleFollow = () => {
    playClick(soundEnabled)
    const nowFollowing = toggleFollow(friend.id)
    onNotify(
      nowFollowing ? `Ты подписался на @${friend.username} ✓` : `Ты отписался от @${friend.username}`
    )
  }

  const handleFriend = () => {
    playClick(soundEnabled)
    if (isFriend) {
      removeFriend(friend.id)
      onNotify(`@${friend.username} убран из друзей`)
      return
    }
    addFriend(friend.id)
    playSuccess(soundEnabled)
    onNotify(`@${friend.username} теперь в друзьях ✓`)
  }

  const handleRequest = () => {
    playClick(soundEnabled)
    if (hasIncoming) {
      addFriend(friend.id)
      playSuccess(soundEnabled)
      onNotify(`Заявка от @${friend.username} принята ✓`)
      return
    }
    if (hasOutgoing) {
      cancelFriendRequest(friend.id)
      onNotify(`Заявка для @${friend.username} отменена`)
      return
    }
    const sent = sendFriendRequest(friend.id)
    onNotify(
      sent ? `Заявка в друзья отправлена @${friend.username}` : 'Заявка уже отправлена ранее'
    )
  }

  const handleInvite = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(buildInviteUrl(friend.username))
      playSuccess(soundEnabled)
      onNotify(`Ссылка-приглашение для @${friend.username} скопирована`)
    } catch {
      onNotify('Не удалось скопировать приглашение')
    }
  }

  return (
    <ModalShell title={friend.name} onClose={onClose}>
      <div className="friend-detail">
        {/* ── Визитка ─────────────────────────────────────────────────── */}
        <div className="friend-detail__head">
          <span className="friend-avatar friend-avatar--lg" aria-hidden="true">
            <span
              className="friend-avatar__img"
              style={{ background: friend.avatarColor, textShadow: '0 1px 3px #000' }}
            >
              {friend.initials}
            </span>
            <span
              className="friend-avatar__dot"
              style={{ background: presence.color, borderColor: '#16181c' }}
              title={presence.label}
            />
          </span>
          <div className="friend-detail__identity">
            <p className="friend-detail__name">
              {friend.name}
              {friend.verified && (
                <span className="friend-verified" title="Верифицирован" aria-label="Верифицирован">
                  ✓
                </span>
              )}
            </p>
            <p className="friend-detail__handle">@{friend.username}</p>
            <p className="friend-detail__status">
              <span className="friend-dot" style={{ background: presence.color }} aria-hidden="true" />
              <span style={{ color: presence.color }}>{presence.label}</span>
              <span className="friend-detail__city">
                <MapPin size={13} /> {friend.city}
              </span>
            </p>
          </div>
        </div>

        <p className="friend-detail__bio">{friend.bio}</p>

        {/* ── Статистика пути ─────────────────────────────────────────── */}
        <div className="friend-detail__stats">
          <div className="friend-detail__stat">
            <span className="friend-detail__stat-value">🔥 {friend.streak}</span>
            <span className="friend-detail__stat-label">стрик</span>
          </div>
          <div className="friend-detail__stat">
            <span className="friend-detail__stat-value">🤝 {friend.together}</span>
            <span className="friend-detail__stat-label">дней вместе</span>
          </div>
          <div className="friend-detail__stat">
            <span className="friend-detail__stat-value">👥 {friend.mutual}</span>
            <span className="friend-detail__stat-label">общих</span>
          </div>
        </div>

        {/* ── Свежие сторис ───────────────────────────────────────────── */}
        <div className="friend-detail__stories">
          <h3 className="friend-detail__section">
            <Sparkles size={15} /> Свежая сторис · {friend.lastActive}
          </h3>
          <div className="friend-detail__story-row">
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="friend-story-card"
                style={{ background: `linear-gradient(150deg, ${slide.from}, ${slide.to})` }}
              >
                <div
                  className="friend-story-card__glow"
                  style={{ background: `radial-gradient(circle at 80% 0%, ${slide.accent}, transparent 62%)` }}
                  aria-hidden="true"
                />
                <div className="friend-story-card__body">
                  <span className="friend-story-card__emoji" aria-hidden="true">
                    {slide.emoji}
                  </span>
                  <span className="friend-story-card__kicker" style={{ color: slide.accent }}>
                    {slide.kicker}
                  </span>
                  <span className="friend-story-card__headline">{slide.headline}</span>
                  <span className="friend-story-card__detail">{slide.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Действия ────────────────────────────────────────────────── */}
        <div className="friend-detail__actions">
          <button
            type="button"
            className={`fm-btn ${isFriend ? 'fm-btn--ghost' : 'fm-btn--primary'}`}
            onClick={handleFriend}
          >
            {isFriend ? <UserMinus size={15} /> : <UserPlus size={15} />}
            {isFriend ? 'Убрать из друзей' : 'Добавить в друзья'}
          </button>

          <button
            type="button"
            className={`fm-btn ${isFollowing ? 'fm-btn--ghost' : 'fm-btn--soft'}`}
            onClick={handleFollow}
          >
            {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
            {isFollowing ? 'Вы подписаны' : 'Подписаться'}
          </button>

          <button
            type="button"
            className="fm-btn fm-btn--soft"
            onClick={handleRequest}
            disabled={isFriend}
          >
            {hasIncoming ? <Check size={15} /> : <UserPlus size={15} />}
            {isFriend
              ? 'Уже друзья'
              : hasIncoming
                ? 'Принять заявку'
                : hasOutgoing
                  ? 'Отменить заявку'
                  : 'Заявка в друзья'}
          </button>

          <button type="button" className="fm-btn fm-btn--ghost" onClick={handleInvite}>
            <Send size={15} /> Позвать
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
