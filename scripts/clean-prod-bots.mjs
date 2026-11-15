import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// 1. Загрузка переменных окружения из .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const activeKey = serviceRoleKey || anonKey

if (!supabaseUrl || !activeKey) {
  console.error('❌ Ошибка: переменные NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не найдены!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, activeKey, {
  auth: { persistSession: false },
})

const PROTECTED_USERNAMES = new Set(['cernavation', 'ilonmusk'])

const BOT_USERNAME_PREFIXES = ['guard_', 'bot_', 'test_', 'user_', 'qa_', 'anon_']
const BOT_DISPLAY_NAMES = new Set(['Пустой Профиль', 'Алексей Тест', 'Страж Основной', 'Собеседник'])

function isBotProfile(profile) {
  const username = (profile.username || '').toLowerCase()
  const displayName = profile.display_name || ''

  // КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО трогать реальные аккаунты cernavation и ilonmusk
  if (PROTECTED_USERNAMES.has(username)) {
    return false
  }

  for (const prefix of BOT_USERNAME_PREFIXES) {
    if (username.startsWith(prefix)) {
      return true
    }
  }

  if (BOT_DISPLAY_NAMES.has(displayName)) {
    return true
  }

  return false
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('   ОГОНЁК: ЛИКВИДАЦИЯ ТЕСТОВЫХ БОТОВ И СИНХРОНИЗАЦИЯ ULTRA     ')
  console.log('═══════════════════════════════════════════════════════════════\n')

  // 1. Получаем все профили
  const { data: allProfiles, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')

  if (fetchErr) {
    console.error('❌ Ошибка получения profiles:', fetchErr)
    process.exit(1)
  }

  console.log(`Всего профилей в базе: ${allProfiles.length}`)

  const botsToDelete = allProfiles.filter(isBotProfile)
  const realProfiles = allProfiles.filter((p) => !isBotProfile(p))

  console.log(`Найдено тестовых ботов для удаления: ${botsToDelete.length}`)
  console.log(`Реальных пользователей (защищены от удаления): ${realProfiles.length}`)
  realProfiles.forEach((p) => console.log(`  ✓ Сохраняем: @${p.username} (${p.display_name}) [id: ${p.id}]`))

  const botIds = botsToDelete.map((b) => b.id)

  if (botIds.length > 0) {
    console.log('\n--- ОЧИСТКА СВЯЗАННЫХ ТАБЛИЦ ДЛЯ БОТОВ ---')

    // 1. days
    const { error: daysErr } = await supabase
      .from('days')
      .delete()
      .in('user_id', botIds)
    if (daysErr) console.warn('Предупреждение при удалении days:', daysErr.message)
    else console.log('✓ days очищены')

    // 2. prides
    const { error: pridesErr } = await supabase
      .from('prides')
      .delete()
      .in('user_id', botIds)
    if (pridesErr) console.warn('Предупреждение при удалении prides:', pridesErr.message)
    else console.log('✓ prides очищены')

    // 3. gratitudes
    const { error: gratsErr } = await supabase
      .from('gratitudes')
      .delete()
      .in('user_id', botIds)
    if (gratsErr) console.warn('Предупреждение при удалении gratitudes:', gratsErr.message)
    else console.log('✓ gratitudes очищены')

    // 4. friendships
    try {
      await supabase.from('friendships').delete().in('user_id', botIds)
      await supabase.from('friendships').delete().in('friend_id', botIds)
      console.log('✓ friendships очищены')
    } catch (err) {
      console.warn('Предупреждение friendships:', err.message)
    }

    // 5. direct_messages
    try {
      await supabase.from('direct_messages').delete().in('user_id', botIds)
      await supabase.from('direct_messages').delete().in('author_id', botIds)
      await supabase.from('direct_messages').delete().in('recipient_id', botIds)
      console.log('✓ direct_messages очищены')
    } catch (err) {
      console.warn('Предупреждение direct_messages:', err.message)
    }

    // 6. messages (дублирующая/legacy таблица если есть)
    try {
      await supabase.from('messages').delete().in('user_id', botIds)
      await supabase.from('messages').delete().in('author_id', botIds)
      await supabase.from('messages').delete().in('recipient_id', botIds)
    } catch {}

    // 7. Удаление самих профилей из public.profiles
    console.log('\n--- УДАЛЕНИЕ БОТОВ ИЗ public.profiles ---')
    for (const bot of botsToDelete) {
      const { error: delProfileErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', bot.id)

      if (delProfileErr) {
        console.error(`❌ Ошибка удаления профиля @${bot.username} (${bot.id}):`, delProfileErr.message)
      } else {
        console.log(`✓ Удалён профиль бота: @${bot.username} (${bot.display_name})`)
      }

      // Удаление из auth.users если есть права service role
      if (serviceRoleKey) {
        try {
          await supabase.auth.admin.deleteUser(bot.id)
        } catch {}
      }
    }
  }

  // 2. Гарантированное обновление тарифа Ultra для cernavation
  console.log('\n--- СИНХРОНИЗАЦИЯ ТАРИФА ULTRA ДЛЯ @cernavation ---')
  const { data: updatedCerna, error: updateErr } = await supabase
    .from('profiles')
    .update({
      subscription_tier: 'ultra',
      verified: true,
      level: 5,
      streak_count: 740,
      streak: 740,
    })
    .eq('username', 'cernavation')
    .select()

  if (updateErr) {
    console.error('❌ Ошибка обновления cernavation:', updateErr)
  } else {
    console.log('✓ Успешно обновлён профиль @cernavation:', updatedCerna)
  }

  // 3. Вывод точного списка оставшихся профилей в public.profiles
  console.log('\n===============================================================')
  console.log('       ИТОГОВЫЙ СПИСОК ОСТАВШИХСЯ ПРОФИЛЕЙ В public.profiles   ')
  console.log('===============================================================')
  const { data: finalProfiles, error: finalErr } = await supabase
    .from('profiles')
    .select('id, username, display_name, subscription_tier, streak_count, level, verified')
    .order('username', { ascending: true })

  if (finalErr) {
    console.error('❌ Ошибка чтения финальных профилей:', finalErr)
  } else {
    console.table(finalProfiles)
    console.log(`Всего оставшихся реальных профилей: ${finalProfiles.length}`)
  }
}

main().catch((err) => {
  console.error('Непредвиденная ошибка:', err)
  process.exit(1)
})
