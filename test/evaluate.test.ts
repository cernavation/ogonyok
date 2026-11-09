import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluatePrideItemHeuristic,
  evaluatePridesHeuristic,
} from '../lib/ogonek/evaluate-heuristic.ts'

describe('Pride Heuristic Evaluator', () => {
  it('handles empty strings gracefully', () => {
    const res = evaluatePrideItemHeuristic('')
    assert.equal(res.scale, 5)
    assert.equal(res.overcome, 0)
    assert.deepEqual(res.tags, ['Для тебя'])
    assert.ok(res.verdict.length > 0)
  })

  it('detects routine achievements with overcome 0', () => {
    const res = evaluatePrideItemHeuristic('Выпил стакан воды и почитал книгу')
    assert.equal(res.overcome, 0)
    assert.ok(res.scale >= 1 && res.scale <= 10)
  })

  it('detects light discipline overcome 1', () => {
    const res = evaluatePrideItemHeuristic('Преодолел лень, встал в 7 утра и доделал задачу')
    assert.equal(res.overcome, 1)
    assert.ok(res.tags.includes('Дисциплина'))
  })

  it('detects medium barrier overcome 2', () => {
    const res = evaluatePrideItemHeuristic('Было очень страшно и тяжело, но я созвонился с клиентом')
    assert.equal(res.overcome, 2)
    assert.ok(res.tags.includes('Бизнес') || res.tags.includes('Разум'))
  })

  it('detects extreme breakthrough overcome 3', () => {
    const res = evaluatePrideItemHeuristic('Вопреки панике и на грани сил сделал прорыв в проекте')
    assert.equal(res.overcome, 3)
    assert.ok(res.scale >= 8)
  })

  it('correctly maps tags for sports with numbers', () => {
    const res = evaluatePrideItemHeuristic('Пробежал 10 км на утренней тренировке')
    assert.ok(res.tags.includes('Спорт'))
    assert.ok(res.scale >= 7) // has numbers and length
  })

  it('evaluates batches of items correctly', () => {
    const items = [
      'Проснулся вовремя',
      'Пробежал 5 км',
      'Несмотря на страх провел важнейший разговор с инвестором',
    ]
    const batch = evaluatePridesHeuristic(items)
    assert.equal(batch.length, 3)
    assert.equal(batch[0].overcome, 1)
    assert.ok(batch[1].tags.includes('Спорт'))
    assert.equal(batch[2].overcome, 3)
  })

  it('содержит официальный эндпоинт DeepSeek API и модель deepseek-chat', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routeCode = fs.readFileSync(path.resolve(process.cwd(), 'app/api/evaluate/route.ts'), 'utf8')
    assert.ok(routeCode.includes('https://api.deepseek.com/chat/completions'), 'Использует эндпоинт https://api.deepseek.com/chat/completions')
    assert.ok(routeCode.includes('deepseek-chat'), 'Указана модель deepseek-chat')
    assert.ok(routeCode.includes('DEEPSEEK_API_KEY'), 'Использует ключ DEEPSEEK_API_KEY')
  })

  it('проверяет изоляцию ленты Друзья и чистку рейтинга @cernavation / @ilonmusk', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const homeCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/views/home-view.tsx'), 'utf8')
    assert.ok(homeCode.includes("filter === 'Мои гордости'"), 'Фильтрует по вкладке Мои гордости')
    assert.ok(homeCode.includes("filter === 'Друзья'"), 'Фильтрует по вкладке Друзья')
    assert.ok(homeCode.includes('followingIds.includes'), 'Проверяет наличие в followingIds')
    assert.ok(homeCode.includes('Скопировать приглашение'), 'Содержит кнопку Скопировать приглашение')

    const lbCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/views/leaderboard-view.tsx'), 'utf8')
    assert.ok(lbCode.includes('cernavation'), 'Содержит cernavation')
    assert.ok(lbCode.includes('ilonmusk'), 'Содержит ilonmusk')
    assert.ok(lbCode.includes('showNumber={true}'), 'Показывает номер уровня в бейдже')
  })

  it('содержит строгие параметры DeepSeek: json_object format, temperature: 0.5, оценка только для гордостей', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routeCode = fs.readFileSync(path.resolve(process.cwd(), 'app/api/evaluate/route.ts'), 'utf8')
    assert.ok(routeCode.includes("json_object"), 'Задан response_format json_object')
    assert.ok(routeCode.includes('temperature: 0.5'), 'Задан temperature 0.5')
    assert.ok(routeCode.includes('prideEvaluations'), 'Формирует prideEvaluations')
    assert.ok(routeCode.includes('gratitudeEvaluations') && (routeCode.includes('gratitudeEvaluations: []') || routeCode.includes('gratitudeEvaluations: any[] = []')), 'Благодарности не получают звёзд и оценок (пустой массив)')
    assert.ok(routeCode.includes('prideScoresSum / prideEvaluations.length') || routeCode.includes('prideScoresSum / prides.length'), 'Вычисляет средний балл как среднее арифметическое гордостей')
  })

  it('сохраняет точный десятичный балл (float 8.8) в карточке дня и летописи', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const cardCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/day-card.tsx'), 'utf8')
    assert.ok(cardCode.includes('Number(day.score ?? averageScore).toFixed(1)'), 'Отображает точный балл дня с десятыми')
    assert.ok(cardCode.includes('day.score'), 'Учитывает точный балл дня day.score')

    const ceremonyCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/evaluation-ceremony-modal.tsx'), 'utf8')
    assert.ok(ceremonyCode.includes('averageScore.toFixed(1)'), 'В церемонии выводится точный балл с десятыми')
    assert.ok(!ceremonyCode.includes("type === 'gratitude'"), 'Благодарности исключены из оцениваемых карточек церемонии')
  })

  it('extractAndParseJson корректно извлекает JSON при наличии префикса "Calibrated..." или markdown', async () => {
    const { extractAndParseJson } = await import('../lib/ogonek/ai-eval-parser.ts')
    
    // 1. Обычный валидный JSON
    const res1 = extractAndParseJson('{"score": 8.5, "verdict": "Отлично"}')
    assert.equal(res1.score, 8.5)

    // 2. Ошибка из скриншота: префикс Calibrated...
    const res2 = extractAndParseJson('Calibrated Mentor analysis:\n{"score": 9.0, "verdict": "Прорыв дня"}')
    assert.equal(res2.score, 9.0)
    assert.equal(res2.verdict, 'Прорыв дня')

    // 3. Markdown обёртка ```json ... ```
    const res3 = extractAndParseJson('```json\n{"score": 7.5, "verdict": "Хорошая работа"}\n```')
    assert.equal(res3.score, 7.5)
  })
})
