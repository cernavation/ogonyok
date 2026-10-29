import fs from 'node:fs'
import path from 'node:path'

// Чтение .env.local если есть
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
console.log('   📡 GOOGLE CLOUD: LISTMODELS (v1beta)')
console.log('═════════════════════════════════════════════════════════════════')

if (!apiKey) {
  console.error('❌ ОШИБКА: Ключ GEMINI_API_KEY не задан.')
  console.log('Передайте ключ аргументом: node scripts/list-gemini-models.mjs <API_KEY>')
  process.exit(1)
}

console.log(`🔑 Ключ: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (длина ${apiKey.length})`)

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  console.log(`\nОтправка GET: https://generativelanguage.googleapis.com/v1beta/models...`)

  try {
    const res = await fetch(url)
    console.log(`Статус ответа: HTTP ${res.status} ${res.statusText}`)

    const data = await res.json()

    if (!res.ok) {
      console.error('❌ Ошибка от Google API:', data.error || data)
      console.log('\nДля работы с Generative Language API убедитесь, что:')
      console.log('1. В Google AI Studio сгенерирован ключ API (обычно начинается с AIzaSy...).')
      console.log('2. В Google Cloud Console включен "Generative Language API".')
      return
    }

    if (!Array.isArray(data.models)) {
      console.log('⚠️ Поле models отсутствует в ответе:', data)
      return
    }

    const genModels = data.models.filter(
      (m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
    )

    console.log(`\n✅ Найдено ${genModels.length} моделей с поддержкой метода "generateContent":\n`)
    console.log('ИМЯ МОДЕЛИ                     | ОТОБРАЖАЕМОЕ ИМЯ                 | МЕТОДЫ')
    console.log('-------------------------------+----------------------------------+-----------------------------')
    
    for (const m of genModels) {
      const cleanName = m.name.replace(/^models\//, '').padEnd(30)
      const dispName = (m.displayName || '').padEnd(32)
      const methods = (m.supportedGenerationMethods || []).join(', ')
      console.log(`${cleanName} | ${dispName} | ${methods}`)
    }

    console.log('\n═════════════════════════════════════════════════════════════════')
    const has20FlashExp = genModels.some((m) => m.name.includes('gemini-2.0-flash-exp'))
    const has20Flash = genModels.some((m) => m.name.includes('gemini-2.0-flash'))
    console.log(`🚀 Наличие Gemini 2.0 Flash:`)
    console.log(`   • gemini-2.0-flash-exp: ${has20FlashExp ? 'ДОСТУПНА ✅' : 'НЕТ ❌'}`)
    console.log(`   • gemini-2.0-flash:     ${has20Flash ? 'ДОСТУПНА ✅' : 'НЕТ ❌'}`)
    console.log('═════════════════════════════════════════════════════════════════')
  } catch (err) {
    console.error('❌ Сетевая ошибка при запросе ListModels:', err.message)
  }
}

listModels()
