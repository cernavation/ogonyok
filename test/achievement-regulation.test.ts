import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACHIEVEMENT_CATEGORIES,
  computeAchievementProgress,
  getAchievementCategory,
  regulateAchievement,
  sanitizeRegulation,
} from '../lib/ogonek/achievement-regulation.ts'
import type {
  AchievementCategoryId,
  AchievementEvidenceFile,
  AchievementRegulation,
} from '../lib/ogonek/types.ts'

function evidenceFor(reqIds: string[]): AchievementEvidenceFile[] {
  return reqIds.map((requirementId, index) => ({
    id: `e-${index}`,
    requirementId,
    fileName: `file-${index}.pdf`,
    ref: `https://example.org/${index}.pdf`,
    mime: 'application/pdf',
    size: 1024,
    addedAtISO: new Date().toISOString(),
  }))
}

describe('Achievement regulation engine', () => {
  it('defines exactly the four required categories', () => {
    assert.equal(ACHIEVEMENT_CATEGORIES.length, 4)
    const ids = ACHIEVEMENT_CATEGORIES.map((c) => c.id)
    assert.deepEqual(ids.sort(), ['business', 'discipline', 'education', 'sport-record'])
  })

  it('falls back to the first category for an unknown id', () => {
    const cat = getAchievementCategory('nope' as AchievementCategoryId)
    assert.equal(cat.id, 'sport-record')
  })

  it('builds a forensic barefoot-marathon regulation with video proof', () => {
    const reg = regulateAchievement('sport-record', 'Финишировал марафон 42,2 км босиком')
    assert.equal(reg.strictness, 'forensic')
    const ids = reg.requirements.map((r) => r.id)
    assert.ok(ids.includes('sport-protocol'))
    assert.ok(ids.includes('sport-barefoot-video'))
    const video = reg.requirements.find((r) => r.id === 'sport-barefoot-video')
    assert.equal(video?.required, true)
  })

  it('requires a payment screenshot for business revenue', () => {
    const reg = regulateAchievement('business', 'Получил первую оплату подписки')
    const revenue = reg.requirements.find((r) => r.id === 'biz-revenue')
    assert.equal(revenue?.required, true)
    const ids = reg.requirements.map((r) => r.id)
    assert.ok(!ids.includes('biz-term-sheet'))
  })

  it('adds an investment term sheet and forensic strictness for funding', () => {
    const reg = regulateAchievement('business', 'Закрыл инвест раунд seed на $500k')
    assert.equal(reg.strictness, 'forensic')
    const ids = reg.requirements.map((r) => r.id)
    assert.ok(ids.includes('biz-term-sheet'))
  })

  it('requires an olympiad protocol for education contests', () => {
    const reg = regulateAchievement('education', 'Призёр республиканской олимпиады по математике')
    const ids = reg.requirements.map((r) => r.id)
    assert.ok(ids.includes('edu-protocol'))
    assert.equal(reg.strictness, 'forensic')
  })

  it('requires a full calendar export for discipline streaks', () => {
    const reg = regulateAchievement('discipline', '719 дней подряд без пропусков')
    const consistency = reg.requirements.find((r) => r.id === 'disc-consistency')
    assert.equal(consistency?.required, true)
  })

  it('always guarantees at least one required requirement per category', () => {
    const topics: Record<AchievementCategoryId, string> = {
      'sport-record': 'Спортивное достижение',
      business: 'Бизнес-достижение',
      education: 'Учебное достижение',
      discipline: 'Серия дисциплины',
    }
    for (const cat of ACHIEVEMENT_CATEGORIES) {
      const reg = regulateAchievement(cat.id, topics[cat.id])
      assert.ok(reg.requirements.some((r) => r.required), `no required for ${cat.id}`)
      assert.ok(reg.summary.length > 0)
      assert.ok(reg.verifier.length > 0)
      assert.ok(reg.rejectionCriteria.length > 0)
    }
  })
})

describe('Achievement evidence progress', () => {
  const reg: AchievementRegulation = regulateAchievement('business', 'Первая выручка')

  it('reports incomplete when required evidence is missing', () => {
    const progress = computeAchievementProgress({ regulation: reg, evidence: [] })
    assert.equal(progress.complete, false)
    assert.equal(progress.requiredCovered, 0)
    assert.ok(progress.requiredTotal >= 1)
  })

  it('reports complete once every required requirement is covered', () => {
    const requiredIds = reg.requirements.filter((r) => r.required).map((r) => r.id)
    const progress = computeAchievementProgress({
      regulation: reg,
      evidence: evidenceFor(requiredIds),
    })
    assert.equal(progress.complete, true)
    assert.equal(progress.requiredCovered, progress.requiredTotal)
    assert.equal(progress.ratio, 1)
  })

  it('ignores extra optional evidence for completeness', () => {
    const progress = computeAchievementProgress({
      regulation: reg,
      evidence: evidenceFor(['biz-media']),
    })
    assert.equal(progress.complete, false)
  })
})

describe('sanitizeRegulation', () => {
  it('falls back to the heuristic when AI returns no requirements', () => {
    const safe = sanitizeRegulation({ requirements: [] }, 'education', 'Курс по Python')
    assert.ok(safe.requirements.length > 0)
    assert.ok(safe.requirements.some((r) => r.required))
  })

  it('keeps valid AI requirements but forces at least one required', () => {
    const safe = sanitizeRegulation(
      {
        summary: 'Нужны документы',
        strictness: 'forensic',
        requirements: [
          { id: 'x1', title: 'Док', purpose: 'p', formats: ['PDF'], required: false, example: 'e' },
        ],
      },
      'business',
      'Сделка'
    )
    assert.equal(safe.strictness, 'forensic')
    assert.equal(safe.requirements.length, 1)
    assert.equal(safe.requirements[0].required, true)
    assert.equal(safe.aiGenerated, true)
  })
})
