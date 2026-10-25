/**
 * ЭТАП 12 — ГЛОБАЛЬНЫЙ ХАБ ИССЛЕДОВАНИЯ (EXPLORE).
 *
 * Чистый модуль без DOM-зависимостей: описывает социальную карту всего
 * сообщества Огонька — людях со всего мира, их тегах-категориях, фото-ленте
 * достижений и лидеров по стрикам. Раздел «Поиск» использует эти данные,
 * чтобы стать живым хабом исследования соцсети, а не списком своих дней.
 *
 * Идентичности в круге друзей (`fr-*`) переиспользуются из `friends.ts`,
 * чтобы карточки людей в хабе и в профиле сходились. Глобальные участники
 * получают префикс `gu-*` и живут только в этом хабе.
 */



/* ────────────────────────────────────────────────────────────────────────
   КАТЕГОРИИ-ТЕГИ
   ──────────────────────────────────────────────────────────────────────── */

export type ExploreCategoryId = 'sport' | 'business' | 'education' | 'memernity' | 'health'

export type ExploreCategory = {
  id: ExploreCategoryId
  /** Хэштег категории, например «#Спорт» */
  tag: string
  label: string
  emoji: string
  /** Градиент плитки категории */
  from: string
  to: string
  /** Акцентный цвет текста/иконок */
  accent: string
  description: string
  /** Сколько людей выбрали категорию своим путём */
  memberCount: number
}

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  {
    id: 'sport',
    tag: '#Спорт',
    label: 'Спорт',
    emoji: '🏃',
    from: '#0a1420',
    to: '#123a5a',
    accent: '#66ffd9',
    description: 'Пробежки, зал, марафоны и дисциплина тела',
    memberCount: 0,
  },
  {
    id: 'business',
    tag: '#Бизнес',
    label: 'Бизнес',
    emoji: '💼',
    from: '#1a1405',
    to: '#6b5210',
    accent: '#ffd76a',
    description: 'Сделки, выручка, партнёрства и своё дело',
    memberCount: 0,
  },
  {
    id: 'education',
    tag: '#Учеба',
    label: 'Учеба',
    emoji: '📚',
    from: '#120a24',
    to: '#3d1a6b',
    accent: '#c4a6ff',
    description: 'Курсы, книги, языки и вечное обучение',
    memberCount: 0,
  },
  {
    id: 'memernity',
    tag: '#Memernity',
    label: 'Memernity',
    emoji: '✦',
    from: '#2a1206',
    to: '#7a2f0c',
    accent: '#ffa600',
    description: 'Осознанность, характер и память о преодолении',
    memberCount: 0,
  },
  {
    id: 'health',
    tag: '#Здоровье',
    label: 'Здоровье',
    emoji: '🌿',
    from: '#0a1a10',
    to: '#14532d',
    accent: '#4ade80',
    description: 'Сон, питание, восстановление и энергия',
    memberCount: 0,
  },
]

export const EXPLORE_CATEGORY_BY_ID: Record<ExploreCategoryId, ExploreCategory> = EXPLORE_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category
    return acc
  },
  {} as Record<ExploreCategoryId, ExploreCategory>
)

export function getExploreCategory(id: ExploreCategoryId): ExploreCategory {
  return EXPLORE_CATEGORY_BY_ID[id] ?? EXPLORE_CATEGORIES[0]
}

/* ────────────────────────────────────────────────────────────────────────
   ЛЮДИ СООБЩЕСТВА
   ──────────────────────────────────────────────────────────────────────── */

export type CommunityUser = {
  id: string
  name: string
  username: string
  initials: string
  avatarColor: string
  city: string
  country: string
  /** Текущий стрик в днях */
  streak: number
  verified: boolean
  bio: string
  categories: ExploreCategoryId[]
  followers: number
  achievements: number
  /** Человекочитаемая метка активности */
  activeLabel: string
  /** Насколько вырос стрик за сегодня (для бейджа «сегодня в мире») */
  todayDelta?: number
  /** Это — сам пользователь Огонька */
  isMe?: boolean
}

