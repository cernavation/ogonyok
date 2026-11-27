import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('notifications-get', ip, 120, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ notifications: [], unread_count: 0 })
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // Если таблицы нет в кэше схем, возвращаем пустой список
      return NextResponse.json({ notifications: [], unread_count: 0 })
    }

    const notifications = (data || [])
      .filter((row: any) => !String(row.type || '').startsWith('priday_'))
      .map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data || {},
        isRead: Boolean(row.is_read),
        createdAtISO: row.created_at,
      }))

    const unread_count = notifications.filter((n: any) => !n.isRead).length

    return NextResponse.json({
      notifications,
      unread_count,
    })
  } catch (err: any) {
    return NextResponse.json({ notifications: [], unread_count: 0 })
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit('notifications-post', ip, 60, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ success: true, updated: 0 })
  }

  try {
    const body = await request.json()

    // 1. Пометить все как прочитанные
    if (body.mark_all_read) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.userId)
        .eq('is_read', false)
        .not('type', 'like', 'priday_%')

      return NextResponse.json({ success: !error })
    }

    // 2. Пометить конкретные id
    if (Array.isArray(body.notification_ids) && body.notification_ids.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.userId)
        .in('id', body.notification_ids)

      return NextResponse.json({ success: !error })
    }

    // 3. Создать уведомление
    if (body.action === 'create' && body.title) {
      const targetUserId = body.target_user_id || user.userId
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: body.type || 'system',
          title: body.title,
          body: body.body || '',
          data: body.data || {},
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, notification: data })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error' }, { status: 500 })
  }
}
