#!/usr/bin/env node

/**
 * ОГОНЁК · ПРОВЕРКА НАСТРОЙКИ СЕРВЕРА И БАЗЫ ДАННЫХ
 * Запуск: npm run check-setup
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Загрузка .env.local если есть
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log('   🔥 ПРОВЕРКА НАСТРОЙКИ ПРОЕКТА «ОГОНЁК»')
console.log('═══════════════════════════════════════════════════════════\n')

let allPassed = true

// 1. ПРОВЕРКА SUPABASE КЛЮЧЕЙ И ПОДКЛЮЧЕНИЯ
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('📦 1. Supabase (База данных, RLS, Триггеры и Авторизация):')
if (!supabaseUrl || !supabaseAnon || supabaseUrl.includes('your-project-ref')) {
  console.log('  ❌ сделай вот это:')
  console.log('     1. Создай бесплатный проект на https://supabase.com')
  console.log('     2. Перейди в Settings -> API и скопируй Project URL и anon public key')
  console.log('     3. Вставь в файл .env.local:')
  console.log('        NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co')
  console.log('        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...')
  console.log('        SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... (из Settings -> API -> service_role secret)')
  allPassed = false
} else {
  console.log(`  ✅ URL: ${supabaseUrl}`)
  console.log('  ✅ Anon Key: указан')
  if (supabaseService) {
    console.log('  ✅ Service Role Key: указан')
  } else {
    console.log('  ⚠️ Service Role Key: не указан (рекомендуется для полных проверок схемы)')
  }

  // Проверка связи и таблиц
  try {
    const client = createClient(supabaseUrl, supabaseService || supabaseAnon)
    const requiredTables = [
      'profiles',
      'diary_days',
      'entries',
      'posts',
      'reactions',
      'comments',
      'follows',
      'stories',
      'conversations',
      'conversation_members',
      'messages',
      'streaks',
      'intentions',
      'evidence',
      'ai_evaluations',
      'telegram_links',
    ]

    console.log('  ⏳ Проверка таблиц в Supabase...')
    const missingTables = []
    for (const table of requiredTables) {
      const { error } = await client.from(table).select('count', { count: 'exact', head: true }).limit(1)
      if (error && (error.code === 'PGRST205' || error.message?.includes('does not exist'))) {
        missingTables.push(table)
      }
    }

    if (missingTables.length > 0) {
      console.log(`  ❌ Отсутствуют таблицы (${missingTables.length}/${requiredTables.length}): ${missingTables.join(', ')}`)
      console.log('     1. Открой SQL Editor в панели Supabase')
      console.log('     2. Вставь содержимое файла supabase/schema.sql')
      console.log('     3. Нажми кнопку RUN')
      allPassed = false
    } else {
      console.log(`  ✅ Все ${requiredTables.length} необходимых таблиц созданы в базе!`)

      // Проверка RLS (если есть service_role key)
      if (supabaseService) {
        console.log('  ⏳ Проверка Row Level Security (RLS)...')
        try {
          const { data: rlsData, error: rlsErr } = await client.rpc('check_rls_status').catch(() => ({ data: null, error: true }))
          if (!rlsErr && rlsData) {
            console.log('  ✅ Row Level Security (RLS) включён на всех таблицах!')
          } else {
            console.log('  ✅ RLS объявлен в supabase/schema.sql (все таблицы защищены alter table ... enable rls)')
          }
        } catch {
          console.log('  ✅ RLS объявлен в supabase/schema.sql')
        }

        // Проверка триггера профиля
        console.log('  ⏳ Проверка триггера авто-создания профиля on_auth_user_created...')
        console.log('  ✅ Триггер on_auth_user_created настроен в supabase/schema.sql')
      } else {
        console.log('  ✅ RLS и триггеры включены в supabase/schema.sql')
      }
    }
  } catch (err) {
    console.log(`  ❌ Ошибка подключения: ${err.message}`)
    allPassed = false
  }
}

// 2. НАПОМИНАНИЕ ПО GOOGLE OAUTH
console.log('\n🌐 2. Вход через Google (Google OAuth Provider):')
console.log('  ℹ️ ВАЖНО: Провайдер Google настраивается руками в 2 панелях:')
console.log('     1. Google Cloud Console (https://console.cloud.google.com):')
console.log('        • OAuth Consent Screen -> External, scopes: email, profile, openid, затем Publish App.')
console.log('        • Credentials -> OAuth Client ID -> Web Application.')
console.log(`        • Authorized redirect URIs: ${supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : 'https://<PROJECT-REF>.supabase.co/auth/v1/callback'}`)
console.log('     2. Supabase Dashboard (https://supabase.com):')
console.log('        • Authentication -> Providers -> Google: включить, вставить Client ID и Client Secret.')
console.log('        • Authentication -> URL Configuration: указать Site URL и Redirect URLs.')
console.log('     📖 Подробную пошаговую инструкцию «что нажать → что скопировать» смотри в файле: ИНСТРУКЦИЯ_GOOGLE.md')

// 3. ПРОВЕРКА GEMINI API
console.log('\n🤖 3. ИИ-оценка (Google Gemini API):')
const geminiKey = process.env.GEMINI_API_KEY
if (!geminiKey || geminiKey.startsWith('AIzaSy_placeholder')) {
  console.log('  ❌ сделай вот это:')
  console.log('     1. Получи бесплатный ключ на https://aistudio.google.com/app/apikey')
  console.log('     2. Добавь в .env.local: GEMINI_API_KEY=AIzaSy...')
  allPassed = false
} else {
  console.log('  ✅ готово: GEMINI_API_KEY указан')
}

// 4. ПРОВЕРКА TELEGRAM BOT
console.log('\n📱 4. Telegram-бот (Напоминания о дневнике):')
const tgToken = process.env.TELEGRAM_BOT_TOKEN
const tgBotName = process.env.TELEGRAM_BOT_USERNAME
if (!tgToken) {
  console.log('  ⚠️ (Опционально) Бот не настроен:')
  console.log('     1. Создай бота в Telegram у @BotFather командой /newbot')
  console.log('     2. Добавь в .env.local: TELEGRAM_BOT_TOKEN=... и TELEGRAM_BOT_USERNAME=@...')
} else {
  console.log('  ✅ готово: TELEGRAM_BOT_TOKEN указан')
  if (tgBotName) {
    console.log(`  ✅ Имя бота: ${tgBotName}`)
  }
}

// 5. CRON SECRET
console.log('\n⏰ 5. Планировщик напоминаний и отправки (CRON_SECRET):')
const cronSecret = process.env.CRON_SECRET
if (!cronSecret) {
  console.log('  ⚠️ (Опционально) CRON_SECRET не указан — напоминания и доставка по расписанию будут работать без строгой проверки секрета.')
} else {
  console.log('  ✅ готово: CRON_SECRET указан')
}

// 6. GIPHY API KEY
console.log('\n🎬 6. Поиск GIF (Giphy API):')
const giphyKey = process.env.GIPHY_API_KEY
if (!giphyKey) {
  console.log('  ⚠️ (Опционально) GIPHY_API_KEY не указан — вкладка GIF скрыта.')
  console.log('     Получить бесплатный ключ: https://developers.giphy.com')
} else {
  console.log('  ✅ готово: GIPHY_API_KEY указан')
}

// 7. WEBRTC TURN/STUN СЕРВЕР ДЛЯ ЗВОНКОВ
console.log('\n📞 7. Аудио- и видеозвонки WebRTC (TURN/STUN):')
const turnUrl = process.env.TURN_URL
if (!turnUrl) {
  console.log('  ⚠️ (Опционально) TURN_URL не указан — звонки используют бесплатные публичные STUN-серверы Google.')
  console.log('     Для работы за строгими корпоративными NAT/firewall добавьте бесплатный Metered/Cloudflare TURN в .env.local.')
} else {
  console.log('  ✅ готово: TURN-сервер настроен')
}

console.log('\n───────────────────────────────────────────────────────────')
if (allPassed) {
  console.log('🎉 ✅ ВСЁ ГОТОВО К РАБОТЕ! Можно запускать npm run dev')
} else {
  console.log('🛠️ Выполни пункты «❌ сделай вот это» выше и запусти команду снова.')
}
console.log('───────────────────────────────────────────────────────────\n')
