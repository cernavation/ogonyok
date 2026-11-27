import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/browser'
import { STORAGE_KEY } from './storage'

export type FastAuthHint = {
  hasStoreAuth: boolean
  hasSbToken: boolean
  signedIn: boolean
}

/**
 * Checks synchronous browser storage/cookies for an active auth session
 * using the canonical STORAGE_KEY ('ogonek.v2') and Supabase auth tokens.
 */
export function getFastAuthHint(): FastAuthHint {
  if (typeof window === 'undefined') {
    return { hasStoreAuth: false, hasSbToken: false, signedIn: false }
  }

  let hasStoreAuth = false
  let hasSbToken = false

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.auth?.signedIn && parsed?.auth?.activeAccountId) {
        hasStoreAuth = true
      }
    }
  } catch {}

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = window.localStorage.getItem(key)
        if (val && val !== 'null' && val !== 'undefined' && val !== '{}') {
          hasSbToken = true
          break
        }
      }
    }
  } catch {}

  try {
    if (!hasSbToken && typeof document !== 'undefined' && document.cookie) {
      hasSbToken = /(?:^|;\s*)sb-[^=]*-auth-token[^=]*=/.test(document.cookie)
    }
  } catch {}

  return {
    hasStoreAuth,
    hasSbToken,
    signedIn: hasStoreAuth || hasSbToken,
  }
}

/**
 * Verifies the active Supabase session asynchronously (allowing token refresh),
 * falling back to verified local store auth when offline or in guest mode.
 */
export async function resolveBrowserSession(): Promise<{
  authenticated: boolean
  userId: string | null
}> {
  const hint = getFastAuthHint()

  if (!isSupabaseConfigured()) {
    if (hint.hasStoreAuth) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : null
        return {
          authenticated: true,
          userId: parsed?.auth?.activeAccountId || null,
        }
      } catch {}
    }
    return { authenticated: hint.hasStoreAuth, userId: null }
  }

  try {
    const client = getSupabase()
    if (client) {
      const { data, error } = await client.auth.getSession()
      if (data?.session?.user) {
        return { authenticated: true, userId: data.session.user.id }
      }
      if (error && hint.signedIn) {
        return { authenticated: true, userId: null }
      }
    }
  } catch {
    if (hint.signedIn) {
      return { authenticated: true, userId: null }
    }
  }

  if (hint.hasStoreAuth) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      const activeId = parsed?.auth?.activeAccountId || null
      if (activeId) {
        return { authenticated: true, userId: activeId }
      }
    } catch {}
  }

  return { authenticated: false, userId: null }
}
