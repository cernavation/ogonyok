'use client'

/**
 * ============================================================================
 * components/ogonek/profile/profile-milestones-tab.tsx: РАЗДЕЛ «МОИ ВЕХИ» (ЭТАП 11)
 * ============================================================================
 * Отображает историю вех (100, 200, 300 дней...):
 * - Free: без отчётов, только факт («300 дней»), превью-размытие отчёта с кнопкой апгрейда.
 * - Pro / Ultra: исторические отчёты с цифрами, траекторией и глубоким разбором.
 * - Кнопка сохранения в Evidence Vault и шеринга красивой карточки.
 * ============================================================================
 */

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Flame,
  Award,
  Lock,
  Sparkles,
  TrendingUp,
  Shield,
  ChevronRight,
  Share2,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { SubscriptionTier } from '@/lib/ogonek/permissions'
import type { MilestoneReviewResult } from '@/lib/server/milestones'

const MilestoneModal = dynamic(
  () => import('../milestones/milestone-modal').then((m) => m.MilestoneModal),
  { ssr: false }
)

export interface ProfileMilestonesTabProps {
  userId?: string
  isOwnProfile: boolean
  tier: SubscriptionTier
  daysCount: number
  onNotify?: (msg: string) => void
  soundEnabled?: boolean
}

export function ProfileMilestonesTab({
  userId,
  isOwnProfile,
  tier,
  daysCount,
  onNotify,
  soundEnabled = true,
}: ProfileMilestonesTabProps) {
  const [milestones, setMilestones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null)

  const isFree = tier === 'free'

  // Загрузка сохранённых вех из базы
  useEffect(() => {
    let active = true
    setLoading(true)

    const url = userId ? `/api/milestones/vault?userId=${userId}` : '/api/milestones/vault'
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        if (json.success && Array.isArray(json.milestones)) {
          setMilestones(json.milestones)
        }
      })
      .catch((err) => {
        console.warn('[ProfileMilestonesTab fetch warning]:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  // Потенциальные вехи кратные 100
  const milestoneNumbers = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].filter(
    (n) => n <= Math.max(daysCount, ...milestones.map((m) => m.day_number || m.milestone_number || 0))
  )

  // Если дней меньше 100 и нет сохранённых вех
  if (milestoneNumbers.length === 0 && milestones.length === 0) {
    return (
      <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Award size={26} />
        </div>
        <h3 className="text-base font-bold text-white">До первой вехи ещё немного</h3>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
          Первый юбилейный рубеж открывается на 100-й день летописи личной силы. Сейчас пройдено: {daysCount} дней.
        </p>
      </div>
    )
  }

  return (
    <div className="py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white">Летопись вех личной силы</h3>
        </div>
        <span className="text-xs text-zinc-400">Пройдено рубежей: {milestoneNumbers.length}</span>
      </div>

      <div className="flex flex-col gap-4">
        {milestoneNumbers.map((num) => {
          const record = milestones.find(
            (m) => (m.day_number || m.milestone_number) === num
          )
          const payload = record?.payload || record?.snapshot_json || {}
          const stats = payload.stats
          const review = payload.review
          const isVaulted = Boolean(record?.saved_to_vault)

          return (
            <div
              key={num}
              className="relative rounded-2xl border border-amber-500/30 bg-[#0f1012] p-4 sm:p-5 flex flex-col gap-3 shadow-sm overflow-hidden"
            >
              {/* Верхняя строка: Номер вехи и статус */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase">
                  <Flame size={13} className="fill-amber-400" />
                  <span>РУБЕЖ #{num} ДНЕЙ</span>
                </div>

                {isVaulted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <Shield size={11} className="text-amber-400" />
                    В Evidence Vault
                  </span>
                )}
              </div>

              {/* ============================================================= */}
              {/* FREE ТАРИФ: ФАКТ «300 ДНЕЙ» + ПРЕВЬЮ-РАЗМЫТИЕ ОТЧЁТА С АПГРЕЙДОМ */}
              {/* ============================================================= */}
              {isFree ? (
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <span>{num} дней непрерывного огня зафиксированы в летописи</span>
                  </div>

                  {/* Размытый блок отчёта */}
                  <div className="relative rounded-xl p-3 bg-zinc-900 border border-zinc-800 overflow-hidden">
                    <div className="filter blur-[3px] opacity-40 select-none pointer-events-none text-xs text-zinc-300 space-y-1.5">
                      <p>Средний балл за последние 100 дней вырос на 4.8% и достиг 8.8★.</p>
                      <p>Лучший период: Дни 71–80 со средним баллом 9.1★. Побед всего: 284.</p>
                      <p>Глубокая трансформация формулировок и привычек характера.</p>
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/40 backdrop-blur-[2px]">
                      <Lock size={18} className="text-amber-400 mb-1" />
                      <span className="text-xs font-bold text-amber-200">
                        Отчёт и трансформация за {num} дней доступны в Премиум
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          playClick(soundEnabled)
                          setSelectedMilestone(num)
                        }}
                        className="mt-2 py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[11px] hover:opacity-90 transition-opacity"
                      >
                        Разблокировать отчёт
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ============================================================= */
                /* PRO / ULTRA ТАРИФ: ПОЛНЫЙ ИСТОРИЧЕСКИЙ ОТЧЁТ                  */
                /* ============================================================= */
                <div className="flex flex-col gap-3 pt-1">
                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase">Ср. балл</span>
                        <div className="font-black text-amber-400 text-base">
                          {stats.last100AverageScore?.toFixed(1) || stats.averageScore?.toFixed(1)}★
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase">Побед всего</span>
                        <div className="font-black text-white text-base">{stats.totalPrides}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase">Лучший отрезок</span>
                        <div className="font-bold text-zinc-200 text-xs truncate">
                          {stats.bestSegment?.title || 'Дни 71–80'}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-[10px] text-zinc-400 uppercase">Серия</span>
                        <div className="font-bold text-zinc-200 text-xs">
                          {stats.longestStrongStreak || 10} дней подряд
                        </div>
                      </div>
                    </div>
                  )}

                  {review?.summary && (
                    <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                      {review.summary}
                    </p>
                  )}

                  {review?.letterToSelf && (
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 font-serif italic border-l-2 border-amber-500/50 line-clamp-3">
                      {review.letterToSelf.split('\n\n')[0]}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        setSelectedMilestone(num)
                      }}
                      className="text-amber-400 hover:text-amber-300 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <span>Смотреть полный разбор рубежа</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedMilestone !== null && (
        <MilestoneModal
          isOpen={selectedMilestone !== null}
          milestoneNumber={selectedMilestone}
          tier={tier}
          onClose={() => setSelectedMilestone(null)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}
