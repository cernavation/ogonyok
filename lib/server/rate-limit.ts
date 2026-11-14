import { getServerSupabase } from '../supabase/server.ts'
import { getAuthenticatedUser } from './auth.ts'

/**
 * Локальное in-memory хранилище для фолбэка (если Supabase недоступен или в unit-тестах)
 */
interface LocalRecord {
  count: number
  windowStart: number
}
const localStores = new Map<string, LocalRecord>()

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

/**
 * Извлекает /24 подсеть для IPv4 (или /48 для IPv6)
 */
export function getSubnet24(ip: string): string {
  const clean = (ip || '').trim()
  if (clean.includes('.')) {
    // IPv4: 192.168.1.100 -> 192.168.1.0/24
    const parts = clean.split('.')
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
    }
  } else if (clean.includes(':')) {
    // IPv6: берем первые 3 блока
    const parts = clean.split(':').filter(Boolean)
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}::/48`
    }
  }
  return `${clean}/24`
}

/**
 * Формирует канонический ключ rate limit: userId (если вошел) + IP + route
 */
export function buildRateLimitKey(params: {
  route: string
  userId?: string | null
  ip?: string
}): string {
  const ip = params.ip || '127.0.0.1'
  const userPrefix = params.userId ? `u:${params.userId}:` : ''
  return `${userPrefix}ip:${ip}:${params.route}`
}

/**
 * Проверка rate limit через RPC check_rate_limit в PostgreSQL (или in-memory fallback)
 */
export async function checkRateLimit(
  key: string,
  limit: number = 30,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (!error && typeof data === 'boolean') {
      return {
        allowed: data,
        remaining: data ? 1 : 0,
        retryAfter: data ? 0 : windowSeconds,
      }
    }
  } catch {
    // В случае сбоя сети или отсутствия Supabase используем in-memory fallback
  }

  // Fallback: in-memory sliding window
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const record = localStores.get(key)

  if (!record || now - record.windowStart >= windowMs) {
    localStores.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  if (record.count >= limit) {
    const remainingMs = Math.max(1000, windowMs - (now - record.windowStart))
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(remainingMs / 1000),
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: limit - record.count,
    retryAfter: 0,
  }
}

/**
 * Императивная проверка rate limit внутри обработчика маршрута
 */
export async function applyRateLimit(
  request: Request,
  options: {
    route: string
    limit: number
    windowSeconds: number
    userId?: string | null
  }
): Promise<Response | null> {
  const ip = getClientIp(request)
  const key = buildRateLimitKey({
    route: options.route,
    userId: options.userId,
    ip,
  })

  const result = await checkRateLimit(key, options.limit, options.windowSeconds)

  if (!result.allowed) {
    return Response.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Превышен лимит запросов. Пожалуйста, подождите.',
          retryAfter: result.retryAfter,
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': String(options.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  return null
}

/**
 * Декларативная обёртка withRateLimit над route handler
 */
export function withRateLimit(
  options: {
    route: string
    limit: number
    windowSeconds: number
  },
  handler: (request: Request, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any): Promise<Response> => {
    const userAuth = await getAuthenticatedUser(request)
    const blocked = await applyRateLimit(request, {
      route: options.route,
      limit: options.limit,
      windowSeconds: options.windowSeconds,
      userId: userAuth?.userId,
    })

    if (blocked) {
      return blocked
    }

    return handler(request, context)
  }
}
