'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

interface ComparisonItem {
  sphere: string
  badText: string
  badScore: number
  badComment: string
  goodText: string
  goodScore: number
  goodOvercome: number
  goodComment: string
  breakdown: string
}

const COMPARISONS: ComparisonItem[] = [
  {
    sphere: 'Спорт и тело',
    badText: 'Сходил на тренировку в зал, немного побегал на дорожке.',
    badScore: 5.2,
    badComment: 'Базовое рутинное действие без фиксации преодоленного сопротивления.',
    goodText: 'Шёл холодный дождь, после 9 часов за экраном мозг требовал остаться на диване. Заставил себя надеть форму, пришёл в зал и пробежал 6.2 км в темпе 5:12, закрыв интервалы на пульсе 165.',
    goodScore: 8.8,
    goodOvercome: 2,
    goodComment: 'Зафиксирована точка слабости, описано волевое решение и приведены твердые измеримые факты.',
    breakdown: 'Разница не в пафосе слов, а в честном признании внутреннего трения и цифрах нагрузки.',
  },
  {
    sphere: 'Бизнес и карьера',
    badText: 'Поработал над проектом и созвонился с клиентами.',
    badScore: 4.8,
    badComment: 'Размыто. Нет понимания масштаба трудностей и конкретного результата.',
    goodText: 'Три недели откладывал тяжелый разговор с заказчиком о срыве дедлайна субподрядчиками. Набрал номер без сценария оправданий, взял ответственность, предложил новый план и согласовал перенос без штрафов.',
    goodScore: 9.2,
    goodOvercome: 3,
    goodComment: 'Прорыв сквозь парализующий страх конфликта. Зрелая позиция лидера.',
    breakdown: 'Оценка 9.0+ даётся за преодоление страха и эмоционального паралича, а не за рутинные клики мыши.',
  },
  {
    sphere: 'Семья и отношения',
    badText: 'Провёл вечер дома с семьей, посмотрели фильм.',
    badScore: 5.5,
    badComment: 'Приятный вечер, но без активного преодоления эгоцентризма или усталости.',
    goodText: 'Пришёл выжатым после созвонов, хотелось закрыться в спальне и залипнуть в телефон. Убрал телефон в ящик на 3 часа, сел на ковер с сыном собирать сложный конструктор, слушал его без раздражения и спешки.',
    goodScore: 8.6,
    goodOvercome: 2,
    goodComment: 'Сознательный отказ от легкого дофамина ради искреннего присутствия с близкими.',
    breakdown: 'Внимание к близким в момент сильнейшей усталости — это высшая форма взрослой дисциплины.',
  },
  {
    sphere: 'Дисциплина и соблазны',
    badText: 'Не ел сладкое сегодня.',
    badScore: 6.0,
    badComment: 'Хороший факт, но не показана тяжесть борьбы с искушением.',
    goodText: 'В 23:30 накрыл приступ ночного жора на фоне тревоги за завтрашний релиз. Подошел к холодильнику, осознал автоматизм, выпил стакан воды, сделал 20 глубоких вдохов и лег спать голодным.',
    goodScore: 8.4,
    goodOvercome: 2,
    goodComment: 'Остановка компульсивного импульса в пиковой точке слабости.',
    breakdown: 'Способность поймать себя за руку за секунду до срыва ценится алгоритмом как твёрдая победа.',
  },
  {
    sphere: 'Обучение и мастерство',
    badText: 'Почитал книгу по программированию.',
    badScore: 4.5,
    badComment: 'Пассивное потребление контента без практического применения.',
    goodText: 'Разбирался 3 часа со сложной архитектурой WebSocket в Next.js. Код падал 5 раз, хотелось бросить всё и скопировать готовое решение из ChatGPT. Докопался до сути, нашел утечку памяти и написал работающий прототип с нуля.',
    goodScore: 9.0,
    goodOvercome: 3,
    goodComment: 'Интеллектуальная стойкость перед фрустрацией и доведение дела до работающего артефакта.',
    breakdown: 'ИИ распознает фрустрацию — момент, где 90% людей сдаются, а ты продолжаешь копать.',
  },
]

