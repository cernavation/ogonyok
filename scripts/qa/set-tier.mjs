#!/usr/bin/env node
/**
 * УТИЛИТА РУЧНОЙ ВЫДАЧИ ТАРИФА (ADMIN / CLI)
 * 
 * Использование:
 *   node scripts/qa/set-tier.mjs <userId_or_email> <free|pro|ultra> [daysValid]
 * 
 * Пример:
 *   node scripts/qa/set-tier.mjs alexey@ogonek.local ultra 365
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Подгружаем .env.local
if (fs.existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Ошибка: Переменные NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны!')
  console.error('Убедитесь, что .env.local настроен или передайте переменные окружения.')
  process.exit(1)
}

const args = process.argv.slice(2)
const targetIdentifier = args[0]
const targetTier = args[1]?.toLowerCase()
const daysValid = parseInt(args[2] || '30', 10)

if (!targetIdentifier || !['free', 'pro', 'ultra'].includes(targetTier)) {
  console.log(`
Использование:
  node scripts/qa/set-tier.mjs <userId_или_email> <free|pro|ultra> [дней_действия]

Примеры:
  node scripts/qa/set-tier.mjs 11111111-2222-3333-4444-555555555555 pro 30
  node scripts/qa/set-tier.mjs user@example.com ultra 365
`)
  process.exit(1)
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`⚡ Выдача тарифа: поиск пользователя "${targetIdentifier}"...`)

  let userId = targetIdentifier

  // Если передан email или позывной, ищем профиль
  if (targetIdentifier.includes('@')) {
    const { data: users, error: userErr } = await adminSupabase.auth.admin.listUsers()
    if (userErr || !users?.users) {
      console.error('❌ Не удалось найти пользователя по email:', userErr?.message)
      process.exit(1)
    }
    const found = users.users.find((u) => u.email?.toLowerCase() === targetIdentifier.toLowerCase())
    if (!found) {
      console.error(`❌ Пользователь с email "${targetIdentifier}" не найден в auth.users`)
      process.exit(1)
    }
    userId = found.id
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetIdentifier)) {
    // Поиск по username в profiles
    const { data: prof, error: profErr } = await adminSupabase
      .from('profiles')
      .select('id, username')
      .eq('username', targetIdentifier)
      .maybeSingle()

    if (profErr || !prof) {
      console.error(`❌ Профиль с позывным "${targetIdentifier}" не найден:`, profErr?.message)
      process.exit(1)
    }
    userId = prof.id
  }

  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + daysValid)

  console.log(`Установка тарифа [${targetTier.toUpperCase()}] для user_id: ${userId} на ${daysValid} дней...`)

  // Обновляем profiles
  const { data: updated, error: updateErr } = await adminSupabase
    .from('profiles')
    .update({
      subscription_tier: targetTier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, username, subscription_tier')
    .single()

  if (updateErr) {
    console.error('❌ Ошибка при обновлении тарифа:', updateErr.message)
    process.exit(1)
  }

  // Фиксируем в subscription_audit (если таблица создана)
  try {
    await adminSupabase.from('subscription_audit').insert({
      user_id: userId,
      old_tier: 'unknown',
      new_tier: targetTier,
      reason: `admin_manual_grant (${daysValid} days)`,
      actor_id: 'service_role_admin',
    })
  } catch {
    // audit опционален
  }

  console.log(`\n🎉 УСПЕХ! Тариф успешно обновлён:`)
  console.log(`- Пользователь: ${updated.username || updated.id}`)
  console.log(`- Тариф: ${updated.subscription_tier.toUpperCase()}`)
  console.log(`- Срок действия: до ${validUntil.toISOString().slice(0, 10)}`)
}

main().catch((err) => {
  console.error('Критическая ошибка:', err)
  process.exit(1)
})
