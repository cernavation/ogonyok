import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { normalizeSearchQuery, type SocialUser, type FriendshipStatus } from '@/lib/ogonek/social'
import { FALLBACK_SEED_PROFILES } from '@/lib/supabase/api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get('q') || ''
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50)
  const offset = Math.max(Number(searchParams.get('offset') || 0), 0)
  const viewerId = searchParams.get('viewerId') || null

  const { clean, spaceless, words } = normalizeSearchQuery(rawQuery)
  const supabase = getServerSupabase()

  // 1. Попытка вызвать RPC search_profiles_v2
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('search_profiles_v2', {
        search_query: rawQuery,
        page_limit: limit,
        page_offset: offset,
        viewer_id: viewerId || undefined,
      })

      if (!error && Array.isArray(data)) {
        const users: SocialUser[] = data.map((r: any) => ({
          id: r.id,
          username: r.username,
          displayName: r.display_name || `@${r.username}`,
          avatarUrl: r.avatar_url,
          bio: r.bio || '',
          city: r.city || '',
          streak: Number(r.streak || 0),
          verified: Boolean(r.verified),
          isFounder: Boolean(r.is_founder),
          difficultyLevel: Number(r.difficulty_level || 1),
          friendshipStatus: (r.friendship_status as FriendshipStatus) || 'none',
          isRequester: Boolean(r.is_requester),
          isFollowing: Boolean(r.is_following),
        }))

        return NextResponse.json({ users, total: users.length })
      }
    } catch {}
  }

  // 2. Fallback SQL-запрос через profiles
  if (supabase) {
    try {
      let queryBuilder = supabase.from('profiles').select('*')

      if (viewerId) {
        queryBuilder = queryBuilder.neq('id', viewerId)
      }

      if (clean) {
        if (words.length > 1 && spaceless) {
          queryBuilder = queryBuilder.or(
            `username.ilike.%${clean}%,display_name.ilike.%${clean}%,username.ilike.%${spaceless}%,display_name.ilike.%${spaceless}%`
          )
        } else {
          queryBuilder = queryBuilder.or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
        }
      }

      const { data: profiles, error } = await queryBuilder
        .order('streak_count', { ascending: false })
        .range(offset, offset + limit - 1)

      if (!error && Array.isArray(profiles)) {
        // Подгружаем статусы дружбы, если передан viewerId
        const targetIds = profiles.map((p) => p.id)
        let friendshipsMap: Record<string, { status: string; isRequester: boolean }> = {}

        if (viewerId && targetIds.length > 0) {
          try {
            const { data: fRows } = await supabase
              .from('friendships')
              .select('id, user_id, friend_id, status')
              .or(`user_id.eq.${viewerId},friend_id.eq.${viewerId}`)

            if (Array.isArray(fRows)) {
              for (const f of fRows) {
                const otherId = f.user_id === viewerId ? f.friend_id : f.user_id
                friendshipsMap[otherId] = {
                  status: f.status,
                  isRequester: f.user_id === viewerId,
                }
              }
            }
          } catch {}
        }

        const users: SocialUser[] = profiles.map((p) => {
          const fInfo = friendshipsMap[p.id]
          let friendshipStatus: FriendshipStatus = 'none'
          if (fInfo) {
            const fStatus = String(fInfo.status || '').toLowerCase()
            if (fStatus === 'accepted' || fStatus === 'friend') {
              friendshipStatus = 'accepted'
            } else if (
              fStatus === 'pending' ||
              fStatus === 'outgoing-request' ||
              fStatus === 'incoming-request'
            ) {
              friendshipStatus = fInfo.isRequester ? 'outgoing_pending' : 'incoming_pending'
            }
          }

          return {
            id: p.id,
            username: p.username,
            displayName: p.display_name || `@${p.username}`,
            avatarUrl: p.avatar_url || p.avatar_image,
            bio: p.bio || '',
            city: p.city || '',
            streak: Number(p.streak_count ?? p.streak ?? 0),
            verified: Boolean(p.verified),
            isFounder: Boolean(p.is_founder),
            difficultyLevel: Number(p.level ?? p.difficulty_level ?? 1),
            friendshipStatus,
            isRequester: fInfo?.isRequester ?? false,
            isFollowing: false,
          }
        })

        return NextResponse.json({ users, total: users.length })
      }
    } catch {}
  }

  // 3. Fallback через FALLBACK_SEED_PROFILES (для оффлайн/тестовой среды)
  const matched = FALLBACK_SEED_PROFILES.filter((seed) => {
    if (viewerId && seed.id === viewerId) return false
    if (!clean) return true
    const uName = seed.username.toLowerCase()
    const dName = seed.display_name.toLowerCase()
    return (
      uName.includes(clean) ||
      dName.includes(clean) ||
      (spaceless && (uName.includes(spaceless) || dName.replace(/\s+/g, '').includes(spaceless))) ||
      (words.length > 1 && words.every((w) => uName.includes(w) || dName.includes(w)))
    )
  })

  const users: SocialUser[] = matched.slice(offset, offset + limit).map((s) => ({
    id: s.id,
    username: s.username,
    displayName: s.display_name,
    avatarUrl: s.avatar_url,
    bio: s.bio || '',
    city: s.city || '',
    streak: s.streak_count ?? 0,
    verified: Boolean(s.verified),
    isFounder: false,
    difficultyLevel: s.level ?? 1,
    friendshipStatus: 'none',
  }))

  return NextResponse.json({ users, total: users.length })
}
