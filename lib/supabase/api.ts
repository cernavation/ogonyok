import { getSupabase } from './client.ts'
import { canChangeLevel, evaluateDayClosing, getTargetDayForNewEntry, type DiaryDayRecord, type EntryType } from '../ogonek/diary-engine.ts'
import {
  isProfileHiddenFromSearch,
  resolveAllowGroupInvitesFrom,
  resolveAllowMessagesFrom,
} from '../ogonek/privacy.ts'
import {
  buildPridayFollowText,
  buildPridayMutualText,
  mapOfficialBroadcastToChatMessage,
  mapPridayRecordToChatMessage,
} from '../ogonek/priday-system-chat.ts'
import {
  extractDayNumberFromTarget,
  parsePostAuthorIdFromTarget,
  legacyTargetFromScoped,
} from '../ogonek/comments.ts'
import { getInitials } from '../ogonek/initials.ts'
import type { ChatMessage, Comment, CommentReactionSummary } from '../ogonek/types.ts'

export interface ProfileRecord {
  id: string
  username: string
  display_name: string
  avatar_url?: string | null
  avatar_image?: string | null
  banner_image?: string | null
  cover_url?: string | null
  banner_preset?: string | null
  bio?: string | null
  city?: string | null
  website?: string | null
  level?: number
  difficulty_level?: number
  level_changed_at?: string
  timezone?: string
  telegram_chat_id?: string | null
  reminder_times?: string[]
  in_leaderboard?: boolean
  streak?: number
  streak_count?: number
  total_prides?: number
  total_gratitudes?: number
  is_anonymous?: boolean
  privacy?: { is_anonymous?: boolean; [key: string]: any }
  settings?: { level?: number; [key: string]: any }
  age?: number | null
  verified?: boolean
  tour_completed?: boolean
  onboarding_completed?: boolean
  subscription_tier?: 'free' | 'premium' | 'ultra'
  avatar_color?: string | null
  who_can_find?: 'everyone' | 'friends' | 'nobody'
  who_can_message?: 'everyone' | 'friends' | 'nobody'
  who_can_call?: 'everyone' | 'friends' | 'nobody'
  who_can_see_online?: 'everyone' | 'friends' | 'nobody'
  default_day_visibility?: 'private' | 'friends' | 'public'
  is_hidden_from_search?: boolean
  allow_messages_from?: 'everyone' | 'friends' | 'nobody'
  allow_group_invites_from?: 'friends' | 'nobody'
  last_seen_at?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Единый маппер строки profiles из Supabase
 * Обязательно считывает level из level или settings->level
 */
export function mapProfileRecord(row: any): ProfileRecord {
  const userLevel =
    (typeof row.level === 'number' && row.level > 0 ? row.level : null) ??
    (typeof row.settings?.level === 'number' && row.settings.level > 0 ? row.settings.level : null) ??
    (typeof row.difficulty_level === 'number' && row.difficulty_level > 0 ? row.difficulty_level : null) ??
    (row.level ? Number(row.level) : null) ??
    (row.settings?.level ? Number(row.settings.level) : null) ??
    (row.difficulty_level ? Number(row.difficulty_level) : null) ??
    1

  return {
    ...row,
    level: userLevel,
    difficulty_level: userLevel,
    subscription_tier:
      row.subscription_tier === 'premium' || row.subscription_tier === 'ultra'
        ? row.subscription_tier
        : 'free',
    avatar_url: row.avatar_image || row.avatar_url || null,
    avatar_image: row.avatar_image || row.avatar_url || null,
    banner_image: row.banner_image || row.cover_url || null,
    cover_url: row.cover_url || row.banner_image || null,
    banner_preset: row.banner_preset || 'night-peaks',
    city: row.city || '',
    website: row.website || '',
    age: typeof row.age === 'number' ? row.age : (row.privacy?.age ? Number(row.privacy.age) : null),
    verified: Boolean(row.verified),
    streak: typeof row.streak_count === 'number' ? row.streak_count : (typeof row.streak === 'number' ? row.streak : 0),
    streak_count: typeof row.streak_count === 'number' ? row.streak_count : (typeof row.streak === 'number' ? row.streak : 0),
    is_anonymous: row.is_anonymous === true || row.privacy?.is_anonymous === true,
    is_hidden_from_search: isProfileHiddenFromSearch(row),
    allow_messages_from: resolveAllowMessagesFrom(row),
    allow_group_invites_from: resolveAllowGroupInvitesFrom(row),
    last_seen_at: row.last_seen_at || null,
    tour_completed: row.tour_completed === true || row.settings?.tour_completed === true || row.onboarding_completed === true,
    onboarding_completed: row.tour_completed === true || row.settings?.tour_completed === true || row.onboarding_completed === true,
  } as ProfileRecord
}

export interface DayRecord {
  id: string
  user_id: string
  day_number: number
  day_date: string
  closed_at: string | null
  created_at: string
  entries?: EntryRecord[]
}

export interface EntryRecord {
  id: string
  user_id: string
  day_id: string
  type: EntryType
  num?: string
  text: string
  score?: number | null
  ai_comment?: string | null
  overcome?: number
  tags?: string[]
  visibility: 'public' | 'friends' | 'private'
  created_at: string
}

export interface PostRecord {
  id: string
  user_id: string
  entry_id?: string | null
  text: string
  type: 'pride' | 'gratitude'
  visibility: 'public' | 'friends' | 'private'
  score?: number | null
  ai_comment?: string | null
  created_at: string
  author?: ProfileRecord
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean }>
}

export const FALLBACK_SEED_PROFILES: ProfileRecord[] = [
  {
    id: 'ilonmusk-seed',
    username: 'ilonmusk',
    display_name: 'Илон Маск',
    bio: 'Founder SpaceX & Tesla. Строю марсианский флот и фиксирую победы дня.',
    city: 'Austin',
    avatar_url: '/author-avatar.png',
    avatar_image: '/author-avatar.png',
    streak_count: 0,
    streak: 0,
    total_prides: 0,
    total_gratitudes: 0,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    is_anonymous: false,
    settings: { level: 1 },
    level: 1,
    difficulty_level: 1,
  },
  {
    id: 'cernavation-seed',
    username: 'cernavation',
    display_name: 'Alexei Cerna',
    bio: 'Создатель Winlog. Дисциплина и летопись побед.',
    city: 'Москва',
    avatar_url: '/author-avatar.png',
    avatar_image: '/author-avatar.png',
    streak_count: 720,
    streak: 720,
    total_prides: 3600,
    total_gratitudes: 3600,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    is_anonymous: false,
    settings: { level: 5 },
    level: 5,
    difficulty_level: 5,
  },
]

/** Внутрисессионный кэш загруженных профилей (чтобы списки/чаты не мигали на 'Собеседник') */
const profileMemoryCache = new Map<string, ProfileRecord>()

export function cacheProfileRecord(profile: ProfileRecord | null | undefined): ProfileRecord | null {
  if (!profile || !profile.id) return profile ?? null
  profileMemoryCache.set(profile.id, profile)
  if (profile.username) {
    profileMemoryCache.set(`@${profile.username.toLowerCase().replace(/^@/, '')}`, profile)
  }
  return profile
}

export function getCachedProfileSync(userIdOrUsername?: string | null): ProfileRecord | null {
  if (!userIdOrUsername) return null
  const clean = userIdOrUsername.trim()
  return (
    profileMemoryCache.get(clean) ||
    profileMemoryCache.get(`@${clean.toLowerCase().replace(/^@/, '')}`) ||
    null
  )
}

export function clearProfileMemoryCache() {
  profileMemoryCache.clear()
}

/**
 * Получить профиль пользователя по id или username
 */
export async function getProfile(userIdOrUsername: string): Promise<ProfileRecord | null> {
  const supabase = getSupabase()
  const clean = userIdOrUsername.trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
  if (supabase) {
    if (isUuid) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clean)
        .maybeSingle()
      if (!error && data) return cacheProfileRecord(mapProfileRecord(data))
    } else {
      const cleanUsername = clean.replace(/^@+/, '')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle()
      if (!error && data) return cacheProfileRecord(mapProfileRecord(data))
      const escaped = cleanUsername.replace(/[\\%_]/g, (m) => `\\${m}`)
      const fallbackRes = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', escaped)
        .limit(1)
        .maybeSingle()
      if (!fallbackRes.error && fallbackRes.data) {
        return cacheProfileRecord(mapProfileRecord(fallbackRes.data))
      }
    }
    return getCachedProfileSync(clean)
  }

  const cleanUser = clean.replace(/^@+/, '').toLowerCase()
  const fallback = FALLBACK_SEED_PROFILES.find(
    (p) => p.id === clean || p.username.toLowerCase() === cleanUser
  )
  return fallback ?? null
}

export async function getProfilesByIds(userIds: string[]): Promise<Record<string, ProfileRecord>> {
  const supabase = getSupabase()
  const cleanUuids = Array.from(
    new Set(
      userIds.filter((id) =>
        typeof id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      )
    )
  )
  if (!supabase || cleanUuids.length === 0) return {}

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', cleanUuids)

    if (error || !Array.isArray(data)) return {}
    const map: Record<string, ProfileRecord> = {}
    for (const row of data as any[]) {
      const mapped = cacheProfileRecord(mapProfileRecord(row))
      if (mapped) map[mapped.id] = mapped
    }
    return map
  } catch {
    return {}
  }
}

export const getProfileById = getProfile
export const fetchProfile = getProfile

/**
 * Поиск профилей по нику или имени напрямую в Supabase public.profiles
 */
export async function searchProfiles(query: string, currentUserIdOrUsername?: string): Promise<ProfileRecord[]> {
  const searchQuery = query.trim().replace(/^@+/, '')
  const qLower = searchQuery.toLowerCase()
  const spaceless = qLower.replace(/\s+/g, '')
  const words = qLower.split(/\s+/).filter(Boolean)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserIdOrUsername || '')

  const results: ProfileRecord[] = []
  const supabase = getSupabase()

  if (supabase) {
    if (!searchQuery) return getRecentProfiles(20, currentUserIdOrUsername)
    try {
      let orClause = `username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`
      if (spaceless && spaceless !== qLower) {
        orClause += `,username.ilike.%${spaceless}%,display_name.ilike.%${spaceless}%`
      }
      for (const w of words) {
        if (w.length >= 3) {
          orClause += `,username.ilike.%${w}%,display_name.ilike.%${w}%`
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(orClause)
        .limit(30)

      if (!error && Array.isArray(data)) {
        for (const row of data as any[]) {
          if (isProfileHiddenFromSearch(row)) continue

          if (currentUserIdOrUsername) {
            if (isUuid && row.id === currentUserIdOrUsername) continue
            if (!isUuid && row.username?.toLowerCase() === currentUserIdOrUsername.toLowerCase()) continue
          }

          results.push(mapProfileRecord(row))
        }
      }
    } catch {}
  }

  if (!supabase && results.length === 0 && searchQuery) {
    for (const seed of FALLBACK_SEED_PROFILES) {
      const uName = seed.username.toLowerCase()
      const dName = seed.display_name.toLowerCase()
      if (
        uName.includes(qLower) ||
        dName.includes(qLower) ||
        (spaceless && (uName.includes(spaceless) || dName.replace(/\s+/g, '').includes(spaceless))) ||
        (words.length > 1 && words.every((w) => uName.includes(w) || dName.includes(w)))
      ) {
        if (currentUserIdOrUsername) {
          if (isUuid && seed.id === currentUserIdOrUsername) continue
          if (!isUuid && seed.username?.toLowerCase() === currentUserIdOrUsername.toLowerCase()) continue
        }
        results.push(seed)
      }
    }
  }

  return results
}

/**
 * Получение последних активных реальных пользователей из базы Supabase
 */
export async function getRecentProfiles(limit = 30, currentUserIdOrUsername?: string): Promise<ProfileRecord[]> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserIdOrUsername || '')
  const results: ProfileRecord[] = []
  const supabase = getSupabase()

  if (supabase) {
    try {
      let q = supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit + 5)

      if (currentUserIdOrUsername && isUuid) {
        q = q.neq('id', currentUserIdOrUsername)
      }

      const { data, error } = await q
      if (!error && Array.isArray(data)) {
        for (const row of data as any[]) {
          if (isProfileHiddenFromSearch(row)) continue

          if (currentUserIdOrUsername && !isUuid) {
            if (row.username?.toLowerCase() === currentUserIdOrUsername.toLowerCase()) continue
          }

          results.push(mapProfileRecord(row))
          if (results.length >= limit) break
        }
      }
    } catch {}
  }

  return results
}

/**
 * Проверить взаимную дружбу (подписки в обе стороны) в Supabase `follows`
 */
export async function checkMutualFriendshipDb(userA: string, userB: string): Promise<boolean> {
  if (!userA || !userB || userA === userB) return false
  if (!UUID_REGEX.test(userA) || !UUID_REGEX.test(userB)) return false
  const supabase = getSupabase()
  if (!supabase) return false
  try {
    const [aToB, bToA] = await Promise.all([
      supabase.from('follows').select('id').eq('follower_id', userA).eq('following_id', userB).maybeSingle(),
      supabase.from('follows').select('id').eq('follower_id', userB).eq('following_id', userA).maybeSingle(),
    ])
    return Boolean(aToB.data && bToA.data)
  } catch {
    return false
  }
}

/**
 * Получить список читателей (Followers) пользователя из Supabase friendships
 * Условие: friend_id = profileUserId (или addressee_id = profileUserId)
 */
/**
 * Получить список читателей (Followers) пользователя строго из Supabase `follows` + актуальные `profiles`
 */
export async function getProfileFollowers(profileUserId: string): Promise<ProfileRecord[]> {
  const supabase = getSupabase()
  if (!supabase || !profileUserId) return []
  try {
    let targetId = profileUserId
    if (!UUID_REGEX.test(profileUserId)) {
      const prof = await getProfile(profileUserId)
      if (!prof) return []
      targetId = prof.id
    }

    const { data: byFollows, error: followErr } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', targetId)

    if (followErr || !Array.isArray(byFollows) || byFollows.length === 0) return []

    const followerIds = Array.from(
      new Set(byFollows.map((r: any) => r.follower_id).filter((id: any): id is string => Boolean(id)))
    )
    if (followerIds.length === 0) return []

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followerIds)

    if (profErr || !profiles) return []
    return profiles.map(mapProfileRecord)
  } catch (err) {
    console.error('getProfileFollowers error:', err)
    return []
  }
}

