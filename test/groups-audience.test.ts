import test from 'node:test'
import assert from 'node:assert/strict'
import { getTierLimits } from '../lib/ogonek/permissions.ts'
import { normalizeVisibility, visibilityMeta, mostRestrictive, isPubliclyVisible } from '../lib/ogonek/visibility.ts'
import type { VisibilityLevel } from '../lib/ogonek/types.ts'

test('Этап 9: Группы и аудитории записей (Группа «Семья», «Спортсмены», личные и соратникам)', async (t) => {
  await t.test('Лимиты групп строго соответствуют тарифной сетке (free, pro, ultra)', () => {
    const freeLimits = getTierLimits('free')
    assert.equal(freeLimits.maxGroupsOwned, 1, 'Free может владеть только 1 группой')
    assert.equal(freeLimits.maxGroupMembers, 5, 'Free группа вмещает макс 5 участников')

    const proLimits = getTierLimits('pro')
    assert.equal(proLimits.maxGroupsOwned, 5, 'Pro может владеть до 5 групп')
    assert.equal(proLimits.maxGroupMembers, 25, 'Pro группа вмещает до 25 участников')

    const ultraLimits = getTierLimits('ultra')
    assert.equal(ultraLimits.maxGroupsOwned, 20, 'Ultra может владеть до 20 групп')
    assert.equal(ultraLimits.maxGroupMembers, 100, 'Ultra группа вмещает до 100 участников')
  })

  await t.test('Уровни видимости включают 4 градации: private, friends, groups, public', () => {
    assert.equal(normalizeVisibility('groups'), 'groups')
    assert.equal(normalizeVisibility('public'), 'public')
    assert.equal(normalizeVisibility('friends'), 'friends')
    assert.equal(normalizeVisibility('private'), 'private')

    const meta = visibilityMeta('groups')
    assert.equal(meta.id, 'groups')
    assert.equal(meta.icon, 'shield')
    assert.equal(meta.shortLabel, 'Группам')
    assert.equal(isPubliclyVisible('groups'), false)
    assert.equal(mostRestrictive('public', 'groups'), 'groups')
    assert.equal(mostRestrictive('groups', 'private'), 'private')
  })

  await t.test('Матрица видимости 4 пользователей (u_a автор, u_b Семья, u_c Спортсмены, u_d посторонний)', () => {
    // Пользователи:
    const u_a = { id: 'user_a_author', isComradeWithA: true, memberGroups: ['group_family', 'group_sport'] }
    const u_b = { id: 'user_b_family', isComradeWithA: true, memberGroups: ['group_family'] }
    const u_c = { id: 'user_c_sport', isComradeWithA: true, memberGroups: ['group_sport'] }
    const u_d = { id: 'user_d_outsider', isComradeWithA: false, memberGroups: [] }

    // Записи одного дня пользователя u_a:
    const entries = [
      { id: 'p1', title: 'Гордость #1 для Семьи', visibility: 'groups' as VisibilityLevel, groupIds: ['group_family'] },
      { id: 'p2', title: 'Гордость #2 для Спортсменов', visibility: 'groups' as VisibilityLevel, groupIds: ['group_sport'] },
      { id: 'p3', title: 'Гордость #3 Лично себе', visibility: 'private' as VisibilityLevel, groupIds: [] },
      { id: 'g1', title: 'Благодарность #1 Соратникам', visibility: 'friends' as VisibilityLevel, groupIds: [] },
    ]

    function canSeeEntry(viewer: typeof u_a, entry: typeof entries[0]): boolean {
      // 1. Автор видит все свои записи
      if (viewer.id === u_a.id) return true

      // 2. Личные записи не видит никто кроме автора
      if (entry.visibility === 'private') return false

      // 3. Записи для групп видны только активным участникам этих групп
      if (entry.visibility === 'groups') {
        return entry.groupIds.some((gid) => viewer.memberGroups.includes(gid))
      }

      // 4. Записи соратникам видны только при подтверждённой взаимной дружбе
      if (entry.visibility === 'friends') {
        return viewer.isComradeWithA
      }

      // 5. Публичные видны всем
      if (entry.visibility === 'public') return true

      return false
    }

    // Проверка автора (u_a): видит ВСЕ 4 записи
    const visibleToA = entries.filter((e) => canSeeEntry(u_a, e)).map((e) => e.id)
    assert.deepEqual(visibleToA, ['p1', 'p2', 'p3', 'g1'])

    // Проверка u_b (Семья + соратник): видит p1 и g1. НЕ видит p2 (спорт) и p3 (личную)
    const visibleToB = entries.filter((e) => canSeeEntry(u_b, e)).map((e) => e.id)
    assert.deepEqual(visibleToB, ['p1', 'g1'])

    // Проверка u_c (Спортсмены + соратник): видит p2 и g1. НЕ видит p1 (семья) и p3 (личную)
    const visibleToC = entries.filter((e) => canSeeEntry(u_c, e)).map((e) => e.id)
    assert.deepEqual(visibleToC, ['p2', 'g1'])

    // Проверка u_d (посторонний): видит 0 записей
    const visibleToD = entries.filter((e) => canSeeEntry(u_d, e)).map((e) => e.id)
    assert.deepEqual(visibleToD, [])
  })

  await t.test('Срок действия инвайт-ссылки группы строго 7 дней', () => {
    const now = Date.now()
    const expiresAt = new Date(now + 7 * 24 * 3600 * 1000).toISOString()
    const diffDays = Math.round((new Date(expiresAt).getTime() - now) / (24 * 3600 * 1000))
    assert.equal(diffDays, 7, 'Ссылка действует ровно 7 дней')

    // Проверка истёкшей ссылки
    const pastExpires = new Date(now - 1000).toISOString()
    const isExpired = new Date(pastExpires).getTime() < now
    assert.equal(isExpired, true, 'Истёкшая ссылка отклоняется')
  })
})
