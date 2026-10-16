import type {
  AppSecurityState,
  SecurityAuditEvent,
  SecurityAuditKind,
  SecurityMethod,
} from './types'

/* ══════════════════════════════════════════════════════════════════════════
   ЭТАП 15 — ДВИЖОК БЕЗОПАСНОСТИ ОГОНЬКА
   Чистый модуль: соль + SHA-256 хэширование секретов (Web Crypto), защита
   от перебора, оценка надёжности пароля, валидация состояния из хранилища
   и интеграция браузерного биометрического ключа WebAuthn (Touch ID / Face ID).
   ══════════════════════════════════════════════════════════════════════════ */

/** Лёгкий ключ-подсказка, по которому до отрисовки решается, показывать ли экран блокировки */
export const SECURITY_STORAGE_KEY = 'ogonek.security.hint.v1'

/** Длина PIN-кода быстрого входа */
export const PIN_LENGTH = 4
/** Минимальная длина пароля аккаунта */
export const MIN_PASSWORD_LENGTH = 6
/** Максимальная длина пароля аккаунта */
export const MAX_PASSWORD_LENGTH = 64
/** Сколько неудачных попыток до временной блокировки */
export const MAX_FAILED_ATTEMPTS = 5
/** Длительность блокировки после перебора, мс */
export const LOCKOUT_DURATION_MS = 60_000
/** Сколько событий хранит журнал безопасности */
export const MAX_AUDIT_EVENTS = 40

/** Варианты автоблокировки при бездействии (минуты) */
export const AUTO_LOCK_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'Выкл' },
  { minutes: 1, label: '1 мин' },
  { minutes: 5, label: '5 мин' },
  { minutes: 15, label: '15 мин' },
  { minutes: 60, label: '1 час' },
]

/* ── Базовое состояние ───────────────────────────────────────────────────── */

export const DEFAULT_SECURITY_STATE: AppSecurityState = {
  passwordHash: null,
  passwordSalt: null,
  passwordUpdatedAtISO: null,
  pinHash: null,
  pinSalt: null,
  pinLength: PIN_LENGTH,
  pinQuickUnlockEnabled: false,
  biometricEnabled: false,
  biometricCredentialId: null,
  biometricLabel: null,
  biometricRegisteredAtISO: null,
  lockOnOpen: false,
  autoLockMinutes: 0,
  failedAttempts: 0,
  lockedUntilISO: null,
  auditLog: [],
  lastUnlockedAtISO: null,
}

/* ── Случайность и криптография ──────────────────────────────────────────── */

function randomHex(bytes: number): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const arr = new Uint8Array(bytes)
    cryptoObj.getRandomValues(arr)
    let out = ''
    for (let i = 0; i < arr.length; i += 1) out += arr[i].toString(16).padStart(2, '0')
    return out
  }
  let out = ''
  for (let i = 0; i < bytes; i += 1) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  }
  return out
}

/** Генерирует криптослучайную соль (32 hex-символа) */
export function generateSalt(): string {
  return randomHex(16)
}

/**
 * Детерминированный резервный хэш для сред без Web Crypto
 * (SSR, старые движки, некоторые тестовые окружения).
 */
function fallbackHash(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x1000193
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0
    h2 = Math.imul(h2 + c, 2246822519) >>> 0
  }
  return `fb${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`
}

/** SHA-256 хэш строки `ogonek:salt:secret`; в hex-виде (Web Crypto + fallback) */
export async function hashSecret(secret: string, salt: string): Promise<string> {
  const payload = `ogonek:${salt}:${secret}`
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  const subtle = cryptoObj?.subtle
  if (subtle && typeof subtle.digest === 'function') {
    try {
      const bytes = new TextEncoder().encode(payload)
      const digest = await subtle.digest('SHA-256', bytes)
      const view = new Uint8Array(digest)
      let out = ''
      for (let i = 0; i < view.length; i += 1) out += view[i].toString(16).padStart(2, '0')
      return out
    } catch {
      return fallbackHash(payload)
    }
  }
  return fallbackHash(payload)
}

/** Сравнение хэшей в постоянном времени (защита от timing-атак) */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Проверяет секрет против сохранённой соли и хэша */
export async function verifySecret(
  secret: string,
  salt: string | null,
  hash: string | null
): Promise<boolean> {
  if (!salt || !hash) return false
  const computed = await hashSecret(secret, salt)
  return timingSafeEqual(computed, hash)
}

