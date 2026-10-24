#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════
 * ОГОНЁК · ПРОВЕРКА И ИНСТРУКЦИЯ GOOGLE OAUTH
 * Запуск: npm run check-google
 * ═══════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Загрузка .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n═════════════════════════════════════════════════════════════════')
console.log('   🌐 ПРОВЕРКА АВТОРИЗАЦИИ GOOGLE OAUTH В SUPABASE')
console.log('═════════════════════════════════════════════════════════════════\n')

let projectRef = '<ВАШ-PROJECT-REF>'
if (url) {
  try {
    const u = new URL(url)
    projectRef = u.hostname.split('.')[0]
  } catch {}
}

const supabaseCallbackUrl = `${url ? url : 'https://' + projectRef + '.supabase.co'}/auth/v1/callback`

console.log(`📌 Твой проект Supabase: ${projectRef}`)
console.log(`📌 Supabase OAuth Callback: ${supabaseCallbackUrl}\n`)

let googleConfigured = false

if (url && anonKey) {
  try {
    const client = createClient(url, anonKey)
    // Проверяем генерацию ссылки Google Auth
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
      },
    })

    if (!error && data?.url) {
      if (data.url.includes('accounts.google.com') || data.url.includes('provider=google')) {
        console.log('  ✅ Вызов client.auth.signInWithOAuth({ provider: "google" }) успешно возвращает URL авторизации.')
        googleConfigured = true
      }
    } else if (error) {
      console.log(`  ⚠️ Статус провайдера Google: ${error.message}`)
    }
  } catch (e) {
    console.log(`  ⚠️ Ошибка проверки Google OAuth: ${e.message}`)
  }
} else {
  console.log('  ⚠️ Внимание: ключи Supabase не заданы в .env.local.')
}

console.log('\n─────────────────────────────────────────────────────────────────')
console.log('   📋 ЧЕК-ЛИСТ НАСТРОЙКИ GOOGLE OAUTH (ШАГ ЗА ШАГОМ)')
console.log('─────────────────────────────────────────────────────────────────\n')

console.log(`1. GOOGLE CLOUD CONSOLE (https://console.cloud.google.com):
   ┌─────────────────────────────────────────────────────────────┐
   │ 1.1. Открой: APIs & Services -> OAuth consent screen        │
   │      • User Type: External                                  │
   │      • App name: Огонёк                                     │
   │      • User support email & Developer contact: твой email   │
   │      • Scopes: .../auth/userinfo.email, profile, openid     │
   │      • Нажми "Publish App", чтобы убрать статус "Testing"   │
   │                                                             │
   │ 1.2. Открой: APIs & Services -> Credentials                 │
   │      • Нажми "+ CREATE CREDENTIALS" -> "OAuth client ID"    │
   │      • Application type: "Web application"                  │
   │      • Name: "Огонёк Web"                                   │
   │      • Authorized JavaScript origins:                       │
   │          - http://localhost:3000                            │
   │          - https://${projectRef}.supabase.co                │
   │      • Authorized redirect URIs (ОБЯЗАТЕЛЬНО скопируй!):    │
   │          👉 ${supabaseCallbackUrl}
   │                                                             │
   │ 1.3. Скопируй "Client ID" и "Client Secret".                │
   └─────────────────────────────────────────────────────────────┘\n`)

console.log(`2. SUPABASE DASHBOARD (https://supabase.com/dashboard/project/${projectRef}):
   ┌─────────────────────────────────────────────────────────────┐
   │ 2.1. Открой: Authentication -> Providers -> Google          │
   │      • Включи тумблер "Enable Sign in with Google"          │
   │      • Вставь Client ID из Google Cloud                     │
   │      • Вставь Client Secret из Google Cloud                 │
   │      • Нажми "Save"                                         │
   │                                                             │
   │ 2.2. Открой: Authentication -> URL Configuration            │
   │      • Site URL: http://localhost:3000 (или твой Vercel URL)│
   │      • Redirect URLs (добавь через "Add URL"):              │
   │          - http://localhost:3000/auth/callback              │
   │          - https://*.vercel.app/auth/callback               │
   │          - http://localhost:3000/**                         │
   │      • Нажми "Save"                                         │
   └─────────────────────────────────────────────────────────────┘\n`)

console.log('═════════════════════════════════════════════════════════════════')
if (googleConfigured) {
  console.log('   ✅ ПРОВАЙДЕР GOOGLE АКТИВЕН И ГОТОВ К РАБОТЕ')
} else {
  console.log('   ℹ️ Выполни 2 шага выше и запусти проверку снова: `npm run check-google`')
}
console.log('═════════════════════════════════════════════════════════════════\n')
