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
    // Взаимные подписки в `follows` (A -> B и B -> A) — единственный источник правды для друзей
    const [followingRes, followersRes] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', viewerId),
      supabase.from('follows').select('follower_id').eq('following_id', viewerId),
    ])

    const followingSet = new Set(
      (followingRes.data || []).map((r: any) => r.following_id).filter(Boolean)
    )
    const friendIds = Array.from(
      new Set(
        (followersRes.data || [])
          .map((r: any) => r.follower_id)
          .filter((id: string) => Boolean(id) && id !== viewerId && followingSet.has(id))
      )
    )

    if (friendIds.length === 0) {
      return NextResponse.json({ posts: [] })
    }

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
        client_id,
        day_number,
        user_id,
        day_date,
        title,
        visibility,
        created_at,
        profiles:user_id(id, username, display_name, avatar_url, avatar_image, avatar_color, streak_count, verified, last_seen_at),
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
        dayUuid: String(d.id),
        dayNumber: Number(d.day_number || d.client_id) || null,
        userId: d.user_id,
        username: p.username || 'user',
        displayName: p.display_name || `@${p.username || 'user'}`,
        avatarUrl: p.avatar_image || p.avatar_url || null,
        avatarColor: p.avatar_color || '#FF5C00',
        verified: Boolean(p.verified),
        streak: Number(p.streak_count || 0),
        lastSeenAt: p.last_seen_at || null,
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
