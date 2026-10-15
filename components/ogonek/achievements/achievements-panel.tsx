'use client'

import { BadgeCheck, Clock, FileText, Plus, Trophy, type LucideIcon } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { ACHIEVEMENT_STATUS_META } from '@/lib/ogonek/achievement-regulation'
import {
  MODERATION_STATUS_META,
  formatModerationDate,
  summarizeModeration,
} from '@/lib/ogonek/achievement-moderation'
import { playClick } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { AchievementStatus } from '@/lib/ogonek/types'
import { AddAchievementModal } from './add-achievement-modal'
import { AchievementCard } from './achievement-card'
import { GoldVerificationBadge } from './verification-badge'

type Props = {
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

type FilterId = 'all' | AchievementStatus

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'verified', label: 'Подтверждённые' },
  { id: 'submitted', label: 'На проверке' },
  { id: 'draft', label: 'Черновики' },
  { id: 'rejected', label: 'Отклонённые' },
]

/**
 * ЭТАП 5 — Панель верифицированных ачивок профиля.
 * Живёт во вкладке «Ачивки» профиля и умеет: добавлять ачивку через ИИ-мастер,
 * собирать доказательства, отправлять на верификацию и выносить вердикт.
 */
export function AchievementsPanel({ onNotify, soundEnabled = true }: Props) {
  const { state } = useOgonekStore()
  const [filter, setFilter] = useState<FilterId>('all')
  const [addOpen, setAddOpen] = useState(false)

  const achievements = state.verifiedAchievements ?? []

  const counts = useMemo(() => {
    const base: Record<AchievementStatus, number> = {
      draft: 0,
      submitted: 0,
      verified: 0,
      rejected: 0,
    }
    for (const a of achievements) base[a.status] += 1
    return base
  }, [achievements])

  const visible = useMemo(
    () => (filter === 'all' ? achievements : achievements.filter((a) => a.status === filter)),
    [achievements, filter]
  )

  const moderation = useMemo(() => summarizeModeration(achievements), [achievements])

  const stats: { icon: LucideIcon; color: string; label: string; value: number }[] = [
    { icon: BadgeCheck, color: '#22c55e', label: 'Подтверждено', value: counts.verified },
    { icon: Clock, color: '#1d9bf0', label: 'На проверке', value: counts.submitted },
    { icon: FileText, color: '#71767b', label: 'Черновики', value: counts.draft },
  ]

  return (
    <div className="ach-panel">
      <div className="ach-panel-head">
        <h2 className="ach-panel-title">
          <Trophy size={18} className="text-amber-400" />
          Верифицированные ачивки
          <span className="ach-panel-count">
            {counts.verified}/{achievements.length}
          </span>
        </h2>
        <button
          type="button"
          className="ach-primary-btn ach-primary-btn--sm"
          onClick={() => {
            playClick(soundEnabled)
            setAddOpen(true)
          }}
        >
          <Plus size={15} /> Добавить ачивку
        </button>
      </div>

      <p className="ach-panel-lead">
        ИИ-ассистент анализирует твоё достижение и выдаёт строгий регламент: какие именно
        файлы-доказательства нужно приложить, чтобы ачивка была подтверждена.
      </p>

      {achievements.length > 0 && (
        <div className="ach-mod-summary">
          <span className="ach-mod-summary-gold">
            <GoldVerificationBadge size="sm" />
            {moderation.officiallyVerified} официально
          </span>
          <span
            className="ach-mod-summary-item"
            style={{ color: MODERATION_STATUS_META['on-moderation'].color }}
          >
            {moderation.onModeration} на модерации
          </span>
          <span
            className="ach-mod-summary-item"
            style={{ color: MODERATION_STATUS_META['needs-clarification'].color }}
          >
            {moderation.needsClarification} требуют уточнения
          </span>
          {moderation.lastSubmittedAtISO && (
            <span className="ach-mod-summary-last">
              Последняя заявка: {formatModerationDate(moderation.lastSubmittedAtISO)}
            </span>
          )}
        </div>
      )}

      {achievements.length > 0 && (
        <div className="ach-stat-row">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="ach-stat">
                <Icon size={15} style={{ color: s.color }} />
                <span className="ach-stat-value">{s.value}</span>
                <span className="ach-stat-label">{s.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {achievements.length > 0 && (
        <div className="ach-filter-row" role="tablist" aria-label="Фильтр ачивок">
          {FILTERS.map((f) => {
            const count = f.id === 'all' ? achievements.length : counts[f.id]
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`ach-filter ${active ? 'is-active' : ''}`}
                onClick={() => {
                  playClick(soundEnabled)
                  setFilter(f.id)
                }}
              >
                {f.label}
                <span className="ach-filter-count">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {visible.length > 0 ? (
        <div className="ach-list">
          {visible.map((ach) => (
            <AchievementCard
              key={ach.id}
              achievement={ach}
              onNotify={onNotify}
              soundEnabled={soundEnabled}
            />
          ))}
        </div>
      ) : achievements.length === 0 ? (
        <div className="ach-empty">
          <span className="ach-empty-emoji" aria-hidden="true">
            🏅
          </span>
          <h3>Пока нет верифицированных ачивок</h3>
          <p>
            Добавь первое достижение — спортивный рекорд, бизнес-успех, обучение или серию
            дисциплины. ИИ подскажет, чем его доказать.
          </p>
          <button
            type="button"
            className="ach-primary-btn"
            onClick={() => {
              playClick(soundEnabled)
              setAddOpen(true)
            }}
          >
            <Plus size={16} /> Добавить ачивку
          </button>
        </div>
      ) : (
        <div className="ach-empty ach-empty--compact" role="status">
          <p>В этой категории пока нет ачивок со статусом «{ACHIEVEMENT_STATUS_META[filter as AchievementStatus]?.label}».</p>
        </div>
      )}

      <AnimatePresence>
        {addOpen && (
          <AddAchievementModal
            onClose={() => setAddOpen(false)}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
