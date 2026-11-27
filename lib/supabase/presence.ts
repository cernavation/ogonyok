import { useEffect, useState, useSyncExternalStore } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from './client.ts'
import { formatLastSeenStatus, type ResolvedUserStatus } from '../ogonek/friends.ts'

export type PresenceSnapshot = {
  onlineIds: Set<string>
  lastSeenOverrides: Map<string, string>
  trackedUserId: string | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HEARTBEAT_INTERVAL_MS = 45_000
const CHANNEL_NAME = 'priday-presence'

const EMPTY_SET: Set<string> = new Set()
const EMPTY_MAP: Map<string, string> = new Map()
const SERVER_SNAPSHOT: PresenceSnapshot = {
  onlineIds: EMPTY_SET,
  lastSeenOverrides: EMPTY_MAP,
  trackedUserId: null,
}

let currentSnapshot: PresenceSnapshot = {
  onlineIds: new Set(),
  lastSeenOverrides: new Map(),
  trackedUserId: null,
}

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    try {
      listener()
    } catch {}
  }
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) {
    if (!b.has(v)) return false
  }
  return true
}

function subscribePresence(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPresenceSnapshot(): PresenceSnapshot {
  return currentSnapshot
}

export function getServerPresenceSnapshot(): PresenceSnapshot {
  return SERVER_SNAPSHOT
}

export function isUserOnlineSync(userId?: string | null): boolean {
  if (!userId) return false
  return currentSnapshot.onlineIds.has(userId)
}

export function getEffectiveLastSeenSync(
  userId?: string | null,
  dbLastSeenAt?: string | null
): string | null {
  if (!userId) return dbLastSeenAt ?? null
  const override = currentSnapshot.lastSeenOverrides.get(userId)
  if (!override) return dbLastSeenAt ?? null
  if (!dbLastSeenAt) return override
  const oMs = Date.parse(override)
  const dMs = Date.parse(dbLastSeenAt)
  if (!Number.isFinite(dMs)) return override
  if (!Number.isFinite(oMs)) return dbLastSeenAt
  return oMs >= dMs ? override : dbLastSeenAt
}

export function setOnlineUsersForTesting(ids: Iterable<string>, overrides?: Map<string, string>) {
  currentSnapshot = {
    onlineIds: new Set(ids),
    lastSeenOverrides: overrides ? new Map(overrides) : new Map(currentSnapshot.lastSeenOverrides),
    trackedUserId: currentSnapshot.trackedUserId,
  }
  emitChange()
}

let activeChannel: RealtimeChannel | null = null
let activeTrackedUserId: string | null = null
let cachedAccessToken: string | null = null
let activeCleanup: (() => void) | null = null
let refCount = 0

function isPageVisible(): boolean {
  if (typeof document === 'undefined') return false
  return document.visibilityState !== 'hidden'
}

export async function touchLastSeenAt(
  userId: string,
  options?: { keepalive?: boolean }
): Promise<void> {
  if (!userId || !UUID_REGEX.test(userId)) return
  const nowISO = new Date().toISOString()

  if (options?.keepalive && typeof fetch === 'function') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const token = cachedAccessToken
    if (url && anonKey && token) {
      try {
        void fetch(
          `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            keepalive: true,
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ last_seen_at: nowISO }),
          }
        ).catch(() => {})
        return
      } catch {}
    }
  }

  const supabase = getSupabase()
  if (!supabase) return
  try {
    await supabase.from('profiles').update({ last_seen_at: nowISO }).eq('id', userId)
  } catch {}
}

function extractOnlineIdsFromState(state: Record<string, any[]>): Set<string> {
  const next = new Set<string>()
  for (const [key, presences] of Object.entries(state || {})) {
    if (!Array.isArray(presences) || presences.length === 0) continue
    if (UUID_REGEX.test(key)) {
      next.add(key)
    }
    for (const entry of presences) {
      const uid = entry && typeof entry === 'object' ? (entry.user_id as string | undefined) : undefined
      if (uid && UUID_REGEX.test(uid)) {
        next.add(uid)
      }
    }
  }
  return next
}

function startTrackingInternal(userId: string) {
  const supabase = getSupabase()
  if (!supabase || !userId || !UUID_REGEX.test(userId)) return

  if (activeTrackedUserId === userId && activeChannel) return
  stopTrackingInternal()

  activeTrackedUserId = userId
  currentSnapshot = {
    ...currentSnapshot,
    trackedUserId: userId,
  }
  emitChange()

  // Кэшируем access_token для надёжного keepalive PATCH при закрытии вкладки
  void supabase.auth
    .getSession()
    .then(({ data }) => {
      cachedAccessToken = data?.session?.access_token ?? null
    })
    .catch(() => {})

  const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token ?? null
  })

  const channel = supabase.channel(CHANNEL_NAME, {
    config: {
      presence: { key: userId },
    },
  })
  activeChannel = channel

  const syncFromChannel = () => {
    if (activeChannel !== channel) return
    const nextOnline = extractOnlineIdsFromState(channel.presenceState())
    const prevOnline = currentSnapshot.onlineIds
    if (setsEqual(prevOnline, nextOnline)) return

    const nextOverrides = new Map(currentSnapshot.lastSeenOverrides)
    const nowISO = new Date().toISOString()
    for (const prevId of prevOnline) {
      if (!nextOnline.has(prevId)) {
        nextOverrides.set(prevId, nowISO)
      }
    }

    currentSnapshot = {
      onlineIds: nextOnline,
      lastSeenOverrides: nextOverrides,
      trackedUserId: activeTrackedUserId,
    }
    emitChange()
  }

  let isSubscribed = false

  const trackVisibleState = () => {
    if (!isSubscribed || activeChannel !== channel) return
    if (isPageVisible()) {
      void channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      })
      void touchLastSeenAt(userId)
    } else {
      void channel.untrack()
      void touchLastSeenAt(userId, { keepalive: true })
    }
  }

  channel
    .on('presence', { event: 'sync' }, syncFromChannel)
    .on('presence', { event: 'join' }, syncFromChannel)
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      syncFromChannel()
      const state = channel.presenceState()
      const remaining = key ? state[key] : undefined
      if ((!remaining || remaining.length === 0) && key && UUID_REGEX.test(key)) {
        const nextOverrides = new Map(currentSnapshot.lastSeenOverrides)
        nextOverrides.set(key, new Date().toISOString())
        for (const p of leftPresences || []) {
          const uid = (p as any)?.user_id
          if (uid && UUID_REGEX.test(uid)) {
            nextOverrides.set(uid, new Date().toISOString())
          }
        }
        currentSnapshot = {
          ...currentSnapshot,
          lastSeenOverrides: nextOverrides,
        }
        emitChange()
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribed = true
        trackVisibleState()
      }
    })

  const onVisibilityChange = () => {
    trackVisibleState()
  }

  const onPageExit = () => {
    if (isSubscribed && activeChannel === channel) {
      void channel.untrack()
    }
    void touchLastSeenAt(userId, { keepalive: true })
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onPageExit)
    window.addEventListener('beforeunload', onPageExit)
  }

  const heartbeatTimer =
    typeof window !== 'undefined'
      ? window.setInterval(() => {
          if (isPageVisible()) {
            void touchLastSeenAt(userId)
          }
        }, HEARTBEAT_INTERVAL_MS)
      : null

  activeCleanup = () => {
    authSub?.subscription?.unsubscribe()
    if (heartbeatTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(heartbeatTimer)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', onPageExit)
      window.removeEventListener('beforeunload', onPageExit)
    }
    try {
      void channel.untrack()
      void supabase.removeChannel(channel)
    } catch {}
    if (activeChannel === channel) {
      activeChannel = null
    }
    activeTrackedUserId = null
    currentSnapshot = {
      onlineIds: new Set(),
      lastSeenOverrides: currentSnapshot.lastSeenOverrides,
      trackedUserId: null,
    }
    emitChange()
  }
}

function stopTrackingInternal() {
  if (activeCleanup) {
    const fn = activeCleanup
    activeCleanup = null
    fn()
  }
}

/**
 * Монтируется один раз в AppShell: подключает текущего пользователя
 * к Supabase Realtime Presence и обновляет profiles.last_seen_at.
 */
export function usePresenceTracker(userId?: string | null) {
  useEffect(() => {
    const validUser = userId && UUID_REGEX.test(userId) ? userId : null
    if (!validUser) {
      stopTrackingInternal()
      return
    }

    refCount += 1
    startTrackingInternal(validUser)

    return () => {
      refCount = Math.max(0, refCount - 1)
      if (refCount === 0) {
        if (activeTrackedUserId) {
          void touchLastSeenAt(activeTrackedUserId, { keepalive: true })
        }
        stopTrackingInternal()
      }
    }
  }, [userId])
}

export function usePresenceSnapshot(): PresenceSnapshot {
  return useSyncExternalStore(
    subscribePresence,
    getPresenceSnapshot,
    getServerPresenceSnapshot
  )
}

export function useIsUserOnline(userId?: string | null): boolean {
  const snap = usePresenceSnapshot()
  if (!userId) return false
  return snap.onlineIds.has(userId)
}

export function useUserPresenceStatus(
  userId?: string | null,
  dbLastSeenAt?: string | null
): ResolvedUserStatus {
  const snap = usePresenceSnapshot()
  const [, setMinuteTick] = useState(0)

  const isOnline = Boolean(userId && snap.onlineIds.has(userId))
  const effectiveLastSeen = userId
    ? getEffectiveLastSeenSync(userId, dbLastSeenAt)
    : dbLastSeenAt ?? null

  useEffect(() => {
    if (isOnline || !effectiveLastSeen || typeof window === 'undefined') return
    const timer = window.setInterval(() => setMinuteTick((t) => t + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [isOnline, effectiveLastSeen])

  return formatLastSeenStatus(effectiveLastSeen, isOnline)
}
