'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AppleNavbar } from './apple-navbar'
import { AppleFooter } from './apple-footer'
import { MediaSlot } from './media-slot'
import { AppleModesPanel } from './apple-modes-panel'
import { useScrollReveal } from './use-scroll-reveal'
import { AuthModal } from '../auth/auth-modal'
import type { AuthMode } from '../auth/auth-form'
import { TestimonialGlobe } from '@/components/ui/testimonial-globe'
import { GLOBE_TESTIMONIALS } from './reviews-data'

type Props = {
  onNotify?: (msg: string) => void
  onAuthenticated?: (accountId: string) => void
}

/* ── Difficulty levels data (Gripping, truthful copy) ──────────────── */
const LEVELS = [
  {
    count: '1',
    flames: 1,
    title: '1 факт',
    sub: 'Антивыгорание',
    desc: 'Минимальный рубеж честности. Спасает даже в дни полнейшего шторма и апатии.',
    extreme: false,
    delay: 'delay-100',
  },
  {
    count: '2',
    flames: 2,
    title: '2 факта',
    sub: 'Стандарт жизни',
    desc: 'Одно дело для карьеры, одно для тела или дома. Твёрдый шаг вперёд каждый день.',
    extreme: false,
    delay: 'delay-200',
  },
  {
    count: '3',
    flames: 3,
    title: '3 факта',
    sub: 'Режим прорыва',
    desc: 'Осознанный фокус на ключевых победах без надрыва нервной системы.',
    extreme: false,
    delay: 'delay-300',
  },
  {
    count: '4',
    flames: 4,
    title: '4 факта',
    sub: 'Серьёзный темп',
    desc: 'Для тех, кто тащит масштабные проекты, жесткий спорт и команду.',
    extreme: false,
    delay: 'delay-400',
  },
  {
    count: '5',
    flames: 5,
    title: '5 фактов',
    sub: 'Extreme Режим',
    desc: 'Предельная концентрация спецназа. Для закалки несокрушимого характера.',
    extreme: true,
    delay: 'delay-500',
  },
]

/* ── Platform Showcase Tabs ───────────────────────────────────────── */
const SHOWCASE_TABS = [
  {
    id: 'profile',
    label: 'Рекорд 740 дней',
    tag: 'МАКСИМАЛЬНЫЙ СТРИК САЙТА',
    title: '740 дней — рекорд максимального стрика',
    desc: 'Рекорд платформы: 740 закрытых дней подряд. Доказательство того, что регулярный вечерний ритуал превращается в нерушимую внутреннюю силу.',
    image: 'platform_02_profile.png',
    color: '#f56900',
    stats: [
      { label: 'Рекорд стрика', val: '740+' },
      { label: 'Зафиксированных побед', val: '7 400+' },
      { label: 'Уровень дисциплины', val: 'Уровень 5' },
    ],
  },
  {
    id: 'analytics',
    label: 'Аналитика преодоления',
    tag: 'ШКАЛА 1–10★ И ИНСАЙТЫ',
    title: 'Трезвый аудит внутренней энергии',
    desc: 'Графики динамики и персональные выводы ИИ: фиксация того, как утренние победы поднимают результативность в бизнесе на 35%.',
    image: 'platform_03_analytics.png',
    color: '#2997ff',
    stats: [
      { label: 'Средний балл силы', val: '★ 9.0' },
      { label: 'Пиковая категория', val: 'Спорт и тело' },
      { label: 'Рост фокуса', val: '+35%' },
    ],
  },
  {
    id: 'vault',
    label: 'Evidence Vault',
    tag: 'СЕЙФ ДОКАЗАТЕЛЬСТВ',
    title: 'Железобетонные факты стойкости',
    desc: 'Защищённое хранилище ключевых моментов: финиш горного марафона, подписанные контракты и черновики книг, доступные в минуты сомнений.',
    image: 'platform_04_vault.png',
    color: '#8668ff',
    stats: [
      { label: 'Приватность', val: 'Секретно / Публично' },
      { label: 'Видимость', val: 'Под твоим контролем' },
      { label: 'Доступ', val: 'Пин-код / Face ID' },
    ],
  },
  {
    id: 'diary',
    label: 'Вечерний дневник',
    tag: 'РИТУАЛ 5 МИНУТ',
    title: 'Летопись дня: честно и без воды',
    desc: '5 структурированных поступков за вечер: пробежка 5 км, спринт в коде, созвон без отвлечений и время с семьёй. Без бесконечных списков.',
    image: 'platform_01_diary.png',
    color: '#00a1b3',
    stats: [
      { label: 'Время ритуала', val: '5 минут' },
      { label: 'Вопросов вечером', val: '2 вопроса' },
      { label: 'Сгорание стрика', val: '0% (Никогда)' },
    ],
  },
]

