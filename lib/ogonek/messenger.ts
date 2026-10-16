/**
 * ЭТАП 13 — ВСТРОЕННЫЙ МЕССЕНДЖЕР И БЫСТРЫЕ ЧАТЫ С ДРУЗЬЯМИ.
 *
 * Чистый модуль без DOM-зависимостей: собирает демо-переписки круга друзей,
 * описывает быстрые ответы, реакции и умеет превращать живые данные Огонька
 * (гордость дня, целый день, кадр сторис, верифицированную ачивку) в
 * компактную карточку-вложение для чата. Благодаря этому любую карточку
 * гордости или сторис можно переслать другу в один клик.
 *
 * Компоненты `messages-view.tsx` и `messenger/*` используют эти функции,
 * чтобы раздел «Чаты» был настоящим мессенджером, а не заглушкой.
 */

import { FRIEND_PROFILES, getFriend, type FriendProfile } from './friends.ts'
import { BUILTIN_EMOJIS } from './reactions.ts'
import { getStoryBackground } from './stories.ts'
import { getGratitudeText, type ChatAttachment, type ChatAttachmentKind, type ChatMessage, type ChatThreadState, type ChatThreads, type Day, type StorySlide, type VisibilityLevel } from './types.ts'
import { normalizeVisibility } from './visibility.ts'

/** Идентификатор автора-пользователя в переписке */
export const MY_CHAT_ID = 'me'

/** Сколько символов влезает в одно сообщение */
export const CHAT_MESSAGE_LIMIT = 1200

/* ────────────────────────────────────────────────────────────────────────
   Быстрые ответы и реакции
   ──────────────────────────────────────────────────────────────────────── */

/** Быстрые ответы под полем ввода — как в Telegram, но с огоньком */
export const QUICK_REPLIES: readonly string[] = [
  'Держим огонь 🔥',
  'Горжусь тобой! 💪',
  'Иду рядом 🤝',
  'Что нового на пути?',
  'Так держать! ⚡',
  'Обнимаю 🫂',
  'Увидимся на марафоне!',
]

export type ChatReactionMeta = { id: string; char: string; label: string }

/** Лёгкий набор реакций именно для чата (быстро, под рукой) */
const CHAT_REACTION_IDS = ['fire', 'heart', 'muscle', 'clap', 'rocket', 'tada', 'pray', 'sun', 'brain', 'target']

export const CHAT_REACTIONS: ChatReactionMeta[] = CHAT_REACTION_IDS.map((id) =>
  BUILTIN_EMOJIS.find((e) => e.id === id)
)
  .filter((e): e is (typeof BUILTIN_EMOJIS)[number] => Boolean(e))
  .map((e) => ({ id: e.id, char: e.char, label: e.label }))

/* ────────────────────────────────────────────────────────────────────────
   Время и форматирование
   ──────────────────────────────────────────────────────────────────────── */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Ключ дня в локальном формате YYYY-MM-DD */
export function chatDayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Время сообщения «14:32» */
export function formatChatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * Метка последнего сообщения в списке диалогов:
 * сегодня — «14:32», вчера — «вчера», иначе — «12 окт».
 */
export function formatThreadStamp(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const todayKey = chatDayKey(now.toISOString())
  const key = chatDayKey(iso)
  if (key === todayKey) return formatChatTime(iso)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === chatDayKey(yesterday.toISOString())) return 'вчера'

  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** Заголовок-разделитель дня в ленте сообщений */
export function formatChatDayLabel(iso: string, now: Date = new Date()): string {
  const key = chatDayKey(iso)
  if (!key) return ''
  const todayKey = chatDayKey(now.toISOString())
  if (key === todayKey) return 'Сегодня'

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === chatDayKey(yesterday.toISOString())) return 'Вчера'

  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

