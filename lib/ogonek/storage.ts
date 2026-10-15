import { regulateAchievement, isAchievementCategoryId } from './achievement-regulation'
import { sanitizeSubmission } from './achievement-moderation'
import { EVIDENCE_ITEMS, INITIAL_DAYS } from './data'
import {
  DEFAULT_FOLLOWING_IDS,
  DEFAULT_FRIEND_IDS,
  DEFAULT_INCOMING_FRIEND_REQUEST_IDS,
  DEFAULT_OUTGOING_FRIEND_REQUEST_IDS,
  FRIEND_PROFILES,
} from './friends'
import { sanitizeMorningFocusHistory, migrateIntentionsToHistory, buildDemoMorningFocus } from './morning-focus'
import { DEFAULT_CUSTOM_EMOJIS } from './reactions'
import { buildDemoMyStories } from './stories'
import { normalizeVisibility } from './visibility'
import type {
  AchievementEvidenceFile,
  AchievementEvidenceRequirement,
  AchievementRegulation,
  AchievementStatus,
  Comment,
  CommentPersona,
  CommentsByTarget,
  ComposerDraft,
  CustomEmoji,
  Day,
  EvidenceItem,
  MyReactions,
  MyStory,
  OgonekProfile,
  OgonekStoreState,
  ProfileSocialLink,
  ProfileSocialPlatform,
  ReactionCounts,
  VerifiedAchievement,
} from './types'

export const STORAGE_KEY = 'ogonek.v2'
export const CURRENT_SCHEMA_VERSION = 4

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

class BrowserLocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, value)
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('Storage quota exceeded. Attempting to clear composer drafts.')
        try {
          // Attempt to strip large drafts if quota is exceeded
          const parsed = JSON.parse(value) as Partial<OgonekStoreState>
          parsed.composerDraft = null
          window.localStorage.setItem(key, JSON.stringify(parsed))
        } catch {
          // Failed fallback
        }
      }
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore
    }
  }
}

export const defaultStorageAdapter: StorageAdapter = new BrowserLocalStorageAdapter()

/** Безопасно валидирует массив кастомных смайликов из хранилища */
export function sanitizeCustomEmojis(value: unknown): CustomEmoji[] {
  if (!Array.isArray(value)) return DEFAULT_CUSTOM_EMOJIS
  const seen = new Set<string>()
  const result: CustomEmoji[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const obj = raw as Partial<CustomEmoji>
    if (typeof obj.char !== 'string' || obj.char.trim() === '') continue
    const id = typeof obj.id === 'string' && obj.id ? obj.id : `emoji-${obj.char.trim()}-${result.length}`
    if (seen.has(id)) continue
    seen.add(id)
    result.push({
      id,
      char: obj.char.trim().slice(0, 8),
      label: typeof obj.label === 'string' && obj.label.trim() ? obj.label.trim().slice(0, 40) : 'Мой смайлик',
      createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
    })
  }
  return result.length > 0 ? result : DEFAULT_CUSTOM_EMOJIS
}

/** Валидирует карту реакций: target → emojiId → count (>0) */
export function sanitizeReactions(value: unknown): ReactionCounts {
  if (!value || typeof value !== 'object') return {}
  const result: ReactionCounts = {}
  for (const [target, counts] of Object.entries(value as Record<string, unknown>)) {
    if (!counts || typeof counts !== 'object') continue
    const clean: Record<string, number> = {}
    for (const [emojiId, count] of Object.entries(counts as Record<string, unknown>)) {
      if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
        clean[emojiId] = Math.round(count)
      }
    }
    if (Object.keys(clean).length > 0) result[target] = clean
  }
  return result
}

/** Валидирует карту «мои реакции»: target → [emojiId] */
export function sanitizeMyReactions(value: unknown): MyReactions {
  if (!value || typeof value !== 'object') return {}
  const result: MyReactions = {}
  for (const [target, ids] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(ids)) continue
    const clean = ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    if (clean.length > 0) result[target] = Array.from(new Set(clean))
  }
  return result
}

/**
 * Валидирует дерево комментариев поддержки: target → плоский список.
 * Повреждённые элементы отбрасываются, тексты обрезаются по длине.
 */
export function sanitizeComments(value: unknown): CommentsByTarget {
  if (!value || typeof value !== 'object') return {}
  const result: CommentsByTarget = {}

  for (const [target, list] of Object.entries(value as Record<string, unknown>)) {
    if (!target || !Array.isArray(list)) continue
    const seen = new Set<string>()
    const cleaned: Comment[] = []

    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue
      const c = raw as Partial<Comment>
      const text = typeof c.text === 'string' ? c.text.trim() : ''
      if (!text) continue

      const id = typeof c.id === 'string' && c.id ? c.id : `cm-${target}-${cleaned.length}`
      if (seen.has(id)) continue
      seen.add(id)

      const persona: CommentPersona = c.persona === 'support' ? 'support' : 'me'

      cleaned.push({
        id,
        parentId: typeof c.parentId === 'string' && c.parentId ? c.parentId : null,
        author:
          typeof c.author === 'string' && c.author.trim()
            ? c.author.trim().slice(0, 60)
            : persona === 'support'
              ? 'Огонёк поддержки'
              : 'Alexei Cerna',
        initials:
          typeof c.initials === 'string' && c.initials.trim()
            ? c.initials.trim().slice(0, 3)
            : persona === 'support'
              ? '✦'
              : 'AC',
        text: text.slice(0, 600),
        createdAt:
          typeof c.createdAt === 'string' && c.createdAt
            ? c.createdAt
            : new Date().toISOString(),
        likes:
          typeof c.likes === 'number' && Number.isFinite(c.likes) && c.likes > 0
            ? Math.round(c.likes)
            : 0,
        likedByMe: Boolean(c.likedByMe),
        isMine: Boolean(c.isMine),
        template: typeof c.template === 'string' ? c.template : null,
        persona,
      })
    }

    if (cleaned.length > 0) result[target] = cleaned
  }

  return result
}

