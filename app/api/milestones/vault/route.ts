/**
 * app/api/milestones/vault/route.ts: СОХРАНЕНИЕ ВЕХИ В СВОД (VAULT) (ШАГ 13)
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateJsonBody } from '@/lib/server/api-validator'
import { getServerSupabase } from '@/lib/supabase/server'

const MilestoneVaultSchema = z.object({
  milestoneNumber: z.number().int().positive(),
  savedToVault: z.boolean().default(true),
  userReviewText: z.string().max(2000).optional(),
})

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser(request)

  const rateLimitResponse = await applyRateLimit(request, {
    route: 'milestone-vault',
    limit: 30,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  const validated = await validateJsonBody(request, MilestoneVaultSchema)
  if (!validated.success) return validated.response
  const { milestoneNumber, savedToVault, userReviewText } = validated.data

  const userId =
    authUser?.userId ||
    request.headers.get('x-user-id') ||
    'demo-milestone-user'

  try {
    const supabase = getServerSupabase()
    if (supabase) {
      const { data, error } = await supabase.rpc('save_milestone_to_vault', {
        p_milestone_number: milestoneNumber,
        p_saved: savedToVault,
        p_review_text: userReviewText || null,
      })

      if (!error) {
        return NextResponse.json({ success: true, data })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        milestoneNumber,
        savedToVault,
        userReviewText,
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ошибка сохранения в Свод' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request)

  const { searchParams } = new URL(request.url)
  const targetUserId =
    searchParams.get('userId') ||
    authUser?.userId ||
    request.headers.get('x-user-id')

  if (!targetUserId) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется идентификатор пользователя', 401)
  }

  try {
    const supabase = getServerSupabase()
    if (supabase) {
      const { data, error } = await supabase.rpc('get_user_milestones', {
        p_user_id: targetUserId,
      })

      if (!error && data) {
        return NextResponse.json({ success: true, milestones: data })
      }
    }

    return NextResponse.json({
      success: true,
      milestones: [],
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Ошибка загрузки вех' },
      { status: 500 }
    )
  }
}
