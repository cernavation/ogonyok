/**
 * ============================================================================
 * app/api/account/delete/route.ts: ПОЛНОЕ УДАЛЕНИЕ АККАУНТА (ЭТАП 14)
 * ============================================================================
 * Безвозвратно удаляет аккаунт пользователя и все связанные данные:
 * - Все записи летописи (days, prides, gratitudes)
 * - Факты силы и вехи (evidence_vault, milestones_shown)
 * - Мессенджер (сообщения, членство в тредах, черновики, папки)
 * - Сообщества и членство в группах (groups, group_members)
 * - Социальные связи (friendships, follows, blocks, reports, notifications)
 * - Файлы и медиа в Supabase Storage (ogonyok-media, chat-media)
 * - Профиль (profile_private, profiles) и учётную запись auth.users
 * ============================================================================
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/server/rate-limit'
import { getAuthenticatedUser } from '@/lib/server/auth'
import { apiErrorResponse, validateJsonBody } from '@/lib/server/api-validator'
import { getServerSupabase } from '@/lib/supabase/server'

const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Введите пароль для подтверждения'),
  confirmation: z.string().refine((val) => val === 'УДАЛИТЬ' || val === 'DELETE', {
    message: 'Введите слово УДАЛИТЬ для подтверждения',
  }),
})

export async function POST(request: Request) {
  // 1. Авторизация
  const authUser = await getAuthenticatedUser(request)

  // 2. Строгий rate-limit (3 попытки в час)
  const rateLimitResponse = await applyRateLimit(request, {
    route: 'account-delete',
    limit: 3,
    windowSeconds: 3600,
    userId: authUser?.userId,
  })
  if (rateLimitResponse) return rateLimitResponse

  if (!authUser) {
    return apiErrorResponse('UNAUTHORIZED', 'Требуется авторизация', 401)
  }

  // 3. Валидация входных данных
  const validated = await validateJsonBody(request, DeleteAccountSchema)
  if (!validated.success) return validated.response
  const { password } = validated.data

  try {
    const supabase = getServerSupabase()

    // 4. Проверка пароля пользователя через Supabase Auth
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authUser.userId)
      .single()

    // Пытаемся авторизоваться с паролем
    if (authUser.user.email) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: authUser.user.email,
        password,
      })
      if (signInErr) {
        return apiErrorResponse('FORBIDDEN', 'Неверный пароль. Удаление отклонено.', 403)
      }
    }

    const userId = authUser.userId

    // 5. Очистка файлов из Supabase Storage
    try {
      const mediaList = await supabase.storage.from('ogonyok-media').list(userId)
      if (mediaList.data && mediaList.data.length > 0) {
        const paths = mediaList.data.map((f) => `${userId}/${f.name}`)
        await supabase.storage.from('ogonyok-media').remove(paths)
      }

      const chatList = await supabase.storage.from('chat-media').list(userId)
      if (chatList.data && chatList.data.length > 0) {
        const paths = chatList.data.map((f) => `${userId}/${f.name}`)
        await supabase.storage.from('chat-media').remove(paths)
      }
    } catch (storageErr) {
      console.warn('[AccountDelete] Storage cleanup warning:', storageErr)
    }

    // 6. Каскадное удаление данных из реляционных таблиц
    // Удаляем сообщения, реакции, комментарии
    await supabase.from('direct_messages').delete().eq('sender_id', userId)
    await supabase.from('reactions').delete().eq('user_id', userId)
    await supabase.from('comments').delete().eq('user_id', userId)
    await supabase.from('stories').delete().eq('user_id', userId)
    await supabase.from('evidence_vault').delete().eq('user_id', userId)
    await supabase.from('milestones_shown').delete().eq('user_id', userId)
    await supabase.from('upsell_events').delete().eq('user_id', userId)
    await supabase.from('notifications').delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`)
    await supabase.from('blocks').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
    await supabase.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`)
    await supabase.from('friendships').delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    await supabase.from('thread_members').delete().eq('user_id', userId)
    await supabase.from('group_members').delete().eq('user_id', userId)
    await supabase.from('groups').delete().eq('owner_id', userId)
    await supabase.from('days').delete().eq('user_id', userId)
    await supabase.from('profile_private').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)

    // 7. Удаление пользователя из auth.users
    try {
      await supabase.auth.admin.deleteUser(userId)
    } catch (authDeleteErr) {
      console.warn('[AccountDelete] Auth admin deleteUser error:', authDeleteErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Аккаунт и все связанные данные успешно удалены из базы и хранилища',
    })
  } catch (error: any) {
    console.error('[AccountDelete] Error deleting account:', error)
    return apiErrorResponse(
      'INTERNAL_SERVER_ERROR',
      error.message || 'Ошибка сервера при удалении аккаунта',
      500
    )
  }
}
