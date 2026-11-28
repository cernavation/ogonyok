import type {
  InteractionAudience,
  PrivacySettings,
  ProfileVisibility,
} from './types'

/* ══════════════════════════════════════════════════════════════════════════
   ЭТАП 16 — ПРИВАТНОСТЬ ПРОФИЛЯ
   Единый источник правды о том, кто видит профиль, кто может комментировать
   записи и писать в чаты, а также что публикуется в глобальную ленту.
   Модуль не зависит от DOM: им пользуются и хранилище (валидация), и UI.
   ══════════════════════════════════════════════════════════════════════════ */

export const DEFAULT_PRIVACY: PrivacySettings = {
  profileVisibility: 'public',
  commentPolicy: 'everyone',
  chatPolicy: 'friends',
  whoCanFind: 'everyone',
  whoCanMessage: 'everyone',
  whoCanCall: 'friends',
  whoCanSeeOnline: 'friends',
  isHiddenFromSearch: false,
  allowMessagesFrom: 'everyone',
  allowGroupInvitesFrom: 'friends',
  showStreakPublicly: true,
  showBadgesPublicly: true,
  showDifficultyLevelPublicly: true,
  searchableByUsername: true,
  hideFromLeaderboards: false,
  defaultDayVisibility: 'public',
  updatedAtISO: '2026-10-01T00:00:00.000Z',
}

export type ProfileVisibilityOption = {
  id: ProfileVisibility
  label: string
  shortLabel: string
  description: string
  /** Акцентный цвет иконки/бейджа */
  color: string
  /** Мини-иконка для карточки выбора */
  emoji: string
}

export const PROFILE_VISIBILITY_OPTIONS: ProfileVisibilityOption[] = [
  {
    id: 'public',
    label: 'Открытый профиль',
    shortLabel: 'Публичный',
    description: 'Летопись и гордости видят все участники Winlog в глобальной ленте',
    color: '#1d9bf0',
    emoji: '🌍',
  },
  {
    id: 'private',
    label: 'Закрытый аккаунт',
    shortLabel: 'Закрытый',
    description: 'Записи доступны только друзьям — незнакомцы видят лишь визитку',
    color: '#8b5cf6',
    emoji: '🔒',
  },
]

export type InteractionAudienceOption = {
  id: InteractionAudience
  label: string
  shortLabel: string
  description: string
  color: string
}

export const INTERACTION_AUDIENCE_OPTIONS: InteractionAudienceOption[] = [
  {
    id: 'everyone',
    label: 'Все участники',
    shortLabel: 'Все',
    description: 'Любой, кто видит запись, может оставить отклик',
    color: '#53d3a3',
  },
  {
    id: 'friends',
    label: 'Только друзья',
    shortLabel: 'Друзья',
    description: 'Взаимодействие доступно лишь кругу друзей',
    color: '#f5b942',
  },
  {
    id: 'nobody',
    label: 'Никто',
    shortLabel: 'Никто',
    description: 'Взаимодействие полностью выключено',
    color: '#e0245e',
  },
]

/** Безопасно приводит любое значение к типу аккаунта */
export function normalizeProfileVisibility(value: unknown): ProfileVisibility {
  return value === 'private' ? 'private' : 'public'
}

/** Безопасно приводит любое значение к аудитории взаимодействия */
export function normalizeAudience(value: unknown): InteractionAudience {
  return value === 'friends' || value === 'nobody' ? value : 'everyone'
}

/** Метаданные типа аккаунта (с фолбэком на «публичный») */
export function profileVisibilityMeta(level: ProfileVisibility): ProfileVisibilityOption {
  return (
    PROFILE_VISIBILITY_OPTIONS.find((o) => o.id === level) ?? PROFILE_VISIBILITY_OPTIONS[0]
  )
}

/** Метаданные аудитории взаимодействия (с фолбэком на «все») */
export function audienceMeta(audience: InteractionAudience): InteractionAudienceOption {
  return (
    INTERACTION_AUDIENCE_OPTIONS.find((o) => o.id === audience) ?? INTERACTION_AUDIENCE_OPTIONS[0]
  )
}

/** Короткая подпись политики: «Все», «Друзья» или «Никто» */
export function describeAudience(audience: InteractionAudience): string {
  return audienceMeta(audience).shortLabel
}

