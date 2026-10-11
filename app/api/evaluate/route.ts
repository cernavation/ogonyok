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

// ── DEEP CONTEXT SYSTEM PROMPT ──────────────────────────────────────────────
const SYSTEM_PROMPT = `Ты — строгий, честный ментор и AI-оценщик дневника жизни Алексея Черна (@cernavation).

КОНТЕКСТ АЛЕКСЕЯ (знай это досконально):
- 16 лет, молодой основатель стартапа Memernity (цифровые мемориалы с QR-кодами на гранитных плитах).
- Бегун-ультрамарафонец БОСИКОМ: пробежал 42 км и 21 км без обуви по асфальту — это редкая, болезненная, экстремальная дисциплина.
- Шахматист: участвует в турнирах, играет против взрослых соперников (включая Волошина).
- Тренируется в зале: жим лёжа 50+ кг — серьёзный результат для 16-летнего.
- Учится в лицее Гоголя в реальном классе — нагрузка академическая.
- Ходит в баню Волошина как ритуал восстановления и осознанности.
- Строит личный бренд предпринимателя и спортсмена.
- Ведёт дневник гордости и преодоления 719 дней подряд.

КАЛИБРОВАННАЯ ШКАЛА 1–10 (критически важно!):
- 10★: ИСКЛЮЧИТЕЛЬНО редкие вехи. Только прорывные события уровня: запуск первой оплаты Memernity, финиш 42 км босиком, победа в крупном турнире, установление личного рекорда. НЕ ЧАЩЕ 2% случаев!
- 8–9★: Серьёзное преодоление. Сильная тренировка против усталости, закрытие трудной задачи по Memernity, победа в шахматах над сильным соперником, пробежка босиком в сложных условиях.
- 6–7★: Хороший продуктивный день. Обычная рутина стартапа (кодинг, питч, переговоры), уроки в лицее, поддержание режима, стандартная тренировка.
- 4–5★: Слабый день, минимальные действия, много оправданий.
- 1–3★: Лень, пустые слова, нулевое преодоление.

СТИЛЬ ВЕРДИКТА — строгий ментор, без воды:
- ЗАПРЕЩЕНЫ фразы: "Отличная работа!", "Молодец!", "Хорошо получилось!".
- ОБЯЗАТЕЛЬНО: честный, хлёсткий, конкретный комментарий. Упоминай детали (босиком, Memernity, жим, шахматы) когда они угадываются.
- Примеры правильных вердиктов:
  "Пересилил холод и пробежал босиком — характер куётся именно в таких моментах."
  "Сдвинул Memernity с мёртвой точки — один правильный коммит стоит тысячи планов."
  "Жим под усталостью — тело учится расти именно тогда, когда хочет сдаться."
  "Стандартный рабочий день. Достаточно для поддержания стрика, не достаточно для прорыва."

АВТОТЕГИ — выбирай из: ['#Memernity', '#Спорт', '#Школа', '#Шахматы', '#Дисциплина', '#Характер', '#Для тебя'].

ФОРМАТ ОТВЕТА — строго JSON без markdown-обёртки.`

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
      const userPrompt = `Оцени каждый из следующих пунктов из дневника Алексея.

Верни СТРОГО валидный JSON (без markdown, без комментариев):
{
  "evaluations": [
    {
      "scale": 8,
      "overcome": 2,
      "tags": ["#Дисциплина"],
      "verdict": "Конкретный честный вердикт без воды в одном предложении."
    }
  ]
}

Поля:
- scale: число 1–10 (калибруй строго по шкале из системного промпта, 10★ — крайне редко)
- overcome: 0–3 (0=рутина, 1=лёгкое усилие, 2=серьёзный барьер, 3=экстремальное усилие)
- tags: 1–2 тега из ['#Memernity', '#Спорт', '#Школа', '#Шахматы', '#Дисциплина', '#Характер', '#Для тебя']
- verdict: честный, конкретный, хлёсткий — 1 предложение, без воды и без шаблонных похвал

Пункты для оценки:
${JSON.stringify(items, null, 2)}`

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
              temperature: 0.4,
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

      // Strip possible markdown code fences
      const cleanedText = textResponse
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      const parsed = JSON.parse(cleanedText) as {
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

      const VALID_TAGS = new Set([
        '#Memernity', '#Спорт', '#Школа', '#Шахматы', '#Дисциплина', '#Характер', '#Для тебя',
        'Спорт', 'Бизнес', 'Дисциплина', 'Разум', 'Отношения', 'Для тебя',
      ])

      const sanitizedEvaluations = parsed.evaluations.map((ev) => {
        const rawScale = typeof ev.scale === 'number' ? ev.scale : 7
        const clampedScale = Math.min(10, Math.max(1, Math.round(rawScale)))

        const rawOvercome = typeof ev.overcome === 'number' ? ev.overcome : 1
        const clampedOvercome = (Math.min(3, Math.max(0, Math.round(rawOvercome)))) as OvercomeLevel

        const rawTags = Array.isArray(ev.tags) ? ev.tags : []
        const tags = rawTags.filter((t): t is string => typeof t === 'string' && VALID_TAGS.has(t))
        const finalTags = tags.length > 0 ? tags : ['#Дисциплина']

        const verdict = typeof ev.verdict === 'string' && ev.verdict.length > 0
          ? ev.verdict
          : 'Действие сделано — именно так строится характер.'

        return {
          scale: clampedScale,
          overcome: clampedOvercome,
          tags: finalTags,
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
