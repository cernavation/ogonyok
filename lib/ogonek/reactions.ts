import type {
  CustomEmoji,
  GratitudeEntry,
  ReactionTargetKind,
} from './types'

/**
 * ПАЛИТРА ВСТРОЕННЫХ РЕАКЦИЙ
 * Это базовый набор живых реакций под днями и записями.
 * Пользователь может дополнить его своими смайликами через конструктор.
 */
export const BUILTIN_EMOJIS: ReadonlyArray<Pick<CustomEmoji, 'id' | 'char' | 'label'>> = [
  { id: 'fire', char: '🔥', label: 'Огонь' },
  { id: 'heart', char: '❤️', label: 'Любовь' },
  { id: 'muscle', char: '💪', label: 'Сила' },
  { id: 'clap', char: '👏', label: 'Аплодисменты' },
  { id: 'rocket', char: '🚀', label: 'Ракета' },
  { id: 'tada', char: '🎉', label: 'Праздник' },
  { id: 'brain', char: '🧠', label: 'Ум' },
  { id: 'target', char: '🎯', label: 'В точку' },
  { id: 'sparkles', char: '✨', label: 'Искры' },
  { id: 'pray', char: '🙏', label: 'Благодарю' },
  { id: 'sun', char: '🌞', label: 'Тепло' },
  { id: 'leaf', char: '🌱', label: 'Рост' },
]

/** Быстрая палитра эмодзи для конструктора */
export const EMOJI_PALETTE: readonly string[] = [
  '🔥', '❤️', '💪', '👏', '🚀', '🎉', '🧠', '🎯', '✨', '🙏',
  '🌞', '🌱', '⚡', '🏆', '💡', '🦾', '💫', '🥇', '🌊', '🦋',
  '😎', '🤯', '🥹', '🤝', '☕', '🎵', '📈', '🛡️', '🧘', '🌙',
]

/** Стартовые кастомные смайлики, чтобы конструктор был наглядным */
export const DEFAULT_CUSTOM_EMOJIS: CustomEmoji[] = [
  { id: 'custom-iron-will', char: '🦾', label: 'Железная воля', createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'custom-growth', char: '🌿', label: 'Тихий рост', createdAt: '2025-01-01T00:00:00.000Z' },
]

const BUILTIN_IDS = new Set(BUILTIN_EMOJIS.map((e) => e.id))

export function isBuiltinEmoji(id: string): boolean {
  return BUILTIN_IDS.has(id)
}

/** ID цели реакции для дня: "day:12" */
export function dayTarget(dayId: number): string {
  return `day:${dayId}`
}

/** ID цели реакции для гордости: "day:12:pride:0" */
export function prideTarget(dayId: number, index: number): string {
  return `day:${dayId}:pride:${index}`
}

/** ID цели реакции для благодарности: "day:12:grat:2" */
export function gratitudeTarget(dayId: number, index: number): string {
  return `day:${dayId}:grat:${index}`
}

export function makeTarget(kind: ReactionTargetKind, dayId: number, index?: number): string {
  if (kind === 'day') return dayTarget(dayId)
  if (kind === 'pride') return prideTarget(dayId, index ?? 0)
  return gratitudeTarget(dayId, index ?? 0)
}

/** Найти кастомный смайлик по id среди пользовательских */
export function findCustomEmoji(customEmojis: CustomEmoji[], id: string): CustomEmoji | undefined {
  return customEmojis.find((e) => e.id === id)
}

/** Получить отображаемый глиф для любого emojiId (встроенный или кастомный) */
export function resolveEmojiChar(id: string, customEmojis: CustomEmoji[]): string {
  const builtin = BUILTIN_EMOJIS.find((e) => e.id === id)
  if (builtin) return builtin.char
  const custom = findCustomEmoji(customEmojis, id)
  return custom?.char ?? '✨'
}

/** Получить подпись для любого emojiId */
export function resolveEmojiLabel(id: string, customEmojis: CustomEmoji[]): string {
  const builtin = BUILTIN_EMOJIS.find((e) => e.id === id)
  if (builtin) return builtin.label
  const custom = findCustomEmoji(customEmojis, id)
  return custom?.label ?? 'Реакция'
}

/**
 * Приводит благодарность (строку) к объекту с оценкой.
 * Используется, когда пользователь впервые ставит оценку строке.
 */
export function withGratitudeRating(
  g: string | GratitudeEntry,
  rating: number
): GratitudeEntry {
  const clamped = Math.min(10, Math.max(1, Math.round(rating)))
  if (typeof g === 'string') {
    return { text: g, rating: clamped }
  }
  return { ...g, rating: clamped }
}

/** Процент «теплоты» реакции для визуальной подсветки (0..1) */
export function reactionHeat(count: number, max = 10): number {
  if (count <= 0) return 0
  return Math.min(1, count / max)
}
