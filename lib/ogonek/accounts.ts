import type {
  AccountProfileSnapshot,
  AuthAccount,
  AuthProvider,
  AuthState,
  OgonekProfile,
} from './types'

/* ══════════════════════════════════════════════════════════════════════════
   ЭТАП 18 — ДВИЖОК АККАУНТОВ ОГОНЬКА
   Чистый модуль: сид-личности, генерация @username из русских имён,
   валидация состояния из хранилища, слепки профиля и метаданные провайдеров.
   Пароли здесь не хэшируются — это делает security.ts (Web Crypto SHA-256),
   а стораджи и стор вызывают хэш при регистрации и входе.
   Модуль намеренно НЕ импортирует storage.ts, чтобы не создавать цикл.
   ══════════════════════════════════════════════════════════════════════════ */

/** Пароль демо-сид аккаунтов (подставляется автоматически при первом входе) */
export const DEMO_ACCOUNT_PASSWORD = 'ogonek2026'

/** Допустимые провайдеры входа */
export const AUTH_PROVIDERS: AuthProvider[] = ['email', 'google', 'guest']

/** Служебные метаданные каждого способа входа — для бейджей и подписей */
export type AuthProviderMeta = {
  id: AuthProvider
  label: string
  short: string
  description: string
  /** Фирменный цвет бейджа */
  color: string
}

export const AUTH_PROVIDER_META: Record<AuthProvider, AuthProviderMeta> = {
  email: {
    id: 'email',
    label: 'Почта и пароль',
    short: 'Email',
    description: 'Классический вход: почта, пароль и полный контроль над данными',
    color: '#1d9bf0',
  },
  google: {
    id: 'google',
    label: 'Google',
    short: 'Google',
    description: 'Вход в один тап через аккаунт Google OAuth',
    color: '#ea4335',
  },
  guest: {
    id: 'guest',
    label: 'Гостевой режим',
    short: 'Гость',
    description: 'Демо-журнал без регистрации — всё хранится только на устройстве',
    color: '#f5b942',
  },
}

/** Готовые градиенты аватара-заглушки для новых личностей */
export const ACCOUNT_AVATAR_GRADIENTS: string[] = [
  'linear-gradient(145deg, #ff6b35 0%, #ffa600 100%)',
  'linear-gradient(145deg, #1d9bf0 0%, #0a4d8c 100%)',
  'linear-gradient(145deg, #a855f7 0%, #5b21b6 100%)',
  'linear-gradient(145deg, #22c55e 0%, #0f5132 100%)',
  'linear-gradient(145deg, #f91880 0%, #7d1f4a 100%)',
  'linear-gradient(145deg, #536471 0%, #1f2429 100%)',
  'linear-gradient(145deg, #ff8a50 0%, #c2410c 100%)',
  'linear-gradient(145deg, #67e8f9 0%, #155e75 100%)',
]

/* ── Транслитерация и @username ──────────────────────────────────────────── */

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', і: 'i', ї: 'i', є: 'e',
  ґ: 'g',
}

/** Приводит произвольное имя/почту к slug-основе для @username */
export function slugifyUsername(input: string): string {
  const value = (input ?? '').trim().toLowerCase()
  if (!value) return 'ogonok'
  let latin = ''
  for (const char of value) {
    if (TRANSLIT[char] !== undefined) {
      latin += TRANSLIT[char]
    } else if (/[a-z0-9]/.test(char)) {
      latin += char
    } else {
      latin += '-'
    }
  }
  const clean = latin
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)
  return clean || 'ogonok'
}

/** Подбирает уникальный @username, добавляя суффикс при совпадении */
export function uniqueUsername(base: string, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (t) => (t ?? '').toLowerCase()))
  const root = slugifyUsername(base)
  if (!used.has(root)) return root
  for (let i = 2; i < 999; i += 1) {
    const candidate = `${root}${i}`.slice(0, 28)
    if (!used.has(candidate)) return candidate
  }
  return `${root}-${Math.random().toString(36).slice(2, 6)}`
}

/* ── Почта ───────────────────────────────────────────────────────────────── */

/** Нормализует адрес почты: триминг и нижний регистр */
export function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase()
}

/** Простая, но строгая проверка формата электронной почты */
export function isValidEmail(email: string): boolean {
  const value = normalizeEmail(email)
  if (value.length < 5 || value.length > 120) return false
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)
}

