'use client'

import React, { useState } from 'react'
import { AppleNavbar } from './apple-navbar'
import { AppleFooter } from './apple-footer'
import { MediaSlot } from './media-slot'
import { AppleModesPanel } from './apple-modes-panel'
import { useScrollReveal } from './use-scroll-reveal'
import { AuthModal } from '../auth/auth-modal'
import type { AuthMode } from '../auth/auth-form'

type Props = {
  onNotify?: (msg: string) => void
  onAuthenticated?: (accountId: string) => void
}

/* ── Difficulty levels data ───────────────────────────────────────── */
const LEVELS = [
  {
    count: '1',
    flames: 1,
    title: '1 гордость',
    sub: 'Мягкий старт',
    desc: 'Одна главная победа за вечер. Идеально для старта и защиты от выгорания.',
    extreme: false,
    delay: 'delay-100',
  },
  {
    count: '2',
    flames: 2,
    title: '2 гордости',
    sub: 'Стандарт',
    desc: 'Баланс между работой и личной жизнью. Твёрдый шаг вперёд каждый день.',
    extreme: false,
    delay: 'delay-200',
  },
  {
    count: '3',
    flames: 3,
    title: '3 гордости',
    sub: 'Режим роста',
    desc: 'Осознанный фокус на ключевых направлениях. Дисциплина без надрыва.',
    extreme: false,
    delay: 'delay-300',
  },
  {
    count: '4',
    flames: 4,
    title: '4 гордости',
    sub: 'Серьёзный темп',
    desc: 'Высокая интенсивность. Спорт, карьера, проекты и личные обязательства.',
    extreme: false,
    delay: 'delay-400',
  },
  {
    count: '5',
    flames: 5,
    title: '5 гордостей',
    sub: 'Extreme',
    desc: 'Предельный уровень концентрации для несокрушимого характера.',
    extreme: true,
    delay: 'delay-500',
  },
]

