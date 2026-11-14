import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('call-missed', ip, 60, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const callerId = body.caller_id || user.userId
    const receiverId = body.receiver_id
    const callId = body.call_id
    const now = new Date()
    const timeStr =
      body.time_str ||
      now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

    if (!receiverId) {
      return NextResponse.json({ error: 'Missing receiver_id' }, { status: 400 })
    }

    // Детерминированный ключ треда
    const threadKey =
      callerId < receiverId ? `${callerId}_${receiverId}` : `${receiverId}_${callerId}`

    // 1. Попытка вызова RPC record_missed_call
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('record_missed_call', {
        p_caller_id: callerId,
        p_receiver_id: receiverId,
        p_call_id: callId || null,
        p_time_str: timeStr,
      })
      if (!rpcError && rpcData?.success) {
        return NextResponse.json(rpcData)
      }
    } catch {
      // RPC fallback
    }

    // 2. Fallback: запись напрямую в таблицы
    // 2.1. Сессия звонка
    try {
      if (callId) {
        await supabase
          .from('call_sessions')
          .update({ status: 'missed', updated_at: now.toISOString() })
          .eq('id', callId)
      } else {
        await supabase.from('call_sessions').insert({
          caller_id: callerId,
          receiver_id: receiverId,
          status: 'missed',
          created_at: now.toISOString(),
        })
      }
    } catch {
      // Игнорируем ошибку сессии звонка
    }

    // 2.2. Запись системного сообщения в чат
    const systemText = `Пропущенный звонок, ${timeStr}`
    const { data: msgData, error: msgError } = await supabase
      .from('direct_messages')
      .insert({
        thread_key: threadKey,
        author_id: callerId,
        recipient_id: receiverId,
        body: systemText,
        is_system: true,
        is_read: false,
        sent_at: now.toISOString(),
      })
      .select()
      .single()

    // 2.3. Создание уведомления в notifications
    try {
      // Получаем имя звонящего
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('display_name, avatar_image, avatar_url')
        .eq('id', callerId)
        .single()

      const callerName = callerProfile?.display_name || 'Друг'

      await supabase.from('notifications').insert({
        user_id: receiverId,
        type: 'missed_call',
        title: 'Пропущенный звонок',
        body: `${callerName} звонил в ${timeStr}`,
        data: {
          fromUserId: callerId,
          fromName: callerName,
          fromAvatar: callerProfile?.avatar_image || callerProfile?.avatar_url,
          threadKey,
          time: timeStr,
        },
        is_read: false,
        created_at: now.toISOString(),
      })
    } catch {
      // Игнорируем ошибку уведомления
    }

    return NextResponse.json({
      success: true,
      message_id: msgData?.id,
      thread_key: threadKey,
      time: timeStr,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to record missed call' },
      { status: 500 }
    )
  }
}
