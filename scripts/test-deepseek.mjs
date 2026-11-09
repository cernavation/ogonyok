import fs from 'node:fs'
import path from 'node:path'

// 1. Загрузка .env.local
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

const customKey = process.argv[2]
if (customKey) {
  process.env.DEEPSEEK_API_KEY = customKey.trim().replace(/^["']|["']$/g, '')
}

const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim().replace(/^["']|["']$/g, '')

console.log('═════════════════════════════════════════════════════════════════')
console.log('   ⚡ ТЕСТ ОЦЕНКИ РЕАЛЬНОГО ДНЯ ЧЕРЕЗ DEEPSEEK (deepseek-chat)')
console.log('═════════════════════════════════════════════════════════════════\n')

if (!apiKey) {
  console.error('❌ ОШИБКА: DEEPSEEK_API_KEY не задан в .env.local или аргументах!')
  process.exit(1)
}

const testPrides = [
  'Пробежал 12 км на утренней тренировке под проливным дождём на пульсе 155',
  'Успешно завершил миграцию боевой архитектуры на DeepSeek API и закрыл все тесты',
  'Преодолел искушение сорвать режим сна, лёг ровно в 23:00',
]

const testGratitudes = [
  'Благодарен организму за выносливость и адаптацию к нагрузкам',
  'Благодарен команде за надёжность и поддержку в сложные моменты',
]

console.log('📝 Тестовый день для оценки:')
console.log('  Гордости:')
testPrides.forEach((p, i) => console.log(`    ${i + 1}. ${p}`))
console.log('  Благодарности:')
testGratitudes.forEach((g, i) => console.log(`    ${i + 1}. ${g}`))
console.log(`\n🔑 Используется ключ: ${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`)
console.log('📡 Отправляем запрос в DeepSeek API (https://api.deepseek.com/chat/completions)...')

const startTime = Date.now()

try {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'Ты — требовательный, но вдохновляющий ментор личной силы и спортивной дисциплины. Проанализируй гордости и благодарности дня. Оцени масштаб побед, преодолённые барьеры и волю. Верни строгий json со следующими полями: score (число с плавающей точкой от 1.0 до 10.0, например 8.8 или 9.5), breakdown (краткий разбор 1-2 предложения), verdict (сильное мотивационное напутствие 1-2 предложения).',
        },
        {
          role: 'user',
          content: JSON.stringify({ prides: testPrides, gratitudes: testGratitudes }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 500,
    }),
  })

  const elapsed = Date.now() - startTime

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`\n❌ DeepSeek API вернул статус ${response.status}:`, errorText)
    process.exit(1)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    console.error('\n❌ Пустой ответ message.content от DeepSeek API')
    process.exit(1)
  }

  const parsed = JSON.parse(content)

  console.log('\n═════════════════════════════════════════════════════════════════')
  console.log('   📊 РЕЗУЛЬТАТ ОЦЕНКИ DEEPSEEK')
  console.log('═════════════════════════════════════════════════════════════════')
  console.log(`⏱ Время ответа: ${elapsed} мс ${elapsed < 3000 ? '✅ (< 3.0 сек)' : '⚠️ (> 3.0 сек)'}`)
  console.log(`🎯 Итоговый балл: ${parsed.score} / 10.0 ★`)
  console.log(`📋 Разбор: ${parsed.breakdown}`)
  console.log(`🔥 Напутствие ментора: ${parsed.verdict}`)
  console.log(`🤖 Модель: ${data.model || 'deepseek-chat'}`)
  console.log(`🔢 Токены: ${data.usage?.total_tokens} (prompt: ${data.usage?.prompt_tokens}, completion: ${data.usage?.completion_tokens})`)
  console.log('═════════════════════════════════════════════════════════════════\n')

  if (typeof parsed.score !== 'number' || isNaN(parsed.score) || parsed.score < 1.0 || parsed.score > 10.0) {
    console.error('❌ Невалидный балл!')
    process.exit(1)
  }

  if (!parsed.breakdown || !parsed.verdict) {
    console.error('❌ Отсутствуют breakdown или verdict!')
    process.exit(1)
  }

  console.log('✅ ТЕСТ УСПЕШНО ПРОЙДЕН: DeepSeek API работает стабильно и быстро!')
} catch (err) {
  const elapsed = Date.now() - startTime
  console.error(`\n❌ Ошибка выполнения запроса (${elapsed} мс):`, err)
  process.exit(1)
}
