/**
 * ЭТАП 8 — ДАЙДЖЕСТ ОПУБЛИКОВАННОГО ДНЯ ДЛЯ ПРОСМОТРЩИКА СТОРИС.
 *
 * Просмотрщик сторис (`story-viewer-modal.tsx`) показывает не только
 * крупный кадр 9:16, но и «опубликованный день» автора: фото-сетку,
 * главную гордость дня, статистику пути и теги.
 *
 * Для друзей данные собираются детерминированно из социальной карты
 * (никаких фейковых записей в летописи — это витрина дня в сторис).
 * Для собственной истории дайджест строится из настоящего дня дневника.
 */

import type { FriendProfile } from './friends'
import { getGratitudeText, type Day } from './types.ts'

/** Плитка фото-сетки: настоящая фотография дня или процедурный «кадр» дня */
export type StoryPhoto = {
  id: string
  /** Эмодзи-момент (рассвет, пробежка, зал…) */
  emoji: string
  /** Подпись к кадру */
  caption: string
  /** CSS-фон плитки (градиент), когда нет настоящего фото */
  gradient: string
  /** id фото из IndexedDB, data URL или blob — если у дня есть фотография */
  ref?: string | null
}

/** Полный дайджест опубликованного дня автора сторис */
export type StoryDayDigest = {
  /** id дня-источника в летописи (для своей истории) */
  dayId: number | null
  title: string
  /** Человекочитаемая метка: «сегодня» / «5 минут назад» */
  dateLabel: string
  city: string
  tags: string[]
  /** Главная гордость дня */
  mainPride: string
  /** Сила главной гордости 1..10 */
  mainPrideScale: number
  /** Остальные гордости дня */
  prides: string[]
  /** Благодарности дня */
  gratitudes: string[]
  /** Красивая фото-сетка дня */
  photos: StoryPhoto[]
  /** Статистика пути автора */
  streak: number
  together: number
  mutual: number
  /** Условное число поддержек под днём */
  supportCount: number
  /** Есть ли настоящие фотографии (истинные снимки дня) */
  hasRealPhotos: boolean
}

/* ── Детерминированный источник картинки дня ─────────────────────────────── */

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Живописные градиенты «фотографий» дня */
const PHOTO_GRADIENTS: readonly string[] = [
  'linear-gradient(135deg, #0f2027 0%, #203a43 55%, #2c5364 100%)',
  'linear-gradient(135deg, #3a1c71 0%, #d76d77 60%, #ffaf7b 100%)',
  'linear-gradient(135deg, #42275a 0%, #734b6d 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
  'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
  'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)',
  'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
  'linear-gradient(135deg, #c33764 0%, #1d2671 100%)',
  'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
  'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
]

/** Моменты дня, из которых собирается фото-сетка */
const MOMENTS: ReadonlyArray<{ emoji: string; caption: string }> = [
  { emoji: '🌅', caption: 'Рассвет и первый шаг' },
  { emoji: '🏃', caption: 'Километры наедине с собой' },
  { emoji: '📖', caption: 'Страница, что меняет день' },
  { emoji: '💪', caption: 'Зал, где куётся воля' },
  { emoji: '🎯', caption: 'Одна цель — весь фокус' },
  { emoji: '🧘', caption: 'Тишина и дыхание' },
  { emoji: '☕', caption: 'Утро без спешки' },
  { emoji: '🏅', caption: 'Маленькая победа дня' },
  { emoji: '🌊', caption: 'Стихия, что учит смирению' },
  { emoji: '🎵', caption: 'Практика до совершенства' },
  { emoji: '📈', caption: 'Прогресс, который видно' },
  { emoji: '🔥', caption: 'Огонь не гаснет' },
]

/** Поводы для гордости в дне друга */
const FRIEND_PRIDES: readonly string[] = [
  'Встал до будильника и сделал главное ещё до рассвета',
  'Не пропустил тренировку, даже когда очень хотелось',
  'Закрыл задачу, которую откладывал целую неделю',
  'Прочитал 30 страниц вместо бесконечной ленты',
  'Сказал «нет» соблазну и «да» своей цели',
  'Провёл вечер без телефона — наедине с собой',
  'Вышел на пробежку в дождь и ни разу не пожалел',
  'Закончил сложный разговор честно и спокойно',
  'Сделал зарядку очередного дня без единого пропуска',
  'Нашёл в себе силы начать то, что давно откладывал',
]

/** Тёплые благодарности дня друга */
const FRIEND_GRATITUDES: readonly string[] = [
  'Телу, что несёт меня вперёд',
  'Близким за тихую поддержку',
  'Утру за ещё один шанс',
  'Себе вчерашнему — за решение начать',
  'Дороге, что учит терпению',
  'Людям, что идут рядом',
]

