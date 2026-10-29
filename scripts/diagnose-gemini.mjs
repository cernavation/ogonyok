import fs from 'node:fs'
import path from 'node:path'

// Чтение .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim()
      const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[k]) process.env[k] = v
    }
  }
}

const rawKey =
  process.argv[2] ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  ''
const apiKey = rawKey.trim().replace(/^["']|["']$/g, '')

console.log('═════════════════════════════════════════════════════════════════')
console.log('   🔍 ДИАГНОСТИКА GOOGLE GEMINI API: LISTMODELS')
console.log('═════════════════════════════════════════════════════════════════')

if (!apiKey) {
  console.log('❌ GEMINI_API_KEY не обнаружен!')
  console.log('Укажите ключ в .env.local или передайте аргументом:')
  console.log('  node scripts/diagnose-gemini.mjs <ВАШ_GEMINI_API_KEY>')
  process.exit(1)
}

console.log(`🔑 Ключ: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (длина ${apiKey.length})`)

async function diagnose() {
  const versions = ['v1beta', 'v1']
  let foundModels = []

  for (const ver of versions) {
    const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`
    console.log(`\n📡 Отправка GET https://generativelanguage.googleapis.com/${ver}/models...`)
    try {
      const res = await fetch(url)
      console.log(`HTTP ${res.status} ${res.statusText}`)
      const data = await res.json()
      if (res.ok && data.models) {
        const genModels = data.models.filter(
          (m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
        )
        console.log(`✅ ${ver}: найдено ${genModels.length} моделей с поддержкой generateContent:`)
        genModels.forEach((m) => {
          const cleanName = m.name.replace(/^models\//, '')
          console.log(`   • ${cleanName.padEnd(28)} | ${m.displayName || ''}`)
          foundModels.push({ name: cleanName, version: ver, raw: m })
        })
      } else {
        console.log(`⚠️ Ответ ${ver}:`, data.error?.message || JSON.stringify(data))
      }
    } catch (err) {
      console.log(`❌ Ошибка сети для ${ver}:`, err.message)
    }
  }

  // Приоритетный выбор лучшей модели
  const PRIORITY_ORDER = [
    'gemini-1.5-flash-002',
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
    'gemini-2.5-flash',
    'gemini-1.5-pro-002',
    'gemini-1.5-pro',
  ]

  let bestModel = null
  for (const p of PRIORITY_ORDER) {
    const match = foundModels.find((m) => m.name === p)
    if (match) {
      bestModel = match
      break
    }
  }

  if (!bestModel && foundModels.length > 0) {
    bestModel = foundModels[0]
  }

  console.log('\n═════════════════════════════════════════════════════════════════')
  if (bestModel) {
    console.log(`🏆 РЕКОМЕНДОВАННАЯ ДЕЙСТВУЮЩАЯ МОДЕЛЬ: ${bestModel.name}`)
    console.log(`   Версия API: ${bestModel.version}`)
  } else {
    console.log('ℹ️ Список моделей не получен с данным ключом (проверьте привязку Generative Language API в Google Cloud).')
    console.log('В роут встроен автоматический фоллбек на gemini-1.5-flash-002 / gemini-1.5-flash / gemini-2.0-flash-exp (v1 + v1beta).')
  }
  console.log('═════════════════════════════════════════════════════════════════\n')
}

diagnose()
