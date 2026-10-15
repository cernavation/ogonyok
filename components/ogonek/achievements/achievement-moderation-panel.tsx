'use client'

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Gavel,
  Inbox,
  Mail,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  Webhook,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  DEFAULT_MODERATION_INBOX,
  MODERATION_STATUS_META,
  buildModerationEmailPackage,
  buildModerationSubmissionPayload,
  buildModerationWebhookPayload,
  channelLabel,
  deliveryLabel,
  formatModerationDate,
} from '@/lib/ogonek/achievement-moderation'
import { downloadBlob } from '@/lib/ogonek/card-export'
import { buildEmlFile } from '@/lib/ogonek/achievement-submit-client'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ModerationStatus, VerifiedAchievement } from '@/lib/ogonek/types'
import { GoldVerificationBadge, ModerationStatusPill } from './verification-badge'

type Props = {
  achievement: VerifiedAchievement
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const SETUP_GUIDE = `# Готовый шаблон доставки заявок модератору (.env.local)

# Вариант 1 — Webhook (Slack / Discord / Zapier / n8n):
MODERATION_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"

# Вариант 2 — Email через Resend (https://resend.com):
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx"

# Адрес модератора и отправителя:
MODERATION_INBOX="moderation@ogonyok.app"
MODERATION_FROM="verification@ogonyok.app"

# Пакет письма (тема + text + HTML) и JSON webhook-payload формируются
# автоматически в app/api/achievements/verify/route.ts. Если каналы не
# настроены, заявка складывается в .data/moderation-outbox.json.`

/**
 * ЭТАП 6 — Панель статуса заявки в профиле.
 * Показывает трек-код, канал доставки, историю рассмотрения, комментарий
 * модератора и золотой бейдж официальной верификации. Плюс консоль модератора
 * для вынесения вердикта («На модерации» / «Требует уточнения» / «Подтверждено официально»).
 */
export function AchievementModerationPanel({ achievement, onNotify, soundEnabled = true }: Props) {
  const { state, resolveModerationStatus, withdrawSubmission, reopenAchievement } = useOgonekStore()
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [note, setNote] = useState('')
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)

  const submission = achievement.submission

  const packageData = useMemo(() => {
    if (!submission) return null
    const payload = buildModerationSubmissionPayload({
      trackingCode: submission.trackingCode,
      achievement,
      applicant: {
        displayName: state.profile.displayName,
        username: state.profile.username,
        contactEmail: submission.contactEmail,
      },
      description: submission.description,
      attachments: [],
    })
    return {
      email: buildModerationEmailPackage(payload, submission.recipient),
      webhook: buildModerationWebhookPayload(payload, submission.recipient),
    }
  }, [submission, achievement, state.profile.displayName, state.profile.username])

  if (!submission) {
    return (
      <div className="ach-mod ach-mod--empty" role="status">
        <Inbox size={15} />
        Заявка ещё не отправлялась модератору.
      </div>
    )
  }

  const meta = MODERATION_STATUS_META[submission.status]

  const handleCopy = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(submission.trackingCode)
      onNotify(`Трек-код ${submission.trackingCode} скопирован`)
    } catch {
      onNotify('Не удалось скопировать трек-код')
    }
  }

  const handleDownload = () => {
    playClick(soundEnabled)
    if (!packageData) return
    try {
      const eml = buildEmlFile(packageData.email)
      downloadBlob(new Blob([eml], { type: 'message/rfc822' }), `ogonek-${submission.trackingCode}.eml`)
      onNotify('Письмо-заявка сохранено в .eml')
    } catch {
      onNotify('Не удалось сохранить письмо')
    }
  }

  const handleVerdict = (status: ModerationStatus) => {
    playClick(soundEnabled)
    const ok = resolveModerationStatus(achievement.id, status, note)
    if (ok) {
      if (status === 'officially-verified') playSuccess(soundEnabled)
      onNotify(
        status === 'officially-verified'
          ? 'Достижение подтверждено официально — золотой бейдж выдан ✓'
          : status === 'needs-clarification'
            ? 'Заявка помечена как «Требует уточнения»'
            : 'Заявка возвращена в статус «На модерации»'
      )
      setConsoleOpen(false)
      setNote('')
    } else {
      onNotify('Не удалось применить вердикт')
    }
  }

  const handleWithdraw = () => {
    playClick(soundEnabled)
    withdrawSubmission(achievement.id)
    onNotify('Заявка отозвана, ачивка возвращена в черновики')
  }

  const handleFix = () => {
    playClick(soundEnabled)
    reopenAchievement(achievement.id)
    onNotify('Ачивка открыта заново — дополни доказательства и отправь повторно')
  }

  return (
    <section className={`ach-mod ach-mod--${submission.status}`} aria-label="Статус заявки на модерацию">
      <header className="ach-mod-head">
        <div className="ach-mod-head-main">
          <span className="ach-mod-kicker">Заявка модератору</span>
          <div className="ach-mod-titlerow">
            <ModerationStatusPill status={submission.status} />
            {submission.status === 'officially-verified' && <GoldVerificationBadge size="sm" />}
          </div>
        </div>
        <button
          type="button"
          className="ach-mod-code"
          onClick={handleCopy}
          title="Скопировать трек-код"
        >
          {submission.trackingCode}
          <Copy size={12} />
        </button>
      </header>

      <p className="ach-mod-desc">{meta.description}</p>

      <dl className="ach-mod-meta">
        <div>
          <dt>
            <Mail size={12} /> Модератор
          </dt>
          <dd>{submission.recipient || DEFAULT_MODERATION_INBOX}</dd>
        </div>
        <div>
          <dt>
            <Webhook size={12} /> Канал
          </dt>
          <dd>{channelLabel(submission.channel)}</dd>
        </div>
        <div>
          <dt>
            <Inbox size={12} /> Доставка
          </dt>
          <dd>{deliveryLabel(submission.delivery)}</dd>
        </div>
        <div>
          <dt>
            <Paperclip size={12} /> Доказательств
          </dt>
          <dd>{submission.evidenceCount}</dd>
        </div>
        <div>
          <dt>
            <Clock size={12} /> Отправлено
          </dt>
          <dd>{formatModerationDate(submission.submittedAtISO)}</dd>
        </div>
        {submission.decidedAtISO && (
          <div>
            <dt>
              <ShieldCheck size={12} /> Вердикт
            </dt>
            <dd>{formatModerationDate(submission.decidedAtISO)}</dd>
          </div>
        )}
      </dl>

      {submission.moderatorNote && (
        <p
          className={`ach-mod-note ${submission.status === 'needs-clarification' ? 'is-warn' : 'is-ok'}`}
        >
          {submission.status === 'needs-clarification' ? (
            <AlertTriangle size={13} />
          ) : (
            <ShieldCheck size={13} />
          )}
          {submission.moderatorNote}
        </p>
      )}

      {submission.history.length > 0 && (
        <ol className="ach-mod-timeline" aria-label="История рассмотрения заявки">
          {submission.history.map((event) => (
            <li key={event.id} className={`ach-mod-event ach-mod-event--${event.status}`}>
              <span
                className="ach-mod-dot"
                style={{ background: MODERATION_STATUS_META[event.status].color }}
                aria-hidden="true"
              />
              <div className="ach-mod-event-body">
                <span className="ach-mod-event-head">
                  <b>{MODERATION_STATUS_META[event.status].label}</b>
                  <span className="ach-mod-event-date">{formatModerationDate(event.atISO)}</span>
                </span>
                {event.note && <span className="ach-mod-event-note">{event.note}</span>}
                <span className="ach-mod-event-actor">{event.actor}</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="ach-mod-actions">
        {submission.status === 'needs-clarification' && (
          <button type="button" className="ach-primary-btn ach-primary-btn--sm" onClick={handleFix}>
            <RotateCcw size={14} /> Исправить и отправить снова
          </button>
        )}
        <button type="button" className="ach-ghost-btn" onClick={handleDownload}>
          <Download size={14} /> Скачать письмо
        </button>
        <button
          type="button"
          className="ach-ghost-btn"
          onClick={() => {
            playClick(soundEnabled)
            setConsoleOpen((v) => !v)
          }}
        >
          <Gavel size={14} /> {consoleOpen ? 'Скрыть консоль' : 'Консоль модератора'}
        </button>
        <span className="ach-mod-actions-spacer" />
        {confirmWithdraw ? (
          <span className="ach-confirm">
            Отозвать заявку?
            <button type="button" className="ach-confirm-yes" onClick={handleWithdraw}>
              Да
            </button>
            <button type="button" className="ach-confirm-no" onClick={() => setConfirmWithdraw(false)}>
              Нет
            </button>
          </span>
        ) : (
          submission.status === 'on-moderation' && (
            <button
              type="button"
              className="ach-ghost-btn"
              onClick={() => {
                playClick(soundEnabled)
                setConfirmWithdraw(true)
              }}
            >
              <X size={14} /> Отозвать
            </button>
          )
        )}
      </div>

      {consoleOpen && (
        <div className="ach-mod-console">
          <label className="ach-label" htmlFor={`mod-note-${submission.id}`}>
            Заключение модератора
          </label>
          <textarea
            id={`mod-note-${submission.id}`}
            className="ach-textarea"
            rows={2}
            maxLength={600}
            value={note}
            placeholder="Например: протокол совпадает с базой результатов организатора"
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="ach-mod-console-actions">
            <button type="button" className="ach-ghost-btn" onClick={() => handleVerdict('on-moderation')}>
              <Clock size={14} /> На модерации
            </button>
            <button
              type="button"
              className="ach-reject-btn"
              onClick={() => handleVerdict('needs-clarification')}
            >
              <AlertTriangle size={14} /> Требует уточнения
            </button>
            <button
              type="button"
              className="ach-approve-btn"
              onClick={() => handleVerdict('officially-verified')}
            >
              <Check size={14} /> Подтвердить официально
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="ach-mod-guide-toggle"
        onClick={() => {
          playClick(soundEnabled)
          setGuideOpen((v) => !v)
        }}
        aria-expanded={guideOpen}
      >
        <ChevronDown size={14} className={guideOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        Шаблон webhook / email-доставки
      </button>

      {guideOpen && (
        <div className="ach-mod-guide">
          <pre>{SETUP_GUIDE}</pre>
          {packageData && (
            <>
              <p className="ach-mod-guide-label">
                <Webhook size={12} /> JSON webhook-payload (фрагмент)
              </p>
              <pre>{JSON.stringify(packageData.webhook, null, 2).slice(0, 1600)}</pre>
            </>
          )}
        </div>
      )}
    </section>
  )
}
