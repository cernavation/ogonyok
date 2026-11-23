/**
 * lib/server/ai.ts: ЕДИНЫЙ СЕРВЕРНЫЙ ИИ-СЛОЙ (ЭТАП 11 / ШАГ 13)
 * 
 * Архитектура:
 * 1. Каскад провайдеров: Google Gemini (основной) -> DeepSeek (фолбэк) -> Heuristic (оффлайн-эвристика)
 * 2. Дифференциация тарифов:
 *    - Free: отказ 403 / tier_required
 *    - Pro: баллы, преодоление, теги, краткий разбор БЕЗ напутствия Ментора (verdict: '')
 *    - Ultra: полная церемония Ментора — баллы, разбор, напутствие Ментора личной силы, теги
 * 3. Кэширование по SHA-256 хэшу нормализованных записей дня
 * 4. Защита квоты: списание только ПОСЛЕ успешного получения ответа от провайдера
 * 5. Логирование расхода токенов в ai_evaluations БЕЗ текста записей для чужих глаз
 */

import crypto from 'node:crypto'
import { z } from 'zod'
import { getServerSupabase } from '../supabase/server.ts'
import { consumeServerQuota, refundServerQuota } from './quota.ts'
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
  is_approximate?: boolean
  approximate?: boolean
  note?: string
}

// Zod-схема валидации гордости от ИИ
export const PrideEvaluationSchema = z.object({
  num: z.coerce.number().default(1),
  score: z.coerce.number().min(1.0).max(10.0),
  comment: z.string().optional().default('Действие зафиксировано в летописи.'),
  verdict: z.string().optional(),
  overcome: z.coerce.number().min(0).max(3).default(1),
  tags: z.array(z.string()).optional().default(['#Дисциплина']),
})

// Zod-схема ответа всего дня от ИИ
export const DayEvaluationSchema = z.object({
  prideEvaluations: z.array(PrideEvaluationSchema).optional(),
  evaluations: z.array(PrideEvaluationSchema).optional(),
  items: z.array(PrideEvaluationSchema).optional(),
  prides: z.array(PrideEvaluationSchema).optional(),
  breakdown: z.string().optional(),
  summary: z.string().optional(),
  verdict: z.string().optional().default(''),
})

/**
 * Безопасное извлечение JSON из markdown или сырого текста
 */
export function extractJsonString(raw: string): string {
  if (!raw) return ''
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim()
  }
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim()
  }
  return raw.trim()
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
    if (supabase) {
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
    if (supabase) {
      await supabase.from('ai_cache').upsert(
        {
          content_hash: contentHash,
          response: result,
          provider,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'content_hash' }
      )
    }
  } catch {
    // Игнорируем ошибку внешнего кэша
  }
}

/**
 * ОФФЛАЙН ЭВРИСТИЧЕСКИЙ РАЗБОР (ЕСЛИ ОБА ПРОВАЙДЕРА ВЫДАЛИ СБОЙ ИЛИ МУСОР)
 */
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
    is_approximate: true,
    approximate: true,
    note: 'Приблизительная оценка',
    tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  }
}

