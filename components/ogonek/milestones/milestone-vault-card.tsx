'use client'

/**
 * ============================================================================
 * components/ogonek/milestones/milestone-vault-card.tsx: ЗОЛОТАЯ КАРТОЧКА ВЕХИ
 * ============================================================================
 * Отображается в Evidence Vault, в ленте и в профиле с золотой рамкой.
 * Служит вечным артефактом преодоления рубежей (100, 200, 300 дней).
 * ============================================================================
 */

import React from 'react'
import { Flame, Award, Shield, Sparkles, BookOpen, ChevronRight } from 'lucide-react'
import type { MilestoneReviewResult } from '@/lib/server/milestones'

export interface MilestoneVaultCardProps {
  milestoneNumber: number
  data?: MilestoneReviewResult
  onOpenDetails: () => void
}

export function MilestoneVaultCard({
  milestoneNumber,
  data,
  onOpenDetails,
}: MilestoneVaultCardProps) {
  const stats = data?.stats
  const review = data?.review

  return (
    <div className="relative w-full rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#12110c] via-[#0c0d0e] to-black border-2 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col gap-4 text-white">
      {/* Золотые световые пятна */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Шапка карточки */}
      <div className="flex items-center justify-between relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black tracking-wider uppercase">
          <Flame size={14} className="fill-amber-400 text-amber-400" />
          <span>ВЕХА #{milestoneNumber} ДНЕЙ</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-amber-500/20 text-amber-300 text-[11px] font-bold">
          <Shield size={12} className="text-amber-400" />
          <span>Свод силы (Vault)</span>
        </div>
      </div>

      {/* Основной контент */}
      <div className="relative z-10 flex flex-col gap-2">
        <h3 className="text-xl sm:text-2xl font-[900] text-amber-100 tracking-tight flex items-center gap-2">
          <span>{milestoneNumber} Дней Непрерывного Огня</span>
          <Award size={22} className="text-amber-400" />
        </h3>

        {/* Выдержка из письма или саммари */}
        {review?.letterToSelf ? (
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-serif italic line-clamp-3 border-l-2 border-amber-500/40 pl-3">
            {review.letterToSelf.split('\n\n')[0]}
          </p>
        ) : review?.summary ? (
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed line-clamp-2">
            {review.summary}
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Подтверждённый рубеж летописи личной силы. Дисциплина фактов и преодолений.
          </p>
        )}
      </div>

      {/* Метрики */}
      {stats && (
        <div className="relative z-10 grid grid-cols-3 gap-2 pt-1 border-t border-amber-500/20">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">Побед</span>
            <span className="text-base sm:text-lg font-black text-white">{stats.totalPrides}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-amber-400/80 uppercase font-bold">Средний балл</span>
            <span className="text-base sm:text-lg font-black text-amber-400">{stats.averageScore.toFixed(1)}★</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 uppercase font-bold">Преодолений</span>
            <span className="text-base sm:text-lg font-black text-white">
              {stats.overcomeDistribution.level2 + stats.overcomeDistribution.level3}
            </span>
          </div>
        </div>
      )}

      {/* Кнопка раскрытия полного разбора */}
      <div className="relative z-10 pt-1">
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          aria-label={`Открыть полный разбор вехи #${milestoneNumber}`}
        >
          <Sparkles size={14} />
          <span>Смотреть летопись рубежа</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