/**
 * Получить список читаемых (Following) пользователя строго из Supabase `follows` + актуальные `profiles`
 */
export async function getProfileFollowing(profileUserId: string): Promise<ProfileRecord[]> {
  const supabase = getSupabase()
  if (!supabase || !profileUserId) return []
  try {
    let targetId = profileUserId
    if (!UUID_REGEX.test(profileUserId)) {
      const prof = await getProfile(profileUserId)
      if (!prof) return []
      targetId = prof.id
    }

    const { data: byFollows, error: followErr } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', targetId)

    if (followErr || !Array.isArray(byFollows) || byFollows.length === 0) return []

    const followingIds = Array.from(
      new Set(byFollows.map((r: any) => r.following_id).filter((id: any): id is string => Boolean(id)))
    )
    if (followingIds.length === 0) return []

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followingIds)

    if (profErr || !profiles) return []
    return profiles.map(mapProfileRecord)
  } catch (err) {
    console.error('getProfileFollowing error:', err)
    return []
  }
}

/**
 * Список пользователей, на которых подписан текущий пользователь
 */
export async function getFollowing(userId: string): Promise<ProfileRecord[]> {
  return getProfileFollowing(userId)
}

export type SocialGraphIds = {
  followingIds: string[]
  followerIds: string[]
  /** Взаимные подписки в follows: A читает B и B читает A */
  friendIds: string[]
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Единый источник правды (SSOT) для социального графа пользователя из таблицы `follows`.
 * Взаимные подписки (A -> B и B -> A) автоматически образуют список друзей (`friendIds`).
 */
export async function getSocialGraphFromFollows(userId: string): Promise<SocialGraphIds> {
  if (!userId || !UUID_REGEX.test(userId)) {
    return { followingIds: [], followerIds: [], friendIds: [] }
  }
  const supabase = getSupabase()
  if (!supabase) return { followingIds: [], followerIds: [], friendIds: [] }

  try {
    const [followingRes, followersRes] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', userId),
      supabase.from('follows').select('follower_id').eq('following_id', userId),
    ])

    const followingIds = Array.from(
      new Set(
        (followingRes.data || [])
          .map((r: any) => r.following_id)
          .filter((id: any): id is string => typeof id === 'string' && id.length > 0 && id !== userId)
      )
    )
    const followerIds = Array.from(
      new Set(
        (followersRes.data || [])
          .map((r: any) => r.follower_id)
          .filter((id: any): id is string => typeof id === 'string' && id.length > 0 && id !== userId)
      )
    )

    const followerSet = new Set(followerIds)
    const friendIds = followingIds.filter((id) => followerSet.has(id))

    return { followingIds, followerIds, friendIds }
  } catch {
    return { followingIds: [], followerIds: [], friendIds: [] }
  }
}

/**
 * Загружает живые профили взаимных друзей из `follows` + `profiles`.
 */
export async function getMutualFriendProfiles(userId: string): Promise<ProfileRecord[]> {
  const { friendIds } = await getSocialGraphFromFollows(userId)
  if (friendIds.length === 0) return []
  const map = await getProfilesByIds(friendIds)
  return friendIds.map((id) => map[id]).filter((p): p is ProfileRecord => Boolean(p))
}

/**
 * Подписка Realtime на таблицу `follows` для автоматической синхронизации подписок и дружбы.
 */