const LEVELS_GUIDE = [
  {
    level: 1,
    title: '1 факт в день',
    name: '«Свеча» / Антивыгорание',
    targetAudience: 'Глубокий стресс, кризис, болезнь, депрессия или старт с нуля',
    philosophy: 'Минимальный рубеж честности. Спасает стрик и психику, когда мир рушится.',
    formula: '1 железный поступок, который ты сделал, даже когда не было сил подняться с постели.',
    typicalExamples: [
      'Встал по первому будильнику и заправил кровать, несмотря на апатию.',
      'Вышел на 15-минутную прогулку на улицу без телефона.',
      'Не сорвался на крик во время семейной ссоры, взял паузу 10 минут.',
    ],
    risk: 'Завысить планку на старте и бросить через неделю.',
    badgeColor: '#00c7be',
  },
  {
    level: 2,
    title: '2 факта в день',
    name: '«Костёр» / Стандарт баланса',
    targetAudience: 'Большинство людей в устойчивом ритме работы и жизни',
    philosophy: 'Защита от перекосов. Ты не становишься роботом одной сферы.',
    formula: '1 факт для карьеры/бизнеса + 1 факт для тела, дома или близких.',
    typicalExamples: [
      'Факт 1: Закрыл ключевой этап ТЗ до 14:00 без прокрастинации.',
      'Факт 2: Провёл 40 минут интенсивной силовой тренировки дома.',
    ],
    risk: 'Записывать два мелких дела из одной рабочей рутины.',
    badgeColor: '#2997ff',
  },
  {
    level: 3,
    title: '3 факта в день',
    name: '«Факел» / Режим осознанного прорыва',
    targetAudience: 'Специалисты, предприниматели и спортсмены в фазе активного роста',
    philosophy: 'Золотая классика Огонька. Плотный день без надрыва нервной системы.',
    formula: 'Утро (волевой старт) + День (ключевая победа в работе) + Вечер (отношения или здоровье).',
    typicalExamples: [
      'Факт 1: Холодный душ и 20 минут чтения до открытия рабочих чатов.',
      'Факт 2: Провёл сложные переговоры и отстоял границы проекта.',
      'Факт 3: Приготовил ужин вместе с женой без экранов и телефонов.',
    ],
    risk: 'Пытаться выжимать из себя 3 подвига в дни физической болезни.',
    badgeColor: '#f56900',
  },
  {
    level: 4,
    title: '4 факта в день',
    name: '«Маяк» / Высокая нагрузка',
    targetAudience: 'Лидеры команд, родители с несколькими проектами, марафонцы',
    philosophy: 'Высокая плотность событий. Требует строгого тайм-менеджмента.',
    formula: 'Работа + Спорт + Обучение + Семья/Люди. Все 4 сферы закрыты делами.',
    typicalExamples: [
      'Факт 1: 5 км бега на рассвете.',
      'Факт 2: Закрыл дебиторскую задолженность с ключевым клиентом.',
      'Факт 3: Разобрал сложную лекцию по финансам с конспектом.',
      'Факт 4: Честный разговор с партнером о будущем без претензий.',
    ],
    risk: 'Потеря глубины ради погони за количеством галочек.',
    badgeColor: '#8668ff',
  },
  {
    level: 5,
    title: '5 фактов в день',
    name: '«Сверхновая» / Extreme режим',
    targetAudience: 'Только для опытных практиков с железным фундаментом дисциплины',
    philosophy: 'Режим спецназа личной силы. Тотальная осознанность каждого часа суток.',
    formula: '5 предельно честных преодолений сопротивления во всех сферах жизни.',
    typicalExamples: [
      '5 поступков, в каждом из которых ты переступил через дискомфорт, страх или усталость.',
    ],
    risk: 'Категорически нельзя начинать с этого уровня! Вероятность срыва — 98%.',
    badgeColor: '#ff453a',
  },
]

