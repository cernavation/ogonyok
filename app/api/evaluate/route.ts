import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'
import { getServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('evaluate', ip, 60, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов. Подождите минуту.' },
      { status: 429 }
    )
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json(
      {
        success: false,
        error: 'GEMINI_API_KEY не настроен на сервере. Укажите действительный API ключ Google Gemini.',
      },
      { status: 500 }
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const rawPrides: string[] = Array.isArray(body.prides)
    ? body.prides.filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0 && p.trim() !== '—')
    : Array.isArray(body.items)
    ? body.items.filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0 && p.trim() !== '—')
    : []

  const rawGratitudes: string[] = Array.isArray(body.gratitudes)
    ? body.gratitudes
        .map((g: unknown) => (typeof g === 'string' ? g : (g as any)?.text))
        .filter((g: unknown): g is string => typeof g === 'string' && g.trim().length > 0 && g.trim() !== '—')
    : []

  if (rawPrides.length === 0 && rawGratitudes.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Список записей для оценки пуст' },
      { status: 400 }
    )
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    })

    const systemPrompt = `Ты — калиброванный Ментор системы личных побед "Огонёк".
Твоя задача — объективно, строго и вдохновляюще оценить масштаб побед (гордостей) и глубину благодарностей за день.
Шкала баллов: от 1.0 до 10.0 (10.0 — исключительный триумф/прорыв через экстремальное сопротивление, 8-9 — сверхусилие и характер, 6-7 — хорошая продуктивная работа, 4-5 — рутинные базовые действия, 1-3 — минимум усилий).

Ты ОБЯЗАН вернуть строго валидный JSON следующей структуры:
{
  "score": <число с плавающей точкой от 1.0 до 10.0>,
  "breakdown": "<детальный разбор масштаба побед, преодоления и благодарностей>",
  "verdict": "<хлёсткий, честный и глубокий вердикт ментора в 1-2 предложениях>",
  "prideEvaluations": [
    {
      "num": 1,
      "score": <число от 1.0 до 10.0>,
      "comment": "<лаконичный комментарий>",
      "overcome": <число от 0 до 3: 0=рутина, 1=усилие, 2=барьер, 3=сверхусилие>,
      "tags": ["#Дисциплина"]
    }
  ],
  "gratitudeEvaluations": [
    {
      "num": 1,
      "score": <число от 1.0 до 10.0>,
      "comment": "<комментарий к благодарности>"
    }
  ]
}`

    const userPrompt = `Записи дня:
${rawPrides.length > 0 ? `Гордости:\n${rawPrides.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}
${rawGratitudes.length > 0 ? `\nБлагодарности:\n${rawGratitudes.map((g, i) => `${i + 1}. ${g}`).join('\n')}` : ''}

Оцени записи и верни JSON.`

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
      ],
    })

    const responseText = result.response.text()
    if (!responseText) {
      return NextResponse.json(
        { success: false, error: 'Пустой ответ от Gemini API' },
        { status: 500 }
      )
    }

    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    const rawScore = Number(parsed.score)
    let finalScore: number
    if (isNaN(rawScore) || rawScore < 1.0 || rawScore > 10.0) {
      const prideScores = Array.isArray(parsed.prideEvaluations)
        ? parsed.prideEvaluations
            .map((p: any) => Number(p.score))
            .filter((n: number) => !isNaN(n) && n >= 1.0 && n <= 10.0)
        : []
      finalScore = prideScores.length > 0
        ? Number((prideScores.reduce((a: number, b: number) => a + b, 0) / prideScores.length).toFixed(1))
        : 8.0
    } else {
      finalScore = Number(rawScore.toFixed(1))
    }

    const prideEvals = (Array.isArray(parsed.prideEvaluations) ? parsed.prideEvaluations : []).map(
      (p: any, i: number) => {
        const sc = typeof p.score === 'number' && !isNaN(p.score) ? Number(p.score.toFixed(1)) : finalScore
        const comm = String(p.comment || p.verdict || '')
        return {
          num: p.num ?? i + 1,
          score: sc,
          scale: Math.max(1, Math.min(10, Math.round(sc))),
          comment: comm,
          verdict: comm,
          overcome: typeof p.overcome === 'number' ? Math.max(0, Math.min(3, p.overcome)) : 0,
          tags: Array.isArray(p.tags) ? p.tags : ['#Дисциплина'],
        }
      }
    )

    const gratitudeEvals = (Array.isArray(parsed.gratitudeEvaluations) ? parsed.gratitudeEvaluations : []).map(
      (g: any, i: number) => {
        const sc = typeof g.score === 'number' && !isNaN(g.score) ? Number(g.score.toFixed(1)) : 10.0
        return {
          num: g.num ?? i + 1,
          score: sc,
          scale: Math.max(1, Math.min(10, Math.round(sc))),
          comment: String(g.comment || 'Искренняя благодарность'),
        }
      }
    )

    const breakdown = String(parsed.breakdown || parsed.verdict || 'Анализ завершён успешно.')
    const verdict = String(parsed.verdict || parsed.mentorWord || 'Отличный день и осознанная работа над собой!')

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
              day_summary: verdict,
            },
            { onConflict: 'user_id,day_id,type' }
          )
        } catch (supaErr) {
          console.warn('[Supabase ai_evaluations upsert warning]:', supaErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      source: 'gemini',
      model: 'gemini-1.5-flash',
      score: finalScore,
      breakdown,
      verdict,
      prideEvaluations: prideEvals,
      gratitudeEvaluations: gratitudeEvals,
      evaluations: prideEvals,
      averageScore: finalScore,
      mentorWord: verdict,
      daySummary: verdict,
    })
  } catch (err: any) {
    console.error('[Gemini API evaluation failure]:', err)
    // ЧЕСТНЫЙ СТАТУС 500 И РЕАЛЬНЫЙ ТЕКСТ ОШИБКИ. ЗАПРЕЩЕНО ВОЗВРАЩАТЬ 8.0!
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Ошибка вызова Google Gemini API',
      },
      { status: 500 }
    )
  }
}
