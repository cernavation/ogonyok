import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'
import { getServerSupabase } from '@/lib/supabase/server'

function isGibberish(text: string): boolean {
  const clean = text.trim().toLowerCase()
  if (clean.length < 3) return true
  if (/^(.)\1+$/.test(clean)) return true
  if (/^(тест|test|123|1234|12345|asdf|qwerty|йцукен|ыва|ывавыа|фыва|лол|кек|проверка)+$/i.test(clean)) return true
  const cyrillicConsonants = clean.match(/[бвгджзйклмнпрстфхцчшщ]/g)
  const cyrillicVowels = clean.match(/[аеёиоуыэюя]/g)
  if (clean.length >= 6 && cyrillicConsonants && (!cyrillicVowels || cyrillicVowels.length === 0)) return true
  return false
}

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
    const systemPrompt = `Ты — бескомпромиссный, объективный и вдохновляющий ментор личной силы системы побед "Огонёк".
Твоя задача — строго дифференцированно оценить каждую гордость дня по реальному масштабу, преодолённым барьерам и воле.

КРИТЕРИИ ОЦЕНКИ КАЖДОЙ ГОРДОСТИ (ОТ 1.0 ДО 10.0★):
- 1.0 - 2.0★: Бессмысленный текст, спам, опечатки, заглушки (например: "ывавыа", "тест", "123", "asdf", бессвязные буквы). Оценка СТРОГО 1.0-2.0! Комментарий — бескомпромиссная критика бессмысленного ввода.
- 3.0 - 4.9★: Минимальное или тривиальное действие без преодоления сопротивления.
- 5.0 - 7.0★: Обычные бытовые дела, базовая гигиена, рутина (уборка, вовремя проснулся, приготовил еду, помыл посуду).
- 7.1 - 8.9★: Преодоление лени, спорт, интенсивная тренировка, сложные переговоры, разработка, интеллектуальный труд, волевое сверхусилие.
- 9.0 - 10.0★: Исключительный триумф, марафон, закрытие ключевой сделки, прорыв сквозь кризис или сильный страх.

СТРОГИЕ ПРАВИЛА:
1. Запрещены одинаковые шаблонные баллы (например всем ставить 8.8)! Оценивай каждый пункт индивидуально.
2. Запрещены одинаковые шаблонные фразы ("Отличная концентрация", "Фиксация победы"). Пиши уникальный, живой, точный разбор (1 короткое предложение ровно по сути написанного).
3. БЛАГОДАРНОСТИ НЕ ОЦЕНИВАЮТСЯ ЦИФРАМИ И ЗВЁЗДАМИ! Запрещено выставлять баллы благодарностям. Тексты благодарностей используй исключительно для составления душевного и точного напутствия ментора (verdict).

Верни строгий JSON со следующими полями:
{
  "prideEvaluations": [
    {
      "num": 1,
      "score": <число с плавающей точкой от 1.0 до 10.0, например 5.5, 8.5 или 1.5>,
      "comment": "<уникальный лаконичный разбор конкретно этого действия>",
      "overcome": <0, 1, 2 или 3>,
      "tags": ["#Тег"]
    }
  ],
  "breakdown": "<краткий честный разбор дня в 1-2 предложениях>",
  "verdict": "<сильное душевное напутствие ментора в 1-2 предложениях, объединяющее преодоления и благодарности дня>"
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
        max_tokens: 800,
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

    // Обработка персональных дифференцированных оценок каждой гордости
    const prideEvaluations = prides.map((p, i) => {
      const parsedItem = Array.isArray(parsed.prideEvaluations) ? parsed.prideEvaluations[i] : null
      const gibberish = isGibberish(p)

      let itemScore: number
      if (gibberish) {
        itemScore = typeof parsedItem?.score === 'number' && parsedItem.score <= 2.5
          ? Number(parsedItem.score.toFixed(1))
          : 1.5
      } else if (typeof parsedItem?.score === 'number' && !isNaN(parsedItem.score)) {
        itemScore = Number(Math.max(1.0, Math.min(10.0, parsedItem.score)).toFixed(1))
      } else {
        itemScore = 7.0
      }

      let comment = String(parsedItem?.comment || '')
      if (gibberish && (!comment || comment.toLowerCase().includes('отличн') || comment.toLowerCase().includes('побед'))) {
        comment = 'Бессмысленный ввод не является победой — опиши реальное преодоление.'
      } else if (!comment) {
        comment = 'Действие зафиксировано в летописи дня.'
      }

      const overcome = typeof parsedItem?.overcome === 'number'
        ? Math.max(0, Math.min(3, parsedItem.overcome))
        : (gibberish ? 0 : (itemScore >= 8.5 ? 2 : 1))
      const tags = Array.isArray(parsedItem?.tags) && parsedItem.tags.length > 0
        ? parsedItem.tags
        : [gibberish ? '#Внимание' : '#Дисциплина']

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

    const breakdown = String(parsed.breakdown || 'Анализ побед и преодолений проведён.')
    const verdict = String(parsed.verdict || 'День осознанной работы и укрепления характера.')

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
      gratitudeEvaluations: [],
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
