import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PRIVACY } from '../lib/ogonek/privacy.ts'
import { DEFAULT_STREAK_SETTINGS } from '../lib/ogonek/streak.ts'
import {
  EMPTY_SYNC_META,
  buildPushPlan,
  buildRemoteDataset,
  countPendingChanges,
  isAutoSyncDisabledByEnv,
  mergeRemoteDataset,
  parseReactionTarget,
  readEnvAutoSyncIntervalMs,
  sanitizePostgresString,
  sanitizePostgresValue,
  type RemoteDataset,
  type SyncMeta,
} from '../lib/ogonek/supabase-sync.ts'
import { computeChecksum } from '../lib/ogonek/sync-code.ts'
import type { OgonekStoreState } from '../lib/ogonek/types.ts'

/** Минимальная, но структурно полная база для проверки диффа и слияния */
function sampleState(overrides: Partial<OgonekStoreState> = {}): OgonekStoreState {
  const base = {
    schemaVersion: 5,
    days: [
      {
        id: 2,
        title: 'День 2',
        tags: ['Для тебя'],
        prides: [{ num: '01', text: 'Зарядка', scale: 8, overcome: 1, visibility: 'public' }],
        gratitudes: ['Спасибо'],
        dateISO: '2026-10-12T00:00:00.000Z',
        status: 'normal',
        visibility: 'public',
      },
      {
        id: 1,
        title: 'День 1',
        tags: [],
        prides: [],
        gratitudes: [],
        dateISO: '2026-10-11T00:00:00.000Z',
      },
    ],
    verifiedAchievements: [
      {
        id: 'va-1',
        categoryId: 'discipline',
        title: 'Дисциплина',
        topic: 'Держу серию',
        achievedAtISO: '2026-10-01T00:00:00.000Z',
        status: 'draft',
        regulation: null,
        evidence: [],
        submittedAtISO: null,
        verifiedAtISO: null,
        reviewerNote: null,
        submission: null,
        createdAtISO: '2026-10-01T00:00:00.000Z',
      },
    ],
    myStories: [
      {
        id: 'st-1',
        createdAtISO: '2026-10-12T10:00:00.000Z',
        emoji: '✨',
        kicker: 'СТОРИС',
        headline: 'Победа',
        detail: '',
        from: '#12060a',
        to: '#7a2f0c',
        accent: '#ffa600',
        visibility: 'public',
      },
    ],
    friendIds: ['fr-1'],
    followingIds: ['fr-1', 'fr-2'],
    incomingFriendRequests: ['fr-3'],
    outgoingFriendRequests: ['fr-4'],
    dismissedSuggestions: ['fr-5'],
    dayReactions: { 'day:2': { flame: 3 } },
    myReactions: { 'day:2': ['flame'] },
    comments: {
      'day:2': [
        {
          id: 'c1',
          parentId: null,
          author: 'Alexei Cerna',
          initials: 'AC',
          text: 'Молодец',
          createdAt: '2026-10-12T11:00:00.000Z',
          likes: 1,
          likedByMe: false,
          isMine: true,
          template: null,
          persona: 'me',
        },
      ],
    },
    chatThreads: {
      'fr-1': {
        messages: [
          {
            id: 'm1',
            authorId: 'me',
            text: 'Привет',
            createdAtISO: '2026-10-12T12:00:00.000Z',
            attachment: null,
            reactions: [],
            read: false,
            system: false,
          },
        ],
        readAtISO: null,
        muted: false,
        pinned: false,
        draft: '',
      },
    },
    theme: 'x-black',
    accent: 'flame',
    fontScale: 'regular',
    feedDensity: 'cozy',
    privacy: DEFAULT_PRIVACY,
    streak: DEFAULT_STREAK_SETTINGS,
    profile: {
      displayName: 'Алексей Черна',
      username: 'cernavation',
      bio: '',
      city: 'Moldova',
      website: '',
      joinedLabel: 'August 2024',
      avatarImage: null,
      avatarColor: '#000000',
      bannerImage: null,
      bannerPreset: 'night-peaks',
      socialLinks: [],
      monthlyGoal: '',
      monthlyGoalUpdatedAtISO: '2026-10-01T00:00:00.000Z',
      verified: true,
    },
  }
  return { ...base, ...overrides } as unknown as OgonekStoreState
}

/** Проставляет client_updated_at всем строкам снимка (как это делает сервер) */
function withTimestamps(dataset: RemoteDataset, ts: string): RemoteDataset {
  const stamp = <T extends { client_updated_at?: string | null }>(rows: T[]): T[] =>
    rows.map((row) => ({ ...row, client_updated_at: ts }))
  return {
    profile: dataset.profile ? { ...dataset.profile, client_updated_at: ts } : null,
    days: stamp(dataset.days),
    prides: stamp(dataset.prides),
    gratitudes: stamp(dataset.gratitudes),
    achievements: stamp(dataset.achievements),
    stories: stamp(dataset.stories),
    friendships: stamp(dataset.friendships),
    reactions: stamp(dataset.reactions),
    comments: stamp(dataset.comments),
    messages: stamp(dataset.messages),
  }
}

