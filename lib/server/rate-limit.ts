/**
 * In-memory sliding-window rate limiter for Next.js API routes.
 */

type RateLimitRecord = {
  count: number
  resetAt: number
}

const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>()

export function checkRateLimit(
  bucket: string,
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetInMs: number } {
  if (!rateLimitStores.has(bucket)) {
    rateLimitStores.set(bucket, new Map())
  }
  const store = rateLimitStores.get(bucket)!
  const now = Date.now()
  const record = store.get(identifier)

  if (!record || now > record.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetInMs: windowMs }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetInMs: Math.max(0, record.resetAt - now) }
  }

  record.count++
  return { allowed: true, remaining: maxRequests - record.count, resetInMs: Math.max(0, record.resetAt - now) }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}
