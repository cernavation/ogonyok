'use client'

import { Check, Flame, Target, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ModalShell } from './modal-shell'
import {
  FOCUS_KEEP_THRESHOLD,
  countActiveFocusSteps,
  countFulfilledSteps,
  computeFocusFlame,
  focusFlameTier,
  focusVerdict,
} from '@/lib/ogonek/morning-focus'
import { playClick } from '@/lib/ogonek/sound'
import type { MorningFocusRecord, MorningFocusStepStatus } from '@/lib/ogonek/types'

type FilterId = 'all' | 'kept' | 'lost' | 'open'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'kept', label: 'Сдержанные' },
  { id: 'lost', label: 'Провалы' },
  { id: 'open', label: 'Без сверки' },
]

const STEP_DOT: Record<MorningFocusStepStatus, string> = {
  done: '#00ba7c',
  missed: '#f91880',
  pending: '#4b5563',
}

type Props = {
  history: Record<string, MorningFocusRecord>
  todayKey: string
  onClose: () => void
  onRemove: (dateKey: string) => void
  notify: (msg: string) => void
  soundEnabled?: boolean
}

function formatDayLabel(dateKey: string): string {
  try {
    const d = new Date(`${dateKey}T12:00:00`)
    return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return dateKey
  }
}

/**
 * ЭТАП 10 — История утренних фокусов по дням: проценты выполнения,
 * отметки каждого шага и статистика «Огонька фокуса».
 */
export function FocusHistoryModal({
  history,
  todayKey,
  onClose,
  onRemove,
  notify,
  soundEnabled = true,
}: Props) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const stats = useMemo(() => computeFocusFlame(history, todayKey), [history, todayKey])
  const tier = focusFlameTier(stats.currentStreak)

  const entries = useMemo(
    () => Object.values(history).sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [history]
  )

  const filtered = useMemo(() => {
    return entries.filter((r) => {
      if (filter === 'kept') return r.completionPercent >= FOCUS_KEEP_THRESHOLD
      if (filter === 'lost') return Boolean(r.reviewedAtISO) && r.completionPercent < FOCUS_KEEP_THRESHOLD
      if (filter === 'open') return !r.reviewedAtISO
      return true
    })
  }, [entries, filter])

  const handleRemove = (dateKey: string) => {
    if (pendingDelete !== dateKey) {
      setPendingDelete(dateKey)
      playClick(soundEnabled)
      return
    }
    onRemove(dateKey)
    setPendingDelete(null)
    playClick(soundEnabled)
    notify('Запись утреннего фокуса удалена')
  }

  return (
    <ModalShell title="История утренних фокусов" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Статистика огонька фокуса */}
        <div
          className="rounded-2xl border p-4 flex items-center gap-4"
          style={{ borderColor: 'var(--line, #2f3336)', background: 'rgba(255,255,255,0.02)' }}
        >
          <span
            className="inline-flex items-center justify-center w-12 h-12 rounded-full flex-none"
            style={{ background: `radial-gradient(circle, ${tier.color}33, transparent 70%)` }}
            aria-hidden="true"
          >
            <Flame size={28} strokeWidth={1.6} style={{ color: tier.color, fill: `${tier.color}33` }} />
          </span>
          <div className="grid grid-cols-3 gap-3 flex-1">
            <Stat label="Серия" value={`${stats.currentStreak} дн.`} color={tier.color} />
            <Stat label="Сдержано" value={`${stats.totalFulfilled} из ${stats.totalPromises}`} />
            <Stat label="Средний" value={`${stats.avgPercent}%`} />
          </div>
        </div>
        <p className="text-[12px] -mt-1" style={{ color: 'var(--muted)' }}>
          {tier.label} · лучшая серия {stats.bestStreak} дн. · сверено дней: {stats.reviewedDays} из {stats.totalDays}
        </p>

        {/* Фильтры */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setFilter(f.id); playClick(soundEnabled) }}
              className="text-[12px] font-bold px-3 py-1.5 rounded-full border transition-colors"
              style={{
                borderColor: filter === f.id ? 'var(--blue, #1d9bf0)' : 'var(--line, #2f3336)',
                color: filter === f.id ? 'var(--blue, #1d9bf0)' : 'var(--muted, #71767b)',
                background: filter === f.id ? 'rgba(29,155,240,0.1)' : 'transparent',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Список дней */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Target size={26} style={{ color: 'var(--muted, #71767b)' }} aria-hidden="true" />
            <p className="text-[14px] mt-2" style={{ color: 'var(--muted, #71767b)' }}>
              Здесь пока нет подходящих дней
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5 list-none m-0 p-0 max-h-[52vh] overflow-y-auto">
            {filtered.map((record) => (
              <HistoryRow
                key={record.dateKey}
                record={record}
                isToday={record.dateKey === todayKey}
                pendingDelete={pendingDelete === record.dateKey}
                onRemove={() => handleRemove(record.dateKey)}
              />
            ))}
          </ul>
        )}
      </div>
    </ModalShell>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--muted, #71767b)' }}>
        {label}
      </p>
      <p className="text-[15px] font-extrabold tabular-nums truncate" style={{ color: color ?? 'var(--text, #e7e9ea)' }}>
        {value}
      </p>
    </div>
  )
}

