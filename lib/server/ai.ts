/**
-- ============================================================================
-- lib/server/ai.ts: ЕДИНЫЙ СЕРВЕРНЫЙ ИИ-СЛОЙ СИСТЕМЫ «ОГОНЁК»
-- ============================================================================
-- 1. Gemini — основной провайдер, DeepSeek — автоматический фолбэк
-- 2. Таймауты (20с), ретраи, Zod-валидация каждого ответа
-- 3. Оффлайн-эвристический разбор при падении обоих провайдеров (никаких 500 пользователю)
-- 4. SHA-256 кэширование по содержимому дня (этап 5)
-- 5. Логирование расхода токенов в ai_evaluations без сохранения личного текста записей
-- 6. Дифференциация тарифов:
--    - free: 403 с кодом 'tier_required'
--    - pro: баллы (масштаб, преодоление, теги) БЕЗ напутствия ментора
--    - ultra: полная церемония — баллы, разбор, вердикт Ментора, теги
-- ============================================================================
*/

import crypto from 'node:crypto'
import { z } from 'zod'
import { getServerSupabase } from '../supabase/server.ts'
import { consumeServerQuota } from './quota.ts'
import { getEffectiveTier } from './tier.ts'
import { getTierLimits, type SubscriptionTier } from '../ogonek/permissions.ts'
import { OGONEK_SYSTEM_PROMPT } from './prompts/system.ts'
import { buildDayEvaluationPrompt } from './prompts/evaluate-day.ts'

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
  tokens?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// ============================================================================
// ZOD-СХЕМЫ ДЛЯ ВАЛИДАЦИИ ОТВЕТОВ МОДЕЛЕЙ
// ============================================================================

export const PrideEvaluationSchema = z.object({
  num: z.number().int().positive().default(1),
  score: z.number().min(1.0).max(10.0),
  comment: z.string().default('Действие зафиксировано в летописи'),
  overcome: z.number().min(0).max(3).default(1),
  tags: z.array(z.string()).default([]),
})

export const DayEvaluationSchema = z.object({
  prideEvaluations: z.array(PrideEvaluationSchema).min(1),
  breakdown: z.string().min(1),
  verdict: z.string().optional().default(''),
  score: z.number().optional(),
})

// In-memory кэш на случай недоступности таблицы ai_cache в базе
const localAiCache = new Map<string, DayEvaluationResult>()

/**
 * Вычисляет SHA-256 хэш нормализованного содержимого дня
 */
export function computeDayContentHash(prides: string[], gratitudes: string[]): string {
  const normalized = JSON.stringify({
    prides: prides.map((p) => (p || '').trim()).filter((p) => p && p !== '—'),
    gratitudes: gratitudes.map((g) => (g || '').trim()).filter((g) => g && g !== '—'),
  })
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Проверка наличия ответа в кэше БД или in-memory
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
    // Игнорируем сетевые ошибки кэша
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
    // Fallback: локальный кэш уже обновлен
  }
}

// ============================================================================
// ОФФЛАЙН ЭВРИСТИЧЕСКИЙ РАЗБОР (ЕСЛИ ОБА ПРОВАЙДЕРА ВЫДАЛИ СБОЙ ИЛИ МУСОР)
// ============================================================================

export function fallbackHeuristicDayEvaluation(
  rawText: string,
  prides: string[],
  gratitudes: string[],
  tier: SubscriptionTier
): DayEvaluationResult {
  const isUltra = tier === 'ultra'
  const prideList = prides.filter((p) => p && p.trim().length > 0 && p.trim() !== '—')
  const effectivePrides = prideList.length > 0 ? prideList : ['Личный шаг вперёд']

  // Попытка извлечь числа от 1.0 до 10.0 из текста regex'ом
  const extractedNumbers: number[] = []
  const matches = rawText.match(/\b([1-9](?:\.[0-9])?|10(?:\.0)?)\b/g)
  if (matches) {
    for (const m of matches) {
      const num = parseFloat(m)
      if (!isNaN(num) && num >= 1.0 && num <= 10.0) {
        extractedNumbers.push(Number(num.toFixed(1)))
      }
    }
  }

  const prideEvaluations: PrideEvaluation[] = effectivePrides.map((text, idx) => {
    // Если есть извлечённый балл — берём его, иначе рассчитываем по весу действия
    let score = extractedNumbers[idx]
    if (!score) {
      const lower = text.toLowerCase()
      if (lower.includes('тренировк') || lower.includes('спорт') || lower.includes('бег') || lower.includes('зал')) {
        score = 8.2
      } else if (lower.includes('прорыв') || lower.includes('сделка') || lower.includes('решил') || lower.includes('завершил')) {
        score = 8.6
      } else if (text.length > 60) {
        score = 7.8
      } else {
        score = 7.2
      }
    }

    const overcome = score >= 8.5 ? 3 : score >= 7.5 ? 2 : score >= 5.0 ? 1 : 0
    const tags: string[] = []
    if (text.toLowerCase().includes('спорт') || text.toLowerCase().includes('бег')) tags.push('#Спорт')
    if (text.toLowerCase().includes('работа') || text.toLowerCase().includes('проект')) tags.push('#Фокус')
    if (tags.length === 0) tags.push('#Дисциплина')

    return {
      num: idx + 1,
      score,
      comment: 'Действие зафиксировано и принято в летопись личной силы.',
      overcome,
      tags,
    }
  })

  const sumScores = prideEvaluations.reduce((acc, p) => acc + p.score, 0)
  const averageScore = Number((sumScores / prideEvaluations.length).toFixed(1))

  const breakdown = 'День записан и сохранён в огне истории. Каждый подтверждённый факт победы укрепляет стержень.'
  const verdict = isUltra
    ? 'День записан и сохранён в огне истории. Твоя опора — в фактах свершённых преодолений. Продолжай держать строй.'
    : ''

  return {
    prideEvaluations,
    breakdown,
    verdict,
    score: averageScore,
    provider: 'heuristic-offline',
    tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  }
}

