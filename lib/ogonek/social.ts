/**
 * СОЦИАЛЬНЫЙ СЕРВИС: ДРУЗЬЯ, ПОДПИСКИ, БЛОКИРОВКИ, ЖАЛОБЫ И ПОИСК
 *
 * Предоставляет:
 * 1. Типы и интерфейсы дружбы и поиска.
 * 2. Клиентские и серверные методы управления дружбой (send, accept, decline, cancel, remove).
 * 3. Многовариантный серверный поиск (поддержка "ilon", "musk", "ILON MUSK", "@ilonmusk").
 * 4. Управление блокировками и жалобами.
 * 5. Realtime-подписку на изменения дружбы.
 */

import { getSupabase } from '../supabase/client.ts'
import type { ProfileRecord } from '../supabase/api.ts'
import {
  isProfileHiddenFromSearch,
  resolveAllowGroupInvitesFrom,
  resolveAllowMessagesFrom,
} from './privacy.ts'

export type FriendshipStatus =
  | 'none'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'accepted'

export interface SocialUser {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  avatarColor?: string | null
  bio?: string
  city?: string
  streak: number
  verified: boolean
  isFounder?: boolean
  difficultyLevel?: number
  friendshipStatus: FriendshipStatus
  isRequester?: boolean
  isFollowing?: boolean
  isHiddenFromSearch?: boolean
  allowMessagesFrom?: 'everyone' | 'friends' | 'nobody'
  allowGroupInvitesFrom?: 'friends' | 'nobody'
  lastSeenAt?: string | null
}

export interface FriendRequestItem {
  id: string
  userId: string
  profile: ProfileRecord
  createdAt: string
  direction: 'incoming' | 'outgoing'
}

export interface FriendFeedPost {
  id: string
  dayUuid?: string | null
  dayNumber?: number | null
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  avatarColor?: string | null
  verified: boolean
  streak: number
  lastSeenAt?: string | null
  dayDate: string
  title: string
  visibility: 'public' | 'friends' | 'group'
  groupId?: string | null
  groupName?: string | null
  photos?: string[]
  score?: number | null
  aiScore?: number | null
  aiVerdict?: string | null
  createdAt: string
  prides: Array<{
    id: string
    text: string
    scale?: number
    overcome?: number
    visibility?: 'public' | 'friends' | 'group' | 'private'
    groupId?: string | null
    category?: string
  }>
  gratitudes: Array<{
    id: string
    text: string
    rating?: number
    visibility?: 'public' | 'friends' | 'group' | 'private'
    groupId?: string | null
    category?: string
  }>
}

/**
 * Нормализация и разбиение поискового запроса для устойчивого поиска
 * («ilon», «musk», «ILON MUSK», «@ilonmusk»)
 */
export function normalizeSearchQuery(raw: string): {
  clean: string
  spaceless: string
  words: string[]
} {
  const clean = (raw || '').trim().replace(/^@+/, '').toLowerCase()
  const spaceless = clean.replace(/\s+/g, '')
  const words = clean.split(/\s+/).filter(Boolean)
  return { clean, spaceless, words }
}

/**
 * Проверка соответствия пользователя поисковому запросу на клиенте (fallback)
 */
export function matchesSearchQuery(
  user: { username?: string; displayName?: string; name?: string; city?: string },
  query: string
): boolean {
  if (!query || !query.trim()) return true
  const { clean, spaceless, words } = normalizeSearchQuery(query)
  if (!clean) return true

  const uName = (user.username || '').toLowerCase()
  const dName = (user.displayName || user.name || '').toLowerCase()
  const city = (user.city || '').toLowerCase()

  // 1. Прямое вхождение очищенной строки
  if (uName.includes(clean) || dName.includes(clean) || city.includes(clean)) {
    return true
  }

  // 2. Вхождение без пробелов (например запрос "ilon musk" к нику "ilonmusk")
  if (spaceless && (uName.includes(spaceless) || dName.replace(/\s+/g, '').includes(spaceless))) {
    return true
  }

  // 3. Все слова запроса присутствуют в нике или имени
  if (words.length > 1) {
    const allWordsMatch = words.every(
      (w) => uName.includes(w) || dName.includes(w) || city.includes(w)
    )
    if (allWordsMatch) return true
  }

  return false
}

/**
 * Серверный поиск пользователей через API / RPC
 */
