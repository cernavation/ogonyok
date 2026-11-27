import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  assembleHydratedCloudDays,
  CLOUD_DIARY_PAGE_SIZE,
  fetchAllUserTableRows,
} from '../lib/ogonek/cloud-diary-loader.ts'

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8')
}

/**
 * Мок PostgREST-клиента, который жёстко эмулирует серверный лимит в 1 000 строк
 * на каждый запрос и сортировку (например `position ASC`, из-за чего без пагинации
 * у всех 752 дней возвращалась бы только 1-я запись с position = 0).
 */
function createPostgrest1000CapMock(tables: {
  days: any[]
  prides: any[]
  gratitudes: any[]
}) {
  const queryCalls: Array<{ table: string; from: number; to: number; orders: string[] }> = []

  return {
    queryCalls,
    from(table: 'days' | 'prides' | 'gratitudes') {
      const filters: Array<{ col: string; val: any }> = []
      const orderSpecs: Array<{ col: string; ascending: boolean }> = []

      const builder: any = {
        select() {
          return builder
        },
        eq(col: string, val: any) {
          filters.push({ col, val })
          return builder
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderSpecs.push({ col, ascending: opts?.ascending !== false })
          return builder
        },
        async range(from: number, to: number) {
          queryCalls.push({
            table,
            from,
            to,
            orders: orderSpecs.map((o) => `${o.col}:${o.ascending ? 'asc' : 'desc'}`),
          })

          let list = [...(tables[table] || [])]
          for (const f of filters) {
            list = list.filter((item) => item[f.col] === f.val)
          }

          if (orderSpecs.length > 0) {
            list.sort((a, b) => {
              for (const spec of orderSpecs) {
                const va = a[spec.col]
                const vb = b[spec.col]
                if (va === vb) continue
                const cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'en', { numeric: true })
                if (cmp !== 0) return spec.ascending ? cmp : -cmp
              }
              return 0
            })
          }

          // Жёсткое обрезание PostgREST: не более 1 000 строк за один ответ
          const hardCappedTo = Math.min(to, from + 999)
          return {
            data: list.slice(from, hardCappedTo + 1),
            error: null,
          }
        },
      }
      return builder
    },
  }
}

