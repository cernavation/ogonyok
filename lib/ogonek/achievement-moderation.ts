import { computeAchievementProgress, getAchievementCategory } from './achievement-regulation.ts'
import type {
  AchievementEvidenceFile,
  AchievementEvidenceRequirement,
  AchievementStatus,
  AchievementSubmission,
  ModerationChannel,
  ModerationDelivery,
  ModerationReviewEvent,
  ModerationStatus,
  VerifiedAchievement,
} from './types.ts'

/**
 * ЭТАП 6 — Модерация ачивок и отправка доказательств на почту.
 *
 * Чистый модуль без зависимостей от DOM/Node:
 *  - описывает три статуса заявки («На модерации», «Подтверждено официально»,
 *    «Требует уточнения») и золотой бейдж верификации;
 *  - собирает пакет доказательств в письмо/вебхук для модератора
 *    (готовый email-шаблон + JSON webhook-payload);
 *  - генерирует трек-код заявки и ведёт историю рассмотрения.
 *
 * Тот же набор функций использует серверный роут
 * `app/api/achievements/verify/route.ts`, поэтому клиент и сервер видят
 * одинаковый пакет заявки.
 */

/* ── Статусы заявки ─────────────────────────────────────────────────────── */

export type ModerationStatusMeta = {
  label: string
  short: string
  color: string
  description: string
}

export const MODERATION_STATUS_META: Record<ModerationStatus, ModerationStatusMeta> = {
  'on-moderation': {
    label: 'На модерации',
    short: 'На модерации',
    color: '#1d9bf0',
    description: 'Пакет доказательств отправлен модератору. Идёт ручная проверка первоисточников.',
  },
  'officially-verified': {
    label: 'Подтверждено официально',
    short: 'Подтверждено',
    color: '#f5b301',
    description: 'Модератор сверил доказательства с первоисточником. Выдан золотой бейдж.',
  },
  'needs-clarification': {
    label: 'Требует уточнения',
    short: 'Требует уточнения',
    color: '#f59e0b',
    description: 'Модератору нужны дополнительные доказательства или пояснения по заявке.',
  },
}

export const MODERATION_STATUSES: ModerationStatus[] = [
  'on-moderation',
  'officially-verified',
  'needs-clarification',
]

export function isModerationStatus(value: unknown): value is ModerationStatus {
  return typeof value === 'string' && (MODERATION_STATUSES as string[]).includes(value)
}

/** Золотой бейдж официальной верификации */
export const GOLD_VERIFICATION_BADGE = {
  color: '#f5b301',
  deep: '#b8860b',
  light: '#fde68a',
  gradient: 'linear-gradient(135deg, #fde68a 0%, #f5b301 45%, #b8860b 100%)',
  label: 'Официально подтверждено',
} as const

export const DEFAULT_MODERATION_INBOX = 'moderation@ogonyok.app'
export const DEFAULT_MODERATION_FROM = 'verification@ogonyok.app'

/* ── Связь со статусом ачивки ───────────────────────────────────────────── */

/** Соответствие жизненного цикла ачивки статусу модерации */
export function moderationStatusFromAchievement(status: AchievementStatus): ModerationStatus {
  switch (status) {
    case 'verified':
      return 'officially-verified'
    case 'rejected':
      return 'needs-clarification'
    default:
      return 'on-moderation'
  }
}

/** Обратное соответствие: статус модерации → статус ачивки */
export function achievementStatusFromModeration(status: ModerationStatus): AchievementStatus {
  switch (status) {
    case 'officially-verified':
      return 'verified'
    case 'needs-clarification':
      return 'rejected'
    default:
      return 'submitted'
  }
}

export function channelLabel(channel: ModerationChannel): string {
  switch (channel) {
    case 'email':
      return 'Email (Resend)'
    case 'webhook':
      return 'Webhook'
    default:
      return 'Локальный outbox'
  }
}