/** Форматирует дату дня как «12 октября 2026» */
export function formatDigestDate(iso?: string): string {
  if (!iso) return 'сегодня'
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return 'сегодня'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function firstNameOf(name: string): string {
  return (name || '').trim().split(/\s+/)[0] || name || 'Соратник'
}

/** Дайджест «опубликованного дня» друга из социальной карты */
export function buildFriendDigest(friend: FriendProfile): StoryDayDigest {
  const seed = hashString(friend.id)
  const shift = Math.floor(seed / 7)

  const photos: StoryPhoto[] = Array.from({ length: 6 }, (_, i) => {
    const moment = MOMENTS[(seed + i * 5 + shift) % MOMENTS.length]
    return {
      id: `${friend.id}-photo-${i}`,
      emoji: moment.emoji,
      caption: moment.caption,
      gradient: PHOTO_GRADIENTS[(seed + i * 3) % PHOTO_GRADIENTS.length],
    }
  })

  return {
    dayId: null,
    title: `${firstNameOf(friend.name)}: день в огне`,
    dateLabel: friend.lastActive,
    city: friend.city,
    tags: ['Дисциплина', '🔥 Гордость', friend.city],
    mainPride: FRIEND_PRIDES[seed % FRIEND_PRIDES.length],
    mainPrideScale: 7 + (seed % 4),
    prides: [0, 1, 2].map((k) => FRIEND_PRIDES[(seed + k * 3) % FRIEND_PRIDES.length]),
    gratitudes: [0, 1].map((k) => FRIEND_GRATITUDES[(seed + k * 5) % FRIEND_GRATITUDES.length]),
    photos,
    streak: friend.streak,
    together: friend.together,
    mutual: friend.mutual,
    supportCount: 60 + (seed % 480),
    hasRealPhotos: false,
  }
}

/**
 * Дайджест собственного дня для «Моей истории».
 * Если настоящий день есть — берём его гордости, благодарности и фотографии.
 * Если нет — собираем лёгкий вдохновляющий дайджест.
 */
export function buildMyDigest(
  day: Day | null | undefined,
  opts: { displayName: string; city?: string; streak?: number }
): StoryDayDigest {
  const displayName = opts.displayName || 'Я'

  if (!day) {
    const seed = hashString(displayName)
    const photos: StoryPhoto[] = Array.from({ length: 4 }, (_, i) => {
      const moment = MOMENTS[(seed + i * 4) % MOMENTS.length]
      return {
        id: `my-photo-${i}`,
        emoji: moment.emoji,
        caption: moment.caption,
        gradient: PHOTO_GRADIENTS[(seed + i * 2) % PHOTO_GRADIENTS.length],
      }
    })
    return {
      dayId: null,
      title: 'Моя история',
      dateLabel: 'только что',
      city: opts.city ?? '',
      tags: ['✨ Моя история', '🔥 Огонёк'],
      mainPride: 'Живу этот день осознанно и благодарно',
      mainPrideScale: 8,
      prides: [],
      gratitudes: [],
      photos,
      streak: Math.max(opts.streak ?? 0, 0),
      together: 0,
      mutual: 0,
      supportCount: 0,
      hasRealPhotos: false,
    }
  }

  const prides = (day.prides ?? []).map((p) => p.text).filter(Boolean)
  const gratitudes = (day.gratitudes ?? []).map(getGratitudeText).filter(Boolean)
  const realPhotos = (day.photos ?? []).filter(Boolean)
  const seed = hashString(`day-${day.id}`)
  const shift = Math.floor(seed / 5)

  const photos: StoryPhoto[] =
    realPhotos.length > 0
      ? realPhotos.slice(0, 9).map((ref, i) => {
          const moment = MOMENTS[(seed + i * 3 + shift) % MOMENTS.length]
          return {
            id: `${day.id}-photo-${i}`,
            emoji: moment.emoji,
            caption: moment.caption,
            gradient: PHOTO_GRADIENTS[(seed + i * 2) % PHOTO_GRADIENTS.length],
            ref,
          }
        })
      : Array.from({ length: 4 }, (_, i) => {
          const moment = MOMENTS[(seed + i * 4) % MOMENTS.length]
          return {
            id: `${day.id}-ph-${i}`,
            emoji: moment.emoji,
            caption: moment.caption,
            gradient: PHOTO_GRADIENTS[(seed + i * 2) % PHOTO_GRADIENTS.length],
          }
        })

  const mainScale = day.prides?.[0]?.scale

  return {
    dayId: day.id,
    title: day.title || `День №${day.id}`,
    dateLabel: formatDigestDate(day.dateISO),
    city: opts.city ?? '',
    tags: (day.tags ?? []).filter(Boolean).slice(0, 4),
    mainPride: prides[0] ?? day.title ?? 'Новый день силы',
    mainPrideScale: typeof mainScale === 'number' && mainScale > 0 ? mainScale : 8,
    prides: prides.slice(0, 5),
    gratitudes: gratitudes.slice(0, 4),
    photos,
    streak: Math.max(opts.streak ?? 0, day.id),
    together: 0,
    mutual: 0,
    supportCount: 0,
    hasRealPhotos: realPhotos.length > 0,
  }
}
