'use client'

import React, { useState } from 'react'
import { LandingNav } from './landing-nav'
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
    title: '1 гордость в день',
    sub: 'Мягкий старт',
    desc: 'Одна главная победа за вечер. Идеально для формирования нерушимой привычки.',
    extreme: false,
  },
  {
    count: '2',
    flames: 2,
    title: '2 гордости в день',
    sub: 'Стандарт',
    desc: 'Баланс между работой и личной жизнью. Твёрдый шаг вперёд каждый день.',
    extreme: false,
  },
  {
    count: '3',
    flames: 3,
    title: '3 гордости в день',
    sub: 'Режим роста',
    desc: 'Осознанный фокус на ключевых направлениях. Дисциплина без компромиссов.',
    extreme: false,
  },
  {
    count: '4',
    flames: 4,
    title: '4 гордости в день',
    sub: 'Серьёзная дисциплина',
    desc: 'Высокая интенсивность. Фиксация побед в спорте, проектах и отношениях.',
    extreme: false,
  },
  {
    count: '5',
    flames: 5,
    title: '5 гордостей в день · Extreme',
    sub: 'Максимальная отдача',
    desc: 'Предельный уровень концентрации. Только для тех, кто строит несокрушимый характер.',
    extreme: true,
  },
]

/* ── Quotes data ──────────────────────────────────────────────────── */
const QUOTES = [
  {
    image: 'quote-1.jpg',
    text: 'Я записываю гордости больше 740 дней. Это единственная привычка, которая ни разу меня не подвела.',
    // TODO: Заменить на реальное имя основателя проекта
    author: '[Имя основателя]',
    role: 'Основатель проекта «Огонёк»',
    isFounder: true,
  },
  {
    image: 'quote-2.jpg',
    text: 'Здесь будет отзыв пользователя',
    author: 'Имя',
    role: 'Пользователь Огонька',
    isFounder: false,
  },
  {
    image: 'quote-3.jpg',
    text: 'Здесь будет отзыв пользователя',
    author: 'Имя',
    role: 'Пользователь Огонька',
    isFounder: false,
  },
]

