#!/usr/bin/env node
/**
 * АДМИН-СКРИПТ: СМЕНА ТАРИФА ПОЛЬЗОВАТЕЛЯ («ОГОНЁК»)
 *
 * Использование:
 *   node scripts/admin/set-tier.mjs <username> <free|pro|ultra> <days> [--yes] [--reason="причина"]
 *
 * Безопасность:
 *   - Требует SUPABASE_SERVICE_ROLE_KEY из окружения.
 *   - Автоматически логирует смену в public.subscription_audit.
 *   - Для интерактивного режима запрашивает подтверждение. Флаг --yes для CI.
 */

import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline'
import fs from 'node:fs'
import path from 'node:path'

// Подгрузка окружения (.env.staging.local, .env.local, .env)
const envFiles = ['.env.staging.local', '.env.local', '.env']
for (const envFile of envFiles) {
  const filePath = path.resolve(process.cwd(), envFile)
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        let val = trimmed.slice(idx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl) {
  console.error('❌ ОШИБКА: NEXT_PUBLIC_SUPABASE_URL не настроен.')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error('❌ ОШИБКА: SUPABASE_SERVICE_ROLE_KEY обязателен для смены тарифа администратором.')
  console.error('   Клиентские ключи (anon) не имеют прав на изменение тарифа!')
  process.exit(1)
}

const args = process.argv.slice(2)
const nonFlagArgs = args.filter((a) => !a.startsWith('--'))
const flags = args.filter((a) => a.startsWith('--'))

const usernameArg = nonFlagArgs[0]
const tierArg = nonFlagArgs[1]?.toLowerCase()
const daysArg = parseInt(nonFlagArgs[2], 10)

const autoConfirm = flags.includes('--yes') || flags.includes('-y')
const reasonFlag = flags.find((f) => f.startsWith('--reason='))
const reason = reasonFlag ? reasonFlag.split('=')[1] : 'manual-admin-action'

if (!usernameArg || !tierArg || isNaN(daysArg)) {
  console.log(`
Использование:
  node scripts/admin/set-tier.mjs <username> <free|pro|ultra> <days> [--yes] [--reason="причина"]

Примеры:
  node scripts/admin/set-tier.mjs ivan pro 30 --reason="Оплата подписки картой"
  node scripts/admin/set-tier.mjs maria ultra 365 --yes
  node scripts/admin/set-tier.mjs alex free 0
`)
  process.exit(1)
}

const VALID_TIERS = ['free', 'pro', 'ultra']
if (!VALID_TIERS.includes(tierArg)) {
  console.error(`❌ Недопустимый тариф: "${tierArg}". Допустимы только: ${VALID_TIERS.join(', ')}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function confirmPrompt(question) {
  if (autoConfirm || !process.stdin.isTTY) return true
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes')
    })
  })
}

async function main() {
  const cleanUsername = usernameArg.replace(/^@/, '').toLowerCase()

  console.log('='.repeat(65))
  console.log('👑 ОГОНЁК: АДМИН-ПАНЕЛЬ УПРАВЛЕНИЯ ТАРИФОМ')
  console.log('='.repeat(65))

  // 1. Поиск профиля по username
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, username, display_name, subscription_tier, subscription_valid_until, verified')
    .ilike('username', cleanUsername)
    .maybeSingle()

  if (findError) {
    console.error(`❌ Ошибка запроса профиля: ${findError.message}`)
    process.exit(1)
  }

  if (!profile) {
    console.error(`❌ Пользователь с username "@${cleanUsername}" не найден в базе.`)
    process.exit(1)
  }

  const oldTier = profile.subscription_tier || 'free'
  const newTier = tierArg
  let validUntil = null

  if (newTier !== 'free' && daysArg > 0) {
    const d = new Date()
    d.setDate(d.getDate() + daysArg)
    validUntil = d.toISOString()
  }

  console.log(`Пользователь:      @${profile.username} (${profile.display_name || 'без имени'})`)
  console.log(`ID пользователя:   ${profile.id}`)
  console.log(`Текущий тариф:     ${oldTier.toUpperCase()} (до: ${profile.subscription_valid_until || 'бессрочно/free'})`)
  console.log(`Новый тариф:       ${newTier.toUpperCase()}`)
  console.log(`Срок действия:     ${validUntil ? `${daysArg} дн. (до ${validUntil})` : 'бессрочно / free'}`)
  console.log(`Причина смены:     ${reason}`)
  console.log('-'.repeat(65))

  const confirmed = await confirmPrompt('Применить изменения тарифа? (y/N): ')
  if (!confirmed) {
    console.log('Операция отменена пользователем.')
    process.exit(0)
  }

  const nowISO = new Date().toISOString()

  // 2. Обновление тарифа в profiles (через service_role)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: newTier,
      subscription_valid_until: validUntil,
      updated_at: nowISO,
    })
    .eq('id', profile.id)

  if (updateError) {
    console.error(`❌ Ошибка обновления тарифа: ${updateError.message}`)
    process.exit(1)
  }

  // 3. Запись в subscription_audit
  const { error: auditError } = await supabase.from('subscription_audit').insert({
    user_id: profile.id,
    old_tier: oldTier,
    new_tier: newTier,
    until: validUntil,
    changed_by: 'service_role:admin-cli',
    reason,
    created_at: nowISO,
  })

  if (auditError) {
    console.warn(`⚠️ Внимание: Тариф обновлен, но аудит-лог вернул ошибку: ${auditError.message}`)
  } else {
    console.log(`✔ Запись в subscription_audit успешно добавлена.`)
  }

  console.log('\n✅ ТАРИФ УСПЕШНО ОБНОВЛЁН!')
  console.log(`@${profile.username} теперь на тарифе ${newTier.toUpperCase()}.\n`)
}

main().catch((err) => {
  console.error('Непредвиденная ошибка:', err)
  process.exit(1)
})