/** Валидирует список ID друзей, на которых подписан пользователь */
export function sanitizeFollowingIds(value: unknown): string[] {
  const valid = new Set(FRIEND_PROFILES.map((friend) => friend.id))
  if (!Array.isArray(value)) return [...DEFAULT_FOLLOWING_IDS]
  const clean = value.filter((id): id is string => typeof id === 'string' && valid.has(id))
  return Array.from(new Set(clean))
}

/**
 * ЭТАП 7 — СТОРИС ДРУЗЕЙ.
 * Валидирует список просмотренных сторис (id друзей) и личные кадры пользователя.
 */
export function sanitizeViewedStoryIds(value: unknown): string[] {
  const valid = new Set(FRIEND_PROFILES.map((friend) => friend.id))
  if (!Array.isArray(value)) return [...DEFAULT_VIEWED_STORY_IDS]
  const clean = value.filter((id): id is string => typeof id === 'string' && valid.has(id))
  return Array.from(new Set(clean))
}

/**
 * ЭТАП 11 — СИСТЕМА ДРУЗЕЙ.
 * Валидирует взаимных друзей, заявки и скрытые рекомендации. Все id
 * сверяются с социальной картой, чтобы в сторе не появлялись «мёртвые» ссылки.
 */
export function sanitizeFriendIds(value: unknown): string[] {
  const valid = new Set(FRIEND_PROFILES.map((friend) => friend.id))
  if (!Array.isArray(value)) return [...DEFAULT_FRIEND_IDS]
  const clean = value.filter((id): id is string => typeof id === 'string' && valid.has(id))
  return Array.from(new Set(clean))
}

/** Валидирует список id заявок в друзья (входящих/исходящих) */
export function sanitizeFriendRequestIds(value: unknown, fallback: string[]): string[] {
  const valid = new Set(FRIEND_PROFILES.map((friend) => friend.id))
  if (!Array.isArray(value)) return [...fallback]
  const clean = value.filter((id): id is string => typeof id === 'string' && valid.has(id))
  return Array.from(new Set(clean))
}

/** Валидирует список скрытых пользователем рекомендаций */
export function sanitizeDismissedSuggestions(value: unknown): string[] {
  const valid = new Set(FRIEND_PROFILES.map((friend) => friend.id))
  if (!Array.isArray(value)) return []
  const clean = value.filter((id): id is string => typeof id === 'string' && valid.has(id))
  return Array.from(new Set(clean))
}

export function sanitizeMyStories(value: unknown): MyStory[] {
  if (!Array.isArray(value)) return []
  const result: MyStory[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const s = raw as Partial<MyStory>
    const headline = typeof s.headline === 'string' ? s.headline.trim().slice(0, 160) : ''
    if (!headline) continue
    const id =
      typeof s.id === 'string' && s.id ? s.id.slice(0, 80) : `my-story-${result.length}`
    if (seen.has(id)) continue
    seen.add(id)
    result.push({
      id,
      createdAtISO: typeof s.createdAtISO === 'string' ? s.createdAtISO : new Date().toISOString(),
      emoji: typeof s.emoji === 'string' && s.emoji.trim() ? s.emoji.trim().slice(0, 8) : '✨',
      kicker:
        typeof s.kicker === 'string' && s.kicker.trim() ? s.kicker.trim().slice(0, 40) : 'СТОРИС',
      headline,
      detail: typeof s.detail === 'string' ? s.detail.slice(0, 240) : '',
      from: typeof s.from === 'string' && s.from ? s.from.slice(0, 40) : '#2a1206',
      to: typeof s.to === 'string' && s.to ? s.to.slice(0, 40) : '#7a2f0c',
      accent: typeof s.accent === 'string' && s.accent ? s.accent.slice(0, 40) : '#ffa600',
      sourceDayId:
        typeof s.sourceDayId === 'number' && Number.isFinite(s.sourceDayId)
          ? s.sourceDayId
          : null,
      sourcePrideIndex:
        typeof s.sourcePrideIndex === 'number' && Number.isFinite(s.sourcePrideIndex)
          ? s.sourcePrideIndex
          : null,
      backgroundId: typeof s.backgroundId === 'string' && s.backgroundId ? s.backgroundId.slice(0, 40) : undefined,
      photo: typeof s.photo === 'string' && s.photo ? s.photo.slice(0, 2000) : null,
      visibility: normalizeVisibility(s.visibility),
    })
  }
  return result
}

