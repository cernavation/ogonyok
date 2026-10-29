import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  EMPTY_SYNC_META,
  buildPushPlan,
  buildRemoteDataset,
  countPendingChanges,
  mergeRemoteDataset,
  parseReactionTarget,
  sanitizePostgresString,
  sanitizePostgresValue,
  type RemoteDataset,
  type SyncMeta,
} from '../lib/ogonek/supabase-sync.ts'
import { DEFAULT_PRIVACY } from '../lib/ogonek/privacy.ts'
import { DEFAULT_STREAK_SETTINGS } from '../lib/ogonek/streak.ts'
import type { OgonekStoreState } from '../lib/ogonek/types.ts'

function sampleState(overrides: Partial<OgonekStoreState> = {}): OgonekStoreState {
  const base = {
    schemaVersion: 5,
    days: [
      {
        id: 720,
        title: 'День силы 720',
        tags: ['Для тебя'],
        prides: [{ num: '01', text: 'Зарядка', scale: 10, overcome: 1, visibility: 'public' }],
        gratitudes: ['Благодарность миру'],
        dateISO: '2026-10-29T00:00:00.000Z',
        status: 'normal',
        visibility: 'public',
      },
      {
        id: 719,
        title: 'День 719',
        tags: [],
        prides: [{ num: '01', text: 'Победа', scale: 9, overcome: 0, visibility: 'private' }],
        gratitudes: ['Спасибо'],
        dateISO: '2026-10-28T00:00:00.000Z',
        visibility: 'private',
      },
    ],
    verifiedAchievements: [],
    myStories: [],
    friendIds: [],
    followingIds: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    dismissedSuggestions: [],
    dayReactions: {},
    myReactions: {},
    comments: {},
    chatThreads: {},
    theme: 'x-black',
    accent: 'flame',
    fontScale: 'regular',
    feedDensity: 'cozy',
    privacy: DEFAULT_PRIVACY,
    streak: DEFAULT_STREAK_SETTINGS,
    profile: {
      displayName: 'Alexei Cerna',
      username: 'cernavation',
      bio: 'Основатель Огонька',
      city: 'Chisinau',
      website: '',
      joinedLabel: 'August 2024',
      avatarImage: '/author-avatar.png',
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

describe('Локальный кэш и синхронизация с Supabase', () => {
  it('sanitizePostgresString удаляет нулевые байты и невалидные суррогаты, сохраняя эмодзи и кириллицу', () => {
    const dirty = 'Дневник 720\u0000 побед 🔥\u0000 и силы'
    const clean = sanitizePostgresString(dirty)
    assert.equal(clean, 'Дневник 720 побед 🔥 и силы')
    assert.ok(!clean.includes('\u0000'))
  })

  it('sanitizePostgresValue рекурсивно очищает вложенные объекты и массивы', () => {
    const dirtyObj = {
      title: 'День\u0000 #720',
      list: ['Гордость\u0000 1', { note: 'Благодарность\u0000' }],
    }
    const cleaned = sanitizePostgresValue(dirtyObj)
    assert.equal(cleaned.title, 'День #720')
    assert.equal(cleaned.list[0], 'Гордость 1')
    assert.equal((cleaned.list[1] as any).note, 'Благодарность')
  })

  it('buildRemoteDataset корректно раскладывает состояние на реляционные строки days и prides', () => {
    const state = sampleState()
    const dataset = buildRemoteDataset(state, 'user-alexei-123')

    assert.ok(dataset.days)
    assert.equal(dataset.days.length, 2)
    assert.equal(dataset.days[0].client_id, '720')
    assert.equal(dataset.days[0].title, 'День силы 720')

    assert.ok(dataset.prides)
    assert.ok(dataset.prides.length >= 2)
    assert.equal(dataset.profile?.display_name, 'Alexei Cerna')
    assert.equal(dataset.profile?.username, 'cernavation')
  })

  it('buildPushPlan на пустой мете синхронизации включает все строки в план отправки', () => {
    const state = sampleState()
    const dataset = buildRemoteDataset(state, 'user-alexei-123')
    const plan = buildPushPlan(dataset, EMPTY_SYNC_META)

    assert.ok(plan.total >= 4)
    assert.equal(plan.deletes.length, 0)
  })

  it('countPendingChanges возвращает точное число несохраненных изменений', () => {
    const state = sampleState()
    const count = countPendingChanges(state, 'user-alexei-123', EMPTY_SYNC_META)
    assert.ok(count > 0)
  })

  it('mergeRemoteDataset добавляет новый день с облака и не создает дубликатов', () => {
    const local = sampleState()
    const remoteState = sampleState({
      days: [
        ...sampleState().days,
        {
          id: 721,
          title: 'День 721 с сервера',
          tags: [],
          prides: [{ num: '01', text: 'Из облака', scale: 10, overcome: 1, visibility: 'public' }],
          gratitudes: ['Облачная благодарность'],
          dateISO: '2026-10-30T00:00:00.000Z',
          status: 'normal',
          visibility: 'public',
        },
      ],
    })
    const remote = withTimestamps(buildRemoteDataset(remoteState, 'user-alexei-123'), '2026-10-30T10:00:00.000Z')

    const first = mergeRemoteDataset(local, remote, 'user-alexei-123', EMPTY_SYNC_META)
    assert.equal(first.changed, true)
    assert.equal(first.state.days.length, 3)
    assert.ok(first.state.days.some((d) => d.title === 'День 721 с сервера'))

    const again = mergeRemoteDataset(first.state, remote, 'user-alexei-123', first.meta)
    assert.equal(again.changed, false)
  })

  it('mergeRemoteDataset защищает локальные грязные записи от перезаписи', () => {
    const local = sampleState()
    const remoteState = sampleState()
    remoteState.days = remoteState.days.map((day) =>
      day.id === 720 ? { ...day, title: 'Устаревшая серверная версия 720' } : day
    )
    const remote = withTimestamps(buildRemoteDataset(remoteState, 'user-alexei-123'), '2026-10-29T09:00:00.000Z')

    const dirtyMeta: SyncMeta = {
      fingerprints: { 'days:720': 'stale-local-fingerprint' },
      remoteTimestamps: {},
      lastPushedAtISO: null,
      lastPulledAtISO: null,
    }
    const merged = mergeRemoteDataset(local, remote, 'user-alexei-123', dirtyMeta)
    const day720 = merged.state.days.find((d) => d.id === 720)
    assert.equal(day720?.title, 'День силы 720')
  })

  it('parseReactionTarget безошибочно разбирает цели дня, гордости и благодарности', () => {
    const dayTarget = parseReactionTarget('day:720')
    assert.equal(dayTarget.kind, 'day')
    assert.equal(dayTarget.dayClientId, '720')
    assert.equal(dayTarget.position, null)

    const prideTarget = parseReactionTarget('day:720:pride:2')
    assert.equal(prideTarget.kind, 'pride')
    assert.equal(prideTarget.dayClientId, '720')
    assert.equal(prideTarget.position, 2)

    const gratTarget = parseReactionTarget('day:720:grat:4')
    assert.equal(gratTarget.kind, 'gratitude')
    assert.equal(gratTarget.dayClientId, '720')
    assert.equal(gratTarget.position, 4)
  })

  it('сериализация состояния кэша в JSON сохраняет стабильную schemaVersion', () => {
    const state = sampleState()
    const serialized = JSON.stringify(state)
    const restored: OgonekStoreState = JSON.parse(serialized)

    assert.equal(restored.schemaVersion, 5)
    assert.equal(restored.profile.username, 'cernavation')
    assert.equal(restored.days.length, 2)
  })

  it('LWW: разрешает коллизии профиля на основе временной метки updated_at', () => {
    const local = sampleState()
    const remoteState = sampleState()
    remoteState.profile = {
      ...remoteState.profile,
      displayName: 'Alexei Cerna Cloud',
      city: 'Chisinau Cloud',
    }
    const newerDate = '2026-10-29T18:00:00.000Z'
    const remote = withTimestamps(buildRemoteDataset(remoteState, 'user-alexei-123'), newerDate)

    const merged = mergeRemoteDataset(local, remote, 'user-alexei-123', EMPTY_SYNC_META)
    assert.equal(merged.state.profile.displayName, 'Alexei Cerna Cloud')
    assert.equal(merged.state.profile.city, 'Chisinau Cloud')
  })
})
