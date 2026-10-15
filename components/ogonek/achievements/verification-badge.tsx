'use client'

import { AlertTriangle, BadgeCheck, Clock, ShieldCheck } from 'lucide-react'
import { GOLD_VERIFICATION_BADGE, MODERATION_STATUS_META } from '@/lib/ogonek/achievement-moderation'
import type { ModerationStatus } from '@/lib/ogonek/types'

type BadgeSize = 'sm' | 'md' | 'lg'

type Props = {
  size?: BadgeSize
  withLabel?: boolean
  title?: string
}

const ICON_SIZE: Record<BadgeSize, number> = { sm: 14, md: 18, lg: 26 }

/**
 * ЭТАП 6 — Золотой бейдж официальной верификации.
 * Выдаётся ачивке, которую модератор подтвердил по первоисточнику.
 */
export function GoldVerificationBadge({ size = 'md', withLabel = false, title }: Props) {
  return (
    <span
      className={`ach-gold-badge ach-gold-badge--${size}${withLabel ? ' is-labeled' : ''}`}
      title={title ?? GOLD_VERIFICATION_BADGE.label}
      aria-label={GOLD_VERIFICATION_BADGE.label}
    >
      <BadgeCheck size={ICON_SIZE[size]} strokeWidth={2.4} />
      {withLabel && <span className="ach-gold-badge-label">{GOLD_VERIFICATION_BADGE.label}</span>}
    </span>
  )
}

type PillProps = {
  status: ModerationStatus
  withIcon?: boolean
}

/**
 * Плашка статуса заявки: «На модерации» / «Подтверждено официально» /
 * «Требует уточнения».
 */
export function ModerationStatusPill({ status, withIcon = true }: PillProps) {
  const meta = MODERATION_STATUS_META[status]
  return (
    <span
      className={`ach-mod-pill ach-mod-pill--${status}`}
      style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}18` }}
      title={meta.description}
    >
      {withIcon &&
        (status === 'officially-verified' ? (
          <ShieldCheck size={13} />
        ) : status === 'needs-clarification' ? (
          <AlertTriangle size={13} />
        ) : (
          <Clock size={13} />
        ))}
      {meta.label}
    </span>
  )
}
