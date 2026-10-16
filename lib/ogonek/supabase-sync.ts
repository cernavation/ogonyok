/**
 * ЭТАП 19 — АДАПТЕР СИНХРОНИЗАЦИИ SUPABASE (OFFLINE-FIRST).
 *
 * Модуль бесшовно подключает локальную базу Огонька (ключ `ogonek.v2`) к
 * облаку Supabase, но продолжает работать полностью офлайн:
 *
 *   • Ключей в .env.local нет            → адаптер выключен, приложение живёт локально.
 *   • Ключи появились                     → включается автосинхронизация по расписанию.
 *   • Нет сети / сервер вернул ошибку     → изменения копятся локально и дозаливаются позже.
 *
 * Как это устроено:
 *   1. Дифф-движок. Каждая сущность получает детерминированный `client_id`.
 *      Мы храним отпечатки (FNV-1a) синхронизированных строк в sync-meta.
 *      На пуш уходят только реально изменённые строки (и удалённые — как
 *      операции DELETE). Никакой внешней зависимости нет — только fetch.
 *   2. Слияние (merge). При pull серверные строки накатываются на локальные
 *      по времени `client_updated_at`, при этом локально изменённые (грязные)
 *      строки не перезатираются — «последнее изменение побеждает».
 *   3. Автозапуск. startAutoSync() следит за online/offline, вкладкой и
 *      таймером и сам делает push+pull, когда появляется сеть.
 *
 * Модуль не зависит от React и может вызываться из любого места приложения.
 * Для удобного подключения в интерфейсе есть хук `use-supabase-sync.ts` и
 * панель настроек `components/ogonek/settings/supabase-sync-panel.tsx`.
 */

import { computeChecksum } from './sync-code.ts'
import { MY_CHAT_ID } from './messenger.ts'
import { getGratitudeRating, getGratitudeText } from './types.ts'
import type {
  AchievementCategoryId,
  AchievementEvidenceFile,
  AchievementRegulation,
  AchievementSubmission,
  ChatAttachment,
  ChatMessage,
  ChatReaction,
  ChatThreadState,
  ChatThreads,
  Comment,
  CommentPersona,
  Day,
  GratitudeEntry,
  MyStory,
  OgonekProfile,
  OgonekStoreState,
  PrideEntry,
  ProfileSocialLink,
  ReactionCounts,
  VerifiedAchievement,
  VisibilityLevel,
} from './types.ts'

/* ══════════════════════════════════════════════════════════════════════════
   КОНСТАНТЫ И ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
   ══════════════════════════════════════════════════════════════════════════ */

export const SUPABASE_URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL'
export const SUPABASE_ANON_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

/** Ключ localStorage с runtime-настройками подключения (если задаются из UI) */
export const SUPABASE_CONFIG_STORAGE_KEY = 'ogonek.supabase.config'
/** Ключ localStorage с сессией Supabase Auth (access/refresh токены) */
export const SUPABASE_SESSION_STORAGE_KEY = 'ogonek.supabase.session'
/** Ключ localStorage с метаданными синхронизации (отпечатки, метки времени) */
export const SUPABASE_META_STORAGE_KEY = 'ogonek.supabase.syncmeta'

/** Сколько миллисекунд до истечения считаем токен «созревшим» для refresh */
const SESSION_REFRESH_MARGIN_MS = 60_000
/** Период фоновой автосинхронизации по умолчанию */
export const DEFAULT_AUTO_SYNC_INTERVAL_MS = 60_000

/* ══════════════════════════════════════════════════════════════════════════
   ТИПЫ: КОНФИГ, СЕССИЯ, СТАТУС
   ══════════════════════════════════════════════════════════════════════════ */

export type SupabaseConfig = {
  url: string
  anonKey: string
}

export type SupabaseSession = {
  accessToken: string
  refreshToken: string
  /** UNIX-время (мс) истечения access-токена */
  expiresAt: number
  userId: string
  email: string | null
  anonymous: boolean
}

export type SupabaseSyncPhase =
  | 'disabled' // нет ключей — приложение локальное
  | 'offline' // ключи есть, но нет сети
  | 'ready' // всё готово, ждём синхронизации
  | 'syncing' // прямо сейчас идёт обмен
  | 'synced' // последняя синхронизация прошла успешно
  | 'error' // ошибка последней синхронизации

export type SupabaseSyncState = {
  phase: SupabaseSyncPhase
  configured: boolean
  online: boolean
  authenticated: boolean
  anonymous: boolean
  userId: string | null
  email: string | null
  lastSyncAtISO: string | null
  lastPushAtISO: string | null
  lastPullAtISO: string | null
  /** Сколько строк ждёт отправки в облако */
  pendingChanges: number
  /** Сколько строк пришло из облака за последнюю синхронизацию */
  lastPulled: number
  /** Сколько строк ушло в облако за последнюю синхронизацию */
  lastPushed: number
  lastError: string | null
  message: string
}

/* ══════════════════════════════════════════════════════════════════════════
   ТИПЫ: СТРОКИ БАЗЫ ДАННЫХ (SNAKE_CASE, КАК В SUPABASE_FULL_SCHEMA.sql)
   ══════════════════════════════════════════════════════════════════════════ */

export type SupabaseTable =
  | 'profiles'
  | 'days'
  | 'prides'
  | 'gratitudes'
  | 'achievements_verifications'
  | 'stories'
  | 'friendships'
  | 'reactions'
  | 'comments'
  | 'direct_messages'

export type RowRecord = Record<string, unknown>

type RowWithClientId = {
  client_id: string
  client_updated_at?: string | null
}

export type ProfileRow = RowWithClientId & {
  id: string
  display_name: string
  username: string
  bio: string
  city: string
  website: string
  joined_label: string
  avatar_image: string | null
  avatar_color: string
  banner_image: string | null
  banner_preset: string
  social_links: unknown
  monthly_goal: string
  monthly_goal_updated_at: string | null
  verified: boolean
  streak_count: number
  theme: string
  accent: string
  font_scale: string
  feed_density: string
  privacy: unknown
  streak_settings: unknown
  settings: unknown
}

export type DayRow = RowWithClientId & {
  title: string
  tags: unknown
  photos: unknown
  date_iso: string | null
  day_number: number | null
  status: string
  visibility: string
}

export type PrideRow = RowWithClientId & {
  day_client_id: string
  position: number
  num: string
  text: string
  scale: number
  overcome: number
  visibility: string
}

export type GratitudeRow = RowWithClientId & {
  day_client_id: string
  position: number
  num: string | null
  text: string
  rating: number
}

export type AchievementRow = RowWithClientId & {
  category_id: string
  title: string
  topic: string
  achieved_at: string | null
  status: string
  regulation: unknown
  evidence: unknown
  submission: unknown
  submitted_at: string | null
  verified_at: string | null
  reviewer_note: string | null
  moderator_status: string | null
  tracking_code: string | null
}

export type StoryRow = RowWithClientId & {
  friend_id: string | null
  emoji: string
  kicker: string
  headline: string
  detail: string
  from_color: string
  to_color: string
  accent: string
  background_id: string | null
  photo: string | null
  slides: unknown
  source_day_id: number | null
  source_pride_index: number | null
  visibility: string
}

export type FriendshipRow = RowWithClientId & {
  addressee_id: string
  requester_id: string | null
  status: string
  message: string
  mutual_count: number
}

export type ReactionRow = RowWithClientId & {
  target_key: string
  target_kind: string
  day_client_id: string | null
  position: number | null
  emoji_id: string
  count: number
  mine: boolean
}

export type CommentRow = RowWithClientId & {
  target_key: string
  day_client_id: string | null
  parent_client_id: string | null
  author: string
  initials: string
  text: string
  likes: number
  liked_by_me: boolean
  is_mine: boolean
  template: string | null
  persona: string
  created_at?: string | null
}

export type MessageRow = RowWithClientId & {
  thread_key: string
  author_id: string
  recipient_id: string | null
  body: string
  attachment: unknown
  reactions: unknown
  is_read: boolean
  is_system: boolean
  sent_at: string | null
}

export type RemoteDataset = {
  profile: ProfileRow | null
  days: DayRow[]
  prides: PrideRow[]
  gratitudes: GratitudeRow[]
  achievements: AchievementRow[]
  stories: StoryRow[]
  friendships: FriendshipRow[]
  reactions: ReactionRow[]
  comments: CommentRow[]
  messages: MessageRow[]
}

/* ══════════════════════════════════════════════════════════════════════════
   ХРАНИЛИЩЕ (localStorage) + КОНФИГ
   ══════════════════════════════════════════════════════════════════════════ */

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readJson<T>(key: string): T | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown | null): void {
  const storage = getStorage()
  if (!storage) return
  try {
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(value))
  } catch {
    // квота/приватный режим — тихо игнорируем
  }
}

