import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { evaluatePridesHeuristic, type PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'

// Rate limiter: 15 evaluations per day per user/IP
const dailyLimitMap = new Map<string, { count: number; dateStr: string }>()

function checkDailyRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10)
  const current = dailyLimitMap.get(identifier)

  if (!current || current.dateStr !== today) {
    dailyLimitMap.set(identifier, { count: 1, dateStr: today })
    return { allowed: true, remaining: 14 }
  }

  if (current.count >= 15) {
    return { allowed: false, remaining: 0 }
  }

  current.count += 1
  return { allowed: true, remaining: 15 - current.count }
}

function buildHeuristicResult(
  rawPrides: string[] = [],
  rawGratitudes: string[] = [],
  items: string[] = [],
  remaining: number = 15
) {
  const prideEvals = evaluatePridesHeuristic(rawPrides.length > 0 ? rawPrides : items)
  const mappedPrides = prideEvals.map((e, i) => ({
    num: i + 1,
    score: e.scale,
    scale: e.scale,
    comment: e.verdict,
    verdict: e.verdict,
    overcome: e.overcome,
    tags: e.tags,
  }))

  const mappedGratitudes = rawGratitudes.map((g, i) => {
    const score = g.length > 30 ? 10 : 9
    return {
      num: i + 1,
      score,
      scale: score,
      comment: 'Глубокая осознанность и благодарность, укрепляющая внутреннюю опору.',
      verdict: 'Глубокая осознанность и благодарность, укрепляющая внутреннюю опору.',
      overcome: 0,
      tags: ['#Осознанность', '#Благодарность'],
    }
  })

  const allScores = [...mappedPrides.map((p) => p.score), ...mappedGratitudes.map((g) => g.score)]
  const avg = allScores.length > 0 ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)) : 9.5
  const mentorWord =
    'Каждая зафиксированная победа и искренняя благодарность сегодня — это твой кирпич в фундамент непоколебимой дисциплины. Ты удержал планку стрика и сделал шаг вперед!'

  return {
    success: true,
    source: 'heuristic',
    remainingToday: remaining,
    prideEvaluations: mappedPrides,
    gratitudeEvaluations: mappedGratitudes,
    evaluations: mappedPrides,
    averageScore: avg,
    mentorWord,
    daySummary: mentorWord,
  }
}

