import type { OgonekStoreState } from './types'

/* ══════════════════════════════════════════════════════════════════════════
   ЭТАП 16 — КОД СИНХРОНИЗАЦИИ И СТАТИСТИКА БАЗЫ (ЧИСТЫЕ ФУНКЦИИ)
   Модуль не зависит ни от DOM, ни от хранилища: здесь живут base64url,
   контрольная сумма, сборка полноценного JSON-бэкапа и «кода синхронизации»
   для переноса летописи между браузерами и доменами.
   Валидация и запись в стор — в lib/ogonek/backup.ts.
   ══════════════════════════════════════════════════════════════════════════ */

export const BACKUP_GENERATOR = 'Ogonek Life Journal v2'
export const SYNC_CODE_PREFIX = 'OGN-SYNC1.'
/** Оценочная квота localStorage в браузере (5 МБ) */
export const ASSUMED_QUOTA_BYTES = 5 * 1024 * 1024

export type BackupStats = {
  days: number
  prides: number
  gratitudes: number
  photos: number
  evidenceItems: number
  achievements: number
  chatMessages: number
  comments: number
  stories: number
  reactions: number
  /** Суммарное количество содержательных записей */
  totalRecords: number
}

export type DecodeResult =
  | { success: true; rawJson: string }
  | { success: false; error: string }

/** Считает живую статистику содержимого базы — для карточки экспорта */
export function computeBackupStats(state: OgonekStoreState): BackupStats {
  let prides = 0
  let gratitudes = 0
  let photos = 0

  for (const day of state.days ?? []) {
    prides += day.prides?.length ?? 0
    gratitudes += day.gratitudes?.length ?? 0
    photos += day.photos?.length ?? 0
  }

  let chatMessages = 0
  for (const thread of Object.values(state.chatThreads ?? {})) {
    chatMessages += thread.messages?.length ?? 0
  }

  let comments = 0
  for (const list of Object.values(state.comments ?? {})) {
    comments += list.length
  }

  let reactions = 0
  for (const counts of Object.values(state.dayReactions ?? {})) {
    for (const n of Object.values(counts)) reactions += n
  }

  const evidenceItems = state.evidenceItems?.length ?? 0
  const achievements = state.verifiedAchievements?.length ?? 0
  const stories = state.myStories?.length ?? 0

  const totalRecords =
    (state.days?.length ?? 0) +
    prides +
    gratitudes +
    evidenceItems +
    achievements +
    chatMessages +
    comments +
    stories

  return {
    days: state.days?.length ?? 0,
    prides,
    gratitudes,
    photos,
    evidenceItems,
    achievements,
    chatMessages,
    comments,
    stories,
    reactions,
    totalRecords,
  }
}

/** FNV-1a 32-bit хэш — короткий детерминированный отпечаток строки */
export function computeChecksum(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Короткий отпечаток всей базы — как отпечаток хранилища в «Настройках» */
export function computeDataFingerprint(state: OgonekStoreState): string {
  const stats = computeBackupStats(state)
  const signature = JSON.stringify({
    stats,
    dayIds: (state.days ?? []).map((d) => d.id),
    updated: state.privacy?.updatedAtISO ?? '',
  })
  return computeChecksum(signature).toUpperCase()
}

/* ── Строки в base64url (браузер и Node, без внешних зависимостей) ───────── */

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function utf8EncodeToBytes(input: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < input.length; i += 1) {
    let code = input.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = input.charCodeAt(i + 1)
      const combined = 0x10000 + ((code - 0xd800) << 10) + ((next - 0xdc00) & 0x3ff)
      i += 1
      bytes.push(
        0xf0 | (combined >> 18),
        0x80 | ((combined >> 12) & 0x3f),
        0x80 | ((combined >> 6) & 0x3f),
        0x80 | (combined & 0x3f)
      )
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return bytes
}

function utf8DecodeFromBytes(bytes: number[]): string {
  let output = ''
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i]
    if (byte < 0x80) {
      output += String.fromCharCode(byte)
    } else if (byte >= 0xc0 && byte < 0xe0) {
      output += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[++i] & 0x3f))
    } else if (byte >= 0xe0 && byte < 0xf0) {
      output += String.fromCharCode(
        ((byte & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f)
      )
    } else {
      const cp =
        ((byte & 0x07) << 18) |
        ((bytes[++i] & 0x3f) << 12) |
        ((bytes[++i] & 0x3f) << 6) |
        (bytes[++i] & 0x3f)
      const adjusted = cp - 0x10000
      output += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff))
    }
  }
  return output
}

/** Кодирует UTF-8 строку в base64url без внешних зависимостей */
export function toBase64Url(input: string): string {
  const bytes = utf8EncodeToBytes(input)
  let output = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined

    output += BASE64URL_ALPHABET[b0 >> 2]
    output += BASE64URL_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]
    if (b1 !== undefined) {
      output += BASE64URL_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]
    }
    if (b2 !== undefined) {
      output += BASE64URL_ALPHABET[b2 & 0x3f]
    }
  }
  return output
}

