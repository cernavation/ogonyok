'use client'

import {
  AlertTriangle,
  BrainCircuit,
  Clock,
  Landmark,
  ShieldCheck,
  Sparkles,
  Gauge,
} from 'lucide-react'
import { getAchievementCategory } from '@/lib/ogonek/achievement-regulation'
import type { AchievementRegulation } from '@/lib/ogonek/types'

type Props = {
  regulation: AchievementRegulation
}

const STRICTNESS_LABEL: Record<AchievementRegulation['strictness'], string> = {
  basic: 'Базовая',
  strict: 'Строгая',
  forensic: 'Форензическая',
}

const STRICTNESS_COLOR: Record<AchievementRegulation['strictness'], string> = {
  basic: '#22c55e',
  strict: '#f59e0b',
  forensic: '#ef4444',
}

/**
 * Карточка строгого регламента доказательств, выданного ИИ-ассистентом.
 * Отображает суть, требования верификатора и критерии отказа.
 */
export function AchievementRegulationCard({ regulation }: Props) {
  const category = getAchievementCategory(regulation.categoryId)
  const sourceLabel = regulation.aiGenerated ? 'ИИ-регламент' : 'Регламент (офлайн)'
  const SourceIcon = regulation.aiGenerated ? Sparkles : BrainCircuit

  return (
    <div className="ach-reg">
      <div className="ach-reg-head">
        <span className="ach-reg-cat" style={{ color: category.color, borderColor: `${category.color}55` }}>
          {category.emoji} {category.short}
        </span>
        <span
          className="ach-reg-source"
          title={regulation.aiGenerated ? 'Регламент построен ИИ-ассистентом' : 'Регламент построен локально (офлайн)'}
        >
          <SourceIcon size={13} /> {sourceLabel}
        </span>
        <span
          className="ach-reg-strict"
          style={{ color: STRICTNESS_COLOR[regulation.strictness], borderColor: `${STRICTNESS_COLOR[regulation.strictness]}55` }}
          title="Строгость проверки доказательств"
        >
          <Gauge size={13} /> {STRICTNESS_LABEL[regulation.strictness]}
        </span>
      </div>

      {regulation.interpretedTopic && (
        <p className="ach-reg-topic">
          <span className="ach-reg-topic-label">Тема:</span> {regulation.interpretedTopic}
        </p>
      )}

      <p className="ach-reg-summary">{regulation.summary}</p>

      <dl className="ach-reg-meta">
        <div>
          <dt>
            <Landmark size={13} /> Верификатор
          </dt>
          <dd>{regulation.verifier}</dd>
        </div>
        <div>
          <dt>
            <Clock size={13} /> Срок актуальности
          </dt>
          <dd>{regulation.freshnessRule}</dd>
        </div>
      </dl>

      {regulation.rejectionCriteria.length > 0 && (
        <details className="ach-reg-reject">
          <summary>
            <AlertTriangle size={14} /> Критерии отказа ({regulation.rejectionCriteria.length})
          </summary>
          <ul>
            {regulation.rejectionCriteria.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="ach-reg-foot">
        <ShieldCheck size={13} /> Комплект считается полным только после закрытия всех обязательных пунктов.
      </p>
    </div>
  )
}
