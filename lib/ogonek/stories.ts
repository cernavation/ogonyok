/**
 * ЭТАП 7 — СТОРИС ДРУЗЕЙ (Instagram-стиль).
 *
 * Чистый модуль без DOM-зависимостей:
 *  - собирает живые сторис из круга друзей (серия, «вместе», город);
 *  - описывает шаблоны для личной сторис пользователя («Моя история +»);
 *  - даёт демо-кадры для первого запуска.
 *
 * Компоненты `stories-bar.tsx` / `story-viewer-modal.tsx` /
 * `story-composer-modal.tsx` используют эти функции, чтобы кружочки друзей
 * были не заглушкой, а настоящими листающимися историями.
 */

import { FRIEND_PROFILES, type FriendProfile } from './friends.ts'
import { buildFriendDigest, buildMyDigest, type StoryDayDigest } from './story-digest.ts'
import type { Day, FriendStory, MyStory, StorySlide, VisibilityLevel } from './types'
import { normalizeVisibility } from './visibility.ts'

/** Палитра градиентов кадров — тёплый огонь Огонька + холодные акценты */
const SLIDE_THEMES: Array<{ from: string; to: string; accent: string }> = [
  { from: '#2a1206', to: '#7a2f0c', accent: '#ffa600' },
  { from: '#0a1420', to: '#123a5a', accent: '#66ffd9' },
  { from: '#1a0f0a', to: '#5a2410', accent: '#ff8a3d' },
  { from: '#240a17', to: '#6b1846', accent: '#f91880' },
  { from: '#120a24', to: '#3d1a6b', accent: '#c4a6ff' },
  { from: '#04121a', to: '#14524f', accent: '#66ffd9' },
  { from: '#1a1405', to: '#6b5210', accent: '#ffd76a' },
  { from: '#0a1a10', to: '#14532d', accent: '#4ade80' },
]

function themeFor(index: number) {
  return SLIDE_THEMES[((index % SLIDE_THEMES.length) + SLIDE_THEMES.length) % SLIDE_THEMES.length]
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 9 — ФОНЫ ДЛЯ ПУБЛИКАЦИИ ГОРДОСТИ В СТОРИС
   ──────────────────────────────────────────────────────────────────────── */

/** Выбираемый фон кадра сторис (градиент + акцент) */
export type StoryBackground = {
  id: string
  label: string
  from: string
  to: string
  accent: string
}

const BACKGROUND_LABELS = [
  'Тёплый уголь',
  'Глубокий космос',
  'Закатный огонь',
  'Ночной рассвет',
  'Лавандовый сон',
  'Ледяной огонь',
  'Золото пути',
  'Лес силы',
]

export const STORY_BACKGROUNDS: StoryBackground[] = SLIDE_THEMES.map((theme, index) => ({
  id: `bg-${index}`,
  label: BACKGROUND_LABELS[index] ?? `Фон ${index + 1}`,
  ...theme,
}))

/** Возвращает фон по id (или первый фон, если id неизвестен/пуст) */
export function getStoryBackground(id?: string): StoryBackground {
  return STORY_BACKGROUNDS.find((bg) => bg.id === id) ?? STORY_BACKGROUNDS[0]
}

/**
 * Собирает сторис одного друга: серия → «плечом к плечу» → город.
 * Данные берутся из социальной карты (никаких фейковых записей в летописи).
 */
export function buildFriendSlides(friend: FriendProfile, index = 0): StorySlide[] {
  const t0 = themeFor(index)
  const t1 = themeFor(index + 2)
  const t2 = themeFor(index + 5)

  return [
    {
      id: `${friend.id}-streak`,
      emoji: '🔥',
      kicker: 'СЕРИЯ ДНЕЙ',
      headline: `${friend.streak}`,
      detail: `${friend.name.split(' ')[0]} держит огонь ${friend.streak} дней подряд без пропусков`,
      ...t0,
    },
    {
      id: `${friend.id}-together`,
      emoji: '🤝',
      kicker: 'ПЛЕЧОМ К ПЛЕЧУ',
      headline: `${friend.together}`,
      detail: `Столько дней мы шли рядом по пути силы. ${friend.mutual} общих соратников`,
      ...t1,
    },
    {
      id: `${friend.id}-city`,
      emoji: '📍',
      kicker: friend.city.toUpperCase(),
      headline: 'в огне',
      detail: friend.bio,
      ...t2,
    },
  ]
}

/** Собирает сторис для всего круга друзей (или только для подписок, если передан список) */
export function buildFriendStories(followingIds?: string[]): FriendStory[] {
  const allowed = followingIds && followingIds.length > 0 ? new Set(followingIds) : null
  return FRIEND_PROFILES.filter((f) => !allowed || allowed.has(f.id)).map((friend, index) => ({
    friendId: friend.id,
    slides: buildFriendSlides(friend, index),
    postedLabel: friend.lastActive,
  }))
}

/* ────────────────────────────────────────────────────────────────────────
   Личная сторис — шаблоны («Моя история +»)
   ──────────────────────────────────────────────────────────────────────── */

export type StoryTemplateContext = {
  displayName: string
  streak: number
  /** Название/первая гордость самого свежего дня */
  latestTitle: string
  latestDayId: number | null
  totalPrides: number
  totalGratitudes: number
  monthlyGoal: string
}

export type StoryTemplate = {
  id: string
  label: string
  emoji: string
  kicker: string
  from: string
  to: string
  accent: string
  /** Собирает заголовок и подпись кадра из живого контекста */
  build: (ctx: StoryTemplateContext) => { headline: string; detail: string; sourceDayId: number | null }
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'today',
    label: 'Сегодняшний день',
    emoji: '✨',
    kicker: 'СЕГОДНЯ',
    from: '#2a1206',
    to: '#7a2f0c',
    accent: '#ffa600',
    build: (ctx) => ({
      headline: ctx.latestTitle || 'Новый день силы',
      detail: `День №${ctx.latestDayId ?? '—'} в летописи Огонька`,
      sourceDayId: ctx.latestDayId,
    }),
  },
  {
    id: 'streak',
    label: 'Моя серия',
    emoji: '🔥',
    kicker: 'СЕРИЯ',
    from: '#1a0f0a',
    to: '#5a2410',
    accent: '#ff8a3d',
    build: (ctx) => ({
      headline: `${ctx.streak}`,
      detail: 'дней подряд держу огонь без единого пропуска',
      sourceDayId: null,
    }),
  },
  {
    id: 'gratitude',
    label: 'Благодарность',
    emoji: '❤️',
    kicker: 'В СЕРДЦЕ',
    from: '#240a17',
    to: '#6b1846',
    accent: '#f91880',
    build: (ctx) => ({
      headline: `${ctx.totalGratitudes}`,
      detail: 'благодарностей — язык сердца, на котором я говорю с жизнью',
      sourceDayId: null,
    }),
  },
  {
    id: 'goal',
    label: 'Цель месяца',
    emoji: '🎯',
    kicker: 'ЦЕЛЬ МЕСЯЦА',
    from: '#120a24',
    to: '#3d1a6b',
    accent: '#c4a6ff',
    build: (ctx) => ({
      headline: ctx.monthlyGoal || 'Большая цель впереди',
      detail: 'одна цель, которой подчинён весь месяц',
      sourceDayId: null,
    }),
  },
  {
    id: 'pride',
    label: 'Гордости',
    emoji: '💪',
    kicker: 'ЗАФИКСИРОВАНО',
    from: '#0a1420',
    to: '#123a5a',
    accent: '#66ffd9',
    build: (ctx) => ({
      headline: `${ctx.totalPrides}`,
      detail: 'поводов для гордости — маленьких побед над собой',
      sourceDayId: null,
    }),
  },
]

