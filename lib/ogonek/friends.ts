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

export const FRIEND_PROFILES: FriendProfile[] = [
  {
    id: 'fr-voloshin',
    name: 'Михаил Волошин',
    username: 'voloshin',
    initials: 'МВ',
    avatarColor: 'linear-gradient(135deg, #1d9bf0 0%, #0a4d8c 100%)',
    bio: 'Гроссмейстер жизни. Играю партию длиной в 719 дней и не сдаюсь на 40-м ходу.',
    city: 'Кишинёв',
    streak: 512,
    together: 118,
    mutual: 24,
    verified: true,
    lastActive: '5 минут назад',
    presence: 'online',
  },
  {
    id: 'fr-sokolova',
    name: 'Мария Соколова',
    username: 'msokolova',
    initials: 'МС',
    avatarColor: 'linear-gradient(135deg, #f91880 0%, #7d1f4a 100%)',
    bio: 'Продукт-дизайнер и марафонец. Верю, что дисциплина — это форма любви к себе.',
    city: 'Берлин',
    streak: 438,
    together: 96,
    mutual: 31,
    verified: true,
    lastActive: '20 минут назад',
    presence: 'online',
  },
  {
    id: 'fr-orlov',
    name: 'Дмитрий Орлов',
    username: 'dorlov',
    initials: 'ДО',
    avatarColor: 'linear-gradient(135deg, #a855f7 0%, #5b21b6 100%)',
    bio: 'Основатель студии. Каждое утро — 90 минут глубокой работы до рассвета.',
    city: 'Варшава',
    streak: 366,
    together: 74,
    mutual: 12,
    verified: false,
    lastActive: '1 час назад',
    presence: 'away',
  },
  {
    id: 'fr-kovaleva',
    name: 'Анна Ковалёва',
    username: 'akovaleva',
    initials: 'АК',
    avatarColor: 'linear-gradient(135deg, #22c55e 0%, #0f5132 100%)',
    bio: 'Врач и триатлетка. Учусь благодарить тело за каждый километр.',
    city: 'Бухарест',
    streak: 297,
    together: 61,
    mutual: 8,
    verified: true,
    lastActive: '3 часа назад',
    presence: 'online',
  },
  {
    id: 'fr-petrov',
    name: 'Игорь Петров',
    username: 'ipetrov',
    initials: 'ИП',
    avatarColor: 'linear-gradient(135deg, #ff8a50 0%, #c2410c 100%)',
    bio: 'Инженер и отец двоих. Пишу по странице в день уже второй год.',
    city: 'Тбилиси',
    streak: 254,
    together: 45,
    mutual: 5,
    verified: false,
    lastActive: 'вчера',
    presence: 'offline',
  },
  {
    id: 'fr-safina',
    name: 'Елена Сафина',
    username: 'esafina',
    initials: 'ЕС',
    avatarColor: 'linear-gradient(135deg, #67e8f9 0%, #155e75 100%)',
    bio: 'Пианистка. 40 минут практики в день, даже когда зал пуст.',
    city: 'Прага',
    streak: 213,
    together: 33,
    mutual: 3,
    verified: false,
    lastActive: '2 дня назад',
    presence: 'away',
  },
  {
    id: 'fr-grinev',
    name: 'Роман Гринёв',
    username: 'rgrinev',
    initials: 'РГ',
    avatarColor: 'linear-gradient(135deg, #ffd76a 0%, #6b5210 100%)',
    bio: 'Предприниматель в edtech. Верю, что характер куётся в мелочах.',
    city: 'Лондон',
    streak: 188,
    together: 27,
    mutual: 17,
    verified: true,
    lastActive: '4 дня назад',
    presence: 'online',
  },
  {
    id: 'fr-belova',
    name: 'Ольга Белова',
    username: 'obelova',
    initials: 'ОБ',
    avatarColor: 'linear-gradient(135deg, #f472b6 0%, #9d174d 100%)',
    bio: 'Коуч и автор рассылки о маленьких шагах. Люблю утренние ритуалы.',
    city: 'Амстердам',
    streak: 142,
    together: 19,
    mutual: 9,
    verified: false,
    lastActive: 'неделю назад',
    presence: 'offline',
  },
  {
    id: 'fr-timofeev',
    name: 'Сергей Тимофеев',
    username: 'stimofeev',
    initials: 'СТ',
    avatarColor: 'linear-gradient(135deg, #536471 0%, #1f2429 100%)',
    bio: 'Аналитик и скалолаз. Считаю преодоление главной метрикой роста.',
    city: 'София',
    streak: 96,
    together: 11,
    mutual: 2,
    verified: false,
    lastActive: '2 недели назад',
    presence: 'offline',
  },
  {
    id: 'fr-lanskaya',
    name: 'Виктория Ланская',
    username: 'vlanskaya',
    initials: 'ВЛ',
    avatarColor: 'linear-gradient(135deg, #c4a6ff 0%, #3d1a6b 100%)',
    bio: 'Юрист и бегунья. Каждый старт — маленькая победа над собой.',
    city: 'Дубай',
    streak: 74,
    together: 7,
    mutual: 6,
    verified: false,
    lastActive: '3 недели назад',
    presence: 'away',
  },
]

/** Подписки по умолчанию — пустой список для чистого старта */
export const DEFAULT_FOLLOWING_IDS: string[] = []

/**
 * Друзья по умолчанию — пустой список (пока пользователь сам не подпишется).
 */
export const DEFAULT_FRIEND_IDS: string[] = []

export function getFriend(id: string): FriendProfile | undefined {
  return FRIEND_PROFILES.find((friend) => friend.id === id)
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

export const INCOMING_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'req-grinev',
    friendId: 'fr-grinev',
    direction: 'incoming',
    message: 'Видел твой марафон босиком. Хочу идти рядом — держать огонь вместе.',
    mutual: 17,
    atLabel: '2 часа назад',
  },
  {
    id: 'req-safina',
    friendId: 'fr-safina',
    direction: 'incoming',
    message: 'Твоя дисциплина вдохновляет. Прими в круг соратников?',
    mutual: 3,
    atLabel: 'вчера',
  },
]

export const OUTGOING_FRIEND_REQUESTS: FriendRequest[] = [
  {
    id: 'req-belova',
    friendId: 'fr-belova',
    direction: 'outgoing',
    message: 'Идём к целям месяца вместе — буду рад держать огонь рядом.',
    mutual: 9,
    atLabel: 'ждёт ответа с пятницы',
  },
]

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

export const FRIEND_SUGGESTIONS: FriendSuggestion[] = [
  {
    friendId: 'fr-petrov',
    reason: '17 общих соратников и похожий ритуал: страница в день',
    matchPercent: 92,
    source: 'interest',
  },
  {
    friendId: 'fr-timofeev',
    reason: 'Тоже считает преодоление главной метрикой роста',
    matchPercent: 84,
    source: 'interest',
  },
  {
    friendId: 'fr-lanskaya',
    reason: 'Бегает и держит серию — ритм совпадает с твоим',
    matchPercent: 79,
    source: 'goal',
  },
  {
    friendId: 'fr-belova',
    reason: 'Живёт в одном городе с вашими общими знакомыми',
    matchPercent: 73,
    source: 'city',
  },
  {
    friendId: 'fr-safina',
    reason: 'Практикует ежедневный ритуал без пропусков',
    matchPercent: 68,
    source: 'interest',
  },
]

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
