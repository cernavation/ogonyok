import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('giphy', ip, 30, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { keyConfigured: false, gifs: [], error: 'Слишком много запросов GIF. Подождите минуту.' },
      { status: 429 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const apiKey = process.env.GIPHY_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        keyConfigured: false,
        gifs: [],
        message: 'GIPHY_API_KEY не указан в .env.local',
      })
    }

    const endpoint = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=24&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`

    const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) {
      return NextResponse.json({ keyConfigured: true, gifs: [], error: `Giphy API ${res.status}` })
    }

    const json = await res.json()
    const rawList = Array.isArray(json?.data) ? json.data : []
    const gifs = rawList.map((item: any) => ({
      id: item.id,
      title: item.title,
      url: item.images?.fixed_height?.url || item.images?.original?.url,
      previewUrl: item.images?.fixed_height_small?.url || item.images?.preview_gif?.url,
      width: item.images?.fixed_height?.width,
      height: item.images?.fixed_height?.height,
    }))

    return NextResponse.json({
      keyConfigured: true,
      gifs,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка Giphy'
    return NextResponse.json({ keyConfigured: false, gifs: [], error: message }, { status: 500 })
  }
}
