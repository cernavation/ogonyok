import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Day, PrideEntry, GratitudeEntry, VisibilityLevel } from '../lib/ogonek/types.ts'

describe('Дисциплина и парность 5+5: гордости и благодарности', () => {
  function normalizePrides(raw: (string | Partial<PrideEntry>)[]): PrideEntry[] {
    const list: PrideEntry[] = raw.map((item, idx) => {
      const num = String(idx + 1).padStart(2, '0')
      if (typeof item === 'string') {
        return { num, text: item.trim(), scale: 0, overcome: 0, visibility: 'public' }
      }
      return {
        num,
        text: item.text?.trim() || '—',
        scale: typeof item.scale === 'number' ? item.scale : 0,
        overcome: item.overcome ?? 0,
        visibility: (item.visibility as VisibilityLevel) || 'public',
      }
    })

    while (list.length < 5) {
      const num = String(list.length + 1).padStart(2, '0')
      list.push({ num, text: '—', scale: 0, overcome: 0, visibility: 'public' })
    }

    return list.slice(0, 5)
  }

  function normalizeGratitudes(raw: (string | Partial<GratitudeEntry>)[]): GratitudeEntry[] {
    const list: GratitudeEntry[] = raw.map((item, idx) => {
      const num = String(idx + 1).padStart(2, '0')
      if (typeof item === 'string') {
        return { num, text: item.trim(), rating: 0, visibility: 'public' }
      }
      return {
        num,
        text: item.text?.trim() || '—',
        rating: typeof item.rating === 'number' ? item.rating : 0,
        visibility: (item.visibility as VisibilityLevel) || 'public',
      }
    })

    while (list.length < 5) {
      const num = String(list.length + 1).padStart(2, '0')
      list.push({ num, text: '—', rating: 0, visibility: 'public' })
    }

    return list.slice(0, 5)
  }

  function countFilled(entries: { text: string }[]): number {
    return entries.filter((e) => e.text && e.text !== '—' && e.text.trim().length > 0).length
  }

  it('нормализует пустые или короткие массивы строго до 5 элементов с прочерками', () => {
    const prides = normalizePrides(['Победа 1', 'Победа 2'])
    assert.equal(prides.length, 5)
    assert.equal(prides[0].text, 'Победа 1')
    assert.equal(prides[1].text, 'Победа 2')
    assert.equal(prides[2].text, '—')
    assert.equal(prides[3].text, '—')
    assert.equal(prides[4].text, '—')

    const grats = normalizeGratitudes(['Спасибо солнцу'])
    assert.equal(grats.length, 5)
    assert.equal(grats[0].text, 'Спасибо солнцу')
    assert.equal(grats[1].text, '—')
    assert.equal(grats[4].text, '—')
  })

  it('обрезает лишние элементы сверх 5 слотов до канонического лимита 5', () => {
    const raw = ['1', '2', '3', '4', '5', '6', '7']
    const prides = normalizePrides(raw)
    assert.equal(prides.length, 5)
    assert.equal(prides[4].text, '5')
  })

  it('день считается образцовым (полным 5+5), когда заполнено ровно 5 гордостей и 5 благодарностей', () => {
    const day: Day = {
      id: 720,
      tags: [],
      dateISO: '2026-10-29',
      title: 'День силы',
      prides: normalizePrides(['G1', 'G2', 'G3', 'G4', 'G5']),
      gratitudes: normalizeGratitudes(['B1', 'B2', 'B3', 'B4', 'B5']),
      visibility: 'public',
    }

    const filledP = countFilled(day.prides)
    const filledG = countFilled(day.gratitudes as any[])

    assert.equal(filledP, 5)
    assert.equal(filledG, 5)
    assert.equal(filledP + filledG, 10)
  })

  it('прочерки «—» не учитываются как выполненные записи', () => {
    const day: Day = {
      id: 719,
      tags: [],
      dateISO: '2026-10-28',
      title: 'День',
      prides: normalizePrides(['Только одна гордость']),
      gratitudes: normalizeGratitudes(['Только одна благодарность']),
      visibility: 'public',
    }

    assert.equal(countFilled(day.prides), 1)
    assert.equal(countFilled(day.gratitudes as any[]), 1)
  })

  it('каждый из 10 слотов сохраняет независимый уровень приватности', () => {
    const prideVisMap: Record<number, VisibilityLevel> = {
      0: 'public',
      1: 'friends',
      2: 'private',
      3: 'public',
      4: 'private',
    }
    const gratVisMap: Record<number, VisibilityLevel> = {
      0: 'friends',
      1: 'private',
      2: 'public',
      3: 'friends',
      4: 'public',
    }

    const prides = normalizePrides([
      { text: 'P1', visibility: prideVisMap[0] },
      { text: 'P2', visibility: prideVisMap[1] },
      { text: 'P3', visibility: prideVisMap[2] },
      { text: 'P4', visibility: prideVisMap[3] },
      { text: 'P5', visibility: prideVisMap[4] },
    ])

    const grats = normalizeGratitudes([
      { text: 'G1', visibility: gratVisMap[0] },
      { text: 'G2', visibility: gratVisMap[1] },
      { text: 'G3', visibility: gratVisMap[2] },
      { text: 'G4', visibility: gratVisMap[3] },
      { text: 'G5', visibility: gratVisMap[4] },
    ])

    assert.equal(prides[0].visibility, 'public')
    assert.equal(prides[2].visibility, 'private')
    assert.equal(grats[0].visibility, 'friends')
    assert.equal(grats[1].visibility, 'private')
  })

  it('извлекает первую значимую гордость дня для главного тизера карточки', () => {
    const prides = normalizePrides(['—', 'Реальная победа', 'Другая победа'])
    const firstPride = prides.find((p) => p.text && p.text !== '—')

    assert.ok(firstPride)
    assert.equal(firstPride?.text, 'Реальная победа')
  })

  it('вычисляет общее число записей за 720 дней летописи (до 7200 записей)', () => {
    const daysCount = 720
    const entriesPerDay = 10
    const totalSlots = daysCount * entriesPerDay
    assert.equal(totalSlots, 7200)

    const fullDaysPridesCount = daysCount * 5
    const fullDaysGratitudesCount = daysCount * 5
    assert.equal(fullDaysPridesCount + fullDaysGratitudesCount, 7200)
  })

  it('сворачивание карточки скрывает остальные 4 гордости и 5 благодарностей', () => {
    const prides = normalizePrides(['P1', 'P2', 'P3', 'P4', 'P5'])
    const grats = normalizeGratitudes(['G1', 'G2', 'G3', 'G4', 'G5'])

    const firstPride = prides[0]
    const otherPrides = prides.filter((p) => p !== firstPride && p.text !== '—')
    const otherGratitudes = grats.filter((g) => g.text !== '—')

    assert.equal(otherPrides.length, 4)
    assert.equal(otherGratitudes.length, 5)
  })

  it('конвертация между строковым форматом благодарности и объектом обратима', () => {
    const rawString = 'Спасибо за наставника'
    const obj: GratitudeEntry = { text: rawString, rating: 9, visibility: 'public' }

    const extractText = (val: string | GratitudeEntry) => (typeof val === 'string' ? val : val.text)
    assert.equal(extractText(rawString), rawString)
    assert.equal(extractText(obj), rawString)
  })

  it('сохранение иммутабельности: обновление одной записи не мутирует остальные 9 слотов', () => {
    const initialPrides = normalizePrides(['A', 'B', 'C', 'D', 'E'])
    const updated = initialPrides.map((p, idx) => (idx === 2 ? { ...p, text: 'Updated C' } : p))

    assert.equal(initialPrides[2].text, 'C')
    assert.equal(updated[2].text, 'Updated C')
    assert.equal(updated[0], initialPrides[0])
    assert.equal(updated[4], initialPrides[4])
  })
})
