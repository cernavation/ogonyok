import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { getServerSupabase } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request).catch(() => null)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: true, notified: 0 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const dayId = Number(body.dayId || 0)
    const visibility = String(body.visibility || 'public')
    const groupId = typeof body.groupId === 'string' && UUID_REGEX.test(body.groupId) ? body.groupId : null
    const groupName = typeof body.groupName === 'string' ? body.groupName : null

    if (!dayId || visibility === 'private') {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    const uid = user.userId
    const [authorRes, followingRes, followersRes, legacyFriendsRes, blockRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, avatar_image, avatar_color, verified')
        .eq('id', uid)
        .maybeSingle(),
      supabase.from('follows').select('following_id').eq('follower_id', uid),
      supabase.from('follows').select('follower_id').eq('following_id', uid),
      supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${uid},friend_id.eq.${uid}`),
      supabase
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
    ])

    const blockedSet = new Set<string>()
    for (const b of blockRes.data || []) {
      blockedSet.add(b.blocker_id === uid ? b.blocked_id : b.blocker_id)
    }

    const followingSet = new Set(
      (followingRes.data || []).map((r: any) => String(r.following_id || '')).filter(Boolean)
    )
    const mutualFriends = new Set<string>()
    for (const r of followersRes.data || []) {
      const peerId = String(r.follower_id || '')
      if (peerId && peerId !== uid && followingSet.has(peerId) && !blockedSet.has(peerId)) {
        mutualFriends.add(peerId)
      }
    }
    for (const f of legacyFriendsRes.data || []) {
      const peerId = f.user_id === uid ? f.friend_id : f.user_id
      if (peerId && peerId !== uid && !blockedSet.has(peerId)) {
        mutualFriends.add(peerId)
      }
    }

    let recipients = Array.from(mutualFriends)
    if (visibility === 'group') {
      if (!groupId) return NextResponse.json({ ok: true, notified: 0 })
      const { data: members } = await supabase
        .from('chat_group_members')
        .select('user_id')
        .eq('group_id', groupId)
      const memberSet = new Set((members || []).map((m: any) => String(m.user_id)))
      recipients = recipients.filter((id) => memberSet.has(id))
    }

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    // Исключаем дубликаты уведомлений за тот же день этого автора
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('user_id, data')
      .eq('type', 'friend_day')
      .in('user_id', recipients)
      .order('created_at', { ascending: false })
      .limit(200)

    const alreadyNotified = new Set<string>()
    for (const n of existingNotifs || []) {
      if (
        n.data &&
        String(n.data.actorId || '') === uid &&
        Number(n.data.dayId || 0) === dayId
      ) {
        alreadyNotified.add(String(n.user_id))
      }
    }

    const toNotify = recipients.filter((id) => !alreadyNotified.has(id))
    if (toNotify.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    const prof = authorRes.data
    const actorName = prof?.display_name || (prof?.username ? `@${prof.username}` : 'Друг')
    const actorAvatar = prof?.avatar_image || prof?.avatar_url || null
    const bodyText = `${actorName} записал(а) гордости за День #${dayId}`

    const rows = toNotify.map((recipientId) => ({
      user_id: recipientId,
      type: 'friend_day',
      title: actorName,
      body: bodyText,
      data: {
        actorId: uid,
        actorName,
        actorUsername: prof?.username || null,
        actorAvatar,
        actorVerified: Boolean(prof?.verified),
        dayId,
        dayNumber: dayId,
        visibility,
        groupId,
        groupName,
        tab: 'friends',
      },
      is_read: false,
    }))

    const { error: insErr } = await supabase.from('notifications').insert(rows)
    if (insErr) {
      return NextResponse.json({ ok: false, notified: 0, error: insErr.message })
    }

    return NextResponse.json({ ok: true, notified: toNotify.length })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Error' }, { status: 500 })
  }
}
