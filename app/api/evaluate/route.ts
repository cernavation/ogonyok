import { NextResponse } from 'next/server'
import { evaluatePridesHeuristic } from '@/lib/ogonek/evaluate-heuristic'
import type { OvercomeLevel } from '@/lib/ogonek/types'

// In-memory rate limiter: 20 requests per minute per client IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (record.count >= 20) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Лимит: 20 запросов в минуту.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as { items?: unknown }
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Неверный формат запроса. Ожидается массив "items".' },
        { status: 400 }
      )
    }

    const items = body.items.filter((item): item is string => typeof item === 'string')
    if (items.length === 0) {
      return NextResponse.json({ evaluations: [], fallback: true })
    }

    const apiKey = process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

    // If Gemini API key is not configured, gracefully fallback to heuristic
    if (!apiKey) {
      const evaluations = evaluatePridesHeuristic(items)
      return NextResponse.json({ evaluations, fallback: true })
    }

    // Call Gemini REST API with strict 8s timeout
    try {
      const prompt = `Ты — мудрый и точный аналитик дневника гордостей и побед («Огонёк»).
Оцени каждый из представленных пунктов по следующим критериям:
1. scale: масштаб/сила факта от 1 до 10 (целое число).
2. overcome: уровень преодоления сопротивления от 0 до 3 (целое число):
   - 0: рутина/обычное действие без сопротивления
   - 1: небольшое преодоление лени/усталости
   - 2: серьёзный внутренний барьер, страх, сомнения, прокрастинация
   - 3: экстремальное усилие, прорыв, победа над сильнейшим сопротивлением
3. tags: массив из 1-2 тегов из списка ['Спорт', 'Бизнес', 'Дисциплина', 'Разум', 'Отношения', 'Для тебя'].
4. verdict: краткий, сильный, ободряющий вердикт на русском языке (ровно 1 предложение, без воды).

Верни СТРОГО валидный JSON в формате:
{
  "evaluations": [
    {
      "scale": 8,
      "overcome": 2,
      "tags": ["Бизнес"],
      "verdict": "Сильный шаг вперед вопреки сомнениям."
    }
  ]
}

Пункты для оценки:
${JSON.stringify(items, null, 2)}`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          }),
          signal: AbortSignal.timeout(8000),
        }
      )

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}`)
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>
          }
        }>
      }

      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResponse) {
        throw new Error('Empty response from Gemini API')
      }

      const parsed = JSON.parse(textResponse) as {
        evaluations?: Array<{
          scale?: number
          overcome?: number
          tags?: string[]
          verdict?: string
        }>
      }

      if (!parsed || !Array.isArray(parsed.evaluations) || parsed.evaluations.length !== items.length) {
        throw new Error('Mismatched evaluations length')
      }

      const sanitizedEvaluations = parsed.evaluations.map((ev, idx) => {
        const rawScale = typeof ev.scale === 'number' ? ev.scale : 7
        const clampedScale = Math.min(10, Math.max(1, Math.round(rawScale)))

        const rawOvercome = typeof ev.overcome === 'number' ? ev.overcome : 1
        const clampedOvercome = (Math.min(3, Math.max(0, Math.round(rawOvercome)))) as OvercomeLevel

        const tags = Array.isArray(ev.tags) && ev.tags.length > 0 ? ev.tags : ['Для тебя']
        const verdict = typeof ev.verdict === 'string' && ev.verdict.length > 0
          ? ev.verdict
          : 'Отличный шаг в укреплении внутренней опоры!'

        return {
          scale: clampedScale,
          overcome: clampedOvercome,
          tags,
          verdict,
        }
      })

      return NextResponse.json({ evaluations: sanitizedEvaluations, fallback: false })
    } catch {
      // On any Gemini API error or timeout, safely fallback to heuristic
      const evaluations = evaluatePridesHeuristic(items)
      return NextResponse.json({ evaluations, fallback: true })
    }
  } catch {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при обработке оценки' },
      { status: 500 }
    )
  }
}
