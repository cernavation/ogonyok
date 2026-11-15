import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  saveStore,
  flushPendingSave,
  saveStoreImmediate,
  STORAGE_KEY,
} from '../lib/ogonek/storage.ts'
import {
  enqueueOfflineMutation,
  getOfflineQueue,
  OFFLINE_QUEUE_KEY,
  drainOfflineQueue,
} from '../lib/ogonek/offline-queue.ts'
import { shallowEqual } from '../lib/ogonek/shallow-equal.ts'
import {
  getUserRealtimeHub,
  cleanupUserRealtimeHub,
  cleanupAllRealtimeHubs,
} from '../lib/supabase/realtime-hub.ts'
import { saveDayBundleRpc, getUserDaysPaginated } from '../lib/supabase/api.ts'

// Мок window и localStorage для тестов в Node.js
if (typeof globalThis.window === 'undefined') {
  const storageMap = new Map<string, string>()
  const mockLocalStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => storageMap.set(key, String(value)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  }
  ;(globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: mockLocalStorage,
  }
  ;(globalThis as any).localStorage = mockLocalStorage
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    })
  } catch {}
}

describe('Шаг 17: Производительность и Офлайн-режим (Performance & Offline)', () => {
  beforeEach(() => {
    localStorage.clear()
    cleanupAllRealtimeHubs()
  })

  describe('1. Debounce сохранения стора (localStorage)', () => {
    it('saveStoreImmediate сохраняет немедленно', () => {
      const mockState = { days: [], profile: { username: 'testuser' } } as any
      saveStoreImmediate(mockState)
      const raw = localStorage.getItem(STORAGE_KEY)
      assert.ok(raw, 'Данные должны быть сохранены в localStorage')
      const parsed = JSON.parse(raw!)
      assert.strictEqual(parsed.profile.username, 'testuser')
    })

    it('flushPendingSave немедленно записывает отложенное состояние', () => {
      const mockState = { days: [], profile: { username: 'flushed_user' } } as any
      saveStore(mockState)
      flushPendingSave()
      const raw = localStorage.getItem(STORAGE_KEY)
      assert.ok(raw)
      const parsed = JSON.parse(raw!)
      assert.strictEqual(parsed.profile.username, 'flushed_user')
    })

    it('множественные быстрые вызовы saveStore объединяются (debounce)', async () => {
      for (let i = 1; i <= 20; i++) {
        saveStore({ days: [], profile: { username: `user_${i}` } } as any)
      }
      flushPendingSave()
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      assert.strictEqual(parsed.profile.username, 'user_20')
    })
  })

  describe('2. Офлайн-очередь мутаций и дельта-синхронизация', () => {
    it('enqueueOfflineMutation сохраняет мутацию в localStorage', () => {
      const payload = { day: { id: 1, title: 'День 1' } }
      const mutation = enqueueOfflineMutation('save_day_bundle', payload)

      assert.ok(mutation.id.startsWith('mut_'))
      assert.strictEqual(mutation.type, 'save_day_bundle')

      const queue = getOfflineQueue()
      assert.strictEqual(queue.length, 1)
      assert.strictEqual(queue[0].id, mutation.id)
      assert.deepStrictEqual(queue[0].payload, payload)
    })

    it('дедупликация: мутации над одним и тем же днём объединяются', () => {
      enqueueOfflineMutation('save_day_bundle', {
        day: { client_id: 'day_42', title: 'Версия 1' },
      })
      enqueueOfflineMutation('save_day_bundle', {
        day: { client_id: 'day_42', title: 'Версия 2' },
      })

      const queue = getOfflineQueue()
      assert.strictEqual(queue.length, 1, 'В очереди должна остаться только последняя мутация дня')
      assert.strictEqual(queue[0].payload.day.title, 'Версия 2')
    })

    it('drainOfflineQueue корректно считывает очередь', async () => {
      enqueueOfflineMutation('save_day_bundle', { day: { client_id: 'day_99' } })
      assert.strictEqual(getOfflineQueue().length, 1)
      const res = await drainOfflineQueue()
      assert.ok(typeof res.processed === 'number')
      assert.ok(typeof res.remaining === 'number')
    })
  })

  describe('3. Селекторы стора и shallowEqual', () => {
    it('shallowEqual корректно сравнивает одинаковые примитивы и объекты', () => {
      assert.strictEqual(shallowEqual(1, 1), true)
      assert.strictEqual(shallowEqual('str', 'str'), true)
      assert.strictEqual(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' }), true)
      assert.strictEqual(shallowEqual({ a: 1 }, { a: 2 }), false)
      assert.strictEqual(shallowEqual({ a: 1 }, { a: 1, b: 2 }), false)
      assert.strictEqual(shallowEqual(null, null), true)
      assert.strictEqual(shallowEqual(null, {}), false)
    })

    it('store-selectors.ts экспортирует все необходимые канонические селекторы', () => {
      const selectorsPath = path.join(process.cwd(), 'lib/ogonek/store-selectors.ts')
      const content = fs.readFileSync(selectorsPath, 'utf8')

      assert.ok(content.includes('export function useProfileSelector'))
      assert.ok(content.includes('export function useDaysSelector'))
      assert.ok(content.includes('export function useDayById'))
      assert.ok(content.includes('export function useStreakSelector'))
      assert.ok(content.includes('export function useThemeSelector'))
      assert.ok(content.includes('export function useSoundSelector'))
      assert.ok(content.includes('export function usePrivacySelector'))
      assert.ok(content.includes('export function useSecuritySelector'))
      assert.ok(content.includes('export function useUnreadCountsSelector'))
      assert.ok(content.includes('export function useAuthSelector'))
    })
  })

  describe('4. Единый Realtime-канал на пользователя без утечек', () => {
    it('getUserRealtimeHub возвращает singleton-инстанс для одного и того же userId', () => {
      const hub1 = getUserRealtimeHub('user_abc')
      const hub2 = getUserRealtimeHub('user_abc')
      assert.strictEqual(hub1, hub2, 'Должен возвращаться ровно один хаб на пользователя')
    })

    it('cleanupUserRealtimeHub корректно уничтожает хаб и удаляет канал', () => {
      const hub = getUserRealtimeHub('user_xyz')
      assert.ok(hub)
      cleanupUserRealtimeHub('user_xyz')
      const hubNew = getUserRealtimeHub('user_xyz')
      assert.notStrictEqual(hub, hubNew, 'После очистки должен создаваться новый экземпляр')
    })

    it('подписка на сообщения и уведомления не плодит каналов', () => {
      const hub = getUserRealtimeHub('user_123')
      const unsub1 = hub.onDirectMessage(() => {})
      const unsub2 = hub.onNotification(() => {})
      const unsub3 = hub.onBroadcast('incoming_call', () => {})

      assert.ok(typeof unsub1 === 'function')
      assert.ok(typeof unsub2 === 'function')
      assert.ok(typeof unsub3 === 'function')

      // Отписка
      unsub1()
      unsub2()
      unsub3()
    })
  })

  describe('5. Service Worker и исключение кэширования API', () => {
    it('sw.js запрещает кэширование /api/, supabase, websocket и мутаций', () => {
      const swPath = path.join(process.cwd(), 'public/sw.js')
      const content = fs.readFileSync(swPath, 'utf8')

      assert.ok(content.includes('/api/'))
      assert.ok(content.includes('supabase.co'))
      assert.ok(content.includes('ws:'))
      assert.ok(content.includes('wss:'))
      assert.ok(content.includes('CACHE_NAME'))
      assert.ok(content.includes('isApiOrBackendRequest'))
    })
  })

  describe('6. Миграция 131: save_day_bundle и составные индексы', () => {
    it('миграция 131_save_day_bundle_rpc.sql содержит RPC и необходимые индексы', () => {
      const migPath = path.join(process.cwd(), 'supabase/migrations/131_save_day_bundle_rpc.sql')
      assert.ok(fs.existsSync(migPath), 'Файл миграции должен существовать')
      const content = fs.readFileSync(migPath, 'utf8')

      assert.ok(content.includes('CREATE OR REPLACE FUNCTION public.save_day_bundle'))
      assert.ok(content.includes('idx_days_user_day_num'))
      assert.ok(content.includes('idx_days_user_client_updated'))
      assert.ok(content.includes('idx_prides_user_day_client'))
      assert.ok(content.includes('idx_gratitudes_user_day_client'))
      assert.ok(content.includes('idx_direct_messages_sender_created'))
      assert.ok(content.includes('idx_direct_messages_recipient_created'))
      assert.ok(content.includes('idx_blocks_blocker_blocked'))
    })

    it('api.ts экспортирует saveDayBundleRpc и getUserDaysPaginated', () => {
      assert.strictEqual(typeof saveDayBundleRpc, 'function')
      assert.strictEqual(typeof getUserDaysPaginated, 'function')
    })
  })
})
