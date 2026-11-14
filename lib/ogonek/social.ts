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
  bio?: string
  city?: string
  streak: number
  verified: boolean
  isFounder?: boolean
  difficultyLevel?: number
  friendshipStatus: FriendshipStatus
  isRequester?: boolean
  isFollowing?: boolean
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
  userId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  verified: boolean
  streak: number
  dayDate: string
  title: string
  visibility: 'public' | 'friends'
  createdAt: string
  prides: Array<{ id: string; text: string; scale?: number; category?: string }>
  gratitudes: Array<{ id: string; text: string; category?: string }>
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

  try {
    const res = await fetch(`/api/friends/requests?userId=${encodeURIComponent(userId)}&type=friends`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.friends)) return data.friends
    }
  } catch {}

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

      if (!error && Array.isArray(data) && data.length > 0) {
        const otherIds = data.map((row: any) => (row.user_id === userId ? row.friend_id : row.user_id))
        const { data: pRows } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, streak_count, verified, level')
          .in('id', otherIds)

        const pMap = new Map((pRows || []).map((p: any) => [p.id, p]))
        return data.map((row: any) => {
          const isUser = row.user_id === userId
          const otherId = isUser ? row.friend_id : row.user_id
          const p = pMap.get(otherId)
          return {
            id: p?.id || otherId,
            username: p?.username || 'user',
            displayName: p?.display_name || `@${p?.username || 'user'}`,
            avatarUrl: p?.avatar_url,
            streak: Number(p?.streak_count || 0),
            verified: Boolean(p?.verified),
            difficultyLevel: Number(p?.level || 1),
            friendshipStatus: 'accepted' as FriendshipStatus,
          }
        })
      }
    } catch {}
  }

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
 * Загрузить посты ленты друзей
 */
export async function getFriendFeedPosts(
  options?: { limit?: number; offset?: number; viewerId?: string | null }
): Promise<FriendFeedPost[]> {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0
  const viewerId = options?.viewerId ?? null

  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_friend_feed_v1', {
        p_limit: limit,
        p_offset: offset,
        p_viewer_id: viewerId ?? undefined,
      })

      if (!error && Array.isArray(data)) {
        return data.map((r: any) => ({
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
      }
    } catch {}
  }

  // Fallback к API роуту
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (viewerId) params.set('viewerId', viewerId)
    const res = await fetch(`/api/friends/feed?${params.toString()}`)
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.posts)) return json.posts
    }
  } catch {}

  return []
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