export function LandingPage({ onNotify, onAuthenticated }: Props) {
  const containerRef = useScrollReveal()
  const [authModal, setAuthModal] = useState<AuthMode | null>(null)

  const openAuth = (mode: AuthMode) => setAuthModal(mode)
  const closeAuth = () => setAuthModal(null)

  return (
    <div className="landing" ref={containerRef}>
      {/* ── Fixed Apple Header ──────────────────────────────────────── */}
      <LandingNav onOpenAuth={openAuth} />

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
            name="hero.mp4"
            poster="hero.jpg"
            width={2560}
            height={1440}
            ratio="16:9"
            alt="Видео-витрина главного экрана"
            priority
            rounded={false}
            fill
            isHero
          />
          {/* Subtle dark gradient overlay to ensure perfect contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/75 z-10 pointer-events-none" />
        </div>

        {/* Hero Content positioned over the video stage */}
        <div className="relative z-20 max-w-[960px] mx-auto text-center flex flex-col items-center">
          {/* Subtle Apple Eyebrow Tag */}
          <div className="fade-up mb-6 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="text-[12px] font-medium tracking-wider text-[#d2d2d7] uppercase">
              Дневник силы и летопись побед
            </span>
          </div>

          {/* Epic Apple Headline */}
          <h1 className="apple-hero-title fade-up mb-6">
            Жизнь, которой ты гордишься.
            <br />
            <span className="text-[#f5f5f7]">Записанная.</span>
          </h1>

          {/* Subtitle */}
          <p className="apple-body fade-up max-w-[620px] mb-10 text-[#a1a1a6] text-base sm:text-xl">
            Огонёк хранит твои победы, серию дней и благодарности.
            Чтобы ничего не терялось.
          </p>

          {/* Action CTAs */}
          <div className="fade-up flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="apple-btn-primary !px-9 !py-3.5 !text-[16px] shadow-[0_0_30px_rgba(0,113,227,0.35)]"
            >
              Начать
            </button>
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="apple-btn-ghost !px-7 !py-3.5 !text-[16px]"
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
        className="py-28 sm:py-36 bg-black border-t border-white/[0.06]"
        aria-label="Как это работает"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-3">
            <span className="apple-eyebrow">Ритуал</span>
          </div>
          <h2 className="apple-section-title fade-up mb-16 sm:mb-20">
            Пять минут в день.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Large ritual media slot frame in an Obsidian card */}
            <div className="lg:col-span-7 fade-up">
              <div className="apple-card overflow-hidden p-2 bg-[#121214]">
                <MediaSlot
                  name="ritual.jpg"
                  width={1920}
                  height={1080}
                  ratio="16:9"
                  alt="Вечерний ритуал фиксации побед"
                />
              </div>
            </div>

            {/* Right: 3 elegant sequential steps */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              {[
                {
                  step: '01',
                  title: 'Запиши гордости',
                  desc: 'Каждый вечер зафиксируй от 1 до 5 поступков, за которые тебе не стыдно. Никаких бесконечных списков — только реальные дела.',
                },
                {
                  step: '02',
                  title: 'Запиши благодарности',
                  desc: 'Отметь людей, события или вещи, за которые искренне благодарен. Простой жест, который меняет фокус восприятия.',
                },
                {
                  step: '03',
                  title: 'Смотри, как растёшь',
                  desc: 'Серия дней, статистика, ачивки и ИИ-разбор покажут, как далеко ты продвинулся. Данные принадлежат только тебе.',
                },
              ].map((item, idx) => (
                <div
                  key={item.step}
                  className={`fade-up ${idx !== 2 ? 'border-b border-white/[0.08] pb-10' : ''}`}
                >
                  <div className="flex items-baseline gap-3 mb-2">
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
        className="py-28 sm:py-36 bg-[#0c0c0e] border-t border-white/[0.06]"
        aria-label="Режимы жизни"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-3">
            <span className="apple-eyebrow">Адаптация</span>
          </div>
          <h2 className="apple-section-title fade-up mb-12 sm:mb-16">
            Режимы жизни.
          </h2>

          <AppleModesPanel />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — «УРОВНИ ЖЁСТКОСТИ» (5 Apple Cards)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="levels"
        className="py-28 sm:py-36 bg-black border-t border-white/[0.06]"
        aria-label="Уровни жёсткости"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-3">
            <span className="apple-eyebrow">Дисциплина</span>
          </div>
          <h2 className="apple-section-title fade-up mb-4">
            Уровни жёсткости.
          </h2>
          <p className="apple-body fade-up max-w-[600px] mb-14 text-[#86868b]">
            Выбери ритм, который подходит твоему характеру — от спокойного вечернего ритуала до бескомпромиссной дисциплины.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {LEVELS.map((lvl) => (
              <div
                key={lvl.count}
                className={`apple-card fade-up p-6 flex flex-col justify-between min-h-[260px] relative transition-transform hover:-translate-y-1 duration-300 ${
                  lvl.extreme
                    ? 'border-orange-500/30 bg-gradient-to-b from-[#1c1815] to-[#141210]'
                    : 'bg-[#161617]'
                }`}
              >
                <div>
                  {/* Energy Flame Indicator */}
                  <div className="flex items-center gap-1 mb-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-4 rounded-full ${
                          i < lvl.flames
                            ? lvl.extreme
                              ? 'bg-[#f56900]'
                              : 'bg-white'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>

                  <span className="block text-[48px] font-bold tracking-tight text-[#f5f5f7] leading-none mb-3 font-mono">
                    {lvl.count}
                  </span>
                  <h3 className="text-[17px] font-semibold text-[#f5f5f7] mb-1 tracking-tight leading-snug">
                    {lvl.title}
                  </h3>
                  <div className="text-[13px] font-medium text-[#f56900] mb-3">
                    {lvl.sub}
                  </div>
                </div>

                <p className="text-[13px] leading-relaxed text-[#a1a1a6] border-t border-white/[0.08] pt-3">
                  {lvl.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — «ЦИФРЫ» (Только реальные метрики)
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-28 sm:py-36 bg-[#0c0c0e] border-t border-white/[0.06]"
        aria-label="Реальные цифры"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center fade-up max-w-[640px] mx-auto mb-16">
            <span className="apple-eyebrow block mb-3">Факты</span>
            <h2 className="apple-section-title mb-4">
              Реальные цифры.
            </h2>
            <p className="apple-body text-[#86868b]">
              Только проверенный личный опыт создателя Огонька. Никакой выдуманной статистики и заказных исследований.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="apple-card fade-up p-12 text-center bg-[#161617]">
              <span className="block text-[72px] sm:text-[96px] font-bold tracking-tight leading-none text-[#f5f5f7] mb-4 font-mono">
                740+
              </span>
              <p className="text-[20px] font-semibold text-[#f5f5f7] mb-2 tracking-tight">
                дней подряд
              </p>
              <p className="text-[14px] text-[#86868b]">
                Непрерывная летопись гордости и благодарности без единого пропуска.
              </p>
            </div>

            <div className="apple-card fade-up p-12 text-center bg-[#161617]">
              <span className="block text-[72px] sm:text-[96px] font-bold tracking-tight leading-none text-[#f5f5f7] mb-4 font-mono">
                3 700+
              </span>
              <p className="text-[20px] font-semibold text-[#f5f5f7] mb-2 tracking-tight">
                записанных гордостей
              </p>
              <p className="text-[14px] text-[#86868b]">
                Реальных завершённых поступков, зафиксированных и сохранённых навсегда.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6 — «ЦИТАТЫ» (3 Apple Cards)
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-28 sm:py-36 bg-black border-t border-white/[0.06]"
        aria-label="Цитаты"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center fade-up mb-16">
            <span className="apple-eyebrow block mb-3">Опыт</span>
            <h2 className="apple-section-title">
              Слова, проверенные временем.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {QUOTES.map((q, i) => (
              <div
                key={i}
                className="apple-card fade-up p-8 flex flex-col justify-between min-h-[300px] bg-[#161617]"
              >
                <div>
                  {/* Subtle typographic quote glyph */}
                  <span className="text-[36px] font-serif leading-none text-white/20 select-none block mb-4">
                    “
                  </span>
                  <blockquote className="text-[17px] leading-relaxed text-[#f5f5f7] font-normal tracking-tight mb-8">
                    «{q.text}»
                  </blockquote>
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-white/[0.06]">
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
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7 — «ПРИВАТНОСТЬ» (Local-First Security Stage)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="privacy"
        className="py-28 sm:py-36 bg-[#0c0c0e] border-t border-white/[0.06]"
        aria-label="Приватность и безопасность"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f56900" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="apple-eyebrow">Приватность</span>
          </div>

          <h2 className="apple-section-title fade-up mb-6 max-w-[800px]">
            Данные и пароли остаются только на твоём устройстве.
          </h2>

          <p className="apple-body fade-up max-w-[700px] mb-14 text-[#86868b]">
            Огонёк построен по принципу полной локальной независимости (Local-first). Личные победы, заметки и мысли не продаются рекламодателям и не анализируются без твоего ведома.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-up">
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                ),
                title: 'Серии дней',
                desc: 'Стрик считается по закрытым дням летописи, а не дням подряд. Пропуск ничего не обнуляет.',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
                title: 'Ачивки и вехи',
                desc: 'Юбилейные вехи 100/200/300 дней и защищённый сейф доказательств побед Evidence Vault.',
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
                desc: 'Шкала преодоления 1–10★ и трезвые графики динамики без токсичной продуктивности.',
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                title: 'Мессенджер внутри',
                desc: 'Приватные чаты, голосовые заметки, аудио и видеозвонки P2P для общения с единомышленниками.',
              },
            ].map((card) => (
              <div key={card.title} className="apple-card p-6 bg-[#161617]">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f5f5f7] mb-5">
                  {card.icon}
                </div>
                <h3 className="text-[17px] font-semibold text-[#f5f5f7] mb-2 tracking-tight">
                  {card.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[#a1a1a6]">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8 — ФИНАЛЬНЫЙ БАННЕР «ВМЕСТЕ ГОРДИТЬСЯ ЛЕГЧЕ»
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-28 sm:py-36 bg-black border-t border-white/[0.06]"
        aria-label="Финальный призыв к действию"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="apple-card overflow-hidden relative min-h-[460px] sm:min-h-[540px] flex items-center justify-center text-center p-8 sm:p-14 bg-[#121214]">
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
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/80 z-10" />
            </div>

            {/* Overlaid Banner Content */}
            <div className="relative z-20 max-w-[680px] mx-auto flex flex-col items-center">
              <h2 className="apple-hero-title mb-6 !text-[36px] sm:!text-[56px]">
                Вместе гордиться легче.
              </h2>
              <p className="apple-body text-white/80 max-w-[500px] mb-10 text-base sm:text-lg">
                Начни свою летопись сегодня. Сохраняй каждый шаг, делись победами с близкими и создавай нерушимую уверенность в себе.
              </p>
              <button
                type="button"
                onClick={() => openAuth('register')}
                className="apple-btn-primary !px-10 !py-4 !text-[17px] shadow-[0_0_40px_rgba(0,113,227,0.4)]"
              >
                Начать
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 9 — APPLE-STYLE FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <footer
        className="py-8 bg-[#111111] border-t border-white/[0.08]"
        aria-label="Подвал сайта"
      >
        <div className="max-w-[1024px] mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#86868b]">
          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#86868b"
              />
            </svg>
            <span className="font-medium text-[#d2d2d7]">Огонёк</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="text-[#86868b] hover:text-[#f5f5f7] transition-colors cursor-pointer border-none bg-transparent"
            >
              Войти
            </button>
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="text-[#86868b] hover:text-[#f5f5f7] transition-colors cursor-pointer border-none bg-transparent"
            >
              Регистрация
            </button>
          </div>

          {/* Copyright */}
          <div>
            © {new Date().getFullYear()} Огонёк. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  )
}
