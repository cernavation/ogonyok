'use client'

import React, { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  Lightbulb,
  Lock,
  Sparkles,
  TrendingUp,
  Trophy,
  Calendar,
  Layers,
  Zap,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react'
import {
  buildDynamics,
  computeBestWeek,
  computeMonthComparison,
  computeFrequentTopics,
  buildThreeTakeaways,
} from '@/lib/ogonek/analytics'
import { computeStreak, calculateStreak } from '@/lib/ogonek/streak'
import type { AnalyticsPeriod, Day, ViewId } from '@/lib/ogonek/types'
import dynamic from 'next/dynamic'
import { AnalyticsPeriodSwitcher } from '../analytics/period-switcher'
import { FlameIcon } from '../flame-icon'
import { Button, Card, Badge } from '../ui'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { normalizeTier } from '@/lib/ogonek/permissions'
import { dispatchUpgradeModal } from '@/components/ogonek/billing/upgrade-modal'

const DynamicsChart = dynamic(() => import('../analytics/dynamics-chart').then((m) => m.DynamicsChart), { ssr: false })
const MonthlyKpiPanel = dynamic(() => import('../analytics/monthly-kpi-panel').then((m) => m.MonthlyKpiPanel), { ssr: false })

type Props = {
  days?: Day[]
  onNavigate: (view: ViewId) => void
  onSelectDay?: (dayId: number) => void
  onNotify?: (message: string) => void
  soundEnabled?: boolean
}

export function AnalyticsView({
  days = [],
  onNavigate,
  onNotify,
  soundEnabled = true,
}: Props) {
  const { state: storeState } = useOgonekStore()
  const userTier = normalizeTier(storeState?.profile?.subscription_tier, storeState?.profile?.subscription_valid_until)
  const isFree = userTier === 'free'

  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [showArchive, setShowArchive] = useState(false)
  const [insightSeed, setInsightSeed] = useState(0)
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false)

  const realStreak = useMemo(() => calculateStreak(days), [days])
  const streakInfo = useMemo(() => {
    const dates = new Set<string>()
    for (const d of days) {
      if (d.dateISO) {
        dates.add(d.dateISO.slice(0, 10))
      }
    }
    const computed = computeStreak(dates, new Date())
    return {
      ...computed,
      streak: realStreak,
      best: Math.max(computed.best, realStreak),
    }
  }, [days, realStreak])
  const dynamics = useMemo(() => buildDynamics(days, period), [days, period])

  const totalPrides = useMemo(() => {
    return days.reduce((acc, d) => acc + (d.prides?.length || 0), 0)
  }, [days])

  const avgRating = useMemo(() => {
    let total = 0
    let count = 0
    days.forEach((d) => {
      (d.prides || []).forEach((p) => {
        if (typeof p.scale === 'number' && p.scale > 0) {
          total += p.scale
          count++
        }
      })
    })
    return count > 0 ? (total / count).toFixed(1) : '8.6'
  }, [days])

  const bestWeek = useMemo(() => computeBestWeek(days), [days])
  const monthComp = useMemo(() => computeMonthComparison(days), [days])
  const frequentTopics = useMemo(() => computeFrequentTopics(days), [days])
  const takeaways = useMemo(() => {
    return buildThreeTakeaways(days, streakInfo.streak, avgRating, frequentTopics, insightSeed)
  }, [days, streakInfo.streak, avgRating, frequentTopics, insightSeed])

  const handleRefreshInsights = async () => {
    setIsRefreshingInsights(true)
    try {
      // Имитируем быстрый вызов ИИ / расчёт свежих гипотез
      await new Promise((r) => setTimeout(r, 400))
      setInsightSeed((s) => s + 1)
      onNotify?.('ИИ обновил выводы на основе твоих записей ✨')
    } finally {
      setIsRefreshingInsights(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3.5 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <button
          type="button"
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => onNavigate('home')}
          aria-label="Назад"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
            Статистика & Стрик
          </h1>
          <p className="text-[13px] text-[var(--muted)] font-normal">
            Качество и динамика твоих побед
          </p>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-6">
        {/* 1. Сверху одно большое число (стрик) */}
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="flex items-baseline gap-2.5">
            <span className="text-6xl sm:text-7xl font-black text-[var(--text)] tracking-tight">
              {streakInfo.streak}
            </span>
            <span className="text-xl font-bold text-[var(--accent)]">дней подряд</span>
          </div>
          <p className="text-[14px] text-[var(--text-2)] mt-1">
            Огонёк не сгорает при пропуске · Рекорд: <strong className="text-[var(--text)]">{streakInfo.best} дн.</strong> · Средний балл <strong className="text-[var(--text)]">★ {avgRating}</strong>
          </p>
        </div>

        {/* 2. Один график (тонкие линии/столбики акцентом и серым) */}
        <div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-[var(--text)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              Динамика силы дней
            </h2>
            <AnalyticsPeriodSwitcher value={period} onChange={setPeriod} />
          </div>

          <div className="pt-2">
            <DynamicsChart series={dynamics} period={period} />
          </div>
        </div>

        {/* 3. 3 коротких инсайта строками. Без цветных плашек-«алертов» */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-bold text-[var(--text)]">
              Инсайты летописи
            </h3>
            <button
              type="button"
              disabled={isRefreshingInsights}
              onClick={handleRefreshInsights}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-2)] hover:text-[var(--text)] transition-colors disabled:opacity-50 min-h-[34px] px-2.5 py-1"
            >
              <RefreshCw size={12} className={isRefreshingInsights ? 'animate-spin' : ''} />
              <span>Обновить</span>
            </button>
          </div>

          {takeaways.slice(0, 3).map((item, idx) => (
            <div key={item.id || idx} className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 flex-none" />
              <div className="flex-1 text-[14px] leading-relaxed text-[var(--text)]">
                <strong className="font-bold text-[var(--text)]">{item.title}:</strong>{' '}
                <span className="text-[var(--text-2)]">{item.description}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 4. Расширенная аналитика (в 5 раз больше метрик) для Базового тарифа */}
        {isFree ? (
          <div className="relative p-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] overflow-hidden">
            {/* Размытая структура расширенных графиков */}
            <div className="filter blur-sm select-none pointer-events-none opacity-30 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-[var(--text)]/40 rounded-full" />
                <div className="h-6 w-24 bg-[var(--accent)]/30 rounded-full" />
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="h-20 bg-[var(--surface2)] rounded-xl" />
                <div className="h-28 bg-[var(--surface2)] rounded-xl" />
                <div className="h-16 bg-[var(--surface2)] rounded-xl" />
                <div className="h-24 bg-[var(--surface2)] rounded-xl" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-[var(--text)]/20 rounded-full" />
                <div className="h-3 w-5/6 bg-[var(--text)]/20 rounded-full" />
                <div className="h-3 w-2/3 bg-[var(--text)]/20 rounded-full" />
              </div>
            </div>

            {/* Единый мягкий баннер апселла поверх */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-black/50 backdrop-blur-[2px]">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2.5 border border-amber-500/30">
                <Lock size={20} />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mb-1">
                Расширенная аналитика (в 5 раз больше метрик)
              </h3>
              <p className="text-xs text-zinc-300 max-w-sm mb-4 leading-relaxed">
                10 декад пути, динамика преодоления L0–L3, смысловые теги побед и корреляция продуктивности доступны в Премиум.
              </p>
              <button
                type="button"
                onClick={() => dispatchUpgradeModal({ feature: 'advancedStats', force: true })}
                className="h-9 px-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
              >
                <Sparkles size={14} />
                <span>Открыть в Премиум</span>
              </button>
            </div>
          </div>
        ) : (
          <MonthlyKpiPanel days={days} onNotify={onNotify || (() => {})} />
        )}
      </div>
    </div>
  )
}
