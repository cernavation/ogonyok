import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  BIG_STREAK_MILESTONES,
  computeWeeklyMilestoneProgress,
} from '../lib/ogonek/streak.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

describe('Точечные фиксы — комментарии без эмодзи-реакций и две линии прогресса в «Ритме недели»', () => {
  it('1. computeWeeklyMilestoneProgress: корректные расчёты для 0, 45, 100, 752, 1000, 3500, 15000, 30000', () => {
    assert.deepEqual([...BIG_STREAK_MILESTONES], [1000, 2000, 3000, 5000, 10000, 15000, 30000])

    // 0: большая веха скрыта, текущая сотня 0 / 100 с оранжевым градиентом
    const s0 = computeWeeklyMilestoneProgress(0)
    assert.equal(s0.bigMilestone, null)
    assert.deepEqual(s0.hundredMilestone, {
      nextHundred: 100,
      inCurrentHundred: 0,
      remaining: 100,
      percent: 0,
      isAccentGradient: true,
      labelLeft: 'До 100 дн.',
      labelRight: '0 / 100',
      tooltip: 'Осталось 100 дн. до 100',
    })

    // 45: большая веха скрыта, единственная полоса До 100 дн. -> 45 / 100 (45%, оранжевый градиент)
    const s45 = computeWeeklyMilestoneProgress(45)
    assert.equal(s45.bigMilestone, null)
    assert.equal(s45.hundredMilestone.labelLeft, 'До 100 дн.')
    assert.equal(s45.hundredMilestone.labelRight, '45 / 100')
    assert.equal(s45.hundredMilestone.percent, 45)
    assert.equal(s45.hundredMilestone.isAccentGradient, true)
    assert.equal(s45.hundredMilestone.tooltip, 'Осталось 55 дн. до 100')

    // 100: разблокируется большая веха 100 / 1 000 (10%), сотня До 200 дн. -> 0 / 100 (белая)
    const s100 = computeWeeklyMilestoneProgress(100)
    assert.deepEqual(s100.bigMilestone, {
      target: 1000,
      remaining: 900,
      percent: 10,
      isLegend: false,
      labelLeft: 'Большая веха',
      labelRight: '100 / 1 000',
      tooltip: 'Осталось 900 дн. до вехи 1 000',
    })
    assert.equal(s100.hundredMilestone.labelLeft, 'До 200 дн.')
    assert.equal(s100.hundredMilestone.labelRight, '0 / 100')
    assert.equal(s100.hundredMilestone.percent, 0)
    assert.equal(s100.hundredMilestone.isAccentGradient, false)
    assert.equal(s100.hundredMilestone.tooltip, 'Осталось 100 дн. до 200')

    // 752: Большая веха 752 / 1 000 (75.2%), До 800 дн. -> 52 / 100 (52%, белая)
    const s752 = computeWeeklyMilestoneProgress(752)
    assert.deepEqual(s752.bigMilestone, {
      target: 1000,
      remaining: 248,
      percent: 75.2,
      isLegend: false,
      labelLeft: 'Большая веха',
      labelRight: '752 / 1 000',
      tooltip: 'Осталось 248 дн. до вехи 1 000',
    })
    assert.deepEqual(s752.hundredMilestone, {
      nextHundred: 800,
      inCurrentHundred: 52,
      remaining: 48,
      percent: 52,
      isAccentGradient: false,
      labelLeft: 'До 800 дн.',
      labelRight: '52 / 100',
      tooltip: 'Осталось 48 дн. до 800',
    })

    // 1000: следующая цель строго > 1000 -> 2 000 (50%)
    const s1000 = computeWeeklyMilestoneProgress(1000)
    assert.equal(s1000.bigMilestone?.target, 2000)
    assert.equal(s1000.bigMilestone?.labelRight, '1 000 / 2 000')
    assert.equal(s1000.bigMilestone?.percent, 50)
    assert.equal(s1000.bigMilestone?.tooltip, 'Осталось 1 000 дн. до вехи 2 000')
    assert.equal(s1000.hundredMilestone.nextHundred, 1100)
    assert.equal(s1000.hundredMilestone.labelLeft, 'До 1 100 дн.')
    assert.equal(s1000.hundredMilestone.labelRight, '0 / 100')

    // 3500: цель 5 000 (70%), сотня До 3 600 дн. -> 0 / 100
    const s3500 = computeWeeklyMilestoneProgress(3500)
    assert.equal(s3500.bigMilestone?.target, 5000)
    assert.equal(s3500.bigMilestone?.labelRight, '3 500 / 5 000')
    assert.equal(s3500.bigMilestone?.percent, 70)
    assert.equal(s3500.bigMilestone?.tooltip, 'Осталось 1 500 дн. до вехи 5 000')
    assert.equal(s3500.hundredMilestone.labelLeft, 'До 3 600 дн.')
    assert.equal(s3500.hundredMilestone.labelRight, '0 / 100')

    // 15000: цель 30 000 (50%), сотня До 15 100 дн. -> 0 / 100
    const s15000 = computeWeeklyMilestoneProgress(15000)
    assert.equal(s15000.bigMilestone?.target, 30000)
    assert.equal(s15000.bigMilestone?.labelRight, '15 000 / 30 000')
    assert.equal(s15000.bigMilestone?.percent, 50)
    assert.equal(s15000.bigMilestone?.tooltip, 'Осталось 15 000 дн. до вехи 30 000')
    assert.equal(s15000.hundredMilestone.labelLeft, 'До 15 100 дн.')

    // 30000: 100% и подпись «30 000+ · Легенда»
    const s30000 = computeWeeklyMilestoneProgress(30000)
    assert.equal(s30000.bigMilestone?.percent, 100)
    assert.equal(s30000.bigMilestone?.isLegend, true)
    assert.equal(s30000.bigMilestone?.labelRight, '30 000+ · Легенда')
  })

  it('2. RightRail рендерит 2 честные полосы (Большая веха + текущая сотня)', () => {
    const railSrc = readRepoFile('components/ogonek/right-rail.tsx')
    assert.ok(railSrc.includes('computeWeeklyMilestoneProgress'))
    assert.ok(railSrc.includes('rhythm-big-milestone'))
    assert.ok(railSrc.includes('rhythm-hundred-progress'))
    assert.ok(railSrc.includes('bg-white/45'))
    assert.ok(railSrc.includes('bg-white/90'))
    assert.ok(railSrc.includes('h-1.5'))
    assert.ok(!railSrc.includes('До вехи'), 'Старая запутывающая подпись «До вехи» удалена')
  })

  it('3. CommentsThread удалил эмодзи-реакции под комментариями, оставив смайлики в инпуте', () => {
    const src = readRepoFile('components/ogonek/comments-thread.tsx')
    assert.ok(!src.includes('SmilePlus'), 'Иконка SmilePlus удалена')
    assert.ok(!src.includes('COMMENT_QUICK_REACTIONS'), 'Быстрые эмодзи-реакции удалены из комментариев')
    assert.ok(!src.includes('openReactionPickerId'), 'Стейт пикера реакций удалён')
    assert.ok(!src.includes('toggleCommentReaction'), 'Вызов toggleCommentReaction удалён')
    assert.ok(!src.includes('Быстрые реакции'), 'Всплывашка быстрых реакций удалена')
    assert.ok(!src.includes('Пилюли эмодзи-реакций'), 'Пилюли реакций удалены')

    // Оставшиеся 4 действия под комментарием
    assert.ok(src.includes('Ответить на комментарий'))
    assert.ok(src.includes('fill-white text-white'))
    assert.ok(src.includes('Поделиться комментарием'))
    assert.ok(src.includes('Удалить комментарий'))

    // Смайлики в самом инпуте рядом с GIF сохранены
    assert.ok(src.includes('aria-label="Добавить эмодзи"'))
    assert.ok(src.includes('ChatEmojiPicker'))
    assert.ok(src.includes('aria-label="Выбрать GIF"'))
  })
})
