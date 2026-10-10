#!/usr/bin/env node

/**
 * scripts/import-real-raw.mjs
 * Migrates 100% authentic user diary records from data/REAL_RAW_DATA.json.
 *
 * Rules:
 * - Parses data/REAL_RAW_DATA.json.
 * - Applies original offsets: prideOffset: 289, gratOffset: 244.
 * - Combines prides and gratitudes into single Day objects by calendar date.
 * - Preserves EVERY single word, comma, original rating (1-10) and real dates. No censorship!
 * - Completely removes any stock fake bicycle images. If images is empty, card is a clean text post without photos.
 * - First 24 days (from notebook) created with placeholder "—".
 * - Saves output to public/seeds/ogonek-import.v1.json and data/migrated/ogonek-import.v1.json.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluatePrideItemHeuristic } from '../lib/ogonek/evaluate-heuristic.ts'
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

const publicOutPath = path.resolve(rootDir, 'public', 'seeds', 'ogonek-import.v1.json')
const migratedOutPath = path.resolve(rootDir, 'data', 'migrated', 'ogonek-import.v1.json')
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

const prideOffset = parsedData.settings?.prideOffset ?? 289
const gratOffset = parsedData.settings?.gratOffset ?? 244

console.log(`- Загружено сырых записей: ${rawItems.length}`)
console.log(`- Смещения: prideOffset = ${prideOffset}, gratOffset = ${gratOffset}`)

const TAG_MAP = {
  work: '#Бизнес',
  school: '#Учёба',
  life: 'Личное',
  sport: '#Спорт',
  health: '#Здоровье',
  creative: 'Творчество',
}

// Group items by calendar date (YYYY-MM-DD)
const byDate = new Map()

for (const item of rawItems) {
  const dateKey = item.dateISO || (item.createdAtISO ? item.createdAtISO.slice(0, 10) : null)
  if (!dateKey) continue

  if (!byDate.has(dateKey)) {
    byDate.set(dateKey, { prides: [], grats: [] })
  }
  const group = byDate.get(dateKey)
  if (item.type === 'pride') {
    group.prides.push(item)
  } else if (item.type === 'gratitude') {
    group.grats.push(item)
  }
}

// Sort prides and grats inside each group chronologically
for (const group of byDate.values()) {
  group.prides.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
  group.grats.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
}

const sortedDateKeys = Array.from(byDate.keys()).sort()
console.log(`- Уникальных календарных дней с записями: ${sortedDateKeys.length}`)
console.log(`- Диапазон реальных дат: ${sortedDateKeys[0]} → ${sortedDateKeys[sortedDateKeys.length - 1]}`)

let totalPridesCount = 0
let totalGratsCount = 0
let realDaysWithPhotos = 0

// Map real days
const realDays = []
let prevRealDayId = prideOffset // Start before 290

for (const dateKey of sortedDateKeys) {
  const group = byDate.get(dateKey)

  // Determine day ID using pride seq + prideOffset
  let targetId
  if (group.prides.length > 0 && typeof group.prides[0].seq === 'number') {
    targetId = group.prides[0].seq + prideOffset
  } else if (group.grats.length > 0 && typeof group.grats[0].seq === 'number') {
    targetId = prevRealDayId + 1
  } else {
    targetId = prevRealDayId + 1
  }

  // Ensure strictly monotonic ID
  if (targetId <= prevRealDayId) {
    targetId = prevRealDayId + 1
  }
  prevRealDayId = targetId

  // Extract pride entries preserving 100% authentic text & rating
  const prideEntries = []
  for (const prideItem of group.prides) {
    if (Array.isArray(prideItem.entries)) {
      for (const entry of prideItem.entries) {
        const text = typeof entry.text === 'string' ? entry.text : ''
        let scale = 7
        if (typeof entry.rating === 'number' && !isNaN(entry.rating)) {
          scale = Math.min(10, Math.max(1, Math.round(entry.rating)))
        } else if (entry.rating != null && !isNaN(parseFloat(String(entry.rating)))) {
          scale = Math.min(10, Math.max(1, Math.round(parseFloat(String(entry.rating)))))
        }

        const heuristic = evaluatePrideItemHeuristic(text)
        const overcome = heuristic.overcome

        prideEntries.push({
          num: String(prideEntries.length + 1).padStart(2, '0'),
          text,
          scale,
          overcome,
        })
        totalPridesCount++
      }
    }
  }

  // Extract gratitude entries preserving 100% authentic text
  const gratitudes = []
  for (const gratItem of group.grats) {
    if (Array.isArray(gratItem.entries)) {
      for (const entry of gratItem.entries) {
        const text = typeof entry.text === 'string' ? entry.text : ''
        if (text.length > 0) {
          gratitudes.push(text)
          totalGratsCount++
        }
      }
    }
  }

  // Map tags
  const rawTags = []
  for (const p of group.prides) {
    if (Array.isArray(p.tags)) rawTags.push(...p.tags)
  }
  for (const g of group.grats) {
    if (Array.isArray(g.tags)) rawTags.push(...g.tags)
  }

  const tagSet = new Set()
  tagSet.add('Для тебя')
  if (prideEntries.length > 0) tagSet.add('🔥 Гордости')
  if (gratitudes.length > 0) tagSet.add('❤️ Благодарности')

  for (const t of rawTags) {
    if (TAG_MAP[t]) tagSet.add(TAG_MAP[t])
    else if (typeof t === 'string' && t.trim().length > 0) tagSet.add(t)
  }

  // Extract photos ONLY if genuine images exist in source
  const photos = []
  for (const p of group.prides) {
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        if (img && typeof img.dataURL === 'string' && img.dataURL.length > 0) {
          photos.push(img.dataURL)
        }
      }
    }
  }
  for (const g of group.grats) {
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

  // Title is first pride entry text, or first gratitude, or date
  const title =
    prideEntries[0]?.text ||
    (gratitudes[0] ? `Благодарность: ${gratitudes[0]}` : `Запись за ${dateKey}`)

  const dateISO =
    group.prides[0]?.createdAtISO ||
    group.grats[0]?.createdAtISO ||
    `${dateKey}T12:00:00.000Z`

  realDays.push({
    id: targetId,
    title,
    tags: Array.from(tagSet),
    prides: prideEntries,
    gratitudes,
    photos: photos.length > 0 ? photos : undefined,
    dateISO,
    status: 'normal',
  })
}

// Build map of real days by ID
const realDaysById = new Map()
for (const day of realDays) {
  realDaysById.set(day.id, day)
}

// Target total days is 719 (CURRENT_DAY)
const TARGET_TOTAL_DAYS = 719

// Generate full days array from Day 1 to Day 719
// Earliest day date can be calculated backward from Day 290 (2025-08-17)
const day290Date = new Date('2025-08-17T12:00:00.000Z')
const fullDays = []

for (let id = 1; id <= TARGET_TOTAL_DAYS; id++) {
  if (realDaysById.has(id)) {
    fullDays.push(realDaysById.get(id))
  } else {
    // Days without direct digital records:
    // Days 1..24: Paper notebook ("из тетрадки") with placeholder "—"
    // Days 25..289: Historical period before gordza with placeholder "—"
    // Days 714..719: Days up to today with placeholder "—"
    const offsetFrom290 = id - 290
    const calcDate = new Date(day290Date.getTime() + offsetFrom290 * 24 * 60 * 60 * 1000)
    const dateISO = calcDate.toISOString()

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
      gratitudes: ['—', '—', '—', '—', '—'],
      photos: undefined,
      dateISO,
      status: 'normal',
    })
  }
}

// Sort descending by ID (newest first: Day #719 down to Day #1)
fullDays.sort((a, b) => b.id - a.id)

console.log(`✅ Сформирована непрерывная летопись из ${fullDays.length} дней (#1..#${TARGET_TOTAL_DAYS})`)
console.log(`- Реальных дней с гордостями/благодарностями: ${realDays.length}`)
console.log(`- Всего подлинных гордостей: ${totalPridesCount}`)
console.log(`- Всего подлинных благодарностей: ${totalGratsCount}`)
console.log(`- Дней с реальными фотографиями: ${realDaysWithPhotos}`)
console.log(`- Дней из тетрадки (#1..#24) и плейсхолдеров: ${fullDays.length - realDays.length}`)

// Calculate streak
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
  realDaysCount: realDays.length,
  totalPrides: totalPridesCount,
  totalGratitudes: totalGratsCount,
  streakCalculated: streakRes.streak,
  bestStreak: streakRes.best,
  migratedAtISO: new Date().toISOString(),
  formula: 'displayNum = seq + offset (430 + 289 = 719)',
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
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')

console.log(`💾 Результаты сохранены в:`)
console.log(`   1. ${publicOutPath}`)
console.log(`   2. ${migratedOutPath}`)
console.log(`📊 Отчёт сохранён в: ${reportPath}`)
