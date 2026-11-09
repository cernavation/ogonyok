/**
 * ЕДИНЫЙ КЛИЕНТСКИЙ И СЕРВЕРНЫЙ МОДУЛЬ СИСТЕМЫ СОРАТНИКОВ (ЭТАП 6)
 * 
 * Предоставляет полный набор функций для работы с социальным графом:
 * - Поиск соратников по всей базе с ранжированием и пагинацией
 * - Отправка, принятие, отклонение и отмена заявок в соратники
 * - Удаление из соратников
 * - Блокировка и разблокировка пользователей
 * - Жалобы на контент и профили
 * - Подписка и отписка
 * - Получение ленты с сервера с изоляцией по RLS
 */

import { getSupabase } from '../supabase/browser.ts'
import { getServerSupabase } from '../supabase/server.ts'
import type { SubscriptionTier } from './permissions.ts'

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export interface ComradeProfile {
  id: string
  username: string
  display_name: string
  avatar_image?: string | null
  city?: string
  bio?: string
  streak: number
  level: number
  subscription_tier: SubscriptionTier
  is_founder: boolean
  friendship_status: FriendshipStatus
  friendship_id?: string | null
  is_following: boolean
  is_blocked: boolean
}

export interface SocialCounts {
  friends: number
  incomingRequests: number
  outgoingRequests: number
  following: number
  followers: number
}

export interface FeedItemAuthor {
  id: string
  username: string
  display_name: string
  avatar_image?: string | null
  streak: number
  level: number
  subscription_tier: SubscriptionTier
  is_founder: boolean
}

export interface FeedPrideItem {
  id: string
  text: string
  num: number
  scale?: number
  score?: number
  overcome?: number
  tags?: string[]
  comment?: string
}

export interface FeedGratitudeItem {
  id: string
  text: string
  num: number
}

export interface FeedItem {
  id: string
  day_number: number
  day_date: string
  closed_at?: string | null
  score?: number | null
  visibility: 'public' | 'friends' | 'private'
  created_at: string
  author: FeedItemAuthor
  prides: FeedPrideItem[]
  gratitudes: FeedGratitudeItem[]
}

// In-memory оптимизация для быстрого доступа к профилям без сброса при переходах
const memoryProfileCache = new Map<string, ComradeProfile>()

export function cacheProfile(profile: ComradeProfile) {
  if (profile?.id) {
    memoryProfileCache.set(profile.id, profile)
    if (profile.username) {
      memoryProfileCache.set(profile.username.toLowerCase(), profile)
    }
  }
}

export function getCachedProfile(idOrUsername: string): ComradeProfile | undefined {
  if (!idOrUsername) return undefined
  return memoryProfileCache.get(idOrUsername) || memoryProfileCache.get(idOrUsername.toLowerCase())
}

/**
 * Серверный поиск соратников по всей базе пользователей
 */
export async function searchProfiles(params: {
  query: string
  limit?: number
  cursor?: number
}): Promise<{ ok: boolean; profiles: ComradeProfile[]; error?: string }> {
  const { query, limit = 20, cursor = 0 } = params
  const supabase = getSupabase()

  if (!supabase) {
    return { ok: false, profiles: [], error: 'База данных не подключена' }
  }

  try {
    const { data, error } = await supabase.rpc('search_profiles', {
      p_query: query || '',
      p_limit: limit,
      p_cursor: cursor,
    })

    if (error) {
      console.error('[searchProfiles] RPC error:', error)
      return { ok: false, profiles: [], error: error.message }
    }

    const list: ComradeProfile[] = Array.isArray(data) ? (data as ComradeProfile[]) : []
    list.forEach(cacheProfile)

    return { ok: true, profiles: list }
  } catch (err: any) {
    console.error('[searchProfiles] Exception:', err)
    return { ok: false, profiles: [], error: err?.message || 'Ошибка поиска соратников' }
  }
}

/**
 * Отправка заявки в соратники
 */