/* ── Platform Showcase Tabs ───────────────────────────────────────── */
const SHOWCASE_TABS = [
  {
    id: 'profile',
    label: 'Профиль 740 дней',
    tag: 'ЛИЧНЫЙ СТРИК И ВЕХИ',
    title: '740 дней непрерывной летописи',
    desc: 'Настоящий профиль создателя системы: 740 закрытых дней, максимальный 5-й уровень дисциплины и прозрачный календарь побед без страха пропусков.',
    image: 'platform_02_profile.png',
    color: '#f56900',
    stats: [
      { label: 'Закрытых дней', val: '740+' },
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
      { label: 'Шифрование', val: 'Web Crypto' },
      { label: 'Хранение медиа', val: 'Local-first' },
      { label: 'Доступ', val: 'Пин-код / Face ID' },
    ],
  },
  {
    id: 'diary',
    label: 'Вечерний дневник',
    tag: 'РИТУАЛ 5 МИНУТ',
    title: 'Летопись дня #1: честно и без воды',
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

/* ── Quotes data ──────────────────────────────────────────────────── */
const QUOTES = [
  {
    image: 'quote-1.jpg',
    text: 'Я фиксирую гордости больше 740 дней подряд без единого пропуска. Это единственная привычка, которая вытащила меня из выгорания и дала железобетонную опору.',
    author: 'Александр Черна',
    role: 'Основатель Огонька · 740 дней стрика',
    isFounder: true,
    delay: 'delay-150',
  },
  {
    image: 'quote-2.jpg',
    text: 'Раньше казалось, что день пролетает впустую. Огонёк перевернул всё: когда вечером фиксируешь 3 главных преодоления, появляется осязаемое чувство победы и спокойствия.',
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
        aria-label="Главный экран Огонька"
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
          {/* Layered dark gradient overlay to ensure perfect contrast over video */}
          <div className="absolute inset-0 bg-black/45 z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.9)_100%)] z-10 pointer-events-none" />
        </div>

        {/* Apple Ambient Stage Glow Halo behind hero headline */}
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0" />

        {/* Hero Content positioned over the video stage */}
        <div className="relative z-20 max-w-[960px] mx-auto text-center flex flex-col items-center">
          {/* Category Eyebrow Tag (17px weight 600 Signal Orange, 16px margin to H1) */}
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="apple-eyebrow">
              Дневник силы и летопись побед
            </span>
          </div>

          {/* Epic Apple Headline (80px display, tight 20px-24px margin to subtitle) */}
          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6 drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] max-w-[840px]">
            Жизнь, которой ты гордишься.
            <br />
            <span className="apple-shimmer-text">Записанная каждый вечер.</span>
          </h1>

          {/* Subtitle (17px SF Pro Text, 32px-36px margin to buttons) */}
          <p className="apple-body fade-up delay-250 max-w-[620px] mb-8 sm:mb-9 !text-[#f5f5f7] text-[17px] sm:text-[19px] leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] font-normal">
            Огонёк хранит твои победы, серию закрытых дней и искренние благодарности. Без страха пропусков и чувства вины.
          </p>

          {/* Action CTAs (Exact Apple 36px radius, filled blue CTA & ghost text action) */}
          <div className="fade-scale delay-350 flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="apple-btn-primary !px-8 !py-3.5 !text-[15px] shadow-[0_0_24px_rgba(0,113,227,0.4)]"
            >
              Начать бесплатно
            </button>
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="apple-btn-ghost !px-6 !py-3.5 !text-[15px]"
            >
              Войти ›
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — «КАК ЭТО РАБОТАЕТ» (Ритуал · Пять минут в день)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="how"
        className="relative py-28 sm:py-36 md:py-44 bg-black border-t border-white/[0.06] overflow-hidden"
        aria-label="Как это работает"
      >
        {/* Soft Amber Ambient Glow on Left */}
        <div className="apple-ambient-orb w-[500px] h-[500px] bg-[#f56900] top-1/3 -left-32 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">Ритуал</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-16 sm:mb-20 md:mb-24">
            Пять минут в день.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Large ritual media slot frame with Scale Reveal & Hover Dynamics */}
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

            {/* Right: 3 elegant sequential steps with Staggered Slide-Left */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              {[
                {
                  step: '01',
                  title: 'Запиши гордости',
                  desc: 'Каждый вечер зафиксируй от 1 до 5 поступков, за которые тебе не стыдно. Никаких бесконечных списков — только реальные дела.',
                  delay: 'delay-200',
                },
                {
                  step: '02',
                  title: 'Запиши благодарности',
                  desc: 'Отметь людей, события или вещи, за которые искренне благодарен. Простой жест, который меняет фокус восприятия.',
                  delay: 'delay-350',
                },
                {
                  step: '03',
                  title: 'Смотри, как растёшь',
                  desc: 'Серия дней, статистика, ачивки и ИИ-разбор покажут, как далеко ты продвинулся. Данные принадлежат только тебе.',
                  delay: 'delay-500',
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
          SECTION 3 — «РЕЖИМЫ ЖИЗНИ» (Apple Interactive Modes Panel)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="modes"
        className="relative py-28 sm:py-36 md:py-44 bg-[#0c0c0e] border-t border-white/[0.06] overflow-hidden"
        aria-label="Режимы жизни"
      >
        {/* Soft Cobalt Stage Orb on Right */}
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 -right-40 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">Адаптация</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-16 sm:mb-20 md:mb-24">
            Режимы жизни.
          </h2>

          <div className="fade-up delay-150">
            <AppleModesPanel />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — «УРОВНИ ЖЁСТКОСТИ» (5 Apple Cards with Micro-Glow)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="levels"
        className="py-28 sm:py-36 md:py-44 bg-black border-t border-white/[0.06]"
        aria-label="Уровни жёсткости"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">Дисциплина</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
            Уровни жёсткости.
          </h2>
          <p className="apple-body fade-up delay-150 max-w-[680px] mb-14 sm:mb-16 md:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Выбери ритм, который подходит твоему характеру — от спокойного вечернего ритуала до бескомпромиссной дисциплины.
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
                  {/* Energy Flame Indicator with segmented rhythm */}
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
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — «ЦИФРЫ» (Метрики с титановым шиммером)
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-28 sm:py-36 md:py-44 bg-[#0c0c0e] border-t border-white/[0.06]"
        aria-label="Реальные цифры"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[760px] mx-auto mb-16 sm:mb-20 md:mb-24">
            <span className="apple-eyebrow fade-up block mb-4">Факты</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
              Реальные цифры.
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Огонёк вырос из личного опыта основателя (740+ дней непрерывной практики) в сильное сообщество людей, которые выбирают осознанность и держат слово перед собой.
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
                  человек меняют жизнь
                </p>
              </div>
              <p className="text-[14px] leading-relaxed text-[#86868b]">
                Участников уже меняют свою жизнь с нами, ежедневно фиксируют победы и поддерживают внутренний огонь.
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
                В общей сумме написали участники — без потери стрика и чувства вины за пропущенные дни.
              </p>
            </div>

            {/* Card 3: 176 455 побед */}
            <div className="apple-card apple-card-hover fade-scale delay-450 p-8 sm:p-10 text-center bg-[#161617] flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-semibold text-[#f56900] uppercase tracking-wider block mb-3">
                  Твёрдые факты
                </span>
                <span className="apple-shimmer-text block text-[42px] sm:text-[52px] font-bold tracking-tight leading-none mb-3 tabular-nums font-sans whitespace-nowrap">
                  176&nbsp;455
                </span>
                <p className="text-[18px] sm:text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  побед и благодарностей
                </p>
              </div>
              <p className="text-[14px] leading-relaxed text-[#86868b]">
                Записанных гордостей и искренних благодарностей, навсегда сохранённых на устройствах.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6 — «ЦИТАТЫ» (3 Balanced Apple Cards)
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-28 sm:py-36 md:py-44 bg-black border-t border-white/[0.06]"
        aria-label="Цитаты"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center mb-16 sm:mb-20 md:mb-24">
            <span className="apple-eyebrow fade-up block mb-4">Опыт</span>
            <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6">
              Слова, проверенные временем.
            </h2>
            <p className="apple-body fade-up delay-150 max-w-[620px] mx-auto text-[#86868b] text-[17px] leading-relaxed">
              Истории участников, превративших вечернюю фиксацию побед в&nbsp;фундамент нерушимой уверенности.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {QUOTES.map((q, i) => (
              <div
                key={i}
                className={`apple-card apple-card-hover fade-scale ${q.delay} p-7 sm:p-8 flex flex-col justify-between min-h-[310px] bg-[#161617]`}
              >
                <div>
                  <span className="text-[32px] font-serif leading-none text-white/20 select-none block mb-3">
                    “
                  </span>
                  <blockquote className="text-[15px] sm:text-[16px] leading-relaxed text-[#f5f5f7] font-normal tracking-tight mb-6">
                    «{q.text}»
                  </blockquote>
                </div>

                <div className="flex items-center gap-3.5 pt-4 border-t border-white/[0.08] mt-auto">
                  <MediaSlot
                    name={q.image}
                    width={48}
                    height={48}
                    ratio="1:1"
                    alt={q.author}
                    circle
                    className="shrink-0 w-12 h-12"
                  />
                  <div>
                    <cite className="not-italic text-[15px] font-semibold text-[#f5f5f7] block tracking-tight">
                      {q.author}
                    </cite>
                    <span className="text-[12px] text-[#86868b]">
                      {q.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Link to all 30+ reviews */}
          <div className="mt-12 text-center fade-up delay-200">
            <a
              href="/reviews"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#2997ff] hover:text-[#0071e3] transition-colors"
            >
              <span>Читать все 32 отзыва участников сообщества</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6.5 — «СИСТЕМА В ДЕЙСТВИИ» (Interactive Apple Vitrine)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="showcase"
        className="py-28 sm:py-36 md:py-44 bg-[#0a0a0c] border-t border-white/[0.06] overflow-hidden"
        aria-label="Платформа в действии"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[780px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">Интерфейс</span>
            <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6">
              Платформа в действии.
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Не просто концепт, а работающий каждый день инструмент. Загляни внутрь интерфейса, созданного для спокойствия и кристальной ясности.
            </p>
          </div>

          {/* Apple Segmented Pill Switcher */}
          <div className="flex items-center justify-center gap-2 mb-8 sm:mb-10 flex-wrap">
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
          <div className="apple-card overflow-hidden p-5 sm:p-8 bg-[#141416] border border-white/10 shadow-2xl mb-12">
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
            <div className="rounded-[20px] overflow-hidden border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-black animate-in fade-in duration-300">
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
              Подробный тур по платформе ›
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7 — «ПРИВАТНОСТЬ» (Local-First Security Stage)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="privacy"
        className="py-28 sm:py-36 md:py-44 bg-[#0c0c0e] border-t border-white/[0.06]"
        aria-label="Приватность и безопасность"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f56900" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="apple-eyebrow">Приватность</span>
          </div>

          <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6 max-w-[860px]">
            Данные и пароли остаются только на твоём устройстве.
          </h2>

          <p className="apple-body fade-up delay-150 max-w-[720px] mb-14 sm:mb-16 md:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Огонёк построен по принципу полной локальной независимости (Local-first). Личные победы, заметки и мысли не продаются рекламодателям и не анализируются без твоего ведома.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                ),
                title: 'Серии дней',
                desc: 'Стрик считается по закрытым дням летописи, а не календарным суткам. Пропуск ничего не обнуляет.',
                delay: 'delay-150',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
                title: 'Ачивки и вехи',
                desc: 'Юбилейные вехи 100, 200, 300 дней и защищённый сейф доказательств побед Evidence Vault.',
                delay: 'delay-250',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                title: 'Аналитика',
                desc: 'Шкала преодоления 1–10★ и честные графики динамики без токсичной продуктивности.',
                delay: 'delay-350',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                title: 'Мессенджер внутри',
                desc: 'Приватные чаты, голосовые заметки и зашифрованные звонки для общения с единомышленниками.',
                delay: 'delay-450',
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`apple-card apple-card-hover fade-up ${card.delay} p-6 sm:p-7 bg-[#161617] flex flex-col justify-between min-h-[220px]`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#f5f5f7] mb-5">
                    {card.icon}
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
              <span>Читать манифест приватности и безопасности Local-first</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8 — ФИНАЛЬНЫЙ БАННЕР «ВМЕСТЕ ГОРДИТЬСЯ ЛЕГЧЕ»
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-28 sm:py-36 md:py-44 bg-black border-t border-white/[0.06]"
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
            <div className="relative z-20 max-w-[680px] mx-auto flex flex-col items-center">
              <h2 className="apple-hero-title fade-blur delay-200 mb-5 !text-[36px] sm:!text-[52px] leading-[1.12] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
                Вместе гордиться легче.
              </h2>
              <p className="apple-body fade-up delay-300 !text-white max-w-[560px] mb-8 text-[17px] sm:text-[19px] leading-relaxed drop-shadow-[0_2px_14px_rgba(0,0,0,0.98)] font-normal">
                Начни свою летопись сегодня. Сохраняй каждый шаг, делись победами с&nbsp;близкими и&nbsp;создавай нерушимую уверенность в&nbsp;себе.
              </p>
              <div className="fade-scale delay-400">
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold shadow-[0_0_35px_rgba(0,113,227,0.6)] hover:shadow-[0_0_45px_rgba(0,113,227,0.85)] cursor-pointer"
                >
                  Начать бесплатно
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 9 — APPLE UNIVERSAL FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <AppleFooter />
    </div>
  )
}
