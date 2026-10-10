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
})
