import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SECURITY_STATE,
  MAX_AUDIT_EVENTS,
  MAX_FAILED_ATTEMPTS,
  MIN_PASSWORD_LENGTH,
  PIN_LENGTH,
  activeUnlockMethods,
  appendSecurityEvent,
  attemptsLeft,
  buildSecurityHint,
  computeLockout,
  evaluatePasswordStrength,
  evaluateSecurityLevel,
  generateSalt,
  hashSecret,
  hasAccountPassword,
  hasBiometric,
  hasSecurityPin,
  hasUnlockMethod,
  isValidPassword,
  isValidPin,
  makeSecurityEvent,
  nextFailedAttemptState,
  sanitizeSecurityState,
  verifySecret,
} from '../lib/ogonek/security.ts'
import type { AppSecurityState, SecurityAuditEvent } from '../lib/ogonek/types.ts'

function state(patch: Partial<AppSecurityState> = {}): AppSecurityState {
  return { ...DEFAULT_SECURITY_STATE, ...patch }
}

describe('Безопасность и вход (ЭТАП 15)', () => {
  it('generateSalt выдаёт 32-символьную hex-соль и не повторяется', () => {
    const a = generateSalt()
    const b = generateSalt()
    assert.match(a, /^[0-9a-f]{32}$/)
    assert.notEqual(a, b)
  })

  it('hashSecret детерминирован для пары секрет+соль и меняется при другой соли', async () => {
    const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
    const h1 = await hashSecret('1234', salt)
    const h2 = await hashSecret('1234', salt)
    const h3 = await hashSecret('1234', 'ffffffffffffffffffffffffffffffff')
    const h4 = await hashSecret('4321', salt)
    assert.equal(h1, h2)
    assert.notEqual(h1, h3)
    assert.notEqual(h1, h4)
    assert.ok(h1.length >= 16)
  })

  it('verifySecret подтверждает верный секрет и отклоняет неверный', async () => {
    const salt = generateSalt()
    const hash = await hashSecret('correct-horse', salt)
    assert.equal(await verifySecret('correct-horse', salt, hash), true)
    assert.equal(await verifySecret('wrong-horse', salt, hash), false)
    assert.equal(await verifySecret('correct-horse', null, hash), false)
    assert.equal(await verifySecret('correct-horse', salt, null), false)
  })

  it('isValidPin принимает только нужное число цифр', () => {
    assert.equal(isValidPin('1234'), true)
    assert.equal(isValidPin('0000'), true)
    assert.equal(isValidPin('123'), false)
    assert.equal(isValidPin('12345'), false)
    assert.equal(isValidPin('12a4'), false)
    assert.equal(isValidPin('123456', 6), true)
    assert.equal(isValidPin('123456'), false)
    assert.equal(PIN_LENGTH, 4)
  })

  it('isValidPassword проверяет границы длины', () => {
    assert.equal(isValidPassword('123456'), true)
    assert.equal(isValidPassword('12345'), false)
    assert.equal(isValidPassword('a'.repeat(MIN_PASSWORD_LENGTH)), true)
    assert.equal(isValidPassword('a'.repeat(64)), true)
    assert.equal(isValidPassword('a'.repeat(65)), false)
  })

  it('evaluatePasswordStrength оценивает надёжность и даёт подсказки', () => {
    assert.equal(evaluatePasswordStrength('').score, 0)
    assert.equal(evaluatePasswordStrength('').label, 'Пусто')

    const weak = evaluatePasswordStrength('abcdefg')
    assert.equal(weak.score, 1)
    assert.equal(weak.label, 'Слабый')

    const strong = evaluatePasswordStrength('Abcdef1!')
    assert.equal(strong.score, 4)
    assert.equal(strong.label, 'Очень надёжный')
    // короткий, но разнообразный пароль получает только подсказку о длине
    assert.equal(strong.hints.length, 1)

    const veryLong = evaluatePasswordStrength('A1!bcdefghijkl')
    assert.equal(veryLong.score, 4)
    assert.equal(veryLong.hints.length, 0)

    const mixed = evaluatePasswordStrength('пароль1')
    assert.ok(mixed.score >= 1)
    assert.ok(mixed.hints.length <= 3)
  })

  it('nextFailedAttemptState блокирует вход после лимита попыток', () => {
    const first = nextFailedAttemptState(0)
    assert.equal(first.failedAttempts, 1)
    assert.equal(first.lockedUntilISO, null)

    const fourth = nextFailedAttemptState(3)
    assert.equal(fourth.failedAttempts, 4)
    assert.equal(fourth.lockedUntilISO, null)

    const now = new Date('2026-10-16T10:00:00.000Z')
    const fifth = nextFailedAttemptState(MAX_FAILED_ATTEMPTS - 1, now)
    assert.equal(fifth.failedAttempts, MAX_FAILED_ATTEMPTS)
    assert.ok(fifth.lockedUntilISO)
    assert.equal(new Date(fifth.lockedUntilISO as string).getTime(), now.getTime() + 60_000)
  })

  it('computeLockout считает остаток блокировки и снимает просроченную', () => {
    const now = new Date('2026-10-16T10:00:00.000Z')
    const active = computeLockout('2026-10-16T10:00:30.000Z', now)
    assert.equal(active.isLocked, true)
    assert.equal(active.remainingMs, 30_000)

    const expired = computeLockout('2026-10-16T09:59:00.000Z', now)
    assert.equal(expired.isLocked, false)
    assert.equal(expired.remainingMs, 0)

    assert.equal(computeLockout(null, now).isLocked, false)
    assert.equal(computeLockout('не-дата', now).isLocked, false)
  })

  it('attemptsLeft не уходит в минус', () => {
    assert.equal(attemptsLeft(0), MAX_FAILED_ATTEMPTS)
    assert.equal(attemptsLeft(3), MAX_FAILED_ATTEMPTS - 3)
    assert.equal(attemptsLeft(99), 0)
  })

  it('appendSecurityEvent кладёт событие в начало и обрезает журнал', () => {
    const events: SecurityAuditEvent[] = Array.from({ length: MAX_AUDIT_EVENTS }, (_, i) =>
      makeSecurityEvent('unlocked', `event-${i}`, new Date(2026, 0, 1, 0, 0, i))
    )
    const fresh = makeSecurityEvent('lock-now', 'ручная блокировка', new Date('2026-10-16T12:00:00.000Z'))
    const log = appendSecurityEvent(events, fresh)
    assert.equal(log.length, MAX_AUDIT_EVENTS)
    assert.equal(log[0].id, fresh.id)
    assert.equal(log[0].kind, 'lock-now')

    const fromEmpty = appendSecurityEvent(undefined, fresh)
    assert.equal(fromEmpty.length, 1)
  })

  it('sanitizeSecurityState отбрасывает PIN без соли и биометрию без ключа', () => {
    const clean = sanitizeSecurityState({
      pinHash: 'hash',
      pinSalt: null,
      pinQuickUnlockEnabled: true,
      biometricEnabled: true,
      biometricCredentialId: null,
      lockOnOpen: true,
      auditLog: [{ kind: 'unlocked' }, { kind: 'неизвестное' }, null, 'строка'],
    })
    assert.equal(clean.pinHash, null)
    assert.equal(clean.pinSalt, null)
    assert.equal(clean.pinQuickUnlockEnabled, false)
    assert.equal(clean.biometricEnabled, false)
    assert.equal(clean.lockOnOpen, true)
    assert.equal(clean.auditLog.length, 1)
    assert.equal(clean.auditLog[0].kind, 'unlocked')
  })

  it('sanitizeSecurityState приводит числа в допустимые границы', () => {
    const clean = sanitizeSecurityState({
      pinLength: 99,
      autoLockMinutes: 9999,
      failedAttempts: -5,
    })
    assert.equal(clean.pinLength, PIN_LENGTH)
    assert.equal(clean.autoLockMinutes, 240)
    assert.equal(clean.failedAttempts, 0)

    assert.equal(sanitizeSecurityState(null).pinQuickUnlockEnabled, false)
    assert.deepEqual(sanitizeSecurityState(undefined).auditLog, [])
  })

  it('помощники состояния верно определяют активные способы входа', () => {
    const none = state()
    assert.equal(hasSecurityPin(none), false)
    assert.equal(hasBiometric(none), false)
    assert.equal(hasAccountPassword(none), false)
    assert.equal(hasUnlockMethod(none), false)
    assert.deepEqual(activeUnlockMethods(none), [])

    const secured = state({
      pinHash: 'h',
      pinSalt: 's',
      passwordHash: 'ph',
      passwordSalt: 'ps',
      biometricEnabled: true,
      biometricCredentialId: 'cred',
    })
    assert.equal(hasUnlockMethod(secured), true)
    assert.deepEqual(activeUnlockMethods(secured), ['pin', 'biometric', 'password'])
  })

  it('evaluateSecurityLevel отражает силу защиты', () => {
    assert.equal(evaluateSecurityLevel(state()).level, 'none')

    const basic = state({ pinHash: 'h', pinSalt: 's' })
    const basicLevel = evaluateSecurityLevel(basic)
    assert.equal(basicLevel.level, 'basic')
    assert.equal(basicLevel.percent, 26)

    const strong = state({
      pinHash: 'h',
      pinSalt: 's',
      passwordHash: 'ph',
      passwordSalt: 'ps',
      lockOnOpen: true,
      autoLockMinutes: 5,
    })
    const strongLevel = evaluateSecurityLevel(strong)
    assert.equal(strongLevel.level, 'strong')
    assert.equal(strongLevel.percent, 74)
  })

  it('buildSecurityHint отражает готовность способов входа', () => {
    const sec = state({
      pinHash: 'h',
      pinSalt: 's',
      passwordHash: 'ph',
      passwordSalt: 'ps',
      lockOnOpen: true,
      autoLockMinutes: 15,
    })
    const hint = buildSecurityHint(sec)
    assert.deepEqual(hint, {
      lockOnOpen: true,
      hasPin: true,
      hasBiometric: false,
      hasPassword: true,
      autoLockMinutes: 15,
    })
  })
})
