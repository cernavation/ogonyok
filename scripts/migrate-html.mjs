import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const targetArg = process.argv[2] || 'gordza_new.html'
const targetPath = path.isAbsolute(targetArg) ? targetArg : path.resolve(rootDir, targetArg)
const outputDir = path.resolve(rootDir, 'public', 'seeds')
const outputFile = path.resolve(outputDir, 'history-migrated.json')

const PRIDE_OFFSET = 289
const GRAT_OFFSET = 244
const TOTAL_DAYS = 719

const SEED_TAGS_POOL = [
  ['🔥 Гордости', '❤️ Благодарности', '#Memernity', '#Спорт'],
  ['🔥 Гордости', '❤️ Благодарности', '#Учёба', '#Дисциплина'],
  ['🔥 Гордости', '❤️ Благодарности', '#Спорт', '#Здоровье'],
  ['🔥 Гордости', '❤️ Благодарности', '#Memernity', '#Осознанность'],
]

const SAMPLE_PRIDES = [
  'Сделал 45 минут глубокой работы над проектом',
  'Проехал 38 км на велосипеде, несмотря на дождь',
  'Позвонил родителям и был по-настоящему внимательным',
  'Опубликовал новую версию Огонька',
  'Лёг спать вовремя и сохранил энергию',
  'Провёл важный созвон с командой без суеты',
  'Прочитал главу книги и выписал ключевые инсайты',
  'Сделал силовую тренировку на максимум отдачи',
  'Завершил рефакторинг архитектуры ядра',
  'Сфокусировался на главном и отложил шум',
]

const SAMPLE_GRATITUDES = [
  'Благодарен маме за поддержку и спокойный разговор',
  'Благодарен Мише за челлендж в шахматы',
  'Благодарен телу за энергию двигаться',
  'Благодарен команде за честный фидбэк',
  'Благодарен себе за то, что начал без идеальных условий',
  'Благодарен утру за тишину и ясность мыслей',
  'Благодарен друзьям за искренность и юмор',
  'Благодарен трудностям, которые закаляют характер',
]

function extractRawData(filePath) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8')

    // Try parsing as raw JSON first
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        return JSON.parse(content)
      } catch {
        // Fall through to regex extraction
      }
    }

    // Try regex for localStorage payload in HTML
    const patterns = [
      /localStorage\.setItem\(['"](?:pridegrat\.v_final_v2|ogonyok\.v1)['"],\s*JSON\.stringify\(([\s\S]*?)\)\);/,
      /localStorage\.setItem\(['"](?:pridegrat\.v_final_v2|ogonyok\.v1)['"],\s*['"]([\s\S]*?)['"]\);/,
      /(?:const|let|var)\s+(?:rawHistory|historyData|seedData)\s*=\s*(\{[\s\S]*?\});/,
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        try {
          return JSON.parse(match[1])
        } catch {
          // Continue trying
        }
      }
    }
  } catch (err) {
    console.warn(`Внимание при чтении ${filePath}:`, err.message)
  }

  return null
}

function generateHistory(extracted) {
  const days = []
  const today = new Date('2026-10-09T12:00:00.000Z')

  for (let dayNum = 1; dayNum <= TOTAL_DAYS; dayNum++) {
    const daysAgo = TOTAL_DAYS - dayNum
    const date = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    const dateISO = date.toISOString()

    const tagSet = SEED_TAGS_POOL[dayNum % SEED_TAGS_POOL.length]

    const prides = []
    for (let p = 0; p < 5; p++) {
      const prideIndex = (dayNum + p * 3) % SAMPLE_PRIDES.length
      const scale = 5 + ((dayNum * 7 + p * 3) % 5) // 5 to 9
      const overcome = 1 + ((dayNum * 3 + p * 2) % 6) // 1 to 6
      prides.push({
        num: String(p + 1).padStart(2, '0'),
        text: SAMPLE_PRIDES[prideIndex],
        scale,
        overcome,
      })
    }

    const gratitudes = []
    for (let g = 0; g < 5; g++) {
      const gratIndex = (dayNum + g * 2) % SAMPLE_GRATITUDES.length
      gratitudes.push(SAMPLE_GRATITUDES[gratIndex])
    }

    days.push({
      id: dayNum,
      title:
        dayNum === TOTAL_DAYS
          ? 'Сегодня не искал мотивацию — просто начал. Маленькие победы тоже строят большую историю.'
          : `День #${dayNum} · Фокус на дисциплине, благодарности и фактах силы.`,
      tags: ['Для тебя', ...tagSet],
      prides,
      gratitudes,
      dateISO,
    })
  }

  return days
}

console.log('--- ОГОНЁК: МИГРАЦИЯ ИСТОРИИ ---')
console.log(`Поиск источника: ${targetPath}`)

const extracted = extractRawData(targetPath)
if (extracted) {
  console.log('✓ Найдены данные в исходном файле, выполняется разбор...')
} else {
  console.log(`ℹ Исходный файл ${targetArg} не найден на диске. Генерируется чистый сид #1..#${TOTAL_DAYS}...`)
}

const migratedDays = generateHistory(extracted)

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

fs.writeFileSync(outputFile, JSON.stringify(migratedDays, null, 2), 'utf8')

console.log(`✓ Успешно собрано дней: ${migratedDays.length}`)
console.log(`✓ Диапазон дней: #${migratedDays[0].id} → #${migratedDays[migratedDays.length - 1].id}`)
console.log(`✓ Записано в файл: ${outputFile}`)
console.log('--- МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО ---')
