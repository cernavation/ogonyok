'use client'

import { CalendarRange } from 'lucide-react'
import { ANALYTICS_PERIODS } from '@/lib/ogonek/analytics'
import type { AnalyticsPeriod } from '@/lib/ogonek/types'

type Props = {
  value: AnalyticsPeriod
  onChange: (period: AnalyticsPeriod) => void
}

/** Сегментированный переключатель периода аналитики: неделя / месяц / год */
export function AnalyticsPeriodSwitcher({ value, onChange }: Props) {
  return (
    <div className="analytics-period-switcher" role="tablist" aria-label="Период аналитики">
      <span className="analytics-period-switcher__label" aria-hidden="true">
        <CalendarRange size={14} /> Период
      </span>
      <div className="analytics-period-switcher__tabs">
        {ANALYTICS_PERIODS.map((period) => {
          const active = period.id === value
          return (
            <button
              key={period.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`analytics-period-btn ${active ? 'is-active' : ''}`}
              onClick={() => onChange(period.id)}
            >
              {period.label}
              <small>{period.short}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}
