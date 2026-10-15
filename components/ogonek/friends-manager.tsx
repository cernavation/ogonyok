'use client'

import {
  BellRing,
  Check,
  ChevronRight,
  Clock,
  RotateCcw,
  Search,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { buildInviteUrl } from '@/lib/ogonek/profile-share'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  type FriendProfile,
  getFriend,
  getFriendSuggestions,
  getIncomingRequestMeta,
  getOutgoingRequestMeta,
  presenceMeta,
  presenceRank,
} from '@/lib/ogonek/friends'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { FriendDetailModal } from './friend-detail-modal'

type Props = {
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

type FriendsTabId = 'friends' | 'following' | 'requests' | 'suggestions'

function firstName(name: string): string {
  return (name || '').split(/\s+/)[0] || name
}

function matches(friend: FriendProfile, query: string): boolean {
  if (!query) return true
  const q = query.trim().toLowerCase()
  return (
    friend.name.toLowerCase().includes(q) ||
    friend.username.toLowerCase().includes(q) ||
    friend.city.toLowerCase().includes(q)
  )
}

/* ── Аватар с кружочком онлайн-статуса ──────────────────────────────────── */
function FriendAvatar({ friend, size = 'md' }: { friend: FriendProfile; size?: 'md' | 'lg' }) {
  const presence = presenceMeta(friend.presence)
  return (
    <span className={`friend-avatar friend-avatar--${size}`} aria-hidden="true">
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
  )
}

/* ── Строка человека с аватаром и действиями ────────────────────────────── */
function PersonRow({
  friend,
  subtitle,
  onOpen,
  children,
}: {
  friend: FriendProfile
  subtitle: string
  onOpen: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fm-row">
      <button type="button" className="fm-row__main" onClick={onOpen} aria-label={`Открыть ${friend.name}`}>
        <FriendAvatar friend={friend} />
        <span className="fm-row__text">
          <span className="fm-row__name">
            {friend.name}
            {friend.verified && (
              <span className="friend-verified" title="Верифицирован" aria-label="Верифицирован">
                ✓
              </span>
            )}
          </span>
          <span className="fm-row__sub">{subtitle}</span>
        </span>
        <ChevronRight size={17} className="fm-row__chev" aria-hidden="true" />
      </button>
      <div className="fm-row__actions">{children}</div>
    </div>
  )
}

/**
 * ЭТАП 11 — Менеджер друзей.
 * Полноценный центр управления социальным кругом: взаимные друзья, подписки,
 * входящие/исходящие заявки и рекомендации. Каждая кнопка меняет состояние
 * стора (addFriend/removeFriend/toggleFollow/accept…/send…/dismiss…) и звучит.
 */
export function FriendsManager({ onNotify, soundEnabled = true }: Props) {
  const {
    state,
    toggleFollow,
    addFriend,
    removeFriend,
    acceptFriendRequest,
    declineFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    dismissSuggestion,
    restoreSuggestions,
  } = useOgonekStore()

  const [tab, setTab] = useState<FriendsTabId>('friends')
  const [query, setQuery] = useState('')
  const [openFriendId, setOpenFriendId] = useState<string | null>(null)

  const profile = state.profile
  const friendIds = state.friendIds ?? []
  const followingIds = state.followingIds ?? []
  const incoming = state.incomingFriendRequests ?? []
  const outgoing = state.outgoingFriendRequests ?? []
  const dismissed = state.dismissedSuggestions ?? []

  const friends = useMemo(
    () =>
      friendIds
        .map((id) => getFriend(id))
        .filter((f): f is FriendProfile => Boolean(f))
        .sort((a, b) => {
          const byPresence = presenceRank(a.presence) - presenceRank(b.presence)
          if (byPresence !== 0) return byPresence
          return b.streak - a.streak
        })
        .filter((f) => matches(f, query)),
    [friendIds, query]
  )

  const followingOnly = useMemo(
    () =>
      followingIds
        .filter((id) => !friendIds.includes(id))
        .map((id) => getFriend(id))
        .filter((f): f is FriendProfile => Boolean(f))
        .filter((f) => matches(f, query)),
    [followingIds, friendIds, query]
  )

  const incomingList = useMemo(
    () =>
      incoming
        .map((id) => getFriend(id))
        .filter((f): f is FriendProfile => Boolean(f))
        .filter((f) => matches(f, query)),
    [incoming, query]
  )

  const outgoingList = useMemo(
    () =>
      outgoing
        .map((id) => getFriend(id))
        .filter((f): f is FriendProfile => Boolean(f))
        .filter((f) => matches(f, query)),
    [outgoing, query]
  )

  const suggestions = useMemo(
    () =>
      getFriendSuggestions({
        friendIds,
        followingIds,
        requestIds: [...incoming, ...outgoing],
        dismissedIds: dismissed,
      })
        .map((s) => {
          const friend = getFriend(s.friendId)
          return friend ? { ...s, friend } : null
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .filter((s) => matches(s.friend, query)),
    [friendIds, followingIds, incoming, outgoing, dismissed, query]
  )

  const openFriend = (id: string) => {
    playClick(soundEnabled)
    setOpenFriendId(id)
  }

  const switchTab = (next: FriendsTabId) => {
    playClick(soundEnabled)
    setTab(next)
  }

  const handleInvite = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(buildInviteUrl(profile.username))
      playSuccess(soundEnabled)
      onNotify('Ссылка-приглашение скопирована — отправь её другу')
    } catch {
      onNotify('Не удалось скопировать приглашение')
    }
  }

  const handleFollow = (friend: FriendProfile) => {
    playClick(soundEnabled)
    const now = toggleFollow(friend.id)
    onNotify(now ? `Ты подписался на @${friend.username} ✓` : `Ты отписался от @${friend.username}`)
  }

  const handleAddFriend = (friend: FriendProfile) => {
    playClick(soundEnabled)
    addFriend(friend.id)
    playSuccess(soundEnabled)
    onNotify(`@${friend.username} теперь в друзьях ✓`)
  }

  const handleRemoveFriend = (friend: FriendProfile) => {
    playClick(soundEnabled)
    removeFriend(friend.id)
    onNotify(`@${friend.username} убран из друзей`)
  }

  const handleAccept = (friend: FriendProfile) => {
    playClick(soundEnabled)
    const ok = acceptFriendRequest(friend.id)
    if (ok) playSuccess(soundEnabled)
    onNotify(ok ? `Заявка от @${friend.username} принята ✓` : 'Заявка больше неактуальна')
  }

  const handleDecline = (friend: FriendProfile) => {
    playClick(soundEnabled)
    declineFriendRequest(friend.id)
    onNotify(`Заявка от @${friend.username} отклонена`)
  }

  const handleSendRequest = (friend: FriendProfile) => {
    playClick(soundEnabled)
    const sent = sendFriendRequest(friend.id)
    onNotify(sent ? `Заявка в друзья отправлена @${friend.username}` : 'Заявка уже отправлена')
  }

  const handleCancelRequest = (friend: FriendProfile) => {
    playClick(soundEnabled)
    cancelFriendRequest(friend.id)
    onNotify(`Заявка для @${friend.username} отменена`)
  }

  const handleDismiss = (friend: FriendProfile) => {
    playClick(soundEnabled)
    dismissSuggestion(friend.id)
    onNotify(`@${friend.username} скрыт из рекомендаций`)
  }

  const handleRestore = () => {
    playClick(soundEnabled)
    restoreSuggestions()
    onNotify('Скрытые рекомендации возвращены')
  }

  const TABS: { id: FriendsTabId; label: string; count: number }[] = [
    { id: 'friends', label: 'Друзья', count: friendIds.length },
    { id: 'following', label: 'Подписки', count: followingIds.length },
    { id: 'requests', label: 'Заявки', count: incoming.length + outgoing.length },
    { id: 'suggestions', label: 'Рекомендации', count: suggestions.length },
  ]

  const emptyState = (title: string, desc: string) => (
    <div className="fm-empty">
      <Sparkles size={22} className="text-[#ff8a50]" aria-hidden="true" />
      <p className="fm-empty__title">{title}</p>
      <p className="fm-empty__desc">{desc}</p>
    </div>
  )

  return (
    <div className="friends-manager">
      {/* ── Шапка ─────────────────────────────────────────────────────── */}
      <div className="fm-head">
        <div className="fm-head__title">
          <h2>Круг соратников</h2>
          <p>
            {friendIds.length} друзей · {followingIds.length} подписок ·{' '}
            {incoming.length + outgoing.length} заявок
          </p>
        </div>
        <button type="button" className="fm-btn fm-btn--primary" onClick={handleInvite}>
          <UserPlus size={15} /> Пригласить
        </button>
      </div>

      {/* ── Табы ──────────────────────────────────────────────────────── */}
      <div className="fm-tabs" role="tablist" aria-label="Разделы друзей">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`fm-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
            <span className="fm-tab__count">{t.count}</span>
            {t.id === 'requests' && incoming.length > 0 && (
              <span className="fm-tab__ping" aria-label={`${incoming.length} новых заявок`}>
                {incoming.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Поиск ─────────────────────────────────────────────────────── */}
      <div className="fm-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени, @username или городу"
          aria-label="Поиск людей"
        />
        {query && (
          <button
            type="button"
            className="fm-search__clear"
            onClick={() => setQuery('')}
            aria-label="Очистить поиск"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Контент ───────────────────────────────────────────────────── */}
      <div className="fm-content" key={tab}>
        {tab === 'friends' && (
          <div className="fm-list">
            {friends.length === 0
              ? emptyState('Друзей пока нет', 'Прими заявку или добавь соратника из подписок.')
              : friends.map((friend) => (
                  <PersonRow
                    key={friend.id}
                    friend={friend}
                    subtitle={`@${friend.username} · 🔥 ${friend.streak} · ${presenceMeta(friend.presence).short}`}
                    onOpen={() => openFriend(friend.id)}
                  >
                    <button
                      type="button"
                      className="fm-icon-btn"
                      onClick={() => handleFollow(friend)}
                      title={followingIds.includes(friend.id) ? 'Отписаться' : 'Подписаться'}
                      aria-label={followingIds.includes(friend.id) ? 'Отписаться' : 'Подписаться'}
                    >
                      {followingIds.includes(friend.id) ? <UserCheck size={15} /> : <UserPlus size={15} />}
                    </button>
                    <button
                      type="button"
                      className="fm-icon-btn fm-icon-btn--danger"
                      onClick={() => handleRemoveFriend(friend)}
                      title="Убрать из друзей"
                      aria-label="Убрать из друзей"
                    >
                      <UserMinus size={15} />
                    </button>
                  </PersonRow>
                ))}
          </div>
        )}

        {tab === 'following' && (
          <div className="fm-list">
            {followingOnly.length === 0
              ? emptyState('Все подписки уже друзья', 'Новых подписок для добавления нет.')
              : followingOnly.map((friend) => (
                  <PersonRow
                    key={friend.id}
                    friend={friend}
                    subtitle={`@${friend.username} · подписка · 🔥 ${friend.streak}`}
                    onOpen={() => openFriend(friend.id)}
                  >
                    <button
                      type="button"
                      className="fm-btn fm-btn--mini fm-btn--primary"
                      onClick={() => handleAddFriend(friend)}
                    >
                      <UserPlus size={14} /> В друзья
                    </button>
                    <button
                      type="button"
                      className="fm-icon-btn"
                      onClick={() => handleFollow(friend)}
                      title="Отписаться"
                      aria-label="Отписаться"
                    >
                      <UserCheck size={15} />
                    </button>
                  </PersonRow>
                ))}
          </div>
        )}

        {tab === 'requests' && (
          <div className="fm-list">
            {incomingList.length > 0 && (
              <>
                <p className="fm-section-label">
                  <BellRing size={14} /> Входящие заявки
                </p>
                {incomingList.map((friend) => {
                  const meta = getIncomingRequestMeta(friend.id)
                  return (
                    <div key={friend.id} className="fm-request-card">
                      <button
                        type="button"
                        className="fm-row__main"
                        onClick={() => openFriend(friend.id)}
                        aria-label={`Открыть ${friend.name}`}
                      >
                        <FriendAvatar friend={friend} />
                        <span className="fm-row__text">
                          <span className="fm-row__name">
                            {friend.name}
                            {friend.verified && (
                              <span className="friend-verified" aria-label="Верифицирован">
                                ✓
                              </span>
                            )}
                          </span>
                          <span className="fm-row__sub">
                            @{friend.username} · {meta?.mutual ?? friend.mutual} общих ·{' '}
                            {meta?.atLabel ?? friend.lastActive}
                          </span>
                        </span>
                      </button>
                      {meta?.message && <p className="fm-request-card__msg">“{meta.message}”</p>}
                      <div className="fm-request-card__actions">
                        <button
                          type="button"
                          className="fm-btn fm-btn--mini fm-btn--primary"
                          onClick={() => handleAccept(friend)}
                        >
                          <Check size={14} /> Принять
                        </button>
                        <button
                          type="button"
                          className="fm-btn fm-btn--mini fm-btn--ghost"
                          onClick={() => handleDecline(friend)}
                        >
                          <X size={14} /> Отклонить
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {outgoingList.length > 0 && (
              <>
                <p className="fm-section-label">
                  <Clock size={14} /> Отправленные заявки
                </p>
                {outgoingList.map((friend) => {
                  const meta = getOutgoingRequestMeta(friend.id)
                  return (
                    <PersonRow
                      key={friend.id}
                      friend={friend}
                      subtitle={`@${friend.username} · ${meta?.atLabel ?? 'ждём ответа'}`}
                      onOpen={() => openFriend(friend.id)}
                    >
                      <button
                        type="button"
                        className="fm-btn fm-btn--mini fm-btn--ghost"
                        onClick={() => handleCancelRequest(friend)}
                      >
                        <X size={14} /> Отменить
                      </button>
                    </PersonRow>
                  )
                })}
              </>
            )}

            {incomingList.length === 0 &&
              outgoingList.length === 0 &&
              emptyState('Заявок нет', 'Новые запросы в друзья появятся здесь.')}
          </div>
        )}

        {tab === 'suggestions' && (
          <div className="fm-list">
            {dismissed.length > 0 && (
              <div className="fm-restore">
                <span>Скрыто рекомендаций: {dismissed.length}</span>
                <button type="button" className="fm-btn fm-btn--mini fm-btn--soft" onClick={handleRestore}>
                  <RotateCcw size={13} /> Вернуть
                </button>
              </div>
            )}
            {suggestions.length === 0
              ? emptyState(
                  'Рекомендаций пока нет',
                  dismissed.length > 0
                    ? 'Ты скрыл все рекомендации. Верни их кнопкой выше.'
                    : 'Как только появятся подходящие люди — они окажутся здесь.'
                )
              : suggestions.map(({ friend, reason, matchPercent }) => (
                  <div key={friend.id} className="fm-suggestion">
                    <button
                      type="button"
                      className="fm-row__main"
                      onClick={() => openFriend(friend.id)}
                      aria-label={`Открыть ${friend.name}`}
                    >
                      <FriendAvatar friend={friend} />
                      <span className="fm-row__text">
                        <span className="fm-row__name">
                          {friend.name}
                          {friend.verified && (
                            <span className="friend-verified" aria-label="Верифицирован">
                              ✓
                            </span>
                          )}
                          <span className="fm-match">{matchPercent}%</span>
                        </span>
                        <span className="fm-row__sub">
                          @{friend.username} · {friend.city}
                        </span>
                      </span>
                    </button>
                    <p className="fm-suggestion__reason">{reason}</p>
                    <div className="fm-row__actions">
                      <button
                        type="button"
                        className="fm-btn fm-btn--mini fm-btn--primary"
                        onClick={() => handleSendRequest(friend)}
                      >
                        <UserPlus size={14} /> Заявка
                      </button>
                      <button
                        type="button"
                        className="fm-btn fm-btn--mini fm-btn--soft"
                        onClick={() => handleFollow(friend)}
                      >
                        {followingIds.includes(friend.id) ? <UserCheck size={14} /> : <UserPlus size={14} />}
                        {followingIds.includes(friend.id) ? 'Подписан' : 'Подписаться'}
                      </button>
                      <button
                        type="button"
                        className="fm-icon-btn"
                        onClick={() => handleDismiss(friend)}
                        title="Скрыть рекомендацию"
                        aria-label="Скрыть рекомендацию"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        )}
      </div>

      {/* ── Карточка друга ─────────────────────────────────────────────── */}
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
    </div>
  )
}
