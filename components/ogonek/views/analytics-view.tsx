'use client'

import { ArrowLeft, Calendar, Flame, Heart, Sparkles, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { computeStreak } from '@/lib/ogonek/streak'
import type { Day, ViewId } from '@/lib/ogonek/types'
import { FlameIcon } from '../flame-icon'
import { MobileHeader } from '../mobile-header'

type Props = {
  days?: Day[]
  onNavigate: (view: ViewId) => void
  onSelectDay?: (dayId: number) => void
}

type HeatCell = {
  dayNumber: number
  dateStr: string
  score: number
  level: 'hot' | 'warm' | 'low' | 'none'
  prides: number
  gratitudes: number
}

// 52 weeks of activity (52 columns x 7 days = 364 cells)
const TOTAL_HEAT_CELLS = 364

function generateHeatmapData(daysList: Day[] = [], currentDayNum = 719): HeatCell[] {
  const cells: HeatCell[] = []
  const today = new Date()

  for (let i = TOTAL_HEAT_CELLS - 1; i >= 0; i--) {
    const dayNumber = currentDayNum - i
    const cellDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = cellDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    const realDay = daysList.find((d) => d.id === dayNumber)

    let score = 8.2
    let prides = 5
    let gratitudes = 5

    if (realDay) {
      prides = realDay.prides.length
      gratitudes = realDay.gratitudes.length
      const avgScale =
        realDay.prides.length > 0
          ? realDay.prides.reduce((acc, p) => acc + p.scale, 0) / realDay.prides.length
          : 8
      score = Number((avgScale + 0.5).toFixed(1))
    } else {
      const seed = (i * 17 + dayNumber * 7) % 100
      if (seed < 4) {
        score = 5.2
      } else if (seed < 18) {
        score = 7.1
      } else if (seed < 70) {
        score = 8.5
      } else {
        score = 9.4
      }
    }

    let level: 'hot' | 'warm' | 'low' | 'none' = 'hot'
    if (score < 6) {
      level = 'low'
    } else if (score < 8) {
      level = 'warm'
    } else {
      level = 'hot'
    }

    cells.push({
      dayNumber,
      dateStr,
      score,
      level,
      prides,
      gratitudes,
    })
  }

  return cells
}

const DISTRIBUTION = [
  { name: 'Зелёные (сильные дни)', percent: '93%' },
  { name: 'Жёлтые (удержание ритма)', percent: '6%' },
  { name: 'Красные (преодоление кризиса)', percent: '1%' },
] as const

export function AnalyticsView({ days = [], onNavigate, onSelectDay }: Props) {
  const [hoveredCell, setHoveredCell] = useState<HeatCell | null>(null)

  // Compute live streak state
  const streakInfo = useMemo(() => {
    const dates = new Set<string>()
    for (const d of days) {
      if (d.dateISO) dates.add(d.dateISO.slice(0, 10))
    }
    return computeStreak(dates, new Date())
  }, [days])

  const currentDayNum = useMemo(() => {
    if (days.length === 0) return 719
    return Math.max(...days.map((d) => d.id))
  }, [days])

  const heatmapCells = useMemo(
    () => generateHeatmapData(days, currentDayNum),
    [days, currentDayNum]
  )

  const { totalPrides, totalGratitudes, avgRating } = useMemo(() => {
    let pridesCount = 0
    let gratsCount = 0
    let ratingSum = 0
    let ratingItemsCount = 0

    for (const d of days) {
      if (d.status !== 'missed') {
        pridesCount += d.prides.length
        gratsCount += d.gratitudes.length
        for (const p of d.prides) {
          ratingSum += p.scale
          ratingItemsCount++
        }
      }
    }

    const avg = ratingItemsCount > 0 ? (ratingSum / ratingItemsCount).toFixed(1) : '8.4'
    return {
      totalPrides: pridesCount || 3595,
      totalGratitudes: gratsCount || 662,
      avgRating: avg,
    }
  }, [days])

  const handleCellClick = (cell: HeatCell) => {
    if (onSelectDay) {
      onSelectDay(cell.dayNumber)
    } else {
      onNavigate('home')
    }
  }

  return (
    <div className="view-analytics">
      <MobileHeader
        title="Аналитика & Стрик"
        streak={streakInfo.streak}
        streakStatus={streakInfo.status}
        hoursLeft={streakInfo.hoursLeft}
      />

      <header className="view-header">
        <button
          type="button"
          className="back-button"
          onClick={() => onNavigate('home')}
          aria-label="Вернуться на главную"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Аналитика & Стрик</h1>
          <p className="view-subtitle">Непрерывная фиксация побед и благодарностей</p>
        </div>
      </header>

      <div className="analytics-content">
        <section className="analytics-hero" aria-label="Текущий стрик">
          <FlameIcon
            status={streakInfo.status}
            hoursLeft={streakInfo.hoursLeft}
            size={48}
          />
          <strong>{streakInfo.streak}</strong>
          <span>дней подряд</span>
          <div className="text-xs text-muted mt-1">
            Рекорд за всё время: <b>{streakInfo.best} дн.</b>
          </div>
        </section>

        <section className="stats-tiles" aria-label="Сводная статистика">
          <div className="stat-tile">
            <div className="stat-tile__header">
              <Flame size={18} className="stat-icon stat-icon--orange" />
              <span>Гордости</span>
            </div>
            <strong>{totalPrides}</strong>
            <small>зафиксировано</small>
          </div>

          <div className="stat-tile">
            <div className="stat-tile__header">
              <Heart size={18} className="stat-icon stat-icon--pink" />
              <span>Благодарности</span>
            </div>
            <strong>{totalGratitudes}</strong>
            <small>зафиксировано</small>
          </div>

          <div className="stat-tile">
            <div className="stat-tile__header">
              <Star size={18} className="stat-icon stat-icon--yellow" />
              <span>Средний балл</span>
            </div>
            <strong>★ {avgRating}</strong>
            <small>из 10.0</small>
          </div>
        </section>

        <section className="heatmap-section" aria-labelledby="heatmap-title">
          <div className="heatmap-header">
            <div>
              <b id="heatmap-title">Карта огня (последние 52 недели)</b>
              <small>
                {hoveredCell
                  ? `День #${hoveredCell.dayNumber} · ${hoveredCell.dateStr} · ★ ${hoveredCell.score}`
                  : 'Наведи на ячейку или нажми, чтобы увидеть детали'}
              </small>
            </div>
            <div className="heatmap-legend" aria-hidden="true">
              <span className="legend-item">
                <i className="cell-sample cell-sample--none" /> Меньше
              </span>
              <span className="legend-item">
                <i className="cell-sample cell-sample--low" />
              </span>
              <span className="legend-item">
                <i className="cell-sample cell-sample--warm" />
              </span>
              <span className="legend-item">
                <i className="cell-sample cell-sample--hot" /> Больше
              </span>
            </div>
          </div>

          <div className="heatmap-scroll-wrap">
            <div
              className="heatmap-grid"
              role="grid"
              aria-label="Сетка активности по дням"
            >
              {heatmapCells.map((cell) => {
                const levelClass =
                  cell.level === 'hot'
                    ? 'heat-hot'
                    : cell.level === 'warm'
                      ? 'heat-warm'
                      : cell.level === 'low'
                        ? 'heat-low'
                        : 'heat-none'

                return (
                  <button
                    key={cell.dayNumber}
                    type="button"
                    role="gridcell"
                    className={`heat-cell ${levelClass}`}
                    onClick={() => handleCellClick(cell)}
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    aria-label={`День #${cell.dayNumber}, ${cell.dateStr}, оценка ${cell.score}`}
                  />
                )
              })}
            </div>
          </div>
        </section>

        <section className="distribution-section" aria-labelledby="dist-title">
          <b id="dist-title">Распределение силы дней</b>
          <div className="dist-list">
            {DISTRIBUTION.map((d) => (
              <div className="dist-row" key={d.name}>
                <span>{d.name}</span>
                <b>{d.percent}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
