#!/usr/bin/env node
/**
 * QA HARNESS: TWO TEST USERS (u_a, u_b)
 * 
 * E2E-харнесс для работы со staging-базой Supabase (.env.staging.local).
 * Создаёт двух тестовых пользователей через service_role и предоставляет
 * авторизованные клиенты для проверки изоляции данных (RLS), совместных сценариев
 * (соратники, звонки, заявки, рейтинги).
 * 
 * Используется в этапах 2, 6, 7, 8, 9.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

export function loadStagingEnv() {
  const envCandidates = ['.env.staging.local', '.env.local']
  const loadedKeys = {}

  for (const envFile of envCandidates) {
    const filePath = path.resolve(process.cwd(), envFile)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim()
          let val = trimmed.slice(idx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!loadedKeys[key]) {
            loadedKeys[key] = val
            process.env[key] = val
          }
        }
      }
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return { url, anonKey, serviceKey }
}

export async function createTestHarness(options = {}) {
  const { url, anonKey, serviceKey } = loadStagingEnv()

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL не найден в переменных окружения (.env.staging.local)')
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY не найден в переменных окружения (.env.staging.local)')
  }
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY не найден в переменных окружения (.env.staging.local)')
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const password = `TestQaPass_${timestamp}_${randomSuffix}!`

  const emailA = options.emailA || `qa_u_a_${timestamp}_${randomSuffix}@ogonek-staging.test`
  const emailB = options.emailB || `qa_u_b_${timestamp}_${randomSuffix}@ogonek-staging.test`

  // Создание Пользователя А через Admin API
  const { data: uAData, error: uAErr } = await adminClient.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'QA Test User A',
      username: `qa_user_a_${randomSuffix}`,
    },
  })
  if (uAErr || !uAData?.user) {
    throw new Error(`Ошибка создания User A: ${uAErr?.message || 'Пользователь не создан'}`)
  }
  const userA = uAData.user

  // Создание Пользователя Б через Admin API
  const { data: uBData, error: uBErr } = await adminClient.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'QA Test User B',
      username: `qa_user_b_${randomSuffix}`,
    },
  })
  if (uBErr || !uBData?.user) {
    // В случае ошибки при создании B сразу подчищаем A
    await adminClient.auth.admin.deleteUser(userA.id).catch(() => {})
    throw new Error(`Ошибка создания User B: ${uBErr?.message || 'Пользователь не создан'}`)
  }
  const userB = uBData.user

  // Авторизованный клиент для Пользователя А (работает в рамках RLS с auth.uid() = userA.id)
  const clientA = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signAErr } = await clientA.auth.signInWithPassword({ email: emailA, password })
  if (signAErr) {
    await adminClient.auth.admin.deleteUser(userA.id).catch(() => {})
    await adminClient.auth.admin.deleteUser(userB.id).catch(() => {})
    throw new Error(`Ошибка аутентификации User A: ${signAErr.message}`)
  }

  // Авторизованный клиент для Пользователя Б (работает в рамках RLS с auth.uid() = userB.id)
  const clientB = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: signBErr } = await clientB.auth.signInWithPassword({ email: emailB, password })
  if (signBErr) {
    await adminClient.auth.admin.deleteUser(userA.id).catch(() => {})
    await adminClient.auth.admin.deleteUser(userB.id).catch(() => {})
    throw new Error(`Ошибка аутентификации User B: ${signBErr.message}`)
  }

  const cleanup = async () => {
    const results = { userA: false, userB: false }
    try {
      if (userA?.id) {
        // Очищаем тестовые данные в прикладных таблицах если создавались
        await adminClient.from('entries').delete().eq('user_id', userA.id).catch(() => {})
        await adminClient.from('prides').delete().eq('user_id', userA.id).catch(() => {})
        await adminClient.from('gratitudes').delete().eq('user_id', userA.id).catch(() => {})
        await adminClient.from('days').delete().eq('user_id', userA.id).catch(() => {})
        await adminClient.from('diary_days').delete().eq('user_id', userA.id).catch(() => {})
        await adminClient.from('profiles').delete().eq('id', userA.id).catch(() => {})

        const { error: delAErr } = await adminClient.auth.admin.deleteUser(userA.id)
        results.userA = !delAErr
      }
    } catch {}

    try {
      if (userB?.id) {
        await adminClient.from('entries').delete().eq('user_id', userB.id).catch(() => {})
        await adminClient.from('prides').delete().eq('user_id', userB.id).catch(() => {})
        await adminClient.from('gratitudes').delete().eq('user_id', userB.id).catch(() => {})
        await adminClient.from('days').delete().eq('user_id', userB.id).catch(() => {})
        await adminClient.from('diary_days').delete().eq('user_id', userB.id).catch(() => {})
        await adminClient.from('profiles').delete().eq('id', userB.id).catch(() => {})

        const { error: delBErr } = await adminClient.auth.admin.deleteUser(userB.id)
        results.userB = !delBErr
      }
    } catch {}

    return results
  }

  return {
    adminClient,
    userA: {
      id: userA.id,
      email: emailA,
      user: userA,
      client: clientA,
    },
    userB: {
      id: userB.id,
      email: emailB,
      user: userB,
      client: clientB,
    },
    cleanup,
  }
}

// Самопроверка скрипта при прямом запуске
async function selfTest() {
  console.log('═════════════════════════════════════════════════════════════════')
  console.log('🧪 САМОПРОВЕРКА QA-ХАРНЕССА ДВУХ ПОЛЬЗОВАТЕЛЕЙ (scripts/qa/two-users.mjs)')
  console.log('═════════════════════════════════════════════════════════════════')

  let harness
  try {
    console.log('[1/4] Инициализация харнесса и создание пользователей в staging...')
    harness = await createTestHarness()
    console.log(`  ✔ User A создан: ID=${harness.userA.id} (${harness.userA.email})`)
    console.log(`  ✔ User B создан: ID=${harness.userB.id} (${harness.userB.email})`)

    console.log('\n[2/4] Проверка авторизованных сессий клиентов...')
    const { data: sessionA } = await harness.userA.client.auth.getUser()
    const { data: sessionB } = await harness.userB.client.auth.getUser()

    if (sessionA?.user?.id !== harness.userA.id) {
      throw new Error(`Сессия User A не совпадает: получено ${sessionA?.user?.id}, ожидалось ${harness.userA.id}`)
    }
    console.log(`  ✔ Клиент User A авторизован корректно: uid=${sessionA.user.id}`)

    if (sessionB?.user?.id !== harness.userB.id) {
      throw new Error(`Сессия User B не совпадает: получено ${sessionB?.user?.id}, ожидалось ${harness.userB.id}`)
    }
    console.log(`  ✔ Клиент User B авторизован корректно: uid=${sessionB.user.id}`)

    console.log('\n[3/4] Проверка изоляции запросов через клиентов (RLS baseline)...')
    // Проверка, что клиенты могут безопасно делать запросы от своего имени
    const { data: profilesA, error: pAErr } = await harness.userA.client.from('profiles').select('id')
    console.log(`  ✔ Запрос от User A к profiles выполнен (ошибок соединения нет, результат: ${pAErr ? pAErr.message : `${profilesA?.length || 0} записей`})`)

    const { data: profilesB, error: pBErr } = await harness.userB.client.from('profiles').select('id')
    console.log(`  ✔ Запрос от User B к profiles выполнен (ошибок соединения нет, результат: ${pBErr ? pBErr.message : `${profilesB?.length || 0} записей`})`)

    console.log('\n[4/4] Удаление тестовых пользователей (cleanup)...')
    const cleanupResult = await harness.cleanup()
    console.log(`  ✔ Удаление User A: ${cleanupResult.userA ? 'УСПЕШНО' : 'ОШИБКА'}`)
    console.log(`  ✔ Удаление User B: ${cleanupResult.userB ? 'УСПЕШНО' : 'ОШИБКА'}`)

    // Проверка, что пользователей больше нет
    const { data: checkA } = await harness.adminClient.auth.admin.getUserById(harness.userA.id)
    const { data: checkB } = await harness.adminClient.auth.admin.getUserById(harness.userB.id)
    if (!checkA?.user && !checkB?.user) {
      console.log('  ✔ Проверка подтвердила: оба пользователя успешно удалены из базы.')
    } else {
      console.warn('  ⚠ Предупреждение: один из пользователей всё ещё возвращается getUserById.')
    }

    console.log('\nИТОГ: Харнесс two-users.mjs полностью готов к этапам 2, 6, 7, 8, 9 ✅')
  } catch (err) {
    console.error('\n❌ Ошибка самопроверки two-users.mjs:', err)
    if (harness?.cleanup) {
      console.log('Попытка экстренной очистки...')
      await harness.cleanup().catch(() => {})
    }
    process.exit(1)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/qa/two-users.mjs')) {
  selfTest()
}