function normalizeUrl(url: string): string {
  return (url ?? '').trim().replace(/\/+$/, '')
}

function isValidConfig(config: SupabaseConfig | null | undefined): config is SupabaseConfig {
  return Boolean(config && normalizeUrl(config.url).startsWith('http') && config.anonKey.trim())
}

/** Настройки подключения из .env.local (NEXT_PUBLIC_*), если заданы */
export function readEnvConfig(): SupabaseConfig | null {
  const url = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined
  const anonKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined
  if (!url || !anonKey) return null
  const config: SupabaseConfig = { url: normalizeUrl(url), anonKey: anonKey.trim() }
  return isValidConfig(config) ? config : null
}

/** Настройки подключения, сохранённые из интерфейса (перекрывают .env) */
export function readStoredConfig(): SupabaseConfig | null {
  const config = readJson<SupabaseConfig>(SUPABASE_CONFIG_STORAGE_KEY)
  return isValidConfig(config) ? { url: normalizeUrl(config.url), anonKey: config.anonKey.trim() } : null
}

/** Итоговый конфиг: сначала .env.local, затем runtime-настройки из UI */
export function readSupabaseConfig(): SupabaseConfig | null {
  return readEnvConfig() ?? readStoredConfig()
}

/** Есть ли ключи Supabase (в .env.local или сохранённые из UI)? */
export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig() !== null
}

/** Сохраняет настройки подключения из интерфейса */
export function saveSupabaseConfig(config: SupabaseConfig): SupabaseConfig | null {
  const normalized: SupabaseConfig = { url: normalizeUrl(config.url), anonKey: (config.anonKey ?? '').trim() }
  if (!isValidConfig(normalized)) return null
  writeJson(SUPABASE_CONFIG_STORAGE_KEY, normalized)
  return normalized
}

/** Удаляет runtime-настройки подключения */
export function clearSupabaseConfig(): void {
  writeJson(SUPABASE_CONFIG_STORAGE_KEY, null)
}

export function readSession(): SupabaseSession | null {
  const session = readJson<SupabaseSession>(SUPABASE_SESSION_STORAGE_KEY)
  if (!session || typeof session.accessToken !== 'string' || !session.accessToken) return null
  return session
}

export function writeSession(session: SupabaseSession | null): void {
  writeJson(SUPABASE_SESSION_STORAGE_KEY, session)
}

/* ══════════════════════════════════════════════════════════════════════════
   МЕТАДАННЫЕ СИНХРОНИЗАЦИИ
   ══════════════════════════════════════════════════════════════════════════ */

export type SyncMeta = {
  /** `${table}:${clientId}` → FNV-отпечаток последней отправленной/известной строки */
  fingerprints: Record<string, string>
  /** `${table}:${clientId}` → серверный client_updated_at последней принятой версии */
  remoteTimestamps: Record<string, string>
  lastPushedAtISO: string | null
  lastPulledAtISO: string | null
}

export const EMPTY_SYNC_META: SyncMeta = {
  fingerprints: {},
  remoteTimestamps: {},
  lastPushedAtISO: null,
  lastPulledAtISO: null,
}

export function readSyncMeta(): SyncMeta {
  const meta = readJson<Partial<SyncMeta>>(SUPABASE_META_STORAGE_KEY)
  return {
    fingerprints: meta?.fingerprints ?? {},
    remoteTimestamps: meta?.remoteTimestamps ?? {},
    lastPushedAtISO: meta?.lastPushedAtISO ?? null,
    lastPulledAtISO: meta?.lastPulledAtISO ?? null,
  }
}

export function writeSyncMeta(meta: SyncMeta): void {
  writeJson(SUPABASE_META_STORAGE_KEY, meta)
}

/** Полностью сбрасывает метаданные синхронизации (следующий пуш зальёт всё заново) */
export function resetSyncMeta(): void {
  writeJson(SUPABASE_META_STORAGE_KEY, null)
}

function metaKey(table: SupabaseTable, clientId: string): string {
  return `${table}:${clientId}`
}

function hashRow(row: unknown): string {
  return computeChecksum(JSON.stringify(row))
}

/* ══════════════════════════════════════════════════════════════════════════
   REST-КЛИЕНТ SUPABASE (PostgREST + GoTrue), БЕЗ ВНЕШНИХ ЗАВИСИМОСТЕЙ
   ══════════════════════════════════════════════════════════════════════════ */

export type RestResponse<T> = {
  ok: boolean
  status: number
  data: T | null
  error: string | null
}

function extractError(data: unknown, fallback: string): string {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const message = obj.message ?? obj.error_description ?? obj.error ?? obj.msg
    if (typeof message === 'string' && message.trim()) {
      const hint = typeof obj.hint === 'string' ? ` (${obj.hint})` : ''
      return `${message}${hint}`
    }
  }
  return fallback
}

export class SupabaseRestClient {
  readonly config: SupabaseConfig
  private accessToken: string | null

  constructor(config: SupabaseConfig, accessToken: string | null = null) {
    this.config = { url: normalizeUrl(config.url), anonKey: config.anonKey.trim() }
    this.accessToken = accessToken
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.accessToken ?? this.config.anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(extra ?? {}),
    }
  }

  private async request<T>(
    path: string,
    opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
  ): Promise<RestResponse<T>> {
    const url = `${this.config.url}${path}`
    try {
      const res = await fetch(url, {
        method: opts.method ?? 'GET',
        headers: this.headers(opts.headers),
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      })
      const text = await res.text()
      let data: unknown = null
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          data = text
        }
      }
      if (!res.ok) {
        return { ok: false, status: res.status, data: null, error: extractError(data, `HTTP ${res.status}`) }
      }
      return { ok: true, status: res.status, data: (data as T) ?? null, error: null }
    } catch (err) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: err instanceof Error ? err.message : 'Нет соединения с Supabase',
      }
    }
  }

  /** SELECT строк таблицы (query вида `select=*&user_id=eq.xxx`) */
  async list<T>(table: SupabaseTable, query: string): Promise<RestResponse<T[]>> {
    return this.request<T[]>(`/rest/v1/${table}?${query}`)
  }

  /** UPSERT строк (merge-duplicates) — идемпотентно по onConflict */
  async upsert(table: SupabaseTable, rows: RowRecord[], onConflict: string): Promise<RestResponse<null>> {
    return this.request<null>(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      body: rows,
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    })
  }

  /** DELETE строк по набору фильтров (значения уже в формате PostgREST) */
  async deleteEq(table: SupabaseTable, filters: Record<string, string>): Promise<RestResponse<null>> {
    const query = Object.entries(filters)
      .map(([column, value]) => `${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`)
      .join('&')
    return this.request<null>(`/rest/v1/${table}?${query}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    })
  }

  /** Вызов RPC-функции */
  async rpc<T>(fn: string, args: unknown = {}): Promise<RestResponse<T>> {
    return this.request<T>(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args })
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   АВТОРИЗАЦИЯ (GoTrue): ПАРОЛЬ, РЕГИСТРАЦИЯ, АНОНИМНЫЙ ВХОД, REFRESH
   ══════════════════════════════════════════════════════════════════════════ */

type GoTrueUser = { id?: string; email?: string | null; is_anonymous?: boolean }
type GoTrueResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: GoTrueUser
  error?: string
  error_description?: string
  msg?: string
}

function sessionFromGoTrue(payload: GoTrueResponse| null, fallbackUserId?: string): SupabaseSession | null {
  if (!payload || !payload.access_token) return null
  const userId = payload.user?.id ?? fallbackUserId ?? ''
  if (!userId) return null
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? '',
    expiresAt: Date.now() + expiresIn * 1000,
    userId,
    email: payload.user?.email ?? null,
    anonymous: Boolean(payload.user?.is_anonymous) || !payload.user?.email,
  }
}

async function authRequest(
  config: SupabaseConfig,
  path: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<RestResponse<GoTrueResponse>> {
  try {
    const res = await fetch(`${normalizeUrl(config.url)}${path}`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        ...(extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: extractError(data, `Auth HTTP ${res.status}`) }
    }
    return { ok: true, status: res.status, data: data as GoTrueResponse, error: null }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Нет соединения с Supabase Auth',
    }
  }
}

/** Вход по почте и паролю через Supabase Auth */
export async function signInWithPassword(
  config: SupabaseConfig,
  email: string,
  password: string
): Promise<{ ok: true; session: SupabaseSession } | { ok: false; error: string }> {
  const res = await authRequest(config, '/auth/v1/token?grant_type=password', { email, password })
  if (!res.ok || !res.data) return { ok: false, error: res.error ?? 'Не удалось войти' }
  const session = sessionFromGoTrue(res.data)
  if (!session) return { ok: false, error: 'Supabase не вернул сессию входа' }
  return { ok: true, session }
}

/** Регистрация по почте и паролю через Supabase Auth */
export async function signUpWithPassword(
  config: SupabaseConfig,
  email: string,
  password: string,
  displayName?: string
): Promise<{ ok: true; session: SupabaseSession | null; needsConfirm: boolean } | { ok: false; error: string }> {
  const res = await authRequest(config, '/auth/v1/signup', {
    email,
    password,
    data: displayName ? { display_name: displayName } : undefined,
  })
  if (!res.ok || !res.data) return { ok: false, error: res.error ?? 'Не удалось зарегистрироваться' }
  const session = sessionFromGoTrue(res.data)
  return { ok: true, session, needsConfirm: !session }
}

/** Анонимный вход (Supabase Anonymous Sign-In) — бесшовный старт без экрана логина */
export async function signInAnonymously(
  config: SupabaseConfig
): Promise<{ ok: true; session: SupabaseSession } | { ok: false; error: string }> {
  const res = await authRequest(config, '/auth/v1/signup', {})
  if (!res.ok || !res.data) {
    return {
      ok: false,
      error:
        res.error ??
        'Анонимный вход выключен. Включите Authentication → Anonymous Sign-Ins в Supabase.',
    }
  }
  const session = sessionFromGoTrue(res.data)
  if (!session) {
    return { ok: false, error: 'Supabase не вернул анонимную сессию — включите Anonymous Sign-Ins' }
  }
  return { ok: true, session }
}

/** Обновление access-токена по refresh-token */
export async function refreshSession(
  config: SupabaseConfig,
  session: SupabaseSession
): Promise<SupabaseSession | null> {
  if (!session.refreshToken) return null
  const res = await authRequest(
    config,
    '/auth/v1/token?grant_type=refresh_token',
    { refresh_token: session.refreshToken }
  )
  if (!res.ok || !res.data) return null
  return sessionFromGoTrue(res.data, session.userId)
}

/** Выход из Supabase Auth (best-effort) */
export async function signOutSession(config: SupabaseConfig, session: SupabaseSession): Promise<void> {
  try {
    await fetch(`${normalizeUrl(config.url)}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  } catch {
    // офлайн — локальную сессию всё равно очистим
  }
}

