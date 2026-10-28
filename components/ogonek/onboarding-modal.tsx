'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  Check,
  Sparkles,
  Layers,
  MessageSquare,
  Trophy,
  BarChart3,
  BookOpen,
  ArrowRight,
  X,
  User,
  Shield,
  Loader2,
  AlertCircle,
  SkipForward,
} from 'lucide-react'
import { Button, Card, Badge } from './ui'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { isUsernameAvailable } from '@/lib/supabase/client'

type Props = {
  isOpen: boolean
  initialUsername?: string
  onClose: () => void
  onSave?: (username: string, level: number, firstPrideText: string) => void
  onSaveFirstPride?: (text: string, level: number) => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
}

const LEVELS = [
  { level: 1, title: 'Уровень 1', quota: '1 гордость и 1 благодарность', desc: 'Лёгкий старт — 2 минуты в день' },
  { level: 2, title: 'Уровень 2', quota: '2 гордости и 2 благодарности', desc: 'Комфортный ритм' },
  { level: 3, title: 'Уровень 3', quota: '3 гордости и 3 благодарности', desc: 'Оптимальный баланс (Рекомендуется)' },
  { level: 4, title: 'Уровень 4', quota: '4 гордости и 4 благодарности', desc: 'Высокая планка дисциплины' },
  { level: 5, title: 'Уровень 5', quota: '5 гордостей и 5 благодарностей', desc: 'Максимальный фокус — самый жёсткий' },
]

const TOUR_SCREENS = [
  {
    icon: BookOpen,
    color: '#FF5C00',
    title: 'Лента дней и летопись',
    desc: 'Хронология твоих побед за 2+ года. Каждый день хранит гордости, преодоления и оценки.',
  },
  {
    icon: MessageSquare,
    color: '#3B82F6',
    title: 'Мессенджер соратников',
    desc: 'Чаты в стиле Telegram Web: личные диалоги, папки, пересылка гордостей и обмен опытом.',
  },
  {
    icon: Trophy,
    color: '#F59E0B',
    title: 'Честный рейтинг',
    desc: 'Таблицы лидеров по дням стрика и среднему баллу среди друзей и тех, кто открыл профиль.',
  },
  {
    icon: BarChart3,
    color: '#10B981',
    title: 'Аналитика и ИИ-разбор',
    desc: 'Оценка глубины побед через Google Gemini, темы преодоления и динамика личной силы.',
  },
  {
    icon: Shield,
    color: '#8B5CF6',
    title: 'Evidence Vault',
    desc: 'Хранилище артефактов и железных доказательств побед для верификации высших достижений.',
  },
]

