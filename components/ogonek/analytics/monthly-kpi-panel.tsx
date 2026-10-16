'use client'

import { Check, Pencil, Plus, RotateCcw, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  computeAllKpiProgress,
  type KpiProgress,
  type KpiStatus,
} from '@/lib/ogonek/analytics'
import { formatKpiValue } from '@/lib/ogonek/kpi'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { Day, MonthlyKpi } from '@/lib/ogonek/types'
import { AddKpiModal } from './add-kpi-modal'

type Props = {
  days: Day[]
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const STATUS_META: Record<KpiStatus, { label: string; className: string }> = {
  done: { label: 'Цель закрыта', className: 'kpi-status--done' },
  'on-track': { label: 'В графике', className: 'kpi-status--ontrack' },
  behind: { label: 'Отстаёт', className: 'kpi-status--behind' },
  'at-risk': { label: 'В зоне риска', className: 'kpi-status--risk' },
}

function OverallRing({ percent, done, total }: { percent: number; done: number; total: number }) {
  const R = 34
  const C = 2 * Math.PI * R
  const dash = (percent / 100) * C
  return (
    <div className="kpi-overall-ring" role="img" aria-label={`Общий прогресс ${percent}%`}>
      <svg viewBox="0 0 80 80" width="80" height="80">
        <circle cx="40" cy="40" r={R} className="kpi-ring-track" />
        <circle
          cx="40"
          cy="40"
          r={R}
          className="kpi-ring-value"
          strokeDasharray={`${dash} ${C}`}
          strokeDashoffset={0}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div className="kpi-overall-ring__center">
        <b>{percent}%</b>
        <small>
          {done}/{total}
        </small>
      </div>
    </div>
  )
}

/**
 * Панель месячных KPI-целей: сверяет записанные гордости и благодарности
 * с планом месяца, показывает прогресс, темп и прогноз, позволяет создавать,
 * редактировать, отмечать и удалять цели.
 */
export function MonthlyKpiPanel({ days, onNotify, soundEnabled = true }: Props) {
  const {
    state,
    resetMonthlyKpis,
    toggleMonthlyKpiManual,
  } = useOgonekStore()

  const [now] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MonthlyKpi | null>(null)

  const kpis = state.monthlyKpis ?? []

  const { items, overallPercent, doneCount } = useMemo(
    () => computeAllKpiProgress(kpis, days, state.morningFocusHistory ?? {}, now),
    [kpis, days, state.morningFocusHistory, now]
  )

  const openCreate = () => {
    playClick(soundEnabled)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (kpi: MonthlyKpi) => {
    playClick(soundEnabled)
    setEditing(kpi)
    setModalOpen(true)
  }

  const handleManualToggle = (item: KpiProgress) => {
    const next = toggleMonthlyKpiManual(item.kpi.id)
    playSuccess(soundEnabled)
    onNotify(next ? `Цель «${item.kpi.title}» отмечена выполненной ✓` : `Отметка цели снята`)
  }

  const handleReset = () => {
    resetMonthlyKpis()
    playSuccess(soundEnabled)
    onNotify('Заводской набор месячных целей восстановлен')
  }

  return (
    <section className="kpi-panel" aria-labelledby="kpi-title">
      <div className="kpi-panel__head">
        <div className="kpi-panel__intro">
          <span className="kpi-panel__kicker">
            <Target size={14} /> Месячные KPI-цели
          </span>
          <b id="kpi-title">Сверка записанного с планом месяца</b>
          <small>
            Текущий месяц: {items.filter((i) => i.status === 'done').length} из {items.length} целей закрыто
          </small>
        </div>
        <OverallRing percent={overallPercent} done={doneCount} total={items.length} />
      </div>

      <div className="kpi-panel__actions">
        <button type="button" className="kpi-primary-btn" onClick={openCreate}>
          <Plus size={15} /> Добавить цель
        </button>
        <button type="button" className="kpi-ghost-btn" onClick={handleReset}>
          <RotateCcw size={14} /> Восстановить
        </button>
      </div>

      {items.length === 0 ? (
        <div className="kpi-empty">
          <span aria-hidden="true">✨</span>
          <p>
            Пока нет месячных целей. Добавь первую — аналитика начнёт сверять записанные гордости
            с твоим планом и показывать, успеваешь ли ты.
          </p>
          <button type="button" className="kpi-primary-btn" onClick={openCreate}>
            <Plus size={15} /> Создать первую цель
          </button>
        </div>
      ) : (
        <ul className="kpi-list">
          {items.map((item) => {
            const meta = STATUS_META[item.status]
            const manual = item.kpi.kind === 'custom'
            return (
              <li key={item.kpi.id} className={`kpi-row ${meta.className}`}>
                <div className="kpi-row__top">
                  <span className="kpi-row__emoji" aria-hidden="true">
                    {item.meta.emoji}
                  </span>
                  <div className="kpi-row__title">
                    <b>{item.kpi.title}</b>
                    <small>{item.verdict}</small>
                  </div>
                  <span className={`kpi-status ${meta.className}`}>{meta.label}</span>
                </div>

                <div className="kpi-row__progress" role="progressbar" aria-valuenow={item.percent} aria-valuemin={0} aria-valuemax={100}>
                  <span
                    className="kpi-row__progress-fill"
                    style={{ width: `${item.percent}%`, background: item.meta.color }}
                  />
                </div>

                <div className="kpi-row__meta">
                  <span className="kpi-row__values">
                    <b>{formatKpiValue(item.kpi.kind, item.current)}</b> из{' '}
                    {formatKpiValue(item.kpi.kind, item.target)}
                  </span>
                  <span className="kpi-row__percent">{item.percent}%</span>
                </div>

                <div className="kpi-row__controls">
                  {manual && (
                    <button
                      type="button"
                      className={`kpi-manual-toggle ${item.kpi.manualDone ? 'is-done' : ''}`}
                      onClick={() => handleManualToggle(item)}
                      aria-pressed={item.kpi.manualDone}
                    >
                      <Check size={14} /> {item.kpi.manualDone ? 'Выполнено' : 'Отметить выполненной'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="kpi-icon-btn"
                    onClick={() => openEdit(item.kpi)}
                    aria-label={`Изменить цель «${item.kpi.title}»`}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {modalOpen && (
        <AddKpiModal
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
          editing={editing}
        />
      )}
    </section>
  )
}