/* ── Идентификаторы и цвета ──────────────────────────────────────────────── */

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 3) + Date.now().toString(36).slice(-5)
}

/** Генерирует уникальный id аккаунта */
export function makeAccountId(existing: Iterable<string> = []): string {
  const used = new Set(existing)
  let id = `acct-${randomSuffix()}`
  let guard = 0
  while (used.has(id) && guard < 20) {
    id = `acct-${randomSuffix()}${guard}`
    guard += 1
  }
  return id
}

/** Детерминированно подбирает градиент аватара по сиду */
export function pickAvatarColor(seed: string): string {
  const value = seed ?? ''
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return ACCOUNT_AVATAR_GRADIENTS[hash % ACCOUNT_AVATAR_GRADIENTS.length]
}

/* ── Инициалы и подписи ──────────────────────────────────────────────────── */

/** Инициалы аккаунта для аватара-заглушки (1–2 буквы) */
export function accountInitials(account: AuthAccount): string {
  const name = account.snapshot?.displayName?.trim() || (account.isGuest ? 'Гость' : 'Огонёк')
  const parts = name.split(/\s+/).slice(0, 2)
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('')
  return initials || 'О'
}

/** Отображаемое имя аккаунта */
export function accountDisplayName(account: AuthAccount): string {
  return account.snapshot?.displayName?.trim() || (account.isGuest ? 'Гость Огонька' : 'Пользователь')
}

/** @handle аккаунта (с ведущим @) */
export function accountHandle(account: AuthAccount): string {
  return `@${account.snapshot?.username || 'ogonok'}`
}

/** Подпись под именем: почта или «Гостевой доступ» */
export function accountSubtitle(account: AuthAccount): string {
  if (account.provider === 'guest') return 'Гостевой демо-режим'
  return account.email || AUTH_PROVIDER_META[account.provider].label
}

/* ── Слепки профиля ──────────────────────────────────────────────────────── */

/** Вырезает из полного профиля слепок для привязки к аккаунту */
export function accountSnapshotFromProfile(profile: OgonekProfile): AccountProfileSnapshot {
  return {
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    city: profile.city,
    avatarColor: profile.avatarColor,
    avatarImage: profile.avatarImage,
    bannerImage: profile.bannerImage,
    bannerPreset: profile.bannerPreset,
    verified: profile.verified,
  }
}

/** Разворачивает слепок аккаунта в патч основного профиля */
export function profilePatchFromAccount(account: AuthAccount): Partial<OgonekProfile> {
  return { ...account.snapshot }
}

/* ── Создание аккаунта ───────────────────────────────────────────────────── */

export type NewAccountInput = {
  provider: AuthProvider
  displayName: string
  email?: string | null
  username?: string
  passwordHash?: string | null
  passwordSalt?: string | null
  avatarColor?: string
  bio?: string
  city?: string
  isGuest?: boolean
  demoSeed?: boolean
  verified?: boolean
  existingIds?: Iterable<string>
  takenUsernames?: Iterable<string>
  now?: Date
}

/** Собирает новый аккаунт с валидным слепком профиля */
export function createAccount(input: NewAccountInput): AuthAccount {
  const now = input.now ?? new Date()
  const nowISO = now.toISOString()
  const email = input.email ? normalizeEmail(input.email) : null
  const displayName =
    (input.displayName ?? '').trim().slice(0, 80) ||
    (input.provider === 'guest' ? 'Гость Огонька' : 'Пользователь Огонька')
  const username = input.username
    ? slugifyUsername(input.username)
    : uniqueUsername(email ? email.split('@')[0] : displayName, input.takenUsernames ?? [])

  const snapshot: AccountProfileSnapshot = {
    displayName,
    username,
    bio:
      (input.bio ?? '').trim().slice(0, 400) ||
      (input.provider === 'guest'
        ? 'Пробую Огонёк без регистрации — все записи остаются на этом устройстве.'
        : 'Веду дневник гордости и благодарности в Огоньке.'),
    city: (input.city ?? '').trim().slice(0, 80) || 'Online',
    avatarColor: input.avatarColor || pickAvatarColor(email || displayName),
    avatarImage: null,
    bannerImage: null,
    bannerPreset: input.provider === 'guest' ? 'steel-grid' : 'night-peaks',
    verified: input.verified ?? input.provider !== 'guest',
  }

  return {
    id: makeAccountId(input.existingIds ?? []),
    provider: input.provider,
    email,
    passwordHash: input.passwordHash ?? null,
    passwordSalt: input.passwordSalt ?? null,
    snapshot,
    createdAtISO: nowISO,
    lastActiveISO: null,
    signInCount: 0,
    isGuest: Boolean(input.isGuest),
    demoSeed: Boolean(input.demoSeed),
  }
}