describe('Supabase: разбор целей реакций (ЭТАП 19)', () => {
  it('понимает день, гордость и благодарность', () => {
    assert.deepEqual(parseReactionTarget('day:12'), { kind: 'day', dayClientId: '12', position: null })
    assert.deepEqual(parseReactionTarget('day:12:pride:0'), {
      kind: 'pride',
      dayClientId: '12',
      position: 0,
    })
    assert.deepEqual(parseReactionTarget('day:12:grat:2'), {
      kind: 'gratitude',
      dayClientId: '12',
      position: 2,
    })
  })
})

describe('Supabase: сборка снимка и план отправки (ЭТАП 19)', () => {
  it('разворачивает локальное состояние в строки таблиц', () => {
    const dataset = buildRemoteDataset(sampleState(), 'user-1')
    assert.equal(dataset.profile?.id, 'user-1')
    assert.equal(dataset.days.length, 2)
    assert.equal(dataset.prides.length, 1)
    assert.equal(dataset.gratitudes.length, 1)
    assert.equal(dataset.achievements.length, 1)
    assert.equal(dataset.stories.length, 1)
    // fr-1 (друг), fr-2 (подписка), fr-3/fr-4 (заявки), fr-5 (скрыт)
    assert.equal(dataset.friendships.length, 5)
    assert.equal(dataset.reactions.length, 1)
    assert.equal(dataset.comments.length, 1)
    assert.equal(dataset.messages.length, 1)
  })

  it('на пустой мете отправляет все строки, а после отправки — ничего', () => {
    const state = sampleState()
    const dataset = buildRemoteDataset(state, 'user-1')
    const plan = buildPushPlan(dataset, EMPTY_SYNC_META)
    assert.equal(plan.total, 15)
    assert.equal(plan.deletes.length, 0)
    assert.equal(countPendingChanges(state, 'user-1', EMPTY_SYNC_META), 15)

    // Имитируем успешный пуш: фиксируем настоящие отпечатки всех строк
    const meta: SyncMeta = {
      fingerprints: fingerprintsOf(dataset),
      remoteTimestamps: {},
      lastPushedAtISO: '2026-10-12T00:00:00.000Z',
      lastPulledAtISO: null,
    }
    assert.equal(buildPushPlan(dataset, meta).total, 0)
  })

  it('считает удалённую строку как операцию DELETE', () => {
    const dataset = buildRemoteDataset(sampleState(), 'user-1')
    const meta: SyncMeta = {
      fingerprints: { 'days:99': 'stale' },
      remoteTimestamps: {},
      lastPushedAtISO: null,
      lastPulledAtISO: null,
    }
    const plan = buildPushPlan({ ...dataset, days: [], prides: [], gratitudes: [] }, meta)
    assert.ok(plan.deletes.some((op) => op.table === 'days' && op.clientId === '99'))
  })
})

describe('Supabase: слияние серверных данных (ЭТАП 19)', () => {
  it('добавляет день с другого устройства и не повторяет это дважды', () => {
    const local = sampleState()
    const remoteState = sampleState({
      days: [
        ...sampleState().days,
        {
          id: 3,
          title: 'День с сервера',
          tags: [],
          prides: [{ num: '01', text: 'Из облака', scale: 9, overcome: 2, visibility: 'public' }],
          gratitudes: [],
          dateISO: '2026-10-13T00:00:00.000Z',
          status: 'normal',
          visibility: 'public',
        },
      ],
    })
    const remote = withTimestamps(buildRemoteDataset(remoteState, 'user-1'), '2026-10-13T09:00:00.000Z')

    const first = mergeRemoteDataset(local, remote, 'user-1', EMPTY_SYNC_META)
    assert.equal(first.changed, true)
    assert.equal(first.state.days.length, 3)
    assert.ok(first.state.days.some((d) => d.title === 'День с сервера'))

    const again = mergeRemoteDataset(first.state, remote, 'user-1', first.meta)
    assert.equal(again.changed, false)
  })

  it('не перезатирает локально изменённую (грязную) строку', () => {
    const local = sampleState()
    const remoteState = sampleState()
    remoteState.days = remoteState.days.map((day) =>
      day.id === 1 ? { ...day, title: 'С сервера' } : day
    )
    const remote = withTimestamps(buildRemoteDataset(remoteState, 'user-1'), '2026-10-13T09:00:00.000Z')

    const dirtyMeta: SyncMeta = {
      fingerprints: { 'days:1': 'stale-local-fingerprint' },
      remoteTimestamps: {},
      lastPushedAtISO: null,
      lastPulledAtISO: null,
    }
    const merged = mergeRemoteDataset(local, remote, 'user-1', dirtyMeta)
    const day1 = merged.state.days.find((d) => d.id === 1)
    assert.equal(day1?.title, 'День 1')

    // А незатронутый день всё равно принял серверную версию
    const day2 = merged.state.days.find((d) => d.id === 2)
    assert.equal(day2?.title, 'День 2')
  })
})

