export type ViewId =
  | 'home'
  | 'explore'
  | 'messages'
  | 'vault'
  | 'analytics'
  | 'settings'
  | 'profile'
  | 'intentions'

export type Mode = 'pride' | 'gratitude'

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 14 — СУПЕР-НАСТРОЙКИ: ТЕМА ОФОРМЛЕНИЯ, АКЦЕНТ, ШРИФТ, ПЛОТНОСТЬ
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Режим оформления приложения.
 *  - 'x-black'     — классическая чёрная тема (X Black), как в Твиттере/X
 *  - 'apple-light' — светлая «яблочная» тема (Apple Light)
 *  - 'dim'         — мягкая сумеречная тема (Dim), тёмно-синий комфорт для глаз
 */
export type ThemeMode = 'x-black' | 'apple-light' | 'dim'

/**
 * Акцентный цвет интерфейса — меняет ссылки, активные элементы,
 * прогресс и декоративные акценты по всему приложению.
 */
export type AccentId = 'flame' | 'blue' | 'violet' | 'emerald' | 'rose' | 'gold'

/** Размер шрифта/масштаб интерфейса */
export type FontScaleId = 'compact' | 'regular' | 'large' | 'xlarge'

/** Плотность ленты — насколько просторно выглядят карточки дней */
export type FeedDensityId = 'cozy' | 'comfortable' | 'compact'

export type OvercomeLevel = 0 | 1 | 2 | 3

/**
 * Уровень видимости записи (день или отдельная гордость).
 *  - 'public'  — публично в глобальную ленту
 *  - 'friends' — только друзьям
 *  - 'private' — лично для меня
 */
export type VisibilityLevel = 'public' | 'friends' | 'private'

export type PrideEntry = {
  num: string
  text: string
  scale: number // 1..10
  overcome: OvercomeLevel // 0..3
  /** Приватность конкретной гордости (ЭТАП 9). Отсутствует → как у дня */
  visibility?: VisibilityLevel
}

export type GratitudeEntry = {
  num?: string
  text: string
  rating?: number // 1..10
}

export function getGratitudeText(g: string | GratitudeEntry): string {
  return typeof g === 'string' ? g : g.text
}

export function getGratitudeRating(g: string | GratitudeEntry): number {
  return typeof g === 'object' && typeof g.rating === 'number' ? g.rating : 10
}

export type DayStatus = 'normal' | 'missed'

export type Day = {
  id: number
  title: string
  tags: string[]
  prides: PrideEntry[]
  gratitudes: (string | GratitudeEntry)[]
  photos?: string[]
  dateISO?: string
  status?: DayStatus
  /** Приватность всего дня (ЭТАП 9). Отсутствует → 'public' */
  visibility?: VisibilityLevel
}

/** Пользовательский смайлик/эмодзи, созданный в конструкторе реакций */
export type CustomEmoji = {
  id: string
  char: string
  label: string
  createdAt: string
}

/**
 * Реакции по целям.
 * Ключ цели (target): "day:12", "day:12:pride:0", "day:12:grat:2"
 * Значение: { [emojiId]: количество }
 */
export type ReactionCounts = Record<string, Record<string, number>>

/**
 * Какие реакции поставил сам пользователь.
 * Ключ цели (target) → список emojiId, которые пользователь включил.
 */
export type MyReactions = Record<string, string[]>

/**
 * Роль автора комментария поддержки:
 *  - 'me'      — сам пользователь (Alexei Cerna)
 *  - 'support' — внутренний поддерживающий голос («Огонёк поддержки»)
 */
export type CommentPersona = 'me' | 'support'

/**
 * Комментарий поддержки под днём или отдельной гордостью.
 * Хранится плоско (с parentId), а дерево ответов собирается на клиенте.
 */