export function subscribeToFollows(userId: string, onChange: () => void) {
  const supabase = getSupabase()
  if (!supabase || !userId || !UUID_REGEX.test(userId)) {
    return () => {}
  }

  const channelName = `follows-sync-${userId}-${Math.random().toString(36).slice(2, 8)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'follows' },
      (payload: any) => {
        const nextRow = payload?.new || {}
        const oldRow = payload?.old || {}
        if (
          nextRow.follower_id === userId ||
          nextRow.following_id === userId ||
          oldRow.follower_id === userId ||
          oldRow.following_id === userId ||
          payload?.eventType === 'DELETE'
        ) {
          onChange()
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Единая детерминированная функция получения ключа диалога между двумя пользователями.
 * Сортирует ID участников по алфавиту, гарантируя, что оба участника
 * читают и пишут в один и тот же thread_key.
 */
export function getDirectThreadKey(userId1: string, userId2: string): string {
  if (!userId1 && !userId2) return ''
  if (!userId1) return userId2
  if (!userId2) return userId1
  return [userId1, userId2].sort().join('_')
}

/**
 * Подписаться на пользователя (SSOT: таблица `follows` без несуществующей колонки status).
 * При взаимной подписке (B уже читает A) автоматически синхронизируем статус `accepted` в `friendships`.
 */
export async function followUser(followerId: string, followingId: string): Promise<{ ok: boolean; error?: string; isMutual?: boolean }> {
  if (!followerId || !followingId || followerId === followingId) {
    return { ok: false, error: 'Некорректные идентификаторы пользователей' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }
  try {
    const { error: followErr } = await supabase.from('follows').upsert(
      {
        follower_id: followerId,
        following_id: followingId,
      },
      { onConflict: 'follower_id,following_id' }
    )

    if (followErr) {
      return { ok: false, error: followErr.message || 'Ошибка подписки' }
    }

    // Проверяем встречную подписку: если B уже читает A — они автоматически друзья
    let isMutual = false
    try {
      const { data: reverseRow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followingId)
        .eq('following_id', followerId)
        .maybeSingle()

      isMutual = Boolean(reverseRow)
      if (isMutual) {
        const now = new Date().toISOString()
        await Promise.allSettled([
          supabase.from('friendships').upsert(
            {
              user_id: followerId,
              friend_id: followingId,
              addressee_id: followingId,
              status: 'accepted',
              updated_at: now,
              client_updated_at: now,
            },
            { onConflict: 'user_id,friend_id' }
          ),
          supabase.from('friendships').upsert(
            {
              user_id: followingId,
              friend_id: followerId,
              addressee_id: followerId,
              status: 'accepted',
              updated_at: now,
              client_updated_at: now,
            },
            { onConflict: 'user_id,friend_id' }
          ),
        ])
      }
    } catch {}

    try {
      void sendPridayFollowNotificationDb({ followerId, followingId, isMutual })
    } catch {}

    return { ok: true, isMutual }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка подписки' }
  }
}

/**
 * Отписаться от пользователя (SSOT: удаление из `follows`; при отписке взаимная дружба сразу прекращается).
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<{ ok: boolean; error?: string }> {
  if (!followerId || !followingId) {
    return { ok: false, error: 'Некорректные идентификаторы пользователей' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }
  try {
    const { error: delErr } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    if (delErr) {
      return { ok: false, error: delErr.message || 'Ошибка отписки' }
    }

    // Если кто-то отписывается — взаимная дружба прекращается
    try {
      await supabase
        .from('friendships')
        .delete()
        .or(
          `and(user_id.eq.${followerId},friend_id.eq.${followingId}),and(user_id.eq.${followingId},friend_id.eq.${followerId}),and(user_id.eq.${followerId},addressee_id.eq.${followingId}),and(user_id.eq.${followingId},addressee_id.eq.${followerId})`
        )
    } catch {}

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка отписки' }
  }
}

/**
 * Проверить, подписан ли пользователь
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  return checkFriendshipFollow(followerId, followingId)
}

/**
 * Переключить статус подписки в таблице friendships (и follows) в Supabase (Требование 2)
 */
export async function toggleFriendshipFollow(
  currentUserId: string,
  targetUserId: string
): Promise<{ ok: boolean; following: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, following: false, error: 'База данных не подключена' }
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { ok: false, following: false, error: 'Некорректный ID пользователя' }
  }

  try {
    // 1. Проверяем, подписан ли уже в friendships
    const isCurrentlyFollowing = await checkFriendshipFollow(currentUserId, targetUserId)

    if (isCurrentlyFollowing) {
      const res = await unfollowUser(currentUserId, targetUserId)
      return { ok: res.ok, following: false, error: res.error }
    } else {
      const res = await followUser(currentUserId, targetUserId)
      return { ok: res.ok, following: true, error: res.error }
    }
  } catch (err: any) {
    return { ok: false, following: false, error: err?.message || 'Ошибка обновления подписки' }
  }
}

/**
 * Проверить статус подписки строго в таблице `follows` (SSOT)
 */
export async function checkFriendshipFollow(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) return false
  const supabase = getSupabase()
  if (!supabase) return false
  try {
    const { data: followRow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .maybeSingle()

    return Boolean(followRow)
  } catch {
    return false
  }
}

/**
 * Проверить статус взаимной дружбы:
 * User A подписан на User B И User B подписан на User A (SSOT: таблица `follows`)
 */
export async function checkMutualFriendship(userIdA: string, userIdB: string): Promise<boolean> {
  if (!userIdA || !userIdB || userIdA === userIdB) return false
  try {
    const [aFollowsB, bFollowsA] = await Promise.all([
      checkFriendshipFollow(userIdA, userIdB),
      checkFriendshipFollow(userIdB, userIdA),
    ])
    return Boolean(aFollowsB && bFollowsA)
  } catch {
    return false
  }
}

/**
 * Получить количество общих друзей (общих взаимных друзей или общих подписок) между двумя пользователями
 */
export async function getMutualFriendsCount(userIdA: string, userIdB: string): Promise<number> {
  if (!userIdA || !userIdB || userIdA === userIdB) return 0
  try {
    const [graphA, graphB] = await Promise.all([
      getSocialGraphFromFollows(userIdA),
      getSocialGraphFromFollows(userIdB),
    ])
    const friendsA = graphA.friendIds.length > 0 ? graphA.friendIds : graphA.followingIds
    const friendsB = graphB.friendIds.length > 0 ? graphB.friendIds : graphB.followingIds
    const setA = new Set(friendsA)
    let count = 0
    for (const id of friendsB) {
      if (setA.has(id)) count++
    }
    return count
  } catch {
    return 0
  }
}

/**
 * Получить счётчики подписок («В читаемых») и подписчиков («Читателей») строго из таблицы `follows`
 */
export async function getFriendshipCounts(userId: string): Promise<{ followingCount: number; followersCount: number }> {
  const supabase = getSupabase()
  if (!supabase || !userId) return { followingCount: 0, followersCount: 0 }
  try {
    const [followingRes, followersRes] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
    ])

    return {
      followingCount: followingRes.count ?? 0,
      followersCount: followersRes.count ?? 0,
    }
  } catch {
    return { followingCount: 0, followersCount: 0 }
  }
}

/**
 * Загрузить публичные посты пользователя
 */
export async function getUserPosts(userId: string): Promise<PostRecord[]> {
  const supabase = getSupabase()
  if (!supabase || !userId) return []
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:profiles!posts_user_id_fkey(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data as PostRecord[]
  } catch {
    return []
  }
}

/**
 * Загрузить дни и записи пользователя (за 2+ года)
 */
export async function getUserDiaryDays(userId: string): Promise<DayRecord[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data: days, error: daysError } = await supabase
    .from('diary_days')
    .select('*')
    .eq('user_id', userId)
    .order('day_number', { ascending: false })

  if (daysError || !days) return []

  const dayIds = days.map((d) => d.id)
  let entries: EntryRecord[] = []
  if (dayIds.length > 0) {
    const { data: entriesData } = await supabase
      .from('entries')
      .select('*')
      .in('day_id', dayIds)
      .order('created_at', { ascending: true })
    if (entriesData) {
      entries = entriesData as EntryRecord[]
    }
  }

  const entriesByDay = new Map<string, EntryRecord[]>()
  for (const entry of entries) {
    const list = entriesByDay.get(entry.day_id) || []
    list.push(entry)
    entriesByDay.set(entry.day_id, list)
  }

  return days.map((day) => ({
    ...day,
    entries: entriesByDay.get(day.id) || [],
  }))
}

/**
 * Добавить запись (гордость или благодарность) с применением правил 1-6
 */
export async function addDiaryEntry(params: {
  userId: string
  type: EntryType
  text: string
  visibility?: 'public' | 'friends' | 'private'
  score?: number | null
  aiComment?: string | null
  targetDayId?: string
}): Promise<{ ok: boolean; entry?: EntryRecord; day?: DayRecord; closedNow?: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const todayStr = new Date().toISOString().slice(0, 10)
    let dayId = params.targetDayId

    // 1. Если день не указан, находим первый незакрытый день (Правило 4)
    if (!dayId) {
      const { data: days } = await supabase
        .from('diary_days')
        .select('*')
        .eq('user_id', params.userId)
        .order('day_number', { ascending: true })

      const target = getTargetDayForNewEntry(days || [], todayStr)

      if (target.existingDayId) {
        dayId = target.existingDayId
      } else {
        // Создаем новый день
        const { data: newDay, error: createError } = await supabase
          .from('diary_days')
          .insert({
            user_id: params.userId,
            day_number: target.day_number,
            day_date: target.day_date,
          })
          .select()
          .single()

        if (createError || !newDay) {
          return { ok: false, error: createError?.message || 'Не удалось создать день' }
        }
        dayId = newDay.id
      }
    }

    // 2. Вставляем запись в entries
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .insert({
        user_id: params.userId,
        day_id: dayId,
        type: params.type,
        text: params.text.trim(),
        visibility: params.visibility || 'private',
        score: params.score || null,
        ai_comment: params.aiComment || null,
      })
      .select()
      .single()

    if (entryError || !entry) {
      return { ok: false, error: entryError?.message || 'Не удалось сохранить запись' }
    }

    // 3. Проверяем, закрывается ли день (Правило 5)
    const { data: currentDay } = await supabase
      .from('diary_days')
      .select('*')
      .eq('id', dayId)
      .single()

    const { data: dayEntries } = await supabase
      .from('entries')
      .select('type')
      .eq('day_id', dayId)

    const profile = await getProfile(params.userId)
    const level = profile?.level || 3

    const { data: allUserDays } = await supabase
      .from('diary_days')
      .select('*')
      .eq('user_id', params.userId)

    const evaluation = evaluateDayClosing(
      currentDay as DiaryDayRecord,
      (dayEntries || []) as Array<{ type: EntryType }>,
      level,
      (allUserDays || []) as DiaryDayRecord[],
      todayStr
    )

    let closedNow = false
    if (evaluation.canClose) {
      const nowISO = new Date().toISOString()
      await supabase
        .from('diary_days')
        .update({ closed_at: nowISO, updated_at: nowISO })
        .eq('id', dayId)

      // Стрик = общее количество закрытых дней
      const closedDaysCount = (allUserDays || []).filter((d) => d.closed_at || d.id === dayId).length
      await supabase
        .from('profiles')
        .update({ streak: closedDaysCount, updated_at: nowISO })
        .eq('id', params.userId)

      await supabase
        .from('streaks')
        .upsert({
          user_id: params.userId,
          current_streak: closedDaysCount,
          longest_streak: closedDaysCount,
          last_closed_day_number: currentDay.day_number,
          last_closed_calendar_date: todayStr,
          updated_at: nowISO,
        })

      closedNow = true
    }

    return {
      ok: true,
      entry: entry as EntryRecord,
      day: currentDay as DayRecord,
      closedNow,
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Опубликовать одну гордость/благодарность в общую ленту отдельным постом
 */
export async function shareEntryToFeed(params: {
  userId: string
  entryId: string
  text: string
  type: 'pride' | 'gratitude'
  visibility: 'public' | 'friends'
  score?: number | null
  aiComment?: string | null
}): Promise<{ ok: boolean; post?: PostRecord; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: params.userId,
      entry_id: params.entryId,
      text: params.text,
      type: params.type,
      visibility: params.visibility,
      score: params.score || null,
      ai_comment: params.aiComment || null,
    })
    .select()
    .single()

  if (error || !data) return { ok: false, error: error?.message || 'Ошибка публикации' }
  return { ok: true, post: data as PostRecord }
}

/**
 * Загрузить посты ленты (все или друзья)
 */
export async function getFeedPosts(filter: 'all' | 'friends', currentUserId?: string): Promise<PostRecord[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  let query = supabase
    .from('posts')
    .select('*, author:profiles!posts_user_id_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(30)

  if (filter === 'friends' && currentUserId) {
    const following = await getFollowing(currentUserId)
    const followingIds = following.map((f) => f.id)
    followingIds.push(currentUserId)
    query = query.in('user_id', followingIds)
  } else {
    query = query.eq('visibility', 'public')
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as PostRecord[]
}

/**
 * Поставить или снять реакцию
 */
export async function toggleReaction(params: {
  userId: string
  targetType: 'entry' | 'post' | 'story' | 'message' | 'comment'
  targetId: string
  emoji: string
}): Promise<{ ok: boolean; active: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, active: false, error: 'База данных не подключена' }

  // Проверяем существующую
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('user_id', params.userId)
    .eq('target_type', params.targetType)
    .eq('target_id', params.targetId)
    .eq('emoji', params.emoji)
    .single()

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
    return { ok: true, active: false }
  } else {
    await supabase.from('reactions').insert({
      user_id: params.userId,
      target_type: params.targetType,
      target_id: params.targetId,
      emoji: params.emoji,
    })
    return { ok: true, active: true }
  }
}

const DEMO_COMMENT_AUTHORS = new Set(['Priday поддержки', 'Огонёк поддержки', 'Winlog поддержки'])

function isLegacyDemoCommentRow(row: any): boolean {
  if (!row || typeof row !== 'object') return true
  if (row.persona === 'support') return true
  if (typeof row.template === 'string' && row.template.trim().length > 0) return true
  if (typeof row.author === 'string' && DEMO_COMMENT_AUTHORS.has(row.author.trim())) return true
  return false
}

function extractLegacyMarkdownGif(text: string): { cleanText: string; gifUrl: string | null } {
  const mdMatch = text.match(/!\[\]\((https?:\/\/[^\s)]+)\)/)
  if (mdMatch) {
    return {
      cleanText: text.replace(/!\[\]\([^)]+\)/g, '').trim(),
      gifUrl: mdMatch[1],
    }
  }
  return { cleanText: text, gifUrl: null }
}

function mapCommentRowToDomain(
  row: any,
  prof: ProfileRecord | null | undefined,
  likeStats: { count: number; likedByMe: boolean } | null,
  likesTableAvailable: boolean,
  reactionSummaries: CommentReactionSummary[] | undefined,
  viewerId?: string | null,
  fallbackPostAuthorId?: string | null
): Comment {
  const authorId: string | null = row.user_id || row.author_id || null
  const displayName = prof?.display_name || prof?.username || row.author || 'Пользователь'
  const username = prof?.username || null
  const resolvedTarget = String(row.target_key || '')
  const parsedOwner = parsePostAuthorIdFromTarget(resolvedTarget)
  const rawText = String(row.text || '')
  const rowGifUrl = typeof row.gif_url === 'string' && row.gif_url.trim() ? row.gif_url.trim() : null
  const legacyParsed = !rowGifUrl ? extractLegacyMarkdownGif(rawText) : { cleanText: rawText, gifUrl: null }

  return {
    id: String(row.id || row.client_id),
    parentId: row.parent_id || row.parent_client_id || null,
    authorId,
    author: displayName,
    username,
    avatarUrl: prof?.avatar_image || prof?.avatar_url || null,
    avatarColor: prof?.avatar_color || '#FF5C00',
    verified: Boolean(prof?.verified),
    postAuthorId: row.post_author_id || parsedOwner || fallbackPostAuthorId || null,
    initials: row.initials || getInitials(displayName, username || 'user'),
    text: legacyParsed.cleanText,
    gifUrl: rowGifUrl || legacyParsed.gifUrl || null,
    createdAt: row.created_at || new Date().toISOString(),
    likes: likesTableAvailable
      ? (likeStats?.count ?? 0)
      : Math.max(0, Number(row.likes ?? 0)),
    likedByMe: likesTableAvailable
      ? Boolean(likeStats?.likedByMe)
      : Boolean(row.liked_by_me),
    reactions: reactionSummaries && reactionSummaries.length > 0 ? reactionSummaries : undefined,
    isMine: Boolean(viewerId && authorId && authorId.toLowerCase() === viewerId.toLowerCase()),
  }
}

/**
 * Загрузить реальные комментарии и лайки комментариев из Supabase
 * сразу для пачки целевых объектов (`u:<uid>:day:<n>`, `day:<n>`, `post:<id>` и т.д.).
 */
export async function fetchCommentsForTargets(
  targets: string[],
  viewerId?: string | null,
  postAuthorHintByTarget?: Record<string, string | null>
): Promise<{ ok: boolean; commentsByTarget: Record<string, Comment[]>; error?: string }> {
  const cleanTargets = Array.from(new Set(targets.filter((t) => typeof t === 'string' && t.trim().length > 0)))
  if (cleanTargets.length === 0) return { ok: true, commentsByTarget: {} }

  const supabase = getSupabase()
  if (!supabase) return { ok: false, commentsByTarget: {}, error: 'База данных не подключена' }

  let effectiveViewerId = viewerId && UUID_REGEX.test(viewerId) ? viewerId : null
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user?.id) {
      effectiveViewerId = sessionData.session.user.id
    }
  } catch {}
  const normalizedViewerId = effectiveViewerId ? effectiveViewerId.toLowerCase() : null

  const queryKeys = new Set<string>()
  const legacyToScoped = new Map<string, Array<{ canonical: string; ownerId: string | null }>>()

  for (const canonical of cleanTargets) {
    queryKeys.add(canonical)
    const legacy = legacyTargetFromScoped(canonical)
    if (legacy) {
      queryKeys.add(legacy)
      const ownerId = parsePostAuthorIdFromTarget(canonical)
      const list = legacyToScoped.get(legacy) ?? []
      list.push({ canonical, ownerId })
      legacyToScoped.set(legacy, list)
    }
  }

  const { data: rows, error } = await supabase
    .from('comments')
    .select('*')
    .in('target_key', Array.from(queryKeys))
    .order('created_at', { ascending: true })

  if (error) {
    return { ok: false, commentsByTarget: {}, error: error.message }
  }

  const validRows = (Array.isArray(rows) ? rows : []).filter((r) => !isLegacyDemoCommentRow(r))
  const commentUuids = Array.from(
    new Set(validRows.map((r) => String(r.id || '')).filter((id) => UUID_REGEX.test(id)))
  )
  const authorIds = Array.from(
    new Set(
      validRows
        .map((r) => String(r.user_id || r.author_id || ''))
        .filter((id) => UUID_REGEX.test(id))
    )
  )

  let likesTableAvailable = false
  const likesMap = new Map<string, { count: number; likedByMe: boolean }>()
  const reactionsMap = new Map<string, CommentReactionSummary[]>()

  const [profilesMap, likesRes, reactionsRes] = await Promise.all([
    authorIds.length > 0 ? getProfilesByIds(authorIds) : Promise.resolve({} as Record<string, ProfileRecord>),
    commentUuids.length > 0
      ? supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', commentUuids)
      : Promise.resolve({ data: [], error: null } as any),
    commentUuids.length > 0
      ? supabase
          .from('comment_reactions')
          .select('comment_id, user_id, emoji')
          .in('comment_id', commentUuids)
      : Promise.resolve({ data: [], error: null } as any),
  ])

  if (!likesRes?.error && Array.isArray(likesRes?.data)) {
    likesTableAvailable = true
    for (const row of likesRes.data) {
      const cid = String(row.comment_id || '')
      if (!cid) continue
      const entry = likesMap.get(cid) ?? { count: 0, likedByMe: false }
      entry.count += 1
      if (normalizedViewerId && String(row.user_id || '').toLowerCase() === normalizedViewerId) {
        entry.likedByMe = true
      }
      likesMap.set(cid, entry)
    }
  }

  if (!reactionsRes?.error && Array.isArray(reactionsRes?.data)) {
    const byCommentEmoji = new Map<string, Map<string, { count: number; reactedByMe: boolean }>>()
    for (const row of reactionsRes.data) {
      const cid = String(row.comment_id || '')
      const emoji = String(row.emoji || '').trim()
      if (!cid || !emoji) continue
      let eMap = byCommentEmoji.get(cid)
      if (!eMap) {
        eMap = new Map()
        byCommentEmoji.set(cid, eMap)
      }
      const prev = eMap.get(emoji) ?? { count: 0, reactedByMe: false }
      prev.count += 1
      if (normalizedViewerId && String(row.user_id || '').toLowerCase() === normalizedViewerId) {
        prev.reactedByMe = true
      }
      eMap.set(emoji, prev)
    }
    for (const [cid, eMap] of byCommentEmoji.entries()) {
      const list: CommentReactionSummary[] = []
      for (const [emoji, info] of eMap.entries()) {
        list.push({ emoji, count: info.count, reactedByMe: info.reactedByMe })
      }
      reactionsMap.set(cid, list)
    }
  }

  const result: Record<string, Comment[]> = {}
  for (const t of cleanTargets) {
    result[t] = []
  }

  const canonicalSet = new Set(cleanTargets)

  for (const row of validRows) {
    const rawKey = String(row.target_key || '')
    let destination: string | null = null

    if (canonicalSet.has(rawKey)) {
      destination = rawKey
    } else {
      const candidates = legacyToScoped.get(rawKey)
      if (candidates && candidates.length > 0) {
        const rowOwner = row.post_author_id || row.user_id || null
        const matched = candidates.find((c) => c.ownerId && rowOwner && c.ownerId === rowOwner)
        if (matched) destination = matched.canonical
      }
    }

    if (!destination) continue

    const authorUid = row.user_id || row.author_id || null
    const prof = (authorUid && (profilesMap[authorUid] || getCachedProfileSync(authorUid))) || null
    const likeStats = likesMap.get(String(row.id)) ?? null
    const reactionList = reactionsMap.get(String(row.id))
    const mapped = mapCommentRowToDomain(
      row,
      prof,
      likeStats,
      likesTableAvailable,
      reactionList,
      effectiveViewerId,
      postAuthorHintByTarget?.[destination] ?? null
    )
    if (!result[destination]) result[destination] = []
    if (!result[destination].some((c) => c.id === mapped.id)) {
      result[destination].push(mapped)
    }
  }

  return { ok: true, commentsByTarget: result }
}

/**
 * Создать реальный комментарий или ответ в Supabase `public.comments`.
 * Поддерживает текст (до 2000 символов), только GIF (`gif_url`), или текст + GIF вместе.
 */
export async function createCommentInDb(params: {
  userId?: string | null
  targetKey: string
  text?: string
  gifUrl?: string | null
  parentId?: string | null
  postAuthorId?: string | null
  authorName?: string
  initials?: string
}): Promise<{ ok: boolean; comment?: Comment; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  const trimmed = (params.text || '').trim().slice(0, 2000)
  const cleanGifUrl =
    typeof params.gifUrl === 'string' && params.gifUrl.trim() ? params.gifUrl.trim().slice(0, 1000) : null
  if (!trimmed && !cleanGifUrl) return { ok: false, error: 'Введите текст или выберите GIF' }

  let authUid = params.userId && UUID_REGEX.test(params.userId) ? params.userId : null
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user?.id) {
      authUid = sessionData.session.user.id
    }
  } catch {}

  if (!authUid || !UUID_REGEX.test(authUid)) {
    return { ok: false, error: 'Войдите в аккаунт, чтобы оставлять комментарии' }
  }

  const parsedTargetOwner = parsePostAuthorIdFromTarget(params.targetKey)
  const effectivePostAuthorId =
    params.postAuthorId && UUID_REGEX.test(params.postAuthorId)
      ? params.postAuthorId
      : parsedTargetOwner && UUID_REGEX.test(parsedTargetOwner)
        ? parsedTargetOwner
        : null

  const parentUuid = params.parentId && UUID_REGEX.test(params.parentId) ? params.parentId : null
  const clientId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const insertRow: Record<string, any> = {
    user_id: authUid,
    client_id: clientId,
    target_key: params.targetKey,
    day_client_id: extractDayNumberFromTarget(params.targetKey),
    parent_id: parentUuid,
    parent_client_id: params.parentId || null,
    post_author_id: effectivePostAuthorId,
    author: (params.authorName || 'Пользователь').slice(0, 80),
    initials: (params.initials || 'П').slice(0, 4),
    text: trimmed,
    gif_url: cleanGifUrl,
    likes: 0,
    liked_by_me: false,
    is_mine: true,
  }

  const { data, error } = await supabase
    .from('comments')
    .insert(insertRow)
    .select('*')
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message || 'Не удалось сохранить комментарий' }
  }

  const prof = getCachedProfileSync(authUid) || (await getProfile(authUid).catch(() => null))
  const mapped = mapCommentRowToDomain(
    data,
    prof,
    { count: 0, likedByMe: false },
    true,
    undefined,
    authUid,
    effectivePostAuthorId
  )
  return { ok: true, comment: mapped }
}

/**
 * Поставить или снять лайк комментария в `public.comment_likes`.
 */
export async function toggleCommentLikeInDb(params: {
  userId?: string | null
  commentId: string
  willLike: boolean
}): Promise<{ ok: boolean; liked?: boolean; count?: number; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  if (!params.commentId || !UUID_REGEX.test(params.commentId)) {
    return { ok: false, error: 'Некорректный ID комментария' }
  }

  let authUid = params.userId && UUID_REGEX.test(params.userId) ? params.userId : null
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user?.id) {
      authUid = sessionData.session.user.id
    }
  } catch {}

  if (!authUid || !UUID_REGEX.test(authUid)) {
    return { ok: false, error: 'Войдите в аккаунт, чтобы ставить лайки' }
  }

  if (params.willLike) {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: params.commentId, user_id: authUid })

    if (error && error.code !== '23505') {
      return { ok: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', params.commentId)
      .eq('user_id', authUid)

    if (error) {
      return { ok: false, error: error.message }
    }
  }

  try {
    const { data: rowsAfter, error: countErr } = await supabase
      .from('comment_likes')
      .select('user_id')
      .eq('comment_id', params.commentId)

    if (!countErr && Array.isArray(rowsAfter)) {
      const exactCount = rowsAfter.length
      const exactLiked = rowsAfter.some(
        (r: any) => String(r.user_id || '').toLowerCase() === authUid!.toLowerCase()
      )
      return { ok: true, liked: exactLiked, count: exactCount }
    }
  } catch {}

  return { ok: true, liked: params.willLike }
}

/**
 * Поставить или снять эмодзи-реакцию на комментарии в `public.comment_reactions`.
 */
export async function toggleCommentReactionInDb(params: {
  userId?: string | null
  commentId: string
  emoji: string
  willReact: boolean
}): Promise<{ ok: boolean; reacted?: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  if (!params.commentId || !UUID_REGEX.test(params.commentId)) {
    return { ok: false, error: 'Некорректный ID комментария' }
  }
  const cleanEmoji = (params.emoji || '').trim().slice(0, 16)
  if (!cleanEmoji) return { ok: false, error: 'Некорректная реакция' }

  let authUid = params.userId && UUID_REGEX.test(params.userId) ? params.userId : null
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData?.session?.user?.id) {
      authUid = sessionData.session.user.id
    }
  } catch {}

  if (!authUid || !UUID_REGEX.test(authUid)) {
    return { ok: false, error: 'Войдите в аккаунт, чтобы ставить реакции' }
  }

  if (params.willReact) {
    const { error } = await supabase
      .from('comment_reactions')
      .insert({ comment_id: params.commentId, user_id: authUid, emoji: cleanEmoji })

    if (error) {
      if (error.code === '23505') return { ok: true, reacted: true }
      return { ok: false, error: error.message }
    }
    return { ok: true, reacted: true }
  }

  const { error } = await supabase
    .from('comment_reactions')
    .delete()
    .eq('comment_id', params.commentId)
    .eq('user_id', authUid)
    .eq('emoji', cleanEmoji)

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true, reacted: false }
}

/**
 * Удалить комментарий из Supabase `public.comments`.
 * RLS разрешает удаление автору комментария И владельцу поста (Day).
 */
export async function deleteCommentInDb(params: {
  commentId: string
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  if (!params.commentId || !UUID_REGEX.test(params.commentId)) {
    return { ok: false, error: 'Некорректный ID комментария' }
  }

  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', params.commentId)
    .select('id')

  if (error) {
    return { ok: false, error: error.message }
  }
  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, error: 'Недостаточно прав или комментарий уже удалён' }
  }
  return { ok: true }
}

/**
 * Подписка на Realtime-обновления комментариев и лайков к ним.
 */
export function subscribeToCommentsRealtime(
  onEvent: (targetHint?: string | null) => void
): () => void {
  const supabase = getSupabase()
  if (!supabase) return () => {}

  const channelName = `comments_rt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      (payload: any) => {
        const key = (payload.new as any)?.target_key || (payload.old as any)?.target_key || null
        onEvent(key)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comment_likes' },
      () => {
        onEvent(null)
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comment_reactions' },
      () => {
        onEvent(null)
      }
    )
    .subscribe()

  return () => {
    try {
      void supabase.removeChannel(channel)
    } catch {}
  }
}

/**
 * Добавить комментарий (совместимый алиас поверх createCommentInDb)
 */
export async function addComment(params: {
  userId: string
  targetType: 'entry' | 'post' | 'day'
  targetId: string
  text: string
  parentId?: string
}): Promise<{ ok: boolean; comment?: any; error?: string }> {
  const targetKey =
    params.targetType === 'day'
      ? `day:${params.targetId}`
      : params.targetType === 'post'
        ? `post:${params.targetId}`
        : params.targetId
  return createCommentInDb({
    userId: params.userId,
    targetKey,
    text: params.text,
    parentId: params.parentId,
  })
}

/**
 * Загрузить комментарии для объекта
 */
export async function getComments(targetType: 'entry' | 'post' | 'day', targetId: string): Promise<any[]> {
  const targetKey =
    targetType === 'day'
      ? `day:${targetId}`
      : targetType === 'post'
        ? `post:${targetId}`
        : targetId
  const res = await fetchCommentsForTargets([targetKey])
  return res.commentsByTarget[targetKey] ?? []
}

/**
 * Сменить уровень сложности с проверкой 30-дневного кулдауна (Правило 2)
 */
export async function changeDifficultyLevel(userId: string, newLevel: number): Promise<{ ok: boolean; error?: string; daysLeft?: number }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  const profile = await getProfile(userId)
  if (!profile) return { ok: false, error: 'Профиль не найден' }

  const check = canChangeLevel(profile.level_changed_at)
  if (!check.allowed) {
    return {
      ok: false,
      error: `Смена уровня заблокирована. Следующая смена через ${check.daysLeft} дн.`,
      daysLeft: check.daysLeft,
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      level: newLevel,
      level_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Миграция локальной истории из localStorage в облачный аккаунт (Правило 9)
 */
export async function migrateLegacyDaysToSupabase(
  userId: string,
  localDays: any[],
  onProgress?: (done: number, total: number) => void
): Promise<{ success: boolean; migratedDays: number; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { success: false, migratedDays: 0, error: 'База данных не подключена' }

  try {
    let count = 0
    const total = localDays.length

    for (const d of localDays) {
      const dayNumber = Number(d.id || d.dayNumber || count + 1)
      const dayDate = d.date || new Date().toISOString().slice(0, 10)
      const isClosed = Boolean(d.closedAt || d.completed || (d.prides && d.prides.length >= 3))
      const closedAt = isClosed ? (d.closedAt || new Date().toISOString()) : null

      // Вставляем день
      const { data: dayRow } = await supabase
        .from('diary_days')
        .upsert(
          {
            user_id: userId,
            day_number: dayNumber,
            day_date: dayDate,
            closed_at: closedAt,
          },
          { onConflict: 'user_id,day_number' }
        )
        .select()
        .single()

      if (dayRow) {
        // Идемпотентность: удаляем старые записи дня перед повторной вставкой, чтобы исключить дубли
        try {
          await supabase.from('entries').delete().eq('day_id', dayRow.id)
        } catch {
          // ignore delete error
        }

        if (d.prides && Array.isArray(d.prides)) {
          for (const pride of d.prides) {
            const text = typeof pride === 'string' ? pride : pride.text
            if (!text) continue
            try {
              await supabase.from('entries').insert({
                user_id: userId,
                day_id: dayRow.id,
                type: 'pride',
                text,
                score: typeof pride === 'object' ? pride.scale : null,
                ai_comment: typeof pride === 'object' ? pride.comment : null,
                overcome: typeof pride === 'object' ? pride.overcome : 0,
                visibility: 'private',
              })
            } catch {
              // ignore entry insert error
            }
          }
        }

        if (d.gratitudes && Array.isArray(d.gratitudes)) {
          for (const grat of d.gratitudes) {
            const text = typeof grat === 'string' ? grat : grat.text
            if (!text) continue
            try {
              await supabase.from('entries').insert({
                user_id: userId,
                day_id: dayRow.id,
                type: 'gratitude',
                text,
                visibility: 'private',
              })
            } catch {
              // ignore entry insert error
            }
          }
        }
      }

      count += 1
      onProgress?.(count, total)
    }

    // Обновляем стрик
    const { count: closedCount } = await supabase
      .from('diary_days')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('closed_at', 'is', null)

    const streakVal = closedCount || count
    await supabase.from('profiles').update({ streak: streakVal }).eq('id', userId)

    return { success: true, migratedDays: count }
  } catch (err) {
    return { success: false, migratedDays: 0, error: String(err) }
  }
}

/**
 * Получить профиль по нику
 */
export async function getProfileByUsername(username: string): Promise<ProfileRecord | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const clean = username.replace(/^@/, '')
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', clean)
    .maybeSingle()
  if (error || !data) return null
  return mapProfileRecord(data)
}

export interface PublicDayRecord {
  id: string
  user_id: string
  day_number: number
  day_date: string
  visibility: string
  title?: string
  closed_at: string | null
  created_at: string
}

export async function getUserPublicDays(userId: string, isFriend: boolean = false): Promise<PublicDayRecord[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  let q = supabase
    .from('days')
    .select('id,user_id,day_number,day_date,visibility,title,closed_at,created_at')
    .eq('user_id', userId)
    .order('day_number', { ascending: false })
    .limit(20)

  if (isFriend) {
    q = q.in('visibility', ['public', 'friends'])
  } else {
    q = q.eq('visibility', 'public')
  }

  const { data, error } = await q
  if (error || !data) return []
  return data as PublicDayRecord[]
}

/* ══════════════════════════════════════════════════════════════════════════
   ПРОФИЛЬ: ОБНОВЛЕНИЕ И СИНХРОНИЗАЦИЯ УРОВНЯ В SUPABASE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Прямое обновление полей профиля в Supabase public.profiles
 */
export async function updateProfileInDb(
  userId: string,
  patch: Partial<ProfileRecord>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const nowISO = new Date().toISOString()
    const updates: Record<string, any> = {
      updated_at: nowISO,
    }

    if (patch.display_name !== undefined) updates.display_name = patch.display_name
    if (patch.username !== undefined) updates.username = patch.username.replace(/^@/, '')
    if (patch.bio !== undefined) updates.bio = patch.bio
    if (patch.city !== undefined) updates.city = patch.city
    if (patch.website !== undefined) updates.website = patch.website
    if (patch.avatar_image !== undefined || patch.avatar_url !== undefined) {
      const nextAvatar = patch.avatar_image !== undefined ? patch.avatar_image : patch.avatar_url
      updates.avatar_image = nextAvatar
      updates.avatar_url = nextAvatar
    }
    if (patch.avatar_color !== undefined) {
      updates.avatar_color = patch.avatar_color
    }
    if (patch.verified !== undefined) {
      updates.verified = Boolean(patch.verified)
    }
    if (patch.banner_image !== undefined) {
      updates.banner_image = patch.banner_image
      updates.cover_url = patch.banner_image
    }
    if (patch.cover_url !== undefined) {
      updates.cover_url = patch.cover_url
      if (!updates.banner_image) updates.banner_image = patch.cover_url
    }
    if (patch.banner_preset !== undefined) updates.banner_preset = patch.banner_preset
    if (patch.level !== undefined) {
      updates.level = patch.level
      updates.difficulty_level = patch.level
    }
    if (patch.difficulty_level !== undefined) {
      updates.difficulty_level = patch.difficulty_level
      if (!updates.level) updates.level = patch.difficulty_level
    }
    if (patch.level_changed_at !== undefined) updates.level_changed_at = patch.level_changed_at
    if (patch.age !== undefined) updates.age = patch.age
    if (patch.verified !== undefined) updates.verified = patch.verified
    if (patch.tour_completed !== undefined) {
      updates.tour_completed = patch.tour_completed
      updates.settings = {
        ...(patch.settings ?? updates.settings ?? {}),
        tour_completed: patch.tour_completed,
      }
    }
    if (patch.is_anonymous !== undefined) updates.is_anonymous = patch.is_anonymous
    if (patch.privacy !== undefined) updates.privacy = patch.privacy
    if (patch.who_can_find !== undefined) updates.who_can_find = patch.who_can_find
    if (patch.who_can_message !== undefined) updates.who_can_message = patch.who_can_message
    if (patch.who_can_call !== undefined) updates.who_can_call = patch.who_can_call
    if (patch.who_can_see_online !== undefined) updates.who_can_see_online = patch.who_can_see_online
    if (patch.default_day_visibility !== undefined) updates.default_day_visibility = patch.default_day_visibility
    if (patch.is_hidden_from_search !== undefined) updates.is_hidden_from_search = Boolean(patch.is_hidden_from_search)
    if (patch.allow_messages_from !== undefined) updates.allow_messages_from = patch.allow_messages_from
    if (patch.allow_group_invites_from !== undefined) updates.allow_group_invites_from = patch.allow_group_invites_from
    if (patch.settings !== undefined) updates.settings = patch.settings

    // Если обновляется уровень, дублируем в settings.level для 100% совместимости
    if (updates.level) {
      updates.settings = {
        ...(patch.settings ?? {}),
        level: updates.level,
      }
    }

    let { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (error && (error.code === '42703' || error.code === 'PGRST204' || /column/i.test(error.message || ''))) {
      // Фолбэк до выполнения SQL-миграции 133: сохраняем через существующие колонки и JSONB privacy
      const fallbackUpdates = { ...updates }
      delete fallbackUpdates.is_hidden_from_search
      delete fallbackUpdates.allow_messages_from
      delete fallbackUpdates.allow_group_invites_from
      const retry = await supabase.from('profiles').update(fallbackUpdates).eq('id', userId)
      error = retry.error
    }
    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка обновления профиля' }
  }
}

/**
 * Устанавливает уровень профиля в Supabase
 */
export async function updateProfileLevel(
  userId: string,
  newLevel: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const nowISO = new Date().toISOString()
    const { error } = await supabase
      .from('profiles')
      .update({
        level: newLevel,
        difficulty_level: newLevel,
        level_changed_at: nowISO,
        updated_at: nowISO,
        settings: { level: newLevel },
      })
      .eq('id', userId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка обновления уровня' }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   СТОРИС (public.stories) — СОХРАНЕНИЕ, 20-ЧАСОВОЙ ТАЙМЕР И REALTIME
   ══════════════════════════════════════════════════════════════════════════ */

export interface StoryRecord {
  id: string
  client_id?: string
  user_id: string
  friend_id?: string | null
  emoji: string
  kicker: string
  headline: string
  detail: string
  from_color: string
  to_color: string
  accent: string
  background_id?: string | null
  photo?: string | null
  slides?: any[]
  source_day_id?: number | null
  source_pride_index?: number | null
  visibility: string
  created_at: string
  expires_at: string
  author?: ProfileRecord
}

/**
 * Публикация сторис в Supabase со строгим таймером 20 часов
 */
export async function publishStoryToDb(
  userId: string,
  story: {
    id?: string
    client_id?: string
    emoji?: string
    kicker?: string
    headline?: string
    detail?: string
    from?: string
    to?: string
    accent?: string
    backgroundId?: string
    photo?: string | null
    sourceDayId?: number | null
    sourcePrideIndex?: number | null
    visibility?: string
    createdAtISO?: string
    expires_at?: string
    expiresAtISO?: string
    expiresHours?: number
  }
): Promise<{ ok: boolean; story?: StoryRecord; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const createdAt = story.createdAtISO || new Date().toISOString()
    // Время жизни: из story.expires_at / story.expiresAtISO, либо по часам, по умолчанию 24 часа
    const expiresAt =
      story.expires_at ||
      story.expiresAtISO ||
      (story.expiresHours
        ? new Date(new Date(createdAt).getTime() + story.expiresHours * 60 * 60 * 1000).toISOString()
        : new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString())
    const storyId = story.id || story.client_id || `story-${Date.now()}`

    const payload = {
      client_id: storyId,
      user_id: userId,
      emoji: story.emoji || '🔥',
      kicker: story.kicker || '',
      headline: story.headline || '',
      detail: story.detail || '',
      from_color: story.from || '#2a1206',
      to_color: story.to || '#7a2f0c',
      accent: story.accent || '#ffa600',
      background_id: story.backgroundId || null,
      photo: story.photo || null,
      slides: [],
      source_day_id: story.sourceDayId || null,
      source_pride_index: story.sourcePrideIndex || null,
      visibility: story.visibility || 'public',
      created_at: createdAt,
      expires_at: expiresAt,
    }

    const { data, error } = await supabase
      .from('stories')
      .insert(payload)
      .select('*, author:profiles!stories_user_id_fkey(*)')
      .single()

    if (error) {
      // Попытка вставки без select foreign key при ошибке связи
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('stories')
        .insert(payload)
        .select()
        .single()

      if (fallbackError) {
        return { ok: false, error: fallbackError.message }
      }
      return { ok: true, story: fallbackData as StoryRecord }
    }

    return { ok: true, story: data as StoryRecord }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка публикации сторис' }
  }
}

/**
 * Удалить сторис из базы Supabase
 */
export async function deleteStoryFromDb(storyId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storyId)
    let q = supabase.from('stories').delete()
    if (isUuid) {
      q = q.or(`id.eq.${storyId},client_id.eq.${storyId}`)
    } else {
      q = q.eq('client_id', storyId)
    }

    const { error } = await q
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка удаления сторис' }
  }
}

/**
 * Загрузить активные сторис (живут строго менее 20 часов) от всех пользователей
 */
export async function getActiveStories(): Promise<StoryRecord[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  try {
    const nowISO = new Date().toISOString()
    const twentyHoursAgoISO = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()

    // 1. Попытка запроса с join профиля автора
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, author:profiles!stories_user_id_fkey(*)')
        .gt('expires_at', nowISO)
        .gte('created_at', twentyHoursAgoISO)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          ...row,
          author: row.author ? mapProfileRecord(row.author) : undefined,
        }))
      }
    } catch {}

    // 2. Fallback без foreign key
    const { data: plainData, error: plainError } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', nowISO)
      .gte('created_at', twentyHoursAgoISO)
      .order('created_at', { ascending: false })
      .limit(100)

    if (plainError || !Array.isArray(plainData)) return []

    // Подгрузка авторов
    const userIds = Array.from(new Set(plainData.map((s: any) => s.user_id).filter(Boolean)))
    let profilesMap = new Map<string, ProfileRecord>()

    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      if (Array.isArray(profs)) {
        for (const p of profs) {
          profilesMap.set(p.id, mapProfileRecord(p))
        }
      }
    }

    return plainData.map((row: any) => ({
      ...row,
      author: profilesMap.get(row.user_id),
    }))
  } catch (err) {
    console.error('getActiveStories error:', err)
    return []
  }
}

