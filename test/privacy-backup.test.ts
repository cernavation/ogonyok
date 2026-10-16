import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PRIVACY,
  buildPrivacySummary,
  evaluatePrivacyScore,
  normalizeAudience,
  normalizeProfileVisibility,
  sanitizePrivacySettings,
} from '../lib/ogonek/privacy.ts'
import {
  DEFAULT_STREAK_SETTINGS,
  computeStreak,
  formatDeadlineLabel,
  getDeadlineInTz,
  minutesToTimeValue,
  sanitizeStreakSettings,
  timeValueToMinutes,
} from '../lib/ogonek/streak.ts'
import {
  SYNC_CODE_PREFIX,
  buildPortableBackup,
  buildSyncCode,
  computeBackupStats,
  computeChecksum,
  computeDataFingerprint,
  decodeSyncCode,
  formatBytes,
  fromBase64Url,
  isSyncCode,
  parseAnyBackupWith,
  parseSyncCodeWith,
  toBase64Url,
  type ImportResult,
  type StoreValidator,
} from '../lib/ogonek/sync-code.ts'
import type { OgonekStoreState } from '../lib/ogonek/types.ts'

/** Минимальная, но валидная по форме база данных для тестов экспорта */
const SAMPLE_STATE = {
  schemaVersion: 5,
  days: [
    { id: 2, title: 'День 2', tags: [], prides: [{ num: '01', text: 'A', scale: 8, overcome: 1 }], gratitudes: ['Спасибо'] },
    { id: 1, title: 'День 1', tags: [], prides: [], gratitudes: [] },
  ],
  verifiedAchievements: [{ id: 'va-1' }],
  evidenceItems: [{ id: 'ev-1', title: 'Факт' }],
  myStories: [{ id: 'st-1' }],
  chatThreads: { 'fr-1': { messages: [{ id: 'm1' }, { id: 'm2' }] } },
  comments: { 'day:2': [{ id: 'c1' }] },
  dayReactions: { 'day:2': { flame: 3 } },
  profile: { username: 'cernavation' },
  privacy: DEFAULT_PRIVACY,
  streak: DEFAULT_STREAK_SETTINGS,
} as unknown as OgonekStoreState

const fakeValidator: StoreValidator = (rawJson): ImportResult => {
  try {
    const data = JSON.parse(rawJson) as OgonekStoreState
    if (!data || typeof data !== 'object') return { success: false, error: 'нет объекта' }
    return { success: true, data }
  } catch {
    return { success: false, error: 'плохой JSON' }
  }
}

describe('Приватность профиля (ЭТАП 16)', () => {
  it('валидирует корректные уровни приватности', () => {
    assert.equal(normalizeProfileVisibility('private'), 'private')
    assert.equal(normalizeProfileVisibility('public'), 'public')
    assert.equal(normalizeProfileVisibility('weird'), 'public')
    assert.equal(normalizeAudience('friends'), 'friends')
    assert.equal(normalizeAudience('nobody'), 'nobody')
    assert.equal(normalizeAudience(42), 'everyone')
  })

  it('восстанавливает приватность с фолбэками по умолчанию', () => {
    assert.deepEqual(sanitizePrivacySettings(null), DEFAULT_PRIVACY)

    const restored = sanitizePrivacySettings({
      profileVisibility: 'private',
      commentPolicy: 'nobody',
      chatPolicy: 'invalido',
      showStreakPublicly: false,
      hideFromLeaderboards: true,
    })
    assert.equal(restored.profileVisibility, 'private')
    assert.equal(restored.commentPolicy, 'nobody')
    assert.equal(restored.chatPolicy, 'everyone')
    assert.equal(restored.showStreakPublicly, false)
    assert.equal(restored.hideFromLeaderboards, true)
  })

  it('оценивает приватность: закрытый аккаунт приватнее открытого', () => {
    const open = evaluatePrivacyScore({ ...DEFAULT_PRIVACY, profileVisibility: 'public' })
    const closed = evaluatePrivacyScore({
      ...DEFAULT_PRIVACY,
      profileVisibility: 'private',
      commentPolicy: 'nobody',
      chatPolicy: 'nobody',
      showStreakPublicly: false,
      showBadgesPublicly: false,
      searchableByUsername: false,
      hideFromLeaderboards: true,
    })
    assert.ok(closed.percent > open.percent)
    assert.equal(closed.level, 'closed')
    assert.ok(closed.percent <= 100)
  })

  it('строит читаемую сводку приватности', () => {
    const summary = buildPrivacySummary({
      ...DEFAULT_PRIVACY,
      profileVisibility: 'private',
      commentPolicy: 'friends',
      chatPolicy: 'nobody',
    })
    assert.ok(summary.includes('Закрытый'))
    assert.ok(summary.includes('Друзья'))
    assert.ok(summary.includes('Никто'))
  })
})

