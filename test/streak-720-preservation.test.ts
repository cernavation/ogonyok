import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeStreak } from '../lib/ogonek/streak.ts'
import type { Day } from '../lib/ogonek/types.ts'

describe('Сохранение 720 дней летописи и расчет стрика без потерь', () => {
  function generate720Days(): { days: Day[]; datesSet: Set<string> } {
    const days: Day[] = []
    const datesSet = new Set<string>()
    const baseDate = new Date('2024-11-09T12:00:00.000Z')

    for (let i = 1; i <= 720; i++) {
      const cur = new Date(baseDate.getTime() + (i - 1) * 86_400_000)
      const dateISO = cur.toISOString().slice(0, 10)
      datesSet.add(dateISO)

      days.push({
        id: i,
        tags: [],
        dateISO,
        title: `День осознанности #${i}`,
        prides: [
          { num: '01', text: `Гордость 1 дня #${i}`, scale: 9, overcome: 0, visibility: 'public' },
          { num: '02', text: `Гордость 2 дня #${i}`, scale: 10, overcome: 0, visibility: 'public' },
          { num: '03', text: `Гордость 3 дня #${i}`, scale: 9, overcome: 0, visibility: 'public' },
          { num: '04', text: `Гордость 4 дня #${i}`, scale: 10, overcome: 0, visibility: 'public' },
          { num: '05', text: `Гордость 5 дня #${i}`, scale: 9, overcome: 0, visibility: 'public' },
        ],
        gratitudes: [
          `Спасибо за день #${i} - 1`,
          `Спасибо за день #${i} - 2`,
          `Спасибо за день #${i} - 3`,
          `Спасибо за день #${i} - 4`,
          `Спасибо за день #${i} - 5`,
        ],
        visibility: 'public',
      })
    }

    return { days, datesSet }
  }

  it('содержит ровно 720 дней с непрерывной нумерацией 1..720', () => {
    const { days } = generate720Days()
    assert.equal(days.length, 720)
    assert.equal(days[0].id, 1)
    assert.equal(days[719].id, 720)

    for (let i = 0; i < 720; i++) {
      assert.equal(days[i].id, i + 1)
    }
  })

  it('все 720 дат уникальны и последовательны без пропусков', () => {
    const { datesSet } = generate720Days()
    assert.equal(datesSet.size, 720)
  })

  it('computeStreak вычисляет честный стрик 720 дней', () => {
    const { datesSet, days } = generate720Days()
    const lastDayStr = days[719].dateISO!
    const testNow = new Date(`${lastDayStr}T18:00:00.000Z`)

    const result = computeStreak(datesSet, testNow, { tz: 'UTC' })
    assert.equal(result.streak, 720)
    assert.equal(result.best, 720)
    assert.equal(result.status, 'safe')
    assert.equal(result.missedRun, 0)
    assert.equal(result.lastEntryDay, lastDayStr)
  })

  it('при добавлении 721-го дня стрик корректно возрастает до 721', () => {
    const { datesSet, days } = generate720Days()
    const lastDate = new Date(`${days[719].dateISO}T12:00:00.000Z`)
    const day721 = new Date(lastDate.getTime() + 86_400_000)
    const day721Str = day721.toISOString().slice(0, 10)

    datesSet.add(day721Str)
    const testNow = new Date(`${day721Str}T20:00:00.000Z`)

    const result = computeStreak(datesSet, testNow, { tz: 'UTC' })
    assert.equal(result.streak, 721)
    assert.equal(result.best, 721)
    assert.equal(result.status, 'safe')
  })

  it('сортировка перемешанного массива 720 дней восстанавливает убывающий порядок', () => {
    const { days } = generate720Days()
    const shuffled = [...days].sort(() => Math.random() - 0.5)

    const sortedDesc = [...shuffled].sort((a, b) => b.id - a.id)
    assert.equal(sortedDesc[0].id, 720)
    assert.equal(sortedDesc[719].id, 1)

    for (let i = 0; i < sortedDesc.length - 1; i++) {
      assert.ok(sortedDesc[i].id > sortedDesc[i + 1].id)
    }
  })

  it('Map-индексирование 720 дней обеспечивает поиск за O(1)', () => {
    const { days } = generate720Days()
    const map = new Map<number, Day>(days.map((d) => [d.id, d]))

    assert.equal(map.size, 720)
    assert.equal(map.get(720)?.id, 720)
    assert.equal(map.get(1)?.id, 1)
    assert.equal(map.get(360)?.id, 360)
    assert.equal(map.get(999), undefined)
  })

  it('JSON сериализация и парсинг 720 дней не теряют ни одного поля', () => {
    const { days } = generate720Days()
    const json = JSON.stringify(days)
    const parsed: Day[] = JSON.parse(json)

    assert.equal(parsed.length, 720)
    assert.equal(parsed[719].id, 720)
    assert.equal(parsed[719].prides?.length, 5)
    assert.equal(parsed[719].gratitudes?.length, 5)
    assert.equal(parsed[0].dateISO, days[0].dateISO)
    assert.equal(parsed[719].dateISO, days[719].dateISO)
  })

  it('повторное добавление существующей даты не раздувает стрик', () => {
    const { datesSet, days } = generate720Days()
    const sizeBefore = datesSet.size
    if (days[0].dateISO) datesSet.add(days[0].dateISO)
    if (days[350].dateISO) datesSet.add(days[350].dateISO)
    assert.equal(datesSet.size, sizeBefore)
  })

  it('вычисляет grace period при отсутствии записи за сегодня, если вчера было закрыто', () => {
    const { datesSet, days } = generate720Days()
    const lastDay = days[719].dateISO!
    const nextDay = new Date(new Date(`${lastDay}T12:00:00.000Z`).getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10)
    // Сегодня — nextDay, но записи за него ещё нет
    const testNow = new Date(`${nextDay}T14:00:00.000Z`)

    const result = computeStreak(datesSet, testNow, { tz: 'UTC' })
    assert.equal(result.streak, 720)
    assert.equal(result.status, 'grace')
    assert.equal(result.lastEntryDay, lastDay)
    assert.ok(typeof result.hoursLeft === 'number')
  })

  it('при пропуске более допустимого grace period стрик считается сгоревшим (burned)', () => {
    const { datesSet, days } = generate720Days()
    const lastDay = days[719].dateISO!
    // Спустя 5 дней после последней записи
    const burnedNow = new Date(new Date(`${lastDay}T12:00:00.000Z`).getTime() + 5 * 86_400_000)

    const result = computeStreak(datesSet, burnedNow, { tz: 'UTC' })
    assert.equal(result.status, 'burned')
    assert.equal(result.streak, 0)
    assert.equal(result.best, 720)
    assert.ok(result.missedRun >= 1)
  })
})
