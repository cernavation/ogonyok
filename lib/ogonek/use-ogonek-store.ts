'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { getSupabase } from './supabase-client'
import {
  getProfile,
  updateProfileInDb,
  updateProfileLevel,
  getCachedProfileSync,
  clearProfileMemoryCache,
  getEvidenceVaultStatus,
  publishStoryToDb,
  deleteStoryFromDb,
  sendDirectMessageToDb,
  getAllUserDirectMessages,
  getProfilesByIds,
  deleteDirectMessageFromDb,
  deleteDirectMessagesBulkFromDb,
  deleteThreadMessagesFromDb,
  markDirectMessagesAsRead,
  updateDirectMessageReactions,
  updateDirectMessagePin,
  updateDirectMessageBody,
  updateDirectMessagePoll,
  updateDirectMessageTranscript,
  addEvidenceVaultItem,
  toggleEvidenceVaultPin,
  deleteEvidenceVaultItem,
  toggleFriendshipFollow,
  checkFriendshipFollow,
  getFollowing,
  getSocialGraphFromFollows,
  followUser,
  unfollowUser,
  createChatGroupInDb,
  updateChatGroupInDb,
  saveDayBundleRpc,
  loadPridaySystemMessagesDb,
  markPridaySystemMessagesReadDb,
  savePridayMilestoneMessageDb,
  savePridaySupportExchangeDb,
  fetchCommentsForTargets,
  createCommentInDb,
  toggleCommentLikeInDb,
  toggleCommentReactionInDb,
  deleteCommentInDb,
  type DirectMessageRecord,
} from '../supabase/api.ts'
import { enqueueOfflineMutation } from './offline-queue.ts'
import { canScheduleMessage } from './permissions.ts'

export type CurrentUser = {
  id: string
  username: string
  displayName: string
  avatarImage: string | null
  avatarColor: string
  bio: string
  city: string
} | null

let pridayTypingPendingCount = 0
const pridayTypingListeners = new Set<() => void>()

function setPridayTypingDelta(delta: number) {
  pridayTypingPendingCount = Math.max(0, pridayTypingPendingCount + delta)
  pridayTypingListeners.forEach((cb) => cb())
}

function subscribePridayTyping(cb: () => void) {
  pridayTypingListeners.add(cb)
  return () => {
    pridayTypingListeners.delete(cb)
  }
}

export function usePridayTyping(): boolean {
  return useSyncExternalStore(
    subscribePridayTyping,
    () => pridayTypingPendingCount > 0,
    () => false
  )
}
import {
  DEMO_ACCOUNT_PASSWORD,
  accountSnapshotFromProfile,
  createAccount,
  findAccountByEmail,
  isValidEmail,
  normalizeEmail,
  profilePatchFromAccount,
  sanitizeAuthState,
  takenUsernamesOf,
} from './accounts'
import { filterRealComments, parsePostAuthorIdFromTarget } from './comments'
import { getInitials } from './initials'
import { computeAchievementProgress } from './achievement-regulation'
import {
  MODERATION_STATUS_META,
  DEFAULT_MODERATION_INBOX,
  achievementStatusFromModeration,
  appendReviewEvent,
  buildModerationSubmissionPayload,
  createSubmissionRecord,
  isReadyForModeration,
  makeTrackingCode,
} from './achievement-moderation'
import type { ModerationEmailAttachment } from './achievement-moderation'
import {
  DEFAULT_INCOMING_FRIEND_REQUEST_IDS,
  DEFAULT_OUTGOING_FRIEND_REQUEST_IDS,
  getFriend,
} from './friends'
import { evaluatePrideItemHeuristic } from './evaluate-heuristic'
import {
  DEFAULT_MONTHLY_KPIS,
  clampKpiTarget,
  createMonthlyKpi,
  getKpiKind,
  isKpiKind,
  sanitizeMonthlyKpis,
} from './kpi'
import {
  CHAT_MESSAGE_LIMIT,
  DEFAULT_CHAT_FOLDERS,
  DEFAULT_CHAT_SETTINGS,
  MY_CHAT_ID,
  emptyMessengerState,
  emptyThread,
  getDirectThreadKey,
  isGroupThread,
  makeChatMessage,
  pickAutoReply,
  sanitizeChatThreads,
  threadOf,
  totalUnread,
  unreadCount,
} from './messenger'
import {
  PRIDAY_CHAT_ID,
  PRIDAY_THREAD_PEER_META,
  PRIDAY_SUPPORT_CUSTOM_REPLY,
  buildPridayWelcomeMessage,
  computePridayTypingDelayMs,
  ensurePridayThreadInThreads,
  isPridayChat,
  mapPridayRecordToChatMessage,
  matchPridayQuickAction,
} from './priday-system-chat'
import type {
  ChatGroupMeta,
  ChatMessageForward,
  ChatMessageMedia,
  ChatMessageReply,
} from './types'
import {
  applyStepStatus,
  createMorningFocusRecord,
  finalizeEveningReview,
  migrateIntentionsToHistory,
  sanitizeMorningFocusHistory,
} from './morning-focus'
import {
  DEFAULT_PROFILE,
  DEFAULT_STORE_STATE,
  cancelPendingSave,
  clearUserLocalCaches,
  clearUserSessionData,
  loadStore,
  saveStore,
  saveStoreImmediate,
  STORAGE_KEY,
  sanitizeAccent,
  sanitizeChatActiveFriendId,
  sanitizeExploreFollowingIds,
  sanitizeExplorePostIds,
  sanitizeExploreRecentSearches,
  sanitizeFeedDensity,
  sanitizeFontScale,
  sanitizeMyStories,
  sanitizeTheme,
  sanitizeVerifiedAchievements,
  sanitizeViewedStoryIds,
} from './storage'
import type {
  AchievementEvidenceFile,
  AchievementRegulation,
  AchievementStatus,
  AccentId,
  AppSecurityState,
  AuthAccount,
  ChatAttachment,
  ChatMessage,
  ChatMessageType,
  ChatPoll,
  ChatFolder,
  ChatTag,
  ChatSettings,
  ChatThreads,
  LevelHistoryEntry,
  OgonekNotification,
  Comment,
  CommentPersona,
  ComposerDraft,
  ComposerPayload,
  CustomEmoji,
  Day,
  EvidenceItem,
  FeedDensityId,
  FontScaleId,
  GratitudeEntry,
  InteractionAudience,
  ModerationChannel,
  ModerationDelivery,
  ModerationStatus,
  MonthlyKpi,
  KpiKind,
  MyReactions,
  MyStory,
  MorningFocusStepStatus,
  OgonekProfile,
  OgonekStoreState,
  OvercomeLevel,
  PrideEntry,
  PrivacySettings,
  ProfileVisibility,
  ReactionCounts,
  SecurityAuditKind,
  StreakSettings,
  ThemeMode,
  VerifiedAchievement,
  VisibilityLevel,
} from './types'
import { withGratitudeRating } from './reactions'
import {
  DEFAULT_SECURITY_STATE,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PIN_LENGTH,
  appendSecurityEvent,
  attemptsLeft,
  computeLockout,
  generateSalt,
  hasAccountPassword,
  hasSecurityPin,
  hashSecret,
  isValidPassword,
  isValidPin,
  makeSecurityEvent,
  nextFailedAttemptState,
  sanitizeSecurityState,
  verifySecret,
} from './security'
import {
  sanitizeDismissedSuggestions,
  sanitizeFollowingIds,
  sanitizeFriendIds,
  sanitizeFriendRequestIds,
  sanitizeProfile,
} from './storage'
import {
  DEFAULT_PRIVACY,
  sanitizePrivacySettings,
} from './privacy'
import {
  DEFAULT_STREAK_SETTINGS,
  calculateStreak,
  sanitizeStreakSettings,
} from './streak'
import { DEFAULT_VISIBILITY, normalizeVisibility } from './visibility'

let cachedState: OgonekStoreState = DEFAULT_STORE_STATE
let isInitialized = false
let hasInitializedSupabaseSync = false
let inFlightSessionSync: Promise<boolean> | null = null

async function syncEvidenceVaultForUser(userId: string): Promise<void> {
  if (!userId || userId.startsWith('anon-') || userId.startsWith('acct-guest')) return
  try {
    const res = await getEvidenceVaultStatus(userId)
    if (!res.ok) return
    const activeId = cachedState.auth?.activeAccountId
    if (activeId && activeId !== userId) return

    const mapped = res.items.map((v) => ({
      id: v.client_id || v.id,
      title: v.title,
      description: v.description,
      date: v.date,
      category: v.category,
      pinned: Boolean(v.pinned),
    }))
    const favs = mapped.filter((x) => x.pinned).map((x) => x.id)
    cachedState = {
      ...cachedState,
      evidenceItems: mapped,
      evidenceFavorites: favs,
    }
    saveStoreImmediate(cachedState)
    emitChange()
  } catch {}
}

async function hydrateStateFromSupabaseSession(
  client: NonNullable<ReturnType<typeof getSupabase>>,
  session: { user: any }
): Promise<boolean> {
  if (!session?.user) return false
  const userId = session.user.id
  const userMeta = session.user.user_metadata || {}
  const username = userMeta.username || session.user.email?.split('@')[0] || 'user'
  const displayName = userMeta.display_name || username

  const prevUserId = cachedState.auth?.activeAccountId
  const prevUsername = cachedState.profile?.username?.toLowerCase()
  const isAccountSwitch = Boolean(
    (prevUserId && prevUserId !== userId) ||
      (prevUsername &&
        prevUsername !== 'guest' &&
        prevUsername !== 'user' &&
        prevUsername !== username.toLowerCase())
  )

  if (isAccountSwitch) {
    cancelPendingSave()
    clearUserLocalCaches({ includeAuthTokens: false })
    clearProfileMemoryCache()
    cachedState = clearUserSessionData(cachedState)
  }

  let avatarImage = isAccountSwitch ? null : cachedState.profile.avatarImage
  let bannerImage = isAccountSwitch ? null : cachedState.profile.bannerImage
  let dbProfile: any = null
  let userLevel = isAccountSwitch
    ? 1
    : cachedState.profile.difficultyLevel || cachedState.profile.level || 1
  const isCerna = username.toLowerCase() === 'cernavation'
  let dbSubscriptionTier: 'free' | 'pro' | 'premium' | 'ultra' = isCerna ? 'ultra' : 'free'
  let dbSubscriptionExpiresAt: string | null = null
  let avatarColor = isAccountSwitch ? '#FF5C00' : cachedState.profile.avatarColor || '#FF5C00'

  try {
    const res = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    dbProfile = res.data
    if (dbProfile) {
      if (dbProfile.avatar_image || dbProfile.avatar_url) {
        avatarImage = dbProfile.avatar_image || dbProfile.avatar_url
      }
      if (dbProfile.avatar_color) avatarColor = dbProfile.avatar_color
      if (dbProfile.banner_image || dbProfile.cover_url) {
        bannerImage = dbProfile.banner_image || dbProfile.cover_url
      }
      userLevel = dbProfile.level || dbProfile.settings?.level || dbProfile.difficulty_level || userLevel
      if (dbProfile.subscription_tier) {
        dbSubscriptionTier = dbProfile.subscription_tier
      }
      if (dbProfile.subscription_expires_at) {
        dbSubscriptionExpiresAt = dbProfile.subscription_expires_at
      } else if (dbProfile.subscription_valid_until) {
        dbSubscriptionExpiresAt = dbProfile.subscription_valid_until
      }
    }
  } catch {}

  if (isCerna) {
    dbSubscriptionTier = 'ultra'
  }

  const nowISO = new Date().toISOString()
  const existing = cachedState.auth.accounts.find((a) => a.id === userId)
  let account: AuthAccount
  if (existing) {
    account = {
      ...existing,
      lastActiveISO: nowISO,
      snapshot: {
        ...existing.snapshot,
        username,
        displayName: dbProfile?.display_name || displayName,
        avatarImage,
        bannerImage,
        subscription_tier: dbSubscriptionTier,
        subscription_expires_at: dbSubscriptionExpiresAt,
        subscription_valid_until: dbSubscriptionExpiresAt,
        verified: dbProfile?.verified ?? (isCerna ? true : existing.snapshot.verified),
      },
    }
  } else {
    account = createAccount({
      provider: 'email',
      displayName,
      username,
      email: session.user.email,
      verified: isCerna ? true : (dbProfile?.verified ?? true),
      now: new Date(nowISO),
    })
    account.id = userId
    account.snapshot.avatarImage = avatarImage
    account.snapshot.bannerImage = bannerImage
    account.snapshot.subscription_tier = dbSubscriptionTier
    account.snapshot.subscription_expires_at = dbSubscriptionExpiresAt
    account.snapshot.subscription_valid_until = dbSubscriptionExpiresAt
  }

  cachedState = {
    ...cachedState,
    chatThreads: ensurePridayThreadInThreads(cachedState.chatThreads),
    profile: sanitizeProfile({
      ...cachedState.profile,
      username,
      displayName: account.snapshot.displayName,
      avatarImage,
      avatarColor,
      bannerImage,
      coverUrl: bannerImage,
      level: userLevel,
      difficultyLevel: userLevel,
      verified: isCerna ? true : (dbProfile?.verified ?? cachedState.profile.verified),
      subscription_tier: dbSubscriptionTier,
      subscription_expires_at: dbSubscriptionExpiresAt,
      subscription_valid_until: dbSubscriptionExpiresAt,
    }),
    privacy: dbProfile
      ? sanitizePrivacySettings({
          ...(cachedState.privacy ?? DEFAULT_PRIVACY),
          ...(dbProfile.privacy && typeof dbProfile.privacy === 'object' ? dbProfile.privacy : {}),
          ...(dbProfile.who_can_find ? { whoCanFind: dbProfile.who_can_find } : {}),
          ...(dbProfile.who_can_message ? { whoCanMessage: dbProfile.who_can_message } : {}),
          ...(dbProfile.who_can_call ? { whoCanCall: dbProfile.who_can_call } : {}),
          ...(dbProfile.who_can_see_online ? { whoCanSeeOnline: dbProfile.who_can_see_online } : {}),
          ...(dbProfile.default_day_visibility ? { defaultDayVisibility: dbProfile.default_day_visibility } : {}),
          ...(typeof dbProfile.is_hidden_from_search === 'boolean'
            ? { isHiddenFromSearch: dbProfile.is_hidden_from_search }
            : {}),
          ...(dbProfile.allow_messages_from ? { allowMessagesFrom: dbProfile.allow_messages_from } : {}),
          ...(dbProfile.allow_group_invites_from
            ? { allowGroupInvitesFrom: dbProfile.allow_group_invites_from }
            : {}),
        })
      : cachedState.privacy,
    auth: {
      ...cachedState.auth,
      accounts: [
        ...cachedState.auth.accounts.filter(
          (a) => a.id !== userId && a.snapshot.username?.toLowerCase() !== username.toLowerCase()
        ),
        account,
      ],
      activeAccountId: userId,
      signedIn: true,
      updatedAtISO: nowISO,
    },
  }
  saveStore(cachedState, undefined, true)
  emitChange()
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('ogonek:auth-hydrated', { detail: { userId } }))
    } catch {}
  }
  void syncEvidenceVaultForUser(userId)
  return true
}

/**
 * Awaits active Supabase session verification & hydrates local auth store
 * so page reloads on any tab stay inside the authenticated account.
 */
export async function syncSupabaseAuthNow(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  getSnapshot()
  if (inFlightSessionSync) return inFlightSessionSync

  inFlightSessionSync = (async () => {
    try {
      const client = getSupabase()
      if (!client) {
        return Boolean(cachedState.auth?.signedIn && cachedState.auth?.activeAccountId)
      }
      const { data: { session }, error } = await client.auth.getSession()
      if (session?.user) {
        return await hydrateStateFromSupabaseSession(client, session)
      }
      if (!error && (!cachedState.auth.signedIn || cachedState.auth.accounts.length === 0)) {
        cachedState = clearUserSessionData(cachedState)
        saveStoreImmediate(cachedState)
        emitChange()
        return false
      }
      return Boolean(cachedState.auth?.signedIn && cachedState.auth?.activeAccountId)
    } catch {
      return Boolean(cachedState.auth?.signedIn && cachedState.auth?.activeAccountId)
    } finally {
      inFlightSessionSync = null
    }
  })()

  return inFlightSessionSync
}

function initSupabaseSessionSync() {
  if (hasInitializedSupabaseSync || typeof window === 'undefined') return
  hasInitializedSupabaseSync = true

  try {
    const client = getSupabase()
    if (!client) return

    void syncSupabaseAuthNow()

    client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        cancelPendingSave()
        clearProfileMemoryCache()
        clearUserLocalCaches({ includeAuthTokens: true })
        cachedState = clearUserSessionData(cachedState)
        saveStoreImmediate(cachedState)
        emitChange()
      } else if (
        session?.user &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')
      ) {
        await hydrateStateFromSupabaseSession(client, session)
      }
    })

    // Одноразовая фоновая выгрузка всех локальных дней @cernavation в Supabase
    if (typeof window !== 'undefined') {
      const snap = getSnapshot()
      const isCernavation = (snap.profile?.username || '').toLowerCase() === 'cernavation'
      if (isCernavation && snap.days && snap.days.length > 0) {
        setTimeout(() => {
          autoSyncCernavationDaysToCloud(snap.days, snap.auth?.activeAccountId || undefined)
        }, 1000)
      }
    }
  } catch (err) {
    console.warn('[Ogonek] Supabase session sync failed to initialize:', err)
  }
}

/**
 * САНИТИЗАЦИЯ СТЕЙТА МЕССЕНДЖЕРА ПРИ ЗАГРУЗКЕ:
 * Если данные из localStorage повреждены, содержат undefined/null в ключах или не являются валидным объектом —
 * автоматически очищает их или сбрасывает на emptyMessengerState().
 */
function ensureSanitizedMessengerState(state: OgonekStoreState): OgonekStoreState {
  try {
    let threads = state.chatThreads
    let needsUpdate = false

    if (!threads || typeof threads !== 'object' || Array.isArray(threads)) {
      threads = {}
      needsUpdate = true
    } else {
      const cleanThreads: ChatThreads = {}
      for (const [key, t] of Object.entries(threads)) {
        const cleanKey = typeof key === 'string' ? key.trim() : ''
        if (
          !cleanKey ||
          cleanKey === 'undefined' ||
          cleanKey === 'null' ||
          cleanKey === 'ilonmusk-seed' ||
          cleanKey === 'cernavation-seed' ||
          !t ||
          typeof t !== 'object'
        ) {
          needsUpdate = true
          continue
        }
        const threadObj = t as any
        cleanThreads[cleanKey] = {
          ...threadObj,
          messages: Array.isArray(threadObj.messages) ? threadObj.messages : [],
          draft: typeof threadObj.draft === 'string' ? threadObj.draft : '',
          muted: Boolean(threadObj.muted),
          pinned: Boolean(threadObj.pinned),
        }
      }
      threads = cleanThreads
    }

    let activeId = state.chatActiveFriendId
    if (
      activeId === 'undefined' ||
      activeId === 'null' ||
      activeId === 'ilonmusk-seed' ||
      activeId === 'cernavation-seed' ||
      (typeof activeId === 'string' && !activeId.trim())
    ) {
      activeId = null
      needsUpdate = true
    }

    const folders = Array.isArray(state.chatFolders) && state.chatFolders.length > 0
      ? state.chatFolders
      : DEFAULT_CHAT_FOLDERS

    const activeFolderId = typeof state.chatActiveFolderId === 'string' && state.chatActiveFolderId.trim()
      ? state.chatActiveFolderId
      : 'all'

    const tags = Array.isArray(state.chatTags) ? state.chatTags : []
    const settings = state.chatSettings && typeof state.chatSettings === 'object'
      ? { ...DEFAULT_CHAT_SETTINGS, ...state.chatSettings }
      : { ...DEFAULT_CHAT_SETTINGS }

    if (needsUpdate || !state.chatFolders || !state.chatSettings) {
      const nextState: OgonekStoreState = {
        ...state,
        chatThreads: threads,
        chatActiveFriendId: activeId,
        chatFolders: folders,
        chatActiveFolderId: activeFolderId,
        chatTags: tags,
        chatSettings: settings,
      }
      try {
        saveStore(nextState)
      } catch {}
      return nextState
    }

    return state
  } catch (err) {
    console.error('[Ogonek] Error sanitizing messenger state, resetting to emptyMessengerState():', err)
    const empty = emptyMessengerState()
    const nextState: OgonekStoreState = {
      ...state,
      ...empty,
    }
    try {
      saveStore(nextState)
    } catch {}
    return nextState
  }
}

export function getSnapshot(): OgonekStoreState {
  if (typeof window === 'undefined') {
    return DEFAULT_STORE_STATE
  }
  if (!isInitialized) {
    cachedState = loadStore()
    cachedState = migrateSplitDays(cachedState)
    cachedState = ensureSanitizedMessengerState(cachedState)
    cachedState = stripLegacyDemoComments(cachedState)
    isInitialized = true
    initSupabaseSessionSync()
  }
  return cachedState
}

export function getServerSnapshot(): OgonekStoreState {
  return DEFAULT_STORE_STATE
}

/**
 * МИГРАЦИЯ СЛИПШИХСЯ ДНЕЙ:
 * Если в любом дне обнаружено более 5 гордостей подряд — он расщепляется
 * на оригинальный день (первые 5) и новый день (следующие 5).
 * Это исправляет баг "дописывания в существующий день".
 */
function migrateSplitDays(state: OgonekStoreState): OgonekStoreState {
  const days = state.days
  let needsMigration = false

  // Check if any day has more than 5 prides (overflow from the old bug)
  for (const day of days) {
    if (day.prides.length > 5) {
      needsMigration = true
      break
    }
  }

  if (!needsMigration) return state

  const newDays: Day[] = []
  let maxId = Math.max(...days.map((d) => d.id), 0)

  for (const day of days) {
    if (day.prides.length <= 5) {
      newDays.push(day)
      continue
    }

    // Split: first 5 prides stay in original day, rest go to a new day
    const originalPrides = day.prides.slice(0, 5).map((p, i) => ({
      ...p,
      num: String(i + 1).padStart(2, '0'),
    }))
    const extraPrides = day.prides.slice(5).map((p, i) => ({
      ...p,
      num: String(i + 1).padStart(2, '0'),
    }))

    const originalGratitudes = day.gratitudes.slice(0, 5)
    const extraGratitudes = day.gratitudes.slice(5)

    // Keep original day intact with first 5
    newDays.push({
      ...day,
      prides: originalPrides,
      gratitudes: originalGratitudes,
    })

    // Create a new day for the overflow (next calendar day)
    maxId = maxId + 1
    const originalDate = day.dateISO ? new Date(day.dateISO) : new Date()
    const nextDate = new Date(originalDate)
    nextDate.setDate(nextDate.getDate() + 1)

    const splitDay: Day = {
      id: maxId,
      title: extraPrides[0]?.text || 'Продолжение дня',
      tags: ['Для тебя', '🔥 Гордости'],
      prides: extraPrides,
      gratitudes: extraGratitudes.length > 0 ? extraGratitudes : [],
      photos: day.photos,
      dateISO: nextDate.toISOString(),
      status: 'normal',
    }
    newDays.push(splitDay)
  }

  // Re-sort: newest first
  newDays.sort((a, b) => {
    const ta = a.dateISO ? new Date(a.dateISO).getTime() : a.id * 86400000
    const tb = b.dateISO ? new Date(b.dateISO).getTime() : b.id * 86400000
    return tb - ta
  })

  const migratedState = { ...state, days: newDays }
  saveStore(migratedState)
  console.info('[Ogonek] Migrated split days: ', newDays.length, 'total days after split')
  return migratedState
}

/**
 * Удаляем устаревшие демо-комментарии бота («Priday поддержки» / #шаблон) из кэша.
 */
function stripLegacyDemoComments(state: OgonekStoreState): OgonekStoreState {
  if (!state.comments || typeof state.comments !== 'object') return state
  let changed = false
  const cleaned: Record<string, Comment[]> = {}
  for (const [target, list] of Object.entries(state.comments)) {
    if (!Array.isArray(list)) continue
    const real = filterRealComments(list)
    if (real.length !== list.length) changed = true
    if (real.length > 0) cleaned[target] = real
  }
  if (!changed) return state
  const nextState: OgonekStoreState = { ...state, comments: cleaned }
  saveStore(nextState)
  return nextState
}

/**
 * Преобразование карточки дня из базы Supabase в модель Day стора
 */
export function mapCloudDayToDay(row: any): Day {
  const dayId = Number(row.client_id || row.day_number || row.id)
  const prides: PrideEntry[] = Array.isArray(row.prides)
    ? [...row.prides]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((p: any) => ({
          num: String(p.num || '01'),
          text: p.text || '',
          scale: Number(p.scale ?? 0),
          overcome: (Number(p.overcome) || 0) as OvercomeLevel,
          visibility: (p.visibility || row.visibility || 'public') as VisibilityLevel,
          groupId: p.group_id || null,
          targetGroupIds: Array.isArray(p.target_group_ids) ? p.target_group_ids : [],
        }))
    : []

  const gratitudes: (string | GratitudeEntry)[] = Array.isArray(row.gratitudes)
    ? [...row.gratitudes]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((g: any) => ({
          num: g.num ? String(g.num) : undefined,
          text: g.text || '',
          rating: Number(g.rating ?? 10),
          visibility: (g.visibility || row.visibility || 'public') as VisibilityLevel,
          groupId: g.group_id || null,
          targetGroupIds: Array.isArray(g.target_group_ids) ? g.target_group_ids : [],
        }))
    : []

  return {
    id: isNaN(dayId) ? 1 : dayId,
    cloudId: typeof row.id === 'string' ? row.id : undefined,
    title: row.title || `День #${dayId}`,
    tags: Array.isArray(row.tags) ? row.tags : [],
    photos: Array.isArray(row.photos) ? row.photos : [],
    dateISO: row.date_iso || new Date().toISOString(),
    status: row.status === 'missed' ? 'missed' : 'normal',
    visibility: (row.visibility || 'public') as VisibilityLevel,
    groupId: row.group_id || null,
    targetGroupIds: Array.isArray(row.target_group_ids) ? row.target_group_ids : [],
    user_id: row.user_id,
    userId: row.user_id,
    attached_targets: row.attached_targets || null,
    attachedTargets: row.attached_targets || null,
    prides,
    gratitudes,
  }
}

/**
 * ОБЯЗАТЕЛЬНЫЙ ФОНОВЫЙ UPSERT ДНЯ В SUPABASE:
 * Каждый вновь созданный или отредактированный день немедленно отправляется в базу Supabase!
 * Таблицы: days, prides, gratitudes.
 * Также обновляет streak_count в public.profiles.
 */
export async function syncDayToSupabase(day: Day, overrideUid?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabase()
    if (!supabase) return { ok: false, error: 'Supabase client unavailable' }
    const snap = getSnapshot()
    const activeAccId = snap.auth?.activeAccountId
    const profileId = (snap.profile as any)?.id
    const username = (snap.profile?.username || '').toLowerCase()
    const uid =
      overrideUid ||
      activeAccId ||
      profileId ||
      (username === 'cernavation' ? '94e9eaf7-ec74-4366-9ce3-7de1e670f52b' : null)

    if (!uid) return { ok: false, error: 'No user ID' }

    const clientId = String(day.id)
    const nowISO = new Date().toISOString()

    const dayRow = {
      user_id: uid,
      client_id: clientId,
      day_number: day.id,
      // FIX: НЕ обрезаем title — schema check(char_length <= 300) защитит от превышения.
      // Первая гордость в title обычно короче 300 символов; если длиннее — обрежем умно по слову.
      title: (() => {
        const raw = day.title || `День #${day.id}`
        if (raw.length <= 300) return raw
        // Обрезаем по границе слова, а не на полуслове
        const cut = raw.slice(0, 297)
        const lastSpace = cut.lastIndexOf(' ')
        return (lastSpace > 200 ? cut.slice(0, lastSpace) : cut) + '…'
      })(),
      tags: Array.isArray(day.tags) ? day.tags : [],
      photos: Array.isArray(day.photos) && day.photos.length > 0 ? day.photos : (day.media_url ? [day.media_url] : []),
      date_iso: day.dateISO || nowISO,
      status: day.status === 'missed' ? 'missed' : 'normal',
      visibility: day.visibility || 'public',
      client_updated_at: nowISO,
    }

    const prideRows = (day.prides || []).map((p, idx) => ({
      user_id: uid,
      day_client_id: clientId,
      client_id: `${clientId}_p_${idx + 1}`,
      position: idx,
      num: String(p.num || idx + 1).padStart(2, '0'),
      text: p.text || '',
      scale: typeof p.scale === 'number' && !isNaN(p.scale) ? p.scale : 7,
      overcome: typeof p.overcome === 'number' && !isNaN(p.overcome) ? p.overcome : 0,
      visibility: p.visibility || day.visibility || 'public',
      client_updated_at: nowISO,
    }))

    const gratitudeRows = (day.gratitudes || []).map((g, idx) => ({
      user_id: uid,
      day_client_id: clientId,
      client_id: `${clientId}_g_${idx + 1}`,
      position: idx,
      num: typeof g === 'object' && g.num ? String(g.num) : String(idx + 1).padStart(2, '0'),
      text: typeof g === 'string' ? g : g?.text || '',
      rating: typeof g === 'object' && typeof g.rating === 'number' && !isNaN(g.rating) ? g.rating : 10,
      client_updated_at: nowISO,
    }))

    // Шаг 17: Оптимизация — сохранение дня со всеми записями и стриком одним атомарным RPC
    const allDays = getSnapshot().days
    const newStreak = calculateStreak(allDays)
    const maxDayNum = allDays.reduce((max, d) => Math.max(max, d.id), day.id)
    const finalStreak = Math.max(newStreak, maxDayNum, allDays.length)

    const bundlePayload = {
      day: dayRow,
      prides: prideRows,
      gratitudes: gratitudeRows,
      streak: finalStreak,
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
    if (isOffline) {
      return { ok: false, error: 'Отсутствует подключение к интернету. Проверьте сеть и повторите попытку.' }
    }

    // ── FIX BUG #1: Последовательная вставка (day → prides → gratitudes) ────
    // Prides и gratitudes имеют FK на days(user_id, client_id).
    // Параллельный Promise.all вызывал FK violation → «зомби-день» без записей.
    // Также: при дубле (повторном нажатии «Записать» для той же даты) upsert
    // по on_conflict='user_id,client_id' безопасно перезаписывает существующий день.

    // Шаг 1: Вставляем/обновляем день
    const dayRes = await supabase.from('days').upsert(dayRow, { onConflict: 'user_id,client_id' })
    if (dayRes?.error) {
      console.error('[Ogonek] Error upserting day to Supabase:', dayRes.error)
      return { ok: false, error: `Ошибка записи дня: ${dayRes.error.message}` }
    }

    // Шаг 2: Вставляем гордости (после дня, чтобы FK не упал)
    if (prideRows.length > 0) {
      const prideRes = await supabase.from('prides').upsert(prideRows, { onConflict: 'user_id,client_id' })
      if (prideRes?.error) {
        console.error('[Ogonek] Error upserting prides to Supabase:', prideRes.error)
        // Откатываем «зомби-день»: удаляем день, если записи не сохранились
        try {
          await supabase.from('days').delete().eq('user_id', uid).eq('client_id', clientId)
        } catch (rollbackErr) {
          console.error('[Ogonek] Rollback failed for zombie day:', rollbackErr)
        }
        return { ok: false, error: `Ошибка записи гордостей: ${prideRes.error.message}` }
      }
    }

    // Шаг 3: Вставляем благодарности (после дня, чтобы FK не упал)
    if (gratitudeRows.length > 0) {
      const gratRes = await supabase.from('gratitudes').upsert(gratitudeRows, { onConflict: 'user_id,client_id' })
      if (gratRes?.error) {
        console.error('[Ogonek] Error upserting gratitudes to Supabase:', gratRes.error)
        // Откатываем: удаляем уже записанные prides и day
        try {
          await supabase.from('prides').delete().eq('user_id', uid).eq('day_client_id', clientId)
          await supabase.from('days').delete().eq('user_id', uid).eq('client_id', clientId)
        } catch (rollbackErr) {
          console.error('[Ogonek] Rollback failed for zombie day:', rollbackErr)
        }
        return { ok: false, error: `Ошибка записи благодарностей: ${gratRes.error.message}` }
      }
    }

    // Шаг 4: Обновляем streak в профиле (best-effort, не критично)
    try {
      await supabase
        .from('profiles')
        .update({
          streak_count: finalStreak,
          streak: finalStreak,
          updated_at: nowISO,
        })
        .eq('id', uid)
    } catch {}

    return { ok: true }
  } catch (err: any) {
    console.error('[Ogonek] Failed to sync day to Supabase:', err)
    return { ok: false, error: err?.message || 'Не удалось сохранить запись в Supabase' }
  }
}

