/**
-- ============================================================================
-- app/api/milestones/evaluate/route.ts: ГЕНЕРАЦИЯ ОБЗОРА ЮБИЛЕЙНОЙ ВЕХИ
-- ============================================================================
*/

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateJsonBody } from '@/lib/server/api-validator'
import { getEffectiveTier } from '@/lib/server/tier'
import { getServerSupabase } from '@/lib/supabase/server'
import { generateMilestoneReview, type RawDayInput } from '@/lib/server/milestones'

const MilestoneEvaluateSchema = z.object({
  milestoneNumber: z.number().int().positive().default(100),
  days: z.array(
    z.object({
      dayNumber: z.number().int(),
      prides: z.array(z.string()).default([]),
      gratitudes: z.array(z.string()).default([]),
      score: z.number().optional(),
      overcome: z.number().optional(),
      tags: z.array(z.string()).optional(),
    })
  ).optional(),
})

export async function POST(request: Request) {
  // 1. Авторизация
  const authUser = await getAuthenticatedUser(request)

  // 2. Rate limit
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'milestone-evaluate',
    limit: 15,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется авторизация', 401)
  }

  // 3. Валидация входных данных
  const validated = await validateJsonBody(request, MilestoneEvaluateSchema)
  if (!validated.success) return validated.response
  const { milestoneNumber, days: clientDays } = validated.data

  const targetMilestoneNumber = typeof milestoneNumber === 'number' && milestoneNumber > 0 ? milestoneNumber : 100

  // 4. Определение тарифа
  const tier = await getEffectiveTier(authUser.userId)

  // 5. Загрузка дней: если переданы клиентом — используем их, иначе вычитываем из БД
  let effectiveDays: RawDayInput[] = (clientDays || []).map((d) => ({
    dayNumber: d.dayNumber,
    prides: d.prides || [],
    gratitudes: d.gratitudes || [],
    score: d.score,
    overcome: d.overcome,
    tags: d.tags,
  }))

  if (effectiveDays.length === 0) {
    try {
      const supabase = getServerSupabase()
      const { data: dbDays } = await supabase
        .from('days')
        .select(`
          day_number,
          score,
          prides ( text, overcome_level, tags ),
          gratitudes ( text )
        `)
        .eq('user_id', authUser.userId)
        .lte('day_number', targetMilestoneNumber)
        .order('day_number', { ascending: true })

      if (dbDays && dbDays.length > 0) {
        effectiveDays = dbDays.map((d: any) => ({
          dayNumber: d.day_number,
          score: d.score,
          prides: (d.prides || []).map((p: any) => p.text),
          gratitudes: (d.gratitudes || []).map((g: any) => g.text),
          overcome: d.prides?.[0]?.overcome_level,
          tags: d.prides?.flatMap((p: any) => p.tags || []),
        }))
      }
    } catch (err) {
      console.warn('[Milestone days fetch warning]:', err)
    }
  }

  // 6. Генерация обзора
  const result = await generateMilestoneReview({
    userId: authUser.userId,
    milestoneNumber: targetMilestoneNumber,
    days: effectiveDays,
    tier,
  })

  return NextResponse.json({
    success: true,
    data: result,
  })
}
