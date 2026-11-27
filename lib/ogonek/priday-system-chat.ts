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
  'Привет! Это официальный чат Priday 🔥\n\nЗдесь появляются важные новости, уведомления о новых подписчиках и друзьях, а ещё я помогу разобраться с любыми вопросами о приложении. Выбери тему ниже или просто напиши сюда — сообщение попадёт прямо в поддержку!'

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
      'Priday — это личный дневник силы и 5+5 фокус-практика 🔥\n\nКаждый день ты фиксируешь до 5 поводов для гордости (маленькие и большие победы с оценкой значимости) и до 5 благодарностей. Так мозг учится замечать прогресс и удерживать внутренний огонь даже в сложные дни.',
  },
  {
    id: 'streak_eval',
    label: 'Как работает стрик и оценка дня?',
    replyText:
      'Стрик (серия дней) растёт, когда ты закрываешь день записями гордости и благодарности — пропуск дня сжигает серию, если дедлайн не настроен в Настройках ⚡\n\nОценка дня складывается из количества твоих гордостей, их оценок и последовательности, помогая видеть динамику недели и месяца.',
  },
  {
    id: 'add_friends',
    label: 'Как добавить друзей?',
    replyText:
      'Зайди во вкладку «Поиск» и найди человека по имени или @нику, затем нажми «Читать» 🤝\n\nКак только пользователь подпишется на тебя в ответ — вы автоматически станете друзьями! После этого можно переписываться без ограничений, делиться закрытыми записями и добавлять друг друга в группы.',
  },
  {
    id: 'support',
    label: 'Связаться с поддержкой',
    replyText:
      'Обращение в поддержку Priday принято! 💬 Напиши детали вопроса следующим сообщением, если нужно — команда уже видит запрос и ответит в ближайшее время.',
    isSupport: true,
  },
] as const

export const PRIDAY_SUPPORT_CUSTOM_REPLY =
  'Спасибо! Сообщение сохранено и передано в поддержку Priday 🔥 Мы ответим в ближайшее время.'

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

  return {
    id: String(row.client_id || `priday-${row.id || Date.now().toString(36)}`),
    dbId: row.id ? String(row.id) : null,
    authorId: isUserSender ? 'me' : PRIDAY_CHAT_ID,
    text: rawBody,
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

  const msgs = Array.isArray(existing.messages) ? existing.messages : []
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
