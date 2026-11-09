/**
 * ЗАЩИТА ОТ МАССОВЫХ АККАУНТОВ И ЗЛОУПОТРЕБЛЕНИЙ (ЭТАП 5)
 */

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'support',
  'help',
  'ogonek',
  'ogonyok',
  'memernity',
  'cernavation',
  'alex_cerna',
  'alexeicerna',
  'root',
  'system',
  'moderator',
  'official',
  'api',
  'dev',
  'security',
  'billing',
  'auth',
  'null',
  'undefined',
  'bot',
  'superuser',
])

const HOMOGLYPHS: Record<string, string> = {
  'а': 'a',
  'в': 'b',
  'с': 'c',
  'е': 'e',
  'ё': 'e',
  'к': 'k',
  'м': 'm',
  'о': 'o',
  'р': 'p',
  'т': 't',
  'х': 'x',
  'у': 'y',
  'i': 'i',
  'і': 'i',
  'ї': 'i',
}

/**
 * Нормализует никнейм и вычисляет его каноническую форму без юникод-двойников
 */
export function normalizeUsername(raw: string): { normalized: string; canonical: string } {
  const clean = (raw || '').trim().toLowerCase().replace(/^@+/, '')
  let canonical = ''
  for (const char of clean) {
    canonical += HOMOGLYPHS[char] || char
  }
  return {
    normalized: clean,
    canonical,
  }
}

/**
 * Проверка допустимости никнейма
 */
export function validateUsernameSecurity(
  username: string,
  isOwner = false
): { valid: boolean; error?: string; normalized: string } {
  const { normalized, canonical } = normalizeUsername(username)

  if (!normalized || normalized.length < 3) {
    return { valid: false, error: 'Никнейм должен содержать минимум 3 символа', normalized }
  }

  if (normalized.length > 20) {
    return { valid: false, error: 'Никнейм не может быть длиннее 20 символов', normalized }
  }

  // Защита от резервированных имен (проверяем как сам ник, так и канонический вид через гомоглифы)
  if (!isOwner) {
    if (RESERVED_USERNAMES.has(normalized) || RESERVED_USERNAMES.has(canonical)) {
      return {
        valid: false,
        error: 'Этот никнейм зарезервирован системой',
        normalized,
      }
    }
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      valid: false,
      error: 'Никнейм может содержать только латинские буквы, цифры и символ подчеркивания',
      normalized,
    }
  }

  return { valid: true, normalized }
}

/**
 * Валидация надёжности пароля
 */
export function validatePasswordSecurity(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Пароль должен содержать минимум 8 символов' }
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну букву' }
  }

  if (!/[0-9\W_]/.test(password)) {
    return { valid: false, error: 'Пароль должен содержать хотя бы одну цифру или спецсимвол' }
  }

  return { valid: true }
}

/**
 * Проверка времени заполнения формы (защита от мгновенных скриптов ботов)
 */
export function validateFormTiming(
  formStartTime?: number | string | null,
  minSeconds = 3
): { valid: boolean; error?: string } {
  if (!formStartTime) {
    return { valid: false, error: 'Отсутствует метка времени формы' }
  }

  const startMs = typeof formStartTime === 'string' ? Number(formStartTime) : formStartTime
  if (isNaN(startMs) || startMs <= 0) {
    return { valid: false, error: 'Некорректная метка времени формы' }
  }

  const elapsedMs = Date.now() - startMs
  if (elapsedMs < minSeconds * 1000) {
    return {
      valid: false,
      error: `Форма заполнена слишком быстро (${(elapsedMs / 1000).toFixed(1)} сек, минимум ${minSeconds} сек)`,
    }
  }

  return { valid: true }
}

/**
 * Валидация капчи Cloudflare Turnstile
 */
export async function verifyTurnstileToken(
  token?: string,
  clientIp?: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    console.warn('[TURNSTILE]: TURNSTILE_SECRET_KEY не настроен в env. Пропуск проверки капчи с предупреждением.')
    return { ok: true, skipped: true }
  }

  if (!token) {
    return { ok: false, error: 'Капча Turnstile обязательна для регистрации' }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (clientIp) {
      formData.append('remoteip', clientIp)
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(5000),
    })

    const data = await res.json()
    if (!data.success) {
      return { ok: false, error: 'Проверка Turnstile не пройдена' }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('[TURNSTILE_ERROR]:', err)
    return { ok: false, error: 'Ошибка проверки сервиса капчи Turnstile' }
  }
}