/**
 * Подписка на изменения сторис через Supabase Realtime
 */
export function subscribeToStories(onChange: () => void) {
  const supabase = getSupabase()
  if (!supabase) return () => {}

  const channelName = `stories_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stories' },
      () => {
        onChange()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   МЕССЕНДЖЕР: СООБЩЕНИЯ, СТАТУСЫ И REALTIME
   ══════════════════════════════════════════════════════════════════════════ */

export interface DirectMessageRecord {
  id: string
  client_id?: string
  user_id?: string
  thread_key: string
  author_id: string
  recipient_id?: string | null
  body: string
  attachment?: any
  reactions?: any[]
  is_read: boolean
  read_by?: string[] | null
  is_system?: boolean
  call_meta?: any
  type?: string
  media?: any
  reply_to?: any
  forward_from?: any
  poll?: any
  link_preview?: any
  is_pinned?: boolean
  is_edited?: boolean
  sent_at: string
  created_at?: string
  updated_at?: string
}

/**
 * Загрузить сообщения диалога между двумя пользователями из Supabase
 */
export async function getDirectMessages(
  myUserId: string,
  peerId: string,
  limit = 200
): Promise<DirectMessageRecord[]> {
  const supabase = getSupabase()
  if (!supabase || !myUserId || !peerId) return []

  try {
    const symmetricKey = getDirectThreadKey(myUserId, peerId)
    const orClause =
      peerId === 'saved-messages'
        ? `thread_key.eq.${symmetricKey},and(author_id.eq.${myUserId},recipient_id.is.null)`
        : `thread_key.eq.${symmetricKey},thread_key.eq.${peerId},and(author_id.eq.${myUserId},recipient_id.eq.${peerId}),and(author_id.eq.${peerId},recipient_id.eq.${myUserId})`

    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(orClause)
      .order('sent_at', { ascending: true })
      .limit(limit)

    if (error || !data) return []
    return data as DirectMessageRecord[]
  } catch (err) {
    console.error('getDirectMessages error:', err)
    return []
  }
}

/**
 * Загрузить все диалоги/сообщения текущего пользователя из Supabase (SSOT при загрузке / F5)
 */
export async function getAllUserDirectMessages(
  myUserId: string,
  limit = 600
): Promise<{ ok: boolean; messages: DirectMessageRecord[]; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !myUserId) return { ok: false, messages: [], error: 'Supabase client unavailable' }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(myUserId)
  if (!isUuid) return { ok: false, messages: [], error: 'Invalid user ID' }

  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`author_id.eq.${myUserId},recipient_id.eq.${myUserId}`)
      .order('sent_at', { ascending: true })
      .limit(limit)

    if (error) return { ok: false, messages: [], error: error.message }
    return { ok: true, messages: (data || []) as DirectMessageRecord[] }
  } catch (err: any) {
    return { ok: false, messages: [], error: err?.message || 'Fetch error' }
  }
}

/**
 * Отправить сообщение в Supabase
 */
export async function sendDirectMessageToDb(params: {
  userId: string
  authorId: string
  recipientId: string
  threadKey?: string
  body: string
  clientId?: string
  attachment?: any
  media?: any
  replyTo?: any
  forwardFrom?: any
  poll?: any
  linkPreview?: any
  type?: string
  isSystem?: boolean
}): Promise<{ ok: boolean; message?: DirectMessageRecord; error?: string }> {
  try {
    // Защита от Base64: файлы должны быть в бакете chat-media, а в БД — только URL
    if (params.body && (params.body.includes('data:image/') || params.body.includes('data:audio/'))) {
      return { ok: false, error: 'Base64 запрещён в тексте сообщения. Используйте загрузку в chat-media.' }
    }
    if (params.media?.url && typeof params.media.url === 'string' && params.media.url.startsWith('data:')) {
      return { ok: false, error: 'Base64 запрещён в медиа-вложениях. Загружайте файлы в хранилище chat-media.' }
    }

    const supabase = getSupabase()
    if (!supabase) return { ok: false, error: 'База данных не подключена' }

    const isUuid = (str?: string | null) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    const isGroup = params.recipientId.startsWith('group-') || Boolean(params.threadKey?.startsWith('group'))
    const isSaved = params.recipientId === 'saved-messages'
    const symmetricKey = getDirectThreadKey(params.authorId || params.userId, params.recipientId)
    const finalThreadKey = params.threadKey || (isGroup ? `group:${params.recipientId}` : symmetricKey)
    const finalRecipientId = isGroup
      ? null
      : isSaved
        ? (isUuid(params.authorId) ? params.authorId : null)
        : (isUuid(params.recipientId) ? params.recipientId : null)
    const nowISO = new Date().toISOString()

    const payload: Record<string, any> = {
      client_id: params.clientId || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: isUuid(params.userId) ? params.userId : null,
      author_id: params.authorId,
      recipient_id: finalRecipientId,
      thread_key: finalThreadKey,
      body: params.body,
      attachment: params.attachment || null,
      media: params.media || null,
      reply_to: params.replyTo || null,
      forward_from: params.forwardFrom || null,
      poll: params.poll || null,
      link_preview: params.linkPreview || null,
      type: params.type || 'text',
      reactions: [],
      is_read: false,
      is_system: Boolean(params.isSystem || params.type === 'system'),
      ...(isGroup && isUuid(params.authorId) ? { read_by: [params.authorId] } : {}),
      sent_at: nowISO,
    }

    // Проверка размера строки (лимит 2 КБ по контракту)
    const rowSizeBytes = new TextEncoder().encode(JSON.stringify(payload)).length
    if (rowSizeBytes > 4096) {
      return { ok: false, error: `Размер строки сообщения (${rowSizeBytes} байт) превышает допустимый лимит` }
    }

    let { data, error } = await supabase
      .from('direct_messages')
      .insert(payload)
      .select()
      .single()

    // Fallback если в конкретной миграции нет колонки user_id
    if (error && error.message?.includes('user_id')) {
      const { user_id: _omitted, ...withoutUserId } = payload
      const retry = await supabase
        .from('direct_messages')
        .insert(withoutUserId)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      if (error.code === '23505') {
        return { ok: true, message: payload as unknown as DirectMessageRecord }
      }
      return { ok: false, error: error.message }
    }
    return { ok: true, message: data as DirectMessageRecord }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка отправки сообщения' }
  }
}

/**
 * Удалить одно сообщение из Supabase direct_messages (по UUID id или client_id)
 */
export async function deleteDirectMessageFromDb(
  messageId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !messageId) return { ok: false, error: 'Invalid args' }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)
    let q = supabase.from('direct_messages').delete()
    if (isUuid) {
      q = q.or(`id.eq.${messageId},client_id.eq.${messageId}`)
    } else {
      q = q.eq('client_id', messageId)
    }
    const { error } = await q
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Delete failed' }
  }
}

/**
 * Массовое удаление сообщений из Supabase direct_messages
 */
export async function deleteDirectMessagesBulkFromDb(
  messageIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !Array.isArray(messageIds) || messageIds.length === 0) return { ok: false }

  try {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const uuids = messageIds.filter((id) => uuidRe.test(id))
    const clientIds = messageIds.filter((id) => !uuidRe.test(id))

    const tasks: PromiseLike<any>[] = []
    if (uuids.length > 0) {
      tasks.push(supabase.from('direct_messages').delete().in('id', uuids))
      tasks.push(supabase.from('direct_messages').delete().in('client_id', uuids))
    }
    if (clientIds.length > 0) {
      tasks.push(supabase.from('direct_messages').delete().in('client_id', clientIds))
    }
    await Promise.all(tasks)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message }
  }
}

/**
 * Полностью очистить / удалить историю переписки с конкретным пользователем в Supabase direct_messages
 */
export async function deleteThreadMessagesFromDb(
  myUserId: string,
  peerId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !myUserId || !peerId) return { ok: false, error: 'Missing ids' }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(myUserId)
  if (!isUuid) return { ok: false, error: 'Not authenticated with Supabase UUID' }

  try {
    const symmetricKey = getDirectThreadKey(myUserId, peerId)
    const isPeerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(peerId)
    const groupUuid = extractDbGroupUuid(peerId)
    let orClause = groupUuid
      ? `thread_key.eq.group:group-${groupUuid},thread_key.eq.group:${groupUuid},thread_key.eq.group-${groupUuid},thread_key.eq.${peerId}`
      : `thread_key.eq.${symmetricKey},thread_key.eq.${peerId}`
    if (peerId === 'saved-messages') {
      orClause += `,and(author_id.eq.${myUserId},recipient_id.eq.${myUserId}),and(author_id.eq.${myUserId},recipient_id.is.null)`
    } else if (isPeerUuid) {
      orClause += `,and(author_id.eq.${myUserId},recipient_id.eq.${peerId}),and(author_id.eq.${peerId},recipient_id.eq.${myUserId})`
    }

    const { error } = await supabase
      .from('direct_messages')
      .delete()
      .or(orClause)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete thread messages' }
  }
}

/**
 * Обновить данные опроса сообщения в Supabase
 */
export async function updateDirectMessagePoll(
  messageId: string,
  poll: any
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !messageId) return { ok: false }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)
    const matchCol = isUuid ? 'id' : 'client_id'
    let { error } = await supabase
      .from('direct_messages')
      .update({ poll })
      .eq(matchCol, messageId)

    if (error && isUuid) {
      const retry = await supabase.from('direct_messages').update({ poll }).eq('client_id', messageId)
      error = retry.error
    }

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message }
  }
}

/**
 * Отметить входящие сообщения как прочитанные
 */
export async function markDirectMessagesAsRead(
  myUserId: string,
  peerId: string
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !myUserId || !peerId) return

  try {
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('recipient_id', myUserId)
      .eq('author_id', peerId)
      .eq('is_read', false)
  } catch {}
}

/**
 * Отметить входящие сообщения в группе как прочитанные (добавить userId в read_by)
 */
export async function markGroupMessagesAsReadDb(
  groupIdOrThreadId: string,
  myUserId: string
): Promise<void> {
  const supabase = getSupabase()
  const groupUuid = extractDbGroupUuid(groupIdOrThreadId)
  if (!supabase || !groupUuid || !myUserId || !UUID_REGEX.test(myUserId)) return

  try {
    const { error } = await supabase.rpc('mark_group_messages_read', {
      p_group_id: groupUuid,
    })
    if (!error) return
  } catch {}

  // Fallback если RPC ещё не создан: обновляем read_by на клиенте через UPDATE RLS
  try {
    const keys = [`group:group-${groupUuid}`, `group:${groupUuid}`, `group-${groupUuid}`]
    const { data: rows } = await supabase
      .from('direct_messages')
      .select('id, read_by')
      .in('thread_key', keys)
      .neq('author_id', myUserId)
      .limit(200)

    if (!Array.isArray(rows) || rows.length === 0) return
    const unreadRows = rows.filter((r: any) => !Array.isArray(r.read_by) || !r.read_by.includes(myUserId))
    await Promise.all(
      unreadRows.slice(0, 50).map((r: any) => {
        const nextReadBy = Array.from(new Set([...(Array.isArray(r.read_by) ? r.read_by : []), myUserId]))
        return supabase.from('direct_messages').update({ read_by: nextReadBy }).eq('id', r.id)
      })
    )
  } catch {}
}

/**
 * Подсчёт непрочитанных входящих личных сообщений напрямую через браузерный Supabase (RLS)
 */
export async function getUnreadDirectMessageCountFromDb(myUserId: string): Promise<number> {
  const supabase = getSupabase()
  if (!supabase || !myUserId) return 0

  try {
    const { count, error } = await supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', myUserId)
      .eq('is_read', false)

    if (error || typeof count !== 'number') return 0
    return Math.max(0, count)
  } catch {
    return 0
  }
}

/**
 * Обновить реакции к сообщению в Supabase
 */
export async function updateDirectMessageReactions(
  messageId: string,
  reactions: any[]
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !messageId) return

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)
    if (isUuid) {
      await supabase
        .from('direct_messages')
        .update({ reactions })
        .eq('id', messageId)
    } else {
      await supabase
        .from('direct_messages')
        .update({ reactions })
        .eq('client_id', messageId)
    }
  } catch (e) {
    console.warn('[Ogonek] Update reactions error:', e)
  }
}

/**
 * Закрепить / открепить сообщение в Supabase
 */
export async function updateDirectMessagePin(
  messageId: string,
  isPinned: boolean
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !messageId) return

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)
    if (isUuid) {
      await supabase
        .from('direct_messages')
        .update({ is_pinned: isPinned })
        .eq('id', messageId)
    } else {
      await supabase
        .from('direct_messages')
        .update({ is_pinned: isPinned })
        .eq('client_id', messageId)
    }
  } catch (e) {
    console.warn('[Ogonek] Update pin error:', e)
  }
}

/**
 * Отредактировать текст сообщения в Supabase
 */
export async function updateDirectMessageBody(
  messageId: string,
  newText: string
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !messageId) return

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)
    const patch = { body: newText, edited_at: new Date().toISOString() }
    if (isUuid) {
      await supabase.from('direct_messages').update(patch).eq('id', messageId)
    } else {
      await supabase.from('direct_messages').update(patch).eq('client_id', messageId)
    }
  } catch (e) {
    console.warn('[Ogonek] Update message body error:', e)
  }
}

/**
 * Обновить ИИ-расшифровку голосового сообщения в Supabase
 */
export async function updateDirectMessageTranscript(
  messageId: string,
  transcript: string
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !messageId) return

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)
    if (isUuid) {
      await supabase
        .from('direct_messages')
        .update({ transcript })
        .eq('id', messageId)
    } else {
      await supabase
        .from('direct_messages')
        .update({ transcript })
        .eq('client_id', messageId)
    }
  } catch (e) {
    console.warn('[Ogonek] Update message transcript error:', e)
  }
}

/**
 * Realtime подписка на входящие, обновленные и удаленные сообщения
 */
export function subscribeToDirectMessages(
  onMessage: (message: DirectMessageRecord) => void,
  onUpdate?: (message: DirectMessageRecord) => void,
  onDelete?: (oldRecord: Partial<DirectMessageRecord>) => void
) {
  const supabase = getSupabase()
  if (!supabase) return () => {}

  const channelName = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages' },
      (payload) => {
        if (payload.new) {
          onMessage(payload.new as DirectMessageRecord)
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
      (payload) => {
        if (payload.new && onUpdate) {
          onUpdate(payload.new as DirectMessageRecord)
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'direct_messages' },
      (payload) => {
        if (payload.old && onDelete) {
          onDelete(payload.old as Partial<DirectMessageRecord>)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   EVIDENCE VAULT (ФАКТЫ СИЛЫ) — ПОЛНЫЙ CRUD В SUPABASE
   ══════════════════════════════════════════════════════════════════════════ */

export interface EvidenceVaultRecord {
  id: string
  client_id?: string
  user_id: string
  title: string
  description: string
  date: string
  category: string
  pinned: boolean
  media_url?: string | null
  created_at: string
  updated_at?: string
}

/**
 * Получить факты силы пользователя из Supabase
 */
export async function getEvidenceVaultStatus(
  userId: string
): Promise<{ ok: boolean; items: EvidenceVaultRecord[] }> {
  const supabase = getSupabase()
  if (!supabase || !userId) return { ok: false, items: [] }

  try {
    const { data, error } = await supabase
      .from('evidence_vault')
      .select('*')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return { ok: false, items: [] }
    return { ok: true, items: Array.isArray(data) ? (data as EvidenceVaultRecord[]) : [] }
  } catch {
    return { ok: false, items: [] }
  }
}

export async function getEvidenceVault(userId: string): Promise<EvidenceVaultRecord[]> {
  const { items } = await getEvidenceVaultStatus(userId)
  return items
}

/**
 * Добавить факт силы в Evidence Vault в Supabase
 */
export async function addEvidenceVaultItem(
  userId: string,
  item: {
    id?: string
    client_id?: string
    title: string
    description?: string
    date: string
    category?: string
    pinned?: boolean
    media_url?: string | null
  }
): Promise<{ ok: boolean; item?: EvidenceVaultRecord; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !userId) return { ok: false, error: 'База данных не подключена' }

  try {
    const nowISO = new Date().toISOString()
    const clientId = item.client_id || item.id || `ev-${Date.now()}`

    const payload = {
      client_id: clientId,
      user_id: userId,
      title: item.title.trim(),
      description: item.description?.trim() || '',
      date: item.date,
      category: item.category || 'Сомнения',
      pinned: Boolean(item.pinned),
      media_url: item.media_url || null,
      created_at: nowISO,
      updated_at: nowISO,
    }

    const { data, error } = await supabase
      .from('evidence_vault')
      .insert(payload)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, item: data as EvidenceVaultRecord }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка сохранения факта силы' }
  }
}

/**
 * Переключить закрепление факта силы
 */
export async function toggleEvidenceVaultPin(
  itemId: string,
  pinned: boolean
): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || !itemId) return false

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)
    let q = supabase.from('evidence_vault').update({
      pinned,
      updated_at: new Date().toISOString(),
    })

    if (isUuid) {
      q = q.or(`id.eq.${itemId},client_id.eq.${itemId}`)
    } else {
      q = q.eq('client_id', itemId)
    }

    const { error } = await q
    return !error
  } catch {
    return false
  }
}

/**
 * Удалить факт силы из Evidence Vault
 */
export async function deleteEvidenceVaultItem(itemId: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || !itemId) return false

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)
    let q = supabase.from('evidence_vault').delete()
    if (isUuid) {
      q = q.or(`id.eq.${itemId},client_id.eq.${itemId}`)
    } else {
      q = q.eq('client_id', itemId)
    }

    const { error } = await q
    return !error
  } catch {
    return false
  }
}

export type CallStatus = 'ringing' | 'connected' | 'accepted' | 'ended' | 'rejected' | 'declined' | 'missed' | 'busy'

export type CallSessionRecord = {
  id: string
  caller_id: string
  receiver_id: string
  status: CallStatus
  is_video: boolean
  duration_seconds?: number
  reconnect_count?: number
  ice_transport?: string
  started_at?: string
  ended_at?: string
  created_at?: string
  updated_at?: string
}

/**
 * Проверить возможность звонка (блок не дозванивается, статус busy)
 */
export async function canInitiateCall(params: {
  callerId: string
  receiverId: string
}): Promise<{ allowed: boolean; reason?: string; message?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { allowed: true }

  try {
    const { data, error } = await supabase.rpc('can_initiate_call', {
      p_caller_id: params.callerId,
      p_receiver_id: params.receiverId,
    })
    if (error) {
      console.warn('[canInitiateCall] RPC error, allowing as fallback:', error)
      return { allowed: true }
    }
    return data as { allowed: boolean; reason?: string; message?: string }
  } catch {
    return { allowed: true }
  }
}

/**
 * Зафиксировать итог звонка в call_sessions и добавить системную строку в чат
 */
export async function recordCallResult(params: {
  sessionId: string
  finalStatus: 'ended' | 'rejected' | 'missed' | 'busy'
  durationSeconds?: number
  isVideo?: boolean
}): Promise<{ ok: boolean; systemText?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !params.sessionId) return { ok: true }

  try {
    const { data, error } = await supabase.rpc('record_call_result', {
      p_session_id: params.sessionId,
      p_final_status: params.finalStatus,
      p_duration_seconds: params.durationSeconds || 0,
      p_is_video: Boolean(params.isVideo),
    })
    if (error) {
      // Fallback на обычный updateCallSessionStatus
      await updateCallSessionStatus(params.sessionId, params.finalStatus, params.durationSeconds)
      return { ok: true }
    }
    return data as { ok: boolean; systemText?: string }
  } catch (err: any) {
    return { ok: false, error: err?.message }
  }
}

/**
 * Создать сессию звонка в Supabase (или локальный fallback при отсутствии БД)
 */
export async function createCallSession(params: {
  caller_id: string
  receiver_id: string
  is_video: boolean
}): Promise<{ session?: CallSessionRecord; error?: string }> {
  const supabase = getSupabase()
  const fallbackSession: CallSessionRecord = {
    id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    caller_id: params.caller_id,
    receiver_id: params.receiver_id,
    status: 'ringing',
    is_video: params.is_video,
    duration_seconds: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!supabase) {
    return { session: fallbackSession }
  }

  try {
    const { data, error } = await supabase
      .from('call_sessions')
      .insert({
        caller_id: params.caller_id,
        receiver_id: params.receiver_id,
        is_video: params.is_video,
        status: 'ringing',
        duration_seconds: 0,
      })
      .select('*')
      .single()

    if (error) {
      return { session: fallbackSession }
    }

    return { session: data as CallSessionRecord }
  } catch {
    return { session: fallbackSession }
  }
}

/**
 * Обновить статус звонка (accepted, rejected, ended)
 */
export async function updateCallSessionStatus(
  sessionId: string,
  status: CallStatus,
  durationSeconds?: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !sessionId) return { ok: true }

  try {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (typeof durationSeconds === 'number') {
      updates.duration_seconds = durationSeconds
    }

    const { error } = await supabase
      .from('call_sessions')
      .update(updates)
      .eq('id', sessionId)

    return { ok: !error, error: error?.message }
  } catch (err: any) {
    return { ok: false, error: err?.message }
  }
}

/**
 * Получить сессию звонка по ID
 */
export async function getCallSession(sessionId: string): Promise<CallSessionRecord | null> {
  const supabase = getSupabase()
  if (!supabase || !sessionId) return null

  try {
    const { data, error } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !data) return null
    return data as CallSessionRecord
  } catch {
    return null
  }
}

export function extractDbGroupUuid(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null
  const stripped = value.trim().replace(/^group:/i, '').replace(/^group-/i, '')
  return UUID_REGEX.test(stripped) ? stripped.toLowerCase() : null
}

/**
 * Загрузить группы пользователя из Supabase (chat_groups + chat_group_members)
 */
export async function getUserChatGroupsFromDb(userId: string): Promise<{
  ok: boolean
  groups: Array<{
    id: string
    title: string
    avatarColor: string
    avatarEmoji?: string
    avatarImage?: string | null
    creatorId: string
    adminsOnly: boolean
    description: string
    createdAtISO: string
    memberIds: string[]
    adminIds: string[]
    role: 'owner' | 'admin' | 'member'
  }>
}> {
  const supabase = getSupabase()
  if (!supabase || !userId || !UUID_REGEX.test(userId)) {
    return { ok: false, groups: [] }
  }

  try {
    const [memberRowsRes, ownedRowsRes] = await Promise.all([
      supabase
        .from('chat_group_members')
        .select('group_id, role')
        .eq('user_id', userId),
      supabase
        .from('chat_groups')
        .select('*')
        .eq('creator_id', userId),
    ])

    const roleByGroup = new Map<string, 'owner' | 'admin' | 'member'>()
    const groupIdsSet = new Set<string>()

    if (Array.isArray(memberRowsRes.data)) {
      for (const r of memberRowsRes.data) {
        if (r.group_id) {
          groupIdsSet.add(r.group_id)
          roleByGroup.set(r.group_id, (r.role as any) || 'member')
        }
      }
    }
    if (Array.isArray(ownedRowsRes.data)) {
      for (const g of ownedRowsRes.data) {
        if (g.id) {
          groupIdsSet.add(g.id)
          if (!roleByGroup.has(g.id)) roleByGroup.set(g.id, 'owner')
        }
      }
    }

    const groupIds = Array.from(groupIdsSet)
    if (groupIds.length === 0) return { ok: true, groups: [] }

    const [groupsRes, allMembersRes] = await Promise.all([
      supabase.from('chat_groups').select('*').in('id', groupIds),
      supabase.from('chat_group_members').select('group_id, user_id, role').in('group_id', groupIds),
    ])

    if (groupsRes.error || !Array.isArray(groupsRes.data)) {
      return { ok: false, groups: [] }
    }

    const membersByGroup = new Map<string, string[]>()
    const adminsByGroup = new Map<string, string[]>()
    if (Array.isArray(allMembersRes.data)) {
      for (const m of allMembersRes.data) {
        if (!m.group_id || !m.user_id) continue
        const list = membersByGroup.get(m.group_id) ?? []
        list.push(m.user_id)
        membersByGroup.set(m.group_id, list)
        if (m.role === 'owner' || m.role === 'admin') {
          const aList = adminsByGroup.get(m.group_id) ?? []
          aList.push(m.user_id)
          adminsByGroup.set(m.group_id, aList)
        }
      }
    }

    const groups = groupsRes.data.map((g: any) => ({
      id: String(g.id),
      title: g.title || 'Группа',
      avatarColor: g.avatar_color || '#ff7a18',
      avatarEmoji: g.avatar_emoji || '🔥',
      avatarImage: g.avatar_image || null,
      creatorId: String(g.creator_id || userId),
      adminsOnly: Boolean(g.admins_only),
      description: g.description || '',
      createdAtISO: g.created_at || new Date().toISOString(),
      memberIds: Array.from(new Set([String(g.creator_id || userId), ...(membersByGroup.get(g.id) ?? [])])),
      adminIds: Array.from(new Set([String(g.creator_id || userId), ...(adminsByGroup.get(g.id) ?? [])])),
      role: roleByGroup.get(g.id) || (g.creator_id === userId ? 'owner' : 'member'),
    }))

    return { ok: true, groups }
  } catch {
    return { ok: false, groups: [] }
  }
}

/**
 * Загрузить сообщения групповых чатов по списку UUID групп
 */
export async function getGroupMessagesFromDb(
  groupUuids: string[],
  limit = 400
): Promise<DirectMessageRecord[]> {
  const supabase = getSupabase()
  const cleanIds = Array.from(new Set(groupUuids.filter((id) => UUID_REGEX.test(id))))
  if (!supabase || cleanIds.length === 0) return []

  try {
    const keys = cleanIds.flatMap((id) => [`group:group-${id}`, `group:${id}`, `group-${id}`, id])
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .in('thread_key', keys)
      .order('sent_at', { ascending: true })
      .limit(limit)

    if (error || !Array.isArray(data)) return []
    return data as DirectMessageRecord[]
  } catch {
    return []
  }
}

/**
 * Обновить время последнего просмотра вкладок «Друзья» / «Подписки» в public.profiles
 */
export async function updateFeedViewedAtInDb(
  userId: string | null | undefined,
  tab: 'friends' | 'following',
  iso: string
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  let uid = userId && UUID_REGEX.test(userId) ? userId : null
  if (!uid) {
    try {
      const { data } = await supabase.auth.getSession()
      uid = data?.session?.user?.id || null
    } catch {}
  }
  if (!uid || !UUID_REGEX.test(uid)) return

  const column = tab === 'friends' ? 'last_viewed_friends_feed_at' : 'last_viewed_following_feed_at'
  try {
    await supabase.from('profiles').update({ [column]: iso }).eq('id', uid)
  } catch {}
}

/**
 * Сохранить новую группу чата в Supabase
 */
export async function createChatGroupInDb(group: {
  id?: string
  title: string
  avatarColor?: string
  avatarEmoji?: string
  avatarImage?: string | null
  creatorId: string
  adminsOnly?: boolean
  description?: string
  memberIds: string[]
}): Promise<{ ok: boolean; groupId?: string; skippedMemberIds?: string[]; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  try {
    let resolvedCreatorId = UUID_REGEX.test(group.creatorId || '') ? group.creatorId : null
    if (!resolvedCreatorId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user?.id) {
          resolvedCreatorId = sessionData.session.user.id
        }
      } catch {}
    }
    if (!resolvedCreatorId) {
      return { ok: false, error: 'Необходима авторизация в Supabase для создания группы' }
    }

    const { data, error } = await supabase
      .from('chat_groups')
      .insert({
        title: group.title,
        avatar_color: group.avatarColor || '#16181c',
        avatar_emoji: group.avatarEmoji || '👥',
        avatar_image: group.avatarImage || null,
        creator_id: resolvedCreatorId,
        admins_only: Boolean(group.adminsOnly),
        description: group.description || '',
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      return { ok: false, error: error?.message || 'Не удалось создать группу в Supabase' }
    }
    const groupId = String(data.id)

    // 1. Сначала гарантируем запись создателя (owner) в chat_group_members
    const { error: ownerErr } = await supabase
      .from('chat_group_members')
      .upsert(
        {
          group_id: groupId,
          user_id: resolvedCreatorId,
          role: 'owner',
        },
        { onConflict: 'group_id,user_id', ignoreDuplicates: true }
      )
    if (ownerErr) {
      return { ok: false, error: ownerErr.message }
    }

    // 2. Добавляем приглашённых друзей
    const invitedIds = Array.from(new Set(group.memberIds))
      .filter((id) => UUID_REGEX.test(id) && id !== resolvedCreatorId)

    const skippedMemberIds: string[] = []
    if (invitedIds.length > 0) {
      const membersToInsert = invitedIds.map((userId) => ({
        group_id: groupId,
        user_id: userId,
        role: 'member',
      }))
      const { error: batchErr } = await supabase
        .from('chat_group_members')
        .upsert(membersToInsert, { onConflict: 'group_id,user_id', ignoreDuplicates: true })

      if (batchErr) {
        for (const row of membersToInsert) {
          const { error: singleErr } = await supabase
            .from('chat_group_members')
            .upsert(row, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
          if (singleErr) {
            skippedMemberIds.push(row.user_id)
          }
        }
      }
    }

    return { ok: true, groupId, skippedMemberIds }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка создания группы' }
  }
}

/**
 * Обновить метаданные группы в Supabase
 */
export async function updateChatGroupInDb(
  groupId: string,
  patch: {
    title?: string
    avatarColor?: string
    avatarEmoji?: string
    avatarImage?: string | null
    adminsOnly?: boolean
    description?: string
  }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !groupId) return { ok: false, error: 'База данных не подключена' }

  try {
    const dbUuid = extractDbGroupUuid(groupId)
    if (!dbUuid) return { ok: false, error: 'Некорректный ID группы' }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (patch.title !== undefined) updateData.title = patch.title
    if (patch.avatarColor !== undefined) updateData.avatar_color = patch.avatarColor
    if (patch.avatarEmoji !== undefined) updateData.avatar_emoji = patch.avatarEmoji
    if (patch.avatarImage !== undefined) updateData.avatar_image = patch.avatarImage
    if (patch.adminsOnly !== undefined) updateData.admins_only = patch.adminsOnly
    if (patch.description !== undefined) updateData.description = patch.description

    const { error } = await supabase.from('chat_groups').update(updateData).eq('id', dbUuid)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка обновления группы' }
  }
}

/**
 * Добавить участников в группу в Supabase (chat_group_members)
 */
export async function addGroupMembersToDb(
  groupId: string,
  memberIds: string[]
): Promise<{ ok: boolean; addedIds: string[]; error?: string }> {
  const supabase = getSupabase()
  const dbUuid = extractDbGroupUuid(groupId)
  const validIds = Array.from(new Set(memberIds.filter((id) => UUID_REGEX.test(id))))
  if (!supabase || !dbUuid || validIds.length === 0) {
    return { ok: false, addedIds: [], error: !supabase ? 'База данных не подключена' : undefined }
  }

  try {
    const rows = validIds.map((uid) => ({ group_id: dbUuid, user_id: uid, role: 'member' }))
    const { error } = await supabase
      .from('chat_group_members')
      .upsert(rows, { onConflict: 'group_id,user_id', ignoreDuplicates: true })

    if (!error) return { ok: true, addedIds: validIds }

    const addedIds: string[] = []
    for (const row of rows) {
      const { error: singleErr } = await supabase
        .from('chat_group_members')
        .upsert(row, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
      if (!singleErr) addedIds.push(row.user_id)
    }
    if (addedIds.length === 0) {
      return { ok: false, addedIds: [], error: error.message }
    }
    return { ok: true, addedIds }
  } catch (err: any) {
    return { ok: false, addedIds: [], error: err?.message || 'Ошибка добавления участников' }
  }
}

/**
 * Удалить/исключить участника из группы в Supabase
 */
export async function removeGroupMemberFromDb(
  groupId: string,
  memberId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  const dbUuid = extractDbGroupUuid(groupId)
  if (!supabase || !dbUuid || !UUID_REGEX.test(memberId)) {
    return { ok: false, error: 'Некорректные параметры удаления участника' }
  }

  try {
    const { error } = await supabase
      .from('chat_group_members')
      .delete()
      .eq('group_id', dbUuid)
      .eq('user_id', memberId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка удаления участника' }
  }
}

/**
 * Выйти из группы в Supabase (удалить своё членство)
 */
export async function leaveGroupInDb(
  groupId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  return removeGroupMemberFromDb(groupId, userId)
}

/**
 * Изменить роль участника группы в Supabase
 */
export async function updateGroupMemberRoleInDb(
  groupId: string,
  memberId: string,
  role: 'owner' | 'admin' | 'member'
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  const dbUuid = extractDbGroupUuid(groupId)
  if (!supabase || !dbUuid || !UUID_REGEX.test(memberId)) {
    return { ok: false }
  }

  try {
    const { error } = await supabase
      .from('chat_group_members')
      .update({ role })
      .eq('group_id', dbUuid)
      .eq('user_id', memberId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message }
  }
}

/**
 * Удалить всю группу в Supabase (только для создателя по RLS chat_groups_delete)
 */
export async function deleteChatGroupInDb(groupId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  const dbUuid = extractDbGroupUuid(groupId)
  if (!supabase || !dbUuid) {
    return { ok: false, error: 'Не удалось определить группу для удаления' }
  }

  try {
    const keys = [`group:group-${dbUuid}`, `group:${dbUuid}`, `group-${dbUuid}`]
    try {
      await supabase.from('direct_messages').delete().in('thread_key', keys)
    } catch {}
    const { error } = await supabase.from('chat_groups').delete().eq('id', dbUuid)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка удаления группы' }
  }
}

/**
 * Подписка на Realtime-изменения групп и состава участников пользователя
 */
export function subscribeToUserGroups(onChange: () => void) {
  const supabase = getSupabase()
  if (!supabase) return () => {}

  const channelName = `user_groups_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_group_members' }, () => {
      onChange()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_groups' }, () => {
      onChange()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Сохранить папки чатов в Supabase
 */
export async function saveChatFoldersToDb(
  userId: string,
  folders: Array<{ id: string; title: string; icon?: string; chatIds: string[] }>
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !userId) return

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (!isUuid) return

    for (const folder of folders) {
      await supabase.from('chat_folders').upsert(
        {
          user_id: userId,
          title: folder.title,
          icon: folder.icon || 'folder',
          chat_ids: folder.chatIds || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    }
  } catch {}
}

export type BlockedProfile = {
  id: string
  username: string
  display_name: string
  avatar_url?: string | null
  blocked_at: string
}

export async function getBlockedProfiles(viewerId?: string): Promise<{ ok: boolean; profiles: BlockedProfile[]; error?: string }> {
  try {
    const supabase = getSupabase()
    if (!supabase) return { ok: true, profiles: [] }
    const currentUid = viewerId || (await supabase.auth.getUser()).data.user?.id
    if (!currentUid) return { ok: true, profiles: [] }

    // Пробуем вызвать RPC get_blocked_profiles
    try {
      const { data, error } = await supabase.rpc('get_blocked_profiles', { p_viewer_id: currentUid })
      if (!error && Array.isArray(data)) {
        return { ok: true, profiles: data }
      }
    } catch {}

    // Фолбэк: выборка из blocks
    const { data: rawBlocks } = await supabase
      .from('blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', currentUid)

    if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
      const ids = rawBlocks.map((b) => b.blocked_id)
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ids)
      const profMap = new Map((profs || []).map((p) => [p.id, p]))
      const mapped = rawBlocks.map((b) => {
        const p = profMap.get(b.blocked_id)
        return {
          id: b.blocked_id,
          username: p?.username || 'пользователь',
          display_name: p?.display_name || 'Пользователь',
          avatar_url: p?.avatar_url || null,
          blocked_at: b.created_at,
        }
      })
      return { ok: true, profiles: mapped }
    }
    return { ok: true, profiles: [] }
  } catch (err: any) {
    return { ok: false, profiles: [], error: err?.message }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ЭТАП 17 — ОПТИМИЗАЦИЯ СОХРАНЕНИЯ ДНЯ ОДНИМ RPC И ПАГИНАЦИЯ
   ══════════════════════════════════════════════════════════════════════════ */

export interface SaveDayBundlePayload {
  day: Record<string, any>
  prides: Record<string, any>[]
  gratitudes: Record<string, any>[]
  streak?: number
}

/**
 * Сохранение дня со всеми гордостями, благодарностями и стриком за 1 RPC вызов
 * вместо 4 разрозненных запросов к БД.
 */
export async function saveDayBundleRpc(
  payload: SaveDayBundlePayload
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const supabase = getSupabase()
    if (!supabase) return { ok: false, error: 'Supabase client unavailable' }

    const { data, error } = await supabase.rpc('save_day_bundle', {
      p_day: payload.day,
      p_prides: payload.prides,
      p_gratitudes: payload.gratitudes,
      p_streak: payload.streak ?? null,
    })

    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true, data }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'RPC invocation failed' }
  }
}