/* ── Authentic Community Quotes ───────────────────────────────────── */
const QUOTES = [
  {
    image: 'quote-1.jpg',
    text: '740 дней — это рекорд максимального огонька на сайте. Когда каждый вечер фиксируешь победы, стрик становится непоколебимой внутренней опорой. И главное: ты сам выбираешь, делиться ими с миром или держать в секрете.',
    author: 'Александр Церна',
    role: 'Основатель Priday · Рекорд стрика 740 дней',
    isFounder: true,
    delay: 'delay-150',
  },
  {
    image: 'quote-2.jpg',
    text: 'Раньше казалось, что день пролетает впустую. Priday перевернул всё: когда вечером фиксируешь 3 главных преодоления, появляется осязаемое чувство победы и спокойствия.',
    author: 'Елена Романова',
    role: 'Product Lead · 320 дней в летописи',
    isFounder: false,
    delay: 'delay-300',
  },
  {
    image: 'quote-3.jpg',
    text: 'Главное открытие — стрик не обнуляется из-за одного пропуска. Это полностью убрало тревожность и вину. За полгода я зафиксировал 600 побед в работе и спорте.',
    author: 'Михаил Воронов',
    role: 'Архитектор и триатлет · 190 дней в летописи',
    isFounder: false,
    delay: 'delay-450',
  },
]

