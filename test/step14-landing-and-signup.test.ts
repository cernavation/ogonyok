import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  TIER_PRICES,
  TIER_FEATURES_LIST,
  TIER_NAMES,
  TIER_BADGES,
} from '../lib/ogonek/permissions.ts'
import { validateUsernameSecurity, RESERVED_USERNAMES } from '../lib/server/signup-protection.ts'

describe('ШАГ 14: Проверка никнеймов и защита регистрации', () => {
  it('проверяет минимальную и максимальную длину никнейма', () => {
    assert.strictEqual(validateUsernameSecurity('ab').valid, false)
    assert.strictEqual(validateUsernameSecurity('').valid, false)
    assert.strictEqual(validateUsernameSecurity('a'.repeat(21)).valid, false)
    assert.strictEqual(validateUsernameSecurity('john_doe').valid, true)
  })

  it('блокирует зарезервированные никнеймы и системные имена', () => {
    for (const reserved of ['admin', 'root', 'support', 'help', 'system', 'moderator']) {
      const res = validateUsernameSecurity(reserved)
      assert.strictEqual(res.valid, false, `Никнейм ${reserved} должен быть заблокирован`)
      assert.match(res.error || '', /зарезервирован/i)
    }
  })

  it('блокирует гомоглифы (подделку латиницы кириллицей)', () => {
    // Русская 'а' вместо английской 'a' в слове admin
    const homoglyphAdmin = '\u0430dmin'
    const res = validateUsernameSecurity(homoglyphAdmin)
    assert.strictEqual(res.valid, false, 'Гомоглиф admin должен быть отклонён')
  })

  it('разрешает только латиницу, цифры и символ подчеркивания', () => {
    assert.strictEqual(validateUsernameSecurity('elon-musk').valid, false)
    assert.strictEqual(validateUsernameSecurity('elon musk').valid, false)
    assert.strictEqual(validateUsernameSecurity('elon@musk').valid, false)
    assert.strictEqual(validateUsernameSecurity('elon_musk_42').valid, true)
  })
})

describe('ШАГ 14: Единый источник истины тарифов (permissions.ts)', () => {
  it('содержит 3 канонических тарифа с точными ценами', () => {
    assert.strictEqual(TIER_PRICES.free.monthly, 0)
    assert.strictEqual(TIER_PRICES.free.yearly, 0)

    assert.strictEqual(TIER_PRICES.pro.monthly, 25)
    assert.strictEqual(TIER_PRICES.pro.yearly, 240) // -20% от 25*12 = 300

    assert.strictEqual(TIER_PRICES.ultra.monthly, 50)
    assert.strictEqual(TIER_PRICES.ultra.yearly, 480) // -20% от 50*12 = 600
  })

  it('содержит человекочитаемые названия и значки тарифов', () => {
    assert.strictEqual(TIER_NAMES.free, 'Базовый')
    assert.strictEqual(TIER_NAMES.pro, 'Премиум')
    assert.strictEqual(TIER_NAMES.ultra, 'Основатель Ultra')

    assert.strictEqual(TIER_BADGES.free, null)
    assert.strictEqual(TIER_BADGES.pro, '★ PREMIUM')
    assert.strictEqual(TIER_BADGES.ultra, '⚡ ULTRA FOUNDER')
  })

  it('содержит полный список возможностей для каждого тарифа', () => {
    assert.ok(TIER_FEATURES_LIST.free.length >= 5)
    assert.ok(TIER_FEATURES_LIST.pro.length >= 6)
    assert.ok(TIER_FEATURES_LIST.ultra.length >= 6)

    // Ultra включает Evidence Vault и Turn
    const ultraFeatures = TIER_FEATURES_LIST.ultra.map((f) => f.text).join(' ')
    assert.match(ultraFeatures, /Evidence Vault/i)
    assert.match(ultraFeatures, /TURN/i)
  })
})