describe('Ночной дедлайн стрика (ЭТАП 16)', () => {
  it('форматирует и парсит время дедлайна', () => {
    assert.equal(formatDeadlineLabel(23 * 60 + 59), '23:59')
    assert.equal(formatDeadlineLabel(21 * 60), '21:00')
    assert.equal(minutesToTimeValue(90), '01:30')
    assert.equal(timeValueToMinutes('23:30'), 23 * 60 + 30)
    assert.equal(timeValueToMinutes('99:99'), null)
    assert.equal(timeValueToMinutes('abc'), null)
  })

  it('считает момент дедлайна по кастомному времени', () => {
    // 22:00 по Кишинёву (UTC+3 в октябре) = 19:00 UTC
    const deadline = getDeadlineInTz('2026-10-10', 22 * 60, 'Europe/Chisinau')
    assert.equal(deadline.toISOString(), '2026-10-10T19:00:59.999Z')
  })

  it('кастомный дедлайн переносит сгорание стрика на более раннее время', () => {
    const at22 = computeStreak(new Set(['2026-10-06']), new Date('2026-10-10T18:30:00Z'), {
      deadlineMinutes: 22 * 60,
    })
    const at2359 = computeStreak(new Set(['2026-10-06']), new Date('2026-10-10T18:30:00Z'), {
      deadlineMinutes: 23 * 60 + 59,
    })
    // 18:30 UTC = 21:30 Кишинёв: при дедлайне 22:00 ещё живём по grace, при 23:59 тем более
    assert.equal(at22.status, 'grace')
    assert.equal(at2359.status, 'grace')

    const late = computeStreak(new Set(['2026-10-06']), new Date('2026-10-10T19:30:00Z'), {
      deadlineMinutes: 22 * 60,
    })
    // 22:30 Кишинёв уже за дедлайном 22:00 -> burned
    assert.equal(late.status, 'burned')
  })

  it('льгота на выходные добавляет день прощения', () => {
    const withoutBonus = computeStreak(new Set(['2026-10-06']), new Date('2026-10-11T12:00:00Z'))
    const withBonus = computeStreak(new Set(['2026-10-06']), new Date('2026-10-11T12:00:00Z'), {
      weekendBonus: true,
    })
    // К 11-му прошло 5 дней простоя: без бонуса burned, с бонусом (4+1) ещё grace
    assert.equal(withoutBonus.status, 'burned')
    assert.equal(withBonus.status, 'grace')
  })

  it('валидирует настройки дедлайна', () => {
    assert.deepEqual(sanitizeStreakSettings(undefined), DEFAULT_STREAK_SETTINGS)
    const restored = sanitizeStreakSettings({
      deadlineMinutes: 5000,
      timeZone: 'Not/AZone',
      weekendBonus: true,
    })
    assert.equal(restored.deadlineMinutes, 23 * 60 + 59)
    assert.equal(restored.timeZone, DEFAULT_STREAK_SETTINGS.timeZone)
    assert.equal(restored.weekendBonus, true)
  })
})

