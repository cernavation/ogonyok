import { NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateJsonBody } from '@/lib/server/api-validator'
import { getServerSupabase } from '@/lib/supabase/server'

const BlockActionSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(['block', 'unblock']),
})

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется авторизация', 401)
  }

  try {
    const supabase = getServerSupabase()
    const { data: blockedList, error } = await supabase.rpc('get_blocked_users')

    if (error) {
      // Fallback query
      const { data: rows } = await supabase
        .from('blocks')
        .select('blocked_id, created_at, profiles:blocked_id(id, username, display_name, avatar_url, avatar_color)')
        .eq('blocker_id', authUser.userId)

      const formatted = (rows || []).map((r: any) => ({
        blocked_id: r.blocked_id,
        created_at: r.created_at,
        username: r.profiles?.username || 'user',
        display_name: r.profiles?.display_name || 'Пользователь',
        avatar_url: r.profiles?.avatar_url || null,
        avatar_color: r.profiles?.avatar_color || '#ff5c00',
      }))
      return NextResponse.json({ success: true, blocked: formatted })
    }

    return NextResponse.json({ success: true, blocked: blockedList || [] })
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
    route: 'privacy-block-action',
    limit: 20,
    windowSeconds: 60,
    userId: authUser.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  const validated = await validateJsonBody(request, BlockActionSchema)
  if (!validated.success) return validated.response

  const { targetUserId, action } = validated.data
  const supabase = getServerSupabase()

  try {
    if (action === 'block') {
      const { error } = await supabase.from('blocks').upsert(
        {
          blocker_id: authUser.userId,
          blocked_id: targetUserId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'blocker_id,blocked_id' }
      )
      if (error) throw error
      return NextResponse.json({ success: true, message: 'Пользователь заблокирован' })
    } else {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', authUser.userId)
        .eq('blocked_id', targetUserId)
      if (error) throw error
      return NextResponse.json({ success: true, message: 'Пользователь разблокирован' })
    }
  } catch (err: any) {
    return apiErrorResponse('INTERNAL_SERVER_ERROR', err.message || 'Ошибка сервера', 500)
  }
}
