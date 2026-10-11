#!/usr/bin/env node

/**
 * scripts/parse-apple-notes.mjs
 * ГЕНЕРАЛЬНАЯ ЛЕТОПИСЬ — строгий хронологический пересчёт.
 *
 * Алгоритм:
 *  1. Дни 1..24  — тетрадка (текст "—", дата до 2024-11-18).
 *  2. Apple Notes — data/notes/notes-prides.txt + notes-gratitudes.txt
 *     (18.11.2024 → 16.08.2025; дни с датой >= 2025-08-17 исключаются).
 *  3. REAL_RAW_DATA.json — 17.08.2025 → 07.10.2026;
 *     дубли по дате МЁРДЖАТСЯ в один день (prides + gratitudes).
 *  4. Новые ручные дни:
 *       08.10.2026 — Alibaba, Crispol, зал
 *       09.10.2026 — свежие гордости за 9 октября
 *       10.10.2026 — свежие гордости за 10 октября
 *  5. Весь массив сортируется СТРОГО ПО ВОЗРАСТАНИЮ dateISO,
 *     затем нумеруется d.id = index + 1.
 *  6. В файл записывается отсортированный ПО УБЫВАНИЮ dateISO массив
 *     (самый свежий вверху ленты).
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

console.log('📜 ОГОНЁК: СТРОГИЙ ХРОНОЛОГИЧЕСКИЙ ПЕРЕСЧЁТ ЛЕТОПИСИ')

if (!fs.existsSync(prideNotesPath) || !fs.existsSync(gratNotesPath)) {
  console.error('❌ Файлы заметок не найдены в data/notes/')
  process.exit(1)
}
if (!fs.existsSync(rawDataPath)) {
  console.error('❌ Файл REAL_RAW_DATA.json не найден')
  process.exit(1)
}

// ─── утилиты ────────────────────────────────────────────────────────────────

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
    return `20${m2[3]}-${m2[2]}-${m2[1]}`
  }
  return null
}

// ─── парсер гордостей из Apple Notes ────────────────────────────────────────

function parseNotesPrides(text) {
  const lines = text.split('\n')
  const days = []
  let currentDay = null

  for (const rawLine of lines) {
    const line = rawLine.trim()

    const dateMatch =
      line.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/) ||
      line.match(/(\d{2})(\d{2})\.(\d{2})/)
    const dayNumMatch = line.match(/(?:^|\s)(\d+)\s*🔥/)
    const scoreMatch = line.match(/(\d+(?:\.\d+)?)\s*[🟢🟡🔴]/)

    if ((dateMatch || dayNumMatch) && !line.match(/^[1-5]\.\s/)) {
      // Если в текущем дне уже есть записи — сохраняем и начинаем новый
      if (currentDay && currentDay.entries.length > 0) {
        days.push(currentDay)
        currentDay = null
      }
      // Создаём новый день только если нет незакрытого (без записей)
      if (!currentDay) {
        currentDay = { dayNumRaw: null, dateRaw: null, scoreRaw: null, entries: [] }
      }
      // Дополняем текущий день из заголовочной строки
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
      const entryTextRaw = entryMatch[2]
      const levelMatch = entryTextRaw.match(/\s+ур\s*(\d+(?:\.\d+)?)\s*$/i)
      let rating = null
      let textClean = entryTextRaw
      if (levelMatch) {
        rating = parseFloat(levelMatch[1])
        textClean = entryTextRaw.slice(0, levelMatch.index).trim()
      }
      currentDay.entries.push({ num: entryMatch[1], text: textClean, rating })
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

// ─── парсер благодарностей из Apple Notes ───────────────────────────────────

function parseNotesGratitudes(text) {
  const lines = text.split('\n')
  const days = []
  let currentDay = null

  for (const rawLine of lines) {
    const line = rawLine.trim()

    const dateMatch =
      line.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/) ||
      line.match(/(\d{2})(\d{2})\.(\d{2})/)
    const dayNumMatch = line.match(/(?:^|\s)(\d+)\s*[🔥❄️]/)

    if ((dateMatch || dayNumMatch) && !line.match(/^[1-5]\.\s/)) {
      // Если в текущем дне уже есть записи — сохраняем и начинаем новый
      if (currentDay && currentDay.entries.length > 0) {
        days.push(currentDay)
        currentDay = null
      }
      // Создаём новый день только если нет незакрытого (без записей)
      if (!currentDay) {
        currentDay = { dateRaw: null, dayNumRaw: null, entries: [] }
      }
      // Дополняем текущий день из заголовочной строки
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
      currentDay.entries[currentDay.entries.length - 1].text += ' ' + line
    }
  }

  if (currentDay && currentDay.entries.length > 0) days.push(currentDay)
  return days
}

// ─── ШАГИ A: Apple Notes ──────────────────────────────────────────────────────

const prideNotesRaw = fs.readFileSync(prideNotesPath, 'utf8')
const gratNotesRaw = fs.readFileSync(gratNotesPath, 'utf8')

// Отсечка: строго ДО 2025-08-17 (с 2025-08-17 берём из REAL_RAW_DATA)
const CUTOFF = '2025-08-17'

const notesPrides = parseNotesPrides(prideNotesRaw).filter((d) => {
  const dk = normalizeDate(d.dateRaw)
  return dk && dk < CUTOFF
})

const notesGrats = parseNotesGratitudes(gratNotesRaw).filter((d) => {
  const dk = normalizeDate(d.dateRaw)
  return dk && dk < CUTOFF
})

console.log(`\n📒 Apple Notes:`)
console.log(`   Гордости: ${notesPrides.length} дней`)
console.log(`   Благодарности: ${notesGrats.length} дней`)

// Индекс благодарностей по дате
const notesGratsByDate = new Map()
for (const g of notesGrats) {
  const d = normalizeDate(g.dateRaw)
  if (d) {
    if (!notesGratsByDate.has(d)) notesGratsByDate.set(d, [])
    notesGratsByDate.get(d).push(...g.entries)
  }
}

// ─── ШАГ Б: REAL_RAW_DATA ────────────────────────────────────────────────────

const rawDataParsed = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'))
const rawItems = Array.isArray(rawDataParsed)
  ? rawDataParsed
  : Array.isArray(rawDataParsed.items)
  ? rawDataParsed.items
  : []

const allRawPrides = rawItems
  .filter((d) => d.type === 'pride')
  .sort((a, b) => {
    // Сортируем сначала по дате, потом по seq
    const da = a.dateISO || ''
    const db = b.dateISO || ''
    if (da !== db) return da.localeCompare(db)
    return (a.seq ?? 0) - (b.seq ?? 0)
  })

const allRawGrats = rawItems.filter((d) => d.type === 'gratitude')

console.log(`\n📦 REAL_RAW_DATA:`)
console.log(`   Гордости (всего записей): ${allRawPrides.length}`)
console.log(`   Благодарности: ${allRawGrats.length}`)

// Индекс благодарностей по дате
const rawGratsByDate = new Map()
for (const g of allRawGrats) {
  const d = g.dateISO || (g.createdAtISO ? g.createdAtISO.slice(0, 10) : null)
  if (d) {
    if (!rawGratsByDate.has(d)) rawGratsByDate.set(d, [])
    rawGratsByDate.get(d).push(g)
  }
}

// МЁРЖ дублей: объединяем все prides с одинаковой датой в один день
const rawPridesByDate = new Map()
for (const rp of allRawPrides) {
  const dateKey = rp.dateISO || (rp.createdAtISO ? rp.createdAtISO.slice(0, 10) : '')
  if (!dateKey) continue
  if (!rawPridesByDate.has(dateKey)) {
    rawPridesByDate.set(dateKey, {
      dateKey,
      createdAtISO: rp.createdAtISO || `${dateKey}T12:00:00.000Z`,
      entries: [],
      tags: new Set(),
      images: [],
    })
  }
  const merged = rawPridesByDate.get(dateKey)
  merged.entries.push(...(rp.entries || []))
  if (Array.isArray(rp.tags)) for (const t of rp.tags) merged.tags.add(t)
  if (Array.isArray(rp.images)) merged.images.push(...rp.images)
}

const uniqueDates = [...rawPridesByDate.keys()].sort()
console.log(`   Уникальных дат гордостей: ${uniqueDates.length}`)

const TAG_MAP = {
  work: '#Бизнес',
  school: '#Учёба',
  life: 'Личное',
  sport: '#Спорт',
  health: '#Здоровье',
  creative: 'Творчество',
}

// ─── СБОРКА ЕДИНОГО МАССИВА ────────────────────────────────────────────────

/** @type {Array<object>} */
const allDays = []