describe('Полный экспорт / импорт и синхронизация (ЭТАП 16)', () => {
  it('base64url кодирует и декодирует UTF-8 с эмодзи', () => {
    const source = JSON.stringify({ text: 'Огонёк 🔥 дня', n: 720 })
    const encoded = toBase64Url(source)
    assert.ok(!/[+/=]/.test(encoded))
    assert.equal(fromBase64Url(encoded), source)
  })

  it('считает контрольную сумму детерминированно', () => {
    assert.equal(computeChecksum('ogonok'), computeChecksum('ogonok'))
    assert.notEqual(computeChecksum('ogonok'), computeChecksum('ogonok '))
    assert.equal(computeChecksum('ogonok').length, 8)
  })

  it('собирает и разбирает код синхронизации без потерь', () => {
    const code = buildSyncCode(SAMPLE_STATE)
    assert.ok(isSyncCode(code))
    assert.ok(code.startsWith(SYNC_CODE_PREFIX))

    const decoded = decodeSyncCode(code)
    assert.equal(decoded.success, true)
    if (decoded.success) {
      const data = JSON.parse(decoded.rawJson) as OgonekStoreState
      assert.equal(data.days.length, SAMPLE_STATE.days.length)
      assert.equal(data.profile.username, 'cernavation')
      assert.equal(data.privacy.profileVisibility, DEFAULT_PRIVACY.profileVisibility)
      assert.equal(data.streak.deadlineMinutes, DEFAULT_STREAK_SETTINGS.deadlineMinutes)
    }
  })

  it('отклоняет повреждённый код синхронизации', () => {
    const code = buildSyncCode(SAMPLE_STATE)
    const broken = `${code.slice(0, -3)}xyz`
    const parsed = parseSyncCodeWith(broken, fakeValidator)
    assert.equal(parsed.success, false)
  })

  it('отклоняет чужой текст как код синхронизации', () => {
    assert.equal(isSyncCode('hello world'), false)
    assert.equal(parseSyncCodeWith('just some text', fakeValidator).success, false)
  })

  it('универсальный импорт принимает и JSON, и код синхронизации', () => {
    const jsonBackup = buildPortableBackup(SAMPLE_STATE)
    assert.equal(parseAnyBackupWith(jsonBackup, fakeValidator).success, true)
    assert.equal(parseAnyBackupWith(buildSyncCode(SAMPLE_STATE), fakeValidator).success, true)
    assert.equal(parseAnyBackupWith('   ', fakeValidator).success, false)
  })

  it('считает статистику содержимого базы', () => {
    const stats = computeBackupStats(SAMPLE_STATE)
    assert.equal(stats.days, 2)
    assert.equal(stats.prides, 1)
    assert.equal(stats.gratitudes, 1)
    assert.equal(stats.chatMessages, 2)
    assert.equal(stats.comments, 1)
    assert.equal(stats.achievements, 1)
    assert.equal(stats.reactions, 3)
    assert.ok(stats.totalRecords >= stats.days)
  })

  it('отпечаток базы меняется при изменении данных', () => {
    const base = computeDataFingerprint(SAMPLE_STATE)
    const changed = computeDataFingerprint({
      ...SAMPLE_STATE,
      days: [{ ...SAMPLE_STATE.days[0], title: 'Изменённый день' }],
    } as OgonekStoreState)
    assert.notEqual(base, changed)
    assert.equal(base.length, 8)
  })

  it('форматирует байты в человекочитаемый размер', () => {
    assert.equal(formatBytes(0), '0 Б')
    assert.equal(formatBytes(512), '512 Б')
    assert.ok(formatBytes(2048).includes('КБ'))
    assert.ok(formatBytes(3 * 1024 * 1024).includes('МБ'))
  })
})
