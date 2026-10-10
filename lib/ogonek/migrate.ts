import { evaluatePrideItemHeuristic } from './evaluate-heuristic.ts'
import type { Day, PrideEntry } from './types.ts'

export interface GordzaRawItem {
  id: string
  type: 'pride' | 'gratitude'
  seq: number
  createdAtISO?: string
  dateISO?: string
  entries?: Array<{ text?: string; rating?: number | string | null }>
  tags?: string[]
  images?: Array<{ id?: string; dataURL?: string }>
}

export interface GordzaSettings {
  prideOffset?: number
  gratOffset?: number
  green?: number
  yellow?: number
}

export interface MigrationOptions {
  prideOffset?: number
  gratOffset?: number
}

const TAG_MAP: Record<string, string> = {
  work: 'Бизнес',
  school: 'Учёба',
  life: 'Личное',
  sport: 'Спорт',
  health: 'Здоровье',
  creative: 'Творчество',
}

export function migrateGordzaItems(
  items: GordzaRawItem[],
  options: MigrationOptions = {}
): { days: Day[]; stats: { totalPrides: number; totalGratitudes: number; totalDays: number } } {
  const prideOffset = options.prideOffset ?? 289
  const gratOffset = options.gratOffset ?? 244

  const pridesByDate = new Map<string, GordzaRawItem>()
  const gratsByDate = new Map<string, GordzaRawItem>()

  let totalPrides = 0
  let totalGratitudes = 0

  for (const item of items) {
    const dateKey = item.dateISO || (item.createdAtISO ? item.createdAtISO.slice(0, 10) : null)
    if (!dateKey) continue

    if (item.type === 'pride') {
      pridesByDate.set(dateKey, item)
      totalPrides += item.entries?.length ?? 0
    } else if (item.type === 'gratitude') {
      gratsByDate.set(dateKey, item)
      totalGratitudes += item.entries?.length ?? 0
    }
  }

  // Get all unique date keys sorted chronologically
  const allDates = Array.from(new Set([...pridesByDate.keys(), ...gratsByDate.keys()])).sort()

  const days: Day[] = []

  for (const dateKey of allDates) {
    const prideItem = pridesByDate.get(dateKey)
    const gratItem = gratsByDate.get(dateKey)

    // Calculate display day number: seq + offset
    let dayId: number
    if (prideItem && Number.isInteger(prideItem.seq)) {
      dayId = prideItem.seq + prideOffset
    } else if (gratItem && Number.isInteger(gratItem.seq)) {
      dayId = gratItem.seq + gratOffset
    } else {
      dayId = days.length + 1
    }

    // Convert pride entries
    const prideEntries: PrideEntry[] = (prideItem?.entries || []).map((e, idx) => {
      const text = (e.text || '').trim()
      const rawRating = parseFloat(String(e.rating ?? ''))
      const scale = isNaN(rawRating) ? 7 : Math.min(10, Math.max(1, Math.round(rawRating)))

      const heuristic = evaluatePrideItemHeuristic(text)
      const overcome = heuristic.overcome

      return {
        num: String(idx + 1).padStart(2, '0'),
        text,
        scale,
        overcome,
      }
    })

    // Convert gratitudes
    const gratitudes: string[] = (gratItem?.entries || [])
      .map((e) => (e.text || '').trim())
      .filter((t) => t.length > 0)

    // Map tags
    const rawTags = [...(prideItem?.tags || []), ...(gratItem?.tags || [])]
    const mappedTags = Array.from(
      new Set(
        rawTags
          .map((t) => TAG_MAP[t] || t)
          .filter((t) => typeof t === 'string' && t.length > 0)
      )
    )
    if (mappedTags.length === 0) {
      mappedTags.push('Для тебя')
    }

    // Extract photos
    const photos: string[] = []
    if (prideItem?.images) {
      for (const img of prideItem.images) {
        if (img.dataURL) photos.push(img.dataURL)
      }
    }
    if (gratItem?.images) {
      for (const img of gratItem.images) {
        if (img.dataURL) photos.push(img.dataURL)
      }
    }

    days.push({
      id: dayId,
      title: prideEntries[0]?.text || `Запись за ${dateKey}`,
      tags: mappedTags,
      prides: prideEntries,
      gratitudes,
      photos: photos.length > 0 ? photos : undefined,
      dateISO: `${dateKey}T12:00:00.000Z`,
      status: 'normal',
    })
  }

  // Sort days descending by ID (newest first)
  days.sort((a, b) => b.id - a.id)

  return {
    days,
    stats: {
      totalPrides,
      totalGratitudes,
      totalDays: days.length,
    },
  }
}
