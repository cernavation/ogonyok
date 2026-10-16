'use client'

import { Check, Search, UserPlus, UserMinus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { COMMUNITY_USERS, getCommunityUser } from '@/lib/ogonek/explore-content'
import { getFriend } from '@/lib/ogonek/friends'
import { playClick } from '@/lib/ogonek/sound'
import { ModalShell } from './modal-shell'

export type ConnectionsMode = 'following' | 'followers'

type ConnectionPerson = {
  id: string
  name: string
  username: string
  initials: string
  avatarColor: string
  verified: boolean
  city: string
  streak: number
}

type Props = {
  initialMode: ConnectionsMode
  followingIds: string[]
  followerIds: string[]
  onToggleFollow: (id: string) => unknown
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled: boolean
}

/** Приводит любой id (друг `fr-*` или участник `gu-*`) к единому виду карточки. */
function resolvePerson(id: string): ConnectionPerson | null {
  const community = getCommunityUser(id)
  if (community) {
    return {
      id: community.id,
      name: community.name,
      username: community.username,
      initials: community.initials,
      avatarColor: community.avatarColor,
      verified: community.verified,
      city: community.city,
      streak: community.streak,
    }
  }
  const friend = getFriend(id)
  if (friend) {
    return {
      id: friend.id,
      name: friend.name,
      username: friend.username,
      initials: friend.initials,
      avatarColor: friend.avatarColor,
      verified: friend.verified,
      city: friend.city,
      streak: friend.streak,
    }
  }
  return null
}

/**
 * ЭТАП 20 — СПИСКИ «ПОДПИСКИ» И «ПОДПИСЧИКИ» ПРОФИЛЯ.
 * Открывается из счётчиков под именем. Позволяет реально подписаться или
 * отписаться прямо из модалки (пишет в стор через onToggleFollow) и
 * переключаться между двумя списками сегмент-контролом.
 */
export function ConnectionsModal({
  initialMode,
  followingIds,
  followerIds,
  onToggleFollow,
  onClose,
  onNotify,
  soundEnabled,
}: Props) {
  const [mode, setMode] = useState<ConnectionsMode>(initialMode)
  const [query, setQuery] = useState('')

  const following = useMemo(
    () => followingIds.map(resolvePerson).filter((p): p is ConnectionPerson => Boolean(p)),
    [followingIds]
  )

  // Подписчики: взаимные друзья + пара участников сообщества для наглядности
  const followers = useMemo(() => {
    const ids = followerIds.length > 0 ? followerIds : COMMUNITY_USERS.slice(0, 6).map((u) => u.id)
    return ids.map(resolvePerson).filter((p): p is ConnectionPerson => Boolean(p))
  }, [followerIds])

  const followingSet = useMemo(() => new Set(followingIds), [followingIds])

  const baseList = mode === 'following' ? following : followers
  const q = query.trim().toLowerCase()
  const list = q
    ? baseList.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q)
      )
    : baseList

  const handleToggle = (person: ConnectionPerson) => {
    playClick(soundEnabled)
    const nowFollowing = Boolean(onToggleFollow(person.id))
    onNotify(
      nowFollowing
        ? `Ты подписался на ${person.name}`
        : `Подписка на ${person.name} отменена`
    )
  }

  return (
    <ModalShell title="Сообщество силы" onClose={onClose}>
      <div className="connections-tabs" role="tablist" aria-label="Подписки и подписчики">
        {(['following', 'followers'] as ConnectionsMode[]).map((tab) => {
          const active = tab === mode
          const count = tab === 'following' ? following.length : followers.length
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              className={`connections-tab ${active ? 'is-active' : ''}`}
              onClick={() => {
                playClick(soundEnabled)
                setMode(tab)
              }}
            >
              {tab === 'following' ? 'Подписки' : 'Подписчики'}
              <span className="connections-tab__count">{count}</span>
            </button>
          )
        })}
      </div>

      <label className="connections-search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени, @username или городу"
          aria-label="Поиск человека"
        />
      </label>

      {list.length === 0 ? (
        <div className="connections-empty" role="status">
          <Users size={26} aria-hidden="true" />
          <p>
            {mode === 'following'
              ? 'Пока ни на кого не подписан. Найди людей в разделе «Поиск».'
              : 'Здесь появятся те, кто подписался на тебя.'}
          </p>
        </div>
      ) : (
        <ul className="connections-list" role="list">
          {list.map((person) => {
            const isFollowing = followingSet.has(person.id)
            return (
              <li key={person.id} className="connections-row">
                <span
                  className="connections-row__avatar"
                  style={{ background: person.avatarColor }}
                  aria-hidden="true"
                >
                  {person.initials}
                </span>
                <span className="connections-row__meta">
                  <span className="connections-row__name">
                    {person.name}
                    {person.verified && (
                      <span className="friend-verified" title="Верифицирован">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="connections-row__sub">
                    @{person.username} · {person.city} · 🔥 {person.streak}
                  </span>
                </span>
                <button
                  type="button"
                  className={`connections-follow ${isFollowing ? 'is-following' : ''}`}
                  onClick={() => handleToggle(person)}
                  aria-pressed={isFollowing}
                  aria-label={isFollowing ? `Отписаться от ${person.name}` : `Подписаться на ${person.name}`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus size={13} /> Читаю
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} /> Подписаться
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="connections-hint">
        <Check size={12} aria-hidden="true" /> Подписки влияют на ленту «Поиск» и новые сторис.
      </p>
    </ModalShell>
  )
}
