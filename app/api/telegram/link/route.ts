import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { apiErrorResponse } from '@/lib/server/api-validator'
import crypto from 'crypto'

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser(request)

  const rateLimitResponse = await applyRateLimit(request, {
    route: 'telegram-link',
    limit: 10,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется авторизация для генерации ссылки Telegram', 401)
  }

  try {
    // userId берется строго из сессии, а не из тела
    const userId = authUser.userId

    const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '') || 'OgonekDiaryBot'
    const code = 'ogk_' + crypto.randomBytes(4).toString('hex')

    const supabase = getServerSupabase()
    if (supabase) {
      await supabase.from('telegram_links').insert({
        user_id: userId,
        code,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
    }

    const link = `https://t.me/${botUsername}?start=${code}`
    return NextResponse.json({
      success: true,
      code,
      link,
      botUsername,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