describe('ШАГ 14: Аудит кода гостевого лендинга и регистрации', () => {
  const landingPath = path.resolve(process.cwd(), 'components/ogonek/landing/guest-landing.tsx')
  const authFormPath = path.resolve(process.cwd(), 'components/ogonek/auth/auth-form.tsx')
  const checkUsernameApiPath = path.resolve(process.cwd(), 'app/api/auth/check-username/route.ts')

  it('файлы лендинга, формы регистрации и API проверки ника существуют', () => {
    assert.ok(fs.existsSync(landingPath), 'guest-landing.tsx должен существовать')
    assert.ok(fs.existsSync(authFormPath), 'auth-form.tsx должен существовать')
    assert.ok(fs.existsSync(checkUsernameApiPath), 'api/auth/check-username/route.ts должен существовать')
  })

  it('в коде лендинга и регистрации полностью отсутствуют запрещённые термины (CONTRACT п. 7)', () => {
    const landingCode = fs.readFileSync(landingPath, 'utf8')
    const authCode = fs.readFileSync(authFormPath, 'utf8')

    assert.doesNotMatch(landingCode, /соратник/i, 'Слово "соратник" строго запрещено в лендинге')
    assert.doesNotMatch(authCode, /соратник/i, 'Слово "соратник" строго запрещено в форме регистрации')
  })

  it('в коде лендинга отсутствует слово "Gemini" (заменено на "ИИ")', () => {
    const landingCode = fs.readFileSync(landingPath, 'utf8')
    assert.doesNotMatch(landingCode, /gemini/i, 'Слово "Gemini" в интерфейсе должно быть заменено на "ИИ"')
  })

  it('в коде лендинга отсутствуют жёстко захардкоженные утечки оранжевого #FF5C00 (CONTRACT п. 1)', () => {
    const landingCode = fs.readFileSync(landingPath, 'utf8')
    assert.doesNotMatch(
      landingCode,
      /#FF5C00/i,
      'Вместо #FF5C00 необходимо использовать var(--accent, #FF6A1A)'
    )
  })

  it('лендинг содержит все 7 обязательных разделов ТЗ и 3 шага', () => {
    const landingCode = fs.readFileSync(landingPath, 'utf8')

    // 1. Hero
    assert.match(landingCode, /Твой личный дневник силы/i)
    assert.match(landingCode, /Стрик никогда не сгорает/i)

    // 2. 3 шага «Как это работает»
    assert.match(landingCode, /01/)
    assert.match(landingCode, /02/)
    assert.match(landingCode, /03/)
    assert.doesNotMatch(landingCode, /04/, '«Как это работает» должно состоять строго из 3 шагов')

    // 3. Скриншоты витрины
    assert.match(landingCode, /screen-diary\.png/)
    assert.match(landingCode, /screen-chats\.png/)
    assert.match(landingCode, /screen-ai-eval\.png/)
    assert.match(landingCode, /screen-vault\.png/)
    assert.match(landingCode, /screen-mobile\.png/)

    // 4. Друзья и группы
    assert.match(landingCode, /Друзья и закрытые группы/i)

    // 5. ИИ-оценка
    assert.match(landingCode, /Бескомпромиссная ИИ-оценка/i)

    // 6. Тарифы
    assert.match(landingCode, /Простые и честные тарифы/i)
    assert.match(landingCode, /TIER_PRICES/)
    assert.match(landingCode, /TIER_FEATURES_LIST/)

    // 7. FAQ про приватность
    assert.match(landingCode, /Частые вопросы про приватность/i)
    assert.match(landingCode, /Row Level Security/i)
  })

  it('форма регистрации реализует ровно 2 шага, живую проверку и honeypot', () => {
    const authCode = fs.readFileSync(authFormPath, 'utf8')

    // 2 шага регистрации
    assert.match(authCode, /registrationStep === 1/)
    assert.match(authCode, /registrationStep === 2/)
    assert.doesNotMatch(authCode, /registrationStep === 3/, 'Регистрация должна быть строго в 2 шага')

    // Живая проверка ника
    assert.match(authCode, /\/api\/auth\/check-username/i)

    // Honeypot
    assert.match(authCode, /name="website"/i)

    // Палитра аватаров
    assert.match(authCode, /AVATAR_PALETTE/i)
    assert.match(authCode, /selectedAvatarColor/i)

    // Согласие с условиями
    assert.match(authCode, /agreedToTerms/i)
    assert.match(authCode, /\/terms/)
    assert.match(authCode, /\/privacy/)
  })

  it('файлы скриншотов в public/landing/ сгенерированы и не пустые', () => {
    const files = [
      'screen-diary.png',
      'screen-chats.png',
      'screen-ai-eval.png',
      'screen-vault.png',
      'screen-mobile.png',
    ]

    for (const f of files) {
      const p = path.resolve(process.cwd(), 'public/landing', f)
      assert.ok(fs.existsSync(p), `Файл ${f} должен присутствовать в public/landing/`)
      const stat = fs.statSync(p)
      assert.ok(stat.size > 20000, `Файл ${f} должен быть валидным изображением (размер > 20KB)`)
    }
  })
})