/** Допустимые платформы соцсетей профиля */
const PROFILE_PLATFORMS: ProfileSocialPlatform[] = [
  'website',
  'telegram',
  'instagram',
  'github',
  'youtube',
  'x',
  'linkedin',
  'custom',
]

/** Безопасно валидирует ссылки на соцсети профиля */
export function sanitizeSocialLinks(value: unknown): ProfileSocialLink[] {
  if (!Array.isArray(value)) return []
  const result: ProfileSocialLink[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const obj = raw as Partial<ProfileSocialLink>
    const url = typeof obj.url === 'string' ? obj.url.trim().slice(0, 300) : ''
    if (!url) continue
    const platform: ProfileSocialPlatform =
      typeof obj.platform === 'string' && (PROFILE_PLATFORMS as string[]).includes(obj.platform)
        ? (obj.platform as ProfileSocialPlatform)
        : 'custom'
    const id =
      typeof obj.id === 'string' && obj.id ? obj.id : `link-${result.length}-${platform}`
    if (seen.has(id)) continue
    seen.add(id)
    result.push({
      id,
      platform,
      label:
        typeof obj.label === 'string' && obj.label.trim()
          ? obj.label.trim().slice(0, 40)
          : platform,
      url,
    })
  }
  return result
}

export const DEFAULT_PROFILE: OgonekProfile = {
  displayName: 'Алексей Черна',
  username: 'cernavation',
  bio: 'Серийный предприниматель & Барефут-марафонец. Основатель Memernity. Дневник гордости и благодарности — 719 дней осознанности.',
  city: 'Moldova',
  website: 'https://memernity.com',
  joinedLabel: 'August 2024',
  avatarImage: null,
  avatarColor: 'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
  bannerImage: null,
  bannerPreset: 'night-peaks',
  socialLinks: [
    { id: 'link-website', platform: 'website', label: 'Memernity', url: 'https://memernity.com' },
    { id: 'link-telegram', platform: 'telegram', label: 'Telegram', url: 'https://t.me/cernavation' },
  ],
  monthlyGoal: 'Закрыть сделку с Alibaba и вывести партнёрство на новый уровень',
  monthlyGoalUpdatedAtISO: '2026-10-01T09:00:00.000Z',
  verified: true,
}

/** Валидирует и восстанавливает профиль пользователя из хранилища */
export function sanitizeProfile(value: unknown): OgonekProfile {
  if (!value || typeof value !== 'object') return DEFAULT_PROFILE
  const p = value as Partial<OgonekProfile>

  const str = (v: unknown, fallback: string, max = 400): string =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback

  const image = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, 2000) : null

  return {
    displayName: str(p.displayName, DEFAULT_PROFILE.displayName, 80),
    username: str(p.username, DEFAULT_PROFILE.username, 40).replace(/^@/, ''),
    bio: typeof p.bio === 'string' ? p.bio.slice(0, 400) : DEFAULT_PROFILE.bio,
    city: typeof p.city === 'string' ? p.city.slice(0, 80) : DEFAULT_PROFILE.city,
    website: typeof p.website === 'string' ? p.website.slice(0, 300) : DEFAULT_PROFILE.website,
    joinedLabel: str(p.joinedLabel, DEFAULT_PROFILE.joinedLabel, 40),
    avatarImage: image(p.avatarImage),
    avatarColor: str(p.avatarColor, DEFAULT_PROFILE.avatarColor, 300),
    bannerImage: image(p.bannerImage),
    bannerPreset: str(p.bannerPreset, DEFAULT_PROFILE.bannerPreset, 40),
    socialLinks: sanitizeSocialLinks(p.socialLinks),
    monthlyGoal:
      typeof p.monthlyGoal === 'string' ? p.monthlyGoal.slice(0, 200) : DEFAULT_PROFILE.monthlyGoal,
    monthlyGoalUpdatedAtISO: str(
      p.monthlyGoalUpdatedAtISO,
      DEFAULT_PROFILE.monthlyGoalUpdatedAtISO,
      40
    ),
    verified: typeof p.verified === 'boolean' ? p.verified : DEFAULT_PROFILE.verified,
  }
}

const ACHIEVEMENT_STATUSES: AchievementStatus[] = ['draft', 'submitted', 'verified', 'rejected']

function sanitizeEvidenceFiles(value: unknown): AchievementEvidenceFile[] {
  if (!Array.isArray(value)) return []
  const result: AchievementEvidenceFile[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const f = raw as Partial<AchievementEvidenceFile>
    const ref = typeof f.ref === 'string' ? f.ref.trim().slice(0, 2000) : ''
    if (!ref) continue
    const id = typeof f.id === 'string' && f.id ? f.id.slice(0, 80) : `ev-${result.length}`
    if (seen.has(id)) continue
    seen.add(id)
    result.push({
      id,
      requirementId: typeof f.requirementId === 'string' ? f.requirementId.slice(0, 60) : '',
      fileName: typeof f.fileName === 'string' && f.fileName.trim() ? f.fileName.trim().slice(0, 160) : 'evidence',
      ref,
      mime: typeof f.mime === 'string' ? f.mime.slice(0, 100) : 'application/octet-stream',
      size: typeof f.size === 'number' && Number.isFinite(f.size) && f.size >= 0 ? Math.round(f.size) : 0,
      addedAtISO: typeof f.addedAtISO === 'string' ? f.addedAtISO : new Date().toISOString(),
    })
  }
  return result
}

