import type { Comment } from './types'

/** Максимальная длина одного комментария */
export const MAX_COMMENT_LENGTH = 600

export type CommentNode = Comment & { replies: CommentNode[] }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function dayCommentTarget(dayId: number): string {
  return `day:${dayId}`
}

export function prideCommentTarget(dayId: number, index: number): string {
  return `day:${dayId}:pride:${index}`
}

/**
 * Канонический target_key, привязанный к владельцу дня (чтобы День #1 у разных пользователей не конфликтовал в Supabase).
 */
export function scopedDayCommentTarget(dayId: number, postAuthorId?: string | null): string {
  if (postAuthorId && UUID_REGEX.test(postAuthorId)) {
    return `u:${postAuthorId}:day:${dayId}`
  }
  return dayCommentTarget(dayId)
}

export function scopedPrideCommentTarget(
  dayId: number,
  index: number,
  postAuthorId?: string | null
): string {
  if (postAuthorId && UUID_REGEX.test(postAuthorId)) {
    return `u:${postAuthorId}:day:${dayId}:pride:${index}`
  }
  return prideCommentTarget(dayId, index)
}

export function parsePostAuthorIdFromTarget(target?: string | null): string | null {
  if (!target || typeof target !== 'string') return null
  const match = target.match(
    /^u:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):/i
  )
  return match ? match[1] : null
}

export function legacyTargetFromScoped(target?: string | null): string | null {
  if (!target || typeof target !== 'string') return null
  const match = target.match(
    /^u:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:(.+)$/i
  )
  return match ? match[1] : null
}

export function extractDayNumberFromTarget(target?: string | null): string | null {
  if (!target || typeof target !== 'string') return null
  const match = target.match(/day:(\d+)/)
  return match ? match[1] : null
}

/** Проверяет, имеет ли viewerId право удалить комментарий (автор комментария ИЛИ владелец поста) */
export function canDeleteComment(
  comment: Pick<Comment, 'authorId' | 'isMine' | 'postAuthorId'>,
  viewerId?: string | null,
  postAuthorId?: string | null
): boolean {
  const effectivePostOwner = postAuthorId || comment.postAuthorId || null
  if (viewerId) {
    if (comment.authorId && viewerId === comment.authorId) return true
    if (effectivePostOwner && viewerId === effectivePostOwner) return true
    if (!comment.authorId && comment.isMine) return true
    return false
  }
  return Boolean(comment.isMine)
}

/** Фильтрует устаревшие демо-комментарии бота, если они остались в кэше */
export function filterRealComments(list: readonly Comment[]): Comment[] {
  return list.filter(
    (c) =>
      c &&
      c.persona !== 'support' &&
      !c.template &&
      c.author !== 'Priday поддержки' &&
      c.author !== 'Огонёк поддержки'
  )
}

/** Собирает плоский список комментариев в дерево ответов (хронологически) */
export function buildCommentTree(comments: readonly Comment[]): CommentNode[] {
  const clean = filterRealComments(comments)
  const byId = new Map<string, CommentNode>()
  const sorted = [...clean].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  for (const comment of sorted) {
    byId.set(comment.id, { ...comment, replies: [] })
  }

  const roots: CommentNode[] = []
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId) && node.parentId !== node.id) {
      byId.get(node.parentId)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

const MONTH_SHORT_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** Компактное время в стиле X: "сейчас" | "5м" | "2ч" | "14 мая" */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const created = new Date(iso).getTime()
  if (!Number.isFinite(created)) return 'сейчас'
  const diffSec = Math.max(0, Math.floor((now - created) / 1000))
  if (diffSec < 45) return 'сейчас'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}м`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}ч`
  const d = new Date(created)
  const day = d.getDate()
  const month = MONTH_SHORT_RU[d.getMonth()] ?? 'янв'
  return `${day} ${month}`
}

/** Полная дата для подсказки при наведении */
export function formatCommentStamp(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  try {
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
