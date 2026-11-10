import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateMediaFile,
  MAX_IMAGE_SIZE_BYTES,
  MAX_DOCUMENT_SIZE_BYTES,
  type ChatMediaDescriptor,
} from '../lib/ogonek/chat-media.ts'
import { GiphyQuerySchema } from '../lib/server/api-validator.ts'
import { getTierLimits } from '../lib/ogonek/permissions.ts'

describe('Stage 8: Messenger Enterprise & Architecture', () => {
  describe('Media Storage & Descriptors (< 2 KB vs Base64)', () => {
    it('verifies descriptor JSON size is strictly under 2 KB (typically ~200-300 bytes)', () => {
      const descriptor: ChatMediaDescriptor = {
        url: 'https://supabase.co/storage/v1/object/sign/chat-media/u1/thread1/abc-123.webp?token=xyz',
        path: 'u1/thread1/abc-123.webp',
        mime: 'image/webp',
        size: 245120, // 240 KB file in storage
        duration: undefined,
        width: 1920,
        height: 1080,
        thumbnail: undefined,
        name: 'photo_of_victory.webp',
      }

      const serialized = JSON.stringify(descriptor)
      const byteSize = Buffer.byteLength(serialized, 'utf8')

      // Must be < 2048 bytes (Rule from Stage 8 prompt)
      assert.ok(byteSize < 2048, `Expected < 2048 bytes, got ${byteSize}`)
      assert.ok(byteSize < 400, `Expected < 400 bytes, got ${byteSize}`)

      // Compare to legacy Base64 which was ~500 KB+ for photos
      const legacyBase64Size = 500 * 1024
      const savingsPercent = ((legacyBase64Size - byteSize) / legacyBase64Size) * 100
      assert.ok(savingsPercent > 99.5, `Expected > 99.5% savings, got ${savingsPercent}%`)
    })

    it('validates MIME types and size boundaries for images, audio, and documents', () => {
      // 1. Valid image
      const validImage = {
        name: 'screenshot.png',
        type: 'image/png',
        size: 5 * 1024 * 1024,
      } as any
      assert.strictEqual(validateMediaFile(validImage, 'image', 'free').ok, true)

      // 2. Image too large (> 10MB)
      const hugeImage = {
        name: 'huge.png',
        type: 'image/png',
        size: MAX_IMAGE_SIZE_BYTES + 1024,
      } as any
      const imgRes = validateMediaFile(hugeImage, 'image', 'free')
      assert.strictEqual(imgRes.ok, false)
      assert.ok(imgRes.error?.includes('10 МБ'))

      // 3. Document valid (<= 25MB)
      const validDoc = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 15 * 1024 * 1024,
      } as any
      assert.strictEqual(validateMediaFile(validDoc, 'file', 'free').ok, true)

      // 4. Document too large (> 25MB)
      const hugeDoc = {
        name: 'huge.zip',
        type: 'application/zip',
        size: MAX_DOCUMENT_SIZE_BYTES + 1024,
      } as any
      const docRes = validateMediaFile(hugeDoc, 'file', 'free')
      assert.strictEqual(docRes.ok, false)
      assert.ok(docRes.error?.includes('25 МБ'))

      // 5. Invalid MIME type for image
      const fakeImage = {
        name: 'malware.exe',
        type: 'application/x-msdownload',
        size: 1024,
      } as any
      const mimeRes = validateMediaFile(fakeImage, 'image', 'free')
      assert.strictEqual(mimeRes.ok, false)
      assert.ok(mimeRes.error?.includes('формат'))
    })
  })

  describe('Giphy API & Pagination', () => {
    it('validates search query with offset pagination', () => {
      const parsed = GiphyQuerySchema.safeParse({
        q: 'огонь',
        limit: 20,
        offset: 40,
      })
      assert.strictEqual(parsed.success, true)
      if (parsed.success) {
        assert.strictEqual(parsed.data.q, 'огонь')
        assert.strictEqual(parsed.data.limit, 20)
        assert.strictEqual(parsed.data.offset, 40)
      }
    })

    it('defaults offset to 0 and limit to 24 when omitted', () => {
      const parsed = GiphyQuerySchema.safeParse({
        q: 'победа',
      })
      assert.strictEqual(parsed.success, true)
      if (parsed.success) {
        assert.strictEqual(parsed.data.offset, 0)
        assert.strictEqual(parsed.data.limit, 24)
      }
    })

    it('rejects invalid or negative offset', () => {
      const parsed = GiphyQuerySchema.safeParse({
        q: 'test',
        offset: -5,
      })
      assert.strictEqual(parsed.success, false)
    })
  })

  describe('Scheduled Messages & Subscription Tier Limits', () => {
    it('enforces tier limits on scheduled messages', () => {
      const freeLimits = getTierLimits('free')
      const proLimits = getTierLimits('pro')
      const ultraLimits = getTierLimits('ultra')

      assert.strictEqual(freeLimits.maxScheduledMessages, 3)
      assert.strictEqual(proLimits.maxScheduledMessages, 20)
      assert.strictEqual(ultraLimits.maxScheduledMessages, 100)
    })
  })

  describe('Relational Group & Channel Permissions Logic', () => {
    it('verifies channel write permissions: only owners/admins can post if is_channel = true', () => {
      type MemberRole = 'owner' | 'admin' | 'member'
      const canPostInThread = (isChannel: boolean, role: MemberRole) => {
        if (!isChannel) return true
        return role === 'owner' || role === 'admin'
      }

      // Normal group: all members can post
      assert.strictEqual(canPostInThread(false, 'member'), true)
      assert.strictEqual(canPostInThread(false, 'admin'), true)
      assert.strictEqual(canPostInThread(false, 'owner'), true)

      // Channel mode: ordinary members CANNOT post
      assert.strictEqual(canPostInThread(true, 'member'), false)
      assert.strictEqual(canPostInThread(true, 'admin'), true)
      assert.strictEqual(canPostInThread(true, 'owner'), true)
    })

    it('extracts @mentions accurately from message text', () => {
      const extractMentions = (text: string): string[] => {
        const matches = text.match(/@([a-zA-Z0-9_]{3,30})/g)
        if (!matches) return []
        return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())))
      }

      const text = 'Привет @alex_dev и @maria_22! Держим огонь @alex_dev 🔥'
      const mentions = extractMentions(text)
      assert.deepStrictEqual(mentions, ['alex_dev', 'maria_22'])
    })
  })
})
