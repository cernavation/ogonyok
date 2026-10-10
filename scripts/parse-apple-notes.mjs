#!/usr/bin/env node

/**
 * scripts/parse-apple-notes.mjs
 * Full continuous chronological stitching of the user's authentic diary history:
 * 1. Days 1..24: Notebook templates (text "—", rating null).
 * 2. Days 25..297: Apple Notes (data/notes/notes-prides.txt & notes-gratitudes.txt) up to 2025-08-16.
 * 3. Days 298..719: Authentic raw entries from data/REAL_RAW_DATA.json (2025-08-17 to 2026-10-07).
 *
 * Rules:
 * - Continuous, unbroken 1..N numbering with zero gaps or "missed" status.
 * - Days 295–299 in Apple Notes are dropped (taken authentically from REAL_RAW_DATA.json).
 * - Extracts date, day score (if 0.0 -> null rating), original entry text, and rating from "ур X".
 * - Saves monolithic ledger to public/seeds/ogonek-import.v1.json,
 *   data/migrated/ogonek-import.v1.json, and public/seeds/history-migrated.json.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeStreak } from '../lib/ogonek/streak.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const prideNotesPath = path.resolve(rootDir, 'data', 'notes', 'notes-prides.txt')
const gratNotesPath = path.resolve(rootDir, 'data', 'notes', 'notes-gratitudes.txt')
const rawDataPath = path.resolve(rootDir, 'data', 'REAL_RAW_DATA.json')

const publicOutPath = path.resolve(rootDir, 'public', 'seeds', 'ogonek-import.v1.json')
const migratedOutPath = path.resolve(rootDir, 'data', 'migrated', 'ogonek-import.v1.json')
const historySeedPath = path.resolve(rootDir, 'public', 'seeds', 'history-migrated.json')
const reportPath = path.resolve(rootDir, 'data', 'migrated', 'report.json')

console.log('📜 ОГОНЁК: СКВОЗНОЙ ПЕРЕСЧЁТ И СШИВКА ИСТОРИИ (APPLE NOTES + RAW DATA)')

if (!fs.existsSync(prideNotesPath) || !fs.existsSync(gratNotesPath)) {
  console.error(`❌ Файлы заметок не найдены в data/notes/`)
  process.exit(1)
}

if (!fs.existsSync(rawDataPath)) {
  console.error(`❌ Файл REAL_RAW_DATA.json не найден`)
  process.exit(1)
}

function normalizeDate(raw) {
  if (!raw) return null
  const m1 = raw.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/)
  if (m1) {
    const day = m1[1].padStart(2, '0')
    const month = m1[2].padStart(2, '0')
    const year = m1[3].length === 2 ? '20' + m1[3] : m1[3]
    return `${year}-${month}-${day}`
  }
  const m2 = raw.match(/(\d{2})(\d{2})\.(\d{2})/)
  if (m2) {
    const day = m2[1]
    const month = m2[2]
    const year = '20' + m2[3]
    return `${year}-${month}-${day}`
  }
  return null
}

// 1. Parse prides from Apple Notes
function parseNotesPrides(text) {
  const lines = text.split('\n')
  const days = []
  let currentDay = null

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    const dateMatch =
      line.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/) ||
      line.match(/(\d{2})(\d{2})\.(\d{2})/)
    const dayNumMatch = line.match(/(?:^|\s)(\d+)\s*🔥/)
    const scoreMatch = line.match(/(\d+(?:\.\d+)?)\s*[🟢🟡🔴]/)

    if ((dateMatch || dayNumMatch) && !line.match(/^[1-5]\.\s/)) {
      if (currentDay && currentDay.entries.length > 0) {
        days.push(currentDay)
        currentDay = null
      }
      if (!currentDay) {
        currentDay = { dayNumRaw: null, dateRaw: null, scoreRaw: null, entries: [] }
      }
      if (dateMatch && !currentDay.dateRaw) currentDay.dateRaw = dateMatch[0]
      if (dayNumMatch && !currentDay.dayNumRaw) currentDay.dayNumRaw = parseInt(dayNumMatch[1], 10)
      if (scoreMatch && currentDay.scoreRaw === null) {
        const val = parseFloat(scoreMatch[1])
        currentDay.scoreRaw = val === 0 ? null : val
      }
      continue
    }

    const entryMatch = line.match(/^([1-5])\.\s*(.*)/)
    if (entryMatch) {
      if (!currentDay) currentDay = { dayNumRaw: null, dateRaw: null, scoreRaw: null, entries: [] }
      const num = entryMatch[1]
      const entryTextRaw = entryMatch[2]
      const levelMatch = entryTextRaw.match(/\s+ур\s*(\d+(?:\.\d+)?)\s*$/i)
      let rating = null
      let textClean = entryTextRaw
      if (levelMatch) {
        rating = parseFloat(levelMatch[1])
        textClean = entryTextRaw.slice(0, levelMatch.index).trim()
      }
      currentDay.entries.push({ num, text: textClean, rating })
      continue
    }

    if (currentDay && currentDay.entries.length > 0 && line.length > 0 && !line.startsWith('Гордости')) {
      const lastEntry = currentDay.entries[currentDay.entries.length - 1]
      const levelOnlyMatch = line.match(/^ур\s*(\d+(?:\.\d+)?)$/i)
      if (levelOnlyMatch) {
        lastEntry.rating = parseFloat(levelOnlyMatch[1])
      } else {
        const levelMatch = line.match(/\s+ур\s*(\d+(?:\.\d+)?)\s*$/i)
        if (levelMatch) {
          lastEntry.rating = parseFloat(levelMatch[1])
          lastEntry.text += ' ' + line.slice(0, levelMatch.index).trim()
        } else {
          lastEntry.text += ' ' + line
        }
      }
    }
  }

  if (currentDay && currentDay.entries.length > 0) days.push(currentDay)
  return days
}

// 2. Parse gratitudes from Apple Notes
function parseNotesGratitudes(text) {
  const lines = text.split('\n')
  const days = []
  let currentDay = null

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    const dateMatch =
      line.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/) ||
      line.match(/(\d{2})(\d{2})\.(\d{2})/)
    const dayNumMatch = line.match(/(?:^|\s)(\d+)\s*[🔥❄️]/)

    if ((dateMatch || dayNumMatch) && !line.match(/^[1-5]\.\s/)) {
      if (currentDay && currentDay.entries.length > 0) {
        days.push(currentDay)
        currentDay = null
      }
      if (!currentDay) currentDay = { dateRaw: null, dayNumRaw: null, entries: [] }
      if (dateMatch && !currentDay.dateRaw) currentDay.dateRaw = dateMatch[0]
      if (dayNumMatch && !currentDay.dayNumRaw) currentDay.dayNumRaw = parseInt(dayNumMatch[1], 10)
      continue
    }

    const entryMatch = line.match(/^([1-5])\.\s*(.*)/)
    if (entryMatch) {
      if (!currentDay) currentDay = { dateRaw: null, dayNumRaw: null, entries: [] }
      currentDay.entries.push({ num: entryMatch[1], text: entryMatch[2] })
      continue
    }

    if (currentDay && currentDay.entries.length > 0 && line.length > 0 && !line.startsWith('Спасибы')) {
      const lastEntry = currentDay.entries[currentDay.entries.length - 1]
      lastEntry.text += ' ' + line
    }
  }

  if (currentDay && currentDay.entries.length > 0) days.push(currentDay)
  return days
}

const prideNotesRaw = fs.readFileSync(prideNotesPath, 'utf8')
const gratNotesRaw = fs.readFileSync(gratNotesPath, 'utf8')

const notesPridesAll = parseNotesPrides(prideNotesRaw)
const notesGratsAll = parseNotesGratitudes(gratNotesRaw)

// Cutoff: Keep Apple Notes entries strictly BEFORE 2025-08-17 (days 295+ are taken from REAL_RAW_DATA.json)
const notesPrides = notesPridesAll.filter((d) => {
  const dateKey = normalizeDate(d.dateRaw)
  return dateKey && dateKey < '2025-08-17'
})

const notesGrats = notesGratsAll.filter((d) => {
  const dateKey = normalizeDate(d.dateRaw)
  return dateKey && dateKey < '2025-08-17'
})

console.log(`- Извлечено дней гордостей из Apple Notes: ${notesPrides.length}`)
console.log(`- Извлечено дней благодарностей из Apple Notes: ${notesGrats.length}`)

// Map notes gratitudes by date
const notesGratsByDate = new Map()
for (const g of notesGrats) {
  const d = normalizeDate(g.dateRaw)
  if (d) {
    if (!notesGratsByDate.has(d)) notesGratsByDate.set(d, [])
    notesGratsByDate.get(d).push(...g.entries)
  }
}

// 3. Load REAL_RAW_DATA.json
const rawDataParsed = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'))
const rawItems = Array.isArray(rawDataParsed)
  ? rawDataParsed
  : Array.isArray(rawDataParsed.items)
  ? rawDataParsed.items
  : []

const rawPrides = rawItems.filter((d) => d.type === 'pride').sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
const rawGrats = rawItems.filter((d) => d.type === 'gratitude')

console.log(`- Загружено реальных дней гордостей из REAL_RAW_DATA: ${rawPrides.length}`)

const rawGratsByDate = new Map()
for (const g of rawGrats) {
  const d = g.dateISO || (g.createdAtISO ? g.createdAtISO.slice(0, 10) : null)
  if (d) {
    if (!rawGratsByDate.has(d)) rawGratsByDate.set(d, [])
    rawGratsByDate.get(d).push(g)
  }
}

const TAG_MAP = {
  work: '#Бизнес',
  school: '#Учёба',
  life: 'Личное',
  sport: '#Спорт',
  health: '#Здоровье',
  creative: 'Творчество',
}

// 4. Construct unified chronological sequence
const chronologicalDays = []

// Segment 1: Days 1..24 (Notebook templates)
const day25Date = new Date('2024-11-18T12:00:00.000Z')
for (let i = 1; i <= 24; i++) {
  const offsetDays = 25 - i
  const calcDate = new Date(day25Date.getTime() - offsetDays * 24 * 60 * 60 * 1000)
  const dateISO = calcDate.toISOString()

  chronologicalDays.push({
    source: 'notebook',
    title: '—',
    tags: ['Для тебя'],
    dateISO,
    prides: [
      { num: '01', text: '—', scale: 0, overcome: 0 },
      { num: '02', text: '—', scale: 0, overcome: 0 },
      { num: '03', text: '—', scale: 0, overcome: 0 },
      { num: '04', text: '—', scale: 0, overcome: 0 },
      { num: '05', text: '—', scale: 0, overcome: 0 },
    ],
    gratitudes: [
      { num: '01', text: '—', rating: 0 },
      { num: '02', text: '—', rating: 0 },
      { num: '03', text: '—', rating: 0 },
      { num: '04', text: '—', rating: 0 },
      { num: '05', text: '—', rating: 0 },
    ],
    photos: undefined,
    status: 'normal',
  })
}

// Segment 2: Apple Notes days (starting from 2024-11-18 up to 2025-08-16)
for (const np of notesPrides) {
  const dateKey = normalizeDate(np.dateRaw)
  const matchingG = notesGratsByDate.get(dateKey) || []

  const prides = np.entries.map((e, idx) => {
    let scale = 0
    if (typeof e.rating === 'number' && e.rating > 0) {
      scale = Math.min(10, Math.max(1, Math.round(e.rating)))
    } else if (typeof np.scoreRaw === 'number' && np.scoreRaw > 0) {
      scale = Math.min(10, Math.max(1, Math.round(np.scoreRaw)))
    }

    return {
      num: String(idx + 1).padStart(2, '0'),
      text: e.text,
      scale,
      overcome: 0,
    }
  })

  const gratitudes = matchingG.map((ge, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    text: ge.text,
    rating: typeof np.scoreRaw === 'number' && np.scoreRaw > 0 ? Math.min(10, Math.round(np.scoreRaw)) : 10,
  }))

  const tagSet = new Set(['Для тебя', '🔥 Гордости'])
  if (gratitudes.length > 0) tagSet.add('❤️ Благодарности')

  chronologicalDays.push({
    source: 'apple_notes',
    title: prides[0]?.text || 'Запись из заметок',
    tags: Array.from(tagSet),
    dateISO: `${dateKey}T12:00:00.000Z`,
    prides,
    gratitudes,
    photos: undefined,
    status: 'normal',
  })
}

// Segment 3: REAL_RAW_DATA days (from 2025-08-17 to 2026-10-07)
for (const rp of rawPrides) {
  const dateKey = rp.dateISO || (rp.createdAtISO ? rp.createdAtISO.slice(0, 10) : '')
  const dateISO = rp.createdAtISO || `${dateKey}T12:00:00.000Z`

  const prides = (rp.entries || []).map((e, idx) => {
    let scale = 7
    if (typeof e.rating === 'number' && !isNaN(e.rating)) {
      scale = Math.min(10, Math.max(1, Math.round(e.rating)))
    } else if (e.rating != null && !isNaN(parseFloat(String(e.rating)))) {
      scale = Math.min(10, Math.max(1, Math.round(parseFloat(String(e.rating)))))
    }

    return {
      num: String(idx + 1).padStart(2, '0'),
      text: typeof e.text === 'string' ? e.text : '',
      scale,
      overcome: 0,
    }
  })

  const matchingGratsItems = rawGratsByDate.get(dateKey) || []
  const gratitudes = []
  for (const gItem of matchingGratsItems) {
    for (const ge of gItem.entries || []) {
      if (ge.text) {
        let rating = 10
        if (typeof ge.rating === 'number' && !isNaN(ge.rating)) {
          rating = Math.min(10, Math.max(1, Math.round(ge.rating)))
        }
        gratitudes.push({
          num: String(gratitudes.length + 1).padStart(2, '0'),
          text: ge.text,
          rating,
        })
      }
    }
  }

  const tagSet = new Set(['Для тебя', '🔥 Гордости'])
  if (gratitudes.length > 0) tagSet.add('❤️ Благодарности')

  const rawTags = []
  if (Array.isArray(rp.tags)) rawTags.push(...rp.tags)
  for (const g of matchingGratsItems) {
    if (Array.isArray(g.tags)) rawTags.push(...g.tags)
  }
  for (const t of rawTags) {
    if (TAG_MAP[t]) tagSet.add(TAG_MAP[t])
    else if (typeof t === 'string' && t.trim().length > 0) tagSet.add(t)
  }

  const photos = []
  if (Array.isArray(rp.images)) {
    for (const img of rp.images) {
      if (img && typeof img.dataURL === 'string' && img.dataURL.length > 0) {
        photos.push(img.dataURL)
      }
    }
  }

  chronologicalDays.push({
    source: 'real_raw_data',
    title: prides[0]?.text || 'Запись дня',
    tags: Array.from(tagSet),
    dateISO,
    prides,
    gratitudes,
    photos: photos.length > 0 ? photos : undefined,
    status: 'normal',
  })
}

// 5. Assign STRICT sequential numbering: Day #1, Day #2, ... Day #N
chronologicalDays.forEach((d, idx) => {
  d.id = idx + 1
})

const finalTotalDays = chronologicalDays.length

// Report seams
const day24 = chronologicalDays[23]
const day25 = chronologicalDays[24]
const notesEndIdx = 24 + notesPrides.length - 1
const dayNotesEnd = chronologicalDays[notesEndIdx]
const dayRawStart = chronologicalDays[notesEndIdx + 1]
const dayLast = chronologicalDays[finalTotalDays - 1]

console.log('\n================ СТЫКИ И ГРАНИЦЫ ЛЕТОПИСИ ================')
console.log(`📍 СТЫК 1 (Тетрадка ➔ Apple Notes):`)
console.log(`   День #${day24.id}: [${day24.source}] дата: ${day24.dateISO?.slice(0, 10)} | текст: «${day24.title}»`)
console.log(`   День #${day25.id}: [${day25.source}] дата: ${day25.dateISO?.slice(0, 10)} | текст: «${day25.title.slice(0, 50)}...»`)

console.log(`\n📍 СТЫК 2 (Apple Notes ➔ REAL_RAW_DATA):`)
console.log(`   День #${dayNotesEnd.id}: [${dayNotesEnd.source}] дата: ${dayNotesEnd.dateISO?.slice(0, 10)} | текст: «${dayNotesEnd.title.slice(0, 50)}...»`)
console.log(`   День #${dayRawStart.id}: [${dayRawStart.source}] дата: ${dayRawStart.dateISO?.slice(0, 10)} | текст: «${dayRawStart.title.slice(0, 50)}...»`)

console.log(`\n🏁 ФИНАЛЬНЫЙ ДЕНЬ:`)
console.log(`   День #${dayLast.id}: [${dayLast.source}] дата: ${dayLast.dateISO?.slice(0, 10)} | текст: «${dayLast.title.slice(0, 50)}...»`)
console.log(`   ИТОГО ПОДЛИННЫХ ДНЕЙ В МОНОЛИТЕ: ${finalTotalDays}`)

// Check 651 & 670
const d651 = chronologicalDays.find((d) => d.title.toLowerCase().includes('огромного листа'))
const d670 = chronologicalDays.find((d) => d.title.toLowerCase().includes('читал сашу'))
console.log(`\n🔍 ПРОВЕРКА КОНТРОЛЬНЫХ ТОЧЕК:`)
console.log(`   День #${d651?.id}: дата ${d651?.dateISO?.slice(0, 10)} | текст «${d651?.title.slice(0, 50)}...»`)
console.log(`   День #${d670?.id}: дата ${d670?.dateISO?.slice(0, 10)} | текст «${d670?.title.slice(0, 50)}...»`)

// Clean objects for storage payload
const cleanDays = chronologicalDays.map((d) => ({
  id: d.id,
  title: d.title,
  tags: d.tags,
  prides: d.prides,
  gratitudes: d.gratitudes,
  photos: d.photos,
  dateISO: d.dateISO,
  status: 'normal',
}))

// Sort descending by ID for feed view (Day #N down to Day #1)
cleanDays.sort((a, b) => b.id - a.id)

// Streak calculation
const dates = new Set()
for (const d of cleanDays) {
  if (d.dateISO) dates.add(d.dateISO.slice(0, 10))
}
const streakRes = computeStreak(dates, new Date())

const report = {
  totalDays: finalTotalDays,
  notebookDays: 24,
  appleNotesDays: notesPrides.length,
  realRawDays: rawPrides.length,
  seamNotebookToNotes: {
    day24: { id: day24.id, date: day24.dateISO?.slice(0, 10) },
    day25: { id: day25.id, date: day25.dateISO?.slice(0, 10), title: day25.title },
  },
  seamNotesToRaw: {
    notesEnd: { id: dayNotesEnd.id, date: dayNotesEnd.dateISO?.slice(0, 10), title: dayNotesEnd.title },
    rawStart: { id: dayRawStart.id, date: dayRawStart.dateISO?.slice(0, 10), title: dayRawStart.title },
  },
  finalDay: {
    id: dayLast.id,
    date: dayLast.dateISO?.slice(0, 10),
    title: dayLast.title,
  },
  streakCalculated: streakRes.streak,
  bestStreak: streakRes.best,
  migratedAtISO: new Date().toISOString(),
}

const payload = {
  schemaVersion: 2,
  days: cleanDays,
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