export async function searchSocialUsers(
  query: string,
  options?: {
    limit?: number
    offset?: number
    viewerId?: string | null
  }
): Promise<{ users: SocialUser[]; total?: number; error?: string }> {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0
  const viewerId = options?.viewerId ?? null

  const supabase = getSupabase()
  if (supabase) {
    try {
      // Попытка вызвать RPC search_profiles_v2
      const { data, error } = await supabase.rpc('search_profiles_v2', {
        search_query: query,
        page_limit: limit,
        page_offset: offset,
        viewer_id: viewerId,
      })

      if (!error && Array.isArray(data)) {
        const ids = data.map((r: any) => r.id).filter(Boolean)
        const privacyById = new Map<string, any>()
        if (ids.length > 0) {
          try {
            const { data: privacyRows } = await supabase
              .from('profiles')
              .select('id, is_anonymous, who_can_find, who_can_message, privacy')
              .in('id', ids)
            for (const row of privacyRows || []) {
              privacyById.set(row.id, row)
            }
          } catch {}
        }

        const visibleRows = data.filter((r: any) => {
          const pRow = privacyById.get(r.id)
          if (pRow && isProfileHiddenFromSearch(pRow)) return false
          return !isProfileHiddenFromSearch(r)
        })

        const users: SocialUser[] = visibleRows.map((r: any) => {
          const pRow = privacyById.get(r.id) || r
          return {
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
            isHiddenFromSearch: isProfileHiddenFromSearch(pRow),
            allowMessagesFrom: resolveAllowMessagesFrom(pRow),
            allowGroupInvitesFrom: resolveAllowGroupInvitesFrom(pRow),
          }
        })
        return { users }
      }
    } catch {}
  }

  // Fallback через серверный API роут
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      offset: String(offset),
    })
    if (viewerId) params.set('viewerId', viewerId)

    const res = await fetch(`/api/friends/search?${params.toString()}`)
    if (res.ok) {
      const json = await res.json()
      if (json.users) {
        return { users: json.users }
      }
    }
  } catch {}

  return { users: [] }
}

/**
 * Отправить заявку в друзья
 */
export async function sendFriendRequestApi(
  targetUserId: string,
  viewerId?: string | null
): Promise<{ ok: boolean; status?: FriendshipStatus; error?: string }> {
  if (!targetUserId) return { ok: false, error: 'targetUserId is required' }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('request_friendship', {
        target_user_id: targetUserId,
        p_viewer_id: viewerId ?? undefined,
      })
      if (!error && data?.ok) {
        return { ok: true, status: (data.status as FriendshipStatus) || 'outgoing_pending' }
      }
    } catch {}
  }

  // Fallback через API route
  try {
    const res = await fetch('/api/friends/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', targetUserId, viewerId }),
    })
    const data = await res.json()
    return data
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Принять заявку в друзья
 */
export async function acceptFriendRequestApi(
  targetUserId: string,
  viewerId?: string | null
): Promise<{ ok: boolean; status?: FriendshipStatus; error?: string }> {
  if (!targetUserId) return { ok: false, error: 'targetUserId is required' }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('respond_friendship', {
        target_user_id: targetUserId,
        action_type: 'accept',
        p_viewer_id: viewerId ?? undefined,
      })
      if (!error && data?.ok) {
        return { ok: true, status: 'accepted' }
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/friends/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', targetUserId, viewerId }),
    })
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Отклонить входящую заявку в друзья
 */
export async function declineFriendRequestApi(
  targetUserId: string,
  viewerId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!targetUserId) return { ok: false, error: 'targetUserId is required' }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('respond_friendship', {
        target_user_id: targetUserId,
        action_type: 'decline',
        p_viewer_id: viewerId ?? undefined,
      })
      if (!error && data?.ok) return { ok: true }
    } catch {}
  }

  try {
    const res = await fetch('/api/friends/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline', targetUserId, viewerId }),
    })
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Отменить свою исходящую заявку в друзья
 */
export async function cancelFriendRequestApi(
  targetUserId: string,
  viewerId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!targetUserId) return { ok: false, error: 'targetUserId is required' }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('respond_friendship', {
        target_user_id: targetUserId,
        action_type: 'cancel',
        p_viewer_id: viewerId ?? undefined,
      })
      if (!error && data?.ok) return { ok: true }
    } catch {}
  }

  try {
    const res = await fetch('/api/friends/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', targetUserId, viewerId }),
    })
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Удалить пользователя из друзей
 */