export async function sendFriendRequest(
  targetUserId: string
): Promise<{ ok: boolean; status?: FriendshipStatus; id?: string; message?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const { data, error } = await supabase.rpc('send_friend_request', {
      p_target_id: targetUserId,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    const res = data as any
    if (res?.ok) {
      // Обновляем статус в кэше
      const cached = memoryProfileCache.get(targetUserId)
      if (cached) {
        cached.friendship_status = res.status || 'pending_sent'
        if (res.id) cached.friendship_id = res.id
      }
      return { ok: true, status: res.status, id: res.id, message: res.message }
    }

    return { ok: false, error: res?.message || res?.error || 'Не удалось отправить заявку' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка отправки заявки' }
  }
}

/**
 * Ответ на входящую заявку в соратники (принять или отклонить)
 */
export async function respondFriendRequest(
  requestId: string,
  accept: boolean
): Promise<{ ok: boolean; status?: FriendshipStatus; message?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const { data, error } = await supabase.rpc('respond_friend_request', {
      p_request_id: requestId,
      p_accept: accept,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    const res = data as any
    if (res?.ok) {
      return { ok: true, status: res.status, message: res.message }
    }

    return { ok: false, error: res?.message || res?.error || 'Не удалось обработать заявку' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка обработки заявки' }
  }
}

/**
 * Отмена исходящей заявки в соратники
 */
export async function cancelFriendRequest(
  targetUserId: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const { data, error } = await supabase.rpc('cancel_friend_request', {
      p_target_id: targetUserId,
    })

    if (error) return { ok: false, error: error.message }
    const res = data as any
    if (res?.ok) {
      const cached = memoryProfileCache.get(targetUserId)
      if (cached) {
        cached.friendship_status = 'none'
        cached.friendship_id = null
      }
      return { ok: true, message: res.message }
    }
    return { ok: false, error: res?.message || 'Не удалось отменить заявку' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка отмены заявки' }
  }
}

/**
 * Удаление пользователя из соратников
 */
export async function removeFriend(
  targetUserId: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const { data, error } = await supabase.rpc('remove_friend', {
      p_target_id: targetUserId,
    })

    if (error) return { ok: false, error: error.message }
    const res = data as any
    if (res?.ok) {
      const cached = memoryProfileCache.get(targetUserId)
      if (cached) {
        cached.friendship_status = 'none'
        cached.friendship_id = null
      }
      return { ok: true, message: res.message }
    }
    return { ok: false, error: res?.message || 'Не удалось удалить соратника' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка удаления соратника' }
  }
}

/**
 * Блокировка пользователя
 */
export async function blockUser(
  targetUserId: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const { data, error } = await supabase.rpc('block_user', {
      p_target_id: targetUserId,
    })

    if (error) return { ok: false, error: error.message }
    const res = data as any
    if (res?.ok) {
      const cached = memoryProfileCache.get(targetUserId)
      if (cached) {
        cached.is_blocked = true
        cached.friendship_status = 'none'
        cached.is_following = false
      }
      return { ok: true, message: res.message }
    }
    return { ok: false, error: res?.message || 'Не удалось заблокировать пользователя' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка блокировки пользователя' }
  }
}

/**
 * Разблокировка пользователя
 */
export async function unblockUser(
  targetUserId: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const { data, error } = await supabase.rpc('unblock_user', {
      p_target_id: targetUserId,
    })

    if (error) return { ok: false, error: error.message }
    const res = data as any
    if (res?.ok) {
      const cached = memoryProfileCache.get(targetUserId)
      if (cached) {
        cached.is_blocked = false
      }
      return { ok: true, message: res.message }
    }
    return { ok: false, error: res?.message || 'Не удалось разблокировать пользователя' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка разблокировки' }
  }
}

/**
 * Отправка жалобы
 */
export async function reportTarget(params: {
  targetType: 'user' | 'message' | 'day' | 'story' | 'comment'
  targetId: string
  reason: string
  details?: string
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const { data, error } = await supabase.rpc('report_target', {
      p_target_type: params.targetType,
      p_target_id: params.targetId,
      p_reason: params.reason,
      p_details: params.details || null,
    })

    if (error) return { ok: false, error: error.message }
    const res = data as any
    return { ok: Boolean(res?.ok), message: res?.message || 'Жалоба зарегистрирована' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка отправки жалобы' }
  }
}

/**
 * Переключение подписки (Follow / Unfollow)
 */
export async function toggleFollowUser(
  targetUserId: string
): Promise<{ ok: boolean; following?: boolean; message?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const { data, error } = await supabase.rpc('toggle_follow', {
      p_target_id: targetUserId,
    })

    if (error) return { ok: false, error: error.message }
    const res = data as any
    if (res?.ok) {
      const cached = memoryProfileCache.get(targetUserId)
      if (cached) {
        cached.is_following = Boolean(res.following)
      }
      return { ok: true, following: res.following, message: res.message }
    }
    return { ok: false, error: res?.message || 'Не удалось изменить статус подписки' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка подписки' }
  }
}

/**
 * Загрузка счетчиков соратников и заявок для бейджей навигации
 */
export async function getSocialCounts(userId?: string): Promise<SocialCounts> {
  const empty: SocialCounts = {
    friends: 0,
    incomingRequests: 0,
    outgoingRequests: 0,
    following: 0,
    followers: 0,
  }

  const supabase = getSupabase()
  if (!supabase) return empty

  try {
    const { data, error } = await supabase.rpc('get_social_counts', {
      p_user_id: userId || null,
    })

    if (!error && data && typeof data === 'object') {
      const d = data as any
      return {
        friends: Number(d.friends || 0),
        incomingRequests: Number(d.incomingRequests || 0),
        outgoingRequests: Number(d.outgoingRequests || 0),
        following: Number(d.following || 0),
        followers: Number(d.followers || 0),
      }
    }
  } catch (err) {
    console.warn('[getSocialCounts] error:', err)
  }

  return empty
}

/**
 * Загрузка ленты с сервера с фильтрацией по scope и изоляцией RLS
 */
export async function getFeed(params: {
  scope: 'all' | 'friends' | 'following'
  limit?: number
  cursor?: string | null
}): Promise<{ ok: boolean; items: FeedItem[]; error?: string }> {
  const { scope, limit = 20, cursor = null } = params
  const supabase = getSupabase()

  if (!supabase) {
    return { ok: false, items: [], error: 'База данных не подключена' }
  }

  try {
    const { data, error } = await supabase.rpc('get_feed', {
      p_scope: scope,
      p_limit: limit,
      p_cursor: cursor,
    })

    if (error) {
      console.error('[getFeed] RPC error:', error)
      return { ok: false, items: [], error: error.message }
    }

    const items: FeedItem[] = Array.isArray(data) ? (data as FeedItem[]) : []
    return { ok: true, items }
  } catch (err: any) {
    console.error('[getFeed] Exception:', err)
    return { ok: false, items: [], error: err?.message || 'Ошибка загрузки ленты' }
  }
}

/**
 * Загрузка списка взаимных соратников
 */
export async function listComrades(): Promise<{ ok: boolean; comrades: ComradeProfile[]; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, comrades: [], error: 'База данных не подключена' }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, comrades: [], error: 'Не авторизован' }

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        responded_at,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_image, avatar_url, city, bio, streak, streak_count, level, difficulty_level, subscription_tier, is_founder),
        addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_image, avatar_url, city, bio, streak, streak_count, level, difficulty_level, subscription_tier, is_founder)
      `)
      .eq('status', 'accepted')

    if (error) {
      // Фолбэк на search_profiles
      const fallback = await searchProfiles({ query: '', limit: 50 })
      const friendsOnly = fallback.profiles.filter((p) => p.friendship_status === 'accepted')
      return { ok: true, comrades: friendsOnly }
    }

    const comrades: ComradeProfile[] = []
    if (Array.isArray(data)) {
      for (const row of data as any[]) {
        const other = row.requester_id === user.id ? row.addressee : row.requester
        if (other && other.id) {
          const profile: ComradeProfile = {
            id: other.id,
            username: other.username,
            display_name: other.display_name || other.username,
            avatar_image: other.avatar_image || other.avatar_url,
            city: other.city || '',
            bio: other.bio || '',
            streak: other.streak ?? other.streak_count ?? 0,
            level: other.level ?? other.difficulty_level ?? 1,
            subscription_tier: other.subscription_tier || 'free',
            is_founder: Boolean(other.is_founder),
            friendship_status: 'accepted',
            friendship_id: row.id,
            is_following: true,
            is_blocked: false,
          }
          cacheProfile(profile)
          comrades.push(profile)
        }
      }
    }

    return { ok: true, comrades }
  } catch (err: any) {
    return { ok: false, comrades: [], error: err?.message || 'Ошибка загрузки соратников' }
  }
}

/**
 * Загрузка списка входящих и исходящих заявок
 */
export async function listFriendRequests(): Promise<{
  ok: boolean
  incoming: ComradeProfile[]
  outgoing: ComradeProfile[]
  error?: string
}> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, incoming: [], outgoing: [], error: 'База данных не подключена' }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, incoming: [], outgoing: [], error: 'Не авторизован' }

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_image, avatar_url, city, bio, streak, streak_count, level, difficulty_level, subscription_tier, is_founder),
        addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_image, avatar_url, city, bio, streak, streak_count, level, difficulty_level, subscription_tier, is_founder)
      `)
      .eq('status', 'pending')

    if (error) {
      // Фолбэк на search_profiles
      const fallback = await searchProfiles({ query: '', limit: 50 })
      const inc = fallback.profiles.filter((p) => p.friendship_status === 'pending_received')
      const out = fallback.profiles.filter((p) => p.friendship_status === 'pending_sent')
      return { ok: true, incoming: inc, outgoing: out }
    }

    const incoming: ComradeProfile[] = []
    const outgoing: ComradeProfile[] = []

    if (Array.isArray(data)) {
      for (const row of data as any[]) {
        if (row.addressee_id === user.id && row.requester) {
          const p: ComradeProfile = {
            id: row.requester.id,
            username: row.requester.username,
            display_name: row.requester.display_name || row.requester.username,
            avatar_image: row.requester.avatar_image || row.requester.avatar_url,
            city: row.requester.city || '',
            bio: row.requester.bio || '',
            streak: row.requester.streak ?? row.requester.streak_count ?? 0,
            level: row.requester.level ?? row.requester.difficulty_level ?? 1,
            subscription_tier: row.requester.subscription_tier || 'free',
            is_founder: Boolean(row.requester.is_founder),
            friendship_status: 'pending_received',
            friendship_id: row.id,
            is_following: false,
            is_blocked: false,
          }
          cacheProfile(p)
          incoming.push(p)
        } else if (row.requester_id === user.id && row.addressee) {
          const p: ComradeProfile = {
            id: row.addressee.id,
            username: row.addressee.username,
            display_name: row.addressee.display_name || row.addressee.username,
            avatar_image: row.addressee.avatar_image || row.addressee.avatar_url,
            city: row.addressee.city || '',
            bio: row.addressee.bio || '',
            streak: row.addressee.streak ?? row.addressee.streak_count ?? 0,
            level: row.addressee.level ?? row.addressee.difficulty_level ?? 1,
            subscription_tier: row.addressee.subscription_tier || 'free',
            is_founder: Boolean(row.addressee.is_founder),
            friendship_status: 'pending_sent',
            friendship_id: row.id,
            is_following: false,
            is_blocked: false,
          }
          cacheProfile(p)
          outgoing.push(p)
        }
      }
    }

    return { ok: true, incoming, outgoing }
  } catch (err: any) {
    return { ok: false, incoming: [], outgoing: [], error: err?.message || 'Ошибка загрузки заявок' }
  }
}
