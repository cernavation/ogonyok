import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import type { FriendFeedPost } from '@/lib/ogonek/social'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const viewerId = searchParams.get('viewerId')
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50)
  const offset = Math.max(Number(searchParams.get('offset') || 0), 0)

  if (!viewerId) {
    return NextResponse.json({ posts: [] })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ posts: [] })
  }

  try {
    // 1. Попытка вызвать RPC get_friend_feed_v1
    try {
      const { data, error } = await supabase.rpc('get_friend_feed_v1', {
        p_limit: limit,
        p_offset: offset,
        p_viewer_id: viewerId,
      })

      if (!error && Array.isArray(data)) {
        const posts: FriendFeedPost[] = data.map((r: any) => ({
          id: String(r.day_id || r.day_uuid),
          userId: r.user_id,
          username: r.username,
          displayName: r.display_name || `@${r.username}`,
          avatarUrl: r.avatar_url,
          verified: Boolean(r.verified),
          streak: Number(r.streak || 0),
          dayDate: r.day_date,
          title: r.title || '',
          visibility: r.visibility || 'friends',
          createdAt: r.created_at,
          prides: Array.isArray(r.prides) ? r.prides : [],
          gratitudes: Array.isArray(r.gratitudes) ? r.gratitudes : [],
        }))

        return NextResponse.json({ posts })
      }
    } catch {}

    // 2. Fallback: загрузка через Supabase SQL / PostgREST с фильтрацией друзей
    const { data: friendRows } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${viewerId},friend_id.eq.${viewerId}`)

    if (!Array.isArray(friendRows) || friendRows.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    const friendIds = friendRows.map((r) => (r.user_id === viewerId ? r.friend_id : r.user_id))

    // Исключаем заблокированных
    const { data: blockRows } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`)

    const blockedSet = new Set<string>()
    if (Array.isArray(blockRows)) {
      for (const b of blockRows) {
        blockedSet.add(b.blocker_id === viewerId ? b.blocked_id : b.blocker_id)
      }
    }

    const activeFriendIds = friendIds.filter((id) => !blockedSet.has(id))
    if (activeFriendIds.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    const { data: days, error: daysErr } = await supabase
      .from('days')
      .select(`
        id,
        user_id,
        day_date,
        title,
        visibility,
        created_at,
        profiles:user_id(id, username, display_name, avatar_url, streak_count, verified),
        prides(id, text, scale, category, visibility, order_index),
        gratitudes(id, text, category, visibility, order_index)
      `)
      .in('user_id', activeFriendIds)
      .in('visibility', ['public', 'friends'])
      .order('day_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (daysErr || !Array.isArray(days)) {
      return NextResponse.json({ posts: [] })
    }

    const posts: FriendFeedPost[] = days.map((d: any) => {
      const p = d.profiles || {}
      return {
        id: String(d.id),
        userId: d.user_id,
        username: p.username || 'user',
        displayName: p.display_name || `@${p.username || 'user'}`,
        avatarUrl: p.avatar_url,
        verified: Boolean(p.verified),
        streak: Number(p.streak_count || 0),
        dayDate: d.day_date,
        title: d.title || '',
        visibility: d.visibility || 'friends',
        createdAt: d.created_at,
        prides: Array.isArray(d.prides)
          ? d.prides
              .filter((item: any) => item.visibility !== 'private')
              .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          : [],
        gratitudes: Array.isArray(d.gratitudes)
          ? d.gratitudes
              .filter((item: any) => item.visibility !== 'private')
              .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          : [],
      }
    })

    return NextResponse.json({ posts })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
