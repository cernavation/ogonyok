import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_MODERATION_INBOX,
  MODERATION_STATUS_META,
  achievementStatusFromModeration,
  appendReviewEvent,
  buildModerationEmailPackage,
  buildModerationEvidence,
  buildModerationSubmissionPayload,
  buildModerationWebhookPayload,
  createSubmissionRecord,
  isReadyForModeration,
  makeTrackingCode,
  moderationStatusFromAchievement,
  sanitizeSubmission,
  summarizeModeration,
} from '../lib/ogonek/achievement-moderation.ts'
import { regulateAchievement } from '../lib/ogonek/achievement-regulation.ts'
import type { AchievementEvidenceFile, VerifiedAchievement } from '../lib/ogonek/types.ts'

function buildAchievement(overrides: Partial<VerifiedAchievement> = {}): VerifiedAchievement {
  const regulation = regulateAchievement('discipline', '500 дней подряд вёл дневник без пропусков', true)
  const evidence: AchievementEvidenceFile[] = regulation.requirements
    .filter((r) => r.required)
    .map((r, index) => ({
      id: `ev-${index}`,
      requirementId: r.id,
      fileName: index === 0 ? 'tracker.png' : 'export.csv',
      ref: index === 0 ? 'photo_123' : 'https://example.org/export.csv',
      mime: index === 0 ? 'image/png' : 'text/csv',
      size: index === 0 ? 2048 : 0,
      addedAtISO: new Date().toISOString(),
    }))

  return {
    id: 'va-test',
    categoryId: 'discipline',
    title: '500 дней дисциплины',
    topic: '500 дней подряд вёл дневник без пропусков',
    achievedAtISO: new Date().toISOString(),
    status: 'draft',
    regulation,
    evidence,
    submittedAtISO: null,
    verifiedAtISO: null,
    reviewerNote: null,
    submission: null,
    createdAtISO: new Date().toISOString(),
    ...overrides,
  }
}