export async function removeFriendApi(
  targetUserId: string,
  viewerId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!targetUserId) return { ok: false, error: 'targetUserId is required' }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('respond_friendship', {
        target_user_id: targetUserId,
        action_type: 'remove',
        p_viewer_id: viewerId ?? undefined,
      })
      if (!error && data?.ok) return { ok: true }
    } catch {}
  }

  try {
    const res = await fetch('/api/friends/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', targetUserId, viewerId }),
    })
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Заблокировать пользователя
 */
export async function blockUserApi(
  targetUserId: string,
  viewerId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!targetUserId) return { ok: false, error: 'targetUserId is required' }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('block_profile', {
        target_user_id: targetUserId,
        p_viewer_id: viewerId ?? undefined,
      })
      if (!error && data?.ok) return { ok: true }
    } catch {}
  }

  try {
    const res = await fetch('/api/friends/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'block', targetUserId, viewerId }),
    })
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Разблокировать пользователя
 */
export async function unblockUserApi(
  targetUserId: string,
  viewerId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!targetUserId) return { ok: false, error: 'targetUserId is required' }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('unblock_profile', {
        target_user_id: targetUserId,
        p_viewer_id: viewerId ?? undefined,
      })
      if (!error && data?.ok) return { ok: true }
    } catch {}
  }

  try {
    const res = await fetch('/api/friends/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unblock', targetUserId, viewerId }),
    })
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Отправить жалобу на пользователя
 */
export async function reportUserApi(
  targetUserId: string,
  reason: string,
  viewerId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!targetUserId) return { ok: false, error: 'targetUserId is required' }

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('report_profile', {
        target_user_id: targetUserId,
        p_reason: reason,
        p_viewer_id: viewerId ?? undefined,
      })
      if (!error && data?.ok) return { ok: true }
    } catch {}
  }

  try {
    const res = await fetch('/api/friends/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, reason, viewerId }),
    })
    return await res.json()
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Получить список принятых друзей пользователя
 */
export async function getFriendsListApi(
  userId: string
): Promise<SocialUser[]> {
  if (!userId) return []

  const supabase = getSupabase()
  if (supabase) {
    try {
      const [followingRes, followersRes] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', userId),
        supabase.from('follows').select('follower_id').eq('following_id', userId),
      ])

      if (!followingRes.error && !followersRes.error) {
        const followingSet = new Set(
          (followingRes.data || []).map((r: any) => r.following_id).filter(Boolean)
        )
        const mutualIds = Array.from(
          new Set(
            (followersRes.data || [])
              .map((r: any) => r.follower_id)
              .filter((id: string) => Boolean(id) && id !== userId && followingSet.has(id))
          )
        )

        if (mutualIds.length === 0) {
          return []
        }

        const { data: pRows } = await supabase
          .from('profiles')
          .select('*')
          .in('id', mutualIds)

        const pMap = new Map((pRows || []).map((p: any) => [p.id, p]))
        return mutualIds.map((otherId) => {
          const p = pMap.get(otherId)
          return {
            id: p?.id || otherId,
            username: p?.username || 'user',
            displayName: p?.display_name || `@${p?.username || 'user'}`,
            avatarUrl: p?.avatar_image || p?.avatar_url || null,
            avatarColor: p?.avatar_color || '#FF5C00',
            bio: p?.bio || '',
            city: p?.city || '',
            streak: Number(p?.streak_count ?? p?.streak ?? 0),
            verified: Boolean(p?.verified),
            difficultyLevel: Number(p?.level || 1),
            friendshipStatus: 'accepted' as FriendshipStatus,
            isFollowing: true,
            isHiddenFromSearch: p ? isProfileHiddenFromSearch(p) : false,
            allowMessagesFrom: p ? resolveAllowMessagesFrom(p) : 'everyone',
            allowGroupInvitesFrom: p ? resolveAllowGroupInvitesFrom(p) : 'friends',
            lastSeenAt: p?.last_seen_at || null,
          }
        })
      }
    } catch {}
  }

  try {
    const res = await fetch(`/api/friends/requests?userId=${encodeURIComponent(userId)}&type=friends`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.friends)) return data.friends
    }
  } catch {}

  return []
}

/**
 * Получить заявки в друзья (входящие и исходящие)
 */
export async function getFriendRequestsApi(
  userId: string
): Promise<{ incoming: SocialUser[]; outgoing: SocialUser[] }> {
  if (!userId) return { incoming: [], outgoing: [] }

  try {
    const res = await fetch(`/api/friends/requests?userId=${encodeURIComponent(userId)}&type=requests`)
    if (res.ok) {
      const data = await res.json()
      if (data.incoming || data.outgoing) {
        return {
          incoming: data.incoming || [],
          outgoing: data.outgoing || [],
        }
      }
    }
  } catch {}

  return { incoming: [], outgoing: [] }
}

