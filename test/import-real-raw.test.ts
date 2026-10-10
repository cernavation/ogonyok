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

  it('contains exactly 719 total days in ledger', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    assert.equal(raw.days.length, 719)
    assert.equal(raw.days[0].id, 719)
    assert.equal(raw.days[raw.days.length - 1].id, 1)
  })

  it('first 24 days (notebook) have placeholder "—"', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    for (let id = 1; id <= 24; id++) {
      const day = raw.days.find((d: { id: number }) => d.id === id)
      assert.ok(day, `Day #${id} exists`)
      assert.equal(day.title, '—')
      assert.equal(day.prides[0].text, '—')
      assert.equal(day.gratitudes[0], '—')
      assert.equal(day.photos, undefined)
    }
  })

  it('migrated days 290+ preserve authentic text and ratings without censorship', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day290 = raw.days.find((d: { id: number }) => d.id === 290)
    assert.ok(day290, 'Day #290 exists')
    assert.equal(day290.prides.length, 5)
    assert.equal(day290.prides[0].text, 'позвонил Аванесу, с вопросом о завтрашнем присутствии на шахматах')
    assert.equal(day290.prides[0].scale, 7)
    assert.equal(day290.gratitudes[0], 'Аванес ответил на мой звонок, разрешил добавить его в группу')

    const day713 = raw.days.find((d: { id: number }) => d.id === 713)
    assert.ok(day713, 'Day #713 exists')
    assert.ok(day713.prides.length >= 5)
    assert.ok(day713.title.includes('Мемернити'))
  })

  it('contains NO stock bike pictures when images is empty array', () => {
    const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    const day290 = raw.days.find((d: { id: number }) => d.id === 290)
    assert.equal(day290.photos, undefined)

    // Check no unsplash bike links anywhere in the generated JSON
    const content = fs.readFileSync(seedPath, 'utf8')
    assert.ok(!content.includes('unsplash.com/photo-1541625602330-2277a4c46182'))
  })
})