/** Валидирует и восстанавливает снимок приватности из хранилища */
export function sanitizePrivacySettings(value: unknown): PrivacySettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_PRIVACY }
  const v = value as Partial<PrivacySettings>
  const bool = (raw: unknown, fallback: boolean): boolean =>
    typeof raw === 'boolean' ? raw : fallback

  const isHiddenFromSearch =
    typeof v.isHiddenFromSearch === 'boolean'
      ? v.isHiddenFromSearch
      : v.whoCanFind === 'nobody' || v.searchableByUsername === false

  const whoCanFind: InteractionAudience = isHiddenFromSearch
    ? 'nobody'
    : v.whoCanFind === 'friends'
    ? 'friends'
    : 'everyone'

  const rawMessagesAudience =
    v.allowMessagesFrom === 'everyone' || v.allowMessagesFrom === 'friends' || v.allowMessagesFrom === 'nobody'
      ? v.allowMessagesFrom
      : v.whoCanMessage === 'everyone' || v.whoCanMessage === 'friends' || v.whoCanMessage === 'nobody'
      ? v.whoCanMessage
      : v.chatPolicy === 'friends' || v.chatPolicy === 'nobody'
      ? v.chatPolicy
      : 'everyone'

  const whoCanMessage: InteractionAudience = rawMessagesAudience
  const allowMessagesFrom: InteractionAudience = rawMessagesAudience
  const allowGroupInvitesFrom: 'friends' | 'nobody' =
    v.allowGroupInvitesFrom === 'nobody' ? 'nobody' : 'friends'

  const whoCanCall =
    v.whoCanCall === 'everyone' || v.whoCanCall === 'nobody'
      ? v.whoCanCall
      : 'friends'

  const whoCanSeeOnline =
    v.whoCanSeeOnline === 'everyone' || v.whoCanSeeOnline === 'nobody'
      ? v.whoCanSeeOnline
      : 'friends'

  return {
    profileVisibility: normalizeProfileVisibility(v.profileVisibility),
    commentPolicy: normalizeAudience(v.commentPolicy),
    chatPolicy: normalizeAudience(v.chatPolicy),
    whoCanFind,
    whoCanMessage,
    whoCanCall,
    whoCanSeeOnline,
    isHiddenFromSearch,
    allowMessagesFrom,
    allowGroupInvitesFrom,
    showStreakPublicly: bool(v.showStreakPublicly, DEFAULT_PRIVACY.showStreakPublicly),
    showBadgesPublicly: bool(v.showBadgesPublicly, DEFAULT_PRIVACY.showBadgesPublicly),
    showDifficultyLevelPublicly: bool(v.showDifficultyLevelPublicly, DEFAULT_PRIVACY.showDifficultyLevelPublicly ?? true),
    searchableByUsername: !isHiddenFromSearch && whoCanFind !== 'nobody' && bool(v.searchableByUsername, DEFAULT_PRIVACY.searchableByUsername),
    hideFromLeaderboards: bool(v.hideFromLeaderboards, DEFAULT_PRIVACY.hideFromLeaderboards),
    defaultDayVisibility:
      v.defaultDayVisibility === 'private' || v.defaultDayVisibility === 'friends'
        ? v.defaultDayVisibility
        : 'public',
    updatedAtISO:
      typeof v.updatedAtISO === 'string' && v.updatedAtISO
        ? v.updatedAtISO
        : DEFAULT_PRIVACY.updatedAtISO,
  }
}

/**
 * Уровень открытости профиля 0..100 — используется для «кольца приватности»
 * в интерфейсе. Чем приватнее настройки, тем выше защищённость.
 */
export function evaluatePrivacyScore(privacy: PrivacySettings): {
  percent: number
  level: 'open' | 'balanced' | 'closed'
  label: string
} {
  let score = 0
  // Тип аккаунта — самый весомый фактор
  score += privacy.profileVisibility === 'private' ? 40 : 0

  const audienceWeight: Record<InteractionAudience, number> = {
    everyone: 0,
    friends: 10,
    nobody: 15,
  }
  score += audienceWeight[privacy.commentPolicy]
  score += audienceWeight[privacy.allowMessagesFrom ?? privacy.chatPolicy]
  score += privacy.showStreakPublicly ? 0 : 8
  score += privacy.showBadgesPublicly ? 0 : 7
  score += privacy.isHiddenFromSearch || !privacy.searchableByUsername ? 10 : 0
  score += privacy.hideFromLeaderboards ? 10 : 0
  score += privacy.allowGroupInvitesFrom === 'nobody' ? 5 : 0

  const percent = Math.max(4, Math.min(100, score))
  const level = percent >= 70 ? 'closed' : percent >= 35 ? 'balanced' : 'open'
  const label =
    level === 'closed' ? 'Максимум приватности' : level === 'balanced' ? 'Умный баланс' : 'Открыт миру'
  return { percent, level, label }
}