export function getStoryTemplate(id: string): StoryTemplate {
  return STORY_TEMPLATES.find((t) => t.id === id) ?? STORY_TEMPLATES[0]
}

/** Создаёт новый личный кадр из шаблона и живого контекста */
export function createMyStory(
  templateId: string,
  ctx: StoryTemplateContext,
  now: Date = new Date()
): MyStory {
  const template = getStoryTemplate(templateId)
  const { headline, detail, sourceDayId } = template.build(ctx)
  return {
    id: `my-story-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAtISO: now.toISOString(),
    emoji: template.emoji,
    kicker: template.kicker,
    headline,
    detail,
    from: template.from,
    to: template.to,
    accent: template.accent,
    sourceDayId,
    backgroundId: STORY_BACKGROUNDS.find((bg) => bg.from === template.from && bg.to === template.to)?.id,
    photo: null,
    visibility: 'public',
  }
}

/**
 * ЭТАП 9 — Публикация КОНКРЕТНОЙ гордости в сторис.
 * Собирает личный кадр из текста гордости с выбранным фоном и фото.
 */
export type PrideStoryInput = {
  /** id дня-источника (или null для свободной гордости) */
  dayId?: number | null
  /** Человекочитаемая метка дня: «12 октября» */
  dayLabel?: string
  /** Индекс гордости в дне */
  prideIndex: number
  /** Текст гордости — основа заголовка кадра */
  prideText: string
  /** Сила гордости 1..10 — попадает в подпись */
  scale?: number
  /** id выбранного фона из STORY_BACKGROUNDS */
  backgroundId?: string
  /** Фото-фон (id из IndexedDB / data URL / blob) */
  photo?: string | null
  /** Приватность сторис */
  visibility?: VisibilityLevel
  /** Переопределённый заголовок кадра */
  headline?: string
  /** Переопределённая подпись кадра */
  detail?: string
  now?: Date
}

/** Собирает кадр «Моей истории» из конкретной гордости */
export function createPrideStory(input: PrideStoryInput): MyStory {
  const now = input.now ?? new Date()
  const bg = getStoryBackground(input.backgroundId)

  const fallbackHeadline = input.prideText.trim() || 'Гордость дня'
  const headline = (input.headline?.trim() || fallbackHeadline).slice(0, 120)

  const scalePart = input.scale ? ` · ${Math.min(10, Math.max(1, Math.round(input.scale)))}/10` : ''
  const dayPart = input.dayLabel ? ` · ${input.dayLabel}` : ''
  const fallbackDetail = `Гордость №${input.prideIndex + 1}${scalePart}${dayPart}`
  const detail = (input.detail?.trim() || fallbackDetail).slice(0, 200)

  return {
    id: `my-story-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAtISO: now.toISOString(),
    emoji: '💪',
    kicker: 'ГОРДОСТЬ ДНЯ',
    headline,
    detail,
    from: bg.from,
    to: bg.to,
    accent: bg.accent,
    sourceDayId: input.dayId ?? null,
    sourcePrideIndex: input.prideIndex,
    backgroundId: bg.id,
    photo: input.photo ?? null,
    visibility: normalizeVisibility(input.visibility),
  }
}

