import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Админ-скрипт смены тарифа scripts/admin/set-tier.mjs (Этап 02)', () => {
  const scriptPath = path.resolve(process.cwd(), 'scripts/admin/set-tier.mjs')

  it('скрипт существует и содержит валидацию аргументов', () => {
    assert.ok(fs.existsSync(scriptPath), 'Файл scripts/admin/set-tier.mjs обязан существовать')
    const code = fs.readFileSync(scriptPath, 'utf8')

    assert.ok(code.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Проверяет наличие service_role ключа')
    assert.ok(code.includes('VALID_TIERS'), 'Проверяет список допустимых тарифов free/pro/ultra')
    assert.ok(code.includes(".from('profiles')") && code.includes('.update('), 'Обновляет profiles')
    assert.ok(code.includes(".from('subscription_audit')") && code.includes('.insert('), 'Записывает строку в subscription_audit')
  })

  it('миграция 020_rls.sql содержит защиту тарифов и таблицу subscription_audit', () => {
    const rlsMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/020_rls.sql')
    const sql = fs.readFileSync(rlsMigrationPath, 'utf8')

    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.subscription_audit'), 'Создаёт таблицу subscription_audit')
    assert.ok(sql.includes('trg_protect_profile_subscription'), 'Создаёт функцию триггера защиты тарифов')
    assert.ok(sql.includes('REVOKE UPDATE (subscription_tier'), 'Отзывает права UPDATE на тариф у обычных ролей')
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.effective_tier'), 'Создаёт функцию effective_tier')
    assert.ok(sql.includes('CREATE OR REPLACE VIEW public.profiles_public'), 'Создаёт представление profiles_public')
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.profile_private'), 'Создаёт таблицу profile_private')
  })
})
