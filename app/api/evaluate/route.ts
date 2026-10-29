import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'
import { getServerSupabase } from '@/lib/supabase/server'
import { extractAndParseJson, AI_GENERATION_CONFIG } from '@/lib/ogonek/ai-eval-parser'

const MODEL_CANDIDATES = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
]

// Приоритетная матрица моделей (v1 — стабильный быстрый продакшн, v1beta — превью)
const FAST_CANDIDATE_MATRIX: Array<{ model: string; apiVersion: 'v1' | 'v1beta' }> = [
  { model: 'gemini-1.5-flash-latest', apiVersion: 'v1' },
  { model: 'gemini-1.5-flash', apiVersion: 'v1' },
  { model: 'gemini-1.5-flash-latest', apiVersion: 'v1beta' },
  { model: 'gemini-1.5-flash', apiVersion: 'v1beta' },
  { model: 'gemini-2.0-flash', apiVersion: 'v1beta' },
  { model: 'gemini-1.5-flash-002', apiVersion: 'v1' },
  { model: 'gemini-1.5-pro', apiVersion: 'v1' },
  { model: 'gemini-1.5-pro', apiVersion: 'v1beta' },
]

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('evaluate', ip, 60, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов. Подождите минуту.' },
      { status: 429 }
    )
  }

  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '')

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ключ GEMINI_API_KEY не задан в Environment Variables',
      },
      { status: 400 }
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
    const systemPrompt = `Ты — Ментор системы личных побед "Огонёк".
Твоя задача — объективно, строго и вдохновляюще оценить масштаб побед (гордостей) и глубину благодарностей за день.
Шкала баллов: от 1.0 до 10.0 (10.0 — исключительный триумф/прорыв через экстремальное сопротивление, 8-9 — сверхусилие и характер, 6-7 — хорошая продуктивная работа, 4-5 — рутинные базовые действия, 1-3 — минимум усилий).

ВНИМАНИЕ: Верни ИСКЛЮЧИТЕЛЬНО валидный JSON-объект без префиксов, вводных слов, пояснений, слова "Calibrated" и markdown-разметки. Ответ должен начинаться строго с символа '{'.

Формат JSON:
{
  "score": <число от 1.0 до 10.0>,
  "breakdown": "<краткий объективный разбор масштаба и преодоления в 1-2 предложениях>",
  "verdict": "<хлёсткий мотивирующий вердикт ментора в 1 предложении>",
  "prideEvaluations": [
    {
      "num": 1,
      "score": <число от 1.0 до 10.0>,
      "comment": "<лаконичный комментарий>",
      "overcome": <0|1|2|3>,
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

    const genAI = new GoogleGenerativeAI(apiKey)
    let responseText = ''
    let lastError: any = null
    let usedModel = FAST_CANDIDATE_MATRIX[0].model
    let usedApiVersion: 'v1' | 'v1beta' = FAST_CANDIDATE_MATRIX[0].apiVersion

    for (const { model: modelCandidate, apiVersion: apiVer } of FAST_CANDIDATE_MATRIX) {
      try {
        const model = genAI.getGenerativeModel(
          {
            model: modelCandidate,
            generationConfig: {
              responseMimeType: 'application/json', // ГАРАНТИРУЕТ чистый JSON без слов "Calibrated"
              temperature: 0.4,
              maxOutputTokens: 600, // Ограничение длины: ответ возвращается за 2-4 секунды!
            },
          },
          { apiVersion: apiVer, timeout: 6000 }
        )

        const result = await model.generateContent({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
          ],
        })

        const text = result.response.text()
        if (text) {
          responseText = text
          usedModel = modelCandidate
          usedApiVersion = apiVer
          break
        }
      } catch (candidateErr: any) {
        lastError = candidateErr
        const errMsg = String(candidateErr?.message || '')
        const isNotFound =
          errMsg.includes('404') ||
          errMsg.toLowerCase().includes('not found') ||
          candidateErr?.status === 404
        if (isNotFound) {
          console.warn(`[Gemini API] Candidate "${modelCandidate}" (${apiVer}) returned 404 (not found). Retrying next...`)
          continue
        }
        if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
          throw candidateErr
        }
        console.warn(`[Gemini API] Candidate "${modelCandidate}" (${apiVer}) failed: ${errMsg}. Retrying next...`)
        continue
      }
    }

    // Быстрый прямой REST fallback (если SDK не вернул текст)
    if (!responseText) {
      for (const ver of ['v1', 'v1beta'] as const) {
        for (const mod of ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash']) {
          try {
            const restUrl = `https://generativelanguage.googleapis.com/${ver}/models/${mod}:generateContent?key=${apiKey}`
            const res = await fetch(restUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.4,
                  maxOutputTokens: 600,
                },
              }),
              signal: AbortSignal.timeout(4000),
            })
            if (res.ok) {
              const data = await res.json()
              const candText = data?.candidates?.[0]?.content?.parts?.[0]?.text
              if (candText) {
                responseText = candText
                usedModel = mod
                usedApiVersion = ver
                break
              }
            }
          } catch {}
        }
        if (responseText) break
      }
    }

    if (!responseText) {
      if (lastError) throw lastError
      return NextResponse.json(
        { success: false, error: 'Пустой ответ от Gemini API' },
        { status: 500 }
      )
    }

    // Защищённый парсинг JSON с удалением любых посторонних префиксов и "Calibrated..."
    const parsed = extractAndParseJson(responseText)

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

    const breakdown = String(parsed.breakdown || parsed.verdict || 'Анализ побед дня проведён объективно.')
    const verdict = String(parsed.verdict || parsed.mentorWord || 'День сильного характера и дисциплины.')

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
      model: usedModel,
      apiVersion: usedApiVersion,
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
    const rawMsg = String(err?.message || '')
    let userError = rawMsg || 'Ошибка вызова Google Gemini API'
    let status = 500

    if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
      userError = 'API_KEY_INVALID: Неверный ключ Gemini API. Проверьте ключ в настройках Vercel.'
      status = 400
    }

    return NextResponse.json(
      {
        success: false,
        error: userError,
      },
      { status }
    )
  }
}
