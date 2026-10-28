'use client'

import React, { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { Check, Flame, Heart, Loader2, Sparkles, Star, Trophy, X } from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import type { PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'
import type { OvercomeLevel } from '@/lib/ogonek/types'

type ItemEvaluation = {
  num: number
  text: string
  score: number
  comment?: string
  overcome?: number
  tags?: string[]
  type: 'pride' | 'gratitude'
}

type Props = {
  isOpen: boolean
  prides: string[]
  gratitudes: string[]
  dayNumber: number
  soundEnabled?: boolean
  onClose: () => void
  onAccept: (
    evalMap: Record<number, PrideEvaluation>,
    mentorWord: string,
    averageScore: number
  ) => void
}

export function EvaluationCeremonyModal({
  isOpen,
  prides,
  gratitudes,
  dayNumber,
  soundEnabled = true,
  onClose,
  onAccept,
}: Props) {
  useBodyScrollLock(isOpen)

  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<ItemEvaluation[]>([])
  const [animatedScores, setAnimatedScores] = useState<Record<number, number>>({})
  const [activeItemIndex, setActiveItemIndex] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [averageScore, setAverageScore] = useState(9.6)
  const [mentorWord, setMentorWord] = useState(
    'Сегодня ты удержал планку дисциплины и проявил характер. Каждая победа над собой укрепляет огонь внутри!'
  )

  const animationTimersRef = useRef<NodeJS.Timeout[]>([])

  const clearTimers = () => {
    animationTimersRef.current.forEach((t) => clearTimeout(t))
    animationTimersRef.current = []
  }

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  // При открытии вызываем реальный роут /api/evaluate
  useEffect(() => {
    if (!isOpen) return

    clearTimers()
    setIsLoading(true)
    setIsFinished(false)
    setActiveItemIndex(0)
    setAnimatedScores({})

    const validPrides = prides.filter((p) => typeof p === 'string' && p.trim().length > 0)
    const validGratitudes = gratitudes.filter((g) => typeof g === 'string' && g.trim().length > 0)

    fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prides: validPrides,
        gratitudes: validGratitudes,
        dayNumber,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const rawPrideEvals = Array.isArray(data?.prideEvaluations) ? data.prideEvaluations : []
        const rawGratEvals = Array.isArray(data?.gratitudeEvaluations) ? data.gratitudeEvaluations : []

        const evaluatedItems: ItemEvaluation[] = []

        validPrides.forEach((text, i) => {
          const ev = rawPrideEvals[i]
          evaluatedItems.push({
            num: i + 1,
            text,
            score: typeof ev?.score === 'number' ? Math.max(1, Math.min(10, ev.score)) : 9,
            comment: ev?.comment || 'Отличная концентрация и преодоление.',
            overcome: typeof ev?.overcome === 'number' ? ev.overcome : 1,
            tags: Array.isArray(ev?.tags) ? ev.tags : ['#Дисциплина'],
            type: 'pride',
          })
        })

        validGratitudes.forEach((text, i) => {
          const ev = rawGratEvals[i]
          evaluatedItems.push({
            num: validPrides.length + i + 1,
            text,
            score: typeof ev?.score === 'number' ? Math.max(1, Math.min(10, ev.score)) : 10,
            comment: ev?.comment || 'Глубокая искренняя благодарность.',
            overcome: 0,
            tags: ['#Осознанность'],
            type: 'gratitude',
          })
        })

        const avg =
          typeof data?.averageScore === 'number'
            ? data.averageScore
            : evaluatedItems.length > 0
            ? Number(
                (
                  evaluatedItems.reduce((acc, it) => acc + it.score, 0) / evaluatedItems.length
                ).toFixed(1)
              )
            : 9.6

        const mentor =
          data?.mentorWord ||
          data?.daySummary ||
          'Сегодня ты проявил характер и удержал планку дисциплины. Каждое преодоление укрепляет твой стрик и внутренний огонь. Продолжай движение вперед!'

        setItems(evaluatedItems)
        setAverageScore(avg)
        setMentorWord(mentor)
        setIsLoading(false)

        // Запуск поочередной анимации заполнения шкал (4-6 секунд)
        startSequentialAnimation(evaluatedItems)
      })
      .catch((err) => {
        console.warn('Ceremony fetch error:', err)
        // Fallback
        const fallbackItems: ItemEvaluation[] = validPrides.map((text, i) => ({
          num: i + 1,
          text,
          score: 9,
          comment: 'Преодоление барьера и фиксация победы.',
          overcome: 1,
          tags: ['#Характер'],
          type: 'pride',
        }))
        setItems(fallbackItems)
        setIsLoading(false)
        startSequentialAnimation(fallbackItems)
      })
  }, [isOpen, prides, gratitudes, dayNumber])

  // Поочередное заполнение круговых шкал или прогресс-баров
  const startSequentialAnimation = (list: ItemEvaluation[]) => {
    clearTimers()
    const stepDuration = 800 // 800ms на каждый элемент

    list.forEach((item, index) => {
      // 1. Активируем текущий элемент
      const startTimer = setTimeout(() => {
        setActiveItemIndex(index)

        // 2. Плавное нарастание счета
        const steps = 10
        for (let s = 1; s <= steps; s++) {
          const subTimer = setTimeout(() => {
            const currentVal = Math.round((item.score / steps) * s)
            setAnimatedScores((prev) => ({ ...prev, [index]: currentVal }))
          }, (stepDuration / steps) * s)
          animationTimersRef.current.push(subTimer)
        }

        // Если получен наивысший балл 10★ — праздничные частицы конфетти
        if (item.score === 10) {
          const confettiTimer = setTimeout(() => {
            playSuccess(soundEnabled)
            try {
              confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.65 },
                colors: ['#FF5C00', '#FFD700', '#FFFFFF', '#00BA7C'],
              })
            } catch {}
          }, stepDuration - 100)
          animationTimersRef.current.push(confettiTimer)
        }
      }, index * stepDuration)

      animationTimersRef.current.push(startTimer)
    })

    // Финал всей церемонии (показ общего балла и слова ментора)
    const finalTimer = setTimeout(() => {
      setIsFinished(true)
      playSuccess(soundEnabled)
      try {
        confetti({
          particleCount: 75,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#FF5C00', '#FFD700', '#38BDF8'],
        })
      } catch {}
    }, list.length * stepDuration + 400)

    animationTimersRef.current.push(finalTimer)
  }

  // Мгновенный пропуск анимации
  const handleSkip = () => {
    clearTimers()
    const fullScores: Record<number, number> = {}
    items.forEach((item, idx) => {
      fullScores[idx] = item.score
    })
    setAnimatedScores(fullScores)
    setIsFinished(true)
    playClick(soundEnabled)
  }

  // Принять и сохранить в летопись
  const handleAccept = () => {
    playSuccess(soundEnabled)
    const evalMap: Record<number, PrideEvaluation> = {}
    items
      .filter((it) => it.type === 'pride')
      .forEach((p, idx) => {
        evalMap[idx] = {
          scale: p.score,
          overcome: (p.overcome as OvercomeLevel) || 1,
          tags: p.tags || ['#Дисциплина'],
          verdict: p.comment || 'Оценено ИИ',
        }
      })

    onAccept(evalMap, mentorWord, averageScore)
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-[#000000] border border-[#2f3336] rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow эффект на фоне */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-[var(--accent)]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Шапка */}
        <div className="flex items-center justify-between relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-bold border border-[var(--accent)]/20">
            <Sparkles size={13} />
            <span>AI-Церемония Оценки · День #{dayNumber}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Заголовок */}
        <div className="text-center relative z-10">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>Калибровка Ментора Огонька</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Анализ глубины преодоления, дисциплины и благодарностей
          </p>
        </div>

        {/* Лоадер при анализе нейросетью */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 size={36} className="text-[var(--accent)] animate-spin" />
            <p className="text-sm font-semibold text-zinc-300">
              Google Gemini оценивает масштаб побед дня...
            </p>
            <span className="text-xs text-zinc-500">
              Модель gemini-1.5-flash · Калиброванная шкала 1–10★
            </span>
          </div>
        )}

        {/* Список пунктов с последовательным заполнением шкал */}
        {!isLoading && items.length > 0 && (
          <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto no-scrollbar pr-1 relative z-10">
            {items.map((item, idx) => {
              const currentScore = animatedScores[idx] ?? 0
              const isActive = activeItemIndex === idx && !isFinished
              const isTen = item.score === 10

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? 'border-[var(--accent)] bg-zinc-900/80 shadow-md scale-[1.01]'
                      : 'border-zinc-800/80 bg-zinc-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-zinc-500 flex-none">
                        {item.type === 'pride' ? `🔥 ${idx + 1}` : `❤️`}
                      </span>
                      <span className="text-xs sm:text-[13px] font-medium text-zinc-200 truncate">
                        {item.text}
                      </span>
                    </div>

                    {/* Оценка балла */}
                    <div className="flex items-center gap-1 flex-none">
                      <span
                        className={`text-xs sm:text-sm font-black transition-all ${
                          isTen
                            ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                            : 'text-[var(--accent)]'
                        }`}
                      >
                        {currentScore}★
                      </span>
                    </div>
                  </div>

                  {/* Прогресс-бар заполнения шкалы (1-10★) */}
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        isTen ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_10px_#fbbf24]' : 'bg-[var(--accent)]'
                      }`}
                      style={{ width: `${(currentScore / 10) * 100}%` }}
                    />
                  </div>

                  {/* Комментарий от Gemini */}
                  {currentScore > 0 && item.comment && (
                    <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug line-clamp-1 italic">
                      «{item.comment}»
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Результат: средний балл дня + Слово Ментора */}
        {isFinished && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Средний балл дня:</span>
                <span className="text-2xl font-black text-amber-400 flex items-center gap-1.5">
                  <Star size={20} className="fill-amber-400 text-amber-400" />
                  ⭐ {averageScore}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  День закрыт на отлично
                </span>
              </div>
            </div>

            {/* Слово Ментора Огонька */}
            <div className="pt-2 border-t border-zinc-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                <Flame size={14} className="text-[var(--accent)]" /> Слово Ментора Огонька:
              </span>
              <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed italic">
                «{mentorWord}»
              </p>
            </div>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="flex flex-col gap-2 relative z-10 mt-1">
          <button
            type="button"
            onClick={isFinished ? handleAccept : handleSkip}
            className="w-full py-3 px-5 rounded-full bg-[var(--text)] text-[var(--bg)] font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {isFinished ? (
              <>
                <Check size={16} />
                <span>Принять и сохранить в летопись</span>
              </>
            ) : (
              <>
                <span>Показать результат</span>
              </>
            )}
          </button>

          {!isFinished && (
            <button
              type="button"
              onClick={() => {
                handleSkip()
                handleAccept()
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 text-center"
            >
              Пропустить анимацию
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
