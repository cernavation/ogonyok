'use client'

import React from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'
import { GlowCard } from '@/components/ui/spotlight-card'
import { GlyphBackground } from '@/components/ui/backgrounds-glyph'
import { WinlogAiPreview } from './winlog-previews'
import { type Locale } from '@/src/content/i18n'

interface AiPageProps {
  locale?: Locale
}

const AI_PAGE_CONTENT: Record<
  Locale,
  {
    badge: string
    title1: string
    title2: string
    subtitle: string
    ctaPrimary: string
    ctaPricing: string
    macWindowHeader: string
    zeroTrainingBadge: string
    tasksEyebrow: string
    tasksTitle: string
    tasksSubtitle: string
    tasks: {
      num: string
      title: string
      desc: string
      badge: string
      tone: string
    }[]
    pricingEyebrow: string
    pricingTitle: string
    pricingSubtitle: string
    pricingTiers: {
      badge: string
      name: string
      oldPrice?: string
      price: string
      period: string
      desc: string
      features: string[]
      highlight?: boolean
      popularBadge?: string
    }[]
    privacyBadge: string
    privacyCorporate: string
    privacyTitle: string
    privacySubtitle: string
    privacyLinkText: string
    finalTitle: string
    finalSubtitle: string
    finalCta: string
  }