describe('Supabase: настройки автосинхронизации из окружения (ЭТАП 19)', () => {
  it('читает интервал и флаг отключения из .env', () => {
    const prevMs = process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC_MS
    const prevFlag = process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC
    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC_MS
      assert.equal(readEnvAutoSyncIntervalMs(), null)

      process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC_MS = '30000'
      assert.equal(readEnvAutoSyncIntervalMs(), 30000)

      process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC_MS = 'abc'
      assert.equal(readEnvAutoSyncIntervalMs(), null)

      process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC_MS = '1000'
      assert.equal(readEnvAutoSyncIntervalMs(), null, 'слишком частый интервал отбрасывается')

      delete process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC
      assert.equal(isAutoSyncDisabledByEnv(), false)

      process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC = 'false'
      assert.equal(isAutoSyncDisabledByEnv(), true)

      process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC = 'on'
      assert.equal(isAutoSyncDisabledByEnv(), false)
    } finally {
      if (prevMs === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC_MS
      else process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC_MS = prevMs
      if (prevFlag === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC
      else process.env.NEXT_PUBLIC_SUPABASE_AUTO_SYNC = prevFlag
    }
  })

  it('sanitizePostgresString: удаляет нулевые байты, невалидные суррогаты и триммит', () => {
    // 1. Нулевые байты \u0000
    assert.equal(sanitizePostgresString('Привет\u0000 Мир\u0000!'), 'Привет Мир!')
    assert.equal(sanitizePostgresString('Тест \\u0000 экранированного нуля'), 'Тест  экранированного нуля')
    assert.equal(sanitizePostgresString('\u0000\u0000\u0000'), '')

    // 2. Одиночные суррогаты (высокие без пары и низкие без пары)
    const lonelyHigh = 'High: ' + String.fromCharCode(0xd83d) + ' end'
    const lonelyLow = 'Low: ' + String.fromCharCode(0xdd25) + ' end'
    assert.equal(sanitizePostgresString(lonelyHigh), 'High:  end')
    assert.equal(sanitizePostgresString(lonelyLow), 'Low:  end')

    // 3. Валидные суррогатные пары (эмодзи) не повреждаются
    const emojis = '🔥 День победы ❤️ 10/10 ✨'
    assert.equal(sanitizePostgresString(emojis), '🔥 День победы ❤️ 10/10 ✨')

    // 4. Комбинированный случай (грязный исторический текст)
    const dirty = '  \u0000Горжусь тем что\u0000 ' + String.fromCharCode(0xd83d) + ' победил лень\u0000   '
    assert.equal(sanitizePostgresString(dirty), 'Горжусь тем что  победил лень')

    // 5. Некорректные типы входных данных
    assert.equal(sanitizePostgresString(null as any), '')
    assert.equal(sanitizePostgresString(undefined as any), '')
    assert.equal(sanitizePostgresString(123 as any), '')
    assert.equal(sanitizePostgresString({} as any), '')
  })

  it('sanitizePostgresValue: рекурсивно очищает структуры данных', () => {
    const dirtyObj = {
      title: 'День\u0000 #1',
      tags: ['#спорт\u0000', ' #учёба '],
      count: 42,
      active: true,
      nested: {
        raw: 'Текст\u0000 ' + String.fromCharCode(0xd800) + 'чистый',
        list: ['\u0000A\u0000', 'B'],
      },
    }

    const cleaned = sanitizePostgresValue(dirtyObj)
    assert.equal(cleaned.title, 'День #1')
    assert.deepEqual(cleaned.tags, ['#спорт', '#учёба'])
    assert.equal(cleaned.count, 42)
    assert.equal(cleaned.active, true)
    assert.equal(cleaned.nested.raw, 'Текст чистый')
    assert.deepEqual(cleaned.nested.list, ['A', 'B'])
  })

  it('buildRemoteDataset: автоматически санитизирует все строковые поля модели', () => {
    const dirtyState = sampleState()
    dirtyState.days[0].title = 'День\u0000 2'
    dirtyState.days[0].prides[0].text = 'Зарядка\u0000 ' + String.fromCharCode(0xd800)
    dirtyState.profile.displayName = 'Alex\u0000 Cerna'

    const dataset = buildRemoteDataset(dirtyState, 'usr-1')
    assert.equal(dataset.days[0].title, 'День 2')
    assert.equal(dataset.prides[0].text, 'Зарядка')
    assert.equal(dataset.profile?.display_name, 'Alex Cerna')
  })
})

/** Считает отпечатки всех строк снимка тем же хэшем, что и адаптер */
function fingerprintsOf(dataset: RemoteDataset): Record<string, string> {
  const entries: Record<string, { client_id: string }[]> = {
    profiles: dataset.profile ? [dataset.profile] : [],
    days: dataset.days,
    prides: dataset.prides,
    gratitudes: dataset.gratitudes,
    achievements_verifications: dataset.achievements,
    stories: dataset.stories,
    friendships: dataset.friendships,
    reactions: dataset.reactions,
    comments: dataset.comments,
    direct_messages: dataset.messages,
  }
  const result: Record<string, string> = {}
  for (const [table, rows] of Object.entries(entries)) {
    for (const row of rows) {
      result[`${table}:${row.client_id}`] = computeChecksum(JSON.stringify(row))
    }
  }
  return result
}