function sanitizeRequirements(value: unknown): AchievementEvidenceRequirement[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((r): r is AchievementEvidenceRequirement => !!r && typeof r === 'object')
    .map((r, index) => ({
      id: typeof r.id === 'string' && r.id ? r.id.slice(0, 60) : `req-${index + 1}`,
      title: typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 120) : 'Файл-доказательство',
      purpose: typeof r.purpose === 'string' ? r.purpose.trim().slice(0, 400) : '',
      formats: Array.isArray(r.formats)
        ? r.formats.filter((x): x is string => typeof x === 'string').slice(0, 6)
        : ['PDF', 'JPG', 'PNG'],
      required: Boolean(r.required),
      example: typeof r.example === 'string' ? r.example.trim().slice(0, 300) : '',
    }))
}

function sanitizeRegulationValue(
  value: unknown,
  categoryId: VerifiedAchievement['categoryId'],
  topic: string
): AchievementRegulation | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<AchievementRegulation>
  const requirements = sanitizeRequirements(v.requirements)
  if (requirements.length === 0) return null

  const strictness: AchievementRegulation['strictness'] =
    v.strictness === 'forensic' || v.strictness === 'basic' || v.strictness === 'strict'
      ? v.strictness
      : 'strict'

  return {
    categoryId,
    interpretedTopic:
      typeof v.interpretedTopic === 'string' && v.interpretedTopic.trim()
        ? v.interpretedTopic.trim().slice(0, 200)
        : topic.slice(0, 200),
    summary: typeof v.summary === 'string' ? v.summary.slice(0, 600) : '',
    requirements,
    verifier: typeof v.verifier === 'string' ? v.verifier.slice(0, 200) : 'Команда верификации Огонька',
    freshnessRule: typeof v.freshnessRule === 'string' ? v.freshnessRule.slice(0, 300) : '',
    rejectionCriteria: Array.isArray(v.rejectionCriteria)
      ? v.rejectionCriteria.filter((x): x is string => typeof x === 'string').slice(0, 8)
      : [],
    strictness,
    aiGenerated: Boolean(v.aiGenerated),
  }
}

/** Валидирует массив верифицированных ачивок из хранилища */
export function sanitizeVerifiedAchievements(value: unknown): VerifiedAchievement[] {
  if (!Array.isArray(value)) return []
  const result: VerifiedAchievement[] = []
  const seen = new Set<string>()

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const a = raw as Partial<VerifiedAchievement>
    if (!isAchievementCategoryId(a.categoryId)) continue

    const id = typeof a.id === 'string' && a.id ? a.id.slice(0, 80) : `va-${result.length}`
    if (seen.has(id)) continue
    seen.add(id)

    const topic = typeof a.topic === 'string' ? a.topic.slice(0, 300) : ''
    const title =
      typeof a.title === 'string' && a.title.trim() ? a.title.trim().slice(0, 120) : 'Ачивка'
    const status: AchievementStatus =
      typeof a.status === 'string' && (ACHIEVEMENT_STATUSES as string[]).includes(a.status)
        ? (a.status as AchievementStatus)
        : 'draft'

    result.push({
      id,
      categoryId: a.categoryId,
      title,
      topic,
      achievedAtISO: typeof a.achievedAtISO === 'string' ? a.achievedAtISO : new Date().toISOString(),
      status,
      regulation: sanitizeRegulationValue(a.regulation, a.categoryId, topic),
      evidence: sanitizeEvidenceFiles(a.evidence),
      submittedAtISO: typeof a.submittedAtISO === 'string' ? a.submittedAtISO : null,
      verifiedAtISO: typeof a.verifiedAtISO === 'string' ? a.verifiedAtISO : null,
      reviewerNote: typeof a.reviewerNote === 'string' ? a.reviewerNote.slice(0, 600) : null,
      submission: sanitizeSubmission(a.submission),
      createdAtISO: typeof a.createdAtISO === 'string' ? a.createdAtISO : new Date().toISOString(),
    })
  }

  return result
}

/**
 * Демонстрационные верифицированные ачивки для ДЕМО-режима.
 * Повторяют реальные достижения профиля Алексея Черна:
 * регламенты построены тем же движком, что и в интерфейсе.
 */
