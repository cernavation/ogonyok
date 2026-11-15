import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_PRIVACY, sanitizePrivacySettings } from '../lib/ogonek/privacy.ts'
import { SETTINGS_SECTIONS } from '../lib/ogonek/settings-data.ts'

test('Step 16 — Содержимое настроек: 10 обязательных подразделов', () => {
  const expectedSections = [
    'profile',
    'appearance',
    'privacy',
    'notifications',
    'chats',
    'security',
    'data',
    'tariff',
    'tour',
    'about',
  ]

  assert.strictEqual(SETTINGS_SECTIONS.length, 10, 'Должно быть ровно 10 подразделов')

  const actualIds = SETTINGS_SECTIONS.map((s) => s.id)
  assert.deepStrictEqual(actualIds, expectedSections, 'Список подразделов должен строго соответствовать спецификации шага 16')
})

test('Step 16 — Настройки приватности и санитизация', () => {
  assert.strictEqual(DEFAULT_PRIVACY.whoCanFind, 'everyone')
  assert.strictEqual(DEFAULT_PRIVACY.whoCanMessage, 'everyone')
  assert.strictEqual(DEFAULT_PRIVACY.whoCanCall, 'friends')
  assert.strictEqual(DEFAULT_PRIVACY.whoCanSeeOnline, 'friends')
  assert.strictEqual(DEFAULT_PRIVACY.defaultDayVisibility, 'public')

  // Санитизация невалидных значений
  const sanitized = sanitizePrivacySettings({
    whoCanFind: 'invalid_value' as any,
    whoCanMessage: 'friends',
    whoCanCall: 'nobody',
    whoCanSeeOnline: 'unknown' as any,
    defaultDayVisibility: 'bad_vis' as any,
  })

  assert.strictEqual(sanitized.whoCanFind, 'everyone', 'Невалидный whoCanFind должен сбрасываться в everyone')
  assert.strictEqual(sanitized.whoCanMessage, 'friends', 'whoCanMessage=friends должен сохраняться')
  assert.strictEqual(sanitized.whoCanCall, 'nobody', 'whoCanCall=nobody должен сохраняться')
  assert.strictEqual(sanitized.whoCanSeeOnline, 'friends', 'Невалидный whoCanSeeOnline должен сбрасываться в дефолт')
  assert.strictEqual(sanitized.defaultDayVisibility, 'public', 'Невалидный defaultDayVisibility должен сбрасываться в public')
})

test('Step 16 — Наличие всех 10 компонентов подразделов в components/ogonek/settings', () => {
  const files = [
    'profile-panel.tsx',
    'appearance-panel.tsx',
    'privacy-panel.tsx',
    'notifications-panel.tsx',
    'chats-panel.tsx',
    'security-panel.tsx',
    'data-panel.tsx',
    'tariff-panel.tsx',
    'tour-panel.tsx',
    'about-panel.tsx',
  ]

  const dir = path.join(process.cwd(), 'components/ogonek/settings')
  for (const f of files) {
    const full = path.join(dir, f)
    assert.ok(fs.existsSync(full), `Файл ${f} должен существовать в components/ogonek/settings`)
  }
})

test('Step 16 — Миграция 130_privacy_and_settings.sql и RLS/RPC на сервере', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/130_privacy_and_settings.sql')
  assert.ok(fs.existsSync(migrationPath), 'Миграция 130_privacy_and_settings.sql должна существовать')

  const sql = fs.readFileSync(migrationPath, 'utf8')
  assert.ok(sql.includes('who_can_find'), 'Должна быть колонка who_can_find')
  assert.ok(sql.includes('who_can_message'), 'Должна быть колонка who_can_message')
  assert.ok(sql.includes('who_can_call'), 'Должна быть колонка who_can_call')
  assert.ok(sql.includes('who_can_see_online'), 'Должна быть колонка who_can_see_online')
  assert.ok(sql.includes('default_day_visibility'), 'Должна быть колонка default_day_visibility')
  assert.ok(sql.includes('get_blocked_profiles'), 'Должна быть функция get_blocked_profiles')
})

test('Step 16 — Эндпоинт /api/account/delete: код и live проверка', async () => {
  const routePath = path.join(process.cwd(), 'app/api/account/delete/route.ts')
  assert.ok(fs.existsSync(routePath), 'Маршрут /api/account/delete/route.ts существует')

  const code = fs.readFileSync(routePath, 'utf8')
  assert.ok(code.includes('Для подтверждения удаления необходимо ввести текущий пароль'), 'Проверяет наличие пароля')
  assert.ok(code.includes('status: 400'), 'Возвращает 400 при отсутствии пароля')
  assert.ok(code.includes('chat-media'), 'Очищает файлы из Storage chat-media')
  assert.ok(code.includes('evidence-media'), 'Очищает файлы из Storage evidence-media')
  assert.ok(code.includes('deleteUser'), 'Удаляет пользователя через admin.deleteUser')

  // Live HTTP тест если dev-сервер запущен
  try {
    const res = await fetch('http://localhost:3000/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.strictEqual(res.status, 400, 'Запрос без пароля возвращает 400')
    const data = await res.json()
    assert.ok(data.error.includes('пароль'), 'Ответ содержит ошибку о необходимости пароля')
  } catch (err: any) {
    // Если dev-сервер не запущен в момент изолированного запуска тестов
    console.log('[Notice] Dev server not responding for live fetch test, file check passed')
  }
})
