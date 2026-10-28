import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  normalizeVisibility,
  mostRestrictive,
  isPubliclyVisible,
  visibilityLabel,
  visibilityMeta,
  DEFAULT_VISIBILITY,
} from '../lib/ogonek/visibility.ts'
import type { VisibilityLevel } from '../lib/ogonek/types.ts'

/**
 * Логика вычисления «все ли слоты приватны» из composer.tsx
 */
export function checkIsAllPrivate(
  visMap: Record<number, VisibilityLevel>,
  dayVisibility: VisibilityLevel = 'public'
): boolean {
  return [0, 1, 2, 3, 4].every(
    (slot) => (visMap[slot] || dayVisibility || 'public') === 'private'
  )
}

/**
 * Логика пакетного применения уровня приватности (Сделать все личным / публичным)
 */
export function generateBatchPrivacy(
  currentSlotVis: VisibilityLevel
): Record<number, VisibilityLevel> {
  const targetLevel: VisibilityLevel = currentSlotVis === 'private' ? 'private' : 'public'
  return {
    0: targetLevel,
    1: targetLevel,
    2: targetLevel,
    3: targetLevel,
    4: targetLevel,
  }
}

test('Пакетное изменение приватности в Composer и модуль visibility.ts', async (t) => {
  await t.test('composer.tsx содержит канонические функции пакетной приватности', () => {
    const composerCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/composer.tsx'), 'utf8')
    assert.ok(composerCode.includes('isCurrentTabAllPrivate'), 'isCurrentTabAllPrivate объявлен в composer.tsx')
    assert.ok(composerCode.includes('handleApplyToAll'), 'handleApplyToAll объявлен в composer.tsx')
    assert.ok(composerCode.includes('handleToggleAllVisibility'), 'handleToggleAllVisibility объявлен в composer.tsx')
    assert.ok(composerCode.includes("targetLevel: VisibilityLevel = currentSlotVis === 'private' ? 'private' : 'public'"), 'targetLevel вычисляется по текущему слоту')
  })

  await t.test('normalizeVisibility корректно сохраняет валидные уровни', () => {
    assert.equal(normalizeVisibility('public'), 'public')
    assert.equal(normalizeVisibility('friends'), 'friends')
    assert.equal(normalizeVisibility('private'), 'private')
  })

  await t.test('normalizeVisibility сбрасывает мусор и undefined в публичный уровень по умолчанию', () => {
    assert.equal(normalizeVisibility(null), DEFAULT_VISIBILITY)
    assert.equal(normalizeVisibility(undefined), DEFAULT_VISIBILITY)
    assert.equal(normalizeVisibility(''), DEFAULT_VISIBILITY)
    assert.equal(normalizeVisibility('secret'), DEFAULT_VISIBILITY)
    assert.equal(normalizeVisibility(123), DEFAULT_VISIBILITY)
  })

  await t.test('mostRestrictive корректно определяет наиболее строгий уровень', () => {
    assert.equal(mostRestrictive('public', 'private'), 'private')
    assert.equal(mostRestrictive('private', 'public'), 'private')
    assert.equal(mostRestrictive('public', 'friends'), 'friends')
    assert.equal(mostRestrictive('friends', 'private'), 'private')
    assert.equal(mostRestrictive('public', 'public'), 'public')
    assert.equal(mostRestrictive('private', 'private'), 'private')
  })

  await t.test('isPubliclyVisible возвращает true только для public', () => {
    assert.equal(isPubliclyVisible('public'), true)
    assert.equal(isPubliclyVisible('friends'), false)
    assert.equal(isPubliclyVisible('private'), false)
  })

  await t.test('visibilityLabel и visibilityMeta возвращают полные человекочитаемые данные', () => {
    assert.equal(visibilityLabel('public'), 'Публично')
    assert.equal(visibilityLabel('friends'), 'Друзьям')
    assert.equal(visibilityLabel('private'), 'Лично')

    const meta = visibilityMeta('private')
    assert.equal(meta.icon, 'lock')
    assert.equal(meta.rank, 2)
  })

  await t.test('checkIsAllPrivate возвращает true, если все 5 слотов установлены в private', () => {
    const visMap: Record<number, VisibilityLevel> = {
      0: 'private',
      1: 'private',
      2: 'private',
      3: 'private',
      4: 'private',
    }
    assert.equal(checkIsAllPrivate(visMap, 'public'), true)
  })

  await t.test('checkIsAllPrivate возвращает false, если хотя бы один слот public или friends', () => {
    const visMap: Record<number, VisibilityLevel> = {
      0: 'private',
      1: 'private',
      2: 'public',
      3: 'private',
      4: 'private',
    }
    assert.equal(checkIsAllPrivate(visMap, 'public'), false)

    const visFriends: Record<number, VisibilityLevel> = {
      0: 'private',
      1: 'private',
      2: 'private',
      3: 'private',
      4: 'friends',
    }
    assert.equal(checkIsAllPrivate(visFriends, 'public'), false)
  })

  await t.test('checkIsAllPrivate учитывает наследование от dayVisibility при пустом visMap', () => {
    const emptyMap: Record<number, VisibilityLevel> = {}
    assert.equal(checkIsAllPrivate(emptyMap, 'private'), true)
    assert.equal(checkIsAllPrivate(emptyMap, 'public'), false)
    assert.equal(checkIsAllPrivate(emptyMap, 'friends'), false)
  })

  await t.test('generateBatchPrivacy устанавливает все 5 слотов в private, если текущий слот private', () => {
    const batch = generateBatchPrivacy('private')
    assert.deepEqual(batch, {
      0: 'private',
      1: 'private',
      2: 'private',
      3: 'private',
      4: 'private',
    })
    assert.equal(checkIsAllPrivate(batch), true)
  })

  await t.test('generateBatchPrivacy устанавливает все 5 слотов в public, если текущий слот public или friends', () => {
    const batchFromPublic = generateBatchPrivacy('public')
    assert.deepEqual(batchFromPublic, {
      0: 'public',
      1: 'public',
      2: 'public',
      3: 'public',
      4: 'public',
    })
    assert.equal(checkIsAllPrivate(batchFromPublic), false)

    const batchFromFriends = generateBatchPrivacy('friends')
    assert.deepEqual(batchFromFriends, {
      0: 'public',
      1: 'public',
      2: 'public',
      3: 'public',
      4: 'public',
    })
  })

  await t.test('симуляция переключения: пользователь делает день и все записи личными в 1 клик', () => {
    let dayVis: VisibilityLevel = 'public'
    let prideVis: Record<number, VisibilityLevel> = { 0: 'public', 1: 'public', 2: 'public' }

    assert.equal(checkIsAllPrivate(prideVis, dayVis), false)

    // Пользователь переключает текущий слот в private и жмет «Применить ко всем»
    const currentSlotVis: VisibilityLevel = 'private'
    prideVis = { ...prideVis, ...generateBatchPrivacy(currentSlotVis) }
    dayVis = 'private'

    assert.equal(checkIsAllPrivate(prideVis, dayVis), true)
    assert.equal(prideVis[0], 'private')
    assert.equal(prideVis[4], 'private')
  })

  await t.test('сериализация visibilities: buildPayload сжимает пустые записи и сохраняет приватность заполненных', () => {
    const prides = ['Бег 10 км', 'Книга', '']
    const prideVis: Record<number, VisibilityLevel> = { 0: 'private', 1: 'public', 2: 'private' }

    const compactedVis: Record<number, VisibilityLevel> = {}
    let visIdx = 0
    prides.forEach((p, origIdx) => {
      if (p.trim().length === 0) return
      compactedVis[visIdx] = normalizeVisibility(prideVis[origIdx] ?? 'public')
      visIdx++
    })

    assert.equal(Object.keys(compactedVis).length, 2)
    assert.equal(compactedVis[0], 'private')
    assert.equal(compactedVis[1], 'public')
  })
})
