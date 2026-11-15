'use client'

import React, { useState } from 'react'
import { LandingNav } from './landing-nav'
import { MediaSlot } from './media-slot'
import { useScrollReveal } from './use-scroll-reveal'
import { AuthModal } from '../auth/auth-modal'
import type { AuthMode } from '../auth/auth-form'

type Props = {
  onNotify?: (msg: string) => void
  onAuthenticated?: (accountId: string) => void
}

/* ── Mode switcher data ───────────────────────────────────────────── */
const MODES = [
  {
    id: 'sport',
    label: 'Спорт',
    image: 'mode-sport.jpg',
    text: 'Тренировки, забеги, личные рекорды и восстановление.',
  },
  {
    id: 'work',
    label: 'Работа',
    image: 'mode-work.jpg',
    text: 'Дедлайны, переговоры, запуски и карьерные победы.',
  },
  {
    id: 'creative',
    label: 'Творчество',
    image: 'mode-creative.jpg',
    text: 'Музыка, рисование, писательство и сценические выступления.',
  },
  {
    id: 'family',
    label: 'Семья',
    image: 'mode-family.jpg',
    text: 'Время вместе, поддержка, воспитание и семейные традиции.',
  },
]

/* ── Difficulty levels data ───────────────────────────────────────── */
const LEVELS = [
  { count: '1', label: '1 гордость в день', sub: 'Мягкий старт' },
  { count: '2', label: '2 гордости в день', sub: 'Стандарт' },
  { count: '3', label: '3 гордости в день', sub: 'Режим роста' },
  { count: '4', label: '4 гордости в день', sub: 'Серьёзная дисциплина' },
  { count: '5', label: '5 гордостей в день · Extreme', sub: 'Максимальная отдача' },
]

/* ── Quotes data ──────────────────────────────────────────────────── */
const QUOTES = [
  {
    text: 'Я записываю гордости больше 740 дней. Это единственная привычка, которая ни разу меня не подвела.',
    name: '[Имя основателя]',
    image: 'quote-1.jpg',
    todo: true,
  },
  {
    text: 'Здесь будет отзыв пользователя',
    name: 'Имя',
    image: 'quote-2.jpg',
    todo: false,
  },
  {
    text: 'Здесь будет отзыв пользователя',
    name: 'Имя',
    image: 'quote-3.jpg',
    todo: false,
  },
]

