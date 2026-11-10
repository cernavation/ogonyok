/**
-- ============================================================================
-- app/api/ai/evaluate-day/route.ts: ИИ-ОЦЕНКА ДНЯ (ЭТАП 11)
-- ============================================================================
-- 1. Только авторизованные пользователи (401 при отсутствии токена)
-- 2. Тариф берётся из БД (getEffectiveTier)
-- 3. Free: 403 с кодом 'tier_required'
-- 4. Pro: баллы (масштаб, преодоление, теги) БЕЗ напутствия ментора
-- 5. Ultra: полная церемония — баллы, разбор, вердикт Ментора, теги
-- 6. Квота 1/сутки (этап 5), при ошибке провайдера не списывается
-- ============================================================================
*/

import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateJsonBody, EvaluateDaySchema } from '@/lib/server/api-validator'
import { getEffectiveTier } from '@/lib/server/tier'
import { evaluateDayWithAI } from '@/lib/server/ai'

export async function POST(request: Request) {
  // 1. Проверка авторизации
  const authUser = await getAuthenticatedUser(request)

  // 2. Rate limit (30 запросов в минуту)
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'evaluate-day',
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

  // 3. Проверка тарифа пользователя прямо из БД
  const userTier = await getEffectiveTier(authUser.userId)
  if (userTier === 'free') {
    return NextResponse.json(
      {
        error: {
          code: 'tier_required',
          feature: 'aiEvaluationsPerDay',
          limit: 0,
          tier: 'free',
          message: 'ИИ-оценка дня доступна только на тарифах Премиум и Ultra',
        },
      },
      { status: 403 }
    )
  }

  // 4. Валидация входных данных через Zod
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

  // 5. Вызов серверного ИИ с каскадом, квотой и логированием токенов
  const result = await evaluateDayWithAI({
    userId: authUser.userId,
    prides,
    gratitudes,
    dayId: body.dayId,
    dayNumber: body.dayNumber,
    tier: userTier,
    timeoutMs: 20000,
  })

  if (!result.success) {
    const err = result.error
    if (err.code === 'tier_required' || err.code === 'quota_exceeded') {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            feature: err.feature || 'aiEvaluationsPerDay',
            limit: err.limit ?? 0,
            tier: err.tier || userTier,
            message: err.message,
          },
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 502 }
    )
  }

  const evalData = result.data
  const prideEvaluations = evalData.prideEvaluations || []
  const prideScoresSum = prideEvaluations.reduce((acc, p) => acc + (typeof p.score === 'number' ? p.score : 8.0), 0)
  const finalScore = prideEvaluations.length > 0
    ? Number((prideScoresSum / prideEvaluations.length).toFixed(1))
    : 8.0

  return NextResponse.json({
    success: true,
    score: finalScore,
    breakdown: evalData.breakdown,
    verdict: evalData.verdict, // Пустой для Pro, мудрое напутствие для Ultra
    prideEvaluations,
    gratitudeEvaluations: [],
    evaluations: prideEvaluations,
    averageScore: finalScore,
    mentorWord: evalData.verdict,
    daySummary: evalData.verdict,
    cached: result.cached,
    provider: evalData.provider,
    tokens: evalData.tokens,
    tier: userTier,
  })
}