/** Декодирует base64url в UTF-8 строку. Бросает ошибку при повреждении. */
export function fromBase64Url(input: string): string {
  const clean = (input ?? '').replace(/\s+/g, '')
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (let i = 0; i < clean.length; i += 1) {
    const value = BASE64URL_ALPHABET.indexOf(clean[i])
    if (value === -1) throw new Error('Недопустимый символ в коде')
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return utf8DecodeFromBytes(bytes)
}

/* ── Полный экспорт / импорт ─────────────────────────────────────────────── */

/**
 * Полноценный переносимый JSON-бэкап базы данных: все дни, ачивки, чаты,
 * сторис, реакции, приватность и настройки стрика, дополненные метаданными
 * (отпечаток, статистика), чтобы проверять целостность.
 */
export function buildPortableBackup(state: OgonekStoreState): string {
  const payload = {
    ...state,
    generator: BACKUP_GENERATOR,
    exportedAt: new Date().toISOString(),
    fingerprint: computeDataFingerprint(state),
    stats: computeBackupStats(state),
  }
  return JSON.stringify(payload, null, 2)
}

/** Компактный код синхронизации: base64url + контрольная сумма */
export function buildSyncCode(state: OgonekStoreState): string {
  const payload = {
    ...state,
    generator: BACKUP_GENERATOR,
    exportedAt: new Date().toISOString(),
  }
  const encoded = toBase64Url(JSON.stringify(payload))
  return `${SYNC_CODE_PREFIX}${computeChecksum(encoded)}.${encoded}`
}

/** Код синхронизации? Быстрая проверка по префиксу */
export function isSyncCode(value: string): boolean {
  return (value ?? '').trim().startsWith(SYNC_CODE_PREFIX)
}

/** Проверяет контрольную сумму и достаёт исходный JSON (без валидации стора) */
export function decodeSyncCode(code: string): DecodeResult {
  const trimmed = (code ?? '').trim()
  if (!trimmed) return { success: false, error: 'Код синхронизации пуст' }
  if (!trimmed.startsWith(SYNC_CODE_PREFIX)) {
    return { success: false, error: 'Это не код синхронизации Огонька' }
  }
  const rest = trimmed.slice(SYNC_CODE_PREFIX.length)
  const dot = rest.indexOf('.')
  if (dot <= 0) return { success: false, error: 'Код синхронизации повреждён' }

  const checksum = rest.slice(0, dot)
  const encoded = rest.slice(dot + 1)
  if (computeChecksum(encoded) !== checksum) {
    return { success: false, error: 'Контрольная сумма не совпала — код повреждён при копировании' }
  }

  try {
    return { success: true, rawJson: fromBase64Url(encoded) }
  } catch {
    return { success: false, error: 'Не удалось декодировать код синхронизации' }
  }
}

export type ImportResult =
  | { success: true; data: OgonekStoreState }
  | { success: false; error: string }

/** Валидатор стора (в приложении — validateAndImportJson) */
export type StoreValidator = (rawJson: string) => ImportResult

/** Разбирает код синхронизации и передаёт JSON валидатору стора */
export function parseSyncCodeWith(code: string, validate: StoreValidator): ImportResult {
  const decoded = decodeSyncCode(code)
  if (!decoded.success) return decoded
  return validate(decoded.rawJson)
}

/** Универсальный разбор: код синхронизации или чистый JSON, через валидатор */
export function parseAnyBackupWith(raw: string, validate: StoreValidator): ImportResult {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return { success: false, error: 'Вставьте код синхронизации или JSON-бэкап' }
  if (isSyncCode(trimmed)) return parseSyncCodeWith(trimmed, validate)
  return validate(trimmed)
}

/** Человекочитаемый размер: «12,4 КБ» */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б'
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} МБ`
}

export type StorageUsage = {
  /** Размер базы Огонька в байтах */
  storeBytes: number
  /** Размер всего localStorage приложения в байтах */
  totalBytes: number
  /** Оценочная квота в байтах */
  quotaBytes: number
  /** Процент заполнения (0..100) */
  percent: number
  /** Есть ли доступ к localStorage */
  available: boolean
}

/** Измеряет занятое хранилище браузера и долю базы по указанному ключу */
export function measureStorageUsageFor(
  storeKey: string,
  quotaBytes: number = ASSUMED_QUOTA_BYTES
): StorageUsage {
  const empty: StorageUsage = {
    storeBytes: 0,
    totalBytes: 0,
    quotaBytes,
    percent: 0,
    available: false,
  }
  if (typeof window === 'undefined') return empty
  try {
    const storage = window.localStorage
    let total = 0
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (!key) continue
      const value = storage.getItem(key) ?? ''
      total += key.length + value.length
    }
    const storeRaw = storage.getItem(storeKey) ?? ''
    const storeBytes = storeRaw.length
    const percent = Math.min(100, Math.round((total / quotaBytes) * 100))
    return { storeBytes, totalBytes: total, quotaBytes, percent, available: true }
  } catch {
    return empty
  }
}
