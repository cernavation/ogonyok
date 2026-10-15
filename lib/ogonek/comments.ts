import type {
  Comment,
  CommentPersona,
  CommentsByTarget,
  Day,
} from './types'

/**
 * КОММЕНТАРИИ ПОДДЕРЖКИ
 * Плоский список комментариев (parentId) превращается в дерево ответов,
 * дополняется быстрыми шаблонами поддержки и «ролями» авторов.
 */

/** Узел дерева комментариев: комментарий + его ответы */
export type CommentNode = Comment & { replies: CommentNode[] }

/** Быстрый шаблон поддержки */
export type SupportTemplate = {
  id: string
  text: string
  emoji: string
  /** Для чего уместен шаблон: день, гордость или универсально */
  scope: 'day' | 'pride' | 'both'
}

/**
 * БЫСТРЫЕ ШАБЛОНЫ ПОДДЕРЖКИ
 * Один тап — и тёплые слова уже под записью.
 */
export const QUICK_SUPPORT_TEMPLATES: readonly SupportTemplate[] = [
  { id: 'proud', text: 'Горжусь тобой!', emoji: '🔥', scope: 'both' },
  { id: 'step', text: 'Мощный шаг!', emoji: '💪', scope: 'both' },
  { id: 'grow', text: 'Ты растёшь каждый день', emoji: '🌱', scope: 'both' },
  { id: 'remember', text: 'Запомни это чувство', emoji: '✨', scope: 'both' },
  { id: 'strength', text: 'Это требовало силы — и ты справился', emoji: '🏆', scope: 'pride' },
  { id: 'keep-going', text: 'Продолжай, у тебя получается', emoji: '🚀', scope: 'pride' },
  { id: 'focus', text: 'Вот она — настоящая работа над собой', emoji: '🎯', scope: 'pride' },
  { id: 'thank-day', text: 'Спасибо за этот день. Он важен.', emoji: '🙏', scope: 'day' },
  { id: 'warmth', text: 'Тёпло от этого дня', emoji: '🌞', scope: 'day' },
  { id: 'chapter', text: 'Это ещё одна глава твоей летописи', emoji: '📖', scope: 'day' },
]

/** Шаблоны, подходящие для конкретного контекста */
export function templatesForScope(scope: 'day' | 'pride'): SupportTemplate[] {
  return QUICK_SUPPORT_TEMPLATES.filter((t) => t.scope === 'both' || t.scope === scope)
}

/** Метаданные «роли» автора комментария */
export type PersonaMeta = {
  id: CommentPersona
  label: string
  author: string
  initials: string
  hint: string
}

export const SUPPORT_PERSONAS: Record<CommentPersona, PersonaMeta> = {
  me: {
    id: 'me',
    label: 'Ты',
    author: 'Alexei Cerna',
    initials: 'AC',
    hint: 'Записать от своего имени',
  },
  support: {
    id: 'support',
    label: 'Поддержка',
    author: 'Огонёк поддержки',
    initials: '✦',
    hint: 'Тёплый голос поддержки рядом',
  },
}

export const MAX_COMMENT_LENGTH = 600

/**
 * Собирает дерево ответов из плоского списка.
 * Корневые — те, у кого нет parentId (или родитель отсутствует).
 * Внутри каждого уровня — хронологический порядок (старые сверху).
 */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>()
  for (const c of comments) {
    nodes.set(c.id, { ...c, replies: [] })
  }

  const roots: CommentNode[] = []
  for (const c of comments) {
    const node = nodes.get(c.id)
    if (!node) continue
    const parent = c.parentId ? nodes.get(c.parentId) : undefined
    if (parent) {
      parent.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  const byTime = (a: CommentNode, b: CommentNode) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

  const sortRecursive = (list: CommentNode[]) => {
    list.sort(byTime)
    for (const node of list) sortRecursive(node.replies)
  }
  sortRecursive(roots)

  return roots
}

/** Общее количество комментариев в дереве (включая ответы) */
export function countComments(comments: Comment[]): number {
  return comments.length
}

/** Максимальная глубина дерева (для компактных подписей) */
export function maxCommentDepth(comments: Comment[]): number {
  const byParent = new Map<string | null, Comment[]>()
  for (const c of comments) {
    const key = c.parentId
    const list = byParent.get(key) ?? []
    list.push(c)
    byParent.set(key, list)
  }
  const walk = (parentId: string | null, depth: number): number => {
    const children = byParent.get(parentId) ?? []
    if (children.length === 0) return depth
    return Math.max(...children.map((c) => walk(c.id, depth + 1)))
  }
  return walk(null, 0)
}

const relativeFormatter =
  typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function'
    ? new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })
    : null

