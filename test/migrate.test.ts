import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { migrateGordzaItems, type GordzaRawItem } from '../lib/ogonek/migrate.ts'

describe('Gordza Legacy Migration Engine', () => {
  it('correctly maps pride day id using prideOffset (seq + 289)', () => {
    const rawItems: GordzaRawItem[] = [
      {
        id: 'p-1',
        type: 'pride',
        seq: 1,
        dateISO: '2024-01-01',
        entries: [{ text: 'Первая победа', rating: 9 }],
        tags: ['sport'],
      },
      {
        id: 'p-430',
        type: 'pride',
        seq: 430,
        dateISO: '2026-10-09',
        entries: [{ text: 'Финальный 719-й день', rating: 10 }],
        tags: ['work'],
      },
    ]

    const { days } = migrateGordzaItems(rawItems, { prideOffset: 289, gratOffset: 244 })

    assert.equal(days.length, 2)
    // Days sorted descending by ID
    assert.equal(days[0].id, 719) // 430 + 289
    assert.equal(days[1].id, 290) // 1 + 289
  })

  it('correctly merges paired pride and gratitude items by date', () => {
    const rawItems: GordzaRawItem[] = [
      {
        id: 'p-10',
        type: 'pride',
        seq: 10,
        dateISO: '2024-05-15',
        entries: [
          { text: 'Пробежал 5 км', rating: 8 },
          { text: 'Написал код', rating: 9 },
        ],
        tags: ['sport'],
      },
      {
        id: 'g-5',
        type: 'gratitude',
        seq: 5,
        dateISO: '2024-05-15',
        entries: [
          { text: 'Благодарен утру за ясность' },
          { text: 'Благодарен другу за звонок' },
        ],
        tags: ['life'],
      },
    ]

    const { days, stats } = migrateGordzaItems(rawItems, { prideOffset: 289, gratOffset: 244 })

    assert.equal(days.length, 1)
    const day = days[0]
    assert.equal(day.id, 299) // 10 + 289
    assert.equal(day.prides.length, 2)
    assert.equal(day.gratitudes.length, 2)
    assert.ok(day.tags.includes('Спорт'))
    assert.ok(day.tags.includes('Личное'))
    assert.equal(stats.totalPrides, 2)
    assert.equal(stats.totalGratitudes, 2)
  })

  it('maps legacy English tags to Russian journal tags', () => {
    const rawItems: GordzaRawItem[] = [
      {
        id: 'p-1',
        type: 'pride',
        seq: 1,
        dateISO: '2024-01-01',
        entries: [{ text: 'Тест тегов', rating: 7 }],
        tags: ['work', 'school', 'creative', 'health'],
      },
    ]

    const { days } = migrateGordzaItems(rawItems)
    const day = days[0]

    assert.ok(day.tags.includes('Бизнес'))
    assert.ok(day.tags.includes('Учёба'))
    assert.ok(day.tags.includes('Творчество'))
    assert.ok(day.tags.includes('Здоровье'))
  })

  it('normalizes scale and calculates overcome from text', () => {
    const rawItems: GordzaRawItem[] = [
      {
        id: 'p-1',
        type: 'pride',
        seq: 1,
        dateISO: '2024-01-01',
        entries: [
          { text: 'Несмотря на страх и панику сделал прорыв', rating: 12 }, // should clamp to 10 and overcome 3
          { text: 'Обычная утренняя разминка', rating: 'invalid' }, // default 7 and overcome 0
        ],
      },
    ]

    const { days } = migrateGordzaItems(rawItems)
    const day = days[0]

    assert.equal(day.prides[0].scale, 10)
    assert.equal(day.prides[0].overcome, 3)
    assert.equal(day.prides[1].scale, 7)
    assert.equal(day.prides[1].overcome, 0)
  })
})
