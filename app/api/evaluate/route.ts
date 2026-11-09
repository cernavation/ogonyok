import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { apiErrorResponse, validateJsonBody, EvaluateDaySchema } from '@/lib/server/api-validator'
import { evaluateDayWithAI } from '@/lib/server/ai'

/**
 * Конфигурация фолбэк-провайдера DeepSeek API:
 * - Эндпоинт: 'https://api.deepseek.com/chat/completions'
 * - Модель: 'deepseek-chat'
 * - Секрет: DEEPSEEK_API_KEY
 * - Формат: response_format: { type: 'json_object' }
 * - Параметры: temperature: 0.5
 */
const DEEPSEEK_CONFIG = {
  endpoint: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  envKey: 'DEEPSEEK_API_KEY',
  response_format: 'json_object',
  temperature: 0.5,
}

export async function POST(request: Request) {
  // 1. Проверка авторизации
  const authUser = await getAuthenticatedUser(request)

  // 2. Rate limit (30 запросов в минуту)
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'evaluate',
    limit: 30,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Для получения ИИ-оценки требуется авторизация', 401)
  }

  // 3. Валидация входных данных через Zod
  const validated = await validateJsonBody(request, EvaluateDaySchema)
  if (!validated.success) {
    return validated.response
  }
  const body = validated.data as any

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

  // 4. Оценка с кэшированием, защитой тарифа и тайм-аутом 20 сек
  const result = await evaluateDayWithAI({
    userId: authUser.userId,
    prides,
    gratitudes,
    timeoutMs: 20000,
  })

  if (!result.success) {
    if (result.error.code === 'quota_exceeded') {
      return NextResponse.json(
        {
          error: {
            code: 'quota_exceeded',
            feature: result.error.feature || 'aiEvaluationsPerDay',
            limit: result.error.limit ?? 0,
            tier: result.error.tier || 'free',
            message: result.error.message,
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error.message,
      },
      { status: 502 }
    )
  }

  const evalData = result.data
  const prideEvaluations = evalData.prideEvaluations || []
  const prideScoresSum = prideEvaluations.reduce((acc, p) => acc + (typeof p.score === 'number' ? p.score : 8.8), 0)
  const finalScore = prideEvaluations.length > 0
    ? Number((prideScoresSum / prideEvaluations.length).toFixed(1))
    : 8.8

  // Сохранение в Supabase при наличии dayId
  if (body.dayId) {
    try {
      const supabase = getServerSupabase()
      await supabase.from('ai_evaluations').upsert(
        {
          user_id: authUser.userId,
          day_id: body.dayId,
          type: body.type || 'day',
          results: prideEvaluations,
          day_summary: evalData.verdict,
        },
        { onConflict: 'user_id,day_id,type' }
      )
    } catch (supaErr) {
      console.warn('[Supabase ai_evaluations upsert warning]:', supaErr)
    }
  }

  return NextResponse.json({
    success: true,
    score: finalScore,
    breakdown: evalData.breakdown,
    verdict: evalData.verdict,
    prideEvaluations,
    gratitudeEvaluations: [],
    evaluations: prideEvaluations,
    averageScore: finalScore,
    mentorWord: evalData.verdict,
    daySummary: evalData.verdict,
    cached: result.cached,
    provider: evalData.provider,
  })
}
