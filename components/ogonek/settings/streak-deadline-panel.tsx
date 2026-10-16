'use client'

import {
  AlarmClock,
  Check,
  Clock,
  Flame,
  Globe,
  Moon,
  RotateCcw,
  Sparkles,
  Timer,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  STREAK_DEADLINE_PRESETS,
  STREAK_TIMEZONES,
  addDaysToLocalDay,
  computeStreak,
  formatDeadlineLabel,
  getDeadlineInTz,
  isValidTimeZone,
  minutesToTimeValue,
  timeValueToMinutes,
  timeZoneOffsetLabel,
  toLocalDay,
} from '@/lib/ogonek/streak'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'

type Props = {
  onNotify: (message: string) => void
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'сгорело'
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours} ч ${minutes} мин`
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${minutes} мин ${seconds} с`
}

export function StreakDeadlinePanel({ onNotify }: Props) {
  const {
    state,
    setStreakDeadlineMinutes,
    setStreakTimeZone,
    setStreakWeekendBonus,
    resetStreakSettings,
  } = useOgonekStore()

  const settings = state.streak
  const sound = state.soundEnabled

  const [now, setNow] = useState<number>(() => Date.now())
  // Живой тик раз в секунду — для обратного отсчёта до дедлайна
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const tz = isValidTimeZone(settings.timeZone) ? settings.timeZone : 'Europe/Chisinau'

  const streakState = useMemo(() => {
    const dates = new Set<string>()
    for (const d of state.days) {
      if (d.dateISO) dates.add(d.dateISO.slice(0, 10))
    }
    return computeStreak(dates, new Date(now), {
      tz,
      deadlineMinutes: settings.deadlineMinutes,
      weekendBonus: settings.weekendBonus,
    })
  }, [state.days, now, tz, settings.deadlineMinutes, settings.weekendBonus])

  const { todayDeadline, msLeft } = useMemo(() => {
    const ref = new Date(now)
    const todayStr = toLocalDay(ref, tz)
    let deadline = getDeadlineInTz(todayStr, settings.deadlineMinutes, tz)
    if (deadline.getTime() <= now) {
      const tomorrow = addDaysToLocalDay(todayStr, 1, tz)
      deadline = getDeadlineInTz(tomorrow, settings.deadlineMinutes, tz)
    }
    return { todayDeadline: deadline, msLeft: deadline.getTime() - now }
  }, [now, tz, settings.deadlineMinutes])

  const offsetLabel = useMemo(() => timeZoneOffsetLabel(tz, new Date(now)), [tz, now])

  const isDefault =
    settings.deadlineMinutes === 23 * 60 + 59 &&
    settings.timeZone === 'Europe/Chisinau' &&
    !settings.weekendBonus

  const timeValue = minutesToTimeValue(settings.deadlineMinutes)

  const handlePreset = (minutes: number, label: string) => {
    if (minutes === settings.deadlineMinutes) return
    setStreakDeadlineMinutes(minutes)
    playClick(sound)
    onNotify(`Ночной дедлайн стрика установлен на ${label}`)
  }

  const handleTimeInput = (value: string) => {
    const minutes = timeValueToMinutes(value)
    if (minutes === null) {
      onNotify('Введите корректное время, например 23:30')
      return
    }
    if (minutes === settings.deadlineMinutes) return
    setStreakDeadlineMinutes(minutes)
    playClick(sound)
    onNotify(`Дедлайн стрика: ${formatDeadlineLabel(minutes)} (${offsetLabel})`)
  }

  const handleTimeZone = (zone: string) => {
    if (zone === settings.timeZone || !isValidTimeZone(zone)) return
    setStreakTimeZone(zone)
    playClick(sound)
    onNotify(`Часовой пояс дедлайна: ${timeZoneOffsetLabel(zone)}`)
  }

  const handleWeekendBonus = () => {
    const next = !settings.weekendBonus
    setStreakWeekendBonus(next)
    playClick(sound)
    onNotify(
      next
        ? 'Дополнительный день прощения за выходные включён'
        : 'Льгота на выходные выключена'
    )
  }

  const handleReset = () => {
    resetStreakSettings()
    playSuccess(sound)
    onNotify('Дедлайн стрика сброшен на 23:59 Europe/Chisinau')
  }

  const statusLabel =
    streakState.status === 'safe'
      ? 'Сегодня запись уже есть — пламя горит ровно'
      : streakState.status === 'grace'
        ? `Льготный период — стрик ${streakState.streak} дн. под угрозой`
        : 'Серия угасла — зажги новую запись'

  return (
    <section className="settings-section streak-deadline-panel" aria-labelledby="streak-deadline-title">
      <div className="appearance-section-head">
        <div>
          <b id="streak-deadline-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Moon size={16} style={{ color: 'var(--accent)' }} /> Ночной дедлайн стрика
          </b>
          <small>Во сколько закрывается день и цепочка может оборваться</small>
        </div>
        <span
          className={`streak-deadline-status streak-deadline-status--${streakState.status}`}
          title={statusLabel}
        >
          <Flame size={12} /> {streakState.streak} дн.
        </span>
      </div>

      {/* ── Герой: время + обратный отсчёт ──────────────────────────────── */}
      <div className="streak-deadline-hero">
        <div className="streak-deadline-clock">
          <span className="streak-deadline-clock__time">{timeValue}</span>
          <span className="streak-deadline-clock__tz">
            <Globe size={12} /> {offsetLabel} · {tz}
          </span>
        </div>

        <div className="streak-deadline-hero__meta">
          <div className="streak-deadline-countdown">
            <Timer size={15} />
            <span>
              До дедлайна осталось <b>{formatCountdown(msLeft)}</b>
            </span>
          </div>
          <p className={`streak-deadline-hint streak-deadline-hint--${streakState.status}`}>
            {statusLabel}
            {streakState.hoursLeft !== null && streakState.status === 'grace'
              ? ` · до сгорания ${streakState.hoursLeft} ч`
              : ''}
          </p>
        </div>
      </div>

      {/* ── Пресеты ─────────────────────────────────────────────────────── */}
      <div className="streak-deadline-presets" role="radiogroup" aria-label="Быстрый выбор времени дедлайна">
        {STREAK_DEADLINE_PRESETS.map((preset) => {
          const active = preset.minutes === settings.deadlineMinutes
          return (
            <button
              key={preset.minutes}
              type="button"
              role="radio"
              aria-checked={active}
              title={preset.hint}
              className={`streak-deadline-preset ${active ? 'is-active' : ''}`}
              onClick={() => handlePreset(preset.minutes, preset.label)}
            >
              {active && <Check size={12} />}
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* ── Ручной выбор времени и часового пояса ───────────────────────── */}
      <div className="streak-deadline-controls">
        <label className="streak-deadline-field">
          <span>
            <AlarmClock size={13} /> Точное время
          </span>
          <input
            type="time"
            value={timeValue}
            onChange={(e) => handleTimeInput(e.target.value)}
            aria-label="Время ночного дедлайна"
          />
        </label>

        <label className="streak-deadline-field">
          <span>
            <Clock size={13} /> Часовой пояс
          </span>
          <select
            value={settings.timeZone}
            onChange={(e) => handleTimeZone(e.target.value)}
            aria-label="Часовой пояс дедлайна"
          >
            {STREAK_TIMEZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Льгота на выходные ──────────────────────────────────────────── */}
      <div className="setting-row">
        <div>
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={15} /> День прощения за выходные
          </b>
          <small>
            {settings.weekendBonus
              ? 'Дедлайн мягче на 1 день — суббота и воскресенье не рвут цепочку'
              : 'Стрик держит стандартные 3 дня прощения'}
          </small>
        </div>
        <button
          type="button"
          className={`switch ${settings.weekendBonus ? 'on' : ''}`}
          onClick={handleWeekendBonus}
          aria-pressed={settings.weekendBonus}
          aria-label={settings.weekendBonus ? 'Выключить льготу на выходные' : 'Включить льготу на выходные'}
        >
          <i />
        </button>
      </div>

      <div className="privacy-reset-row">
        <button
          type="button"
          className="appearance-reset-btn"
          onClick={handleReset}
          disabled={isDefault}
          aria-label="Сбросить дедлайн стрика"
        >
          {isDefault ? <Check size={14} /> : <RotateCcw size={14} />}
          <span>{isDefault ? 'Дедлайн по умолчанию (23:59)' : 'Сбросить дедлайн'}</span>
        </button>
      </div>
    </section>
  )
}