/**
 * Загрузить посты ленты друзей или подписок с бэкенда Supabase
 */
export async function getFriendFeedPosts(
  options?: {
    limit?: number
    offset?: number
    viewerId?: string | null
    tab?: 'friends' | 'following'
    groupId?: string | null
  }
): Promise<FriendFeedPost[]> {
  const limit = options?.limit ?? 30
  const offset = options?.offset ?? 0
  const viewerId = options?.viewerId ?? null
  const tab = options?.tab ?? 'friends'
  const groupId = options?.groupId ?? null

  const supabase = getSupabase()
  let headers: Record<string, string> = {}
  if (supabase) {
    try {
      const { data: sData } = await supabase.auth.getSession()
      const token = sData?.session?.access_token
      if (token) headers = { Authorization: `Bearer ${token}` }
    } catch {}
  }

  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      tab,
    })
    if (viewerId) params.set('viewerId', viewerId)
    if (groupId) params.set('groupId', groupId)
    const res = await fetch(`/api/friends/feed?${params.toString()}`, { headers })
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.posts)) return json.posts
    }
  } catch {}

  if (supabase && tab === 'friends') {
    try {
      const { data, error } = await supabase.rpc('get_friend_feed_v1', {
        p_limit: limit,
        p_offset: offset,
        p_viewer_id: viewerId ?? undefined,
      })

      if (!error && Array.isArray(data)) {
        return data.map((r: any) => ({
          id: String(r.day_id || r.day_uuid),
          dayUuid: r.day_uuid || null,
          dayNumber: r.day_id ? Number(r.day_id) : null,
          userId: r.user_id,
          username: r.username,
          displayName: r.display_name || `@${r.username}`,
          avatarUrl: r.avatar_url,
          verified: Boolean(r.verified),
          streak: Number(r.streak || 0),
          dayDate: r.day_date,
          title: r.title || '',
          visibility: r.visibility || 'friends',
          groupId: r.group_id || null,
          groupName: r.group_name || null,
          photos: Array.isArray(r.photos) ? r.photos : [],
          createdAt: r.created_at,
          prides: Array.isArray(r.prides) ? r.prides : [],
          gratitudes: Array.isArray(r.gratitudes) ? r.gratitudes : [],
        }))
      }
    } catch {}
  }

  return []
}

export async function getFollowingFeedPosts(
  options?: { limit?: number; offset?: number; viewerId?: string | null }
): Promise<FriendFeedPost[]> {
  return getFriendFeedPosts({ ...options, tab: 'following' })
}

export async function getFeedUnreadSummary(options?: {
  viewerId?: string | null
  sinceFriendsAt?: string | null
  sinceFollowingAt?: string | null
}): Promise<{ friendsUnread: number; followingUnread: number }> {
  const supabase = getSupabase()
  let headers: Record<string, string> = {}
  if (supabase) {
    try {
      const { data: sData } = await supabase.auth.getSession()
      const token = sData?.session?.access_token
      if (token) headers = { Authorization: `Bearer ${token}` }
    } catch {}
  }

  try {
    const params = new URLSearchParams({ summary: '1' })
    if (options?.viewerId) params.set('viewerId', options.viewerId)
    if (options?.sinceFriendsAt) params.set('sinceFriendsAt', options.sinceFriendsAt)
    if (options?.sinceFollowingAt) params.set('sinceFollowingAt', options.sinceFollowingAt)
    const res = await fetch(`/api/friends/feed?${params.toString()}`, { headers })
    if (res.ok) {
      const json = await res.json()
      return {
        friendsUnread: Math.max(0, Number(json.friendsUnread || 0)),
        followingUnread: Math.max(0, Number(json.followingUnread || 0)),
      }
    }
  } catch {}

  return { friendsUnread: 0, followingUnread: 0 }
}

/**
 * Подписка на Realtime события таблицы friendships
 */
export function subscribeToFriendships(
  userId: string,
  onChange: () => void
): () => void {
  const supabase = getSupabase()
  if (!supabase || !userId) return () => {}

  const channelName = `friendships_${userId}_${Date.now()}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships' },
      (payload: any) => {
        const row = (payload.new || payload.old) as any
        if (!row) {
          onChange()
          return
        }
        if (row.user_id === userId || row.friend_id === userId) {
          onChange()
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