describe('Хотфикс загрузки >1000 строк дневника (PostgREST pagination) и удаление ложного баннера миграции', () => {
  it('1. fetchAllUserTableRows + assembleHydratedCloudDays выгружает ВСЕ 752 дня и ВСЕ 3 760 гордостей / 3 760 благодарностей без обрезания по 1000 строкам', async () => {
    const uid = '94e9eaf7-ec74-4366-9ce3-7de1e670f52b'
    const dayRows: any[] = []
    const prideRows: any[] = []
    const gratitudeRows: any[] = []

    const baseDate = Date.UTC(2024, 10, 1, 12, 0, 0)
    for (let dayNum = 1; dayNum <= 752; dayNum++) {
      const iso = new Date(baseDate + dayNum * 86400_000).toISOString()
      const dayUuid = `day-uuid-${String(dayNum).padStart(4, '0')}`
      dayRows.push({
        id: dayUuid,
        user_id: uid,
        client_id: String(dayNum),
        day_number: dayNum,
        title: `День #${dayNum}`,
        date_iso: iso,
        visibility: dayNum % 3 === 0 ? 'private' : 'public',
      })

      for (let pos = 0; pos < 5; pos++) {
        prideRows.push({
          id: `p-${String(dayNum).padStart(4, '0')}-${pos}`,
          user_id: uid,
          // Проверяем оба варианта связки: на части дней по day_client_id, на части по day_id
          day_id: pos >= 3 ? dayUuid : null,
          day_client_id: pos < 4 ? String(dayNum) : null,
          client_id: `${dayNum}_p_${pos + 1}`,
          position: pos,
          num: String(pos + 1).padStart(2, '0'),
          text: `Гордость ${pos + 1} дня ${dayNum}`,
          scale: 9,
          overcome: 1,
          visibility: pos === 4 ? 'private' : 'public',
        })
        gratitudeRows.push({
          id: `g-${String(dayNum).padStart(4, '0')}-${pos}`,
          user_id: uid,
          day_id: pos >= 3 ? dayUuid : null,
          day_client_id: pos < 4 ? String(dayNum) : null,
          client_id: `${dayNum}_g_${pos + 1}`,
          position: pos,
          num: String(pos + 1).padStart(2, '0'),
          text: `Благодарность ${pos + 1} дня ${dayNum}`,
          rating: 10,
          visibility: pos === 4 ? 'private' : 'public',
        })
      }
    }

    assert.equal(CLOUD_DIARY_PAGE_SIZE, 1000)
    assert.equal(prideRows.length, 3760)
    assert.equal(gratitudeRows.length, 3760)

    const mockSupabase = createPostgrest1000CapMock({
      days: dayRows,
      prides: prideRows,
      gratitudes: gratitudeRows,
    })

    const [loadedDays, loadedPrides, loadedGrats] = await Promise.all([
      fetchAllUserTableRows<any>(mockSupabase, 'days', uid, 'date_iso', false),
      fetchAllUserTableRows<any>(mockSupabase, 'prides', uid, 'position', true),
      fetchAllUserTableRows<any>(mockSupabase, 'gratitudes', uid, 'position', true),
    ])

    assert.equal(loadedDays.error, undefined)
    assert.equal(loadedPrides.error, undefined)
    assert.equal(loadedGrats.error, undefined)

    // Должны выгрузиться все 752 дня и все 3 760 + 3 760 строк (по 4 страницы запросов)
    assert.equal(loadedDays.rows.length, 752)
    assert.equal(loadedPrides.rows.length, 3760)
    assert.equal(loadedGrats.rows.length, 3760)
    assert.equal(
      mockSupabase.queryCalls.filter((c) => c.table === 'prides').length,
      4,
      'Должно быть 4 постраничных запроса для 3 760 гордостей'
    )
    assert.equal(
      mockSupabase.queryCalls.filter((c) => c.table === 'gratitudes').length,
      4,
      'Должно быть 4 постраничных запроса для 3 760 благодарностей'
    )

    // У каждого запроса не-id есть детерминированный tiebreaker `id`
    const firstPridesCall = mockSupabase.queryCalls.find((c) => c.table === 'prides')
    assert.deepEqual(firstPridesCall?.orders, ['position:asc', 'id:asc'])

    const hydrated = assembleHydratedCloudDays(loadedDays.rows, loadedPrides.rows, loadedGrats.rows)
    assert.equal(hydrated.length, 752)

    // Проверяем КАЖДЫЙ день с #1 по #752 (и особо свежие #752, #751, #750, #749, #748, #742)
    for (const day of hydrated) {
      assert.equal(day.prides.length, 5, `День #${day.day_number} должен иметь ровно 5 гордостей`)
      assert.equal(day.gratitudes.length, 5, `День #${day.day_number} должен иметь ровно 5 благодарностей`)
      assert.deepEqual(
        day.prides.map((p: any) => p.position),
        [0, 1, 2, 3, 4]
      )
      assert.deepEqual(
        day.gratitudes.map((g: any) => g.position),
        [0, 1, 2, 3, 4]
      )
    }

    const day752 = hydrated.find((d) => d.day_number === 752)
    assert.equal(day752.prides[4].text, 'Гордость 5 дня 752')
    assert.equal(day752.gratitudes[4].text, 'Благодарность 5 дня 752')
  })

  it('2. use-ogonek-store.ts и profile-view.tsx используют постраничный fetchAllUserTableRows вместо одиночного .select()', () => {
    const storeSrc = readRepoFile('lib/ogonek/use-ogonek-store.ts')
    assert.ok(storeSrc.includes('fetchAllUserTableRows'))
    assert.ok(storeSrc.includes('assembleHydratedCloudDays'))
    assert.ok(storeSrc.includes("fetchAllUserTableRows<any>(supabase, 'prides', uid, 'position', true)"))
    assert.ok(storeSrc.includes("fetchAllUserTableRows<any>(supabase, 'gratitudes', uid, 'position', true)"))

    const profileSrc = readRepoFile('components/ogonek/views/profile-view.tsx')
    assert.ok(profileSrc.includes('fetchAllUserTableRows'))
    assert.ok(profileSrc.includes('collectDayChildEntries'))
  })

  it('3. Устаревший баннер «Перенесите старый дневник» полностью удалён с Главной и скрыт для облачных записей', () => {
    const homeSrc = readRepoFile('components/ogonek/views/home-view.tsx')
    assert.ok(!homeSrc.includes('LegacyMigrationBanner'), 'На Главной больше не должно быть LegacyMigrationBanner')

    const bannerSrc = readRepoFile('components/ogonek/settings/legacy-migration-banner.tsx')
    assert.ok(bannerSrc.includes('hasCloudSyncedDays'), 'Баннер обязан скрываться при наличии дней из Supabase')
    assert.ok(bannerSrc.includes('if (!userId || dismissed || done || hasCloudSyncedDays'))
  })

  it('4. DayCard для владельца никогда не скрывает собственные private-гордости и благодарности', () => {
    const cardSrc = readRepoFile('components/ogonek/day-card.tsx')
    assert.ok(cardSrc.includes('if (isOwner) return raw'), 'visiblePrides возвращает все гордости для владельца')
    assert.ok(
      cardSrc.includes("if (!isOwner && typeof g === 'object' && g.visibility === 'private') return false"),
      'private благодарности отфильтровываются только не-владельцам'
    )
  })
})
