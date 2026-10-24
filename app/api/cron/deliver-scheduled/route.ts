import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export async function GET(request: Request) {
  return handleScheduledDelivery(request)
}

export async function POST(request: Request) {
  return handleScheduledDelivery(request)
}

async function handleScheduledDelivery(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const secretParam = new URL(request.url).searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      const token = authHeader?.replace(/^Bearer\s+/i, '') || secretParam
      if (token !== cronSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized: invalid CRON_SECRET' }, { status: 401 })
      }
    }

    const supabase = await getServerSupabase()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        source: 'local-or-demo',
        delivered: 0,
        message: 'Supabase клиент не настроен, доставка симулируется на клиенте',
      })
    }

    const now = new Date().toISOString()

    // 1. Находим запланированные сообщения, время которых наступило
    const { data: readyMessages, error: fetchErr } = await supabase
      .from('scheduled_messages')
      .select('*')
      .lte('scheduled_at', now)
      .eq('delivered', false)
      .limit(50)

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 })
    }

    if (!readyMessages || readyMessages.length === 0) {
      return NextResponse.json({ success: true, delivered: 0, message: 'Нет сообщений для доставки' })
    }

    let deliveredCount = 0

    for (const item of readyMessages) {
      const payload = item.payload as Record<string, unknown>
      const { error: insertErr } = await supabase.from('messages').insert({
        conversation_id: item.conversation_id,
        sender_id: item.sender_id,
        text: payload.text || '',
        attachment: payload.attachment || null,
        media: payload.media || null,
        type: payload.type || 'text',
        silent: payload.silent || false,
        created_at: item.scheduled_at,
      })

      if (!insertErr) {
        await supabase
          .from('scheduled_messages')
          .update({ delivered: true })
          .eq('id', item.id)
        deliveredCount += 1
      }
    }

    return NextResponse.json({
      success: true,
      delivered: deliveredCount,
      timestamp: now,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка доставки запланированных сообщений'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
