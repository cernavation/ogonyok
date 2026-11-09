import { NextResponse } from 'next/server.js'
import { getServerSupabase } from '../supabase/server.ts'

export async function handleScheduledDelivery(request: Request, clientOverride?: any) {
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

    const supabase = clientOverride || getServerSupabase()

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
      const payload = (item.payload || {}) as Record<string, unknown>
      const authorId = item.author_id || item.sender_id || (payload.author_id as string) || (payload.sender_id as string)
      const recipientId = item.recipient_id || (payload.recipient_id as string)
      const body = item.body || (payload.body as string) || (payload.text as string) || ''
      const attachment = item.attachment || (payload.attachment as Record<string, unknown>) || null

      let threadKey = item.thread_key || (payload.thread_key as string)
      if (!threadKey && authorId && recipientId) {
        threadKey = [authorId, recipientId].sort().join(':')
      }

      if (!authorId || !recipientId) {
        console.warn('[cron/deliver-scheduled] Skipping message without author or recipient:', item.id)
        continue
      }

      const sentAt = item.scheduled_at || now

      // Запись в каноническую таблицу direct_messages
      const { error: insertErr } = await supabase.from('direct_messages').insert({
        thread_key: threadKey || 'direct',
        author_id: authorId,
        recipient_id: recipientId,
        body,
        attachment,
        sent_at: sentAt,
        created_at: sentAt,
      })

      if (!insertErr) {
        await supabase
          .from('scheduled_messages')
          .update({ delivered: true, delivered_at: now })
          .eq('id', item.id)
        deliveredCount += 1
      } else {
        console.error('[cron/deliver-scheduled] Failed to deliver direct message:', insertErr)
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