function isSessionFresh(session: SupabaseSession): boolean {
  return session.expiresAt - Date.now() > SESSION_REFRESH_MARGIN_MS
}

/** Гарантирует валидную сессию: обновляет токен или входит анонимно */
export async function ensureSession(
  config: SupabaseConfig
): Promise<{ ok: true; session: SupabaseSession } | { ok: false; error: string }> {
  const current = readSession()
  if (current && isSessionFresh(current)) return { ok: true, session: current }

  if (current && current.refreshToken) {
    const refreshed = await refreshSession(config, current)
    if (refreshed) {
      writeSession(refreshed)
      return { ok: true, session: refreshed }
    }
  }

  return signInAnonymously(config)
}

/* ══════════════════════════════════════════════════════════════════════════
   ПАРСИНГ ЦЕЛЕЙ РЕАКЦИЙ/КОММЕНТАРИЕВ
   ══════════════════════════════════════════════════════════════════════════ */

export type ParsedTarget = {
  kind: 'day' | 'pride' | 'gratitude'
  dayClientId: string | null
  position: number | null
}

/** Разбирает ключ цели "day:12" | "day:12:pride:0" | "day:12:grat:2" */
export function parseReactionTarget(target: string): ParsedTarget {
  const parts = (target ?? '').split(':')
  if (parts[0] !== 'day') return { kind: 'day', dayClientId: target || null, position: null }
  const dayClientId = parts[1] ?? null
  if (parts[2] === 'pride') {
    const position = Number(parts[3])
    return { kind: 'pride', dayClientId, position: Number.isFinite(position) ? position : null }
  }
  if (parts[2] === 'grat') {
    const position = Number(parts[3])
    return { kind: 'gratitude', dayClientId, position: Number.isFinite(position) ? position : null }
  }
  return { kind: 'day', dayClientId, position: null }
}

function dayClientIdFromTarget(target: string): string | null {
  return parseReactionTarget(target).dayClientId
}

/* ══════════════════════════════════════════════════════════════════════════
   МАППИНГ: ЛОКАЛЬНОЕ СОСТОЯНИЕ → СТРОКИ БАЗЫ (контент без user_id/updated_at)
   ══════════════════════════════════════════════════════════════════════════ */

const VISIBILITIES: VisibilityLevel[] = ['public', 'friends', 'private']

