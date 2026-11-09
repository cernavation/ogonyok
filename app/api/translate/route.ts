import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateJsonBody, TranslateSchema } from '@/lib/server/api-validator'

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser(request)
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'translate',
    limit: 30,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const validated = await validateJsonBody(request, TranslateSchema)
    if (!validated.success) {
      return validated.response
    }

    const { text, targetLanguage: targetLang } = validated.data

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

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
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
      console.warn('[Gemini Translate] API response not ok:', res.status, errText)
      return NextResponse.json({
        success: true,
        source: 'fallback',
        translation: text,
      })
    }

    const data = await res.json()
    const translation =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text

    return NextResponse.json({
      success: true,
      source: 'gemini',
      translation,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка перевода'
    console.warn('[Gemini Translate] Exception:', message)
    return NextResponse.json({
      success: true,
      source: 'fallback',
      translation: 'Перевод временно недоступен',
    })
  }
}