function buildDemoAchievements(now: Date = new Date()): VerifiedAchievement[] {
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString()

  const marathonTopic = 'Финишировал полный марафон 42,2 км босиком на официальном забеге'
  const businessTopic = 'Получил первую реальную оплату подписки Memernity'
  const streakTopic = '719 дней подряд вёл дневник гордости без единого пропуска'

  return [
    {
      id: 'va-marathon',
      categoryId: 'sport-record',
      title: '42,2 км босиком',
      topic: marathonTopic,
      achievedAtISO: daysAgo(140),
      status: 'verified',
      regulation: regulateAchievement('sport-record', marathonTopic, true),
      evidence: [
        {
          id: 'va-marathon-ev-1',
          requirementId: 'sport-protocol',
          fileName: 'protocol-42km.pdf',
          ref: 'https://results.example.org/marathon/protocol.pdf',
          mime: 'application/pdf',
          size: 284_512,
          addedAtISO: daysAgo(139),
        },
        {
          id: 'va-marathon-ev-2',
          requirementId: 'sport-barefoot-video',
          fileName: 'finish-barefoot.mp4',
          ref: 'https://videos.example.org/finish-barefoot',
          mime: 'video/mp4',
          size: 18_400_000,
          addedAtISO: daysAgo(139),
        },
      ],
      submittedAtISO: daysAgo(138),
      verifiedAtISO: daysAgo(135),
      reviewerNote: 'Протокол и видео совпадают: дистанция полная, обуви нет. Легендарный статус подтверждён.',
      submission: {
        id: 'sub-marathon',
        trackingCode: 'OGN-42KMBD',
        status: 'officially-verified',
        description:
          'Финишировал полный марафон 42,2 км босиком на официальном забеге. Приложены протокол организатора и видео финиша.',
        contactEmail: 'alexei@memernity.com',
        submittedAtISO: daysAgo(138),
        decidedAtISO: daysAgo(135),
        moderatorNote: 'Протокол и видео совпадают: дистанция полная, обуви нет. Золотой бейдж выдан.',
        channel: 'email',
        delivery: 'sent',
        recipient: 'moderation@ogonyok.app',
        evidenceCount: 2,
        history: [
          {
            id: 'rev-mar-0',
            atISO: daysAgo(138),
            status: 'on-moderation',
            note: 'Пакет доказательств отправлен модератору (Email (Resend)).',
            actor: 'Огонёк · автоотправка',
          },
          {
            id: 'rev-mar-1',
            atISO: daysAgo(136),
            status: 'on-moderation',
            note: 'Первичная сверка протокола с базой результатов организатора.',
            actor: 'Модератор Огонька',
          },
          {
            id: 'rev-mar-2',
            atISO: daysAgo(135),
            status: 'officially-verified',
            note: 'Протокол и видео совпадают: дистанция полная, обуви нет.',
            actor: 'Модератор Огонька',
          },
        ],
      },
      createdAtISO: daysAgo(140),
    },
    {
      id: 'va-memernity',
      categoryId: 'business',
      title: 'Первая выручка Memernity',
      topic: businessTopic,
      achievedAtISO: daysAgo(30),
      status: 'submitted',
      regulation: regulateAchievement('business', businessTopic, true),
      evidence: [
        {
          id: 'va-memernity-ev-1',
          requirementId: 'biz-revenue',
          fileName: 'stripe-first-payment.png',
          ref: 'https://payments.example.org/stripe/first-payment',
          mime: 'image/png',
          size: 512_300,
          addedAtISO: daysAgo(1),
        },
      ],
      submittedAtISO: daysAgo(1),
      verifiedAtISO: null,
      reviewerNote: null,
      submission: {
        id: 'sub-memernity',
        trackingCode: 'OGN-STRIPE',
        status: 'on-moderation',
        description:
          'Первая реальная оплата подписки Memernity от клиента. Скриншот дашборда Stripe с суммой и датой приложен.',
        contactEmail: 'alexei@memernity.com',
        submittedAtISO: daysAgo(1),
        decidedAtISO: null,
        moderatorNote: null,
        channel: 'webhook',
        delivery: 'sent',
        recipient: 'moderation@ogonyok.app',
        evidenceCount: 1,
        history: [
          {
            id: 'rev-mem-0',
            atISO: daysAgo(1),
            status: 'on-moderation',
            note: 'Пакет доказательств отправлен модератору (Webhook).',
            actor: 'Огонёк · автоотправка',
          },
        ],
      },
      createdAtISO: daysAgo(30),
    },
    {
      id: 'va-streak',
      categoryId: 'discipline',
      title: '719 дней дисциплины',
      topic: streakTopic,
      achievedAtISO: now.toISOString(),
      status: 'draft',
      regulation: regulateAchievement('discipline', streakTopic, true),
      evidence: [],
      submittedAtISO: null,
      verifiedAtISO: null,
      reviewerNote: null,
      submission: null,
      createdAtISO: now.toISOString(),
    },
  ]
}

export const DEFAULT_VERIFIED_ACHIEVEMENTS: VerifiedAchievement[] = buildDemoAchievements()

/** Друзья, чьи сторис уже «просмотрены» в демо — кружочки гаснут в серый */
export const DEFAULT_VIEWED_STORY_IDS: string[] = ['fr-timofeev', 'fr-lanskaya']

/** Демо-кадры личной истории пользователя */
export const DEFAULT_MY_STORIES: MyStory[] = buildDemoMyStories()

