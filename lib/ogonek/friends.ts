/**
 * Круг друзей Priday.
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
  /** Ссылка на фото профиля */
  avatarUrl?: string | null
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
  /** ISO-время последней активности в Supabase (`profiles.last_seen_at`) */
  lastSeenAt?: string | null
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

/**
 * Проверить, является ли пользователь взаимным другом
 */
export function isMutualFriend(targetUserId: string, friendIds: string[] = []): boolean {
  if (!targetUserId) return false
  return friendIds.includes(targetUserId)
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

export type ResolvedUserStatus = {
  isOnline: boolean
  presence: FriendPresence
  label: string
  shortLabel: string
  color: string
}

const RU_SHORT_MONTHS = [
  'янв.',
  'февр.',
  'мар.',
  'апр.',
  'мая',
  'июн.',
  'июл.',
  'авг.',
  'сент.',
  'окт.',
  'нояб.',
  'дек.',
] as const

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * Честное форматирование онлайн-статуса пользователя по Realtime Presence + last_seen_at:
 * - онлайн прямо сейчас -> «в сети» (кратко «онлайн»), зелёный #00ba7c
 * - < 60 сек -> «был(а) только что»
 * - сегодня -> «был(а) в HH:MM»
 * - вчера -> «был(а) вчера в HH:MM»
 * - раньше -> «был(а) D MMM.» (например, «был(а) 24 нояб.»)
 */
export function formatLastSeenStatus(
  lastSeenAt?: string | null,
  isOnline = false,
  nowMs: number = Date.now()
): ResolvedUserStatus {
  if (isOnline) {
    return {
      isOnline: true,
      presence: 'online',
      label: 'в сети',
      shortLabel: 'онлайн',
      color: '#00ba7c',
    }
  }

  if (!lastSeenAt) {
    return {
      isOnline: false,
      presence: 'offline',
      label: 'не в сети',
      shortLabel: 'не в сети',
      color: '#71767b',
    }
  }

  const parsedMs = Date.parse(lastSeenAt)
  if (!Number.isFinite(parsedMs)) {
    return {
      isOnline: false,
      presence: 'offline',
      label: 'не в сети',
      shortLabel: 'не в сети',
      color: '#71767b',
    }
  }

  const diffMs = Math.max(0, nowMs - parsedMs)
  if (diffMs < 60_000) {
    return {
      isOnline: false,
      presence: 'offline',
      label: 'был(а) только что',
      shortLabel: 'был(а) только что',
      color: '#71767b',
    }
  }

  const seenDate = new Date(parsedMs)
  const nowDate = new Date(nowMs)
  const hhmm = `${pad2(seenDate.getHours())}:${pad2(seenDate.getMinutes())}`

  const isSameDay =
    seenDate.getFullYear() === nowDate.getFullYear() &&
    seenDate.getMonth() === nowDate.getMonth() &&
    seenDate.getDate() === nowDate.getDate()

  if (isSameDay) {
    const label = `был(а) в ${hhmm}`
    return {
      isOnline: false,
      presence: 'offline',
      label,
      shortLabel: label,
      color: '#71767b',
    }
  }

  const yesterday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 1)
  const isYesterday =
    seenDate.getFullYear() === yesterday.getFullYear() &&
    seenDate.getMonth() === yesterday.getMonth() &&
    seenDate.getDate() === yesterday.getDate()

  if (isYesterday) {
    const label = `был(а) вчера в ${hhmm}`
    return {
      isOnline: false,
      presence: 'offline',
      label,
      shortLabel: label,
      color: '#71767b',
    }
  }

  const monthLabel = RU_SHORT_MONTHS[seenDate.getMonth()] ?? 'янв.'
  const label = `был(а) ${seenDate.getDate()} ${monthLabel}`
  return {
    isOnline: false,
    presence: 'offline',
    label,
    shortLabel: label,
    color: '#71767b',
  }
}

/**
 * Сортировка друзей для виджета:
 * 1) Кто сейчас онлайн в Presence
 * 2) Самый свежий last_seen_at
 * 3) Максимальный стрик
 */
export function sortFriendsForWidget<
  T extends { id: string; streak?: number; lastSeenAt?: string | null; name?: string }
>(
  friends: readonly T[],
  onlineIds: ReadonlySet<string>,
  lastSeenOverrides?: ReadonlyMap<string, string>,
  limit = 3
): T[] {
  return [...friends]
    .sort((a, b) => {
      const aOnline = onlineIds.has(a.id) ? 0 : 1
      const bOnline = onlineIds.has(b.id) ? 0 : 1
      if (aOnline !== bOnline) return aOnline - bOnline

      const aRawSeen = lastSeenOverrides?.get(a.id) ?? a.lastSeenAt ?? ''
      const bRawSeen = lastSeenOverrides?.get(b.id) ?? b.lastSeenAt ?? ''
      const aSeenMs = aRawSeen ? Date.parse(aRawSeen) : 0
      const bSeenMs = bRawSeen ? Date.parse(bRawSeen) : 0
      const safeA = Number.isFinite(aSeenMs) ? aSeenMs : 0
      const safeB = Number.isFinite(bSeenMs) ? bSeenMs : 0
      if (safeA !== safeB) return safeB - safeA

      const byStreak = (b.streak ?? 0) - (a.streak ?? 0)
      if (byStreak !== 0) return byStreak

      return (a.name || '').localeCompare(b.name || '', 'ru')
    })
    .slice(0, limit)
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

/** Корректное русское склонение слова «друг»: 1 друг, 2-4 друга, 0 / 5+ друзей */
export function pluralizeFriends(count: number): string {
  const abs = Math.max(0, Math.floor(Math.abs(count)))
  const mod100 = abs % 100
  const mod10 = abs % 10
  if (mod100 >= 11 && mod100 <= 14) return `${abs} друзей`
  if (mod10 === 1) return `${abs} друг`
  if (mod10 >= 2 && mod10 <= 4) return `${abs} друга`
  return `${abs} друзей`
}
