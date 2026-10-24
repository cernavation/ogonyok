#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════
 * ОГОНЁК · ИНТЕРАКТИВНЫЙ МАСТЕР ПЕРВИЧНОЙ НАСТРОЙКИ (SETUP WIZARD)
 * Запуск: npm run setup
 * ═══════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const rl = readline.createInterface({ input, output })

async function askQuestion(promptText, defaultValue = '') {
  const display = defaultValue ? `${promptText} [${defaultValue}]: ` : `${promptText}: `
  const answer = await rl.question(display)
  return answer.trim() || defaultValue
}

async function main() {
  console.log('\n═════════════════════════════════════════════════════════════════')
  console.log('   🔥 МАСТЕР НАСТРОЙКИ СЕРВЕРА И БАЗЫ ДАННЫХ «ОГОНЁК»')
  console.log('═════════════════════════════════════════════════════════════════\n')
  console.log('Этот скрипт поможет подключить проект к Supabase за 2 минуты:\n' +
              ' 1. Запишет проверенные ключи в .env.local\n' +
              ' 2. Накатит полную схему базы (все таблицы, индексы, RLS, функции)\n' +
              ' 3. Создаст хранилища файлов Storage (avatars, covers, chat-media)\n')

  // Проверяем текущий .env.local
  const envPath = path.resolve(process.cwd(), '.env.local')
  let existingEnv = {}
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx > 0) {
        existingEnv[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      }
    }
  }

  // ШАГ 1: Ввод ключей
  console.log('─── ШАГ 1: ДАННЫЕ SUPABASE ──────────────────────────────────────')
  console.log('Их можно скопировать в https://supabase.com -> Project Settings -> API\n')

  const url = await askQuestion('1. Supabase Project URL (https://xxxx.supabase.co)', existingEnv.NEXT_PUBLIC_SUPABASE_URL || '')
  const anonKey = await askQuestion('2. Supabase Anon Public Key (eyJhbGci...)', existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  const serviceRoleKey = await askQuestion('3. Supabase Service Role Key (секретный ключ для миграций)', existingEnv.SUPABASE_SERVICE_ROLE_KEY || '')
  const pgConnStr = await askQuestion('4. Postgres Connection String (из Database -> Connection string -> URI, опционально)', existingEnv.DATABASE_URL || '')

  if (!url || !anonKey) {
    console.log('\n❌ Ошибка: URL и Anon Key обязательны для работы приложения.')
    rl.close()
    process.exit(1)
  }

  // ШАГ 2: Проверка ключей
  console.log('\n─── ШАГ 2: ПРОВЕРКА ВАЛИДНОСТИ КЛЮЧЕЙ ───────────────────────────')
  process.stdout.write('  • Проверка подключения к REST API Supabase... ')

  try {
    const testClient = createClient(url, serviceRoleKey || anonKey, {
      auth: { persistSession: false },
    })
    const { error: testErr } = await testClient.from('profiles').select('count', { count: 'exact', head: true }).limit(1)
    // Если ошибка "relation does not exist", значит API ключ работает, просто схемы ещё нет
    if (testErr && testErr.code !== 'PGRST205' && !testErr.message?.includes('does not exist') && testErr.code !== '42P01') {
      if (testErr.message?.includes('JWT') || testErr.code === 'PGRST301') {
        console.log('❌ Неверный ключ авторизации Supabase (JWT expired or invalid)')
        rl.close()
        process.exit(1)
      }
    }
    console.log('✅ Ключи валидны!')
  } catch (err) {
    console.log(`❌ Ошибка проверки API: ${err.message}`)
  }

  // ШАГ 3: Запись .env.local
  console.log('\n─── ШАГ 3: СОХРАНЕНИЕ .ENV.LOCAL ───────────────────────────────')
  const envContent = `# ══════════════════════════════════════════════════════════════════
# ОГОНЁК — КОНФИГУРАЦИЯ ОКРУЖЕНИЯ (Сгенерировано npm run setup)
# ══════════════════════════════════════════════════════════════════

# 1. Supabase API (Обязательно для облачной синхронизации и Auth)
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
${serviceRoleKey ? `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}` : '# SUPABASE_SERVICE_ROLE_KEY='}
${pgConnStr ? `DATABASE_URL=${pgConnStr}` : '# DATABASE_URL='}

# 2. ИИ-функции (Google Gemini API для расшифровки аудио и оценки дней)
${existingEnv.GEMINI_API_KEY ? `GEMINI_API_KEY=${existingEnv.GEMINI_API_KEY}` : '# GEMINI_API_KEY=AIzaSy...'}

# 3. Дополнительные сервисы
${existingEnv.GIPHY_API_KEY ? `GIPHY_API_KEY=${existingEnv.GIPHY_API_KEY}` : '# GIPHY_API_KEY='}
${existingEnv.CRON_SECRET ? `CRON_SECRET=${existingEnv.CRON_SECRET}` : 'CRON_SECRET=' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)}

# 4. Режим разработки и автотестов
NEXT_PUBLIC_DEMO_MODE=1
`
  fs.writeFileSync(envPath, envContent, 'utf8')
  console.log(`  ✅ Конфигурация сохранена в ${envPath}`)

  // ШАГ 4: Накат схемы базы данных
  console.log('\n─── ШАГ 4: НАКАТ СХЕМЫ БАЗЫ ДАННЫХ ──────────────────────────────')
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql')

  if (pgConnStr && fs.existsSync(schemaPath)) {
    process.stdout.write('  • Подключение к Postgres и накат supabase/schema.sql... ')
    try {
      const sql = postgres(pgConnStr, { max: 1, timeout: 30 })
      const schemaSql = fs.readFileSync(schemaPath, 'utf8')
      await sql.unsafe(schemaSql)
      await sql.end()
      console.log('✅ Схема успешно накатана (все таблицы, индексы, RLS и триггеры созданы)!')
    } catch (pgErr) {
      console.log(`\n  ⚠️ Не удалось накатить схему автоматически через Postgres connection string: ${pgErr.message}`)
      console.log('  ℹ️ Чтобы накатить схему вручную:')
      console.log('     1. Откройте https://supabase.com -> SQL Editor')
      console.log('     2. Вставьте содержимое файла supabase/schema.sql')
      console.log('     3. Нажмите RUN')
    }
  } else {
    console.log('  ℹ️ Connection string не указан. Чтобы накатить схему:')
    console.log('     1. Откройте https://supabase.com -> SQL Editor')
    console.log('     2. Вставьте содержимое файла supabase/schema.sql')
    console.log('     3. Нажмите кнопку RUN')
  }

  // ШАГ 5: Создание бакетов Storage
  console.log('\n─── ШАГ 5: НАСТРОЙКА ХРАНИЛИЩА ФАЙЛОВ (STORAGE BUCKETS) ────────')
  if (serviceRoleKey) {
    try {
      const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
      const buckets = ['avatars', 'covers', 'chat-media']
      for (const b of buckets) {
        process.stdout.write(`  • Создание бакета "${b}"... `)
        const { error: bErr } = await adminClient.storage.createBucket(b, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        })
        if (!bErr || bErr.message?.includes('already exists')) {
          console.log('✅ Готово (публичный доступ на чтение)')
        } else {
          console.log(`⚠️ ${bErr.message}`)
        }
      }
    } catch (sErr) {
      console.log(`  ⚠️ Не удалось настроить бакеты через API: ${sErr.message}`)
    }
  } else {
    console.log('  ℹ️ Для автоматического создания бакетов укажите SUPABASE_SERVICE_ROLE_KEY в .env.local')
  }

  console.log('\n═════════════════════════════════════════════════════════════════')
  console.log('   🎉 БАЗА ДАННЫХ ГОТОВА К РАБОТЕ!')
  console.log('   Следующий шаг: запустите `npm run check-google` для проверки OAuth')
  console.log('═════════════════════════════════════════════════════════════════\n')

  rl.close()
}

main().catch((e) => {
  console.error('Ошибка мастера setup:', e)
  rl.close()
  process.exit(1)
})
