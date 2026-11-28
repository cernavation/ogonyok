'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Flame,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Briefcase,
  Heart,
  RotateCcw,
  ShieldCheck,
  Award,
  ChevronRight,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
} from 'lucide-react'
import { TextBlink } from '@/components/ui/text-blink'
import { TextEffect } from '@/components/ui/text-effect'
import { GlowCard } from '@/components/ui/spotlight-card'

type CeremonyStep = 'thinking' | 'score' | 'prides' | 'summary'
type MilestoneTab = 'milestone-100' | 'milestone-10'
type CoachMode = 'growth' | 'slump'

export function AiCeremonyShowcase() {
  const [activeTab, setActiveTab] = useState<'evening' | 'longterm'>('evening')
  const [step, setStep] = useState<CeremonyStep>('thinking')
  const [milestone, setMilestone] = useState<MilestoneTab>('milestone-100')
  const [coachMode, setCoachMode] = useState<CoachMode>('growth')
  const [key, setKey] = useState(0)

  // Simulation step transitions
  useEffect(() => {
    if (activeTab !== 'evening') return

    setStep('thinking')
    const t1 = setTimeout(() => setStep('score'), 2200)
    const t2 = setTimeout(() => setStep('prides'), 3800)
    const t3 = setTimeout(() => setStep('summary'), 6000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [activeTab, key])

  const restartSimulation = () => {
    setKey((prev) => prev + 1)
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto">
      {/* ── MODE SWITCHER TABS ────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
        <div className="p-1 rounded-full bg-white/[0.06] border border-white/10 inline-flex items-center">
          <button
            type="button"
            onClick={() => setActiveTab('evening')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'evening'
                ? 'bg-[#0071e3] text-white shadow-lg shadow-[#0071e3]/30'
                : 'text-[#86868b] hover:text-white'
            }`}
          >
            <BrainCircuit size={15} />
            <span>Церемония оценки вечера (Live AI)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('longterm')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'longterm'
                ? 'bg-gradient-to-r from-[#f56900] to-[#ff8c00] text-white shadow-lg shadow-[#f56900]/30'
                : 'text-[#86868b] hover:text-white'
            }`}
          >
            <Award size={15} />
            <span>Долгосрочный наставник (10 и 100 дней)</span>
          </button>
        </div>

        {activeTab === 'evening' && (
          <button
            type="button"
            onClick={restartSimulation}
            className="p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[#86868b] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Запустить анимацию заново"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Запустить снова</span>
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: ВЕЧЕРНЯЯ ЦЕРЕМОНИЯ (THINKING -> SCORE -> PRIDES -> SUMMARY)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'evening' && (
        <GlowCard
          glowColor="blue"
          customSize
          className="p-6 sm:p-8 md:p-10 border border-white/15 bg-[#0f1117]/75 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff]">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-white flex items-center gap-2">
                  <span>Winlog AI Mentor</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Live Demo
                  </span>
                </div>
                <div className="text-[12px] text-[#86868b]">
                  Оценка фактов преодоления и силы воли
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-xs font-mono text-[#86868b]">
              <span className={step === 'thinking' ? 'text-[#2997ff] font-bold' : 'text-white/60'}>
                1. Анализ
              </span>
              <span>›</span>
              <span className={step === 'score' ? 'text-[#2997ff] font-bold' : 'text-white/60'}>
                2. Оценка
              </span>
              <span>›</span>
              <span className={step === 'prides' ? 'text-[#2997ff] font-bold' : 'text-white/60'}>
                3. Гордости
              </span>
              <span>›</span>
              <span className={step === 'summary' ? 'text-[#2997ff] font-bold' : 'text-white/60'}>
                4. Сводка
              </span>
            </div>
          </div>

          {/* 1. THINKING PHASE (TextBlink) */}
          {step === 'thinking' && (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/25 flex items-center justify-center text-[#2997ff] mb-2 animate-pulse">
                <BrainCircuit size={28} />
              </div>
              <div className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight">
                <TextBlink minOpacity={0.3} className="text-[#2997ff]">
                  Нейросеть Winlog AI калибрует факты...
                </TextBlink>
              </div>
              <p className="text-[14px] text-[#86868b] max-w-[480px]">
                <TextBlink minOpacity={0.4} className="text-[#86868b]">
                  Взвешивание силы преодоления саботажа · Выделение истинного характера · Сверка с утренними намерениями
                </TextBlink>
              </p>
            </div>
          )}

          {/* 2. SCORE & PRIDES & SUMMARY */}
          {step !== 'thinking' && (
            <div className="space-y-6">
              {/* Overall Day Score Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-white/[0.04] via-[#0071e3]/10 to-transparent border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5 text-center sm:text-left">
                  <div className="w-20 h-20 rounded-2xl bg-black/60 border border-[#0071e3]/40 flex flex-col items-center justify-center shadow-lg shadow-[#0071e3]/20">
                    <span className="text-[28px] font-extrabold text-[#2997ff] font-mono leading-none">
                      8.8
                    </span>
                    <span className="text-[10px] font-mono text-white/60 mt-0.5">из 10★</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-[#f56900] uppercase tracking-wider block mb-1 font-semibold">
                      ВЫСОКАЯ ПЛОТНОСТЬ ДНЯ
                    </span>
                    <h3 className="text-[18px] sm:text-[22px] font-bold text-white tracking-tight">
                      <TextEffect preset="slide" per="word">
                        День истинного преодоления и верности слову
                      </TextEffect>
                    </h3>
                    <p className="text-[13px] text-[#86868b] mt-1">
                      Коэффициент преодоления на <strong className="text-emerald-400">+24% выше</strong> твоего среднего показателя за месяц.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white/80 shrink-0">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>3 из 3 целей закрыто</span>
                </div>
              </div>

              {/* Individual Pride Breakdown Cards */}
              <div className="space-y-3.5">
                <div className="text-xs font-mono text-[#86868b] uppercase tracking-wider pl-1">
                  Разбор побед: в чём ты реально хорош сегодня
                </div>

                {/* Pride 1 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] hover:border-white/20 transition-colors space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#f56900]/15 text-[#f56900] text-xs font-mono font-bold flex items-center justify-center">
                        #1
                      </span>
                      <span className="text-[15px] font-semibold text-white">
                        Пробежка 6 км под дождём в 06:15 утра
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-[#f56900]/15 text-[#f56900] border border-[#f56900]/30">
                        Фактор преодоления 9★
                      </span>
                      <span className="text-emerald-400 font-bold">Спорт и тело</span>
                    </div>
                  </div>
                  <div className="text-[13.5px] leading-relaxed text-[#a1a1a6] pl-8 border-l border-[#f56900]/30 mt-2">
                    <strong className="text-white">В чём реально хорош:</strong>{' '}
                    <TextEffect preset="fade" per="word" delay={0.2}>
                      Несгибаемая телесная дисциплина. Вышел на трассу вопреки саботажу комфорта и дождю. Твёрдое подтверждение слова телу.
                    </TextEffect>
                  </div>
                </div>

                {/* Pride 2 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] hover:border-white/20 transition-colors space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-[#0071e3]/15 text-[#2997ff] text-xs font-mono font-bold flex items-center justify-center">
                        #2
                      </span>
                      <span className="text-[15px] font-semibold text-white">
                        Сложные переговоры с партнёром без уступок в качестве
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-[#0071e3]/15 text-[#2997ff] border border-[#0071e3]/30">
                        Фактор преодоления 9★
                      </span>
                      <span className="text-[#2997ff] font-bold">Бизнес и карьера</span>
                    </div>
                  </div>
                  <div className="text-[13.5px] leading-relaxed text-[#a1a1a6] pl-8 border-l border-[#0071e3]/30 mt-2">
                    <strong className="text-white">В чём реально хорош:</strong>{' '}
                    <TextEffect preset="fade" per="word" delay={0.4}>
                      Эмоциональная устойчивость под давлением. Отстоял стратегические интересы команды, сохранив уважительный тон.
                    </TextEffect>
                  </div>
                </div>

                {/* Pride 3 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] hover:border-white/20 transition-colors space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-pink-500/15 text-pink-400 text-xs font-mono font-bold flex items-center justify-center">
                        #3
                      </span>
                      <span className="text-[15px] font-semibold text-white">
                        Отложил телефон в 21:00 и прочитал сыну 2 главы книги
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/30">
                        Фактор баланса 10★
                      </span>
                      <span className="text-pink-400 font-bold">Семья и дом</span>
                    </div>
                  </div>
                  <div className="text-[13.5px] leading-relaxed text-[#a1a1a6] pl-8 border-l border-pink-500/30 mt-2">
                    <strong className="text-white">В чём реально хорош:</strong>{' '}
                    <TextEffect preset="fade" per="word" delay={0.6}>
                      Осознанное присутствие. Защитил семейную опору от рабочей инерции. Это предотвращает скрытое выгорание.
                    </TextEffect>
                  </div>
                </div>
              </div>

              {/* Daily Synthesis / Mentor Verdict */}
              {step === 'summary' && (
                <div className="p-5 sm:p-6 rounded-2xl bg-[#161617] border border-[#f56900]/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#f56900] uppercase tracking-wider font-semibold">
                    <Flame size={14} />
                    <span>Итоговый вердикт Ментора Личной Силы</span>
                  </div>
                  <div className="text-[14.5px] leading-relaxed text-[#f5f5f7]">
                    <TextEffect preset="blur" per="word" delay={0.1}>
                      «Сегодня ты не искал компромиссов с ленью. Утренняя тренировка задала дофаминовый каркас, который позволил выиграть переговоры днём. Завтрашний вектор силы: удерживай концентрацию в первые 3 часа рабочего блока и не распыляйся на второстепенную переписку.»
                    </TextEffect>
                  </div>
                </div>
              )}
            </div>
          )}
        </GlowCard>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: ДОЛГОСРОЧНЫЙ НАСТАВНИК (10 И 100 ДНЕЙ, РОСТ vs СПАД)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'longterm' && (
        <GlowCard
          glowColor="orange"
          customSize
          className="p-6 sm:p-8 md:p-10 border border-white/15 bg-[#0f1117]/75 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
        >
          {/* Milestone Selection Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.08] mb-6 gap-4">
            <div>
              <div className="text-[11px] font-mono text-[#f56900] uppercase tracking-wider font-semibold mb-1">
                ДОЛГОСРОЧНАЯ ПЕРСПЕКТИВА
              </div>
              <h3 className="text-[20px] sm:text-[24px] font-bold text-white tracking-tight">
                ИИ поздравляет с круглыми вехами и видит тренды
              </h3>
            </div>

            {/* 10 vs 100 Milestone switcher */}
            <div className="p-1 rounded-xl bg-black/60 border border-white/10 flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setMilestone('milestone-10')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  milestone === 'milestone-10'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                Веха 10 дней
              </button>
              <button
                type="button"
                onClick={() => setMilestone('milestone-100')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  milestone === 'milestone-100'
                    ? 'bg-[#f56900] text-white shadow-md'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                ★ Юбилей 100 дней
              </button>
            </div>
          </div>

          {/* Celebration Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#f56900]/20 via-[#ff8c00]/10 to-transparent border border-[#f56900]/30 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-[#f56900]/20 border border-[#f56900]/40 flex items-center justify-center text-[#f56900] shrink-0">
                <Flame size={32} />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[#f56900] uppercase tracking-wider font-bold">
                  {milestone === 'milestone-100' ? 'ЮБИЛЕЙНЫЙ СТРИК 100 ДНЕЙ' : 'ПЕРВАЯ ВЕХА 10 ДНЕЙ'}
                </span>
                <h4 className="text-[20px] sm:text-[22px] font-bold text-white tracking-tight">
                  <TextEffect preset="slide" per="word">
                    {milestone === 'milestone-100'
                      ? '«100 дней без самообмана. Ты стал другим человеком.»'
                      : '«10 дней подряд. Первая привычка пустила корни.»'}
                  </TextEffect>
                </h4>
                <p className="text-[13px] text-[#a1a1a6] mt-1">
                  {milestone === 'milestone-100'
                    ? 'Твой стрик превышает 97% участников сообщества Winlog. Время подвести глубокие итоги.'
                    : 'Критический барьер первого отказа пройден. Ты доказал себе, что можешь держать слово.'}
                </p>
              </div>
            </div>

            <div className="text-center md:text-right shrink-0">
              <div className="text-[32px] font-bold font-mono text-[#f56900]">
                {milestone === 'milestone-100' ? '100 / 100' : '10 / 10'}
              </div>
              <div className="text-[11px] font-mono text-[#86868b]">Дней без пропусков</div>
            </div>
          </div>

          {/* Habit Deep-Dive Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Stat 1: Gym / Body */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
              <div className="flex items-center gap-2 text-[#00c7be] text-xs font-semibold mb-2">
                <Dumbbell size={15} />
                <span>Тело & Спортзал</span>
              </div>
              <div className="text-[24px] font-bold font-mono text-white">
                {milestone === 'milestone-100' ? '54 тренировки' : '6 тренировок'}
              </div>
              <p className="text-[12px] text-[#86868b] mt-1">
                {milestone === 'milestone-100'
                  ? 'Выполнение 92% от плана. Преодолел саботаж утренних подъёмов.'
                  : '60% всех вечерних гордостей связаны с физической активностью.'}
              </p>
            </div>

            {/* Stat 2: Average Score */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
              <div className="flex items-center gap-2 text-[#2997ff] text-xs font-semibold mb-2">
                <TrendingUp size={15} />
                <span>Средний балл побед</span>
              </div>
              <div className="text-[24px] font-bold font-mono text-white">
                {milestone === 'milestone-100' ? '8.6 ★ (+18%)' : '7.9 ★'}
              </div>
              <p className="text-[12px] text-[#86868b] mt-1">
                {milestone === 'milestone-100'
                  ? 'На +18% выше средней оценки первых 30 дней. Качество дел выросло.'
                  : 'Начальная калибровка строгости. Факты преобладают над эмоциями.'}
              </p>
            </div>

            {/* Stat 3: Family & Balance */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
              <div className="flex items-center gap-2 text-pink-400 text-xs font-semibold mb-2">
                <Heart size={15} />
                <span>Семейный баланс</span>
              </div>
              <div className="text-[24px] font-bold font-mono text-white">
                {milestone === 'milestone-100' ? '82 вечера' : '8 вечеров'}
              </div>
              <p className="text-[12px] text-[#86868b] mt-1">
                {milestone === 'milestone-100'
                  ? 'Без работы после 21:00. Ни единого срыва на близких в периоды авралов.'
                  : 'Качественное вечернее присутствие без смартфона в руках.'}
              </p>
            </div>
          </div>

          {/* Dynamic Adaptation: GROWTH vs SLUMP (ИИ хвалит при росте или дает напутствие при спаде) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-mono text-[#86868b] uppercase tracking-wider">
                Поведение ИИ в реальной жизни: переключи состояние:
              </span>

              <div className="p-1 rounded-xl bg-white/[0.06] border border-white/10 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCoachMode('growth')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    coachMode === 'growth'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-[#86868b] hover:text-white'
                  }`}
                >
                  <TrendingUp size={13} />
                  <span>Когда видит РОСТ 📈</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCoachMode('slump')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    coachMode === 'slump'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-[#86868b] hover:text-white'
                  }`}
                >
                  <TrendingDown size={13} />
                  <span>Когда видит СПАД 📉</span>
                </button>
              </div>
            </div>

            {/* Coach Voice Box */}
            {coachMode === 'growth' ? (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>ИИ хвалит и указывает на конкретную точку силы:</span>
                </div>
                <div className="text-[14px] leading-relaxed text-[#f5f5f7]">
                  <TextEffect preset="blur" per="word" key="coach-growth">
                    «Твой преодоленческий фактор вырос с 7.1★ до 8.8★. Главный триггер роста — ты перестал откладывать спорт на вечер и закрываешь пробежку до 08:00. Это высвободило ресурс лобных долей для стратегических побед в бизнесе. Продолжай держать утренний рубеж.»
                  </TextEffect>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown size={14} />
                  <span>ИИ заметил спад и даёт трезвые советы без осуждения:</span>
                </div>
                <div className="text-[14px] leading-relaxed text-[#f5f5f7]">
                  <TextEffect preset="blur" per="word" key="coach-slump">
                    «За последние 4 дня балл преодоления снизился до 5.2★. Ты записываешь рутинные дела вместо реальных побед. Причина — поздний отбой и перегрузка второстепенными встречами. Совет наставника: сегодня закрой всего 1 главную победу, откажись от лишнего звонка и ляг спать до 23:00. Стрик не сгорит, восстанови ресурс.»
                  </TextEffect>
                </div>
              </div>
            )}
          </div>
        </GlowCard>
      )}

      {/* Bottom CTA to Register */}
      <div className="mt-8 text-center">
        <Link
          href="/register"
          className="apple-btn-primary !px-8 !py-3.5 !text-[15px] inline-flex items-center gap-2"
        >
          <span>Попробовать ИИ-разбор сегодня вечером</span>
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}

export default AiCeremonyShowcase