/**
 * В хабе исследования отображаются ТОЛЬКО реальные зарегистрированные пользователи
 * из базы Supabase. Любые хардкодные массивы людей ("Роман Гринёв", "Михаил Волошин",
 * "Анна Ковалёва", "Дмитрий Орлов" и др.) полностью вычищены.
 */
export const COMMUNITY_USERS: CommunityUser[] = []

export const COMMUNITY_USER_IDS: string[] = []

export function getCommunityUser(_id: string): CommunityUser | undefined {
  return undefined
}

/* ────────────────────────────────────────────────────────────────────────
   ФОТО-ЛЕНТА ДОСТИЖЕНИЙ СООБЩЕСТВА
   ──────────────────────────────────────────────────────────────────────── */

export type CommunityPost = {
  id: string
  authorId: string
  emoji: string
  kicker: string
  caption: string
  tags: string[]
  category: ExploreCategoryId
  likes: number
  comments: number
  dateLabel: string
  city: string
  /** Опубликовано сегодня — попадает в «Лучшее за сегодня в мире» */
  isToday: boolean
  verified: boolean
  from: string
  to: string
  accent: string
  /** Реальный фото-реф (id из IndexedDB / data URL); по умолчанию градиент */
  photo?: string | null
}

export const COMMUNITY_POSTS: CommunityPost[] = []

export const COMMUNITY_POST_IDS: string[] = []

export function getCommunityPost(id: string): CommunityPost | undefined {
  return COMMUNITY_POSTS.find((post) => post.id === id)
}

export function getPostsByAuthor(authorId: string, limit = 6): CommunityPost[] {
  return COMMUNITY_POSTS.filter((post) => post.authorId === authorId).slice(0, limit)
}

/* ────────────────────────────────────────────────────────────────────────
   ДОПОЛНИТЕЛЬНЫЕ ТЕГИ ДЛЯ ОБЛАКА ТРЕНДОВ И ПОИСКА
   ──────────────────────────────────────────────────────────────────────── */

export type ExploreTag = {
  tag: string
  count: number
  categoryId?: ExploreCategoryId
}

/** Вычищены вымышленные теги и счётчики */
export const EXPLORE_TRENDING_TAGS: ExploreTag[] = []

/** Все теги хаба: категории + дополнительные тренды */
export function getAllExploreTags(): ExploreTag[] {
  return [
    ...EXPLORE_CATEGORIES.map((c) => ({ tag: c.tag, count: c.memberCount, categoryId: c.id })),
    ...EXPLORE_TRENDING_TAGS,
  ]
}

/* ────────────────────────────────────────────────────────────────────────
   ПОИСК И ПОДБОРКИ
   ──────────────────────────────────────────────────────────────────────── */

