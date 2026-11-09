/**
 * CANONICAL BROWSER SUPABASE SINGLETON & AUTH MODULE — «ОГОНЁК»
 * 
 * - Singleton-клиент (@supabase/supabase-js) для всех компонентов браузера
 * - Гарантирует ровно одно WebSocket-соединение для Realtime
 * - Единый канонический домен виртуальных email: VIRTUAL_EMAIL_DOMAIN = 'ogonek.app'
 * - Обратная совместимость для существующих пользователей с '@ogonek.local'
 * - Валидация никнейма и пароля
 * - Динамическая проверка Google OAuth
 * - Загрузка медиа в бакет ogonyok-media
 */

import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js'
import { BUCKET_OGONYOK_MEDIA } from './buckets.ts'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''

export const VIRTUAL_EMAIL_DOMAIN = 'ogonek.app'
export const LEGACY_VIRTUAL_EMAIL_DOMAIN = 'ogonek.local'

export function isSupabaseConfigured(): boolean {
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_ANON_KEY
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(supabaseKey) &&
    !SUPABASE_URL.includes('your-project-ref') &&
    !supabaseKey.includes('your-anon-key')
  )
}

/**
 * Валидация никнейма:
 * Строчные латинские буквы, цифры, подчёркивание; длина от 3 до 20 символов.
 */
export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export function validateUsername(username: string): { valid: boolean; error?: string; clean: string } {
  const cleanUsername = (username || '').trim().replace(/^@+/, '').trim().toLowerCase()
  if (!cleanUsername) {
    return { valid: false, error: 'Введи никнейм', clean: '' }
  }
  if (cleanUsername.length < 3) {
    return { valid: false, error: 'Минимум 3 символа', clean: cleanUsername }
  }
  if (cleanUsername.length > 20) {
    return { valid: false, error: 'Максимум 20 символов', clean: cleanUsername }
  }
  if (!USERNAME_REGEX.test(cleanUsername)) {
    return { valid: false, error: 'Только буквы a-z, цифры 0-9 и подчёркивание _', clean: cleanUsername }
  }
  return { valid: true, clean: cleanUsername }
}

/**
 * Валидация пароля:
 * Минимум 6-8 символов, оценка сложности.
 */
export function validatePassword(password: string): { valid: boolean; score: number; label: string; error?: string } {
  if (!password) {
    return { valid: false, score: 0, label: 'Пустой', error: 'Введи пароль' }
  }
  if (password.length < 8) {
    return { valid: false, score: 1, label: 'Слишком короткий', error: 'Минимум 8 символов' }
  }

  let score = 1
  if (/[A-Z]/.test(password) || /[А-Я]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9а-яА-ЯёЁ]/.test(password)) score++
  if (password.length >= 12) score++

  const labels = ['', 'Слабый', 'Нормальный', 'Хороший', 'Отличный', 'Надёжный']
  const label = labels[Math.min(score, 5)]

  return { valid: true, score, label }
}

/**
 * Превращение никнейма в валидный email для Supabase Auth.
 * По умолчанию используется канонический VIRTUAL_EMAIL_DOMAIN ('ogonek.app').
 */
export function usernameToEmail(username: string, domain: string = VIRTUAL_EMAIL_DOMAIN): string {
  const clean = (username || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  return `${clean || 'user'}@${domain}`
}

export function emailToUsername(email: string): string {
  if (!email) return 'user'
  return email.split('@')[0] || 'user'
}

let browserClient: SupabaseClient | null = null

/**
 * Единый синглтон браузерного клиента Supabase
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_ANON_KEY

  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }
  return browserClient
}

/**
 * Сброс синглтона (используется только в изолированных тестах)
 */
export function _resetBrowserClientForTesting(): void {
  browserClient = null
}

/**
 * Перевод системных ошибок Supabase Auth на человеческий русский язык без тех. терминов.
 */
export function friendlyAuthError(errMessage: string): string {
  const lower = (errMessage || '').toLowerCase()
  if (
    lower.includes('already registered') ||
    lower.includes('user already exists') ||
    lower.includes('unique constraint')
  ) {
    return 'Этот ник уже занят'
  }
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('email not confirmed')
  ) {
    return 'Неверный логин или пароль'
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'Слишком много попыток, подожди минуту'
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed')
  ) {
    return 'Нет связи. Проверь интернет-соединение'
  }
  return errMessage || 'Произошла ошибка авторизации'
}

/**
 * Проверка уникальности никнейма в public.profiles на лету.
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const clean = (username || '').trim().toLowerCase()
  if (clean.length < 3) return false

  const client = getSupabase()
  if (!client) return true // в локальном демо-режиме считаем свободным

  try {
    let q = client
      .from('profiles')
      .select('id')
      .eq('username', clean)
      .limit(1)

    if (excludeUserId) {
      q = q.neq('id', excludeUserId)
    }

    const { data, error } = await q
    if (error) {
      return true
    }
    return !data || data.length === 0
  } catch {
    return true
  }
}

let googleEnabledCache: boolean | null = null
let googleCacheTime = 0

/**
 * Проверка включённости провайдера Google OAuth в Supabase.
 */
export async function isGoogleAuthEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const now = Date.now()
  if (googleEnabledCache !== null && now - googleCacheTime < 60_000) {
    return googleEnabledCache
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
    })
    if (res.ok) {
      const data = await res.json()
      googleEnabledCache = Boolean(data?.external?.google)
      googleCacheTime = now
      return googleEnabledCache
    }
  } catch {}

  googleEnabledCache = false
  googleCacheTime = now
  return false
}

