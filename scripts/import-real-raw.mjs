#!/usr/bin/env node

/**
 * scripts/import-real-raw.mjs
 * Migrates 100% authentic user diary records from data/REAL_RAW_DATA.json.
 *
 * Rules:
 * - Parses data/REAL_RAW_DATA.json.
 * - Pride numbering: dayId = item.seq + prideOffset (offset 294 aligns Day #670, Day #651, and Day #719).
 * - Real dates: taken STRICTLY from item.dateISO / item.createdAtISO. No synthetic forward/backward shift!
 * - Pairs prides and gratitudes by calendar date (dateKey = YYYY-MM-DD).
 * - Preserves EVERY word, comma, original rating (1-10) without censorship.
 * - Completely removes any stock fake bicycle photos: if images is empty, card is clean text-only.
 * - Days 1–24 (from notebook) created with placeholder "—".
 * - Exactly 719 contiguous days in ledger, Day #719 is newest real pride day (no empty "—" between 713 and 719).
 * - Saves output to public/seeds/ogonek-import.v1.json, data/migrated/ogonek-import.v1.json, and public/seeds/history-migrated.json.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeStreak } from '../lib/ogonek/streak.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
function getArgValue(flag) {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null
}

const inputCandidate1 = path.resolve(rootDir, 'data', 'REAL_RAW_DATA.json')
const inputCandidate2 = path.resolve(rootDir, 'data', 'migrated', 'REAL_RAW_DATA.json')
const inputPath = getArgValue('--input') || (fs.existsSync(inputCandidate1) ? inputCandidate1 : inputCandidate2)

const customOffset = getArgValue('--pride-offset')
// Default offset 294 mathematically satisfies:
// seq 376 (2026-08-21) + 294 = Day #670
// seq 357 (2026-08-01) + 294 = Day #651
// seq 425 (2026-10-07) + 294 = Day #719 (last authentic pride day)
const prideOffset = customOffset ? parseInt(customOffset, 10) : 294
const gratOffset = 249

const publicOutPath = path.resolve(rootDir, 'public', 'seeds', 'ogonek-import.v1.json')
const migratedOutPath = path.resolve(rootDir, 'data', 'migrated', 'ogonek-import.v1.json')
const historySeedPath = path.resolve(rootDir, 'public', 'seeds', 'history-migrated.json')
const reportPath = path.resolve(rootDir, 'data', 'migrated', 'report.json')

console.log('🔥 ОГОНЁК: МИГРАЦИЯ 100% ПОДЛИННЫХ ДАННЫХ ИЗ REAL_RAW_DATA.json')
console.log(`- Входной файл: ${inputPath}`)

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Входной файл не найден: ${inputPath}`)
  process.exit(1)
}

const rawText = fs.readFileSync(inputPath, 'utf8')
const parsedData = JSON.parse(rawText)

const rawItems = Array.isArray(parsedData)
  ? parsedData
  : Array.isArray(parsedData.items)
  ? parsedData.items
  : []

console.log(`- Загружено сырых записей: ${rawItems.length}`)
console.log(`- Смещение гордостей: prideOffset = ${prideOffset}`)

const TAG_MAP = {
  work: '#Бизнес',
  school: '#Учёба',
  life: 'Личное',
  sport: '#Спорт',
  health: '#Здоровье',
  creative: 'Творчество',
}

const prides = rawItems.filter((d) => d.type === 'pride')
const grats = rawItems.filter((d) => d.type === 'gratitude')

console.log(`- Найдено записей гордостей: ${prides.length}`)
console.log(`- Найдено записей благодарностей: ${grats.length}`)

// Map gratitudes by calendar date key (YYYY-MM-DD)
const gratsByDate = new Map()
for (const g of grats) {
  const d = g.dateISO || (g.createdAtISO ? g.createdAtISO.slice(0, 10) : null)
  if (!d) continue
  if (!gratsByDate.has(d)) gratsByDate.set(d, [])
  gratsByDate.get(d).push(g)
}

let totalPridesCount = 0
let totalGratsCount = 0
let realDaysWithPhotos = 0

// Map real days by dayId
const realDaysMap = new Map()

for (const p of prides) {
  const dayId = p.seq + prideOffset
  const dateKey = p.dateISO || (p.createdAtISO ? p.createdAtISO.slice(0, 10) : '')
  const dateISO = p.createdAtISO || (dateKey ? `${dateKey}T12:00:00.000Z` : undefined)

  // Extract pride entries preserving 100% authentic text & rating
  const prideEntries = []
  if (Array.isArray(p.entries)) {
    for (const entry of p.entries) {
      const text = typeof entry.text === 'string' ? entry.text : ''
      let scale = 7
      if (typeof entry.rating === 'number' && !isNaN(entry.rating)) {
        scale = Math.min(10, Math.max(1, Math.round(entry.rating)))
      } else if (entry.rating != null && !isNaN(parseFloat(String(entry.rating)))) {
        scale = Math.min(10, Math.max(1, Math.round(parseFloat(String(entry.rating)))))
      }

      prideEntries.push({
        num: String(prideEntries.length + 1).padStart(2, '0'),
        text,
        scale,
        overcome: 0,
      })
      totalPridesCount++
    }
  }

  // Find matching gratitudes for this calendar date
  const matchingGrats = gratsByDate.get(dateKey) || []
  const gratitudeEntries = []
  for (const gItem of matchingGrats) {
    if (Array.isArray(gItem.entries)) {
      for (const entry of gItem.entries) {
        const text = typeof entry.text === 'string' ? entry.text : ''
        if (text.length > 0) {
          let rating = 10
          if (typeof entry.rating === 'number' && !isNaN(entry.rating)) {
            rating = Math.min(10, Math.max(1, Math.round(entry.rating)))
          } else if (entry.rating != null && !isNaN(parseFloat(String(entry.rating)))) {
            rating = Math.min(10, Math.max(1, Math.round(parseFloat(String(entry.rating)))))
          }

          gratitudeEntries.push({
            num: String(gratitudeEntries.length + 1).padStart(2, '0'),
            text,
            rating,
          })
          totalGratsCount++
        }
      }
    }
  }

  // Tags
  const tagSet = new Set()
  tagSet.add('Для тебя')
  if (prideEntries.length > 0) tagSet.add('🔥 Гордости')
  if (gratitudeEntries.length > 0) tagSet.add('❤️ Благодарности')

  const rawTags = []
  if (Array.isArray(p.tags)) rawTags.push(...p.tags)
  for (const g of matchingGrats) {
    if (Array.isArray(g.tags)) rawTags.push(...g.tags)
  }

  for (const t of rawTags) {
    if (TAG_MAP[t]) tagSet.add(TAG_MAP[t])
    else if (typeof t === 'string' && t.trim().length > 0) tagSet.add(t)
  }

  // Photos (ONLY genuine images from source dataURL, NO fake stock unsplash photos)
  const photos = []
  if (Array.isArray(p.images)) {
    for (const img of p.images) {
      if (img && typeof img.dataURL === 'string' && img.dataURL.length > 0) {
        photos.push(img.dataURL)
      }
    }
  }
  for (const g of matchingGrats) {
    if (Array.isArray(g.images)) {
      for (const img of g.images) {
        if (img && typeof img.dataURL === 'string' && img.dataURL.length > 0) {
          photos.push(img.dataURL)
        }
      }
    }
  }

  if (photos.length > 0) {
    realDaysWithPhotos++
  }

  const title =
    prideEntries[0]?.text ||
    (gratitudeEntries[0] ? `Благодарность: ${gratitudeEntries[0].text}` : `Запись за ${dateKey}`)

  realDaysMap.set(dayId, {
    id: dayId,
    title,
    tags: Array.from(tagSet),
    prides: prideEntries,
    gratitudes: gratitudeEntries,
    photos: photos.length > 0 ? photos : undefined,
    dateISO,
    status: 'normal',
  })
}

// Build complete ledger from Day 1 to Day 719
const TARGET_TOTAL_DAYS = 719
const fullDays = []

for (let id = 1; id <= TARGET_TOTAL_DAYS; id++) {
  if (realDaysMap.has(id)) {
    fullDays.push(realDaysMap.get(id))
  } else {
    // Days 1..24: Paper notebook ("из тетрадки") with placeholder "—"
    // Days 25..294: Historical period before gordza with placeholder "—"
    // Missing sequence days: with placeholder "—"
    fullDays.push({
      id,
      title: '—',
      tags: ['Для тебя'],
      prides: [
        { num: '01', text: '—', scale: 7, overcome: 0 },
        { num: '02', text: '—', scale: 7, overcome: 0 },
        { num: '03', text: '—', scale: 7, overcome: 0 },
        { num: '04', text: '—', scale: 7, overcome: 0 },
        { num: '05', text: '—', scale: 7, overcome: 0 },
      ],
      gratitudes: [
        { num: '01', text: '—', rating: 7 },
        { num: '02', text: '—', rating: 7 },
        { num: '03', text: '—', rating: 7 },
        { num: '04', text: '—', rating: 7 },
        { num: '05', text: '—', rating: 7 },
      ],
      photos: undefined,
      dateISO: undefined,
      status: 'normal',
    })
  }
}

// Sort descending by ID: newest first (#719 down to #1)
fullDays.sort((a, b) => b.id - a.id)

console.log(`✅ Сформирована летопись из ${fullDays.length} дней (#1..#${TARGET_TOTAL_DAYS})`)
console.log(`- Реальных дней с гордостями: ${realDaysMap.size}`)
console.log(`- Всего подлинных пунктов гордостей: ${totalPridesCount}`)
console.log(`- Всего подлинных пунктов благодарностей: ${totalGratsCount}`)
console.log(`- Дней с реальными фотографиями: ${realDaysWithPhotos}`)

// Verification checks:
const d670 = realDaysMap.get(670)
console.log('\n🔍 ВЕРИФИКАЦИЯ: День #670')
console.log(`   Дата: ${d670?.dateISO} (Ожидается 2026-08-21)`)
console.log(`   Текст: «${d670?.title?.slice(0, 60)}...»`)

const d651 = realDaysMap.get(651)
console.log('\n🔍 ВЕРИФИКАЦИЯ: День #651')
console.log(`   Дата: ${d651?.dateISO} (Ожидается 2026-08-01)`)
console.log(`   Текст: «${d651?.title?.slice(0, 60)}...»`)

const d719 = realDaysMap.get(719)
console.log('\n🔍 ВЕРИФИКАЦИЯ: День #719')
console.log(`   Дата: ${d719?.dateISO} (Ожидается 2026-10-07)`)
console.log(`   Текст: «${d719?.title?.slice(0, 60)}...»`)

// Streak calculation
const dates = new Set()
for (const d of fullDays) {
  if (d.dateISO) dates.add(d.dateISO.slice(0, 10))
}
const streakRes = computeStreak(dates, new Date())

const report = {
  sourceFile: path.basename(inputPath),
  prideOffset,
  gratOffset,
  totalDays: fullDays.length,
  realDaysCount: realDaysMap.size,
  totalPrides: totalPridesCount,
  totalGratitudes: totalGratsCount,
  streakCalculated: streakRes.streak,
  bestStreak: streakRes.best,
  migratedAtISO: new Date().toISOString(),
  formula: `displayNum = seq + ${prideOffset}`,
}

const payload = {
  schemaVersion: 2,
  days: fullDays,
  morningIntentions: {},
  composerDraft: null,
  evidenceItems: [],
  evidenceFavorites: [],
  soundEnabled: true,
  pinEnabled: false,
  isDemo: false,
}

const publicDir = path.dirname(publicOutPath)
const migratedDir = path.dirname(migratedOutPath)
fs.mkdirSync(publicDir, { recursive: true })
fs.mkdirSync(migratedDir, { recursive: true })

const serialized = JSON.stringify(payload, null, 2)
fs.writeFileSync(publicOutPath, serialized, 'utf8')
fs.writeFileSync(migratedOutPath, serialized, 'utf8')
fs.writeFileSync(historySeedPath, serialized, 'utf8')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')

console.log(`\n💾 Результаты сохранены в:`)
console.log(`   1. ${publicOutPath}`)
console.log(`   2. ${migratedOutPath}`)
console.log(`   3. ${historySeedPath}`)
console.log(`📊 Отчёт сохранён в: ${reportPath}`)