export interface DayPaginationOptions {
  limit?: number
  cursor?: number
  offset?: number
}

/**
 * Пагинированная выборка дней пользователя с лимитом и курсором
 */
export async function getUserDaysPaginated(
  userId: string,
  options: DayPaginationOptions = {}
): Promise<{ days: PublicDayRecord[]; hasMore: boolean; nextCursor?: number }> {
  const supabase = getSupabase()
  if (!supabase) return { days: [], hasMore: false }
  const limit = options.limit ?? 20

  let query = supabase
    .from('days')
    .select('id,user_id,day_number,day_date,visibility,title,closed_at,created_at')
    .eq('user_id', userId)
    .order('day_number', { ascending: false })
    .limit(limit + 1)

  if (typeof options.cursor === 'number') {
    query = query.lt('day_number', options.cursor)
  } else if (typeof options.offset === 'number') {
    query = query.range(options.offset, options.offset + limit)
  }

  const { data, error } = await query
  if (error || !Array.isArray(data)) return { days: [], hasMore: false }

  const hasMore = data.length > limit
  const days = hasMore ? data.slice(0, limit) : data
  const nextCursor = days.length > 0 ? days[days.length - 1].day_number : undefined

  return { days, hasMore, nextCursor }
}

// Re-export social service functions
export {
  searchSocialUsers,
  sendFriendRequestApi,
  acceptFriendRequestApi,
  declineFriendRequestApi,
  cancelFriendRequestApi,
  removeFriendApi,
  blockUserApi,
  unblockUserApi,
  reportUserApi,
  getFriendsListApi,
  getFriendRequestsApi,
  getFriendFeedPosts,
  subscribeToFriendships,
  type SocialUser,
  type FriendshipStatus,
  type FriendFeedPost,
} from '../ogonek/social.ts'

