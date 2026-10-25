import { getSupabase } from './client'
import { canChangeLevel, evaluateDayClosing, getTargetDayForNewEntry, type DiaryDayRecord, type EntryType } from '../ogonek/diary-engine'

export interface ProfileRecord {
  id: string
  username: string
  display_name: string
  avatar_url?: string | null
  avatar_image?: string | null
  bio?: string | null
  city?: string | null
  level?: number
  level_changed_at?: string
  timezone?: string
  telegram_chat_id?: string | null
  reminder_times?: string[]
  in_leaderboard?: boolean
  streak?: number
  streak_count?: number
  is_anonymous?: boolean
  privacy?: { is_anonymous?: boolean; [key: string]: any }
  age?: number | null
  created_at?: string
  updated_at?: string
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

/**
 * Получить профиль пользователя по id или username
 */
export async function getProfile(userIdOrUsername: string): Promise<ProfileRecord | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername)
  let q = supabase.from('profiles').select('*')
  if (isUuid) {
    q = q.eq('id', userIdOrUsername)
  } else {
    q = q.eq('username', userIdOrUsername.replace(/^@/, ''))
  }
  const { data, error } = await q.maybeSingle()
  if (error || !data) return null
  const row = data as any
  return {
    ...row,
    avatar_url: row.avatar_image || row.avatar_url || null,
    avatar_image: row.avatar_image || row.avatar_url || null,
    streak: typeof row.streak_count === 'number' ? row.streak_count : (typeof row.streak === 'number' ? row.streak : 0),
    streak_count: typeof row.streak_count === 'number' ? row.streak_count : (typeof row.streak === 'number' ? row.streak : 0),
    is_anonymous: row.is_anonymous === true || row.privacy?.is_anonymous === true,
  } as ProfileRecord
}

/**
 * Поиск профилей по нику или имени напрямую в Supabase public.profiles
 */
export async function searchProfiles(query: string, currentUserIdOrUsername?: string): Promise<ProfileRecord[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const searchQuery = query.trim().replace(/^@/, '')
  if (!searchQuery) return getRecentProfiles(20, currentUserIdOrUsername)

  // Поиск участников делает реальный запрос к Supabase в таблицу public.profiles
  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_image, streak_count, is_anonymous')
    .ilike('username', `%${searchQuery}%`)
    .limit(30)

  if (error) {
    // Если колонка is_anonymous или streak_count не вынесена на верхний уровень, делаем select('*')
    const fallback = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(30)
    data = fallback.data
    error = fallback.error
  }

  if (error || !data) return []

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserIdOrUsername || '')

  const results: ProfileRecord[] = []
  for (const row of data as any[]) {
    // В поиске: если у профиля is_anonymous === true, он НЕ выдается в общем поиске для других пользователей
    const isAnon = row.is_anonymous === true || row.privacy?.is_anonymous === true
    if (isAnon) continue

    if (currentUserIdOrUsername) {
      if (isUuid && row.id === currentUserIdOrUsername) continue
      if (!isUuid && row.username?.toLowerCase() === currentUserIdOrUsername.toLowerCase()) continue
    }

    results.push({
      ...row,
      avatar_url: row.avatar_image || row.avatar_url || null,
      avatar_image: row.avatar_image || row.avatar_url || null,
      streak: typeof row.streak_count === 'number' ? row.streak_count : (typeof row.streak === 'number' ? row.streak : 0),
      streak_count: typeof row.streak_count === 'number' ? row.streak_count : (typeof row.streak === 'number' ? row.streak : 0),
      is_anonymous: false,
    })
  }

  return results
}

/**
 * Получение последних активных реальных пользователей из базы Supabase
 */
export async function getRecentProfiles(limit = 30, currentUserIdOrUsername?: string): Promise<ProfileRecord[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  try {
    let q = supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit + 5)

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserIdOrUsername || '')
    if (currentUserIdOrUsername && isUuid) {
      q = q.neq('id', currentUserIdOrUsername)
    }

    const { data, error } = await q
    if (error || !data) return []

    const results: ProfileRecord[] = []
    for (const row of data as any[]) {
      // Исключаем анонимных пользователей из общего списка
      const isAnon = row.is_anonymous === true || row.privacy?.is_anonymous === true
      if (isAnon) continue

      if (currentUserIdOrUsername && !isUuid) {
        if (row.username?.toLowerCase() === currentUserIdOrUsername.toLowerCase()) continue
      }

      results.push({
        ...row,
        avatar_url: row.avatar_image || row.avatar_url || null,
        avatar_image: row.avatar_image || row.avatar_url || null,
        streak: typeof row.streak_count === 'number' ? row.streak_count : (typeof row.streak === 'number' ? row.streak : 0),
        streak_count: typeof row.streak_count === 'number' ? row.streak_count : (typeof row.streak === 'number' ? row.streak : 0),
        is_anonymous: false,
      })
      if (results.length >= limit) break
    }

    return results
  } catch {
    return []
  }
}

/**
 * Список пользователей, на которых подписан текущий пользователь
 */
export async function getFollowing(userId: string): Promise<ProfileRecord[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('follows')
    .select('following_id, profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId)
    .eq('status', 'accepted')

  if (error || !data) return []
  return data
    .map((row: any) => row.profiles)
    .filter(Boolean) as ProfileRecord[]
}

/**
 * Подписаться на пользователя
 */
export async function followUser(followerId: string, followingId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }
  const { error } = await supabase.from('follows').insert({
    follower_id: followerId,
    following_id: followingId,
    status: 'accepted',
  })
  if (error) {
    if (error.message.includes('unique')) return { ok: true }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Отписаться от пользователя
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'База данных не подключена' }
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Проверить, подписан ли пользователь
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single()
  return Boolean(data)
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
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()
  if (error || !data) return null
  return data as ProfileRecord
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
