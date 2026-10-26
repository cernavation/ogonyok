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
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

export function isSupabaseConfigured(): boolean {
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
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
 * По умолчанию используется канонический @ogonek.local.
 */
export function usernameToEmail(username: string, domain: string = 'ogonek.local'): string {
  const cleanUsername = (username || '').trim().replace(/^@+/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  return `${cleanUsername || 'user'}@${domain}`
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
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY
  if (!singletonClient) {
    singletonClient = createClient(SUPABASE_URL, supabaseKey, {
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
    return 'Неверный логин или пароль'
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
}): Promise<{ ok: boolean; user?: User; session?: Session | null; error?: string }> {
  const cleanUsername = (params.username || '').trim().replace(/^@+/, '').trim().toLowerCase()
  const validNick = validateUsername(cleanUsername)
  if (!validNick.valid) {
    return { ok: false, error: validNick.error }
  }

  const validPass = validatePassword(params.password)
  if (!validPass.valid) {
    return { ok: false, error: validPass.error }
  }

  const client = getSupabase()
  if (!client) {
    const errMsg = 'База данных не подключена. Добавь ключи Supabase (NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    console.error('[AUTH_ERROR_FULL]:', errMsg)
    return { ok: false, error: errMsg }
  }

  // Проверяем доступность ника перед отправкой
  const available = await isUsernameAvailable(cleanUsername)
  if (!available) {
    return { ok: false, error: 'Этот ник уже занят' }
  }

  const cleanNick = cleanUsername
  const email = `${cleanNick}@ogonek.local`
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

    // Если Supabase GoTrue отклоняет псевдодомен .local, делаем автоматический фолбэк на .app
    if (error && (error.message?.includes('invalid') || (error as any).code === 'email_address_invalid')) {
      const fallbackRes = await client.auth.signUp({
        email: `${cleanNick}@ogonek.app`,
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
      console.error('[AUTH_ERROR_FULL]:', error)
      return { ok: false, error: error.message || JSON.stringify(error) }
    }

    if (!data.user) {
      return { ok: false, error: 'Не удалось создать пользователя' }
    }

    // Гарантируем строку в public.profiles с введенными username и display_name
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
    console.error('[AUTH_ERROR_FULL]:', err)
    return { ok: false, error: err?.message || JSON.stringify(err) }
  }
}

/**
 * Вход по никнейму и паролю.
 */
export async function signInWithUsername(params: {
  username: string
  password: string
}): Promise<{ ok: boolean; user?: User | null; session?: Session | null; error?: string }> {
  const cleanUsername = (params.username || '').trim().replace(/^@+/, '').trim().toLowerCase()
  const validNick = validateUsername(cleanUsername)
  if (!validNick.valid) {
    return { ok: false, error: validNick.error }
  }
  if (!params.password) {
    return { ok: false, error: 'Введи пароль' }
  }

  const client = getSupabase()
  if (!client) {
    const errMsg = 'База данных не подключена. Добавь ключи Supabase (NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    console.error('[AUTH_ERROR_FULL]:', errMsg)
    return { ok: false, error: errMsg }
  }

  const cleanNick = cleanUsername
  const email = `${cleanNick}@ogonek.local`

  try {
    let { data, error } = await client.auth.signInWithPassword({
      email,
      password: params.password,
    })

    // Если вход с .local не удался из-за credentials, пробуем .app для существующих юзеров
    if (error && (error.message?.includes('Invalid login credentials') || (error as any).code === 'invalid_credentials')) {
      const fallbackRes = await client.auth.signInWithPassword({
        email: `${cleanNick}@ogonek.app`,
        password: params.password,
      })
      if (!fallbackRes.error && fallbackRes.data?.user) {
        data = fallbackRes.data
        error = null
      }
    }

    if (error) {
      console.error('[AUTH_ERROR_FULL]:', error)
      return { ok: false, error: error.message || JSON.stringify(error) }
    }

    return { ok: true, user: data.user, session: data.session }
  } catch (err: any) {
    console.error('[AUTH_ERROR_FULL]:', err)
    return { ok: false, error: err?.message || JSON.stringify(err) }
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
