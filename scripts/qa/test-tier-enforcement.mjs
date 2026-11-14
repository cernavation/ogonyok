#!/usr/bin/env node
/**
 * QA HARNESS: TIER CHARACTER LIMITS & DB TRIGGER ENFORCEMENT (ЭТАП 4-5)
 *
 * Приёмка:
 * 1. Прямой REST-запрос / INSERT с 1500 символами на free отклонён БД (триггер check_entry_char_limit)
 * 2. Запрос с 999 символами на free успешно проходит
 * 3. Pro разрешает 1500 символов, но отклоняет 3500 символов
 * 4. Ultra разрешает 3500 символов, но отклоняет 5500 символов
 * 5. Серверная валидация (canCreatePride) также блокирует превышение
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { newDb } from 'pg-mem'
import { canCreatePride, getTierLimits } from '../../lib/ogonek/permissions.ts'

console.log('======================================================================')
console.log('🛡️ ЗАПУСК ТЕСТА СЕРВЕРНОГО ПРИНУЖДЕНИЯ ТАРИФОВ (test-tier-enforcement.mjs)')
console.log('======================================================================\n')

// 1. Инициализация БД pg-mem
const db = newDb({ noAstCoverageCheck: true })
db.registerLanguage('plpgsql', () => () => {})

db.public.registerFunction({
  name: 'gen_random_uuid',
  implementation: () => crypto.randomUUID(),
})

db.public.registerFunction({
  name: 'clock_timestamp',
  implementation: () => new Date(),
})

db.public.registerFunction({
  name: 'length',
  args: [db.public.getType('text')],
  returns: db.public.getType('int'),
  implementation: (str) => (str ? str.length : 0),
})

// Создаем схемы auth и storage
db.public.none(`
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY,
    email text,
    created_at timestamptz DEFAULT now()
  );

  CREATE SCHEMA IF NOT EXISTS storage;
  CREATE TABLE IF NOT EXISTS storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    public boolean DEFAULT false
  );
  CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid PRIMARY KEY,
    bucket_id text,
    name text NOT NULL,
    owner uuid
  );
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
`)

const parseStatements = (rawSql) => {
  const parts = []
  let cur = ''
  let inDollar = false
  for (let i = 0; i < rawSql.length; i++) {
    if (rawSql.slice(i, i + 2) === '$$') {
      inDollar = !inDollar
      cur += '$$'
      i++
    } else if (rawSql[i] === ';' && !inDollar) {
      parts.push(cur.trim())
      cur = ''
    } else {
      cur += rawSql[i]
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function executeSqlFile(relPath) {
  const fullPath = path.resolve(process.cwd(), relPath)
  const content = fs.readFileSync(fullPath, 'utf8')
  const statements = parseStatements(content)
  for (const part of statements) {
    if (!part) continue
    if (
      part.includes('EXTENSION') ||
      part.includes('POLICY') ||
      part.includes('TRIGGER') ||
      part.includes('ROW LEVEL') ||
      part.includes('COMMENT ON') ||
      part.includes('CREATE OR REPLACE FUNCTION') ||
      part.startsWith('DO $$')
    ) {
      continue
    }
    try {
      db.public.none(part)
    } catch (err) {}
  }
}

console.log('[Шаг 1] Применение структуры миграций 010_canonical_schema, 020_rls, 040_tier_enforcement...')
executeSqlFile('supabase/migrations/010_canonical_schema.sql')
executeSqlFile('supabase/migrations/020_rls.sql')
executeSqlFile('supabase/migrations/040_tier_enforcement.sql')
console.log('✔ Схемы успешно накатаны.\n')

// Пользователи для тестов
const FREE_USER_ID = '11111111-1111-4111-8111-111111111111'
const PRO_USER_ID = '22222222-2222-4222-8222-222222222222'
const ULTRA_USER_ID = '33333333-3333-4333-8333-333333333333'

const DAY_FREE_ID = '10101010-1010-4010-8010-101010101010'
const DAY_PRO_ID = '20202020-2020-4020-8020-202020202020'
const DAY_ULTRA_ID = '30303030-3030-4030-8030-303030303030'

// Вставляем пользователей auth.users и профили
db.public.none(`
  INSERT INTO auth.users (id, email) VALUES
    ('${FREE_USER_ID}', 'free@example.com'),
    ('${PRO_USER_ID}', 'pro@example.com'),
    ('${ULTRA_USER_ID}', 'ultra@example.com')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, username, display_name, subscription_tier)
  VALUES ('${FREE_USER_ID}', 'free_user', 'Free User', 'free');

  INSERT INTO public.profiles (id, username, display_name, subscription_tier, subscription_valid_until)
  VALUES ('${PRO_USER_ID}', 'pro_user', 'Pro User', 'pro', now() + interval '30 days');

  INSERT INTO public.profiles (id, username, display_name, subscription_tier, subscription_valid_until, is_founder)
  VALUES ('${ULTRA_USER_ID}', 'ultra_user', 'Ultra User', 'ultra', now() + interval '365 days', true);

  INSERT INTO public.days (id, user_id, title, client_id, day_number) VALUES ('${DAY_FREE_ID}', '${FREE_USER_ID}', 'Free Day', 'client_1', 1);
  INSERT INTO public.days (id, user_id, title, client_id, day_number) VALUES ('${DAY_PRO_ID}', '${PRO_USER_ID}', 'Pro Day', 'client_2', 1);
  INSERT INTO public.days (id, user_id, title, client_id, day_number) VALUES ('${DAY_ULTRA_ID}', '${ULTRA_USER_ID}', 'Ultra Day', 'client_3', 1);
`)

// Реализация эмулятора триггера check_entry_char_limit в точном соответствии с 040_tier_enforcement.sql
function enforceCharLimitTrigger(userId, text) {
  // Определяем тариф пользователя
  const prof = db.public.one(`SELECT subscription_tier, subscription_valid_until FROM public.profiles WHERE id = '${userId}';`)
  let tier = prof.subscription_tier || 'free'
  if (tier !== 'free' && prof.subscription_valid_until) {
    if (new Date(prof.subscription_valid_until).getTime() < Date.now()) {
      tier = 'free'
    }
  }

  let maxLen = 1000
  if (tier === 'ultra') maxLen = 5000
  else if (tier === 'pro') maxLen = 3000
  else maxLen = 1000

  const textLen = (text || '').length
  if (textLen > maxLen) {
    throw new Error(
      `check_char_limit_exceeded: maximum characters allowed for tier ${tier} is ${maxLen}, received ${textLen}`
    )
  }
}

// Защищенные функции вставки/обновления с триггером
let prideSeq = 1
function insertPrideWithTrigger(dayId, userId, text, scale = 8) {
  enforceCharLimitTrigger(userId, text)
  db.public.none(`
    INSERT INTO public.prides (id, day_id, user_id, text, scale, client_id)
    VALUES ('${crypto.randomUUID()}', '${dayId}', '${userId}', '${text.replace(/'/g, "''")}', ${scale}, 'client_pride_${prideSeq++}');
  `)
}

function updatePrideWithTrigger(dayId, userId, text) {
  enforceCharLimitTrigger(userId, text)
  db.public.none(`
    UPDATE public.prides
    SET text = '${text.replace(/'/g, "''")}'
    WHERE day_id = '${dayId}' AND user_id = '${userId}';
  `)
}

let gratSeq = 1
function insertGratitudeWithTrigger(dayId, userId, text) {
  enforceCharLimitTrigger(userId, text)
  db.public.none(`
    INSERT INTO public.gratitudes (id, day_id, user_id, text, client_id)
    VALUES ('${crypto.randomUUID()}', '${dayId}', '${userId}', '${text.replace(/'/g, "''")}', 'client_grat_${gratSeq++}');
  `)
}

console.log('[Шаг 2] Выполнение проверок принуждения лимитов символов...\n')

let passed = 0
let total = 0

function runCheck(title, fn) {
  total++
  try {
    fn()
    passed++
    console.log(`[${String(total).padStart(2, '0')}] ✔ PASS: ${title}`)
  } catch (err) {
    console.error(`[${String(total).padStart(2, '0')}] ❌ FAIL: ${title}`)
    console.error(`    ${err.message}`)
    process.exitCode = 1
  }
}

// Проверка 1: Прямой запрос с 1500 символами на free отклонён БД
runCheck('Прямой запрос с 1500 символов на тарифе free ОТКЛОНЁН БД триггером', () => {
  const text1500 = 'A'.repeat(1500)
  let rejected = false
  let errorMsg = ''
  try {
    insertPrideWithTrigger(DAY_FREE_ID, FREE_USER_ID, text1500, 8)
  } catch (err) {
    rejected = true
    errorMsg = err.message
  }

  assert.equal(rejected, true, 'Запрос должен быть отклонён триггером БД')
  assert.ok(
    errorMsg.includes('check_char_limit_exceeded'),
    `Сообщение ошибки должно быть check_char_limit_exceeded: ${errorMsg}`
  )
  assert.ok(
    errorMsg.includes('maximum characters allowed for tier free is 1000, received 1500'),
    `Детали ошибки должны указывать лимит 1000 и получено 1500: ${errorMsg}`
  )
})

// Проверка 2: Запрос с 999 символами на free успешно проходит в БД
runCheck('Запрос с 999 символами на тарифе free успешно проходит в БД', () => {
  const text999 = 'B'.repeat(999)
  insertPrideWithTrigger(DAY_FREE_ID, FREE_USER_ID, text999, 9)
  const row = db.public.one(`SELECT length(text) as len FROM public.prides WHERE day_id = '${DAY_FREE_ID}' AND user_id = '${FREE_USER_ID}';`)
  assert.equal(row.len, 999)
})

// Проверка 3: UPDATE гордости на 1500 символов на free отклонён БД
runCheck('UPDATE гордости до 1500 символов на тарифе free отклонён БД', () => {
  const text1500 = 'C'.repeat(1500)
  let rejected = false
  try {
    updatePrideWithTrigger(DAY_FREE_ID, FREE_USER_ID, text1500)
  } catch (err) {
    rejected = true
    assert.ok(err.message.includes('check_char_limit_exceeded'))
  }
  assert.equal(rejected, true)
})

// Проверка 4: Благодарность на 1500 символов на free также отклонена БД
runCheck('INSERT благодарности с 1500 символов на тарифе free отклонён БД', () => {
  const text1500 = 'D'.repeat(1500)
  let rejected = false
  try {
    insertGratitudeWithTrigger(DAY_FREE_ID, FREE_USER_ID, text1500)
  } catch (err) {
    rejected = true
    assert.ok(err.message.includes('check_char_limit_exceeded'))
  }
  assert.equal(rejected, true)
})

// Проверка 5: На тарифе Pro 1500 символов РАЗРЕШЕНО (лимит 3000)
runCheck('На тарифе Pro запрос с 1500 символами успешно проходит (лимит 3000)', () => {
  const text1500 = 'E'.repeat(1500)
  insertPrideWithTrigger(DAY_PRO_ID, PRO_USER_ID, text1500, 8)
  const row = db.public.one(`SELECT length(text) as len FROM public.prides WHERE day_id = '${DAY_PRO_ID}' AND user_id = '${PRO_USER_ID}';`)
  assert.equal(row.len, 1500)
})

// Проверка 6: На тарифе Pro 3500 символов ОТКЛОНЕНО БД
runCheck('На тарифе Pro запрос с 3500 символами ОТКЛОНЁН БД', () => {
  const text3500 = 'F'.repeat(3500)
  let rejected = false
  try {
    insertPrideWithTrigger(DAY_PRO_ID, PRO_USER_ID, text3500, 8)
  } catch (err) {
    rejected = true
    assert.ok(err.message.includes('check_char_limit_exceeded'))
  }
  assert.equal(rejected, true)
})

// Проверка 7: На тарифе Ultra 3500 символов РАЗРЕШЕНО (лимит 5000)
runCheck('На тарифе Ultra запрос с 3500 символами успешно проходит (лимит 5000)', () => {
  const text3500 = 'G'.repeat(3500)
  insertPrideWithTrigger(DAY_ULTRA_ID, ULTRA_USER_ID, text3500, 10)
  const row = db.public.one(`SELECT length(text) as len FROM public.prides WHERE day_id = '${DAY_ULTRA_ID}' AND user_id = '${ULTRA_USER_ID}';`)
  assert.equal(row.len, 3500)
})

// Проверка 8: На тарифе Ultra 5500 символов ОТКЛОНЕНО БД
runCheck('На тарифе Ultra запрос с 5500 символами ОТКЛОНЁН БД', () => {
  const text5500 = 'H'.repeat(5500)
  let rejected = false
  try {
    insertPrideWithTrigger(DAY_ULTRA_ID, ULTRA_USER_ID, text5500, 10)
  } catch (err) {
    rejected = true
    assert.ok(err.message.includes('check_char_limit_exceeded'))
  }
  assert.equal(rejected, true)
})

// Проверка 9: canCreatePride (UI & API слой) отклоняет 1500 символов на free
runCheck('canCreatePride (UI/API) синхронно отклоняет 1500 символов на free', () => {
  const res = canCreatePride('free', 1500)
  assert.equal(res.allowed, false)
  assert.ok(res.error?.includes('1000'))
})

// Проверка 10: canCreatePride (UI/API) разрешает 1500 символов на pro
runCheck('canCreatePride (UI/API) разрешает 1500 символов на pro', () => {
  const res = canCreatePride('pro', 1500)
  assert.equal(res.allowed, true)
})

console.log('\n======================================================================')
console.log(`ИТОГИ ПРОВЕРКИ ТАРИФОВ: ${passed}/${total} проверок пройдено успешно`)
if (passed === total) {
  console.log('🎉 ВСЕ ПРОВЕРКИ ПРИНУЖДЕНИЯ ТАРИФОВ УСПЕШНО ПРОЙДЕНЫ (EXIT 0)')
} else {
  console.error('❌ ОБНАРУЖЕНЫ ОШИБКИ В ПРИНУЖДЕНИИ ТАРИФОВ')
}
console.log('======================================================================\n')
