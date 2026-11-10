/**
 * МОДУЛЬ ГРУПП («СЕМЬЯ», «СПОРТСМЕНЫ») И АУДИТОРИИ ЗАПИСЕЙ (ЭТАП 9)
 * 
 * Управляет группами пользователя, инвайтами /g/[code], получением ленты группы
 * и публикацией отдельных записей в конкретные группы.
 */

import { getSupabase } from '@/lib/supabase/browser'
import type { OgonekGroup, GroupKind, VisibilityLevel, GroupMemberRole } from './types'

export interface GroupFeedItem {
  entryKind: 'pride' | 'gratitude'
  entryId: string
  dayId?: string | null
  userId: string
  authorName: string
  authorUsername?: string | null
  authorAvatar?: string | null
  text: string
  scale: number
  overcome: number
  createdAtISO: string
}

/** Получить список групп пользователя */
export async function listUserGroups(userId?: string): Promise<OgonekGroup[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  try {
    const { data, error } = await supabase.rpc('get_user_groups', {
      p_user_id: userId || null,
    })

    if (error) {
      console.warn('[listUserGroups] error:', error.message)
      return []
    }

    return (data || []).map((g: any) => ({
      id: g.id,
      ownerId: g.owner_id || '',
      name: g.name,
      kind: g.kind || 'custom',
      description: g.description || '',
      avatar: g.avatar || '👥',
      color: g.color || '#ff5c00',
      inviteCode: g.invite_code,
      inviteExpiresAt: g.invite_expires_at,
      role: g.role as GroupMemberRole,
      status: g.status,
      membersCount: Number(g.members_count || 1),
      threadId: g.thread_id,
      createdAtISO: g.created_at,
    }))
  } catch (err) {
    console.warn('[listUserGroups] failed:', err)
    return []
  }
}

/** Создать новую группу (с автоматическим чатом и проверкой тарифа) */
export async function createGroup(params: {
  name: string
  kind?: GroupKind
  description?: string
  avatar?: string
  color?: string
  initialMemberIds?: string[]
}): Promise<{ ok: boolean; groupId?: string; threadId?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'Нет подключения к базе' }

  try {
    const { data, error } = await supabase.rpc('create_group', {
      p_name: params.name.trim(),
      p_kind: params.kind || 'custom',
      p_description: (params.description || '').trim(),
      p_avatar: params.avatar || '👥',
      p_color: params.color || '#ff5c00',
      p_initial_member_ids: params.initialMemberIds || [],
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    return {
      ok: true,
      groupId: data?.group_id,
      threadId: data?.thread_id,
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка создания группы' }
  }
}

/** Пригласить пользователя в группу или сгенерировать инвайт-ссылку */
export async function inviteToGroup(
  groupId: string,
  userId?: string
): Promise<{ ok: boolean; inviteCode?: string; expiresAt?: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !groupId) return { ok: false, error: 'Параметры не указаны' }

  try {
    const { data, error } = await supabase.rpc('invite_to_group', {
      p_group_id: groupId,
      p_user_id: userId || null,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    return {
      ok: true,
      inviteCode: data?.invite_code,
      expiresAt: data?.expires_at,
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка приглашения' }
  }
}

/** Вступить в группу по инвайт-коду (/g/[code]) */
export async function joinGroupByInvite(
  code: string
): Promise<{ ok: boolean; group?: any; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !code) return { ok: false, error: 'Код приглашения пуст' }

  try {
    const { data, error } = await supabase.rpc('join_group_by_invite', {
      p_code: code.trim(),
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, group: data }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка вступления в группу' }
  }
}

/** Покинуть группу */
export async function leaveGroup(groupId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !groupId) return { ok: false, error: 'Группа не указана' }

  try {
    const { data, error } = await supabase.rpc('leave_group', {
      p_group_id: groupId,
    })
    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: Boolean(data) }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка выхода из группы' }
  }
}

/** Исключить участника из группы */
export async function removeGroupMember(
  groupId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !groupId || !userId) return { ok: false, error: 'Параметры не указаны' }

  try {
    const { data, error } = await supabase.rpc('remove_member', {
      p_group_id: groupId,
      p_user_id: userId,
    })
    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: Boolean(data) }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка исключения участника' }
  }
}

/** Загрузить ленту записей группы */
export async function getGroupFeed(
  groupId: string,
  limit = 20,
  cursor?: string
): Promise<GroupFeedItem[]> {
  const supabase = getSupabase()
  if (!supabase || !groupId) return []

  try {
    const { data, error } = await supabase.rpc('get_group_feed', {
      p_group_id: groupId,
      p_limit: limit,
      p_cursor: cursor || null,
    })

    if (error) {
      console.warn('[getGroupFeed] error:', error.message)
      return []
    }

    return (data || []).map((row: any) => ({
      entryKind: row.entry_kind,
      entryId: row.entry_id,
      dayId: row.day_id,
      userId: row.user_id,
      authorName: row.author_name,
      authorUsername: row.author_username,
      authorAvatar: row.author_avatar,
      text: row.text,
      scale: row.scale,
      overcome: row.overcome,
      createdAtISO: row.created_at,
    }))
  } catch (err) {
    console.warn('[getGroupFeed] failed:', err)
    return []
  }
}

/** Обновить видимость и целевые группы для отдельной записи */
export async function updateEntryAudience(params: {
  entryKind: 'pride' | 'gratitude'
  entryId: string
  visibility: VisibilityLevel
  groupIds?: string[]
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase || !params.entryId) return { ok: false, error: 'Запись не найдена' }

  try {
    const { data, error } = await supabase.rpc('update_entry_audience', {
      p_entry_kind: params.entryKind,
      p_entry_id: params.entryId,
      p_visibility: params.visibility,
      p_group_ids: params.groupIds || [],
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка обновления аудитории' }
  }
}