/** Человекочитаемое «сколько назад»: «только что», «5 минут назад», «вчера» */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'только что'

  const diffSec = Math.round((then - now.getTime()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 45) return 'только что'

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]

  for (const [unit, secs] of units) {
    if (abs >= secs) {
      const value = Math.round(diffSec / secs)
      if (relativeFormatter) return relativeFormatter.format(value, unit)
      return unit === 'minute' ? `${Math.abs(value)} мин назад` : `${Math.abs(value)} ${unit}`
    }
  }
  return 'только что'
}

/** Точная дата и время для подсказки */
export function formatCommentStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Цель комментариев для дня: "day:720" */
export function dayCommentTarget(dayId: number): string {
  return `day:${dayId}`
}

/** Цель комментариев для гордости: "day:720:pride:0" */
export function prideCommentTarget(dayId: number, index: number): string {
  return `day:${dayId}:pride:${index}`
}

/**
 * Демонстрационные комментарии для самого свежего дня.
 * Показывают дерево ответов, лайки и тёплую поддержку — чтобы блок не был пустым.
 */
export function buildDemoComments(day: Day): CommentsByTarget {
  const now = Date.now()
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString()

  const dayTarget = dayCommentTarget(day.id)
  const firstPrideTarget = prideCommentTarget(day.id, 0)

  const dayThread: Comment[] = [
    {
      id: `cm-demo-${day.id}-1`,
      parentId: null,
      author: SUPPORT_PERSONAS.support.author,
      initials: SUPPORT_PERSONAS.support.initials,
      text: 'Горжусь тобой! Каждый такой день — ступень, которую уже не отнять.',
      createdAt: minutesAgo(180),
      likes: 3,
      likedByMe: true,
      isMine: false,
      template: 'Горжусь тобой!',
      persona: 'support',
    },
    {
      id: `cm-demo-${day.id}-1-1`,
      parentId: `cm-demo-${day.id}-1`,
      author: SUPPORT_PERSONAS.me.author,
      initials: SUPPORT_PERSONAS.me.initials,
      text: 'Спасибо. Правда важно это услышать 💪',
      createdAt: minutesAgo(150),
      likes: 1,
      likedByMe: false,
      isMine: true,
      template: null,
      persona: 'me',
    },
    {
      id: `cm-demo-${day.id}-2`,
      parentId: null,
      author: 'Артём · друг',
      initials: 'АД',
      text: 'Мощный шаг! Видно, сколько за этим стоит.',
      createdAt: minutesAgo(95),
      likes: 2,
      likedByMe: false,
      isMine: false,
      template: 'Мощный шаг!',
      persona: 'support',
    },
  ]

  const prideThread: Comment[] = [
    {
      id: `cm-demo-${day.id}-p0-1`,
      parentId: null,
      author: SUPPORT_PERSONAS.support.author,
      initials: SUPPORT_PERSONAS.support.initials,
      text: 'Вот она — настоящая работа над собой. Не сдался — и победил.',
      createdAt: minutesAgo(70),
      likes: 4,
      likedByMe: false,
      isMine: false,
      template: 'Вот она — настоящая работа над собой',
      persona: 'support',
    },
  ]

  return {
    [dayTarget]: dayThread,
    [firstPrideTarget]: prideThread,
  }
}
