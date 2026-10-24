import { computeStreak } from './streak.ts'
import { calculateStreak } from './diary-engine.ts'
import type { Day, OgonekProfile, OgonekStoreState } from './types'

/**
 * ЭТАП 4 — SaaS-профиль Pro.
 *
 * Чистый модуль для:
 *  - расчёта живой статистики профиля (стрик, средний балл ИИ, гордости, благодарности);
 *  - генерации красивой карточки-визитки в векторе (SVG) и растре (PNG);
 *  - генерации сторис-карточек (9:16);
 *  - сборки публичной ссылки и текстового описания профиля.
 *
 * Модуль не зависит от DOM на уровне импорта: тяжёлые API вызываются
 * только внутри функций экспорта, которые вызываются из клиента.
 */

export type ProfileStats = {
  /** Дней стрика (не менее 717 в демо-режиме) */
  streakDays: number
  /** Рекорд стрика */
  best: number
  /** Всего дней в летописи */
  totalDays: number
  /** Всего зафиксированных гордостей */
  totalPrides: number
  /** Всего благодарностей */
  totalGratitudes: number
  /** Средний балл ИИ (шкала 1..10) */
  avgAiScore: number
  /** Есть ли реальные оценки (иначе используется демо-значение) */
  hasRealRatings: boolean
}

