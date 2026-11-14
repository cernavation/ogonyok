import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('messages-unread', ip, 120, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({
      chat_unread: 0,
      notifications_unread: 0,
      total_unread: 0,
      by_thread: {},
    })
  }

  try {
    // 1. Попытка вызова RPC get_unread_counts
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_unread_counts', {
      p_user_id: user.userId,
    })

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      return NextResponse.json(rpcData)
    }

    // 2. Fallback: прямой запрос к direct_messages и notifications
    const { data: unreadRows, error: msgError } = await supabase
      .from('direct_messages')
      .select('thread_key, author_id')
      .eq('recipient_id', user.userId)
      .eq('is_read', false)

    const by_thread: Record<string, number> = {}
    const by_sender: Record<string, number> = {}

    if (!msgError && Array.isArray(unreadRows)) {
      for (const row of unreadRows) {
        if (row.thread_key) {
          by_thread[row.thread_key] = (by_thread[row.thread_key] || 0) + 1
        }
        if (row.author_id) {
          by_sender[row.author_id] = (by_sender[row.author_id] || 0) + 1
        }
      }
    }

    const chat_unread = unreadRows?.length || 0

    // Проверка непрочитанных уведомлений
    let notifications_unread = 0
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.userId)
        .eq('is_read', false)
      if (typeof count === 'number') {
        notifications_unread = count
      }
    } catch {
      // Игнорируем отсутствие таблицы notifications
    }

    return NextResponse.json({
      chat_unread,
      notifications_unread,
      total_unread: chat_unread + notifications_unread,
      by_thread,
      by_sender,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch unread counts' },
      { status: 500 }
    )
  }
}