/** ЭТАП 10: демо-история утренних фокусов за последние дни */
const DEMO_MORNING_FOCUS = buildDemoMorningFocus(new Date().toISOString().split('T')[0])

export const DEFAULT_STORE_STATE: OgonekStoreState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  days: INITIAL_DAYS,
  verifiedAchievements: DEFAULT_VERIFIED_ACHIEVEMENTS,
  morningIntentions: DEMO_MORNING_FOCUS.intentions,
  morningFocusHistory: DEMO_MORNING_FOCUS.history,
  composerDraft: null,
  evidenceItems: EVIDENCE_ITEMS,
  evidenceFavorites: ['ev-1', 'ev-2'],
  soundEnabled: true,
  pinEnabled: false,
  isDemo: true,
  customEmojis: DEFAULT_CUSTOM_EMOJIS,
  dayReactions: {},
  myReactions: {},
  comments: {},
  profile: DEFAULT_PROFILE,
  followingIds: DEFAULT_FOLLOWING_IDS,
  viewedStoryIds: DEFAULT_VIEWED_STORY_IDS,
  myStories: DEFAULT_MY_STORIES,
  friendIds: DEFAULT_FRIEND_IDS,
  incomingFriendRequests: DEFAULT_INCOMING_FRIEND_REQUEST_IDS,
  outgoingFriendRequests: DEFAULT_OUTGOING_FRIEND_REQUEST_IDS,
  dismissedSuggestions: [],
}

