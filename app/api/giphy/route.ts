import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateSearchParams, GiphyQuerySchema } from '@/lib/server/api-validator'

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request)
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'giphy',
    limit: 60,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { searchParams } = new URL(request.url)
    const validated = await validateSearchParams(searchParams, GiphyQuerySchema)
    if (!validated.success) {
      return validated.response
    }

    const { q, limit } = validated.data
    const apiKey = process.env.GIPHY_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        keyConfigured: false,
        gifs: [],
        message: 'GIPHY_API_KEY не указан в .env.local',
      })
    }

    const endpoint = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=g`

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
    return NextResponse.json(
      { keyConfigured: true, gifs: [], error: String(err) },
      { status: 500 }
    )
  }
}
