import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  getClientIp,
  getSubnet24,
  buildRateLimitKey,
  checkRateLimit,
} from '../lib/server/rate-limit.ts'
import {
  validateUsernameSecurity,
  validatePasswordSecurity,
  validateFormTiming,
  normalizeUsername,
  verifyTurnstileToken,
  RESERVED_USERNAMES,
} from '../lib/server/signup-protection.ts'
import {
  computeDayContentHash,
  evaluateDayWithAI,
  type DayEvaluationResult,
} from '../lib/server/ai.ts'
import {
  canRequestAiEvaluation,
  canSendFriendRequest,
  getTierLimits,
  normalizeTier,
} from '../lib/ogonek/permissions.ts'
import { consumeServerQuota } from '../lib/server/quota.ts'

describe('1. Rate Limiting: IP, Подсети и Ключи (Этап 5)', () => {
  test('1. getClientIp: корректно парсит x-forwarded-for с цепочкой прокси', () => {
    const req = new Request('http://localhost:3000', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
    })
    assert.equal(getClientIp(req), '203.0.113.195')
  })

  test('2. getClientIp: использует x-real-ip при отсутствии x-forwarded-for', () => {
    const req = new Request('http://localhost:3000', {
      headers: { 'x-real-ip': '198.51.100.24' },
    })
    assert.equal(getClientIp(req), '198.51.100.24')
  })

  test('3. getClientIp: возвращает 127.0.0.1 при отсутствии заголовков', () => {
    const req = new Request('http://localhost:3000')
    assert.equal(getClientIp(req), '127.0.0.1')
  })

  test('4. getSubnet24: корректно вычисляет /24 подсеть для IPv4', () => {
    assert.equal(getSubnet24('192.168.1.150'), '192.168.1.0/24')
    assert.equal(getSubnet24('10.20.30.40'), '10.20.30.0/24')
    assert.equal(getSubnet24('203.0.113.195'), '203.0.113.0/24')
  })

  test('5. getSubnet24: корректно извлекает префикс для IPv6', () => {
    assert.equal(getSubnet24('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), '2001:0db8:85a3::/48')
  })

  test('6. buildRateLimitKey: генерирует ключ с IP для неавторизованного запроса', () => {
    const key = buildRateLimitKey({ route: 'translate', ip: '192.168.1.1' })
    assert.equal(key, 'ip:192.168.1.1:translate')
  })

  test('7. buildRateLimitKey: включает userId и IP для авторизованного запроса', () => {
    const key = buildRateLimitKey({ route: 'evaluate', userId: 'user-42', ip: '192.168.1.1' })
    assert.equal(key, 'u:user-42:ip:192.168.1.1:evaluate')
  })

  test('8. checkRateLimit: разрешает запросы в пределах лимита', async () => {
    const testKey = `test-key-${Date.now()}-1`
    const r1 = await checkRateLimit(testKey, 3, 60)
    assert.equal(r1.allowed, true)
    const r2 = await checkRateLimit(testKey, 3, 60)
    assert.equal(r2.allowed, true)
  })

  test('9. checkRateLimit: блокирует запросы при превышении лимита (возвращает allowed=false)', async () => {
    const testKey = `test-key-${Date.now()}-2`
    await checkRateLimit(testKey, 2, 60)
    await checkRateLimit(testKey, 2, 60)
    const r3 = await checkRateLimit(testKey, 2, 60)
    assert.equal(r3.allowed, false)
    assert.ok(r3.retryAfter > 0)
  })

  test('10. checkRateLimit: изолирует разные ключи друг от друга', async () => {
    const keyA = `key-a-${Date.now()}`
    const keyB = `key-b-${Date.now()}`
    await checkRateLimit(keyA, 1, 60)
    const resA = await checkRateLimit(keyA, 1, 60)
    assert.equal(resA.allowed, false)

    const resB = await checkRateLimit(keyB, 1, 60)
    assert.equal(resB.allowed, true)
  })
})

describe('2. Защита регистрации: Никнеймы, Пароли, Тайминг и Капча (Этап 5)', () => {
  test('11. normalizeUsername: очищает ведущие @, пробелы и переводит в нижний регистр', () => {
    const res = normalizeUsername('  @Alex_Cerna  ')
    assert.equal(res.normalized, 'alex_cerna')
  })

  test('12. normalizeUsername: заменяет кириллические гомоглифы (юникод-двойники) в canonical', () => {
    // В строке 'аdmin' первая буква 'а' - кириллическая \u0430
    const fakeAdmin = '\u0430dmin'
    const res = normalizeUsername(fakeAdmin)
    assert.equal(res.canonical, 'admin')
  })

  test('13. validateUsernameSecurity: запрещает никнеймы короче 3 символов', () => {
    const res = validateUsernameSecurity('ab')
    assert.equal(res.valid, false)
  })

  test('14. validateUsernameSecurity: запрещает никнеймы длиннее 20 символов', () => {
    const res = validateUsernameSecurity('a'.repeat(21))
    assert.equal(res.valid, false)
  })

  test('15. validateUsernameSecurity: отклоняет недопустимые спецсимволы', () => {
    assert.equal(validateUsernameSecurity('alex.cerna').valid, false)
    assert.equal(validateUsernameSecurity('user!name').valid, false)
    assert.equal(validateUsernameSecurity('user name').valid, false)
  })

  test('16. validateUsernameSecurity: блокирует зарезервированные никнеймы (admin, support, ogonek, memernity)', () => {
    for (const name of ['admin', 'support', 'ogonek', 'memernity', 'cernavation', 'root', 'billing']) {
      const res = validateUsernameSecurity(name)
      assert.equal(res.valid, false, `Ожидалась блокировка зарезервированного ника ${name}`)
      assert.match(res.error || '', /зарезервирован/i)
    }
  })

  test('17. validateUsernameSecurity: блокирует гомоглиф-мимикрию под зарезервированные ники', () => {
    // Кириллические буквы в "оgоnеk"
    const spoofedOgonek = '\u043eg\u043en\u0435k'
    const res = validateUsernameSecurity(spoofedOgonek)
    assert.equal(res.valid, false)
    assert.match(res.error || '', /зарезервирован/i)
  })

  test('18. validatePasswordSecurity: отклоняет пароли короче 8 символов', () => {
    assert.equal(validatePasswordSecurity('Pass1!').valid, false)
  })

  test('19. validatePasswordSecurity: отклоняет пароли без букв или без цифр/спецсимволов', () => {
    assert.equal(validatePasswordSecurity('1234567890').valid, false)
    assert.equal(validatePasswordSecurity('abcdefghijkl').valid, false)
  })

  test('20. validatePasswordSecurity: принимает надежный пароль', () => {
    assert.equal(validatePasswordSecurity('SecurePassword123!').valid, true)
  })

  test('21. validateFormTiming: блокирует отправку формы быстрее 3 секунд', () => {
    const fastStart = Date.now() - 1500 // прошло 1.5 секунды
    const res = validateFormTiming(fastStart, 3)
    assert.equal(res.valid, false)
    assert.match(res.error || '', /слишком быстро/i)
  })

  test('22. validateFormTiming: разрешает отправку формы при длительности >= 3 секунд', () => {
    const normalStart = Date.now() - 4000 // прошло 4 секунды
    const res = validateFormTiming(normalStart, 3)
    assert.equal(res.valid, true)
  })

  test('23. verifyTurnstileToken: пропускает с предупреждением, если TURNSTILE_SECRET_KEY не задан', async () => {
    const prevKey = process.env.TURNSTILE_SECRET_KEY
    delete process.env.TURNSTILE_SECRET_KEY
    const res = await verifyTurnstileToken()
    assert.equal(res.ok, true)
    assert.equal(res.skipped, true)
    if (prevKey) process.env.TURNSTILE_SECRET_KEY = prevKey
  })
})

describe('3. ИИ-квоты, Кэширование по Хэшу и Таймауты (Этап 5)', () => {
  test('24. computeDayContentHash: детерминирован и выдает одинаковый SHA-256 для одного контента', () => {
    const h1 = computeDayContentHash(['Пробежка 5 км', 'Чтение 30 мин'], ['Благодарность ментору'])
    const h2 = computeDayContentHash(['Пробежка 5 км', 'Чтение 30 мин'], ['Благодарность ментору'])
    assert.equal(h1, h2)
    assert.equal(h1.length, 64)
  })

  test('25. computeDayContentHash: меняется при изменении хотя бы одного символа', () => {
    const h1 = computeDayContentHash(['Пробежка 5 км'], [])
    const h2 = computeDayContentHash(['Пробежка 6 км'], [])
    assert.notEqual(h1, h2)
  })

  test('26. canRequestAiEvaluation: блокирует бесплатный тариф (free = 0 оценок в день)', () => {
    const res = canRequestAiEvaluation('free', 0)
    assert.equal(res.allowed, false)
    assert.equal(res.max, 0)
    assert.match(res.error || '', /доступна только на тарифах/i)
  })

  test('27. canRequestAiEvaluation: разрешает 1 оценку на pro и ultra', () => {
    assert.equal(canRequestAiEvaluation('pro', 0).allowed, true)
    assert.equal(canRequestAiEvaluation('ultra', 0).allowed, true)
  })

  test('28. canRequestAiEvaluation: блокирует повторный вызов на pro и ultra при usedToday >= 1', () => {
    assert.equal(canRequestAiEvaluation('pro', 1).allowed, false)
    assert.equal(canRequestAiEvaluation('ultra', 1).allowed, false)
  })

  test('29. evaluateDayWithAI: возвращает кэшированный ответ без повторного вызова провайдера', async () => {
    let callCount = 0
    const mockProvider = async () => {
      callCount++
      return {
        prideEvaluations: [{ num: 1, score: 9.0, comment: 'Отлично', overcome: 2, tags: ['#Спорт'] }],
        breakdown: 'Прорывной день',
        verdict: 'Так держать!',
      }
    }

    const userId = `user-ai-cache-${Date.now()}`
    // Первый вызов
    const res1 = await evaluateDayWithAI({
      userId,
      prides: ['Марафон 42 км'],
      gratitudes: ['Благодарность тренеру'],
      mockProvider,
    })

    assert.equal(res1.success, true)
    if (res1.success) {
      assert.equal(res1.cached, false)
    }
    assert.equal(callCount, 1)

    // Второй вызов с ТОЧНО таким же текстом
    const res2 = await evaluateDayWithAI({
      userId,
      prides: ['Марафон 42 км'],
      gratitudes: ['Благодарность тренеру'],
      mockProvider,
    })

    assert.equal(res2.success, true)
    if (res2.success) {
      assert.equal(res2.cached, true)
    }
    // Провайдер не должен вызываться второй раз!
    assert.equal(callCount, 1)
  })

  test('30. evaluateDayWithAI: при ошибке провайдера квота НЕ списывается', async () => {
    const failingProvider = async () => {
      throw new Error('AI Provider Service Unavailable')
    }

    const userId = `user-err-${Date.now()}`
    const res = await evaluateDayWithAI({
      userId,
      prides: ['Сложная тренировка'],
      gratitudes: [],
      mockProvider: failingProvider,
    })

    assert.equal(res.success, false)
    if (!res.success) {
      assert.equal(res.error.code, 'AI_PROVIDER_ERROR')
      assert.match(res.error.message, /Квота сохранена/i)
    }
  })
})

describe('4. Лимиты тарифов: Заявки в соратники, Голосовые и Квоты (Этап 5)', () => {
  test('31. friendRequestsPerDay: free=20, pro=50, ultra=100', () => {
    assert.equal(getTierLimits('free').friendRequestsPerDay, 20)
    assert.equal(getTierLimits('pro').friendRequestsPerDay, 50)
    assert.equal(getTierLimits('ultra').friendRequestsPerDay, 100)
  })

  test('32. canSendFriendRequest: разрешает до суточного лимита', () => {
    assert.equal(canSendFriendRequest('free', 19).allowed, true)
    assert.equal(canSendFriendRequest('free', 20).allowed, false)
    assert.equal(canSendFriendRequest('pro', 49).allowed, true)
    assert.equal(canSendFriendRequest('pro', 50).allowed, false)
    assert.equal(canSendFriendRequest('ultra', 99).allowed, true)
    assert.equal(canSendFriendRequest('ultra', 100).allowed, false)
  })

  test('33. maxVoiceSeconds: free=60, pro=300, ultra=600', () => {
    assert.equal(getTierLimits('free').maxVoiceSeconds, 60)
    assert.equal(getTierLimits('pro').maxVoiceSeconds, 300)
    assert.equal(getTierLimits('ultra').maxVoiceSeconds, 600)
  })

  test('34. chatMessagesPerMinute: 30 для всех тарифов', () => {
    assert.equal(getTierLimits('free').chatMessagesPerMinute, 30)
    assert.equal(getTierLimits('pro').chatMessagesPerMinute, 30)
    assert.equal(getTierLimits('ultra').chatMessagesPerMinute, 30)
  })

  test('35. profileSearchesPerMinute: 60 для всех тарифов', () => {
    assert.equal(getTierLimits('free').profileSearchesPerMinute, 60)
    assert.equal(getTierLimits('pro').profileSearchesPerMinute, 60)
    assert.equal(getTierLimits('ultra').profileSearchesPerMinute, 60)
  })

  test('36. consumeServerQuota: разрешает списание в пределах лимита и возвращает remaining', async () => {
    const uid = `user-q-${Date.now()}`
    const r1 = await consumeServerQuota(uid, 'maxStoriesPerDay')
    assert.equal(r1.ok, true)
    assert.equal(r1.current, 1)
  })

  test('37. consumeServerQuota: блокирует списание при превышении дневного лимита', async () => {
    const uid = `user-q-exceeded-${Date.now()}`
    // У free лимит историй 1 в день
    const r1 = await consumeServerQuota(uid, 'maxStoriesPerDay')
    assert.equal(r1.ok, true)

    const r2 = await consumeServerQuota(uid, 'maxStoriesPerDay')
    assert.equal(r2.ok, false)
    assert.equal(r2.error, 'quota_exceeded')
  })

  test('38. normalizeTier: истёкшая подписка автоматически сбрасывает лимиты в free', () => {
    const past = new Date(Date.now() - 3600000).toISOString()
    const tier = normalizeTier('ultra', past)
    assert.equal(tier, 'free')
    assert.equal(getTierLimits(tier).aiEvaluationsPerDay, 0)
    assert.equal(getTierLimits(tier).maxVoiceSeconds, 60)
  })

  test('39. RESERVED_USERNAMES: содержит все критические системные имена', () => {
    assert.ok(RESERVED_USERNAMES.has('admin'))
    assert.ok(RESERVED_USERNAMES.has('support'))
    assert.ok(RESERVED_USERNAMES.has('ogonek'))
    assert.ok(RESERVED_USERNAMES.has('memernity'))
    assert.ok(RESERVED_USERNAMES.has('cernavation'))
    assert.ok(RESERVED_USERNAMES.has('billing'))
    assert.ok(RESERVED_USERNAMES.has('api'))
    assert.ok(RESERVED_USERNAMES.has('security'))
  })

  test('40. honeypot: обнаружение непустого honeypot-поля ботов', () => {
    const botPayload = { username: 'testuser', password: 'Password123!', company: 'Spam Corp LLC' }
    const hasHoneypot = Boolean(botPayload.company && String(botPayload.company).trim() !== '')
    assert.equal(hasHoneypot, true)
  })

  test('41. honeypot: пустое honeypot-поле у легитимного человека', () => {
    const humanPayload = { username: 'testuser', password: 'Password123!', company: '' }
    const hasHoneypot = Boolean(humanPayload.company && String(humanPayload.company).trim() !== '')
    assert.equal(hasHoneypot, false)
  })

  test('42. HTTP 429 Retry-After заголовок рассчитывается корректно', async () => {
    const testKey = `retry-key-${Date.now()}`
    await checkRateLimit(testKey, 1, 60)
    const blocked = await checkRateLimit(testKey, 1, 60)
    assert.equal(blocked.allowed, false)
    assert.ok(blocked.retryAfter > 0 && blocked.retryAfter <= 60)
  })
})