/* ══════════════════════════════════════════════════════════════════════════
   ОФИЦИАЛЬНЫЙ СИСТЕМНЫЙ ЧАТ Priday (УВЕДОМЛЕНИЯ О ПОДПИСКАХ, ДРУЖБЕ И ПОДДЕРЖКЕ)
   ══════════════════════════════════════════════════════════════════════════ */

const PRIDAY_NOTIF_TYPES = [
  'priday_follow',
  'priday_mutual',
  'priday_support_user',
  'priday_support_reply',
  'priday_milestone',
] as const

/**
 * Отправить системное сообщение в чат Priday при подписке или взаимной дружбе.
 * Пишет в public.notifications (уже в Supabase Realtime и с нужными RLS) и
 * опционально дублирует в public.priday_messages, если миграция 133 уже применена.
 */
export async function sendPridayFollowNotificationDb(input: {
  followerId: string
  followingId: string
  isMutual: boolean
}): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !UUID_REGEX.test(input.followerId) || !UUID_REGEX.test(input.followingId)) return

  try {
    const profiles = await getProfilesByIds([input.followerId, input.followingId])
    const followerProf = profiles[input.followerId]
    const followingProf = profiles[input.followingId]
    const nowISO = new Date().toISOString()

    if (!input.isMutual) {
      const body = buildPridayFollowText(followerProf?.username, followerProf?.display_name)
      const dataPayload = {
        source: 'priday_chat',
        kind: 'follow',
        actorId: input.followerId,
        actorUsername: followerProf?.username || null,
        actorDisplayName: followerProf?.display_name || null,
      }
      await supabase.from('notifications').insert({
        user_id: input.followingId,
        type: 'priday_follow',
        title: 'Winlog',
        body,
        data: dataPayload,
        is_read: false,
        created_at: nowISO,
      })
      return
    }

    const bodyForRecipient = buildPridayMutualText(followerProf?.username, followerProf?.display_name)
    const bodyForFollower = buildPridayMutualText(followingProf?.username, followingProf?.display_name)
    await supabase.from('notifications').insert([
      {
        user_id: input.followingId,
        type: 'priday_mutual',
        title: 'Winlog',
        body: bodyForRecipient,
        data: {
          source: 'priday_chat',
          kind: 'mutual',
          actorId: input.followerId,
          actorUsername: followerProf?.username || null,
          actorDisplayName: followerProf?.display_name || null,
        },
        is_read: false,
        created_at: nowISO,
      },
      {
        user_id: input.followerId,
        type: 'priday_mutual',
        title: 'Winlog',
        body: bodyForFollower,
        data: {
          source: 'priday_chat',
          kind: 'mutual',
          actorId: input.followingId,
          actorUsername: followingProf?.username || null,
          actorDisplayName: followingProf?.display_name || null,
        },
        is_read: false,
        created_at: nowISO,
      },
    ])
  } catch (err) {
    console.warn('[PridaySystemChat] sendPridayFollowNotificationDb warn:', err)
  }
}

