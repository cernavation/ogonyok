import type { Comment } from './types'

/** Максимальная длина одного комментария (синхронизировано с SQL comments_insert <= 2000) */
export const MAX_COMMENT_LENGTH = 2000

/** Быстрые эмодзи-реакции на комментарии */
export const COMMENT_QUICK_REACTIONS = ['🔥', '❤️', '😂', '👏', '💯', '😮'] as const

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

/**
 * Разрешает реальный parentId при ответе на комментарий с ограничением до 3 уровней глубины:
 *  - Уровень 1 (depth 0): корневой комментарий (parentId = null)
 *  - Уровень 2 (depth 1): ответ на корень
 *  - Уровень 3 (depth 2): ответ на уровень 2
 * При ответе на комментарий 3-го уровня ответ прикрепляется на 3-й уровень (к тому же родителю 2-го уровня).
 */
export function resolveReplyParentId(
  node: Pick<Comment, 'id' | 'parentId'>,
  depth: number
): string {
  if (depth >= 2 && node.parentId) {
    return node.parentId
  }
  return node.id
}

/** Считает общее число потомков в ветке комментария */
export function countThreadReplies(node: CommentNode): number {
  let count = 0
  for (const child of node.replies) {
    count += 1 + countThreadReplies(child)
  }
  return count
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

/**
 * Собирает плоский список комментариев в дерево ответов (хронологически),
 * строго ограничивая вложенность до 3 уровней (depth 0 -> depth 1 -> depth 2).
 */
export function buildCommentTree(comments: readonly Comment[]): CommentNode[] {
  const clean = filterRealComments(comments)
  const sorted = [...clean].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const byId = new Map<string, CommentNode>()
  const parentMap = new Map<string, string | null>()
  for (const comment of sorted) {
    byId.set(comment.id, { ...comment, replies: [] })
    parentMap.set(comment.id, comment.parentId ?? null)
  }

  // Находим уровень глубины каждого узла и, если цепочка глубже 2 (т.е. 4+ уровень),
  // подтягиваем узел к ближайшему предку уровня 2, чтобы он стал на 3-й уровень.
  const getDepthAndLevel2Ancestor = (id: string): { depth: number; level2ParentId: string | null } => {
    const chain: string[] = []
    let curr: string | null | undefined = parentMap.get(id)
    const seen = new Set<string>([id])
    while (curr && byId.has(curr) && !seen.has(curr)) {
      seen.add(curr)
      chain.unshift(curr) // от корня до непосредственного родителя
      curr = parentMap.get(curr)
    }
    // chain[0] = уровень 1 (depth 0), chain[1] = уровень 2 (depth 1)
    if (chain.length <= 2) {
      return { depth: chain.length, level2ParentId: chain[chain.length - 1] ?? null }
    }
    return { depth: 2, level2ParentId: chain[1] }
  }

  const roots: CommentNode[] = []
  for (const comment of sorted) {
    const node = byId.get(comment.id)!
    const { level2ParentId } = getDepthAndLevel2Ancestor(comment.id)
    if (level2ParentId && byId.has(level2ParentId) && level2ParentId !== node.id) {
      byId.get(level2ParentId)!.replies.push(node)
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
