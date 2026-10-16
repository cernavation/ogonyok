'use client'

import { useMemo, useState } from 'react'
import { Heart, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { DynamicsSeries, TrendDirection } from '@/lib/ogonek/analytics'
import type { AnalyticsPeriod } from '@/lib/ogonek/types'

type Props = {
  series: DynamicsSeries
  period: AnalyticsPeriod
}

const W = 720
const H = 240
const PAD = { top: 18, right: 42, left: 38, bottom: 30 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function TrendBadge({ dir, suffix }: { dir: TrendDirection; suffix: string }) {
  if (dir === 'up') {
    return (
      <span className="trend-badge trend-badge--up">
        <TrendingUp size={12} /> {suffix} рост
      </span>
    )
  }
  if (dir === 'down') {
    return (
      <span className="trend-badge trend-badge--down">
        <TrendingDown size={12} /> {suffix} спад
      </span>
    )
  }
  return (
    <span className="trend-badge trend-badge--flat">
      <Minus size={12} /> {suffix} ровно
    </span>
  )
}

function buildLinePath(
  values: (number | null)[],
  xOf: (i: number) => number,
  yOf: (v: number) => number
): string {
  let d = ''
  let penDown = false
  values.forEach((v, i) => {
    if (v === null) {
      penDown = false
      return
    }
    const cmd = penDown ? 'L' : 'M'
    d += `${cmd}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)} `
    penDown = true
  })
  return d.trim()
}

/**
 * График динамики: столбцы — количество гордостей, линии — средние оценки
 * гордостей и благодарностей (шкала ★ 0..10). Наведи на точку для деталей.
 */
export function DynamicsChart({ series, period }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const points = series.points
  const n = points.length

  const { xOf, yRating, barWidth, labelStep, maxCount } = useMemo(() => {
    const maxCount = Math.max(series.maxPrideCount, 4)
    const slotW = n > 0 ? PLOT_W / n : PLOT_W
    const xOf = (i: number) => PAD.left + slotW * (i + 0.5)
    const yRating = (v: number) => PAD.top + PLOT_H * (1 - Math.max(0, Math.min(10, v)) / 10)
    const barWidth = Math.max(3, Math.min(16, slotW * 0.52))
    const labelStep = period === 'month' ? 5 : 1
    return { xOf, yRating, barWidth, labelStep, maxCount }
  }, [n, period, series.maxPrideCount])

  const yCount = (v: number) => PAD.top + PLOT_H * (1 - Math.max(0, Math.min(maxCount, v)) / maxCount)

  const prideLine = buildLinePath(
    points.map((p) => p.prideAvg),
    xOf,
    yRating
  )
  const gratitudeLine = buildLinePath(
    points.map((p) => p.gratitudeAvg),
    xOf,
    yRating
  )

  const prideArea = useMemo(() => {
    if (prideLine.length === 0) return ''
    const firstIdx = points.findIndex((p) => p.prideAvg !== null)
    const lastIdx = points.length - 1 - [...points].reverse().findIndex((p) => p.prideAvg !== null)
    if (firstIdx < 0 || lastIdx < 0) return ''
    return `${prideLine} L${xOf(lastIdx).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} L${xOf(firstIdx).toFixed(1)},${(PAD.top + PLOT_H).toFixed(1)} Z`
  }, [prideLine, points, xOf])

  const active = hover !== null ? points[hover] : null

  const gridRatings = [0, 2.5, 5, 7.5, 10]

  return (
    <div className="dynamics-chart">
      <div className="dynamics-chart__head">
        <div>
          <b>Динамика оценок и записей</b>
          <small>{series.rangeLabel}</small>
        </div>
        <div className="dynamics-chart__trends">
          <TrendBadge dir={series.trend.prideAvg} suffix="оценки" />
          <TrendBadge dir={series.trend.gratitudeCount} suffix="благодарности" />
        </div>
      </div>

      <div className="dynamics-chart__legend" aria-hidden="true">
        <span className="legend-item">
          <i className="legend-swatch legend-swatch--pride-line" /> Оценка гордостей
        </span>
        <span className="legend-item">
          <i className="legend-swatch legend-swatch--grat-line" /> Оценка благодарностей
        </span>
        <span className="legend-item">
          <i className="legend-swatch legend-swatch--bars" /> Гордости (шт.)
        </span>
      </div>

      <div className="dynamics-chart__plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="dynamics-svg"
          role="img"
          aria-label="График динамики оценок гордостей и благодарностей"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="prideAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--orange)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Сетка по шкале оценок */}
          {gridRatings.map((r) => (
            <g key={`grid-${r}`}>
              <line
                x1={PAD.left}
                x2={PAD.left + PLOT_W}
                y1={yRating(r)}
                y2={yRating(r)}
                className="dynamics-grid-line"
              />
              <text x={PAD.left + PLOT_W + 8} y={yRating(r) + 3} className="dynamics-axis-text">
                {r}
              </text>
            </g>
          ))}

          {/* Столбцы количества гордостей */}
          {points.map((p, i) =>
            p.prideCount > 0 ? (
              <rect
                key={`bar-${p.key}`}
                x={xOf(i) - barWidth / 2}
                y={PAD.top + PLOT_H - (PLOT_H * p.prideCount) / maxCount}
                width={barWidth}
                height={(PLOT_H * p.prideCount) / maxCount}
                rx={2}
                className="dynamics-bar"
              />
            ) : null
          )}

          {/* Область и линия оценок гордостей */}
          {prideArea && <path d={prideArea} fill="url(#prideAreaFill)" />}
          {prideLine && <path d={prideLine} className="dynamics-line dynamics-line--pride" />}

          {/* Линия оценок благодарностей */}
          {gratitudeLine && (
            <path d={gratitudeLine} className="dynamics-line dynamics-line--grat" />
          )}

          {/* Точки + зоны наведения */}
          {points.map((p, i) => (
            <g key={`pt-${p.key}`}>
              {p.gratitudeAvg !== null && (
                <circle
                  cx={xOf(i)}
                  cy={yRating(p.gratitudeAvg)}
                  r={hover === i ? 4.5 : 2.6}
                  className="dynamics-dot dynamics-dot--grat"
                />
              )}
              {p.prideAvg !== null && (
                <circle
                  cx={xOf(i)}
                  cy={yRating(p.prideAvg)}
                  r={hover === i ? 4.5 : 3}
                  className="dynamics-dot dynamics-dot--pride"
                />
              )}
              <rect
                x={xOf(i) - PLOT_W / n / 2}
                y={PAD.top}
                width={PLOT_W / n}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          ))}

          {/* Подписи по оси X */}
          {points.map((p, i) =>
            i % labelStep === 0 ? (
              <text
                key={`xlabel-${p.key}`}
                x={xOf(i)}
                y={H - 10}
                textAnchor="middle"
                className="dynamics-axis-text dynamics-axis-text--x"
              >
                {p.label}
              </text>
            ) : null
          )}
        </svg>

        {active && (
          <div
            className="dynamics-tooltip"
            style={{
              left: `${(xOf(hover ?? 0) / W) * 100}%`,
            }}
          >
            <b>{active.label}</b>
            <span>
              Гордости: <b>{active.prideCount}</b> · ★ {active.prideAvg !== null ? active.prideAvg.toFixed(1) : '—'}
            </span>
            <span>
              <Heart size={11} /> Благодарности: <b>{active.gratitudeCount}</b> · ★{' '}
              {active.gratitudeAvg !== null ? active.gratitudeAvg.toFixed(1) : '—'}
            </span>
            <span>Активных дней: {active.activeDays}</span>
          </div>
        )}
      </div>

      <div className="dynamics-chart__totals">
        <div className="dynamics-total">
          <span>Средняя оценка гордостей</span>
          <b>★ {series.totals.avgPride !== null ? series.totals.avgPride.toFixed(1) : '—'}</b>
          <small>
            было {series.previous.avgPride !== null ? series.previous.avgPride.toFixed(1) : '—'}
          </small>
        </div>
        <div className="dynamics-total">
          <span>Средняя оценка благодарностей</span>
          <b>★ {series.totals.avgGratitude !== null ? series.totals.avgGratitude.toFixed(1) : '—'}</b>
          <small>
            было {series.previous.avgGratitude !== null ? series.previous.avgGratitude.toFixed(1) : '—'}
          </small>
        </div>
        <div className="dynamics-total">
          <span>Записей за период</span>
          <b>
            {series.totals.prideCount} / {series.totals.gratitudeCount}
          </b>
          <small>гордости / благодарности</small>
        </div>
        <div className="dynamics-total">
          <span>Активных дней</span>
          <b>{series.totals.activeDays}</b>
          <small>с записью в периоде</small>
        </div>
      </div>
    </div>
  )
}