/** Нормализует текст: нижний регистр, без «#», ё→е — для терпимого поиска */
export function normalizeExploreQuery(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[#@]/g, '')
    .trim()
}

function matches(haystack: string, query: string): boolean {
  return normalizeExploreQuery(haystack).includes(query)
}

export type ExploreSearchResults = {
  categories: ExploreCategory[]
  users: CommunityUser[]
  posts: CommunityPost[]
  tags: ExploreTag[]
  total: number
}

/** Живой поиск по всем людям, тегам, категориям и фото-достижениям */
export function searchExplore(rawQuery: string, limit = 10): ExploreSearchResults {
  const query = normalizeExploreQuery(rawQuery)
  if (!query) {
    return { categories: [], users: [], posts: [], tags: [], total: 0 }
  }

  const categories = EXPLORE_CATEGORIES.filter(
    (c) =>
      matches(c.label, query) ||
      matches(c.tag, query) ||
      matches(c.description, query) ||
      matches(c.id, query)
  )

  const tagPool = getAllExploreTags()
  const tags = tagPool
    .filter((t) => matches(t.tag, query))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  const users = COMMUNITY_USERS.filter((u) => {
    if (matches(u.name, query)) return true
    if (matches(u.username, query)) return true
    if (matches(u.city, query)) return true
    if (matches(u.country, query)) return true
    if (matches(u.bio, query)) return true
    return u.categories.some((id) => {
      const cat = EXPLORE_CATEGORY_BY_ID[id]
      return matches(cat.label, query) || matches(cat.tag, query)
    })
  })
    .sort((a, b) => b.streak - a.streak)
    .slice(0, limit)

  const posts = COMMUNITY_POSTS.filter((p) => {
    if (matches(p.caption, query)) return true
    if (matches(p.kicker, query)) return true
    if (matches(p.city, query)) return true
    if (p.tags.some((t) => matches(t, query))) return true
    const author = getCommunityUser(p.authorId)
    if (author && (matches(author.name, query) || matches(author.username, query))) return true
    const cat = EXPLORE_CATEGORY_BY_ID[p.category]
    return matches(cat.label, query) || matches(cat.tag, query)
  })
    .sort((a, b) => Number(b.isToday) - Number(a.isToday) || b.likes - a.likes)
    .slice(0, limit)

  return {
    categories,
    users,
    posts,
    tags,
    total: categories.length + users.length + posts.length + tags.length,
  }
}

/** Лучшее за сегодня в мире: свежие публикации дня по вовлечённости */
export function getTodayHighlights(limit = 5): CommunityPost[] {
  return COMMUNITY_POSTS.filter((p) => p.isToday)
    .sort((a, b) => b.likes + b.comments * 3 - (a.likes + a.comments * 3))
    .slice(0, limit)
}

/** Топ лидеров по стрикам среди всего сообщества */
export function getTopStreakLeaders(limit = 8): CommunityUser[] {
  return [...COMMUNITY_USERS].sort((a, b) => b.streak - a.streak).slice(0, limit)
}

export type CommunityFeedFilter = {
  categoryId?: ExploreCategoryId | null
  tag?: string | null
  query?: string
  limit?: number
}

/** Живая фото-лента достижений с фильтром по категории/тегу/поиску */
export function getCommunityFeed(filter: CommunityFeedFilter = {}): CommunityPost[] {
  const { categoryId, tag, query = '', limit } = filter
  const normTag = normalizeExploreQuery(tag ?? '')
  const normQuery = normalizeExploreQuery(query)

  const filtered = COMMUNITY_POSTS.filter((post) => {
    if (categoryId && post.category !== categoryId) return false
    if (normTag && !post.tags.some((t) => normalizeExploreQuery(t) === normTag)) return false
    if (normQuery) {
      const inCaption = matches(post.caption, normQuery)
      const inKicker = matches(post.kicker, normQuery)
      const inTags = post.tags.some((t) => matches(t, normQuery))
      const author = getCommunityUser(post.authorId)
      const inAuthor = author ? matches(author.name, normQuery) || matches(author.username, normQuery) : false
      if (!inCaption && !inKicker && !inTags && !inAuthor) return false
    }
    return true
  })

  const sorted = filtered.sort(
    (a, b) =>
      Number(b.isToday) - Number(a.isToday) ||
      b.likes + b.comments * 2 - (a.likes + a.comments * 2)
  )

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}

/** Сколько публикаций в категории (для бейджей) */
export function countPostsByCategory(categoryId: ExploreCategoryId): number {
  return COMMUNITY_POSTS.filter((post) => post.category === categoryId).length
}

/** Компактный формат числа: 12840 → «12,8K» */
export function formatCommunityCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value < 1000) return String(Math.round(value))
  if (value < 1_000_000) {
    const k = value / 1000
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace('.0', '')}K`
  }
  const m = value / 1_000_000
  return `${m.toFixed(1).replace('.0', '')}M`
}
