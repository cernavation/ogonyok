import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  EvaluateDaySchema,
  TranslateSchema,
  TranscribeSchema,
  GiphyQuerySchema,
  StreakSyncSchema,
  TelegramLinkSchema,
  RegulateAchievementSchema,
  apiErrorResponse,
} from '../lib/server/api-validator.ts'

describe('Zod Валидация API-маршрутов (Этап 3)', () => {
  it('EvaluateDaySchema: принимает валидный массив гордостей до 10 элементов', () => {
    const valid = EvaluateDaySchema.safeParse({
      prides: ['Победа 1', 'Победа 2'],
      dayId: '42',
    })
    assert.equal(valid.success, true)
  })

  it('EvaluateDaySchema: отклоняет массив более 10 элементов и строки более 5000 символов', () => {
    const tooMany = EvaluateDaySchema.safeParse({
      prides: Array.from({ length: 11 }, (_, i) => `Элемент ${i}`),
    })
    assert.equal(tooMany.success, false)

    const tooLong = EvaluateDaySchema.safeParse({
      prides: ['a'.repeat(5001)],
    })
    assert.equal(tooLong.success, false)
  })

  it('TranslateSchema: требует непустой текст и ограничивает 5000 символов', () => {
    assert.equal(TranslateSchema.safeParse({ text: 'Привет' }).success, true)
    assert.equal(TranslateSchema.safeParse({ text: '' }).success, false)
    assert.equal(TranslateSchema.safeParse({ text: 'x'.repeat(5001) }).success, false)
  })

  it('TranscribeSchema: требует audioBase64 или mockText', () => {
    assert.equal(TranscribeSchema.safeParse({ audioBase64: 'data:audio/webm;base64,123' }).success, true)
    assert.equal(TranscribeSchema.safeParse({ mockText: 'Голосовое' }).success, true)
    assert.equal(TranscribeSchema.safeParse({}).success, false)
  })

  it('GiphyQuerySchema: ограничивает limit от 1 до 50 и длину q', () => {
    const parsed = GiphyQuerySchema.safeParse({ q: 'cats', limit: '10' })
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.limit, 10)
    }

    assert.equal(GiphyQuerySchema.safeParse({ limit: 100 }).success, false)
    assert.equal(GiphyQuerySchema.safeParse({ q: 'a'.repeat(201) }).success, false)
  })

  it('StreakSyncSchema: принимает массив дат и отклоняет свыше 1000 элементов', () => {
    assert.equal(StreakSyncSchema.safeParse({ days: ['2026-11-09', '2026-11-10'] }).success, true)
    assert.equal(
      StreakSyncSchema.safeParse({ days: Array.from({ length: 1001 }, () => '2026-11-09') }).success,
      false
    )
  })

  it('TelegramLinkSchema: требует непустой userId', () => {
    assert.equal(TelegramLinkSchema.safeParse({ userId: 'user-123' }).success, true)
    assert.equal(TelegramLinkSchema.safeParse({ userId: '' }).success, false)
  })

  it('RegulateAchievementSchema: требует categoryId и topic', () => {
    assert.equal(
      RegulateAchievementSchema.safeParse({ categoryId: 'sport-record', topic: 'Марафон босиком' }).success,
      true
    )
    assert.equal(RegulateAchievementSchema.safeParse({ categoryId: '' }).success, false)
  })

  it('apiErrorResponse: возвращает корректную структуру ошибки', async () => {
    const res = apiErrorResponse('VALIDATION_ERROR', 'Неверный параметр', 422, [{ field: 'name' }])
    assert.equal(res.status, 422)
    const json = await res.json()
    assert.equal(json.error.code, 'VALIDATION_ERROR')
    assert.equal(json.error.message, 'Неверный параметр')
    assert.deepEqual(json.error.details, [{ field: 'name' }])
  })
})