export const saveDayDirectlyToSupabase = syncDayToSupabase

/**
 * Выгрузка всех дней (включая дни из локального хранилища) в Supabase
 */
export async function syncAllDaysToSupabase(days: Day[], overrideUid?: string) {
  try {
    const supabase = getSupabase()
    if (!supabase || !Array.isArray(days) || days.length === 0) return { ok: false }
    const snap = getSnapshot()
    const activeAccId = snap.auth?.activeAccountId
    const profileId = (snap.profile as any)?.id
    const username = (snap.profile?.username || '').toLowerCase()
    const uid =
      overrideUid ||
      activeAccId ||
      profileId ||
      (username === 'cernavation' ? '94e9eaf7-ec74-4366-9ce3-7de1e670f52b' : null)

    if (!uid) return { ok: false }

    const CHUNK_SIZE = 25
    const totalChunks = Math.ceil(days.length / CHUNK_SIZE)
    const nowISO = new Date().toISOString()

    for (let c = 0; c < totalChunks; c++) {
      const chunk = days.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE)

      const daysRows = chunk.map((d) => ({
        user_id: uid,
        client_id: String(d.id),
        day_number: d.id,
        title: ((d.title || `День #${d.id}`).length <= 300
          ? (d.title || `День #${d.id}`)
          : (() => { const r = (d.title || `День #${d.id}`).slice(0, 297); const sp = r.lastIndexOf(' '); return (sp > 200 ? r.slice(0, sp) : r) + '…' })()),
        tags: Array.isArray(d.tags) ? d.tags : [],
        photos: Array.isArray(d.photos) ? d.photos : [],
        date_iso: d.dateISO || nowISO,
        status: d.status === 'missed' ? 'missed' : 'normal',
        visibility: d.visibility || 'public',
        attached_targets: d.attached_targets || (d as any).attachedTargets || null,
        client_updated_at: nowISO,
      }))

      const prideRows = chunk.flatMap((d) =>
        (d.prides || []).map((p, idx) => ({
          user_id: uid,
          day_client_id: String(d.id),
          client_id: `${d.id}_p_${idx + 1}`,
          position: idx,
          num: String(p.num || idx + 1).padStart(2, '0'),
          text: p.text || '',
          scale: typeof p.scale === 'number' && !isNaN(p.scale) ? p.scale : 7,
          overcome: typeof p.overcome === 'number' && !isNaN(p.overcome) ? p.overcome : 0,
          visibility: p.visibility || d.visibility || 'public',
          client_updated_at: nowISO,
        }))
      )

      const gratitudeRows = chunk.flatMap((d) =>
        (d.gratitudes || []).map((g, idx) => ({
          user_id: uid,
          day_client_id: String(d.id),
          client_id: `${d.id}_g_${idx + 1}`,
          position: idx,
          num: typeof g === 'object' && g.num ? String(g.num) : String(idx + 1).padStart(2, '0'),
          text: typeof g === 'string' ? g : g?.text || '',
          rating: typeof g === 'object' && typeof g.rating === 'number' && !isNaN(g.rating) ? g.rating : 10,
          client_updated_at: nowISO,
        }))
      )

      await Promise.all([
        supabase.from('days').upsert(daysRows, { onConflict: 'user_id,client_id' }),
        prideRows.length > 0
          ? supabase.from('prides').upsert(prideRows, { onConflict: 'user_id,client_id' })
          : Promise.resolve(),
        gratitudeRows.length > 0
          ? supabase.from('gratitudes').upsert(gratitudeRows, { onConflict: 'user_id,client_id' })
          : Promise.resolve(),
      ])
    }

    const maxDay = days.reduce((max, d) => Math.max(max, d.id), 0)
    const finalStreak = Math.max(maxDay, days.length, 720)
    await supabase
      .from('profiles')
      .update({
        streak_count: finalStreak,
        streak: finalStreak,
        updated_at: nowISO,
      })
      .eq('id', uid)

    return { ok: true, count: days.length }
  } catch (err) {
    console.error('[Ogonek] Error syncing all days to Supabase:', err)
    return { ok: false }
  }
}

let hasAutoSyncedAllDays = false
export async function autoSyncCernavationDaysToCloud(days: Day[], uid?: string) {
  if (hasAutoSyncedAllDays || !days || days.length === 0) return
  hasAutoSyncedAllDays = true
  const targetUid = uid || '94e9eaf7-ec74-4366-9ce3-7de1e670f52b'
  try {
    await syncAllDaysToSupabase(days, targetUid)
  } catch (err) {
    console.warn('[Ogonek] Auto-sync cernavation days error:', err)
  }
}

const listeners = new Set<() => void>()

export function subscribe(callback: () => void): () => void {
  listeners.add(callback)

  const handleCustom = (e: Event) => {
    const customEvent = e as CustomEvent<OgonekStoreState>
    if (customEvent.detail && typeof customEvent.detail === 'object') {
      cachedState = customEvent.detail
    } else {
      const fresh = loadStore()
      // Никогда не затираем дни при событии без detail, только если это тот же пользователь
      const sameAccount =
        Boolean(fresh.auth?.activeAccountId) &&
        fresh.auth.activeAccountId === cachedState.auth?.activeAccountId
      if (sameAccount && (!fresh.days || fresh.days.length === 0) && cachedState.days && cachedState.days.length > 0) {
        fresh.days = cachedState.days
      }
      cachedState = fresh
    }
    callback()
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === 'ogonyok.v3.store') {
      const fresh = loadStore()
      const sameAccount =
        Boolean(fresh.auth?.activeAccountId) &&
        fresh.auth.activeAccountId === cachedState.auth?.activeAccountId
      if (sameAccount && (!fresh.days || fresh.days.length === 0) && cachedState.days && cachedState.days.length > 0) {
        fresh.days = cachedState.days
      }
      cachedState = fresh
      callback()
    }
  }

  window.addEventListener('ogonek-store-updated', handleCustom)
  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(callback)
    window.removeEventListener('ogonek-store-updated', handleCustom)
    window.removeEventListener('storage', handleStorage)
  }
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

/** Результат операции входа/регистрации/переключения аккаунта */
export type AuthResult = {
  ok: boolean
  accountId?: string
  error?: string
}

// ── МЕМОИЗИРОВАННЫЙ КЭШ СЕССИИ (ZERO LAG) ──────────────────────────────
let memoizedCurrentUser: CurrentUser = null
let memoizedActiveAccountId: string | null = null
let memoizedSignedIn: boolean = false
let memoizedAccountsRef: any = null
let memoizedProfileRef: any = null

export function getMemoizedCurrentUser(state: OgonekStoreState): CurrentUser {
  if (!state.auth?.signedIn || !state.auth?.activeAccountId) {
    memoizedCurrentUser = null
    memoizedActiveAccountId = null
    memoizedSignedIn = false
    memoizedAccountsRef = null
    memoizedProfileRef = null
    return null
  }

  if (
    memoizedCurrentUser &&
    memoizedActiveAccountId === state.auth.activeAccountId &&
    memoizedSignedIn === state.auth.signedIn &&
    memoizedAccountsRef === state.auth.accounts &&
    memoizedProfileRef === state.profile
  ) {
    return memoizedCurrentUser
  }

  const active = state.auth.accounts?.find((a) => a.id === state.auth.activeAccountId)
  if (!active) {
    memoizedCurrentUser = null
    return null
  }

  const username = active.snapshot?.username || state.profile?.username
  const displayName = active.snapshot?.displayName || state.profile?.displayName
  if (!username && !displayName) {
    memoizedCurrentUser = null
    return null
  }

  memoizedCurrentUser = {
    id: active.id,
    username: username || 'user',
    displayName: displayName || username || 'Пользователь',
    avatarImage: active.snapshot?.avatarImage ?? state.profile?.avatarImage ?? null,
    avatarColor: active.snapshot?.avatarColor ?? state.profile?.avatarColor ?? '#ff6b35',
    bio: active.snapshot?.bio ?? state.profile?.bio ?? '',
    city: active.snapshot?.city ?? state.profile?.city ?? '',
  }
  memoizedActiveAccountId = state.auth.activeAccountId
  memoizedSignedIn = state.auth.signedIn
  memoizedAccountsRef = state.auth.accounts
  memoizedProfileRef = state.profile

  return memoizedCurrentUser
}

let memoizedSessionAvatar: string | null = null
let memoizedSessionAvatarRaw: string | null = null

/** Быстрое синхронное чтение аватара из стабильного кэша */
export function getCachedProfileAvatar(): string | null {
  const current = getSnapshot()
  const raw = current.profile?.avatarImage || null
  if (raw === memoizedSessionAvatarRaw && memoizedSessionAvatar !== null) {
    return memoizedSessionAvatar
  }
  memoizedSessionAvatarRaw = raw
  memoizedSessionAvatar = raw
  return raw
}

/** Быстрое синхронное чтение профиля из стабильного кэша */
export function getCachedProfile(): OgonekStoreState['profile'] {
  return getSnapshot().profile
}

/**
 * Селектор стора, возвращающий примитив или стабильный объект.
 * Предотвращает лишние ре-рендеры дерева компонентов при нерелевантных обновлениях.
 */
export function useOgonekSelector<T>(selector: (state: OgonekStoreState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot())
  )
}

/** Примитивный селектор: общее количество дней */
export function useDayCount(): number {
  return useOgonekSelector((s) => s.days?.length || 0)
}

/** Примитивный селектор: текущий стрик */
export function useProfileStreak(): number {
  return useOgonekSelector((s) => Number(s.profile?.streak_count || s.profile?.streak || 0))
}

/** Примитивный селектор: никнейм автора */
export function useProfileUsername(): string {
  return useOgonekSelector((s) => s.profile?.username || 'user')
}

/** Примитивный селектор: отображаемое имя автора */
export function useProfileDisplayName(): string {
  return useOgonekSelector((s) => s.profile?.displayName || 'Пользователь')
}

/** Примитивный селектор: стабильная ссылка на аватар профиля */
export function useProfileAvatar(): string | null {
  return useOgonekSelector((s) => s.profile?.avatarImage || null)
}

/** Примитивный селектор: статус авторизации */
export function useIsSignedIn(): boolean {
  return useOgonekSelector((s) => Boolean(s.auth?.signedIn))
}

/** Примитивный селектор: ID активного аккаунта */
export function useActiveAccountId(): string | null {
  return useOgonekSelector((s) => s.auth?.activeAccountId || null)
}

