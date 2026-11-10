'use client'

import type { Day } from './types.ts'

export const OFFLINE_QUEUE_STORAGE_KEY = 'ogonek.offline_sync_queue'

export interface OfflineQueueItem {
  id: number | string
  day: Day
  queuedAt: string
  retryCount: number
  lastError?: string
}

let memoryQueue: OfflineQueueItem[] | null = null

function loadQueueFromStorage(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return []
  } catch {
    return []
  }
}

function persistQueueToStorage(queue: OfflineQueueItem[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue))
    window.dispatchEvent(
      new CustomEvent('ogonek-offline-queue-changed', {
        detail: { count: queue.length, items: queue },
      })
    )
  } catch (err) {
    console.warn('[OfflineQueue] Failed to persist offline queue:', err)
  }
}

export function getOfflineQueue(): OfflineQueueItem[] {
  if (memoryQueue === null) {
    memoryQueue = loadQueueFromStorage()
  }
  return [...memoryQueue]
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length
}

export function enqueueOfflineDay(day: Day): void {
  const queue = getOfflineQueue()
  // Не дублируем, если уже в очереди
  const existingIdx = queue.findIndex((item) => String(item.id) === String(day.id))
  const item: OfflineQueueItem = {
    id: day.id,
    day: { ...day, isOfflinePending: true },
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  }

  if (existingIdx >= 0) {
    queue[existingIdx] = item
  } else {
    queue.push(item)
  }

  memoryQueue = queue
  persistQueueToStorage(queue)
}

export function dequeueOfflineDay(id: number | string): void {
  const queue = getOfflineQueue().filter((item) => String(item.id) !== String(id))
  memoryQueue = queue
  persistQueueToStorage(queue)
}

export function clearOfflineQueue(): void {
  memoryQueue = []
  persistQueueToStorage([])
}

let isProcessingQueue = false

/**
 * Обрабатывает очередь отложенной отправки при появлении сети
 */
export async function processOfflineQueue(
  syncFn: (day: Day) => Promise<{ ok: boolean; error?: string }>
): Promise<{ synced: number; failed: number }> {
  if (isProcessingQueue) {
    return { synced: 0, failed: 0 }
  }

  const queue = getOfflineQueue()
  if (queue.length === 0) {
    return { synced: 0, failed: 0 }
  }

  isProcessingQueue = true
  let synced = 0
  let failed = 0

  const remaining: OfflineQueueItem[] = []

  for (const item of queue) {
    try {
      const res = await syncFn(item.day)
      if (res.ok) {
        synced++
      } else {
        failed++
        remaining.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastError: res.error || 'Sync failed',
        })
      }
    } catch (err: any) {
      failed++
      remaining.push({
        ...item,
        retryCount: item.retryCount + 1,
        lastError: err?.message || 'Network exception',
      })
    }
  }

  memoryQueue = remaining
  persistQueueToStorage(remaining)
  isProcessingQueue = false

  return { synced, failed }
}