export type Comment = {
  id: string
  /** Родительский комментарий для дерева ответов; null — корневой */
  parentId: string | null
  /** Имя автора: пользователь или «Огонёк поддержки» */
  author: string
  /** Инициалы/глиф для аватара */
  initials: string
  /** Текст поддержки */
  text: string
  /** ISO-время создания */
  createdAt: string
  /** Количество лайков на комментарии */
  likes: number
  /** Поставил ли лайк текущий пользователь */
  likedByMe: boolean
  /** Комментарий создан пользователем (его можно удалить) */
  isMine: boolean
  /** Быстрый шаблон, которым был создан комментарий (если был) */
  template?: string | null
  /** Роль автора */
  persona: CommentPersona
}

/**
 * Комментарии по целям.
 * Ключ цели (target): "day:12" | "day:12:pride:0"
 * Значение: плоский список комментариев (дерево через parentId).
 */
export type CommentsByTarget = Record<string, Comment[]>

export type ReactionTargetKind = 'day' | 'pride' | 'gratitude'

/** Платформы для ссылок на соцсети в профиле */
export type ProfileSocialPlatform =
  | 'website'
  | 'telegram'
  | 'instagram'
  | 'github'
  | 'youtube'
  | 'x'
  | 'linkedin'
  | 'custom'

/** Одна ссылка на соцсеть в шапке профиля */
export type ProfileSocialLink = {
  id: string
  platform: ProfileSocialPlatform
  label: string
  url: string
}

/**
 * Профиль пользователя Огонька.
 * Хранит публичную визитку: обложку (banner), аватар, имя, @username,
 * био, город, соцсети и главную цель месяца.
 */
export type OgonekProfile = {
  displayName: string
  /** @username без ведущего символа @ */
  username: string
  bio: string
  city: string
  website: string
  joinedLabel: string
  /** Аватар: id фото из IndexedDB, data URL или null (тогда инициалы) */
  avatarImage: string | null
  /** Акцентный цвет/градиент аватара-заглушки (CSS) */
  avatarColor: string
  /** Пользовательская обложка: id фото, data URL или null */
  bannerImage: string | null
  /** id пресета обложки (используется, когда bannerImage пуст) */
  bannerPreset: string
  socialLinks: ProfileSocialLink[]
  /** Главная цель месяца */
  monthlyGoal: string
  monthlyGoalUpdatedAtISO: string
  verified: boolean
}

export type EvidenceItem = {
  id: string
  date: string
  title: string
  description: string
  category?: string
  pinned?: boolean
}

export type ComposerPayload = {
  prides: string[]
  gratitudes: string[]
  photo: string | null
  ratings?: Record<number, { scale: number; overcome: OvercomeLevel }>
  /** Приватность всего дня (ЭТАП 9) */
  visibility?: VisibilityLevel
  /** Приватность каждой гордости по индексу (после удаления пустых) */
  prideVisibilities?: Record<number, VisibilityLevel>
}

