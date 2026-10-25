import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { isAchievementCategoryId } from '@/lib/ogonek/achievement-regulation'
import {
  DEFAULT_MODERATION_FROM,
  DEFAULT_MODERATION_INBOX,
  buildModerationEmailPackage,
  buildModerationWebhookPayload,
} from '@/lib/ogonek/achievement-moderation'
import type {
  ModerationAchievementBrief,
  ModerationApplicant,
  ModerationEmailAttachment,
  ModerationEvidenceItem,
  ModerationSubmissionPayload,
} from '@/lib/ogonek/achievement-moderation'
import type { ModerationChannel, ModerationDelivery } from '@/lib/ogonek/types'

/**
 * ЭТАП 6 — приём пакета доказательств и отправка заявки модератору.
 *
 * Маршрут собирает из пакета заявки:
 *   • готовое email-письмо (тема + text + HTML) — шаблон `buildModerationEmailPackage`;
 *   • JSON webhook-payload для внешних интеграций — `buildModerationWebhookPayload`.
 *
 * Доставка выбирается по окружению:
 *   1. `MODERATION_WEBHOOK_URL` — POST webhook-payload (Slack/Discord/Zapier/n8n);
 *   2. `RESEND_API_KEY`        — отправка письма через Resend API с вложениями;
 *   3. иначе                   — пакет атомарно сохраняется в локальный outbox
 *                                (`.data/moderation-outbox.json`) и получает статус «В очереди».
 */

const OUTBOX_DIR = path.join(process.cwd(), '.data')
const OUTBOX_FILE = path.join(OUTBOX_DIR, 'moderation-outbox.json')

// In-memory rate limiter: 20 requests per minute per client IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (record.count >= 20) return false
  record.count++
  return true
}

/* ── Валидация входящего пакета ─────────────────────────────────────────── */

function asString(value: unknown, max = 400): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function isObj(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function sanitizeIncomingPayload(raw: unknown): ModerationSubmissionPayload | null {
  if (!isObj(raw)) return null

  const ach = isObj(raw.achievement) ? raw.achievement : {}
  const applicant = isObj(raw.applicant) ? raw.applicant : {}

  const title = asString(ach.title, 120)
  const trackingCode = asString(raw.trackingCode, 40)
  const categoryId = ach.categoryId
  if (!title || !trackingCode) return null
  if (!isAchievementCategoryId(categoryId)) return null

  const evidence: ModerationEvidenceItem[] = Array.isArray(raw.evidence)
    ? raw.evidence.filter(isObj).slice(0, 40).map((item, index) => {
        const ref = asString(item.ref, 2000)
        const isLink = /^https?:\/\//i.test(ref)
        return {
          requirementId: asString(item.requirementId, 60) || `req-${index + 1}`,
          requirementTitle: asString(item.requirementTitle, 120) || 'Файл-доказательство',
          required: Boolean(item.required),
          fileName: asString(item.fileName, 160) || 'evidence',
          mime: asString(item.mime, 100) || 'application/octet-stream',
          size: typeof item.size === 'number' && Number.isFinite(item.size) ? Math.max(0, Math.round(item.size)) : 0,
          ref: isLink ? ref : null,
          kind: isLink ? 'link' : 'file',
        }
      })
    : []

  const attachments: ModerationEmailAttachment[] = Array.isArray(raw.attachments)
    ? raw.attachments
        .filter(isObj)
        .slice(0, 10)
        .map((item) => {
          const dataUrl = asString(item.dataUrl, 12_000_000)
          const attachment: ModerationEmailAttachment = {
            fileName: asString(item.fileName, 160) || 'attachment',
            mime: asString(item.mime, 100) || 'application/octet-stream',
            size: typeof item.size === 'number' && Number.isFinite(item.size) ? Math.max(0, Math.round(item.size)) : 0,
          }
          if (dataUrl.startsWith('data:')) attachment.dataUrl = dataUrl
          return attachment
        })
    : []

  const achievement: ModerationAchievementBrief = {
    id: asString(ach.id, 80) || 'unknown',
    title,
    categoryId,
    categoryLabel: asString(ach.categoryLabel, 120) || 'Достижение',
    topic: asString(ach.topic, 300),
    achievedAtISO: asString(ach.achievedAtISO, 40) || new Date().toISOString(),
    strictness: asString(ach.strictness, 40) || 'strict',
    verifier: asString(ach.verifier, 200) || 'Команда верификации Огонька',
    regulationSummary: asString(ach.regulationSummary, 600),
  }

  const cleanApplicant: ModerationApplicant = {
    displayName: asString(applicant.displayName, 80) || 'Алексей Церна',
    username: asString(applicant.username, 40) || 'cernavation',
    contactEmail: asString(applicant.contactEmail, 160),
  }

  return {
    trackingCode,
    submittedAtISO: asString(raw.submittedAtISO, 40) || new Date().toISOString(),
    applicant: cleanApplicant,
    achievement,
    description: asString(raw.description, 1200),
    evidence,
    attachments,
  }
}

/* ── Доставка ───────────────────────────────────────────────────────────── */

async function sendWebhook(
  url: string,
  payload: ReturnType<typeof buildModerationWebhookPayload>
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

async function sendResendEmail(
  apiKey: string,
  emailPackage: ReturnType<typeof buildModerationEmailPackage>,
  attachments: ModerationEmailAttachment[]
): Promise<boolean> {
  const resendAttachments = attachments
    .filter((att) => att.dataUrl && att.dataUrl.includes(','))
    .slice(0, 8)
    .map((att) => ({
      filename: att.fileName,
      content_type: att.mime,
      content: att.dataUrl!.slice(att.dataUrl!.indexOf(',') + 1),
    }))

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailPackage.from,
        to: [emailPackage.to],
        reply_to: emailPackage.replyTo,
        subject: emailPackage.subject,
        text: emailPackage.text,
        html: emailPackage.html,
        ...(resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
      }),
      signal: AbortSignal.timeout(12000),
    })
    return res.ok
  } catch {
    return false
  }
}

