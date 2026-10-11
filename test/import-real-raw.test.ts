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

  it('contains exactly 720 total days in ledger', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    assert.equal(raw.days.length, 720)
    assert.equal(raw.days[0].id, 720)
    assert.equal(raw.days[raw.days.length - 1].id, 1)
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

  it('Day #670: date is 21.08.2026 and text is "Горжусь тем что серьёзно от читал сашу..."', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day670 = raw.days.find((d: { id: number }) => d.id === 670)
    assert.ok(day670, 'Day #670 exists')
    assert.ok(day670.dateISO?.startsWith('2026-08-21'), `Date should start with 2026-08-21, got ${day670.dateISO}`)
    assert.ok(
      day670.prides[0]?.text.toLowerCase().includes('читал сашу'),
      'Text contains "читал сашу"'
    )
    assert.equal(day670.prides[0]?.scale, 10)
  })

  it('Day #651: date is 01.08.2026 and text is "Горжусь тем что решил с огромного листа попыток..."', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day651 = raw.days.find((d: { id: number }) => d.id === 651)
    assert.ok(day651, 'Day #651 exists')
    assert.ok(day651.dateISO?.startsWith('2026-08-01'), `Date should start with 2026-08-01, got ${day651.dateISO}`)
    assert.ok(
      day651.prides[0]?.text.toLowerCase().includes('огромного листа'),
      'Text contains "огромного листа"'
    )
    assert.equal(day651.prides[0]?.scale, 10)
  })

  it('Day #719: last pride day (07.10.2026) without empty placeholders between 713 and 719', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day719 = raw.days.find((d: { id: number }) => d.id === 719)
    assert.ok(day719, 'Day #719 exists')
    assert.ok(day719.dateISO?.startsWith('2026-10-07'), `Date should start with 2026-10-07, got ${day719.dateISO}`)
    assert.notEqual(day719.title, '—', 'Day #719 must have authentic text, not "—"')
    assert.ok(day719.title.includes('Волошина Дмитрия'))

    // Verify all days 713..719 have real authentic entries
    for (let id = 713; id <= 719; id++) {
      const d = raw.days.find((item: { id: number }) => item.id === id)
      assert.ok(d, `Day #${id} exists`)
      assert.notEqual(d.title, '—', `Day #${id} must not be a placeholder "—"`)
      assert.ok(d.prides.length >= 5, `Day #${id} must have >= 5 prides`)
    }
  })

  it('contains NO stock bike pictures when images is empty array', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day670 = raw.days.find((d: { id: number }) => d.id === 670)
    assert.equal(day670.photos, undefined)

    // Check no unsplash bike links anywhere in the generated JSON
    const content = fs.readFileSync(seedPath, 'utf8')
    assert.ok(!content.includes('unsplash.com/photo-1541625602330-2277a4c46182'))
  })

  it('correctly stitches Day 24/25 and Day 297/298 seams', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day24 = raw.days.find((d: { id: number }) => d.id === 24)
    const day25 = raw.days.find((d: { id: number }) => d.id === 25)
    assert.equal(day24.title, '—')
    assert.ok(day25.title.includes('Коржик'))
    assert.ok(day25.dateISO?.startsWith('2024-11-18'))

    const day297 = raw.days.find((d: { id: number }) => d.id === 297)
    const day298 = raw.days.find((d: { id: number }) => d.id === 298)
    assert.ok(day297.title.includes('Валеру'))
    assert.ok(day297.dateISO?.startsWith('2025-08-16'))
    assert.ok(day298.title.includes('Аванесу'))
    assert.ok(day298.dateISO?.startsWith('2025-08-17'))
  })
})
