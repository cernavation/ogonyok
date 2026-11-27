/**
 * Пагинационная загрузка и сборка записей дневника (days + prides + gratitudes) из Supabase.
 *
 * Решает жёсткий лимит PostgREST (по умолчанию max_rows = 1000 на один HTTP-запрос):
 * у пользователя с 752 днями в `prides` и `gratitudes` хранится ~3 760+ строк.
 * Без цикла `.range(from, from + 999)` при сортировке `position ASC` обрезается всё после
 * первых 1000 строк (для свежих дней остаётся только 1 гордость и 1 благодарность).
 */

export const CLOUD_DIARY_PAGE_SIZE = 1000

export type IndexedChildEntries = {
  byClientId: Map<string, any[]>
  byDayId: Map<string, any[]>
}

/**
 * Постранично выгружает ВСЕ строки таблицы `days` / `prides` / `gratitudes` пользователя
 * с детерминированным tiebreaker `.order('id', ...)` и дедупликацией по `id`, чтобы ни одна
 * запись не потерялась на границах 1000-строчных страниц.
 */
export async function fetchAllUserTableRows<T extends Record<string, any>>(
  supabase: any,
  table: 'days' | 'prides' | 'gratitudes',
  userId: string,
  orderCol: string,
  ascending: boolean,
  pageSize: number = CLOUD_DIARY_PAGE_SIZE
): Promise<{ rows: T[]; error?: string }> {
  if (!supabase || !userId) {
    return { rows: [], error: 'Missing supabase client or userId' }
  }

  const allRows: T[] = []
  const seenIds = new Set<string>()
  let from = 0

  while (true) {
    let query = supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order(orderCol, { ascending })

    if (orderCol !== 'id' && typeof query?.order === 'function') {
      query = query.order('id', { ascending })
    }

    const { data, error } = await query.range(from, from + pageSize - 1)
    if (error) {
      return { rows: allRows, error: error.message }
    }
    if (!Array.isArray(data) || data.length === 0) {
      break
    }

    for (const row of data) {
      const idKey = row?.id != null ? String(row.id) : null
      if (idKey) {
        if (seenIds.has(idKey)) continue
        seenIds.add(idKey)
      }
      allRows.push(row as T)
    }

    if (data.length < pageSize) {
      break
    }
    from += pageSize
  }

  return { rows: allRows }
}

/**
 * Индексирует строки prides или gratitudes одновременно по `day_client_id` и по `day_id`.
 */
export function indexDayChildEntries(rows: any[]): IndexedChildEntries {
  const byClientId = new Map<string, any[]>()
  const byDayId = new Map<string, any[]>()

  for (const row of rows || []) {
    if (!row || typeof row !== 'object') continue
    if (row.day_client_id != null && String(row.day_client_id).trim() !== '') {
      const k = String(row.day_client_id).trim()
      const list = byClientId.get(k) ?? []
      list.push(row)
      byClientId.set(k, list)
    }
    if (row.day_id != null && String(row.day_id).trim() !== '') {
      const k = String(row.day_id).trim()
      const list = byDayId.get(k) ?? []
      list.push(row)
      byDayId.set(k, list)
    }
  }

  return { byClientId, byDayId }
}

/**
 * Объединяет и дедуплицирует все дочерние записи (prides / gratitudes) конкретного дня
 * по всем возможным ключам связи (`row.client_id`, `row.day_number` -> `day_client_id`,
 * и `row.id` -> `day_id`), затем сортирует по `position ASC` (и `num` как запасной ключ).
 */
export function collectDayChildEntries(
  dayRow: Record<string, any>,
  indexed: IndexedChildEntries
): any[] {
  const candidates: any[] = []
  const seenClientKeys = new Set<string>()

  const pushClientKey = (rawKey: unknown) => {
    if (rawKey == null) return
    const key = String(rawKey).trim()
    if (!key || seenClientKeys.has(key)) return
    seenClientKeys.add(key)
    const found = indexed.byClientId.get(key)
    if (found && found.length > 0) candidates.push(...found)
  }

  pushClientKey(dayRow?.client_id)
  pushClientKey(dayRow?.day_number)

  if (dayRow?.id != null) {
    const idKey = String(dayRow.id).trim()
    if (idKey) {
      const byId = indexed.byDayId.get(idKey)
      if (byId && byId.length > 0) candidates.push(...byId)
    }
  }

  const deduped: any[] = []
  const seenItemKeys = new Set<string>()
  for (const item of candidates) {
    const itemKey =
      item?.id != null
        ? `id:${String(item.id)}`
        : item?.client_id
        ? `cid:${String(item.client_id)}`
        : `pos:${String(item?.position ?? '')}:num:${String(item?.num ?? '')}:txt:${String(item?.text ?? '')}`
    if (seenItemKeys.has(itemKey)) continue
    seenItemKeys.add(itemKey)
    deduped.push(item)
  }

  return deduped.sort((a, b) => {
    const posA = typeof a?.position === 'number' && !Number.isNaN(a.position) ? a.position : Number.MAX_SAFE_INTEGER
    const posB = typeof b?.position === 'number' && !Number.isNaN(b.position) ? b.position : Number.MAX_SAFE_INTEGER
    if (posA !== posB) return posA - posB
    return String(a?.num ?? '').localeCompare(String(b?.num ?? ''), 'en', { numeric: true })
  })
}

/**
 * Склеивает массивы `days`, `prides` и `gratitudes` в полностью гидрированные строки дней
 * без потери элементов при любых связях (`day_id` и `day_client_id`).
 */
export function assembleHydratedCloudDays(
  dayRows: any[],
  prideRows: any[],
  gratitudeRows: any[]
): any[] {
  const indexedPrides = indexDayChildEntries(prideRows)
  const indexedGratitudes = indexDayChildEntries(gratitudeRows)

  return (dayRows || []).map((row: any) => ({
    ...row,
    prides: collectDayChildEntries(row, indexedPrides),
    gratitudes: collectDayChildEntries(row, indexedGratitudes),
  }))
}
