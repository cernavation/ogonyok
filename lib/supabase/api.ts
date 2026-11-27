import { getSupabase } from './client.ts'
import { canChangeLevel, evaluateDayClosing, getTargetDayForNewEntry, type DiaryDayRecord, type EntryType } from '../ogonek/diary-engine.ts'

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
    bio: 'Создатель Priday. Дисциплина и летопись побед.',
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

/**
 * Получить профиль пользователя по id или username
 */
export async function getProfile(userIdOrUsername: string): Promise<ProfileRecord | null> {
  const supabase = getSupabase()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername)
  if (supabase) {
    let q = supabase.from('profiles').select('*')
    if (isUuid) {
      q = q.eq('id', userIdOrUsername)
    } else {
      q = q.eq('username', userIdOrUsername.replace(/^@/, ''))
    }
    const { data, error } = await q.maybeSingle()
    if (!error && data) return mapProfileRecord(data)
    return null
  }

  const cleanUser = userIdOrUsername.replace(/^@/, '').toLowerCase()
  const fallback = FALLBACK_SEED_PROFILES.find(
    (p) => p.id === userIdOrUsername || p.username.toLowerCase() === cleanUser
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
      const mapped = mapProfileRecord(row)
      map[mapped.id] = mapped
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
          const isAnon = row.is_anonymous === true || row.privacy?.is_anonymous === true
          if (isAnon) continue

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
          const isAnon = row.is_anonymous === true || row.privacy?.is_anonymous === true
          if (isAnon) continue

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
 * Получить список читателей (Followers) пользователя из Supabase friendships
 * Условие: friend_id = profileUserId (или addressee_id = profileUserId)
 */
export async function getProfileFollowers(profileUserId: string): Promise<ProfileRecord[]> {
  const supabase = getSupabase()
  if (!supabase || !profileUserId) return []
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileUserId)
    let targetId = profileUserId
    if (!isUuid) {
      const prof = await getProfile(profileUserId)
      if (!prof) return []
      targetId = prof.id
    }

    let followerIds: string[] = []

    // 1. Попытка запроса по friend_id (если колонка friend_id создана в схеме)
    try {
      const { data: byFriend, error: errFriend } = await supabase
        .from('friendships')
        .select('user_id')
        .eq('friend_id', targetId)
        .in('status', ['accepted', 'following', 'friend'])

      if (!errFriend && Array.isArray(byFriend) && byFriend.length > 0) {
        followerIds = byFriend.map((r: any) => r.user_id).filter(Boolean)
      }
    } catch {}

    // 2. Если по friend_id пусто или нет такой колонки — запрос по addressee_id
    if (followerIds.length === 0) {
      const { data: byAddressee, error: errAddressee } = await supabase
        .from('friendships')
        .select('user_id')
        .eq('addressee_id', targetId)
        .in('status', ['accepted', 'following', 'friend'])

      if (!errAddressee && Array.isArray(byAddressee)) {
        followerIds = byAddressee.map((r: any) => r.user_id).filter(Boolean)
      }
    }

    // 3. Fallback: проверка таблицы follows если friendships пуст
    if (followerIds.length === 0) {
      try {
        const { data: byFollows } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', targetId)

        if (Array.isArray(byFollows) && byFollows.length > 0) {
          followerIds = byFollows.map((r: any) => r.follower_id).filter(Boolean)
        }
      } catch {}
    }

    if (followerIds.length === 0) return []

    // Загрузка реальных профилей подписчиков
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
 * Получить список читаемых (Following) пользователя из Supabase friendships
 * Условие: user_id = profileUserId
 */
export async function getProfileFollowing(profileUserId: string): Promise<ProfileRecord[]> {
  const supabase = getSupabase()
  if (!supabase || !profileUserId) return []
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileUserId)
    let targetId = profileUserId
    if (!isUuid) {
      const prof = await getProfile(profileUserId)
      if (!prof) return []
      targetId = prof.id
    }

    // Запрос подписок: user_id = targetId
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', targetId)
      .in('status', ['accepted', 'following', 'friend'])

    let followingIds: string[] = []
    if (!error && Array.isArray(data) && data.length > 0) {
      followingIds = data
        .map((r: any) => r.friend_id || r.addressee_id)
        .filter(Boolean)
    }

    // Fallback: проверка таблицы follows
    if (followingIds.length === 0) {
      try {
        const { data: byFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', targetId)

        if (Array.isArray(byFollows) && byFollows.length > 0) {
          followingIds = byFollows.map((r: any) => r.following_id).filter(Boolean)
        }
      } catch {}
    }

    if (followingIds.length === 0) return []

    // Загрузка реальных профилей тех, на кого подписан
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
 * Подписаться на пользователя (сохранение в friendships и follows)
 * Условие: user_id = currentUserId, friend_id = targetUserId, status = 'accepted'
 */
export async function followUser(followerId: string, followingId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }
  try {
    const now = new Date().toISOString()
    const { error: insErr } = await supabase.from('friendships').upsert(
      {
        user_id: followerId,
        friend_id: followingId,
        addressee_id: followingId,
        status: 'accepted',
        updated_at: now,
        client_updated_at: now,
      },
      { onConflict: 'user_id,friend_id' }
    )

    if (insErr) {
      try {
        await supabase.from('friendships').upsert(
          {
            user_id: followerId,
            friend_id: followingId,
            addressee_id: followingId,
            status: 'accepted',
            updated_at: now,
            client_updated_at: now,
          },
          { onConflict: 'user_id,addressee_id' }
        )
      } catch {}
    }

    try {
      await supabase.from('follows').upsert(
        {
          follower_id: followerId,
          following_id: followingId,
          status: 'accepted',
        },
        { onConflict: 'follower_id,following_id' }
      )
    } catch {}

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка подписки' }
  }
}

/**
 * Отписаться от пользователя (удаление из friendships и follows)
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }
  try {
    await supabase
      .from('friendships')
      .delete()
      .eq('user_id', followerId)
      .or(`friend_id.eq.${followingId},addressee_id.eq.${followingId}`)

    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
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
 * Проверить статус подписки в таблице friendships
 */
export async function checkFriendshipFollow(currentUserId: string, targetUserId: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase || !currentUserId || !targetUserId) return false
  try {
    const { data: byFriend } = await supabase
      .from('friendships')
      .select('status')
      .eq('user_id', currentUserId)
      .eq('friend_id', targetUserId)
      .maybeSingle()

    if (byFriend && (byFriend.status === 'accepted' || byFriend.status === 'following' || byFriend.status === 'friend')) {
      return true
    }

    const { data: byAddressee } = await supabase
      .from('friendships')
      .select('status')
      .eq('user_id', currentUserId)
      .eq('addressee_id', targetUserId)
      .maybeSingle()

    if (byAddressee && (byAddressee.status === 'accepted' || byAddressee.status === 'following' || byAddressee.status === 'friend')) {
      return true
    }

    // fallback к таблице follows
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
 * User A подписан на User B И User B подписан на User A
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
 * Получить количество общих друзей (общих подписок) между двумя пользователями
 */
export async function getMutualFriendsCount(userIdA: string, userIdB: string): Promise<number> {
  const supabase = getSupabase()
  if (!supabase || !userIdA || !userIdB || userIdA === userIdB) return 0
  try {
    const [followingA, followingB] = await Promise.all([
      getFollowing(userIdA),
      getFollowing(userIdB),
    ])
    const setA = new Set(followingA.map((u: ProfileRecord) => u.id))
    let count = 0
    for (const u of followingB) {
      if (setA.has(u.id)) count++
    }
    return count
  } catch {
    return 0
  }
}

/**
 * Получить счётчики подписчиков и подписок из friendships
 */
export async function getFriendshipCounts(userId: string): Promise<{ followingCount: number; followersCount: number }> {
  const supabase = getSupabase()
  if (!supabase || !userId) return { followingCount: 0, followersCount: 0 }
  try {
    const [followingRes, followersRes] = await Promise.all([
      supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['following', 'friend']),
      supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('addressee_id', userId)
        .in('status', ['following', 'friend']),
    ])

    let followingCount = followingRes.count ?? 0
    let followersCount = followersRes.count ?? 0

    // Если в friendships 0, проверяем fallback таблицу follows
    if (followingCount === 0) {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)
      if (typeof count === 'number') followingCount = count
    }
    if (followersCount === 0) {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
      if (typeof count === 'number') followersCount = count
    }

    return { followingCount, followersCount }
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

/**
 * Добавить комментарий
 */
export async function addComment(params: {
  userId: string
  targetType: 'entry' | 'post' | 'day'
  targetId: string
  text: string
  parentId?: string
}): Promise<{ ok: boolean; comment?: any; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: params.userId,
      target_type: params.targetType,
      target_id: params.targetId,
      text: params.text.trim(),
      parent_id: params.parentId || null,
    })
    .select('*, author:profiles!comments_user_id_fkey(*)')
    .single()

  if (error || !data) return { ok: false, error: error?.message || 'Ошибка отправки комментария' }
  return { ok: true, comment: data }
}

