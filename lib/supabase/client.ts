import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

export function isSupabaseConfigured(): boolean {
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(supabaseKey) &&
    !SUPABASE_URL.includes('your-project-ref') &&
    !supabaseKey.includes('your-anon-key')
  )
}

export function usernameToEmail(username: string, domain: string = 'ogonek.local'): string {
  const clean = (username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  return `${clean || 'user'}@${domain}`
}

export function emailToUsername(email: string): string {
  if (!email) return 'user'
  return email.split('@')[0] || 'user'
}

let browserClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY
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
 * Регистрация по никнейму и паролю.
 * Внутри превращается в `ник@ogonek.app`.
 */
export async function signUpWithUsername(params: {
  username: string
  password: string
  level?: number
  displayName?: string
}): Promise<{ ok: boolean; user?: any; error?: string }> {
  const client = getSupabase()
  if (!client) {
    const errMsg = 'Supabase не настроен. Подключите базу данных.'
    console.error('[AUTH_ERROR_FULL]:', errMsg)
    return { ok: false, error: errMsg }
  }

  const cleanNick = (params.username || '').replace(/^@+/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (cleanNick.length < 3) {
    return { ok: false, error: 'Никнейм должен содержать минимум 3 символа (a-z, 0-9, _, -)' }
  }
  if (params.password.length < 6) {
    return { ok: false, error: 'Пароль должен содержать не менее 6 символов' }
  }

  const email = usernameToEmail(cleanNick)
  const level = Math.max(1, Math.min(5, params.level || 3))
  const displayName = (params.displayName || cleanNick).trim()

  try {
    const { data, error } = await client.auth.signUp({
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

    if (error) {
      console.error('[AUTH_ERROR_FULL]:', error)
      return { ok: false, error: error.message || JSON.stringify(error) }
    }

    return { ok: true, user: data.user }
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
}): Promise<{ ok: boolean; user?: any; session?: any; error?: string }> {
  const client = getSupabase()
  if (!client) {
    const errMsg = 'Supabase не настроен. Подключите базу данных.'
    console.error('[AUTH_ERROR_FULL]:', errMsg)
    return { ok: false, error: errMsg }
  }

  const cleanNick = (params.username || '').replace(/^@+/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (!cleanNick) {
    return { ok: false, error: 'Введите никнейм' }
  }
  if (!params.password) {
    return { ok: false, error: 'Введите пароль' }
  }

  const email = usernameToEmail(cleanNick)

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: params.password,
    })

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
    return { ok: false, error: 'Supabase не настроен. Добавьте ключи в .env.local.' }
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const target = redirectTo || `${origin}/auth/callback`
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
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Проверка уникальности никнейма на лету
 */
export async function isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
  const client = getSupabase()
  if (!client) return true
  const clean = username.trim().toLowerCase()
  if (clean.length < 3) return false

  let q = client
    .from('profiles')
    .select('id')
    .eq('username', clean)
    .limit(1)

  if (currentUserId) {
    q = q.neq('id', currentUserId)
  }

  const { data, error } = await q
  if (error || !data) return true
  return data.length === 0
}

/**
 * Выход из системы
 */
export async function signOut(): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase()
  if (!client) return { ok: true }
  const { error } = await client.auth.signOut()
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Загрузка медиа в Supabase Storage (бакет ogonek-media)
 */
export async function uploadMediaFile(
  userId: string,
  file: File | Blob,
  fileName: string
): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  const client = getSupabase()
  if (!client) return { ok: false, error: 'База данных не подключена' }

  const filePath = `${userId}/${Date.now()}-${fileName}`
  const { error } = await client.storage.from('ogonek-media').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const { data } = client.storage.from('ogonek-media').getPublicUrl(filePath)
  return { ok: true, publicUrl: data.publicUrl }
}