export function loadStore(adapter: StorageAdapter = defaultStorageAdapter): OgonekStoreState {
  try {
    const raw = adapter.getItem(STORAGE_KEY)
    if (!raw) {
      // Attempt migration from legacy storage keys
      const legacyV3 = adapter.getItem('ogonyok.v3.store')
      const legacyV1 = adapter.getItem('ogonyok.v1')
      const legacyOld = adapter.getItem('pridegrat.v_final_v2')

      if (legacyV3) {
        try {
          const parsedV3 = JSON.parse(legacyV3) as Partial<OgonekStoreState>
          if (parsedV3 && Array.isArray(parsedV3.days) && parsedV3.days.length > 0) {
            const v3History = sanitizeMorningFocusHistory(parsedV3.morningFocusHistory)
            const migratedState: OgonekStoreState = {
              schemaVersion: CURRENT_SCHEMA_VERSION,
              days: parsedV3.days,
              verifiedAchievements: sanitizeVerifiedAchievements(parsedV3.verifiedAchievements),
              morningIntentions: parsedV3.morningIntentions || {},
              morningFocusHistory:
                Object.keys(v3History).length > 0
                  ? v3History
                  : migrateIntentionsToHistory(parsedV3.morningIntentions),
              composerDraft: parsedV3.composerDraft || null,
              evidenceItems: parsedV3.evidenceItems || DEFAULT_STORE_STATE.evidenceItems,
              evidenceFavorites: parsedV3.evidenceFavorites || DEFAULT_STORE_STATE.evidenceFavorites,
              soundEnabled: typeof parsedV3.soundEnabled === 'boolean' ? parsedV3.soundEnabled : true,
              pinEnabled: typeof parsedV3.pinEnabled === 'boolean' ? parsedV3.pinEnabled : false,
              isDemo: false,
              customEmojis: sanitizeCustomEmojis(parsedV3.customEmojis),
              dayReactions: sanitizeReactions(parsedV3.dayReactions),
              myReactions: sanitizeMyReactions(parsedV3.myReactions),
              comments: sanitizeComments(parsedV3.comments),
              profile: sanitizeProfile(parsedV3.profile),
              followingIds: sanitizeFollowingIds(parsedV3.followingIds),
              viewedStoryIds: sanitizeViewedStoryIds(parsedV3.viewedStoryIds),
              myStories: sanitizeMyStories(parsedV3.myStories),
              friendIds: sanitizeFriendIds(parsedV3.friendIds),
              incomingFriendRequests: sanitizeFriendRequestIds(
                parsedV3.incomingFriendRequests,
                DEFAULT_INCOMING_FRIEND_REQUEST_IDS
              ),
              outgoingFriendRequests: sanitizeFriendRequestIds(
                parsedV3.outgoingFriendRequests,
                DEFAULT_OUTGOING_FRIEND_REQUEST_IDS
              ),
              dismissedSuggestions: sanitizeDismissedSuggestions(parsedV3.dismissedSuggestions),
            }
            saveStore(migratedState, adapter)
            return migratedState
          }
        } catch {
          // Fall through
        }
      }

      if (legacyV1 || legacyOld) {
        try {
          const candidate = (legacyV1 || legacyOld) as string
          const parsedLegacy = JSON.parse(candidate) as { items?: unknown[] }
          if (parsedLegacy && Array.isArray(parsedLegacy.items) && parsedLegacy.items.length > 0) {
            // Legacy items exist
            const migratedState: OgonekStoreState = {
              ...DEFAULT_STORE_STATE,
              schemaVersion: CURRENT_SCHEMA_VERSION,
              isDemo: false,
            }
            saveStore(migratedState, adapter)
            return migratedState
          }
        } catch {
          // Fall through
        }
      }

      return DEFAULT_STORE_STATE
    }

    try {
      const parsed = JSON.parse(raw) as Partial<OgonekStoreState>
      if (!parsed || typeof parsed !== 'object') {
        return DEFAULT_STORE_STATE
      }

      const days: Day[] = Array.isArray(parsed.days) && parsed.days.length > 0
        ? parsed.days
        : DEFAULT_STORE_STATE.days

      const sortedDays = [...days].sort((a, b) => {
        const ta = a.dateISO ? new Date(a.dateISO).getTime() : a.id * 86400000
        const tb = b.dateISO ? new Date(b.dateISO).getTime() : b.id * 86400000
        return tb - ta // newest first
      })

      const morningIntentions =
        parsed.morningIntentions && typeof parsed.morningIntentions === 'object'
          ? parsed.morningIntentions
          : {}

      const morningFocusHistoryRaw = sanitizeMorningFocusHistory(parsed.morningFocusHistory)
      const morningFocusHistory =
        Object.keys(morningFocusHistoryRaw).length > 0
          ? morningFocusHistoryRaw
          : migrateIntentionsToHistory(morningIntentions)

      const composerDraft =
        parsed.composerDraft && typeof parsed.composerDraft === 'object'
          ? parsed.composerDraft
          : null

      const evidenceItems =
        Array.isArray(parsed.evidenceItems) && parsed.evidenceItems.length > 0
          ? parsed.evidenceItems
          : DEFAULT_STORE_STATE.evidenceItems

      const evidenceFavorites =
        Array.isArray(parsed.evidenceFavorites)
          ? parsed.evidenceFavorites
          : DEFAULT_STORE_STATE.evidenceFavorites

      const soundEnabled = typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true
      const pinEnabled = typeof parsed.pinEnabled === 'boolean' ? parsed.pinEnabled : false
      const isDemo = typeof parsed.isDemo === 'boolean' ? parsed.isDemo : false

      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        days: sortedDays,
        verifiedAchievements: Array.isArray(parsed.verifiedAchievements)
          ? sanitizeVerifiedAchievements(parsed.verifiedAchievements)
          : DEFAULT_STORE_STATE.verifiedAchievements,
        morningIntentions,
        morningFocusHistory,
        composerDraft,
        evidenceItems,
        evidenceFavorites,
        soundEnabled,
        pinEnabled,
        isDemo,
        customEmojis: sanitizeCustomEmojis(parsed.customEmojis),
        dayReactions: sanitizeReactions(parsed.dayReactions),
        myReactions: sanitizeMyReactions(parsed.myReactions),
        comments: sanitizeComments(parsed.comments),
        profile: sanitizeProfile(parsed.profile),
        followingIds: sanitizeFollowingIds(parsed.followingIds),
        viewedStoryIds: sanitizeViewedStoryIds(parsed.viewedStoryIds),
        myStories: sanitizeMyStories(parsed.myStories),
        friendIds: sanitizeFriendIds(parsed.friendIds),
        incomingFriendRequests: sanitizeFriendRequestIds(
          parsed.incomingFriendRequests,
          DEFAULT_INCOMING_FRIEND_REQUEST_IDS
        ),
        outgoingFriendRequests: sanitizeFriendRequestIds(
          parsed.outgoingFriendRequests,
          DEFAULT_OUTGOING_FRIEND_REQUEST_IDS
        ),
        dismissedSuggestions: sanitizeDismissedSuggestions(parsed.dismissedSuggestions),
      }
    } catch {
      // Corrupt JSON: save recovery copy and return defaults
      const corruptKey = `${STORAGE_KEY}.corrupt.${Date.now()}`
      adapter.setItem(corruptKey, raw)
      console.warn(`Corrupt storage detected. Backup saved to ${corruptKey}`)
      return DEFAULT_STORE_STATE
    }
  } catch {
    return DEFAULT_STORE_STATE
  }
}

export function saveStore(
  state: OgonekStoreState,
  adapter: StorageAdapter = defaultStorageAdapter
): void {
  try {
    const serialized = JSON.stringify(state)
    adapter.setItem(STORAGE_KEY, serialized)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<OgonekStoreState>('ogonek-store-updated', { detail: state })
      )
    }
  } catch (err) {
    console.error('Failed to save store:', err)
  }
}

export function exportStoreAsJson(state: OgonekStoreState): string {
  const exportPayload = {
    ...state,
    exportedAt: new Date().toISOString(),
    generator: 'Ogonek Life Journal v2',
  }
  return JSON.stringify(exportPayload, null, 2)
}