/**
 * Провайдер 1: Google Gemini с ретраем и извлечением токенов
 */
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

  // Google AI Studio ключи Gemini начинаются с AIzaSy. Невалидные токены пропускаем сразу к DeepSeek.
  if (!apiKey.startsWith('AIzaSy') && !apiKey.startsWith('AIza')) {
    console.warn(`[AI_GATEWAY]: GEMINI_API_KEY format unsupported (${apiKey.slice(0, 8)}...), cascading immediately to DeepSeek`)
    throw new Error('GEMINI_API_KEY_INVALID_FORMAT')
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
        console.error(`[AI_GATEWAY]: Gemini HTTP ${response.status}: ${errorText}`)
        // Ошибки авторизации (401/403) не исправятся повтором — переходим к DeepSeek сразу
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Gemini auth error ${response.status}: ${errorText}`)
        }
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
    } catch (err: any) {
      lastError = err
      const statusMatch = String(err?.message || '').match(/status\s+(\d+)/i)
      const statusNum = statusMatch ? parseInt(statusMatch[1], 10) : 0
      // Don't retry non-recoverable client/auth errors (400, 401, 403, 404)
      if (statusNum >= 400 && statusNum < 500) {
        break
      }
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 400))
      }
    }
  }

  throw lastError || new Error('Gemini call failed after retry')
}

/**
 * Провайдер 2: DeepSeek с ретраем и извлечением токенов
 */
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
    } catch (err: any) {
      lastError = err
      const statusMatch = String(err?.message || '').match(/status\s+(\d+)/i)
      const statusNum = statusMatch ? parseInt(statusMatch[1], 10) : 0
      // Don't retry non-recoverable client/auth errors (400, 401, 403, 404)
      if (statusNum >= 400 && statusNum < 500) {
        break
      }
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 400))
      }
    }
  }

  throw lastError || new Error('DeepSeek call failed after retry')
}

/**
 * Безопасный Zod-парсер ответа модели
 */
function parseAndValidateDayJson(
  rawText: string,
  tier: SubscriptionTier
): DayEvaluationResult | null {
  try {
    const clean = extractJsonString(rawText)
    if (!clean) {
      console.error('[AI_VALIDATION] Empty JSON after extraction from:', rawText.slice(0, 200))
      return null
    }

    const parsed = JSON.parse(clean)
    const validated = DayEvaluationSchema.safeParse(parsed)

    if (!validated.success) {
      console.error('[AI_VALIDATION] Schema validation failed:', validated.error.format())
      return null
    }

    const data = validated.data
    const prideEvaluations = (
      data.prideEvaluations ||
      data.evaluations ||
      data.items ||
      data.prides ||
      []
    ).map((p, i) => ({
      num: p.num || i + 1,
      score: Number(p.score.toFixed(1)),
      comment: p.comment || p.verdict || 'Действие зафиксировано в летописи.',
      overcome: p.overcome ?? 1,
      tags: Array.isArray(p.tags) && p.tags.length > 0 ? p.tags : ['#Дисциплина'],
    }))

    if (prideEvaluations.length === 0) {
      console.error('[AI_VALIDATION] No pride evaluations found in response')
      return null
    }

    // Если тариф PRO — строго убираем напутствие ментора
    const verdict = tier === 'ultra' ? (data.verdict || data.summary || '') : ''
    const breakdown = data.breakdown || data.summary || data.verdict || 'День сохранён в летописи.'

    const prideScoresSum = prideEvaluations.reduce((acc, p) => acc + p.score, 0)
    const finalScore = Number((prideScoresSum / prideEvaluations.length).toFixed(1))

    return {
      prideEvaluations,
      breakdown,
      verdict,
      score: finalScore,
    }
  } catch (err: any) {
    console.error('[AI_VALIDATION] JSON parse error:', err?.message, 'Raw text:', rawText.slice(0, 300))
    return null
  }
}

export interface EvaluateDayParams {
  userId: string
  prides: string[]
  gratitudes: string[]
  dayId?: string
  dayNumber?: number
  tier?: SubscriptionTier
  timeoutMs?: number
  mockProvider?: (prides: string[], gratitudes: string[]) => Promise<DayEvaluationResult>
  enforceQuota?: boolean
  skipQuota?: boolean
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

// Защита от параллельных гонок: сериализация одновременных запросов для одного пользователя
const userEvaluationLocks = new Map<string, Promise<any>>()

/**
 * Главная серверная функция оценки дня с мьютексом от race condition
 */
export async function evaluateDayWithAI(
  params: EvaluateDayParams
): Promise<EvaluateDayResponse> {
  const lockKey = params.userId || 'anon'
  const prevLock = userEvaluationLocks.get(lockKey) || Promise.resolve()

  const currentExecution = prevLock
    .catch(() => {})
    .then(() => executeEvaluateDayWithAI(params))

  userEvaluationLocks.set(lockKey, currentExecution)

  try {
    return await currentExecution
  } finally {
    if (userEvaluationLocks.get(lockKey) === currentExecution) {
      userEvaluationLocks.delete(lockKey)
    }
  }
}

async function executeEvaluateDayWithAI(
  params: EvaluateDayParams
): Promise<EvaluateDayResponse> {
  const {
    userId,
    prides,
    gratitudes,
    dayId,
    dayNumber,
    timeoutMs = 20000,
    mockProvider,
  } = params

  if (prides.length === 0 && gratitudes.length === 0) {
    return {
      success: false,
      error: { code: 'EMPTY_CONTENT', message: 'Список записей для оценки пуст' },
    }
  }

  // 1. Проверяем тариф пользователя
  const tier = params.tier || (params.mockProvider ? 'pro' : await getEffectiveTier(userId))
  const limits = getTierLimits(tier)

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

  // 3. Атомарно бронируем/списываем квоту ДО вызова внешних ИИ-провайдеров
  // Это исключает обход лимита параллельными одновременными запросами
  const shouldConsumeQuota = !params.skipQuota && (!mockProvider || Boolean(params.enforceQuota))
  if (shouldConsumeQuota) {
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

  // 4. Вызываем ИИ с каскадом: Gemini -> DeepSeek -> Heuristic
  let evaluation: DayEvaluationResult | null = null
  let providerName = 'gemini'
  let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

  const promptText = buildDayEvaluationPrompt({ prides, gratitudes, tier })

  if (mockProvider) {
    try {
      evaluation = await mockProvider(prides, gratitudes)
      providerName = 'mock'
    } catch {
      return {
        success: false,
        error: {
          code: 'AI_PROVIDER_ERROR',
          message: 'Не удалось получить оценку от ИИ-провайдера. Квота сохранена.',
        },
      }
    }
  } else {
    // 4.1: Пробуем Gemini (с 1 ретраем)
    for (let attempt = 1; attempt <= 2 && !evaluation; attempt++) {
      try {
        const geminiRes = await callGemini(promptText, timeoutMs)
        const parsed = parseAndValidateDayJson(geminiRes.text, tier)
        if (parsed) {
          evaluation = parsed
          providerName = 'gemini'
          tokenUsage = geminiRes.tokens
        } else if (attempt === 1) {
          console.warn('[AI_VALIDATION]: Gemini JSON failed Zod schema, retrying once')
        }
      } catch (geminiError: any) {
        console.warn(`[AI_FALLBACK]: Gemini attempt ${attempt} failed (${geminiError?.message})`)
        const statusMatch = String(geminiError?.message || '').match(/status\s+(\d+)/i)
        const statusNum = statusMatch ? parseInt(statusMatch[1], 10) : 0
        if (statusNum >= 400 && statusNum < 500) {
          break
        }
      }
    }

    // 4.2: Если Gemini не ответил -> пробуем DeepSeek (с 1 ретраем)
    if (!evaluation) {
      for (let attempt = 1; attempt <= 2 && !evaluation; attempt++) {
        try {
          const deepseekRes = await callDeepSeek(promptText, timeoutMs)
          const parsed = parseAndValidateDayJson(deepseekRes.text, tier)
          if (parsed) {
            evaluation = parsed
            providerName = 'deepseek'
            tokenUsage = deepseekRes.tokens
          } else if (attempt === 1) {
            console.warn('[AI_VALIDATION]: DeepSeek JSON failed Zod schema, retrying once')
          }
        } catch (deepseekError: any) {
          if (attempt === 1) {
            console.warn(`[AI_FALLBACK]: DeepSeek attempt 1 failed (${deepseekError?.message})`)
          }
        }
      }
    }

    // 4.3: Если оба провайдера недоступны — оффлайн-эвристический разбор
    if (!evaluation) {
      console.warn('[AI_OFFLINE_FALLBACK]: Both providers failed, using offline heuristic analysis with approximate badge')
      evaluation = fallbackHeuristicDayEvaluation('', prides, gratitudes, tier)
      providerName = 'heuristic-offline'
    }
  }

  // 5. Логирование расхода токенов в ai_evaluations
  if (dayId || typeof dayNumber === 'number') {
    try {
      const supabase = getServerSupabase()
      if (supabase) {
        await supabase.from('ai_evaluations').insert({
          user_id: userId,
          day_id: dayId || null,
          provider: providerName,
          prompt_tokens: tokenUsage.promptTokens,
          completion_tokens: tokenUsage.completionTokens,
          total_tokens: tokenUsage.totalTokens,
          score: evaluation?.score || null,
          created_at: new Date().toISOString(),
        })
      }
    } catch (logErr) {
      console.warn('[AI_TOKEN_LOG_WARNING]:', logErr)
    }
  }

  // 6. Сохраняем полный результат в кэш (до фильтрации по тарифу, чтобы кэш содержал напутствие)
  if (evaluation) {
    await setCachedDayEvaluation(contentHash, evaluation, providerName)
  }

  // Гарантируем, что для тарифов ниже Ultra вердикт Ментора не отдаётся клиенту
  const finalVerdict = tier === 'ultra' ? (evaluation?.verdict || '') : ''

  return {
    success: true,
    data: {
      ...evaluation!,
      verdict: finalVerdict,
      cached: false,
      provider: providerName,
      tokens: tokenUsage,
    },
    cached: false,
  }
}
