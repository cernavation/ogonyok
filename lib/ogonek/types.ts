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

export type ReactionTargetKind = 'day' | 'pride' | 'gratitude'

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
}
