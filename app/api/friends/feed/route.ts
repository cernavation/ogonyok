import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import type { FriendFeedPost } from '@/lib/ogonek/social'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const authUser = await getAuthenticatedUser(request).catch(() => null)
  const queryViewer = searchParams.get('viewerId')
  const viewerId =
    authUser?.userId ||
    (queryViewer && UUID_REGEX.test(queryViewer) ? queryViewer : null)

  const tab = searchParams.get('tab') === 'following' ? 'following' : 'friends'
  const summaryOnly = searchParams.get('summary') === '1'
  const rawGroupId = searchParams.get('groupId')
  const requestedGroupUuid = rawGroupId
    ? rawGroupId.trim().replace(/^group:(group-)?/i, '').replace(/^group-/i, '').toLowerCase()
    : null
  const sinceFriendsAt = searchParams.get('sinceFriendsAt')
  const sinceFollowingAt = searchParams.get('sinceFollowingAt')
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 30), 1), 60)
  const offset = Math.max(Number(searchParams.get('offset') || 0), 0)

  if (!viewerId) {
    return NextResponse.json(
      summaryOnly ? { friendsUnread: 0, followingUnread: 0 } : { posts: [] }
    )
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json(
      summaryOnly ? { friendsUnread: 0, followingUnread: 0 } : { posts: [] }
    )
  }

  try {
    // 1. Социальный граф зрителя: подписки, подписчики, legacy-дружбы, блокировки и группы
    const [followingRes, followersRes, legacyFriendsRes, blockRes, memberGroupsRes, ownedGroupsRes] =
      await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', viewerId),
        supabase.from('follows').select('follower_id').eq('following_id', viewerId),
        supabase
          .from('friendships')
          .select('user_id, friend_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${viewerId},friend_id.eq.${viewerId}`),
        supabase
          .from('blocks')
          .select('blocker_id, blocked_id')
          .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`),
        supabase.from('chat_group_members').select('group_id').eq('user_id', viewerId),
        supabase.from('chat_groups').select('id, title, avatar_emoji').eq('creator_id', viewerId),
      ])

    const blockedSet = new Set<string>()
    for (const b of blockRes.data || []) {
      blockedSet.add(b.blocker_id === viewerId ? b.blocked_id : b.blocker_id)
    }

    const rawFollowingSet = new Set<string>(
      (followingRes.data || []).map((r: any) => String(r.following_id || '')).filter(Boolean)
    )
    const rawFollowersSet = new Set<string>(
      (followersRes.data || []).map((r: any) => String(r.follower_id || '')).filter(Boolean)
    )

    const mutualFriendSet = new Set<string>()
    for (const fid of rawFollowersSet) {
      if (fid !== viewerId && rawFollowingSet.has(fid) && !blockedSet.has(fid)) {
        mutualFriendSet.add(fid)
      }
    }
    for (const f of (legacyFriendsRes.data || []) as Array<{ user_id?: string | null; friend_id?: string | null }>) {
      const peerId: string = String(f.user_id === viewerId ? (f.friend_id || '') : (f.user_id || ''))
      if (peerId && peerId !== viewerId && !blockedSet.has(peerId)) {
        mutualFriendSet.add(peerId)
        rawFollowingSet.add(peerId)
      }
    }

    const activeFollowingIds = Array.from(rawFollowingSet).filter(
      (id) => id && id !== viewerId && !blockedSet.has(id)
    )
    const activeFriendIds = Array.from(mutualFriendSet)

    const viewerGroupIdsSet = new Set<string>()
    const groupMetaMap = new Map<string, { title: string; emoji?: string }>()
    for (const m of memberGroupsRes.data || []) {
      if (m.group_id) viewerGroupIdsSet.add(String(m.group_id).toLowerCase())
    }
    for (const g of ownedGroupsRes.data || []) {
      if (g.id) {
        const gid = String(g.id).toLowerCase()
        viewerGroupIdsSet.add(gid)
        groupMetaMap.set(gid, { title: g.title || 'Группа', emoji: g.avatar_emoji || '👥' })
      }
    }

    // Если состояли в группах, созданных друзьями — подтягиваем их названия
    const extraGroupIds = Array.from(viewerGroupIdsSet).filter((id) => !groupMetaMap.has(id))
    if (extraGroupIds.length > 0) {
      const { data: extraGroups } = await supabase
        .from('chat_groups')
        .select('id, title, avatar_emoji')
        .in('id', extraGroupIds)
      for (const g of extraGroups || []) {
        groupMetaMap.set(String(g.id).toLowerCase(), {
          title: g.title || 'Группа',
          emoji: g.avatar_emoji || '👥',
        })
      }
    }

    // 2. Режим краткой сводки непрочитанных постов на вкладках «Друзья» и «Подписки»
    if (summaryOnly) {
      const checkDayGroupVisible = (d: any): boolean => {
        if (d.visibility === 'public' || d.visibility === 'friends') return true
        if (d.visibility === 'group') {
          const single = d.group_id ? String(d.group_id).toLowerCase() : null
          if (single && viewerGroupIdsSet.has(single)) return true
          if (Array.isArray(d.target_group_ids)) {
            return d.target_group_ids.some((tid: string) =>
              viewerGroupIdsSet.has(String(tid).toLowerCase())
            )
          }
        }
        return false
      }

      const [viewerProfRes, friendsRecentRes, followingRecentRes] = await Promise.all([
        !sinceFriendsAt || !sinceFollowingAt
          ? supabase
              .from('profiles')
              .select('last_viewed_friends_feed_at, last_viewed_following_feed_at')
              .eq('id', viewerId)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
        activeFriendIds.length > 0
          ? supabase
              .from('days')
              .select('id, visibility, group_id, target_group_ids, created_at')
              .in('user_id', activeFriendIds)
              .in('visibility', ['public', 'friends', 'group'])
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] as any[] }),
        activeFollowingIds.length > 0
          ? supabase
              .from('days')
              .select('id, visibility, created_at')
              .in('user_id', activeFollowingIds)
              .eq('visibility', 'public')
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const effectiveFriendsIso =
        sinceFriendsAt || viewerProfRes.data?.last_viewed_friends_feed_at || null
      const effectiveFollowingIso =
        sinceFollowingAt || viewerProfRes.data?.last_viewed_following_feed_at || null

      const sinceFriendsMs = effectiveFriendsIso ? new Date(effectiveFriendsIso).getTime() : 0
      const sinceFollowingMs = effectiveFollowingIso ? new Date(effectiveFollowingIso).getTime() : 0

      const friendsUnread = (friendsRecentRes.data || []).filter((d: any) => {
        if (!checkDayGroupVisible(d)) return false
        if (!sinceFriendsMs || !Number.isFinite(sinceFriendsMs)) return true
        const createdMs = new Date(d.created_at).getTime()
        return Number.isFinite(createdMs) && createdMs > sinceFriendsMs
      }).length

      const followingUnread = (followingRecentRes.data || []).filter((d: any) => {
        if (!sinceFollowingMs || !Number.isFinite(sinceFollowingMs)) return true
        const createdMs = new Date(d.created_at).getTime()
        return Number.isFinite(createdMs) && createdMs > sinceFollowingMs
      }).length

      return NextResponse.json({ friendsUnread, followingUnread })
    }

    // 3. Полная хронологическая лента «Друзья» или «Подписки» (для группы включаем также свои посты в эту группу)
    const includeSelfInGroup =
      tab === 'friends' && Boolean(requestedGroupUuid && viewerGroupIdsSet.has(requestedGroupUuid))
    const targetAuthorIds =
      tab === 'friends'
        ? Array.from(new Set(includeSelfInGroup ? [viewerId, ...activeFriendIds] : activeFriendIds))
        : activeFollowingIds
    if (targetAuthorIds.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    const allowedVisibilities =
      tab === 'friends' ? ['public', 'friends', 'group'] : ['public']

    const fetchWindow = tab === 'friends' ? Math.min(limit * 3, 120) : limit
    const { data: rawDays, error: daysErr } = await supabase
      .from('days')
      .select(
        'id, client_id, day_number, user_id, date_iso, day_date, title, tags, photos, status, visibility, group_id, target_group_ids, ai_score, ai_verdict, created_at'
      )
      .in('user_id', targetAuthorIds)
      .in('visibility', allowedVisibilities)
      .order('created_at', { ascending: false })
      .order('day_number', { ascending: false })
      .range(offset, offset + fetchWindow - 1)

    if (daysErr || !Array.isArray(rawDays) || rawDays.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    const visibleDays = rawDays
      .filter((d: any) => {
        if (d.visibility === 'private') return false
        if (tab === 'following') return d.visibility === 'public'
        if (requestedGroupUuid && viewerGroupIdsSet.has(requestedGroupUuid)) {
          if (d.visibility !== 'group') return false
          const single = d.group_id ? String(d.group_id).toLowerCase() : null
          if (single === requestedGroupUuid) return true
          if (Array.isArray(d.target_group_ids)) {
            return d.target_group_ids.some((tid: string) => String(tid).toLowerCase() === requestedGroupUuid)
          }
          return false
        }
        if (d.visibility === 'group') {
          const single = d.group_id ? String(d.group_id).toLowerCase() : null
          if (single && viewerGroupIdsSet.has(single)) return true
          if (Array.isArray(d.target_group_ids)) {
            return d.target_group_ids.some((tid: string) =>
              viewerGroupIdsSet.has(String(tid).toLowerCase())
            )
          }
          return false
        }
        return d.visibility === 'public' || d.visibility === 'friends'
      })
      .slice(0, limit)

    if (visibleDays.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    const dayAuthorIds = Array.from(new Set(visibleDays.map((d: any) => String(d.user_id))))
    const dayClientIds = Array.from(
      new Set(visibleDays.map((d: any) => String(d.client_id || d.day_number || '')))
    ).filter(Boolean)

    const [profilesRes, pridesRes, gratitudesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, avatar_image, avatar_color, streak_count, streak, verified, last_seen_at')
        .in('id', dayAuthorIds),
      supabase
        .from('prides')
        .select('id, user_id, day_id, day_client_id, position, num, text, scale, overcome, visibility, group_id')
        .in('user_id', dayAuthorIds)
        .in('day_client_id', dayClientIds)
        .neq('visibility', 'private')
        .order('position', { ascending: true }),
      supabase
        .from('gratitudes')
        .select('id, user_id, day_id, day_client_id, position, num, text, rating, visibility, group_id')
        .in('user_id', dayAuthorIds)
        .in('day_client_id', dayClientIds)
        .neq('visibility', 'private')
        .order('position', { ascending: true }),
    ])

    const profileMap = new Map<string, any>()
    for (const p of profilesRes.data || []) {
      profileMap.set(String(p.id), p)
    }

    const pridesMap = new Map<string, any[]>()
    for (const p of pridesRes.data || []) {
      const key = `${p.user_id}:${p.day_client_id || p.day_id}`
      const arr = pridesMap.get(key) ?? []
      arr.push(p)
      pridesMap.set(key, arr)
    }

    const gratMap = new Map<string, any[]>()
    for (const g of gratitudesRes.data || []) {
      const key = `${g.user_id}:${g.day_client_id || g.day_id}`
      const arr = gratMap.get(key) ?? []
      arr.push(g)
      gratMap.set(key, arr)
    }

    // Дополнительная загрузка названий групп, если какие-то group_id ещё не в groupMetaMap
    const missingGids = Array.from(
      new Set(
        visibleDays
          .map((d: any) => (d.group_id ? String(d.group_id).toLowerCase() : null))
          .filter((gid): gid is string => Boolean(gid && !groupMetaMap.has(gid)))
      )
    )
    if (missingGids.length > 0) {
      const { data: gRows } = await supabase
        .from('chat_groups')
        .select('id, title, avatar_emoji')
        .in('id', missingGids)
      for (const g of gRows || []) {
        groupMetaMap.set(String(g.id).toLowerCase(), {
          title: g.title || 'Группа',
          emoji: g.avatar_emoji || '👥',
        })
      }
    }

    const posts: FriendFeedPost[] = visibleDays.map((d: any) => {
      const prof = profileMap.get(String(d.user_id)) || {}
      const clientKey = `${d.user_id}:${d.client_id || d.day_number}`
      const dayPrides = (pridesMap.get(clientKey) ?? [])
        .filter((p: any) => {
          const itemVis = p.visibility || d.visibility || 'public'
          if (itemVis === 'private') return false
          if (tab === 'following' && itemVis !== 'public') return false
          if (itemVis === 'group') {
            const pgid = String(p.group_id || d.group_id || '').toLowerCase()
            return Boolean(pgid && viewerGroupIdsSet.has(pgid))
          }
          return true
        })
        .map((p: any) => ({
          id: String(p.id),
          text: p.text || '',
          scale: typeof p.scale === 'number' ? p.scale : undefined,
          overcome: typeof p.overcome === 'number' ? p.overcome : undefined,
          visibility: p.visibility || d.visibility,
          groupId: p.group_id || d.group_id || null,
        }))

      const dayGrats = (gratMap.get(clientKey) ?? [])
        .filter((g: any) => {
          const itemVis = g.visibility || d.visibility || 'public'
          if (itemVis === 'private') return false
          if (tab === 'following' && itemVis !== 'public') return false
          if (itemVis === 'group') {
            const ggid = String(g.group_id || d.group_id || '').toLowerCase()
            return Boolean(ggid && viewerGroupIdsSet.has(ggid))
          }
          return true
        })
        .map((g: any) => ({
          id: String(g.id),
          text: g.text || '',
          rating: typeof g.rating === 'number' ? g.rating : undefined,
          visibility: g.visibility || d.visibility,
          groupId: g.group_id || d.group_id || null,
        }))

      const groupKey = d.group_id ? String(d.group_id).toLowerCase() : null
      const gMeta = groupKey ? groupMetaMap.get(groupKey) : undefined
      const fallbackFirstPride = dayPrides[0]?.text

      return {
        id: String(d.day_number || d.client_id || d.id),
        dayUuid: String(d.id),
        dayNumber: Number(d.day_number || d.client_id) || 1,
        userId: String(d.user_id),
        username: prof.username || 'user',
        displayName: prof.display_name || `@${prof.username || 'user'}`,
        avatarUrl: prof.avatar_image || prof.avatar_url || null,
        avatarColor: prof.avatar_color || '#FF5C00',
        verified: Boolean(prof.verified),
        streak: Number(prof.streak_count ?? prof.streak ?? 0),
        lastSeenAt: prof.last_seen_at || null,
        dayDate: d.date_iso || d.day_date || d.created_at,
        title: (d.visibility === 'public' || dayPrides.length > 0)
          ? (fallbackFirstPride || d.title || `День #${d.day_number || 1}`)
          : `День #${d.day_number || 1}`,
        visibility: d.visibility,
        groupId: d.group_id || null,
        groupName: gMeta?.title || null,
        score: typeof d.ai_score === 'number' ? d.ai_score : undefined,
        aiScore: typeof d.ai_score === 'number' ? d.ai_score : undefined,
        aiVerdict: d.ai_verdict || undefined,
        photos: Array.isArray(d.photos) ? d.photos : [],
        createdAt: d.created_at,
        prides: dayPrides,
        gratitudes: dayGrats,
      }
    })

    return NextResponse.json({ posts })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error', posts: [] }, { status: 500 })
  }
}
