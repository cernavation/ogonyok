import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

interface MeteredIceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

// In-memory кэш для временных credentials Metered (TTL 10 минут)
let cachedIceServers: MeteredIceServer[] | null = null
let cacheExpiresAt = 0

const FALLBACK_ICE_SERVERS: MeteredIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Canonical Open-Relay TURN fallback для тестового и изолированного окружения
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

async function fetchMeteredCredentials(domain: string, apiKey: string): Promise<MeteredIceServer[] | null> {
  const now = Date.now()
  if (cachedIceServers && cacheExpiresAt > now) {
    return cachedIceServers
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const url = `https://${domain}.metered.ca/api/v1/turn/credentials?apiKey=${apiKey}`
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[Metered] Fetch returned status ${res.status}`)
      return null
    }

    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      cachedIceServers = data
      cacheExpiresAt = now + 10 * 60 * 1000 // 10 минут
      return data
    }
    return null
  } catch (err: any) {
    console.warn('[Metered] Fetch failed:', err?.message || err)
    return null
  }
}

/**
 * GET /api/webrtc/ice-servers
 * Возвращает актуальные ICE (STUN/TURN) серверы только для аутентифицированных пользователей.
 * Параметр ?relay=true возвращает строго TURN серверы с iceTransportPolicy: 'relay' для проверки обхода NAT.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('webrtc-ice-servers', ip, 60, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const isRelayOnly = searchParams.get('relay') === 'true' || searchParams.get('relay') === '1'

  const meteredDomain = process.env.METERED_DOMAIN
  const meteredApiKey = process.env.METERED_API_KEY

  let servers: MeteredIceServer[] = []

  if (meteredDomain && meteredApiKey) {
    const meteredServers = await fetchMeteredCredentials(meteredDomain, meteredApiKey)
    if (meteredServers && meteredServers.length > 0) {
      servers = meteredServers
    }
  }

  if (servers.length === 0) {
    servers = FALLBACK_ICE_SERVERS
  }

  if (isRelayOnly) {
    // В режиме relay-only оставляем исключительно turn/turns серверы
    const relayServers = servers.filter((s) => {
      const u = Array.isArray(s.urls) ? s.urls : [s.urls]
      return u.some((url) => url.startsWith('turn:') || url.startsWith('turns:'))
    })
    return NextResponse.json({
      iceServers: relayServers.length > 0 ? relayServers : servers,
      iceTransportPolicy: 'relay',
      ttlSeconds: 600,
    })
  }

  return NextResponse.json({
    iceServers: servers,
    iceTransportPolicy: 'all',
    ttlSeconds: 600,
  })
}