export function LandingPage({ onNotify, onAuthenticated }: Props) {
  const containerRef = useScrollReveal()
  const [authModal, setAuthModal] = useState<AuthMode | null>(null)
  const [activeShowcase, setActiveShowcase] = useState<string>('profile')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')
  const activeShowcaseItem = SHOWCASE_TABS.find((t) => t.id === activeShowcase) || SHOWCASE_TABS[0]

  const openAuth = (mode: AuthMode) => setAuthModal(mode)
  const closeAuth = () => setAuthModal(null)

  return (
    <div className="landing" ref={containerRef}>
      {/* ── Fixed Apple Header ──────────────────────────────────────── */}
      <AppleNavbar onOpenAuth={openAuth} />

      {/* ── Existing Auth Modal ─────────────────────────────────────── */}
      {authModal && (
        <AuthModal
          onClose={closeAuth}
          onNotify={(msg) => onNotify?.(msg)}
          initialMode={authModal}
          onAuthenticated={(accountId) => {
            closeAuth()
            onAuthenticated?.(accountId)
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 — HERO STAGE (Cinematic Full-Width Video Stage)
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[92vh] flex flex-col justify-center items-center overflow-hidden pt-16 pb-20 px-5 sm:px-8"
        aria-label="Главный экран Priday"
      >
        {/* Full-width video slot in background */}
        <div className="absolute inset-0 z-0 w-full h-full">
          <MediaSlot
            name="mainvideo.mp4"
            poster="mode-sport.jpg"
            width={2560}
            height={1440}
            ratio="16:9"
            alt="Видео-витрина главного экрана"
            priority
            rounded={false}
            fill
            isHero
          />
          {/* Calibrated luminous video overlay: transparent in upper & middle, soft gradient in lower third (max 0.55) */}
          <div className="apple-video-overlay" aria-hidden="true" />
        </div>

        {/* Apple Ambient Stage Glow Halo behind hero headline */}
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0" />

        {/* Hero Content positioned over the video stage */}
        <div className="relative z-20 max-w-[1080px] mx-auto text-center flex flex-col items-center">
          {/* Category Eyebrow Tag: Punchy psychological hook */}
          <div className="fade-blur mb-5 sm:mb-6 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="apple-eyebrow">
              Антидот от&nbsp;самообесценивания
            </span>
          </div>

          {/* Epic Apple Headline (Wide 2-line structure) */}
          <h1 className="apple-hero-title apple-hero-shadow fade-blur delay-75 mb-6 sm:mb-8 max-w-[1080px]">
            <span className="inline-block">Хватит обесценивать себя.</span>{' '}
            <br className="hidden md:inline" />
            <span className="apple-shimmer-text inline-block">Твои победы требуют доказательств.</span>
          </h1>

          {/* Subtitle: Direct emotional trigger (24-32px from h1, 32-40px to buttons, multiple of 8px) */}
          <p className="apple-body apple-hero-subtitle apple-hero-shadow fade-up delay-150 max-w-[720px] mb-8 sm:mb-10 !text-[#f5f5f7] text-[17px] sm:text-[19px] leading-relaxed font-normal">
            Каждый вечер мозг врёт тебе, что ты&nbsp;сделал недостаточно. «Priday» возвращает твёрдые факты: 5&nbsp;минут вечерней тишины, от&nbsp;1 до&nbsp;5 настоящих поступков&nbsp;— и&nbsp;железное спокойствие перед зеркалом.
          </p>

          {/* Action CTAs: Apple Blue + Ghost link */}
          <div className="fade-scale delay-200 flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="apple-btn-primary !px-8 !py-3.5 !text-[15px] shadow-[0_0_24px_rgba(0,113,227,0.4)]"
            >
              Начать свою летопись&nbsp;→
            </button>
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="apple-btn-ghost !px-6 !py-3.5 !text-[15px]"
            >
              Войти&nbsp;›
            </button>
          </div>

          {/* Trust subtitle */}
          <div className="fade-up delay-250 mt-6 text-[12px] font-mono text-[#b0b0b5] apple-hero-shadow tracking-wider">
            Бесплатно навсегда · Без рекламы · Публичный или секретный режим
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — «КАК ЭТО РАБОТАЕТ» (Физиология характера)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="how"
        className="relative py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] overflow-hidden scroll-mt-24 sm:scroll-mt-32"
        aria-label="Как это работает"
      >
        {/* Soft Amber Ambient Glow on Left */}
        <div className="apple-ambient-orb w-[500px] h-[500px] bg-[#f56900] top-1/3 -left-32 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">Физиология характера</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-6 max-w-[920px]">
            5 минут вечерней тишины, которые выключают внутренний шум.
          </h2>
          <p className="apple-body fade-up delay-100 max-w-[700px] mb-16 sm:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Эволюция настроила твой мозг замечать только угрозы и ошибки. Если не фиксировать победы осознанно — ты всегда будешь чувствовать себя неудачником, даже закрыв 20 задач за день.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Large ritual media slot frame */}
            <div className="lg:col-span-7 fade-scale delay-150">
              <div className="apple-card apple-card-hover overflow-hidden p-2.5 sm:p-3 bg-[#121214]">
                <MediaSlot
                  name="ritual.jpg"
                  width={1920}
                  height={1080}
                  ratio="16:9"
                  alt="Вечерний ритуал фиксации побед"
                  objectPosition="center 20%"
                />
              </div>
            </div>

            {/* Right: 3 actionable steps */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              {[
                {
                  step: '01',
                  title: 'Прижми себя к стене фактами',
                  desc: 'Никаких «стал лучшей версией». Только железо: пробежал 5 км в холодный дождь, не сорвался на близких, честно признал ошибку перед партнером. 1–5 дел, за которые не стыдно.',
                  delay: 'delay-200',
                },
                {
                  step: '02',
                  title: 'Переключи фокус с дефицита',
                  desc: 'Благодарность — это не эзотерика. Это способ переключить нервную систему с кортизолового стресса на глубокий восстановительный сон.',
                  delay: 'delay-300',
                },
                {
                  step: '03',
                  title: 'Обопрись на твёрдое',
                  desc: 'Через 30 дней у тебя не абстрактные надежды, а 100 задокументированных фактов преодоления. Ты больше не сможешь соврать себе, что слаб.',
                  delay: 'delay-400',
                },
              ].map((item, idx) => (
                <div
                  key={item.step}
                  className={`fade-slide-left ${item.delay} ${idx !== 2 ? 'border-b border-white/[0.08] pb-10' : ''}`}
                >
                  <div className="flex items-baseline gap-3.5 mb-2.5">
                    <span className="text-[13px] font-mono text-[#f56900] tracking-wider">
                      {item.step}
                    </span>
                    <h3 className="text-[22px] font-semibold tracking-tight text-[#f5f5f7]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[15px] leading-relaxed text-[#86868b] pl-8">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — «РЕЖИМЫ ЖИЗНИ» (Архитектура баланса)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="modes"
        className="relative py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06] overflow-hidden scroll-mt-24 sm:scroll-mt-32"
        aria-label="Режимы жизни"
      >
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 -right-40 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">Архитектура баланса</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-6 max-w-[920px]">
            Победа в бизнесе не должна стоить тебе инфаркта и семьи.
          </h2>
          <p className="apple-body fade-up delay-100 max-w-[680px] mb-16 sm:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Успех в одной сфере ценой разрушения остальных — это не сила, это побег. «Priday» удерживает в балансе 4 ключевые опоры: тело, карьеру, семью и внутренний дух.
          </p>

          <div className="fade-up delay-150">
            <AppleModesPanel />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — «УРОВНИ ЖЁСТКОСТИ» (Честный договор с собой)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="levels"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Уровни жёсткости"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">Честный договор с собой</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
            Выбери темп, который удержишь.
          </h2>
          <p className="apple-body fade-up delay-150 max-w-[680px] mb-14 sm:mb-16 md:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Лучше 1 железный поступок каждый вечер 365 дней подряд, чем неделя героизма и полгода апатии.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {LEVELS.map((lvl) => (
              <div
                key={lvl.count}
                onClick={() => openAuth('register')}
                className={`apple-card apple-card-hover fade-up ${lvl.delay} p-5 sm:p-5.5 flex flex-col justify-between cursor-pointer group ${
                  lvl.extreme
                    ? 'apple-card-extreme border-orange-500/30 bg-gradient-to-b from-[#1c1815] to-[#141210] sm:col-span-2 lg:col-span-1'
                    : 'bg-[#161617]'
                }`}
              >
                <div>
                  {/* Energy Flame Indicator */}
                  <div className="flex items-center gap-1.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-3.5 rounded-full transition-all duration-300 ${
                          i < lvl.flames
                            ? lvl.extreme
                              ? 'bg-[#f56900] shadow-[0_0_8px_rgba(245,105,0,0.6)]'
                              : 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>

                  <span className="block text-[38px] font-bold tracking-tight text-[#f5f5f7] leading-none mb-2 font-mono">
                    {lvl.count}
                  </span>
                  <h3 className="text-[17px] font-semibold text-[#f5f5f7] mb-1 tracking-tight leading-snug">
                    {lvl.title}
                  </h3>
                  <div className="text-[12px] font-medium text-[#f56900] mb-3">
                    {lvl.sub}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#86868b] group-hover:text-[#a1a1a6] transition-colors">
                    {lvl.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Link to Examples and Level Guide */}
          <div className="mt-10 text-center fade-up delay-200">
            <Link
              href="/examples"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#2997ff] hover:text-[#0071e3] transition-colors"
            >
              <span>Подробный гид: как писать гордости и какой уровень выбрать для себя →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — «ЦИФРЫ» (Без воды и инфоцыганства)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="numbers"
        className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Реальные цифры"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[760px] mx-auto mb-16 sm:mb-20 md:mb-24">
            <span className="apple-eyebrow fade-up block mb-4">Без воды и инфоцыганства</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
              Не обещания. Не курсы. Факты.
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Здесь нет марафонов желаний. 126+ практиков каждый вечер садятся в тишине и ведут честный протокол своей жизни.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
            {/* Card 1: 126+ человек */}
            <div className="apple-card apple-card-hover fade-scale delay-150 p-8 sm:p-10 text-center bg-[#161617] flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-semibold text-[#f56900] uppercase tracking-wider block mb-3">
                  Сообщество практиков
                </span>
                <span className="apple-shimmer-text block text-[48px] sm:text-[60px] font-bold tracking-tight leading-none mb-3 tabular-nums font-sans">
                  126+
                </span>
                <p className="text-[18px] sm:text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  человек держат слово
                </p>
              </div>
              <p className="text-[14px] leading-relaxed text-[#86868b]">
                Практиков перестали обесценивать свою жизнь, каждый вечер фиксируют победы и опираются на факты.
              </p>
            </div>

            {/* Card 2: 26 312 дней */}
            <div className="apple-card apple-card-hover fade-scale delay-300 p-8 sm:p-10 text-center bg-[#161617] flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-semibold text-[#f56900] uppercase tracking-wider block mb-3">
                  Суммарный опыт
                </span>
                <span className="apple-shimmer-text block text-[44px] sm:text-[54px] font-bold tracking-tight leading-none mb-3 tabular-nums font-sans whitespace-nowrap">
                  26&nbsp;312
                </span>
                <p className="text-[18px] sm:text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  дней летописей
                </p>
              </div>
              <p className="text-[14px] leading-relaxed text-[#86868b]">
                Написанных страниц силы. Стрик не сгорает от пропусков — весь пройденный путь навсегда с тобой.
              </p>
            </div>

            {/* Card 3: 176 455 побед */}
            <div className="apple-card apple-card-hover fade-scale delay-450 p-8 sm:p-10 text-center bg-[#161617] flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-semibold text-[#f56900] uppercase tracking-wider block mb-3">
                  Твёрдые доказательства
                </span>
                <span className="apple-shimmer-text block text-[42px] sm:text-[52px] font-bold tracking-tight leading-none mb-3 tabular-nums font-sans whitespace-nowrap">
                  176&nbsp;455
                </span>
                <p className="text-[18px] sm:text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  побед и благодарностей
                </p>
              </div>
              <p className="text-[14px] leading-relaxed text-[#86868b]">
                Реальных дел преодоления и искренней признательности, навсегда сохранённых на устройствах.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6 — 3D ИНТЕРАКТИВНЫЙ ГЛОБУС ОТЗЫВОВ (Голоса практиков)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="quotes"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Отзывы и истории участников"
      >
        <TestimonialGlobe
          items={GLOBE_TESTIMONIALS}
          eyebrow="Голоса практиков по всему миру"
          heading="«Я наконец-то перестал жрать себя изнутри перед сном»."
          caption="Живые истории предпринимателей, инженеров, спортсменов и родителей со всех континентов планеты, которые вернули веру в свои силы благодаря пяти минутам вечерней летописи."
          autoplay
          interval={3600}
          action={
            <Link
              href="/reviews"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 px-4 text-xs font-semibold text-white transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
            >
              <span>Читать все 32 истории</span>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h9.5M8.5 4l4 4-4 4" />
              </svg>
            </Link>
          }
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6.5 — «СИСТЕМА В ДЕЙСТВИИ» (Интерфейс для спокойствия)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="showcase"
        className="py-16 sm:py-20 md:py-28 bg-[#0a0a0c] border-t border-white/[0.06] overflow-hidden scroll-mt-24 sm:scroll-mt-32"
        aria-label="Платформа в действии"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[780px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">Тактильный интерфейс</span>
            <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6">
              Инструмент, созданный для спокойствия.
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Никакого визуального мусора, баннеров и счётчиков лайков. Только ты, факты и кристально чистый экран.
            </p>
          </div>

          {/* Apple Segmented Pill Switcher */}
          <div className="fade-scale delay-150 flex items-center justify-center gap-2 mb-8 sm:mb-10 flex-wrap">
            {SHOWCASE_TABS.map((tab) => {
              const isActive = tab.id === activeShowcase
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveShowcase(tab.id)}
                  className={`px-4 sm:px-5 py-2.5 rounded-full text-[13px] sm:text-[14px] font-medium transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.25)] font-semibold'
                      : 'bg-white/[0.06] text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.1]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Active Showcase Stage Frame */}
          <div className="fade-scale delay-200 apple-card overflow-hidden p-5 sm:p-8 bg-[#141416] border border-white/10 shadow-2xl mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-6">
              <div className="lg:col-span-8">
                <span
                  className="text-[12px] font-semibold uppercase tracking-wider block mb-2"
                  style={{ color: activeShowcaseItem.color }}
                >
                  {activeShowcaseItem.tag}
                </span>
                <h3 className="text-[22px] sm:text-[26px] font-bold text-[#f5f5f7] tracking-tight mb-2">
                  {activeShowcaseItem.title}
                </h3>
                <p className="text-[14px] sm:text-[15px] text-[#86868b] leading-relaxed">
                  {activeShowcaseItem.desc}
                </p>
              </div>

              {/* Live Metric Pills */}
              <div className="lg:col-span-4 flex flex-col gap-2.5">
                {activeShowcaseItem.stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                  >
                    <span className="text-[13px] text-[#86868b]">{s.label}</span>
                    <span className="text-[14px] font-semibold text-[#f5f5f7] font-mono">
                      {s.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* High-Resolution 16:10 Screen Display Stage */}
            <div
              key={activeShowcase}
              className="rounded-[20px] overflow-hidden border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-black animate-in fade-in zoom-in-[0.98] duration-300 transition-all"
            >
              <MediaSlot
                name={activeShowcaseItem.image}
                width={1440}
                height={900}
                ratio="16:10"
                alt={activeShowcaseItem.title}
                rounded={false}
                priority
              />
            </div>
          </div>

          {/* Callout to /platform */}
          <div className="text-center fade-up delay-200">
            <a
              href="/platform"
              className="apple-btn-primary !px-8 !py-3.5 !text-[14px]"
            >
              Подробный тур по возможностям платформы ›
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7 — «ПРИВАТНОСТЬ» (Манифест священной приватности)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="privacy"
        className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Приватность и безопасность"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f56900" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="apple-eyebrow">Полный контроль видимости</span>
          </div>

          <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6 max-w-[920px]">
            Делись победами со всем миром или оставайся в полной секретности.
          </h2>

          <p className="apple-body fade-up delay-150 max-w-[740px] mb-14 sm:mb-16 md:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Ты сам решаешь, кому доступны твои записи. Ты можешь публиковать победы, чтобы вдохновлять других, а можешь держать их исключительно у себя — в секретном режиме тебя никто не найдёт на платформе, кроме тех, кому ты лично откроешь доступ.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {[
              {
                badge: 'ПУБЛИЧНЫЙ РЕЖИМ',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                ),
                title: 'Открытость всему миру',
                desc: 'Публикуй победы в общую ленту, участвуй в рейтингах силы и вдохновляй единомышленников своим прогрессом.',
                delay: 'delay-150',
              },
              {
                badge: 'СЕКРЕТНЫЙ РЕЖИМ',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c7be" strokeWidth="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ),
                title: 'Полная невидимость',
                desc: 'Тебя невозможно найти через поиск платформы. Профиль и записи скрыты — никто не увидит их без твоего разрешения.',
                delay: 'delay-200',
              },
              {
                badge: 'ВЫБОРОЧНЫЙ ДОСТУП',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f56900" strokeWidth="1.8">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <polyline points="16 11 18 13 22 9" />
                  </svg>
                ),
                title: 'Только для доверенных',
                desc: 'Открывай доступ к отдельным дням или группам только тем, кого выбираешь сам — по закрытой приватной ссылке.',
                delay: 'delay-250',
              },
              {
                badge: 'ZERO TRAINING ИИ',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                title: 'Нулевой сбор данных',
                desc: '0% рекламы и трекеров. Искусственный интеллект разбирает дни изолированно и никогда не обучается на твоих текстах.',
                delay: 'delay-300',
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`apple-card apple-card-hover fade-up ${card.delay} p-6 sm:p-7 bg-[#161617] flex flex-col justify-between min-h-[240px]`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#a1a1a6]">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-semibold text-[#f5f5f7] mb-2.5 tracking-tight leading-snug">
                    {card.title}
                  </h3>
                </div>
                <p className="text-[14px] leading-relaxed text-[#86868b] mt-auto">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Privacy Whitepaper Link */}
          <div className="mt-12 text-center fade-up delay-200">
            <a
              href="/privacy"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#2997ff] hover:text-[#0071e3] transition-colors"
            >
              <span>Читать манифест приватности и секретного режима</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8 — «ОТКРЫТЫ И БЕСПЛАТНЫ» (Манифест независимости)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="open"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] relative overflow-hidden scroll-mt-24 sm:scroll-mt-32"
        aria-label="Открытость и бесплатность"
      >
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#00a1b3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[820px] mx-auto mb-16 sm:mb-20">
            <span className="apple-eyebrow fade-up block mb-4 !text-[#00c7be]">Манифест независимости</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
              Платформа свободна. Навсегда.
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              «Priday» создавался не как коммерческий пылесос для выкачивания денег из тревожных людей. Это личный спасательный круг. Спокойствие и уважение к себе — это базовое право человека, а не платная подписка.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="apple-card apple-card-hover fade-up delay-150 p-8 sm:p-10 bg-[#161617] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#00c7be]/10 border border-[#00c7be]/20 flex items-center justify-center text-[#00c7be] mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  100% бесплатный базовый ритуал
                </h3>
                <p className="text-[14px] leading-relaxed text-[#86868b]">
                  Дневник побед, благодарности, честный стрик и шкала преодоления никогда не спрячутся за платную стену. Каждый человек на планете может вести свою летопись силы даром.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] font-mono text-[#00c7be] uppercase tracking-wider">
                ДОСТУПНО КАЖДОМУ
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="apple-card apple-card-hover fade-up delay-250 p-8 sm:p-10 bg-[#161617] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#f56900]/10 border border-[#f56900]/20 flex items-center justify-center text-[#f56900] mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  0% рекламы, спама и трекеров
                </h3>
                <p className="text-[14px] leading-relaxed text-[#86868b]">
                  Мы не торгуем твоим вниманием, не встраиваем баннеры и не отчитываемся перед инвесторами, требующими навязывать подписки. Твой внутренний покой неприкосновенен.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] font-mono text-[#f56900] uppercase tracking-wider">
                ЧИСТОЕ ПРОСТРАНСТВО
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="apple-card apple-card-hover fade-up delay-350 p-8 sm:p-10 bg-[#161617] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#2997ff] mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  Абсолютная приватность
                </h3>
                <p className="text-[14px] leading-relaxed text-[#86868b]">
                  Ты сам решаешь, быть публичным или вести полностью секретную летопись. Твои сокровенные победы никогда не станут достоянием чужих глаз без твоего прямого разрешения.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] font-mono text-[#2997ff] uppercase tracking-wider">
                ПОЛНЫЙ КОНТРОЛЬ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 9 — «ТАРИФЫ И ПОДДЕРЖКА» (Честная подписка)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06] relative scroll-mt-24 sm:scroll-mt-32"
        aria-label="Тарифы и подписка"
      >
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 right-1/4 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[800px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">Честные тарифы</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
              Поддержка независимого развития.
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Базовый «Priday» бесплатен навсегда. Платные тарифы созданы для тех, кому нужны нейросетевой ИИ-разбор дня, сейф фото-доказательств и кто хочет ускорить развитие проекта.
            </p>

            {/* Billing Cycle Pill Selector */}
            <div className="fade-scale delay-150 inline-flex items-center p-1 rounded-full bg-white/[0.06] border border-white/10 mt-8">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                Ежемесячно
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-[#0071e3] text-white font-semibold shadow-md'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                <span>На год</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white">
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* 3 Tier Hardware Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto items-stretch">
            {/* TIER 1: БАЗОВЫЙ (FREE) */}
            <div className="apple-card apple-card-hover fade-up delay-150 p-8 sm:p-10 bg-[#161617] flex flex-col justify-between border border-white/10">
              <div>
                <div className="text-[12px] font-mono text-[#86868b] uppercase tracking-wider mb-2">
                  БАЗОВЫЙ ПЛАН
                </div>
                <h3 className="text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                  Свободный
                </h3>
                <p className="text-[14px] text-[#86868b] mb-6">
                  Для тех, кому нужна точка внутренней опоры и спокойный сон.
                </p>

                <div className="mb-8 pb-6 border-b border-white/[0.08]">
                  <span className="text-[44px] font-bold font-sans text-white tabular-nums">
                    0 MDL
                  </span>
                  <span className="text-[14px] text-[#86868b] ml-2">/ навсегда</span>
                </div>

                <ul className="space-y-3.5 text-[14px] text-[#f5f5f7]/90 mb-8">
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>До 1 000 символов на запись</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Дневник гордостей и благодарностей</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Стрик, который не сгорает</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Публичный или секретный профиль</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>P2P аудиозвонки без лимитов</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => openAuth('register')}
                className="w-full py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] text-[14px] font-medium transition-all text-center cursor-pointer border border-white/10"
              >
                Начать бесплатно
              </button>
            </div>

            {/* TIER 2: ПРЕМИУМ (PRO) — РЕКОМЕНДУЕМЫЙ */}
            <div className="apple-card apple-card-hover fade-scale delay-200 p-8 sm:p-10 bg-gradient-to-b from-[#1a1e28] to-[#12141a] flex flex-col justify-between border-2 border-[#0071e3] relative shadow-[0_0_40px_rgba(0,113,227,0.25)]">
              {/* Highlight Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#0071e3] text-white text-[11px] font-semibold tracking-wider uppercase shadow-md">
                ★ Выбор сообщества
              </div>

              <div>
                <div className="text-[12px] font-mono text-[#2997ff] uppercase tracking-wider mb-2">
                  ПРЕМИУМ ПЛАН
                </div>
                <h3 className="text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                  Priday Pro
                </h3>
                <p className="text-[14px] text-[#86868b] mb-6">
                  Для активной работы над собой: нейросетевой разбор и сейф доказательств.
                </p>

                <div className="mb-8 pb-6 border-b border-white/[0.08]">
                  <span className="text-[44px] font-bold font-sans text-white tabular-nums">
                    {billingCycle === 'yearly' ? '240 MDL' : '25 MDL'}
                  </span>
                  <span className="text-[14px] text-[#86868b] ml-2">
                    {billingCycle === 'yearly' ? '/ год (~20 MDL/мес)' : '/ месяц'}
                  </span>
                </div>

                <ul className="space-y-3.5 text-[14px] text-[#f5f5f7] mb-8">
                  <li className="flex items-center gap-3 font-medium text-white">
                    <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>До 3 000 символов на запись (в 3 раза больше)</span>
                  </li>
                  <li className="flex items-center gap-3 font-medium text-[#2997ff]">
                    <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>1 ИИ-оценка летописи в сутки нейросетью</span>
                  </li>
                  <li className="flex items-center gap-3 font-medium text-white">
                    <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Evidence Vault: 1 фото-доказательство в день</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Зашифрованные видеозвонки HD</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Расширенная аналитика стрика и вех</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => openAuth('register')}
                className="apple-btn-primary w-full !py-3.5 !text-[15px] !font-semibold shadow-[0_0_25px_rgba(0,113,227,0.5)]"
              >
                Выбрать Премиум Pro →
              </button>
            </div>

            {/* TIER 3: ОСНОВАТЕЛЬ (ULTRA) */}
            <div className="apple-card apple-card-hover fade-up delay-300 p-8 sm:p-10 bg-[#161617] flex flex-col justify-between border border-white/10">
              <div>
                <div className="text-[12px] font-mono text-[#f56900] uppercase tracking-wider mb-2">
                  КЛУБ ОСНОВАТЕЛЕЙ
                </div>
                <h3 className="text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                  Основатель Ultra
                </h3>
                <p className="text-[14px] text-[#86868b] mb-6">
                  Максимальная глубина, золотой статус и прямой вклад в проект.
                </p>

                <div className="mb-8 pb-6 border-b border-white/[0.08]">
                  <span className="text-[44px] font-bold font-sans text-white tabular-nums">
                    {billingCycle === 'yearly' ? '480 MDL' : '50 MDL'}
                  </span>
                  <span className="text-[14px] text-[#86868b] ml-2">
                    {billingCycle === 'yearly' ? '/ год (~40 MDL/мес)' : '/ месяц'}
                  </span>
                </div>

                <ul className="space-y-3.5 text-[14px] text-[#f5f5f7]/90 mb-8">
                  <li className="flex items-center gap-3 font-medium text-white">
                    <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>До 5 000 символов на запись</span>
                  </li>
                  <li className="flex items-center gap-3 font-medium text-white">
                    <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>До 3 фото в сутки в Evidence Vault</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Глубокие отчёты о вехах (100, 200, 300+ дней)</span>
                  </li>
                  <li className="flex items-center gap-3 text-[#f56900] font-medium">
                    <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Золотой статус ⚡ ULTRA FOUNDER</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Прямой закрытый чат и приоритет</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => openAuth('register')}
                className="w-full py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] text-[14px] font-medium transition-all text-center cursor-pointer border border-white/10"
              >
                Стать Основателем
              </button>
            </div>
          </div>

          {/* AI Page Callout Banner */}
          <div className="mt-12 p-6 sm:p-8 rounded-[24px] bg-gradient-to-r from-[#0071e3]/15 via-[#00c7be]/10 to-transparent border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 fade-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/20 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-[17px] font-semibold text-white tracking-tight">
                  Как именно работает нейросетевой наставник?
                </h4>
                <p className="text-[14px] text-[#86868b]">
                  Изучите 4 ключевые задачи ИИ, шкалу преодоления 1–10★, вердикт Ментора и гарантии Zero-Training.
                </p>
              </div>
            </div>
            <a
              href="/ai"
              className="apple-btn-secondary !px-6 !py-3 !text-[14px] whitespace-nowrap shrink-0 hover:bg-white/[0.14] transition-all"
            >
              Подробнее об ИИ Priday →
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 10 — ФИНАЛЬНЫЙ БАННЕР «ВМЕСТЕ ГОРДИТЬСЯ ЛЕГЧЕ»
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="together"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Финальный призыв к действию"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="apple-card apple-card-hover fade-scale delay-100 overflow-hidden relative min-h-[500px] sm:min-h-[560px] flex items-center justify-center text-center p-8 sm:p-16 bg-[#121214]">
            {/* Wide 21:9 container for together.jpg */}
            <div className="absolute inset-0 z-0">
              <MediaSlot
                name="together.jpg"
                width={2560}
                height={1100}
                ratio="21:9"
                alt="Вместе гордиться легче"
                rounded={false}
                fill
                isHero
                objectPosition="center 30%"
              />
              {/* Refined gradient: lets the campfire glow radiate while keeping text razor-sharp */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/60 z-10" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.75)_100%)] z-10 pointer-events-none" />
            </div>

            {/* Warm ember stage backlight */}
            <div className="apple-ambient-orb w-[500px] h-[500px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-20" />

            {/* Overlaid Banner Content */}
            <div className="relative z-20 max-w-[700px] mx-auto flex flex-col items-center">
              <h2 className="apple-hero-title fade-blur delay-75 mb-5 !text-[34px] sm:!text-[50px] leading-[1.12] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
                Сегодня вечером. 5 минут.
                <br />
                <span className="apple-shimmer-text">Начни честный разговор с собой.</span>
              </h2>
              <p className="apple-body fade-up delay-150 !text-white max-w-[580px] mb-8 text-[17px] sm:text-[19px] leading-relaxed drop-shadow-[0_2px_14px_rgba(0,0,0,0.98)] font-normal">
                Закрой этот день с уважением к себе. Зафиксируй то, за что не стыдно перед зеркалом. И ложись спать со спокойной душой.
              </p>
              <div className="fade-scale delay-200 flex items-center justify-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold shadow-[0_0_35px_rgba(0,113,227,0.6)] hover:shadow-[0_0_45px_rgba(0,113,227,0.85)] cursor-pointer"
                >
                  Зажечь свой огонёк →
                </button>
                <Link
                  href="/community"
                  className="apple-btn-ghost !px-6 !py-4 !text-[15px] !text-white hover:!text-white/90"
                >
                  Клубы и сторис ›
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 11 — APPLE UNIVERSAL FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <AppleFooter />
    </div>
  )
}