/** Демо-кадр «Моей истории» для первого запуска */
export function buildDemoMyStories(now: Date = new Date()): MyStory[] {
  return [
    {
      id: 'my-story-demo',
      createdAtISO: new Date(now.getTime() - 45 * 60_000).toISOString(),
      emoji: '🔥',
      kicker: 'СЕРИЯ',
      headline: '719',
      detail: 'дней подряд держу огонь без единого пропуска',
      from: '#2a1206',
      to: '#7a2f0c',
      accent: '#ffa600',
      sourceDayId: null,
    },
  ]
}

/** Аккуратно описывает «сколько назад» опубликована сторис */
export function formatStoryAge(iso: string, now: Date = new Date()): string {
  const time = new Date(iso).getTime()
  if (!Number.isFinite(time)) return 'только что'
  const diffMin = Math.max(0, Math.round((now.getTime() - time) / 60_000))
  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин назад`
  const hours = Math.round(diffMin / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.round(hours / 24)
  return `${days} дн назад`
}

/* ────────────────────────────────────────────────────────────────────────
   Универсальная модель для просмотрщика (друзья + личные истории)
   ──────────────────────────────────────────────────────────────────────── */

export type ViewableStory = {
  id: string
  kind: 'friend' | 'mine'
  friendId?: string
  name: string
  username: string
  initials: string
  avatarColor: string
  verified: boolean
  postedLabel: string
  slides: StorySlide[]
  /** id личных кадров (aligned со slides) — для удаления из «Моей истории» */
  myStoryIds?: string[]
  /** Опубликованный день автора: фото-сетка, главная гордость, статистика */
  digest: StoryDayDigest
}

export function friendStoryToViewable(friend: FriendProfile, story: FriendStory): ViewableStory {
  return {
    id: `story-${friend.id}`,
    kind: 'friend',
    friendId: friend.id,
    name: friend.name,
    username: friend.username,
    initials: friend.initials,
    avatarColor: friend.avatarColor,
    verified: friend.verified,
    postedLabel: story.postedLabel,
    slides: story.slides,
    digest: buildFriendDigest(friend),
  }
}

export function myStoriesToViewable(
  stories: MyStory[],
  owner: {
    displayName: string
    username: string
    avatarColor: string
    verified: boolean
    /** Город профиля — для дайджеста дня */
    city?: string
    /** Текущая серия дней — для статистики дайджеста */
    streak?: number
  },
  /** Самый свежий день летописи — из него строится дайджест «Моей истории» */
  day?: Day | null
): ViewableStory | null {
  if (!stories || stories.length === 0) return null
  const ordered = [...stories].sort(
    (a, b) => new Date(a.createdAtISO).getTime() - new Date(b.createdAtISO).getTime()
  )
  return {
    id: 'story-mine',
    kind: 'mine',
    name: owner.displayName,
    username: owner.username,
    initials: owner.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'Я',
    avatarColor: owner.avatarColor,
    verified: owner.verified,
    postedLabel: formatStoryAge(ordered[ordered.length - 1]?.createdAtISO ?? ''),
    myStoryIds: ordered.map((s) => s.id),
    slides: ordered.map((s) => ({
      id: s.id,
      emoji: s.emoji,
      kicker: s.kicker,
      headline: s.headline,
      detail: s.detail,
      from: s.from,
      to: s.to,
      accent: s.accent,
      photo: s.photo ?? null,
    })),
    digest: buildMyDigest(day, {
      displayName: owner.displayName,
      city: owner.city,
      streak: owner.streak,
    }),
  }
}
