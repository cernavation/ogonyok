import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

describe('Authentic Real Raw Data Import', () => {
  const seedPath = path.resolve(rootDir, 'public', 'seeds', 'ogonek-import.v1.json')
  const migratedPath = path.resolve(rootDir, 'data', 'migrated', 'ogonek-import.v1.json')

  it('generates both public/seeds and data/migrated import files', () => {
    assert.ok(fs.existsSync(seedPath), 'public/seeds/ogonek-import.v1.json exists')
    assert.ok(fs.existsSync(migratedPath), 'data/migrated/ogonek-import.v1.json exists')
  })

  it('contains correct total days in ledger (≥700) and feed is sorted descending', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    // Должно быть не менее 700 дней (24 тетр + ~272 apple + ~406 raw + 3 manual)
    assert.ok(raw.days.length >= 700, `Expected >= 700 days, got ${raw.days.length}`)
    // Лента отсортирована по убыванию: первый элемент — самый свежий
    assert.equal(raw.days[0].id, raw.days.length, 'First in feed must be the last day by id')
    assert.equal(raw.days[raw.days.length - 1].id, 1, 'Last in feed must be day #1')
    // Строгая монотонность дат: лента идёт от новых к старым
    for (let i = 1; i < raw.days.length; i++) {
      assert.ok(
        raw.days[i].dateISO <= raw.days[i - 1].dateISO,
        `Feed is not sorted descending at pos ${i}: ${raw.days[i - 1].dateISO} -> ${raw.days[i].dateISO}`,
      )
    }
  })

  it('first 24 days (notebook) have placeholder "—"', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    for (let id = 1; id <= 24; id++) {
      const day = raw.days.find((d: { id: number }) => d.id === id)
      assert.ok(day, `Day #${id} exists`)
      assert.equal(day.title, '—')
      assert.equal(day.prides[0].text, '—')
      const g0 = typeof day.gratitudes[0] === 'string' ? day.gratitudes[0] : day.gratitudes[0]?.text
      assert.equal(g0, '—')
      assert.equal(day.photos, undefined)
    }
  })

  it('Day #657: date is 21.08.2026 and text contains "читал сашу"', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day657 = raw.days.find((d: { id: number }) => d.id === 657)
    assert.ok(day657, 'Day #657 exists')
    assert.ok(day657.dateISO?.startsWith('2026-08-21'), `Date should start with 2026-08-21, got ${day657.dateISO}`)
    assert.ok(
      day657.prides[0]?.text.toLowerCase().includes('читал сашу'),
      'Text contains "читал сашу"',
    )
    assert.equal(day657.prides[0]?.scale, 10)
  })

  it('Day #639: date is 01.08.2026 and text contains "огромного листа"', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day639 = raw.days.find((d: { id: number }) => d.id === 639)
    assert.ok(day639, 'Day #639 exists')
    assert.ok(day639.dateISO?.startsWith('2026-08-01'), `Date should start with 2026-08-01, got ${day639.dateISO}`)
    assert.ok(
      day639.prides[0]?.text.toLowerCase().includes('огромного листа'),
      'Text contains "огромного листа"',
    )
    assert.equal(day639.prides[0]?.scale, 10)
  })

  it('Day #702: date is 07.10.2026 and contains merged prides from both original entries', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day702 = raw.days.find((d: { id: number }) => d.id === 702)
    assert.ok(day702, 'Day #702 exists')
    assert.ok(day702.dateISO?.startsWith('2026-10-07'), `Date should start with 2026-10-07, got ${day702.dateISO}`)
    assert.notEqual(day702.title, '—', 'Day #702 must have authentic text, not "—"')
    // Мёрж двух записей от 07.10.2026 — должно быть >= 5 гордостей
    assert.ok(day702.prides.length >= 5, `Day #702 must have >= 5 prides, got ${day702.prides.length}`)
    // Проверяем что "Волошина Дмитрия" есть в одной из гордостей (это был второй блок)
    const allPrideText = day702.prides.map((p: { text: string }) => p.text).join(' ')
    assert.ok(allPrideText.includes('Волошина Дмитрия'), 'Day #702 prides must contain "Волошина Дмитрия"')
  })

  it('contains NO stock bike pictures when images is empty array', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day657 = raw.days.find((d: { id: number }) => d.id === 657)
    assert.equal(day657.photos, undefined)

    // Check no unsplash bike links anywhere in the generated JSON
    const content = fs.readFileSync(seedPath, 'utf8')
    assert.ok(!content.includes('unsplash.com/photo-1541625602330-2277a4c46182'))
  })

  it('correctly stitches Day 24/25 and Day 296/297 seams', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day24 = raw.days.find((d: { id: number }) => d.id === 24)
    const day25 = raw.days.find((d: { id: number }) => d.id === 25)
    assert.equal(day24.title, '—')
    assert.ok(day25.title.includes('Коржик'))
    assert.ok(day25.dateISO?.startsWith('2024-11-18'))

    // Apple Notes ends at day 296 (2025-08-16), REAL_RAW_DATA starts at day 297 (2025-08-17)
    const day296 = raw.days.find((d: { id: number }) => d.id === 296)
    const day297 = raw.days.find((d: { id: number }) => d.id === 297)
    assert.ok(day296.title.includes('Валеру'), `Day296 title should contain Валеру, got: ${day296.title}`)
    assert.ok(day296.dateISO?.startsWith('2025-08-16'))
    assert.ok(day297.title.includes('Аванесу'), `Day297 title should contain Аванесу, got: ${day297.title}`)
    assert.ok(day297.dateISO?.startsWith('2025-08-17'))
  })

  it('feed top (newest) is October 2026, feed bottom (oldest) is October 2024', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    // Самый свежий — октябрь 2026
    assert.ok(raw.days[0].dateISO?.startsWith('2026-10'), `Feed top should be 2026-10, got ${raw.days[0].dateISO}`)
    // Самый старый — октябрь 2024 (тетрадка)
    assert.ok(
      raw.days[raw.days.length - 1].dateISO?.startsWith('2024-10'),
      `Feed bottom should be 2024-10, got ${raw.days[raw.days.length - 1].dateISO}`,
    )
  })
})
