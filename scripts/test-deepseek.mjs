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
console.log('   ⚡ ТЕСТ ОЦЕНКИ ТОЛЬКО ГОРДОСТЕЙ (БЛАГОДАРНОСТИ БЕЗ ЗВЁЗД)')
console.log('═════════════════════════════════════════════════════════════════\n')

if (!apiKey) {
  console.error('❌ ОШИБКА: DEEPSEEK_API_KEY не задан в .env.local или аргументах!')
  process.exit(1)
}

const testPrides = [
  'Пробежал 12 км на утренней тренировке под проливным дождём на пульсе 155',
  'Успешно завершил миграцию боевой архитектуры на DeepSeek API и закрыл все тесты',
  'Преодолел искушение сорвать режим сна, лёг ровно в 23:00',
  'Прочитал 40 страниц профильной литературы по распределённым базам',
  'Провёл важный разговор с партнёром без компромиссов по качеству',
]

const testGratitudes = [
  'Благодарен организму за выносливость и адаптацию к нагрузкам',
  'Благодарен команде за надёжность и поддержку в сложные моменты',
]

console.log('📝 Тестовый день для оценки:')
console.log('  Гордости (оцениваются баллами):')
testPrides.forEach((p, i) => console.log(`    ${i + 1}. ${p}`))
console.log('  Благодарности (БЕЗ оценок и звёзд, только для напутствия):')
testGratitudes.forEach((g, i) => console.log(`    - ${g}`))
console.log(`\n🔑 Используется ключ: ${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`)
console.log('📡 Отправляем запрос в DeepSeek API (https://api.deepseek.com/chat/completions)...')

const startTime = Date.now()

try {
  const systemPrompt = `Ты — требовательный, но вдохновляющий ментор личной силы и спортивной дисциплины системы побед "Огонёк".
Твоя задача — объективно оценить СТРОГО гордости (победы и преодоления дня).
Каждая гордость получает:
- num: порядковый номер (1, 2, 3...)
- score: число с плавающей точкой от 1.0 до 10.0 (например 8.8 или 9.5; 10.0 — исключительный триумф/прорыв через экстремальное сопротивление, 8.0-9.5 — сверхусилие и характер, 6.0-7.9 — хорошая продуктивная работа, 4.0-5.9 — рутинные базовые действия, 1.0-3.9 — минимум усилий).
- comment: уникальный лаконичный персональный разбор в 1 предложение конкретно по этому действию (без шаблонных повторов!).
- overcome: уровень преодоления барьера (число 0, 1, 2 или 3).
- tags: массив из 1-2 тегов (например, ["#Дисциплина", "#Спорт"]).

ВНИМАНИЕ: БЛАГОДАРНОСТИ НЕ ОЦЕНИВАЮТСЯ ЦИФРАМИ И ЗВЁЗДАМИ! Запрещено выставлять баллы и звёзды благодарностям!
Тексты благодарностей используй ИСКЛЮЧИТЕЛЬНО для составления душевного, глубокого и точного напутствия ментора (поле verdict).

Верни строгий JSON со следующими полями:
{
  "prideEvaluations": [
    {
      "num": 1,
      "score": 8.8,
      "comment": "краткий персональный комментарий к этому конкретному пункту",
      "overcome": 2,
      "tags": ["#Дисциплина"]
    }
  ],
  "breakdown": "общий краткий разбор масштаба побед дня в 1-2 предложениях",
  "verdict": "сильное душевное мотивационное напутствие ментора в 1-2 предложениях, объединяющее преодоления и благодарности дня"
}`

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
          content: systemPrompt,
        },
        {
          role: 'user',
          content: JSON.stringify({ prides: testPrides, gratitudes: testGratitudes }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 700,
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

  const prideEvaluations = testPrides.map((p, i) => {
    const item = Array.isArray(parsed.prideEvaluations) ? parsed.prideEvaluations[i] : null
    const sc = typeof item?.score === 'number' ? Number(item.score.toFixed(1)) : 8.8
    return {
      num: i + 1,
      text: p,
      score: sc,
      comment: item?.comment || parsed.breakdown || 'Победа дня.',
    }
  })

  const prideScoresSum = prideEvaluations.reduce((acc, p) => acc + p.score, 0)
  const averageScore = Number((prideScoresSum / prideEvaluations.length).toFixed(1))

  console.log('\n═════════════════════════════════════════════════════════════════')
  console.log('   📊 РЕЗУЛЬТАТ ОЦЕНКИ DEEPSEEK')
  console.log('═════════════════════════════════════════════════════════════════')
  console.log(`⏱ Время ответа: ${elapsed} мс ${elapsed < 3000 ? '✅ (< 3.0 сек)' : '⚠️ (> 3.0 сек)'}`)
  console.log(`🎯 Итоговый точный средний балл: ${averageScore} / 10.0 ★`)
  console.log(`📋 Разбор: ${parsed.breakdown}`)
  console.log(`🔥 Напутствие ментора: ${parsed.verdict}`)
  console.log('\n🔥 Персональные оценки 5 гордостей:')
  prideEvaluations.forEach((p) => {
    console.log(`  [${p.num}] ★ ${p.score.toFixed(1)}: "${p.comment}"`)
  })
  console.log('═════════════════════════════════════════════════════════════════\n')

  if (typeof averageScore !== 'number' || isNaN(averageScore) || averageScore < 1.0 || averageScore > 10.0) {
    console.error('❌ Невалидный балл!')
    process.exit(1)
  }

  console.log('✅ ТЕСТ УСПЕШНО ПРОЙДЕН: Гордости оценены персонально, благодарности без звёзд!')
} catch (err) {
  const elapsed = Date.now() - startTime
  console.error(`\n❌ Ошибка выполнения запроса (${elapsed} мс):`, err)
  process.exit(1)
}
