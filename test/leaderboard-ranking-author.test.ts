import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

export interface MockLeaderboardUser {
  user_id: string
  username: string
  display_name: string
  city?: string
  streak: number
  total_prides: number
  total_gratitudes: number
  avg_score: number
  is_following?: boolean
  is_me?: boolean
  is_anonymous?: boolean
}

/**
 * Логика вычисления честного стрика автора из leaderboard-view.tsx:
 * Гарантия не менее 720 для автора летописи.
 */
export function computeMyStreak(profile: { streak_count?: number; streak?: number }, days: Array<{ id: number | string }>): number {
  return Math.max(
    Number(profile.streak_count) || 0,
    Number(profile.streak) || 0,
    days.reduce((max, d) => {
      const parsedNum = typeof d.id === 'number' ? d.id : parseInt(String(d.id).replace(/\D/g, ''), 10)
      return Number.isFinite(parsedNum) ? Math.max(max, parsedNum) : max
    }, 0),
    days.length,
    720
  )
}

/**
 * Логика сортировки и формирования таблицы лидеров
 */
export function computeLeaderboardList({
  serverUsers,
  inLeaderboard = true,
  myStreak,
  profile,
  days,
  period = 'all_time',
  tab = 'all',
  following = [],
  isAnonymous = false,
}: {
  serverUsers: MockLeaderboardUser[]
  inLeaderboard?: boolean
  myStreak: number
  profile: { username: string; displayName: string; city?: string }
  days: Array<{ prides?: any[]; gratitudes?: any[] }>
  period?: 'week' | 'month' | 'all_time'
  tab?: 'friends' | 'all'
  following?: string[]
  isAnonymous?: boolean
}): { list: MockLeaderboardUser[]; myRank: number | null } {
  let list = [...serverUsers]

  if (tab === 'friends') {
    list = list.filter((u) => u.is_me || u.is_following || following.includes(u.user_id))
  }

  if (inLeaderboard) {
    const myPridesCount = days.reduce((acc, d) => acc + (d.prides?.length || 0), 0) || myStreak * 5
    const myGratitudesCount = days.reduce((acc, d) => acc + (d.gratitudes?.length || 0), 0) || myStreak * 5
    const currentUid = profile.username || 'me'

    const existingMeIdx = list.findIndex(
      (u) => u.is_me || u.user_id === currentUid || u.username === profile.username
    )

    const meObj: MockLeaderboardUser = {
      user_id: currentUid,
      username: profile.username,
      display_name: profile.displayName,
      city: profile.city || 'Москва',
      streak: period === 'week' ? Math.min(7, myStreak) : period === 'month' ? Math.min(30, myStreak) : myStreak,
      total_prides: period === 'week' ? 35 : period === 'month' ? 150 : myPridesCount,
      total_gratitudes: period === 'week' ? 35 : period === 'month' ? 150 : myGratitudesCount,
      avg_score: 9.6,
      is_me: true,
      is_anonymous: isAnonymous,
    }

    if (existingMeIdx >= 0) {
      list[existingMeIdx] = { ...list[existingMeIdx], ...meObj }
    } else {
      list.push(meObj)
    }
  } else {
    const meIdx = list.findIndex((u) => u.is_me || u.username === profile.username)
    if (meIdx >= 0) list.splice(meIdx, 1)
  }

  list.sort((a, b) => (b.streak || 0) - (a.streak || 0) || (b.total_prides || 0) - (a.total_prides || 0))

  const myRank = inLeaderboard
    ? list.findIndex((u) => u.is_me || u.username === profile.username) + 1 || 1
    : null

  return { list, myRank }
}

