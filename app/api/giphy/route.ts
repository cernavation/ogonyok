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

const ALLOWED_IMAGE_HOST_SUFFIXES = [
  '.giphy.com',
  'giphy.com',
  '.tenor.com',
  'tenor.com',
  '.klipy.com',
  'klipy.com',
  '.klipycdn.com',
  'klipycdn.com',
]

function isAllowedGifImageUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    return ALLOWED_IMAGE_HOST_SUFFIXES.some(
      (suffix) => (suffix.startsWith('.') ? host.endsWith(suffix) : host === suffix)
    )
  } catch {
    return false
  }
}

const RU_TO_EN_GIF_FALLBACK: Array<[RegExp, string]> = [
  [/огон|плам|кост/i, 'fire'],
  [/побед|успех|триумф/i, 'victory'],
  [/кайф|супер|ого|крут|вау/i, 'celebration'],
  [/бег|спорт|трен|фитнес|жим/i, 'workout'],
  [/любов|сердц|обним/i, 'heart'],
  [/смех|ржу|хаха|лол/i, 'laugh'],
  [/танц|весел|туса/i, 'dance'],
  [/кофе|утро|бодр/i, 'coffee'],
  [/котик|кот|кошк/i, 'cat'],
  [/собак|пёс|пес/i, 'dog'],
  [/работа|код|прог|комп/i, 'coding'],
  [/привет|здаров|хай/i, 'hello'],
]

const CURATED_TRENDING_GIFS: GifResult[] = [
  { id: '3o7abB06u9bNzA8lu8', title: 'Celebrate GIF', previewUrl: 'https://i.giphy.com/media/3o7abB06u9bNzA8lu8/200w.gif', url: 'https://media.giphy.com/media/3o7abB06u9bNzA8lu8/giphy.gif' },
  { id: 'l0MYt5jPR6QX5pnqM', title: 'Cheers GIF', previewUrl: 'https://i.giphy.com/media/l0MYt5jPR6QX5pnqM/200w.gif', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'Is1O1TWV0LEJi', title: 'Party GIF', previewUrl: 'https://i.giphy.com/media/Is1O1TWV0LEJi/200w.gif', url: 'https://media.giphy.com/media/Is1O1TWV0LEJi/giphy.gif' },
  { id: 'BPJmthQ3YRwD6QqcVD', title: 'Great Job GIF', previewUrl: 'https://i.giphy.com/media/BPJmthQ3YRwD6QqcVD/200w.gif', url: 'https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif' },
  { id: 'artj92V8o75VPL7AeQ', title: 'Happy GIF', previewUrl: 'https://i.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: 'nXxOjZrbnbRxS', title: 'Yes GIF', previewUrl: 'https://i.giphy.com/media/nXxOjZrbnbRxS/200w.gif', url: 'https://media.giphy.com/media/nXxOjZrbnbRxS/giphy.gif' },
  { id: 'iH2IldVkqeLuJ7eJ0L', title: 'Fire GIF', previewUrl: 'https://i.giphy.com/media/iH2IldVkqeLuJ7eJ0L/200w.gif', url: 'https://media.giphy.com/media/iH2IldVkqeLuJ7eJ0L/giphy.gif' },
  { id: '26u4cqiYI30juCOGY', title: 'Success GIF', previewUrl: 'https://i.giphy.com/media/26u4cqiYI30juCOGY/200w.gif', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif' },
  { id: 'xT5LMQ8rHYTDGFG07e', title: 'Awesome GIF', previewUrl: 'https://i.giphy.com/media/xT5LMQ8rHYTDGFG07e/200w.gif', url: 'https://media.giphy.com/media/xT5LMQ8rHYTDGFG07e/giphy.gif' },
  { id: '3oEjHV0z8S7WM4MwnK', title: 'High Five GIF', previewUrl: 'https://i.giphy.com/media/3oEjHV0z8S7WM4MwnK/200w.gif', url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif' },
  { id: 'xT0xeJpnrWC4XWblEk', title: 'Mind Blown GIF', previewUrl: 'https://i.giphy.com/media/xT0xeJpnrWC4XWblEk/200w.gif', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
  { id: '11sBLVxNs7v6WA', title: 'Applause GIF', previewUrl: 'https://i.giphy.com/media/11sBLVxNs7v6WA/200w.gif', url: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif' },
]

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

async function verifyGifPreviews(items: GifResult[]): Promise<GifResult[]> {
  if (items.length === 0) return items
  const checked = await Promise.all(
    items.map(async (item) => {
      try {
        const res = await fetch(item.previewUrl || item.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(2200),
        })
        if (!res.ok) return null
        const ct = res.headers.get('content-type') || ''
        if (ct && !ct.toLowerCase().startsWith('image/')) return null
        return item
      } catch {
        // При сетевом таймауте оставляем элемент — браузер/прокси дотянет сам
        return item
      }
    })
  )
  return checked.filter((x): x is GifResult => x !== null)
}

function resolveEnFallbackQuery(query: string): string | null {
  for (const [re, en] of RU_TO_EN_GIF_FALLBACK) {
    if (re.test(query)) return en
  }
  return null
}

async function fetchPublicGifs(query: string): Promise<GifResult[]> {
  if (query) {
    const cleanSlug = encodeURIComponent(query.trim())
    const direct = await fetchPublicGiphyPage(`https://giphy.com/search/${cleanSlug}`, query, 24)
    const verifiedDirect = await verifyGifPreviews(direct)
    if (verifiedDirect.length >= 6) return verifiedDirect

    const enQuery = resolveEnFallbackQuery(query)
    if (enQuery) {
      const enResults = await fetchPublicGiphyPage(
        `https://giphy.com/search/${encodeURIComponent(enQuery)}`,
        query,
        24
      )
      const verifiedEn = await verifyGifPreviews(enResults)
      if (verifiedEn.length > 0) {
        const seen = new Set(verifiedDirect.map((x) => x.id))
        return [...verifiedDirect, ...verifiedEn.filter((x) => !seen.has(x.id))].slice(0, 24)
      }
    }
    if (verifiedDirect.length > 0) return verifiedDirect
  }

  // Тренды по умолчанию: объединяем trending & reaction и гарантируем до 24 рабочих GIF
  const [reactionGifs, trendingGifs] = await Promise.all([
    fetchPublicGiphyPage('https://giphy.com/explore/reaction', 'Trending GIF', 24),
    fetchPublicGiphyPage('https://giphy.com/trending-gifs', 'Trending GIF', 16),
  ])

  const merged: GifResult[] = []
  const seen = new Set<string>()
  for (const item of [...trendingGifs, ...reactionGifs, ...CURATED_TRENDING_GIFS]) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    merged.push(item)
    if (merged.length >= 24) break
  }
  return verifyGifPreviews(merged)
}

async function proxyGifImage(imageUrl: string) {
  if (!isAllowedGifImageUrl(imageUrl)) {
    return NextResponse.json({ error: 'Invalid GIF host' }, { status: 400 })
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        'User-Agent': PUBLIC_HEADERS['User-Agent'],
        Accept: 'image/gif,image/webp,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream GIF error' }, { status: 502 })
    }

    const contentType = upstream.headers.get('content-type') || 'image/gif'
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Upstream returned non-image' }, { status: 502 })
    }

    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'GIF proxy fetch failed' }, { status: 502 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imgUrl = searchParams.get('img')?.trim()
  if (imgUrl) {
    return proxyGifImage(imgUrl)
  }

  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('giphy', ip, 40, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { keyConfigured: true, gifs: [], error: 'Слишком много запросов GIF. Подождите минуту.' },
      { status: 429 }
    )
  }

  try {
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
