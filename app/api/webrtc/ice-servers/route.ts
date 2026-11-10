import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { applyRateLimit } from '@/lib/server/rate-limit'

export async function GET(request: Request) {
  // 1. Проверка авторизации: доступ к ICE/TURN серверам только для авторизованных пользователей
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Требуется авторизация для получения ICE-серверов' } },
      { status: 401 }
    )
  }

  // 2. Rate limit: 30 запросов в минуту на пользователя
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'webrtc-ice-servers',
    limit: 30,
    windowSeconds: 60,
    userId: authUser.userId,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const rawMeteredApp = process.env.METERED_APP || process.env.METERED_DOMAIN
  const meteredApiKey = process.env.METERED_API_KEY

  if (rawMeteredApp && meteredApiKey) {
    const meteredDomain = rawMeteredApp.includes('.')
      ? rawMeteredApp
      : `${rawMeteredApp}.metered.live`

    try {
      const res = await fetch(
        `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (res.ok) {
        const iceServers = await res.json()
        return NextResponse.json({ iceServers, provider: 'metered' })
      } else {
        console.warn(`[WebRTC] Metered API returned HTTP ${res.status}, falling back to STUN.`)
      }
    } catch (err) {
      console.warn('[WebRTC] Failed to fetch Metered TURN credentials, falling back to STUN:', err)
    }
  } else {
    console.warn(
      '[WebRTC] Metered credentials not configured (METERED_API_KEY / METERED_APP missing). ' +
      'Falling back to STUN only. To enable TURN, follow instructions in night/MANUAL_STEPS.md.'
    )
  }

  // Fallback: публичные надежные Google STUN серверы
  const defaultIceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]

  return NextResponse.json({
    iceServers: defaultIceServers,
    provider: 'stun',
  })
}
