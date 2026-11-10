'use client'

/**
 * ============================================================================
 * components/ogonek/milestones/milestone-modal.tsx: ЮБИЛЕЙНАЯ ВЕХА (100, 200, 300...)
 * ============================================================================
 * Дифференциация интерфейса по тарифам (Этап 11):
 * - Free: красивый золотой баннер вверху («100 дней огня!»), блокировка ИИ-разбора, CTA Премиум
 * - Pro: аналитический экран с цифрами (подсчёт кодом: победы, средний балл, декады, теги) + текстовые связки ИИ
 * - Ultra: глубокая персонализация, «Письмо к себе через 100 дней» (3 абзаца: Исток, Горнило, Вектор),
 *   трансформация характера, поле для личной рефлексии и кнопка «Сохранить в Свод» (Vault)
 * ============================================================================
 */

import React, { useState, useEffect, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  Sparkles,
  Award,
  TrendingUp,
  Tag,
  Shield,
  Check,
  ChevronRight,
  X,
  Lock,
  Crown,
  BookOpen,
  Calendar,
  Share2,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { SubscriptionTier } from '@/lib/ogonek/permissions'
import type { MilestoneReviewResult, MilestoneStatsSummary } from '@/lib/server/milestones'

export interface MilestoneModalProps {
  isOpen: boolean
  milestoneNumber: number
  tier: SubscriptionTier
  onClose: () => void
  onUpgrade?: (feature: string) => void
  onNotify?: (msg: string) => void
  initialReview?: MilestoneReviewResult
  onSavedToVault?: (milestoneNumber: number, reviewText?: string) => void
  soundEnabled?: boolean
}

export function MilestoneModal({
  isOpen,
  milestoneNumber,
  tier,
  onClose,
  onUpgrade,
  onNotify,
  initialReview,
  onSavedToVault,
  soundEnabled = true,
}: MilestoneModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<MilestoneReviewResult | null>(initialReview || null)
  const [userReview, setUserReview] = useState('')
  const [savedToVault, setSavedToVault] = useState(false)
  const [savingVault, setSavingVault] = useState(false)
  const titleId = useId()

  const isFree = tier === 'free'
  const isPro = tier === 'pro'
  const isUltra = tier === 'ultra'

  // Загрузка или расчёт данных вехи при открытии
  useEffect(() => {
    if (!isOpen) return

    if (initialReview) {
      setData(initialReview)
      setSavedToVault(Boolean(initialReview.savedToVault))
      if (initialReview.userReviewText) {
        setUserReview(initialReview.userReviewText)
      }
      return
    }

    let active = true
    setLoading(true)

    fetch('/api/milestones/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneNumber }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        if (json.success && json.data) {
          setData(json.data)
          setSavedToVault(Boolean(json.data.savedToVault))
          if (json.data.userReviewText) {
            setUserReview(json.data.userReviewText)
          }
        }
      })
      .catch((err) => {
        console.warn('[Milestone fetch error]:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, milestoneNumber, initialReview])

  // Закрытие по клавише Esc
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Сохранение в Свод (Vault)
  const handleToggleVault = async () => {
    playClick(soundEnabled)
    setSavingVault(true)
    const nextSaved = !savedToVault

    try {
      const res = await fetch('/api/milestones/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneNumber,
          savedToVault: nextSaved,
          userReviewText: userReview.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSavedToVault(nextSaved)
        playSuccess(soundEnabled)
        onNotify?.(nextSaved ? '⚡ Веха сохранена в Evidence Vault' : 'Веха убрана из Свода')
        onSavedToVault?.(milestoneNumber, userReview.trim())
      } else {
        onNotify?.(json.error || 'Не удалось сохранить веху')
      }
    } catch {
      onNotify?.('Ошибка сети при сохранении в Свод')
    } finally {
      setSavingVault(false)
    }
  }

  if (!isOpen) return null

  const stats: MilestoneStatsSummary | undefined = data?.stats
  const review = data?.review

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-[#0c0d0e] border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col gap-6 text-white overflow-hidden my-auto max-h-[92vh] overflow-y-auto no-scrollbar"
        >
          {/* Фоновый золотой ореол */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-tr from-amber-600/15 to-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Верхняя панель и крестик */}
          <div className="flex items-center justify-between relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black tracking-wider uppercase">
              <Flame size={14} className="fill-amber-400 animate-pulse text-amber-400" />
              <span>ЮБИЛЕЙНЫЙ РУБЕЖ #{milestoneNumber} ДНЕЙ</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Закрыть юбилейное окно"
            >
              <X size={20} />
            </button>
          </div>

          {/* Заголовок */}
          <div className="text-center relative z-10 flex flex-col items-center gap-1.5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)] mb-1">
              <Award size={36} className="text-black" />
            </div>
            <h2 id={titleId} className="text-2xl sm:text-3xl font-[900] tracking-tight text-white">
              {milestoneNumber} Дней Непрерывного Огня
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
              Сотня шагов, закаливших характер. Факты личной силы, записанные день за днём.
            </p>
          </div>

          {/* ================================================================= */}
          {/* 1. БЕСПЛАТНЫЙ ТАРИФ (FREE): КРАСИВЫЙ БАННЕР ВВЕРХУ + CTA ПРЕМИУМ */}
          {/* ================================================================= */}
          {isFree && (
            <div className="relative z-10 flex flex-col gap-5">
              {/* Золотой баннер верха */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/30 flex items-start gap-3.5">
                <Crown size={24} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm sm:text-base font-bold text-amber-200">
                    {milestoneNumber} дней огня! Твоя летопись растёт.
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Доступ к подробному аналитическому разбору вехи, декадам преодолений и текстовым связкам ИИ открывается в тарифе Премиум.
                  </p>
                </div>
              </div>

              {/* Заблокированные метрики для подогрева интереса */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 opacity-60 pointer-events-none filter blur-[1px]">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-white">300+</div>
                  <div className="text-[11px] text-zinc-400">Побед зафиксировано</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-amber-400">8.4★</div>
                  <div className="text-[11px] text-zinc-400">Средний балл</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-white">10</div>
                  <div className="text-[11px] text-zinc-400">Декад пути</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                  <div className="text-xl font-bold text-white">#1</div>
                  <div className="text-[11px] text-zinc-400">#Дисциплина</div>
                </div>
              </div>

              {/* Кнопка перехода на Премиум */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onUpgrade?.('milestoneReport')
                  }}
                  className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm tracking-wide shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
                  aria-label="Открыть разбор вехи в Премиум"
                >
                  <Sparkles size={16} />
                  <span>Открыть разбор вехи в Премиум</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-sm transition-colors"
                >
                  Продолжить путь
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. ТАРИФ PRO & ULTRA: АНАЛИТИЧЕСКИЙ ЭКРАН С ЦИФРАМИ ЗА 100 ДНЕЙ   */}
          {/* ================================================================= */}
          {(isPro || isUltra) && stats && (
            <div className="relative z-10 flex flex-col gap-6">
              {/* 4 Карточки ключевых цифр */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Побед всего</span>
                  <div className="text-2xl sm:text-3xl font-[900] text-white tracking-tight flex items-baseline gap-1">
                    <span>{stats.totalPrides}</span>
                    <span className="text-xs font-normal text-amber-500/80">фактов</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-amber-500/20 flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide">Средний балл</span>
                  <div className="text-2xl sm:text-3xl font-[900] text-amber-400 tracking-tight flex items-baseline gap-1">
                    <span>{stats.averageScore.toFixed(1)}</span>
                    <span className="text-xs font-bold text-amber-400/80">★</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Преодоления L2-L3</span>
                  <div className="text-2xl sm:text-3xl font-[900] text-white tracking-tight">
                    {stats.overcomeDistribution.level2 + stats.overcomeDistribution.level3}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Благодарностей</span>
                  <div className="text-2xl sm:text-3xl font-[900] text-zinc-200 tracking-tight">
                    {stats.totalGratitudes}
                  </div>
                </div>
              </div>

              {/* Топ-теги */}
              {stats.topTags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Tag size={13} className="text-amber-400" />
                    <span>Ключевые опоры периода</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {stats.topTags.map((t: { tag: string; count: number }) => (
                      <span
                        key={t.tag}
                        className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold flex items-center gap-1.5"
                      >
                        <span>{t.tag}</span>
                        <span className="text-[10px] text-amber-400/60 font-semibold">×{t.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Динамика по декадам (10 полосок) */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <TrendingUp size={13} className="text-amber-400" />
                  <span>Динамика по декадам пути (10 периодов)</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {stats.decadeDynamics.map((d: { decadeIndex: number; title: string; averageScore: number; pridesCount: number }) => (
                    <div
                      key={d.decadeIndex}
                      className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1 text-[11px]"
                    >
                      <span className="font-bold text-zinc-300">{d.title}</span>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>{d.pridesCount} побед</span>
                        <span className="font-black text-amber-400">{d.averageScore.toFixed(1)}★</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(15, (d.averageScore / 10) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Текстовые выводы ИИ для тарифа PRO */}
              {isPro && review && (
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col gap-2.5 text-xs text-zinc-300 leading-relaxed">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Sparkles size={15} />
                    <span>{review.title || 'Сводный комментарий Огонька'}</span>
                  </div>
                  {review.summary && <p>{review.summary}</p>}
                  {review.dynamicsComment && <p>{review.dynamicsComment}</p>}
                  {review.tagsComment && <p className="text-zinc-400">{review.tagsComment}</p>}

                  {/* Апселл до Ultra */}
                  <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>⚡ Письмо к себе через 100 дней и глубинная трансформация доступны в Ultra</span>
                    <button
                      type="button"
                      onClick={() => onUpgrade?.('milestoneUltra')}
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    >
                      <span>Ultra</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* 3. ТАРИФ ULTRA: 4 СТРУКТУРИРОВАННЫХ РАЗДЕЛА ТРАНСФОРМАЦИИ     */}
              {/* ============================================================= */}
              {isUltra && review && (
                <div className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Раздел 1: Как ты изменился */}
                    <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/25 flex flex-col gap-1.5 text-xs">
                      <span className="font-black text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Sparkles size={13} />
                        <span>Как ты изменился</span>
                      </span>
                      <p className="text-zinc-200 leading-relaxed">
                        {review.howYouChanged || 'Формулировки очистились от суеты, а фиксация побед стала естественным стержнем характера.'}
                      </p>
                    </div>

                    {/* Раздел 2: Что стало твоей силой */}
                    <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/25 flex flex-col gap-1.5 text-xs">
                      <span className="font-black text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Shield size={13} />
                        <span>Что стало твоей силой</span>
                      </span>
                      <p className="text-zinc-200 leading-relaxed">
                        {review.whatBecameYourStrength || `Сила выкована в преодолении: зафиксировано ${stats.totalPrides} побед со средним баллом ${stats.last100AverageScore.toFixed(1)}★.`}
                      </p>
                    </div>

                    {/* Раздел 3: Кто и что тебя вдохновляет */}
                    <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/25 flex flex-col gap-1.5 text-xs">
                      <span className="font-black text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Award size={13} />
                        <span>Кто и что тебя вдохновляет</span>
                      </span>
                      <p className="text-zinc-200 leading-relaxed">
                        {review.whoAndWhatInspiresYou || 'В записях ясно читается уважение к близким, соратникам и памяти наставников.'}
                      </p>
                    </div>

                    {/* Раздел 4: Что дальше */}
                    <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/25 flex flex-col gap-1.5 text-xs">
                      <span className="font-black text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <TrendingUp size={13} />
                        <span>Что дальше</span>
                      </span>
                      <p className="text-zinc-200 leading-relaxed">
                        {review.whatIsNext || `Рубеж пройден. Впереди следующая сотня дней с повышением планки требований к себе.`}
                      </p>
                    </div>
                  </div>

                  {/* Полное связное письмо (150-250 слов) */}
                  {review.letterToSelf && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-black border border-amber-500/30 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs tracking-wide uppercase">
                        <BookOpen size={15} />
                        <span>Сводное послание Ментора к рубежу</span>
                      </div>
                      <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-2.5 font-serif italic border-l-2 border-amber-500/40 pl-3">
                        {review.letterToSelf.split('\n\n').map((paragraph: string, pIdx: number) => (
                          <p key={pIdx}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Поле личной рефлексии пользователя */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="user-milestone-review" className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                      Твоя личная заметка к этой вехе
                    </label>
                    <textarea
                      id="user-milestone-review"
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      placeholder="Что ты сам понял за эти 100 дней? Главный урок..."
                      rows={2}
                      maxLength={1000}
                      className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Действия внизу для Pro / Ultra */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleToggleVault}
                  disabled={savingVault}
                  className={`w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-all ${
                    savedToVault
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-orange-500/20'
                  }`}
                  aria-label={savedToVault ? 'Веха сохранена в Evidence Vault' : 'Сохранить веху в Evidence Vault'}
                >
                  <Shield size={16} />
                  <span>{savedToVault ? '✓ Сохранено в Свод (Vault)' : 'Сохранить в Свод (Vault)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(
                        `🔥 Мой рубеж #${milestoneNumber} дней в Огоньке! Средний балл: ${stats?.last100AverageScore || 8.8}★. Летопись личной силы.`
                      )
                      onNotify?.('Карточка рубежа скопирована для соратников')
                    }
                  }}
                  className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                  aria-label="Поделиться карточкой вехи"
                >
                  <Share2 size={16} />
                  <span>Поделиться</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-sm transition-colors"
                >
                  Закрыть
                </button>
              </div>

              {savedToVault && (
                <p className="text-center text-[11px] text-amber-400/80 -mt-2">
                  Веха закреплена золотой карточкой в твоём профиле и Evidence Vault.
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