describe('Achievement moderation (ЭТАП 6)', () => {
  it('exposes exactly the three required status labels', () => {
    assert.equal(MODERATION_STATUS_META['on-moderation'].label, 'На модерации')
    assert.equal(MODERATION_STATUS_META['officially-verified'].label, 'Подтверждено официально')
    assert.equal(MODERATION_STATUS_META['needs-clarification'].label, 'Требует уточнения')
  })

  it('maps achievement status to moderation status both ways', () => {
    assert.equal(moderationStatusFromAchievement('verified'), 'officially-verified')
    assert.equal(moderationStatusFromAchievement('rejected'), 'needs-clarification')
    assert.equal(moderationStatusFromAchievement('submitted'), 'on-moderation')
    assert.equal(moderationStatusFromAchievement('draft'), 'on-moderation')

    assert.equal(achievementStatusFromModeration('officially-verified'), 'verified')
    assert.equal(achievementStatusFromModeration('needs-clarification'), 'rejected')
    assert.equal(achievementStatusFromModeration('on-moderation'), 'submitted')
  })

  it('generates a well-formed tracking code', () => {
    const code = makeTrackingCode('va-test')
    assert.match(code, /^OGN-[A-Z2-9]{6}$/)
  })

  it('splits evidence into link and stored-file kinds', () => {
    const items = buildModerationEvidence(buildAchievement())
    assert.ok(items.length >= 1)
    const link = items.find((i) => i.kind === 'link')
    const file = items.find((i) => i.kind === 'file')
    assert.ok(link, 'внешняя ссылка распознана как link')
    assert.equal(link?.ref, 'https://example.org/export.csv')
    assert.ok(file, 'хранилищный id распознан как file')
    assert.equal(file?.ref, null)
  })

  it('builds a ready email package containing the tracking code and title', () => {
    const achievement = buildAchievement()
    const payload = buildModerationSubmissionPayload({
      trackingCode: 'OGN-ABC123',
      achievement,
      applicant: { displayName: 'Алексей Церна', username: 'cernavation', contactEmail: 'a@b.com' },
      description: 'Протокол серии приложен',
      attachments: [{ fileName: 'tracker.png', mime: 'image/png', size: 2048, dataUrl: 'data:image/png;base64,AAAA' }],
    })

    const email = buildModerationEmailPackage(payload)
    assert.equal(email.to, DEFAULT_MODERATION_INBOX)
    assert.match(email.subject, /OGN-ABC123/)
    assert.match(email.subject, /500 дней дисциплины/)
    assert.match(email.text, /Трек-код: OGN-ABC123/)
    assert.match(email.html, /OGN-ABC123/)

    const webhook = buildModerationWebhookPayload(payload)
    assert.equal(webhook.event, 'achievement.moderation.requested')
    assert.equal(webhook.attachments.length, 1)
    assert.equal(webhook.attachments[0].embedded, true)
  })

  it('creates a submission record starting on moderation', () => {
    const record = createSubmissionRecord({
      trackingCode: 'OGN-AAAAAA',
      description: 'описание',
      contactEmail: 'a@b.com',
      channel: 'outbox',
      delivery: 'queued',
      recipient: DEFAULT_MODERATION_INBOX,
      evidenceCount: 3,
    })
    assert.equal(record.status, 'on-moderation')
    assert.equal(record.delivery, 'queued')
    assert.equal(record.evidenceCount, 3)
    assert.equal(record.history.length, 1)
  })

  it('appends review events to the history', () => {
    const record = createSubmissionRecord({
      trackingCode: 'OGN-BBBBBB',
      description: '',
      contactEmail: '',
      channel: 'email',
      delivery: 'sent',
      recipient: DEFAULT_MODERATION_INBOX,
      evidenceCount: 1,
    })
    const history = appendReviewEvent(record, 'officially-verified', 'подтверждено', 'Модератор')
    assert.equal(history.length, 2)
    assert.equal(history[1].status, 'officially-verified')
    assert.equal(history[1].actor, 'Модератор')
  })

  it('sanitizes persisted submissions and rejects garbage', () => {
    assert.equal(sanitizeSubmission(null), null)
    assert.equal(sanitizeSubmission('nope'), null)

    const restored = sanitizeSubmission({
      id: 'sub-1',
      status: 'weird',
      channel: 'nope',
      delivery: 'nope',
      description: 'x'.repeat(5000),
    })
    assert.ok(restored)
    assert.equal(restored?.status, 'on-moderation')
    assert.equal(restored?.channel, 'outbox')
    assert.equal(restored?.delivery, 'queued')
    assert.match(restored?.trackingCode ?? '', /^OGN-/)
    assert.equal(restored?.description.length, 1200)
  })

  it('summarizes moderation across achievements', () => {
    const verified = createSubmissionRecord({
      trackingCode: 'OGN-CCCCCC',
      description: '',
      contactEmail: '',
      channel: 'email',
      delivery: 'sent',
      recipient: DEFAULT_MODERATION_INBOX,
      evidenceCount: 2,
      status: 'officially-verified',
    })
    const pending = createSubmissionRecord({
      trackingCode: 'OGN-DDDDDD',
      description: '',
      contactEmail: '',
      channel: 'webhook',
      delivery: 'sent',
      recipient: DEFAULT_MODERATION_INBOX,
      evidenceCount: 1,
    })

    const summary = summarizeModeration([
      buildAchievement({ id: 'a1', status: 'verified', submission: verified }),
      buildAchievement({ id: 'a2', status: 'submitted', submission: pending }),
      buildAchievement({ id: 'a3', status: 'draft', submission: null }),
    ])

    assert.equal(summary.total, 3)
    assert.equal(summary.officiallyVerified, 1)
    assert.equal(summary.onModeration, 1)
    assert.ok(summary.lastSubmittedAtISO)
  })

  it('reports readiness only when all mandatory evidence is attached', () => {
    const ready = buildAchievement()
    assert.equal(isReadyForModeration(ready), true)

    const regulation = regulateAchievement('sport-record', 'марафон 42 км босиком', true)
    const incomplete = buildAchievement({ id: 'a4', categoryId: 'sport-record', regulation, evidence: [] })
    assert.equal(isReadyForModeration(incomplete), false)
  })
})
