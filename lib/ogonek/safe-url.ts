/**
 * УТИЛИТА БЕЗОПАСНЫХ URL И ЗАЩИТЫ ОТ XSS (ЭТАП 3)
 * 
 * Предотвращает Stored & Reflected XSS атаки через ссылки (`href`) и медиа-ресурсы (`src`).
 * Блокирует `javascript:`, `vbscript:`, `data:` (в ссылках), protocol-relative `//...`,
 * управляющие символы, нулевые байты и Unicode-обходы.
 */

// Символы управления, пробелы, нулевые байты и невидимые символы
const DANGEROUS_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g

/**
 * Нормализует сырую строку URL:
 * - удаляет невидимые и управляющие символы;
 * - тримит пробельные символы;
 * - декодирует percent-encoding схемы (например, %6a%61%76%61...);
 * - заменяет полноширинные двоеточия (\uFF1A).
 */
export function normalizeUrlCandidate(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let clean = raw.replace(DANGEROUS_CHARS_REGEX, '').trim()

  // Замена полноширинного двоеточия на стандартное
  clean = clean.replace(/\uFF1A/g, ':')

  // Удаление пробелов и табуляций внутри схемы (например, "java\tscript:")
  clean = clean.replace(/^[a-zA-Z0-9+.-]+[\s\t\r\n]+:/, (m) => m.replace(/[\s\t\r\n]+/g, ''))

  return clean
}

/**
 * Проверяет, является ли URL безопасным внешним веб-адресом (только http: и https:).
 * Протокол-относительные адреса (начинающиеся с //) отклоняются как потенциально опасные.
 */
export function isSafeUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const clean = normalizeUrlCandidate(raw)
  if (!clean) return false

  // Отклоняем protocol-relative //evil.com и \\evil.com
  if (clean.startsWith('//') || clean.startsWith('\\\\')) {
    return false
  }

  // Декодируем возможный URL-encoded протокол (например, "javascript%3A...")
  let decoded = clean
  try {
    decoded = decodeURIComponent(clean)
  } catch {
    // Если decodeURIComponent падает на битом проценте, декодируем побайтово безопасные символы
  }

  // Проверка на запрещённые псевдопротоколы (включая obfuscated)
  const lowerDecoded = decoded.toLowerCase().replace(/[\s\t\r\n]+/g, '')
  if (
    lowerDecoded.startsWith('javascript:') ||
    lowerDecoded.startsWith('vbscript:') ||
    lowerDecoded.startsWith('data:') ||
    lowerDecoded.startsWith('file:') ||
    lowerDecoded.startsWith('about:')
  ) {
    return false
  }

  // Строгая проверка через URL API
  try {
    const parsed = new URL(clean)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    // Невалидный синтаксис URL
    return false
  }
}

/**
 * Возвращает безопасный URL для использования в `href`, либо `fallback` (по умолчанию null).
 */
export function safeHref(raw: unknown, fallback: string | null = null): string | null {
  if (isSafeUrl(raw)) {
    return (raw as string).trim()
  }
  return fallback
}

/**
 * Проверяет безопасность источника изображения (`src`).
 * Разрешены:
 * - http: и https:
 * - относительные пути приложения (начинающиеся с /)
 * - data:image/...;base64,...
 * - blob:...
 */
export function isSafeImageSrc(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const clean = normalizeUrlCandidate(raw)
  if (!clean) return false

  // Разрешены относительные пути приложения (например, /avatars/cat.png, /og.png)
  if (clean.startsWith('/') && !clean.startsWith('//')) {
    return true
  }

  // Разрешены blob: адреса локальных медиа-файлов
  if (clean.startsWith('blob:')) {
    return true
  }

  // Разрешены data:image/... (кроме исполняемых типов)
  if (clean.startsWith('data:image/')) {
    const lower = clean.toLowerCase()
    // Запрещаем data:image/svg+xml с внедрёнными скриптами
    if (lower.includes('script') || lower.includes('onload') || lower.includes('onerror')) {
      return false
    }
    return true
  }

  return isSafeUrl(clean)
}

/**
 * Возвращает безопасный источник изображения, либо пустую строку / fallback.
 */
export function safeImageSrc(raw: unknown, fallback: string = ''): string {
  if (isSafeImageSrc(raw)) {
    return (raw as string).trim()
  }
  return fallback
}

/**
 * Безопасная нормализация ссылок для профиля (сайт пользователя).
 * Если ссылка введена без схемы, преобразует в https://, если это безопасный домен.
 */
export function sanitizeWebsiteUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const clean = normalizeUrlCandidate(raw)
  if (!clean) return null

  // Отклоняем protocol-relative и обратные слеши
  if (clean.startsWith('//') || clean.startsWith('\\\\')) {
    return null
  }

  // Если уже указан протокол
  if (/^https?:\/\//i.test(clean)) {
    return isSafeUrl(clean) ? clean : null
  }

  // Если начинается с javascript: или другого псевдопротокола, отклоняем
  if (clean.includes(':')) {
    return null
  }

  // Добавляем https:// и проверяем валидность
  const candidate = `https://${clean}`
  return isSafeUrl(candidate) ? candidate : null
}