// ============================================================================
// ПРОВАЙДЕР 1: GEMINI С РЕТРАЕМ И ZOD-ВАЛИДАЦИЕЙ
// ============================================================================

async function callGemini(
  prompt: string,
  timeoutMs = 20000
): Promise<{ text: string; tokens: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
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

  const payload = {
    contents: [
      {
        parts: [
          { text: `${OGONEK_SYSTEM_PROMPT}\n\n${prompt}\n\nВерни ТОЛЬКО валидный JSON без markdown-разметки.` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json',
    },
  }

  // Однократный ретрай при сетевой ошибке
  let lastError: any = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Gemini status ${response.status}: ${errorText}`)
      }

      const json = await response.json()
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) throw new Error('Empty response from Gemini')

      const usage = json?.usageMetadata || {}
      return {
        text: rawText,
        tokens: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        },
      }
    } catch (err) {
      lastError = err
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 400))
      }
    }
  }

  throw lastError || new Error('Gemini call failed after retry')
}

// ============================================================================
// ПРОВАЙДЕР 2: DEEPSEEK С РЕТРАЕМ И ZOD-ВАЛИДАЦИЕЙ
// ============================================================================

async function callDeepSeek(
  prompt: string,
  timeoutMs = 20000
): Promise<{ text: string; tokens: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim().replace(/^["']|["']$/g, '')
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY_NOT_CONFIGURED')
  }

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  let lastError: any = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: OGONEK_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(`DeepSeek status ${response.status}: ${errText}`)
      }

      const json = await response.json()
      const rawText = json?.choices?.[0]?.message?.content
      if (!rawText) throw new Error('Empty response from DeepSeek')

      const usage = json?.usage || {}
      return {
        text: rawText,
        tokens: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
      }
    } catch (err) {
      lastError = err
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 400))
      }
    }
  }

  throw lastError || new Error('DeepSeek call failed after retry')
}

// ============================================================================
// БЕЗОПАСНЫЙ ZOD-ПАРСЕР ОТВЕТА МОДЕЛИ
// ============================================================================

function parseAndValidateDayJson(
  rawText: string,
  tier: SubscriptionTier
): DayEvaluationResult | null {
  try {
    // Очистка от возможных markdown ```json блоков
    const clean = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(clean)
    const validated = DayEvaluationSchema.safeParse(parsed)

    if (!validated.success) {
      return null
    }

    const data = validated.data
    // Если тариф PRO — убираем напутствие ментора
    const verdict = tier === 'ultra' ? (data.verdict || '') : ''

    const prideEvaluations = data.prideEvaluations
    const prideScoresSum = prideEvaluations.reduce((acc, p) => acc + p.score, 0)
    const finalScore = Number((prideScoresSum / prideEvaluations.length).toFixed(1))

    return {
      prideEvaluations,
      breakdown: data.breakdown,
      verdict,
      score: finalScore,
    }
  } catch {
    return null
  }
}

// ============================================================================
// ГЛАВНЫЙ СЕРВЕРНЫЙ ВХОД: EVALUATE DAY WITH AI
// ============================================================================

export interface EvaluateDayParams {
  userId: string
  prides: string[]
  gratitudes: string[]
  dayId?: string
  dayNumber?: number
  tier?: SubscriptionTier
  timeoutMs?: number
  mockProvider?: (prides: string[], gratitudes: string[]) => Promise<DayEvaluationResult>
}

export type EvaluateDayResponse =
  | { success: true; data: DayEvaluationResult; cached: boolean }
  | {
      success: false
      error: {
        code: string
        message: string
        limit?: number
        tier?: string
        feature?: string
      }
    }

export async function evaluateDayWithAI(
  params: EvaluateDayParams
): Promise<EvaluateDayResponse> {
  const { userId, prides, gratitudes, dayId, dayNumber, timeoutMs = 20000, mockProvider } = params

  if (prides.length === 0 && gratitudes.length === 0) {
    return {
      success: false,
      error: { code: 'EMPTY_CONTENT', message: 'Список записей для оценки пуст' },
    }
  }

  // 1. Проверяем тариф пользователя
  const tier = params.tier || (params.mockProvider ? 'pro' : await getEffectiveTier(userId))
  const limits = getTierLimits(tier)

  // Базовый (Free) тариф не имеет доступа к ИИ-оценке -> 403 tier_required
  if (limits.aiEvaluationsPerDay <= 0) {
    return {
      success: false,
      error: {
        code: 'tier_required',
        feature: 'aiEvaluationsPerDay',
        limit: 0,
        tier,
        message: 'ИИ-оценка дня доступна только на тарифах Премиум и Ultra',
      },
    }
  }

  // 2. Проверяем кэш по хэшу содержимого дня
  const contentHash = computeDayContentHash(prides, gratitudes)
  const cachedResult = await getCachedDayEvaluation(contentHash)

  if (cachedResult) {
    // Гарантируем, что для Pro вердикт не отдаётся даже из кэша Ultra
    const filteredCached: DayEvaluationResult = {
      ...cachedResult,
      verdict: tier === 'ultra' ? cachedResult.verdict : '',
      cached: true,
    }
    return {
      success: true,
      data: filteredCached,
      cached: true,
    }
  }

  // 3. Вызываем ИИ (до списания квоты) с каскадом: Gemini -> DeepSeek -> Heuristic
  let evaluation: DayEvaluationResult | null = null
  let providerName = 'gemini'
  let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

  const promptText = buildDayEvaluationPrompt({ prides, gratitudes, tier })

  if (mockProvider) {
    try {
      evaluation = await mockProvider(prides, gratitudes)
      providerName = 'mock'
    } catch (providerError: any) {
      return {
        success: false,
        error: {
          code: 'AI_PROVIDER_ERROR',
          message: 'Не удалось получить оценку от ИИ-провайдера. Квота сохранена.',
        },
      }
    }
  } else {
    // Шаг 3.1: Пробуем Gemini
    try {
      const geminiRes = await callGemini(promptText, timeoutMs)
      const parsed = parseAndValidateDayJson(geminiRes.text, tier)
      if (parsed) {
        evaluation = parsed
        providerName = 'gemini'
        tokenUsage = geminiRes.tokens
      } else {
        console.warn('[AI_VALIDATION]: Gemini JSON failed Zod schema, attempting DeepSeek')
      }
    } catch (geminiError: any) {
      console.warn(`[AI_FALLBACK]: Gemini failed (${geminiError?.message}), attempting DeepSeek`)
    }

    // Шаг 3.2: Если Gemini не дал валидный ответ -> пробуем DeepSeek
    if (!evaluation) {
      try {
        const deepseekRes = await callDeepSeek(promptText, timeoutMs)
        const parsed = parseAndValidateDayJson(deepseekRes.text, tier)
        if (parsed) {
          evaluation = parsed
          providerName = 'deepseek'
          tokenUsage = deepseekRes.tokens
        } else {
          console.warn('[AI_VALIDATION]: DeepSeek JSON failed Zod schema')
        }
      } catch (deepseekError: any) {
        console.warn(`[AI_FALLBACK]: DeepSeek failed (${deepseekError?.message})`)
      }
    }

    // Шаг 3.3: Если оба провайдера упали — оффлайн-эвристический разбор (никогда не возвращаем 500)
    if (!evaluation) {
      console.warn('[AI_OFFLINE_FALLBACK]: Both providers failed, using offline heuristic analysis')
      evaluation = fallbackHeuristicDayEvaluation('', prides, gratitudes, tier)
      providerName = 'heuristic-offline'
    }
  }

  // Гарантируем, что для тарифов ниже Ultra вердикт Ментора не отдаётся
  if (tier !== 'ultra' && evaluation) {
    evaluation = {
      ...evaluation,
      verdict: '',
    }
  }

  // 4. Атомарно списываем квоту (если не мок)
  if (!mockProvider) {
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
  }

  // 5. Логирование расхода токенов в ai_evaluations БЕЗ текста записей для чужих глаз (RLS владелец)
  if (dayId || typeof dayNumber === 'number') {
    try {
      const supabase = getServerSupabase()
      await supabase.from('ai_evaluations').upsert(
        {
          user_id: userId,
          day_id: dayId || null,
          day_number: dayNumber || 1,
          evaluation: evaluation.prideEvaluations,
          feedback: tier === 'ultra' ? evaluation.verdict : '',
          score: Math.round((evaluation.score || 8.0) * 10),
          model: providerName === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'deepseek-chat',
          provider: providerName,
          prompt_tokens: tokenUsage.promptTokens,
          completion_tokens: tokenUsage.completionTokens,
          total_tokens: tokenUsage.totalTokens,
        },
        { onConflict: 'user_id,day_number' }
      )
    } catch (logErr) {
      console.warn('[ai_evaluations logging warning]:', logErr)
    }
  }

  // 6. Сохранение в кэш
  await setCachedDayEvaluation(contentHash, evaluation, providerName)

  return {
    success: true,
    data: {
      ...evaluation,
      cached: false,
      provider: providerName,
      tokens: tokenUsage,
    },
    cached: false,
  }
}