> = {
  ru: {
    badge: 'Нейросетевой наставник',
    title1: 'ИИ, который не льстит.',
    title2: 'Трезвый разбор твоих побед.',
    subtitle: 'Никакой лести и шаблонных комплиментов. Winlog видит скрытый темп и силу твоих решений.',
    ctaPrimary: 'Начать бесплатно',
    ctaPricing: 'Тарифы с ИИ ›',
    macWindowHeader: 'Winlog - AI Mentor & Analytics',
    zeroTrainingBadge: 'Zero Data Training',
    tasksEyebrow: 'Возможности',
    tasksTitle: 'Четыре задачи нашего ИИ',
    tasksSubtitle: 'Строгий и честный взгляд на твои ежедневные достижения.',
    tasks: [
      {
        num: '1',
        title: '1. Сила преодоления',
        desc: 'Оценка трудности поступка, а не красоты слога.',
        badge: 'ФАКТЫ ВЫШЕ ЭМОЦИЙ',
        tone: '#d76737',
      },
      {
        num: '2',
        title: '2. Твой реальный темп',
        desc: 'Сравнение динамики текущего месяца с предыдущим без иллюзий.',
        badge: 'ЧЕСТНАЯ ДИНАМИКА',
        tone: '#a1a1aa',
      },
      {
        num: '3',
        title: '3. Баланс сфер жизни',
        desc: 'Умное тегирование: спорт, семья, работа и отдых.',
        badge: 'ЗАЩИТА БАЛАНСА',
        tone: '#10b981',
      },
      {
        num: '4',
        title: '4. Вектор на завтра',
        desc: 'Точный совет на утро, основанный на вечерних записях.',
        badge: 'ТОЧНЫЙ ФОКУС',
        tone: '#f59e0b',
      },
    ],
    pricingEyebrow: 'Тарифы',
    pricingTitle: 'Прозрачные условия навсегда',
    pricingSubtitle: 'Выбирай уровень: от тихого дневника до глубокого анализа.',
    pricingTiers: [
      {
        badge: 'БАЗОВЫЙ',
        name: 'Свободный',
        price: '0 MDL',
        period: '',
        desc: 'Чистая летопись без нейросетей для спокойного вечера.',
        features: [
          '100% бесплатный дневник побед',
          'Календарь непрерывного стрика',
          'Личный архив без ограничений',
        ],
      },
      {
        badge: 'ПРЕМИУМ',
        name: 'Поддержка Pro',
        oldPrice: '30 MDL',
        price: '20 MDL',
        period: '/ мес',
        desc: 'Ежедневный персональный разбор дня нейросетью.',
        features: [
          '1 ИИ-оценка летописи в день',
          'Шкала преодоления 1–10★ и баллы',
          'Автоматические теги сфер жизни',
          'Сравнение темпа с прошлым месяцем',
        ],
        highlight: true,
        popularBadge: '★ Выбор практиков',
      },
      {
        badge: 'КЛУБ ОСНОВАТЕЛЕЙ',
        name: 'Winlog Ultra',
        price: '50 MDL',
        period: '/ мес',
        desc: 'Максимальная глубина и персональный наставник каждого вечера.',
        features: [
          'Все возможности тарифа Pro',
          'Вердикт Ментора Личной Силы',
          'Глубокий анализ долгосрочных вех',
          'Приоритетная скорость обработки',
        ],
      },
    ],
    privacyBadge: 'ZERO DATA RETENTION',
    privacyCorporate: 'КОРПОРАТИВНЫЙ УРОВЕНЬ',
    privacyTitle: 'Твои записи остаются только твоими',
    privacySubtitle: 'Никакого обучения публичных моделей на твоих сокровенных мыслях.',
    privacyLinkText: 'Читать манифест конфиденциальности',
    finalTitle: 'Узнай, на что ты способен',
    finalSubtitle: 'Две минуты сегодня вечером - первый честный разбор твоей силы.',
    finalCta: 'Начать бесплатно',
  },
  ro: {
    badge: 'Mentor cu inteligență artificială',
    title1: 'Un AI care nu măgulește.',
    title2: 'Analiză lucidă a victoriilor tale.',
    subtitle: 'Fără complimente șablonate și fără lingușiri. Winlog vede ritmul ascuns și forța deciziilor tale.',
    ctaPrimary: 'Începe gratuit',
    ctaPricing: 'Tarife cu AI ›',
    macWindowHeader: 'Winlog - AI Mentor & Analytics',
    zeroTrainingBadge: 'Zero Data Training',
    tasksEyebrow: 'Capabilități',
    tasksTitle: 'Cele patru obiective ale AI-ului nostru',
    tasksSubtitle: 'O privire riguroasă și sinceră asupra realizărilor tale zilnice.',
    tasks: [
      {
        num: '1',
        title: '1. Forța depășirii',
        desc: 'Evaluarea dificultății faptei, nu a frumuseții frazelor.',
        badge: 'FAPTE ÎNAINTEA EMOȚIILOR',
        tone: '#d76737',
      },
      {
        num: '2',
        title: '2. Ritmul tău real',
        desc: 'Compararea dinamicii lunii curente cu cea precedentă, fără iluzii.',
        badge: 'DINAMICĂ ONESTĂ',
        tone: '#a1a1aa',
      },
      {
        num: '3',
        title: '3. Echilibrul vieții',
        desc: 'Etichetare inteligentă: sport, familie, muncă și odihnă.',
        badge: 'PROTECȚIA ECHILIBRULUI',
        tone: '#10b981',
      },
      {
        num: '4',
        title: '4. Direcția pentru mâine',
        desc: 'Sfat clar pentru dimineață, extras din însemnările serii.',
        badge: 'FOCALIZARE PRECISĂ',
        tone: '#f59e0b',
      },
    ],
    pricingEyebrow: 'Tarife',
    pricingTitle: 'Condiții transparente pentru totdeauna',
    pricingSubtitle: 'Alege nivelul: de la un jurnal liniștit până la analize aprofundate.',
    pricingTiers: [
      {
        badge: 'DE BAZĂ',
        name: 'Liber',
        price: '0 MDL',
        period: '',
        desc: 'Cronică curată fără rețele neurale pentru o seară liniștită.',
        features: [
          '100% jurnal gratuit al victoriilor',
          'Calendarul seriei continue',
          'Arhivă personală fără limitări',
        ],
      },
      {
        badge: 'PREMIUM',
        name: 'Suport Pro',
        oldPrice: '30 MDL',
        price: '20 MDL',
        period: '/ lună',
        desc: 'Analiză zilnică personalizată oferită de inteligența artificială.',
        features: [
          '1 evaluare AI pe zi',
          'Scara de depășire 1–10★ și puncte',
          'Etichete automate pe domenii de viață',
          'Comparația ritmului cu luna anterioară',
        ],
        highlight: true,
        popularBadge: '★ Alegerea utilizatorilor',
      },
      {
        badge: 'CLUBUL FONDATORILOR',
        name: 'Winlog Ultra',
        price: '50 MDL',
        period: '/ lună',
        desc: 'Profunzime maximă și mentor dedicat pentru fiecare seară.',
        features: [
          'Toate beneficiile planului Pro',
          'Verdictul Mentorului Puterii Personale',
          'Analiza profundă a etapelor pe termen lung',
          'Viteză prioritară de procesare',
        ],
      },
    ],
    privacyBadge: 'ZERO DATA RETENTION',
    privacyCorporate: 'NIVEL ENTERPRISE',
    privacyTitle: 'Însemnările tale îți aparțin doar ție',
    privacySubtitle: 'Niciun antrenament pe modele publice din gândurile tale personale.',
    privacyLinkText: 'Citește manifestul de confidențialitate',
    finalTitle: 'Descoperă de ce ești capabil',
    finalSubtitle: 'Două minute în această seară — prima analiză sinceră a puterii tale.',
    finalCta: 'Începe gratuit',
  },
  en: {
    badge: 'Neural AI Mentor',
    title1: 'AI that never flatters.',
    title2: 'Clear-eyed review of your wins.',
    subtitle: 'No generic praise or empty compliments. Winlog reveals your true pace and the strength of your choices.',
    ctaPrimary: 'Start for free',
    ctaPricing: 'AI Pricing ›',
    macWindowHeader: 'Winlog - AI Mentor & Analytics',
    zeroTrainingBadge: 'Zero Data Training',
    tasksEyebrow: 'Capabilities',
    tasksTitle: 'Four core missions of our AI',
    tasksSubtitle: 'A grounded, rigorous perspective on your daily milestones.',
    tasks: [
      {
        num: '1',
        title: '1. Overcoming strength',
        desc: 'Assessing the real grit of the deed, not poetic phrasing.',
        badge: 'FACTS OVER EMOTIONS',
        tone: '#d76737',
      },
      {
        num: '2',
        title: '2. Your true momentum',
        desc: 'Pacing comparison between this month and the previous, without illusions.',
        badge: 'HONEST PROGRESSION',
        tone: '#a1a1aa',
      },
      {
        num: '3',
        title: '3. Life sphere balance',
        desc: 'Smart categorization: fitness, family, work, and recovery.',
        badge: 'BALANCE SHIELD',
        tone: '#10b981',
      },
      {
        num: '4',
        title: '4. Focus for tomorrow',
        desc: 'Actionable morning advice grounded in your evening reflections.',
        badge: 'SHARP FOCUS',
        tone: '#f59e0b',
      },
    ],
    pricingEyebrow: 'Pricing',
    pricingTitle: 'Transparent pricing forever',
    pricingSubtitle: 'Choose your level: from quiet journaling to comprehensive AI insights.',
    pricingTiers: [
      {
        badge: 'BASIC',
        name: 'Free',
        price: '0 MDL',
        period: '',
        desc: 'Clean journaling without AI distractions for a tranquil evening.',
        features: [
          '100% free daily victory log',
          'Unbroken streak calendar',
          'Unlimited personal archive',
        ],
      },
      {
        badge: 'PRO',
        name: 'Pro Support',
        oldPrice: '30 MDL',
        price: '20 MDL',
        period: '/ month',
        desc: 'Daily personalized AI evaluation of every recorded day.',
        features: [
          '1 AI evaluation per day',
          '1–10★ overcoming scale and points',
          'Automated life category tags',
          'Pacing comparison with previous month',
        ],
        highlight: true,
        popularBadge: '★ Most Popular',
      },
      {
        badge: 'FOUNDERS CLUB',
        name: 'Winlog Ultra',
        price: '50 MDL',
        period: '/ month',
        desc: 'Maximum depth and an individualized mentor for every reflection.',
        features: [
          'All features from Pro plan',
          'Personal Strength Mentor verdict',
          'Long-term milestone trajectory review',
          'Priority processing speed',
        ],
      },
    ],
    privacyBadge: 'ZERO DATA RETENTION',
    privacyCorporate: 'ENTERPRISE-GRADE',
    privacyTitle: 'Your entries belong to you alone',
    privacySubtitle: 'Zero training of public AI models on your private journal.',
    privacyLinkText: 'Read our privacy manifesto',
    finalTitle: 'Discover what you are capable of',
    finalSubtitle: 'Two minutes this evening — the first honest review of your personal strength.',
    finalCta: 'Start for free',
  },
}

