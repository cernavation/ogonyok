/**
 * ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ ДЛЯ ЛИМИТОВ И РАЗРЕШЕНИЙ ТАРИФОВ (ЭТАП 4)
 * 
 * Чистые детерминированные функции без обращения к сети.
 * Используется как на клиенте (UI-подсказки, валидация полей ввода),
 * так и на сервере (API-маршруты, валидация перед записью в БД).
 */

export type SubscriptionTier = 'free' | 'pro' | 'ultra'

export interface TierLimits {
  /** Максимальное количество символов в одной записи гордости или благодарности */
  maxCharsPerEntry: number
  /** Лимит ИИ-оценок летописи в сутки */
  aiEvaluationsPerDay: number
  /** Лимит прикрепляемых фотографий в день */
  maxPhotosPerDay: number
  /** Лимит создаваемых групп / сообществ */
  maxGroupsOwned: number
  /** Максимум участников в созданной группе */
  maxGroupMembers: number
  /** Максимум историй (Stories) в день */
  maxStoriesPerDay: number
  /** Максимум запланированных сообщений */
  maxScheduledMessages: number
  /** Максимальная длительность одного голосового сообщения в секундах */
  maxVoiceSeconds: number
  /** Разрешены ли видеозвонки (аудиозвонки бесплатны для всех) */
  videoCalls: boolean
  /** Детализация отчёта о вехах */
  milestoneReport: 'basic' | 'stats' | 'deep'
  /** Глубина аналитики стрика */
  statsDepth: 'basic' | 'advanced'
  /** Лимит заявок в соратники в сутки (free 20, pro 50, ultra 100) */
  friendRequestsPerDay: number
  /** Лимит сообщений в чат в минуту (антиспам 30/мин для всех) */
  chatMessagesPerMinute: number
  /** Лимит поисковых запросов профилей в минуту (60/мин для всех) */
  profileSearchesPerMinute: number
}

/**
 * ЧЕЛОВЕКОЧИТАЕМЫЕ НАЗВАНИЯ ТАРИФОВ
 */
export const TIER_NAMES: Record<SubscriptionTier, string> = {
  free: 'Базовый',
  pro: 'Премиум',
  ultra: 'Основатель Ultra',
}

/**
 * БЕЙДЖИ ДЛЯ ПРОФИЛЯ И КАРТОЧЕК
 */
export const TIER_BADGES: Record<SubscriptionTier, string | null> = {
  free: null,
  pro: '★ PREMIUM',
  ultra: '⚡ ULTRA FOUNDER',
}

/**
 * БАЗОВЫЕ ЧИСЛОВЫЕ КОНСТАНТЫ ЛИМИТОВ ПО ТАРИФАМ
 */
export const TIER_LIMITS_MAP: Record<SubscriptionTier, Readonly<TierLimits>> = {
  free: {
    maxCharsPerEntry: 1000,
    aiEvaluationsPerDay: 0,
    maxPhotosPerDay: 0,
    maxGroupsOwned: 1,
    maxGroupMembers: 5,
    maxStoriesPerDay: 1,
    maxScheduledMessages: 3,
    maxVoiceSeconds: 60,
    videoCalls: false,
    milestoneReport: 'basic',
    statsDepth: 'basic',
    friendRequestsPerDay: 20,
    chatMessagesPerMinute: 30,
    profileSearchesPerMinute: 60,
  },
  pro: {
    maxCharsPerEntry: 3000,
    aiEvaluationsPerDay: 1,
    maxPhotosPerDay: 1,
    maxGroupsOwned: 5,
    maxGroupMembers: 25,
    maxStoriesPerDay: 5,
    maxScheduledMessages: 20,
    maxVoiceSeconds: 300,
    videoCalls: true,
    milestoneReport: 'stats',
    statsDepth: 'advanced',
    friendRequestsPerDay: 50,
    chatMessagesPerMinute: 30,
    profileSearchesPerMinute: 60,
  },
  ultra: {
    maxCharsPerEntry: 5000,
    aiEvaluationsPerDay: 1,
    maxPhotosPerDay: 3,
    maxGroupsOwned: 20,
    maxGroupMembers: 100,
    maxStoriesPerDay: 15,
    maxScheduledMessages: 100,
    maxVoiceSeconds: 600,
    videoCalls: true,
    milestoneReport: 'deep',
    statsDepth: 'advanced',
    friendRequestsPerDay: 100,
    chatMessagesPerMinute: 30,
    profileSearchesPerMinute: 60,
  },
}

/**
 * Нормализует тариф с учётом срока действия подписки.
 * Если подписка истекла (validUntil < now), автоматически возвращает 'free'.
 * Устаревший тариф 'premium' приводится к 'pro'.
 */
export function normalizeTier(rawTier: unknown, validUntil?: string | null): SubscriptionTier {
  if (typeof rawTier !== 'string') return 'free'
  const clean = rawTier.trim().toLowerCase()

  let candidate: SubscriptionTier = 'free'
  if (clean === 'pro' || clean === 'premium') {
    candidate = 'pro'
  } else if (clean === 'ultra') {
    candidate = 'ultra'
  } else {
    return 'free'
  }

  // Проверка срока действия подписки для платных тарифов
  if (validUntil) {
    const expiresAt = new Date(validUntil).getTime()
    if (!isNaN(expiresAt) && expiresAt < Date.now()) {
      return 'free'
    }
  }

  return candidate
}

/**
 * Получить лимиты для указанного тарифа и даты окончания
 */
