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

const PUBLIC_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
}

async function fetchPublicGiphyPage(url: string, label: string, maxItems: number): Promise<GifResult[]> {
  try {
    const res = await fetch(url, { headers: PUBLIC_HEADERS, signal: AbortSignal.timeout(5500) })
    if (!res.ok) return []
    const html = await res.text()
    const matches = html.matchAll(
      /https:\/\/media[0-9]*\.giphy\.com\/media\/(?:v1\.[^/"'\\]+\/)?([A-Za-z0-9]{6,32})\//g
    )
    const seen = new Set<string>()
    const results: GifResult[] = []
    for (const m of matches) {
      const id = m[1]
      if (!id || id === 'v1' || seen.has(id)) continue
      seen.add(id)
      results.push({
        id,
        title: label || 'GIF',
        previewUrl: `https://i.giphy.com/media/${id}/200w.gif`,
        url: `https://media.giphy.com/media/${id}/giphy.gif`,
      })
      if (results.length >= maxItems) break
    }
    return results
  } catch {
    return []
  }
}

async function fetchPublicGifs(query: string): Promise<GifResult[]> {
  if (query) {
    const cleanSlug = encodeURIComponent(query.trim())
    const direct = await fetchPublicGiphyPage(`https://giphy.com/search/${cleanSlug}`, query, 24)
    if (direct.length > 0) return direct
  }

  // Тренды по умолчанию: объединяем reaction & trending без дубликатов до 24 штук
  const [reactionGifs, trendingGifs] = await Promise.all([
    fetchPublicGiphyPage('https://giphy.com/explore/reaction', 'Trending GIF', 20),
    fetchPublicGiphyPage('https://giphy.com/trending-gifs', 'Trending GIF', 12),
  ])

  const merged: GifResult[] = []
  const seen = new Set<string>()
  for (const item of [...trendingGifs, ...reactionGifs]) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    merged.push(item)
    if (merged.length >= 24) break
  }
  return merged
}

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('giphy', ip, 40, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { keyConfigured: true, gifs: [], error: 'Слишком много запросов GIF. Подождите минуту.' },
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

    if (klipyKey) {
      const endpoint = q
        ? `https://api.klipy.com/v2/search?key=${encodeURIComponent(klipyKey)}&q=${encodeURIComponent(q)}&limit=24&locale=${hasCyrillic ? 'ru_RU' : 'en_US'}&media_filter=gif,tinygif&contentfilter=medium`
        : `https://api.klipy.com/v2/featured?key=${encodeURIComponent(klipyKey)}&limit=24&locale=ru_RU&media_filter=gif,tinygif&contentfilter=medium`

      const res = await fetch(endpoint, { signal: AbortSignal.timeout(5500) }).catch(() => null)
      if (res?.ok) {
        const json = await res.json()
        const gifs = parseKlipyOrTenorResults(json)
        if (gifs.length > 0) {
          return NextResponse.json({ keyConfigured: true, gifs })
        }
      }
    }

    if (giphyKey) {
      const lang = hasCyrillic ? 'ru' : 'en'
      const endpoint = q
        ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyKey)}&q=${encodeURIComponent(q)}&limit=24&rating=g&lang=${lang}`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(giphyKey)}&limit=24&rating=g`

      const res = await fetch(endpoint, { signal: AbortSignal.timeout(5500) }).catch(() => null)
      if (res?.ok) {
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

        if (gifs.length > 0) {
          return NextResponse.json({ keyConfigured: true, gifs })
        }
      }
    }

    if (tenorKey) {
      const endpoint = q
        ? `https://tenor.googleapis.com/v2/search?key=${encodeURIComponent(tenorKey)}&q=${encodeURIComponent(q)}&limit=24&locale=${hasCyrillic ? 'ru_RU' : 'en_US'}&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${encodeURIComponent(tenorKey)}&limit=24&locale=ru_RU&media_filter=gif,tinygif`

      const res = await fetch(endpoint, { signal: AbortSignal.timeout(5500) }).catch(() => null)
      if (res?.ok) {
        const json = await res.json()
        const gifs = parseKlipyOrTenorResults(json)
        if (gifs.length > 0) {
          return NextResponse.json({ keyConfigured: true, gifs })
        }
      }
    }

    // Out-of-the-box бесплатный публичный поиск и тренды GIF (RU + EN, до 24 штук) без обязательного API-ключа
    const publicGifs = await fetchPublicGifs(q)
    return NextResponse.json({
      keyConfigured: true,
      gifs: publicGifs,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки GIF'
    return NextResponse.json({ keyConfigured: true, gifs: [], error: message }, { status: 500 })
  }
}