export function AiPageView({ locale = 'ru' }: { locale?: Locale }) {
  const containerRef = useScrollReveal()
  const content = AI_PAGE_CONTENT[locale] || AI_PAGE_CONTENT.ru

  return (
    <div
      className="landing relative min-h-screen bg-black text-white selection:bg-[#d76737]/30 selection:text-white overflow-x-hidden"
      ref={containerRef}
    >
      {/* ── FIXED GLYPH CANVAS BACKGROUND ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <GlyphBackground
          className="size-full opacity-45"
          glowColor="#222226"
          shapeColor="#a1a1aa"
          fontSize={10}
          rest={0.08}
          haze={0.18}
          hoverInk={0.35}
          interactive={true}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_40%,#000000_95%)] pointer-events-none" />
      </div>

      {/* ── SCROLLING FOREGROUND STAGE ─────────────────────────────── */}
      <div className="relative z-10">
        <AppleNavbar locale={locale} />

        {/* ── 1. HERO ──────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center text-center pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 md:px-8 bg-transparent">
          <div className="relative z-10 max-w-[1040px] mx-auto flex flex-col items-center">
            <div className="fade-blur mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#d76737]" />
              <span className="text-[12px] font-medium tracking-wide uppercase text-[#a1a1a6]">
                {content.badge}
              </span>
            </div>

            <h1 className="apple-hero-title fade-blur delay-75 mb-6 sm:mb-8 max-w-[920px] text-wrap-balance">
              {content.title1}
              <br />
              <span className="text-[#d76737]">{content.title2}</span>
            </h1>

            <p className="apple-body apple-hero-subtitle fade-up delay-150 max-w-[680px] mb-8 sm:mb-10 text-[#86868b] text-[17px] sm:text-[19px] leading-[1.38] text-wrap-balance">
              {content.subtitle}
            </p>

            <div className="fade-scale delay-200 flex items-center justify-center gap-4 flex-wrap mb-10 sm:mb-14">
              <Link
                href="/register"
                className="apple-btn-primary !px-8 !py-3.5 !text-[15px] cursor-pointer whitespace-nowrap"
              >
                {content.ctaPrimary}
              </Link>
              <a
                href="#pricing-ai"
                className="apple-btn-ghost !px-6 !py-3.5 !text-[15px] backdrop-blur-md bg-white/[0.04] border border-white/10 hover:border-white/20 text-white cursor-pointer whitespace-nowrap"
              >
                {content.ctaPricing}
              </a>
            </div>

            {/* Showcase Visual: Live Winlog AI Preview */}
            <div className="fade-scale delay-250 w-full max-w-[980px]">
              <div className="p-2 sm:p-3 rounded-[24px] sm:rounded-[28px] bg-[#060608] border border-white/[0.1] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/[0.06] mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-mono text-[#86868b]">
                    {content.macWindowHeader}
                  </span>
                  <span className="text-[11px] font-mono text-[#d76737]">
                    {content.zeroTrainingBadge}
                  </span>
                </div>

                <div className="relative rounded-[16px] sm:rounded-[20px] overflow-hidden bg-black">
                  <WinlogAiPreview locale={locale} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. ЧЕТЫРЕ ЗАДАЧИ НАШЕГО ИИ ────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.08]">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
            <div className="text-center max-w-[760px] mx-auto mb-14 sm:mb-18">
              <span className="apple-eyebrow fade-up block mb-4">{content.tasksEyebrow}</span>
              <h2 className="apple-section-title fade-up delay-75 mb-5 text-[28px] sm:text-[40px] font-bold text-white tracking-tight">
                {content.tasksTitle}
              </h2>
              <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
                {content.tasksSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
              {content.tasks.map((task) => (
                <div
                  key={task.num}
                  className="p-7 sm:p-9 rounded-2xl bg-[#060608] border border-white/[0.1] hover:border-white/20 transition-all flex flex-col justify-between group min-h-[220px]"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-white/[0.05] border border-white/[0.1] text-white/85">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <h3 className="text-[20px] sm:text-[22px] font-semibold text-white mb-2.5 tracking-tight">
                      {task.title}
                    </h3>
                    <p className="text-[15px] leading-relaxed text-[#86868b]">
                      {task.desc}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-white/[0.06] mt-6 text-[12px] font-mono tracking-wider text-white/55">
                    {task.badge}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. ТАРИФЫ С ИИ ────────────────────────────────────────── */}
        <section id="pricing-ai" className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.08] scroll-mt-24 sm:scroll-mt-32">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
            <div className="text-center max-w-[760px] mx-auto mb-14 sm:mb-18">
              <span className="apple-eyebrow fade-up block mb-4">{content.pricingEyebrow}</span>
              <h2 className="apple-section-title fade-up delay-75 mb-5 text-[28px] sm:text-[40px] font-bold text-white tracking-tight">
                {content.pricingTitle}
              </h2>
              <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
                {content.pricingSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {content.pricingTiers.map((tier, idx) => (
                <GlowCard
                  key={tier.name}
                  glowColor={idx === 1 ? 'orange' : 'green'}
                  customSize
                  className={`p-7 sm:p-8 flex flex-col justify-between bg-[#060608] rounded-2xl relative min-h-[500px] ${
                    tier.highlight ? '!border-[#d76737]/60' : 'border border-white/[0.1]'
                  }`}
                >
                  {tier.popularBadge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#d76737] text-black text-[10px] font-semibold uppercase tracking-wider z-20 whitespace-nowrap">
                      {tier.popularBadge}
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider block mb-2 font-semibold text-[#86868b]">
                        {tier.badge}
                      </span>
                      <h3 className="text-[22px] sm:text-[24px] font-bold text-white mb-1">{tier.name}</h3>
                      <div className="text-[32px] font-bold text-white font-sans mb-3 flex items-baseline flex-wrap gap-x-2">
                        {tier.oldPrice && (
                          <span className="text-[18px] font-medium text-[#86868b] line-through tabular-nums">
                            {tier.oldPrice}
                          </span>
                        )}
                        <span>{tier.price}</span>
                        <span className="text-xs text-[#86868b] font-normal">{tier.period}</span>
                      </div>
                      <p className="text-[14px] text-[#86868b] mb-6 leading-relaxed min-h-[42px]">
                        {tier.desc}
                      </p>

                      <div className="space-y-3 text-[14px] text-white/90 mb-8 min-h-[140px]">
                        {tier.features.map((feat) => (
                          <div key={feat} className="flex items-center gap-2.5">
                            <span className={tier.highlight ? 'text-[#d76737]' : 'text-white/75'}>
                              ✓
                            </span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link
                      href="/register"
                      className={`w-full py-3 rounded-full text-[14px] text-center font-semibold block transition-all ${
                        tier.highlight
                          ? 'bg-[#d76737] hover:bg-[#e0784b] text-black'
                          : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12]'
                      }`}
                    >
                      {content.finalCta}
                    </Link>
                  </div>
                </GlowCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. ПРИВАТНОСТЬ И ZERO-TRAINING ────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.08]">
          <div className="max-w-[860px] mx-auto px-4 sm:px-6 md:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 text-xs text-[#86868b] mb-6">
              <span className="text-[#d76737] font-medium">{content.privacyBadge}</span>
              <span>·</span>
              <span>{content.privacyCorporate}</span>
            </div>

            <h2 className="text-[26px] sm:text-[36px] font-bold text-white mb-5 tracking-tight">
              {content.privacyTitle}
            </h2>

            <p className="text-[16px] sm:text-[18px] text-[#86868b] leading-relaxed mb-8 max-w-[640px] mx-auto">
              {content.privacySubtitle}
            </p>

            <Link
              href={`/legal/${locale}#privacy`}
              className="text-[#d76737] hover:text-[#e0784b] hover:underline text-[15px] font-medium inline-flex items-center gap-1.5"
            >
              <span>{content.privacyLinkText}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── 5. FINAL CALL TO ACTION ───────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-transparent border-t border-white/[0.08] text-center">
          <div className="max-w-[760px] mx-auto px-4 sm:px-6 md:px-8">
            <h2 className="apple-hero-title mb-5 !text-[32px] sm:!text-[46px] font-bold text-white tracking-tight">
              {content.finalTitle}
            </h2>
            <p className="apple-body max-w-[540px] mx-auto mb-8 text-[#86868b] text-[17px] leading-relaxed">
              {content.finalSubtitle}
            </p>
            <Link
              href="/register"
              className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold cursor-pointer"
            >
              {content.finalCta}
            </Link>
          </div>
        </section>

        <AppleFooter locale={locale} />
      </div>
    </div>
  )
}

export default function AiPage() {
  return <AiPageView locale="ru" />
}
