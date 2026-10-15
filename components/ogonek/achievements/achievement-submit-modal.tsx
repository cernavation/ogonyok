'use client'

import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Link2,
  Loader2,
  Mail,
  Paperclip,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  DEFAULT_MODERATION_INBOX,
  buildModerationEmailPackage,
  buildModerationSubmissionPayload,
  channelLabel,
  makeTrackingCode,
} from '@/lib/ogonek/achievement-moderation'
import { computeAchievementProgress, getAchievementCategory } from '@/lib/ogonek/achievement-regulation'
import { downloadBlob } from '@/lib/ogonek/card-export'
import { buildEmlFile, collectSubmissionAttachments } from '@/lib/ogonek/achievement-submit-client'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { AchievementEvidenceRequirement, VerifiedAchievement } from '@/lib/ogonek/types'
import { ModalShell } from '../modal-shell'
import { EvidenceFilePreview } from './evidence-file-preview'
import { ModerationStatusPill } from './verification-badge'

type Props = {
  achievement: VerifiedAchievement
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

type Step = 'compose' | 'preview'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

function isValidUrl(value: string): boolean {
  return /^https?:\/\/\S+\.\S+/i.test(value.trim())
}

/**
 * ЭТАП 6 — Мастер отправки заявки модератору.
 * Пользователь дополняет комплект доказательств ссылками, пишет описание,
 * видит готовое письмо и отправляет пакет на почту/вебхук модератора.
 */
export function AchievementSubmitModal({ achievement, onClose, onNotify, soundEnabled = true }: Props) {
  const { state, attachAchievementEvidence, removeAchievementEvidence, startAchievementSubmission } =
    useOgonekStore()

  const category = getAchievementCategory(achievement.categoryId)
  const requirements = achievement.regulation?.requirements ?? []
  const progress = computeAchievementProgress(achievement)

  const [step, setStep] = useState<Step>('compose')
  const [description, setDescription] = useState(achievement.submission?.description ?? '')
  const [contactEmail, setContactEmail] = useState(
    achievement.submission?.contactEmail || `hello@${state.profile.username}.com`
  )
  const [linkRequirement, setLinkRequirement] = useState<string>(requirements[0]?.id ?? '')
  const [linkUrl, setLinkUrl] = useState('')
  const [attachments, setAttachments] = useState<{ fileName: string; size: number }[]>([])
  const [collecting, setCollecting] = useState(false)
  const [sending, setSending] = useState(false)

  const trackingCode = useMemo(() => makeTrackingCode(achievement.id), [achievement.id])

  const emailPackage = useMemo(() => {
    const payload = buildModerationSubmissionPayload({
      trackingCode,
      achievement,
      applicant: {
        displayName: state.profile.displayName,
        username: state.profile.username,
        contactEmail,
      },
      description,
      attachments: [],
    })
    return buildModerationEmailPackage(payload, DEFAULT_MODERATION_INBOX)
  }, [trackingCode, achievement, state.profile.displayName, state.profile.username, contactEmail, description])

  const handleAttachLink = () => {
    playClick(soundEnabled)
    if (!isValidUrl(linkUrl)) {
      onNotify('Нужна рабочая ссылка вида https://…')
      return
    }
    const requirementId = linkRequirement || requirements[0]?.id || 'unassigned'
    let host = 'ссылка'
    try {
      host = new URL(linkUrl.trim()).hostname
    } catch {
      host = 'ссылка'
    }
    attachAchievementEvidence(achievement.id, {
      requirementId,
      fileName: `${host} (ссылка)`,
      ref: linkUrl.trim(),
      mime: 'text/uri-list',
      size: 0,
    })
    setLinkUrl('')
    onNotify('Ссылка-доказательство прикреплена ✓')
  }

  const handleToPreview = async () => {
    if (description.trim().length < 10) {
      onNotify('Опиши достижение подробнее — минимум 10 символов')
      return
    }
    if (contactEmail.trim() && !isValidEmail(contactEmail)) {
      onNotify('Проверь контактную почту для ответа модератора')
      return
    }
    playClick(soundEnabled)
    setCollecting(true)
    try {
      const collected = await collectSubmissionAttachments(achievement.evidence)
      setAttachments(collected.map((att) => ({ fileName: att.fileName, size: att.size })))
    } catch {
      setAttachments([])
    } finally {
      setCollecting(false)
      setStep('preview')
    }
  }

  const handleDownload = () => {
    playClick(soundEnabled)
    try {
      const eml = buildEmlFile(emailPackage)
      downloadBlob(new Blob([eml], { type: 'message/rfc822' }), `ogonek-${trackingCode}.eml`)
      onNotify('Письмо-заявка сохранено в .eml')
    } catch {
      onNotify('Не удалось сохранить письмо')
    }
  }

  const handleSend = async () => {
    if (!progress.complete) {
      onNotify('Сначала закрой все обязательные доказательства')
      return
    }
    playClick(soundEnabled)
    setSending(true)
    try {
      const collected = await collectSubmissionAttachments(achievement.evidence)
      const result = await startAchievementSubmission(achievement.id, {
        description,
        contactEmail,
        attachments: collected,
      })
      if (result.ok) {
        playSuccess(soundEnabled)
        onNotify(
          result.delivery === 'sent'
            ? `Заявка ${result.trackingCode} отправлена модератору ✓`
            : `Заявка ${result.trackingCode} поставлена в очередь отправки`
        )
        onClose()
      } else {
        onNotify(result.error ?? 'Не удалось отправить заявку')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <ModalShell title="Отправка заявки модератору" onClose={onClose}>
      <div className="ach-sub">
        <ol className="ach-sub-steps" aria-label="Шаги отправки заявки">
          <li className={step === 'compose' ? 'is-active' : 'is-done'}>
            <span>1</span> Описание и доказательства
          </li>
          <li className={step === 'preview' ? 'is-active' : ''}>
            <span>2</span> Письмо модератору
          </li>
        </ol>

        <div className="ach-sub-brief">
          <span className="ach-sub-emoji" aria-hidden="true">
            {category.emoji}
          </span>
          <div className="min-w-0">
            <p className="ach-sub-title">{achievement.title}</p>
            <p className="ach-sub-meta">
              {category.label} ·{' '}
              {progress.requiredCovered}/{progress.requiredTotal} обязательных ·{' '}
              {achievement.evidence.length} файл(ов)
            </p>
          </div>
          <ModerationStatusPill status={achievement.submission?.status ?? 'on-moderation'} />
        </div>

        {step === 'compose' && (
          <div className="ach-sub-body">
            <section className="ach-sub-block">
              <h3 className="ach-sub-h">
                <Paperclip size={14} /> Комплект доказательств
              </h3>
              {achievement.evidence.length > 0 ? (
                <div className="ach-sub-evidence">
                  {achievement.evidence.map((file) => (
                    <EvidenceFilePreview
                      key={file.id}
                      file={file}
                      compact
                      onRemove={(id) => {
                        playClick(soundEnabled)
                        removeAchievementEvidence(achievement.id, id)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="ach-sub-empty">Пока ничего не прикреплено.</p>
              )}

              <div className="ach-sub-link">
                <Link2 size={15} className="ach-sub-link-icon" />
                <select
                  className="ach-select"
                  value={linkRequirement}
                  onChange={(e) => setLinkRequirement(e.target.value)}
                  aria-label="К какому требованию относится ссылка"
                >
                  {(requirements.length > 0 ? requirements : []).map(
                    (req: AchievementEvidenceRequirement) => (
                      <option key={req.id} value={req.id}>
                        {req.title}
                      </option>
                    )
                  )}
                  {requirements.length === 0 && <option value="unassigned">Без требования</option>}
                </select>
                <input
                  className="ach-input"
                  value={linkUrl}
                  placeholder="https://…ссылка на публикацию, протокол, профиль"
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <button type="button" className="ach-ghost-btn" onClick={handleAttachLink}>
                  Прикрепить ссылку
                </button>
              </div>
            </section>

            <label className="ach-field">
              <span className="ach-label">
                <FileText size={13} /> Описание заявки для модератора
              </span>
              <textarea
                className="ach-textarea"
                rows={4}
                maxLength={1200}
                value={description}
                placeholder="Что именно ты совершил, чем подтверждается, где проверять первоисточник…"
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="ach-counter">{description.length}/1200</span>
            </label>

            <label className="ach-field">
              <span className="ach-label">
                <Mail size={13} /> Почта для ответа модератора
              </span>
              <input
                type="email"
                className="ach-input"
                value={contactEmail}
                maxLength={160}
                placeholder="you@example.com"
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </label>

            {!progress.complete && (
              <p className="ach-sub-warn">
                <AlertTriangle size={13} /> Обязательных доказательств{' '}
                {progress.requiredCovered}/{progress.requiredTotal}. Без полного комплекта заявку
                отправить нельзя.
              </p>
            )}

            <div className="ach-wizard-footer">
              <button type="button" className="ach-ghost-btn" onClick={onClose}>
                Отмена
              </button>
              <button
                type="button"
                className="ach-primary-btn"
                onClick={handleToPreview}
                disabled={collecting || !progress.complete}
              >
                {collecting ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                Сформировать письмо
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="ach-sub-body">
            <button type="button" className="ach-wizard-back" onClick={() => setStep('compose')}>
              <ArrowLeft size={14} /> Изменить описание и доказательства
            </button>

            <div className="ach-sub-mailhead">
              <div>
                <span className="ach-sub-mailto">Кому</span>
                <b>{emailPackage.to}</b>
              </div>
              <div>
                <span className="ach-sub-mailto">От</span>
                <b>{state.profile.displayName} (@{state.profile.username})</b>
              </div>
              <div>
                <span className="ach-sub-mailto">Тема</span>
                <b>{emailPackage.subject}</b>
              </div>
            </div>

            <pre className="ach-sub-preview" aria-label="Предпросмотр письма">
              {emailPackage.text}
            </pre>

            <div className="ach-sub-attachbar">
              <span>
                <Paperclip size={13} /> Вложения: {attachments.length}
                {attachments.length > 0
                  ? ` · ${attachments.map((a) => a.fileName).slice(0, 3).join(', ')}`
                  : ' · файлы по ссылке'}
              </span>
              <span className="ach-sub-channel">Канал: {channelLabel('email')} / webhook / outbox</span>
            </div>

            <p className="ach-sub-note">
              <ShieldCheck size={13} /> Заявка получит трек-код и статус «На модерации». После проверки
              модератор вынесет вердикт, а при подтверждении ачивка получит золотой бейдж.
            </p>

            <div className="ach-wizard-footer">
              <button type="button" className="ach-ghost-btn" onClick={handleDownload}>
                <Download size={15} /> Скачать .eml
              </button>
              <button
                type="button"
                className="ach-primary-btn"
                onClick={handleSend}
                disabled={sending || !progress.complete}
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sending ? 'Отправляю…' : 'Отправить модератору'}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
