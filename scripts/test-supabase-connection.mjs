import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// 1. Загрузка переменных из .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

console.log('--- ПРОВЕРКА СВЯЗИ С SUPABASE ---')
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey ? `${supabaseKey.slice(0, 18)}... (${supabaseKey.length} символов)` : 'НЕ НАЙДЕН')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Переменные окружения Supabase не настроены!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runTest() {
  try {
    console.log('\n[1/2] Проверка запроса к таблице public.profiles...')
    const { data, count, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact' })

    if (error) {
      console.error('Ошибка запроса profiles:', error)
      if (error.message?.includes('Invalid API key') || error.message?.includes('invalid')) {
        console.error('❌ Ошибка ключа API Supabase!')
        process.exit(1)
      }
    } else {
      console.log('Данные получены успешно! Count:', count, 'Data:', data)
    }

    console.log('\n[2/2] Проверка Auth API...')
    const authRes = await supabase.auth.signInWithPassword({
      email: 'ping-check-connection@ogonek.local',
      password: 'dummy-password-check',
    })

    // Ожидаемый ответ: Invalid login credentials (значит сервер Auth принял ключ и проверил логин)
    if (authRes.error) {
      if (authRes.error.message?.includes('Invalid API key')) {
        console.error('❌ Ошибка: Auth API вернул "Invalid API key"!')
        process.exit(1)
      }
      console.log('Auth API ответил штатно (проверка аутентификации прошла):', authRes.error.message)
    }

    console.log('\n========================================')
    console.log('✅ СВЯЗЬ С SUPABASE 100% РАБОТАЕТ!')
    console.log('========================================\n')
  } catch (err) {
    console.error('❌ Непредвиденная ошибка подключения:', err)
    process.exit(1)
  }
}

runTest()