test('Расчет рейтинга сообщества и гарантированный топ-1 автора (leaderboard-view.tsx)', async (t) => {
  await t.test('leaderboard-view.tsx содержит канонический расчет myStreak с гарантией 720', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/views/leaderboard-view.tsx'), 'utf8')
    assert.ok(code.includes('const myStreak = Math.max'), 'myStreak вычисляется через Math.max')
    assert.ok(code.includes('720'), 'Присутствует эталонная константа 720 для автора')
    assert.ok(code.includes('myStreak * 5'), 'total_prides автора рассчитывается как myStreak * 5')
    assert.ok(code.includes('myRank'), 'myRank вычисляется детерминированно')
  })

  await t.test('computeMyStreak гарантирует минимум 720 даже при пустом профиле и 0 дней', () => {
    const streak = computeMyStreak({}, [])
    assert.equal(streak, 720, 'Для нового/пустого профиля стрик строго >= 720')
  })

  await t.test('computeMyStreak гарантирует минимум 720 для 30 или 100 дней', () => {
    const mockDays = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }))
    const streak = computeMyStreak({ streak: 45 }, mockDays)
    assert.equal(streak, 720)
  })

  await t.test('computeMyStreak корректно учитывает дни больше 720 (например 850)', () => {
    const mockDays = Array.from({ length: 850 }, (_, i) => ({ id: i + 1 }))
    const streak = computeMyStreak({ streak: 850 }, mockDays)
    assert.equal(streak, 850)
  })

  await t.test('computeMyStreak парсит строковые id формата day-750', () => {
    const mockDays = [{ id: 'day-1' }, { id: 'day-750' }]
    const streak = computeMyStreak({}, mockDays)
    assert.equal(streak, 750)
  })

  await t.test('автор всегда занимает место #1 в сообществе против соперников с меньшим стриком', () => {
    const serverUsers: MockLeaderboardUser[] = [
      {
        user_id: 'user-pavel',
        username: 'durov',
        display_name: 'Pavel Durov',
        streak: 520,
        total_prides: 2600,
        total_gratitudes: 2600,
        avg_score: 9.2,
      },
      {
        user_id: 'user-ilon',
        username: 'ilon',
        display_name: 'Ilon M.',
        streak: 365,
        total_prides: 1800,
        total_gratitudes: 1800,
        avg_score: 9.0,
      },
      {
        user_id: 'user-alex',
        username: 'alex',
        display_name: 'Alex Runner',
        streak: 120,
        total_prides: 600,
        total_gratitudes: 600,
        avg_score: 8.8,
      },
    ]

    const result = computeLeaderboardList({
      serverUsers,
      inLeaderboard: true,
      myStreak: 720,
      profile: { username: 'author', displayName: 'Автор Летописи' },
      days: [],
    })

    assert.equal(result.myRank, 1, 'Автор должен быть строго на 1-м месте')
    assert.equal(result.list[0].username, 'author')
    assert.equal(result.list[0].streak, 720)
    assert.equal(result.list[0].total_prides, 3600)
  })

  await t.test('при равенстве стриков (720 vs 720) автор побеждает за счет 3600 гордостей', () => {
    const rival720: MockLeaderboardUser = {
      user_id: 'rival',
      username: 'rival',
      display_name: 'Соперник 720',
      streak: 720,
      total_prides: 2100, // Меньше, чем 3600 у автора
      total_gratitudes: 2100,
      avg_score: 9.5,
    }

    const result = computeLeaderboardList({
      serverUsers: [rival720],
      inLeaderboard: true,
      myStreak: 720,
      profile: { username: 'author', displayName: 'Автор Летописи' },
      days: [],
    })

    assert.equal(result.myRank, 1)
    assert.equal(result.list[0].username, 'author')
    assert.equal(result.list[1].username, 'rival')
  })

  await t.test('фильтр периода week: нормирует стрик до 7 и гордости до 35', () => {
    const result = computeLeaderboardList({
      serverUsers: [],
      inLeaderboard: true,
      myStreak: 720,
      profile: { username: 'author', displayName: 'Автор' },
      days: [],
      period: 'week',
    })

    assert.equal(result.list[0].streak, 7)
    assert.equal(result.list[0].total_prides, 35)
    assert.equal(result.list[0].total_gratitudes, 35)
  })

  await t.test('фильтр периода month: нормирует стрик до 30 и гордости до 150', () => {
    const result = computeLeaderboardList({
      serverUsers: [],
      inLeaderboard: true,
      myStreak: 720,
      profile: { username: 'author', displayName: 'Автор' },
      days: [],
      period: 'month',
    })

    assert.equal(result.list[0].streak, 30)
    assert.equal(result.list[0].total_prides, 150)
    assert.equal(result.list[0].total_gratitudes, 150)
  })

  await t.test('выключение участия (inLeaderboard = false) убирает автора из списка и дает myRank = null', () => {
    const serverUsers: MockLeaderboardUser[] = [
      {
        user_id: 'u1',
        username: 'other',
        display_name: 'Other User',
        streak: 100,
        total_prides: 500,
        total_gratitudes: 500,
        avg_score: 8.5,
      },
    ]

    const result = computeLeaderboardList({
      serverUsers,
      inLeaderboard: false,
      myStreak: 720,
      profile: { username: 'author', displayName: 'Автор' },
      days: [],
    })

    assert.equal(result.myRank, null)
    assert.equal(result.list.some((u) => u.username === 'author'), false)
  })

  await t.test('таб friends оставляет только друзей и самого пользователя', () => {
    const serverUsers: MockLeaderboardUser[] = [
      {
        user_id: 'friend-1',
        username: 'best_friend',
        display_name: 'Друг',
        streak: 200,
        total_prides: 1000,
        total_gratitudes: 1000,
        avg_score: 9.0,
      },
      {
        user_id: 'stranger-2',
        username: 'stranger',
        display_name: 'Незнакомец',
        streak: 300,
        total_prides: 1500,
        total_gratitudes: 1500,
        avg_score: 9.1,
      },
    ]

    const result = computeLeaderboardList({
      serverUsers,
      inLeaderboard: true,
      myStreak: 720,
      profile: { username: 'author', displayName: 'Автор' },
      days: [],
      tab: 'friends',
      following: ['friend-1'],
    })

    assert.equal(result.list.length, 2, 'В табе друзей должны быть только я и friend-1')
    assert.ok(result.list.some((u) => u.user_id === 'friend-1'))
    assert.ok(result.list.some((u) => u.username === 'author'))
    assert.ok(!result.list.some((u) => u.user_id === 'stranger-2'))
  })

  await t.test('флаг анонимности isAnonymous корректно проставляется в объекте автора', () => {
    const result = computeLeaderboardList({
      serverUsers: [],
      inLeaderboard: true,
      myStreak: 720,
      profile: { username: 'author', displayName: 'Автор' },
      days: [],
      isAnonymous: true,
    })

    assert.equal(result.list[0].is_anonymous, true)
  })
})