/** Список занятых @username по всем аккаунтам */
export function takenUsernamesOf(accounts: AuthAccount[]): string[] {
  return accounts.map((a) => a.snapshot.username)
}

/** Находит аккаунт по почте */
export function findAccountByEmail(accounts: AuthAccount[], email: string): AuthAccount | undefined {
  const target = normalizeEmail(email)
  if (!target) return undefined
  return accounts.find((a) => a.email && normalizeEmail(a.email) === target)
}

/* ── Сид-личности демо-режима ────────────────────────────────────────────── */

function accountSnapshot(
  displayName: string,
  username: string,
  bio: string,
  city: string,
  avatarColor: string,
  verified: boolean,
  bannerPreset = 'night-peaks'
): AccountProfileSnapshot {
  return {
    displayName,
    username,
    bio,
    city,
    avatarColor,
    avatarImage: null,
    bannerImage: null,
    bannerPreset,
    verified,
  }
}

function buildSeedAccount(input: {
  id: string
  provider: AuthProvider
  email: string | null
  snapshot: AccountProfileSnapshot
  isGuest?: boolean
  createdAtISO: string
}): AuthAccount {
  return {
    id: input.id,
    provider: input.provider,
    email: input.email,
    passwordHash: null,
    passwordSalt: null,
    snapshot: input.snapshot,
    createdAtISO: input.createdAtISO,
    lastActiveISO: null,
    signInCount: 0,
    isGuest: Boolean(input.isGuest),
    demoSeed: input.provider === 'email',
  }
}

/** Базовый набор личностей: текущий авторизованный пользователь (тестовые аккаунты удалены по ЗАДАЧЕ 2) */
export function buildSeedAccounts(now: Date = new Date()): AuthAccount[] {
  const created = new Date(now.getTime() - 200 * 86_400_000).toISOString()
  return [
    buildSeedAccount({
      id: 'acct-alexei',
      provider: 'email',
      email: 'alexei@memernity.com',
      createdAtISO: created,
      snapshot: accountSnapshot(
        'Алексей Черна',
        'cernavation',
        'Серийный предприниматель & Барефут-марафонец. Основатель Memernity. Дневник гордости и благодарности — 719 дней осознанности.',
        'Moldova',
        'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
        true
      ),
    }),
  ]
}

/** Полное состояние авторизации по умолчанию: владелец уже вошёл */
export function buildDefaultAuthState(now: Date = new Date()): AuthState {
  const nowISO = now.toISOString()
  return {
    accounts: buildSeedAccounts(now),
    activeAccountId: 'acct-alexei',
    signedIn: true,
    hasOnboarded: true,
    switchCount: 0,
    signInCount: 1,
    failedAttempts: 0,
    lockedUntilISO: null,
    lastAuthAtISO: nowISO,
    updatedAtISO: nowISO,
  }
}

export const DEFAULT_AUTH_STATE: AuthState = buildDefaultAuthState()

/* ── Валидация состояния из хранилища ────────────────────────────────────── */

function sanitizeSnapshot(value: unknown, fallback: AccountProfileSnapshot): AccountProfileSnapshot {
  if (!value || typeof value !== 'object') return fallback
  const v = value as Partial<AccountProfileSnapshot>
  const str = (x: unknown, fb: string, max = 400): string =>
    typeof x === 'string' && x.trim() ? x.trim().slice(0, max) : fb
  const image = (x: unknown): string | null =>
    typeof x === 'string' && x.trim() ? x.trim().slice(0, 2000) : null

  return {
    displayName: str(v.displayName, fallback.displayName, 80),
    username: str(v.username, fallback.username, 40).replace(/^@/, ''),
    bio: typeof v.bio === 'string' ? v.bio.slice(0, 400) : fallback.bio,
    city: typeof v.city === 'string' ? v.city.slice(0, 80) : fallback.city,
    avatarColor: str(v.avatarColor, fallback.avatarColor, 300),
    avatarImage: image(v.avatarImage),
    bannerImage: image(v.bannerImage),
    bannerPreset: str(v.bannerPreset, fallback.bannerPreset, 40),
    verified: typeof v.verified === 'boolean' ? v.verified : fallback.verified,
  }
}

