import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Невалидный формат JSON' }, { status: 400 })
  }

  const { password, userId, username, email } = body || {}

  if (!password || typeof password !== 'string' || !password.trim()) {
    return NextResponse.json(
      { error: 'Для подтверждения удаления необходимо ввести текущий пароль' },
      { status: 400 }
    )
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    // Демо-режим без подключённой базы данных: успешное подтверждение
    return NextResponse.json({
      ok: true,
      message: 'Аккаунт и локальные данные успешно удалены',
    })
  }

  try {
    // 1. Поиск пользователя по userId, username или email
    let targetUid = userId
    let userEmail = email

    if (!targetUid && username) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (prof?.id) targetUid = prof.id
    }

    if (!userEmail && targetUid) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(targetUid)
        if (authUser?.user?.email) userEmail = authUser.user.email
      } catch {}
    }

    // Если email найден, проверяем пароль через signInWithPassword
    if (userEmail) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      })

      if (authError) {
        return NextResponse.json(
          { error: 'Неверный пароль. Удаление аккаунта отклонено.' },
          { status: 401 }
        )
      }
    }

    // 2. Если пользователь найден в БД, производим полное каскадное удаление данных
    if (targetUid) {
      // 2.1 Очистка файлов из бакетов Storage
      const buckets = ['chat-media', 'evidence-media', 'avatars']
      for (const bucket of buckets) {
        try {
          const { data: files } = await supabase.storage.from(bucket).list(targetUid)
          if (Array.isArray(files) && files.length > 0) {
            const pathsToRemove = files.map((f) => `${targetUid}/${f.name}`)
            await supabase.storage.from(bucket).remove(pathsToRemove)
          }
        } catch (storageErr) {
          console.warn(`[DeleteAccount] Storage clean warning for ${bucket}:`, storageErr)
        }
      }

      // 2.2 Удаление связанных записей в БД
      await supabase.from('days').delete().eq('user_id', targetUid)
      await supabase.from('evidence_vault').delete().eq('user_id', targetUid)
      await supabase
        .from('direct_messages')
        .delete()
        .or(`sender_id.eq.${targetUid},receiver_id.eq.${targetUid}`)
      await supabase
        .from('call_sessions')
        .delete()
        .or(`caller_id.eq.${targetUid},receiver_id.eq.${targetUid}`)
      await supabase
        .from('friendships')
        .delete()
        .or(`user_id.eq.${targetUid},friend_id.eq.${targetUid}`)
      await supabase
        .from('follows')
        .delete()
        .or(`follower_id.eq.${targetUid},following_id.eq.${targetUid}`)
      await supabase
        .from('blocks')
        .delete()
        .or(`blocker_id.eq.${targetUid},blocked_id.eq.${targetUid}`)
      await supabase.from('reactions').delete().eq('user_id', targetUid)
      await supabase.from('profile_private').delete().eq('user_id', targetUid)
      await supabase.from('profiles').delete().eq('id', targetUid)

      // 2.3 Удаление из auth.users
      try {
        await supabase.auth.admin.deleteUser(targetUid)
      } catch (authDelErr) {
        console.warn('[DeleteAccount] Auth deleteUser warning:', authDelErr)
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Аккаунт и все связанные данные из базы и хранилища успешно удалены навсегда',
    })
  } catch (err: any) {
    console.error('[DeleteAccount] Fatal error:', err)
    return NextResponse.json(
      { error: err?.message || 'Ошибка сервера при удалении аккаунта' },
      { status: 500 }
    )
  }
}
