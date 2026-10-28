import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Вспомогательная чистая функция логики умного переключения кружков в Composer:
 * Ищет первый незаполненный слот (0..4) среди переданного списка записей.
 * Если все 5 слотов заполнены, возвращает 0 (fallback).
 */
export function getSmartSlotIndex(items: string[]): number {
  const firstEmptyIdx = items.slice(0, 5).findIndex((item) => !item || item.trim().length === 0)
  return firstEmptyIdx >= 0 ? firstEmptyIdx : 0
}

test('Умное переключение кружков и слотов в Composer', async (t) => {
  await t.test('компонент composer.tsx содержит каноническую реализацию умного переключения слотов', () => {
    const composerCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/composer.tsx'), 'utf8')
    assert.ok(composerCode.includes('handleSwitchTab'), 'handleSwitchTab объявлен в composer.tsx')
    assert.ok(composerCode.includes('firstEmptyIdx'), 'firstEmptyIdx вычисляется при переключении таба')
    assert.ok(composerCode.includes('targetList.slice(0, 5).findIndex'), 'Ищется первый пустой индекс в первых 5 слотах')
    assert.ok(composerCode.includes('setActiveSlot(firstEmptyIdx >= 0 ? firstEmptyIdx : 0)'), 'Слот переключается на пустой или 0')
  })

  await t.test('выбирает слот 0, если список полностью пустой', () => {
    const emptyList = ['', '', '', '', '']
    assert.equal(getSmartSlotIndex(emptyList), 0)
  })

  await t.test('выбирает слот 1, если заполнен только слот 0', () => {
    const items = ['Пробежал утренние 5 км', '', '', '', '']
    assert.equal(getSmartSlotIndex(items), 1)
  })

  await t.test('выбирает слот 2, если заполнены слоты 0 и 1', () => {
    const items = ['Пробежал утренние 5 км', 'Провел рефакторинг API', '', '', '']
    assert.equal(getSmartSlotIndex(items), 2)
  })

  await t.test('выбирает слот 3, если заполнены слоты 0, 1 и 2', () => {
    const items = ['Гордость 1', 'Гордость 2', 'Гордость 3', '', '']
    assert.equal(getSmartSlotIndex(items), 3)
  })

  await t.test('выбирает слот 4, если заполнены 4 слота', () => {
    const items = ['Гордость 1', 'Гордость 2', 'Гордость 3', 'Гордость 4', '']
    assert.equal(getSmartSlotIndex(items), 4)
  })

  await t.test('возвращает слот 0 (fallback), если все 5 слотов заполнены текстом', () => {
    const items = [
      'Пробежал 5 км',
      'Закрыл спринт',
      'Помог коллеге',
      'Изучил WebRTC',
      'Лег вовремя спать',
    ]
    assert.equal(getSmartSlotIndex(items), 0)
  })

  await t.test('считает слоты только из пробелов или переводов строк пустыми', () => {
    const items = ['Заполнено 0', '   ', 'Гордость 2', '', '']
    // Слот 1 содержит пробелы -> считается пустым
    assert.equal(getSmartSlotIndex(items), 1)
  })

  await t.test('считает undefined и null в массиве пустыми слотами', () => {
    const items = ['Заполнено 0', undefined as any, 'Гордость 2', '', '']
    assert.equal(getSmartSlotIndex(items), 1)
  })

  await t.test('корректно находит первый пропущенный слот (например слот 0 пуст, а 1 заполнен)', () => {
    const items = ['', 'Гордость 1', 'Гордость 2', '', '']
    assert.equal(getSmartSlotIndex(items), 0)
  })

  await t.test('игнорирует шестой слот (extra) при расчете первых пяти кружков', () => {
    // Первые 5 слотов заполнены, 6-й пуст -> должен вернуть 0, так как лимит 5
    const items = ['Г1', 'Г2', 'Г3', 'Г4', 'Г5', '']
    assert.equal(getSmartSlotIndex(items), 0)
  })

  await t.test('симуляция переключения между Гордостями и Благодарностями', () => {
    const prides = ['Пробежал 10 км', 'Сдал проект', '', '', '']
    const gratitudes = ['', '', '', '', '']

    // Пользователь переключается на Благодарности -> должен открыться слот 0
    const gratitudeSlot = getSmartSlotIndex(gratitudes)
    assert.equal(gratitudeSlot, 0)

    // Пользователь переключается обратно на Гордости -> должен открыться слот 2
    const prideSlot = getSmartSlotIndex(prides)
    assert.equal(prideSlot, 2)
  })

  await t.test('симуляция заполнения всех слотов благодарения', () => {
    const gratitudes = ['Семье', 'Команде', 'Наставнику', 'Здоровью', 'Дню']
    const nextSlot = getSmartSlotIndex(gratitudes)
    assert.equal(nextSlot, 0, 'При полностью заполненных слотах возвращается первый для проверки')
  })
})
