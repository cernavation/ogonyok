'use client'

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  buildDynamics,
  buildPromiseVsReality,
  buildRecommendations,
  type Recommendation,
} from '@/lib/ogonek/analytics'
import { getKpiKind } from '@/lib/ogonek/kpi'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { AnalyticsPeriod, Day, ViewId } from '@/lib/ogonek/types'

type Props = {
  days: Day[]
  period: AnalyticsPeriod
  onNavigate: (view: ViewId) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const TONE_META: Record<Recommendation['tone'], { label: string; className: string }> = {
  win: { label: 'Сильная сторона', className: 'ai-reco--win' },
  warning: { label: 'Внимание', className: 'ai-reco--warning' },
  idea: { label: 'Идея', className: 'ai-reco--idea' },
  focus: { label: 'Фокус', className: 'ai-reco--focus' },
}

function formatDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-')
  if (!y || !m || !d) return dateKey
  return `${d}.${m}`
}

const STATUS_ICON = {
  done: <CheckCircle2 size={14} className="promise-icon promise-icon--done" />,
  missed: <XCircle size={14} className="promise-icon promise-icon--missed" />,
  pending: <Clock3 size={14} className="promise-icon promise-icon--pending" />,
}

/**
 * Глубокая ИИ-аналитика: сопоставляет утренние обещания с реальными делами
 * и выдаёт персональные рекомендации. Кнопки реально работают —
 * «Обновить разбор» пересчитывает, «Добавить как цель» пишет KPI в стор,
 * «Перейти» уводит в нужный раздел.
 */
export function AiInsightPanel({ days, period, onNavigate, onNotify, soundEnabled = true }: Props) {
  const { state, addMonthlyKpi } = useOgonekStore()
  const [now] = useState(() => new Date())
  const [analyzed, setAnalyzed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)

  const history = state.morningFocusHistory ?? {}
  const kpis = state.monthlyKpis ?? []

  const { reality, recommendations } = useMemo(() => {
    const dynamics = buildDynamics(days, period, now)
    const realityData = buildPromiseVsReality(history, period, now)
    const reco = buildRecommendations({
      days,
      history,
      kpis,
      dynamics,
      reality: realityData,
      now,
    })
    return { reality: realityData, recommendations: reco }
    // revision намеренно участвует — кнопка «Обновить разбор» пересобирает выдачу
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, period, history, kpis, now, revision])

  const runAnalysis = () => {
    playClick(soundEnabled)
    setLoading(true)
    window.setTimeout(() => {
      setRevision((r) => r + 1)
      setAnalyzed(true)
      setLoading(false)
      playSuccess(soundEnabled)
      onNotify('AI-разбор обновлён: сравнение обещаний и действий готово ✓')
    }, 620)
  }

  const handleSuggestKpi = (reco: Recommendation) => {
    if (!reco.suggestKpi) return
    const meta = getKpiKind(reco.suggestKpi.kind)
    addMonthlyKpi(reco.suggestKpi)
    playSuccess(soundEnabled)
    onNotify(`Цель «${reco.suggestKpi.title}» добавлена (${meta.label}) ✓`)
  }

  const decided = reality.fulfilled + reality.missed

  return (
    <section className="ai-panel" aria-labelledby="ai-title">
      <div className="ai-panel__head">
        <div>
          <span className="ai-panel__kicker">
            <Sparkles size={14} /> AI-разбор
          </span>
          <b id="ai-title">Что ты обещал утром vs что реально сделал</b>
          <small>{reality.rangeLabel}</small>
        </div>
        <button
          type="button"
          className="ai-refresh-btn"
          onClick={runAnalysis}
          disabled={loading}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {analyzed ? 'Обновить разбор' : 'Сгенерировать'}
        </button>
      </div>

      {/* ── Обещания vs реальность ───────────────────────────────────────── */}
      <div className={`ai-reality ai-reality--${reality.verdict.tone}`}>
        <div className="ai-reality__score">
          <strong>{reality.percent}%</strong>
          <span>сдержанных обещаний</span>
          <small>{reality.verdict.label}</small>
        </div>

        <div className="ai-reality__chips">
          <div className="ai-chip ai-chip--done">
            <CheckCircle2 size={14} /> Сдержано<b>{reality.fulfilled}</b>
          </div>
          <div className="ai-chip ai-chip--missed">
            <XCircle size={14} /> Не сдержано<b>{reality.missed}</b>
          </div>
          <div className="ai-chip ai-chip--pending">
            <Clock3 size={14} /> Ждут сверки<b>{reality.pending}</b>
          </div>
        </div>
      </div>

      {reality.rows.length > 0 ? (
        <ul className="promise-list">
          {reality.rows.slice(0, 8).map((row, idx) => (
            <li key={`${row.dateKey}-${idx}`} className="promise-row">
              {STATUS_ICON[row.status]}
              <span className="promise-row__text">{row.text}</span>
              <span className="promise-row__date">{formatDayKey(row.dateKey)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ai-empty-line">
          За этот период нет зафиксированных утренних обещаний — сверять пока нечего.
        </p>
      )}

      {reality.bestDay && reality.weakestDay && decided > 0 && (
        <div className="ai-reality__days">
          <span>
            Лучший день: <b>{formatDayKey(reality.bestDay.dateKey)}</b> ({reality.bestDay.percent}%)
          </span>
          <span>
            Слабейший день: <b>{formatDayKey(reality.weakestDay.dateKey)}</b> ({reality.weakestDay.percent}%)
          </span>
        </div>
      )}

      {/* ── Персональные рекомендации ────────────────────────────────────── */}
      <div className="ai-reco-section">
        <div className="ai-reco-section__head">
          <b>
            <Sparkles size={14} /> Персональные рекомендации
          </b>
          <small>{recommendations.length} совета на основе твоих данных</small>
        </div>

        {!analyzed ? (
          <div className="ai-reco-teaser">
            <p>
              Огонёк разберёт твои оценки, обещания и месячные цели и подскажет, где ты силён,
              где теряешь темп и что стоит изменить.
            </p>
            <button type="button" className="ai-cta-btn" onClick={runAnalysis} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? 'Анализирую…' : 'Получить AI-разбор'}
            </button>
          </div>
        ) : (
          <ul className="ai-reco-list">
            {recommendations.map((reco) => {
              const tone = TONE_META[reco.tone]
              return (
                <li key={reco.id} className={`ai-reco ${tone.className}`}>
                  <div className="ai-reco__head">
                    <span className="ai-reco__emoji" aria-hidden="true">
                      {reco.emoji}
                    </span>
                    <span className="ai-reco__tone">{tone.label}</span>
                  </div>
                  <b className="ai-reco__title">{reco.title}</b>
                  <p className="ai-reco__body">{reco.body}</p>
                  <div className="ai-reco__actions">
                    {reco.suggestKpi && (
                      <button
                        type="button"
                        className="ai-reco-btn ai-reco-btn--primary"
                        onClick={() => handleSuggestKpi(reco)}
                      >
                        <Target size={13} /> Добавить как цель
                      </button>
                    )}
                    {reco.navigateTo && (
                      <button
                        type="button"
                        className="ai-reco-btn"
                        onClick={() => {
                          playClick(soundEnabled)
                          onNavigate(reco.navigateTo as ViewId)
                        }}
                      >
                        Перейти <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
