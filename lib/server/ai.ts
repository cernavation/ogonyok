import crypto from 'node:crypto'
import { getServerSupabase } from '../supabase/server.ts'
import { consumeServerQuota } from './quota.ts'
import { getEffectiveTier } from './tier.ts'
import { getTierLimits, type SubscriptionTier } from '../ogonek/permissions.ts'

export interface PrideEvaluation {
  num: number
  score: number
  comment: string
  overcome: number
  tags: string[]
}

export interface DayEvaluationResult {
  prideEvaluations: PrideEvaluation[]
  breakdown: string
  verdict: string
  score?: number
  cached?: boolean
  provider?: string
}

// In-memory fallback для кэша ответов ИИ
const localAiCache = new Map<string, DayEvaluationResult>()

/**
 * Вычисляет SHA-256 хэш содержимого записей дня
 */
export function computeDayContentHash(prides: string[], gratitudes: string[]): string {
  const normalized = JSON.stringify({
    prides: prides.map((p) => (p || '').trim()).filter((p) => p && p !== '—'),
    gratitudes: gratitudes.map((g) => (g || '').trim()).filter((g) => g && g !== '—'),
  })
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Проверка наличия кэшированного ответа ИИ в БД (или in-memory)
 */
export async function getCachedDayEvaluation(
  contentHash: string
): Promise<DayEvaluationResult | null> {
  try {
    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('ai_cache')
      .select('response, provider')
      .eq('content_hash', contentHash)
      .maybeSingle()

    if (!error && data?.response) {
      return {
        ...(data.response as DayEvaluationResult),
        cached: true,
        provider: data.provider || 'cache',
      }
    }
  } catch {
    // Fallback к локальной памяти
  }

  const local = localAiCache.get(contentHash)
  if (local) {
    return {
      ...local,
      cached: true,
      provider: 'local-cache',
    }
  }

  return null
}

/**
 * Сохранение ответа ИИ в кэш
 */
export async function setCachedDayEvaluation(
  contentHash: string,
  result: DayEvaluationResult,
  provider = 'gemini'
): Promise<void> {
  localAiCache.set(contentHash, result)

  try {
    const supabase = getServerSupabase()
    await supabase.from('ai_cache').upsert(
      {
        content_hash: contentHash,
        response: result,
        provider,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'content_hash' }
    )
  } catch {
    // Игнорируем ошибку внешнего кэша
  }
}

const SYSTEM_PROMPT = `Ты — бескомпромиссный, объективный и вдохновляющий ментор личной силы системы побед "Огонёк".
Твоя задача — строго дифференцированно оценить каждую гордость дня по реальному масштабу, преодолённым барьерам и воле.

КРИТЕРИИ ОЦЕНКИ КАЖДОЙ ГОРДОСТИ (ОТ 1.0 ДО 10.0★):
- 1.0 - 2.0★: Бессмысленный текст, спам, опечатки, заглушки. Оценка СТРОГО 1.0-2.0!
- 3.0 - 4.9★: Минимальное или тривиальное действие без преодоления сопротивления.
- 5.0 - 7.0★: Обычные бытовые дела, базовая гигиена, рутина.
- 7.1 - 8.9★: Преодоление лени, спорт, интенсивная тренировка, волевое сверхусилие.
- 9.0 - 10.0★: Исключительный триумф, марафон, закрытие ключевой сделки, прорыв сквозь сильный страх.

СТРОГИЕ ПРАВИЛА:
1. Запрещены одинаковые шаблонные баллы (например всем ставить 8.8)! Оценивай каждый пункт индивидуально.
2. БЛАГОДАРНОСТИ НЕ ОЦЕНИВАЮТСЯ ЦИФРАМИ И ЗВЁЗДАМИ! Тексты благодарностей используй исключительно для напутствия ментора (verdict).

Верни строгий JSON со следующими полями:
{
  "prideEvaluations": [
    {
      "num": 1,
      "score": <число с плавающей точкой от 1.0 до 10.0>,
      "comment": "<лаконичный разбор конкретно этого действия>",
      "overcome": <0, 1, 2 или 3>,
      "tags": ["#Тег"]
    }
  ],
  "breakdown": "<краткий честный разбор дня в 1-2 предложениях>",
  "verdict": "<сильное душевное напутствие ментора в 1-2 предложениях>"
}`

/**
 * Вызов провайдера Gemini с 20-секундным таймаутом
 */
async function callGemini(
  prides: string[],
  gratitudes: string[],
  timeoutMs = 20000
): Promise<DayEvaluationResult> {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '')

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED')
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const userPrompt = `Гордости дня:\n${prides.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nБлагодарности дня:\n${gratitudes.map((g, i) => `${i + 1}. ${g}`).join('\n')}`

  const payload = {
    contents: [
      {
        parts: [
          { text: `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nВерни ТОЛЬКО валидный JSON без markdown-разметки.` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Gemini error ${response.status}: ${errorText}`)
  }

  const json = await response.json()
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) throw new Error('Empty response from Gemini')

  const parsed = JSON.parse(rawText)
  return parsed as DayEvaluationResult
}

/**
 * Фолбэк-вызов провайдера DeepSeek с 20-секундным таймаутом
 */
async function callDeepSeek(
  prides: string[],
  gratitudes: string[],
  timeoutMs = 20000
): Promise<DayEvaluationResult> {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim().replace(/^["']|["']$/g, '')
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY_NOT_CONFIGURED')
  }

  const userPrompt = `Гордости дня:\n${prides.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nБлагодарности дня:\n${gratitudes.map((g, i) => `${i + 1}. ${g}`).join('\n')}`

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`DeepSeek error ${response.status}: ${errText}`)
  }

  const json = await response.json()
  const rawText = json?.choices?.[0]?.message?.content
  if (!rawText) throw new Error('Empty response from DeepSeek')

  return JSON.parse(rawText) as DayEvaluationResult
}

/**
 * Главная функция оценки дня с кэшированием, защитой тарифа и безопасным списанием квоты
 */
export async function evaluateDayWithAI(params: {
  userId: string
  prides: string[]
  gratitudes: string[]
  tier?: SubscriptionTier
  timeoutMs?: number
  mockProvider?: (prides: string[], gratitudes: string[]) => Promise<DayEvaluationResult>
}): Promise<
  | { success: true; data: DayEvaluationResult; cached: boolean }
  | { success: false; error: { code: string; message: string; limit?: number; tier?: string; feature?: string } }
> {
  const { userId, prides, gratitudes, timeoutMs = 20000, mockProvider } = params

  if (prides.length === 0 && gratitudes.length === 0) {
    return {
      success: false,
      error: { code: 'EMPTY_CONTENT', message: 'Список записей для оценки пуст' },
    }
  }

  // 1. Проверяем кэш по хэшу содержимого дня
  const contentHash = computeDayContentHash(prides, gratitudes)
  const cachedResult = await getCachedDayEvaluation(contentHash)

  if (cachedResult) {
    return {
      success: true,
      data: cachedResult,
      cached: true,
    }
  }

  // 2. Проверяем тариф пользователя перед вызовом ИИ
  const tier = params.tier || (params.mockProvider ? 'pro' : await getEffectiveTier(userId))
  const limits = getTierLimits(tier)

  if (limits.aiEvaluationsPerDay <= 0) {
    return {
      success: false,
      error: {
        code: 'quota_exceeded',
        feature: 'aiEvaluationsPerDay',
        limit: 0,
        tier,
        message: 'ИИ-оценка дня доступна только на тарифах Премиум и Ultra',
      },
    }
  }

  // 3. Вызываем провайдера ИИ СТРОГО ДО списания квоты (при ошибке квота НЕ списывается)
  let evaluation: DayEvaluationResult
  let providerName = 'gemini'

  try {
    if (mockProvider) {
      evaluation = await mockProvider(prides, gratitudes)
      providerName = 'mock'
    } else {
      try {
        evaluation = await callGemini(prides, gratitudes, timeoutMs)
        providerName = 'gemini'
      } catch (geminiError: any) {
        console.warn(`[AI_FALLBACK]: Gemini failed (${geminiError?.message}), falling back to DeepSeek`)
        evaluation = await callDeepSeek(prides, gratitudes, timeoutMs)
        providerName = 'deepseek'
      }
    }
  } catch (providerError: any) {
    // При ошибке провайдера квота НЕ списывается!
    console.error('[AI_PROVIDER_ERROR]:', providerError)
    return {
      success: false,
      error: {
        code: 'AI_PROVIDER_ERROR',
        message: 'Не удалось получить оценку от ИИ-провайдера. Квота сохранена.',
      },
    }
  }

  // 4. Провайдер успешно вернул ответ -> теперь атомарно списываем квоту
  const quotaRes = await consumeServerQuota(userId, 'aiEvaluationsPerDay', tier)
  if (!quotaRes.ok) {
    return {
      success: false,
      error: {
        code: 'quota_exceeded',
        feature: 'aiEvaluationsPerDay',
        limit: quotaRes.limit,
        tier: quotaRes.tier,
        message: 'Превышена суточная квота ИИ-оценок для вашего тарифа',
      },
    }
  }

  // 5. Сохраняем результат в кэш
  await setCachedDayEvaluation(contentHash, evaluation, providerName)

  return {
    success: true,
    data: {
      ...evaluation,
      cached: false,
      provider: providerName,
    },
    cached: false,
  }
}