/**
 * Регистрация нового пользователя по никнейму и паролю.
 * Внутри превращается в nick@ogonek.app с фоллбеком при необходимости.
 */
export async function signUpWithUsername(params: {
  username: string
  password: string
  displayName?: string
  level?: number
}): Promise<{ ok: boolean; user?: User | any; session?: Session | null; error?: string }> {
  const cleanNick = (params.username || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')

  if (cleanNick.length < 3) {
    return { ok: false, error: 'Никнейм должен содержать минимум 3 символа' }
  }
  if (params.password.length < 8) {
    return { ok: false, error: 'Пароль должен содержать не менее 8 символов' }
  }

  const client = getSupabase()
  if (!client) {
    const errMsg = 'База данных не подключена. Добавь ключи Supabase.'
    return { ok: false, error: errMsg }
  }

  const email = usernameToEmail(cleanNick, VIRTUAL_EMAIL_DOMAIN)
  const displayName = (params.displayName || cleanNick).trim()
  const level = Math.max(1, Math.min(5, params.level || 3))

  try {
    let { data, error } = await client.auth.signUp({
      email,
      password: params.password,
      options: {
        data: {
          username: cleanNick,
          display_name: displayName,
          level,
        },
      },
    })

    // Если Supabase отклоняет псевдодомен, пробуем legacy fallback на .local
    if (error && (error.message?.includes('invalid') || (error as any).code === 'email_address_invalid')) {
      const fallbackRes = await client.auth.signUp({
        email: usernameToEmail(cleanNick, LEGACY_VIRTUAL_EMAIL_DOMAIN),
        password: params.password,
        options: {
          data: {
            username: cleanNick,
            display_name: displayName,
            level,
          },
        },
      })
      data = fallbackRes.data
      error = fallbackRes.error
    }

    if (error) {
      return { ok: false, error: friendlyAuthError(error.message || JSON.stringify(error)) }
    }

    if (!data.user) {
      return { ok: false, error: 'Не удалось создать пользователя' }
    }

    // Гарантируем строку в public.profiles
    try {
      await client.from('profiles').upsert(
        {
          id: data.user.id,
          username: cleanNick,
          display_name: displayName,
          level,
          streak: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    } catch (profErr) {
      console.warn('Профиль будет синхронизирован триггером или фоновым sync:', profErr)
    }

    return { ok: true, user: data.user, session: data.session }
  } catch (err: any) {
    return { ok: false, error: friendlyAuthError(err?.message || JSON.stringify(err)) }
  }
}

/**
 * Вход по никнейму и паролю.
 * Сначала проверяет канонический домен @ogonek.app, при неверных учетных данных
 * проверяет legacy-пользователей с @ogonek.local.
 */
export async function signInWithUsername(params: {
  username: string
  password: string
}): Promise<{ ok: boolean; user?: User | null; session?: Session | null; error?: string }> {
  const cleanNick = (params.username || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')

  if (!cleanNick) {
    return { ok: false, error: 'Введи никнейм' }
  }
  if (!params.password) {
    return { ok: false, error: 'Введи пароль' }
  }

  const client = getSupabase()
  if (!client) {
    return { ok: false, error: 'База данных не подключена. Добавь ключи Supabase.' }
  }

  const primaryEmail = usernameToEmail(cleanNick, VIRTUAL_EMAIL_DOMAIN)

  try {
    let { data, error } = await client.auth.signInWithPassword({
      email: primaryEmail,
      password: params.password,
    })

    // Если вход с @ogonek.app не удался из-за credentials, поддерживаем старых юзеров с @ogonek.local
    if (
      error &&
      (error.message?.includes('Invalid login credentials') ||
        (error as any).code === 'invalid_credentials' ||
        error.message?.includes('not found'))
    ) {
      const legacyEmail = usernameToEmail(cleanNick, LEGACY_VIRTUAL_EMAIL_DOMAIN)
      const fallbackRes = await client.auth.signInWithPassword({
        email: legacyEmail,
        password: params.password,
      })
      if (!fallbackRes.error && fallbackRes.data?.user) {
        data = fallbackRes.data
        error = null
      }
    }

    if (error) {
      return { ok: false, error: friendlyAuthError(error.message || JSON.stringify(error)) }
    }

    return { ok: true, user: data.user, session: data.session }
  } catch (err: any) {
    return { ok: false, error: friendlyAuthError(err?.message || JSON.stringify(err)) }
  }
}

/**
 * Вход через Google OAuth
 */
export async function signInWithGoogle(redirectTo?: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase()
  if (!client) {
    return { ok: false, error: 'База данных не подключена. Добавь ключи Supabase.' }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const target = redirectTo || `${origin}/auth/callback`

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: target,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      return { ok: false, error: friendlyAuthError(error.message) }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: friendlyAuthError(err?.message) }
  }
}

/**
 * Выход из системы
 */
export async function signOut(): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase()
  if (!client) return { ok: true }
  try {
    const { error } = await client.auth.signOut()
    if (error) return { ok: false, error: friendlyAuthError(error.message) }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: friendlyAuthError(err?.message) }
  }
}

/**
 * Загрузка медиа в Supabase Storage (канонический бакет ogonyok-media)
 */
export async function uploadMediaFile(
  userId: string,
  file: File | Blob,
  fileName: string
): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  const client = getSupabase()
  if (!client) return { ok: false, error: 'База данных не подключена' }

  const filePath = `${userId}/${Date.now()}-${fileName}`
  const { error } = await client.storage.from(BUCKET_OGONYOK_MEDIA).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const { data } = client.storage.from(BUCKET_OGONYOK_MEDIA).getPublicUrl(filePath)
  return { ok: true, publicUrl: data.publicUrl }
}
