import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { validateJsonBody, TelegramLinkSchema } from '@/lib/server/api-validator'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const validated = await validateJsonBody(request, TelegramLinkSchema)
    if (!validated.success) {
      return validated.response
    }
    const userId = validated.data.userId

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