/* ── Валидация секретов ──────────────────────────────────────────────────── */

/** PIN-код: ровно N цифр (по умолчанию 4) */
export function isValidPin(pin: string, length: number = PIN_LENGTH): boolean {
  if (typeof pin !== 'string') return false
  if (length !== pin.length) return false
  return /^\d+$/.test(pin)
}

/** Пароль аккаунта: длина в допустимых границах */
export function isValidPassword(password: string): boolean {
  return (
    typeof password === 'string' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  )
}

export type PasswordStrength = {
  /** 0..4 */
  score: 0 | 1 | 2 | 3 | 4
  label: string
  /** Подсказки, как усилить пароль */
  hints: string[]
}

/**
 * Оценивает надёжность пароля по длине и набору символов.
 * Используется живым индикатором в модальном окне установки пароля.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const value = typeof password === 'string' ? password : ''
  const hints: string[] = []
  if (!value) {
    return { score: 0, label: 'Пусто', hints: ['Введите пароль не короче 6 символов'] }
  }

  let score = 0
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1
  else hints.push(`Сделайте пароль длиннее ${MIN_PASSWORD_LENGTH - 1} символов`)

  if (value.length >= 12) score += 1
  else hints.push('12+ символов заметно надёжнее')

  const hasLower = /[a-zа-я]/.test(value)
  const hasUpper = /[A-ZА-Я]/.test(value)
  if (hasLower && hasUpper) score += 1
  else hints.push('Смешайте строчные и заглавные буквы')

  if (/\d/.test(value)) score += 1
  else hints.push('Добавьте хотя бы одну цифру')

  if (/[^A-Za-zА-Яа-я0-9]/.test(value)) score += 1
  else hints.push('Добавьте символ вроде ! ? * #')

  const capped = Math.min(4, score) as PasswordStrength['score']
  const labels = ['Очень слабый', 'Слабый', 'Средний', 'Надёжный', 'Очень надёжный']
  return { score: capped, label: labels[capped], hints: hints.slice(0, 3) }
}

/* ── Защита от перебора ──────────────────────────────────────────────────── */

export type LockoutInfo = {
  isLocked: boolean
  remainingMs: number
  lockedUntilISO: string | null
}

/** Рассчитывает, действует ли сейчас временная блокировка входа */
export function computeLockout(
  lockedUntilISO: string | null,
  now: Date = new Date()
): LockoutInfo {
  if (!lockedUntilISO) return { isLocked: false, remainingMs: 0, lockedUntilISO: null }
  const until = new Date(lockedUntilISO).getTime()
  if (!Number.isFinite(until)) return { isLocked: false, remainingMs: 0, lockedUntilISO: null }
  const remaining = until - now.getTime()
  if (remaining <= 0) return { isLocked: false, remainingMs: 0, lockedUntilISO: null }
  return { isLocked: true, remainingMs: remaining, lockedUntilISO }
}

/** Возвращает состояние после очередной неудачной попытки входа */
export function nextFailedAttemptState(
  failedAttempts: number,
  now: Date = new Date()
): { failedAttempts: number; lockedUntilISO: string | null } {
  const next = Math.max(0, Math.round(failedAttempts)) + 1
  if (next >= MAX_FAILED_ATTEMPTS) {
    return {
      failedAttempts: next,
      lockedUntilISO: new Date(now.getTime() + LOCKOUT_DURATION_MS).toISOString(),
    }
  }
  return { failedAttempts: next, lockedUntilISO: null }
}

/** Сколько попыток осталось до блокировки */
export function attemptsLeft(failedAttempts: number): number {
  return Math.max(0, MAX_FAILED_ATTEMPTS - Math.max(0, failedAttempts))
}

/* ── Журнал безопасности ─────────────────────────────────────────────────── */

const AUDIT_KINDS: SecurityAuditKind[] = [
  'password-set',
  'password-changed',
  'password-removed',
  'pin-set',
  'pin-changed',
  'pin-removed',
  'biometric-enabled',
  'biometric-disabled',
  'lock-enabled',
  'lock-disabled',
  'unlocked',
  'failed-attempt',
  'lockout',
  'lock-now',
]

