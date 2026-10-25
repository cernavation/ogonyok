import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getInitials } from '../lib/ogonek/initials.ts'

describe('Единая утилита инициалов getInitials', () => {
  it('строго возвращает "АЦ" для Алексея Церна и "C" для никнейма cernavation без имени', () => {
    assert.equal(getInitials('Алексей Церна'), 'АЦ')
    assert.equal(getInitials('Алексей Церна', 'cernavation'), 'АЦ')
    assert.equal(getInitials('', 'cernavation'), 'C')
    assert.equal(getInitials(null, 'cernavation'), 'C')
    assert.equal(getInitials('cernavation', 'cernavation'), 'C')
    assert.equal(getInitials('Alexei Cerna'), 'АЦ')
    assert.equal(getInitials('Алексей Черна'), 'АЦ')
  })

  it('корректно генерирует инициалы из двух слов', () => {
    assert.equal(getInitials('Иван Петров'), 'ИП')
    assert.equal(getInitials('John Doe'), 'JD')
  })

  it('генерирует 1 букву для одиночного никнейма и 2 буквы при разделителе', () => {
    assert.equal(getInitials('', 'cernavation'), 'C')
    assert.equal(getInitials('', 'cris_pol'), 'CP')
    assert.equal(getInitials('cris_pol'), 'CP')
  })

  it('обрабатывает пустые значения и 1 символ', () => {
    assert.equal(getInitials('A'), 'A')
    assert.equal(getInitials(''), 'ОГ')
    assert.equal(getInitials(null, null), 'ОГ')
  })
})