/** «5 минут назад», «2 ч назад» — для статуса «печатает» и подсказок */
export function formatChatAge(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 'только что'
  const diffMin = Math.max(0, Math.round((now.getTime() - t) / 60_000))
  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин назад`
  const hours = Math.round(diffMin / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.round(hours / 24)
  return `${days} дн назад`
}

/* ────────────────────────────────────────────────────────────────────────
   Работа с тредами
   ──────────────────────────────────────────────────────────────────────── */

export const EMPTY_THREAD: Omit<ChatThreadState, 'messages'> & { messages: ChatMessage[] } = {
  messages: [],
  readAtISO: null,
  muted: false,
  pinned: false,
  draft: '',
}

/** Пустой тред (чтобы не создавать дубликаты объекта) */
export function emptyThread(): ChatThreadState {
  return { ...EMPTY_THREAD, messages: [] }
}

export function threadOf(threads: ChatThreads, friendId: string): ChatThreadState {
  return threads[friendId] ?? emptyThread()
}

/** Последнее (по времени) сообщение треда */
export function lastMessage(thread: ChatThreadState | undefined): ChatMessage | null {
  const list = thread?.messages ?? []
  return list.length > 0 ? list[list.length - 1] : null
}

/** Сколько сообщений собеседника я ещё не прочитал */
export function unreadCount(thread: ChatThreadState | undefined): number {
  if (!thread) return 0
  const since = thread.readAtISO ? new Date(thread.readAtISO).getTime() : 0
  return thread.messages.filter(
    (m) => m.authorId !== MY_CHAT_ID && new Date(m.createdAtISO).getTime() > since
  ).length
}

/** Суммарное число непрочитанных по всем перепискам */
export function totalUnread(threads: ChatThreads): number {
  return Object.values(threads).reduce((sum, t) => sum + unreadCount(t), 0)
}

/** Время последней активности треда (для сортировки), 0 — пусто */
export function lastActivityMs(thread: ChatThreadState | undefined): number {
  const last = lastMessage(thread)
  return last ? new Date(last.createdAtISO).getTime() : 0
}

/**
 * Сортирует id друзей по живому диалогу: закреплённые сверху, затем по
 * времени последнего сообщения (свежие — вперёд).
 */
export function sortThreadIds(threads: ChatThreads, ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const pa = threads[a]?.pinned ? 1 : 0
    const pb = threads[b]?.pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    const ta = lastActivityMs(threads[a])
    const tb = lastActivityMs(threads[b])
    if (ta !== tb) return tb - ta
    return a.localeCompare(b)
  })
}

/** Заголовок треда для списка: имя друга + @username */
export function threadTitle(friend: FriendProfile): string {
  return friend.name
}

/* ────────────────────────────────────────────────────────────────────────
   Карточки-вложения: гордость, день, сторис, ачивка
   ──────────────────────────────────────────────────────────────────────── */

const PRIDE_THEMES: Array<{ from: string; to: string; accent: string; emoji: string }> = [
  { from: '#1a0f0a', to: '#5a2410', accent: '#ff8a3d', emoji: '💪' },
  { from: '#0a1420', to: '#123a5a', accent: '#66ffd9', emoji: '🔥' },
  { from: '#1a1405', to: '#6b5210', accent: '#ffd76a', emoji: '🏆' },
  { from: '#120a24', to: '#3d1a6b', accent: '#c4a6ff', emoji: '🎯' },
  { from: '#0a1a10', to: '#14532d', accent: '#4ade80', emoji: '🌱' },
  { from: '#240a17', to: '#6b1846', accent: '#f91880', emoji: '❤️' },
]

function themeFor(index: number) {
  return PRIDE_THEMES[((index % PRIDE_THEMES.length) + PRIDE_THEMES.length) % PRIDE_THEMES.length]
}

function dayLabelOf(day: Day): string {
  if (!day.dateISO) return `День #${day.id}`
  const d = new Date(day.dateISO)
  if (Number.isNaN(d.getTime())) return `День #${day.id}`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

/** Карточка конкретной гордости дня — её и пересылают другу */
export function buildPrideAttachment(day: Day, index: number): ChatAttachment {
  const pride = day.prides[index]
  const theme = themeFor(index)
  const text = (pride?.text ?? day.title ?? 'Гордость дня').trim()
  const scale = pride?.scale && pride.scale > 0 ? pride.scale : null

  return {
    kind: 'pride',
    title: text || 'Гордость дня',
    subtitle: `Гордость №${index + 1}${scale ? ` · ${scale}/10` : ''} · ${dayLabelOf(day)}`,
    emoji: theme.emoji,
    from: theme.from,
    to: theme.to,
    accent: theme.accent,
    dayId: day.id,
    prideIndex: index,
    author: null,
    photo: day.photos?.[0] ?? null,
    visibility: normalizeVisibility(pride?.visibility ?? day.visibility),
  }
}

/** Карточка всего дня летописи */
export function buildDayAttachment(day: Day): ChatAttachment {
  const theme = themeFor(day.id)
  const gratitudes = day.gratitudes.map(getGratitudeText).filter(Boolean)
  const summary =
    day.prides.map((p) => p.text).filter(Boolean).slice(0, 2).join(' · ') ||
    day.title ||
    'Запись дня'

  return {
    kind: 'day',
    title: day.title || 'Запись дня',
    subtitle: `День #${day.id} · ${day.prides.length} гордостей${
      gratitudes.length ? ` · ${gratitudes.length} благодарностей` : ''
    }`,
    emoji: '🔥',
    from: theme.from,
    to: theme.to,
    accent: theme.accent,
    dayId: day.id,
    prideIndex: null,
    author: null,
    photo: day.photos?.[0] ?? null,
    visibility: normalizeVisibility(day.visibility),
  }
}

/** Карточка кадра сторис (своей или друга) */
export function buildStoryAttachment(input: {
  storyId: string
  authorName: string
  username: string
  slide: StorySlide
  slideIndex?: number
  totalSlides?: number
  photo?: string | null
  visibility?: VisibilityLevel
}): ChatAttachment {
  const { slide } = input
  const index = input.slideIndex ?? 0
  const total = input.totalSlides ?? 1
  return {
    kind: 'story',
    title: slide.headline || slide.kicker || 'Сторис',
    subtitle: `Сторис ${index + 1}/${total} · @${input.username}`,
    emoji: slide.emoji || '✨',
    from: slide.from,
    to: slide.to,
    accent: slide.accent,
    dayId: null,
    prideIndex: null,
    storyId: input.storyId,
    author: input.authorName,
    photo: input.photo ?? slide.photo ?? null,
    visibility: normalizeVisibility(input.visibility),
  }
}

/** Карточка верифицированной ачивки профиля */
export function buildAchievementAttachment(input: {
  id: string
  title: string
  topic: string
  emoji: string
  from: string
  to: string
  accent: string
  visibility?: VisibilityLevel
}): ChatAttachment {
  return {
    kind: 'achievement',
    title: input.title,
    subtitle: input.topic,
    emoji: input.emoji,
    from: input.from,
    to: input.to,
    accent: input.accent,
    dayId: null,
    prideIndex: null,
    storyId: input.id,
    author: null,
    photo: null,
    visibility: normalizeVisibility(input.visibility),
  }
}

/** Короткая подпись типа вложения для превью в списке диалогов */
export function attachmentKindLabel(kind: ChatAttachment['kind']): string {
  switch (kind) {
    case 'pride':
      return 'Карточка гордости'
    case 'day':
      return 'Карточка дня'
    case 'story':
      return 'Сторис'
    case 'achievement':
      return 'Ачивка'
    default:
      return 'Вложение'
  }
}

/** Текстовая выжимка сообщения — для списка диалогов */
export function summarizeMessage(message: ChatMessage | null): string {
  if (!message) return 'Начни переписку — скажи, что ты рядом 🤝'
  const text = (message.text ?? '').trim()
  if (message.attachment) {
    const label = attachmentKindLabel(message.attachment.kind)
    return text ? `${text} · ${label}` : `${label}: ${message.attachment.title}`
  }
  return text || '…'
}

/** Уникальное действие вложения: сравнивать карточки в подборках */
export function attachmentKey(attachment: ChatAttachment): string {
  return [attachment.kind, attachment.storyId ?? '', attachment.dayId ?? '', attachment.prideIndex ?? '', attachment.title].join('::')
}

/* ────────────────────────────────────────────────────────────────────────
   Живой собеседник: автоответ друга
   ──────────────────────────────────────────────────────────────────────── */

const AUTO_REPLIES: string[] = [
  'Вот это огонь! Уважаю 🔥',
  'Прочитал — мурашки. Так держать!',
  'Сильно. Я тоже держу серию, идём рядом 🤝',
  'Спасибо, что делишься! Это заряжает.',
  'Красиво! Сохранил себе на память ✨',
  'Горжусь тобой. Правда.',
  'Договорились — держим огонь вместе!',
  'Обнял. До завтра на пути 💪',
]

const ATTACHMENT_REPLIES: string[] = [
  'Ого, какая карточка! Перечитаю на утреннем кофе ☕',
  'Сохранил — буду вспоминать, когда будет тяжело 🔥',
  'Это вдохновляет. Отвечу тем же сегодня 💪',
  'Красота! Отправил себе в заметки ✨',
]

function hashCode(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export type AutoReply = {
  text: string
  /** Эмодзи-реакция друга на последнее сообщение (id встроенного смайлика) */
  reactionId?: string
}

/**
 * Подбирает живую реплику друга на отправленное сообщение.
 * Детерминированно зависит от текста и друга — без «магии» и одинаковых фраз.
 */
export function pickAutoReply(
  friend: FriendProfile,
  userText: string,
  hasAttachment: boolean
): AutoReply {
  if (!hasAttachment && userText) {
    const low = userText.toLowerCase()
    if (/(привет|здорово|хай)/.test(low)) {
      return { text: `Привет! Рад тебя слышать, @${friend.username} на связи 😄` }
    }
    if (/(спасибо|благодар)/.test(low)) {
      return { text: 'Тебе спасибо — ты тоже часть моего пути 🙏', reactionId: 'pray' }
    }
    if (/\?/.test(userText)) {
      return { text: 'Хороший вопрос. Давай держаться вместе и разберёмся 🤝' }
    }
  }

  const pool = hasAttachment ? ATTACHMENT_REPLIES : AUTO_REPLIES
  const seed = hashCode(`${friend.id}:${userText}:${hasAttachment ? 'a' : 't'}`)
  const text = pool[seed % pool.length]
  const reactionId = hasAttachment ? 'fire' : CHAT_REACTION_IDS[seed % CHAT_REACTION_IDS.length]
  return { text, reactionId }
}

/* ────────────────────────────────────────────────────────────────────────
   Создание сообщений и демо-переписки
   ──────────────────────────────────────────────────────────────────────── */

let chatSeq = 0

/** Уникальный id сообщения чата */
export function makeChatMessageId(): string {
  chatSeq += 1
  return `msg-${Date.now().toString(36)}-${chatSeq.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/** Собирает сообщение с валидными полями */
export function makeChatMessage(input: {
  authorId: string
  text: string
  attachment?: ChatAttachment | null
  createdAtISO?: string
  read?: boolean
  system?: boolean
}): ChatMessage {
  return {
    id: makeChatMessageId(),
    authorId: input.authorId,
    text: (input.text ?? '').trim().slice(0, CHAT_MESSAGE_LIMIT),
    createdAtISO: input.createdAtISO ?? new Date().toISOString(),
    attachment: input.attachment ?? null,
    reactions: [],
    read: input.read ?? false,
    system: input.system ?? false,
  }
}

/** Минуты назад → ISO (для демо-переписок) */
function minutesAgo(minutes: number, now: Date): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString()
}

/**
 * Живые демо-переписки для первого запуска: несколько диалогов с разной
 * свежестью, непрочитанными сообщениями и пересланной карточкой сторис.
 */
export function buildDemoThreads(now: Date = new Date()): ChatThreads {
  const threads: ChatThreads = {}

  const voloshin = getFriend('fr-voloshin')
  if (voloshin) {
    const bg = getStoryBackground('bg-1')
    const storySlide: StorySlide = {
      id: 'fr-voloshin-city',
      emoji: '📍',
      kicker: voloshin.city.toUpperCase(),
      headline: 'в огне',
      detail: voloshin.bio,
      from: bg.from,
      to: bg.to,
      accent: bg.accent,
    }
    threads[voloshin.id] = {
      messages: [
        makeChatMessage({
          authorId: voloshin.id,
          text: 'Алексей, видел твой марафон босиком. Это легенда 🔥',
          createdAtISO: minutesAgo(58, now),
          read: true,
        }),
        makeChatMessage({
          authorId: MY_CHAT_ID,
          text: 'Спасибо, Миша! Твои 512 дней тоже вдохновляют',
          createdAtISO: minutesAgo(52, now),
          read: true,
        }),
        makeChatMessage({
          authorId: voloshin.id,
          text: 'Смотри, выложил кадр из Кишинёва — вспомнил наш забег',
          createdAtISO: minutesAgo(41, now),
          attachment: buildStoryAttachment({
            storyId: `story-${voloshin.id}`,
            authorName: voloshin.name,
            username: voloshin.username,
            slide: storySlide,
            slideIndex: 2,
            totalSlides: 3,
            visibility: 'friends',
          }),
          read: true,
        }),
        makeChatMessage({
          authorId: voloshin.id,
          text: 'Держим огонь? 🔥',
          createdAtISO: minutesAgo(6, now),
          read: false,
        }),
      ],
      readAtISO: minutesAgo(12, now),
      pinned: false,
      muted: false,
      draft: '',
    }
  }

  const sokolova = getFriend('fr-sokolova')
  if (sokolova) {
    threads[sokolova.id] = {
      messages: [
        makeChatMessage({
          authorId: MY_CHAT_ID,
          text: 'Мария, спасибо за разбор дизайна! Взял в работу',
          createdAtISO: minutesAgo(24, now),
          read: true,
        }),
        makeChatMessage({
          authorId: sokolova.id,
          text: 'Рада! Дисциплина — это форма любви к себе ❤️',
          createdAtISO: minutesAgo(18, now),
          read: false,
        }),
      ],
      readAtISO: minutesAgo(20, now),
      pinned: true,
      muted: false,
      draft: '',
    }
  }

  const kovaleva = getFriend('fr-kovaleva')
  if (kovaleva) {
    threads[kovaleva.id] = {
      messages: [
        makeChatMessage({
          authorId: kovaleva.id,
          text: 'Записалась на триатлон в Бухаресте! Спасибо за поддержку 🏊🚴🏃',
          createdAtISO: minutesAgo(210, now),
          read: true,
        }),
        makeChatMessage({
          authorId: MY_CHAT_ID,
          text: 'Аня, это огромный шаг. Горжусь!',
          createdAtISO: minutesAgo(200, now),
          read: true,
        }),
      ],
      readAtISO: minutesAgo(200, now),
      pinned: false,
      muted: false,
      draft: '',
    }
  }

  const orlov = getFriend('fr-orlov')
  if (orlov) {
    threads[orlov.id] = {
      messages: [
        makeChatMessage({
          authorId: MY_CHAT_ID,
          text: 'Дмитрий, как прошла утренняя 90-минутка?',
          createdAtISO: minutesAgo(1500, now),
          read: true,
        }),
        makeChatMessage({
          authorId: orlov.id,
          text: 'Отлично. Варшава встречала рассвет туманом — работалось глубоко.',
          createdAtISO: minutesAgo(1440, now),
          read: true,
        }),
      ],
      readAtISO: minutesAgo(1440, now),
      pinned: false,
      muted: false,
      draft: '',
    }
  }

  return threads
}

/* ────────────────────────────────────────────────────────────────────────
   Валидация переписок из хранилища
   ──────────────────────────────────────────────────────────────────────── */

const CHAT_ATTACHMENT_KINDS: ChatAttachmentKind[] = ['pride', 'day', 'story', 'achievement']

function sanitizeChatAttachment(value: unknown): ChatAttachment | null {
  if (!value || typeof value !== 'object') return null
  const a = value as Partial<ChatAttachment>
  const kind =
    typeof a.kind === 'string' && (CHAT_ATTACHMENT_KINDS as string[]).includes(a.kind)
      ? (a.kind as ChatAttachmentKind)
      : null
  if (!kind) return null

  return {
    kind,
    title: typeof a.title === 'string' && a.title.trim() ? a.title.trim().slice(0, 200) : 'Карточка',
    subtitle: typeof a.subtitle === 'string' ? a.subtitle.slice(0, 240) : '',
    emoji: typeof a.emoji === 'string' && a.emoji.trim() ? a.emoji.trim().slice(0, 8) : '✨',
    from: typeof a.from === 'string' && a.from ? a.from.slice(0, 40) : '#1a0f0a',
    to: typeof a.to === 'string' && a.to ? a.to.slice(0, 40) : '#5a2410',
    accent: typeof a.accent === 'string' && a.accent ? a.accent.slice(0, 40) : '#ff8a3d',
    dayId: typeof a.dayId === 'number' && Number.isFinite(a.dayId) ? a.dayId : null,
    prideIndex:
      typeof a.prideIndex === 'number' && Number.isFinite(a.prideIndex) ? a.prideIndex : null,
    storyId: typeof a.storyId === 'string' && a.storyId ? a.storyId.slice(0, 80) : null,
    author: typeof a.author === 'string' && a.author ? a.author.slice(0, 80) : null,
    photo: typeof a.photo === 'string' && a.photo ? a.photo.slice(0, 2000) : null,
    visibility: normalizeVisibility(a.visibility),
  }
}

function sanitizeChatMessages(value: unknown, validFriendIds: Set<string>): ChatMessage[] {
  if (!Array.isArray(value)) return []
  const result: ChatMessage[] = []
  const seen = new Set<string>()

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const m = raw as Partial<ChatMessage>
    const text = typeof m.text === 'string' ? m.text.trim().slice(0, CHAT_MESSAGE_LIMIT) : ''
    const attachment = sanitizeChatAttachment(m.attachment)
    if (!text && !attachment) continue

    const id = typeof m.id === 'string' && m.id ? m.id.slice(0, 80) : `msg-${result.length}`
    if (seen.has(id)) continue
    seen.add(id)

    const rawAuthor = typeof m.authorId === 'string' ? m.authorId : ''
    const authorId =
      rawAuthor === MY_CHAT_ID || validFriendIds.has(rawAuthor) ? rawAuthor : MY_CHAT_ID

    const reactions = Array.isArray(m.reactions)
      ? m.reactions
          .filter((r): r is NonNullable<typeof r> => !!r && typeof r === 'object')
          .map((r) => {
            const by =
              typeof r.by === 'string' && (r.by === MY_CHAT_ID || validFriendIds.has(r.by))
                ? r.by
                : MY_CHAT_ID
            return { emojiId: typeof r.emojiId === 'string' ? r.emojiId.slice(0, 40) : '', by }
          })
          .filter((r) => r.emojiId)
      : []

    result.push({
      id,
      authorId,
      text,
      createdAtISO:
        typeof m.createdAtISO === 'string' && m.createdAtISO ? m.createdAtISO : new Date().toISOString(),
      attachment,
      reactions,
      read: Boolean(m.read),
      system: Boolean(m.system),
    })
  }

  return result
}

/**
 * Валидирует переписки из локального хранилища. Отбрасывает «мёртвых»
 * собеседников (нет в социальной карте), пустые сообщения и битые вложения.
 * Позволяет намеренно начатый (ещё пустой) диалог — тред сохраняется.
 */
export function sanitizeChatThreads(value: unknown, fallback: ChatThreads = {}): ChatThreads {
  if (!value || typeof value !== 'object') return fallback

  const validFriendIds = new Set(FRIEND_PROFILES.map((f) => f.id))
  const result: ChatThreads = {}

  for (const [friendId, rawThread] of Object.entries(value as Record<string, unknown>)) {
    if (!validFriendIds.has(friendId)) continue
    if (!rawThread || typeof rawThread !== 'object') continue
    const t = rawThread as Partial<ChatThreadState>

    result[friendId] = {
      messages: sanitizeChatMessages(t.messages, validFriendIds),
      readAtISO: typeof t.readAtISO === 'string' && t.readAtISO ? t.readAtISO : null,
      muted: Boolean(t.muted),
      pinned: Boolean(t.pinned),
      draft: typeof t.draft === 'string' ? t.draft.slice(0, CHAT_MESSAGE_LIMIT) : '',
    }
  }

  return Object.keys(result).length > 0 ? result : fallback
}
