import { NextResponse } from 'next/server'
import {
  getAchievementCategory,
  isAchievementCategoryId,
  regulateAchievement,
  sanitizeRegulation,
} from '@/lib/ogonek/achievement-regulation'

// In-memory rate limiter: 20 requests per minute per client IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (record.count >= 20) return false
  record.count++
  return true
}

// ── DEEP CONTEXT SYSTEM PROMPT ──────────────────────────────────────────────
const SYSTEM_PROMPT = `Ты — строгий верификатор достижений платформы «Огонёк» (дневник силы Алексея Черна, @cernavation).

Твоя задача — по КАТЕГОРИИ и ТЕМЕ достижения выдать ЖЁСТКИЙ, конкретный регламент: какие именно файлы-доказательства пользователь обязан приложить, чтобы ачивка была подтверждена.

ПРИНЦИПЫ (критически важно):
- Никакой воды и общих слов. Только конкретные документы, форматы и примеры.
- Доказательство должно быть проверяемым третьей стороной (официальный протокол, выписка, договор, DOI, экспорт трекера), а не перепиской или словами.
- Требуй 2–4 обязательных файла и 1–3 дополнительных. Не больше 6 всего.
- Учитывай нюансы темы: марафон босиком → видео финиша без обуви обязательно; выручка → скриншот платёжной платформы; олимпиада → официальный протокол; стрик → экспорт календаря (скриншот легко подделать).
- Категории: "sport-record" (спорт/марафон), "business" (бизнес), "education" (обучение/наука), "discipline" (стрик дисциплины).
- strictness: "basic" | "strict" | "forensic". "forensic" — для мировых рекордов, босиком, инвестиций, научных публикаций, олимпиад.

ФОРМАТ ОТВЕТА — СТРОГО валидный JSON без markdown-обёртки:
{
  "interpretedTopic": "как ты понял тему",
  "summary": "1-2 предложения: что и почему нужно приложить",
  "strictness": "strict",
  "verifier": "кто уполномочен подтвердить",
  "freshnessRule": "срок актуальности доказательств",
  "rejectionCriteria": ["причина отказа 1", "причина отказа 2"],
  "requirements": [
    {
      "id": "sport-protocol",
      "title": "Официальный протокол соревнования",
      "purpose": "зачем нужен этот файл верификатору",
      "formats": ["PDF", "JPG", "PNG"],
      "required": true,
      "example": "конкретный пример корректного доказательства"
    }
  ]
}`

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Лимит: 20 запросов в минуту.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as { categoryId?: unknown; topic?: unknown }
    if (!isAchievementCategoryId(body?.categoryId)) {
      return NextResponse.json(
        { error: 'Неверная категория достижения.' },
        { status: 400 }
      )
    }

    const categoryId = body.categoryId
    const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 300) : ''

    if (!topic) {
      return NextResponse.json(
        { error: 'Опиши тему достижения, чтобы получить регламент.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const category = getAchievementCategory(categoryId)

    // If Gemini API key is not configured, gracefully fall back to heuristic
    if (!apiKey) {
      return NextResponse.json({ regulation: regulateAchievement(categoryId, topic), fallback: true })
    }

    try {
      const userPrompt = `Категория достижения: "${category.label}" (id: ${categoryId}).
Тема, заявленная пользователем: "${topic}".

Выдай строгий регламент доказательств СТРОГО в формате JSON из системного промпта.
Помни: файлы должны быть проверяемыми, форматы — конкретными, примеры — реалистичными.`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.35,
              topP: 0.9,
            },
          }),
          signal: AbortSignal.timeout(10000),
        }
      )

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}`)
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }

      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResponse) {
        throw new Error('Empty response from Gemini API')
      }

      const cleanedText = textResponse
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      const parsed = JSON.parse(cleanedText) as { requirements?: unknown }
      if (!parsed || !Array.isArray(parsed.requirements) || parsed.requirements.length === 0) {
        throw new Error('Gemini returned no requirements')
      }

      const regulation = sanitizeRegulation(parsed, categoryId, topic)
      return NextResponse.json({ regulation: { ...regulation, aiGenerated: true }, fallback: false })
    } catch {
      // On any Gemini error/timeout, safely fall back to the local heuristic
      return NextResponse.json({ regulation: regulateAchievement(categoryId, topic), fallback: true })
    }
  } catch {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при построении регламента' },
      { status: 500 }
    )
  }
}
