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
  /** Лимит заявок в друзья в сутки (free 20, pro 50, ultra 100) */
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
 * Лимит на создание групп (сообществ) по тарифу (free 1, pro 5, ultra 20)
 */
export function canCreateGroup(
  rawTier: unknown,
  currentOwnedGroups: number,
  validUntil?: string | null
): { allowed: boolean; max: number; error?: string } {
  const limits = getTierLimits(rawTier, validUntil)
  const max = limits.maxGroupsOwned
  if (currentOwnedGroups >= max) {
    const tier = normalizeTier(rawTier, validUntil)
    return {
      allowed: false,
      max,
      error: `Достигнут лимит созданных групп для тарифа ${TIER_NAMES[tier]}: ${currentOwnedGroups} / ${max}`,
    }
  }
  return { allowed: true, max }
}

/**
 * Лимит участников в группе по тарифу владельца (free 5, pro 25, ultra 100)
 */
export function canAddGroupMember(
  rawTier: unknown,
  currentMembersCount: number,
  validUntil?: string | null
): { allowed: boolean; max: number; error?: string } {
  const limits = getTierLimits(rawTier, validUntil)
  const max = limits.maxGroupMembers
  if (currentMembersCount >= max) {
    const tier = normalizeTier(rawTier, validUntil)
    return {
      allowed: false,
      max,
      error: `Достигнут лимит участников группы для тарифа ${TIER_NAMES[tier]}: ${currentMembersCount} / ${max}`,
    }
  }
  return { allowed: true, max }
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
 * Лимит на отправку заявок в друзья в сутки
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
      error: `Превышен суточный лимит заявок в друзья (${max} в день для вашего тарифа)`,
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

/**
 * ЦЕНЫ ТАРИФОВ (ЭТАПЫ 4 И 13)
 * Единый источник истины: Free 0 MDL, Pro 25 MDL (240 MDL/год), Ultra 50 MDL (480 MDL/год).
 */
export interface TierPriceInfo {
  monthly: number
  yearly: number
  currency: string
  discountBadge?: string
  formattedMonthly: string
  formattedYearly: string
}

export const TIER_PRICES: Record<SubscriptionTier, TierPriceInfo> = {
  free: {
    monthly: 0,
    yearly: 0,
    currency: 'MDL',
    formattedMonthly: '0 MDL',
    formattedYearly: 'Бесплатно навсегда',
  },
  pro: {
    monthly: 25,
    yearly: 240,
    currency: 'MDL',
    discountBadge: '-20%',
    formattedMonthly: '25 MDL / мес',
    formattedYearly: '240 MDL / год',
  },
  ultra: {
    monthly: 50,
    yearly: 480,
    currency: 'MDL',
    discountBadge: '-20%',
    formattedMonthly: '50 MDL / мес',
    formattedYearly: '480 MDL / год',
  },
}

/**
 * ОПИСАНИЕ ВОЗМОЖНОСТЕЙ ТАРИФОВ ДЛЯ КАРТОЧЕК И АПСЕЛЛОВ
 * Генерируется на базе permissions.ts — единый источник истины.
 */
export interface TierFeatureItem {
  id: string
  text: string
  included: boolean
  highlight?: boolean
}

export const TIER_FEATURES_LIST: Record<SubscriptionTier, TierFeatureItem[]> = {
  free: [
    { id: 'chars', text: 'До 1 000 символов на одну запись', included: true },
    { id: 'audio', text: 'Аудиозвонки P2P без ограничений', included: true },
    { id: 'groups', text: '1 группа (до 5 участников)', included: true },
    { id: 'stories', text: '1 история (Story) в день', included: true },
    { id: 'analytics', text: 'Базовая аналитика стрика', included: true },
    { id: 'photos', text: 'Прикрепление фото к записям', included: false },
    { id: 'ai', text: 'ИИ-оценка летописи нейросетью Gemini', included: false },
    { id: 'video', text: 'HD видеозвонки', included: false },
  ],
  pro: [
    { id: 'chars', text: 'До 3 000 символов на запись (в 3 раза больше)', included: true, highlight: true },
    { id: 'photos', text: '1 фото высокого качества в день', included: true },
    { id: 'ai', text: '1 ИИ-оценка дня нейросетью Google Gemini', included: true, highlight: true },
    { id: 'video', text: 'Зашифрованные видеозвонки HD', included: true },
    { id: 'groups', text: 'До 5 групп (до 25 участников в каждой)', included: true },
    { id: 'badge', text: 'Синяя галочка и значок ★ PREMIUM', included: true },
    { id: 'analytics', text: 'Расширенная аналитика и когорты стрика', included: true },
    { id: 'stories', text: 'До 5 историй и 20 отложенных сообщений', included: true },
  ],
  ultra: [
    { id: 'chars', text: 'До 5 000 символов на запись (максимум)', included: true, highlight: true },
    { id: 'photos', text: 'До 3 фото высокого качества в день', included: true },
    { id: 'ai', text: 'ИИ-оценка дня с глубоким анализом и отчётом', included: true, highlight: true },
    { id: 'video', text: 'Видеозвонки с выделенным TURN-сервером', included: true },
    { id: 'groups', text: 'До 20 групп (до 100 участников)', included: true },
    { id: 'badge', text: 'Золотой статус и значок ⚡ ULTRA FOUNDER', included: true },
    { id: 'vault', text: 'Полный доступ к сейфу Evidence Vault', included: true },
    { id: 'unlimited', text: '15 историй, 100 отложенных сообщений', included: true },
  ],
}

/**
 * Проверка статуса истечения подписки (за 3 дня предупреждение)
 */
export interface SubscriptionStatus {
  rawTier: string
  effectiveTier: SubscriptionTier
  isPaid: boolean
  isExpired: boolean
  isExpiringSoon: boolean
  daysRemaining: number | null
  expiresAtFormatted: string | null
}

export function checkSubscriptionStatus(
  rawTier: unknown,
  validUntil?: string | null
): SubscriptionStatus {
  const effectiveTier = normalizeTier(rawTier, validUntil)
  const isPaid = isPaidTierActive(rawTier, validUntil)

  if (!validUntil) {
    return {
      rawTier: typeof rawTier === 'string' ? rawTier : 'free',
      effectiveTier,
      isPaid,
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: null,
      expiresAtFormatted: null,
    }
  }

  const expDate = new Date(validUntil)
  const expTime = expDate.getTime()
  if (isNaN(expTime)) {
    return {
      rawTier: typeof rawTier === 'string' ? rawTier : 'free',
      effectiveTier,
      isPaid,
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: null,
      expiresAtFormatted: null,
    }
  }

  const now = Date.now()
  const diffMs = expTime - now
  const isExpired = diffMs <= 0
  const daysRemaining = !isExpired ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : 0
  // Предупреждение за 3 дня (1, 2 или 3 дня до окончания)
  const isExpiringSoon = !isExpired && daysRemaining > 0 && daysRemaining <= 3

  const expiresAtFormatted = expDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return {
    rawTier: typeof rawTier === 'string' ? rawTier : 'free',
    effectiveTier,
    isPaid: isPaid && !isExpired,
    isExpired,
    isExpiringSoon,
    daysRemaining,
    expiresAtFormatted,
  }
}

