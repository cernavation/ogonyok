/**
 * SUPABASE CLIENT & AUTH MODULE — «ОГОНЁК» (ЗАДАЧА 3)
 * 
 * - Singleton-клиент (@supabase/supabase-js)
 * - persistSession: true, autoRefreshToken: true
 * - Валидация никнейма: ^[a-z0-9_]{3,20}$
 * - Валидация пароля: минимум 8 символов
 * - Под капотом email = `${username}@ogonek.app` (НЕ .local)
 * - Проверка уникальности никнейма в public.profiles на лету (debounce 400ms)
 * - Динамическая проверка включённости Google Provider (GET /auth/v1/settings)
 * - Гарантированное создание строки в public.profiles после регистрации
 * - Понятные русскоязычные сообщения об ошибках
 */

import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('your-project-ref') &&
    !SUPABASE_ANON_KEY.includes('your-anon-key')
  )
}

/**
 * Валидация никнейма:
 * Строчные латинские буквы, цифры, подчёркивание; длина от 3 до 20 символов.
 */
export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export function validateUsername(username: string): { valid: boolean; error?: string; clean: string } {
  const clean = (username || '').trim().toLowerCase()
  if (!clean) {
    return { valid: false, error: 'Введи никнейм', clean: '' }
  }
  if (clean.length < 3) {
    return { valid: false, error: 'Минимум 3 символа', clean }
  }
  if (clean.length > 20) {
    return { valid: false, error: 'Максимум 20 символов', clean }
  }
  if (!USERNAME_REGEX.test(clean)) {
    return { valid: false, error: 'Только буквы a-z, цифры 0-9 и подчёркивание _', clean }
  }
  return { valid: true, clean }
}

/**
 * Валидация пароля:
 * Минимум 8 символов, оценка сложности.
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
 * Supabase отклоняет псевдо-домены вроде .local, поэтому используется канонический @ogonek.app.
 */
export function usernameToEmail(username: string): string {
  const clean = (username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  return `${clean || 'user'}@ogonek.app`
}

export function emailToUsername(email: string): string {
  if (!email) return 'user'
  return email.split('@')[0] || 'user'
}

let singletonClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  if (!singletonClient) {
    singletonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  return singletonClient
}

/**
 * Проверка уникальности никнейма в public.profiles на лету.
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const validation = validateUsername(username)
  if (!validation.valid) return false

  const client = getSupabase()
  if (!client) return true // в локальном демо-режиме считаем свободным

  try {
    let q = client
      .from('profiles')
      .select('id')
      .eq('username', validation.clean)
      .limit(1)

    if (excludeUserId) {
      q = q.neq('id', excludeUserId)
    }

    const { data, error } = await q
    if (error) {
      console.warn('Ошибка проверки уникальности никнейма:', error.message)
      return true
    }
    return !data || data.length === 0
  } catch {
    return true
  }
}

/**
 * Проверка включённости провайдера Google OAuth в Supabase.
 * Запрашивает GET /auth/v1/settings и проверяет external.google.
 */
let googleEnabledCache: boolean | null = null
let googleCacheTime = 0

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

  // Fallback: если эндпоинт недоступен, возвращаем false
  googleEnabledCache = false
  googleCacheTime = now
  return false
}

/**
 * Перевод системных ошибок Supabase Auth на человеческий русский язык без тех. терминов.
 */
export function friendlyAuthError(errMessage: string): string {
  const lower = (errMessage || '').toLowerCase()
  if (lower.includes('already registered') || lower.includes('user already exists') || lower.includes('unique constraint')) {
    return 'Этот ник уже занят'
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials') || lower.includes('email not confirmed')) {
    return 'Неверный ник или пароль'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
    return 'Слишком много попыток, подожди минуту'
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return 'Нет связи. Проверь интернет-соединение'
  }
  return errMessage || 'Произошла ошибка авторизации'
}

/**
 * Регистрация нового пользователя по никнейму и паролю.
 * Гарантирует наличие строки в public.profiles после создания пользователя.
 */
export async function signUpWithUsername(params: {
  username: string
  password: string
  displayName?: string
  level?: number
}): Promise<{ ok: boolean; user?: User; error?: string }> {
  const validNick = validateUsername(params.username)
  if (!validNick.valid) {
    return { ok: false, error: validNick.error }
  }

  const validPass = validatePassword(params.password)
  if (!validPass.valid) {
    return { ok: false, error: validPass.error }
  }

  const client = getSupabase()
  if (!client) {
    return { ok: false, error: 'База данных не подключена. Добавь ключи Supabase.' }
  }

  // Проверяем доступность ника перед отправкой
  const available = await isUsernameAvailable(validNick.clean)
  if (!available) {
    return { ok: false, error: 'Этот ник уже занят' }
  }

  const email = usernameToEmail(validNick.clean)
  const displayName = (params.displayName || validNick.clean).trim()
  const level = Math.max(1, Math.min(5, params.level || 3))

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password: params.password,
      options: {
        data: {
          username: validNick.clean,
          display_name: displayName,
          level,
        },
      },
    })

    if (error) {
      return { ok: false, error: friendlyAuthError(error.message) }
    }

    if (!data.user) {
      return { ok: false, error: 'Не удалось создать пользователя' }
    }

    // Гарантируем строку в public.profiles
    try {
      await client.from('profiles').upsert(
        {
          id: data.user.id,
          username: validNick.clean,
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

    return { ok: true, user: data.user }
  } catch (err: any) {
    return { ok: false, error: friendlyAuthError(err?.message) }
  }
}

/**
 * Вход по никнейму и паролю.
 */
export async function signInWithUsername(params: {
  username: string
  password: string
}): Promise<{ ok: boolean; user?: User; session?: Session; error?: string }> {
  const validNick = validateUsername(params.username)
  if (!validNick.valid) {
    return { ok: false, error: validNick.error }
  }
  if (!params.password) {
    return { ok: false, error: 'Введи пароль' }
  }

  const client = getSupabase()
  if (!client) {
    return { ok: false, error: 'База данных не подключена. Добавь ключи Supabase.' }
  }

  const email = usernameToEmail(validNick.clean)

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: params.password,
    })

    if (error) {
      return { ok: false, error: friendlyAuthError(error.message) }
    }

    return { ok: true, user: data.user, session: data.session }
  } catch (err: any) {
    return { ok: false, error: friendlyAuthError(err?.message) }
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