function sanitizeAccount(value: unknown, index: number): AuthAccount | null {
  if (!value || typeof value !== 'object') return null
  const a = value as Partial<AuthAccount>
  const provider: AuthProvider =
    typeof a.provider === 'string' && (AUTH_PROVIDERS as string[]).includes(a.provider)
      ? (a.provider as AuthProvider)
      : 'email'

  const id =
    typeof a.id === 'string' && a.id.trim() ? a.id.trim().slice(0, 80) : `acct-restored-${index}`
  const fallbackSnapshot = accountSnapshot(
    provider === 'guest' ? 'Гость Огонька' : 'Пользователь Огонька',
    slugifyUsername(id),
    '',
    'Online',
    pickAvatarColor(id),
    provider !== 'guest'
  )
  const snapshot = sanitizeSnapshot(a.snapshot, fallbackSnapshot)

  return {
    id,
    provider,
    email: typeof a.email === 'string' && a.email.trim() ? normalizeEmail(a.email).slice(0, 120) : null,
    passwordHash: typeof a.passwordHash === 'string' && a.passwordHash ? a.passwordHash.slice(0, 200) : null,
    passwordSalt: typeof a.passwordSalt === 'string' && a.passwordSalt ? a.passwordSalt.slice(0, 80) : null,
    snapshot,
    createdAtISO:
      typeof a.createdAtISO === 'string' && a.createdAtISO ? a.createdAtISO.slice(0, 40) : new Date().toISOString(),
    lastActiveISO: typeof a.lastActiveISO === 'string' ? a.lastActiveISO.slice(0, 40) : null,
    signInCount:
      typeof a.signInCount === 'number' && Number.isFinite(a.signInCount) && a.signInCount >= 0
        ? Math.round(a.signInCount)
        : 0,
    isGuest: Boolean(a.isGuest),
    demoSeed: Boolean(a.demoSeed),
  }
}

/** Безопасно восстанавливает систему авторизации из localStorage/бэкапа */
export function sanitizeAuthState(value: unknown): AuthState {
  if (!value || typeof value !== 'object') {
    return {
      ...DEFAULT_AUTH_STATE,
      accounts: buildSeedAccounts(),
    }
  }
  const v = value as Partial<AuthState>

  const seen = new Set<string>()
  const accounts: AuthAccount[] = []
  if (Array.isArray(v.accounts)) {
    v.accounts.forEach((raw, index) => {
      const account = sanitizeAccount(raw, index)
      if (!account) return
      if (seen.has(account.id)) {
        account.id = `${account.id}-${index}`
      }
      seen.add(account.id)
      accounts.push(account)
    })
  }

  const list = accounts.length > 0 ? accounts : buildSeedAccounts()
  const ids = new Set(list.map((a) => a.id))
  const requestedActive = typeof v.activeAccountId === 'string' ? v.activeAccountId : null
  const activeAccountId = requestedActive && ids.has(requestedActive) ? requestedActive : list[0]?.id ?? null

  const failedAttempts =
    typeof v.failedAttempts === 'number' && Number.isFinite(v.failedAttempts) && v.failedAttempts >= 0
      ? Math.min(999, Math.round(v.failedAttempts))
      : 0

  return {
    accounts: list,
    activeAccountId,
    signedIn: v.signedIn === false ? false : Boolean(activeAccountId),
    hasOnboarded: typeof v.hasOnboarded === 'boolean' ? v.hasOnboarded : true,
    switchCount:
      typeof v.switchCount === 'number' && Number.isFinite(v.switchCount) && v.switchCount >= 0
        ? Math.round(v.switchCount)
        : 0,
    signInCount:
      typeof v.signInCount === 'number' && Number.isFinite(v.signInCount) && v.signInCount >= 0
        ? Math.round(v.signInCount)
        : 0,
    failedAttempts,
    lockedUntilISO: typeof v.lockedUntilISO === 'string' ? v.lockedUntilISO.slice(0, 40) : null,
    lastAuthAtISO: typeof v.lastAuthAtISO === 'string' ? v.lastAuthAtISO.slice(0, 40) : null,
    updatedAtISO:
      typeof v.updatedAtISO === 'string' && v.updatedAtISO ? v.updatedAtISO.slice(0, 40) : new Date().toISOString(),
  }
}
