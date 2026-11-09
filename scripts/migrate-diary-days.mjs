#!/usr/bin/env node
/**
 * Скрипт миграции данных из устаревшей схемы (diary_days, entries)
 * в каноническую схему (days, prides, gratitudes).
 *
 * Безопасность:
 * - По умолчанию работает в режиме --dry-run.
 * - КАТЕГОРИЧЕСКИ запрещён запуск на боевой базе (производит строгую проверку окружения).
 * - Для выполнения реальной записи на staging требуется флаг: --execute --staging
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const isDryRun = !args.includes('--execute') && !args.includes('--apply')
const isStagingConfirmed = args.includes('--staging')

// Загрузка .env.staging.local при наличии
const stagingEnvPath = path.resolve(process.cwd(), '.env.staging.local')
if (fs.existsSync(stagingEnvPath)) {
  const content = fs.readFileSync(stagingEnvPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('='.repeat(70))
console.log('ОГОНЁК: Миграция данных diary_days/entries -> days/prides/gratitudes')
console.log('='.repeat(70))
console.log(`Режим: ${isDryRun ? '🔍 DRY RUN (холостой прогон, изменения НЕ вносятся)' : '⚡ EXECUTE (запись в БД)'}`)
console.log(`Supabase URL: ${supabaseUrl ? supabaseUrl.replace(/^(https:\/\/[^.]+).*/, '$1***') : '(не задан)'}`)

// ЗАЩИТА: запрет запуска на продакшене
if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
  console.error('\n❌ ОШИБКА БЕЗОПАСНОСТИ: Запуск скрипта в production-окружении запрещён!')
  process.exit(1)
}

if (!isDryRun && !isStagingConfirmed) {
  console.error('\n❌ ОШИБКА: Для реальной записи на staging укажите явный флаг --staging:')
  console.error('   node scripts/migrate-diary-days.mjs --execute --staging')
  process.exit(1)
}

if (!supabaseUrl || !serviceRoleKey) {
  console.log('\n⚠️ ВНИМАНИЕ: Переменные SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY не настроены.')
  console.log('   Скрипт выполняет статический симуляционный отчёт по логике миграции.\n')
  printSummary({
    scannedUsers: 0,
    scannedDiaryDays: 0,
    canonicalDaysExisting: 0,
    daysToMigrate: 0,
    pridesToMigrate: 0,
    gratitudesToMigrate: 0,
    isDryRun,
    status: 'NO_DB_CONNECTION',
  })
  process.exit(0)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function run() {
  const summary = {
    scannedUsers: 0,
    scannedDiaryDays: 0,
    canonicalDaysExisting: 0,
    daysToMigrate: 0,
    pridesToMigrate: 0,
    gratitudesToMigrate: 0,
    isDryRun,
    status: 'SUCCESS',
  }

  try {
    // 1. Проверяем наличие таблицы diary_days
    const { data: legacyDays, error: legacyErr } = await supabase
      .from('diary_days')
      .select('*')
      .order('day_number', { ascending: true })

    if (legacyErr) {
      console.log(`ℹ️ Таблица diary_days не найдена или недоступна: ${legacyErr.message}`)
      printSummary(summary)
      return
    }

    summary.scannedDiaryDays = legacyDays?.length || 0
    if (summary.scannedDiaryDays === 0) {
      console.log('ℹ️ Таблица diary_days пуста. Миграция не требуется.')
      printSummary(summary)
      return
    }

    // 2. Получаем существующие канонические days
    const { data: canonicalDays, error: canErr } = await supabase.from('days').select('*')
    if (canErr) {
      throw new Error(`Ошибка чтения days: ${canErr.message}`)
    }
    summary.canonicalDaysExisting = canonicalDays?.length || 0

    // Словарь существующих канонических дней: `${user_id}:${day_number}`
    const existingDaysSet = new Set(
      (canonicalDays || []).map((d) => `${d.user_id}:${d.day_number}`)
    )

    // 3. Выявляем недостающие дни
    const missingDays = (legacyDays || []).filter(
      (ld) => !existingDaysSet.has(`${ld.user_id}:${ld.day_number}`)
    )
    summary.daysToMigrate = missingDays.length

    const missingDayIds = missingDays.map((d) => d.id)

    // 4. Читаем записи для недостающих дней
    let legacyEntries = []
    if (missingDayIds.length > 0) {
      const { data: entriesData } = await supabase
        .from('entries')
        .select('*')
        .in('day_id', missingDayIds)

      legacyEntries = entriesData || []
    }

    summary.pridesToMigrate = legacyEntries.filter((e) => e.type === 'pride').length
    summary.gratitudesToMigrate = legacyEntries.filter((e) => e.type === 'gratitude').length

    // 5. Выполнение миграции (только если НЕ dry-run)
    if (!isDryRun && missingDays.length > 0) {
      for (const mDay of missingDays) {
        const { data: newDay, error: insErr } = await supabase
          .from('days')
          .insert({
            user_id: mDay.user_id,
            day_number: mDay.day_number,
            date: mDay.day_date || new Date().toISOString().slice(0, 10),
            closed_at: mDay.closed_at,
            status: mDay.closed_at ? 'closed' : 'open',
          })
          .select()
          .single()

        if (insErr || !newDay) {
          console.error(`Ошибка переноса дня ${mDay.day_number}:`, insErr)
          continue
        }

        const dayEntries = legacyEntries.filter((e) => e.day_id === mDay.id)
        for (const e of dayEntries) {
          if (e.type === 'pride') {
            await supabase.from('prides').insert({
              user_id: mDay.user_id,
              day_id: newDay.id,
              text: e.text,
              scale: e.score,
              comment: e.ai_comment,
              overcome: e.overcome || 0,
              visibility: e.visibility || 'private',
            })
          } else {
            await supabase.from('gratitudes').insert({
              user_id: mDay.user_id,
              day_id: newDay.id,
              text: e.text,
              visibility: e.visibility || 'private',
            })
          }
        }
      }
    }

    printSummary(summary)
  } catch (err) {
    summary.status = 'ERROR'
    summary.error = String(err)
    printSummary(summary)
  }
}

function printSummary(s) {
  console.log('\n--- ИТОГОВЫЙ ОТЧЁТ МИГРАЦИИ ДАННЫХ ---')
  console.log(`Статус:                    ${s.status}`)
  console.log(`Режим запуска:             ${s.isDryRun ? 'DRY-RUN (симуляция)' : 'EXECUTE'}`)
  console.log(`Строк diary_days:          ${s.scannedDiaryDays}`)
  console.log(`Существующих days:         ${s.canonicalDaysExisting}`)
  console.log(`Дней к переносу:           ${s.daysToMigrate}`)
  console.log(`Гордостей к переносу:      ${s.pridesToMigrate}`)
  console.log(`Благодарностей к переносу: ${s.gratitudesToMigrate}`)
  if (s.error) console.log(`Ошибка:                    ${s.error}`)
  console.log('-------------------------------------\n')
}

run()
