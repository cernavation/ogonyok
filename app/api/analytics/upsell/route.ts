/**
 * ============================================================================
 * app/api/analytics/upsell/route.ts: АНАЛИТИКА ВОРОНКИ АПСЕЛЛОВ (ЭТАП 13)
 * ============================================================================
 * Фиксирует действия пользователя в воронке платных функций:
 * - 'shown': модалка показана
 * - 'clicked': клик по кнопке выбора тарифа Премиум или Ultra
 * - 'dismissed': закрытие или клик «Не сейчас»
 * Опционально сохраняет neverRemind: true в профиле (опция «Больше не напоминать»).
 * ============================================================================
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateJsonBody } from '@/lib/server/api-validator'
import { getServerSupabase } from '@/lib/supabase/server'

const UpsellEventSchema = z.object({
  feature: z.string().min(1).max(100),
  action: z.enum(['shown', 'clicked', 'dismissed']),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  neverRemind: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  // 1. Авторизация
  const authUser = await getAuthenticatedUser(request)

  // 2. Rate limit (до 60 запросов в минуту)
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'analytics-upsell',
    limit: 60,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется авторизация', 401)
  }

  // 3. Валидация входных данных
  const validated = await validateJsonBody(request, UpsellEventSchema)
  if (!validated.success) return validated.response
  const { feature, action, metadata, neverRemind } = validated.data

  try {
    const supabase = getServerSupabase()

    // 4. Запись события воронки в upsell_events
    await supabase.rpc('record_upsell_event', {
      p_feature: feature,
      p_action: action,
      p_metadata: metadata,
    })

    // 5. Если выбран чекбокс «Больше не напоминать»
    if (neverRemind) {
      await supabase.rpc('dismiss_upsell_forever', {
        p_feature: feature,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        feature,
        action,
        recordedAt: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    console.warn('[Analytics Upsell Warning]:', err)
    // Мягкая деградация: аналитические ошибки не должны ломать работу пользователя
    return NextResponse.json({
      success: true,
      warning: 'Fallback mode active',
    })
  }
}
