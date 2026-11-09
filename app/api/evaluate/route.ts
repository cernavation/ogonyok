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
    const systemPrompt = `Ты — требовательный, но вдохновляющий ментор личной силы и спортивной дисциплины системы побед "Огонёк".
Твоя задача — объективно оценить СТРОГО гордости (победы и преодоления дня).
Каждая гордость получает:
- num: порядковый номер (1, 2, 3...)
- score: число с плавающей точкой от 1.0 до 10.0 (например 8.8 или 9.5; 10.0 — исключительный триумф/прорыв через экстремальное сопротивление, 8.0-9.5 — сверхусилие и характер, 6.0-7.9 — хорошая продуктивная работа, 4.0-5.9 — рутинные базовые действия, 1.0-3.9 — минимум усилий).
- comment: уникальный лаконичный персональный разбор в 1 предложение конкретно по этому действию (без шаблонных повторов!).
- overcome: уровень преодоления барьера (число 0, 1, 2 или 3).
- tags: массив из 1-2 тегов (например, ["#Дисциплина", "#Спорт"]).

ВНИМАНИЕ: БЛАГОДАРНОСТИ НЕ ОЦЕНИВАЮТСЯ ЦИФРАМИ И ЗВЁЗДАМИ! Запрещено выставлять баллы и звёзды благодарностям!
Тексты благодарностей используй ИСКЛЮЧИТЕЛЬНО для составления душевного, глубокого и точного напутствия ментора (поле verdict).

Верни строгий JSON со следующими полями:
{
  "prideEvaluations": [
    {
      "num": 1,
      "score": 8.8,
      "comment": "краткий персональный комментарий к этому конкретному пункту",
      "overcome": 2,
      "tags": ["#Дисциплина"]
    }
  ],
  "breakdown": "общий краткий разбор масштаба побед дня в 1-2 предложениях",
  "verdict": "сильное душевное мотивационное напутствие ментора в 1-2 предложениях, объединяющее преодоления и благодарности дня"
}`

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
            content: systemPrompt,
          },
          {
            role: 'user',
            content: JSON.stringify({ prides, gratitudes }),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 700,
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

    // Обработка персональных оценок каждой гордости
    const prideEvaluations = prides.map((p, i) => {
      const parsedItem = Array.isArray(parsed.prideEvaluations) ? parsed.prideEvaluations[i] : null
      let itemScore: number
      if (typeof parsedItem?.score === 'number' && !isNaN(parsedItem.score)) {
        itemScore = Number(Math.max(1.0, Math.min(10.0, parsedItem.score)).toFixed(1))
      } else if (typeof parsed.score === 'number' && !isNaN(parsed.score)) {
        itemScore = Number(Math.max(1.0, Math.min(10.0, parsed.score)).toFixed(1))
      } else {
        itemScore = 8.8
      }

      const comment = String(
        parsedItem?.comment ||
        (i === 0 && parsed.breakdown ? parsed.breakdown : '') ||
        'Преодоление барьера и фиксация победы.'
      )
      const overcome = typeof parsedItem?.overcome === 'number'
        ? Math.max(0, Math.min(3, parsedItem.overcome))
        : (itemScore >= 8.5 ? 2 : 1)
      const tags = Array.isArray(parsedItem?.tags) && parsedItem.tags.length > 0
        ? parsedItem.tags
        : ['#Дисциплина']

      return {
        num: i + 1,
        score: itemScore,
        scale: Math.max(1, Math.min(10, Math.round(itemScore))),
        comment,
        verdict: comment,
        overcome,
        tags,
      }
    })

    // Общий балл дня вычисляется СТРОГО как среднее арифметическое гордостей:
    // score = Number((prideScoresSum / prides.length).toFixed(1))
    const prideScoresSum = prideEvaluations.reduce((acc, p) => acc + p.score, 0)
    const finalScore = prideEvaluations.length > 0
      ? Number((prideScoresSum / prideEvaluations.length).toFixed(1))
      : 8.8

    const breakdown = String(parsed.breakdown || '')
    const verdict = String(parsed.verdict || 'День сильного характера и дисциплины.')

    // БЛАГОДАРНОСТИ БЕЗ ЧИСЛОВЫХ ОЦЕНОК И ЗВЁЗД!
    const gratitudeEvaluations: any[] = []

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
