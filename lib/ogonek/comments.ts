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
 * Разрешает реальный parentId при ответе на комментарий с плоской 2-уровневой вложенностью:
 *  - Уровень 1 (depth 0): корневой комментарий (parentId = null)
 *  - Уровень 2 (depth >= 1): все ответы (и ответы на ответы) крепятся под 1-й уровень (rootParentId),
 *    без 3-й «лесенки» вложенности.
 */
export function resolveReplyParentId(
  node: Pick<Comment, 'id' | 'parentId'>,
  depth: number,
  rootParentId?: string | null
): string {
  if (depth >= 1) {
    if (rootParentId) return rootParentId
    if (node.parentId) return node.parentId
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
 * Собирает плоский список комментариев в 2-уровневое дерево ответов (хронологически):
 *  - Уровень 1: корневые комментарии (parentId = null)
 *  - Уровень 2: все ответы (включая ответы на ответы) крепятся напрямую к корневому комментарию.
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

  // Любой комментарий с предком прикрепляется к корневому предку 1-го уровня (depth = 1).
  const getRootAncestorId = (id: string): string | null => {
    const chain: string[] = []
    let curr: string | null | undefined = parentMap.get(id)
    const seen = new Set<string>([id])
    while (curr && byId.has(curr) && !seen.has(curr)) {
      seen.add(curr)
      chain.unshift(curr) // chain[0] = корневой комментарий 1-го уровня
      curr = parentMap.get(curr)
    }
    return chain[0] ?? null
  }

  const roots: CommentNode[] = []
  for (const comment of sorted) {
    const node = byId.get(comment.id)!
    const rootAncestorId = getRootAncestorId(comment.id)
    if (rootAncestorId && byId.has(rootAncestorId) && rootAncestorId !== node.id) {
      byId.get(rootAncestorId)!.replies.push(node)
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