/** Человекочитаемая сводка приватности для уведомлений */
export function buildPrivacySummary(privacy: PrivacySettings): string {
  const type = profileVisibilityMeta(privacy.profileVisibility).shortLabel
  return `${type} · коммент: ${describeAudience(privacy.commentPolicy)} · чат: ${describeAudience(privacy.chatPolicy)}`
}

export type PrivacyProfileLike = {
  id?: string | null
  is_anonymous?: boolean | null
  is_hidden_from_search?: boolean | null
  who_can_find?: string | null
  who_can_message?: string | null
  allow_messages_from?: string | null
  allow_group_invites_from?: string | null
  privacy?: Record<string, any> | null
}

/** Скрыт ли профиль из раздела «Поиск» и рекомендаций («Скрытая личность») */
export function isProfileHiddenFromSearch(profile: PrivacyProfileLike | null | undefined): boolean {
  if (!profile) return false
  if (profile.is_anonymous === true || profile.privacy?.is_anonymous === true) return true
  if (profile.is_hidden_from_search === true) return true
  if (profile.who_can_find === 'nobody') return true
  if (profile.privacy?.isHiddenFromSearch === true) return true
  if (profile.privacy?.whoCanFind === 'nobody') return true
  if (profile.privacy?.searchableByUsername === false) return true
  return false
}

/** Возвращает политику входящих личных сообщений профиля */
export function resolveAllowMessagesFrom(profile: PrivacyProfileLike | null | undefined): InteractionAudience {
  if (!profile) return 'everyone'
  const candidate =
    profile.allow_messages_from ??
    profile.who_can_message ??
    profile.privacy?.allowMessagesFrom ??
    profile.privacy?.whoCanMessage
  if (candidate === 'nobody' || candidate === 'friends' || candidate === 'everyone') {
    return candidate
  }
  return 'everyone'
}

/** Возвращает политику приглашений в группы профиля */
export function resolveAllowGroupInvitesFrom(profile: PrivacyProfileLike | null | undefined): 'friends' | 'nobody' {
  if (!profile) return 'friends'
  const candidate = profile.allow_group_invites_from ?? profile.privacy?.allowGroupInvitesFrom
  return candidate === 'nobody' ? 'nobody' : 'friends'
}

/** Проверяет, может ли viewerId написать личное сообщение targetProfile */
export function canMessageUser(input: {
  viewerId?: string | null
  targetProfile: PrivacyProfileLike | null | undefined
  isMutualFriend: boolean
}): { allowed: boolean; policy: InteractionAudience; reason?: string } {
  const { viewerId, targetProfile, isMutualFriend } = input
  if (!targetProfile) {
    return { allowed: true, policy: 'everyone' }
  }
  if (viewerId && targetProfile.id && viewerId === targetProfile.id) {
    return { allowed: true, policy: 'everyone' }
  }
  const policy = resolveAllowMessagesFrom(targetProfile)
  if (policy === 'nobody') {
    return {
      allowed: false,
      policy,
      reason: 'Пользователь запретил входящие личные сообщения в настройках приватности',
    }
  }
  if (policy === 'friends' && !isMutualFriend) {
    return {
      allowed: false,
      policy,
      reason: 'Этому пользователю могут писать только друзья (нужна взаимная подписка)',
    }
  }
  return { allowed: true, policy }
}

/** Проверяет, можно ли добавить targetProfile в групповой чат (строго взаимные друзья + настройка приватности) */
export function canInviteUserToGroup(input: {
  viewerId?: string | null
  targetProfile: PrivacyProfileLike | null | undefined
  isMutualFriend: boolean
}): { allowed: boolean; reason?: string } {
  const { viewerId, targetProfile, isMutualFriend } = input
  if (!targetProfile) {
    return { allowed: false, reason: 'Профиль не найден' }
  }
  if (viewerId && targetProfile.id && viewerId === targetProfile.id) {
    return { allowed: false, reason: 'Нельзя пригласить самого себя' }
  }
  if (!isMutualFriend) {
    return {
      allowed: false,
      reason: 'В группу можно добавлять только друзей (взаимная подписка)',
    }
  }
  if (resolveAllowGroupInvitesFrom(targetProfile) === 'nobody') {
    return {
      allowed: false,
      reason: 'Пользователь запретил добавлять себя в группы в настройках приватности',
    }
  }
  return { allowed: true }
}
