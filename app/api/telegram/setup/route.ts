import { NextResponse } from 'next/server'
import { apiErrorResponse } from '@/lib/server/api-validator'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser(request)
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'telegram-setup',
    limit: 10,
    windowSeconds: 60,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return apiErrorResponse('CONFIG_ERROR', 'TELEGRAM_BOT_TOKEN не настроен', 400)
  }

  const urlObj = new URL(request.url)
  const host = request.headers.get('host') || urlObj.host
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const webhookUrl = `${proto}://${host}/api/telegram/webhook`

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    })
    const data = await res.json()
    return NextResponse.json({
      success: data.ok,
      webhookUrl,
      telegramResponse: data,
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
