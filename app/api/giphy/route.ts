import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

type GifResult = {
  id: string
  title: string
  url: string
  previewUrl: string
  width?: number
  height?: number
}

function parseKlipyOrTenorResults(json: any): GifResult[] {
  const rows = Array.isArray(json?.results)
    ? json.results
    : Array.isArray(json?.data?.data)
      ? json.data.data
      : Array.isArray(json?.data)
        ? json.data
        : []

  const gifs: GifResult[] = []
  for (const item of rows) {
    if (!item) continue
    const mf = item.media_formats || item.file || {}
    const gifUrl =
      mf?.gif?.url ||
      mf?.hd?.gif?.url ||
      mf?.md?.gif?.url ||
      item?.images?.fixed_height?.url ||
      item?.images?.original?.url ||
      item?.url
    const previewUrl =
      mf?.tinygif?.url ||
      mf?.nanogif?.url ||
      mf?.sm?.gif?.url ||
      item?.images?.fixed_height_small?.url ||
      gifUrl

    if (!gifUrl) continue
    gifs.push({
      id: String(item.id || gifs.length),
      title: String(item.content_description || item.title || 'GIF'),
      url: gifUrl,
      previewUrl: previewUrl || gifUrl,
      width: mf?.gif?.dims?.[0],
      height: mf?.gif?.dims?.[1],
    })
  }
  return gifs
}

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('giphy', ip, 40, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { keyConfigured: false, gifs: [], error: 'Слишком много запросов GIF. Подождите минуту.' },
      { status: 429 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const hasCyrillic = /[а-яё]/i.test(q)

    const klipyKey = process.env.KLIPY_API_KEY?.trim()
    const giphyKey = process.env.GIPHY_API_KEY?.trim()
    const tenorKey = process.env.TENOR_API_KEY?.trim()

    if (!klipyKey && !giphyKey && !tenorKey) {
      return NextResponse.json({
        keyConfigured: false,
        gifs: [],
        error: 'Добавьте KLIPY_API_KEY или GIPHY_API_KEY в переменные окружения',
      })
    }

    if (klipyKey) {
      const endpoint = q
        ? `https://api.klipy.com/v2/search?key=${encodeURIComponent(klipyKey)}&q=${encodeURIComponent(q)}&limit=24&locale=${hasCyrillic ? 'ru_RU' : 'en_US'}&media_filter=gif,tinygif&contentfilter=medium`
        : `https://api.klipy.com/v2/featured?key=${encodeURIComponent(klipyKey)}&limit=24&locale=ru_RU&media_filter=gif,tinygif&contentfilter=medium`

      const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) })
      if (res.ok) {
        const json = await res.json()
        return NextResponse.json({
          keyConfigured: true,
          gifs: parseKlipyOrTenorResults(json),
        })
      }
      if (!giphyKey && !tenorKey) {
        return NextResponse.json({ keyConfigured: true, gifs: [], error: `Klipy API ${res.status}` })
      }
    }

    if (giphyKey) {
      const lang = hasCyrillic ? 'ru' : 'en'
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyKey)}&q=${encodeURIComponent(q)}&limit=24&rating=g&lang=${lang}`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(giphyKey)}&limit=24&rating=g`

      const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) })
      if (res.ok) {
        const json = await res.json()
        const rawList = Array.isArray(json?.data) ? json.data : []
        const gifs: GifResult[] = rawList
          .map((item: any) => ({
            id: String(item.id),
            title: String(item.title || 'GIF'),
            url: item.images?.fixed_height?.url || item.images?.original?.url || '',
            previewUrl:
              item.images?.fixed_height_small?.url ||
              item.images?.fixed_height?.url ||
              item.images?.preview_gif?.url ||
              '',
            width: item.images?.fixed_height?.width ? Number(item.images.fixed_height.width) : undefined,
            height: item.images?.fixed_height?.height ? Number(item.images.fixed_height.height) : undefined,
          }))
          .filter((g: GifResult) => Boolean(g.url))

        return NextResponse.json({
          keyConfigured: true,
          gifs,
        })
      }
      if (!tenorKey) {
        return NextResponse.json({ keyConfigured: true, gifs: [], error: `Giphy API ${res.status}` })
      }
    }

    if (tenorKey) {
      const endpoint = q
        ? `https://tenor.googleapis.com/v2/search?key=${encodeURIComponent(tenorKey)}&q=${encodeURIComponent(q)}&limit=24&locale=${hasCyrillic ? 'ru_RU' : 'en_US'}&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${encodeURIComponent(tenorKey)}&limit=24&locale=ru_RU&media_filter=gif,tinygif`

      const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) {
        return NextResponse.json({ keyConfigured: true, gifs: [], error: `Tenor API ${res.status}` })
      }
      const json = await res.json()
      return NextResponse.json({
        keyConfigured: true,
        gifs: parseKlipyOrTenorResults(json),
      })
    }

    return NextResponse.json({ keyConfigured: false, gifs: [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки GIF'
    return NextResponse.json({ keyConfigured: false, gifs: [], error: message }, { status: 500 })
  }
}
