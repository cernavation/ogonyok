/**
 * ============================================================================
 * app/api/privacy/route.ts: СЕРВЕРНЫЕ НАСТРОЙКИ ПРИВАТНОСТИ (ЭТАП 14)
 * ============================================================================
 * Чтение и обновление настроек приватности профиля, синхронизация с Supabase.
 * ============================================================================
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateJsonBody } from '@/lib/server/api-validator'
import { getServerSupabase } from '@/lib/supabase/server'

const UpdatePrivacySchema = z.object({
  who_can_find: z.enum(['everyone', 'friends', 'nobody']).optional(),
  who_can_message: z.enum(['everyone', 'friends', 'nobody']).optional(),
  who_can_call: z.enum(['everyone', 'friends', 'nobody']).optional(),
  who_can_see_online: z.enum(['everyone', 'friends', 'nobody']).optional(),
  default_day_visibility: z.enum(['public', 'friends', 'groups', 'private']).optional(),
  show_streak_publicly: z.boolean().optional(),
  show_badges_publicly: z.boolean().optional(),
  show_difficulty_publicly: z.boolean().optional(),
  searchable_by_username: z.boolean().optional(),
  hide_from_leaderboards: z.boolean().optional(),
})

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется авторизация', 401)
  }

  try {
    const supabase = getServerSupabase()
    const { data: privacy, error } = await supabase.rpc('get_privacy_settings')
    if (error) {
      // Фолбэк на прямой селект из profile_private
      const { data: row } = await supabase
        .from('profile_private')
        .select('privacy')
        .eq('user_id', authUser.userId)
        .single()
      return NextResponse.json({ success: true, privacy: row?.privacy || {} })
    }

    return NextResponse.json({ success: true, privacy: privacy || {} })
  } catch (err: any) {
    return apiErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'Ошибка сервера', 500)
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется авторизация', 401)
  }

  const rateLimitResponse = await applyRateLimit(request, {
    route: 'privacy-update',
    limit: 30,
    windowSeconds: 60,
    userId: authUser.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  const validated = await validateJsonBody(request, UpdatePrivacySchema)
  if (!validated.success) return validated.response

  try {
    const supabase = getServerSupabase()
    const { data: updated, error } = await supabase.rpc('update_privacy_settings', {
      p_privacy: validated.data,
    })

    if (error) {
      // Фолбэк прямого обновления
      await supabase
        .from('profile_private')
        .upsert(
          {
            user_id: authUser.userId,
            privacy: validated.data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      return NextResponse.json({ success: true, privacy: validated.data })
    }

    return NextResponse.json({ success: true, privacy: updated })
  } catch (err: any) {
    return apiErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'Ошибка сервера', 500)
  }
}