export function getTierLimits(rawTier: unknown, validUntil?: string | null): TierLimits {
  const effective = normalizeTier(rawTier, validUntil)
  return { ...TIER_LIMITS_MAP[effective] }
}

/**
 * Проверка лимита символов на одну гордость или благодарность
 */
export function canCreatePride(
  rawTier: unknown,
  charCount: number,
  validUntil?: string | null
): { allowed: boolean; max: number; error?: string } {
  const limits = getTierLimits(rawTier, validUntil)
  const max = limits.maxCharsPerEntry
  if (charCount > max) {
    const tier = normalizeTier(rawTier, validUntil)
    return {
      allowed: false,
      max,
      error: `Превышен лимит тарифа ${TIER_NAMES[tier]}: ${charCount} / ${max} символов`,
    }
  }
  return { allowed: true, max }
}

/**
 * Проверка лимита фото в день
 */
export function canAddPhoto(
  rawTier: unknown,
  currentPhotosToday: number,
  validUntil?: string | null
): { allowed: boolean; max: number; error?: string } {
  const limits = getTierLimits(rawTier, validUntil)
  const max = limits.maxPhotosPerDay
  if (max === 0) {
    return {
      allowed: false,
      max: 0,
      error: 'Прикрепление фото доступно только на тарифах Премиум и Ultra',
    }
  }
  if (currentPhotosToday >= max) {
    return {
      allowed: false,
      max,
      error: `Достигнут лимит фото в день: ${currentPhotosToday} / ${max}`,
    }
  }
  return { allowed: true, max }
}

/**
 * Разрешены ли видеозвонки
 */
export function canMakeVideoCall(rawTier: unknown, validUntil?: string | null): boolean {
  return getTierLimits(rawTier, validUntil).videoCalls
}

/**
 * Лимит на создание Stories в день
 */
export function canCreateStory(
  rawTier: unknown,
  currentStoriesToday: number,
  validUntil?: string | null
): { allowed: boolean; max: number } {
  const max = getTierLimits(rawTier, validUntil).maxStoriesPerDay
  return { allowed: currentStoriesToday < max, max }
}

/**
 * Лимит на отложенные сообщения
 */
export function canScheduleMessage(
  rawTier: unknown,
  currentScheduled: number,
  validUntil?: string | null
): { allowed: boolean; max: number } {
  const max = getTierLimits(rawTier, validUntil).maxScheduledMessages
  return { allowed: currentScheduled < max, max }
}

/**
 * Лимит на ИИ-оценку летописи
 */
export function canRequestAiEvaluation(
  rawTier: unknown,
  usedToday: number,
  validUntil?: string | null
): { allowed: boolean; max: number; error?: string } {
  const max = getTierLimits(rawTier, validUntil).aiEvaluationsPerDay
  if (max === 0) {
    return {
      allowed: false,
      max: 0,
      error: 'ИИ-оценка дня доступна только на тарифах Премиум и Ultra',
    }
  }
  if (usedToday >= max) {
    return {
      allowed: false,
      max,
      error: 'ИИ-оценка на сегодня уже получена (1 оценка в день)',
    }
  }
  return { allowed: true, max }
}

/**
 * Лимит на отправку заявок в соратники в сутки
 */
export function canSendFriendRequest(
  rawTier: unknown,
  sentToday: number,
  validUntil?: string | null
): { allowed: boolean; max: number; error?: string } {
  const max = getTierLimits(rawTier, validUntil).friendRequestsPerDay
  if (sentToday >= max) {
    return {
      allowed: false,
      max,
      error: `Превышен суточный лимит заявок в соратники (${max} в день для вашего тарифа)`,
    }
  }
  return { allowed: true, max }
}

/**
 * Активен ли платный тариф (pro или ultra)
 */
export function isPaidTierActive(rawTier: unknown, validUntil?: string | null): boolean {
  const tier = normalizeTier(rawTier, validUntil)
  return tier === 'pro' || tier === 'ultra'
}

export interface BillingCheckoutParams {
  tier: 'pro' | 'ultra'
  username: string
  period?: 'month' | 'year'
}

/**
 * Генерация платёжной ссылки Memernity Checkout
 */
export function getBillingCheckoutUrl(
  tierOrParams: 'pro' | 'ultra' | BillingCheckoutParams,
  username?: string,
  period: 'month' | 'year' = 'month'
): string {
  if (typeof tierOrParams === 'object' && tierOrParams !== null) {
    const cleanUser = (tierOrParams.username || '').replace(/^@+/, '').trim()
    const p = tierOrParams.period || 'month'
    return `https://memernity.com/checkout?service=ogonek&tier=${tierOrParams.tier}&username=${encodeURIComponent(cleanUser)}&period=${p}`
  }
  const cleanUser = (username || '').replace(/^@+/, '').trim()
  return `https://memernity.com/checkout?service=ogonek&tier=${tierOrParams}&username=${encodeURIComponent(cleanUser)}&period=${period}`
}

/**
 * Определение надписи кнопки оплаты: если платный тариф уже активен — «Продлить», иначе «Оформить»
 */
export function getPaymentButtonLabel(
  currentTier: unknown,
  targetTier: 'pro' | 'ultra',
  validUntil?: string | null
): string {
  const active = normalizeTier(currentTier, validUntil)
  if (active === targetTier) {
    return 'Продлить'
  }
  if (active === 'pro' && targetTier === 'ultra') {
    return 'Улучшить до Ultra'
  }
  return 'Оформить'
}
