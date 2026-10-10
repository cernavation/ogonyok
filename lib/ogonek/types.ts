export type ViewId = 'home' | 'explore' | 'vault' | 'analytics' | 'settings'

export type Mode = 'pride' | 'gratitude'

export type OvercomeLevel = 0 | 1 | 2 | 3

export type PrideEntry = {
  num: string
  text: string
  scale: number // 1..10
  overcome: OvercomeLevel // 0..3
}

export type DayStatus = 'normal' | 'missed'

export type Day = {
  id: number
  title: string
  tags: string[]
  prides: PrideEntry[]
  gratitudes: string[]
  photos?: string[]
  dateISO?: string
  status?: DayStatus
}

export type EvidenceItem = {
  id: string
  date: string
  title: string
  description: string
  category?: string
  pinned?: boolean
}

export type ComposerPayload = {
  prides: string[]
  gratitudes: string[]
  photo: string | null
}

export type ComposerDraft = {
  prides: string[]
  gratitudes: string[]
  photo: string | null
  tab: Mode
  extra: boolean
  lastSavedISO: string
}

export type OgonekStoreState = {
  schemaVersion: number
  days: Day[]
  morningIntentions: Record<string, [string, string, string]>
  composerDraft: ComposerDraft | null
  evidenceItems: EvidenceItem[]
  evidenceFavorites: string[]
  soundEnabled: boolean
  pinEnabled: boolean
  isDemo: boolean
}
