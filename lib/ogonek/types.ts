export type ViewId = 'home' | 'explore' | 'vault' | 'analytics' | 'settings' | 'profile' | 'intentions'

export type Mode = 'pride' | 'gratitude'

export type OvercomeLevel = 0 | 1 | 2 | 3

export type PrideEntry = {
  num: string
  text: string
  scale: number // 1..10
  overcome: OvercomeLevel // 0..3
}

export type GratitudeEntry = {
  num?: string
  text: string
  rating?: number // 1..10
}

export function getGratitudeText(g: string | GratitudeEntry): string {
  return typeof g === 'string' ? g : g.text
}

export function getGratitudeRating(g: string | GratitudeEntry): number {
  return typeof g === 'object' && typeof g.rating === 'number' ? g.rating : 10
}

export type DayStatus = 'normal' | 'missed'

export type Day = {
  id: number
  title: string
  tags: string[]
  prides: PrideEntry[]
  gratitudes: (string | GratitudeEntry)[]
  photos?: string[]
  dateISO?: string
  status?: DayStatus
}

/** Пользовательский смайлик/эмодзи, созданный в конструкторе реакций */
export type CustomEmoji = {
  id: string
  char: string
  label: string
  createdAt: string
}

/**
 * Реакции по целям.
 * Ключ цели (target): "day:12", "day:12:pride:0", "day:12:grat:2"
 * Значение: { [emojiId]: количество }
 */
export type ReactionCounts = Record<string, Record<string, number>>

/**
 * Какие реакции поставил сам пользователь.
 * Ключ цели (target) → список emojiId, которые пользователь включил.
 */
export type MyReactions = Record<string, string[]>

/**
 * Роль автора комментария поддержки:
 *  - 'me'      — сам пользователь (Alexei Cerna)
 *  - 'support' — внутренний поддерживающий голос («Огонёк поддержки»)
 */
export type CommentPersona = 'me' | 'support'

/**
 * Комментарий поддержки под днём или отдельной гордостью.
 * Хранится плоско (с parentId), а дерево ответов собирается на клиенте.
 */
export type Comment = {
  id: string
  /** Родительский комментарий для дерева ответов; null — корневой */
  parentId: string | null
  /** Имя автора: пользователь или «Огонёк поддержки» */
  author: string
  /** Инициалы/глиф для аватара */
  initials: string
  /** Текст поддержки */
  text: string
  /** ISO-время создания */
  createdAt: string
  /** Количество лайков на комментарии */
  likes: number
  /** Поставил ли лайк текущий пользователь */
  likedByMe: boolean
  /** Комментарий создан пользователем (его можно удалить) */
  isMine: boolean
  /** Быстрый шаблон, которым был создан комментарий (если был) */
  template?: string | null
  /** Роль автора */
  persona: CommentPersona
}

/**
 * Комментарии по целям.
 * Ключ цели (target): "day:12" | "day:12:pride:0"
 * Значение: плоский список комментариев (дерево через parentId).
 */
export type CommentsByTarget = Record<string, Comment[]>

export type ReactionTargetKind = 'day' | 'pride' | 'gratitude'

/** Платформы для ссылок на соцсети в профиле */
export type ProfileSocialPlatform =
  | 'website'
  | 'telegram'
  | 'instagram'
  | 'github'
  | 'youtube'
  | 'x'
  | 'linkedin'
  | 'custom'

/** Одна ссылка на соцсеть в шапке профиля */
export type ProfileSocialLink = {
  id: string
  platform: ProfileSocialPlatform
  label: string
  url: string
}

/**
 * Профиль пользователя Огонька.
 * Хранит публичную визитку: обложку (banner), аватар, имя, @username,
 * био, город, соцсети и главную цель месяца.
 */
export type OgonekProfile = {
  displayName: string
  /** @username без ведущего символа @ */
  username: string
  bio: string
  city: string
  website: string
  joinedLabel: string
  /** Аватар: id фото из IndexedDB, data URL или null (тогда инициалы) */
  avatarImage: string | null
  /** Акцентный цвет/градиент аватара-заглушки (CSS) */
  avatarColor: string
  /** Пользовательская обложка: id фото, data URL или null */
  bannerImage: string | null
  /** id пресета обложки (используется, когда bannerImage пуст) */
  bannerPreset: string
  socialLinks: ProfileSocialLink[]
  /** Главная цель месяца */
  monthlyGoal: string
  monthlyGoalUpdatedAtISO: string
  verified: boolean
}

export type EvidenceItem = {
  id: string
  date: string
  title: string
  description: string
  category?: string
  pinned?: boolean
}

export type ComposerPayload = {
  prides: string[]
  gratitudes: string[]
  photo: string | null
  ratings?: Record<number, { scale: number; overcome: OvercomeLevel }>
}

export type ComposerDraft = {
  prides: string[]
  gratitudes: string[]
  photo: string | null
  tab: Mode
  extra: boolean
  lastSavedISO: string
}

export type OgonekStoreState = {
  schemaVersion: number
  days: Day[]
  morningIntentions: Record<string, [string, string, string]>
  composerDraft: ComposerDraft | null
  evidenceItems: EvidenceItem[]
  evidenceFavorites: string[]
  soundEnabled: boolean
  pinEnabled: boolean
  isDemo: boolean
  /** Кастомные смайлики, созданные пользователем */
  customEmojis: CustomEmoji[]
  /** Живые реакции: target → emojiId → количество */
  dayReactions: ReactionCounts
  /** Какие реакции поставил сам пользователь: target → [emojiId] */
  myReactions: MyReactions
  /** Комментарии поддержки: target → плоский список (дерево через parentId) */
  comments: CommentsByTarget
  /** Публичный профиль пользователя (имя, обложка, аватар, соцсети, цель) */
  profile: OgonekProfile
}
