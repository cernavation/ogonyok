import test from 'node:test'
import assert from 'node:assert/strict'
import {
  shallowEqual,
  sanitizeStateForStorage,
  scheduleDebouncedSave,
  flushSaveStore,
  type StorageAdapter,
} from '../lib/ogonek/perf-storage.ts'
import {
  enqueueOfflineDay,
  dequeueOfflineDay,
  getOfflineQueue,
  getOfflineQueueCount,
  clearOfflineQueue,
  processOfflineQueue,
} from '../lib/ogonek/offline-queue.ts'
import type { Day, OgonekStoreState } from '../lib/ogonek/types.ts'

test('Этап 16: shallowEqual корректно сравнивает объекты и примитивы', () => {
  assert.equal(shallowEqual(42, 42), true)
  assert.equal(shallowEqual('hello', 'hello'), true)
  assert.equal(shallowEqual(true, true), true)
  assert.equal(shallowEqual(null, null), true)
  assert.equal(shallowEqual(undefined, undefined), true)
  assert.equal(shallowEqual(null, undefined), false)

  const objA = { a: 1, b: 'test', c: true }
  const objB = { a: 1, b: 'test', c: true }
  assert.equal(shallowEqual(objA, objB), true)

  const objC = { a: 1, b: 'different' }
  assert.equal(shallowEqual(objA, objC), false)

  const objD = { a: 1, b: 'test', c: true, extra: 99 }
  assert.equal(shallowEqual(objA, objD), false)
})

test('Этап 16: sanitizeStateForStorage вычищает Base64 из days.photos и черновика', () => {
  const fakeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(5000)
  const validStorageUrl = 'https://supabase.co/storage/v1/object/public/ogonyok-media/photos/123.jpg'
  const validIdbId = 'photo_1740000000_abc'

  const mockState: Partial<OgonekStoreState> = {
    days: [
      {
        id: 1,
        title: 'День 1',
        tags: [],
        prides: [],
        gratitudes: [],
        photos: [fakeBase64, validStorageUrl, validIdbId],
      },
      {
        id: 2,
        title: 'День 2',
        tags: [],
        prides: [],
        gratitudes: [],
        photos: [validStorageUrl],
      },
    ],
    composerDraft: {
      prides: ['Гордость'],
      gratitudes: ['Благодарность'],
      photo: fakeBase64,
      tab: 'pride',
      extra: false,
      lastSavedISO: '2026-11-10T00:00:00.000Z',
    },
  }

  const sanitized = sanitizeStateForStorage(mockState as OgonekStoreState)

  // В дне 1 остаётся только Storage URL и IndexedDB ID, Base64 удалён
  assert.equal(sanitized.days[0].photos?.length, 2)
  assert.equal(sanitized.days[0].photos?.[0], validStorageUrl)
  assert.equal(sanitized.days[0].photos?.[1], validIdbId)

  // В дне 2 легитимный URL остался нетронутым
  assert.equal(sanitized.days[1].photos?.length, 1)
  assert.equal(sanitized.days[1].photos?.[0], validStorageUrl)

  // В черновике Base64 сброшен в null
  assert.equal(sanitized.composerDraft?.photo, null)
})

test('Этап 16: дебаунс записи 300 мс и немедленный сброс через flushSaveStore', async () => {
  let writesCount = 0
  let lastSavedValue = ''

  const testAdapter: StorageAdapter = {
    getItem: () => null,
    setItem: (key, value) => {
      writesCount++
      lastSavedValue = value
    },
    removeItem: () => {},
  }

  const sampleState: Partial<OgonekStoreState> = {
    days: [{ id: 10, title: 'Проверка дебаунса', tags: [], prides: [], gratitudes: [] }],
  }

  // Вызываем scheduleDebouncedSave трижды подряд
  scheduleDebouncedSave(sampleState, testAdapter)
  scheduleDebouncedSave(sampleState, testAdapter)
  scheduleDebouncedSave(sampleState, testAdapter)

  // Сразу после вызовов физическая запись в localStorage ещё не должна была произойти (дебаунс 300мс)
  assert.equal(writesCount, 0)

  // Принудительный сброс (как при unload или тесте)
  flushSaveStore()

  // Ровно 1 запись с последним состоянием
  assert.equal(writesCount, 1)
  assert.ok(lastSavedValue.includes('Проверка дебаунса'))
})

test('Этап 16: очередь оффлайн-записей (enqueue, count, dequeue, process)', async () => {
  clearOfflineQueue()
  assert.equal(getOfflineQueueCount(), 0)

  const testDay: Day = {
    id: 999,
    title: 'Оффлайн день',
    tags: ['Оффлайн'],
    prides: [{ num: '01', text: 'Сделал дело оффлайн', scale: 8, overcome: 1, visibility: 'public' }],
    gratitudes: ['Спасибо себе'],
    dateISO: new Date().toISOString(),
  }

  enqueueOfflineDay(testDay)
  assert.equal(getOfflineQueueCount(), 1)

  const queue = getOfflineQueue()
  assert.equal(queue[0].id, 999)
  assert.equal(queue[0].day.isOfflinePending, true)

  // Обработка очереди с успешной синхронизацией
  let syncCalled = 0
  const result = await processOfflineQueue(async (day) => {
    syncCalled++
    assert.equal(day.id, 999)
    return { ok: true }
  })

  assert.equal(result.synced, 1)
  assert.equal(result.failed, 0)
  assert.equal(syncCalled, 1)

  // Очередь очистилась после успешной отправки
  assert.equal(getOfflineQueueCount(), 0)
})

test('Этап 16: изоляция селектора ленты от обновлений чата', () => {
  const stateA: Partial<OgonekStoreState> = {
    days: [{ id: 1, title: 'День', tags: [], prides: [], gratitudes: [] }],
    profile: {
      displayName: 'Пользователь',
      username: 'user',
      avatarImage: null,
      level: 3,
      streak: 10,
      streak_count: 10,
    } as any,
    auth: { activeAccountId: 'user-1' } as any,
    followingIds: ['user-2'],
    exploreFollowingIds: [],
    feedDensity: 'comfortable',
    chatThreads: {
      friend1: { messages: [], draft: '' } as any,
    },
  }

  // Приходит новое сообщение в чат
  const stateB: Partial<OgonekStoreState> = {
    ...stateA,
    chatThreads: {
      friend1: {
        messages: [{ id: 'm1', text: 'Привет!', authorId: 'friend1', createdAtISO: 'now' }] as any,
        draft: '',
      } as any,
    },
  }

  // Селектор среза ленты
  const selectFeed = (s: any) => ({
    days: s.days,
    profile: s.profile,
    auth: s.auth,
    followingIds: s.followingIds,
    exploreFollowingIds: s.exploreFollowingIds,
    feedDensity: s.feedDensity,
  })

  const sliceA = selectFeed(stateA)
  const sliceB = selectFeed(stateB)

  // Сравнение через shallowEqual подтверждает: состояние ленты НЕ изменилось
  assert.equal(shallowEqual(sliceA, sliceB), true)
})
