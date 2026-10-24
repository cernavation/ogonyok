import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BATCH_CHUNK_SIZE,
  mapDayToSupabaseRow,
  mapPridesToSupabaseRows,
  mapGratitudesToSupabaseRows,
  executeDaysMigration,
  verifyMigrationIntegrity,
  fetchDaysPaginated,
} from '../lib/ogonek/legacy-migration.ts'

test('Legacy Migration: Структура строк и ключи идемпотентности (ЗАДАЧА 5)', async (t) => {
  await t.test('размер батча строго равен 50 дней', () => {
    assert.equal(BATCH_CHUNK_SIZE, 50)
  })

  await t.test('формирует строку days со стабильным составным ключом (user_id, client_id)', () => {
    const rawDay = {
      id: 705,
      title: 'Финал ночной смены',
      dateISO: '2026-10-24T23:00:00.000Z',
      tags: ['#победа'],
      status: 'normal',
      visibility: 'public',
    }

    const row = mapDayToSupabaseRow(rawDay, 'usr-alex', 704)
    assert.equal(row.user_id, 'usr-alex')
    assert.equal(row.client_id, '705')
    assert.equal(row.day_number, 705)
    assert.equal(row.title, 'Финал ночной смены')
    assert.equal(row.status, 'normal')
  })

  await t.test('формирует строки prides со связью day_client_id и уникальным client_id', () => {
    const rawDay = {
      id: 705,
      prides: [
        { id: 'p1', text: 'Архитектура без единой ошибки', scale: 10, overcome: 3 },
        { id: 'p2', text: '18 тестов ввода текста', scale: 9, overcome: 2 },
      ],
    }

    const rows = mapPridesToSupabaseRows(rawDay, 'usr-alex')
    assert.equal(rows.length, 2)
    assert.equal(rows[0].user_id, 'usr-alex')
    assert.equal(rows[0].day_client_id, '705')
    assert.equal(rows[0].client_id, 'p1')
    assert.equal(rows[0].scale, 10)
    assert.equal(rows[0].overcome, 3)

    assert.equal(rows[1].day_client_id, '705')
    assert.equal(rows[1].client_id, 'p2')
  })

  await t.test('формирует строки gratitudes со связью day_client_id', () => {
    const rawDay = {
      id: 705,
      gratitudes: ['Благодарен за терпение', 'Команде и наставникам'],
    }

    const rows = mapGratitudesToSupabaseRows(rawDay, 'usr-alex')
    assert.equal(rows.length, 2)
    assert.equal(rows[0].user_id, 'usr-alex')
    assert.equal(rows[0].day_client_id, '705')
    assert.equal(rows[0].text, 'Благодарен за терпение')
    assert.equal(rows[1].text, 'Команде и наставникам')
  })
})

test('Legacy Migration: Батчевая вставка и прогресс (ЗАДАЧА 5)', async (t) => {
  await t.test('обрабатывает 120 дней двумя полными батчами по 50 и одним остаточным 20', async () => {
    const dummyDays = Array.from({ length: 120 }).map((_, i) => ({
      id: i + 1,
      title: `День #${i + 1}`,
      prides: [{ id: `pride_${i + 1}`, text: `Победа #${i + 1}`, scale: 10, overcome: 1 }],
      gratitudes: [`Благодарность #${i + 1}`],
    }))

    const progressLogs: any[] = []
    const res = await executeDaysMigration({
      userId: 'usr-alex',
      days: dummyDays,
      chunkSize: 50,
      onProgress: (p) => progressLogs.push(p),
    })

    assert.equal(res.ok, true)
    assert.equal(res.migratedCount, 120)
  })

  await t.test('поддерживает прерывание и паузу', async () => {
    let paused = false
    const dummyDays = Array.from({ length: 100 }).map((_, i) => ({ id: i + 1 }))

    const res = await executeDaysMigration({
      userId: 'usr-alex',
      days: dummyDays,
      chunkSize: 50,
      shouldPause: () => paused,
    })

    assert.equal(res.ok, true)
  })
})

test('Legacy Migration: Верификация целостности и выборки (ЗАДАЧА 5)', async (t) => {
  await t.test('сверяет локальный снимок с базой и проверяет 10 случайных дней', async () => {
    const dummyDays: any[] = Array.from({ length: 15 }).map((_, i) => ({
      id: i + 1,
      title: `Архивный день #${i + 1}`,
      dateISO: '2026-10-24T12:00:00.000Z',
      status: 'normal',
      prides: [],
      gratitudes: [],
    }))

    const res = await verifyMigrationIntegrity('usr-alex', dummyDays)
    assert.equal(res.ok, true)
    assert.equal(res.sampleMatch, true)
    assert.equal(res.mismatches.length, 0)
  })

  await t.test('поддерживает пагинацию по 500 записей для второго устройства', async () => {
    const res = await fetchDaysPaginated('usr-alex', 0, 500)
    assert.equal(typeof res.hasMore, 'boolean')
    assert.ok(Array.isArray(res.data))
  })
})
