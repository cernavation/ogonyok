import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  friendlyAuthError,
  usernameToEmail,
  emailToUsername,
  validatePassword,
  validateUsername,
} from '../lib/ogonek/supabase-client.ts'

describe('Supabase Auth: Валидация никнейма (ЗАДАЧА 3)', () => {
  it('принимает корректный никнейм из 3-20 латинских букв, цифр и _', () => {
    assert.equal(validateUsername('cerna').valid, true)
    assert.equal(validateUsername('alex_cerna_99').valid, true)
    assert.equal(validateUsername('run_10km').valid, true)
    assert.equal(validateUsername('abc').valid, true)
    assert.equal(validateUsername('a_1').valid, true)
  })

  it('приводит никнейм к нижнему регистру и обрезает пробелы', () => {
    const res = validateUsername('  Alex_Cerna  ')
    assert.equal(res.valid, true)
    assert.equal(res.clean, 'alex_cerna')
  })

  it('отклоняет слишком короткий (< 3 символов) никнейм', () => {
    assert.equal(validateUsername('').valid, false)
    assert.equal(validateUsername('a').valid, false)
    assert.equal(validateUsername('ab').valid, false)
    assert.match(validateUsername('ab').error || '', /минимум 3/i)
  })

  it('отклоняет слишком длинный (> 20 символов) никнейм', () => {
    const long = 'a'.repeat(21)
    assert.equal(validateUsername(long).valid, false)
    assert.match(validateUsername(long).error || '', /максимум 20/i)
  })

  it('отклоняет спецсимволы, пробелы, точки и кириллицу', () => {
    assert.equal(validateUsername('alex.cerna').valid, false)
    assert.equal(validateUsername('alex-cerna').valid, false)
    assert.equal(validateUsername('саша').valid, false)
    assert.equal(validateUsername('user@domain').valid, false)
    assert.equal(validateUsername('user name').valid, false)
  })
})

describe('Supabase Auth: Валидация пароля (ЗАДАЧА 3)', () => {
  it('требует минимум 8 символов', () => {
    assert.equal(validatePassword('').valid, false)
    assert.equal(validatePassword('1234567').valid, false)
    assert.match(validatePassword('1234567').error || '', /минимум 8/i)
    assert.equal(validatePassword('12345678').valid, true)
  })

  it('корректно оценивает сложность пароля', () => {
    const weak = validatePassword('12345678')
    assert.equal(weak.valid, true)
    assert.ok(weak.score <= 2)

    const strong = validatePassword('SuperSecret123!')
    assert.equal(strong.valid, true)
    assert.ok(strong.score >= 4)
  })
})

describe('Supabase Auth: Маппинг email и понятные ошибки (ЗАДАЧА 3)', () => {
  it('маппит никнейм в канонический email @ogonek.local', () => {
    assert.equal(usernameToEmail('cerna'), 'cerna@ogonek.local')
    assert.equal(usernameToEmail('alex_99'), 'alex_99@ogonek.local')
    assert.equal(usernameToEmail(''), 'user@ogonek.local')
    assert.equal(emailToUsername('cerna@ogonek.local'), 'cerna')
    assert.equal(usernameToEmail('cerna', 'ogonek.app'), 'cerna@ogonek.app')
  })

  it('переводит системные ошибки Supabase на дружелюбный русский язык', () => {
    assert.equal(friendlyAuthError('User already registered'), 'Этот ник уже занят')
    assert.equal(friendlyAuthError('Invalid login credentials'), 'Неверный логин или пароль')
    assert.equal(friendlyAuthError('Email rate limit exceeded'), 'Слишком много попыток, подожди минуту')
    assert.equal(friendlyAuthError('Failed to fetch'), 'Нет связи. Проверь интернет-соединение')
  })
})
