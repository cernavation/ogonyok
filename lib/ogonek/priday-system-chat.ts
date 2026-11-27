import type { ChatMessage, ChatThreadState, ChatThreads } from './types.ts'

export const PRIDAY_CHAT_ID = 'priday-official'
export const PRIDAY_WELCOME_MSG_ID = 'priday-welcome'

export const PRIDAY_THREAD_PEER_META = {
  name: 'Priday',
  username: 'priday.life',
  avatarColor: '#FF5C00',
  verified: true,
  initials: 'П',
} as const

export const PRIDAY_WELCOME_TEXT =
  'Привет! Это официальный чат Priday 🔥 Сюда будут прилетать важные новости, уведомления о новых подписчиках и друзьях, а ещё поздравления с твоими рекордами. Если есть вопросы - жми на кнопки ниже или просто пиши прямо сюда, сообщение улетит в поддержку.'

export type PridayQuickActionId = 'essence' | 'streak_eval' | 'add_friends' | 'support'

export interface PridayQuickAction {
  id: PridayQuickActionId
  label: string
  replyText: string
  isSupport?: boolean
}

export const PRIDAY_QUICK_ACTIONS: readonly PridayQuickAction[] = [
  {
    id: 'essence',
    label: 'В чём суть Priday?',
    replyText:
      'Priday - твой личный дневник силы в формате 5+5. Каждый вечер ты фиксируешь 5 поводов для гордости (от мелких побед до больших прорывов) и 5 благодарностей. Так мозг учится замечать прогресс и держать внутренний огонь даже в сложные дни.',
  },
  {
    id: 'streak_eval',
    label: 'Как работает стрик и оценка дня?',
    replyText:
      'Стрик растёт каждый раз, когда ты закрываешь день записями гордости и благодарности. Пропуск дня его не сжигает (если сам не включишь жёсткий режим в Настройках). А оценка дня помогает честно видеть динамику своей недели и месяца.',
  },
  {
    id: 'add_friends',
    label: 'Как добавить друзей?',
    replyText:
      'Залетай в "Поиск", находи человека по нику или имени и жми "Читать". Как только он подпишется в ответ - вы сразу станете друзьями: откроются общие группы, чаты без ограничений и личные записи для друзей.',
  },
  {
    id: 'support',
    label: 'Связаться с поддержкой',
    replyText:
      'Принято! Напиши свой вопрос или идею следующим сообщением прямо сюда - команда увидит его и ответит, как только разберёмся.',
    isSupport: true,
  },
] as const

export const PRIDAY_SUPPORT_CUSTOM_REPLY =
  'Принято! Сообщение сохранено и передано в поддержку Priday 🔥 Ответим здесь, как только разберёмся.'

/**
 * Рассчитывает натуральную задержку печатания ответа Priday (1.8-2.5 сек).
 */
export function computePridayTypingDelayMs(replyText: string): number {
  const len = (replyText || '').trim().length
  return Math.min(2500, Math.max(1800, Math.round(1700 + len * 3)))
}

export interface StreakMilestoneCelebration {
  days: number
  tier: 10 | 50 | 100
  title: string
  text: string
}

/**
 * Возвращает поздравление Priday для юбилейных дней, кратных 10, 50 или 100.
 */
export function buildStreakMilestoneCelebration(days: number): StreakMilestoneCelebration | null {
  const safeDays = Math.floor(Number(days))
  if (!Number.isFinite(safeDays) || safeDays < 10 || safeDays % 10 !== 0) {
    return null
  }
  if (safeDays % 100 === 0) {
    return {
      days: safeDays,
      tier: 100,
      title: `Юбилей · ${safeDays} дней 🔥`,
      text: `Легенда! ${safeDays} дней в Priday 🔥 Это уже не привычка, а твой характер.`,
    }
  }
  if (safeDays % 50 === 0) {
    return {
      days: safeDays,
      tier: 50,
      title: `Рубеж ${safeDays} дней 🔥`,
      text: `Мощный рубеж - ${safeDays} дней закрыто! Огонь держится уверенно.`,
    }
  }
  return {
    days: safeDays,
    tier: 10,
    title: `${safeDays} дней подряд 🔥`,
    text: `Круглая цифра: ${safeDays} дней подряд! Так держать.`,
  }
}

export function isPridayChat(threadId?: string | null): boolean {
  return threadId === PRIDAY_CHAT_ID
}

export function isDeletableChat(threadId?: string | null): boolean {
  return !isPridayChat(threadId)
}

export function matchPridayQuickAction(text: string): PridayQuickAction | null {
  const normalized = (text || '').trim().toLowerCase()
  if (!normalized) return null
  return PRIDAY_QUICK_ACTIONS.find((a) => a.label.toLowerCase() === normalized) || null
}

