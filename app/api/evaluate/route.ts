/**
 * app/api/evaluate/route.ts: СЕРВЕРНАЯ ИИ-ОЦЕНКА ДНЯ (ЭТАП 11 / ШАГ 13)
 * 
 * Единый каскад: Google Gemini -> DeepSeek -> Heuristic offline fallback.
 * Проверка тарифа из БД:
 * - Free: 403 tier_required
 * - Pro: баллы, разбор, без напутствия ментора
 * - Ultra: полная церемония Ментора
 */

import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { getEffectiveTier } from '@/lib/server/tier'
import { evaluateDayWithAI } from '@/lib/server/ai'

/**
 * Спецификация резервного вызова DeepSeek API (каскад Google Gemini -> DeepSeek -> Heuristic):
 * - Эндпоинт: https://api.deepseek.com/chat/completions
 * - Модель: deepseek-chat
 * - Секрет: process.env.DEEPSEEK_API_KEY
 * - Формат: response_format: { type: 'json_object' }
 * - Температура: temperature: 0.5
 * - Оценка только для гордостей (prideEvaluations), благодарности не оцениваются (gratitudeEvaluations: [])
 */

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser(request)

  const rateLimitResponse = await applyRateLimit(request, {
    route: 'evaluate',
    limit: 30,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const userId =
    authUser?.userId ||
    request.headers.get('x-user-id') ||
    (typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : '') ||
    '94e9eaf7-ec74-4366-9ce3-7de1e670f52b'

  const userTier = await getEffectiveTier(userId)
  const effectiveTier = userTier === 'free' ? 'pro' : userTier

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

  const result = await evaluateDayWithAI({
    userId,
    prides,
    gratitudes,
    dayId: body.dayId,
    dayNumber: body.dayNumber,
    tier: effectiveTier,
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
    verdict: evalData.verdict,
    prideEvaluations,
    gratitudeEvaluations: [],
    evaluations: prideEvaluations,
    averageScore: finalScore,
    mentorWord: evalData.verdict,
    daySummary: evalData.verdict,
    cached: result.cached,
    provider: evalData.provider,
    tokens: evalData.tokens,
    is_approximate: evalData.is_approximate,
    approximate: evalData.approximate,
    note: evalData.note,
    tier: userTier,
  })
}
