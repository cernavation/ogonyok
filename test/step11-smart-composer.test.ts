import assert from 'node:assert/strict'
import test from 'node:test'
import {
  distributeListItems,
  formatCharCount,
  handleLargeTextPaste,
  isSingleUrl,
  parseListItems,
  splitRemainder,
} from '../lib/ogonek/smart-composer.ts'

test('Шаг 11: Умный композер и чистая логика умной вставки', async (t) => {
  await t.test('isSingleUrl: корректно определяет одиночные ссылки и отклоняет смешанный текст', () => {
    assert.equal(isSingleUrl('https://example.com'), true)
    assert.equal(isSingleUrl('http://github.com/ogonyok/app?ref=123#readme'), true)
    assert.equal(isSingleUrl('   https://t.me/durov   '), true)
    assert.equal(isSingleUrl('Вот ссылка https://example.com'), false)
    assert.equal(isSingleUrl('https://site1.com https://site2.com'), false)
    assert.equal(isSingleUrl(''), false)
    assert.equal(isSingleUrl('Просто текст'), false)
  })

  await t.test('parseListItems: распознает нумерованные списки 1., 2., 3.', () => {
    const text = `1. Пробежал 10 км утром
2. Провел созвон с командой
3. Закрыл важный pull request`
    const items = parseListItems(text)
    assert.ok(items)
    assert.equal(items.length, 3)
    assert.equal(items[0], 'Пробежал 10 км утром')
    assert.equal(items[1], 'Провел созвон с командой')
    assert.equal(items[2], 'Закрыл важный pull request')
  })

  await t.test('parseListItems: распознает списки со скобками 1), 2), 3)', () => {
    const text = `1) Зарядка 15 мин
2) Чтение книги
3) Прогулка на свежем воздухе`
    const items = parseListItems(text)
    assert.ok(items)
    assert.equal(items.length, 3)
    assert.equal(items[0], 'Зарядка 15 мин')
    assert.equal(items[1], 'Чтение книги')
    assert.equal(items[2], 'Прогулка на свежем воздухе')
  })

  await t.test('parseListItems: распознает маркеры дефиса (-), буллетов (•), звездочек (*)', () => {
    const textHyphen = `- Сделал отчет
- Отправил письмо инвесторам`
    const itemsHyphen = parseListItems(textHyphen)
    assert.ok(itemsHyphen)
    assert.equal(itemsHyphen.length, 2)
    assert.equal(itemsHyphen[0], 'Сделал отчет')
    assert.equal(itemsHyphen[1], 'Отправил письмо инвесторам')

    const textBullet = `• Медитация 20 минут
• Контрастный душ
• Полноценный сон 8 часов`
    const itemsBullet = parseListItems(textBullet)
    assert.ok(itemsBullet)
    assert.equal(itemsBullet.length, 3)
    assert.equal(itemsBullet[0], 'Медитация 20 минут')

    const textStar = `* Рефакторинг базы
* Тесты WebRTC`
    const itemsStar = parseListItems(textStar)
    assert.ok(itemsStar)
    assert.equal(itemsStar.length, 2)
  })

  await t.test('parseListItems: распознает разделение несколькими абзацами', () => {
    const text = `Проснулся в 6 утра и сразу вышел на пробежку.

Закончил верстку нового адаптивного окна чатов.

Позвонил родителям и поблагодарил за поддержку.`
    const items = parseListItems(text)
    assert.ok(items)
    assert.equal(items.length, 3)
    assert.equal(items[0], 'Проснулся в 6 утра и сразу вышел на пробежку.')
    assert.equal(items[1], 'Закончил верстку нового адаптивного окна чатов.')
    assert.equal(items[2], 'Позвонил родителям и поблагодарил за поддержку.')
  })

  await t.test('parseListItems: одиночный текст или URL не является списком', () => {
    assert.equal(parseListItems('https://google.com'), null)
    assert.equal(parseListItems('Просто одна длинная строка без переносов и маркеров'), null)
    assert.equal(parseListItems(''), null)
  })

  await t.test('distributeListItems: раскладывает до 3 пунктов в пустые слоты', () => {
    const currentValues = ['', '', '', '', '']
    const items = ['Гордость 1', 'Гордость 2', 'Гордость 3', 'Гордость 4']
    const result = distributeListItems(currentValues, 0, items)

    assert.equal(result.distributedCount, 3)
    assert.deepEqual(result.targetSlots, [0, 1, 2])
    assert.equal(result.newValues[0], 'Гордость 1')
    assert.equal(result.newValues[1], 'Гордость 2')
    assert.equal(result.newValues[2], 'Гордость 3')
    assert.equal(result.newValues[3], '')
    assert.equal(result.nextFocusSlot, 3, 'Фокус переходит на следующий пустой слот')
  })

  await t.test('distributeListItems: если текущий слот 0 занят, раскладывает в 1, 2, 3', () => {
    const currentValues = ['Существующая победа', '', '', '', '']
    const items = ['Новая 1', 'Новая 2', 'Новая 3']
    const result = distributeListItems(currentValues, 0, items)

    assert.equal(result.distributedCount, 3)
    assert.deepEqual(result.targetSlots, [1, 2, 3])
    assert.equal(result.newValues[0], 'Существующая победа')
    assert.equal(result.newValues[1], 'Новая 1')
    assert.equal(result.newValues[2], 'Новая 2')
    assert.equal(result.newValues[3], 'Новая 3')
    assert.equal(result.nextFocusSlot, 4)
  })

  await t.test('distributeListItems: список из 2 пунктов раскладывается по 2 слотам', () => {
    const currentValues = ['', '', '', '', '']
    const items = ['Пункт А', 'Пункт Б']
    const result = distributeListItems(currentValues, 1, items)

    assert.equal(result.distributedCount, 2)
    assert.deepEqual(result.targetSlots, [1, 2])
    assert.equal(result.newValues[1], 'Пункт А')
    assert.equal(result.newValues[2], 'Пункт Б')
  })

  await t.test('handleLargeTextPaste: большой текст (>= 120 симв.) вставляется в пустой слот и двигает фокус', () => {
    const currentValues = ['', '', '', '', '']
    const largeText = 'Очень важное достижение дня, которое заняло много времени и сил, потребовало максимальной концентрации и преодоления всех сомнений!'.repeat(2)
    assert.ok(largeText.length >= 120)

    const result = handleLargeTextPaste(currentValues, 0, largeText)
    assert.equal(result.targetSlot, 0)
    assert.equal(result.newValues[0], largeText)
    assert.equal(result.nextFocusSlot, 1)
  })

  await t.test('handleLargeTextPaste: если текущий слот занят, ищет ближайший пустой', () => {
    const currentValues = ['Первая запись', '', '', '', '']
    const largeText = 'А'.repeat(150)

    const result = handleLargeTextPaste(currentValues, 0, largeText)
    assert.equal(result.targetSlot, 1, 'Вставляется в ближайший пустой слот 1')
    assert.equal(result.newValues[0], 'Первая запись')
    assert.equal(result.newValues[1], largeText)
    assert.equal(result.nextFocusSlot, 2)
  })

  await t.test('splitRemainder: текст длиннее лимита аккуратно делится по границе слова', () => {
    const maxChars = 1000
    const head = 'Слово '.repeat(160) // ~960 симв.
    const tail = 'Хвост '.repeat(50) // ~300 симв.
    const fullText = head + tail
    assert.ok(fullText.length > maxChars)

    const currentValues = [fullText, '', '', '', '']
    const result = splitRemainder(currentValues, 0, maxChars)

    assert.equal(result.targetSlot, 0)
    assert.equal(result.remainderSlot, 1)
    assert.ok(result.currentPart.length <= maxChars)
    assert.ok(result.remainderPart.length > 0)
    assert.equal(result.newValues[0], result.currentPart)
    assert.equal(result.newValues[1], result.remainderPart)
    assert.ok(!result.currentPart.endsWith(' '))
  })

  await t.test('formatCharCount: форматирует числа с разделителями тысяч', () => {
    assert.equal(formatCharCount(742, 1000), '742/1000')
    const formatted = formatCharCount(1340, 1000)
    assert.ok(formatted.includes('1') && formatted.includes('340/1000'))
  })
})