function asVisibility(value: unknown): VisibilityLevel {
  return typeof value === 'string' && (VISIBILITIES as string[]).includes(value)
    ? (value as VisibilityLevel)
    : 'public'
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function profileContentRow(state: OgonekStoreState, userId: string): ProfileRow {
  return {
    id: userId,
    client_id: userId,
    display_name: state.profile.displayName,
    username: state.profile.username,
    bio: state.profile.bio,
    city: state.profile.city,
    website: state.profile.website,
    joined_label: state.profile.joinedLabel,
    avatar_image: state.profile.avatarImage,
    avatar_color: state.profile.avatarColor,
    banner_image: state.profile.bannerImage,
    banner_preset: state.profile.bannerPreset,
    social_links: state.profile.socialLinks,
    monthly_goal: state.profile.monthlyGoal,
    monthly_goal_updated_at: state.profile.monthlyGoalUpdatedAtISO || null,
    verified: state.profile.verified,
    streak_count: 0,
    theme: state.theme,
    accent: state.accent,
    font_scale: state.fontScale,
    feed_density: state.feedDensity,
    privacy: state.privacy,
    streak_settings: state.streak,
    settings: {},
  }
}

function dayRowFrom(day: Day): DayRow {
  return {
    client_id: String(day.id),
    title: day.title,
    tags: day.tags,
    photos: day.photos ?? [],
    date_iso: day.dateISO ?? null,
    day_number: day.id,
    status: day.status ?? 'normal',
    visibility: asVisibility(day.visibility),
  }
}

function prideRowsFrom(day: Day): PrideRow[] {
  return day.prides.map((pride, index) => ({
    client_id: `day:${day.id}:pride:${index}`,
    day_client_id: String(day.id),
    position: index,
    num: pride.num,
    text: pride.text,
    scale: pride.scale,
    overcome: pride.overcome,
    visibility: asVisibility(pride.visibility ?? day.visibility),
  }))
}

function gratitudeRowsFrom(day: Day): GratitudeRow[] {
  return day.gratitudes.map((gratitude, index) => ({
    client_id: `day:${day.id}:grat:${index}`,
    day_client_id: String(day.id),
    position: index,
    num: typeof gratitude === 'object' && gratitude && typeof gratitude.num === 'string' ? gratitude.num : null,
    text: getGratitudeText(gratitude),
    rating: Number.isFinite(getGratitudeRating(gratitude)) ? getGratitudeRating(gratitude) : 10,
  }))
}

function achievementRowFrom(achievement: VerifiedAchievement): AchievementRow {
  return {
    client_id: achievement.id,
    category_id: achievement.categoryId,
    title: achievement.title,
    topic: achievement.topic,
    achieved_at: achievement.achievedAtISO || null,
    status: achievement.status,
    regulation: achievement.regulation,
    evidence: achievement.evidence,
    submission: achievement.submission,
    submitted_at: achievement.submittedAtISO,
    verified_at: achievement.verifiedAtISO,
    reviewer_note: achievement.reviewerNote,
    moderator_status: achievement.submission?.status ?? null,
    tracking_code: achievement.submission?.trackingCode ?? null,
  }
}

function storyRowFrom(story: MyStory): StoryRow {
  return {
    client_id: story.id,
    friend_id: null,
    emoji: story.emoji,
    kicker: story.kicker,
    headline: story.headline,
    detail: story.detail,
    from_color: story.from,
    to_color: story.to,
    accent: story.accent,
    background_id: story.backgroundId ?? null,
    photo: story.photo ?? null,
    slides: [],
    source_day_id: story.sourceDayId ?? null,
    source_pride_index: story.sourcePrideIndex ?? null,
    visibility: asVisibility(story.visibility),
  }
}

/** Приоритет статуса связи — одна строка на человека в графе */
const FRIENDSHIP_PRIORITY: Record<string, number> = {
  friend: 5,
  following: 4,
  'incoming-request': 3,
  'outgoing-request': 2,
  dismissed: 1,
}

function friendshipRowsFrom(state: OgonekStoreState): FriendshipRow[] {
  const byAddressee = new Map<string, string>()
  const put = (addresseeId: string, status: string) => {
    if (!addresseeId) return
    const existing = byAddressee.get(addresseeId)
    if (!existing || (FRIENDSHIP_PRIORITY[status] ?? 0) > (FRIENDSHIP_PRIORITY[existing] ?? 0)) {
      byAddressee.set(addresseeId, status)
    }
  }
  for (const id of state.friendIds ?? []) put(id, 'friend')
  for (const id of state.followingIds ?? []) put(id, 'following')
  for (const id of state.incomingFriendRequests ?? []) put(id, 'incoming-request')
  for (const id of state.outgoingFriendRequests ?? []) put(id, 'outgoing-request')
  for (const id of state.dismissedSuggestions ?? []) put(id, 'dismissed')

  const rows: FriendshipRow[] = []
  for (const [addresseeId, status] of byAddressee) {
    rows.push({
      client_id: addresseeId,
      addressee_id: addresseeId,
      requester_id: null,
      status,
      message: '',
      mutual_count: 0,
    })
  }
  return rows
}

function reactionRowsFrom(state: OgonekStoreState): ReactionRow[] {
  const targets = new Set<string>([
    ...Object.keys(state.dayReactions ?? {}),
    ...Object.keys(state.myReactions ?? {}),
  ])
  const rows: ReactionRow[] = []
  for (const target of targets) {
    const counts = (state.dayReactions ?? {})[target] ?? {}
    const mine = new Set(state.myReactions?.[target] ?? [])
    const emojis = new Set<string>([...Object.keys(counts), ...mine])
    const parsed = parseReactionTarget(target)
    for (const emojiId of emojis) {
      const count = counts[emojiId] ?? 0
      const isMine = mine.has(emojiId)
      if (count <= 0 && !isMine) continue
      rows.push({
        client_id: `${target}::${emojiId}`,
        target_key: target,
        target_kind: parsed.kind,
        day_client_id: parsed.dayClientId,
        position: parsed.position,
        emoji_id: emojiId,
        count: Math.max(0, count),
        mine: isMine,
      })
    }
  }
  return rows
}

function commentRowsFrom(state: OgonekStoreState): CommentRow[] {
  const rows: CommentRow[] = []
  for (const [target, list] of Object.entries(state.comments ?? {})) {
    const dayClientId = dayClientIdFromTarget(target)
    for (const comment of list) {
      rows.push({
        client_id: comment.id,
        target_key: target,
        day_client_id: dayClientId,
        parent_client_id: comment.parentId,
        author: comment.author,
        initials: comment.initials,
        text: comment.text,
        likes: comment.likes,
        liked_by_me: comment.likedByMe,
        is_mine: comment.isMine,
        template: comment.template ?? null,
        persona: comment.persona,
        created_at: comment.createdAt,
      })
    }
  }
  return rows
}

function messageRowsFrom(state: OgonekStoreState): MessageRow[] {
  const rows: MessageRow[] = []
  for (const [friendId, thread] of Object.entries<ChatThreadState>(state.chatThreads ?? {})) {
    for (const message of thread.messages ?? []) {
      rows.push({
        client_id: message.id,
        thread_key: friendId,
        author_id: message.authorId,
        recipient_id: message.authorId === MY_CHAT_ID ? friendId : MY_CHAT_ID,
        body: message.text,
        attachment: message.attachment,
        reactions: message.reactions,
        is_read: message.read,
        is_system: message.system,
        sent_at: message.createdAtISO,
      })
    }
  }
  return rows
}

/** Собирает полный набор строк для синхронизации из локального состояния */
export function buildRemoteDataset(state: OgonekStoreState, userId: string): RemoteDataset {
  const days = state.days ?? []
  return {
    profile: profileContentRow(state, userId),
    days: days.map(dayRowFrom),
    prides: days.flatMap(prideRowsFrom),
    gratitudes: days.flatMap(gratitudeRowsFrom),
    achievements: (state.verifiedAchievements ?? []).map(achievementRowFrom),
    stories: (state.myStories ?? []).map(storyRowFrom),
    friendships: friendshipRowsFrom(state),
    reactions: reactionRowsFrom(state),
    comments: commentRowsFrom(state),
    messages: messageRowsFrom(state),
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ДИФФ-ДВИЖОК: ЧТО ИМЕННО ОТПРАВИТЬ (UPSERT + DELETE)
   ══════════════════════════════════════════════════════════════════════════ */

/** onConflict-ключ для каждой таблицы (совпадает с unique-ограничениями схемы) */
export const ON_CONFLICT: Record<SupabaseTable, string> = {
  profiles: 'id',
  days: 'user_id,client_id',
  prides: 'user_id,client_id',
  gratitudes: 'user_id,client_id',
  achievements_verifications: 'user_id,client_id',
  stories: 'user_id,client_id',
  friendships: 'user_id,addressee_id',
  reactions: 'user_id,client_id',
  comments: 'user_id,client_id',
  direct_messages: 'user_id,client_id',
}

/** Колонка, по которой удаляем «пропавшую» строку */
const DELETE_COLUMN: Record<SupabaseTable, string> = {
  profiles: 'id',
  days: 'client_id',
  prides: 'client_id',
  gratitudes: 'client_id',
  achievements_verifications: 'client_id',
  stories: 'client_id',
  friendships: 'addressee_id',
  reactions: 'client_id',
  comments: 'client_id',
  direct_messages: 'client_id',
}

const TABLE_ORDER: SupabaseTable[] = [
  'profiles',
  'days',
  'prides',
  'gratitudes',
  'achievements_verifications',
  'stories',
  'friendships',
  'reactions',
  'comments',
  'direct_messages',
]

export type DeleteOperation = {
  table: SupabaseTable
  clientId: string
}

export type PushPlan = {
  /** table → массив строк для upsert */
  upserts: Partial<Record<SupabaseTable, RowRecord[]>>
  deletes: DeleteOperation[]
  /** Общее число изменений (upsert-строки + удаления) */
  total: number
}

function datasetEntries(dataset: RemoteDataset): Record<SupabaseTable, RowWithClientId[]> {
  return {
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
}

/** Строит план: какие строки изменились с прошлой синхронизации и что удалено */
export function buildPushPlan(dataset: RemoteDataset, meta: SyncMeta): PushPlan {
  const entries = datasetEntries(dataset)
  const plan: PushPlan = { upserts: {}, deletes: [], total: 0 }
  const currentKeys = new Set<string>()

  for (const table of TABLE_ORDER) {
    const rows = entries[table]
    for (const row of rows) {
      const key = metaKey(table, row.client_id)
      currentKeys.add(key)
      const fingerprint = hashRow(row)
      if (meta.fingerprints[key] !== fingerprint) {
        const bucket = plan.upserts[table] ?? []
        bucket.push(row as unknown as RowRecord)
        plan.upserts[table] = bucket
        plan.total += 1
      }
    }
  }

  for (const key of Object.keys(meta.fingerprints)) {
    if (currentKeys.has(key)) continue
    const separator = key.indexOf(':')
    if (separator <= 0) continue
    const table = key.slice(0, separator) as SupabaseTable
    const clientId = key.slice(separator + 1)
    if (!TABLE_ORDER.includes(table) || !clientId) continue
    plan.deletes.push({ table, clientId })
    plan.total += 1
  }

  return plan
}

/** Сколько строк ждёт отправки в облако */
export function countPendingChanges(state: OgonekStoreState, userId: string, meta = readSyncMeta()): number {
  if (!userId) return 0
  return buildPushPlan(buildRemoteDataset(state, userId), meta).total
}

function withUser(row: RowRecord, table: SupabaseTable, userId: string, timestamp: string): RowRecord {
  const payload: RowRecord = { ...row, client_updated_at: timestamp }
  if (table === 'profiles') payload.id = userId
  else payload.user_id = userId
  return payload
}

function deleteFilters(table: SupabaseTable, clientId: string, userId: string): Record<string, string> {
  const column = DELETE_COLUMN[table]
  if (table === 'profiles') return { id: userId }
  if (table === 'friendships') return { user_id: userId, addressee_id: clientId }
  return { user_id: userId, [column]: clientId }
}

/* ══════════════════════════════════════════════════════════════════════════
   СЛИЯНИЕ: СТРОКИ БАЗЫ → ЛОКАЛЬНОЕ СОСТОЯНИЕ
   ══════════════════════════════════════════════════════════════════════════ */

function isLocallyDirty(table: SupabaseTable, clientId: string, localRow: unknown, meta: SyncMeta): boolean {
  const known = meta.fingerprints[metaKey(table, clientId)]
  if (known === undefined) return false
  return known !== hashRow(localRow)
}

function isRemoteNewer(table: SupabaseTable, clientId: string, remoteUpdatedAt: string | null | undefined, meta: SyncMeta): boolean {
  const seen = meta.remoteTimestamps[metaKey(table, clientId)]
  if (!remoteUpdatedAt) return seen === undefined
  if (!seen) return true
  const remote = new Date(remoteUpdatedAt).getTime()
  const local = new Date(seen).getTime()
  if (Number.isNaN(remote)) return true
  if (Number.isNaN(local)) return true
  return remote > local
}

function mergeRows<T extends RowWithClientId>(
  table: SupabaseTable,
  localRows: readonly T[],
  remoteRows: readonly T[],
  meta: SyncMeta
): { rows: T[]; changed: number } {
  const result: T[] = [...localRows]
  const index = new Map<string, number>()
  result.forEach((row, i) => index.set(row.client_id, i))
  let changed = 0

  for (const remote of remoteRows) {
    const key = metaKey(table, remote.client_id)
    const at = index.get(remote.client_id)
    if (at === undefined) {
      index.set(remote.client_id, result.length)
      result.push(remote)
      changed += 1
      if (remote.client_updated_at) meta.remoteTimestamps[key] = remote.client_updated_at
      continue
    }
    const localRow = result[at]
    if (isLocallyDirty(table, remote.client_id, localRow, meta)) continue
    if (!isRemoteNewer(table, remote.client_id, remote.client_updated_at, meta)) continue
    result[at] = remote
    changed += 1
    if (remote.client_updated_at) meta.remoteTimestamps[key] = remote.client_updated_at
  }

  return { rows: result, changed }
}

function numericId(clientId: string, fallback: number): number {
  const parsed = Number(clientId)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return fallback
}

function assembleDay(
  row: DayRow,
  prideRows: PrideRow[],
  gratitudeRows: GratitudeRow[],
  fallbackId: number
): Day {
  const prides: PrideEntry[] = [...prideRows]
    .sort((a, b) => a.position - b.position)
    .map((pride) => ({
      num: pride.num || '01',
      text: pride.text,
      scale: Math.min(10, Math.max(0, pride.scale)),
      overcome: Math.min(3, Math.max(0, pride.overcome)) as 0 | 1 | 2 | 3,
      visibility: asVisibility(pride.visibility),
    }))

  const gratitudes: (string | GratitudeEntry)[] = [...gratitudeRows]
    .sort((a, b) => a.position - b.position)
    .map((gratitude) => {
      const rating = Math.min(10, Math.max(0, gratitude.rating))
      if (!gratitude.num && rating === 10) return gratitude.text
      return { num: gratitude.num ?? undefined, text: gratitude.text, rating }
    })

  return {
    id: numericId(row.client_id, fallbackId),
    title: row.title || 'Запись дня',
    tags: asStringArray(row.tags),
    prides,
    gratitudes,
    photos: asStringArray(row.photos).length > 0 ? asStringArray(row.photos) : undefined,
    dateISO: row.date_iso ?? undefined,
    status: row.status === 'missed' ? 'missed' : 'normal',
    visibility: asVisibility(row.visibility),
  }
}

const ACHIEVEMENT_CATEGORIES: AchievementCategoryId[] = ['sport-record', 'business', 'education', 'discipline']

function asCategory(value: unknown): AchievementCategoryId {
  return typeof value === 'string' && (ACHIEVEMENT_CATEGORIES as string[]).includes(value)
    ? (value as AchievementCategoryId)
    : 'discipline'
}

function assembleAchievement(row: AchievementRow): VerifiedAchievement {
  const status =
    row.status === 'submitted' || row.status === 'verified' || row.status === 'rejected'
      ? row.status
      : 'draft'
  return {
    id: row.client_id,
    categoryId: asCategory(row.category_id),
    title: row.title || 'Ачивка',
    topic: row.topic ?? '',
    achievedAtISO: row.achieved_at ?? new Date().toISOString(),
    status,
    regulation: (row.regulation as AchievementRegulation | null) ?? null,
    evidence: Array.isArray(row.evidence) ? (row.evidence as AchievementEvidenceFile[]) : [],
    submittedAtISO: row.submitted_at ?? null,
    verifiedAtISO: row.verified_at ?? null,
    reviewerNote: row.reviewer_note ?? null,
    submission: (row.submission as AchievementSubmission | null) ?? null,
    createdAtISO: row.submitted_at ?? new Date().toISOString(),
  }
}

function assembleStory(row: StoryRow): MyStory {
  return {
    id: row.client_id,
    createdAtISO: row.client_updated_at ?? new Date().toISOString(),
    emoji: row.emoji || '✨',
    kicker: row.kicker || 'СТОРИС',
    headline: row.headline ?? '',
    detail: row.detail ?? '',
    from: row.from_color || '#2a1206',
    to: row.to_color || '#7a2f0c',
    accent: row.accent || '#ffa600',
    sourceDayId: row.source_day_id ?? null,
    sourcePrideIndex: row.source_pride_index ?? null,
    backgroundId: row.background_id ?? undefined,
    photo: row.photo ?? null,
    visibility: asVisibility(row.visibility),
  }
}

function assembleComment(row: CommentRow): Comment {
  const persona: CommentPersona = row.persona === 'support' ? 'support' : 'me'
  return {
    id: row.client_id,
    parentId: row.parent_client_id ?? null,
    author: row.author || (persona === 'support' ? 'Огонёк поддержки' : 'Alexei Cerna'),
    initials: row.initials || (persona === 'support' ? '✦' : 'AC'),
    text: row.text ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    likes: Math.max(0, row.likes ?? 0),
    likedByMe: Boolean(row.liked_by_me),
    isMine: Boolean(row.is_mine),
    template: row.template ?? null,
    persona,
  }
}

function assembleMessage(row: MessageRow): ChatMessage {
  return {
    id: row.client_id,
    authorId: row.author_id || MY_CHAT_ID,
    text: row.body ?? '',
    createdAtISO: row.sent_at ?? new Date().toISOString(),
    attachment: (row.attachment as ChatAttachment | null) ?? null,
    reactions: Array.isArray(row.reactions) ? (row.reactions as ChatReaction[]) : [],
    read: Boolean(row.is_read),
    system: Boolean(row.is_system),
  }
}

function assembleProfile(row: ProfileRow, fallback: OgonekProfile): OgonekProfile {
  const str = (value: unknown, fb: string): string =>
    typeof value === 'string' && value.trim() ? value : fb
  return {
    displayName: str(row.display_name, fallback.displayName),
    username: str(row.username, fallback.username).replace(/^@/, ''),
    bio: typeof row.bio === 'string' ? row.bio : fallback.bio,
    city: typeof row.city === 'string' ? row.city : fallback.city,
    website: typeof row.website === 'string' ? row.website : fallback.website,
    joinedLabel: str(row.joined_label, fallback.joinedLabel),
    avatarImage: typeof row.avatar_image === 'string' ? row.avatar_image : fallback.avatarImage,
    avatarColor: str(row.avatar_color, fallback.avatarColor),
    bannerImage: typeof row.banner_image === 'string' ? row.banner_image : fallback.bannerImage,
    bannerPreset: str(row.banner_preset, fallback.bannerPreset),
    socialLinks: Array.isArray(row.social_links)
      ? (row.social_links as ProfileSocialLink[])
      : fallback.socialLinks,
    monthlyGoal: typeof row.monthly_goal === 'string' ? row.monthly_goal : fallback.monthlyGoal,
    monthlyGoalUpdatedAtISO: str(row.monthly_goal_updated_at, fallback.monthlyGoalUpdatedAtISO),
    verified: typeof row.verified === 'boolean' ? row.verified : fallback.verified,
  }
}

export type MergeResult = {
  state: OgonekStoreState
  meta: SyncMeta
  changed: boolean
  applied: number
}

/**
 * Накатывает серверные данные на локальное состояние.
 * Локально изменённые (грязные) строки не перезатираются — «побеждает новое».
 */
export function mergeRemoteDataset(
  local: OgonekStoreState,
  dataset: RemoteDataset,
  userId: string,
  meta: SyncMeta = readSyncMeta()
): MergeResult {
  const nextMeta: SyncMeta = {
    fingerprints: { ...meta.fingerprints },
    remoteTimestamps: { ...meta.remoteTimestamps },
    lastPushedAtISO: meta.lastPushedAtISO,
    lastPulledAtISO: meta.lastPulledAtISO,
  }

  const localDataset = buildRemoteDataset(local, userId)

  let applied = 0

  // ── Профиль ──────────────────────────────────────────────────────────────
  let nextProfile = local.profile
  if (dataset.profile && localDataset.profile) {
    const clientId = dataset.profile.client_id || dataset.profile.id
    const dirty = isLocallyDirty('profiles', clientId, localDataset.profile, nextMeta)
    if (!dirty && isRemoteNewer('profiles', clientId, dataset.profile.client_updated_at, nextMeta)) {
      nextProfile = assembleProfile(dataset.profile, local.profile)
      if (dataset.profile.client_updated_at) {
        nextMeta.remoteTimestamps[metaKey('profiles', clientId)] = dataset.profile.client_updated_at
      }
      applied += 1
    }
  }

  // ── Дни, гордости, благодарности ──────────────────────────────────────────
  const daysMerge = mergeRows('days', localDataset.days, dataset.days, nextMeta)
  const pridesMerge = mergeRows('prides', localDataset.prides, dataset.prides, nextMeta)
  const gratitudesMerge = mergeRows('gratitudes', localDataset.gratitudes, dataset.gratitudes, nextMeta)

  // ── Ачивки, сторис, граф, реакции, комментарии, чаты ───────────────────────
  const achievementsMerge = mergeRows('achievements_verifications', localDataset.achievements, dataset.achievements, nextMeta)
  const storiesMerge = mergeRows('stories', localDataset.stories, dataset.stories, nextMeta)
  const friendshipsMerge = mergeRows('friendships', localDataset.friendships, dataset.friendships, nextMeta)
  const reactionsMerge = mergeRows('reactions', localDataset.reactions, dataset.reactions, nextMeta)
  const commentsMerge = mergeRows('comments', localDataset.comments, dataset.comments, nextMeta)
  const messagesMerge = mergeRows('direct_messages', localDataset.messages, dataset.messages, nextMeta)

  applied +=
    daysMerge.changed +
    pridesMerge.changed +
    gratitudesMerge.changed +
    achievementsMerge.changed +
    storiesMerge.changed +
    friendshipsMerge.changed +
    reactionsMerge.changed +
    commentsMerge.changed +
    messagesMerge.changed

  const profileChanged = nextProfile !== local.profile
  if (applied === 0 && !profileChanged) {
    return { state: local, meta: nextMeta, changed: false, applied: 0 }
  }

  // ── Пересборка дней ───────────────────────────────────────────────────────
  const localDayIds = new Map<string, number>()
  for (const day of local.days) localDayIds.set(String(day.id), day.id)

  const pridesByDay = new Map<string, PrideRow[]>()
  for (const pride of pridesMerge.rows) {
    const bucket = pridesByDay.get(pride.day_client_id) ?? []
    bucket.push(pride)
    pridesByDay.set(pride.day_client_id, bucket)
  }
  const gratsByDay = new Map<string, GratitudeRow[]>()
  for (const gratitude of gratitudesMerge.rows) {
    const bucket = gratsByDay.get(gratitude.day_client_id) ?? []
    bucket.push(gratitude)
    gratsByDay.set(gratitude.day_client_id, bucket)
  }

  const days: Day[] = daysMerge.rows.map((row, index) =>
    assembleDay(
      row,
      pridesByDay.get(row.client_id) ?? [],
      gratsByDay.get(row.client_id) ?? [],
      localDayIds.get(row.client_id) ?? index + 1
    )
  )
  days.sort((a, b) => {
    const ta = a.dateISO ? new Date(a.dateISO).getTime() : a.id * 86_400_000
    const tb = b.dateISO ? new Date(b.dateISO).getTime() : b.id * 86_400_000
    return tb - ta
  })

  // ── Верифицированные ачивки ───────────────────────────────────────────────
  const verifiedAchievements = achievementsMerge.rows.map(assembleAchievement)

  // ── Личные сторис ─────────────────────────────────────────────────────────
  const myStories = storiesMerge.rows
    .map(assembleStory)
    .sort((a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime())
    .slice(0, 30)

  // ── Социальный граф ───────────────────────────────────────────────────────
  const friendIds: string[] = []
  const followingIds: string[] = []
  const incomingFriendRequests: string[] = []
  const outgoingFriendRequests: string[] = []
  const dismissedSuggestions: string[] = []
  for (const row of friendshipsMerge.rows) {
    switch (row.status) {
      case 'friend':
        friendIds.push(row.addressee_id)
        followingIds.push(row.addressee_id)
        break
      case 'following':
        followingIds.push(row.addressee_id)
        break
      case 'incoming-request':
        incomingFriendRequests.push(row.addressee_id)
        break
      case 'outgoing-request':
        outgoingFriendRequests.push(row.addressee_id)
        break
      case 'dismissed':
        dismissedSuggestions.push(row.addressee_id)
        break
      default:
        break
    }
  }

  // ── Реакции ───────────────────────────────────────────────────────────────
  const dayReactions: ReactionCounts = {}
  const myReactions: Record<string, string[]> = {}
  for (const row of reactionsMerge.rows) {
    if (row.count > 0) {
      const bucket = dayReactions[row.target_key] ?? {}
      bucket[row.emoji_id] = row.count
      dayReactions[row.target_key] = bucket
    }
    if (row.mine) {
      const list = myReactions[row.target_key] ?? []
      if (!list.includes(row.emoji_id)) list.push(row.emoji_id)
      myReactions[row.target_key] = list
    }
  }

  // ── Комментарии ───────────────────────────────────────────────────────────
  const comments: OgonekStoreState['comments'] = {}
  for (const row of commentsMerge.rows) {
    const list = comments[row.target_key] ?? []
    list.push(assembleComment(row))
    comments[row.target_key] = list
  }
  for (const target of Object.keys(comments)) {
    comments[target].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  // ── Переписки ─────────────────────────────────────────────────────────────
  const chatThreads: ChatThreads = { ...(local.chatThreads ?? {}) }
  for (const row of messagesMerge.rows) {
    const thread: ChatThreadState =
      chatThreads[row.thread_key] ?? { messages: [], readAtISO: null, muted: false, pinned: false, draft: '' }
    if (!thread.messages.some((m) => m.id === row.client_id)) {
      const messages = [...thread.messages, assembleMessage(row)].sort(
        (a, b) => new Date(a.createdAtISO).getTime() - new Date(b.createdAtISO).getTime()
      )
      chatThreads[row.thread_key] = { ...thread, messages }
    }
  }

  const unique = (ids: string[]): string[] => Array.from(new Set(ids))

  const state: OgonekStoreState = {
    ...local,
    days,
    profile: nextProfile,
    verifiedAchievements,
    myStories,
    friendIds: unique(friendIds),
    followingIds: unique(followingIds),
    incomingFriendRequests: unique(incomingFriendRequests),
    outgoingFriendRequests: unique(outgoingFriendRequests),
    dismissedSuggestions: unique(dismissedSuggestions),
    dayReactions,
    myReactions,
    comments,
    chatThreads,
  }

  return { state, meta: nextMeta, changed: true, applied }
}

/* ══════════════════════════════════════════════════════════════════════════
   PULL: ЗАГРУЗКА СЕРВЕРНОГО СНИМКА
   ══════════════════════════════════════════════════════════════════════════ */

type RawSnapshot = Partial<{
  profile: unknown
  days: unknown
  prides: unknown
  gratitudes: unknown
  achievements_verifications: unknown
  stories: unknown
  friendships: unknown
  reactions: unknown
  comments: unknown
  direct_messages: unknown
}>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizeSnapshot(raw: RawSnapshot | null): RemoteDataset {
  if (!raw) {
    return {
      profile: null,
      days: [],
      prides: [],
      gratitudes: [],
      achievements: [],
      stories: [],
      friendships: [],
      reactions: [],
      comments: [],
      messages: [],
    }
  }
  return {
    profile: (raw.profile && typeof raw.profile === 'object' ? (raw.profile as ProfileRow) : null),
    days: asArray<DayRow>(raw.days),
    prides: asArray<PrideRow>(raw.prides),
    gratitudes: asArray<GratitudeRow>(raw.gratitudes),
    achievements: asArray<AchievementRow>(raw.achievements_verifications),
    stories: asArray<StoryRow>(raw.stories),
    friendships: asArray<FriendshipRow>(raw.friendships),
    reactions: asArray<ReactionRow>(raw.reactions),
    comments: asArray<CommentRow>(raw.comments),
    messages: asArray<MessageRow>(raw.direct_messages),
  }
}

/** Тянет снимок пользователя. Сначала RPC ogonok_pull_snapshot, затем fallback-выборки. */
export async function pullRemote(client: SupabaseRestClient, userId: string): Promise<RemoteDataset | null> {
  const rpc = await client.rpc<RawSnapshot>('ogonok_pull_snapshot')
  if (rpc.ok && rpc.data && typeof rpc.data === 'object') {
    return normalizeSnapshot(rpc.data)
  }

  const scope = `user_id=eq.${encodeURIComponent(userId)}&select=*`
  const [profile, days, prides, gratitudes, achievements, stories, friendships, reactions, comments, messages] =
    await Promise.all([
      client.list<ProfileRow>('profiles', `id=eq.${encodeURIComponent(userId)}&select=*`),
      client.list<DayRow>('days', scope),
      client.list<PrideRow>('prides', scope),
      client.list<GratitudeRow>('gratitudes', scope),
      client.list<AchievementRow>('achievements_verifications', scope),
      client.list<StoryRow>('stories', scope),
      client.list<FriendshipRow>('friendships', scope),
      client.list<ReactionRow>('reactions', scope),
      client.list<CommentRow>('comments', scope),
      client.list<MessageRow>('direct_messages', scope),
    ])

  const failed =
    !days.ok || !prides.ok || !gratitudes.ok || !achievements.ok || !stories.ok ||
    !friendships.ok || !reactions.ok || !comments.ok || !messages.ok
  if (failed) return null

  return {
    profile: profile.ok ? (profile.data?.[0] ?? null) : null,
    days: days.data ?? [],
    prides: prides.data ?? [],
    gratitudes: gratitudes.data ?? [],
    achievements: achievements.data ?? [],
    stories: stories.data ?? [],
    friendships: friendships.data ?? [],
    reactions: reactions.data ?? [],
    comments: comments.data ?? [],
    messages: messages.data ?? [],
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ДВИЖОК СИНХРОНИЗАЦИИ: PUSH + PULL
   ══════════════════════════════════════════════════════════════════════════ */

export type SyncResult = {
  ok: boolean
  phase: SupabaseSyncPhase
  pushed: number
  deleted: number
  pulled: number
  changed: boolean
  state?: OgonekStoreState
  error?: string
  atISO: string
}

function nowISO(): string {
  return new Date().toISOString()
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

/** Отправляет в облако только реально изменившиеся строки и удаления */
export async function pushSnapshot(
  client: SupabaseRestClient,
  state: OgonekStoreState,
  userId: string,
  meta: SyncMeta = readSyncMeta()
): Promise<{ ok: boolean; pushed: number; deleted: number; error?: string; meta: SyncMeta }> {
  const dataset = buildRemoteDataset(state, userId)
  const plan = buildPushPlan(dataset, meta)
  const nextMeta: SyncMeta = {
    fingerprints: { ...meta.fingerprints },
    remoteTimestamps: { ...meta.remoteTimestamps },
    lastPushedAtISO: meta.lastPushedAtISO,
    lastPulledAtISO: meta.lastPulledAtISO,
  }

  const timestamp = nowISO()
  let pushed = 0
  let deleted = 0

  const entries = datasetEntries(dataset)
  const fingerprintsByTable = new Map<SupabaseTable, Map<string, string>>()
  for (const table of TABLE_ORDER) {
    const map = new Map<string, string>()
    for (const row of entries[table]) map.set(row.client_id, hashRow(row))
    fingerprintsByTable.set(table, map)
  }

  for (const table of TABLE_ORDER) {
    const rows = plan.upserts[table]
    if (!rows || rows.length === 0) continue
    const payload = rows.map((row) => withUser(row, table, userId, timestamp))
    const res = await client.upsert(table, payload, ON_CONFLICT[table])
    if (!res.ok) {
      return { ok: false, pushed, deleted, error: res.error ?? `Не удалось записать ${table}`, meta: nextMeta }
    }
    pushed += payload.length
    const map = fingerprintsByTable.get(table)
    if (map) {
      for (const row of entries[table]) {
        const fingerprint = map.get(row.client_id)
        if (fingerprint) nextMeta.fingerprints[metaKey(table, row.client_id)] = fingerprint
      }
    }
  }

  for (const op of plan.deletes) {
    const res = await client.deleteEq(op.table, deleteFilters(op.table, op.clientId, userId))
    if (!res.ok) {
      return { ok: false, pushed, deleted, error: res.error ?? `Не удалось удалить строку из ${op.table}`, meta: nextMeta }
    }
    delete nextMeta.fingerprints[metaKey(op.table, op.clientId)]
    delete nextMeta.remoteTimestamps[metaKey(op.table, op.clientId)]
    deleted += 1
  }

  nextMeta.lastPushedAtISO = timestamp
  return { ok: true, pushed, deleted, meta: nextMeta }
}

export type SyncOptions = {
  /** Принудительно выполнить pull даже без локальных изменений */
  pull?: boolean
}

/**
 * Полный цикл синхронизации: гарантирует сессию, отправляет дифф и вливает серверные данные.
 * Полностью безопасен офлайн: без сети или без ключей возвращает управляемый результат.
 */
export async function syncWithSupabase(
  state: OgonekStoreState,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const atISO = nowISO()
  const config = readSupabaseConfig()

  if (!config) {
    return {
      ok: false,
      phase: 'disabled',
      pushed: 0,
      deleted: 0,
      pulled: 0,
      changed: false,
      atISO,
      error: 'Ключи Supabase не заданы',
    }
  }
  if (!isOnline()) {
    return {
      ok: false,
      phase: 'offline',
      pushed: 0,
      deleted: 0,
      pulled: 0,
      changed: false,
      atISO,
      error: 'Нет сети — изменения сохранены локально',
    }
  }

  updateStatus({ phase: 'syncing', message: 'Синхронизация с облаком…' })

  const ensured = await ensureSession(config)
  if (!ensured.ok) {
    updateStatus({ phase: 'error', authenticated: false, message: ensured.error, lastError: ensured.error })
    return { ok: false, phase: 'error', pushed: 0, deleted: 0, pulled: 0, changed: false, atISO, error: ensured.error }
  }
  const session = ensured.session
  writeSession(session)
  const client = new SupabaseRestClient(config, session.accessToken)

  const meta = readSyncMeta()
  const push = await pushSnapshot(client, state, session.userId, meta)
  if (!push.ok) {
    writeSyncMeta(push.meta)
    updateStatus({
      phase: 'error',
      authenticated: true,
      userId: session.userId,
      email: session.email,
      anonymous: session.anonymous,
      lastError: push.error ?? 'Ошибка отправки',
      message: push.error ?? 'Ошибка отправки',
    })
    return {
      ok: false,
      phase: 'error',
      pushed: push.pushed,
      deleted: push.deleted,
      pulled: 0,
      changed: false,
      atISO,
      error: push.error,
    }
  }

  const remote = await pullRemote(client, session.userId)
  if (!remote) {
    writeSyncMeta({ ...push.meta, lastPushedAtISO: atISO })
    updateStatus({
      phase: 'error',
      authenticated: true,
      userId: session.userId,
      email: session.email,
      anonymous: session.anonymous,
      lastPushed: push.pushed,
      lastError: 'Не удалось загрузить серверный снимок',
      message: 'Отправлено, но pull не удался',
    })
    return {
      ok: false,
      phase: 'error',
      pushed: push.pushed,
      deleted: push.deleted,
      pulled: 0,
      changed: false,
      atISO,
      error: 'Не удалось загрузить серверный снимок',
    }
  }

  const merged = mergeRemoteDataset(state, remote, session.userId, push.meta)
  const nextMeta: SyncMeta = { ...merged.meta, lastPulledAtISO: atISO }
  writeSyncMeta(nextMeta)

  const pulled =
    remote.days.length +
    remote.prides.length +
    remote.gratitudes.length +
    remote.achievements.length +
    remote.stories.length +
    remote.friendships.length +
    remote.reactions.length +
    remote.comments.length +
    remote.messages.length

  updateStatus({
    phase: 'synced',
    authenticated: true,
    userId: session.userId,
    email: session.email,
    anonymous: session.anonymous,
    lastSyncAtISO: atISO,
    lastPushAtISO: atISO,
    lastPullAtISO: atISO,
    lastPushed: push.pushed,
    lastPulled: pulled,
    pendingChanges: 0,
    lastError: null,
    message: merged.changed
      ? `Синхронизировано: +${merged.applied} изменений из облака`
      : 'Всё синхронизировано',
  })

  return {
    ok: true,
    phase: 'synced',
    pushed: push.pushed,
    deleted: push.deleted,
    pulled,
    changed: merged.changed,
    state: merged.changed ? merged.state : undefined,
    atISO,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ПОДКЛЮЧЕНИЕ / ОТКЛЮЧЕНИЕ ИЗ ИНТЕРФЕЙСА
   ══════════════════════════════════════════════════════════════════════════ */

export type ConnectResult = { ok: boolean; error?: string; anonymous?: boolean }

/** Подключение: сохраняет ключи и выполняет первый обмен */
export async function connectSupabase(
  state: OgonekStoreState,
  input: { url: string; anonKey: string; email?: string; password?: string; anonymous?: boolean }
): Promise<ConnectResult> {
  const config = saveSupabaseConfig({ url: input.url, anonKey: input.anonKey })
  if (!config) return { ok: false, error: 'Проверьте URL проекта и anon-ключ Supabase' }

  let session: SupabaseSession | null = null
  if (input.email && input.password) {
    const res = await signInWithPassword(config, input.email, input.password)
    if (!res.ok) return { ok: false, error: res.error }
    session = res.session
  } else {
    const res = await signInAnonymously(config)
    if (!res.ok) return { ok: false, error: res.error }
    session = res.session
  }

  writeSession(session)
  resetSyncMeta()
  const result = await syncWithSupabase(state)
  updateStatus({
    configured: true,
    authenticated: true,
    userId: session.userId,
    email: session.email,
    anonymous: session.anonymous,
    phase: result.ok ? 'synced' : result.phase,
    message: result.ok ? 'Подключено к Supabase' : result.error ?? 'Подключено, ждём синхронизации',
  })
  return { ok: result.ok, error: result.error, anonymous: session.anonymous }
}

/** Отключение: выходит из сессии и очищает runtime-ключи (данные остаются локально) */
export async function disconnectSupabase(options: { forgetKeys?: boolean } = {}): Promise<void> {
  const config = readSupabaseConfig()
  const session = readSession()
  if (config && session) await signOutSession(config, session)
  writeSession(null)
  resetSyncMeta()
  if (options.forgetKeys) clearSupabaseConfig()
  updateStatus({
    phase: readSupabaseConfig() ? 'ready' : 'disabled',
    authenticated: false,
    userId: null,
    email: null,
    anonymous: false,
    lastError: null,
    message: readSupabaseConfig() ? 'Отключено от аккаунта Supabase' : 'Облако выключено',
  })
}

/* ══════════════════════════════════════════════════════════════════════════
   СОСТОЯНИЕ СИНХРОНИЗАЦИИ (подписка для UI)
   ══════════════════════════════════════════════════════════════════════════ */

function computeInitialStatus(): SupabaseSyncState {
  const config = readSupabaseConfig()
  const session = readSession()
  const online = isOnline()
  return {
    phase: !config ? 'disabled' : online ? 'ready' : 'offline',
    configured: Boolean(config),
    online,
    authenticated: Boolean(session),
    anonymous: session?.anonymous ?? false,
    userId: session?.userId ?? null,
    email: session?.email ?? null,
    lastSyncAtISO: null,
    lastPushAtISO: null,
    lastPullAtISO: null,
    pendingChanges: 0,
    lastPulled: 0,
    lastPushed: 0,
    lastError: null,
    message: !config
      ? 'Добавьте ключи Supabase в .env.local, чтобы включить облако'
      : online
        ? 'Готово к синхронизации'
        : 'Офлайн — изменения сохраняются локально',
  }
}

let syncStatus: SupabaseSyncState | null = null
const statusListeners = new Set<(status: SupabaseSyncState) => void>()

export function getSyncStatus(): SupabaseSyncState {
  if (!syncStatus) syncStatus = computeInitialStatus()
  return syncStatus
}

function setStatus(next: SupabaseSyncState): void {
  syncStatus = next
  for (const listener of statusListeners) listener(next)
}

function updateStatus(patch: Partial<SupabaseSyncState>): void {
  setStatus({ ...getSyncStatus(), ...patch })
}

export function subscribeSyncStatus(listener: (status: SupabaseSyncState) => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

/** Публично обновляет флаг «онлайн» (используется планировщиком и UI) */
export function refreshOnlineStatus(): SupabaseSyncState {
  const online = isOnline()
  const current = getSyncStatus()
  if (current.online === online) return current
  const next: SupabaseSyncState = {
    ...current,
    online,
    phase:
      current.phase === 'syncing'
        ? current.phase
        : !current.configured
          ? 'disabled'
          : online
            ? current.phase === 'offline'
              ? 'ready'
              : current.phase
            : 'offline',
    message: !current.configured
      ? current.message
      : online
        ? current.phase === 'synced'
          ? 'Готово к синхронизации'
          : current.message
        : 'Офлайн — изменения сохраняются локально',
  }
  setStatus(next)
  return next
}

/* ══════════════════════════════════════════════════════════════════════════
   АВТОСИНХРОНИЗАЦИЯ (offline-first планировщик)
   ══════════════════════════════════════════════════════════════════════════ */

export type AutoSyncOptions = {
  /** Возвращает актуальное локальное состояние */
  getState: () => OgonekStoreState
  /** Вызывается, когда серверные данные изменили локальное состояние */
  onState: (state: OgonekStoreState) => void
  /** Необязательный логгер */
  onLog?: (message: string) => void
  /** Период фоновой синхронизации, мс */
  intervalMs?: number
}

export type AutoSyncHandle = {
  /** Запустить синхронизацию немедленно */
  trigger: () => void
  /** Остановить планировщик и снять листенеры */
  stop: () => void
  /** Идёт ли синхронизация прямо сейчас */
  isRunning: () => boolean
}

/**
 * Запускает бесшовную автосинхронизацию: сразу, затем по таймеру, а также
 * при появлении сети и при возврате на вкладку. Без ключей/сети — no-op.
 */
export function startAutoSync(options: AutoSyncOptions): AutoSyncHandle {
  const intervalMs = options.intervalMs ?? DEFAULT_AUTO_SYNC_INTERVAL_MS
  let stopped = false
  let running = false
  let timer: ReturnType<typeof setInterval> | null = null

  const log = (message: string) => {
    if (options.onLog) options.onLog(message)
  }

  const run = async () => {
    if (stopped || running) return
    const config = readSupabaseConfig()
    if (!config) {
      refreshOnlineStatus()
      return
    }
    if (!isOnline()) {
      refreshOnlineStatus()
      return
    }
    running = true
    try {
      const state = options.getState()
      const result = await syncWithSupabase(state)
      if (result.ok && result.state) options.onState(result.state)
      if (!result.ok && result.error) log(result.error)
    } finally {
      running = false
    }
  }

  const handleOnline = () => {
    refreshOnlineStatus()
    void run()
  }
  const handleOffline = () => {
    refreshOnlineStatus()
  }
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') void run()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)
    timer = setInterval(() => void run(), intervalMs)
    // Первый прогон — отложенно, чтобы не блокировать гидратацию
    setTimeout(() => void run(), 1200)
  }

  refreshOnlineStatus()

  return {
    trigger: () => void run(),
    isRunning: () => running,
    stop: () => {
      stopped = true
      if (timer !== null) clearInterval(timer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    },
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   СТАТИСТИКА И ДИАГНОСТИКА
   ══════════════════════════════════════════════════════════════════════════ */

export type SyncOverview = {
  configured: boolean
  envConfigured: boolean
  runtimeConfigured: boolean
  authenticated: boolean
  anonymous: boolean
  userId: string | null
  pendingChanges: number
  lastPushedAtISO: string | null
  lastPulledAtISO: string | null
  rows: Record<SupabaseTable, number>
}

/** Короткая сводка для панели настроек: что и куда поедет */
export function describeSyncOverview(state: OgonekStoreState): SyncOverview {
  const config = readSupabaseConfig()
  const session = readSession()
  const userId = session?.userId ?? ''
  const dataset = userId ? buildRemoteDataset(state, userId) : buildRemoteDataset(state, 'local-user')
  const meta = readSyncMeta()
  const pendingChanges = userId ? countPendingChanges(state, userId, meta) : 0
  return {
    configured: Boolean(config),
    envConfigured: readEnvConfig() !== null,
    runtimeConfigured: readStoredConfig() !== null,
    authenticated: Boolean(session),
    anonymous: session?.anonymous ?? false,
    userId: session?.userId ?? null,
    pendingChanges,
    lastPushedAtISO: meta.lastPushedAtISO,
    lastPulledAtISO: meta.lastPulledAtISO,
    rows: {
      profiles: dataset.profile ? 1 : 0,
      days: dataset.days.length,
      prides: dataset.prides.length,
      gratitudes: dataset.gratitudes.length,
      achievements_verifications: dataset.achievements.length,
      stories: dataset.stories.length,
      friendships: dataset.friendships.length,
      reactions: dataset.reactions.length,
      comments: dataset.comments.length,
      direct_messages: dataset.messages.length,
    },
  }
}