export function LandingPage({ onNotify, onAuthenticated }: Props) {
  const containerRef = useScrollReveal()
  const [authModal, setAuthModal] = useState<AuthMode | null>(null)
  const [activeMode, setActiveMode] = useState('sport')
  const [expandedMode, setExpandedMode] = useState<string | null>(null)

  const currentMode = MODES.find((m) => m.id === activeMode) || MODES[0]

  const openAuth = (mode: AuthMode) => setAuthModal(mode)
  const closeAuth = () => setAuthModal(null)

  return (
    <div className="landing" ref={containerRef}>
      {/* ── Navigation ────────────────────────────────────────────── */}
      <LandingNav onOpenAuth={openAuth} />

      {/* ── Auth Modal ────────────────────────────────────────────── */}
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
          SECTION 1 — HERO
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center justify-center"
        style={{ paddingTop: 48 }}
        aria-label="Главный экран"
      >
        {/* Video/image background */}
        <div className="absolute inset-0 z-0">
          <MediaSlot
            name="hero.mp4"
            poster="hero.jpg"
            width={2560}
            height={1440}
            ratio="16:9"
            alt="Видео-фон главного экрана"
            priority
            rounded={false}
            fill
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="relative z-10 max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8 text-center py-20">
          <h1
            className="fade-up"
            style={{
              fontSize: 'clamp(36px, 6vw, var(--text-hero))',
              fontWeight: 'var(--font-weight-bold)',
              letterSpacing: 'var(--tracking-hero)',
              lineHeight: 'var(--leading-hero)',
              color: 'var(--color-frost-white)',
              maxWidth: '900px',
              margin: '0 auto',
            }}
          >
            Жизнь, которой ты гордишься.
            <br />
            Записанная.
          </h1>

          <p
            className="body-text fade-up mt-6 mx-auto"
            style={{ maxWidth: '560px' }}
          >
            Огонёк хранит твои победы, серию дней и благодарности.
            Чтобы ничего не терялось.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10 fade-up flex-wrap">
            <button
              type="button"
              className="pill-btn pill-btn--primary"
              onClick={() => openAuth('register')}
            >
              Начать
            </button>
            <button
              type="button"
              className="pill-btn pill-btn--ghost"
              onClick={() => openAuth('signin')}
            >
              Войти
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 — HOW IT WORKS
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="how"
        className="py-24 sm:py-32"
        style={{ background: 'var(--surface-pure-black)' }}
        aria-label="Как это работает"
      >
        <div className="max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="eyebrow">Ритуал</span>
          </div>
          <h2 className="section-headline fade-up mb-16">
            Пять минут в день.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left — image */}
            <div className="fade-up">
              <MediaSlot
                name="ritual.jpg"
                width={1920}
                height={1080}
                ratio="16:9"
                alt="Вечерний ритуал записи"
              />
            </div>

            {/* Right — steps */}
            <div className="flex flex-col gap-10">
              {[
                {
                  num: '01',
                  title: 'Запиши гордости',
                  desc: 'Каждый вечер зафиксируй от 1 до 5 поступков, за которые тебе не стыдно. Никаких бесконечных списков — только реальные дела.',
                },
                {
                  num: '02',
                  title: 'Запиши благодарности',
                  desc: 'Отметь людей, события или вещи, за которые искренне благодарен. Простой жест, который меняет фокус восприятия.',
                },
                {
                  num: '03',
                  title: 'Смотри, как растёшь',
                  desc: 'Серия дней, статистика, ачивки и ИИ-разбор покажут, как далеко ты продвинулся. Данные принадлежат только тебе.',
                },
              ].map((step) => (
                <div key={step.num} className="fade-up flex gap-5">
                  <span
                    className="text-[32px] font-bold leading-none shrink-0"
                    style={{
                      color: 'var(--color-signal-orange)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {step.num}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontSize: 'var(--text-heading)',
                        fontWeight: 'var(--font-weight-semibold)',
                        letterSpacing: 'var(--tracking-heading)',
                        lineHeight: 'var(--leading-heading)',
                        color: 'var(--color-frost-white)',
                        marginBottom: '8px',
                      }}
                    >
                      {step.title}
                    </h3>
                    <p className="body-text">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — MODES
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="modes"
        className="py-24 sm:py-32"
        style={{ background: 'var(--surface-carbon)' }}
        aria-label="Режимы жизни"
      >
        <div className="max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="eyebrow">Адаптация</span>
          </div>
          <h2 className="section-headline fade-up mb-16">
            Режимы жизни.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">
            {/* Left — big image card */}
            <div className="fade-up apple-card p-0 overflow-hidden">
              <MediaSlot
                name={currentMode.image}
                width={1920}
                height={1080}
                ratio="16:9"
                alt={`Режим: ${currentMode.label}`}
                rounded={false}
              />
              <div className="p-7">
                <p className="body-text">{currentMode.text}</p>
              </div>
            </div>

            {/* Right — mode pills */}
            <div className="flex flex-col gap-3 fade-up">
              {MODES.map((mode) => (
                <div key={mode.id}>
                  <button
                    type="button"
                    className={`mode-pill w-full text-left ${
                      activeMode === mode.id ? 'active' : ''
                    }`}
                    onClick={() => setActiveMode(mode.id)}
                  >
                    {mode.label}
                  </button>
                  {/* Expandable description on click of + */}
                  {activeMode === mode.id && (
                    <button
                      type="button"
                      className="mt-2 ml-2 flex items-center gap-2 text-[13px] cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-platinum)' }}
                      onClick={() =>
                        setExpandedMode(expandedMode === mode.id ? null : mode.id)
                      }
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                        style={{
                          border: '1px solid var(--color-smoke)',
                          color: 'var(--color-frost-white)',
                        }}
                      >
                        {expandedMode === mode.id ? '−' : '+'}
                      </span>
                      {expandedMode === mode.id ? mode.text : 'Подробнее'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — DIFFICULTY LEVELS
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="levels"
        className="py-24 sm:py-32"
        style={{ background: 'var(--surface-pure-black)' }}
        aria-label="Уровни жёсткости"
      >
        <div className="max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="eyebrow">Дисциплина</span>
          </div>
          <h2 className="section-headline fade-up mb-16">
            Уровни жёсткости.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {LEVELS.map((level, i) => (
              <div
                key={i}
                className="apple-card fade-up flex flex-col justify-between min-h-[180px]"
              >
                <span
                  className="text-[40px] font-bold leading-none"
                  style={{
                    color: 'var(--color-frost-white)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {level.count}
                </span>
                <div className="mt-auto pt-4">
                  <h3
                    style={{
                      fontSize: 'var(--text-heading-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      lineHeight: 'var(--leading-heading-sm)',
                      letterSpacing: 'var(--tracking-heading-sm)',
                      color: 'var(--color-frost-white)',
                      marginBottom: '4px',
                    }}
                  >
                    {level.label}
                  </h3>
                  <p className="text-[13px]" style={{ color: 'var(--color-platinum)' }}>
                    {level.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 — STATS / NUMBERS
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-24 sm:py-32"
        style={{ background: 'var(--surface-carbon)' }}
        aria-label="Цифры"
      >
        <div className="max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8">
          <h2 className="section-headline fade-up text-center mb-16">
            Реальные цифры.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="apple-card fade-up text-center py-12">
              <span
                className="block text-[56px] sm:text-[72px] font-bold leading-none"
                style={{
                  color: 'var(--color-frost-white)',
                  letterSpacing: '-1px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                740+
              </span>
              <p
                className="mt-3 text-[17px]"
                style={{ color: 'var(--color-platinum)' }}
              >
                дней подряд
              </p>
            </div>
            <div className="apple-card fade-up text-center py-12">
              <span
                className="block text-[56px] sm:text-[72px] font-bold leading-none"
                style={{
                  color: 'var(--color-frost-white)',
                  letterSpacing: '-1px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                3 700+
              </span>
              <p
                className="mt-3 text-[17px]"
                style={{ color: 'var(--color-platinum)' }}
              >
                записанных гордостей
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6 — QUOTES
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-24 sm:py-32"
        style={{ background: 'var(--surface-pure-black)' }}
        aria-label="Цитаты"
      >
        <div className="max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8">
          <h2 className="section-headline fade-up text-center mb-16">
            Говорят о нас.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {QUOTES.map((q, i) => (
              <div key={i} className="apple-card fade-up flex flex-col items-center text-center gap-5 py-10">
                <MediaSlot
                  name={q.image}
                  width={400}
                  height={400}
                  ratio="1:1"
                  alt={q.name}
                  circle
                  className="w-20 h-20"
                />
                <blockquote
                  style={{
                    fontSize: 'var(--text-body-lg)',
                    lineHeight: 'var(--leading-body-lg)',
                    color: 'var(--color-frost-white)',
                    fontStyle: 'normal',
                    maxWidth: '320px',
                  }}
                >
                  «{q.text}»
                </blockquote>
                <cite
                  className="not-italic text-[14px]"
                  style={{ color: 'var(--color-platinum)' }}
                >
                  {q.name}
                  {q.todo && (
                    <span className="block text-[11px] mt-1 opacity-50">
                      {/* TODO: заменить на реальное имя */}
                    </span>
                  )}
                </cite>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7 — PRIVACY
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="privacy"
        className="py-24 sm:py-32"
        style={{ background: 'var(--surface-carbon)' }}
        aria-label="Приватность"
      >
        <div className="max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="eyebrow">Приватность</span>
          </div>
          <h2 className="section-headline fade-up mb-10" style={{ maxWidth: '700px' }}>
            Данные и пароли остаются только на твоём устройстве.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-up">
            {[
              { icon: '🔥', label: 'Серии дней', desc: 'Стрик никогда не сгорает от пропуска. Считает закрытые дни.' },
              { icon: '🏆', label: 'Ачивки', desc: 'Юбилейные вехи, значки и отчёты каждые 100 дней.' },
              { icon: '📊', label: 'Аналитика', desc: 'Графики, динамика, баланс гордостей и благодарностей.' },
              { icon: '💬', label: 'Мессенджер', desc: 'Приватные чаты, голосовые, звонки и пруфы побед.' },
            ].map((feat) => (
              <div key={feat.label} className="apple-card">
                <span className="text-2xl block mb-3" aria-hidden="true">{feat.icon}</span>
                <h3
                  style={{
                    fontSize: 'var(--text-heading-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-frost-white)',
                    marginBottom: '6px',
                  }}
                >
                  {feat.label}
                </h3>
                <p className="text-[14px]" style={{ color: 'var(--color-platinum)' }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8 — FINAL CTA BANNER
          ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-24 sm:py-32"
        style={{ background: 'var(--surface-pure-black)' }}
        aria-label="Финальный призыв"
      >
        <div className="max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8">
          <div className="fade-up">
            <MediaSlot
              name="together.jpg"
              width={2560}
              height={1100}
              ratio="21:9"
              alt="Вместе гордиться легче"
              className="mb-12"
            />
          </div>

          <div className="text-center fade-up">
            <h2 className="section-headline mb-6">
              Вместе гордиться легче.
            </h2>
            <button
              type="button"
              className="pill-btn pill-btn--primary text-[17px] !py-3.5 !px-10"
              onClick={() => openAuth('register')}
            >
              Начать
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 9 — FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <footer
        className="py-10"
        style={{
          background: 'var(--surface-obsidian)',
          borderTop: '1px solid var(--color-graphite)',
        }}
        aria-label="Подвал сайта"
      >
        <div className="max-w-[var(--page-max-width)] mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🔥</span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: 'var(--color-frost-white)' }}
            >
              Огонёк
            </span>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              className="text-[12px] cursor-pointer border-none bg-transparent"
              style={{ color: 'var(--color-halo-blue)' }}
              onClick={() => openAuth('signin')}
            >
              Войти
            </button>
            <button
              type="button"
              className="text-[12px] cursor-pointer border-none bg-transparent"
              style={{ color: 'var(--color-halo-blue)' }}
              onClick={() => openAuth('register')}
            >
              Регистрация
            </button>
          </div>

          <span className="text-[11px]" style={{ color: 'var(--color-smoke)' }}>
            © {new Date().getFullYear()} Огонёк
          </span>
        </div>
      </footer>
    </div>
  )
}
