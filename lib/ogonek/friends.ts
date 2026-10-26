/**
 * Круг друзей и соратников Огонька.
 *
 * Это демонстрационная социальная карта профиля: люди, с которыми
 * пользователь идёт по пути силы. Данные используются во вкладке «Друзья»
 * профиля, в менеджере друзей и в виджете активных друзей (правый рейл).
 * Хранятся отдельно от основного дневника (никаких фейковых записей в
 * летописи — только социальный граф).
 */

/** Онлайн-статус друга для кружочка присутствия */
export type FriendPresence = 'online' | 'away' | 'offline'

export type FriendProfile = {
  id: string
  name: string
  /** @username без ведущего символа @ */
  username: string
  initials: string
  /** CSS-градиент аватара-заглушки */
  avatarColor: string
  bio: string
  city: string
  /** Текущий стрик друга в днях */
  streak: number
  /** Сколько раз плечом к плечу держали огонь */
  together: number
  /** Общие знакомые / взаимные подписки */
  mutual: number
  verified: boolean
  /** Как давно был активен (человекочитаемо) */
  lastActive: string
  /** Онлайн-статус (кружок присутствия в виджете активных друзей) */
  presence: FriendPresence
}

export const FRIEND_PROFILES: FriendProfile[] = []

/** Динамический кэш загруженных реальных пользователей из Supabase */
const profileCache = new Map<string, FriendProfile>()

export function registerFriendProfile(friend: FriendProfile) {
  if (friend && friend.id) {
    profileCache.set(friend.id, friend)
    if (friend.username) {
      profileCache.set(friend.username, friend)
      profileCache.set(friend.username.toLowerCase(), friend)
    }
  }
}

/** Подписки по умолчанию — пустой список для чистого старта */
export const DEFAULT_FOLLOWING_IDS: string[] = []

/**
 * Друзья по умолчанию — пустой список (пока пользователь сам не подпишется).
 */
export const DEFAULT_FRIEND_IDS: string[] = []

export function getFriend(id: string): FriendProfile | undefined {
  if (!id) return undefined
  return profileCache.get(id) || profileCache.get(id.toLowerCase()) || FRIEND_PROFILES.find((friend) => friend.id === id || friend.username.toLowerCase() === id.toLowerCase())
}

/* ────────────────────────────────────────────────────────────────────────
   ОНЛАЙН-СТАТУС
   ──────────────────────────────────────────────────────────────────────── */

export const PRESENCE_META: Record<
  FriendPresence,
  { label: string; short: string; color: string }
> = {
  online: { label: 'в сети', short: 'онлайн', color: '#00ba7c' },
  away: { label: 'недавно был(а)', short: 'отошёл', color: '#f59e0b' },
  offline: { label: 'не в сети', short: 'офлайн', color: '#71767b' },
}

export function presenceMeta(presence: FriendPresence) {
  return PRESENCE_META[presence] ?? PRESENCE_META.offline
}

export function isFriendActive(presence: FriendPresence): boolean {
  return presence === 'online' || presence === 'away'
}

/** Индекс присутствия для сортировки: онлайн → отошёл → офлайн */
export function presenceRank(presence: FriendPresence): number {
  return presence === 'online' ? 0 : presence === 'away' ? 1 : 2
}

/* ────────────────────────────────────────────────────────────────────────
   ЗАЯВКИ В ДРУЗЬЯ
   ──────────────────────────────────────────────────────────────────────── */

export type FriendRequestDirection = 'incoming' | 'outgoing'

export type FriendRequest = {
  id: string
  /** id друга, от которого/которому пришла заявка */
  friendId: string
  direction: FriendRequestDirection
  /** Сопроводительное сообщение к заявке */
  message: string
  /** Сколько общих знакомых */
  mutual: number
  /** Человекочитаемая метка времени */
  atLabel: string
}

export const INCOMING_FRIEND_REQUESTS: FriendRequest[] = []

export const OUTGOING_FRIEND_REQUESTS: FriendRequest[] = []

export const DEFAULT_INCOMING_FRIEND_REQUEST_IDS: string[] = []

export const DEFAULT_OUTGOING_FRIEND_REQUEST_IDS: string[] = []

/** Мета входящей заявки по id друга (или undefined, если заявки нет) */
export function getIncomingRequestMeta(friendId: string): FriendRequest | undefined {
  return INCOMING_FRIEND_REQUESTS.find((r) => r.friendId === friendId)
}

/** Мета исходящей заявки по id друга (или undefined, если заявки нет) */
export function getOutgoingRequestMeta(friendId: string): FriendRequest | undefined {
  return OUTGOING_FRIEND_REQUESTS.find((r) => r.friendId === friendId)
}

/* ────────────────────────────────────────────────────────────────────────
   РЕКОМЕНДАЦИИ («Люди рядом»)
   ──────────────────────────────────────────────────────────────────────── */

export type FriendSuggestionSource = 'mutual' | 'city' | 'interest' | 'goal'

export type FriendSuggestion = {
  friendId: string
  /** Почему рекомендуем именно этого человека */
  reason: string
  /** Процент совпадения пути 0..100 */
  matchPercent: number
  source: FriendSuggestionSource
}

export const FRIEND_SUGGESTIONS: FriendSuggestion[] = []

export type FriendSuggestionFilter = {
  /** Уже друзья — не предлагать */
  friendIds?: string[]
  /** Уже подписан — не предлагать повторно */
  followingIds?: string[]
  /** Входящие/исходящие заявки — уже в работе */
  requestIds?: string[]
  /** Скрытые пользователем рекомендации */
  dismissedIds?: string[]
}

/** Живой список рекомендаций: фильтрует тех, кто уже друг/подписка/в заявках/скрыт */
export function getFriendSuggestions(filter: FriendSuggestionFilter = {}): FriendSuggestion[] {
  const exclude = new Set<string>([
    ...(filter.friendIds ?? []),
    ...(filter.followingIds ?? []),
    ...(filter.requestIds ?? []),
    ...(filter.dismissedIds ?? []),
  ])
  return FRIEND_SUGGESTIONS.filter((s) => !exclude.has(s.friendId)).sort(
    (a, b) => b.matchPercent - a.matchPercent
  )
}

/** Друзья, отсортированные по активности (онлайн впереди) — для виджета правого рейла */
export function getActiveFriends(friendIds: string[], limit = 6): FriendProfile[] {
  const friends = friendIds
    .map((id) => getFriend(id))
    .filter((f): f is FriendProfile => Boolean(f))
    .sort((a, b) => {
      const byPresence = presenceRank(a.presence) - presenceRank(b.presence)
      if (byPresence !== 0) return byPresence
      return b.streak - a.streak
    })
  return friends.slice(0, limit)
}