// ── Сегмент 1: Тетрадка (дни 1..24, до 2024-11-18) ─────────────────────────
const day25Date = new Date('2024-11-18T12:00:00.000Z')
for (let i = 1; i <= 24; i++) {
  const offsetDays = 25 - i
  const calcDate = new Date(day25Date.getTime() - offsetDays * 24 * 60 * 60 * 1000)
  allDays.push({
    source: 'notebook',
    title: '—',
    tags: ['Для тебя'],
    dateISO: calcDate.toISOString(),
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

// ── Сегмент 2: Apple Notes (2024-11-18 → 2025-08-16) ───────────────────────
// Группируем по дате чтобы мёржить дубли
const notesPridesByDate = new Map()
for (const np of notesPrides) {
  const dateKey = normalizeDate(np.dateRaw)
  if (!dateKey) continue
  if (!notesPridesByDate.has(dateKey)) {
    notesPridesByDate.set(dateKey, { dateKey, entries: [], scoreRaw: null })
  }
  const merged = notesPridesByDate.get(dateKey)
  merged.entries.push(...np.entries)
  if (merged.scoreRaw === null && np.scoreRaw !== null) merged.scoreRaw = np.scoreRaw
}

for (const [dateKey, merged] of notesPridesByDate) {
  const matchingG = notesGratsByDate.get(dateKey) || []

  const prides = merged.entries.map((e, idx) => {
    let scale = 0
    if (typeof e.rating === 'number' && e.rating > 0) {
      scale = Math.min(10, Math.max(1, Math.round(e.rating)))
    } else if (typeof merged.scoreRaw === 'number' && merged.scoreRaw > 0) {
      scale = Math.min(10, Math.max(1, Math.round(merged.scoreRaw)))
    }
    return { num: String(idx + 1).padStart(2, '0'), text: e.text, scale, overcome: 0 }
  })

  const gratitudes = matchingG.map((ge, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    text: ge.text,
    rating:
      typeof merged.scoreRaw === 'number' && merged.scoreRaw > 0
        ? Math.min(10, Math.round(merged.scoreRaw))
        : 10,
  }))

  const tagSet = new Set(['Для тебя', '🔥 Гордости'])
  if (gratitudes.length > 0) tagSet.add('❤️ Благодарности')

  allDays.push({
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

// ── Сегмент 3: REAL_RAW_DATA (2025-08-17 → 2026-10-07) ─────────────────────
for (const [dateKey, merged] of rawPridesByDate) {
  const prides = merged.entries.map((e, idx) => {
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
  for (const t of merged.tags) {
    if (TAG_MAP[t]) tagSet.add(TAG_MAP[t])
    else if (typeof t === 'string' && t.trim().length > 0) tagSet.add(t)
  }
  for (const gItem of matchingGratsItems) {
    for (const t of gItem.tags || []) {
      if (TAG_MAP[t]) tagSet.add(TAG_MAP[t])
      else if (typeof t === 'string' && t.trim().length > 0) tagSet.add(t)
    }
  }

  const photos = []
  for (const img of merged.images) {
    if (img && typeof img.dataURL === 'string' && img.dataURL.length > 0) {
      photos.push(img.dataURL)
    }
  }

  allDays.push({
    source: 'real_raw_data',
    title: prides[0]?.text || 'Запись дня',
    tags: Array.from(tagSet),
    dateISO: merged.createdAtISO || `${dateKey}T12:00:00.000Z`,
    prides,
    gratitudes,
    photos: photos.length > 0 ? photos : undefined,
    status: 'normal',
  })
}

// ── Сегмент 4: Новые ручные дни (08-10 октября 2026) ────────────────────────

allDays.push({
  source: 'manual',
  title: 'Alibaba — вышел на новую стадию переговоров',
  tags: ['Для тебя', '🔥 Гордости', '#Бизнес'],
  dateISO: '2026-10-08T12:00:00.000Z',
  prides: [
    {
      num: '01',
      text: 'Вышел на абсолютно новую стадию переговоров с Alibaba — прямой контакт с поставщиком',
      scale: 9,
      overcome: 0,
    },
    {
      num: '02',
      text: 'Сделал заказ в Crispol — чёткий шаг вперёд по бизнесу',
      scale: 8,
      overcome: 0,
    },
    { num: '03', text: 'Пошёл в зал и хорошо потренировался', scale: 7, overcome: 0 },
    { num: '04', text: '—', scale: 0, overcome: 0 },
    { num: '05', text: '—', scale: 0, overcome: 0 },
  ],
  gratitudes: [],
  photos: undefined,
  status: 'normal',
})

allDays.push({
  source: 'manual',
  title: 'Свежие гордости за 9 октября 2026',
  tags: ['Для тебя', '🔥 Гордости'],
  dateISO: '2026-10-09T12:00:00.000Z',
  prides: [
    { num: '01', text: 'Свежие гордости за 9 октября', scale: 7, overcome: 0 },
    { num: '02', text: '—', scale: 0, overcome: 0 },
    { num: '03', text: '—', scale: 0, overcome: 0 },
    { num: '04', text: '—', scale: 0, overcome: 0 },
    { num: '05', text: '—', scale: 0, overcome: 0 },
  ],
  gratitudes: [],
  photos: undefined,
  status: 'normal',
})

allDays.push({
  source: 'manual',
  title: 'Свежие гордости за 10 октября 2026',
  tags: ['Для тебя', '🔥 Гордости'],
  dateISO: '2026-10-10T12:00:00.000Z',
  prides: [
    { num: '01', text: 'Свежие гордости за 10 октября', scale: 7, overcome: 0 },
    { num: '02', text: '—', scale: 0, overcome: 0 },
    { num: '03', text: '—', scale: 0, overcome: 0 },
    { num: '04', text: '—', scale: 0, overcome: 0 },
    { num: '05', text: '—', scale: 0, overcome: 0 },
  ],
  gratitudes: [],
  photos: undefined,
  status: 'normal',
})

// ─── ШАГ 2: СТРОГАЯ ХРОНОЛОГИЧЕСКАЯ СОРТИРОВКА ───────────────────────────────

// Функция извлечения dateISO в виде строки YYYY-MM-DD для сравнения
function getDateKey(d) {
  return d.dateISO ? d.dateISO.slice(0, 10) : ''
}

allDays.sort((a, b) => getDateKey(a).localeCompare(getDateKey(b)))

// Проверяем дубли по дате (не должно быть — но логируем)
const seenDates = new Map()
for (const d of allDays) {
  const dk = getDateKey(d)
  if (seenDates.has(dk)) {
    console.warn(`⚠️  ДУБЛЬ ДАТЫ: ${dk} — источники: ${seenDates.get(dk)} и ${d.source}`)
  } else {
    seenDates.set(dk, d.source)
  }
}

// ─── ШАГ 3: СКВОЗНАЯ НУМЕРАЦИЯ (строго по порядку от старых к новым) ─────────

allDays.forEach((d, idx) => {
  d.id = idx + 1
})

const totalDays = allDays.length

// ─── ОТЧЁТ О СТЫКАХ ──────────────────────────────────────────────────────────

const day24 = allDays[23]
const day25 = allDays[24]
const appleNotesEnd = allDays.findLast((d) => d.source === 'apple_notes')
const rawStart = allDays.find((d) => d.source === 'real_raw_data')
const dayLast = allDays[totalDays - 1]

console.log('\n================ СТЫКИ И ГРАНИЦЫ ЛЕТОПИСИ ================')
console.log(`📍 СТЫК 1 (Тетрадка ➔ Apple Notes):`)
console.log(`   День #${day24.id}: [${day24.source}] ${day24.dateISO?.slice(0, 10)} | «${day24.title}»`)
console.log(
  `   День #${day25.id}: [${day25.source}] ${day25.dateISO?.slice(0, 10)} | «${day25.title.slice(0, 60)}»`,
)

if (appleNotesEnd && rawStart) {
  console.log(`\n📍 СТЫК 2 (Apple Notes ➔ REAL_RAW_DATA):`)
  console.log(
    `   День #${appleNotesEnd.id}: [${appleNotesEnd.source}] ${appleNotesEnd.dateISO?.slice(0, 10)} | «${appleNotesEnd.title.slice(0, 60)}»`,
  )
  console.log(
    `   День #${rawStart.id}: [${rawStart.source}] ${rawStart.dateISO?.slice(0, 10)} | «${rawStart.title.slice(0, 60)}»`,
  )
}

console.log(`\n🏁 ФИНАЛЬНЫЙ ДЕНЬ:`)
console.log(
  `   День #${dayLast.id}: [${dayLast.source}] ${dayLast.dateISO?.slice(0, 10)} | «${dayLast.title.slice(0, 60)}»`,
)
console.log(`   ИТОГО ДНЕЙ В МОНОЛИТЕ: ${totalDays}`)

// ─── ПРОВЕРКА МОНОТОННОСТИ ────────────────────────────────────────────────────

let monotonProblems = 0
for (let i = 1; i < allDays.length; i++) {
  const prev = getDateKey(allDays[i - 1])
  const curr = getDateKey(allDays[i])
  if (curr < prev) {
    console.error(`❌ НАРУШЕНИЕ ПОРЯДКА: поз.${i} дата ${curr} < ${prev} (дни #${allDays[i-1].id} и #${allDays[i].id})`)
    monotonProblems++
  }
}
if (monotonProblems === 0) {
  console.log('\n✅ Даты строго монотонно возрастают — порядок ОК')
} else {
  console.error(`\n❌ ОБНАРУЖЕНО ${monotonProblems} нарушений монотонности!`)
}

// ─── ВЫВОД ПЕРВЫХ И ПОСЛЕДНИХ 5 ДНЕЙ ─────────────────────────────────────────

console.log('\n📋 ПЕРВЫЕ 5 ДНЕЙ (от старых к новым):')
for (const d of allDays.slice(0, 5)) {
  console.log(`  #${String(d.id).padStart(3)} ${d.dateISO?.slice(0, 10)} [${d.source}] «${d.title.slice(0, 55)}»`)
}

console.log('\n📋 ПОСЛЕДНИЕ 5 ДНЕЙ (самые свежие):')
for (const d of allDays.slice(-5)) {
  console.log(`  #${String(d.id).padStart(3)} ${d.dateISO?.slice(0, 10)} [${d.source}] «${d.title.slice(0, 55)}»`)
}

// ─── ФОРМИРОВАНИЕ ИТОГОВОГО МАССИВА ──────────────────────────────────────────

const cleanDays = allDays.map((d) => ({
  id: d.id,
  title: d.title,
  tags: d.tags,
  prides: d.prides,
  gratitudes: d.gratitudes,
  photos: d.photos,
  dateISO: d.dateISO,
  status: 'normal',
}))

// Лента: строго по убыванию dateISO (самые свежие — сверху)
cleanDays.sort((a, b) => b.dateISO.localeCompare(a.dateISO))

// Дополнительная проверка: ID в ленте НЕ должны убывать монотонно
// (это нормально — лента перевёрнута относительно нумерации)
console.log('\n📋 ТОП-5 ЛЕНТЫ (сверху, самые свежие):')
for (const d of cleanDays.slice(0, 5)) {
  console.log(`  #${String(d.id).padStart(3)} ${d.dateISO?.slice(0, 10)} «${d.title.slice(0, 55)}»`)
}

// ─── STREAK ──────────────────────────────────────────────────────────────────

const dates = new Set()
for (const d of cleanDays) {
  if (d.dateISO) dates.add(d.dateISO.slice(0, 10))
}
const streakRes = computeStreak(dates, new Date())

// ─── ОТЧЁТ И ЗАПИСЬ ──────────────────────────────────────────────────────────

const report = {
  totalDays,
  notebookDays: 24,
  appleNotesDays: notesPrides.length,
  realRawDays: rawPridesByDate.size,
  manualDays: 3,
  monotonProblems,
  seamNotebookToNotes: {
    day24: { id: day24.id, date: day24.dateISO?.slice(0, 10) },
    day25: { id: day25.id, date: day25.dateISO?.slice(0, 10), title: day25.title },
  },
  seamNotesToRaw: appleNotesEnd && rawStart
    ? {
        notesEnd: { id: appleNotesEnd.id, date: appleNotesEnd.dateISO?.slice(0, 10), title: appleNotesEnd.title },
        rawStart: { id: rawStart.id, date: rawStart.dateISO?.slice(0, 10), title: rawStart.title },
      }
    : null,
  finalDay: { id: dayLast.id, date: dayLast.dateISO?.slice(0, 10), title: dayLast.title },
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
console.log(`📊 Отчёт: ${reportPath}`)
