import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, targetUserId, viewerId } = body
  if (!targetUserId || !action) {
    return NextResponse.json({ error: 'action and targetUserId are required' }, { status: 400 })
  }

  const currentUid = viewerId
  if (!currentUid) {
    return NextResponse.json({ error: 'viewerId required' }, { status: 401 })
  }

  if (currentUid === targetUserId) {
    return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 })
  }

  try {
    if (action === 'block') {
      try {
        const { data, error } = await supabase.rpc('block_profile', {
          target_user_id: targetUserId,
          p_viewer_id: currentUid,
        })
        if (!error && data) return NextResponse.json(data)
      } catch {}

      // Fallback: запись в blocks и удаление дружбы
      await supabase.from('blocks').upsert({
        blocker_id: currentUid,
        blocked_id: targetUserId,
      })

      await supabase
        .from('friendships')
        .delete()
        .or(
          `and(user_id.eq.${currentUid},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUid})`
        )

      await supabase
        .from('follows')
        .delete()
        .or(
          `and(follower_id.eq.${currentUid},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${currentUid})`
        )

      return NextResponse.json({ ok: true, blocked: true })
    }

    if (action === 'unblock') {
      try {
        const { data, error } = await supabase.rpc('unblock_profile', {
          target_user_id: targetUserId,
          p_viewer_id: currentUid,
        })
        if (!error && data) return NextResponse.json(data)
      } catch {}

      await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', currentUid)
        .eq('blocked_id', targetUserId)

      return NextResponse.json({ ok: true, blocked: false })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const viewerId = searchParams.get('viewerId')

  if (!viewerId) {
    return NextResponse.json({ error: 'viewerId is required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ blockedIds: [] })
  }

  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', viewerId)

    if (error || !Array.isArray(data)) {
      return NextResponse.json({ blockedIds: [] })
    }

    return NextResponse.json({ blockedIds: data.map((b) => b.blocked_id) })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
