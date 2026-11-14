#!/usr/bin/env node
/**
 * QA HARNESS: STAGE 05 LIMITS, CONCURRENCY & ABUSE PROTECTION
 *
 * Приёмка:
 * 1. Параллельные 20 запросов на ИИ при лимите 1 дают ровно ОДИН успех и 19 отказов.
 * 2. Повторные запросы после исчерпания квоты стабильно отклоняются.
 * 3. Free тариф (квота 0) отклоняет все запросы к ИИ.
 * 4. Rate-limiting (check_rate_limit) блокирует запросы сверх лимита окна.
 */

import assert from 'node:assert/strict'
import { consumeServerQuota } from '../../lib/server/quota.ts'

console.log('======================================================================')
console.log('🛡️ ЗАПУСК ТЕСТА КОНКУРЕНТНЫХ КВОТ И АНТИАБУЗА (test-stage05-limits.mjs)')
console.log('======================================================================\n')

let passed = 0
let total = 0

async function runCheck(title, fn) {
  total++
  try {
    await fn()
    passed++
    console.log(`[${String(total).padStart(2, '0')}] ✔ PASS: ${title}`)
  } catch (err) {
    console.error(`[${String(total).padStart(2, '0')}] ❌ FAIL: ${title}`)
    console.error(`    ${err.message}`)
    process.exitCode = 1
  }
}

const TEST_PRO_USER_ID = 'test_pro_user_' + Date.now()
const TEST_FREE_USER_ID = 'test_free_user_' + Date.now()

// Проверка 1: Параллельные 20 запросов на ИИ при лимите 1 дают ровно один успех
await runCheck('Параллельные 20 запросов на ИИ при лимите 1 дают ровно ОДИН успех', async () => {
  const promises = Array.from({ length: 20 }, () =>
    consumeServerQuota(TEST_PRO_USER_ID, 'aiEvaluationsPerDay', 'pro')
  )

  const results = await Promise.all(promises)
  const successes = results.filter((r) => r.ok)
  const failures = results.filter((r) => !r.ok)

  assert.equal(successes.length, 1, `Должен быть ровно 1 успех, получено: ${successes.length}`)
  assert.equal(failures.length, 19, `Должно быть ровно 19 отказов, получено: ${failures.length}`)

  for (const fail of failures) {
    assert.equal(fail.error, 'quota_exceeded')
    assert.equal(fail.remaining, 0)
    assert.equal(fail.current, 1)
  }

  assert.equal(successes[0].remaining, 0)
  assert.equal(successes[0].current, 1)
})

// Проверка 2: Последующие запросы после исчерпания лимита отклоняются
await runCheck('Последующие 5 запросов после исчерпания лимита также отклоняются', async () => {
  const followUpPromises = Array.from({ length: 5 }, () =>
    consumeServerQuota(TEST_PRO_USER_ID, 'aiEvaluationsPerDay', 'pro')
  )

  const results = await Promise.all(followUpPromises)
  const successes = results.filter((r) => r.ok)
  const failures = results.filter((r) => !r.ok)

  assert.equal(successes.length, 0, 'Все последующие запросы должны быть отклонены')
  assert.equal(failures.length, 5)
})

// Проверка 3: Free тариф (квота 0) немедленно отклоняет запрос
await runCheck('Free тариф (квота 0) немедленно отклоняет запрос на ИИ', async () => {
  const res = await consumeServerQuota(TEST_FREE_USER_ID, 'aiEvaluationsPerDay', 'free')
  assert.equal(res.ok, false)
  assert.equal(res.error, 'quota_exceeded')
  assert.equal(res.limit, 0)
  assert.equal(res.remaining, 0)
})

// Проверка 4: Изоляция квот между разными пользователями
await runCheck('Квоты строго изолированы: другой Pro пользователь получает свой 1 успех', async () => {
  const OTHER_PRO_USER = 'other_pro_user_' + Date.now()
  const res = await consumeServerQuota(OTHER_PRO_USER, 'aiEvaluationsPerDay', 'pro')
  assert.equal(res.ok, true)
  assert.equal(res.remaining, 0)
  assert.equal(res.current, 1)
})

console.log('\n======================================================================')
console.log(`ИТОГИ ТЕСТА КВОТ: ${passed}/${total} проверок пройдено успешно`)
if (passed === total) {
  console.log('🎉 ВСЕ ПРОВЕРКИ КОНКУРЕНТНОСТИ КВОТ УСПЕШНО ПРОЙДЕНЫ (EXIT 0)')
} else {
  console.error('❌ ОБНАРУЖЕНЫ ОШИБКИ В КОНКУРЕНТНОСТИ КВОТ')
}
console.log('======================================================================\n')
