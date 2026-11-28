import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

type GoogleTranslateResult = {
  translatedText: string
  detectedSourceLang: string
}

function normalizeLangCode(lang?: string | null, fallback = 'ru'): string {
  const clean = (lang || '').trim().toLowerCase()
  if (!clean) return fallback
  if (clean === 'auto') return 'auto'
  const base = clean.split('-')[0]
  return base || fallback
}

function parseGooglePayload(data: unknown, sourceLang: string): GoogleTranslateResult {
  const arr = Array.isArray(data) ? data : []
  const chunks = Array.isArray(arr?.[0]) ? (arr[0] as unknown[]) : []
  const translatedText = chunks
    .map((chunk) => (Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : ''))
    .join('')
    .trim()

  const rawDetected = typeof arr?.[2] === 'string' ? arr[2] : sourceLang
  const detectedSourceLang = normalizeLangCode(
    rawDetected,
    sourceLang === 'auto' ? 'auto' : sourceLang
  )

  if (!translatedText) {
    throw new Error('Пустой ответ от Google Translate')
  }

  return {
    translatedText,
    detectedSourceLang,
  }
}

async function fetchGoogleTranslateEndpoint(
  url: string,
  sourceLang: string
): Promise<GoogleTranslateResult> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Google Translate HTTP ${res.status}`)
  }

  const data = (await res.json()) as unknown
  return parseGooglePayload(data, sourceLang)
}

async function callGoogleTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<GoogleTranslateResult> {
  const encodedQuery = encodeURIComponent(text)
  const primaryUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
    sourceLang
  )}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodedQuery}`

  try {
    return await fetchGoogleTranslateEndpoint(primaryUrl, sourceLang)
  } catch (primaryErr) {
    const fallbackUrl = `https://clients5.google.com/translate_a/single?client=dict-chrome-ex&sl=${encodeURIComponent(
      sourceLang
    )}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodedQuery}`
    try {
      return await fetchGoogleTranslateEndpoint(fallbackUrl, sourceLang)
    } catch {
      throw primaryErr
    }
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('translate', ip, 30, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, success: false, error: 'Слишком много запросов на перевод. Попробуйте через минуту.' },
      { status: 429 }
    )
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      text?: string
      targetLang?: string
      targetLanguage?: string
    }

    const text = (body.text || '').trim().slice(0, 4000)
    const requestedTarget = normalizeLangCode(body.targetLang || body.targetLanguage, 'ru')

    if (!text) {
      return NextResponse.json(
        { ok: false, success: false, error: 'Текст для перевода пуст' },
        { status: 400 }
      )
    }

    // Экономим запрос к Google Translate: для явной кириллицы при target=ru сразу запрашиваем EN
    const looksPureRussian =
      requestedTarget === 'ru' && /[а-яё]/i.test(text) && !/[a-z]/i.test(text)
    const initialTarget = looksPureRussian ? 'en' : requestedTarget

    const initial = await callGoogleTranslate(text, 'auto', initialTarget)
    const detected = normalizeLangCode(initial.detectedSourceLang, 'auto')

    let finalText = initial.translatedText
    let finalTarget = initialTarget

    if (looksPureRussian && detected !== 'auto' && detected !== 'ru') {
      // Если текст оказался, например, на украинском/болгарском — переводим на русский
      finalTarget = 'ru'
      const switched = await callGoogleTranslate(text, detected, 'ru')
      finalText = switched.translatedText
    } else if (!looksPureRussian && detected !== 'auto' && detected === requestedTarget) {
      // Если автоопределённый язык совпал с целевым — переводим на английский (или на ru для en)
      finalTarget = requestedTarget === 'en' ? 'ru' : 'en'
      const switched = await callGoogleTranslate(text, detected, finalTarget)
      finalText = switched.translatedText
    }

    return NextResponse.json({
      ok: true,
      success: true,
      source: 'google-translate',
      translatedText: finalText,
      translation: finalText,
      detectedSourceLang: detected,
      targetLang: finalTarget,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка перевода'
    return NextResponse.json(
      { ok: false, success: false, error: message },
      { status: 502 }
    )
  }
}