export function buildPridayWelcomeMessage(createdAtISO?: string): ChatMessage {
  return {
    id: PRIDAY_WELCOME_MSG_ID,
    dbId: null,
    authorId: PRIDAY_CHAT_ID,
    text: PRIDAY_WELCOME_TEXT,
    createdAtISO: createdAtISO || '2026-01-01T09:00:00.000Z',
    attachment: null,
    reactions: [],
    read: true,
    system: false,
    type: 'text',
    status: 'read',
    actorMeta: { kind: 'welcome' },
  }
}

export function buildPridayFollowText(username?: string | null, displayName?: string | null): string {
  const clean = (username || '').replace(/^@+/, '').trim()
  if (clean) return `@${clean} подписался на тебя`
  const fallback = (displayName || '').trim() || 'Новый участник'
  return `${fallback} подписался на тебя`
}

export function buildPridayMutualText(username?: string | null, displayName?: string | null): string {
  const clean = (username || '').replace(/^@+/, '').trim()
  const handle = clean ? `@${clean}` : (displayName || 'участником')
  return `Вы с ${handle} теперь друзья! Теперь вы можете писать друг другу и добавлять в группы`
}

export function mapPridayRecordToChatMessage(row: any): ChatMessage | null {
  if (!row || typeof row !== 'object') return null
  const isUserSender =
    row.sender === 'user' || row.type === 'priday_support_user'
  const meta =
    row.meta && typeof row.meta === 'object'
      ? row.meta
      : row.data && typeof row.data === 'object'
      ? row.data
      : {}

  const kind: NonNullable<ChatMessage['actorMeta']>['kind'] =
    row.kind ||
    (row.type === 'priday_follow'
      ? 'follow'
      : row.type === 'priday_mutual'
      ? 'mutual'
      : row.type === 'priday_milestone'
      ? 'milestone'
      : row.type === 'priday_support_user'
      ? 'support_user'
      : row.type === 'priday_support_reply'
      ? 'support_reply'
      : 'welcome')

  const rawBody = typeof row.body === 'string' && row.body.trim()
    ? row.body
    : typeof row.message === 'string'
    ? row.message
    : ''

  if (!rawBody) return null

  const milestoneDay =
    typeof meta.day_number === 'number'
      ? meta.day_number
      : typeof meta.milestoneDay === 'number'
        ? meta.milestoneDay
        : null
  const milestoneTier =
    meta.tier === 10 || meta.tier === 50 || meta.tier === 100
      ? meta.tier
      : null

  const normalizedBody = kind === 'welcome' ? PRIDAY_WELCOME_TEXT : rawBody

  return {
    id: String(row.client_id || `priday-${row.id || Date.now().toString(36)}`),
    dbId: row.id ? String(row.id) : null,
    authorId: isUserSender ? 'me' : PRIDAY_CHAT_ID,
    text: normalizedBody,
    createdAtISO: row.created_at || new Date().toISOString(),
    attachment: null,
    reactions: [],
    read: isUserSender ? true : Boolean(row.is_read),
    system: false,
    type: 'text',
    status: isUserSender || row.is_read ? 'read' : 'sent',
    actorMeta: {
      actorId: meta.actorId || meta.actor_id || null,
      actorUsername: meta.actorUsername || meta.actor_username || null,
      actorDisplayName: meta.actorDisplayName || meta.actor_display_name || null,
      milestoneDay,
      milestoneTier,
      kind,
    },
  }
}

export function ensurePridayThreadInThreads(
  threads: ChatThreads | undefined | null
): ChatThreads {
  const safe: ChatThreads = { ...(threads ?? {}) }
  const existing: ChatThreadState | undefined = safe[PRIDAY_CHAT_ID]

  if (!existing) {
    const welcome = buildPridayWelcomeMessage(new Date().toISOString())
    safe[PRIDAY_CHAT_ID] = {
      messages: [welcome],
      readAtISO: null,
      muted: false,
      pinned: false,
      draft: '',
      peerMeta: { ...PRIDAY_THREAD_PEER_META },
    }
    return safe
  }

  const rawMsgs = Array.isArray(existing.messages) ? existing.messages : []
  const msgs = rawMsgs.map((m) =>
    m && (m.id === PRIDAY_WELCOME_MSG_ID || m.actorMeta?.kind === 'welcome')
      ? { ...m, text: PRIDAY_WELCOME_TEXT }
      : m
  )
  const hasWelcome = msgs.some((m) => m.id === PRIDAY_WELCOME_MSG_ID || m.actorMeta?.kind === 'welcome')
  const nextMessages = hasWelcome
    ? msgs
    : [buildPridayWelcomeMessage(msgs[0]?.createdAtISO || new Date().toISOString()), ...msgs]

  safe[PRIDAY_CHAT_ID] = {
    ...existing,
    messages: nextMessages,
    peerMeta: { ...PRIDAY_THREAD_PEER_META },
  }
  return safe
}