export function deliveryLabel(delivery: ModerationDelivery): string {
  switch (delivery) {
    case 'sent':
      return 'Доставлено'
    case 'failed':
      return 'Ошибка доставки'
    default:
      return 'В очереди'
  }
}

/* ── Трек-код ───────────────────────────────────────────────────────────── */

const TRACK_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Генерирует человекочитаемый трек-код заявки вида `OGN-7K2QF4`.
 * Сид (например, id ачивки) делает код узнаваемым для повторной отправки.
 */
export function makeTrackingCode(seed?: string): string {
  let hash = 2166136261
  const source = `${seed ?? ''}${Date.now().toString(36)}`
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  let value = hash >>> 0
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += TRACK_ALPHABET[value % TRACK_ALPHABET.length]
    value = (value >>> 3) + 7
  }
  return `OGN-${out}`
}

/* ── Пакет доказательств ────────────────────────────────────────────────── */

export type ModerationEvidenceKind = 'link' | 'file'

export type ModerationEvidenceItem = {
  requirementId: string
  requirementTitle: string
  /** Обязательное ли требование регламента */
  required: boolean
  fileName: string
  mime: string
  size: number
  /** Внешняя ссылка, если доказательство — URL */
  ref: string | null
  kind: ModerationEvidenceKind
}

/** Доказательство, реально вложенное в письмо (base64 data URL) */
export type ModerationEmailAttachment = {
  fileName: string
  mime: string
  size: number
  /** data URL (base64) — присутствует, если файл удалось приложить */
  dataUrl?: string
}

export function isExternalRef(ref: string): boolean {
  return /^https?:\/\//i.test(ref ?? '')
}

/** Разворачивает доказательства ачивки в человекочитаемый список для письма */
export function buildModerationEvidence(
  achievement: Pick<VerifiedAchievement, 'regulation' | 'evidence'>
): ModerationEvidenceItem[] {
  const requirementMap = new Map<string, AchievementEvidenceRequirement>(
    (achievement.regulation?.requirements ?? []).map((r) => [r.id, r])
  )

  return achievement.evidence.map((file: AchievementEvidenceFile) => {
    const requirement = requirementMap.get(file.requirementId)
    const external = isExternalRef(file.ref)
    return {
      requirementId: file.requirementId,
      requirementTitle: requirement?.title ?? 'Файл-доказательство',
      required: Boolean(requirement?.required),
      fileName: file.fileName,
      mime: file.mime,
      size: file.size,
      ref: external ? file.ref : null,
      kind: external ? 'link' : 'file',
    }
  })
}

/* ── Payload заявки ─────────────────────────────────────────────────────── */

export type ModerationApplicant = {
  displayName: string
  username: string
  contactEmail: string
}

export type ModerationAchievementBrief = {
  id: string
  title: string
  categoryId: VerifiedAchievement['categoryId']
  categoryLabel: string
  topic: string
  achievedAtISO: string
  strictness: string
  verifier: string
  regulationSummary: string
}

export type ModerationSubmissionPayload = {
  trackingCode: string
  submittedAtISO: string
  applicant: ModerationApplicant
  achievement: ModerationAchievementBrief
  description: string
  evidence: ModerationEvidenceItem[]
  attachments: ModerationEmailAttachment[]
}

export function buildModerationSubmissionPayload(input: {
  trackingCode: string
  achievement: VerifiedAchievement
  applicant: ModerationApplicant
  description: string
  attachments?: ModerationEmailAttachment[]
}): ModerationSubmissionPayload {
  const category = getAchievementCategory(input.achievement.categoryId)
  const regulation = input.achievement.regulation

  return {
    trackingCode: input.trackingCode,
    submittedAtISO: new Date().toISOString(),
    applicant: {
      displayName: input.applicant.displayName.slice(0, 80),
      username: input.applicant.username.slice(0, 40),
      contactEmail: input.applicant.contactEmail.trim().slice(0, 160),
    },
    achievement: {
      id: input.achievement.id,
      title: input.achievement.title.slice(0, 120),
      categoryId: input.achievement.categoryId,
      categoryLabel: category.label,
      topic: input.achievement.topic.slice(0, 300),
      achievedAtISO: input.achievement.achievedAtISO,
      strictness: regulation?.strictness ?? 'strict',
      verifier: regulation?.verifier ?? 'Команда верификации Огонька',
      regulationSummary: regulation?.summary ?? '',
    },
    description: input.description.trim().slice(0, 1200),
    evidence: buildModerationEvidence(input.achievement),
    attachments: input.attachments ?? [],
  }
}