type OutboxRecord = {
  trackingCode: string
  recipient: string
  submittedAtISO: string
  achievementTitle: string
  categoryLabel: string
  evidenceCount: number
  attachmentCount: number
  channel: ModerationChannel
  note: string
}

async function appendToOutbox(record: OutboxRecord): Promise<void> {
  let list: OutboxRecord[] = []
  try {
    const raw = await fs.readFile(OUTBOX_FILE, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) list = parsed as OutboxRecord[]
  } catch {
    list = []
  }
  list.push(record)

  await fs.mkdir(OUTBOX_DIR, { recursive: true })
  const tmpFile = `${OUTBOX_FILE}.tmp.${Date.now()}`
  await fs.writeFile(tmpFile, JSON.stringify(list.slice(-200), null, 2), 'utf8')
  await fs.rename(tmpFile, OUTBOX_FILE)
}

/* ── GET: конфигурация канала доставки ──────────────────────────────────── */

export async function GET() {
  const webhookConfigured = Boolean(process.env.MODERATION_WEBHOOK_URL)
  const emailConfigured = Boolean(process.env.RESEND_API_KEY)
  const inbox = process.env.MODERATION_INBOX || DEFAULT_MODERATION_INBOX
  const from = process.env.MODERATION_FROM || DEFAULT_MODERATION_FROM

  let queued = 0
  let lastTrackingCode: string | null = null
  try {
    const raw = await fs.readFile(OUTBOX_FILE, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      queued = parsed.length
      const last = parsed[parsed.length - 1] as OutboxRecord | undefined
      lastTrackingCode = last?.trackingCode ?? null
    }
  } catch {
    // Outbox ещё не создан
  }

  return NextResponse.json({
    configured: { webhook: webhookConfigured, email: emailConfigured },
    channel: webhookConfigured ? 'webhook' : emailConfigured ? 'email' : 'outbox',
    inbox,
    from,
    queued,
    lastTrackingCode,
  })
}

/* ── POST: приём и отправка пакета ──────────────────────────────────────── */

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Слишком много заявок. Лимит: 20 в минуту.' },
        { status: 429 }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Ожидается корректный JSON-пакет заявки.' }, { status: 400 })
    }

    const payload = sanitizeIncomingPayload(rawBody)
    if (!payload) {
      return NextResponse.json(
        { error: 'Неполный пакет заявки: нужны trackingCode, достижение и категория.' },
        { status: 400 }
      )
    }

    const recipient = process.env.MODERATION_INBOX || DEFAULT_MODERATION_INBOX
    const from = process.env.MODERATION_FROM || DEFAULT_MODERATION_FROM

    const emailPackage = buildModerationEmailPackage(payload, recipient, from)
    const webhookPayload = buildModerationWebhookPayload(payload, recipient)

    let channel: ModerationChannel = 'outbox'
    let delivery: ModerationDelivery = 'queued'
    let note =
      'Каналы доставки не настроены — пакет сохранён в локальный outbox (.data/moderation-outbox.json).'

    const webhookUrl = process.env.MODERATION_WEBHOOK_URL
    const resendKey = process.env.RESEND_API_KEY

    if (webhookUrl) {
      const ok = await sendWebhook(webhookUrl, webhookPayload)
      if (ok) {
        channel = 'webhook'
        delivery = 'sent'
        note = 'Пакет заявки доставлен на webhook модератора.'
      } else {
        channel = 'outbox'
        delivery = 'queued'
        note = 'Webhook недоступен — пакет поставлен в локальную очередь outbox.'
      }
    } else if (resendKey) {
      const ok = await sendResendEmail(resendKey, emailPackage, payload.attachments)
      if (ok) {
        channel = 'email'
        delivery = 'sent'
        note = `Письмо-заявка отправлено на ${recipient} через Resend.`
      } else {
        channel = 'outbox'
        delivery = 'queued'
        note = 'Resend недоступен — пакет поставлен в локальную очередь outbox.'
      }
    }

    if (delivery !== 'sent') {
      try {
        await appendToOutbox({
          trackingCode: payload.trackingCode,
          recipient,
          submittedAtISO: payload.submittedAtISO,
          achievementTitle: payload.achievement.title,
          categoryLabel: payload.achievement.categoryLabel,
          evidenceCount: payload.evidence.length,
          attachmentCount: payload.attachments.length,
          channel,
          note,
        })
      } catch {
        // Outbox — вспомогательный журнал, не роняем ответ из-за диска
      }
    }

    return NextResponse.json({
      success: true,
      trackingCode: payload.trackingCode,
      channel,
      delivery,
      recipient,
      note,
      submittedAtISO: payload.submittedAtISO,
      evidenceCount: payload.evidence.length,
      attachmentCount: payload.attachments.length,
      email: {
        to: emailPackage.to,
        from: emailPackage.from,
        subject: emailPackage.subject,
        text: emailPackage.text,
      },
      webhook: webhookPayload,
    })
  } catch {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при отправке заявки модератору.' },
      { status: 500 }
    )
  }
}