export default function ExamplesPage() {
  const containerRef = useScrollReveal()
  const [activeSphere, setActiveSphere] = useState(0)
  const [activeLevelTab, setActiveLevelTab] = useState(2) // Default to Level 3 (index 2)

  const activeComparison = COMPARISONS[activeSphere]
  const currentLevel = LEVELS_GUIDE[activeLevelTab]

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative min-h-[75vh] flex flex-col justify-start sm:justify-center items-center text-center pt-24 sm:pt-36 pb-16 sm:pb-24 px-5 sm:px-8 overflow-hidden bg-black">
        {/* Ambient Halo Glow */}
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />
        <div className="apple-ambient-orb w-[420px] h-[420px] bg-[#0071e3] top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[1040px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="apple-eyebrow !text-[#f56900]">Практическое руководство летописца</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-75 mb-6 max-w-[980px]">
            Как писать гордости,
            <br />
            <span className="apple-shimmer-text">которые меняют тебя.</span>
          </h1>

          <p className="apple-body fade-up delay-150 max-w-[720px] mb-10 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Дневник силы — это не список бытовых дел и не отчёт для начальства. Это фиксация моментов, когда ты победил собственное сопротивление. Разбираем формулу сильной записи, критерии высших оценок 10.0★ и выбор своего темпа.
          </p>

          <div className="fade-scale delay-200 flex items-center justify-center gap-3.5 sm:gap-4 flex-wrap mb-10">
            <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[15px]">
              Начать свою летопись →
            </Link>
            <a href="#formula" className="apple-btn-ghost !px-6 !py-3.5 !text-[15px]">
              Формула записи ↓
            </a>
            <a href="#levels-guide" className="apple-btn-ghost !px-6 !py-3.5 !text-[15px]">
              Какой уровень выбрать? ↓
            </a>
          </div>

          {/* Core Philosophy Callout */}
          <div className="fade-up delay-250 w-full max-w-[820px] p-5 sm:p-6 rounded-[22px] bg-[#141416] border border-white/10 text-left flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#00c7be]/15 border border-[#00c7be]/30 flex items-center justify-center text-[#00c7be] shrink-0 mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-white mb-1">
                Главное правило Огонька: Факты выше настроения
              </h4>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                Если запись вызывает в теле ощущение «Да, чёрт возьми, мне было тяжело, но я сделал это» — ты записал настоящую гордость. Если это просто механическая отметка галочки — это рутина.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: АНАТОМИЯ СИЛЬНОЙ ЗАПИСИ (ФОРМУЛА 3 ЭЛЕМЕНТОВ) ── */}
      <section id="formula" className="py-24 sm:py-32 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[780px] mx-auto mb-16 sm:mb-20">
            <span className="apple-eyebrow fade-up block mb-4">Анатомия формулировки</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              Из чего состоит сильная гордость.
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Чтобы мозг поверил в твою победу и выделил дофамин, фраза должна содержать три обязательных элемента.
            </p>
          </div>

          {/* 3 Formula Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="apple-card p-8 bg-[#161617] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#ff453a]/15 text-[#ff453a] flex items-center justify-center font-bold text-lg mb-5 font-mono">
                  1
                </div>
                <h3 className="text-[19px] font-bold text-white mb-3 tracking-tight">
                  Контекст сопротивления
                </h3>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Что именно шептало в голове? Какая была отговорка? «Хотелось забить», «шёл ливень», «болела голова», «тряслись руки перед звонком». Без контекста победа обесценивается.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-[12px] font-mono text-[#ff453a]">
                ТОЧКА СЛАБОСТИ
              </div>
            </div>

            <div className="apple-card p-8 bg-[#161617] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#0071e3]/15 text-[#2997ff] flex items-center justify-center font-bold text-lg mb-5 font-mono">
                  2
                </div>
                <h3 className="text-[19px] font-bold text-white mb-3 tracking-tight">
                  Твёрдое конкретное действие
                </h3>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Никаких общих фраз «поработал» или «потренировался». Точные цифры, минуты, километры, факты: «пробежал 5.5 км за 28 мин», «написал 8 страниц ТЗ», «позвонил 10 клиентам».
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-[12px] font-mono text-[#2997ff]">
                ИЗМЕРИМЫЙ ФАКТ
              </div>
            </div>

            <div className="apple-card p-8 bg-[#161617] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#00c7be]/15 text-[#00c7be] flex items-center justify-center font-bold text-lg mb-5 font-mono">
                  3
                </div>
                <h3 className="text-[19px] font-bold text-white mb-3 tracking-tight">
                  Точка преломления
                </h3>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Что изменилось в реальности или внутри тебя? «Закрыл этап спринта», «договорился без конфликта», «вернул ясный фокус и самоуважение вместо стыда».
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-[12px] font-mono text-[#00c7be]">
                ИТОГ ПРЕОДОЛЕНИЯ
              </div>
            </div>
          </div>

          {/* Interactive Before / After Comparison Workbench */}
          <div className="apple-card p-6 sm:p-10 bg-[#141416] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
              <div>
                <span className="text-xs font-mono text-[#f56900] uppercase tracking-wider block mb-1">
                  ИНТЕРАКТИВНЫЙ РАЗБОР ПО СФЕРАМ
                </span>
                <h3 className="text-[22px] sm:text-[26px] font-bold text-white tracking-tight">
                  Сравни: Слабая отметка vs Настоящая гордость
                </h3>
              </div>

              {/* Sphere Segmented Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {COMPARISONS.map((comp, idx) => (
                  <button
                    key={comp.sphere}
                    type="button"
                    onClick={() => setActiveSphere(idx)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      activeSphere === idx
                        ? 'bg-white text-black font-semibold shadow'
                        : 'bg-white/[0.06] text-[#86868b] hover:text-white'
                    }`}
                  >
                    {comp.sphere}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Card View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Weak side */}
              <div className="p-6 rounded-2xl bg-black/50 border border-rose-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 font-mono text-xs font-semibold">
                      СЛАБО (Обычная рутина)
                    </span>
                    <span className="text-[18px] font-bold text-rose-400 font-mono">
                      {activeComparison.badScore}★
                    </span>
                  </div>
                  <blockquote className="text-[16px] text-white/80 font-normal italic mb-4 leading-relaxed">
                    «{activeComparison.badText}»
                  </blockquote>
                  <p className="text-[13px] text-[#86868b] leading-relaxed">
                    <strong>Вердикт ИИ:</strong> {activeComparison.badComment}
                  </p>
                </div>
                <div className="pt-4 border-t border-white/5 mt-6 text-xs text-[#86868b] font-mono">
                  Преодоление: 0★ · Эмоционального отклика нет
                </div>
              </div>

              {/* Strong side */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#16222f] to-[#11171f] border border-[#0071e3]/40 flex flex-col justify-between shadow-[0_0_30px_rgba(0,113,227,0.15)]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-[#0071e3]/20 text-[#2997ff] font-mono text-xs font-semibold">
                      ОТЛИЧНО (Летопись силы)
                    </span>
                    <span className="text-[20px] font-bold text-[#2997ff] font-mono">
                      {activeComparison.goodScore}★
                    </span>
                  </div>
                  <blockquote className="text-[16px] text-white font-medium mb-4 leading-relaxed">
                    «{activeComparison.goodText}»
                  </blockquote>
                  <p className="text-[13px] text-[#a1a1a6] leading-relaxed">
                    <strong>Вердикт ИИ:</strong> {activeComparison.goodComment}
                  </p>
                </div>
                <div className="pt-4 border-t border-white/10 mt-6 flex items-center justify-between text-xs font-mono">
                  <span className="text-[#00c7be]">Преодоление: {activeComparison.goodOvercome}/3 (Сильное)</span>
                  <span className="text-[#f56900]">Укрепляет стержень</span>
                </div>
              </div>
            </div>

            {/* Key takeaway note */}
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 text-center text-[13px] text-[#86868b]">
              💡 <strong>Инсайт:</strong> {activeComparison.breakdown}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: ЧЕМ ИЗРАСХОДОВАТЬСЯ: КАК ПОЛУЧИТЬ 9.0–10.0★ ──── */}
      <section id="high-score" className="py-24 sm:py-32 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[800px] mx-auto mb-16 sm:mb-20">
            <span className="apple-eyebrow fade-up block mb-4 !text-[#2997ff]">Критерии нейросети</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              Чем израсходоваться, чтобы получить высшие баллы?
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              «Израсходоваться» в Огоньке — это не довести себя до нервного срыва или больницы. Это честно потратить психическую энергию на преодоление внутреннего трения.
            </p>
          </div>

          {/* Scale breakdown grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-16">
            <div className="p-6 rounded-2xl bg-[#161617] border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-[28px] font-bold font-mono text-[#86868b] block mb-2">1.0 – 4.9★</span>
                <h4 className="text-[17px] font-semibold text-white mb-2">Бытовая рутина</h4>
                <p className="text-[13px] text-[#86868b] leading-relaxed">
                  Почистил зубы, пообедал, посмотрел сериал. Действия на автопилоте без малейшего внутреннего трения.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-[#86868b]">
                Преодоление: 0 (Отсутствует)
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#161617] border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-[28px] font-bold font-mono text-amber-400 block mb-2">5.0 – 7.0★</span>
                <h4 className="text-[17px] font-semibold text-white mb-2">Привычная норма</h4>
                <p className="text-[13px] text-[#86868b] leading-relaxed">
                  Стандартные задачи по работе, легкая прогулка, обычный порядок. Полезно, но не расширяет твои границы.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-amber-400">
                Преодоление: 1 (Легкое)
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#161617] border border-[#0071e3]/40 flex flex-col justify-between">
              <div>
                <span className="text-[28px] font-bold font-mono text-[#2997ff] block mb-2">7.1 – 8.9★</span>
                <h4 className="text-[17px] font-semibold text-white mb-2">Волевое сверхусилие</h4>
                <p className="text-[13px] text-[#86868b] leading-relaxed">
                  Преодоление лени, спорт через сопротивление, тяжелый разговор, остановка вредного импульса.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-[#2997ff]">
                Преодоление: 2 (Серьезное)
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#241a10] to-[#141416] border border-[#f56900]/50 flex flex-col justify-between shadow-[0_0_25px_rgba(245,105,0,0.2)]">
              <div>
                <span className="text-[28px] font-bold font-mono text-[#f56900] block mb-2">9.0 – 10.0★</span>
                <h4 className="text-[17px] font-semibold text-white mb-2">Прорыв и триумф</h4>
                <p className="text-[13px] text-[#86868b] leading-relaxed">
                  Преодоление парализующего страха, марафон, закрытие ключевого проекта года, прыжок выше головы.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-[#f56900]">
                Преодоление: 3 (Прорыв)
              </div>
            </div>
          </div>

          {/* 3 Golden Rules to get 9-10 */}
          <div className="apple-card p-8 sm:p-12 bg-[#141416] border border-white/10">
            <h3 className="text-[24px] sm:text-[28px] font-bold text-white tracking-tight mb-8 text-center">
              3 правила, чтобы заслужить оценку 9.0–10.0★
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="text-[#f56900] font-mono text-sm uppercase tracking-wider font-semibold">
                  ПРАВИЛО №1
                </div>
                <h4 className="text-[18px] font-bold text-white">
                  Зафиксируй момент «Хотел бросить, но остался»
                </h4>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Искусственный интеллект Огонька обучен на психологических маркерах отказа. Опиши физическое ощущение сопротивления: как дрожали руки, как хотелось нажать «Отмена», и что именно заставило сделать шаг вперёд.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-[#2997ff] font-mono text-sm uppercase tracking-wider font-semibold">
                  ПРАВИЛО №2
                </div>
                <h4 className="text-[18px] font-bold text-white">
                  Твёрдые артефакты вместо прилагательных
                </h4>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Не пиши «я невероятно круто и героически поработал». Напиши «закрыл 14 зависших задач из бэклога, протестировал 3 модуля и выкатил релиз без единого бага». Алгоритм уважает цифры и осязаемый результат.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-[#00c7be] font-mono text-sm uppercase tracking-wider font-semibold">
                  ПРАВИЛО №3
                </div>
                <h4 className="text-[18px] font-bold text-white">
                  Честность дня: не натягивай героизм
                </h4>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Если сегодня был тяжелый день восстановления — не пытайся выжать из себя подвиг. Зафиксируй честные 6.0★ («вовремя лёг спать и не сорвался на сладкое»). Самоуважение строится на правде, а не на самообмане.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: КАК ОПРЕДЕЛИТЬСЯ С УРОВНЕМ ИЗ 5? ─────────────── */}
      <section id="levels-guide" className="py-24 sm:py-32 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[820px] mx-auto mb-16 sm:mb-20">
            <span className="apple-eyebrow fade-up block mb-4 !text-[#f56900]">Интерактивный навигатор</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              Какой из 5 уровней твой?
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Главная ошибка новичка — сразу поставить 5 фактов в день, перегореть на 4-й вечер и бросить дневник. Выбери уровень, который соответствует твоему текущему запасу энергии.
            </p>
          </div>

          {/* 5-Level Pill Navigation Bar */}
          <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
            {LEVELS_GUIDE.map((lvl, index) => {
              const isActive = activeLevelTab === index
              return (
                <button
                  key={lvl.level}
                  type="button"
                  onClick={() => setActiveLevelTab(index)}
                  className={`px-4 sm:px-5 py-2.5 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-[0_4px_16px_rgba(255,255,255,0.25)]'
                      : 'bg-white/[0.06] text-[#86868b] hover:text-white hover:bg-white/[0.1]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: lvl.badgeColor }}
                  />
                  <span>Уровень {lvl.level}</span>
                </button>
              )
            })}
          </div>

          {/* Active Level Detailed Card */}
          <div className="apple-card p-8 sm:p-12 bg-[#141416] border border-white/10 shadow-2xl relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 pointer-events-none"
              style={{ backgroundColor: currentLevel.badgeColor }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${currentLevel.badgeColor}20`,
                        color: currentLevel.badgeColor,
                        border: `1px solid ${currentLevel.badgeColor}40`,
                      }}
                    >
                      УРОВЕНЬ {currentLevel.level} ИЗ 5
                    </span>
                    <span className="text-[#86868b] text-sm">· {currentLevel.name}</span>
                  </div>
                  <h3 className="text-[28px] sm:text-[34px] font-bold text-white tracking-tight">
                    {currentLevel.title}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#86868b] uppercase font-mono block">ЦЕЛЕВАЯ АУДИТОРИЯ</span>
                  <span className="text-sm font-medium text-white max-w-[280px] block mt-1">
                    {currentLevel.targetAudience}
                  </span>
                </div>
              </div>

              {/* Core Philosophy Banner */}
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/5 mb-8">
                <div className="text-xs font-mono text-[#a1a1a6] uppercase tracking-wider mb-1">
                  ФИЛОСОФИЯ И ФОРМУЛА УРОВНЯ
                </div>
                <p className="text-[16px] text-white font-medium mb-2">
                  {currentLevel.philosophy}
                </p>
                <p className="text-[14px] text-[#86868b]">
                  <strong>Формула:</strong> {currentLevel.formula}
                </p>
              </div>

              {/* Examples Grid */}
              <div className="mb-8">
                <h4 className="text-xs font-mono text-[#86868b] uppercase tracking-wider mb-4">
                  ТИПИЧНЫЕ ПРИМЕРЫ ДЛЯ ЭТОГО УРОВНЯ:
                </h4>
                <div className="space-y-3">
                  {currentLevel.typicalExamples.map((ex, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-black/40 border border-white/5 text-[15px] text-[#f5f5f7] flex items-start gap-3"
                    >
                      <span className="text-[#00c7be] font-mono text-sm mt-0.5">✓</span>
                      <span>«{ex}»</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk warning */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[13px] text-amber-200/90 flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span><strong>Главный риск:</strong> {currentLevel.risk}</span>
              </div>
            </div>
          </div>

          {/* The 740-Day Rule for Longevity */}
          <div className="mt-12 p-8 rounded-[24px] bg-gradient-to-r from-[#0071e3]/10 via-[#00c7be]/10 to-transparent border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-mono text-[#00c7be] uppercase tracking-wider font-semibold">
                ЗАКОН 740 ДНЕЙ
              </span>
              <h4 className="text-[20px] font-bold text-white tracking-tight">
                Лучше 100 дней на Уровне 1, чем 4 дня на Уровне 5 с последующим выгоранием.
              </h4>
              <p className="text-[14px] text-[#86868b] max-w-[720px] leading-relaxed">
                Стрик в Огоньке не сгорает при пропусках. Ты можешь свободно переключать уровень вверх и вниз в зависимости от жизненных периодов. Уровень — это твой инструмент, а не повод для самоедства.
              </p>
            </div>
            <Link
              href="/register"
              className="apple-btn-primary !px-7 !py-3.5 !text-[14px] whitespace-nowrap shrink-0"
            >
              Выбрать свой уровень →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: ПОШАГОВЫЙ РИТУАЛ В ИНТЕРФЕЙСЕ ──────────────── */}
      <section className="py-24 sm:py-32 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[780px] mx-auto mb-16">
            <span className="apple-eyebrow fade-up block mb-4">Техника выполнения</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              Как выглядит ритуал в приложении.
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Всего 5 минут перед сном. Никаких сложных меню и перегруженных форм.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#161617] border border-white/10">
              <div className="text-xs font-mono text-[#2997ff] uppercase tracking-wider mb-2">ШАГ 1</div>
              <h4 className="text-[18px] font-bold text-white mb-2">5 минут тишины</h4>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                Выключи уведомления, закрой рабочие мессенджеры. Сядь в спокойном месте перед экраном летописи.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#161617] border border-white/10">
              <div className="text-xs font-mono text-[#00c7be] uppercase tracking-wider mb-2">ШАГ 2</div>
              <h4 className="text-[18px] font-bold text-white mb-2">Вспомни трение</h4>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                Используй подсказки по сферам (#Спорт, #Бизнес, #Семья) и вспомни моменты преодоления за день.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#161617] border border-white/10">
              <div className="text-xs font-mono text-[#f56900] uppercase tracking-wider mb-2">ШАГ 3</div>
              <h4 className="text-[18px] font-bold text-white mb-2">Запиши по формуле</h4>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                Введи от 1 до 5 фактов: контекст сопротивления + твёрдое действие + точка преломления.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#161617] border border-white/10">
              <div className="text-xs font-mono text-[#8668ff] uppercase tracking-wider mb-2">ШАГ 4</div>
              <h4 className="text-[18px] font-bold text-white mb-2">Церемония оценки</h4>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                Нажми «Оценить с ИИ», получи честную шкалу преодоления 1–10★ и спокойно засыпай с ощущением силы.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL BANNER ──────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-[#0c0c0e] border-t border-white/[0.06] text-center">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8">
          <h2 className="apple-hero-title mb-5 sm:mb-6 !text-[36px] sm:!text-[48px]">
            Начни с одного честного факта сегодня вечером.
          </h2>
          <p className="apple-body max-w-[540px] mx-auto mb-8 text-[#86868b] text-[17px]">
            Не жди понедельника или идеальных условий. Зафиксируй одну маленькую победу над собой и почувствуй разницу.
          </p>
          <Link
            href="/register"
            className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold shadow-[0_0_35px_rgba(0,113,227,0.6)]"
          >
            Создать свою летопись бесплатно →
          </Link>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