export function OnboardingModal({
  isOpen,
  initialUsername = '',
  onClose,
  onSave,
  onSaveFirstPride,
  onNotify,
  soundEnabled = true,
}: Props) {
  // Шаги онбординга:
  // 1: Выбор уникального @ника
  // 2: Выбор уровня сложности (1-5)
  // 3: Короткий тур по 5 разделам (пропускаемый)
  // 4: Первая гордость
  const [step, setStep] = useState<number>(1)
  const [tourIndex, setTourIndex] = useState<number>(0)
  const [username, setUsername] = useState<string>(
    initialUsername ? initialUsername.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) : 'user_1'
  )
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameError, setUsernameError] = useState<string>('')
  const [selectedLevel, setSelectedLevel] = useState<number>(3)
  const [prideText, setPrideText] = useState<string>('Начал вести Огонёк и выбрал свой темп')

  // Live validation & uniqueness check
  useEffect(() => {
    const clean = username.trim().toLowerCase()
    if (!clean) {
      setUsernameStatus('invalid')
      setUsernameError('Никнейм не может быть пустым')
      return
    }
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setUsernameStatus('invalid')
      setUsernameError('3–20 символов: латиница, цифры и _')
      return
    }

    setUsernameStatus('checking')
    setUsernameError('')

    const timer = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(clean)
        if (available) {
          setUsernameStatus('available')
          setUsernameError('')
        } else {
          setUsernameStatus('taken')
          setUsernameError('Этот никнейм уже занят')
        }
      } catch {
        setUsernameStatus('available')
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [username])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!isOpen) return null

  const handleNext = () => {
    playClick(soundEnabled)
    if (step === 3 && tourIndex < TOUR_SCREENS.length - 1) {
      setTourIndex((i) => i + 1)
      return
    }
    setStep((s) => s + 1)
  }

  const handleSkipTour = () => {
    playClick(soundEnabled)
    setStep(4)
  }

  const handleFinish = () => {
    playSuccess(soundEnabled)
    const cleanNick = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user'
    if (onSave) {
      onSave(cleanNick, selectedLevel, prideText)
    } else if (onSaveFirstPride) {
      onSaveFirstPride(prideText, selectedLevel)
    }
    onNotify('Первая гордость зафиксирована! Добро пожаловать в Огонёк ✨')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Онбординг Огонька"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header with step dots */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center font-bold">
              ✦
            </span>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Старт в Огоньке
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === s
                      ? 'w-6 bg-[#FF5C00]'
                      : step > s
                      ? 'w-2 bg-emerald-500'
                      : 'w-2 bg-zinc-200 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть онбординг"
              className="w-9 h-9 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 flex-1 flex flex-col justify-center min-h-[360px]">
          <AnimatePresence mode="wait">
            {/* ШАГ 1: ВЫБОР УНИКАЛЬНОГО НИКНЕЙМА */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col gap-4 text-left"
              >
                <div className="text-center mb-1">
                  <div className="w-14 h-14 rounded-2xl bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <User size={28} />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    Выбери свой уникальный @ник
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    По этому нику тебя найдут друзья в поиске и рейтинге.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="onboarding-username" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Твой никнейм
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-zinc-400 font-semibold select-none">@</span>
                    <input
                      id="onboarding-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="alex_fire"
                      className="w-full pl-8 pr-10 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#FF5C00] focus:outline-none text-zinc-900 dark:text-zinc-50 text-sm font-medium transition-colors"
                      maxLength={20}
                      autoFocus
                    />
                    <div className="absolute right-3.5 flex items-center">
                      {usernameStatus === 'checking' && (
                        <Loader2 size={16} className="text-zinc-400 animate-spin" />
                      )}
                      {usernameStatus === 'available' && (
                        <Check size={16} className="text-emerald-500" />
                      )}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                        <AlertCircle size={16} className="text-rose-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className={usernameStatus === 'available' ? 'text-emerald-500 font-medium' : 'text-zinc-400'}>
                      {usernameStatus === 'available'
                        ? '✓ Никнейм свободен'
                        : usernameError || 'От 3 до 20 символов (a-z, 0-9, _)'}
                    </span>
                    <span className="text-zinc-400">{username.length}/20</span>
                  </div>
                </div>

                <div className="pt-3">
                  <Button
                    variant="primary"
                    className="w-full py-3"
                    disabled={usernameStatus !== 'available'}
                    onClick={handleNext}
                  >
                    <span>Продолжить</span>
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ШАГ 2: ВЫБОР УРОВНЯ СЛОЖНОСТИ (1-5) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col gap-3"
              >
                <div className="text-center mb-1">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Выбери уровень сложности
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Сколько побед и благодарностей в день ты обязуешься закрывать (смена раз в 30 дней)
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {LEVELS.map((lvl) => {
                    const active = selectedLevel === lvl.level
                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => {
                          setSelectedLevel(lvl.level)
                          playClick(soundEnabled)
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          active
                            ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-zinc-900 dark:text-zinc-50 shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                              {lvl.title}
                            </span>
                            {lvl.level === 3 && (
                              <Badge variant="flame">Рекомендуется</Badge>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {lvl.quota} · {lvl.desc}
                          </p>
                        </div>
                        {active && <Check size={18} className="text-[#FF5C00] shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                <div className="pt-2">
                  <Button variant="primary" className="w-full py-2.5" onClick={handleNext}>
                    Выбрать Уровень {selectedLevel}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ШАГ 3: КОРОТКИЙ ТУР ПО 5 РАЗДЕЛАМ (ПРОПУСКАЕМЫЙ) */}
            {step === 3 && (
              <motion.div
                key={`tour-${tourIndex}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col gap-4 text-center items-center"
              >
                {(() => {
                  const current = TOUR_SCREENS[tourIndex]
                  const Icon = current.icon
                  return (
                    <>
                      <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center shadow-md my-2" style={{ color: current.color }}>
                        <Icon size={32} />
                      </div>

                      <div className="max-w-xs">
                        <div className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400 mb-1">
                          Раздел {tourIndex + 1} из {TOUR_SCREENS.length}
                        </div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                          {current.title}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                          {current.desc}
                        </p>
                      </div>

                      {/* Индикаторы слайдов тура */}
                      <div className="flex gap-1.5 my-1">
                        {TOUR_SCREENS.map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-200 ${
                              i === tourIndex ? 'w-5 bg-[#FF5C00]' : 'w-2 bg-zinc-200 dark:bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="w-full flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleSkipTour}
                          className="flex-1 py-2.5 px-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                        >
                          Пропустить тур
                        </button>
                        <Button
                          variant="primary"
                          className="flex-1 py-2.5"
                          onClick={handleNext}
                        >
                          <span>{tourIndex < TOUR_SCREENS.length - 1 ? 'Далее' : 'К первой записи'}</span>
                          <ArrowRight size={15} />
                        </Button>
                      </div>
                    </>
                  )
                })()}
              </motion.div>
            )}

            {/* ШАГ 4: ПЕРВАЯ ГОРДОСТЬ */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col gap-3"
              >
                <div className="text-center mb-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center mx-auto mb-2">
                    <Sparkles size={24} />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Зафиксируй свою первую гордость
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    С чего начинается твой путь 700 дней Огонька?
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="onboarding-pride" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Гордость #01
                  </label>
                  <textarea
                    id="onboarding-pride"
                    value={prideText}
                    onChange={(e) => setPrideText(e.target.value)}
                    placeholder="Например: Сделал первый шаг и зафиксировал цель не сдаваться 700 дней"
                    className="w-full p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-[#FF5C00] focus:outline-none text-zinc-900 dark:text-zinc-50 text-sm min-h-[90px] resize-none"
                    autoFocus
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    className="w-full py-3"
                    disabled={!prideText.trim()}
                    onClick={handleFinish}
                  >
                    <span>Зажечь Огонёк</span>
                    <Sparkles size={16} />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