export function computeProfileStats(
  storeStateOrDays: OgonekStoreState | Day[] | any,
  nowOrCount?: Date | number
): ProfileStats {
  const now = nowOrCount instanceof Date ? nowOrCount : new Date()
  const days: Day[] = Array.isArray(storeStateOrDays)
    ? storeStateOrDays
    : Array.isArray(storeStateOrDays?.days)
    ? storeStateOrDays.days
    : []
  const entryDates = new Set<string>()
  let totalPrides = 0
  let totalGratitudes = 0
  let ratingSum = 0
  let ratingCount = 0

  for (const day of days) {
    if (day.dateISO) entryDates.add(day.dateISO.slice(0, 10))
    if (day.status !== 'missed') {
      totalPrides += day.prides ? day.prides.length : 0
      totalGratitudes += day.gratitudes ? day.gratitudes.length : 0
      if (Array.isArray(day.prides)) {
        for (const pride of day.prides) {
          if (typeof pride.scale === 'number' && pride.scale > 0 && pride.text !== '—') {
            ratingSum += pride.scale
            ratingCount++
          }
        }
      }
    }
  }

  const streakInfo = computeStreak(entryDates, now)
  const recordedDays = days.filter((day) => day.status !== 'missed').length
  const demo = Boolean(
    storeStateOrDays && typeof storeStateOrDays === 'object' && 'isDemo' in storeStateOrDays
      ? storeStateOrDays.isDemo
      : false
  )
  const streakDays = calculateStreak(days)
  const best = Math.max(streakInfo.best, streakDays)
  const totalDays = Math.max(recordedDays, streakDays)

  return {
    streakDays,
    best,
    totalDays,
    totalPrides: totalPrides || (demo ? 3595 : 0),
    totalGratitudes: totalGratitudes || (demo ? 663 : 0),
    avgAiScore:
      ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : demo ? 8.6 : 0,
    hasRealRatings: ratingCount > 0,
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Темы карточки-визитки
   ──────────────────────────────────────────────────────────────────────── */

export type ProfileCardThemeId = 'ember' | 'midnight' | 'aurora' | 'gold'

export type ProfileCardTheme = {
  id: ProfileCardThemeId
  label: string
  from: string
  to: string
  accent: string
  accent2: string
}

export const PROFILE_CARD_THEMES: ProfileCardTheme[] = [
  {
    id: 'ember',
    label: 'Уголь',
    from: '#2a1206',
    to: '#05060a',
    accent: '#ff8a3d',
    accent2: '#ffd76a',
  },
  {
    id: 'midnight',
    label: 'Полночь',
    from: '#0f1923',
    to: '#05070d',
    accent: '#1d9bf0',
    accent2: '#66ffd9',
  },
  {
    id: 'aurora',
    label: 'Сияние',
    from: '#04121a',
    to: '#071b1f',
    accent: '#66ffd9',
    accent2: '#8ab4ff',
  },
  {
    id: 'gold',
    label: 'Золото',
    from: '#1a1405',
    to: '#0b0904',
    accent: '#ffd76a',
    accent2: '#ffb347',
  },
]

export function getProfileCardTheme(id: ProfileCardThemeId): ProfileCardTheme {
  return PROFILE_CARD_THEMES.find((theme) => theme.id === id) ?? PROFILE_CARD_THEMES[0]
}

/* ────────────────────────────────────────────────────────────────────────
   Ссылка, текст, хелперы
   ──────────────────────────────────────────────────────────────────────── */

export function buildProfileShareUrl(username: string): string {
  const handle = (username || 'profile').replace(/^@/, '')
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://ogonek.cernavation.com'
  return `${origin}/u/${handle}`
}

export function buildInviteUrl(username: string): string {
  const handle = (username || 'friend').replace(/^@/, '')
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://ogonek.cernavation.com'
  return `${origin}/invite/${handle}`
}

function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU')
}

export function formatProfileAsText(
  profile: OgonekProfile,
  stats: ProfileStats,
  shareUrl: string
): string {
  const lines = [
    `🔥 Огонёк · @${profile.username}`,
    `${profile.displayName}${profile.verified ? ' ✓' : ''}`,
    profile.bio,
    '────────────────────',
    `🔥 Стрик: ${stats.streakDays}+ дней (рекорд ${stats.best})`,
    `⭐ Средний балл ИИ: ${stats.avgAiScore.toFixed(1)} / 10`,
    `💪 Гордостей: ${formatNumber(stats.totalPrides)}`,
    `❤️ Благодарностей: ${formatNumber(stats.totalGratitudes)}`,
    '────────────────────',
  ]
  if (profile.city) lines.push(`📍 ${profile.city}`)
  if (profile.monthlyGoal) lines.push(`🎯 ${profile.monthlyGoal}`)
  lines.push('')
  lines.push(`Мой профиль силы: ${shareUrl}`)
  return lines.join('\n')
}

/** Преобразует blob/http/data URL в data URL (для встраивания в SVG-экспорт) */
export async function urlToDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return await new Promise<string | null>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function escapeXml(unsafe: string): string {
  return (unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function initialsFrom(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return 'AC'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

/** Разбивает текст на строки заданной длины (с многоточием при обрезке) */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    if (`${current} ${word}`.length <= maxChars) {
      current += ` ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines

  const sliced = lines.slice(0, maxLines)
  sliced[maxLines - 1] = `${sliced[maxLines - 1].slice(0, Math.max(0, maxChars - 1))}…`
  return sliced
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

/* ────────────────────────────────────────────────────────────────────────
   Карточка-визитка (horizontal, 1000×620)
   ──────────────────────────────────────────────────────────────────────── */

export type ProfileCardOptions = {
  themeId?: ProfileCardThemeId
  /** data URL аватара для встраивания (иначе — инициалы на градиенте) */
  avatarDataUrl?: string | null
  /** Публичная ссылка, печатается в подвале */
  shareUrl?: string
}

export function generateProfileCardSvg(
  profile: OgonekProfile,
  stats: ProfileStats,
  options: ProfileCardOptions = {}
): string {
  const theme = getProfileCardTheme(options.themeId ?? 'ember')
  const shareUrl = options.shareUrl ?? 'ogonek.cernavation.com'
  const width = 1000
  const height = 620

  const bioLines = wrapText(profile.bio, 58, 2)
  const initials = initialsFrom(profile.displayName)

  const avatarMarkup = options.avatarDataUrl
    ? `
      <g clip-path="url(#avaClip)">
        <image href="${escapeXml(options.avatarDataUrl)}" xlink:href="${escapeXml(options.avatarDataUrl)}" x="82" y="150" width="140" height="140" preserveAspectRatio="xMidYMid slice" />
      </g>
      <circle cx="152" cy="220" r="70" fill="none" stroke="${theme.accent}" stroke-width="3" />
    `
    : `
      <circle cx="152" cy="220" r="70" fill="url(#avaGrad)" />
      <circle cx="152" cy="220" r="70" fill="none" stroke="${theme.accent}" stroke-width="3" />
      <text x="152" y="220" text-anchor="middle" dy="16" fill="#ffffff" font-family="${FONT_STACK}" font-size="46" font-weight="800">${escapeXml(initials)}</text>
    `

  const bioMarkup = bioLines
    .map(
      (line, index) =>
        `<text x="260" y="${306 + index * 30}" fill="#d4d8db" font-family="${FONT_STACK}" font-size="20" font-weight="400">${escapeXml(line)}</text>`
    )
    .join('')

  const usernameWidth = (profile.username.length + 1) * 12
  const verifiedMarkup = profile.verified
    ? `
      <g transform="translate(${260 + usernameWidth + 14}, 236)">
        <circle cx="11" cy="0" r="11" fill="${theme.accent}" />
        <path d="M5.5 0.5L9.5 4.5L16.5 -3.5" fill="none" stroke="#08131f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    `
    : ''

  const pills: Array<{ label: string; value: string }> = [
    { label: 'Стрик', value: `${stats.streakDays}+` },
    { label: 'Балл ИИ', value: stats.avgAiScore.toFixed(1) },
    { label: 'Гордости', value: formatNumber(stats.totalPrides) },
    { label: 'Спасибо', value: formatNumber(stats.totalGratitudes) },
  ]
  const pillWidth = 197
  const pillGap = 24
  const pillsMarkup = pills
    .map((pill, index) => {
      const x = 70 + index * (pillWidth + pillGap)
      return `
      <g transform="translate(${x}, 400)">
        <rect width="${pillWidth}" height="104" rx="22" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.10" />
        <text x="22" y="42" fill="${theme.accent}" font-family="${FONT_STACK}" font-size="14" font-weight="800" letter-spacing="1.4">${escapeXml(pill.label.toUpperCase())}</text>
        <text x="22" y="82" fill="#ffffff" font-family="${FONT_STACK}" font-size="33" font-weight="800">${escapeXml(pill.value)}</text>
      </g>`
    })
    .join('')

  const goalMarkup = profile.monthlyGoal
    ? `
      <g transform="translate(70, 524)">
        <rect width="860" height="44" rx="14" fill="${theme.accent}" fill-opacity="0.10" stroke="${theme.accent}" stroke-opacity="0.28" />
        <text x="18" y="28" fill="${theme.accent}" font-family="${FONT_STACK}" font-size="15" font-weight="800" letter-spacing="1.2">ЦЕЛЬ МЕСЯЦА</text>
        <text x="168" y="28" fill="#e7e9ea" font-family="${FONT_STACK}" font-size="17" font-weight="600">${escapeXml(wrapText(profile.monthlyGoal, 62, 1)[0] ?? '')}</text>
      </g>
    `
    : ''

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.from}" />
      <stop offset="100%" stop-color="${theme.to}" />
    </linearGradient>
    <linearGradient id="avaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.accent}" />
      <stop offset="100%" stop-color="${theme.accent2}" />
    </linearGradient>
    <radialGradient id="glowA" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.34" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowB" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.accent2}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${theme.accent2}" stop-opacity="0" />
    </radialGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1" />
    </pattern>
    <clipPath id="avaClip">
      <circle cx="152" cy="220" r="70" />
    </clipPath>
  </defs>

  <rect width="${width}" height="${height}" rx="28" fill="url(#bgGrad)" />
  <ellipse cx="905" cy="70" rx="330" ry="260" fill="url(#glowA)" />
  <ellipse cx="120" cy="560" rx="300" ry="220" fill="url(#glowB)" />
  <rect width="${width}" height="${height}" rx="28" fill="url(#grid)" />
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="27" fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1.5" />

  <!-- Brand -->
  <g transform="translate(70, 58)">
    <path d="M13.5 0L16.8 10.2L27 13.5L16.8 16.8L13.5 27L10.2 16.8L0 13.5L10.2 10.2Z" fill="url(#avaGrad)" />
    <text x="38" y="20" fill="#ffffff" font-family="${FONT_STACK}" font-size="21" font-weight="800" letter-spacing="1.5">ОГОНЁК</text>
    <text x="156" y="20" fill="#ffffff" fill-opacity="0.55" font-family="${FONT_STACK}" font-size="16" font-weight="500">· Визитка силы</text>
  </g>
  <text x="930" y="76" text-anchor="end" fill="${theme.accent}" font-family="${FONT_STACK}" font-size="15" font-weight="700" letter-spacing="1">PRO</text>

  <!-- Avatar -->
  ${avatarMarkup}

  <!-- Identity -->
  <text x="260" y="206" fill="#ffffff" font-family="${FONT_STACK}" font-size="44" font-weight="800">${escapeXml(profile.displayName)}</text>
  <text x="260" y="242" fill="#ffffff" fill-opacity="0.62" font-family="${FONT_STACK}" font-size="22" font-weight="500">@${escapeXml(profile.username)}</text>
  ${verifiedMarkup}
  ${bioMarkup}

  <!-- Stats -->
  ${pillsMarkup}

  <!-- Footer / goal -->
  ${goalMarkup}
  <text x="70" y="600" fill="#ffffff" fill-opacity="0.45" font-family="${FONT_STACK}" font-size="15" font-weight="500">${escapeXml(shareUrl)}</text>
  <text x="930" y="600" text-anchor="end" fill="#ffffff" font-family="${FONT_STACK}" font-size="16" font-weight="700">@${escapeXml(profile.username)}</text>
</svg>
`.trim()
}

/* ────────────────────────────────────────────────────────────────────────
   Сторис-карточки (vertical, 720×1280)
   ──────────────────────────────────────────────────────────────────────── */

export type ProfileStory = {
  id: string
  emoji: string
  kicker: string
  value: string
  title: string
  subtitle: string
  from: string
  to: string
  accent: string
  shareText: string
}

export function buildProfileStories(
  profile: OgonekProfile,
  stats: ProfileStats
): ProfileStory[] {
  const stories: ProfileStory[] = [
    {
      id: 'streak',
      emoji: '🔥',
      kicker: 'СЕРИЯ',
      value: `${stats.streakDays}+`,
      title: 'дней стрика',
      subtitle: `Личный рекорд — ${stats.best} дней подряд`,
      from: '#2a1206',
      to: '#7a2f0c',
      accent: '#ffa600',
      shareText: `🔥 ${stats.streakDays}+ дней подряд в Огоньке! Рекорд — ${stats.best} дней.`,
    },
    {
      id: 'score',
      emoji: '⭐',
      kicker: 'СИЛА ДНЕЙ',
      value: stats.avgAiScore.toFixed(1),
      title: 'средний балл ИИ',
      subtitle: 'Оценка глубины и преодоления каждого дня',
      from: '#0a1420',
      to: '#123a5a',
      accent: '#66ffd9',
      shareText: `⭐ Мой средний балл силы — ${stats.avgAiScore.toFixed(1)} из 10 в Огоньке.`,
    },
    {
      id: 'prides',
      emoji: '💪',
      kicker: 'ЗАФИКСИРОВАНО',
      value: formatNumber(stats.totalPrides),
      title: 'гордостей',
      subtitle: 'Каждая — маленькая победа над собой',
      from: '#1a0f0a',
      to: '#5a2410',
      accent: '#ff8a3d',
      shareText: `💪 Зафиксировал ${formatNumber(stats.totalPrides)} гордостей в Огоньке!`,
    },
    {
      id: 'gratitudes',
      emoji: '❤️',
      kicker: 'В СЕРДЦЕ',
      value: formatNumber(stats.totalGratitudes),
      title: 'благодарностей',
      subtitle: 'Признательность как ежедневная практика',
      from: '#240a17',
      to: '#6b1846',
      accent: '#f91880',
      shareText: `❤️ ${formatNumber(stats.totalGratitudes)} благодарностей — язык сердца в Огоньке.`,
    },
    {
      id: 'goal',
      emoji: '🎯',
      kicker: 'ЦЕЛЬ МЕСЯЦА',
      value: '★',
      title: profile.monthlyGoal || 'Большая цель впереди',
      subtitle: 'Одна цель, которой подчинён месяц',
      from: '#120a24',
      to: '#3d1a6b',
      accent: '#c4a6ff',
      shareText: `🎯 Моя цель месяца: ${profile.monthlyGoal || 'расти каждый день'}`,
    },
    {
      id: 'joined',
      emoji: '🌅',
      kicker: `В ОГОНЬКЕ С ${profile.joinedLabel.toUpperCase()}`,
      value: '∞',
      title: 'день за днём',
      subtitle: 'Строю жизнь осознанно, без пропусков',
      from: '#04121a',
      to: '#14524f',
      accent: '#66ffd9',
      shareText: `🌅 Держу огонь с ${profile.joinedLabel}. Присоединяйся: ${buildProfileShareUrl(profile.username)}`,
    },
  ]
  return stories
}

export function generateStoryCardSvg(
  story: ProfileStory,
  profile: OgonekProfile,
  shareUrl: string
): string {
  const width = 720
  const height = 1280
  const valueFont = story.value.length > 4 ? 150 : story.value.length > 2 ? 200 : 260
  const titleLines = wrapText(story.title, 18, 2)

  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="60" y="${860 + index * 66}" fill="#ffffff" font-family="${FONT_STACK}" font-size="54" font-weight="800">${escapeXml(line)}</text>`
    )
    .join('')

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sbg" x1="0%" y1="0%" x2="100%" y2="120%">
      <stop offset="0%" stop-color="${story.from}" />
      <stop offset="100%" stop-color="${story.to}" />
    </linearGradient>
    <radialGradient id="sglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${story.accent}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${story.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" rx="40" fill="url(#sbg)" />
  <ellipse cx="600" cy="240" rx="360" ry="300" fill="url(#sglow)" />
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="38" fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="2" />

  <g transform="translate(60, 74)">
    <path d="M15 0L18.7 11.3L30 15L18.7 18.7L15 30L11.3 18.7L0 15L11.3 11.3Z" fill="${story.accent}" />
    <text x="44" y="23" fill="#ffffff" font-family="${FONT_STACK}" font-size="24" font-weight="800" letter-spacing="2">ОГОНЁК</text>
  </g>

  <text x="60" y="640" fill="${story.accent}" font-family="${FONT_STACK}" font-size="26" font-weight="800" letter-spacing="4">${escapeXml(story.kicker)}</text>
  <text x="60" y="800" fill="#ffffff" font-family="${FONT_STACK}" font-size="${valueFont}" font-weight="900">${escapeXml(story.value)}</text>
  ${titleMarkup}
  <text x="60" y="1030" fill="#ffffff" fill-opacity="0.72" font-family="${FONT_STACK}" font-size="26" font-weight="400">${escapeXml(wrapText(story.subtitle, 30, 2)[0] ?? '')}</text>
  <text x="60" y="1068" fill="#ffffff" fill-opacity="0.72" font-family="${FONT_STACK}" font-size="26" font-weight="400">${escapeXml(wrapText(story.subtitle, 30, 2)[1] ?? '')}</text>

  <g transform="translate(60, 1160)">
    <text x="0" y="0" fill="#ffffff" font-family="${FONT_STACK}" font-size="24" font-weight="700">@${escapeXml(profile.username)}</text>
    <text x="600" y="0" text-anchor="end" fill="#ffffff" fill-opacity="0.6" font-family="${FONT_STACK}" font-size="18" font-weight="500">${escapeXml(shareUrl.replace(/^https?:\/\//, ''))}</text>
  </g>
</svg>
`.trim()
}

/* ────────────────────────────────────────────────────────────────────────
   Экспорт в PNG (через Canvas 2x)
   ──────────────────────────────────────────────────────────────────────── */

async function svgToPngBlob(svgString: string, scale = 2): Promise<Blob> {
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Canvas 2D context not available'))
          return
        }
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create PNG blob from canvas'))
        }, 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to load SVG into image: ${String(e)}`))
    }
    img.src = url
  })
}

export async function exportProfileCardAsPng(
  profile: OgonekProfile,
  stats: ProfileStats,
  options: ProfileCardOptions = {}
): Promise<Blob> {
  return svgToPngBlob(generateProfileCardSvg(profile, stats, options), 2)
}

export async function exportStoryCardAsPng(
  story: ProfileStory,
  profile: OgonekProfile,
  shareUrl: string
): Promise<Blob> {
  return svgToPngBlob(generateStoryCardSvg(story, profile, shareUrl), 2)
}

/** data URL для предпросмотра SVG прямо в <img> */
export function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
}
