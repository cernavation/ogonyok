'use client'

import { ChevronRight, UserPlus, Users } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import {
  type FriendProfile,
  getActiveFriends,
  getFriend,
  presenceMeta,
} from '@/lib/ogonek/friends'
import { buildFriendSlides } from '@/lib/ogonek/stories'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ViewId } from '@/lib/ogonek/types'
import { FriendDetailModal } from './friend-detail-modal'

type Props = {
  onNavigate: (view: ViewId) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

/**
 * ЭТАП 11 — Виджет активных друзей в правой боковой панели.
 * Показывает ближайших соратников с кружочком онлайн-статуса, свежей сторис
 * (мини-кадр) и переход в карточку друга. Заявки в друзья — отдельной кнопкой.
 */
export function ActiveFriendsWidget({ onNavigate, onNotify, soundEnabled = true }: Props) {
  const { state, toggleFollow, addFriend } = useOgonekStore()
  const [openFriendId, setOpenFriendId] = useState<string | null>(null)

  const friendIds = state.friendIds ?? []
  const viewedStoryIds = state.viewedStoryIds ?? []
  const followingIds = state.followingIds ?? []
  const incoming = state.incomingFriendRequests ?? []

  const active = useMemo(() => getActiveFriends(friendIds, 6), [friendIds])
  const onlineCount = active.filter((f) => f.presence === 'online').length

  const storyChip = (friend: FriendProfile) => {
    const index = Math.max(0, friendIds.indexOf(friend.id))
    const slide = buildFriendSlides(friend, index)[0]
    return slide
  }

  const openFriend = (id: string) => {
    playClick(soundEnabled)
    setOpenFriendId(id)
  }

  const handleQuickFriend = (friend: FriendProfile) => {
    playClick(soundEnabled)
    if (friendIds.includes(friend.id)) {
      toggleFollow(friend.id)
      onNotify(`Обновлена подписка на @${friend.username}`)
    } else {
      addFriend(friend.id)
      onNotify(`@${friend.username} добавлен в друзья ✓`)
    }
  }

  const goFriends = () => {
    playClick(soundEnabled)
    onNavigate('profile')
    onNotify('Открываю круг друзей в профиле')
  }

  return (
    <section className="af-widget" aria-labelledby="active-friends-title">
      <header className="af-widget__head">
        <h2 id="active-friends-title">
          <Users size={17} className="text-[#22c55e]" aria-hidden="true" />
          Активные друзья
        </h2>
        <span className="af-widget__badge">
          {onlineCount > 0 ? `${onlineCount} в сети` : `${active.length} друзей`}
        </span>
      </header>

      {active.length === 0 ? (
        <p className="af-widget__empty">
          Пока никого рядом. Добавь соратников — и здесь появится, кто сейчас держит огонь.
        </p>
      ) : (
        <ul className="af-list">
          {active.map((friend) => {
            const presence = presenceMeta(friend.presence)
            const slide = storyChip(friend)
            const viewed = viewedStoryIds.includes(friend.id)
            return (
              <li key={friend.id}>
                <button
                  type="button"
                  className="af-row"
                  onClick={() => openFriend(friend.id)}
                  aria-label={`Открыть ${friend.name}`}
                >
                  <span className="friend-avatar friend-avatar--sm" aria-hidden="true">
                    <span
                      className="friend-avatar__img"
                      style={{ background: friend.avatarColor, textShadow: '0 1px 2px #000' }}
                    >
                      {friend.initials}
                    </span>
                    <span
                      className="friend-avatar__dot"
                      style={{ background: presence.color, borderColor: '#16181c' }}
                      title={presence.label}
                    />
                  </span>

                  <span className="af-row__text">
                    <span className="af-row__name">
                      {friend.name.split(/\s+/)[0]}
                      {friend.verified && (
                        <span className="friend-verified" aria-label="Верифицирован">
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="af-row__sub" style={{ color: presence.color }}>
                      {presence.short} · 🔥 {friend.streak}
                    </span>
                  </span>

                  {/* Мини-кадр свежей сторис */}
                  <span
                    className={`af-story ${viewed ? 'is-viewed' : ''}`}
                    style={{ background: `linear-gradient(150deg, ${slide.from}, ${slide.to})` }}
                    title={viewed ? 'Сторис просмотрена' : 'Новая сторис'}
                    aria-hidden="true"
                  >
                    <span>{slide.emoji}</span>
                    {!viewed && <span className="af-story__dot" />}
                  </span>

                  <ChevronRight size={16} className="af-row__chev" aria-hidden="true" />
                </button>

                {incoming.includes(friend.id) && (
                  <span className="af-row__incoming">заявка в друзья</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="af-widget__actions">
        <button type="button" className="af-action" onClick={goFriends}>
          Все друзья →
        </button>
        {incoming.length > 0 && (
          <button
            type="button"
            className="af-action af-action--accent"
            onClick={goFriends}
          >
            <UserPlus size={13} /> Заявки: {incoming.length}
          </button>
        )}
      </div>

      <AnimatePresence>
        {openFriendId && (
          <FriendDetailModal
            friendId={openFriendId}
            onClose={() => setOpenFriendId(null)}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