/**
 * Загрузить комментарии для объекта
 */
export async function getComments(targetType: 'entry' | 'post' | 'day', targetId: string): Promise<any[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles!comments_user_id_fkey(*)')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data
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
    if (patch.avatar_image !== undefined) {
      updates.avatar_image = patch.avatar_image
      updates.avatar_url = patch.avatar_image
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
    if (patch.settings !== undefined) updates.settings = patch.settings

    // Если обновляется уровень, дублируем в settings.level для 100% совместимости
    if (updates.level) {
      updates.settings = {
        ...(patch.settings ?? {}),
        level: updates.level,
      }
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
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
  is_system?: boolean
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
      is_system: false,
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

    if (error) return { ok: false, error: error.message }
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
    let orClause = `thread_key.eq.${symmetricKey},thread_key.eq.${peerId}`
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
export async function getEvidenceVault(userId: string): Promise<EvidenceVaultRecord[]> {
  const supabase = getSupabase()
  if (!supabase || !userId) return []

  try {
    const { data, error } = await supabase
      .from('evidence_vault')
      .select('*')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as EvidenceVaultRecord[]
  } catch {
    return []
  }
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
}): Promise<{ ok: boolean; groupId?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: true, groupId: group.id || `group-${Date.now()}` }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(group.creatorId)
    if (!isUuid) return { ok: true, groupId: group.id || `group-${Date.now()}` }

    const { data, error } = await supabase
      .from('chat_groups')
      .insert({
        title: group.title,
        avatar_color: group.avatarColor || '#ff7a18',
        avatar_emoji: group.avatarEmoji || '🔥',
        avatar_image: group.avatarImage || null,
        creator_id: group.creatorId,
        admins_only: Boolean(group.adminsOnly),
        description: group.description || '',
      })
      .select('id')
      .single()

    if (error) return { ok: false, error: error.message }
    const groupId = data?.id

    // Добавляем создателя как владельца (owner)
    if (groupId) {
      const membersToInsert = Array.from(new Set([group.creatorId, ...group.memberIds]))
        .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        .map((userId) => ({
          group_id: groupId,
          user_id: userId,
          role: userId === group.creatorId ? 'owner' : 'member',
        }))

      if (membersToInsert.length > 0) {
        await supabase.from('chat_group_members').insert(membersToInsert)
      }
    }

    return { ok: true, groupId }
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
  if (!supabase || !groupId) return { ok: true }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId)
    if (!isUuid) return { ok: true }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (patch.title !== undefined) updateData.title = patch.title
    if (patch.avatarColor !== undefined) updateData.avatar_color = patch.avatarColor
    if (patch.avatarEmoji !== undefined) updateData.avatar_emoji = patch.avatarEmoji
    if (patch.avatarImage !== undefined) updateData.avatar_image = patch.avatarImage
    if (patch.adminsOnly !== undefined) updateData.admins_only = patch.adminsOnly
    if (patch.description !== undefined) updateData.description = patch.description

    const { error } = await supabase.from('chat_groups').update(updateData).eq('id', groupId)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка обновления группы' }
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