/* ── Готовый email-шаблон ───────────────────────────────────────────────── */

export type ModerationEmailPackage = {
  to: string
  from: string
  replyTo: string
  subject: string
  text: string
  html: string
}

function formatBytes(size: number): string {
  if (!size) return 'ссылка'
  if (size < 1024) return `${size} Б`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}

export function formatModerationDate(dateISO: string): string {
  if (!dateISO) return '—'
  const date = new Date(dateISO)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Готовый email-шаблон заявки для модератора.
 * Возвращает тему, plain-text и HTML-версию письма.
 */
export function buildModerationEmailPackage(
  payload: ModerationSubmissionPayload,
  recipient: string = DEFAULT_MODERATION_INBOX,
  from: string = DEFAULT_MODERATION_FROM
): ModerationEmailPackage {
  const a = payload.achievement
  const evidenceLines = payload.evidence
    .map((item, index) => {
      const tag = item.required ? 'обязательно' : 'по желанию'
      const src = item.kind === 'link' ? `ссылка: ${item.ref}` : `файл: ${formatBytes(item.size)}`
      return `${index + 1}. ${item.requirementTitle} [${tag}]\n   ${item.fileName} — ${src}`
    })
    .join('\n')

  const attachmentsLine =
    payload.attachments.length > 0
      ? payload.attachments.map((att) => `• ${att.fileName} (${formatBytes(att.size)})`).join('\n')
      : 'Файлы хранятся в защищённом хранилище Огонька и приложены по ссылке из заявки.'

  const subject = `[Огонёк · ${payload.trackingCode}] Заявка на верификацию: ${a.title} (${a.categoryLabel})`

  const text = [
    `ЗАЯВКА НА ВЕРИФИКАЦИЮ ДОСТИЖЕНИЯ — ОГОНЁК`,
    `Трек-код: ${payload.trackingCode}`,
    `Отправлено: ${formatModerationDate(payload.submittedAtISO)}`,
    '',
    `ЗАЯВИТЕЛЬ`,
    `  Профиль: ${payload.applicant.displayName} (@${payload.applicant.username})`,
    `  Почта для ответа: ${payload.applicant.contactEmail || 'не указана'}`,
    '',
    `ДОСТИЖЕНИЕ`,
    `  Название: ${a.title}`,
    `  Категория: ${a.categoryLabel}`,
    `  Тема: ${a.topic}`,
    `  Дата свершения: ${formatModerationDate(a.achievedAtISO)}`,
    `  Строгость проверки: ${a.strictness}`,
    `  Уполномоченный верификатор: ${a.verifier}`,
    '',
    `ОПИСАНИЕ ОТ ПОЛЬЗОВАТЕЛЯ`,
    `  ${payload.description || '—'}`,
    '',
    `КОМПЛЕКТ ДОКАЗАТЕЛЬСТВ (${payload.evidence.length})`,
    evidenceLines || '  —',
    '',
    `ВЛОЖЕНИЯ ПИСЬМА`,
    attachmentsLine,
    '',
    `РЕГЛАМЕНТ ИИ`,
    `  ${a.regulationSummary || '—'}`,
    '',
    `— Автоотправлено системой верификации Огонька. Ответьте на это письмо или используйте трек-код.`,
  ].join('\n')

  const evidenceHtml = payload.evidence
    .map((item) => {
      const src = item.kind === 'link' ? `<a href="${item.ref}" style="color:#1d9bf0">${item.ref}</a>` : formatBytes(item.size)
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #2f3336;color:#e7e9ea;font-size:13px">
          ${escapeHtml(item.requirementTitle)}
          <span style="color:${item.required ? '#ff8a50' : '#71767b'};font-size:11px">${item.required ? ' · обязательно' : ' · по желанию'}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #2f3336;color:#8b98a5;font-size:12px">${escapeHtml(item.fileName)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #2f3336;color:#8b98a5;font-size:12px">${src}</td>
      </tr>`
    })
    .join('')

  const html = `<div style="background:#0b0c0e;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="max-width:640px;margin:0 auto;background:#16181c;border:1px solid #2f3336;border-radius:16px;overflow:hidden">
      <div style="padding:18px 22px;background:linear-gradient(135deg,#ff6b35,#ffa600)">
        <div style="color:#180a02;font-size:12px;font-weight:800;letter-spacing:.08em">ОГОНЁК · МОДЕРАЦИЯ</div>
        <div style="color:#180a02;font-size:20px;font-weight:900;margin-top:4px">Заявка на верификацию достижения</div>
      </div>
      <div style="padding:20px 22px">
        <div style="display:inline-block;background:#0b0c0e;border:1px solid #2f3336;border-radius:999px;padding:6px 14px;color:#f5b301;font-size:13px;font-weight:800">
          Трек-код: ${escapeHtml(payload.trackingCode)}
        </div>
        <p style="color:#8b98a5;font-size:12px;margin:12px 0 0">Отправлено ${escapeHtml(formatModerationDate(payload.submittedAtISO))}</p>

        <h3 style="color:#e7e9ea;font-size:15px;margin:20px 0 6px">Заявитель</h3>
        <p style="color:#e7e9ea;font-size:14px;margin:0">${escapeHtml(payload.applicant.displayName)} (@${escapeHtml(payload.applicant.username)})</p>
        <p style="color:#8b98a5;font-size:12px;margin:2px 0 0">Почта для ответа: ${escapeHtml(payload.applicant.contactEmail || 'не указана')}</p>

        <h3 style="color:#e7e9ea;font-size:15px;margin:20px 0 6px">Достижение</h3>
        <p style="color:#e7e9ea;font-size:15px;font-weight:800;margin:0">${escapeHtml(a.title)}</p>
        <p style="color:#f59e0b;font-size:12px;margin:4px 0 0">${escapeHtml(a.categoryLabel)} · строгость: ${escapeHtml(a.strictness)}</p>
        <p style="color:#8b98a5;font-size:13px;margin:8px 0 0">${escapeHtml(a.topic)}</p>
        <p style="color:#8b98a5;font-size:12px;margin:8px 0 0">Верификатор: ${escapeHtml(a.verifier)}</p>

        <h3 style="color:#e7e9ea;font-size:15px;margin:20px 0 6px">Описание от пользователя</h3>
        <p style="color:#d1d5db;font-size:13px;line-height:20px;margin:0;white-space:pre-wrap">${escapeHtml(payload.description || '—')}</p>

        <h3 style="color:#e7e9ea;font-size:15px;margin:20px 0 6px">Комплект доказательств (${payload.evidence.length})</h3>
        <table style="width:100%;border-collapse:collapse;background:#0b0c0e;border-radius:10px;overflow:hidden">
          ${evidenceHtml || '<tr><td style="padding:10px;color:#8b98a5;font-size:12px">—</td></tr>'}
        </table>

        <h3 style="color:#e7e9ea;font-size:15px;margin:20px 0 6px">Вложения письма (${payload.attachments.length})</h3>
        <ul style="color:#8b98a5;font-size:12px;padding-left:18px;margin:0">
          ${payload.attachments.length > 0 ? payload.attachments.map((att) => `<li>${escapeHtml(att.fileName)} — ${formatBytes(att.size)}</li>`).join('') : '<li>Файлы приложены по ссылке из заявки</li>'}
        </ul>

        <p style="color:#71767b;font-size:11px;margin:22px 0 0">Автоотправлено системой верификации Огонька. Используйте трек-код для связи.</p>
      </div>
    </div>
  </div>`

  return {
    to: recipient,
    from,
    replyTo: payload.applicant.contactEmail || from,
    subject,
    text,
    html,
  }
}

function escapeHtml(value: string): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* ── Готовый webhook-payload ────────────────────────────────────────────── */

export type ModerationWebhookPayload = {
  event: 'achievement.moderation.requested'
  version: number
  trackingCode: string
  submittedAtISO: string
  recipient: string
  applicant: ModerationApplicant
  achievement: ModerationAchievementBrief
  description: string
  evidence: ModerationEvidenceItem[]
  attachments: { fileName: string; mime: string; size: number; embedded: boolean }[]
  email: { subject: string; text: string }
}

export function buildModerationWebhookPayload(
  payload: ModerationSubmissionPayload,
  recipient: string = DEFAULT_MODERATION_INBOX
): ModerationWebhookPayload {
  const emailPackage = buildModerationEmailPackage(payload, recipient)
  return {
    event: 'achievement.moderation.requested',
    version: 1,
    trackingCode: payload.trackingCode,
    submittedAtISO: payload.submittedAtISO,
    recipient,
    applicant: payload.applicant,
    achievement: payload.achievement,
    description: payload.description,
    evidence: payload.evidence,
    attachments: payload.attachments.map((att) => ({
      fileName: att.fileName,
      mime: att.mime,
      size: att.size,
      embedded: Boolean(att.dataUrl),
    })),
    email: { subject: emailPackage.subject, text: emailPackage.text },
  }
}

/* ── Запись заявки в сторе ──────────────────────────────────────────────── */

export function createSubmissionRecord(input: {
  trackingCode: string
  description: string
  contactEmail: string
  channel: ModerationChannel
  delivery: ModerationDelivery
  recipient: string
  evidenceCount: number
  status?: ModerationStatus
}): AchievementSubmission {
  const nowISO = new Date().toISOString()
  const status = input.status ?? 'on-moderation'
  return {
    id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    trackingCode: input.trackingCode,
    status,
    description: input.description.trim().slice(0, 1200),
    contactEmail: input.contactEmail.trim().slice(0, 160),
    submittedAtISO: nowISO,
    decidedAtISO: null,
    moderatorNote: null,
    channel: input.channel,
    delivery: input.delivery,
    recipient: input.recipient,
    evidenceCount: Math.max(0, Math.round(input.evidenceCount)),
    history: [
      {
        id: `rev-${Date.now().toString(36)}-0`,
        atISO: nowISO,
        status: 'on-moderation',
        note: `Пакет доказательств отправлен модератору (${channelLabel(input.channel)}).`,
        actor: 'Огонёк · автоотправка',
      },
    ],
  }
}

export function appendReviewEvent(
  submission: AchievementSubmission,
  status: ModerationStatus,
  note: string,
  actor: string
): ModerationReviewEvent[] {
  const event: ModerationReviewEvent = {
    id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    atISO: new Date().toISOString(),
    status,
    note: (note ?? '').trim().slice(0, 600),
    actor: actor.slice(0, 60),
  }
  return [...submission.history, event].slice(-20)
}

/** Безопасно восстанавливает заявку из хранилища */
export function sanitizeSubmission(value: unknown): AchievementSubmission | null {
  if (!value || typeof value !== 'object') return null
  const s = value as Partial<AchievementSubmission>

  const status: ModerationStatus = isModerationStatus(s.status) ? s.status : 'on-moderation'
  const channel: ModerationChannel =
    s.channel === 'email' || s.channel === 'webhook' || s.channel === 'outbox' ? s.channel : 'outbox'
  const delivery: ModerationDelivery =
    s.delivery === 'sent' || s.delivery === 'failed' ? s.delivery : 'queued'

  const trackingCode =
    typeof s.trackingCode === 'string' && s.trackingCode.trim()
      ? s.trackingCode.trim().slice(0, 40)
      : makeTrackingCode(typeof s.id === 'string' ? s.id : undefined)

  const history: ModerationReviewEvent[] = Array.isArray(s.history)
    ? s.history
        .filter((e): e is ModerationReviewEvent => !!e && typeof e === 'object')
        .map((e, index) => ({
          id: typeof e.id === 'string' && e.id ? e.id.slice(0, 80) : `rev-${index}`,
          atISO: typeof e.atISO === 'string' ? e.atISO : new Date().toISOString(),
          status: isModerationStatus(e.status) ? e.status : 'on-moderation',
          note: typeof e.note === 'string' ? e.note.slice(0, 600) : '',
          actor: typeof e.actor === 'string' && e.actor.trim() ? e.actor.slice(0, 60) : 'Огонёк',
        }))
        .slice(-20)
    : []

  return {
    id: typeof s.id === 'string' && s.id ? s.id.slice(0, 80) : `sub-${trackingCode}`,
    trackingCode,
    status,
    description: typeof s.description === 'string' ? s.description.slice(0, 1200) : '',
    contactEmail: typeof s.contactEmail === 'string' ? s.contactEmail.slice(0, 160) : '',
    submittedAtISO: typeof s.submittedAtISO === 'string' ? s.submittedAtISO : new Date().toISOString(),
    decidedAtISO: typeof s.decidedAtISO === 'string' ? s.decidedAtISO : null,
    moderatorNote: typeof s.moderatorNote === 'string' ? s.moderatorNote.slice(0, 600) : null,
    channel,
    delivery,
    recipient:
      typeof s.recipient === 'string' && s.recipient.trim()
        ? s.recipient.slice(0, 160)
        : DEFAULT_MODERATION_INBOX,
    evidenceCount:
      typeof s.evidenceCount === 'number' && Number.isFinite(s.evidenceCount)
        ? Math.max(0, Math.round(s.evidenceCount))
        : 0,
    history,
  }
}

/* ── Сводка для панели ─────────────────────────────────────────────────── */

export type ModerationSummary = {
  total: number
  onModeration: number
  officiallyVerified: number
  needsClarification: number
  lastSubmittedAtISO: string | null
}

/** Считает сводку по всем ачивкам для шапки профиля */
export function summarizeModeration(achievements: VerifiedAchievement[]): ModerationSummary {
  const summary: ModerationSummary = {
    total: achievements.length,
    onModeration: 0,
    officiallyVerified: 0,
    needsClarification: 0,
    lastSubmittedAtISO: null,
  }

  let last = 0
  for (const achievement of achievements) {
    const status = achievement.submission?.status ?? moderationStatusFromAchievement(achievement.status)
    if (status === 'officially-verified') summary.officiallyVerified++
    else if (status === 'needs-clarification') summary.needsClarification++
    else if (achievement.submission || achievement.status === 'submitted') summary.onModeration++

    const submittedAt = achievement.submission?.submittedAtISO
    if (submittedAt) {
      const time = new Date(submittedAt).getTime()
      if (Number.isFinite(time) && time > last) last = time
    }
  }

  summary.lastSubmittedAtISO = last > 0 ? new Date(last).toISOString() : null
  return summary
}

/** Готов ли комплект обязательных доказательств к отправке модератору */
export function isReadyForModeration(achievement: VerifiedAchievement): boolean {
  return computeAchievementProgress(achievement).complete
}

/** Какую именно заявку показывать в панели (последнюю отправленную) */
export function hasActiveSubmission(achievement: VerifiedAchievement): boolean {
  return Boolean(achievement.submission)
}
