'use client'

import {
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Gavel,
  RefreshCw,
  Send,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import {
  ACHIEVEMENT_STATUS_META,
  computeAchievementProgress,
  formatAchievementDate,
  getAchievementCategory,
} from '@/lib/ogonek/achievement-regulation'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { VerifiedAchievement } from '@/lib/ogonek/types'
import { AchievementEvidenceUploader } from './achievement-evidence-uploader'
import { AchievementModerationPanel } from './achievement-moderation-panel'
import { AchievementRegulationCard } from './achievement-regulation-card'
import { AchievementSubmitModal } from './achievement-submit-modal'
import { GoldVerificationBadge } from './verification-badge'

type Props = {
  achievement: VerifiedAchievement
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const STRICTNESS_LABEL = {
  basic: 'базовая проверка',
  strict: 'строгая проверка',
  forensic: 'форензическая проверка',
} as const

/**
 * Карточка одной верифицированной ачивки: статус, прогресс доказательств,
 * раскрываемый регламент и полный цикл верификации.
 */
export function AchievementCard({ achievement, onNotify, soundEnabled = true }: Props) {
  const {
    attachAchievementEvidence,
    removeAchievementEvidence,
    resolveAchievementReview,
    reopenAchievement,
    removeVerifiedAchievement,
  } = useOgonekStore()

  const [expanded, setExpanded] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const category = getAchievementCategory(achievement.categoryId)
  const status = ACHIEVEMENT_STATUS_META[achievement.status]
  const progress = computeAchievementProgress(achievement)

  const handleReview = (decision: 'verified' | 'rejected') => {
    playClick(soundEnabled)
    const ok = resolveAchievementReview(achievement.id, decision, reviewNote)
    if (ok) {
      if (decision === 'verified') playSuccess(soundEnabled)
      onNotify(decision === 'verified' ? 'Достижение подтверждено ✓' : 'Заявка отклонена с замечанием')
      setReviewOpen(false)
      setReviewNote('')
    }
  }

  const handleReopen = () => {
    playClick(soundEnabled)
    reopenAchievement(achievement.id)
    onNotify('Ачивка возвращена в черновики для правок')
  }

  const handleDelete = () => {
    playClick(soundEnabled)
    removeVerifiedAchievement(achievement.id)
    onNotify('Ачивка удалена')
  }

  return (
    <article className={`ach-card ach-card--${achievement.status}`}>
      <header className="ach-card-head">
        <span className="ach-card-emoji" aria-hidden="true">
          {category.emoji}
        </span>
        <div className="ach-card-titlebox">
          <div className="ach-card-titlerow">
            <h3 className="ach-card-title">{achievement.title}</h3>
            {achievement.submission?.status === 'officially-verified' ? (
              <span className="ach-card-verified ach-card-verified--gold">
                <GoldVerificationBadge size="sm" />
              </span>
            ) : achievement.status === 'verified' ? (
              <span className="ach-card-verified" title="Верифицировано" aria-label="Верифицировано">
                <BadgeCheck size={15} />
              </span>
            ) : null}
          </div>
          <p className="ach-card-sub">
            <span style={{ color: category.color }}>{category.short}</span>
            <span className="ach-dot">·</span>
            <CalendarDays size={12} /> {formatAchievementDate(achievement.achievedAtISO)}
          </p>
        </div>
        <span
          className="ach-status-pill"
          style={{ color: status.color, borderColor: `${status.color}55`, background: `${status.color}14` }}
        >
          {status.label}
        </span>
      </header>

      <div className="ach-card-progress">
        <div className="ach-card-progress-bar">
          <i
            style={{
              width: `${Math.round(progress.ratio * 100)}%`,
              background: progress.complete ? '#22c55e' : category.color,
            }}
          />
        </div>
        <span className="ach-card-progress-text">
          {progress.requiredCovered}/{progress.requiredTotal} обязательных · {progress.attached} файл(ов)
        </span>
      </div>

      {achievement.submission && (
        <AchievementModerationPanel
          achievement={achievement}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {achievement.status === 'verified' && achievement.reviewerNote && (
        <p className="ach-card-note ach-card-note--ok">
          <BadgeCheck size={13} /> {achievement.reviewerNote}
        </p>
      )}
      {achievement.status === 'rejected' && achievement.reviewerNote && (
        <p className="ach-card-note ach-card-note--bad">
          <X size={13} /> {achievement.reviewerNote}
        </p>
      )}

      <button
        type="button"
        className="ach-card-expand"
        onClick={() => {
          playClick(soundEnabled)
          setExpanded((v) => !v)
        }}
        aria-expanded={expanded}
      >
        <ChevronDown size={15} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        {expanded ? 'Скрыть регламент' : 'Регламент и доказательства'}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="ach-card-detail">
              {achievement.regulation ? (
                <>
                  <AchievementRegulationCard regulation={achievement.regulation} />
                  <AchievementEvidenceUploader
                    requirements={achievement.regulation.requirements}
                    evidence={achievement.evidence}
                    onAttach={(file) => attachAchievementEvidence(achievement.id, file)}
                    onRemove={(evidenceId) => {
                      playClick(soundEnabled)
                      removeAchievementEvidence(achievement.id, evidenceId)
                    }}
                    onNotify={onNotify}
                    soundEnabled={soundEnabled}
                    readOnly={achievement.status === 'verified' || achievement.status === 'submitted'}
                  />
                </>
              ) : (
                <p className="ach-card-empty">Регламент для этой ачивки ещё не построен.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {achievement.status === 'submitted' && !achievement.submission && (
        <div className="ach-card-review">
          {!reviewOpen ? (
            <button type="button" className="ach-ghost-btn" onClick={() => setReviewOpen(true)}>
              <Gavel size={14} /> Панель верификатора
            </button>
          ) : (
            <div className="ach-review-panel">
              <label className="ach-label" htmlFor={`review-${achievement.id}`}>
                Заключение верификатора
              </label>
              <textarea
                id={`review-${achievement.id}`}
                className="ach-textarea"
                rows={2}
                value={reviewNote}
                maxLength={600}
                placeholder="Например: протокол и видео совпадают, дистанция полная"
                onChange={(e) => setReviewNote(e.target.value)}
              />
              <div className="ach-review-actions">
                <button type="button" className="ach-reject-btn" onClick={() => handleReview('rejected')}>
                  <X size={14} /> Отклонить
                </button>
                <button type="button" className="ach-approve-btn" onClick={() => handleReview('verified')}>
                  <Check size={14} /> Подтвердить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="ach-card-actions">
        {achievement.status === 'draft' && (
          <button
            type="button"
            className="ach-primary-btn ach-primary-btn--sm"
            onClick={() => {
              playClick(soundEnabled)
              setSubmitOpen(true)
            }}
            disabled={!progress.complete}
            title={progress.complete ? 'Отправить заявку модератору на почту' : 'Не хватает обязательных доказательств'}
          >
            <Send size={14} /> Отправить модератору
          </button>
        )}
        {achievement.status === 'submitted' && (
          <button type="button" className="ach-ghost-btn" onClick={handleReopen}>
            <Undo2 size={14} /> Отменить отправку
          </button>
        )}
        {(achievement.status === 'verified' || achievement.status === 'rejected') && (
          <button type="button" className="ach-ghost-btn" onClick={handleReopen}>
            <RefreshCw size={14} /> Открыть заново
          </button>
        )}

        <span className="ach-card-actions-spacer" />

        {confirmDelete ? (
          <span className="ach-confirm">
            Удалить?
            <button type="button" className="ach-confirm-yes" onClick={handleDelete}>
              Да
            </button>
            <button type="button" className="ach-confirm-no" onClick={() => setConfirmDelete(false)}>
              Нет
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="ach-icon-btn"
            onClick={() => {
              playClick(soundEnabled)
              setConfirmDelete(true)
            }}
            aria-label="Удалить ачивку"
            title="Удалить ачивку"
          >
            <Trash2 size={15} />
          </button>
        )}

        {achievement.regulation && (
          <span className="ach-card-mode" title="Строгость проверки">
            {STRICTNESS_LABEL[achievement.regulation.strictness]}
          </span>
        )}
      </footer>

      <AnimatePresence>
        {submitOpen && (
          <AchievementSubmitModal
            achievement={achievement}
            onClose={() => setSubmitOpen(false)}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </article>
  )
}
