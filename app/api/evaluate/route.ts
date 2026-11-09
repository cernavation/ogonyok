import { NextResponse } from 'next/server'
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

  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim().replace(/^["']|["']$/g, '')

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ключ DEEPSEEK_API_KEY не задан в переменных окружения (Settings -> Environment Variables)',
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

  const prides: string[] = Array.isArray(body.prides)
    ? body.prides.filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0 && p.trim() !== '—')
    : Array.isArray(body.items)
    ? body.items.filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0 && p.trim() !== '—')
    : []

  const gratitudes: string[] = Array.isArray(body.gratitudes)
    ? body.gratitudes
        .map((g: unknown) => (typeof g === 'string' ? g : (g as any)?.text))
        .filter((g: unknown): g is string => typeof g === 'string' && g.trim().length > 0 && g.trim() !== '—')
    : []

  if (prides.length === 0 && gratitudes.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Список записей для оценки пуст' },
      { status: 400 }
    )
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Ты — требовательный, но вдохновляющий ментор личной силы и спортивной дисциплины. Проанализируй гордости и благодарности дня. Оцени масштаб побед, преодолённые барьеры и волю. Верни строгий json со следующими полями: score (число с плавающей точкой от 1.0 до 10.0, например 8.8 или 9.5), breakdown (краткий разбор 1-2 предложения), verdict (сильное мотивационное напутствие 1-2 предложения).',
          },
          {
            role: 'user',
            content: JSON.stringify({ prides, gratitudes }),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return NextResponse.json(
        {
          success: false,
          error: `Ошибка DeepSeek API (${response.status}): ${errorText || response.statusText}`,
        },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Пустой ответ от DeepSeek API' },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(content)
    const rawScore = Number(parsed.score)
    if (isNaN(rawScore) || rawScore < 1.0 || rawScore > 10.0) {
      return NextResponse.json(
        { success: false, error: `DeepSeek API вернул некорректный балл оценки: ${parsed.score}` },
        { status: 500 }
      )
    }

    const finalScore = Number(rawScore.toFixed(1))
    const breakdown = String(parsed.breakdown || '')
    const verdict = String(parsed.verdict || '')

    const prideEvaluations = prides.map((p, i) => {
      const parsedItem = Array.isArray(parsed.prideEvaluations) ? parsed.prideEvaluations[i] : null
      const itemScore = typeof parsedItem?.score === 'number' && !isNaN(parsedItem.score)
        ? Number(parsedItem.score.toFixed(1))
        : finalScore
      const comment = String(parsedItem?.comment || breakdown || verdict)
      return {
        num: i + 1,
        score: itemScore,
        scale: Math.max(1, Math.min(10, Math.round(itemScore))),
        comment,
        verdict: comment,
        overcome: typeof parsedItem?.overcome === 'number' ? parsedItem.overcome : (itemScore >= 8.5 ? 2 : 1),
        tags: Array.isArray(parsedItem?.tags) ? parsedItem.tags : ['#Дисциплина'],
      }
    })

    const gratitudeEvaluations = gratitudes.map((g, i) => ({
      num: i + 1,
      score: 10.0,
      scale: 10,
      comment: 'Искренняя благодарность',
    }))

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
              results: prideEvaluations,
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
      source: 'deepseek',
      model: 'deepseek-chat',
      score: finalScore,
      breakdown,
      verdict,
      prideEvaluations,
      gratitudeEvaluations,
      evaluations: prideEvaluations,
      averageScore: finalScore,
      mentorWord: verdict,
      daySummary: verdict,
    })
  } catch (err: any) {
    console.error('[DeepSeek API evaluation failure]:', err)
    return NextResponse.json(
      {
        success: false,
        error: `Ошибка вызова DeepSeek API: ${String(err?.message || err)}`,
      },
      { status: 500 }
    )
  }
}