export async function POST(request: Request) {
  let fallbackPrides: string[] = []
  let fallbackGratitudes: string[] = []
  let fallbackItems: string[] = []
  let fallbackRemaining = 15

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const body = (await request.json().catch(() => ({}))) as {
      type?: 'pride' | 'gratitude' | 'day'
      items?: string[]
      prides?: string[]
      gratitudes?: string[]
      dayNumber?: number
      dayId?: string
      userId?: string
    }

    const rateId = body.userId || ip
    const { allowed, remaining } = checkDailyRateLimit(rateId)
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Достигнут дневной лимит: максимум 15 ИИ-оценок в день на пользователя.',
        },
        { status: 429 }
      )
    }

    const rawPrides = Array.isArray(body.prides)
      ? body.prides.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []

    const rawGratitudes = Array.isArray(body.gratitudes)
      ? body.gratitudes.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []

    // Если передан список гордостей или благодарностей для церемонии дня
    const isCeremony = rawPrides.length > 0 || rawGratitudes.length > 0

    // Единичный список записей (legacy)
    const items = isCeremony
      ? rawPrides.concat(rawGratitudes)
      : Array.isArray(body.items)
      ? body.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []

    fallbackPrides = rawPrides
    fallbackGratitudes = rawGratitudes
    fallbackItems = items
    fallbackRemaining = remaining

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Список записей для оценки пуст',
        },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

    const generateHeuristicResult = () =>
      buildHeuristicResult(rawPrides, rawGratitudes, items, remaining)

    if (!apiKey || !apiKey.startsWith('AIzaSy')) {
      return NextResponse.json(generateHeuristicResult())
    }

    // Если есть ключ Gemini — вызываем официальный Google Gemini API (gemini-1.5-flash)
    const systemPrompt = isCeremony
      ? `Ты — мудрый, внимательный и вдохновляющий Ментор Огонька (системы ежедневных побед и личной летописи).
Твоя задача — объективно и калиброванно оценить записи дня автора:
1. Гордости: шкала 1–10★ (10★ — выдающийся результат/рекорд/мощное преодоление страха/лени, 8-9★ — сверхусилие, 6-7★ — хорошая работа, 4-5★ — рутина). Для каждой гордости укажи:
   - score (1..10)
   - comment (хлёсткая, искренняя фраза без банальщины)
   - overcome (0..3: 0=рутина, 1=усилие, 2=серьёзный барьер, 3=сверхусилие)
   - tags (массив из 1-2 тегов: ['#Дисциплина', '#Характер', '#Тело', '#Дело', '#Фокус'])
2. Благодарности: шкала 1–10★ за искренность и теплоту восприятия мира.
3. Слово Ментора Огонька (mentorWord): мощный, вдохновляющий персональный абзац (2-3 предложения), анализирующий главную суть этого дня.
4. Средний балл дня (averageScore): число от 1.0 до 10.0.

Формат ответа: СТРОГО JSON.`
      : `Ты — калиброванный ментор дневника побед. Оцени записи по шкале 1–10. Верни строго JSON { "evaluations": [{ "num": 1, "score": 8, "comment": "...", "overcome": 1, "tags": ["#Дисциплина"] }], "daySummary": "..." }`

    const userPrompt = isCeremony
      ? `Оцени записи дня #${body.dayNumber || ''}:
Гордости:
${rawPrides.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Благодарности:
${rawGratitudes.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Верни JSON формата:
{
  "prideEvaluations": [
    { "num": 1, "score": 9, "comment": "...", "overcome": 2, "tags": ["#Характер"] }
  ],
  "gratitudeEvaluations": [
    { "num": 1, "score": 10, "comment": "..." }
  ],
  "mentorWord": "...",
  "averageScore": 9.6
}`
      : `Записи: ${JSON.stringify(items)}`

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
      return NextResponse.json(generateHeuristicResult())
    }

    const data = await res.json()
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textResponse) {
      return NextResponse.json(generateHeuristicResult())
    }

    const cleaned = textResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    const prideEvals = (
      Array.isArray(parsed.prideEvaluations)
        ? parsed.prideEvaluations
        : Array.isArray(parsed.evaluations)
        ? parsed.evaluations
        : []
    ).map((p: any, i: number) => {
      const score = Number(p.score ?? p.scale ?? 8)
      const comment = String(p.comment ?? p.verdict ?? '')
      return {
        num: p.num ?? i + 1,
        score,
        scale: score,
        comment,
        verdict: comment,
        overcome: Number(p.overcome) || 0,
        tags: Array.isArray(p.tags) ? p.tags : [],
      }
    })

    const gratitudeEvals = Array.isArray(parsed.gratitudeEvaluations)
      ? parsed.gratitudeEvaluations
      : []

    const allScores = [
      ...prideEvals.map((p: any) => Number(p.score) || 8),
      ...gratitudeEvals.map((g: any) => Number(g.score) || 9),
    ]
    const avgScore =
      typeof parsed.averageScore === 'number'
        ? Number(parsed.averageScore.toFixed(1))
        : allScores.length > 0
        ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1))
        : 9.6

    const mentorWord =
      parsed.mentorWord ||
      parsed.daySummary ||
      'Сегодня ты проявил характер и удержал планку дисциплины. Продолжай движение вперед!'

    // Сохранение в Supabase при наличии dayId и userId
    if (body.dayId && body.userId) {
      const supabase = getServerSupabase()
      if (supabase) {
        try {
          await supabase.from('ai_evaluations').upsert(
            {
              user_id: body.userId,
              day_id: body.dayId,
              type: body.type || 'day',
              results: prideEvals,
              day_summary: mentorWord,
            },
            { onConflict: 'user_id,day_id,type' }
          )
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      source: 'gemini',
      model,
      remainingToday: remaining,
      prideEvaluations: prideEvals,
      gratitudeEvaluations: gratitudeEvals,
      evaluations: prideEvals,
      averageScore: avgScore,
      mentorWord,
      daySummary: mentorWord,
    })
  } catch (err) {
    console.warn('AI evaluate fallback to calibrated heuristic:', err)
    return NextResponse.json(buildHeuristicResult(fallbackPrides, fallbackGratitudes, fallbackItems, fallbackRemaining))
  }
}
