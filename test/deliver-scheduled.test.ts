import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { handleScheduledDelivery } from '../lib/server/cron-delivery.ts'

describe('Крон доставки отложенных сообщений: scheduled_messages -> direct_messages', () => {
  it('доставляет отложенное сообщение из прошлого в direct_messages с thread_key, author_id, recipient_id, sent_at', async () => {
    const scheduledAt = new Date(Date.now() - 1000 * 60 * 10).toISOString() // 10 мин назад
    const authorId = '11111111-1111-1111-1111-111111111111'
    const recipientId = '22222222-2222-2222-2222-222222222222'

    // Мок данных в БД
    const scheduledRow = {
      id: 'sm-test-1',
      thread_key: 'custom-thread',
      author_id: authorId,
      recipient_id: recipientId,
      body: 'Привет из прошлого!',
      attachment: { type: 'quote', text: 'Цитата' },
      scheduled_at: scheduledAt,
      delivered: false,
      delivered_at: null,
    }

    const insertedDirectMessages: any[] = []
    const updatedScheduled: any[] = []

    // Мок-клиент Supabase
    const mockSupabase = {
      from(table: string) {
        if (table === 'scheduled_messages') {
          return {
            select() {
              return {
                lte(_col: string, _val: string) {
                  return {
                    eq(_col2: string, _val2: boolean) {
                      return {
                        limit() {
                          return Promise.resolve({
                            data: [scheduledRow],
                            error: null,
                          })
                        },
                      }
                    },
                  }
                },
              }
            },
            update(fields: any) {
              return {
                eq(_col: string, val: string) {
                  updatedScheduled.push({ id: val, ...fields })
                  return Promise.resolve({ error: null })
                },
              }
            },
          }
        }
        if (table === 'direct_messages') {
          return {
            insert(row: any) {
              insertedDirectMessages.push(row)
              return Promise.resolve({ error: null })
            },
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      },
    }

    const req = new Request('http://localhost:3000/api/cron/deliver-scheduled', {
      method: 'POST',
    })

    const res = await handleScheduledDelivery(req, mockSupabase)
    const data = await res.json()

    assert.strictEqual(data.success, true, 'Ответ должен быть успешным')
    assert.strictEqual(data.delivered, 1, 'Должно быть доставлено ровно 1 сообщение')

    // Проверка строки в direct_messages
    assert.strictEqual(insertedDirectMessages.length, 1, 'В direct_messages должна быть ровно одна запись')
    const dm = insertedDirectMessages[0]
    assert.strictEqual(dm.author_id, authorId)
    assert.strictEqual(dm.recipient_id, recipientId)
    assert.strictEqual(dm.thread_key, 'custom-thread')
    assert.strictEqual(dm.body, 'Привет из прошлого!')
    assert.deepStrictEqual(dm.attachment, { type: 'quote', text: 'Цитата' })
    assert.strictEqual(dm.sent_at, scheduledAt)

    // Проверка отметки в scheduled_messages
    assert.strictEqual(updatedScheduled.length, 1)
    assert.strictEqual(updatedScheduled[0].id, 'sm-test-1')
    assert.strictEqual(updatedScheduled[0].delivered, true)
    assert.ok(updatedScheduled[0].delivered_at, 'delivered_at должен быть заполнен')
  })

  it('автоматически строит thread_key из author_id и recipient_id если он не задан', async () => {
    const authorId = 'user-b'
    const recipientId = 'user-a'
    const scheduledAt = new Date(Date.now() - 5000).toISOString()

    const inserted: any[] = []
    const mockSupabase = {
      from(table: string) {
        if (table === 'scheduled_messages') {
          return {
            select: () => ({
              lte: () => ({
                eq: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: 'sm-test-2',
                          thread_key: '',
                          author_id: authorId,
                          recipient_id: recipientId,
                          body: 'Привет без треда!',
                          scheduled_at: scheduledAt,
                          delivered: false,
                        },
                      ],
                      error: null,
                    }),
                }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }
        }
        if (table === 'direct_messages') {
          return {
            insert: (row: any) => {
              inserted.push(row)
              return Promise.resolve({ error: null })
            },
          }
        }
        return {}
      },
    }

    const req = new Request('http://localhost:3000/api/cron/deliver-scheduled')
    const res = await handleScheduledDelivery(req, mockSupabase)
    const data = await res.json()

    assert.strictEqual(data.success, true)
    assert.strictEqual(data.delivered, 1)
    assert.strictEqual(inserted[0].thread_key, 'user-a:user-b', 'thread_key должен быть отсортированным')
  })
})