export function validateAndImportJson(
  rawJson: string
): { success: true; data: OgonekStoreState } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Файл не содержит корректный объект JSON' }
    }

    if (!Array.isArray(parsed.days)) {
      return { success: false, error: 'В файле отсутствует массив дней ("days")' }
    }

    const validatedDays: Day[] = (parsed.days as unknown[]).map((item, index) => {
      const d = item as Partial<Day>
      return {
        id: typeof d.id === 'number' ? d.id : index + 1,
        title: typeof d.title === 'string' ? d.title : 'Запись дня',
        tags: Array.isArray(d.tags)
          ? d.tags.filter((t): t is string => typeof t === 'string')
          : ['Для тебя'],
        prides: Array.isArray(d.prides)
          ? d.prides.map((p) => ({
              num: typeof p.num === 'string' ? p.num : '01',
              text: typeof p.text === 'string' ? p.text : '',
              scale: typeof p.scale === 'number' ? p.scale : 0,
              overcome: (typeof p.overcome === 'number' ? Math.min(3, Math.max(0, Math.round(p.overcome))) : 0) as 0 | 1 | 2 | 3,
              visibility: normalizeVisibility(p.visibility),
            }))
          : [],
        gratitudes: Array.isArray(d.gratitudes)
          ? d.gratitudes.map((g) => {
              if (typeof g === 'string') return g
              if (g && typeof g === 'object') {
                const obj = g as { num?: unknown; text?: unknown; rating?: unknown }
                if (typeof obj.text === 'string') {
                  return {
                    num: typeof obj.num === 'string' ? obj.num : undefined,
                    text: obj.text,
                    rating: typeof obj.rating === 'number' ? obj.rating : 10,
                  }
                }
              }
              return String(g || '')
            })
          : [],
        photos: Array.isArray(d.photos)
          ? d.photos.filter((p): p is string => typeof p === 'string')
          : undefined,
        dateISO: typeof d.dateISO === 'string' ? d.dateISO : undefined,
        status: d.status === 'missed' ? 'missed' : 'normal',
        visibility: normalizeVisibility(d.visibility),
      }
    })

    const validatedEvidence: EvidenceItem[] = Array.isArray(parsed.evidenceItems)
      ? (parsed.evidenceItems as unknown[]).map((ev, i) => {
          const e = ev as Partial<EvidenceItem>
          return {
            id: typeof e.id === 'string' ? e.id : `ev-${i + 1}`,
            date: typeof e.date === 'string' ? e.date : new Date().toLocaleDateString('ru-RU'),
            title: typeof e.title === 'string' ? e.title : 'Факт силы',
            description: typeof e.description === 'string' ? e.description : '',
            category: typeof e.category === 'string' ? e.category : 'Все',
            pinned: Boolean(e.pinned),
          }
        })
      : DEFAULT_STORE_STATE.evidenceItems

    const morningIntentions = (
      parsed.morningIntentions && typeof parsed.morningIntentions === 'object'
        ? parsed.morningIntentions
        : {}
    ) as Record<string, [string, string, string]>

    const importedHistoryRaw = sanitizeMorningFocusHistory(parsed.morningFocusHistory)
    const morningFocusHistory =
      Object.keys(importedHistoryRaw).length > 0
        ? importedHistoryRaw
        : migrateIntentionsToHistory(morningIntentions)

    const sortedValidated = (validatedDays.length > 0 ? validatedDays : DEFAULT_STORE_STATE.days).sort((a, b) => {
      const ta = a.dateISO ? new Date(a.dateISO).getTime() : a.id * 86400000
      const tb = b.dateISO ? new Date(b.dateISO).getTime() : b.id * 86400000
      return tb - ta
    })

    const state: OgonekStoreState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      days: sortedValidated,
      verifiedAchievements: sanitizeVerifiedAchievements(parsed.verifiedAchievements),
      morningIntentions,
      morningFocusHistory,
      composerDraft: null,
      evidenceItems: validatedEvidence,
      evidenceFavorites: Array.isArray(parsed.evidenceFavorites)
        ? (parsed.evidenceFavorites as string[])
        : DEFAULT_STORE_STATE.evidenceFavorites,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      pinEnabled: typeof parsed.pinEnabled === 'boolean' ? parsed.pinEnabled : false,
      isDemo: false,
      customEmojis: sanitizeCustomEmojis(parsed.customEmojis),
      dayReactions: sanitizeReactions(parsed.dayReactions),
      myReactions: sanitizeMyReactions(parsed.myReactions),
      comments: sanitizeComments(parsed.comments),
      profile: sanitizeProfile(parsed.profile),
      followingIds: sanitizeFollowingIds(parsed.followingIds),
      viewedStoryIds: sanitizeViewedStoryIds(parsed.viewedStoryIds),
      myStories: sanitizeMyStories(parsed.myStories),
      friendIds: sanitizeFriendIds(parsed.friendIds),
      incomingFriendRequests: sanitizeFriendRequestIds(
        parsed.incomingFriendRequests,
        DEFAULT_INCOMING_FRIEND_REQUEST_IDS
      ),
      outgoingFriendRequests: sanitizeFriendRequestIds(
        parsed.outgoingFriendRequests,
        DEFAULT_OUTGOING_FRIEND_REQUEST_IDS
      ),
      dismissedSuggestions: sanitizeDismissedSuggestions(parsed.dismissedSuggestions),
    }

    return { success: true, data: state }
  } catch {
    return { success: false, error: 'Синтаксическая ошибка в JSON файле' }
  }
}