/** Создаёт событие журнала безопасности */
export function makeSecurityEvent(
  kind: SecurityAuditKind,
  note: string,
  now: Date = new Date()
): SecurityAuditEvent {
  return {
    id: `sec-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    atISO: now.toISOString(),
    kind,
    note: note.slice(0, 240),
  }
}

/** Кладёт событие в начало журнала, обрезая историю до лимита */
export function appendSecurityEvent(
  log: SecurityAuditEvent[] | undefined,
  event: SecurityAuditEvent
): SecurityAuditEvent[] {
  return [event, ...(Array.isArray(log) ? log : [])].slice(0, MAX_AUDIT_EVENTS)
}

/* ── Валидация состояния из хранилища ────────────────────────────────────── */

function sanitizeAuditLog(value: unknown): SecurityAuditEvent[] {
  if (!Array.isArray(value)) return []
  const out: SecurityAuditEvent[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as Partial<SecurityAuditEvent>
    if (typeof e.kind !== 'string' || !(AUDIT_KINDS as string[]).includes(e.kind)) continue
    out.push({
      id: typeof e.id === 'string' && e.id ? e.id.slice(0, 80) : `sec-${out.length}`,
      atISO: typeof e.atISO === 'string' && e.atISO ? e.atISO.slice(0, 40) : new Date().toISOString(),
      kind: e.kind as SecurityAuditKind,
      note: typeof e.note === 'string' ? e.note.slice(0, 240) : '',
    })
    if (out.length >= MAX_AUDIT_EVENTS) break
  }
  return out
}

/** Безопасно восстанавливает состояние защиты из localStorage / бэкапа */
export function sanitizeSecurityState(value: unknown): AppSecurityState {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SECURITY_STATE, auditLog: [] }
  }
  const v = value as Partial<AppSecurityState>

  const str = (x: unknown, max = 512): string | null =>
    typeof x === 'string' && x.trim() ? x.trim().slice(0, max) : null

  const pinLength =
    typeof v.pinLength === 'number' && v.pinLength >= 4 && v.pinLength <= 8
      ? Math.round(v.pinLength)
      : PIN_LENGTH

  const autoLockMinutes =
    typeof v.autoLockMinutes === 'number' && Number.isFinite(v.autoLockMinutes) && v.autoLockMinutes >= 0
      ? Math.min(240, Math.round(v.autoLockMinutes))
      : 0

  const failedAttempts =
    typeof v.failedAttempts === 'number' && Number.isFinite(v.failedAttempts) && v.failedAttempts >= 0
      ? Math.min(999, Math.round(v.failedAttempts))
      : 0

  const pinHash = str(v.pinHash)
  const pinSalt = str(v.pinSalt)
  const pinReady = Boolean(pinHash && pinSalt)

  const biometricCredentialId = str(v.biometricCredentialId)
  const biometricReady = Boolean(v.biometricEnabled && biometricCredentialId)

  const passwordHash = str(v.passwordHash)
  const passwordSalt = str(v.passwordSalt)

  return {
    passwordHash,
    passwordSalt,
    passwordUpdatedAtISO: str(v.passwordUpdatedAtISO, 40),
    pinHash: pinReady ? pinHash : null,
    pinSalt: pinReady ? pinSalt : null,
    pinLength,
    pinQuickUnlockEnabled: pinReady ? Boolean(v.pinQuickUnlockEnabled) : false,
    biometricEnabled: biometricReady,
    biometricCredentialId: biometricReady ? biometricCredentialId : null,
    biometricLabel: biometricReady ? str(v.biometricLabel, 60) : null,
    biometricRegisteredAtISO: biometricReady ? str(v.biometricRegisteredAtISO, 40) : null,
    lockOnOpen: Boolean(v.lockOnOpen),
    autoLockMinutes,
    failedAttempts,
    lockedUntilISO: str(v.lockedUntilISO, 40),
    auditLog: sanitizeAuditLog(v.auditLog),
    lastUnlockedAtISO: str(v.lastUnlockedAtISO, 40),
  }
}

/* ── Помощники состояния ─────────────────────────────────────────────────── */

export function hasSecurityPin(security: AppSecurityState): boolean {
  return Boolean(security.pinHash && security.pinSalt)
}

export function hasAccountPassword(security: AppSecurityState): boolean {
  return Boolean(security.passwordHash && security.passwordSalt)
}

export function hasBiometric(security: AppSecurityState): boolean {
  return Boolean(security.biometricEnabled && security.biometricCredentialId)
}

/** Есть ли хоть один способ разблокировать приложение */
export function hasUnlockMethod(security: AppSecurityState): boolean {
  return hasSecurityPin(security) || hasAccountPassword(security) || hasBiometric(security)
}

/** Список активных способов входа (для бейджей в настройках) */
export function activeUnlockMethods(security: AppSecurityState): SecurityMethod[] {
  const methods: SecurityMethod[] = []
  if (hasSecurityPin(security)) methods.push('pin')
  if (hasBiometric(security)) methods.push('biometric')
  if (hasAccountPassword(security)) methods.push('password')
  return methods
}

export type SecurityLevel = {
  level: 'none' | 'basic' | 'strong'
  label: string
  /** 0..100 — заполнение кольца защиты */
  percent: number
  activeMethods: SecurityMethod[]
}

/** Оценка общей защищённости приложения для статус-карточки в настройках */
export function evaluateSecurityLevel(security: AppSecurityState): SecurityLevel {
  const methods = activeUnlockMethods(security)
  const hashes = [
    hasSecurityPin(security),
    hasBiometric(security),
    hasAccountPassword(security),
  ].filter(Boolean).length

  let percent = hashes * 26
  if (security.lockOnOpen) percent += 12
  if (security.autoLockMinutes > 0) percent += 10
  percent = Math.max(0, Math.min(100, percent))

  if (hashes === 0) {
    return { level: 'none', label: 'Журнал открыт', percent: 0, activeMethods: methods }
  }
  if (hashes >= 2 && security.lockOnOpen) {
    return { level: 'strong', label: 'Максимальная защита', percent, activeMethods: methods }
  }
  return { level: 'basic', label: 'Базовая защита', percent, activeMethods: methods }
}

export const SECURITY_METHOD_META: Record<
  SecurityMethod,
  { label: string; short: string; description: string }
> = {
  pin: {
    label: 'PIN-код',
    short: 'PIN',
    description: '4-значный код быстрого входа при открытии приложения',
  },
  biometric: {
    label: 'Face ID / Touch ID',
    short: 'Биометрия',
    description: 'Браузерный биометрический ключ WebAuthn на этом устройстве',
  },
  password: {
    label: 'Пароль аккаунта',
    short: 'Пароль',
    description: 'Основной пароль для входа и восстановления доступа',
  },
}

/* ── WebAuthn (Touch ID / Face ID) ───────────────────────────────────────── */

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined'
}

/**
 * Есть ли на устройстве встроенный проверяющий аутентификатор
 * (Touch ID / Face ID / Windows Hello). Именно он даёт один тап вместо пароля.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false
  try {
    const pk = window.PublicKeyCredential as unknown as {
      isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>
    }
    if (typeof pk.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') return false
    return await pk.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/** Человекочитаемое имя биометрического ключа под текущее устройство */
export function detectBiometricLabel(): string {
  if (typeof navigator === 'undefined') return 'Биометрический ключ'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'Face ID / Touch ID'
  if (/Macintosh|Mac OS X/.test(ua)) return 'Touch ID на Mac'
  if (/Windows/.test(ua)) return 'Windows Hello'
  if (/Android/.test(ua)) return 'Биометрия Android'
  return 'Биометрический ключ'
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToBuffer(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

export type BiometricRegistration = {
  credentialId: string
  label: string
}

export type BiometricResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/**
 * Регистрирует платформенный WebAuthn-ключ (Touch ID / Face ID).
 * Возвращает base64url id credential — именно он сохраняется в сторе.
 */
export async function registerBiometricCredential(input: {
  userName: string
  displayName: string
}): Promise<BiometricResult<BiometricRegistration>> {
  if (!isWebAuthnSupported()) {
    return { ok: false, error: 'Браузер не поддерживает биометрический вход (WebAuthn)' }
  }
  const available = await isPlatformAuthenticatorAvailable()
  if (!available) {
    return { ok: false, error: 'Биометрический ключ недоступен на этом устройстве' }
  }

  try {
    const challenge = new Uint8Array(32)
    const cryptoObj = globalThis.crypto
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      cryptoObj.getRandomValues(challenge)
    }

    const userName = (input.userName || 'ogonek').slice(0, 60)
    const displayName = (input.displayName || 'Огонёк').slice(0, 60)
    const userId = new TextEncoder().encode(`ogonek:${userName}`)

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Огонёк', id: window.location.hostname },
        user: { id: userId, name: userName, displayName },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null

    if (!credential) {
      return { ok: false, error: 'Создание биометрического ключа отменено' }
    }

    return {
      ok: true,
      data: {
        credentialId: bufferToBase64Url(credential.rawId),
        label: detectBiometricLabel(),
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось создать биометрический ключ'
    return { ok: false, error: message }
  }
}

/**
 * Проверяет пользователя биометрией по сохранённому credential id.
 * Успешный вызов (resolve без ошибки) считается подтверждением личности.
 */
export async function authenticateWithBiometric(
  credentialId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { ok: false, error: 'WebAuthn не поддерживается этим браузером' }
  }
  if (!credentialId) {
    return { ok: false, error: 'Биометрический ключ не зарегистрирован' }
  }

  try {
    const challenge = new Uint8Array(32)
    const cryptoObj = globalThis.crypto
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      cryptoObj.getRandomValues(challenge)
    }

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60_000,
        userVerification: 'required',
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: base64UrlToBuffer(credentialId),
            type: 'public-key',
            transports: ['internal' as AuthenticatorTransport],
          },
        ],
      },
    })

    return assertion ? { ok: true } : { ok: false, error: 'Биометрия не подтверждена' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка биометрической проверки'
    return { ok: false, error: message }
  }
}

/* ── Лёгкая подсказка для мгновенной блокировки без мигания контента ──────── */

export type SecurityHint = {
  lockOnOpen: boolean
  hasPin: boolean
  hasBiometric: boolean
  hasPassword: boolean
  autoLockMinutes: number
}

export const DEFAULT_SECURITY_HINT: SecurityHint = {
  lockOnOpen: false,
  hasPin: false,
  hasBiometric: false,
  hasPassword: false,
  autoLockMinutes: 0,
}

export function buildSecurityHint(security: AppSecurityState): SecurityHint {
  return {
    lockOnOpen: Boolean(security.lockOnOpen),
    hasPin: hasSecurityPin(security),
    hasBiometric: hasBiometric(security),
    hasPassword: hasAccountPassword(security),
    autoLockMinutes: security.autoLockMinutes,
  }
}

/** Сохраняет подсказку, чтобы экран блокировки показывался ещё до гидратации React */
export function persistSecurityHint(security: AppSecurityState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(buildSecurityHint(security)))
  } catch {
    // localStorage недоступен — молча игнорируем
  }
}

/** Читает подсказку (для bootstrap-скрипта и первого рендера) */
export function readSecurityHint(): SecurityHint {
  if (typeof window === 'undefined') return { ...DEFAULT_SECURITY_HINT }
  try {
    const raw = window.localStorage.getItem(SECURITY_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SECURITY_HINT }
    const parsed = JSON.parse(raw) as Partial<SecurityHint>
    const methods = Boolean(parsed.hasPin || parsed.hasBiometric || parsed.hasPassword)
    return {
      lockOnOpen: Boolean(parsed.lockOnOpen) && methods,
      hasPin: Boolean(parsed.hasPin),
      hasBiometric: Boolean(parsed.hasBiometric),
      hasPassword: Boolean(parsed.hasPassword),
      autoLockMinutes:
        typeof parsed.autoLockMinutes === 'number' && parsed.autoLockMinutes >= 0
          ? Math.min(240, Math.round(parsed.autoLockMinutes))
          : 0,
    }
  } catch {
    return { ...DEFAULT_SECURITY_HINT }
  }
}

/**
 * Inline-скрипт для <head>: до первой отрисовки ставит флаг `data-app-locked`,
 * если включена блокировка при открытии и задан хотя бы один способ входа.
 * CSS прячет контент под чёрной заглушкой, пока React не смонтирует экран входа.
 */
export const SECURITY_BOOTSTRAP_SCRIPT = `(function(){try{var r=document.documentElement;var raw=localStorage.getItem('${SECURITY_STORAGE_KEY}');if(!raw)return;var s=JSON.parse(raw);var m=!!(s.hasPin||s.hasBiometric||s.hasPassword);if(s.lockOnOpen&&m){r.setAttribute('data-app-locked','1');}}catch(e){}})();`
