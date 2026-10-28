import type { Day, PrideEntry, GratitudeEntry, VisibilityLevel } from './types'

export type DayCardPropsLike = {
  day: Day
  soundEnabled?: boolean
  onLightbox?: (url: string) => void
  onNotify?: (msg: string) => void
  onPinToVault?: (fact: string) => void
  onEdit?: (day: Day) => void
}

export type DayEntriesPropsLike = {
  dayId?: number
  dayVisibility?: VisibilityLevel
  soundEnabled?: boolean
  prides: PrideEntry[]
  gratitudes: (string | GratitudeEntry)[]
  onPinToVault?: (fact: string) => void
  onNotify?: (msg: string) => void
  onSetPrideVisibility?: (index: number, level: VisibilityLevel) => void
  onPublishPrideStory?: (index: number) => void
  onForwardPride?: (index: number) => void
  onForwardGratitude?: (index: number) => void
}

export type CurrentUser = {
  id: string
  username: string
  displayName: string
  avatarImage: string | null
  avatarColor: string
  bio: string
  city: string
} | null

let memoizedCurrentUser: CurrentUser = null
let memoizedActiveAccountId: string | null = null
let memoizedSignedIn: boolean = false
let memoizedAccountsRef: any = null
let memoizedProfileRef: any = null

export function getMemoizedCurrentUser(state: {
  auth?: { signedIn?: boolean; activeAccountId?: string | null; accounts?: any[] }
  profile?: { username?: string; displayName?: string; avatarImage?: string | null; avatarColor?: string; bio?: string; city?: string }
}): CurrentUser {
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

  const active = state.auth?.accounts?.find((a: any) => a.id === state.auth?.activeAccountId)
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

/**
 * Строгая функция сравнения пропсов карточки дня для 120 FPS скролла.
 * При клике по вкладкам фильтров или наборе текста в инпутах,
 * карточки дней не перерисовываются заново — рендерится только то, что изменилось.
 */
export function areDayCardPropsEqual(prev: DayCardPropsLike, next: DayCardPropsLike): boolean {
  if (prev.soundEnabled !== next.soundEnabled) return false
  if (prev.day.id !== next.day.id) return false
  if (prev.day.dateISO !== next.day.dateISO) return false
  if (prev.day.visibility !== next.day.visibility) return false
  if ((prev.day as any).updatedAtISO !== (next.day as any).updatedAtISO) return false
  if ((prev.day as any).updated_at !== (next.day as any).updated_at) return false

  // Гордости (длина, текст, оценка scale, преодоление overcome, видимость)
  const prevPrides = prev.day.prides || []
  const nextPrides = next.day.prides || []
  if (prevPrides.length !== nextPrides.length) return false
  for (let i = 0; i < prevPrides.length; i++) {
    const p1 = prevPrides[i]
    const p2 = nextPrides[i]
    if (
      p1?.text !== p2?.text ||
      p1?.scale !== p2?.scale ||
      p1?.visibility !== p2?.visibility ||
      (p1 as any)?.overcome !== (p2 as any)?.overcome
    ) {
      return false
    }
  }

  // Благодарности (длина, текст, оценка rating, видимость)
  const prevGratitudes = prev.day.gratitudes || []
  const nextGratitudes = next.day.gratitudes || []
  if (prevGratitudes.length !== nextGratitudes.length) return false
  for (let i = 0; i < prevGratitudes.length; i++) {
    const g1 = prevGratitudes[i]
    const g2 = nextGratitudes[i]
    const t1 = typeof g1 === 'string' ? g1 : g1?.text
    const t2 = typeof g2 === 'string' ? g2 : g2?.text
    const r1 = typeof g1 === 'object' ? g1?.rating : undefined
    const r2 = typeof g2 === 'object' ? g2?.rating : undefined
    const v1 = typeof g1 === 'object' ? g1?.visibility : undefined
    const v2 = typeof g2 === 'object' ? g2?.visibility : undefined
    if (t1 !== t2 || r1 !== r2 || v1 !== v2) return false
  }

  // Медиа и фото
  const p1Photos = prev.day.photos || []
  const p2Photos = next.day.photos || []
  if (p1Photos.length !== p2Photos.length) return false
  if (prev.day.media_url !== next.day.media_url) return false

  return true
}

/**
 * Строгая функция сравнения пропсов для вкладок записей дня (5 Гордостей / 5 Благодарностей).
 * Исключает повторные ре-рендеры неизмененных блоков при скролле и интерактивности ленты.
 */
export function areDayEntriesPropsEqual(prev: DayEntriesPropsLike, next: DayEntriesPropsLike): boolean {
  if (prev.dayId !== next.dayId) return false
  if (prev.dayVisibility !== next.dayVisibility) return false
  if (prev.soundEnabled !== next.soundEnabled) return false

  const prevPrides = prev.prides || []
  const nextPrides = next.prides || []
  if (prevPrides.length !== nextPrides.length) return false
  for (let i = 0; i < prevPrides.length; i++) {
    const p1 = prevPrides[i]
    const p2 = nextPrides[i]
    if (
      p1?.text !== p2?.text ||
      p1?.scale !== p2?.scale ||
      p1?.visibility !== p2?.visibility ||
      (p1 as any)?.overcome !== (p2 as any)?.overcome
    ) {
      return false
    }
  }

  const prevGratitudes = prev.gratitudes || []
  const nextGratitudes = next.gratitudes || []
  if (prevGratitudes.length !== nextGratitudes.length) return false
  for (let i = 0; i < prevGratitudes.length; i++) {
    const g1 = prevGratitudes[i]
    const g2 = nextGratitudes[i]
    const t1 = typeof g1 === 'string' ? g1 : g1?.text
    const t2 = typeof g2 === 'string' ? g2 : g2?.text
    const r1 = typeof g1 === 'object' ? g1?.rating : undefined
    const r2 = typeof g2 === 'object' ? g2?.rating : undefined
    const v1 = typeof g1 === 'object' ? g1?.visibility : undefined
    const v2 = typeof g2 === 'object' ? g2?.visibility : undefined
    if (t1 !== t2 || r1 !== r2 || v1 !== v2) return false
  }

  return true
}
