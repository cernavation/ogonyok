import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { validateServerEnv } from '../lib/server/env.ts'

describe('Серверная валидация окружения и аудит секретов (Этап 3)', () => {
  it('.env.example существует и содержит все обязательные ключи', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example')
    assert.ok(fs.existsSync(envExamplePath), '.env.example обязан присутствовать в корне')
    const content = fs.readFileSync(envExamplePath, 'utf8')

    assert.ok(content.includes('NEXT_PUBLIC_SUPABASE_URL'), 'Содержит NEXT_PUBLIC_SUPABASE_URL')
    assert.ok(content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'Содержит NEXT_PUBLIC_SUPABASE_ANON_KEY')
    assert.ok(content.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Содержит SUPABASE_SERVICE_ROLE_KEY')
    assert.ok(content.includes('GEMINI_API_KEY'), 'Содержит GEMINI_API_KEY')
    assert.ok(content.includes('DEEPSEEK_API_KEY'), 'Содержит DEEPSEEK_API_KEY')
    assert.ok(content.includes('TELEGRAM_BOT_TOKEN'), 'Содержит TELEGRAM_BOT_TOKEN')
    assert.ok(content.includes('CRON_SECRET'), 'Содержит CRON_SECRET')
    assert.ok(content.includes('GIPHY_API_KEY'), 'Содержит GIPHY_API_KEY')
    assert.ok(content.includes('TURN_URL'), 'Содержит TURN_URL')
  })

  it('validateServerEnv выбрасывает понятную ошибку в строгом режиме при отсутствии ключей', () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    try {
      assert.throws(
        () => {
          validateServerEnv({ strict: true })
        },
        /NEXT_PUBLIC_SUPABASE_URL/,
        'Должен выбросить ошибку с указанием отсутствующей переменной'
      )
    } finally {
      if (prevUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
    }
  })

  it('скрипт pre-commit-secrets-check.mjs существует и содержит регулярные выражения для sk-, eyJ-, AIza-', () => {
    const scriptPath = path.resolve(process.cwd(), 'scripts/pre-commit-secrets-check.mjs')
    assert.ok(fs.existsSync(scriptPath), 'Скрипт pre-commit-secrets-check.mjs обязан существовать')
    const code = fs.readFileSync(scriptPath, 'utf8')

    assert.ok(code.includes('sk-'), 'Проверяет sk-...')
    assert.ok(code.includes('eyJ'), 'Проверяет eyJ...')
    assert.ok(code.includes('AIza'), 'Проверяет AIza...')
  })
})
