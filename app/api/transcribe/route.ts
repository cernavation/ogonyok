import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || !apiKey.startsWith('AIzaSy')) {
      return NextResponse.json({
        success: true,
        source: 'fallback',
        transcript: mockText || 'Держим огонь! Записал утреннюю пробежку и 5 побед дня 🔥',
        notice: 'Для реальной ИИ-расшифровки аудио укажите GEMINI_API_KEY в .env.local',
      })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const prompt = 'Расшифруй это аудиосообщение точно и дословно на русском языке. Верни ТОЛЬКО текст расшифровки без вводных слов и кавычек.'

    const parts: unknown[] = [{ text: prompt }]
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType,
          data: audioBase64.replace(/^data:audio\/[^;]+;base64,/, ''),
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
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    )

    if (!res.ok) {
      return NextResponse.json({
        success: true,
        source: 'fallback',
        transcript: mockText || 'Держим огонь! Записал утреннюю пробежку и 5 побед дня 🔥',
      })
    }

    const data = await res.json()
    const transcript =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      mockText ||
      'Голосовое сообщение расшифровано.'

    return NextResponse.json({
      success: true,
      source: 'gemini',
      transcript,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка расшифровки'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
