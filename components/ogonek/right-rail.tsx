'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, CheckCircle2, Circle, Flame, Search, Sparkles, Target } from 'lucide-react'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import { addDaysToLocalDay, computeWeeklyMilestoneProgress, TZ, toLocalDay, type StreakStatus } from '@/lib/ogonek/streak'
import type { Day, ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { FlameIcon } from './flame-icon'
import { ActiveFriendsWidget } from './active-friends-widget'

type Props = {
  onNavigate: (view: ViewId) => void
  onCompose?: () => void
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
  isDemo?: boolean
  onNotify?: (message: string) => void
  onOpenFriends?: () => void
  soundEnabled?: boolean
  className?: string
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

function dayScoreOf(day: Day): number | null {
  const direct = day.aiScore ?? day.score
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
    return direct
  }
  const prideScores = (day.prides || [])
    .map((p) => p.score ?? p.scale)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
  if (prideScores.length === 0) return null
  return prideScores.reduce((acc, v) => acc + v, 0) / prideScores.length
}

export function RightRail({
  onNavigate,
  streak = CURRENT_DAY,
  streakStatus = 'safe',
  hoursLeft,
  onNotify,
  onOpenFriends,
  soundEnabled = true,
  className,
}: Props) {
  const { state } = useOgonekStore()
  const railRef = useRef<HTMLElement>(null)
  const [stickyTop, setStickyTop] = useState(0)

  // Умный X/Twitter скролл: колонка едет синхронно с лентой,
  // пока нижний край не упрётся в низ окна (с pb-6), после чего мягко фиксируется.
  useEffect(() => {
    const el = railRef.current
    if (!el || typeof window === 'undefined') return

    const updateTop = () => {
      const vh = window.innerHeight
      const rh = el.offsetHeight
      setStickyTop(rh > vh ? vh - rh : 0)
    }

    updateTop()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateTop) : null
    ro?.observe(el)
    window.addEventListener('resize', updateTop)

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', updateTop)
    }
  }, [state.days.length, state.friendIds.length, state.morningIntentions, state.morningFocusHistory])

  const tz = state.streak?.timeZone || TZ

  const weeklyRhythm = useMemo(() => {
    const now = new Date()
    const todayKey = toLocalDay(now, tz)

    // Определяем день недели для todayKey (0 = Пн ... 6 = Вс)
    const [y, m, d] = todayKey.split('-').map(Number)
    const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    const jsDay = noonUtc.getUTCDay() // 0 = Sun ... 6 = Sat
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay

    const closedDayKeys = new Set<string>()
    const dayMap = new Map<string, Day>()
    for (const entry of state.days || []) {
      const iso = entry.dateISO
      if (!iso) continue
      const parsed = new Date(iso)
      if (Number.isNaN(parsed.getTime())) continue
      const key = toLocalDay(parsed, tz)
      closedDayKeys.add(key)
      if (!dayMap.has(key)) dayMap.set(key, entry)
    }

    const weekDays = WEEKDAY_LABELS.map((label, idx) => {
      const key = addDaysToLocalDay(todayKey, mondayOffset + idx, tz)
      return {
        key,
        label,
        isToday: key === todayKey,
        closed: closedDayKeys.has(key),
      }
    })

    // Средний AI/дневной балл за последние 7 календарных дней
    const scoresLast7: number[] = []
    for (let offset = 0; offset < 7; offset += 1) {
      const key = addDaysToLocalDay(todayKey, -offset, tz)
      const entry = dayMap.get(key)
      if (!entry) continue
      const score = dayScoreOf(entry)
      if (score !== null) scoresLast7.push(score)
    }
    const avgScore =
      scoresLast7.length > 0
        ? (scoresLast7.reduce((sum, v) => sum + v, 0) / scoresLast7.length).toFixed(1)
        : null

    const closedThisWeekCount = weekDays.filter((item) => item.closed).length
    const progress = computeWeeklyMilestoneProgress(streak)

    return {
      todayKey,
      weekDays,
      avgScore,
      closedThisWeekCount,
      progress,
    }
  }, [state.days, streak, tz])

  const todayFocusItems = useMemo(() => {
    const todayKey = weeklyRhythm.todayKey
    const historyEntry = state.morningFocusHistory?.[todayKey]
    const rawSteps = historyEntry?.focus ?? state.morningIntentions?.[todayKey]
    const statuses = historyEntry?.steps ?? ['pending', 'pending', 'pending']

    if (!rawSteps || !Array.isArray(rawSteps)) return { items: [], extraCount: 0 }

    const active = rawSteps
      .map((text, idx) => ({
        id: `${todayKey}-${idx}`,
        text: typeof text === 'string' ? text.trim() : '',
        status: statuses[idx] || 'pending',
      }))
      .filter((item) => item.text.length > 0)

    return {
      items: active.slice(0, 2),
      extraCount: Math.max(0, active.length - 2),
    }
  }, [state.morningFocusHistory, state.morningIntentions, weeklyRhythm.todayKey])

  return (
    <aside
      ref={railRef}
      style={{ top: `${stickyTop}px` }}
      className={`right-rail w-[350px] shrink-0 sticky self-start select-none pl-6 pr-4 pt-3 pb-6 hidden lg:flex flex-col gap-3 z-20 ${className || ''}`}
      aria-label="Дополнительная информация"
    >
      {/* Блок 1: Поиск по дневнику */}
      <div className="x-search-bar" role="search">
        <div
          className="flex items-center gap-3 bg-black hover:bg-white/[0.03] rounded-full px-4 py-2.5 cursor-pointer transition-colors duration-150 border border-white/[0.12] focus-within:border-[#d76737]/70 min-h-[42px]"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('explore')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onNavigate('explore')
            }
          }}
          aria-label="Перейти к поиску"
        >
          <Search size={18} className="text-[var(--muted)] flex-none" />
          <span className="text-[var(--muted)] text-[15px] select-none font-normal">
            Поиск по дневнику
          </span>
        </div>
      </div>

      {/* Блок 2: Твой стрик */}
      <section
        data-tour="nav-streak"
        className="rounded-2xl border border-white/[0.11] bg-black p-4 transition-colors"
        aria-labelledby="streak-title"
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            id="streak-title"
            className="text-[var(--text)] text-[16px] font-bold tracking-tight"
          >
            Твой стрик
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="text-[13px] font-normal text-[var(--muted)] hover:text-white flex items-center gap-1.5 transition-colors min-h-[32px] px-2.5 py-1 rounded-full hover:bg-white/[0.04] cursor-pointer"
          >
            <BarChart3 size={14} />
            <span>Статистика</span>
          </button>
        </div>

        <div className="flex items-center gap-3.5 pt-0.5">
          <FlameIcon status={streakStatus} hoursLeft={hoursLeft} size={42} />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[var(--text)] text-[32px] font-black leading-none tracking-tight">
                {streak}
              </span>
              <span className="text-[var(--muted)] text-[13px] font-normal">
                дней закрыто
              </span>
            </div>
            <p className="text-[var(--muted)] text-[13px] font-normal mt-1">
              Winlog не сгорает при пропуске
            </p>
          </div>
        </div>

        {hoursLeft != null && hoursLeft <= 24 && (
          <div className="mt-3 flex items-center gap-2 text-[13px] font-medium bg-white/[0.08] border border-white/[0.12] text-white/80 px-3 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#d76737]" />
            <span>Осталось {hoursLeft}ч до напоминания</span>
          </div>
        )}
      </section>

      {/* Блок 3: Ритм недели (сразу под стриком — единая логика прогресса) */}
      <section
        onClick={() => onNavigate('analytics')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onNavigate('analytics')
          }
        }}
        className="rounded-2xl border border-white/[0.11] bg-black hover:border-white/[0.2] p-4 transition-colors cursor-pointer"
        aria-labelledby="weekly-rhythm-title"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2
            id="weekly-rhythm-title"
            className="flex items-center gap-1.5 text-[var(--text)] text-[15px] font-bold tracking-tight"
          >
            <Flame size={16} className="text-white/45" aria-hidden="true" />
            <span>Ритм недели</span>
          </h2>
          <span className="text-[12px] font-semibold text-[var(--muted)]">
            {weeklyRhythm.closedThisWeekCount}/7 дн.
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {weeklyRhythm.weekDays.map((d) => (
            <div key={d.key} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  d.closed
                    ? 'bg-white/[0.16] border border-white/[0.22] text-white'
                    : d.isToday
                      ? 'bg-white/[0.03] border border-dashed border-[#d76737]/70 text-[var(--muted)]'
                      : 'bg-white/[0.03] border border-white/[0.1] text-transparent'
                }`}
                title={`${d.label}: ${d.closed ? 'день закрыт' : 'нет записи'}`}
              >
                {d.closed ? (
                  <Flame size={13} className="fill-white text-white" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]/40" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold ${
                  d.isToday ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                }`}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[12px] text-[var(--muted)] mb-2">
          <span>Средний балл (7 дн.)</span>
          <span className="font-bold text-[var(--text)] inline-flex items-center gap-1">
            <Sparkles size={12} className="text-white/45" />
            {weeklyRhythm.avgScore ? `${weeklyRhythm.avgScore} / 10` : '—'}
          </span>
        </div>

        <div className="pt-2.5 border-t border-white/[0.08] flex flex-col gap-2.5">
          {weeklyRhythm.progress.bigMilestone && (
            <div
              data-testid="rhythm-big-milestone"
              title={weeklyRhythm.progress.bigMilestone.tooltip}
            >
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-[var(--muted)] font-medium">
                  {weeklyRhythm.progress.bigMilestone.labelLeft}
                </span>
                <span className="text-white font-semibold tabular-nums">
                  {weeklyRhythm.progress.bigMilestone.labelRight}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/45 transition-all duration-300"
                  style={{ width: `${weeklyRhythm.progress.bigMilestone.percent}%` }}
                />
              </div>
            </div>
          )}

          <div
            data-testid="rhythm-hundred-progress"
            title={weeklyRhythm.progress.hundredMilestone.tooltip}
          >
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-[var(--muted)] font-medium">
                {weeklyRhythm.progress.hundredMilestone.labelLeft}
              </span>
              <span className="text-white font-semibold tabular-nums">
                {weeklyRhythm.progress.hundredMilestone.labelRight}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-white/90 transition-all duration-300"
                style={{ width: `${weeklyRhythm.progress.hundredMilestone.percent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Блок 4: Друзья */}
      {onNotify && (
        <ActiveFriendsWidget
          onNavigate={onNavigate}
          onNotify={onNotify}
          onOpenFriends={onOpenFriends}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Блок 5: Фокус и намерения на сегодня */}
      <section
        className="rounded-2xl border border-white/[0.11] bg-black p-4 transition-colors"
        aria-labelledby="focus-widget-title"
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2
            id="focus-widget-title"
            className="flex items-center gap-1.5 text-[var(--text)] text-[15px] font-bold tracking-tight cursor-pointer hover:text-white transition-colors"
            onClick={() => onNavigate('intentions')}
          >
            <Target size={16} className="text-white/45" aria-hidden="true" />
            <span>Фокус и намерения</span>
          </h2>
          {todayFocusItems.items.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('intentions')}
              className="text-[12px] font-semibold text-[var(--muted)] hover:text-white transition-colors cursor-pointer"
            >
              Изменить
            </button>
          )}
        </div>

        {todayFocusItems.items.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] text-[var(--muted)] leading-relaxed">
              Задай 1–2 главных намерения на сегодня, чтобы держать фокус и закрыть день с результатом.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('intentions')}
              className="w-full min-h-[38px] rounded-full bg-white/[0.06] border border-white/[0.14] text-white hover:bg-white/[0.12] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Target size={14} className="text-white/70" />
              <span>Задать фокус дня</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayFocusItems.items.map((item) => {
              const isDone = item.status === 'done'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate('intentions')}
                  className="w-full flex items-start gap-2.5 p-2.5 rounded-xl bg-black hover:bg-white/[0.04] border border-white/[0.1] text-left transition-colors cursor-pointer"
                >
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={16} className="text-white/40 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-[13px] leading-snug break-words flex-1 ${
                      isDone ? 'line-through text-[var(--muted)]' : 'text-[var(--text)] font-medium'
                    }`}
                  >
                    {item.text}
                  </span>
                </button>
              )
            })}
            {todayFocusItems.extraCount > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('intentions')}
                className="text-[12px] font-semibold text-white/60 hover:text-white hover:underline px-1 cursor-pointer"
              >
                + ещё {todayFocusItems.extraCount} шаг · Открыть намерения →
              </button>
            )}
          </div>
        )}
      </section>
    </aside>
  )
}
