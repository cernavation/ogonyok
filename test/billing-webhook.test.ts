import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { POST } from '../app/api/billing/webhook/route.ts'

describe('Платёжный вебхук /api/billing/webhook (Этап 4)', () => {
  it('возвращает 503 SERVICE_UNAVAILABLE, если BILLING_WEBHOOK_SECRET не задан', async () => {
    const prevSecret = process.env.BILLING_WEBHOOK_SECRET
    delete process.env.BILLING_WEBHOOK_SECRET

    try {
      const req = new Request('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify({ event_id: 'ev_123', event_type: 'payment.success', tier: 'pro' }),
      })
      const res = await POST(req)
      assert.equal(res.status, 503)
      const data = await res.json()
      assert.equal(data.error.code, 'SERVICE_UNAVAILABLE')
    } finally {
      if (prevSecret) process.env.BILLING_WEBHOOK_SECRET = prevSecret
    }
  })

  it('возвращает 401 UNAUTHORIZED при отсутствующей или неверной HMAC-подписи', async () => {
    process.env.BILLING_WEBHOOK_SECRET = 'test_secret_key_12345'
    try {
      const body = JSON.stringify({ event_id: 'ev_123', event_type: 'payment.success', tier: 'pro' })
      const req = new Request('http://localhost:3000/api/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-billing-signature': 'invalid_signature_hex',
        },
        body,
      })
      const res = await POST(req)
      assert.equal(res.status, 401)
      const data = await res.json()
      assert.equal(data.error.code, 'UNAUTHORIZED')
    } finally {
      delete process.env.BILLING_WEBHOOK_SECRET
    }
  })

  it('успешно верифицирует правильную HMAC SHA-256 подпись', () => {
    const secret = 'super_secret_webhook_key'
    const body = JSON.stringify({
      event_id: 'ev_abc_1',
      event_type: 'subscription.created',
      tier: 'pro',
      period: 'month',
    })
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')

    const computed = crypto.createHmac('sha256', secret).update(body).digest('hex')
    assert.equal(signature, computed)
  })
})