function HistoryRow({
  record,
  isToday,
  pendingDelete,
  onRemove,
}: {
  record: MorningFocusRecord
  isToday: boolean
  pendingDelete: boolean
  onRemove: () => void
}) {
  const activeCount = countActiveFocusSteps(record.focus)
  const fulfilled = countFulfilledSteps(record.steps)
  const verdict = focusVerdict(record.completionPercent)
  const barColor =
    verdict.tone === 'elite' ? '#00ba7c' : verdict.tone === 'good' ? '#1d9bf0' : verdict.tone === 'mid' ? '#ffad5a' : '#f91880'

  return (
    <li
      className="rounded-2xl border p-3.5"
      style={{ borderColor: 'var(--line, #2f3336)', background: 'rgba(255,255,255,0.015)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[13px] font-bold capitalize truncate" style={{ color: 'var(--text, #e7e9ea)' }}>
          {formatDayLabel(record.dateKey)}
        </span>
        {isToday && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-none" style={{ color: '#1d9bf0', background: 'rgba(29,155,240,0.12)' }}>
            Сегодня
          </span>
        )}
        <span className="text-[13px] font-extrabold tabular-nums ml-auto flex-none" style={{ color: barColor }}>
          {record.completionPercent}%
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить запись утреннего фокуса"
          className="w-7 h-7 rounded-full flex items-center justify-center flex-none transition-colors"
          style={{
            color: pendingDelete ? '#f91880' : 'var(--muted, #71767b)',
            background: pendingDelete ? 'rgba(249,24,128,0.14)' : 'transparent',
          }}
          title={pendingDelete ? 'Нажми ещё раз для удаления' : 'Удалить день'}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="h-1 rounded-full overflow-hidden mb-2.5" style={{ background: 'var(--line, #2f3336)' }} aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${record.completionPercent}%`, background: barColor }} />
      </div>

      <div className="flex flex-col gap-1.5">
        {record.focus.map((text, i) => {
          const status = record.steps[i as 0 | 1 | 2]
          if (text.trim().length === 0) return null
          return (
            <div key={i} className="flex items-center gap-2">
              {status === 'done' ? (
                <Check size={13} strokeWidth={3} style={{ color: STEP_DOT.done }} className="flex-none" aria-hidden="true" />
              ) : status === 'missed' ? (
                <X size={13} strokeWidth={3} style={{ color: STEP_DOT.missed }} className="flex-none" aria-hidden="true" />
              ) : (
                <span className="w-[13px] h-[13px] rounded-full border flex-none" style={{ borderColor: STEP_DOT.pending }} aria-hidden="true" />
              )}
              <span
                className="text-[13px] leading-snug truncate"
                style={{
                  color: status === 'missed' ? 'var(--muted, #71767b)' : 'var(--text, #e7e9ea)',
                  textDecoration: status === 'missed' ? 'line-through' : 'none',
                }}
              >
                {text}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] mt-2" style={{ color: 'var(--muted, #71767b)' }}>
        {record.reviewedAtISO
          ? `Сверено · ${fulfilled} из ${activeCount} · ${verdict.label}`
          : 'Вечерняя сверка ещё не завершена'}
      </p>
    </li>
  )
}