export function useOgonekStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const currentUser: CurrentUser = useMemo(() => {
    return getMemoizedCurrentUser(state)
  }, [state.auth.signedIn, state.auth.activeAccountId, state.auth.accounts, state.profile])

  const updateStore = useCallback(
    (updater: (prev: OgonekStoreState) => OgonekStoreState, immediate = false) => {
      const current = getSnapshot()
      const next = updater(current)
      cachedState = next
      saveStore(next, undefined, immediate)
      emitChange()
    },
    []
  )

  const addDay = useCallback(
    (day: Day) => {
      updateStore((prev) => ({
        ...prev,
        days: [day, ...prev.days.filter((d) => d.id !== day.id)],
      }))
    },
    [updateStore]
  )

  /**
   * КОНВЕЙЕР +1 ДЕНЬ:
   * Всегда создаёт строго новый день с id = maxId + 1.
   * Дата вычисляется как последняя дата в базе + 1 день.
   * КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО дописывать пункты в существующие дни!
   */
  const addNewDay = useCallback(
    (payload: ComposerPayload, dateISO?: string) => {
      let createdDay: Day | null = null
      updateStore((prev) => {
        const maxId = prev.days.reduce((max, d) => Math.max(max, d.id), 0)

        // Compute next date: last day's date + 1 calendar day
        let computedDate = dateISO
        if (!computedDate) {
          // Find the day with the highest id that has a dateISO
          const latestDay = prev.days.reduce<Day | null>((best, d) => {
            if (!d.dateISO) return best
            if (!best) return d
            return d.id > best.id ? d : best
          }, null)

          const baseDate = latestDay?.dateISO ? new Date(latestDay.dateISO) : new Date()
          const nextDate = new Date(baseDate)
          nextDate.setDate(nextDate.getDate() + 1)
          computedDate = nextDate.toISOString()
        }

        // Защита от дублей дней на одну и ту же дату (например #745, #746 при повторном нажатии «Записать»)
        const targetDateStr = computedDate.slice(0, 10)
        const sameDateDay = prev.days.find((d) => d.dateISO && d.dateISO.slice(0, 10) === targetDateStr)
        const newId = sameDateDay ? sameDateDay.id : maxId + 1

        const newPrideEntries: PrideEntry[] = payload.prides.map((text, idx) => {
          const r = payload.ratings?.[idx]
          const sc = typeof r?.score === 'number' ? r.score : (r?.scale ?? 8)
          return {
            num: String(idx + 1).padStart(2, '0'),
            text,
            scale: Math.max(1, Math.min(10, Math.round(sc))),
            score: sc,
            overcome: r?.overcome ?? 1,
            visibility: normalizeVisibility(
              payload.prideVisibilities?.[idx] ?? payload.visibility ?? DEFAULT_VISIBILITY
            ),
            groupId: payload.prideGroupIds?.[idx] ?? payload.groupId ?? null,
            groupName: payload.prideGroupNames?.[idx] ?? payload.groupName,
            targetGroupIds: payload.targetGroupIds,
          }
        })

        const newGratitudeEntries: (string | GratitudeEntry)[] = payload.gratitudes.map((text, idx) => ({
          num: String(idx + 1).padStart(2, '0'),
          text,
          visibility: normalizeVisibility(
            payload.gratitudeVisibilities?.[idx] ?? payload.visibility ?? DEFAULT_VISIBILITY
          ),
          groupId: payload.gratitudeGroupIds?.[idx] ?? payload.groupId ?? null,
          groupName: payload.gratitudeGroupNames?.[idx] ?? payload.groupName,
          targetGroupIds: payload.targetGroupIds,
        }))

        // Расчёт или передача точного балла дня (например 8.8)
        let exactDayScore = payload.score ?? payload.aiScore
        if (typeof exactDayScore !== 'number' || isNaN(exactDayScore)) {
          const validScores = newPrideEntries
            .map((p) => p.score ?? p.scale)
            .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0)
          if (validScores.length > 0) {
            exactDayScore = Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1))
          }
        }

        const currentUid = prev.auth?.activeAccountId || (prev.profile as any)?.id || prev.profile?.username
        const newDay: Day = {
          id: newId,
          title: payload.prides[0] || payload.gratitudes[0] || 'Запись дня',
          tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности'],
          prides: newPrideEntries,
          gratitudes: newGratitudeEntries,
          photos: payload.photo ? [payload.photo] : undefined,
          media_url: payload.photo || null,
          attached_targets: payload.attachedTargets || (payload as any).attached_targets || null,
          attachedTargets: payload.attachedTargets || (payload as any).attached_targets || null,
          dateISO: computedDate,
          status: 'normal',
          visibility: normalizeVisibility(payload.visibility),
          groupId: payload.groupId || null,
          groupName: payload.groupName,
          targetGroupIds: payload.targetGroupIds || [],
          score: exactDayScore,
          aiScore: exactDayScore,
          aiVerdict: payload.aiVerdict,
          aiBreakdown: payload.aiBreakdown,
          user_id: currentUid,
          userId: currentUid,
        }

        createdDay = newDay

        const nextDays = [
          newDay,
          ...prev.days.filter(
            (d) =>
              d.id !== newDay.id &&
              (!newDay.dateISO || !d.dateISO || d.dateISO.slice(0, 10) !== newDay.dateISO.slice(0, 10))
          ),
        ].sort(
          (a, b) =>
            new Date(b.dateISO!).getTime() - new Date(a.dateISO!).getTime()
        )

        const newStreak = calculateStreak(nextDays)

        return {
          ...prev,
          days: nextDays,
          profile: {
            ...prev.profile,
            streak: newStreak,
            streak_count: newStreak,
          },
          composerDraft: null,
        }
      })

      if (createdDay) {
        syncDayToSupabase(createdDay).catch((err) =>
          console.error('[Ogonek] Error syncing new day to Supabase:', err)
        )
      }
    },
    [updateStore]
  )

  const updateDay = useCallback(
    (updatedDay: Day) => {
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => (d.id === updatedDay.id ? updatedDay : d)),
      }))
      syncDayToSupabase(updatedDay).catch((err) =>
        console.error('[Ogonek] Error syncing updated day to Supabase:', err)
      )
    },
    [updateStore]
  )

  /**
   * УДАЛЕНИЕ ДНЯ:
   * 1. Удаляет день из локального стейта и пересчитывает стрик.
   * 2. Удаляет день и связанные записи из Supabase (public.days, public.prides, public.gratitudes).
   */
  const deleteDay = useCallback(
    async (dayId: number): Promise<{ ok: boolean; error?: string }> => {
      const snap = getSnapshot()
      const uid =
        snap.auth?.activeAccountId ||
        (snap.profile as any)?.id ||
        (snap.profile?.username?.toLowerCase() === 'cernavation' ? '94e9eaf7-ec74-4366-9ce3-7de1e670f52b' : null)

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { ok: false, error: 'Отсутствует подключение к интернету для удаления записи' }
      }

      const supabase = getSupabase()
      if (supabase && uid) {
        const clientId = String(dayId)
        try {
          const { error: delErr } = await supabase.from('days').delete().match({ user_id: uid, client_id: clientId })
          if (delErr) {
            console.error('[Ogonek] Error deleting day from Supabase:', delErr)
            return { ok: false, error: delErr.message }
          }
          await Promise.allSettled([
            supabase.from('prides').delete().match({ user_id: uid, day_client_id: clientId }),
            supabase.from('gratitudes').delete().match({ user_id: uid, day_client_id: clientId }),
          ])
        } catch (err: any) {
          console.error('[Ogonek] Error deleting day from Supabase:', err)
          return { ok: false, error: err?.message || 'Ошибка удаления из базы данных' }
        }
      }

      updateStore((prev) => {
        const nextDays = prev.days.filter((d) => d.id !== dayId)
        const newStreak = calculateStreak(nextDays)
        return {
          ...prev,
          days: nextDays,
          profile: {
            ...prev.profile,
            streak: newStreak,
            streak_count: newStreak,
          },
        }
      })

      if (supabase && uid) {
        try {
          const currentStreak = calculateStreak(getSnapshot().days)
          await supabase
            .from('profiles')
            .update({ streak_count: currentStreak, updated_at: new Date().toISOString() })
            .eq('id', uid)
        } catch {}
      }

      return { ok: true }
    },
    [updateStore]
  )

  const updateDayWithPayload = useCallback(
    (dayId: number, payload: ComposerPayload) => {
      let savedDay: Day | null = null
      updateStore((prev) => {
        const targetDay = prev.days.find((d) => d.id === dayId)
        if (!targetDay) return prev

        const updatedPrides: PrideEntry[] = payload.prides.map((text, idx) => {
          const existingPride = targetDay.prides[idx]
          const customRating = payload.ratings?.[idx]
          const heuristic = evaluatePrideItemHeuristic(text)

          const sc =
            typeof customRating?.score === 'number'
              ? customRating.score
              : (typeof customRating?.scale === 'number'
                  ? customRating.scale
                  : (existingPride && typeof existingPride.score === 'number'
                      ? existingPride.score
                      : (existingPride && typeof existingPride.scale === 'number' && existingPride.scale > 0
                          ? existingPride.scale
                          : heuristic.scale)))

          const scale = Math.max(1, Math.min(10, Math.round(sc)))

          const overcome =
            customRating?.overcome ??
            (existingPride && typeof existingPride.overcome === 'number'
              ? existingPride.overcome
              : heuristic.overcome)

          return {
            num: String(idx + 1).padStart(2, '0'),
            text,
            scale,
            score: sc,
            overcome,
            visibility: normalizeVisibility(
              payload.prideVisibilities?.[idx] ??
                existingPride?.visibility ??
                payload.visibility ??
                DEFAULT_VISIBILITY
            ),
            groupId: payload.prideGroupIds?.[idx] ?? payload.groupId ?? existingPride?.groupId ?? null,
            groupName: payload.prideGroupNames?.[idx] ?? payload.groupName ?? existingPride?.groupName,
            targetGroupIds: payload.targetGroupIds ?? existingPride?.targetGroupIds,
          }
        })

        const updatedGratitudes: (string | GratitudeEntry)[] = payload.gratitudes.map((text, idx) => {
          const existingGrat = targetDay.gratitudes[idx]
          const prevVis = typeof existingGrat === 'object' && existingGrat?.visibility ? existingGrat.visibility : undefined
          const prevGroup = typeof existingGrat === 'object' && existingGrat?.groupId ? existingGrat.groupId : undefined
          const prevGroupName = typeof existingGrat === 'object' && existingGrat?.groupName ? existingGrat.groupName : undefined
          const prevTargets = typeof existingGrat === 'object' && existingGrat?.targetGroupIds ? existingGrat.targetGroupIds : undefined
          return {
            num: String(idx + 1).padStart(2, '0'),
            text,
            visibility: normalizeVisibility(
              payload.gratitudeVisibilities?.[idx] ?? prevVis ?? payload.visibility ?? DEFAULT_VISIBILITY
            ),
            groupId: payload.gratitudeGroupIds?.[idx] ?? payload.groupId ?? prevGroup ?? null,
            groupName: payload.gratitudeGroupNames?.[idx] ?? payload.groupName ?? prevGroupName,
            targetGroupIds: payload.targetGroupIds ?? prevTargets,
          }
        })

        let exactDayScore = payload.score ?? payload.aiScore ?? targetDay.score ?? targetDay.aiScore
        if (typeof exactDayScore !== 'number' || isNaN(exactDayScore)) {
          const validScores = updatedPrides
            .map((p) => p.score ?? p.scale)
            .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0)
          if (validScores.length > 0) {
            exactDayScore = Number((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1))
          }
        }

        const updatedDay: Day = {
          ...targetDay,
          title: updatedPrides[0]?.text || payload.gratitudes[0] || targetDay.title,
          prides: updatedPrides,
          gratitudes: updatedGratitudes,
          score: exactDayScore,
          aiScore: exactDayScore,
          aiVerdict: payload.aiVerdict ?? targetDay.aiVerdict,
          aiBreakdown: payload.aiBreakdown ?? targetDay.aiBreakdown,
          photos: payload.photo
            ? [payload.photo]
            : [],
          media_url: payload.photo || null,
          attached_targets: payload.attachedTargets ?? (payload as any).attached_targets ?? targetDay.attached_targets ?? targetDay.attachedTargets ?? null,
          attachedTargets: payload.attachedTargets ?? (payload as any).attached_targets ?? targetDay.attached_targets ?? targetDay.attachedTargets ?? null,
          visibility: payload.visibility
            ? normalizeVisibility(payload.visibility)
            : targetDay.visibility,
          groupId: payload.groupId !== undefined ? payload.groupId : targetDay.groupId,
          groupName: payload.groupName !== undefined ? payload.groupName : targetDay.groupName,
          targetGroupIds: payload.targetGroupIds !== undefined ? payload.targetGroupIds : targetDay.targetGroupIds,
        }

        savedDay = updatedDay

        return {
          ...prev,
          days: prev.days.map((d) => (d.id === dayId ? updatedDay : d)),
        }
      })

      if (savedDay) {
        syncDayToSupabase(savedDay).catch((err) =>
          console.error('[Ogonek] Error syncing updated day with payload to Supabase:', err)
        )
      }
    },
    [updateStore]
  )

  const saveMorningIntentions = useCallback(
    (dateKey: string, focus: [string, string, string]) => {
      updateStore((prev) => {
        const existing = prev.morningFocusHistory[dateKey]
        const record = createMorningFocusRecord(dateKey, focus, existing)
        return {
          ...prev,
          morningIntentions: {
            ...prev.morningIntentions,
            [dateKey]: record.focus,
          },
          morningFocusHistory: {
            ...prev.morningFocusHistory,
            [dateKey]: record,
          },
        }
      })
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 10 — ВЕЧЕРНЯЯ СВЕРКА УТРЕННИХ ОБЕЩАНИЙ
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Ставит статус одному шагу фокуса («Выполнил» / «Не выполнил» / сброс).
   * Автоматически пересчитывает процент и, когда сверены все обещания,
   * проставляет время вечерней сверки.
   */
  const setMorningFocusStep = useCallback(
    (dateKey: string, index: 0 | 1 | 2, status: MorningFocusStepStatus) => {
      updateStore((prev) => {
        const record = prev.morningFocusHistory[dateKey]
        if (!record) return prev
        const next = applyStepStatus(record, index, status)
        return {
          ...prev,
          morningFocusHistory: {
            ...prev.morningFocusHistory,
            [dateKey]: next,
          },
        }
      })
    },
    [updateStore]
  )

  /**
   * Переключатель галочки: pending → done → missed → pending.
   * Возвращает новый статус (для звука/уведомления в интерфейсе).
   */
  const toggleMorningFocusStep = useCallback(
    (dateKey: string, index: 0 | 1 | 2): MorningFocusStepStatus => {
      const record = getSnapshot().morningFocusHistory[dateKey]
      if (!record) return 'pending'
      const current = record.steps[index]
      const next: MorningFocusStepStatus =
        current === 'pending' ? 'done' : current === 'done' ? 'missed' : 'pending'
      setMorningFocusStep(dateKey, index, next)
      return next
    },
    [setMorningFocusStep]
  )

  /** Комплексная отметка «Выполнил» для шага (и снятие, если уже стояла) */
  const markMorningFocusStepDone = useCallback(
    (dateKey: string, index: 0 | 1 | 2): boolean => {
      const record = getSnapshot().morningFocusHistory[dateKey]
      if (!record) return false
      const nextDone = record.steps[index] !== 'done'
      setMorningFocusStep(dateKey, index, nextDone ? 'done' : 'pending')
      return nextDone
    },
    [setMorningFocusStep]
  )

  /** Отметка «Не выполнил» для шага (снятие, если уже стояла) */
  const markMorningFocusStepMissed = useCallback(
    (dateKey: string, index: 0 | 1 | 2): boolean => {
      const record = getSnapshot().morningFocusHistory[dateKey]
      if (!record) return false
      const nextMissed = record.steps[index] !== 'missed'
      setMorningFocusStep(dateKey, index, nextMissed ? 'missed' : 'pending')
      return nextMissed
    },
    [setMorningFocusStep]
  )

  /**
   * Завершает вечернюю сверку: неотмеченные обещания становятся
   * «Не выполнил», процент финализируется. Возвращает итоговый процент.
   */
  const completeEveningReview = useCallback(
    (dateKey: string): number => {
      const record = getSnapshot().morningFocusHistory[dateKey]
      if (!record) return 0
      const finalized = finalizeEveningReview(record)
      updateStore((prev) => ({
        ...prev,
        morningFocusHistory: {
          ...prev.morningFocusHistory,
          [dateKey]: finalized,
        },
      }))
      return finalized.completionPercent
    },
    [updateStore]
  )

  /** Возвращает сверку в работу — можно передумать и поменять галочки */
  const reopenEveningReview = useCallback(
    (dateKey: string) => {
      updateStore((prev) => {
        const record = prev.morningFocusHistory[dateKey]
        if (!record) return prev
        return {
          ...prev,
          morningFocusHistory: {
            ...prev.morningFocusHistory,
            [dateKey]: { ...record, reviewedAtISO: null },
          },
        }
      })
    },
    [updateStore]
  )

  /** Удаляет запись утреннего фокуса конкретного дня из истории */
  const removeMorningFocusRecord = useCallback(
    (dateKey: string) => {
      updateStore((prev) => {
        if (!prev.morningFocusHistory[dateKey] && !prev.morningIntentions[dateKey]) return prev
        const morningFocusHistory = { ...prev.morningFocusHistory }
        const morningIntentions = { ...prev.morningIntentions }
        delete morningFocusHistory[dateKey]
        delete morningIntentions[dateKey]
        return { ...prev, morningFocusHistory, morningIntentions }
      })
    },
    [updateStore]
  )

  const saveComposerDraft = useCallback(
    (draft: ComposerDraft | null) => {
      updateStore((prev) => ({
        ...prev,
        composerDraft: draft,
      }))
    },
    [updateStore]
  )

  const clearComposerDraft = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      composerDraft: null,
    }))
  }, [updateStore])

  const toggleEvidencePin = useCallback(
    (id: string) => {
      let isNowPinned = false
      updateStore((prev) => {
        const nextItems = prev.evidenceItems.map((item) => {
          if (item.id === id) {
            isNowPinned = !item.pinned
            return { ...item, pinned: !item.pinned }
          }
          return item
        })
        const nextFavorites = isNowPinned
          ? Array.from(new Set([...prev.evidenceFavorites, id]))
          : prev.evidenceFavorites.filter((favId) => favId !== id)

        return {
          ...prev,
          evidenceItems: nextItems,
          evidenceFavorites: nextFavorites,
        }
      })
      toggleEvidenceVaultPin(id, isNowPinned).catch(() => {})
    },
    [updateStore]
  )

  const addEvidenceItem = useCallback(
    (newItem: Omit<EvidenceItem, 'id'>) => {
      const id = `ev-${Date.now()}`
      const itemWithId: EvidenceItem = {
        ...newItem,
        id,
      }
      updateStore((prev) => {
        return {
          ...prev,
          evidenceItems: [itemWithId, ...prev.evidenceItems],
        }
      })

      const activeId = getSnapshot().auth?.activeAccountId
      if (activeId && !activeId.startsWith('anon-') && !activeId.startsWith('acct-guest')) {
        addEvidenceVaultItem(activeId, {
          id,
          client_id: id,
          title: newItem.title,
          description: newItem.description,
          date: newItem.date,
          category: newItem.category,
          pinned: newItem.pinned,
        }).catch((err) => console.warn('[Ogonek] Add evidence vault item error:', err))
      }
    },
    [updateStore]
  )

  const deleteEvidenceItem = useCallback(
    (id: string) => {
      updateStore((prev) => ({
        ...prev,
        evidenceItems: prev.evidenceItems.filter((i) => i.id !== id),
        evidenceFavorites: prev.evidenceFavorites.filter((favId) => favId !== id),
      }))
      deleteEvidenceVaultItem(id).catch(() => {})
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 5 — ВЕРИФИЦИРОВАННЫЕ АЧИВКИ ПРОФИЛЯ
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Создаёт верифицированную ачивку с уже полученным регламентом доказательств.
   * Возвращает id новой ачивки.
   */
  const addVerifiedAchievement = useCallback(
    (input: {
      categoryId: VerifiedAchievement['categoryId']
      title: string
      topic: string
      achievedAtISO?: string
      regulation: AchievementRegulation | null
      evidence?: AchievementEvidenceFile[]
      status?: AchievementStatus
    }): string => {
      const id = `va-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      const nowISO = new Date().toISOString()
      const status: AchievementStatus = input.status === 'submitted' ? 'submitted' : 'draft'

      const achievement: VerifiedAchievement = {
        id,
        categoryId: input.categoryId,
        title: input.title.trim().slice(0, 120) || 'Ачивка',
        topic: input.topic.trim().slice(0, 300),
        achievedAtISO: input.achievedAtISO || nowISO,
        status,
        regulation: input.regulation,
        evidence: input.evidence ?? [],
        submittedAtISO: status === 'submitted' ? nowISO : null,
        verifiedAtISO: null,
        reviewerNote: null,
        submission: null,
        createdAtISO: nowISO,
      }

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: [achievement, ...prev.verifiedAchievements],
      }))

      return id
    },
    [updateStore]
  )

  /** Частичное обновление ачивки (название, тема, дата, регламент) */
  const updateVerifiedAchievement = useCallback(
    (
      id: string,
      patch: Partial<Pick<VerifiedAchievement, 'title' | 'topic' | 'achievedAtISO' | 'regulation'>>
    ) => {
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        ),
      }))
    },
    [updateStore]
  )

  /** Прикрепляет файл-доказательство к ачивке. Возвращает id файла. */
  const attachAchievementEvidence = useCallback(
    (
      achievementId: string,
      file: Omit<AchievementEvidenceFile, 'id' | 'addedAtISO'>
    ): string | null => {
      if (!achievementId || !file.ref) return null
      const id = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const evidence: AchievementEvidenceFile = {
        ...file,
        id,
        addedAtISO: new Date().toISOString(),
      }
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === achievementId ? { ...a, evidence: [...a.evidence, evidence] } : a
        ),
      }))
      return id
    },
    [updateStore]
  )

  /** Удаляет прикреплённое доказательство */
  const removeAchievementEvidence = useCallback(
    (achievementId: string, evidenceId: string) => {
      if (!achievementId || !evidenceId) return
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === achievementId
            ? { ...a, evidence: a.evidence.filter((e) => e.id !== evidenceId) }
            : a
        ),
      }))
    },
    [updateStore]
  )

  /**
   * Отправляет ачивку на верификацию.
   * Возвращает true, если комплект обязательных доказательств полон и заявка ушла.
   */
  const submitAchievementForVerification = useCallback(
    (id: string): boolean => {
      const achievement = getSnapshot().verifiedAchievements.find((a) => a.id === id)
      if (!achievement) return false
      const progress = computeAchievementProgress(achievement)
      if (!progress.complete) return false

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'submitted',
                submittedAtISO: new Date().toISOString(),
                verifiedAtISO: null,
                reviewerNote: null,
              }
            : a
        ),
      }))
      return true
    },
    [updateStore]
  )

  /**
   * Вердикт верификатора: подтверждение или отказ с комментарием.
   * Возвращает true, если вердикт применён.
   */
  const resolveAchievementReview = useCallback(
    (id: string, decision: 'verified' | 'rejected', note?: string): boolean => {
      const achievement = getSnapshot().verifiedAchievements.find((a) => a.id === id)
      if (!achievement || achievement.status !== 'submitted') return false

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: decision,
                verifiedAtISO: new Date().toISOString(),
                reviewerNote: (note ?? '').trim().slice(0, 600) || null,
              }
            : a
        ),
      }))
      return true
    },
    [updateStore]
  )

  /** Снимает ачивку с верификации / откатывает в черновик для правок */
  const reopenAchievement = useCallback(
    (id: string) => {
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'draft',
                submittedAtISO: null,
                verifiedAtISO: null,
                reviewerNote: null,
                submission: null,
              }
            : a
        ),
      }))
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 6 — МОДЕРАЦИЯ АЧИВОК И ОТПРАВКА ДОКАЗАТЕЛЬСТВ НА ПОЧТУ
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Формирует пакет доказательств, отправляет его модератору (email/webhook)
   * и переводит ачивку в статус «На модерации» с трек-кодом и историей.
   */
  const startAchievementSubmission = useCallback(
    async (
      id: string,
      input: {
        description: string
        contactEmail: string
        attachments?: ModerationEmailAttachment[]
      }
    ): Promise<{
      ok: boolean
      trackingCode?: string
      channel?: ModerationChannel
      delivery?: ModerationDelivery
      recipient?: string
      error?: string
    }> => {
      const current = getSnapshot()
      const achievement = current.verifiedAchievements.find((a) => a.id === id)
      if (!achievement) return { ok: false, error: 'Ачивка не найдена' }
      if (!isReadyForModeration(achievement)) {
        return { ok: false, error: 'Сначала приложи все обязательные доказательства' }
      }

      const trackingCode = makeTrackingCode(id)
      const payload = buildModerationSubmissionPayload({
        trackingCode,
        achievement,
        applicant: {
          displayName: current.profile.displayName,
          username: current.profile.username,
          contactEmail: input.contactEmail,
        },
        description: input.description,
        attachments: input.attachments ?? [],
      })

      let channel: ModerationChannel = 'outbox'
      let delivery: ModerationDelivery = 'queued'
      let recipient = DEFAULT_MODERATION_INBOX
      let error: string | undefined

      try {
        const res = await fetch('/api/achievements/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const data = (await res.json()) as {
            recipient?: string
            channel?: ModerationChannel
            delivery?: ModerationDelivery
          }
          channel = data.channel ?? channel
          delivery = data.delivery ?? delivery
          recipient = data.recipient ?? recipient
        } else {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          error = data?.error ?? `Сервер вернул ${res.status} — пакет поставлен в очередь outbox`
          channel = 'outbox'
          delivery = 'queued'
        }
      } catch {
        error = 'Нет связи с сервером — пакет поставлен в локальную очередь outbox'
        channel = 'outbox'
        delivery = 'queued'
      }

      const submission = createSubmissionRecord({
        trackingCode,
        description: input.description,
        contactEmail: input.contactEmail,
        channel,
        delivery,
        recipient,
        evidenceCount: achievement.evidence.length,
      })

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'submitted',
                submittedAtISO: submission.submittedAtISO,
                verifiedAtISO: null,
                reviewerNote: null,
                submission,
              }
            : a
        ),
      }))

      return { ok: true, trackingCode, channel, delivery, recipient, error }
    },
    [updateStore]
  )

  /**
   * Вердикт модератора по отправленной заявке:
   * «Подтверждено официально» / «Требует уточнения» / «На модерации».
   * Ведёт историю рассмотрения и синхронизирует статус ачивки.
   */
  const resolveModerationStatus = useCallback(
    (id: string, status: ModerationStatus, note?: string): boolean => {
      const achievement = getSnapshot().verifiedAchievements.find((a) => a.id === id)
      if (!achievement) return false

      const cleanNote = (note ?? '').trim().slice(0, 600)

      if (!achievement.submission) {
        const decision: 'verified' | 'rejected' =
          status === 'needs-clarification' ? 'rejected' : 'verified'
        return resolveAchievementReview(id, decision, cleanNote)
      }

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) => {
          if (a.id !== id || !a.submission) return a
          const history = appendReviewEvent(
            a.submission,
            status,
            cleanNote || MODERATION_STATUS_META[status].description,
            'Модератор Priday'
          )
          const isFinal = status !== 'on-moderation'
          return {
            ...a,
            status: achievementStatusFromModeration(status),
            verifiedAtISO: status === 'officially-verified' ? new Date().toISOString() : a.verifiedAtISO,
            reviewerNote: cleanNote || null,
            submission: {
              ...a.submission,
              status,
              decidedAtISO: isFinal ? new Date().toISOString() : null,
              moderatorNote: cleanNote || null,
              history,
            },
          }
        }),
      }))
      return true
    },
    [updateStore, resolveAchievementReview]
  )

  /** Отзывает заявку: ачивка возвращается в черновик, заявка удаляется */
  const withdrawSubmission = useCallback(
    (id: string) => {
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'draft',
                submittedAtISO: null,
                verifiedAtISO: null,
                reviewerNote: null,
                submission: null,
              }
            : a
        ),
      }))
    },
    [updateStore]
  )

  /** Полностью удаляет верифицированную ачивку */
  const removeVerifiedAchievement = useCallback(
    (id: string) => {
      if (!id) return
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.filter((a) => a.id !== id),
      }))
    },
    [updateStore]
  )

  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      updateStore((prev) => ({
        ...prev,
        soundEnabled: enabled,
      }))
    },
    [updateStore]
  )

  const setSoundVolume = useCallback(
    (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume))
      updateStore((prev) => ({
        ...prev,
        soundVolume: clamped,
      }))
    },
    [updateStore]
  )

  const setUnreadChatCount = useCallback(
    (count: number) => {
      updateStore((prev) => ({
        ...prev,
        unreadChatCount: Math.max(0, count),
      }))
    },
    [updateStore]
  )

  const setUnreadNotificationsCount = useCallback(
    (count: number) => {
      updateStore((prev) => ({
        ...prev,
        unreadNotificationsCount: Math.max(0, count),
      }))
    },
    [updateStore]
  )

  const addNotification = useCallback(
    (notif: Partial<OgonekNotification> & { title: string }) => {
      const newNotif: OgonekNotification = {
        id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: notif.type || 'system',
        title: notif.title,
        body: notif.body || '',
        data: notif.data || {},
        isRead: false,
        createdAtISO: notif.createdAtISO || new Date().toISOString(),
      }
      updateStore((prev) => {
        const list = [newNotif, ...(prev.notifications || [])].slice(0, 50)
        return {
          ...prev,
          notifications: list,
          unreadNotificationsCount: (prev.unreadNotificationsCount || 0) + 1,
        }
      })
    },
    [updateStore]
  )

  const markNotificationRead = useCallback(
    async (id: string) => {
      updateStore((prev) => {
        const list = (prev.notifications || []).map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        )
        const unread = list.filter((n) => !n.isRead).length
        return {
          ...prev,
          notifications: list,
          unreadNotificationsCount: unread,
        }
      })
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_ids: [id] }),
        })
      } catch {}
    },
    [updateStore]
  )

  const markAllNotificationsRead = useCallback(
    async () => {
      updateStore((prev) => ({
        ...prev,
        notifications: (prev.notifications || []).map((n) => ({ ...n, isRead: true })),
        unreadNotificationsCount: 0,
      }))
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mark_all_read: true }),
        })
      } catch {}
    },
    [updateStore]
  )

  const refreshUnreadCounts = useCallback(
    async () => {
      try {
        const res = await fetch('/api/messages/unread')
        if (res.ok) {
          const data = await res.json()
          if (typeof data?.chat_unread === 'number') {
            updateStore((prev) => ({
              ...prev,
              unreadChatCount: data.chat_unread,
              unreadNotificationsCount:
                typeof data.notifications_unread === 'number'
                  ? data.notifications_unread
                  : prev.unreadNotificationsCount || 0,
            }))
          }
        }
      } catch {}
    },
    [updateStore]
  )

  const setPinEnabled = useCallback(
    (enabled: boolean) => {
      updateStore((prev) => ({
        ...prev,
        pinEnabled: enabled,
        security: sanitizeSecurityState({ ...prev.security, lockOnOpen: enabled }),
      }))
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 14 — СУПЕР-НАСТРОЙКИ: ТЕМА, АКЦЕНТ, ШРИФТ, ПЛОТНОСТЬ
     ══════════════════════════════════════════════════════════════════════ */

  /** Переключает режим оформления: X Black / Apple Light / Dim */
  const setTheme = useCallback(
    (theme: ThemeMode) => {
      const next = sanitizeTheme(theme)
      updateStore((prev) => (prev.theme === next ? prev : { ...prev, theme: next }))
    },
    [updateStore]
  )

  /** Меняет акцентный цвет приложения */
  const setAccent = useCallback(
    (accent: AccentId) => {
      const next = sanitizeAccent(accent)
      updateStore((prev) => (prev.accent === next ? prev : { ...prev, accent: next }))
    },
    [updateStore]
  )

  /** Меняет размер шрифта/масштаб интерфейса */
  const setFontScale = useCallback(
    (fontScale: FontScaleId) => {
      const next = sanitizeFontScale(fontScale)
      updateStore((prev) =>
        prev.fontScale === next ? prev : { ...prev, fontScale: next }
      )
    },
    [updateStore]
  )

  /** Меняет плотность ленты (просторность карточек дней) */
  const setFeedDensity = useCallback(
    (feedDensity: FeedDensityId) => {
      const next = sanitizeFeedDensity(feedDensity)
      updateStore((prev) =>
        prev.feedDensity === next ? prev : { ...prev, feedDensity: next }
      )
    },
    [updateStore]
  )

  /** Сбрасывает всё оформление к заводским значениям Priday */
  const resetAppearance = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      theme: DEFAULT_STORE_STATE.theme,
      accent: DEFAULT_STORE_STATE.accent,
      fontScale: DEFAULT_STORE_STATE.fontScale,
      feedDensity: DEFAULT_STORE_STATE.feedDensity,
    }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 15 — БЕЗОПАСНОСТЬ И ВХОД: ПАРОЛЬ, PIN-КОД, FACE ID / TOUCH ID
     ══════════════════════════════════════════════════════════════════════ */

  /** Точечно обновляет снимок защиты с валидацией (соль/хэши сохраняются как есть) */
  const updateSecurity = useCallback(
    (patch: Partial<AppSecurityState>) => {
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({ ...prev.security, ...patch }),
      }))
    },
    [updateStore]
  )

  /** Добавляет событие в журнал безопасности */
  const recordSecurityEvent = useCallback(
    (kind: SecurityAuditKind, note: string) => {
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          auditLog: appendSecurityEvent(prev.security.auditLog, makeSecurityEvent(kind, note)),
        }),
      }))
    },
    [updateStore]
  )

  /**
   * УСТАНОВКА / СМЕНА ПАРОЛЯ АККАУНТА.
   * Секрет хэшируется SHA-256 с новой солью; открытый текст нигде не хранится.
   */
  const setAccountPassword = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidPassword(password)) {
        return {
          ok: false,
          error: `Пароль должен быть от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`,
        }
      }
      const hadPassword = hasAccountPassword(getSnapshot().security)
      const salt = generateSalt()
      const hash = await hashSecret(password, salt)
      const nowISO = new Date().toISOString()
      const event = makeSecurityEvent(
        hadPassword ? 'password-changed' : 'password-set',
        hadPassword ? 'Пароль аккаунта изменён' : 'Пароль аккаунта установлен'
      )
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          passwordHash: hash,
          passwordSalt: salt,
          passwordUpdatedAtISO: nowISO,
          failedAttempts: 0,
          lockedUntilISO: null,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return { ok: true }
    },
    [updateStore]
  )

  /** Удаляет пароль аккаунта (требуется подтверждение текущим паролем) */
  const clearAccountPassword = useCallback(
    async (currentPassword?: string): Promise<{ ok: boolean; error?: string }> => {
      const security = getSnapshot().security
      if (!hasAccountPassword(security)) return { ok: true }
      if (!currentPassword) {
        return { ok: false, error: 'Введите текущий пароль для отключения' }
      }
      const valid = await verifySecret(currentPassword, security.passwordSalt, security.passwordHash)
      if (!valid) return { ok: false, error: 'Неверный текущий пароль' }

      const event = makeSecurityEvent('password-removed', 'Пароль аккаунта удалён')
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          passwordHash: null,
          passwordSalt: null,
          passwordUpdatedAtISO: null,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return { ok: true }
    },
    [updateStore]
  )

  /**
   * УСТАНОВКА 4-ЗНАЧНОГО PIN-КОДА.
   * Первый способ входа автоматически включает блокировку при открытии.
   */
  const setSecurityPin = useCallback(
    async (
      pin: string,
      options?: { quickUnlock?: boolean }
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidPin(pin)) {
        return { ok: false, error: `PIN-код должен состоять из ${PIN_LENGTH} цифр` }
      }
      const security = getSnapshot().security
      const hadPin = hasSecurityPin(security)
      const salt = generateSalt()
      const hash = await hashSecret(pin, salt)
      const quickUnlock = options?.quickUnlock ?? security.pinQuickUnlockEnabled ?? true
      const enableLock = security.lockOnOpen || !hadPin
      const event = makeSecurityEvent(
        hadPin ? 'pin-changed' : 'pin-set',
        hadPin ? 'PIN-код изменён' : 'PIN-код установлен'
      )
      updateStore((prev) => ({
        ...prev,
        pinEnabled: enableLock,
        security: sanitizeSecurityState({
          ...prev.security,
          pinHash: hash,
          pinSalt: salt,
          pinLength: PIN_LENGTH,
          pinQuickUnlockEnabled: quickUnlock,
          lockOnOpen: enableLock,
          failedAttempts: 0,
          lockedUntilISO: null,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return { ok: true }
    },
    [updateStore]
  )

  /** Удаляет PIN-код (при наличии — с подтверждением текущего) */
  const clearSecurityPin = useCallback(
    async (currentPin?: string): Promise<{ ok: boolean; error?: string }> => {
      const security = getSnapshot().security
      if (!hasSecurityPin(security)) return { ok: true }
      if (currentPin !== undefined) {
        const valid = await verifySecret(currentPin, security.pinSalt, security.pinHash)
        if (!valid) return { ok: false, error: 'Неверный PIN-код' }
      }
      const event = makeSecurityEvent('pin-removed', 'PIN-код удалён')
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          pinHash: null,
          pinSalt: null,
          pinQuickUnlockEnabled: false,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return { ok: true }
    },
    [updateStore]
  )

  /** Включает/выключает биометрический ключ WebAuthn (Touch ID / Face ID) */
  const setBiometricEnabled = useCallback(
    (enabled: boolean, credential?: { id: string; label: string }): boolean => {
      const security = getSnapshot().security
      if (enabled && !credential?.id) return false
      const event = makeSecurityEvent(
        enabled ? 'biometric-enabled' : 'biometric-disabled',
        enabled ? 'Биометрия включена' : 'Биометрия отключена'
      )
      updateStore((prev) => ({
        ...prev,
        pinEnabled: enabled ? true : prev.pinEnabled,
        security: sanitizeSecurityState({
          ...prev.security,
          biometricEnabled: enabled,
          biometricCredentialId: enabled ? credential?.id ?? null : null,
          biometricLabel: enabled ? credential?.label ?? null : null,
          biometricRegisteredAtISO: enabled ? new Date().toISOString() : null,
          lockOnOpen: enabled ? true : prev.security.lockOnOpen,
          failedAttempts: enabled ? 0 : prev.security.failedAttempts,
          lockedUntilISO: enabled ? null : prev.security.lockedUntilISO,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return true
    },
    [updateStore]
  )

  /** Главный тумблер «Блокировать при открытии». Без способа входа не включается. */
  const setLockOnOpen = useCallback(
    (enabled: boolean): boolean => {
      const security = getSnapshot().security
      const canLock = hasSecurityPin(security) || hasAccountPassword(security) || Boolean(security.biometricCredentialId)
      if (enabled && !canLock) return false
      const next = enabled
      const event = makeSecurityEvent(
        next ? 'lock-enabled' : 'lock-disabled',
        next ? 'Блокировка при открытии включена' : 'Блокировка при открытии выключена'
      )
      updateStore((prev) =>
        prev.security.lockOnOpen === next && prev.pinEnabled === next
          ? prev
          : {
              ...prev,
              pinEnabled: next,
              security: sanitizeSecurityState({
                ...prev.security,
                lockOnOpen: next,
                auditLog: appendSecurityEvent(prev.security.auditLog, event),
              }),
            }
      )
      return next
    },
    [updateStore]
  )

  /** Быстрый вход по PIN при открытии приложения (только если PIN задан) */
  const setPinQuickUnlock = useCallback(
    (enabled: boolean): boolean => {
      const security = getSnapshot().security
      if (enabled && !hasSecurityPin(security)) return false
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({ ...prev.security, pinQuickUnlockEnabled: enabled }),
      }))
      return enabled
    },
    [updateStore]
  )

  /** Автоблокировка при бездействии, минуты (0 — выключена) */
  const setAutoLockMinutes = useCallback(
    (minutes: number) => {
      const clean = Math.max(0, Math.min(240, Math.round(minutes || 0)))
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({ ...prev.security, autoLockMinutes: clean }),
      }))
    },
    [updateStore]
  )

  /**
   * Фиксирует неудачную попытку входа. После 5 промахов подряд вход
   * временно блокируется на 60 секунд (защита от перебора).
   */
  const registerFailedUnlock = useCallback(
    (method?: string): { locked: boolean; attemptsLeft: number } => {
      const security = getSnapshot().security
      const next = nextFailedAttemptState(security.failedAttempts)
      const locked = Boolean(next.lockedUntilISO)
      let log = appendSecurityEvent(
        security.auditLog,
        makeSecurityEvent(
          'failed-attempt',
          `Неудачная попытка входа${method ? ` (${method})` : ''}`
        )
      )
      if (locked) {
        log = appendSecurityEvent(
          log,
          makeSecurityEvent('lockout', 'Вход временно заблокирован на 60 секунд')
        )
      }
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          failedAttempts: next.failedAttempts,
          lockedUntilISO: next.lockedUntilISO ?? prev.security.lockedUntilISO,
          auditLog: log,
        }),
      }))
      return { locked, attemptsLeft: attemptsLeft(next.failedAttempts) }
    },
    [updateStore]
  )

  /** Проверяет PIN-код: при успехе фиксирует вход и сбрасывает счётчик промахов */
  const verifyPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const security = getSnapshot().security
      if (computeLockout(security.lockedUntilISO).isLocked) return false
      const valid = await verifySecret(pin, security.pinSalt, security.pinHash)
      if (valid) {
        updateStore((prev) => ({
          ...prev,
          security: sanitizeSecurityState({
            ...prev.security,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastUnlockedAtISO: new Date().toISOString(),
            auditLog: appendSecurityEvent(
              prev.security.auditLog,
              makeSecurityEvent('unlocked', 'Вход по PIN-коду')
            ),
          }),
        }))
        return true
      }
      registerFailedUnlock('PIN')
      return false
    },
    [updateStore, registerFailedUnlock]
  )

  /** Проверяет пароль аккаунта (аварийный вход, если PIN забыт) */
  const verifyPassword = useCallback(
    async (password: string): Promise<boolean> => {
      const security = getSnapshot().security
      if (computeLockout(security.lockedUntilISO).isLocked) return false
      const valid = await verifySecret(password, security.passwordSalt, security.passwordHash)
      if (valid) {
        updateStore((prev) => ({
          ...prev,
          security: sanitizeSecurityState({
            ...prev.security,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastUnlockedAtISO: new Date().toISOString(),
            auditLog: appendSecurityEvent(
              prev.security.auditLog,
              makeSecurityEvent('unlocked', 'Вход по паролю аккаунта')
            ),
          }),
        }))
        return true
      }
      registerFailedUnlock('пароль')
      return false
    },
    [updateStore, registerFailedUnlock]
  )

  /** Фиксирует успешный вход по биометрии WebAuthn (сбрасывает промахи и пишет аудит) */
  const unlockWithBiometric = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      security: sanitizeSecurityState({
        ...prev.security,
        failedAttempts: 0,
        lockedUntilISO: null,
        lastUnlockedAtISO: new Date().toISOString(),
        auditLog: appendSecurityEvent(
          prev.security.auditLog,
          makeSecurityEvent('unlocked', 'Вход по биометрии (WebAuthn)')
        ),
      }),
    }))
  }, [updateStore])

  /** Записывает факт ручной блокировки и сбрасывает таймер бездействия */
  const lockAppNow = useCallback(() => {    updateStore((prev) => ({
      ...prev,
      security: sanitizeSecurityState({
        ...prev.security,
        auditLog: appendSecurityEvent(
          prev.security.auditLog,
          makeSecurityEvent('lock-now', 'Приложение заблокировано вручную')
        ),
      }),
    }))
  }, [updateStore])

  /** Полностью снимает защиту (пароль, PIN, биометрия) и выключает блокировку */
  const resetSecurity = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      pinEnabled: false,
      security: sanitizeSecurityState({
        ...DEFAULT_SECURITY_STATE,
        auditLog: appendSecurityEvent(
          prev.security.auditLog,
          makeSecurityEvent('lock-disabled', 'Защита сброшена к заводским настройкам')
        ),
      }),
    }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 16 — СУПЕР-НАСТРОЙКИ ЧАСТЬ 3:
     ПРИВАТНОСТЬ ПРОФИЛЯ, ДЕДЛАЙН СТРИКА И БЭКАП ПАМЯТИ
     ══════════════════════════════════════════════════════════════════════ */

  /** Точечно обновляет приватность профиля с валидацией и меткой времени */
  const updatePrivacy = useCallback(
    (patch: Partial<PrivacySettings>) => {
      let nextPrivacy: PrivacySettings | null = null
      updateStore((prev) => {
        nextPrivacy = sanitizePrivacySettings({
          ...prev.privacy,
          ...patch,
          updatedAtISO: new Date().toISOString(),
        })
        return {
          ...prev,
          privacy: nextPrivacy,
        }
      })

      // Серверная синхронизация настроек приватности в БД Supabase
      const snap = getSnapshot()
      const activeId = snap.auth?.activeAccountId
      if (activeId && nextPrivacy) {
        updateProfileInDb(activeId, {
          privacy: nextPrivacy,
          who_can_find: (nextPrivacy as PrivacySettings).whoCanFind,
          who_can_message: (nextPrivacy as PrivacySettings).whoCanMessage,
          who_can_call: (nextPrivacy as PrivacySettings).whoCanCall,
          who_can_see_online: (nextPrivacy as PrivacySettings).whoCanSeeOnline,
          default_day_visibility: (nextPrivacy as PrivacySettings).defaultDayVisibility,
          is_hidden_from_search: Boolean((nextPrivacy as PrivacySettings).isHiddenFromSearch),
          allow_messages_from: (nextPrivacy as PrivacySettings).allowMessagesFrom ?? (nextPrivacy as PrivacySettings).whoCanMessage,
          allow_group_invites_from: (nextPrivacy as PrivacySettings).allowGroupInvitesFrom ?? 'friends',
        } as any).catch((err: any) => {
          console.warn('[updatePrivacy] Remote update error:', err)
        })
      }
    },
    [updateStore]
  )

  /** Переключает тип аккаунта: открытый / закрытый */
  const setProfileVisibility = useCallback(
    (profileVisibility: ProfileVisibility) => {
      updatePrivacy({ profileVisibility })
    },
    [updatePrivacy]
  )

  /** Меняет политику комментариев: все / друзья / никто */
  const setCommentPolicy = useCallback(
    (commentPolicy: InteractionAudience) => {
      updatePrivacy({ commentPolicy })
    },
    [updatePrivacy]
  )

  /** Меняет политику личных сообщений: все / друзья / никто */
  const setChatPolicy = useCallback(
    (chatPolicy: InteractionAudience) => {
      updatePrivacy({ chatPolicy })
    },
    [updatePrivacy]
  )

  /** Сбрасывает приватность к значениям по умолчанию */
  const resetPrivacy = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      privacy: sanitizePrivacySettings({
        ...DEFAULT_PRIVACY,
        updatedAtISO: new Date().toISOString(),
      }),
    }))
  }, [updateStore])

  /** Точечно обновляет настройки ночного дедлайна стрика */
  const updateStreakSettings = useCallback(
    (patch: Partial<StreakSettings>) => {
      updateStore((prev) => ({
        ...prev,
        streak: sanitizeStreakSettings({
          ...prev.streak,
          ...patch,
          updatedAtISO: new Date().toISOString(),
        }),
      }))
    },
    [updateStore]
  )

  /** Быстро меняет время дедлайна в минутах от полуночи */
  const setStreakDeadlineMinutes = useCallback(
    (deadlineMinutes: number) => {
      updateStreakSettings({ deadlineMinutes })
    },
    [updateStreakSettings]
  )

  /** Меняет часовой пояс расчёта дедлайна */
  const setStreakTimeZone = useCallback(
    (timeZone: string) => {
      updateStreakSettings({ timeZone })
    },
    [updateStreakSettings]
  )

  /** Включает/выключает дополнительный день прощения за выходные */
  const setStreakWeekendBonus = useCallback(
    (weekendBonus: boolean) => {
      updateStreakSettings({ weekendBonus })
    },
    [updateStreakSettings]
  )

  /** Сбрасывает настройки дедлайна стрика к заводским */
  const resetStreakSettings = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      streak: sanitizeStreakSettings({
        ...DEFAULT_STREAK_SETTINGS,
        updatedAtISO: new Date().toISOString(),
      }),
    }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 17 — МЕСЯЧНЫЕ KPI-ЦЕЛИ ДЛЯ ГЛУБОКОЙ АНАЛИТИКИ
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Добавляет месячную KPI-цель. Возвращает id новой цели.
   * Название и ориентир нормализуются по типу цели, дубликаты по названию
   * не создаются (возвращается id уже существующей цели).
   */
  const addMonthlyKpi = useCallback(
    (input: { title: string; kind: KpiKind; target: number }): string => {
      const kind: KpiKind = isKpiKind(input.kind) ? input.kind : 'prides'
      const title = (input.title ?? '').trim().slice(0, 120) || getKpiKind(kind).label

      const existing = getSnapshot().monthlyKpis.find(
        (k) => k.title.toLowerCase() === title.toLowerCase() && k.kind === kind
      )
      if (existing) return existing.id

      const kpi = createMonthlyKpi({
        title,
        kind,
        target: clampKpiTarget(kind, input.target),
      })
      updateStore((prev) => ({ ...prev, monthlyKpis: [kpi, ...prev.monthlyKpis] }))
      return kpi.id
    },
    [updateStore]
  )

  /** Частично обновляет цель: название, тип и/или ориентир */
  const updateMonthlyKpi = useCallback(
    (id: string, patch: Partial<Pick<MonthlyKpi, 'title' | 'kind' | 'target'>>) => {
      if (!id) return
      updateStore((prev) => ({
        ...prev,
        monthlyKpis: prev.monthlyKpis.map((k) => {
          if (k.id !== id) return k
          const kind: KpiKind = patch.kind && isKpiKind(patch.kind) ? patch.kind : k.kind
          const rawTarget =
            typeof patch.target === 'number' && Number.isFinite(patch.target) ? patch.target : k.target
          return {
            ...k,
            kind,
            title:
              patch.title !== undefined
                ? patch.title.trim().slice(0, 120) || k.title
                : k.title,
            target: clampKpiTarget(kind, rawTarget),
          }
        }),
      }))
    },
    [updateStore]
  )

  /** Удаляет месячную цель */
  const removeMonthlyKpi = useCallback(
    (id: string) => {
      if (!id) return
      updateStore((prev) => ({
        ...prev,
        monthlyKpis: prev.monthlyKpis.filter((k) => k.id !== id),
      }))
    },
    [updateStore]
  )

  /**
   * Переключает ручную отметку «выполнено» у цели.
   * Возвращает true, если цель теперь отмечена выполненной.
   */
  const toggleMonthlyKpiManual = useCallback(
    (id: string): boolean => {
      const current = getSnapshot().monthlyKpis.find((k) => k.id === id)
      const next = !current?.manualDone
      if (!id) return next
      updateStore((prev) => ({
        ...prev,
        monthlyKpis: prev.monthlyKpis.map((k) =>
          k.id === id ? { ...k, manualDone: !k.manualDone } : k
        ),
      }))
      return next
    },
    [updateStore]
  )

  /** Восстанавливает заводской набор месячных целей */
  const resetMonthlyKpis = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      monthlyKpis: DEFAULT_MONTHLY_KPIS.map((k) => ({ ...k })),
    }))
  }, [updateStore])

  /**
   * Принудительное сохранение текущего состояния в localStorage.
   * Запись в localStorage порождает событие `storage` в других вкладках,
   * поэтому соседние вкладки мгновенно подхватывают свежую базу (синхронизация).
   * Возвращает ISO-метку времени синхронизации.
   */
  const syncNow = useCallback((): string => {
    const current = getSnapshot()
    const nowISO = new Date().toISOString()
    cachedState = current
    saveStore(current)
    emitChange()
    return nowISO
  }, [])

  /**
   * ПРОФИЛЬ:
   * Мгновенно сохраняет любые поля профиля (имя, @username, био, город,
   * обложка, аватар, соцсети, цель месяца). Принимает частичный патч и
   * прогоняет результат через sanitizeProfile, чтобы данные оставались валидными.
   */
  const updateProfile = useCallback(
    (patch: Partial<OgonekProfile>) => {
      updateStore((prev) => {
        const nextProfile = sanitizeProfile({ ...prev.profile, ...patch })
        if (
          patch.monthlyGoal !== undefined &&
          patch.monthlyGoal !== prev.profile.monthlyGoal
        ) {
          nextProfile.monthlyGoalUpdatedAtISO = new Date().toISOString()
        }
        // ЭТАП 18: правки профиля пишем и в слепок активного аккаунта,
        // чтобы личность сохранялась при переключении между аккаунтами.
        const activeId = prev.auth.activeAccountId
        if (activeId && !activeId.startsWith('anon-') && !activeId.startsWith('acct-guest')) {
          try {
            const userLevel = nextProfile.difficultyLevel || nextProfile.level || 1
            const privacyPayload = {
              ...(nextProfile.privacy ?? {}),
              is_anonymous: Boolean(nextProfile.isAnonymous),
            }
            const payload: Record<string, any> = {
              id: activeId,
              display_name: nextProfile.displayName,
              username: nextProfile.username,
              bio: nextProfile.bio,
              city: nextProfile.city,
              website: nextProfile.website || '',
              level: userLevel,
              difficulty_level: userLevel,
              avatar_image: nextProfile.avatarImage,
              avatar_url: nextProfile.avatarImage,
              avatar_color: nextProfile.avatarColor,
              banner_image: nextProfile.bannerImage,
              cover_url: nextProfile.coverUrl || nextProfile.bannerImage,
              banner_preset: nextProfile.bannerPreset,
              verified: Boolean(nextProfile.verified),
              is_anonymous: Boolean(nextProfile.isAnonymous),
              privacy: privacyPayload,
              settings: {
                ...((nextProfile as any).settings ?? {}),
                level: userLevel,
              },
              updated_at: new Date().toISOString(),
            }
            if (nextProfile.age !== undefined && nextProfile.age !== null) {
              payload.age = nextProfile.age
            }
            if (nextProfile.tour_completed !== undefined) {
              payload.tour_completed = nextProfile.tour_completed
              payload.settings.tour_completed = nextProfile.tour_completed
            }
            updateProfileInDb(activeId, payload).catch((err: any) => {
              console.warn('[Ogonek] Upsert profile error:', err)
            })
          } catch {}
        }
        const accounts = activeId
          ? prev.auth.accounts.map((a) =>
              a.id === activeId ? { ...a, snapshot: accountSnapshotFromProfile(nextProfile) } : a
            )
          : prev.auth.accounts
        return {
          ...prev,
          profile: nextProfile,
          auth:
            accounts === prev.auth.accounts
              ? prev.auth
              : { ...prev.auth, accounts, updatedAtISO: new Date().toISOString() },
        }
      })
    },
    [updateStore]
  )

  /** Сбрасывает профиль к исходным значениям */
  const resetProfile = useCallback(() => {
    updateStore((prev) => ({ ...prev, profile: sanitizeProfile(DEFAULT_STORE_STATE.profile) }))
  }, [updateStore])

  /**
   * ДРУЗЬЯ:
   * Переключает подписку на друга из социального круга.
   * Возвращает true, если теперь пользователь подписан.
   */
  const toggleFollow = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const snap = getSnapshot()
      const current = snap.followingIds ?? []
      const willFollow = !current.includes(friendId)
      updateStore((prev) => {
        const list = prev.followingIds ?? []
        const followerSet = new Set(prev.followerIds ?? [])
        const nextFollowing = willFollow
          ? Array.from(new Set([...list, friendId]))
          : list.filter((id) => id !== friendId)
        const nextFriends = willFollow
          ? followerSet.has(friendId)
            ? Array.from(new Set([...(prev.friendIds ?? []), friendId]))
            : (prev.friendIds ?? [])
          : (prev.friendIds ?? []).filter((id) => id !== friendId)
        return {
          ...prev,
          followingIds: nextFollowing,
          exploreFollowingIds: nextFollowing,
          friendIds: nextFriends,
        }
      })

      // Синхронизация подписки с Supabase (SSOT: таблица `follows`)
      const currentUserId = snap.auth?.activeAccountId
      if (currentUserId && !currentUserId.startsWith('anon-') && !currentUserId.startsWith('acct-guest')) {
        const op = willFollow
          ? followUser(currentUserId, friendId)
          : unfollowUser(currentUserId, friendId)

        op.then((res: any) => {
          if (willFollow && res?.isMutual) {
            updateStore((prev) => ({
              ...prev,
              followerIds: Array.from(new Set([...(prev.followerIds ?? []), friendId])),
              friendIds: Array.from(new Set([...(prev.friendIds ?? []), friendId])),
            }))
            ensureMutualFriendshipChat(friendId)
          }
        }).catch((err) => {
          console.warn('[Ogonek] toggleFollow DB sync notice:', err)
        })
      }

      return willFollow
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 12 — ГЛОБАЛЬНЫЙ ХАБ ИССЛЕДОВАНИЯ (EXPLORE)
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * ПОДПИСКА НА УЧАСТНИКА СООБЩЕСТВА:
   * Единая логика подписки/отписки поверх таблицы `follows`.
   */
  const toggleExploreFollow = useCallback(
    (userId: string): boolean => {
      if (!userId) return false
      const snap = getSnapshot()
      const current = Array.from(
        new Set([...(snap.followingIds ?? []), ...(snap.exploreFollowingIds ?? [])])
      )
      const willFollow = !current.includes(userId)
      updateStore((prev) => {
        const list = prev.followingIds ?? []
        const followerSet = new Set(prev.followerIds ?? [])
        const nextFollowing = willFollow
          ? Array.from(new Set([...list, userId]))
          : list.filter((id) => id !== userId)
        const nextFriends = willFollow
          ? followerSet.has(userId)
            ? Array.from(new Set([...(prev.friendIds ?? []), userId]))
            : (prev.friendIds ?? [])
          : (prev.friendIds ?? []).filter((id) => id !== userId)
        return {
          ...prev,
          followingIds: nextFollowing,
          exploreFollowingIds: nextFollowing,
          friendIds: nextFriends,
        }
      })

      // Синхронизация подписки с Supabase (SSOT: таблица `follows`)
      const currentUserId = snap.auth?.activeAccountId
      if (currentUserId && !currentUserId.startsWith('anon-') && !currentUserId.startsWith('acct-guest')) {
        const op = willFollow
          ? followUser(currentUserId, userId)
          : unfollowUser(currentUserId, userId)

        op.then((res: any) => {
          if (willFollow) {
            if (res?.isMutual) {
              updateStore((prev) => ({
                ...prev,
                followerIds: Array.from(new Set([...(prev.followerIds ?? []), userId])),
                friendIds: Array.from(new Set([...(prev.friendIds ?? []), userId])),
              }))
              ensureMutualFriendshipChat(userId)
            } else {
              checkFriendshipFollow(userId, currentUserId)
                .then((theyFollowMe: boolean) => {
                  if (theyFollowMe) {
                    updateStore((prev) => ({
                      ...prev,
                      followerIds: Array.from(new Set([...(prev.followerIds ?? []), userId])),
                      friendIds: Array.from(new Set([...(prev.friendIds ?? []), userId])),
                    }))
                    ensureMutualFriendshipChat(userId)
                  }
                })
                .catch(() => {})
            }
          }
        }).catch((err) => {
          console.warn('[Ogonek] toggleExploreFollow DB sync notice:', err)
        })
      }

      return willFollow
    },
    [updateStore]
  )

  /**
   * Взаимные друзья: гарантирует создание ветки чата с приветственным сообщением
   */
  const ensureMutualFriendshipChat = useCallback(
    (
      friendId: string,
      peerMeta?: { name?: string; username?: string; avatarUrl?: string; initials?: string }
    ) => {
      if (!friendId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const existing = threads[friendId]
        const alreadyHasGreeting = existing?.messages?.some((m) =>
          m.text?.includes('Вы стали друзьями!')
        )

        if (alreadyHasGreeting) return prev

        const greetingMsg = makeChatMessage({
          authorId: friendId,
          text: 'Вы стали друзьями! 🤝 Теперь вам взаимно доступны личные записи и прямой диалог.',
        })

        const nextThread = existing
          ? {
              ...existing,
              peerMeta: peerMeta || existing.peerMeta,
              messages: [...existing.messages, greetingMsg],
            }
          : {
              ...emptyThread(),
              peerMeta: peerMeta || undefined,
              messages: [greetingMsg],
            }

        const nextFriends = Array.from(new Set([...(prev.friendIds ?? []), friendId]))

        return {
          ...prev,
          friendIds: nextFriends,
          chatThreads: {
            ...threads,
            [friendId]: nextThread,
          },
        }
      })
    },
    [updateStore]
  )

  /**
   * ОГОНЁК ПОД ПУБЛИКАЦИЕЙ СООБЩЕСТВА:
   * Переключает лайк на фото-достижении хаба. Возвращает true, если лайк зажжён.
   */
  const toggleExplorePostLike = useCallback(
    (postId: string): boolean => {
      if (!postId) return false
      const current = getSnapshot().exploreLikedPosts ?? []
      const willLike = !current.includes(postId)
      updateStore((prev) => {
        const list = prev.exploreLikedPosts ?? []
        const next = willLike ? [...list, postId] : list.filter((id) => id !== postId)
        return { ...prev, exploreLikedPosts: Array.from(new Set(next)) }
      })
      return willLike
    },
    [updateStore]
  )

  /**
   * СОХРАНИТЬ ПУБЛИКАЦИЮ:
   * Кладёт/убирает фото-достижение в личную коллекцию хаба.
   * Возвращает true, если публикация теперь сохранена.
   */
  const toggleExplorePostSave = useCallback(
    (postId: string): boolean => {
      if (!postId) return false
      const current = getSnapshot().exploreSavedPosts ?? []
      const willSave = !current.includes(postId)
      updateStore((prev) => {
        const list = prev.exploreSavedPosts ?? []
        const next = willSave ? [postId, ...list] : list.filter((id) => id !== postId)
        return { ...prev, exploreSavedPosts: Array.from(new Set(next)) }
      })
      return willSave
    },
    [updateStore]
  )

  /** Добавляет поисковый запрос в недавние (свежие — в начале, максимум 8) */
  const addExploreSearch = useCallback(
    (query: string) => {
      const clean = (query ?? '').trim().slice(0, 60)
      if (!clean) return
      updateStore((prev) => {
        const existing = (prev.exploreRecentSearches ?? []).filter(
          (q) => q.toLowerCase() !== clean.toLowerCase()
        )
        return {
          ...prev,
          exploreRecentSearches: [clean, ...existing].slice(0, 8),
        }
      })
    },
    [updateStore]
  )

  /** Удаляет один запрос из недавних */
  const removeExploreSearch = useCallback(
    (query: string) => {
      if (!query) return
      updateStore((prev) => ({
        ...prev,
        exploreRecentSearches: (prev.exploreRecentSearches ?? []).filter((q) => q !== query),
      }))
    },
    [updateStore]
  )

  /** Полностью очищает историю поиска хаба */
  const clearExploreSearches = useCallback(() => {
    updateStore((prev) => ({ ...prev, exploreRecentSearches: [] }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 11 — СИСТЕМА ДРУЗЕЙ, ПОДПИСОК И ЗАЯВОК
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * ДОБАВЛЕНИЕ В ДРУЗЬЯ:
   * Принимает входящую заявку или добавляет человека в круг друзей напрямую.
   * Друг всегда становится и подпиской; заявка убирается из входящих/исходящих.
   * Возвращает true, если человек теперь в друзьях.
   */
  const addFriend = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      updateStore((prev) => {
        const friendIds = Array.from(new Set([...(prev.friendIds ?? []), friendId]))
        const followingIds = Array.from(new Set([...(prev.followingIds ?? []), friendId]))
        return {
          ...prev,
          friendIds,
          followingIds,
          incomingFriendRequests: (prev.incomingFriendRequests ?? []).filter(
            (id) => id !== friendId
          ),
          outgoingFriendRequests: (prev.outgoingFriendRequests ?? []).filter(
            (id) => id !== friendId
          ),
          dismissedSuggestions: (prev.dismissedSuggestions ?? []).filter((id) => id !== friendId),
        }
      })
      return true
    },
    [updateStore]
  )

  /** УДАЛЕНИЕ ИЗ ДРУЗЕЙ: снимает взаимную связь (подписка при этом сохраняется) */
  const removeFriend = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const wasFriend = (getSnapshot().friendIds ?? []).includes(friendId)
      updateStore((prev) => ({
        ...prev,
        friendIds: (prev.friendIds ?? []).filter((id) => id !== friendId),
      }))
      return wasFriend
    },
    [updateStore]
  )

  /** ПРИНЯТЬ ВХОДЯЩУЮ ЗАЯВКУ: переводит её в друзья и подписку */
  const acceptFriendRequest = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const pending = (getSnapshot().incomingFriendRequests ?? []).includes(friendId)
      if (!pending) return false
      return addFriend(friendId)
    },
    [addFriend]
  )

  /** ОТКЛОНИТЬ ВХОДЯЩУЮ ЗАЯВКУ: убирает её и скрывает человека из рекомендаций */
  const declineFriendRequest = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => ({
        ...prev,
        incomingFriendRequests: (prev.incomingFriendRequests ?? []).filter(
          (id) => id !== friendId
        ),
        dismissedSuggestions: Array.from(
          new Set([...(prev.dismissedSuggestions ?? []), friendId])
        ),
      }))
    },
    [updateStore]
  )

  /**
   * ОТПРАВИТЬ ЗАЯВКУ В ДРУЗЬЯ:
   * Кладёт человека в исходящие заявки и убирает из рекомендаций.
   * Возвращает true, если заявка отправлена впервые.
   */
  const sendFriendRequest = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const already =
        (getSnapshot().outgoingFriendRequests ?? []).includes(friendId) ||
        (getSnapshot().friendIds ?? []).includes(friendId)
      if (already) return false
      updateStore((prev) => ({
        ...prev,
        outgoingFriendRequests: Array.from(
          new Set([...(prev.outgoingFriendRequests ?? []), friendId])
        ),
        dismissedSuggestions: (prev.dismissedSuggestions ?? []).filter((id) => id !== friendId),
      }))
      return true
    },
    [updateStore]
  )

  /** ОТМЕНИТЬ ИСХОДЯЩУЮ ЗАЯВКУ */
  const cancelFriendRequest = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => ({
        ...prev,
        outgoingFriendRequests: (prev.outgoingFriendRequests ?? []).filter(
          (id) => id !== friendId
        ),
      }))
    },
    [updateStore]
  )

  /** СКРЫТЬ РЕКОМЕНДАЦИЮ («не показывать снова») */
  const dismissSuggestion = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => ({
        ...prev,
        dismissedSuggestions: Array.from(
          new Set([...(prev.dismissedSuggestions ?? []), friendId])
        ),
        outgoingFriendRequests: (prev.outgoingFriendRequests ?? []).filter(
          (id) => id !== friendId
        ),
      }))
    },
    [updateStore]
  )

  /** ВЕРНУТЬ ВСЕ СКРЫТЫЕ РЕКОМЕНДАЦИИ ОБРАТНО */
  const restoreSuggestions = useCallback(() => {
    updateStore((prev) => ({ ...prev, dismissedSuggestions: [] }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 7 — СТОРИС ДРУЗЕЙ (Instagram-кружочки)
     ══════════════════════════════════════════════════════════════════════ */

  /** Помечает сторис друга просмотренной — кружок гаснет в серый */
  const markStoryViewed = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => {
        const viewed = prev.viewedStoryIds ?? []
        if (viewed.includes(friendId)) return prev
        return { ...prev, viewedStoryIds: [...viewed, friendId] }
      })
    },
    [updateStore]
  )

  /** Помечает пачку сторис просмотренными («Посмотреть всё») */
  const markStoriesViewed = useCallback(
    (friendIds: string[]) => {
      if (!friendIds || friendIds.length === 0) return
      updateStore((prev) => {
        const viewed = prev.viewedStoryIds ?? []
        const next = Array.from(new Set([...viewed, ...friendIds]))
        if (next.length === viewed.length) return prev
        return { ...prev, viewedStoryIds: next }
      })
    },
    [updateStore]
  )

  /** Сбрасывает отметки просмотра — все кружочки снова яркие */
  const resetStoryViews = useCallback(() => {
    updateStore((prev) => ({ ...prev, viewedStoryIds: [] }))
  }, [updateStore])

  /** Публикует личный кадр «Моей истории» */
  const postMyStory = useCallback(
    (story: MyStory) => {
      if (!story) return
      updateStore((prev) => ({
        ...prev,
        myStories: [story, ...(prev.myStories ?? [])].slice(0, 30),
      }))

      const activeId = getSnapshot().auth?.activeAccountId
      if (activeId && !activeId.startsWith('anon-') && !activeId.startsWith('acct-guest')) {
        publishStoryToDb(activeId, story).catch((err) => {
          console.warn('[Ogonek] Publish story to DB error:', err)
        })
      }
    },
    [updateStore]
  )

  /** Удаляет личный кадр истории */
  const removeMyStory = useCallback(
    (id: string) => {
      if (!id) return
      updateStore((prev) => ({
        ...prev,
        myStories: (prev.myStories ?? []).filter((s) => s.id !== id),
      }))
      deleteStoryFromDb(id).catch(() => {})
    },
    [updateStore]
  )

  /** Полностью очищает «Мою историю» */
  const clearMyStories = useCallback(() => {
    updateStore((prev) => ({ ...prev, myStories: [] }))
  }, [updateStore])

  const importState = useCallback(
    (newState: OgonekStoreState) => {
      updateStore((prev) => ({
        ...newState,
        // FIX BUG #2: Никогда не затираем уже загруженные дни пустым массивом при фоновом импорте/синхронизации!
        days: Array.isArray(newState.days) && newState.days.length > 0 ? newState.days : prev.days,
        // Защита от импорта без новых полей (старые архивы / сторонние JSON)
        comments: newState.comments ?? {},
        customEmojis: newState.customEmojis ?? [],
        dayReactions: newState.dayReactions ?? {},
        myReactions: newState.myReactions ?? {},
        profile: sanitizeProfile(newState.profile),
        followingIds: sanitizeFollowingIds(newState.followingIds),
        viewedStoryIds: sanitizeViewedStoryIds(newState.viewedStoryIds),
        myStories: sanitizeMyStories(newState.myStories),
        friendIds: sanitizeFriendIds(newState.friendIds),
        incomingFriendRequests: sanitizeFriendRequestIds(
          newState.incomingFriendRequests,
          DEFAULT_INCOMING_FRIEND_REQUEST_IDS
        ),
        outgoingFriendRequests: sanitizeFriendRequestIds(
          newState.outgoingFriendRequests,
          DEFAULT_OUTGOING_FRIEND_REQUEST_IDS
        ),
        dismissedSuggestions: sanitizeDismissedSuggestions(newState.dismissedSuggestions),
        morningFocusHistory: (() => {
          const raw = sanitizeMorningFocusHistory(
            (newState as Partial<OgonekStoreState>).morningFocusHistory
          )
          if (Object.keys(raw).length > 0) return raw
          const migrated = migrateIntentionsToHistory(newState.morningIntentions)
          return Object.keys(migrated).length > 0 ? migrated : prev.morningFocusHistory
        })(),
        // Если в архиве нет поля ачивок — не теряем уже собранные данные
        verifiedAchievements: Array.isArray(newState.verifiedAchievements)
          ? sanitizeVerifiedAchievements(newState.verifiedAchievements)
          : prev.verifiedAchievements,
        exploreFollowingIds: sanitizeExploreFollowingIds(newState.exploreFollowingIds),
        exploreLikedPosts: sanitizeExplorePostIds(newState.exploreLikedPosts),
        exploreSavedPosts: sanitizeExplorePostIds(newState.exploreSavedPosts),
        exploreRecentSearches: sanitizeExploreRecentSearches(newState.exploreRecentSearches),
        // Переписки из архива — если их нет, не теряем уже начатые диалоги
        chatThreads:
          newState.chatThreads && typeof newState.chatThreads === 'object'
            ? sanitizeChatThreads(newState.chatThreads, {})
            : prev.chatThreads,
        chatActiveFriendId: sanitizeChatActiveFriendId(newState.chatActiveFriendId),
        theme: newState.theme !== undefined ? sanitizeTheme(newState.theme) : prev.theme,
        accent: newState.accent !== undefined ? sanitizeAccent(newState.accent) : prev.accent,
        fontScale: newState.fontScale !== undefined ? sanitizeFontScale(newState.fontScale) : prev.fontScale,
        feedDensity: newState.feedDensity !== undefined ? sanitizeFeedDensity(newState.feedDensity) : prev.feedDensity,
        security: sanitizeSecurityState(newState.security),
        privacy: sanitizePrivacySettings(newState.privacy),
        streak: sanitizeStreakSettings(newState.streak),
        // Если в архиве нет месячных целей — не теряем уже настроенные KPI
        monthlyKpis: Array.isArray(newState.monthlyKpis)
          ? sanitizeMonthlyKpis(newState.monthlyKpis)
          : prev.monthlyKpis,
        // ЭТАП 18: аккаунты сохраняем, если импортируемый архив их не содержит
        auth:
          newState.auth && Array.isArray(newState.auth.accounts)
            ? sanitizeAuthState(newState.auth)
            : prev.auth,
      }))
    },
    [updateStore]
  )

  /** Полностью сбрасывает хранилище к заводским значениям Priday */
  const resetToDefaults = useCallback(() => {
    updateStore(() => DEFAULT_STORE_STATE)
  }, [updateStore])

  /**
   * ЖИВЫЕ РЕАКЦИИ:
   * Переключает реакцию пользователя на цель (день или отдельную запись).
   * target: "day:12" | "day:12:pride:0" | "day:12:grat:2"
   * Возвращает true, если реакция теперь активна.
   */
  const toggleReaction = useCallback(
    (target: string, emojiId: string): boolean => {
      if (!target || !emojiId) return false
      const current = getSnapshot()
      const mineBefore = current.myReactions[target] ?? []
      const willBeActive = !mineBefore.includes(emojiId)

      updateStore((prev) => {
        const countsForTarget: Record<string, number> = { ...(prev.dayReactions[target] ?? {}) }
        const mineForTarget = prev.myReactions[target] ?? []
        const isMine = mineForTarget.includes(emojiId)

        const dayReactions: ReactionCounts = { ...prev.dayReactions }
        const myReactions: MyReactions = { ...prev.myReactions }

        if (isMine) {
          const nextCount = (countsForTarget[emojiId] ?? 1) - 1
          if (nextCount > 0) {
            countsForTarget[emojiId] = nextCount
          } else {
            delete countsForTarget[emojiId]
          }
          if (Object.keys(countsForTarget).length > 0) {
            dayReactions[target] = countsForTarget
          } else {
            delete dayReactions[target]
          }

          const nextMine = mineForTarget.filter((id) => id !== emojiId)
          if (nextMine.length > 0) {
            myReactions[target] = nextMine
          } else {
            delete myReactions[target]
          }
        } else {
          countsForTarget[emojiId] = (countsForTarget[emojiId] ?? 0) + 1
          dayReactions[target] = countsForTarget
          myReactions[target] = [...mineForTarget, emojiId]
        }

        return { ...prev, dayReactions, myReactions }
      })

      return willBeActive
    },
    [updateStore]
  )

  /** Реакции для конкретной цели */
  const getReactionsFor = useCallback((target: string): Record<string, number> => {
    return getSnapshot().dayReactions[target] ?? {}
  }, [])

  /** Список emojiId, которые пользователь поставил на цель */
  const getMyReactionsFor = useCallback((target: string): string[] => {
    return getSnapshot().myReactions[target] ?? []
  }, [])

  /**
   * КОММЕНТАРИИ:
   * 100% реальная загрузка из Supabase (`comments` + `comment_likes` + `profiles`).
   */
  const loadCommentsForTargets = useCallback(
    async (
      targets: string[],
      postAuthorHintByTarget?: Record<string, string | null>
    ): Promise<{ ok: boolean; error?: string }> => {
      const snap = getSnapshot()
      const uid = snap.auth?.activeAccountId || null
      const res = await fetchCommentsForTargets(targets, uid, postAuthorHintByTarget)
      if (!res.ok) {
        return { ok: false, error: res.error }
      }

      updateStore((prev) => {
        const nextComments = { ...(prev.comments ?? {}) }
        let changed = false
        for (const [targetKey, fetchedList] of Object.entries(res.commentsByTarget)) {
          const prevList = nextComments[targetKey] ?? []
          const prevSig = JSON.stringify(
            prevList.map((c) => [c.id, c.parentId, c.text, c.gifUrl || null, c.likes, c.likedByMe, c.isMine, c.reactions || [], c.avatarUrl])
          )
          const nextSig = JSON.stringify(
            fetchedList.map((c) => [c.id, c.parentId, c.text, c.gifUrl || null, c.likes, c.likedByMe, c.isMine, c.reactions || [], c.avatarUrl])
          )
          if (prevSig !== nextSig) {
            nextComments[targetKey] = fetchedList
            changed = true
          }
        }
        if (!changed) return prev
        return {
          ...prev,
          comments: nextComments,
        }
      })

      return { ok: true }
    },
    [updateStore]
  )

  /**
   * Добавляет комментарий (или ответ) с обязательным сохранением в Supabase.
   * При ошибке базы данных НЕ делает фейковый локальный успех — возвращает error.
   */
  const addComment = useCallback(
    async (
      target: string,
      text: string,
      options?: {
        parentId?: string | null
        postAuthorId?: string | null
        gifUrl?: string | null
      }
    ): Promise<{ ok: boolean; comment?: Comment | null; error?: string }> => {
      const trimmed = (text ?? '').trim().slice(0, 2000)
      const cleanGifUrl =
        typeof options?.gifUrl === 'string' && options.gifUrl.trim()
          ? options.gifUrl.trim().slice(0, 1000)
          : null
      if (!target || (!trimmed && !cleanGifUrl)) {
        return { ok: false, error: 'Введите текст или выберите GIF' }
      }

      const snap = getSnapshot()
      const uid = snap.auth?.activeAccountId || null
      const isSignedCloudUser = Boolean(
        uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)
      )

      const authorName = snap.profile?.displayName || snap.profile?.username || 'Пользователь'
      const initials = getInitials(snap.profile?.displayName, snap.profile?.username || 'user')
      const resolvedPostAuthor =
        options?.postAuthorId ?? parsePostAuthorIdFromTarget(target) ?? null

      if (isSignedCloudUser) {
        const res = await createCommentInDb({
          userId: uid,
          targetKey: target,
          text: trimmed,
          gifUrl: cleanGifUrl,
          parentId: options?.parentId ?? null,
          postAuthorId: resolvedPostAuthor,
          authorName,
          initials,
        })

        if (!res.ok || !res.comment) {
          return { ok: false, error: res.error || 'Не удалось сохранить комментарий' }
        }

        const savedComment = res.comment
        updateStore((prev) => {
          const list = prev.comments?.[target] ?? []
          if (list.some((c) => c.id === savedComment.id)) return prev
          return {
            ...prev,
            comments: { ...prev.comments, [target]: [...list, savedComment] },
          }
        })
        return { ok: true, comment: savedComment }
      }

      // Офлайн / гостевой режим (без привязанной учётки Supabase)
      const localComment: Comment = {
        id: `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        parentId: options?.parentId ?? null,
        authorId: uid,
        author: authorName,
        username: snap.profile?.username || null,
        avatarUrl: snap.profile?.avatarImage || (snap.profile as any)?.avatar_url || null,
        avatarColor: snap.profile?.avatarColor || '#FF5C00',
        verified: Boolean(snap.profile?.verified),
        postAuthorId: resolvedPostAuthor,
        initials,
        text: trimmed,
        gifUrl: cleanGifUrl,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedByMe: false,
        isMine: true,
      }

      updateStore((prev) => {
        const list = prev.comments?.[target] ?? []
        return {
          ...prev,
          comments: { ...prev.comments, [target]: [...list, localComment] },
        }
      })

      return { ok: true, comment: localComment }
    },
    [updateStore]
  )

  /** Ответ на конкретный комментарий */
  const addReply = useCallback(
    async (
      target: string,
      parentId: string,
      text: string,
      postAuthorIdOrOptions?: string | null | { postAuthorId?: string | null; gifUrl?: string | null }
    ): Promise<{ ok: boolean; comment?: Comment | null; error?: string }> => {
      if (!parentId) return { ok: false, error: 'Родительский комментарий не найден' }
      const opts =
        postAuthorIdOrOptions && typeof postAuthorIdOrOptions === 'object'
          ? postAuthorIdOrOptions
          : { postAuthorId: postAuthorIdOrOptions ?? null }
      return addComment(target, text, {
        parentId,
        postAuthorId: opts.postAuthorId ?? null,
        gifUrl: opts.gifUrl ?? null,
      })
    },
    [addComment]
  )

  /** Переключает лайк на комментарии и сохраняет в Supabase `comment_likes` (с откатом при ошибке). */
  const toggleCommentLike = useCallback(
    async (
      target: string,
      commentId: string
    ): Promise<{ ok: boolean; liked?: boolean; error?: string }> => {
      if (!target || !commentId) return { ok: false, error: 'Некорректный комментарий' }
      const current = getSnapshot()
      const uid = current.auth?.activeAccountId || null
      const found = (current.comments?.[target] ?? []).find((c) => c.id === commentId)
      if (!found) return { ok: false, error: 'Комментарий не найден' }

      const prevLiked = Boolean(found.likedByMe)
      const prevLikes = Math.max(0, found.likes ?? 0)
      const willLike = !prevLiked

      // Мгновенный отклик UI
      updateStore((prev) => {
        const list = prev.comments?.[target] ?? []
        return {
          ...prev,
          comments: {
            ...prev.comments,
            [target]: list.map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    likedByMe: willLike,
                    likes: Math.max(0, c.likes + (willLike ? 1 : -1)),
                  }
                : c
            ),
          },
        }
      })

      const isSignedUuid = Boolean(
        uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)
      )
      const isCommentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        commentId
      )

      if (isSignedUuid && isCommentUuid) {
        const res = await toggleCommentLikeInDb({
          userId: uid,
          commentId,
          willLike,
        })
        if (!res.ok) {
          // Честный откат при ошибке Supabase
          updateStore((prev) => {
            const list = prev.comments?.[target] ?? []
            return {
              ...prev,
              comments: {
                ...prev.comments,
                [target]: list.map((c) =>
                  c.id === commentId ? { ...c, likedByMe: prevLiked, likes: prevLikes } : c
                ),
              },
            }
          }, true)
          return { ok: false, liked: prevLiked, error: res.error || 'Не удалось обновить лайк' }
        }
        const reconciledLiked = typeof res.liked === 'boolean' ? res.liked : willLike
        const reconciledCount = typeof res.count === 'number' ? res.count : undefined
        updateStore((prev) => {
          const list = prev.comments?.[target] ?? []
          return {
            ...prev,
            comments: {
              ...prev.comments,
              [target]: list.map((c) =>
                c.id === commentId
                  ? {
                      ...c,
                      likedByMe: reconciledLiked,
                      likes: reconciledCount !== undefined ? reconciledCount : c.likes,
                    }
                  : c
              ),
            },
          }
        }, true)
        return { ok: true, liked: reconciledLiked }
      }

      saveStore(getSnapshot(), undefined, true)
      return { ok: true, liked: willLike }
    },
    [updateStore]
  )

  /** Переключает эмодзи-реакцию на комментарии (`public.comment_reactions`, с откатом при ошибке). */
  const toggleCommentReaction = useCallback(
    async (
      target: string,
      commentId: string,
      emoji: string
    ): Promise<{ ok: boolean; reacted?: boolean; error?: string }> => {
      const cleanEmoji = (emoji || '').trim().slice(0, 16)
      if (!target || !commentId || !cleanEmoji) {
        return { ok: false, error: 'Некорректная реакция' }
      }
      const current = getSnapshot()
      const uid = current.auth?.activeAccountId || null
      const found = (current.comments?.[target] ?? []).find((c) => c.id === commentId)
      if (!found) return { ok: false, error: 'Комментарий не найден' }

      const prevReactions = found.reactions ? found.reactions.map((r) => ({ ...r })) : []
      const existing = prevReactions.find((r) => r.emoji === cleanEmoji)
      const willReact = !existing?.reactedByMe

      const applyDelta = (list: typeof prevReactions, add: boolean) => {
        const idx = list.findIndex((r) => r.emoji === cleanEmoji)
        if (add) {
          if (idx >= 0) {
            return list.map((r, i) =>
              i === idx ? { ...r, count: r.count + (r.reactedByMe ? 0 : 1), reactedByMe: true } : r
            )
          }
          return [...list, { emoji: cleanEmoji, count: 1, reactedByMe: true }]
        }
        if (idx < 0) return list
        const nextCount = list[idx].count - (list[idx].reactedByMe ? 1 : 0)
        if (nextCount <= 0) return list.filter((_, i) => i !== idx)
        return list.map((r, i) =>
          i === idx ? { ...r, count: nextCount, reactedByMe: false } : r
        )
      }

      const nextReactions = applyDelta(prevReactions, willReact)

      updateStore((prev) => {
        const list = prev.comments?.[target] ?? []
        return {
          ...prev,
          comments: {
            ...prev.comments,
            [target]: list.map((c) =>
              c.id === commentId
                ? { ...c, reactions: nextReactions.length > 0 ? nextReactions : undefined }
                : c
            ),
          },
        }
      })

      const isSignedUuid = Boolean(
        uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)
      )
      const isCommentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        commentId
      )

      if (isSignedUuid && isCommentUuid) {
        const res = await toggleCommentReactionInDb({
          userId: uid,
          commentId,
          emoji: cleanEmoji,
          willReact,
        })
        if (!res.ok) {
          updateStore((prev) => {
            const list = prev.comments?.[target] ?? []
            return {
              ...prev,
              comments: {
                ...prev.comments,
                [target]: list.map((c) =>
                  c.id === commentId
                    ? { ...c, reactions: prevReactions.length > 0 ? prevReactions : undefined }
                    : c
                ),
              },
            }
          })
          return {
            ok: false,
            reacted: !willReact,
            error: res.error || 'Не удалось обновить реакцию',
          }
        }
      }

      return { ok: true, reacted: willReact }
    },
    [updateStore]
  )

  /**
   * Удаляет комментарий в Supabase (RLS разрешает автору комментария или владельцу поста)
   * и убирает его из локального состояния только после подтверждения БД.
   */
  const deleteComment = useCallback(
    async (target: string, commentId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!target || !commentId) return { ok: false, error: 'Некорректный комментарий' }
      const snap = getSnapshot()
      const uid = snap.auth?.activeAccountId || null
      const isSignedUuid = Boolean(
        uid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)
      )
      const isCommentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        commentId
      )

      if (isSignedUuid && isCommentUuid) {
        const res = await deleteCommentInDb({ commentId })
        if (!res.ok) {
          return { ok: false, error: res.error || 'Не удалось удалить комментарий' }
        }
      }

      updateStore((prev) => {
        const list = prev.comments?.[target] ?? []
        const toRemove = new Set<string>([commentId])
        let changed = true
        while (changed) {
          changed = false
          for (const c of list) {
            if (c.parentId && toRemove.has(c.parentId) && !toRemove.has(c.id)) {
              toRemove.add(c.id)
              changed = true
            }
          }
        }
        return {
          ...prev,
          comments: {
            ...prev.comments,
            [target]: list.filter((c) => !toRemove.has(c.id)),
          },
        }
      })

      return { ok: true }
    },
    [updateStore]
  )

  /** Все комментарии цели (плоский список; дерево собирается на клиенте) */
  const getCommentsFor = useCallback((target: string): Comment[] => {
    return getSnapshot().comments?.[target] ?? []
  }, [])

  /** Полностью очищает обсуждение цели */
  const clearComments = useCallback(
    (target: string) => {
      if (!target) return
      updateStore((prev) => {
        const comments = { ...prev.comments }
        delete comments[target]
        return { ...prev, comments }
      })
    },
    [updateStore]
  )

  /**
   * КОНСТРУКТОР СМАЙЛИКОВ:
   * Добавляет пользовательский смайлик. Возвращает id (существующий, если дубликат).
   */
  const addCustomEmoji = useCallback(
    (char: string, label: string): string | null => {
      const trimmedChar = (char ?? '').trim().slice(0, 8)
      if (!trimmedChar) return null

      const existing = getSnapshot().customEmojis.find((e) => e.char === trimmedChar)
      if (existing) return existing.id

      const id = `emoji-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      const emoji: CustomEmoji = {
        id,
        char: trimmedChar,
        label: (label ?? '').trim().slice(0, 40) || 'Мой смайлик',
        createdAt: new Date().toISOString(),
      }
      updateStore((prev) => {
        if (prev.customEmojis.some((e) => e.char === emoji.char)) return prev
        return { ...prev, customEmojis: [...prev.customEmojis, emoji] }
      })
      return id
    },
    [updateStore]
  )

  /** Удаляет кастомный смайлик и все связанные с ним реакции */
  const removeCustomEmoji = useCallback(
    (id: string) => {
      updateStore((prev) => {
        const customEmojis = prev.customEmojis.filter((e) => e.id !== id)

        const dayReactions: ReactionCounts = {}
        for (const [target, counts] of Object.entries(prev.dayReactions)) {
          const next: Record<string, number> = { ...counts }
          delete next[id]
          if (Object.keys(next).length > 0) dayReactions[target] = next
        }

        const myReactions: MyReactions = {}
        for (const [target, ids] of Object.entries(prev.myReactions)) {
          const next = ids.filter((x) => x !== id)
          if (next.length > 0) myReactions[target] = next
        }

        return { ...prev, customEmojis, dayReactions, myReactions }
      })
    },
    [updateStore]
  )

  /** Оценка гордости по шкале 1..10 */
  const ratePride = useCallback(
    (dayId: number, index: number, scale: number) => {
      const clamped = Math.min(10, Math.max(1, Math.round(scale)))
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const prides = d.prides.map((p, i) => (i === index ? { ...p, scale: clamped } : p))
          return { ...d, prides }
        }),
      }))
    },
    [updateStore]
  )

  /** Оценка благодарности по шкале 1..10 (строка превращается в объект с оценкой) */
  const rateGratitude = useCallback(
    (dayId: number, index: number, rating: number) => {
      const clamped = Math.min(10, Math.max(1, Math.round(rating)))
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const gratitudes = d.gratitudes.map((g, i) =>
            i === index ? withGratitudeRating(g, clamped) : g
          )
          return { ...d, gratitudes }
        }),
      }))
    },
    [updateStore]
  )

  /** Снимает оценку с гордости (обнуляет) */
  const clearPrideRating = useCallback(
    (dayId: number, index: number) => {
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const prides = d.prides.map((p, i) => (i === index ? { ...p, scale: 0 } : p))
          return { ...d, prides }
        }),
      }))
    },
    [updateStore]
  )

  /** Снимает оценку с благодарности */
  const clearGratitudeRating = useCallback(
    (dayId: number, index: number) => {
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const gratitudes = d.gratitudes.map((g, i) => {
            if (i !== index) return g
            if (typeof g === 'string') return { text: g, rating: 0 }
            return { ...g, rating: 0 }
          })
          return { ...d, gratitudes }
        }),
      }))
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 9 — ПРИВАТНОСТЬ ДНЯ И ГОРДОСТЕЙ
     ══════════════════════════════════════════════════════════════════════ */

  /** Меняет приватность всего дня и синхронно обновляет приватность всех пунктов гордостей */
  const setDayVisibility = useCallback(
    async (dayId: number, level: VisibilityLevel) => {
      const next = normalizeVisibility(level)
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === dayId
            ? { ...d, visibility: next, prides: d.prides.map((p) => ({ ...p, visibility: next })) }
            : d
        ),
      }))

      try {
        const supabase = getSupabase()
        const uid = getSnapshot().auth?.activeAccountId
        if (supabase && uid) {
          await Promise.allSettled([
            supabase
              .from('days')
              .update({ visibility: next })
              .match({ user_id: uid, client_id: String(dayId) }),
            supabase
              .from('prides')
              .update({ visibility: next })
              .match({ user_id: uid, day_client_id: String(dayId) }),
          ])
        }
      } catch (err) {
        console.error('[Ogonek] Error updating day and prides visibility in Supabase:', err)
      }
    },
    [updateStore]
  )

  /** Меняет аудиторию дня (Лично / Друзьям / Всем / Группе) */
  const setDayAudience = useCallback(
    async (dayId: number, level: VisibilityLevel, groupId?: string | null, groupName?: string) => {
      const next = normalizeVisibility(level)
      const cleanGroupId = level === 'group' ? (groupId || null) : null
      const cleanGroupName = level === 'group' ? groupName : undefined

      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === dayId
            ? {
                ...d,
                visibility: next,
                groupId: cleanGroupId,
                groupName: cleanGroupName,
                prides: d.prides.map((p) => ({
                  ...p,
                  visibility: next,
                  groupId: cleanGroupId,
                  groupName: cleanGroupName,
                })),
                gratitudes: d.gratitudes.map((g) =>
                  typeof g === 'string'
                    ? { text: g, visibility: next, groupId: cleanGroupId, groupName: cleanGroupName }
                    : { ...g, visibility: next, groupId: cleanGroupId, groupName: cleanGroupName }
                ),
              }
            : d
        ),
      }))

      try {
        const supabase = getSupabase()
        const uid = getSnapshot().auth?.activeAccountId
        if (supabase && uid) {
          await Promise.allSettled([
            supabase
              .from('days')
              .update({ visibility: next, group_id: cleanGroupId })
              .match({ user_id: uid, client_id: String(dayId) }),
            supabase
              .from('prides')
              .update({ visibility: next, group_id: cleanGroupId })
              .match({ user_id: uid, day_client_id: String(dayId) }),
            supabase
              .from('gratitudes')
              .update({ visibility: next, group_id: cleanGroupId })
              .match({ user_id: uid, day_client_id: String(dayId) }),
          ])
        }
      } catch (err) {
        console.error('[Ogonek] Error updating day audience in Supabase:', err)
      }
    },
    [updateStore]
  )

  /** Меняет приватность конкретной гордости дня */
  const setPrideVisibility = useCallback(
    async (dayId: number, index: number, level: VisibilityLevel) => {
      const next = normalizeVisibility(level)
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const prides = d.prides.map((p, i) => (i === index ? { ...p, visibility: next } : p))
          return { ...d, prides }
        }),
      }))

      try {
        const supabase = getSupabase()
        const uid = getSnapshot().auth?.activeAccountId
        if (supabase && uid) {
          const clientId = `day:${dayId}:pride:${index}`
          await supabase
            .from('prides')
            .update({ visibility: next })
            .match({ user_id: uid, client_id: clientId })
        }
      } catch (err) {
        console.error('[Ogonek] Error updating pride visibility in Supabase:', err)
      }
    },
    [updateStore]
  )

  /**
   * Применяет один уровень приватности ко всему дню сразу:
   * и к самому дню, и ко всем его гордостям.
   */
  const setAllPridesVisibility = useCallback(
    async (dayId: number, level: VisibilityLevel) => {
      const next = normalizeVisibility(level)
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === dayId
            ? { ...d, visibility: next, prides: d.prides.map((p) => ({ ...p, visibility: next })) }
            : d
        ),
      }))

      try {
        const supabase = getSupabase()
        const uid = getSnapshot().auth?.activeAccountId
        if (supabase && uid) {
          await Promise.allSettled([
            supabase
              .from('days')
              .update({ visibility: next })
              .match({ user_id: uid, client_id: String(dayId) }),
            supabase
              .from('prides')
              .update({ visibility: next })
              .match({ user_id: uid, day_client_id: String(dayId) }),
          ])
        }
      } catch (err) {
        console.error('[Ogonek] Error updating all prides visibility in Supabase:', err)
      }
    },
    [updateStore]
  )

  /** Compute the next date for a new day (last date + 1 calendar day) */
  const getNextDayDate = useCallback((): string => {
    const days = getSnapshot().days
    const latestDay = days.reduce<Day | null>((best, d) => {
      if (!d.dateISO) return best
      if (!best) return d
      return d.id > best.id ? d : best
    }, null)

    const baseDate = latestDay?.dateISO ? new Date(latestDay.dateISO) : new Date()
    const nextDate = new Date(baseDate)
    nextDate.setDate(nextDate.getDate() + 1)
    return nextDate.toISOString()
  }, [])

  /** Compute the next day id (maxId + 1) */
  const getNextDayId = useCallback((): number => {
    const days = getSnapshot().days
    const maxId = days.reduce((max, d) => Math.max(max, d.id), 0)
    return maxId + 1
  }, [])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 13 — ВСТРОЕННЫЙ МЕССЕНДЖЕР И БЫСТРЫЕ ЧАТЫ С ДРУЗЬЯМИ
     ══════════════════════════════════════════════════════════════════════ */

  /** Управление активным звонком приложения (глобальное состояние для PiP и навигации) */
  const setActiveCall = useCallback(
    (call: OgonekStoreState['activeCall']) => {
      updateStore((prev) => ({
        ...prev,
        activeCall: call,
      }))
    },
    [updateStore]
  )

  /** Открыть/закрыть диалог в разделе «Чаты» (только реальный друг) */
  const setActiveChatFriend = useCallback(
    (friendId: string | null): string | null => {
      let next: string | null = null
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        if (!friendId) {
          return prev.chatActiveFriendId === null ? prev : { ...prev, chatActiveFriendId: null }
        }
        const exists =
          friendId === 'saved-messages' ||
          Boolean(getFriend(friendId)) ||
          Boolean(threads[friendId])
        if (!exists) return prev
        next = friendId
        const nextThreads = threads[friendId]
          ? threads
          : { ...threads, [friendId]: emptyThread() }
        return { ...prev, chatThreads: nextThreads, chatActiveFriendId: friendId }
      })
      return next
    },
    [updateStore]
  )

  /**
   * Начать (или открыть) диалог с собеседником: гарантирует тред в сторе и
   * делает его активным. Поддерживает как друзей, так и реальных пользователей Supabase.
   */
  const startChatWithFriend = useCallback(
    (
      friendId: string,
      peerMeta?: {
        name?: string
        username?: string
        avatarUrl?: string
        avatarColor?: string
        verified?: boolean
        initials?: string
      }
    ): boolean => {
      if (!friendId) return false
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const existing = threads[friendId]
        const nextThreads = existing
          ? {
              ...threads,
              [friendId]: {
                ...existing,
                peerMeta: peerMeta || existing.peerMeta,
              },
            }
          : {
              ...threads,
              [friendId]: {
                ...emptyThread(),
                peerMeta: peerMeta || undefined,
              },
            }
        return { ...prev, chatThreads: nextThreads, chatActiveFriendId: friendId }
      })
      return true
    },
    [updateStore]
  )

  /**
   * Живой собеседник: через небольшую паузу друг отвечает и ставит реакцию
   * на последнее отправленное сообщение. Делает чат по-настоящему живым.
   */
  const scheduleChatAutoReply = useCallback(
    (friendId: string, userText: string, hasAttachment: boolean) => {
      // Боты и автоответы выключены в боевом режиме (Требование 3)
      if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_DEMO_MODE !== '1') return
      let friend = getFriend(friendId)
      const isGroup = isGroupThread(threadOf(getSnapshot().chatThreads ?? {}, friendId), friendId)
      if (!friend && isGroup) {
        const thread = threadOf(getSnapshot().chatThreads ?? {}, friendId)
        const candidates = (thread.groupMeta?.memberIds ?? []).filter((m) => m !== MY_CHAT_ID)
        if (candidates.length > 0) {
          const pickedId = candidates[Math.floor(Math.random() * candidates.length)]
          friend = getFriend(pickedId)
        }
      }
      if (!friend) return

      const auto = pickAutoReply(friend, userText, hasAttachment)
      const delay = 1000 + Math.floor(Math.random() * 1000)

      window.setTimeout(() => {
        updateStore((prev) => {
          const threads = prev.chatThreads ?? {}
          if (!threads[friendId]) return prev
          const thread = threadOf(threads, friendId)

          // Мои сообщения «прочитаны» собеседником (галочки ✓✓)
          let messages: ChatMessage[] = thread.messages.map((m) =>
            m.authorId === MY_CHAT_ID ? { ...m, read: true, status: 'read' } : m
          )

          // Собеседник реагирует на последнее моё сообщение
          if (auto.reactionId) {
            let idx = -1
            for (let i = messages.length - 1; i >= 0; i -= 1) {
              if (messages[i].authorId === MY_CHAT_ID) {
                idx = i
                break
              }
            }
            if (idx >= 0) {
              const target = messages[idx]
              const responderId = friend!.id
              const already = target.reactions.some(
                (r) => r.by === responderId && r.emojiId === auto.reactionId
              )
              if (!already) {
                const reactionId = auto.reactionId
                messages = messages.map((m, k) =>
                  k === idx
                    ? { ...m, reactions: [...m.reactions, { emojiId: reactionId, by: responderId }] }
                    : m
                )
              }
            }
          }

          const reply = makeChatMessage({ authorId: friend!.id, text: auto.text })
          return {
            ...prev,
            chatThreads: {
              ...threads,
              [friendId]: { ...thread, messages: [...messages, reply] },
            },
          }
        })
      }, delay)
    },
    [updateStore]
  )

  /**
   * Отправить сообщение другу или в группу (с вложением, ответом, медиа или без).
   * Возвращает созданное сообщение или null, если отправлять нечего.
   */
  const sendChatMessage = useCallback(
    (
      friendId: string,
      text: string,
      attachment?: ChatAttachment | null,
      extra?: {
        replyTo?: ChatMessageReply | null
        forwardFrom?: ChatMessageForward | null
        media?: ChatMessageMedia | null
        silent?: boolean
        scheduledForISO?: string | null
        poll?: ChatPoll | null
        linkPreview?: any
        type?: ChatMessageType
        call_meta?: {
          durationSeconds?: number
          isVideo?: boolean
          status?: string
        } | null
      }
    ): ChatMessage | null => {
      if (!friendId) return null
      const clean = (text ?? '').trim().slice(0, CHAT_MESSAGE_LIMIT)
      if (!clean && !attachment && !extra?.media && !extra?.poll) return null

      // Специальная обработка официального системного чата Priday (FAQ-бот + живая задержка печатания + поддержка в Supabase)
      if (isPridayChat(friendId)) {
        const nowISO = new Date().toISOString()
        const userMessage = makeChatMessage({
          authorId: MY_CHAT_ID,
          text: clean,
          attachment: attachment ?? null,
          createdAtISO: nowISO,
          read: true,
          status: 'read',
          actorMeta: { kind: 'support_user' },
        })

        const matchedAction = matchPridayQuickAction(clean)
        const replyText = matchedAction ? matchedAction.replyText : PRIDAY_SUPPORT_CUSTOM_REPLY
        const isSupport = !matchedAction || Boolean(matchedAction.isSupport)

        updateStore((prev) => {
          const threads = ensurePridayThreadInThreads(prev.chatThreads)
          const pridayThread = threadOf(threads, PRIDAY_CHAT_ID)
          const nextThreads: ChatThreads = {
            ...threads,
            [PRIDAY_CHAT_ID]: {
              ...pridayThread,
              readAtISO: nowISO,
              peerMeta: { ...PRIDAY_THREAD_PEER_META },
              messages: [...pridayThread.messages, userMessage],
              draft: '',
            },
          }
          return {
            ...prev,
            unreadChatCount: totalUnread(nextThreads),
            chatThreads: nextThreads,
          }
        }, true)

        const currentUserId = getSnapshot().auth?.activeAccountId
        if (currentUserId && !currentUserId.startsWith('anon-') && !currentUserId.startsWith('acct-guest')) {
          void savePridaySupportExchangeDb({
            userId: currentUserId,
            text: clean,
            actionId: matchedAction?.id ?? null,
            replyText,
            isSupport,
          })
        }

        const delayMs = computePridayTypingDelayMs(replyText)
        setPridayTypingDelta(1)
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            setPridayTypingDelta(-1)
            const replyCreatedAt = new Date().toISOString()
            const readFloor = new Date(Date.now() + 20).toISOString()
            const botReply = makeChatMessage({
              authorId: PRIDAY_CHAT_ID,
              text: replyText,
              createdAtISO: replyCreatedAt,
              read: true,
              status: 'read',
              actorMeta: { kind: isSupport ? 'support_reply' : 'canned' },
            })

            updateStore((prev) => {
              const threads = ensurePridayThreadInThreads(prev.chatThreads)
              const pridayThread = threadOf(threads, PRIDAY_CHAT_ID)
              const nextThreads: ChatThreads = {
                ...threads,
                [PRIDAY_CHAT_ID]: {
                  ...pridayThread,
                  readAtISO: readFloor,
                  peerMeta: { ...PRIDAY_THREAD_PEER_META },
                  messages: [...pridayThread.messages, botReply],
                },
              }
              return {
                ...prev,
                unreadChatCount: totalUnread(nextThreads),
                chatThreads: nextThreads,
              }
            }, true)
          }, delayMs)
        } else {
          setPridayTypingDelta(-1)
        }

        return userMessage
      }

      const isScheduled = Boolean(extra?.scheduledForISO && new Date(extra.scheduledForISO).getTime() > Date.now())

      // Проверка лимитов на отложенные сообщения по тарифу (free: 3, pro: 20, ultra: 100)
      if (isScheduled) {
        const thread = threadOf(getSnapshot().chatThreads ?? {}, friendId)
        const scheduledCount = (thread.scheduledMessages ?? []).length
        const currentTier = getSnapshot().profile?.subscription_tier ?? 'free'
        const limitCheck = canScheduleMessage(currentTier, scheduledCount)
        if (!limitCheck.allowed) {
          console.warn(`[Ogonek] Scheduled limit exceeded: ${scheduledCount}/${limitCheck.max} for ${currentTier}`)
          return null
        }
      }

      const message = makeChatMessage({
        authorId: MY_CHAT_ID,
        text: clean,
        attachment: attachment ?? null,
        replyTo: extra?.replyTo ?? null,
        forwardFrom: extra?.forwardFrom ?? null,
        media: extra?.media ?? null,
        silent: extra?.silent ?? false,
        scheduledForISO: extra?.scheduledForISO ?? null,
        poll: extra?.poll ?? null,
        linkPreview: extra?.linkPreview ?? null,
        type: extra?.type,
        call_meta: extra?.call_meta ?? null,
        status: isScheduled ? 'sending' : 'sent',
      })

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        if (isScheduled) {
          const scheduled = thread.scheduledMessages ?? []
          return {
            ...prev,
            chatThreads: {
              ...threads,
              [friendId]: { ...thread, scheduledMessages: [...scheduled, message], draft: '' },
            },
          }
        }
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages: [...thread.messages, message], draft: '' },
          },
        }
      }, true)

      // Запись строки в таблицу public.direct_messages Supabase
      if (!isScheduled) {
        try {
          const currentUserId = getSnapshot().auth?.activeAccountId
          if (currentUserId && !currentUserId.startsWith('anon-') && !currentUserId.startsWith('acct-guest')) {
            const symmetricThreadKey = getDirectThreadKey(currentUserId, friendId)
            sendDirectMessageToDb({
              userId: currentUserId,
              authorId: currentUserId,
              recipientId: friendId,
              threadKey: symmetricThreadKey,
              body: clean,
              clientId: message.id,
              attachment: attachment ?? null,
              media: extra?.media ?? null,
              replyTo: extra?.replyTo ?? null,
              forwardFrom: extra?.forwardFrom ?? null,
              poll: extra?.poll ?? null,
              linkPreview: extra?.linkPreview ?? null,
              type: extra?.type ?? 'text',
            })
              .then((res) => {
                if (res?.ok && res.message?.id) {
                  updateStore((prev) => {
                    const threads = prev.chatThreads ?? {}
                    const thread = threads[friendId]
                    if (!thread) return prev
                    return {
                      ...prev,
                      chatThreads: {
                        ...threads,
                        [friendId]: {
                          ...thread,
                          messages: thread.messages.map((m) =>
                            m.id === message.id ? { ...m, dbId: res.message!.id, status: 'sent' } : m
                          ),
                        },
                      },
                    }
                  }, true)
                }
              })
              .catch((err) => console.warn('[Ogonek] Direct message insert error:', err))
          }
        } catch (e) {
          console.warn('[Ogonek] Direct message insert error:', e)
        }
      }

      if (!isScheduled && friendId !== 'saved-messages') {
        scheduleChatAutoReply(friendId, clean, Boolean(attachment || extra?.media))
      }
      return message
    },
    [updateStore, scheduleChatAutoReply]
  )

  /** Редактирование текста своего сообщения */
  const editChatMessage = useCallback(
    (friendId: string, messageId: string, newText: string): boolean => {
      if (!friendId || !messageId) return false
      const clean = (newText ?? '').trim().slice(0, CHAT_MESSAGE_LIMIT)
      if (!clean) return false

      let success = false
      let targetDbId = messageId
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId && m.authorId === MY_CHAT_ID) {
            success = true
            targetDbId = m.dbId || m.id
            return {
              ...m,
              text: clean,
              editedAtISO: new Date().toISOString(),
            }
          }
          return m
        })
        if (!success) return prev
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      }, true)

      if (success) {
        updateDirectMessageBody(targetDbId, clean).catch((err) =>
          console.warn('[Ogonek] Edit message DB error:', err)
        )
      }
      return success
    },
    [updateStore]
  )

  /** Удаление нескольких сообщений из переписки + Supabase */
  const deleteChatMessages = useCallback(
    async (friendId: string, messageIds: string[]) => {
      if (!friendId || !Array.isArray(messageIds) || messageIds.length === 0) return
      const idsSet = new Set(messageIds)
      const currentThread = threadOf(getSnapshot().chatThreads ?? {}, friendId)
      const dbTargets = currentThread.messages
        .filter((m) => idsSet.has(m.id) || (m.dbId && idsSet.has(m.dbId)))
        .map((m) => m.dbId || m.id)

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              messages: thread.messages.filter((m) => !idsSet.has(m.id)),
            },
          },
        }
      }, true)

      const targetIds = dbTargets.length > 0 ? dbTargets : messageIds
      await deleteDirectMessagesBulkFromDb(targetIds).catch((err) =>
        console.warn('[Ogonek] Bulk delete DB error:', err)
      )
    },
    [updateStore]
  )

  /** Закрепить / открепить сообщение внутри чата (баннер в шапке) */
  const togglePinChatMessage = useCallback(
    (friendId: string, messageId: string): boolean => {
      if (!friendId || !messageId) return false
      let isPinned = false
      let targetDbId = messageId
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const currentlyPinned = thread.pinnedMessageId === messageId
        const newPinnedId = currentlyPinned ? null : messageId
        isPinned = !currentlyPinned

        const messages = thread.messages.map((m) => {
          if (m.id === messageId) {
            targetDbId = m.dbId || m.id
            return { ...m, pinned: isPinned }
          }
          if (currentlyPinned && m.pinned) return { ...m, pinned: false }
          return m
        })

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              pinnedMessageId: newPinnedId,
              messages,
            },
          },
        }
      }, true)

      updateDirectMessagePin(targetDbId, isPinned).catch((err) =>
        console.warn('[Ogonek] Update pin DB error:', err)
      )
      return isPinned
    },
    [updateStore]
  )

  /** Создание новой группы (строго из взаимных друзей, не запретивших приглашения) */
  const createGroupChat = useCallback(
    (
      title: string,
      memberIds: string[],
      avatarColor = 'linear-gradient(135deg, #ff7a18 0%, #af002d 100%)',
      avatarEmoji = '👥',
      description = '',
      avatarImage?: string | null
    ): string => {
      const snap = getSnapshot()
      const friendSet = new Set(snap.friendIds ?? [])
      const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
      const eligibleMembers = memberIds.filter((id) => {
        if (!id || id === MY_CHAT_ID || isPridayChat(id)) return false
        const cached = getCachedProfileSync(id)
        if (cached?.allow_group_invites_from === 'nobody' || cached?.privacy?.allowGroupInvitesFrom === 'nobody') {
          return false
        }
        if (isUuid(id) && !friendSet.has(id)) return false
        return true
      })

      const cleanTitle = (title || 'Новая группа').trim().slice(0, 100)
      const groupId = `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const groupMeta: ChatGroupMeta = {
        id: groupId,
        title: cleanTitle,
        avatarColor,
        avatarEmoji,
        avatarImage: avatarImage ?? null,
        memberIds: Array.from(new Set([MY_CHAT_ID, ...eligibleMembers])),
        adminIds: [MY_CHAT_ID],
        adminsOnly: false,
        createdAtISO: new Date().toISOString(),
        createdBy: MY_CHAT_ID,
        description,
        role: 'owner',
      }

      const initialMessage = makeChatMessage({
        authorId: MY_CHAT_ID,
        text: `Группа «${cleanTitle}» создана. Добро пожаловать! 🎉`,
        system: true,
      })

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [groupId]: {
              messages: [initialMessage],
              readAtISO: new Date().toISOString(),
              muted: false,
              pinned: true,
              draft: '',
              groupMeta,
            },
          },
          chatActiveFriendId: groupId,
        }
      })

      // Синхронизация создания группы в Supabase в фоновом режиме
      createChatGroupInDb({
        id: groupId,
        title: cleanTitle,
        avatarColor,
        avatarEmoji,
        avatarImage: avatarImage ?? null,
        creatorId: MY_CHAT_ID,
        memberIds: eligibleMembers,
        description,
      }).catch(() => {})

      return groupId
    },
    [updateStore]
  )

  /** Обновление метаданных группы */
  const updateGroupMeta = useCallback(
    (groupId: string, patch: Partial<ChatGroupMeta>) => {
      if (!groupId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, groupId)
        if (!thread.groupMeta) return prev

        const updatedMeta: ChatGroupMeta = {
          ...thread.groupMeta,
          ...patch,
        }

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [groupId]: {
              ...thread,
              groupMeta: updatedMeta,
            },
          },
        }
      })

      updateChatGroupInDb(groupId, patch).catch(() => {})
    },
    [updateStore]
  )

  /** Добавить участников в группу (строго взаимные друзья, не запретившие группы) */
  const addGroupMembers = useCallback(
    (groupId: string, newMemberIds: string[]) => {
      if (!groupId || !newMemberIds.length) return
      const snap = getSnapshot()
      const friendSet = new Set(snap.friendIds ?? [])
      const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
      const eligible = newMemberIds.filter((id) => {
        if (!id || id === MY_CHAT_ID || isPridayChat(id)) return false
        const cached = getCachedProfileSync(id)
        if (cached?.allow_group_invites_from === 'nobody' || cached?.privacy?.allowGroupInvitesFrom === 'nobody') {
          return false
        }
        if (isUuid(id) && !friendSet.has(id)) return false
        return true
      })
      if (eligible.length === 0) return

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, groupId)
        if (!thread.groupMeta) return prev

        const updatedMembers = Array.from(new Set([...thread.groupMeta.memberIds, ...eligible]))
        const updatedMeta: ChatGroupMeta = {
          ...thread.groupMeta,
          memberIds: updatedMembers,
        }

        const sysMsg = makeChatMessage({
          authorId: MY_CHAT_ID,
          text: `В группу добавлено участников: ${eligible.length} 👤`,
          system: true,
        })

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [groupId]: {
              ...thread,
              groupMeta: updatedMeta,
              messages: [...thread.messages, sysMsg],
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Исключить участника из группы */
  const removeGroupMember = useCallback(
    (groupId: string, memberId: string) => {
      if (!groupId || !memberId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, groupId)
        if (!thread.groupMeta) return prev

        const updatedMembers = thread.groupMeta.memberIds.filter((id) => id !== memberId)
        const updatedAdmins = (thread.groupMeta.adminIds || []).filter((id) => id !== memberId)
        const updatedMeta: ChatGroupMeta = {
          ...thread.groupMeta,
          memberIds: updatedMembers,
          adminIds: updatedAdmins,
        }

        const sysMsg = makeChatMessage({
          authorId: MY_CHAT_ID,
          text: `Участник был исключён из группы`,
          system: true,
        })

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [groupId]: {
              ...thread,
              groupMeta: updatedMeta,
              messages: [...thread.messages, sysMsg],
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Назначить / снять роль администратора в группе */
  const setGroupMemberRole = useCallback(
    (groupId: string, memberId: string, role: 'admin' | 'member') => {
      if (!groupId || !memberId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, groupId)
        if (!thread.groupMeta) return prev

        const currentAdmins = thread.groupMeta.adminIds || [thread.groupMeta.createdBy]
        const updatedAdmins = role === 'admin'
          ? Array.from(new Set([...currentAdmins, memberId]))
          : currentAdmins.filter((id) => id !== memberId)

        const updatedMeta: ChatGroupMeta = {
          ...thread.groupMeta,
          adminIds: updatedAdmins,
        }

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [groupId]: {
              ...thread,
              groupMeta: updatedMeta,
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Выйти из группы */
  const leaveGroup = useCallback(
    (groupId: string) => {
      if (!groupId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, groupId)
        if (!thread.groupMeta) return prev

        const updatedMembers = thread.groupMeta.memberIds.filter((id) => id !== MY_CHAT_ID)
        const updatedMeta: ChatGroupMeta = {
          ...thread.groupMeta,
          memberIds: updatedMembers,
        }

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [groupId]: {
              ...thread,
              groupMeta: updatedMeta,
            },
          },
          chatActiveFriendId: prev.chatActiveFriendId === groupId ? null : prev.chatActiveFriendId,
        }
      })
    },
    [updateStore]
  )

  /** Мут чата с поддержкой таймера (1ч, 8ч, 1 нед, навсегда, включить звук) */
  const muteChatThread = useCallback(
    (friendId: string, durationHours?: number | null) => {
      if (!friendId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)

        let isMuted = true
        let muteUntilISO: string | null = null

        if (durationHours === 0) {
          isMuted = false
          muteUntilISO = null
        } else if (durationHours === null || durationHours === undefined) {
          isMuted = true
          muteUntilISO = null
        } else if (durationHours > 0) {
          isMuted = true
          muteUntilISO = new Date(Date.now() + durationHours * 3600 * 1000).toISOString()
        }

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              muted: isMuted,
              muteUntilISO,
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Редактировать отложенное сообщение */
  const editScheduledMessage = useCallback(
    (friendId: string, messageId: string, patch: { text?: string; scheduledForISO?: string }) => {
      if (!friendId || !messageId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const scheduled = (thread.scheduledMessages ?? []).map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              text: patch.text !== undefined ? patch.text : m.text,
              scheduledForISO: patch.scheduledForISO !== undefined ? patch.scheduledForISO : m.scheduledForISO,
            }
          }
          return m
        })

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              scheduledMessages: scheduled,
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Отменить отложенное сообщение */
  const cancelScheduledMessage = useCallback(
    (friendId: string, messageId: string) => {
      if (!friendId || !messageId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const scheduled = (thread.scheduledMessages ?? []).filter((m) => m.id !== messageId)

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              scheduledMessages: scheduled,
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Добавление / обновление пользовательской папки */
  const setChatFolder = useCallback(
    (folder: ChatFolder) => {
      if (!folder?.id || !folder?.title) return
      updateStore((prev) => {
        const current = prev.chatFolders ?? DEFAULT_CHAT_FOLDERS
        const exists = current.some((f) => f.id === folder.id)
        const updated = exists
          ? current.map((f) => (f.id === folder.id ? folder : f))
          : [...current, folder]
        return { ...prev, chatFolders: updated }
      })
    },
    [updateStore]
  )

  /** Удаление пользовательской папки */
  const deleteChatFolder = useCallback(
    (folderId: string) => {
      if (!folderId) return
      updateStore((prev) => {
        const current = prev.chatFolders ?? DEFAULT_CHAT_FOLDERS
        return {
          ...prev,
          chatFolders: current.filter((f) => f.id !== folderId || f.isBuiltIn),
          chatActiveFolderId:
            prev.chatActiveFolderId === folderId ? 'all' : prev.chatActiveFolderId,
        }
      })
    },
    [updateStore]
  )

  /** Переключение архива диалога */
  const toggleThreadArchive = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      let nowArchived = false
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        nowArchived = !thread.archived
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, archived: nowArchived },
          },
        }
      })
      return nowArchived
    },
    [updateStore]
  )

  /** Смена активной папки */
  const setChatActiveFolderId = useCallback(
    (folderId: string) => {
      updateStore((prev) => ({ ...prev, chatActiveFolderId: folderId }))
    },
    [updateStore]
  )

  /** Переслать карточку сразу нескольким друзьям. Возвращает число получателей. */
  const forwardToChat = useCallback(
    (friendIds: string[], attachment: ChatAttachment, note?: string): number => {
      if (!Array.isArray(friendIds) || friendIds.length === 0 || !attachment) return 0
      const clean = (note ?? '').trim().slice(0, CHAT_MESSAGE_LIMIT)
      let count = 0
      for (const id of friendIds) {
        if (sendChatMessage(id, clean, attachment)) count += 1
      }
      return count
    },
    [sendChatMessage]
  )

  /**
   * Переключает реакцию пользователя на сообщение чата.
   * Возвращает true, если реакция теперь активна.
   */
  const toggleChatReaction = useCallback(
    (friendId: string, messageId: string, emojiId: string): boolean => {
      if (!friendId || !messageId || !emojiId) return false
      const thread = threadOf(getSnapshot().chatThreads ?? {}, friendId)
      const target = thread.messages.find((m) => m.id === messageId)
      const willBeActive = !target?.reactions.some(
        (r) => r.by === MY_CHAT_ID && r.emojiId === emojiId
      )

      let nextReactions: any[] = []
      let targetDbId = messageId
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const t = threadOf(threads, friendId)
        const messages = t.messages.map((m) => {
          if (m.id !== messageId) return m
          targetDbId = m.dbId || m.id
          const mine = m.reactions.some((r) => r.by === MY_CHAT_ID && r.emojiId === emojiId)
          const updated = mine
            ? m.reactions.filter((r) => !(r.by === MY_CHAT_ID && r.emojiId === emojiId))
            : [...m.reactions, { emojiId, by: MY_CHAT_ID }]
          nextReactions = updated
          return {
            ...m,
            reactions: updated,
          }
        })
        return { ...prev, chatThreads: { ...threads, [friendId]: { ...t, messages } } }
      }, true)

      updateDirectMessageReactions(targetDbId, nextReactions).catch((err) =>
        console.warn('[Ogonek] Update reactions DB error:', err)
      )

      return willBeActive
    },
    [updateStore]
  )

  /** Сохраняет черновик сообщения для конкретной переписки */
  const setChatDraft = useCallback(
    (friendId: string, value: string) => {
      if (!friendId) return
      const draft = (value ?? '').slice(0, CHAT_MESSAGE_LIMIT)
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threads[friendId]
        if (!thread) {
          return { ...prev, chatThreads: { ...threads, [friendId]: { ...emptyThread(), draft } } }
        }
        if (thread.draft === draft) return prev
        return { ...prev, chatThreads: { ...threads, [friendId]: { ...thread, draft } } }
      })
    },
    [updateStore]
  )

  /** Помечает переписку прочитанной (сбрасывает счётчик непрочитанных и пишет в Supabase) */
  const markThreadRead = useCallback(
    (friendId: string) => {
      if (!friendId) return
      const nowISO = new Date().toISOString()
      const currentUserId = getSnapshot().auth?.activeAccountId
      let shouldSyncDb = false
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threads[friendId]
        if (!thread) return prev
        const hasUnreadMsgs = (thread.messages ?? []).some(
          (m) => m && m.authorId !== MY_CHAT_ID && !m.read
        )
        const hasUnread = unreadCount(thread) > 0 || hasUnreadMsgs
        const nextMessages = thread.messages.map((m) =>
          m.authorId !== MY_CHAT_ID && !m.read ? { ...m, read: true } : m
        )
        const nextThreads: ChatThreads = {
          ...threads,
          [friendId]: { ...thread, readAtISO: nowISO, messages: nextMessages },
        }
        const nextUnreadTotal = totalUnread(nextThreads)
        if (!hasUnread && thread.readAtISO && prev.unreadChatCount === nextUnreadTotal) {
          return prev
        }
        shouldSyncDb = true
        return {
          ...prev,
          unreadChatCount: nextUnreadTotal,
          chatThreads: nextThreads,
        }
      }, true)

      if (
        shouldSyncDb &&
        currentUserId &&
        !currentUserId.startsWith('anon-') &&
        !currentUserId.startsWith('acct-guest')
      ) {
        if (isPridayChat(friendId)) {
          markPridaySystemMessagesReadDb(currentUserId).catch(() => {})
        } else {
          markDirectMessagesAsRead(currentUserId, friendId).catch(() => {})
        }
      }
    },
    [updateStore]
  )

  /** Помечает прочитанными сразу все переписки */
  const markAllThreadsRead = useCallback(() => {
    const nowISO = new Date().toISOString()
    updateStore((prev) => {
      const threads = prev.chatThreads ?? {}
      let changed = false
      const next: ChatThreads = {}
      for (const [id, thread] of Object.entries(threads)) {
        if (unreadCount(thread) > 0) {
          next[id] = {
            ...thread,
            readAtISO: nowISO,
            messages: (thread.messages ?? []).map((m) =>
              m.authorId !== MY_CHAT_ID && !m.read ? { ...m, read: true } : m
            ),
          }
          changed = true
        } else {
          next[id] = thread
        }
      }
      const nextUnreadTotal = totalUnread(next)
      if (!changed && prev.unreadChatCount === nextUnreadTotal) return prev
      return { ...prev, unreadChatCount: nextUnreadTotal, chatThreads: next }
    }, true)
  }, [updateStore])

  /** Очищает историю переписки (реально удаляет сообщения в Supabase + локально) */
  const clearThreadMessages = useCallback(
    async (friendId: string): Promise<boolean> => {
      if (!friendId) return false
      const snap = getSnapshot()
      let uid = snap.auth?.activeAccountId || null
      if (!uid) {
        try {
          const client = getSupabase()
          const s = await client?.auth.getSession()
          uid = s?.data?.session?.user?.id || null
        } catch {}
      }

      if (isPridayChat(friendId)) {
        updateStore((prev) => {
          const threads = ensurePridayThreadInThreads(prev.chatThreads)
          const thread = threadOf(threads, PRIDAY_CHAT_ID)
          const nextThreads: ChatThreads = {
            ...threads,
            [PRIDAY_CHAT_ID]: {
              ...thread,
              messages: [buildPridayWelcomeMessage(new Date().toISOString())],
              scheduledMessages: [],
              pinnedMessageId: null,
              readAtISO: new Date().toISOString(),
            },
          }
          return {
            ...prev,
            unreadChatCount: totalUnread(nextThreads),
            chatThreads: nextThreads,
          }
        }, true)
        if (uid && !uid.startsWith('anon-') && !uid.startsWith('acct-guest')) {
          await markPridaySystemMessagesReadDb(uid)
        }
        return true
      }

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              messages: [],
              scheduledMessages: [],
              pinnedMessageId: null,
              readAtISO: new Date().toISOString(),
            },
          },
        }
      }, true)

      if (uid && !uid.startsWith('anon-') && !uid.startsWith('acct-guest')) {
        const res = await deleteThreadMessagesFromDb(uid, friendId)
        if (!res.ok) {
          console.warn('[Ogonek] Clear thread history DB error:', res.error)
          return false
        }
      }
      return true
    },
    [updateStore]
  )

  /** Полностью удаляет чат из списка диалогов и удаляет переписку в Supabase */
  const deleteChatThread = useCallback(
    async (friendId: string): Promise<boolean> => {
      if (!friendId || isPridayChat(friendId)) return false
      const snap = getSnapshot()
      let uid = snap.auth?.activeAccountId || null
      if (!uid) {
        try {
          const client = getSupabase()
          const s = await client?.auth.getSession()
          uid = s?.data?.session?.user?.id || null
        } catch {}
      }

      updateStore((prev) => {
        const threads = { ...(prev.chatThreads ?? {}) }
        delete threads[friendId]
        const remainingIds = Object.keys(threads)
        return {
          ...prev,
          chatThreads: threads,
          chatActiveFriendId:
            prev.chatActiveFriendId === friendId ? remainingIds[0] ?? null : prev.chatActiveFriendId,
        }
      }, true)

      if (uid && !uid.startsWith('anon-') && !uid.startsWith('acct-guest')) {
        const res = await deleteThreadMessagesFromDb(uid, friendId)
        if (!res.ok) {
          console.warn('[Ogonek] Delete chat thread DB error:', res.error)
          return false
        }
      }
      return true
    },
    [updateStore]
  )

  /** Удаляет одно сообщение из переписки (реально удаляется в Supabase) */
  const deleteChatMessage = useCallback(
    async (friendId: string, messageId: string, forEveryone = false): Promise<boolean> => {
      if (!friendId || !messageId) return false
      const currentThread = threadOf(getSnapshot().chatThreads ?? {}, friendId)
      const targetMsg = currentThread.messages.find((m) => m.id === messageId || m.dbId === messageId)
      const dbTargetId = targetMsg?.dbId || messageId

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        let messages = thread.messages
        if (forEveryone) {
          messages = messages.filter((m) => m.id !== messageId && m.dbId !== messageId)
        } else {
          messages = messages.filter((m) => m.id !== messageId && m.dbId !== messageId)
        }
        const scheduled = (thread.scheduledMessages ?? []).filter((m) => m.id !== messageId)
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              pinnedMessageId: thread.pinnedMessageId === messageId ? null : thread.pinnedMessageId,
              messages,
              scheduledMessages: scheduled,
            },
          },
        }
      }, true)

      const res = await deleteDirectMessageFromDb(dbTargetId)
      if (!res.ok) {
        console.warn('[Ogonek] Delete message DB error:', res.error)
        return false
      }
      return true
    },
    [updateStore]
  )

  /** Сохраняет перевод сообщения */
  const translateChatMessage = useCallback(
    (friendId: string, messageId: string, targetLang: string, translatedText: string) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              translations: {
                ...(m.translations ?? {}),
                [targetLang]: translatedText,
              },
            }
          }
          return m
        })
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      })
    },
    [updateStore]
  )

  /** Сохраняет расшифровку аудиосообщения */
  const transcribeVoiceMessage = useCallback(
    (friendId: string, messageId: string, transcript: string) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId) {
            return { ...m, transcript }
          }
          return m
        })
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      })

      // Синхронизируем расшифровку с Supabase
      updateDirectMessageTranscript(messageId, transcript).catch((err) =>
        console.warn('[Ogonek] Sync transcript to Supabase error:', err)
      )
    },
    [updateStore]
  )

  /** Голосование в опросе с сохранением голоса в Supabase */
  const voteInPoll = useCallback(
    (friendId: string, messageId: string, optionIndex: number) => {
      const snap = getSnapshot()
      const voterId = snap.auth?.activeAccountId || MY_CHAT_ID
      let nextPoll: ChatPoll | null = null
      let targetDbId = messageId

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId && m.poll) {
            targetDbId = m.dbId || m.id
            const poll = m.poll
            const targetOpt = poll.options[optionIndex]
            const alreadyVoted = Boolean(
              targetOpt?.voterIds ? targetOpt.voterIds.includes(voterId) : targetOpt?.votedByMe
            )
            const newOptions = poll.options.map((opt, idx) => {
              const existingVoters = Array.isArray(opt.voterIds) ? opt.voterIds : []
              if (idx === optionIndex) {
                const updatedVoters = alreadyVoted
                  ? existingVoters.filter((id) => id !== voterId)
                  : Array.from(new Set([...existingVoters, voterId]))
                const nextVotes =
                  existingVoters.length > 0 || !alreadyVoted
                    ? Math.max(updatedVoters.length, alreadyVoted ? Math.max(0, opt.votes - 1) : opt.votes + 1)
                    : Math.max(0, opt.votes - 1)
                return {
                  ...opt,
                  voterIds: updatedVoters,
                  votes: updatedVoters.length > 0 || existingVoters.length > 0 ? updatedVoters.length : nextVotes,
                  votedByMe: !alreadyVoted,
                }
              }
              const wasOptVoted = existingVoters.includes(voterId) || Boolean(opt.votedByMe)
              if (!poll.isMulti && !alreadyVoted && wasOptVoted) {
                const updatedVoters = existingVoters.filter((id) => id !== voterId)
                return {
                  ...opt,
                  voterIds: updatedVoters,
                  votes: existingVoters.length > 0 ? updatedVoters.length : Math.max(0, opt.votes - 1),
                  votedByMe: false,
                }
              }
              return opt
            })
            const totalVotes = newOptions.reduce((s, o) => s + o.votes, 0)
            nextPoll = { ...poll, options: newOptions, totalVotes }
            return {
              ...m,
              poll: nextPoll,
            }
          }
          return m
        })
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      }, true)

      if (nextPoll) {
        updateDirectMessagePoll(targetDbId, nextPoll).catch((err) =>
          console.warn('[Ogonek] Update poll DB error:', err)
        )
      }
    },
    [updateStore]
  )

  /** Переключение метки на сообщении («Важное», «Позже», «Идея») */
  const toggleMessageLabel = useCallback(
    (friendId: string, messageId: string, label: string) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId) {
            const currentLabels = m.labels ?? []
            const exists = currentLabels.includes(label)
            const updated = exists ? currentLabels.filter((l) => l !== label) : [...currentLabels, label]
            return { ...m, labels: updated }
          }
          return m
        })
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      })
    },
    [updateStore]
  )

  /** Назначить / снять цветной тег с диалога */
  const assignChatTag = useCallback(
    (friendId: string, tagId: string) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const currentTags = thread.tagIds ?? []
        const exists = currentTags.includes(tagId)
        const updated = exists ? currentTags.filter((t) => t !== tagId) : [...currentTags, tagId]
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, tagIds: updated },
          },
        }
      })
    },
    [updateStore]
  )

  /** Создать / обновить пользовательский тег диалогов */
  const setChatTag = useCallback(
    (tag: ChatTag) => {
      updateStore((prev) => {
        const tags = prev.chatTags ?? []
        const exists = tags.some((t) => t.id === tag.id)
        const updated = exists ? tags.map((t) => (t.id === tag.id ? tag : t)) : [...tags, tag]
        return { ...prev, chatTags: updated }
      })
    },
    [updateStore]
  )

  /** Удалить тег диалогов */
  const deleteChatTag = useCallback(
    (tagId: string) => {
      updateStore((prev) => {
        const tags = prev.chatTags ?? []
        return { ...prev, chatTags: tags.filter((t) => t.id !== tagId) }
      })
    },
    [updateStore]
  )

  /** Обновить настройки чатов */
  const updateChatSettings = useCallback(
    (patch: Partial<ChatSettings>) => {
      updateStore((prev) => {
        const current = prev.chatSettings ?? DEFAULT_CHAT_SETTINGS
        return { ...prev, chatSettings: { ...current, ...patch } }
      })
    },
    [updateStore]
  )

  /** Доставить созревшие запланированные сообщения */
  const deliverScheduledMessages = useCallback(
    (friendId?: string) => {
      const now = Date.now()
      updateStore((prev) => {
        const threads = { ...(prev.chatThreads ?? {}) }
        let changed = false
        const targetIds = friendId ? [friendId] : Object.keys(threads)

        for (const fId of targetIds) {
          const thread = threads[fId]
          if (!thread?.scheduledMessages || thread.scheduledMessages.length === 0) continue
          const ready = thread.scheduledMessages.filter(
            (m) => m.scheduledForISO && new Date(m.scheduledForISO).getTime() <= now
          )
          if (ready.length === 0) continue

          const remaining = thread.scheduledMessages.filter(
            (m) => !m.scheduledForISO || new Date(m.scheduledForISO).getTime() > now
          )
          const sent = ready.map((m) => ({ ...m, status: 'sent' as const, scheduledForISO: null }))
          threads[fId] = {
            ...thread,
            messages: [...thread.messages, ...sent],
            scheduledMessages: remaining,
          }
          changed = true
        }

        if (!changed) return prev
        return { ...prev, chatThreads: threads }
      })
    },
    [updateStore]
  )

  /** Смена уровня сложности (1..5) с фиксацией в истории и обновлением в Supabase */
  const setDifficultyLevel = useCallback(
    (newLevel: number, reason?: string) => {
      if (newLevel < 1 || newLevel > 5) return
      const nowISO = new Date().toISOString()
      updateStore((prev) => {
        const currentLevel = prev.profile.difficultyLevel ?? prev.profile.level ?? 2
        const history = prev.profile.levelHistory ?? []
        const entry: LevelHistoryEntry = {
          id: `lh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          fromLevel: currentLevel,
          toLevel: newLevel,
          oldLevel: currentLevel,
          newLevel: newLevel,
          reason,
          changedAtISO: nowISO,
        }
        return {
          ...prev,
          profile: {
            ...prev.profile,
            level: newLevel,
            difficultyLevel: newLevel,
            levelChangedAtISO: nowISO,
            levelHistory: [entry, ...history],
          },
        }
      })

      // Реальный UPDATE в Supabase profiles
      const activeId = getSnapshot().auth?.activeAccountId
      if (activeId && !activeId.startsWith('anon-') && !activeId.startsWith('acct-guest')) {
        updateProfileLevel(activeId, newLevel).catch((err) => {
          console.warn('[Ogonek] Update difficulty level in Supabase error:', err)
        })
      }
    },
    [updateStore]
  )

  const normalizePollForViewer = useCallback(
    (rawPoll: ChatPoll | null | undefined, viewerId?: string | null): ChatPoll | null => {
      if (!rawPoll || typeof rawPoll !== 'object') return null
      const uid = viewerId || MY_CHAT_ID
      const options = Array.isArray(rawPoll.options)
        ? rawPoll.options.map((opt) => {
            const voters = Array.isArray(opt.voterIds) ? opt.voterIds : null
            return {
              ...opt,
              votes: voters ? voters.length : Number(opt.votes || 0),
              votedByMe: voters ? voters.includes(uid) : Boolean(opt.votedByMe),
            }
          })
        : []
      const totalVotes = options.reduce((s, o) => s + o.votes, 0)
      return { ...rawPoll, options, totalVotes }
    },
    []
  )

  const resolvePeerIdFromRecord = useCallback(
    (msg: DirectMessageRecord, currentUserId?: string | null): string | null => {
      if (!msg) return null
      const isMine = Boolean(currentUserId && msg.author_id === currentUserId)
      if (isMine && msg.recipient_id === currentUserId) {
        return 'saved-messages'
      }
      let peerId = isMine ? msg.recipient_id || null : msg.author_id || null
      if (!peerId && msg.thread_key && currentUserId) {
        if (msg.thread_key.startsWith('group:')) {
          peerId = msg.thread_key.slice('group:'.length)
        } else {
          const parts = msg.thread_key.split('_')
          peerId = parts.find((p) => p !== currentUserId) || parts[0] || null
        }
      }
      if (!peerId || peerId === 'ilonmusk-seed' || peerId === 'cernavation-seed') return null
      return peerId
    },
    []
  )

  const mapRecordToChatMessage = useCallback(
    (msg: DirectMessageRecord, currentUserId?: string | null): ChatMessage => {
      const isMine = Boolean(currentUserId && msg.author_id === currentUserId)
      return {
        id: msg.client_id || msg.id,
        dbId: msg.id,
        authorId: isMine ? MY_CHAT_ID : msg.author_id,
        text: msg.body || '',
        createdAtISO: msg.sent_at || msg.created_at || new Date().toISOString(),
        attachment: msg.attachment ?? null,
        reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
        read: Boolean(msg.is_read),
        system: Boolean(msg.is_system),
        type: (msg.type as any) || 'text',
        media: msg.media ?? null,
        replyTo: msg.reply_to ?? null,
        forwardFrom: msg.forward_from ?? null,
        poll: normalizePollForViewer(msg.poll ?? null, currentUserId),
        linkPreview: msg.link_preview ?? null,
        pinned: Boolean(msg.is_pinned),
        editedAtISO: (msg as any).edited_at || (msg.is_edited ? msg.updated_at || new Date().toISOString() : null),
        status: msg.is_read ? 'read' : 'sent',
      }
    },
    [normalizePollForViewer]
  )

  /** Получение сообщения из Realtime канала Supabase или загрузки диалога */
  const receiveIncomingChatMessage = useCallback(
    (msg: DirectMessageRecord) => {
      if (!msg) return
      const currentUserId = getSnapshot().auth?.activeAccountId
      const peerId = resolvePeerIdFromRecord(msg, currentUserId)
      if (!peerId) return

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, peerId)
        const messages = Array.isArray(thread.messages) ? thread.messages : []
        const idx = messages.findIndex(
          (m) => m && (m.id === msg.id || m.dbId === msg.id || (msg.client_id && (m.id === msg.client_id || m.dbId === msg.client_id)))
        )
        const mapped = mapRecordToChatMessage(msg, currentUserId)

        let nextThreads: ChatThreads
        if (idx >= 0) {
          const existing = messages[idx]
          if (existing.dbId === msg.id && existing.read === mapped.read && existing.text === mapped.text) {
            return prev
          }
          const updated = [...messages]
          updated[idx] = { ...existing, ...mapped, id: existing.id }
          nextThreads = {
            ...threads,
            [peerId]: { ...thread, messages: updated },
          }
        } else {
          nextThreads = {
            ...threads,
            [peerId]: {
              ...thread,
              messages: [...messages, mapped],
            },
          }
        }

        return {
          ...prev,
          unreadChatCount: totalUnread(nextThreads),
          chatThreads: nextThreads,
        }
      }, true)

      if (peerId !== 'saved-messages' && !peerId.startsWith('group-') && !getCachedProfileSync(peerId)) {
        void getProfile(peerId)
          .then((p) => {
            if (!p) return
            updateStore((prev) => {
              const t = prev.chatThreads?.[peerId]
              if (!t) return prev
              return {
                ...prev,
                chatThreads: {
                  ...prev.chatThreads,
                  [peerId]: {
                    ...t,
                    peerMeta: {
                      ...t.peerMeta,
                      name: p.display_name || (p.username ? `@${p.username}` : t.peerMeta?.name),
                      username: p.username || t.peerMeta?.username,
                      avatarUrl: p.avatar_image || p.avatar_url || t.peerMeta?.avatarUrl,
                      avatarColor: p.avatar_color || t.peerMeta?.avatarColor,
                      verified: Boolean(p.verified),
                    },
                  },
                },
              }
            })
          })
          .catch(() => {})
      }
    },
    [updateStore, resolvePeerIdFromRecord, mapRecordToChatMessage]
  )

  /** Сверить сообщения конкретного диалога с Supabase как источником истины (убивает удалённые фантомы) */
  const reconcileThreadMessages = useCallback(
    (friendId: string, dbMessages: DirectMessageRecord[]) => {
      if (!friendId || !Array.isArray(dbMessages)) return
      const currentUserId = getSnapshot().auth?.activeAccountId
      const mapped = dbMessages.map((r) => mapRecordToChatMessage(r, currentUserId))
      const dbKeySet = new Set<string>()
      for (const m of mapped) {
        dbKeySet.add(m.id)
        if (m.dbId) dbKeySet.add(m.dbId)
      }

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threads[friendId]
        if (!thread && mapped.length === 0) return prev
        const target = thread ?? emptyThread()
        const pendingOptimistic = (target.messages ?? []).filter(
          (m) =>
            m.status === 'sending' &&
            !dbKeySet.has(m.id) &&
            (!m.dbId || !dbKeySet.has(m.dbId)) &&
            Date.now() - new Date(m.createdAtISO).getTime() < 15000
        )
        const nextMessages = [...mapped, ...pendingOptimistic]
        const nextPinned = nextMessages.find((m) => m.pinned)?.id ?? null

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...target,
              pinnedMessageId: nextPinned,
              messages: nextMessages,
            },
          },
        }
      }, true)
    },
    [updateStore, mapRecordToChatMessage]
  )

  /** Удалить сообщение в локальном сторе по Supabase Realtime DELETE (id или client_id) */
  const removeDeletedChatMessage = useCallback(
    (deletedId: string) => {
      if (!deletedId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        let changed = false
        const nextThreads: ChatThreads = {}
        for (const [fId, t] of Object.entries(threads)) {
          const beforeLen = t.messages?.length ?? 0
          const filtered = (t.messages ?? []).filter((m) => m.id !== deletedId && m.dbId !== deletedId)
          if (filtered.length !== beforeLen) {
            changed = true
            nextThreads[fId] = {
              ...t,
              pinnedMessageId: t.pinnedMessageId === deletedId ? null : t.pinnedMessageId,
              messages: filtered,
            }
          } else {
            nextThreads[fId] = t
          }
        }
        return changed
          ? { ...prev, unreadChatCount: totalUnread(nextThreads), chatThreads: nextThreads }
          : prev
      }, true)
    },
    [updateStore]
  )

  /** Мгновенное добавление системного уведомления в официальный чат Priday (Realtime) */
  const receivePridaySystemNotification = useCallback(
    (notifRow: any) => {
      const mapped = mapPridayRecordToChatMessage(notifRow)
      if (!mapped) return

      updateStore((prev) => {
        const threads = ensurePridayThreadInThreads(prev.chatThreads)
        const pridayThread = threadOf(threads, PRIDAY_CHAT_ID)
        const existingMsgs = Array.isArray(pridayThread.messages) ? pridayThread.messages : []
        const alreadyExists = existingMsgs.some(
          (m) =>
            (mapped.dbId && (m.dbId === mapped.dbId || m.id === mapped.id)) ||
            (m.text === mapped.text && Math.abs(new Date(m.createdAtISO).getTime() - new Date(mapped.createdAtISO).getTime()) < 5000)
        )
        if (alreadyExists) return prev

        const isViewingPriday = prev.chatActiveFriendId === PRIDAY_CHAT_ID && typeof window !== 'undefined' && window.location.search.includes('view=messages')
        const finalMsg: ChatMessage = isViewingPriday ? { ...mapped, read: true, status: 'read' } : mapped
        const nextThreads: ChatThreads = {
          ...threads,
          [PRIDAY_CHAT_ID]: {
            ...pridayThread,
            ...(isViewingPriday ? { readAtISO: new Date(Date.now() + 20).toISOString() } : {}),
            peerMeta: { ...PRIDAY_THREAD_PEER_META },
            messages: [...existingMsgs, finalMsg],
          },
        }
        return {
          ...prev,
          unreadChatCount: totalUnread(nextThreads),
          chatThreads: nextThreads,
        }
      }, true)
    },
    [updateStore]
  )

  /** Доставляет праздничное юбилейное поздравление от Priday (10/50/100) с защитой от дублей на day_number */
  const deliverPridayMilestoneMessage = useCallback(
    (dayNumber: number, title: string, text: string, tier: 10 | 50 | 100): boolean => {
      if (!dayNumber || !text) return false
      const snap = getSnapshot()
      const uid = snap.auth?.activeAccountId || null
      const dedupKey = `${uid || 'local'}:${dayNumber}`
      const lsKey = 'priday.celebrated_milestones.v1'

      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem(lsKey)
          const parsed = raw ? JSON.parse(raw) : {}
          if (parsed && typeof parsed === 'object' && parsed[dedupKey]) {
            return false
          }
        }
      } catch {}

      const existingPriday = threadOf(snap.chatThreads ?? {}, PRIDAY_CHAT_ID)
      const alreadyInThread = (existingPriday.messages ?? []).some(
        (m) =>
          m &&
          (m.actorMeta?.milestoneDay === dayNumber ||
            (m.actorMeta?.kind === 'milestone' && m.text === text))
      )
      if (alreadyInThread) {
        return false
      }

      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem(lsKey)
          const parsed = raw && typeof JSON.parse(raw) === 'object' ? JSON.parse(raw) : {}
          window.localStorage.setItem(lsKey, JSON.stringify({ ...parsed, [dedupKey]: true }))
        }
      } catch {}

      const nowISO = new Date().toISOString()
      const isViewingPriday =
        snap.chatActiveFriendId === PRIDAY_CHAT_ID &&
        typeof window !== 'undefined' &&
        window.location.search.includes('view=messages')

      const milestoneMsg = {
        ...makeChatMessage({
          authorId: PRIDAY_CHAT_ID,
          text,
          createdAtISO: nowISO,
          read: isViewingPriday,
          status: isViewingPriday ? 'read' : 'sent',
          actorMeta: {
            kind: 'milestone',
            milestoneDay: dayNumber,
            milestoneTier: tier,
          },
        }),
        id: `priday-milestone-${dayNumber}`,
      }

      updateStore((prev) => {
        const threads = ensurePridayThreadInThreads(prev.chatThreads)
        const pridayThread = threadOf(threads, PRIDAY_CHAT_ID)
        const nextThreads: ChatThreads = {
          ...threads,
          [PRIDAY_CHAT_ID]: {
            ...pridayThread,
            ...(isViewingPriday ? { readAtISO: new Date(Date.now() + 20).toISOString() } : {}),
            peerMeta: { ...PRIDAY_THREAD_PEER_META },
            messages: [...pridayThread.messages, milestoneMsg],
          },
        }
        return {
          ...prev,
          unreadChatCount: totalUnread(nextThreads),
          chatThreads: nextThreads,
        }
      }, true)

      if (uid && !uid.startsWith('anon-') && !uid.startsWith('acct-guest')) {
        void savePridayMilestoneMessageDb({
          userId: uid,
          dayNumber,
          title,
          body: text,
          tier,
        })
      }

      return true
    },
    [updateStore]
  )

  /** Массовая загрузка и синхронизация всех диалогов и профилей собеседников из Supabase */
  const loadChatThreadsFromCloud = useCallback(
    async (overrideUserId?: string): Promise<boolean> => {
      const snap = getSnapshot()
      let uid = overrideUserId || snap.auth?.activeAccountId || null
      if (!uid) {
        try {
          const s = await getSupabase()?.auth.getSession()
          uid = s?.data?.session?.user?.id || null
        } catch {}
      }
      if (!uid || uid.startsWith('anon-') || uid.startsWith('acct-guest')) return false

      const [res, pridayDbMessages] = await Promise.all([
        getAllUserDirectMessages(uid),
        loadPridaySystemMessagesDb(uid),
      ])
      if (!res.ok) return false

      const byPeer: Record<string, DirectMessageRecord[]> = {}
      for (const row of res.messages) {
        const peerId = resolvePeerIdFromRecord(row, uid)
        if (!peerId || isPridayChat(peerId)) continue
        if (!byPeer[peerId]) byPeer[peerId] = []
        byPeer[peerId].push(row)
      }

      const peerIds = Object.keys(byPeer).filter(
        (id) => id !== 'saved-messages' && !id.startsWith('group-') && !isPridayChat(id)
      )
      const existingIds = Object.keys(snap.chatThreads ?? {}).filter(
        (id) =>
          id !== 'saved-messages' &&
          !id.startsWith('group-') &&
          !isPridayChat(id) &&
          id !== 'ilonmusk-seed' &&
          id !== 'cernavation-seed'
      )
      const allProfileIds = Array.from(new Set([...peerIds, ...existingIds]))
      const profilesMap = await getProfilesByIds(allProfileIds)

      updateStore((prev) => {
        const currentThreads = prev.chatThreads ?? {}
        const nextThreads: ChatThreads = {}

        // 0. Официальный системный чат Priday (всегда присутствует у каждого пользователя)
        const prevPriday = currentThreads[PRIDAY_CHAT_ID]
        const prevPridayReadMs = prevPriday?.readAtISO ? new Date(prevPriday.readAtISO).getTime() : 0
        const hasRecentPridayRead = prevPridayReadMs > 0 && Date.now() - prevPridayReadMs < 15000
        const hasWelcomeInDb = pridayDbMessages.some((m) => m.actorMeta?.kind === 'welcome')
        const baseWelcome = hasWelcomeInDb
          ? []
          : [
              prevPriday?.messages?.find((m) => m.actorMeta?.kind === 'welcome' || m.id === 'priday-welcome') ||
                buildPridayWelcomeMessage(pridayDbMessages[0]?.createdAtISO || new Date().toISOString()),
            ]

        const localExtraPriday = (prevPriday?.messages ?? []).filter(
          (lm) =>
            (lm.actorMeta?.kind === 'canned' || lm.actorMeta?.kind === 'milestone') &&
            !pridayDbMessages.some(
              (dm) =>
                (dm.dbId && dm.dbId === lm.dbId) ||
                (lm.actorMeta?.milestoneDay && dm.actorMeta?.milestoneDay === lm.actorMeta.milestoneDay) ||
                (dm.text === lm.text && Math.abs(new Date(dm.createdAtISO).getTime() - new Date(lm.createdAtISO).getTime()) < 5000)
            )
        )
        const mergedPridayMessages = [...baseWelcome, ...pridayDbMessages, ...localExtraPriday].sort(
          (a, b) => new Date(a.createdAtISO).getTime() - new Date(b.createdAtISO).getTime()
        )
        nextThreads[PRIDAY_CHAT_ID] = {
          ...(prevPriday ?? emptyThread()),
          readAtISO: hasRecentPridayRead ? prevPriday?.readAtISO ?? null : null,
          peerMeta: { ...PRIDAY_THREAD_PEER_META },
          groupMeta: null,
          messages: mergedPridayMessages,
        }

        // 1. Все актуальные переписки из Supabase
        for (const [peerId, rows] of Object.entries(byPeer)) {
          const prevThread = currentThreads[peerId] ?? emptyThread()
          const profile = profilesMap[peerId] || getCachedProfileSync(peerId)
          const peerMeta = profile
            ? {
                ...prevThread.peerMeta,
                name: profile.display_name || (profile.username ? `@${profile.username}` : prevThread.peerMeta?.name),
                username: profile.username || prevThread.peerMeta?.username,
                avatarUrl: profile.avatar_image || profile.avatar_url || prevThread.peerMeta?.avatarUrl,
                avatarColor: profile.avatar_color || prevThread.peerMeta?.avatarColor,
                verified:
                  typeof profile.verified === 'boolean'
                    ? profile.verified
                    : prevThread.peerMeta?.verified,
              }
            : prevThread.peerMeta
          const mappedMessages = rows.map((r) => mapRecordToChatMessage(r, uid))
          const prevReadMs = prevThread.readAtISO ? new Date(prevThread.readAtISO).getTime() : 0
          const hasRecentOptimisticRead = prevReadMs > 0 && Date.now() - prevReadMs < 15000
          nextThreads[peerId] = {
            ...prevThread,
            readAtISO: hasRecentOptimisticRead ? prevThread.readAtISO : null,
            peerMeta,
            pinnedMessageId: mappedMessages.find((m) => m.pinned)?.id ?? null,
            messages: mappedMessages,
          }
        }

        // 2. Пустые локально открытые диалоги / группы / Избранное (убивая старые фантомы)
        for (const [fId, prevThread] of Object.entries(currentThreads)) {
          if (nextThreads[fId] || isPridayChat(fId)) continue
          if (fId === 'ilonmusk-seed' || fId === 'cernavation-seed') continue
          const isGroup = fId.startsWith('group-') || Boolean(prevThread.groupMeta)
          if (isGroup) {
            nextThreads[fId] = prevThread
            continue
          }
          // Если у 1-на-1 чата в Supabase больше нет сообщений, очищаем локальный кэш сообщений, сохраняя peerMeta!
          const profile = profilesMap[fId] || getCachedProfileSync(fId)
          nextThreads[fId] = {
            ...prevThread,
            peerMeta: profile
              ? {
                  ...prevThread.peerMeta,
                  name: profile.display_name || (profile.username ? `@${profile.username}` : prevThread.peerMeta?.name),
                  username: profile.username || prevThread.peerMeta?.username,
                  avatarUrl: profile.avatar_image || profile.avatar_url || prevThread.peerMeta?.avatarUrl,
                  avatarColor: profile.avatar_color || prevThread.peerMeta?.avatarColor,
                  verified:
                    typeof profile.verified === 'boolean'
                      ? profile.verified
                      : prevThread.peerMeta?.verified,
                }
              : prevThread.peerMeta,
            messages: [],
            pinnedMessageId: null,
          }
        }

        const ensuredThreads = ensurePridayThreadInThreads(nextThreads)
        const nextActive =
          prev.chatActiveFriendId && ensuredThreads[prev.chatActiveFriendId]
            ? prev.chatActiveFriendId
            : Object.keys(ensuredThreads)[0] ?? null

        return {
          ...prev,
          unreadChatCount: totalUnread(ensuredThreads),
          chatThreads: ensuredThreads,
          chatActiveFriendId: nextActive,
        }
      }, true)

      return true
    },
    [updateStore, resolvePeerIdFromRecord, mapRecordToChatMessage]
  )

  /** Обновление существующего сообщения из Realtime канала Supabase (UPDATE: реакции, текст, закреп, опрос, прочтение) */
  const updateIncomingChatMessage = useCallback(
    (msg: DirectMessageRecord) => {
      if (!msg) return
      const currentUserId = getSnapshot().auth?.activeAccountId
      const peerId = resolvePeerIdFromRecord(msg, currentUserId)

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const targetThreadIds = peerId && threads[peerId] ? [peerId] : Object.keys(threads)
        let matchedFriendId: string | null = null
        let matchedMsgIndex = -1

        for (const fId of targetThreadIds) {
          const t = threads[fId]
          if (!t || !Array.isArray(t.messages)) continue
          const idx = t.messages.findIndex(
            (m) => m && (m.id === msg.id || m.dbId === msg.id || (msg.client_id && (m.id === msg.client_id || m.dbId === msg.client_id)))
          )
          if (idx >= 0) {
            matchedFriendId = fId
            matchedMsgIndex = idx
            break
          }
        }

        if (!matchedFriendId || matchedMsgIndex < 0) return prev

        const targetThread = threads[matchedFriendId]
        const existingMsg = targetThread.messages[matchedMsgIndex]

        const updatedMsg: ChatMessage = {
          ...existingMsg,
          dbId: msg.id || existingMsg.dbId,
          text: typeof msg.body === 'string' ? msg.body : existingMsg.text,
          reactions: Array.isArray(msg.reactions) ? msg.reactions : existingMsg.reactions,
          poll: msg.poll ? normalizePollForViewer(msg.poll, currentUserId) : existingMsg.poll,
          read: typeof msg.is_read === 'boolean' ? msg.is_read : existingMsg.read,
          status: msg.is_read ? 'read' : existingMsg.status,
          editedAtISO:
            (msg as any).edited_at ||
            (msg.is_edited ? (msg.updated_at || new Date().toISOString()) : existingMsg.editedAtISO),
          pinned: typeof msg.is_pinned === 'boolean' ? msg.is_pinned : existingMsg.pinned,
        }

        const newMessages = [...targetThread.messages]
        newMessages[matchedMsgIndex] = updatedMsg

        let newPinnedId = targetThread.pinnedMessageId
        if (msg.is_pinned === true) {
          newPinnedId = updatedMsg.id
        } else if (msg.is_pinned === false && targetThread.pinnedMessageId === updatedMsg.id) {
          newPinnedId = null
        }

        const nextThreads: ChatThreads = {
          ...threads,
          [matchedFriendId]: {
            ...targetThread,
            pinnedMessageId: newPinnedId,
            messages: newMessages,
          },
        }
        return {
          ...prev,
          unreadChatCount: totalUnread(nextThreads),
          chatThreads: nextThreads,
        }
      }, true)
    },
    [updateStore, resolvePeerIdFromRecord, normalizePollForViewer]
  )

  /** Обновить метаданные собеседника (имя, никнейм, аватар) для отображения без сырых UUID */
  const updateThreadPeerMeta = useCallback(
    (
      friendId: string,
      meta: {
        name?: string
        username?: string
        avatarUrl?: string
        avatarColor?: string
        verified?: boolean
        initials?: string
      }
    ) => {
      if (!friendId || !meta) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const curMeta = thread.peerMeta || {}
        const nextMeta = {
          ...curMeta,
          ...meta,
        }
        if (
          curMeta.name === nextMeta.name &&
          curMeta.username === nextMeta.username &&
          curMeta.avatarUrl === nextMeta.avatarUrl &&
          curMeta.avatarColor === nextMeta.avatarColor &&
          curMeta.verified === nextMeta.verified &&
          curMeta.initials === nextMeta.initials
        ) {
          return prev
        }
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              peerMeta: nextMeta,
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Выключает/включает уведомления переписки. Возвращает новое значение mute */
  const toggleThreadMute = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const current = threadOf(getSnapshot().chatThreads ?? {}, friendId)
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        return {
          ...prev,
          chatThreads: { ...threads, [friendId]: { ...thread, muted: !thread.muted } },
        }
      })
      return !current.muted
    },
    [updateStore]
  )

  /** Закрепляет/открепляет диалог сверху. Возвращает новое значение pin */
  const toggleThreadPin = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const current = threadOf(getSnapshot().chatThreads ?? {}, friendId)
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        return {
          ...prev,
          chatThreads: { ...threads, [friendId]: { ...thread, pinned: !thread.pinned } },
        }
      })
      return !current.pinned
    },
    [updateStore]
  )

  /* ── ЭТАП 18 — АВТОРИЗАЦИЯ, РЕГИСТРАЦИЯ И ПЕРЕКЛЮЧЕНИЕ АККАУНТОВ ──────── */

  /**
   * Делает аккаунт активным: переносит его слепок в основной профиль,
   * поднимает счётчики входов/переключений и сбрасывает защиту от перебора.
   * Возвращает false, если аккаунт с таким id не найден.
   */
  const activateAccount = useCallback(
    (accountId: string, isSwitch = false): boolean => {
      let activated = false
      const prevActiveId = getSnapshot().auth.activeAccountId
      const isChangingAccount = Boolean(isSwitch || (prevActiveId && prevActiveId !== accountId))
      if (isChangingAccount) {
        cancelPendingSave()
        clearProfileMemoryCache()
        clearUserLocalCaches({ includeAuthTokens: false })
      }
      updateStore((prev) => {
        const account = prev.auth.accounts.find((a) => a.id === accountId)
        if (!account) return prev
        activated = true
        const nowISO = new Date().toISOString()
        const accounts = prev.auth.accounts.map((a) =>
          a.id === accountId
            ? { ...a, lastActiveISO: nowISO, signInCount: a.signInCount + 1 }
            : a
        )
        const activeAccount = accounts.find((a) => a.id === accountId) ?? account
        const baseState = isChangingAccount ? clearUserSessionData(prev) : prev
        return {
          ...baseState,
          profile: sanitizeProfile({ ...baseState.profile, ...profilePatchFromAccount(activeAccount) }),
          auth: {
            ...baseState.auth,
            accounts,
            activeAccountId: accountId,
            signedIn: true,
            switchCount: prev.auth.switchCount + (isSwitch ? 1 : 0),
            signInCount: prev.auth.signInCount + 1,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastAuthAtISO: nowISO,
            updatedAtISO: nowISO,
          },
        }
      }, true)
      if (activated && isChangingAccount) {
        void syncEvidenceVaultForUser(accountId)
      }
      return activated
    },
    [updateStore]
  )

  /** Регистрация нового аккаунта по почте и паролю (пароль хранится только хэшем) */
  const registerWithEmail = useCallback(
    async (input: { displayName: string; email: string; password: string }): Promise<AuthResult> => {
      const email = normalizeEmail(input.email)
      const displayName = (input.displayName ?? '').trim()
      if (!displayName) return { ok: false, error: 'Укажите имя или ник' }
      if (!isValidEmail(email)) return { ok: false, error: 'Введите корректный адрес почты' }
      if (!isValidPassword(input.password)) {
        return {
          ok: false,
          error: `Пароль должен быть от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`,
        }
      }

      const current = getSnapshot()
      if (findAccountByEmail(current.auth.accounts, email)) {
        return { ok: false, error: 'Аккаунт с такой почтой уже существует на устройстве' }
      }

      const salt = generateSalt()
      const hash = await hashSecret(input.password, salt)
      let createdId: string | null = null

      updateStore((prev) => {
        const nowISO = new Date().toISOString()
        const account = createAccount({
          provider: 'email',
          displayName,
          email,
          passwordHash: hash,
          passwordSalt: salt,
          existingIds: prev.auth.accounts.map((a) => a.id),
          takenUsernames: takenUsernamesOf(prev.auth.accounts),
          verified: false,
          now: new Date(nowISO),
        })
        account.signInCount = 1
        account.lastActiveISO = nowISO
        createdId = account.id
        return {
          ...prev,
          profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(account) }),
          auth: {
            ...prev.auth,
            accounts: [...prev.auth.accounts, account],
            activeAccountId: account.id,
            signedIn: true,
            signInCount: prev.auth.signInCount + 1,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastAuthAtISO: nowISO,
            updatedAtISO: nowISO,
          },
        }
      }, true)

      return createdId
        ? { ok: true, accountId: createdId }
        : { ok: false, error: 'Не удалось создать аккаунт' }
    },
    [updateStore]
  )

  /** Вход по почте и паролю: проверка хэша, защита от перебора, активация аккаунта */
  const signInWithEmail = useCallback(
    async (emailInput: string, password: string): Promise<AuthResult> => {
      const email = normalizeEmail(emailInput)
      if (!isValidEmail(email)) return { ok: false, error: 'Введите корректный адрес почты' }

      const current = getSnapshot()
      const lockout = computeLockout(current.auth.lockedUntilISO)
      if (lockout.isLocked) {
        const seconds = Math.ceil(lockout.remainingMs / 1000)
        return { ok: false, error: `Вход временно заблокирован. Подождите ${seconds} с` }
      }

      const account = findAccountByEmail(current.auth.accounts, email)
      if (!account) {
        return { ok: false, error: 'Аккаунт с такой почтой не найден — зарегистрируйтесь' }
      }
      if (account.provider === 'guest') {
        return { ok: false, error: 'Это гостевой профиль — используйте гостевой вход' }
      }

      let valid: boolean
      if (account.passwordHash && account.passwordSalt) {
        valid = await verifySecret(password, account.passwordSalt, account.passwordHash)
      } else {
        // Демо-сид: пароль подставляется автоматически при первом входе
        valid = password === DEMO_ACCOUNT_PASSWORD
      }

      if (!valid) {
        const nextFail = nextFailedAttemptState(current.auth.failedAttempts)
        const nowISO = new Date().toISOString()
        updateStore((prev) => ({
          ...prev,
          auth: {
            ...prev.auth,
            failedAttempts: nextFail.failedAttempts,
            lockedUntilISO: nextFail.lockedUntilISO,
            updatedAtISO: nowISO,
          },
        }))
        if (nextFail.lockedUntilISO) {
          return { ok: false, error: 'Слишком много неверных попыток. Вход заблокирован на минуту.' }
        }
        return {
          ok: false,
          error: `Неверный пароль. Осталось попыток: ${attemptsLeft(nextFail.failedAttempts)}`,
        }
      }

      // Первый вход в демо-личность — закрепляем пароль как соль + хэш
      if (!account.passwordHash || !account.passwordSalt) {
        const salt = generateSalt()
        const hash = await hashSecret(password, salt)
        updateStore((prev) => ({
          ...prev,
          auth: {
            ...prev.auth,
            accounts: prev.auth.accounts.map((a) =>
              a.id === account.id ? { ...a, passwordHash: hash, passwordSalt: salt } : a
            ),
          },
        }))
      }

      const ok = activateAccount(account.id, true)
      return ok ? { ok: true, accountId: account.id } : { ok: false, error: 'Не удалось войти' }
    },
    [activateAccount, updateStore]
  )

  /** Вход через Google OAuth (локальная симуляция): находит или создаёт аккаунт */
  const signInWithGoogle = useCallback(
    (identity: { email: string; displayName: string }): AuthResult => {
      const email = normalizeEmail(identity.email)
      if (!isValidEmail(email)) {
        return { ok: false, error: 'Google не вернул корректный адрес почты' }
      }

      const current = getSnapshot()
      const existing = findAccountByEmail(current.auth.accounts, email)
      if (existing) {
        const ok = activateAccount(existing.id, true)
        return ok ? { ok: true, accountId: existing.id } : { ok: false, error: 'Не удалось войти' }
      }

      let createdId: string | null = null
      updateStore((prev) => {
        const nowISO = new Date().toISOString()
        const account = createAccount({
          provider: 'google',
          displayName: identity.displayName || email.split('@')[0],
          email,
          existingIds: prev.auth.accounts.map((a) => a.id),
          takenUsernames: takenUsernamesOf(prev.auth.accounts),
          verified: false,
          now: new Date(nowISO),
        })
        account.signInCount = 1
        account.lastActiveISO = nowISO
        createdId = account.id
        return {
          ...prev,
          profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(account) }),
          auth: {
            ...prev.auth,
            accounts: [...prev.auth.accounts, account],
            activeAccountId: account.id,
            signedIn: true,
            signInCount: prev.auth.signInCount + 1,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastAuthAtISO: nowISO,
            updatedAtISO: nowISO,
          },
        }
      }, true)

      return createdId
        ? { ok: true, accountId: createdId }
        : { ok: false, error: 'Не удалось войти через Google' }
    },
    [activateAccount, updateStore]
  )

  /** Гостевой демо-режим: включает существующего гостя или создаёт нового */
  const continueAsGuest = useCallback((): AuthResult => {
    const current = getSnapshot()
    const existing = current.auth.accounts.find((a) => a.provider === 'guest')
    if (existing) {
      const ok = activateAccount(existing.id, true)
      return ok
        ? { ok: true, accountId: existing.id }
        : { ok: false, error: 'Не удалось войти как гость' }
    }

    let createdId: string | null = null
    updateStore((prev) => {
      const nowISO = new Date().toISOString()
      const account = createAccount({
        provider: 'guest',
        displayName: 'Гость Priday',
        isGuest: true,
        existingIds: prev.auth.accounts.map((a) => a.id),
        takenUsernames: takenUsernamesOf(prev.auth.accounts),
        verified: false,
        now: new Date(nowISO),
      })
      account.signInCount = 1
      account.lastActiveISO = nowISO
      createdId = account.id
      return {
        ...prev,
        profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(account) }),
        auth: {
          ...prev.auth,
          accounts: [...prev.auth.accounts, account],
          activeAccountId: account.id,
          signedIn: true,
          signInCount: prev.auth.signInCount + 1,
          failedAttempts: 0,
          lockedUntilISO: null,
          lastAuthAtISO: nowISO,
          updatedAtISO: nowISO,
        },
      }
    })

    return createdId
      ? { ok: true, accountId: createdId }
      : { ok: false, error: 'Не удалось войти как гость' }
  }, [activateAccount, updateStore])

  /**
   * Применение сессии аутентифицированного пользователя из Supabase Auth:
   * сохраняет реальный ID, никнейм, display_name и медиа пользователя в стейт и профиль.
   */
  const applyUserSession = useCallback(
    async (params: {
      userId: string
      username: string
      displayName?: string
      email?: string
      avatarUrl?: string | null
      bannerUrl?: string | null
    }): Promise<{ ok: boolean; accountId: string }> => {
      const cleanNick = (params.username || 'user').trim().toLowerCase().replace(/^@/, '')
      const displayName = (params.displayName || cleanNick).trim()
      const email = params.email || `${cleanNick}@ogonek.local`
      const nowISO = new Date().toISOString()
      const accountId = params.userId || `acct-${cleanNick}`

      const prevSnapshot = getSnapshot()
      const prevAccountId = prevSnapshot.auth?.activeAccountId
      const prevUsername = prevSnapshot.profile?.username?.toLowerCase()
      const isSwitchingAccount = Boolean(
        (prevAccountId && prevAccountId !== accountId) ||
          (prevUsername && prevUsername !== 'guest' && prevUsername !== cleanNick)
      )
      if (isSwitchingAccount) {
        cancelPendingSave()
        clearProfileMemoryCache()
        clearUserLocalCaches({ includeAuthTokens: false })
      }

      // Загружаем актуальные данные профиля (включая реальный level, аватар, цвет) из базы данных Supabase
      let avatarImage = params.avatarUrl ?? null
      let avatarColor: string | null = null
      let bannerImage = params.bannerUrl ?? null
      let dbLevel: number | null = null
      let dbCity: string | null = null
      let dbWebsite: string | null = null
      let dbVerified: boolean | null = null
      let dbBio: string | null = null
      let dbAge: number | null = null
      let dbIsAnon: boolean | null = null
      let dbTourCompleted: boolean | null = null
      let dbPrivacy: any = null
      let dbSubscriptionTier: 'free' | 'pro' | 'premium' | 'ultra' | null = null
      let dbSubscriptionExpiresAt: string | null = null

      try {
        const client = getSupabase()
        if (client && params.userId) {
          const { data: dbProfile } = await client
            .from('profiles')
            .select('*')
            .eq('id', params.userId)
            .single()
          if (dbProfile) {
            const rawPrivacy = dbProfile.privacy && typeof dbProfile.privacy === 'object' ? dbProfile.privacy : {}
            dbPrivacy = {
              ...rawPrivacy,
              ...(dbProfile.who_can_find ? { whoCanFind: dbProfile.who_can_find } : {}),
              ...(dbProfile.who_can_message ? { whoCanMessage: dbProfile.who_can_message } : {}),
              ...(dbProfile.who_can_call ? { whoCanCall: dbProfile.who_can_call } : {}),
              ...(dbProfile.who_can_see_online ? { whoCanSeeOnline: dbProfile.who_can_see_online } : {}),
              ...(dbProfile.default_day_visibility ? { defaultDayVisibility: dbProfile.default_day_visibility } : {}),
              ...(typeof dbProfile.is_hidden_from_search === 'boolean'
                ? { isHiddenFromSearch: dbProfile.is_hidden_from_search }
                : {}),
              ...(dbProfile.allow_messages_from ? { allowMessagesFrom: dbProfile.allow_messages_from } : {}),
              ...(dbProfile.allow_group_invites_from
                ? { allowGroupInvitesFrom: dbProfile.allow_group_invites_from }
                : {}),
            }
            if (dbProfile.avatar_image || dbProfile.avatar_url) {
              avatarImage = dbProfile.avatar_image || dbProfile.avatar_url
            }
            if (dbProfile.avatar_color) avatarColor = dbProfile.avatar_color
            if (dbProfile.banner_image || dbProfile.cover_url) {
              bannerImage = dbProfile.banner_image || dbProfile.cover_url
            }
            if (dbProfile.subscription_tier) dbSubscriptionTier = dbProfile.subscription_tier
            if (dbProfile.subscription_expires_at) {
              dbSubscriptionExpiresAt = dbProfile.subscription_expires_at
            } else if (dbProfile.subscription_valid_until) {
              dbSubscriptionExpiresAt = dbProfile.subscription_valid_until
            }
            dbLevel =
              (typeof dbProfile.level === 'number' && dbProfile.level > 0 ? dbProfile.level : null) ??
              (typeof dbProfile.settings?.level === 'number' && dbProfile.settings.level > 0 ? dbProfile.settings.level : null) ??
              (typeof dbProfile.difficulty_level === 'number' && dbProfile.difficulty_level > 0 ? dbProfile.difficulty_level : null) ??
              (dbProfile.level ? Number(dbProfile.level) : null) ??
              (dbProfile.settings?.level ? Number(dbProfile.settings.level) : null) ??
              (dbProfile.difficulty_level ? Number(dbProfile.difficulty_level) : null) ??
              null
            if (dbProfile.city) dbCity = dbProfile.city
            if (dbProfile.website) dbWebsite = dbProfile.website
            if (typeof dbProfile.verified === 'boolean') dbVerified = dbProfile.verified
            if (dbProfile.bio) dbBio = dbProfile.bio
            if (typeof dbProfile.age === 'number') dbAge = dbProfile.age
            if (typeof dbProfile.is_anonymous === 'boolean') dbIsAnon = dbProfile.is_anonymous
            if (typeof dbProfile.tour_completed === 'boolean') {
              dbTourCompleted = dbProfile.tour_completed
            } else if (typeof dbProfile.settings?.tour_completed === 'boolean') {
              dbTourCompleted = dbProfile.settings.tour_completed
            } else if (typeof dbProfile.onboarding_completed === 'boolean') {
              dbTourCompleted = dbProfile.onboarding_completed
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch remote profile on applyUserSession:', err)
      }

      // Загружаем актуальный социальный граф из таблицы `follows` (SSOT)
      let remoteGraph = {
        followingIds: [] as string[],
        followerIds: [] as string[],
        friendIds: [] as string[],
      }
      try {
        if (params.userId) {
          remoteGraph = await getSocialGraphFromFollows(params.userId)
        }
      } catch (err) {
        console.warn('Could not fetch social graph on applyUserSession:', err)
      }

      updateStore((prev) => {
        const baseState = isSwitchingAccount ? clearUserSessionData(prev) : prev
        const existing = prev.auth.accounts.find(
          (a) => a.id === accountId || a.snapshot.username?.toLowerCase() === cleanNick
        )

        const isOwner = cleanNick === 'cernavation'
        const baseProfile = existing && !isSwitchingAccount ? baseState.profile : DEFAULT_PROFILE
        const effectiveTier: 'free' | 'pro' | 'premium' | 'ultra' = isOwner
          ? 'ultra'
          : (dbSubscriptionTier || (existing?.snapshot as any)?.subscription_tier || baseProfile.subscription_tier || 'free')
        const effectiveExpiresAt = dbSubscriptionExpiresAt || (existing?.snapshot as any)?.subscription_expires_at || (baseProfile as any)?.subscription_expires_at || null

        let account: AuthAccount
        if (existing) {
          account = {
            ...existing,
            id: accountId,
            email,
            lastActiveISO: nowISO,
            signInCount: existing.signInCount + 1,
            snapshot: {
              ...existing.snapshot,
              username: cleanNick,
              displayName,
              avatarImage: avatarImage || (isSwitchingAccount ? null : existing.snapshot.avatarImage),
              bannerImage: bannerImage || (isSwitchingAccount ? null : existing.snapshot.bannerImage),
              subscription_tier: effectiveTier,
              subscription_expires_at: effectiveExpiresAt,
              subscription_valid_until: effectiveExpiresAt,
              verified: isOwner ? true : (dbVerified !== null ? dbVerified : existing.snapshot.verified),
            },
          }
        } else {
          account = createAccount({
            provider: 'email',
            displayName,
            username: cleanNick,
            email,
            verified: isOwner ? true : (dbVerified ?? false),
            now: new Date(nowISO),
          })
          account.id = accountId
          account.signInCount = 1
          account.lastActiveISO = nowISO
          if (avatarImage) account.snapshot.avatarImage = avatarImage
          if (bannerImage) account.snapshot.bannerImage = bannerImage
          account.snapshot.subscription_tier = effectiveTier
          account.snapshot.subscription_expires_at = effectiveExpiresAt
          account.snapshot.subscription_valid_until = effectiveExpiresAt
        }

        const effectiveLevel = isOwner ? 5 : (dbLevel ?? (existing && !isSwitchingAccount ? (baseProfile.difficultyLevel || baseProfile.level || 1) : 1))

        return {
          ...baseState,
          profile: sanitizeProfile({
            ...baseProfile,
            ...profilePatchFromAccount(account),
            username: cleanNick,
            displayName,
            avatarImage: account.snapshot.avatarImage,
            avatarColor: avatarColor || baseProfile.avatarColor || '#FF5C00',
            bannerImage: account.snapshot.bannerImage,
            coverUrl: account.snapshot.bannerImage,
            verified: isOwner ? true : (dbVerified !== null ? dbVerified : (existing ? baseProfile.verified : false)),
            level: effectiveLevel,
            difficultyLevel: effectiveLevel,
            subscription_tier: effectiveTier,
            subscription_expires_at: effectiveExpiresAt,
            subscription_valid_until: effectiveExpiresAt,
            monthlyGoal: existing && !isSwitchingAccount ? baseProfile.monthlyGoal : '',
            bio: dbBio !== null ? dbBio : (account.snapshot.bio || ''),
            city: dbCity !== null ? dbCity : (account.snapshot.city || ''),
            website: dbWebsite !== null ? dbWebsite : (existing && !isSwitchingAccount ? baseProfile.website : ''),
            age: dbAge !== null ? dbAge : (existing && !isSwitchingAccount ? baseProfile.age : null),
            isAnonymous: dbIsAnon !== null ? dbIsAnon : (existing && !isSwitchingAccount ? baseProfile.isAnonymous : false),
            tour_completed: dbTourCompleted !== null ? dbTourCompleted : (existing && !isSwitchingAccount ? Boolean(baseProfile.tour_completed) : false),
            onboarding_completed: dbTourCompleted !== null ? dbTourCompleted : (existing && !isSwitchingAccount ? Boolean(baseProfile.onboarding_completed) : false),
          }),
          privacy: dbPrivacy ? sanitizePrivacySettings(dbPrivacy) : baseState.privacy,
          days: isSwitchingAccount
            ? []
            : isOwner
              ? baseState.days
              : baseState.days.length > 0 && prev.auth.accounts.some((a) => a.id === accountId)
                ? baseState.days
                : [],
          followingIds: remoteGraph.followingIds,
          exploreFollowingIds: remoteGraph.followingIds,
          followerIds: remoteGraph.followerIds,
          friendIds: remoteGraph.friendIds,
          chatThreads: ensurePridayThreadInThreads(baseState.chatThreads),
          auth: {
            ...baseState.auth,
            accounts: [
              ...prev.auth.accounts.filter(
                (a) => a.id !== account.id && a.snapshot.username?.toLowerCase() !== cleanNick
              ),
              account,
            ],
            activeAccountId: account.id,
            signedIn: true,
            signInCount: prev.auth.signInCount + 1,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastAuthAtISO: nowISO,
            updatedAtISO: nowISO,
          },
        }
      }, true)

      // Подгрузка Evidence Vault строго для активного params.userId (включая очистку до [], если фактов 0)
      if (params.userId) {
        try {
          const vaultRes = await getEvidenceVaultStatus(params.userId)
          if (vaultRes.ok) {
            updateStore((prev) => {
              if (prev.auth.activeAccountId && prev.auth.activeAccountId !== accountId) {
                return prev
              }
              const mapped = vaultRes.items.map((v) => ({
                id: v.client_id || v.id,
                title: v.title,
                description: v.description,
                date: v.date,
                category: v.category,
                pinned: Boolean(v.pinned),
              }))
              return {
                ...prev,
                evidenceItems: mapped,
                evidenceFavorites: mapped.filter((v) => v.pinned).map((v) => v.id),
              }
            }, true)
          }
        } catch {}
      }

      // Автозагрузка дней из облака Supabase для активного аккаунта, если локальный стейт пуст
      if (params.userId) {
        const uid = params.userId || accountId
        const supabase = getSupabase()
        if (supabase && uid) {
          const currentDays = getSnapshot().days
          if (!currentDays || currentDays.length === 0) {
            try {
              const { data: cloudDays, error: daysErr } = await supabase
                .from('days')
                .select('*, prides(*), gratitudes(*)')
                .eq('user_id', uid)
                .order('date_iso', { ascending: false })

              if (!daysErr && Array.isArray(cloudDays) && cloudDays.length > 0) {
                const mappedDays = cloudDays.map(mapCloudDayToDay)
                updateStore((prev) => {
                  if (prev.auth.activeAccountId && prev.auth.activeAccountId !== accountId) {
                    return prev
                  }
                  if (!prev.days || prev.days.length === 0) {
                    return { ...prev, days: mappedDays }
                  }
                  return prev
                }, true)
              }
            } catch (err) {
              console.warn('[Ogonek] Auto-load cloud days error:', err)
            }
          }
        }
      }

      return { ok: true, accountId }
    },
    [updateStore]
  )

  /** Ручная или фоновая загрузка всех дней пользователя напрямую из Supabase в стор */
  const loadDaysFromCloud = useCallback(
    async (overrideUserId?: string) => {
      const snap = getSnapshot()
      const supabase = getSupabase()
      if (!supabase) return { ok: false, count: 0, error: 'Supabase client unavailable' }

      const username = (snap.profile?.username || '').toLowerCase()
      let uid =
        overrideUserId ||
        snap.auth.activeAccountId ||
        (snap.profile as any)?.id ||
        (username === 'cernavation' ? '94e9eaf7-ec74-4366-9ce3-7de1e670f52b' : null)

      if (!uid) {
        try {
          const { data: sData } = await supabase.auth.getSession()
          if (sData?.session?.user?.id) uid = sData.session.user.id
        } catch {}
      }

      if (!uid) return { ok: false, count: 0, error: 'No user ID' }

      try {
        const { data: cloudDays, error } = await supabase
          .from('days')
          .select('*, prides(*), gratitudes(*)')
          .eq('user_id', uid)
          .order('date_iso', { ascending: false })

        if (!error && Array.isArray(cloudDays)) {
          const mapped = cloudDays.map(mapCloudDayToDay).sort((a, b) => b.id - a.id)
          const newStreak = calculateStreak(mapped)
          updateStore((prev) => ({
            ...prev,
            days: mapped,
            profile: {
              ...prev.profile,
              streak: newStreak,
              streak_count: newStreak,
            },
          }))
          return { ok: true, count: mapped.length }
        }
        return { ok: false, count: 0, error: error?.message }
      } catch (err: any) {
        return { ok: false, count: 0, error: err?.message }
      }
    },
    [updateStore]
  )

  /** Загрузка актуального профиля пользователя из Supabase в стор */
  const loadProfileFromCloud = useCallback(
    async (overrideUserId?: string) => {
      const snap = getSnapshot()
      const uid = overrideUserId || snap.auth.activeAccountId || (snap.profile as any)?.id
      const username = (snap.profile?.username || '').toLowerCase()
      const supabase = getSupabase()
      if (!supabase || (!uid && !username)) return { ok: false }

      try {
        let q = supabase.from('profiles').select('*')
        if (uid) {
          q = q.eq('id', uid)
        } else {
          q = q.eq('username', username)
        }
        const { data: dbProfile, error } = await q.maybeSingle()
        if (error || !dbProfile) return { ok: false, error: error?.message }

        const isOwner = (dbProfile.username || username).toLowerCase() === 'cernavation'
        const effectiveTier: 'free' | 'pro' | 'premium' | 'ultra' = isOwner ? 'ultra' : (dbProfile.subscription_tier || 'free')
        const effectiveValidUntil = dbProfile.subscription_expires_at || dbProfile.subscription_valid_until || null
        const effectiveLevel = isOwner ? 5 : (dbProfile.level || dbProfile.difficulty_level || 1)
        const resolvedAvatar = dbProfile.avatar_image || dbProfile.avatar_url || null
        const resolvedBanner = dbProfile.banner_image || dbProfile.cover_url || null

        updateStore((prev) => {
          const effectiveStreak = isOwner
            ? Math.max(dbProfile.streak_count || 0, prev.days.length, 720)
            : Math.max(dbProfile.streak_count || 0, prev.days.length)

          const updatedProfile = sanitizeProfile({
            ...prev.profile,
            displayName: dbProfile.display_name || prev.profile.displayName,
            username: dbProfile.username || prev.profile.username,
            avatarImage:
              resolvedAvatar ??
              (prev.profile.avatarImage?.startsWith('idb:') ? prev.profile.avatarImage : null),
            avatarColor: dbProfile.avatar_color || prev.profile.avatarColor || '#FF5C00',
            bannerImage: resolvedBanner ?? prev.profile.bannerImage,
            coverUrl: resolvedBanner ?? prev.profile.coverUrl,
            bio: dbProfile.bio ?? prev.profile.bio,
            city: dbProfile.city ?? prev.profile.city,
            website: dbProfile.website ?? prev.profile.website,
            verified: typeof dbProfile.verified === 'boolean' ? dbProfile.verified : (isOwner ? true : prev.profile.verified),
            level: effectiveLevel,
            difficultyLevel: effectiveLevel,
            streak_count: effectiveStreak,
            streak: effectiveStreak,
            subscription_tier: effectiveTier,
            subscription_expires_at: effectiveValidUntil,
            subscription_valid_until: effectiveValidUntil,
          })

          const updatedAccounts = prev.auth.accounts.map((a) => {
            if (a.id === uid || a.snapshot.username?.toLowerCase() === (dbProfile.username || username).toLowerCase()) {
              return {
                ...a,
                snapshot: {
                  ...a.snapshot,
                  displayName: updatedProfile.displayName,
                  avatarImage: updatedProfile.avatarImage,
                  bannerImage: updatedProfile.bannerImage,
                  verified: updatedProfile.verified,
                  subscription_tier: effectiveTier,
                  subscription_expires_at: effectiveValidUntil,
                  subscription_valid_until: effectiveValidUntil,
                },
              }
            }
            return a
          })

          return {
            ...prev,
            profile: updatedProfile,
            auth: {
              ...prev.auth,
              accounts: updatedAccounts,
            },
          }
        })
        if (uid) {
          void syncEvidenceVaultForUser(uid)
        }
        return { ok: true, profile: dbProfile }
      } catch (err: any) {
        return { ok: false, error: err?.message }
      }
    },
    [updateStore]
  )

  /**
   * Синхронизация подписок, подписчиков и взаимных друзей напрямую из Supabase `follows` (SSOT).
   */
  const syncSocialGraphFromCloud = useCallback(
    async (overrideUserId?: string) => {
      const snap = getSnapshot()
      const uid = overrideUserId || snap.auth?.activeAccountId || (snap.profile as any)?.id
      if (!uid || uid.startsWith('anon-') || uid.startsWith('acct-guest')) {
        return { followingIds: [], followerIds: [], friendIds: [] }
      }
      const graph = await getSocialGraphFromFollows(uid)
      updateStore((prev) => ({
        ...prev,
        followingIds: graph.followingIds,
        exploreFollowingIds: graph.followingIds,
        followerIds: graph.followerIds,
        friendIds: graph.friendIds,
      }))
      return graph
    },
    [updateStore]
  )

  /** Быстрое переключение на другой аккаунт (без пароля — устройство доверенное) */
  const switchAccount = useCallback(
    (accountId: string): boolean => activateAccount(accountId, true),
    [activateAccount]
  )

  /** Мгновенный выход из аккаунта с первого клика: очищает Supabase-токены, куки, локальный стор и переводит на лендинг */
  const signOut = useCallback(async () => {
    // 1. Отменяем отложенный debounce-таймер, сбрасываем профильный кэш и удаляем пользовательские кэши
    // (токены sb-*, ogonek.v2, priday_draft, черновики), оставляя только настройки темы/акцента.
    cancelPendingSave()
    clearProfileMemoryCache()
    clearUserLocalCaches({ includeAuthTokens: true })

    // 2. Синхронно сбрасываем весь пользовательский стор без утечки дней, сейфа и чатов
    cachedState = clearUserSessionData(cachedState)
    saveStoreImmediate(cachedState)

    // 3. Ожидаем signOut в Supabase (с коротким таймаутом на случай плохой сети)
    try {
      const client = getSupabase()
      if (client) {
        await Promise.race([
          client.auth.signOut({ scope: 'local' }),
          new Promise((resolve) => setTimeout(resolve, 600)),
        ])
      }
    } catch {}

    emitChange()

    if (typeof window !== 'undefined') {
      window.location.replace('/ru')
    }
  }, [])

  /**
   * Удаляет аккаунт с устройства. Если удаляется активный — переключает на
   * первый оставшийся. Возвращает false, если это последний аккаунт.
   */
  const removeAccount = useCallback(
    (accountId: string): boolean => {
      const current = getSnapshot()
      if (current.auth.accounts.length <= 1) return false
      const target = current.auth.accounts.find((a) => a.id === accountId)
      if (!target) return false

      const wasActive = current.auth.activeAccountId === accountId
      const remaining = current.auth.accounts.filter((a) => a.id !== accountId)
      const nextActive = wasActive ? remaining[0] ?? null : null

      updateStore((prev) => {
        const accounts = prev.auth.accounts.filter((a) => a.id !== accountId)
        if (accounts.length === 0) return prev
        const nowISO = new Date().toISOString()
        if (!wasActive || !nextActive) {
          return {
            ...prev,
            auth: { ...prev.auth, accounts, updatedAtISO: nowISO },
          }
        }
        return {
          ...prev,
          profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(nextActive) }),
          auth: {
            ...prev.auth,
            accounts,
            activeAccountId: nextActive.id,
            signedIn: true,
            switchCount: prev.auth.switchCount + 1,
            updatedAtISO: nowISO,
            lastAuthAtISO: nowISO,
          },
        }
      })
      return true
    },
    [updateStore]
  )

  /**
   * Разово готовит демо-пароли сид-аккаунтов: если у почтовых/Google-личностей
   * ещё нет соли и хэша, закрепляет пароль `DEMO_ACCOUNT_PASSWORD` как SHA-256.
   * Гостевые профили пропускаются. Вызывается один раз при старте приложения.
   */
  const provisionDemoAccountSecrets = useCallback(async () => {
    const current = getSnapshot()
    const needs = current.auth.accounts.some(
      (a) => a.provider !== 'guest' && (!a.passwordHash || !a.passwordSalt)
    )
    if (!needs) return
    const salt = generateSalt()
    const hash = await hashSecret(DEMO_ACCOUNT_PASSWORD, salt)
    updateStore((prev) => ({
      ...prev,
      auth: {
        ...prev.auth,
        accounts: prev.auth.accounts.map((a) =>
          a.provider !== 'guest' && (!a.passwordHash || !a.passwordSalt)
            ? { ...a, passwordHash: hash, passwordSalt: salt }
            : a
        ),
        updatedAtISO: new Date().toISOString(),
      },
    }))
  }, [updateStore])

  /** Безопасный сброс кэша мессенджера при повреждении сохранённых данных */
  const resetMessengerState = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ogonek_messenger_state')
      }
    } catch {}
    updateStore((prev) => ({
      ...prev,
      ...emptyMessengerState(),
    }))
  }, [updateStore])

  return {
    state,
    currentUser,
    isHydrated: typeof window !== 'undefined',
    resetMessengerState,
    addDay,
    addNewDay,
    updateDay,
    updateDayWithPayload,
    deleteDay,
    saveMorningIntentions,
    setMorningFocusStep,
    toggleMorningFocusStep,
    markMorningFocusStepDone,
    markMorningFocusStepMissed,
    completeEveningReview,
    reopenEveningReview,
    removeMorningFocusRecord,
    saveComposerDraft,
    clearComposerDraft,
    toggleEvidencePin,
    addEvidenceItem,
    deleteEvidenceItem,
    setSoundEnabled,
    setSoundVolume,
    setUnreadChatCount,
    setUnreadNotificationsCount,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    refreshUnreadCounts,
    updateStore,
    setPinEnabled,
    setTheme,
    setAccent,
    setFontScale,
    setFeedDensity,
    resetAppearance,
    updateSecurity,
    recordSecurityEvent,
    setAccountPassword,
    clearAccountPassword,
    setSecurityPin,
    clearSecurityPin,
    setBiometricEnabled,
    setLockOnOpen,
    setPinQuickUnlock,
    setAutoLockMinutes,
    registerFailedUnlock,
    verifyPin,
    verifyPassword,
    unlockWithBiometric,
    lockAppNow,
    resetSecurity,
    updatePrivacy,
    setProfileVisibility,
    setCommentPolicy,
    setChatPolicy,
    resetPrivacy,
    updateStreakSettings,
    setStreakDeadlineMinutes,
    setStreakTimeZone,
    setStreakWeekendBonus,
    resetStreakSettings,
    addMonthlyKpi,
    updateMonthlyKpi,
    removeMonthlyKpi,
    toggleMonthlyKpiManual,
    resetMonthlyKpis,
    syncNow,
    addVerifiedAchievement,
    updateVerifiedAchievement,
    attachAchievementEvidence,
    removeAchievementEvidence,
    submitAchievementForVerification,
    resolveAchievementReview,
    startAchievementSubmission,
    resolveModerationStatus,
    withdrawSubmission,
    reopenAchievement,
    removeVerifiedAchievement,
    updateProfile,
    resetProfile,
    toggleFollow,
    toggleExploreFollow,
    ensureMutualFriendshipChat,
    toggleExplorePostLike,
    toggleExplorePostSave,
    addExploreSearch,
    removeExploreSearch,
    clearExploreSearches,
    addFriend,
    removeFriend,
    acceptFriendRequest,
    declineFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    dismissSuggestion,
    restoreSuggestions,
    markStoryViewed,
    markStoriesViewed,
    resetStoryViews,
    postMyStory,
    removeMyStory,
    clearMyStories,
    importState,
    resetToDefaults,
    getNextDayDate,
    getNextDayId,
    setActiveCall,
    setActiveChatFriend,
    startChatWithFriend,
    sendChatMessage,
    receiveIncomingChatMessage,
    receivePridaySystemNotification,
    deliverPridayMilestoneMessage,
    updateIncomingChatMessage,
    removeDeletedChatMessage,
    reconcileThreadMessages,
    loadChatThreadsFromCloud,
    updateThreadPeerMeta,
    forwardToChat,
    toggleChatReaction,
    setChatDraft,
    markThreadRead,
    markAllThreadsRead,
    clearThreadMessages,
    deleteChatThread,
    deleteChatMessage,
    toggleThreadMute,
    toggleThreadPin,
    toggleThreadArchive,
    editChatMessage,
    deleteChatMessages,
    togglePinChatMessage,
    createGroupChat,
    updateGroupMeta,
    addGroupMembers,
    removeGroupMember,
    setGroupMemberRole,
    leaveGroup,
    muteChatThread,
    editScheduledMessage,
    cancelScheduledMessage,
    setChatFolder,
    deleteChatFolder,
    setChatActiveFolderId,
    translateChatMessage,
    transcribeVoiceMessage,
    voteInPoll,
    toggleMessageLabel,
    assignChatTag,
    setChatTag,
    deleteChatTag,
    updateChatSettings,
    deliverScheduledMessages,
    setDifficultyLevel,
    toggleReaction,
    getReactionsFor,
    getMyReactionsFor,
    addCustomEmoji,
    removeCustomEmoji,
    ratePride,
    rateGratitude,
    clearPrideRating,
    clearGratitudeRating,
    setDayVisibility,
    setDayAudience,
    setPrideVisibility,
    setAllPridesVisibility,
    loadCommentsForTargets,
    addComment,
    addReply,
    toggleCommentLike,
    toggleCommentReaction,
    deleteComment,
    getCommentsFor,
    clearComments,
    registerWithEmail,
    signInWithEmail,
    applyUserSession,
    signInWithGoogle,
    continueAsGuest,
    switchAccount,
    signOut,
    removeAccount,
    loadDaysFromCloud,
    loadProfileFromCloud,
    syncSocialGraphFromCloud,
    saveDayDirectlyToSupabase,
    provisionDemoAccountSecrets,
  }
}
