import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('translate', ip, 30, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов на перевод. Попробуйте через минуту.' },
      { status: 429 }
    )
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      text?: string
      targetLanguage?: string
    }

    const text = (body.text || '').trim()
    const targetLang = (body.targetLanguage || 'ru').trim()

    if (!text) {
      return NextResponse.json({ success: false, error: 'Текст для перевода пуст' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || !apiKey.startsWith('AIzaSy')) {
      // Аккуратный fallback без падения
      return NextResponse.json({
        success: true,
        source: 'fallback',
        translation: targetLang === 'en'
          ? `[Translated to English]: ${text}`
          : targetLang === 'ru'
          ? `[Перевод на русский]: ${text}`
          : `[Перевод на ${targetLang}]: ${text}`,
        notice: 'Для ИИ-перевода через Gemini укажите GEMINI_API_KEY в .env.local',
      })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const systemPrompt = `Ты профессиональный переводчик чат-сообщений. Переведи текст на язык: "${targetLang}". Сохраняй сленг, эмодзи, интонацию и пунктуацию. Верни ТОЛЬКО переведённый текст без лишних пояснений, кавычек и метаданных.`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return NextResponse.json({
        success: true,
        source: 'fallback-error',
        translation: `[Перевод]: ${text}`,
        error: `Gemini API: ${res.status}`,
      })
    }

    const data = await res.json()
    const translation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text

    return NextResponse.json({
      success: true,
      source: 'gemini',
      translation,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка перевода'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
