import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import type { SocialUser, FriendshipStatus } from '@/lib/ogonek/social'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const type = searchParams.get('type') || 'all'

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ friends: [], incoming: [], outgoing: [] })
  }

  try {
    const { data: rows, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    if (error || !Array.isArray(rows)) {
      return NextResponse.json({ friends: [], incoming: [], outgoing: [] })
    }

    // Собираем идентификаторы собеседников для быстрого единого запроса профилей
    const otherUserIds = Array.from(
      new Set(
        rows
          .map((r: any) => (r.user_id === userId ? r.friend_id : r.user_id))
          .filter(Boolean)
      )
    )

    const profilesMap = new Map<string, any>()
    if (otherUserIds.length > 0) {
      const { data: pRows } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, streak_count, verified, level')
        .in('id', otherUserIds)

      if (Array.isArray(pRows)) {
        for (const p of pRows) {
          profilesMap.set(p.id, p)
        }
      }
    }

    const friends: SocialUser[] = []
    const incoming: SocialUser[] = []
    const outgoing: SocialUser[] = []

    for (const r of rows as any[]) {
      const isRequester = r.user_id === userId
      const otherId = isRequester ? r.friend_id : r.user_id
      const otherProfile = profilesMap.get(otherId)

      const userObj: SocialUser = {
        id: otherId,
        username: otherProfile?.username || 'user',
        displayName: otherProfile?.display_name || (otherProfile?.username ? `@${otherProfile.username}` : 'Пользователь'),
        avatarUrl: otherProfile?.avatar_url,
        streak: Number(otherProfile?.streak_count || 0),
        verified: Boolean(otherProfile?.verified),
        difficultyLevel: Number(otherProfile?.level || 1),
        friendshipStatus: (r.status as FriendshipStatus) || 'none',
        isRequester,
      }

      const statusStr = String(r.status || '').toLowerCase()
      const isAccepted = statusStr === 'accepted' || statusStr === 'friend'
      const isPending =
        statusStr === 'pending' ||
        statusStr === 'outgoing-request' ||
        statusStr === 'incoming-request'

      const amIRequester = r.requester_id ? r.requester_id === userId : isRequester

      if (isAccepted) {
        userObj.friendshipStatus = 'accepted'
        friends.push(userObj)
      } else if (isPending) {
        if (amIRequester) {
          userObj.friendshipStatus = 'outgoing_pending'
          outgoing.push(userObj)
        } else {
          userObj.friendshipStatus = 'incoming_pending'
          incoming.push(userObj)
        }
      }
    }

    if (type === 'friends') {
      return NextResponse.json({ friends, count: friends.length })
    }
    if (type === 'requests') {
      return NextResponse.json({
        incoming,
        outgoing,
        incomingCount: incoming.length,
        outgoingCount: outgoing.length,
      })
    }

    return NextResponse.json({
      friends,
      incoming,
      outgoing,
      friendsCount: friends.length,
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

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
    return NextResponse.json({ error: 'viewerId / authentication required' }, { status: 401 })
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 })
  }

  try {
    if (action === 'send') {
      // 1. Попытка RPC request_friendship
      try {
        const { data, error } = await supabase.rpc('request_friendship', {
          target_user_id: targetUserId,
          p_viewer_id: currentUid,
        })
        if (!error && data) return NextResponse.json(data)
      } catch {}

      // 2. Прямой запрос к таблице friendships
      // Проверяем существующую связь
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(user_id.eq.${currentUid},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUid})`
        )
        .maybeSingle()

      if (existing) {
        const exStatus = String(existing.status || '').toLowerCase()
        if (exStatus === 'accepted' || exStatus === 'friend') {
          return NextResponse.json({ ok: true, status: 'accepted' })
        }
        if (
          exStatus === 'pending' ||
          exStatus === 'outgoing-request' ||
          exStatus === 'incoming-request'
        ) {
          const wasIncoming = existing.requester_id
            ? existing.requester_id === targetUserId
            : existing.user_id === targetUserId

          if (wasIncoming) {
            // Встречная заявка -> автоматическое подтверждение!
            let updRes = await supabase
              .from('friendships')
              .update({ status: 'accepted', updated_at: new Date().toISOString() })
              .eq('id', existing.id)

            if (updRes.error) {
              await supabase
                .from('friendships')
                .update({ status: 'friend', updated_at: new Date().toISOString() })
                .eq('id', existing.id)
            }

            await supabase.from('follows').upsert([
              { follower_id: currentUid, following_id: targetUserId },
              { follower_id: targetUserId, following_id: currentUid },
            ])

            return NextResponse.json({ ok: true, status: 'accepted' })
          }
          return NextResponse.json({ ok: true, status: 'outgoing_pending' })
        }

        // Обновляем ранее отклоненную заявку
        let updRes = await supabase
          .from('friendships')
          .update({
            user_id: currentUid,
            friend_id: targetUserId,
            requester_id: currentUid,
            addressee_id: targetUserId,
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updRes.error) {
          await supabase
            .from('friendships')
            .update({
              user_id: currentUid,
              friend_id: targetUserId,
              requester_id: currentUid,
              addressee_id: targetUserId,
              status: 'outgoing-request',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
        }

        await supabase.from('follows').upsert({ follower_id: currentUid, following_id: targetUserId })
        return NextResponse.json({ ok: true, status: 'outgoing_pending' })
      }

      // Создаём новую заявку (пробуем 'pending', при ошибке ограничения 'outgoing-request')
      let insRes = await supabase.from('friendships').insert({
        user_id: currentUid,
        friend_id: targetUserId,
        requester_id: currentUid,
        addressee_id: targetUserId,
        status: 'pending',
      })

      if (insRes.error) {
        insRes = await supabase.from('friendships').insert({
          user_id: currentUid,
          friend_id: targetUserId,
          requester_id: currentUid,
          addressee_id: targetUserId,
          status: 'outgoing-request',
        })
      }

      if (insRes.error) {
        return NextResponse.json({ ok: false, error: insRes.error.message }, { status: 400 })
      }

      await supabase.from('follows').upsert({ follower_id: currentUid, following_id: targetUserId })
      return NextResponse.json({ ok: true, status: 'outgoing_pending' })
    }

    if (action === 'accept') {
      try {
        const { data, error } = await supabase.rpc('respond_friendship', {
          target_user_id: targetUserId,
          action_type: 'accept',
          p_viewer_id: currentUid,
        })
        if (!error && data) return NextResponse.json(data)
      } catch {}

      const { data: row } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(user_id.eq.${currentUid},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUid})`
        )
        .maybeSingle()

      if (!row) {
        return NextResponse.json({ ok: false, error: 'Friendship not found' }, { status: 404 })
      }

      let updRes = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', row.id)

      if (updRes.error) {
        updRes = await supabase
          .from('friendships')
          .update({ status: 'friend', updated_at: new Date().toISOString() })
          .eq('id', row.id)
      }

      await supabase.from('follows').upsert([
        { follower_id: currentUid, following_id: targetUserId },
        { follower_id: targetUserId, following_id: currentUid },
      ])

      return NextResponse.json({ ok: true, status: 'accepted' })
    }

    if (action === 'decline' || action === 'cancel' || action === 'remove') {
      try {
        const { data, error } = await supabase.rpc('respond_friendship', {
          target_user_id: targetUserId,
          action_type: action,
          p_viewer_id: currentUid,
        })
        if (!error && data) return NextResponse.json(data)
      } catch {}

      await supabase
        .from('friendships')
        .delete()
        .or(
          `and(user_id.eq.${currentUid},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUid})`
        )

      if (action === 'remove') {
        // При разрыве взаимной дружбы также удаляем обратную подписку
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUid)
          .eq('following_id', targetUserId)
      }

      return NextResponse.json({ ok: true, status: 'none' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 })
  }
}
