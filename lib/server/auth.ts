import { getServerSupabase } from '../supabase/server.ts'
import type { User } from '@supabase/supabase-js'

export interface AuthenticatedUser {
  user: User
  userId: string
}

/**
 * Извлекает и проверяет авторизованного пользователя из запроса (Bearer JWT или cookie)
 */
export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization')
  let token: string | null = null

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim()
  }

  if (!token) {
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(/sb-[a-zA-Z0-9_-]+-auth-token=([^;]+)/) ||
                  cookieHeader.match(/sb-access-token=([^;]+)/) ||
                  cookieHeader.match(/supabase-auth-token=([^;]+)/)

    if (match && match[1]) {
      try {
        const decoded = decodeURIComponent(match[1])
        if (decoded.startsWith('[') || decoded.startsWith('{')) {
          const parsed = JSON.parse(decoded)
          token = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed[0])
        } else {
          token = decoded
        }
      } catch {
        token = match[1]
      }
    }
  }

  if (!token) {
    return null
  }

  try {
    const supabase = getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return null
    }
    return {
      user,
      userId: user.id,
    }
  } catch {
    return null
  }
}
