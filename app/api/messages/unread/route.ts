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

    let chat_unread = unreadRows?.length || 0

    // Непрочитанные групповые сообщения (read_by не содержит userId)
    try {
      const [{ data: memberRows }, { data: ownedRows }] = await Promise.all([
        supabase.from('chat_group_members').select('group_id').eq('user_id', user.userId),
        supabase.from('chat_groups').select('id').eq('creator_id', user.userId),
      ])
      const groupUuids = Array.from(
        new Set([
          ...((memberRows || []).map((r: any) => String(r.group_id || ''))),
          ...((ownedRows || []).map((r: any) => String(r.id || ''))),
        ])
      ).filter(Boolean)

      if (groupUuids.length > 0) {
        const groupThreadKeys = groupUuids.flatMap((gid) => [
          `group:group-${gid}`,
          `group:${gid}`,
          `group-${gid}`,
        ])
        const { data: groupMsgs } = await supabase
          .from('direct_messages')
          .select('thread_key, author_id, read_by')
          .in('thread_key', groupThreadKeys)
          .neq('author_id', user.userId)
          .limit(300)

        for (const gm of groupMsgs || []) {
          const readBy: string[] = Array.isArray((gm as any).read_by) ? (gm as any).read_by : []
          if (!readBy.includes(user.userId)) {
            chat_unread += 1
            const rawKey = String(gm.thread_key || '').replace(/^group:(group-)?/i, '').replace(/^group-/i, '')
            const normKey = rawKey ? `group-${rawKey}` : String(gm.thread_key || '')
            by_thread[normKey] = (by_thread[normKey] || 0) + 1
          }
        }
      }
    } catch {}

    // Непрочитанные сообщения от официального бота Winlog (поддержка, уведомления + official_broadcasts)
    let pridayUnread = 0
    try {
      const [{ count: pMsgCount, error: pMsgErr }, { count: pNotifCount }, profRes, broadcastsRes] = await Promise.all([
        supabase
          .from('priday_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.userId)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.userId)
          .in('type', ['priday_follow', 'priday_mutual', 'priday_support_reply'])
          .eq('is_read', false),
        supabase
          .from('profiles')
          .select('last_read_official_at, created_at')
          .eq('id', user.userId)
          .maybeSingle(),
        supabase
          .from('official_broadcasts')
          .select('id, author_id, created_at')
          .neq('author_id', user.userId)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      const lastReadIso = (profRes.data as any)?.last_read_official_at || null
      const userCreatedIso = (profRes.data as any)?.created_at || null
      const lastReadMs = lastReadIso ? new Date(lastReadIso).getTime() : 0
      const userCreatedMs = userCreatedIso ? new Date(userCreatedIso).getTime() : 0

      let broadcastUnread = 0
      if (!broadcastsRes.error && Array.isArray(broadcastsRes.data)) {
        for (const b of broadcastsRes.data) {
          const bMs = b?.created_at ? new Date(b.created_at).getTime() : 0
          if (!bMs) continue
          if (lastReadIso && Number.isFinite(lastReadMs)) {
            if (bMs > lastReadMs) broadcastUnread += 1
          } else if (userCreatedIso && Number.isFinite(userCreatedMs)) {
            if (bMs >= userCreatedMs) broadcastUnread += 1
          } else {
            broadcastUnread += 1
          }
        }
      }

      pridayUnread =
        Math.max(!pMsgErr && typeof pMsgCount === 'number' ? pMsgCount : 0, pNotifCount || 0) +
        broadcastUnread
    } catch {}

    if (pridayUnread > 0) {
      by_thread['priday-official'] = pridayUnread
      chat_unread += pridayUnread
    }

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
