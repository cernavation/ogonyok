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

  it('содержит эталонный список кандидатов Gemini моделей для каскадного фоллбека', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const routeCode = fs.readFileSync(path.resolve(process.cwd(), 'app/api/evaluate/route.ts'), 'utf8')
    assert.ok(routeCode.includes('gemini-1.5-flash-latest'), 'Содержит gemini-1.5-flash-latest')
    assert.ok(routeCode.includes('gemini-1.5-flash'), 'Содержит gemini-1.5-flash')
    assert.ok(routeCode.includes('gemini-2.0-flash'), 'Содержит gemini-2.0-flash')
    assert.ok(routeCode.includes('gemini-1.5-pro'), 'Содержит gemini-1.5-pro')
    assert.ok(routeCode.includes('MODEL_CANDIDATES'), 'Объявлен MODEL_CANDIDATES')
    assert.ok(routeCode.includes('404') && routeCode.includes('not found'), 'Обрабатывает ошибку 404/not found для перехода к следующему кандидату')
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
})
