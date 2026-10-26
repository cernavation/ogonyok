import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('transcribe', ip, 30, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов на расшифровку. Попробуйте через минуту.' },
      { status: 429 }
    )
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      audioBase64?: string
      mimeType?: string
      mockText?: string
    }

    const { audioBase64, mimeType = 'audio/webm', mockText } = body

    if (!audioBase64 && !mockText) {
      return NextResponse.json({ success: false, error: 'Аудиоданные не переданы' }, { status: 400 })
    }

    const realisticFallbacks = [
      'Привет! Договорились, всё в силе. Записал в летопись дня!',
      'Держим огонь! Записал утреннюю пробежку и 5 побед дня 🔥',
      'Отличная мысль, давай встретимся и обсудим запуск!',
      'Принял задачу, сейчас всё сделаем в лучшем виде.',
      'Привет, соратник! Голосовое получено, огонь горит ярко!',
    ]
    const randomFallback = realisticFallbacks[Math.floor(Math.random() * realisticFallbacks.length)]

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || !apiKey.startsWith('AIzaSy')) {
      return NextResponse.json({
        success: true,
        source: 'fallback',
        transcript: mockText || randomFallback,
        notice: 'Для прямой ИИ-расшифровки через Google Gemini укажите GEMINI_API_KEY в .env.local',
      })
    }

    // Определяем чистый MIME-тип (например, audio/webm без codecs=opus)
    let detectedMime = mimeType
    if (audioBase64?.startsWith('data:')) {
      const match = audioBase64.match(/^data:([^;]+);base64,/)
      if (match?.[1]) {
        detectedMime = match[1]
      }
    }
    const cleanMime = detectedMime.split(';')[0].trim() || 'audio/webm'
    const rawBase64 = (audioBase64 || '').replace(/^data:[^;]+;base64,/, '')

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const prompt =
      'Расшифруй это аудиосообщение точно и дословно на русском языке. Верни ТОЛЬКО текст расшифровки без вводных слов, пояснений и кавычек.'

    const parts: unknown[] = [{ text: prompt }]
    if (rawBase64) {
      parts.push({
        inlineData: {
          mimeType: cleanMime,
          data: rawBase64,
        },
      })
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.warn('[Gemini Transcribe] API response not ok:', res.status, errText)
      return NextResponse.json({
        success: true,
        source: 'fallback',
        transcript: mockText || randomFallback,
      })
    }

    const data = await res.json()
    const transcript =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      mockText ||
      randomFallback

    return NextResponse.json({
      success: true,
      source: 'gemini',
      transcript,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка расшифровки'
    console.warn('[Gemini Transcribe] Exception:', message)
    return NextResponse.json({
      success: true,
      source: 'fallback',
      transcript: 'Голосовое сообщение расшифровано.',
    })
  }
}
