import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { evaluatePridesHeuristic } from '@/lib/ogonek/evaluate-heuristic'

// Rate limiter: 5 evaluations per day per user/IP
const dailyLimitMap = new Map<string, { count: number; dateStr: string }>()

function checkDailyRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10)
  const current = dailyLimitMap.get(identifier)

  if (!current || current.dateStr !== today) {
    dailyLimitMap.set(identifier, { count: 1, dateStr: today })
    return { allowed: true, remaining: 4 }
  }

  if (current.count >= 5) {
    return { allowed: false, remaining: 0 }
  }

  current.count += 1
  return { allowed: true, remaining: 5 - current.count }
}

export async function POST(request: Request) {
  let items: string[] = []
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const body = (await request.json().catch(() => ({}))) as {
      type?: 'pride' | 'gratitude'
      items?: string[]
      dayNumber?: number
      dayId?: string
      userId?: string
    }

    const type = body.type === 'gratitude' ? 'gratitude' : 'pride'
    items = Array.isArray(body.items)
      ? body.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []

    if (items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Список записей для оценки пуст',
      }, { status: 400 })
    }

    const rateId = body.userId || ip
    const { allowed, remaining } = checkDailyRateLimit(rateId)
    if (!allowed) {
      return NextResponse.json({
        success: false,
        error: 'Достигнут дневной лимит: максимум 5 ИИ-оценок в день на пользователя.',
      }, { status: 429 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || !apiKey.startsWith('AIzaSy')) {
      const fallbackEvals = evaluatePridesHeuristic(items)
      return NextResponse.json({
        success: true,
        source: 'heuristic',
        evaluations: fallbackEvals.map((e, i) => ({
          num: i + 1,
          score: e.scale,
          comment: e.verdict,
          overcome: e.overcome,
          tags: e.tags,
        })),
        daySummary: 'День зафиксирован и оценён калиброванной системой менторинга Огонька.',
      })
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

    const systemPrompt = type === 'pride'
      ? `Ты — строгий, честный и мудрый ментор дневника личных гордостей и побед.
Твоя задача — объективно оценить каждую гордость по калиброванной шкале 1–10:
- 10★: Исключительные вехи (запуск проекта, финиш марафона, рекорд). Не чаще 2% случаев!
- 8–9★: Серьёзное преодоление барьера, сверхусилие против усталости и страха.
- 6–7★: Хорошая, качественная продуктивная работа, соблюдение дисциплины.
- 4–5★: Базовые рутинные действия без особого преодоления.
- 1–3★: Минимум усилий, отписка.

Для КАЖДОЙ записи верни:
- score: число 1–10
- comment: хлёсткий, честный комментарий в 1 предложение без банальных шаблонных похвал ("молодец", "так держать" ЗАПРЕЩЕНЫ).
- overcome: 0..3 (0=рутина, 1=усилие, 2=серьёзный барьер, 3=сверхусилие)
- tags: 1-2 тега из ['#Дисциплина', '#Фокус', '#Тело', '#Дело', '#Характер', '#Обучение']

В поле daySummary напиши общий итог дня в 1-2 ёмких предложениях.
Формат ответа: строго JSON.`
      : `Ты — чуткий, внимательный и глубокий ментор дневника благодарностей.
Твоя задача — оценить искренность и глубину осознанности каждой благодарности по шкале 1–10:
- 9–10★: Глубокая осознанность, меняющая восприятие мира и отношений.
- 7–8★: Искренняя, тёплая благодарность конкретным людям, миру или своему телу.
- 5–6★: Базовая признательность за приятные события.
- 1–4★: Формальная или дежурная благодарность.

Для КАЖДОЙ записи верни:
- score: число 1–10
- comment: вдохновляющий и поддерживающий комментарий в 1 предложение.
- overcome: 0
- tags: 1-2 тега из ['#Благодарность', '#Люди', '#Мир', '#Осознанность', '#Тело']

В поле daySummary напиши общий вдохновляющий итог дня в 1-2 предложениях.
Формат ответа: строго JSON.`

    const userPrompt = `Оцени следующие записи дня (${type === 'pride' ? 'гордости' : 'благодарности'}):
${JSON.stringify(items, null, 2)}

Верни строго JSON формата:
{
  "evaluations": [
    {
      "num": 1,
      "score": 7,
      "comment": "Текст комментария...",
      "overcome": 1,
      "tags": ["#Дисциплина"]
    }
  ],
  "daySummary": "Общий итог дня..."
}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
        signal: AbortSignal.timeout(12000),
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Gemini API вернул статус ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textResponse) {
      throw new Error('Пустой ответ от Gemini API')
    }

    const cleaned = textResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned) as {
      evaluations: Array<{
        num?: number
        score?: number
        comment?: string
        overcome?: number
        tags?: string[]
      }>
      daySummary?: string
    }

    // Сохраняем в Supabase при наличии dayId и userId
    if (body.dayId && body.userId) {
      const supabase = getServerSupabase()
      if (supabase) {
        try {
          await supabase
            .from('ai_evaluations')
            .upsert({
              user_id: body.userId,
              day_id: body.dayId,
              type,
              results: parsed.evaluations,
              day_summary: parsed.daySummary || null,
            }, { onConflict: 'user_id,day_id,type' })
        } catch {
          // ignore error
        }
      }
    }

    return NextResponse.json({
      success: true,
      type,
      remainingToday: remaining,
      evaluations: parsed.evaluations,
      daySummary: parsed.daySummary || null,
    })
  } catch (err) {
    console.warn('AI evaluate fallback to calibrated heuristic:', err)
    const fallbackEvals = evaluatePridesHeuristic(items)
    return NextResponse.json({
      success: true,
      source: 'heuristic',
      evaluations: fallbackEvals.map((e, i) => ({
        num: i + 1,
        score: e.scale,
        comment: e.verdict,
        overcome: e.overcome,
        tags: e.tags,
      })),
      daySummary: 'День зафиксирован и оценён калиброванной системой менторинга Огонька.',
    })
  }
}