/**
 * Загружает историю системного чата Priday пользователя (уведомления о подписках/дружбе + переписка с поддержкой).
 */
export async function loadPridaySystemMessagesDb(userId: string): Promise<ChatMessage[]> {
  const supabase = getSupabase()
  if (!supabase || !userId || !UUID_REGEX.test(userId)) return []

  const rawRows: any[] = []
  let broadcastRows: any[] = []
  let lastReadOfficialAt: string | null = null
  let userCreatedAt: string | null = null

  try {
    const [pridayRes, notifRes, broadcastsRes, profileRes] = await Promise.allSettled([
      supabase
        .from('priday_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .in('type', [...PRIDAY_NOTIF_TYPES])
        .order('created_at', { ascending: true }),
      supabase
        .from('official_broadcasts')
        .select('id, author_id, text, media_url, created_at')
        .order('created_at', { ascending: true })
        .limit(200),
      supabase
        .from('profiles')
        .select('last_read_official_at, created_at')
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (pridayRes.status === 'fulfilled' && !pridayRes.value.error && Array.isArray(pridayRes.value.data)) {
      rawRows.push(...pridayRes.value.data)
    }
    if (notifRes.status === 'fulfilled' && !notifRes.value.error && Array.isArray(notifRes.value.data)) {
      rawRows.push(...notifRes.value.data)
    }
    if (broadcastsRes.status === 'fulfilled' && !broadcastsRes.value.error && Array.isArray(broadcastsRes.value.data)) {
      broadcastRows = broadcastsRes.value.data
    }
    if (profileRes.status === 'fulfilled' && !profileRes.value.error && profileRes.value.data) {
      lastReadOfficialAt = (profileRes.value.data as any).last_read_official_at || null
      userCreatedAt = (profileRes.value.data as any).created_at || null
    }
  } catch {}

  const seen = new Set<string>()
  const messages: ChatMessage[] = []
  for (const row of rawRows) {
    const mapped = mapPridayRecordToChatMessage(row)
    if (!mapped) continue
    const dedupKey = mapped.dbId || `${mapped.authorId}:${mapped.createdAtISO}:${mapped.text}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)
    messages.push(mapped)
  }

  for (const b of broadcastRows) {
    const mapped = mapOfficialBroadcastToChatMessage(b, {
      lastReadOfficialAt,
      userCreatedAt,
      myUserId: userId,
    })
    if (!mapped) continue
    const dedupKey = mapped.id
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)
    messages.push(mapped)
  }

  messages.sort((a, b) => new Date(a.createdAtISO).getTime() - new Date(b.createdAtISO).getTime())
  return messages
}

/**
 * Помечает все системные сообщения и официальные рассылки в чате Winlog прочитанными в Supabase.
 */
export async function markPridaySystemMessagesReadDb(userId: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !userId || !UUID_REGEX.test(userId)) return
  const nowISO = new Date().toISOString()
  try {
    await Promise.allSettled([
      supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .in('type', [...PRIDAY_NOTIF_TYPES])
        .eq('is_read', false),
      supabase
        .from('priday_messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false),
      supabase
        .from('profiles')
        .update({ last_read_official_at: nowISO })
        .eq('id', userId),
    ])
  } catch {}
}

/**
 * Сохраняет обращение пользователя в поддержку Priday в Supabase (+ ответ бота).
 */
export async function savePridaySupportExchangeDb(input: {
  userId: string
  text: string
  actionId?: string | null
  replyText: string
  isSupport: boolean
}): Promise<{ ok: boolean }> {
  const supabase = getSupabase()
  if (!supabase || !input.userId || !UUID_REGEX.test(input.userId)) return { ok: false }

  try {
    const sessionRes = await supabase.auth.getSession()
    const token = sessionRes?.data?.session?.access_token
    if (token && typeof fetch !== 'undefined') {
      const apiRes = await fetch('/api/priday/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: input.text,
          actionId: input.actionId || null,
        }),
      }).catch(() => null)
      if (apiRes?.ok) {
        const json = await apiRes.json().catch(() => null)
        if (json?.persisted) return { ok: true }
      }
    }
  } catch {}

  const nowISO = new Date().toISOString()
  const replyISO = new Date(Date.now() + 50).toISOString()
  try {
    const { error: pErr } = await supabase.from('priday_messages').insert([
      {
        user_id: input.userId,
        sender: 'user',
        kind: input.isSupport ? 'support_user' : 'canned',
        body: input.text,
        is_read: true,
        meta: { actionId: input.actionId || 'custom' },
        created_at: nowISO,
      },
      {
        user_id: input.userId,
        sender: 'priday',
        kind: input.isSupport ? 'support_reply' : 'canned',
        body: input.replyText,
        is_read: true,
        meta: { actionId: input.actionId || 'custom' },
        created_at: replyISO,
      },
    ])
    if (!pErr) return { ok: true }
  } catch {}

  if (input.isSupport) {
    try {
      const { error: nErr } = await supabase.from('notifications').insert([
        {
          user_id: input.userId,
          type: 'priday_support_user',
          title: 'Обращение в поддержку Winlog',
          body: input.text,
          data: { source: 'priday_chat', kind: 'support_user', actionId: input.actionId || 'custom' },
          is_read: true,
          created_at: nowISO,
        },
        {
          user_id: input.userId,
          type: 'priday_support_reply',
          title: 'Winlog',
          body: input.replyText,
          data: { source: 'priday_chat', kind: 'support_reply', actionId: input.actionId || 'custom' },
          is_read: true,
          created_at: replyISO,
        },
      ])
      if (!nErr) return { ok: true }
    } catch {}
  }

  return { ok: false }
}

/**
 * Сохраняет юбилейное поздравление от Priday (кратное 10/50/100 дням) в Supabase,
 * защищая от дублей на один и тот же day_number (например при редактировании дня).
 */
export async function savePridayMilestoneMessageDb(input: {
  userId: string
  dayNumber: number
  title: string
  body: string
  tier: 10 | 50 | 100
}): Promise<{ ok: boolean; duplicate?: boolean }> {
  const supabase = getSupabase()
  if (!supabase || !input.userId || !UUID_REGEX.test(input.userId)) return { ok: false }

  const dayStr = String(input.dayNumber)
  const nowISO = new Date().toISOString()

  try {
    // 1. Проверка дубля по notifications / priday_messages
    const [existingNotif, existingPriday] = await Promise.allSettled([
      supabase
        .from('notifications')
        .select('id, data')
        .eq('user_id', input.userId)
        .eq('type', 'priday_milestone')
        .limit(50),
      supabase
        .from('priday_messages')
        .select('id, meta')
        .eq('user_id', input.userId)
        .eq('kind', 'milestone')
        .limit(50),
    ])

    if (
      existingNotif.status === 'fulfilled' &&
      Array.isArray(existingNotif.value.data) &&
      existingNotif.value.data.some((r: any) => String(r?.data?.day_number ?? '') === dayStr)
    ) {
      return { ok: true, duplicate: true }
    }
    if (
      existingPriday.status === 'fulfilled' &&
      Array.isArray(existingPriday.value.data) &&
      existingPriday.value.data.some((r: any) => String(r?.meta?.day_number ?? '') === dayStr)
    ) {
      return { ok: true, duplicate: true }
    }

    const { error: pErr } = await supabase.from('priday_messages').insert({
      user_id: input.userId,
      sender: 'priday',
      kind: 'milestone',
      body: input.body,
      is_read: false,
      meta: {
        day_number: input.dayNumber,
        tier: input.tier,
      },
      created_at: nowISO,
    })

    if (!pErr) return { ok: true }

    const { error: nErr } = await supabase.from('notifications').insert({
      user_id: input.userId,
      type: 'priday_milestone',
      title: input.title,
      body: input.body,
      data: {
        source: 'priday_chat',
        kind: 'milestone',
        day_number: input.dayNumber,
        tier: input.tier,
      },
      is_read: false,
      created_at: nowISO,
    })
    return { ok: !nErr }
  } catch {
    return { ok: false }
  }
}

export interface OfficialBroadcastRecord {
  id: string
  author_id: string
  text: string
  media_url?: string | null
  created_at: string
}

async function getBroadcastAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const supabase = getSupabase()
  if (!supabase) return headers
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return headers
}

/**
 * Получает количество пользователей платформы для панели рассылки @cernavation.
 */
export async function getFounderBroadcastStatsApi(): Promise<{
  ok: boolean
  totalUsers: number
  error?: string
}> {
  try {
    const headers = await getBroadcastAuthHeaders()
    const res = await fetch('/api/admin/broadcast', {
      method: 'GET',
      headers,
      credentials: 'include',
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      return {
        ok: false,
        totalUsers: 0,
        error: json?.error || `HTTP ${res.status}`,
      }
    }
    return {
      ok: true,
      totalUsers: typeof json.totalUsers === 'number' ? json.totalUsers : 0,
    }
  } catch {
    return { ok: false, totalUsers: 0, error: 'Не удалось загрузить число пользователей' }
  }
}

/**
 * Публикует официальную рассылку от имени Winlog (@cernavation).
 */
export async function publishOfficialBroadcastApi(params: {
  text: string
  mediaUrl?: string | null
}): Promise<{
  ok: boolean
  broadcast?: OfficialBroadcastRecord
  totalUsers?: number
  error?: string
}> {
  try {
    const headers = await getBroadcastAuthHeaders()
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        text: params.text,
        mediaUrl: params.mediaUrl || null,
      }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok || !json?.broadcast) {
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}`,
      }
    }
    return {
      ok: true,
      broadcast: json.broadcast as OfficialBroadcastRecord,
      totalUsers: typeof json.totalUsers === 'number' ? json.totalUsers : undefined,
    }
  } catch {
    return { ok: false, error: 'Не удалось отправить рассылку' }
  }
}

/**
 * Удаляет официальную рассылку для всех пользователей (доступно только @cernavation).
 */
export async function deleteOfficialBroadcastApi(broadcastId: string): Promise<{
  ok: boolean
  deletedId?: string
  error?: string
}> {
  const cleanId = (broadcastId || '').trim()
  if (!cleanId || !UUID_REGEX.test(cleanId)) {
    return { ok: false, error: 'Некорректный ID рассылки' }
  }
  try {
    const headers = await getBroadcastAuthHeaders()
    const res = await fetch(`/api/admin/broadcast?id=${encodeURIComponent(cleanId)}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}`,
      }
    }
    return {
      ok: true,
      deletedId: json.deletedId || cleanId,
    }
  } catch {
    return { ok: false, error: 'Не удалось удалить рассылку' }
  }
}

/**
 * Realtime-подписка на новые и удалённые официальные рассылки Winlog.
 */
export function subscribeToOfficialBroadcasts(
  onInsert: (row: OfficialBroadcastRecord) => void,
  onDelete?: (oldRow: Partial<OfficialBroadcastRecord>) => void
) {
  const supabase = getSupabase()
  if (!supabase) return () => {}

  const channelName = `official_broadcasts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'official_broadcasts' },
      (payload) => {
        if (payload.new) {
          onInsert(payload.new as OfficialBroadcastRecord)
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'official_broadcasts' },
      (payload) => {
        if (payload.old && onDelete) {
          onDelete(payload.old as Partial<OfficialBroadcastRecord>)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