export type ComposerDraft = {
  prides: string[]
  gratitudes: string[]
  photo: string | null
  tab: Mode
  extra: boolean
  lastSavedISO: string
  /** Черновик приватности дня (ЭТАП 9) */
  visibility?: VisibilityLevel
  /** Черновик приватности гордостей по индексу */
  prideVisibilities?: Record<number, VisibilityLevel>
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 10 — УТРЕННИЙ ФОКУС + ОГОНЁК ФОКУСА + ВЕЧЕРНЯЯ СВЕРКА
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Статус выполнения одного утреннего обещания (шага фокуса):
 *  - 'pending' — ещё не сверял
 *  - 'done'    — «Выполнил» — обещание сдержано
 *  - 'missed'  — «Не выполнил» — обещание не сдержано
 */
export type MorningFocusStepStatus = 'pending' | 'done' | 'missed'

/**
 * Полная запись одного дня утреннего фокуса: 3 шага, их вечерняя сверка
 * и автоматически посчитанный процент выполнения обещаний.
 */
export type MorningFocusRecord = {
  /** Ключ дня в формате YYYY-MM-DD */
  dateKey: string
  /** Три обещания, зафиксированные утром */
  focus: [string, string, string]
  /** Вечерняя сверка: статус каждого шага */
  steps: [MorningFocusStepStatus, MorningFocusStepStatus, MorningFocusStepStatus]
  /** Когда фокус был зафиксирован утром (ISO) */
  createdAtISO: string
  /** Когда прошла вечерняя сверка; null — ещё не завершена (ISO) */
  reviewedAtISO: string | null
  /** Процент выполнения обещаний 0..100 (считается автоматически) */
  completionPercent: number
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 5 — Верифицированные ачивки профиля + ИИ-регламент доказательств
   ──────────────────────────────────────────────────────────────────────── */

/** Категории верифицированных достижений профиля */
export type AchievementCategoryId =
  | 'sport-record' // Спортивный рекорд / Марафон
  | 'business' // Бизнес-достижение
  | 'education' // Обучение / Наука
  | 'discipline' // Стрик дисциплины

/**
 * Одно требование регламента: какой именно файл-доказательство нужно приложить.
 */
export type AchievementEvidenceRequirement = {
  id: string
  /** Название файла-доказательства */
  title: string
  /** Зачем нужен этот файл верификатору */
  purpose: string
  /** Допустимые форматы (человекочитаемо) */
  formats: string[]
  /** Обязательный или дополнительный */
  required: boolean
  /** Пример корректного доказательства */
  example: string
}

/** Строгий регламент доказательств, выданный ИИ-ассистентом */
export type AchievementRegulation = {
  categoryId: AchievementCategoryId
  /** Как ИИ понял заявленную тему */
  interpretedTopic: string
  /** Строгое резюме: что и почему нужно приложить */
  summary: string
  /** Обязательные и дополнительные файлы-доказательства */
  requirements: AchievementEvidenceRequirement[]
  /** Кто уполномочен подтвердить достижение */
  verifier: string
  /** Срок актуальности доказательств */
  freshnessRule: string
  /** Критерии отказа */
  rejectionCriteria: string[]
  /** Строгость проверки */
  strictness: 'basic' | 'strict' | 'forensic'
  /** Регламент сгенерирован ИИ (true) или локальной эвристикой (false) */
  aiGenerated: boolean
}

/** Прикреплённый к ачивке файл-доказательство */
export type AchievementEvidenceFile = {
  id: string
  /** id требования регламента, к которому относится файл */
  requirementId: string
  /** Имя загруженного файла */
  fileName: string
  /** Ссылка: id фото из IndexedDB, data URL или внешняя ссылка */
  ref: string
  /** MIME-тип */
  mime: string
  /** Размер в байтах */
  size: number
  addedAtISO: string
}

/** Жизненный цикл верифицированной ачивки */
export type AchievementStatus = 'draft' | 'submitted' | 'verified' | 'rejected'

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 6 — Модерация ачивок и отправка доказательств на почту
   ──────────────────────────────────────────────────────────────────────── */

/** Статус заявки в системе модерации достижений */
export type ModerationStatus =
  | 'on-moderation' // «На модерации»
  | 'officially-verified' // «Подтверждено официально»
  | 'needs-clarification' // «Требует уточнения»

/** Канал доставки пакета заявки модератору */
export type ModerationChannel = 'email' | 'webhook' | 'outbox'

/** Результат доставки пакета модератору */
export type ModerationDelivery = 'sent' | 'queued' | 'failed'

/** Событие в истории рассмотрения заявки (аудит) */
export type ModerationReviewEvent = {
  id: string
  atISO: string
  status: ModerationStatus
  note: string
  actor: string
}

/**
 * Сформированный и отправленный модератору пакет заявки.
 * Хранится прямо в ачивке, чтобы профиль умел показывать живой статус,
 * трек-код и историю рассмотрения без похода на сервер.
 */
export type AchievementSubmission = {
  id: string
  /** Публичный трек-код заявки (для отслеживания статуса) */
  trackingCode: string
  status: ModerationStatus
  /** Описание заявки, добавленное пользователем */
  description: string
  /** Контактная почта для ответа модератора */
  contactEmail: string
  submittedAtISO: string
  /** Когда модератор вынес вердикт */
  decidedAtISO: string | null
  /** Комментарий модератора (причина уточнения / подтверждения) */
  moderatorNote: string | null
  channel: ModerationChannel
  delivery: ModerationDelivery
  /** Адрес модератора, куда ушёл пакет */
  recipient: string
  /** Сколько файлов-доказательств вошло в пакет */
  evidenceCount: number
  /** История рассмотрения (аудит) */
  history: ModerationReviewEvent[]
}

/** Верифицированная ачивка профиля со своим регламентом и доказательствами */
export type VerifiedAchievement = {
  id: string
  categoryId: AchievementCategoryId
  /** Публичное название ачивки */
  title: string
  /** Тема, введённая пользователем (по ней строился регламент) */
  topic: string
  /** Дата свершения (ISO) */
  achievedAtISO: string
  status: AchievementStatus
  regulation: AchievementRegulation | null
  evidence: AchievementEvidenceFile[]
  submittedAtISO: string | null
  verifiedAtISO: string | null
  /** Комментарий верификатора (подтверждение или причина отказа) */
  reviewerNote: string | null
  /** Пакет заявки, отправленный модератору на почту/вебхук (ЭТАП 6) */
  submission: AchievementSubmission | null
  createdAtISO: string
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 7 — СТОРИС ДРУЗЕЙ (Instagram-стиль, кружочки)
   ──────────────────────────────────────────────────────────────────────── */

/** Один кадр (слайд) сторис — вертикальная карточка 9:16 */
export type StorySlide = {
  id: string
  emoji: string
  kicker: string
  headline: string
  detail: string
  /** CSS-цвет начала градиента фона */
  from: string
  /** CSS-цвет конца градиента фона */
  to: string
  /** Акцентный цвет кикера/иконок */
  accent: string
  /** Фото-фон кадра: id из IndexedDB, data URL или blob (ЭТАП 9) */
  photo?: string | null
}

/** Живая сторис друга: набор слайдов + метка времени публикации */
export type FriendStory = {
  friendId: string
  slides: StorySlide[]
  /** Человекочитаемая метка «опубликовано» */
  postedLabel: string
}

/**
 * Личная сторис пользователя («Моя история»).
 * Хранится в сторе, чтобы кнопка «+» реально публиковала и удаляла кадры.
 */
export type MyStory = {
  id: string
  createdAtISO: string
  emoji: string
  kicker: string
  headline: string
  detail: string
  from: string
  to: string
  accent: string
  /** id дня-источника, если сторис собрана из записи ленты */
  sourceDayId?: number | null
  /** Индекс гордости-источника, если сторис опубликована из конкретной гордости (ЭТАП 9) */
  sourcePrideIndex?: number | null
  /** id выбранного фона из STORY_BACKGROUNDS (ЭТАП 9) */
  backgroundId?: string
  /** Фото-фон сторис: id из IndexedDB, data URL или blob (ЭТАП 9) */
  photo?: string | null
  /** Приватность сторис (ЭТАП 9) */
  visibility?: VisibilityLevel
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 15 — БЕЗОПАСНОСТЬ И ВХОД: ПАРОЛЬ, PIN-КОД, FACE ID / TOUCH ID
   ──────────────────────────────────────────────────────────────────────── */

/** Способ, которым пользователь может разблокировать Огонёк */
export type SecurityMethod = 'pin' | 'biometric' | 'password'

/** Событие журнала безопасности (аудит входов и настроек защиты) */
export type SecurityAuditKind =
  | 'password-set'
  | 'password-changed'
  | 'password-removed'
  | 'pin-set'
  | 'pin-changed'
  | 'pin-removed'
  | 'biometric-enabled'
  | 'biometric-disabled'
  | 'lock-enabled'
  | 'lock-disabled'
  | 'unlocked'
  | 'failed-attempt'
  | 'lockout'
  | 'lock-now'

export type SecurityAuditEvent = {
  id: string
  atISO: string
  kind: SecurityAuditKind
  note: string
}

/**
 * Полный снимок защиты приложения.
 * Все секреты хранятся только в виде соли + SHA-256 хэша (Web Crypto),
 * сам пароль/PIN никогда не сохраняется в открытом виде.
 */
export type AppSecurityState = {
  /** Пароль аккаунта: соль + хэш (Web Crypto SHA-256) */
  passwordHash: string | null
  passwordSalt: string | null
  passwordUpdatedAtISO: string | null
  /** 4-значный PIN-код быстрого входа: соль + хэш */
  pinHash: string | null
  pinSalt: string | null
  /** Длина PIN-кода (по умолчанию 4 цифры) */
  pinLength: number
  /** Быстрый вход по PIN-коду при открытии приложения */
  pinQuickUnlockEnabled: boolean
  /** Биометрический ключ WebAuthn (Touch ID / Face ID) включён */
  biometricEnabled: boolean
  /** base64url id зарегистрированного WebAuthn-ключа */
  biometricCredentialId: string | null
  /** Человекочитаемое имя ключа: «Face ID / Touch ID», «Touch ID на Mac» */
  biometricLabel: string | null
  biometricRegisteredAtISO: string | null
  /** Требовать разблокировку при каждом запуске приложения */
  lockOnOpen: boolean
  /** Автоблокировка при бездействии, минуты (0 — выключена) */
  autoLockMinutes: number
  /** Неудачных попыток ввода подряд */
  failedAttempts: number
  /** До какого времени вход заблокирован (ISO) — защита от перебора */
  lockedUntilISO: string | null
  /** Журнал событий безопасности (свежие сверху) */
  auditLog: SecurityAuditEvent[]
  /** Когда последний раз успешно разблокировали приложение */
  lastUnlockedAtISO: string | null
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 13 — ВСТРОЕННЫЙ МЕССЕНДЖЕР И БЫСТРЫЕ ЧАТЫ С ДРУЗЬЯМИ
   ──────────────────────────────────────────────────────────────────────── */

/** Тип карточки, которую можно переслать в чат одним кликом */
export type ChatAttachmentKind = 'pride' | 'day' | 'story' | 'achievement'

/**
 * Компактная карточка-вложение в переписке: гордость дня, целый день
 * летописи, кадр сторис или верифицированная ачивка. Хранит уже готовые
 * цвета/эмодзи, чтобы чат рисовал карточку без обращения к источнику.
 */
export type ChatAttachment = {
  kind: ChatAttachmentKind
  title: string
  subtitle: string
  emoji: string
  /** CSS-цвет начала градиента */
  from: string
  /** CSS-цвет конца градиента */
  to: string
  /** Акцентный цвет подписи */
  accent: string
  /** id дня-источника (для гордости/дня) */
  dayId: number | null
  /** индекс гордости в дне */
  prideIndex: number | null
  /** id сторис/ачивки-источника */
  storyId?: string | null
  /** Имя автора (для пересланной чужой сторис) */
  author: string | null
  /** Фото-фон: id из IndexedDB, data URL или blob */
  photo: string | null
  visibility: VisibilityLevel
}

/** Реакция на конкретное сообщение чата */
export type ChatReaction = {
  emojiId: string
  /** Кто поставил: 'me' или id друга */
  by: string
}

/** Одно сообщение переписки */
export type ChatMessage = {
  id: string
  /** 'me' — пользователь, иначе id друга-собеседника */
  authorId: string
  text: string
  createdAtISO: string
  attachment: ChatAttachment | null
  reactions: ChatReaction[]
  /** Сообщение прочитано собеседником (галочки ✓✓) */
  read: boolean
  /** Системное сообщение (без пузыря пользователя) */
  system: boolean
}

/** Состояние одной переписки с другом */
export type ChatThreadState = {
  messages: ChatMessage[]
  /** Когда я последний раз открывал переписку (ISO) — база непрочитанных */
  readAtISO: string | null
  /** Уведомления отключены */
  muted: boolean
  /** Диалог закреплён сверху */
  pinned: boolean
  /** Черновик неотправленного сообщения */
  draft: string
}

/** Все переписки: ключ — id друга */
export type ChatThreads = Record<string, ChatThreadState>

export type OgonekStoreState = {
  schemaVersion: number
  days: Day[]
  /** Верифицированные ачивки профиля с регламентами доказательств */
  verifiedAchievements: VerifiedAchievement[]
  morningIntentions: Record<string, [string, string, string]>
  /** ЭТАП 10: история утренних фокусов по дням + вечерняя сверка и % выполнения */
  morningFocusHistory: Record<string, MorningFocusRecord>
  composerDraft: ComposerDraft | null
  evidenceItems: EvidenceItem[]
  evidenceFavorites: string[]
  soundEnabled: boolean
  pinEnabled: boolean
  isDemo: boolean
  /** Кастомные смайлики, созданные пользователем */
  customEmojis: CustomEmoji[]
  /** Живые реакции: target → emojiId → количество */
  dayReactions: ReactionCounts
  /** Какие реакции поставил сам пользователь: target → [emojiId] */
  myReactions: MyReactions
  /** Комментарии поддержки: target → плоский список (дерево через parentId) */
  comments: CommentsByTarget
  /** Публичный профиль пользователя (имя, обложка, аватар, соцсети, цель) */
  profile: OgonekProfile
  /** ID друзей, на которых подписан пользователь (вкладка «Друзья» профиля) */
  followingIds: string[]
  /** ID друзей, чьи сторис уже просмотрены (кружок гаснет → серый) */
  viewedStoryIds: string[]
  /** Личные сторис пользователя («Моя история») */
  myStories: MyStory[]
  /* ── ЭТАП 11 — СИСТЕМА ДРУЗЕЙ ────────────────────────────────────────── */
  /** ID взаимных друзей (принятые заявки в друзья) */
  friendIds: string[]
  /** Входящие заявки в друзья (id друзей, которые позвали пользователя) */
  incomingFriendRequests: string[]
  /** Исходящие заявки в друзья (id друзей, которых позвал пользователь) */
  outgoingFriendRequests: string[]
  /** Скрытые/отклонённые рекомендации (id друзей) */
  dismissedSuggestions: string[]
  /* ── ЭТАП 12 — ГЛОБАЛЬНЫЙ ХАБ ИССЛЕДОВАНИЯ ───────────────────────────── */
  /** Каких участников сообщества пользователь читает (id из COMMUNITY_USERS) */
  exploreFollowingIds: string[]
  /** Публикации сообщества, которым пользователь зажёг огонёк */
  exploreLikedPosts: string[]
  /** Публикации, сохранённые пользователем в коллекцию */
  exploreSavedPosts: string[]
  /** Недавние поисковые запросы хаба (свежие — в начале) */
  exploreRecentSearches: string[]
  /* ── ЭТАП 13 — ВСТРОЕННЫЙ МЕССЕНДЖЕР ─────────────────────────────────── */
  /** Переписки с друзьями: id друга → тред (сообщения, реакции, черновик) */
  chatThreads: ChatThreads
  /** Открытый диалог (id друга) или null — раздел «Чаты» */
  chatActiveFriendId: string | null
  /* ── ЭТАП 14 — СУПЕР-НАСТРОЙКИ: ВНЕШНИЙ ВИД ──────────────────────────── */
  /** Режим оформления: X Black / Apple Light / Dim */
  theme: ThemeMode
  /** Акцентный цвет интерфейса */
  accent: AccentId
  /** Размер шрифта/масштаб интерфейса */
  fontScale: FontScaleId
  /** Плотность ленты (просторность карточек дней) */
  feedDensity: FeedDensityId
  /* ── ЭТАП 15 — БЕЗОПАСНОСТЬ И ВХОД ───────────────────────────────────── */
  /** Защита приложения: пароль, PIN-код, биометрия WebAuthn и автоблокировка */
  security: AppSecurityState
  /* ── ЭТАП 16 — ПРИВАТНОСТЬ ПРОФИЛЯ, ДЕДЛАЙН СТРИКА ───────────────────── */
  /** Кто видит профиль, может комментировать/писать и что публикуется */
  privacy: PrivacySettings
  /** Ночной дедлайн стрика, часовой пояс и льгота на выходные */
  streak: StreakSettings
  /* ── ЭТАП 17 — МЕСЯЧНЫЕ KPI-ЦЕЛИ И ГЛУБОКАЯ ИИ-АНАЛИТИКА ─────────────── */
  /** Месячные KPI-цели, с которыми аналитика сверяет записанные гордости */
  monthlyKpis: MonthlyKpi[]
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 16 — ПРИВАТНОСТЬ ПРОФИЛЯ
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Тип аккаунта:
 *  - 'public'  — открытый профиль, записи доступны в глобальной ленте
 *  - 'private' — закрытый аккаунт, контент видят только друзья
 */
export type ProfileVisibility = 'public' | 'private'

/**
 * Кто может взаимодействовать с пользователем:
 *  - 'everyone' — все участники Огонька
 *  - 'friends'  — только друзья
 *  - 'nobody'   — никто (взаимодействие выключено)
 */
export type InteractionAudience = 'everyone' | 'friends' | 'nobody'

/**
 * Полный снимок приватности профиля.
 * Управляет типом аккаунта, политикой комментариев и личных сообщений,
 * а также тем, что именно показывается публично (стрик, бейджи, поиск).
 */
export type PrivacySettings = {
  /** Открытый или закрытый аккаунт */
  profileVisibility: ProfileVisibility
  /** Кто может комментировать записи */
  commentPolicy: InteractionAudience
  /** Кто может писать в личные сообщения (чаты) */
  chatPolicy: InteractionAudience
  /** Показывать длину стрика публично */
  showStreakPublicly: boolean
  /** Показывать верифицированные бейджи публично */
  showBadgesPublicly: boolean
  /** Можно ли найти профиль по @username */
  searchableByUsername: boolean
  /** Скрыть пользователя из публичных таблиц лидеров */
  hideFromLeaderboards: boolean
  /** Когда настройки менялись в последний раз (ISO) */
  updatedAtISO: string
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 16 — ДЕДЛАЙН СТРИКА
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Настройки ночного дедлайна стрика.
 * Время задаётся в минутах от полуночи уже внутри дня дедлайна,
 * поэтому пользователь сам решает, когда «закрывается» день.
 */
export type StreakSettings = {
  /** Время дедлайна: минуты от полуночи (0..1439), напр. 1439 = 23:59 */
  deadlineMinutes: number
  /** Часовой пояс, в котором считается дедлайн (IANA, напр. Europe/Chisinau) */
  timeZone: string
  /** Дополнительный день прощения, если дедлайн выпал на выходные */
  weekendBonus: boolean
  /** Когда настройки менялись в последний раз (ISO) */
  updatedAtISO: string
}

/* ────────────────────────────────────────────────────────────────────────
   ЭТАП 17 — МЕСЯЧНЫЕ KPI-ЦЕЛИ И ГЛУБОКАЯ ИИ-АНАЛИТИКА
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Тип месячного KPI-ориентира — что именно измеряет цель.
 *  - 'prides'        — зафиксировано гордостей за месяц (шт.)
 *  - 'gratitudes'    — зафиксировано благодарностей за месяц (шт.)
 *  - 'avg-rating'    — средний балл гордостей за месяц (★ 1..10)
 *  - 'active-days'   — дней месяца с записью (шт.)
 *  - 'focus-percent' — % сдержанных утренних обещаний за месяц
 *  - 'custom'        — ручная цель, которую пользователь отмечает сам
 */
export type KpiKind =
  | 'prides'
  | 'gratitudes'
  | 'avg-rating'
  | 'active-days'
  | 'focus-percent'
  | 'custom'

/**
 * Месячная KPI-цель пользователя. Аналитика сверяет записанное за текущий
 * месяц с этими ориентирами и показывает прогресс, темп и AI-вердикт.
 */
export type MonthlyKpi = {
  id: string
  /** Короткое название цели, напр. «30 гордостей в месяц» */
  title: string
  /** Что измеряет цель */
  kind: KpiKind
  /** Числовой ориентир: количество, балл или процент */
  target: number
  /** Когда цель создана (ISO) */
  createdAtISO: string
  /** Ручная отметка выполнения (актуальна для kind = 'custom') */
  manualDone: boolean
}

/** Период графика динамики оценок и благодарностей */
export type AnalyticsPeriod = 'week' | 'month' | 'year'
