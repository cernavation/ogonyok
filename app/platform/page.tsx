'use client'

import React from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { MediaSlot } from '@/components/ogonek/landing/media-slot'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

export default function PlatformPage() {
  const containerRef = useScrollReveal()

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative min-h-[75vh] flex flex-col justify-center items-center text-center pt-32 pb-20 px-5 sm:px-8 overflow-hidden bg-black">
        {/* Soft Ambient Glow */}
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-20" />

        <div className="relative z-10 max-w-[960px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="apple-eyebrow">Архитектура и возможности</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-6 sm:mb-7">
            Инструмент силы,
            <br />
            <span className="apple-shimmer-text">созданный без компромиссов.</span>
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[680px] mb-9 sm:mb-10 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Каждая функция «Огонька» подчинена одной задаче: убрать тревожность, защитить твои сокровенные мысли и дать твёрдые доказательства твоего ежедневного роста.
          </p>

          <div className="fade-scale delay-350 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[14px]">
              Начать бесплатно
            </Link>
            <Link href="/reviews" className="apple-btn-ghost !px-6 !py-3.5 !text-[14px]">
              Истории участников ›
            </Link>
          </div>
        </div>
      </section>

      {/* ── PILLAR 1: ДНЕВНИК СИЛЫ (Daily Diary) ────────────────────── */}
      <section className="py-24 sm:py-32 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="max-w-[760px] mb-14 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">Ядро платформы</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
              Вечерний ритуал пяти минут.
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              В конце дня внимание истощено. «Огонёк» не требует писать длинные эссе или заполнять сложные таблицы. Ты отвечаешь всего на два вопроса: чем ты гордишься и за что благодарен.
            </p>
          </div>

          {/* Real UI Showcase Frame */}
          <div className="apple-card overflow-hidden bg-[#161617] border border-white/10 p-4 sm:p-6 mb-12 shadow-2xl">
            <div className="rounded-[20px] overflow-hidden border border-white/10 bg-black">
              <MediaSlot
                name="platform_01_diary.png"
                width={1440}
                height={900}
                ratio="16:10"
                alt="Интерфейс ежедневного дневника Огонька"
                rounded={false}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card A */}
            <div className="apple-card apple-card-hover fade-up delay-150 p-8 sm:p-10 bg-[#161617] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#f56900]/10 border border-[#f56900]/20 flex items-center justify-center text-[#f56900] mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  1–5 реальных поступков
                </h3>
                <p className="text-[14px] leading-relaxed text-[#86868b]">
                  Никаких списков желаний и абстрактных целей. Только завершённые дела: тренировка в дождь, сложный разговор с клиентом, терпение с ребёнком.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] font-mono text-[#f56900]">
                ФАКТЫ ВЫШЕ НАСТРОЕНИЯ
              </div>
            </div>

            {/* Card B */}
            <div className="apple-card apple-card-hover fade-up delay-250 p-8 sm:p-10 bg-[#161617] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#2997ff] mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  Благодарности дня
                </h3>
                <p className="text-[14px] leading-relaxed text-[#86868b]">
                  Простой жест фиксации признательности близким, коллегам или собственному телу меняет биохимию мозга и снимает стресс рабочего дня.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] font-mono text-[#2997ff]">
                ЭМОЦИОНАЛЬНЫЙ ФУНДАМЕНТ
              </div>
            </div>

            {/* Card C */}
            <div className="apple-card apple-card-hover fade-up delay-350 p-8 sm:p-10 bg-[#161617] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                  Шкала преодоления 1–10★
                </h3>
                <p className="text-[14px] leading-relaxed text-[#86868b]">
                  Оценка того, насколько тяжело далась победа. День на 9★ требует отдыха, а не самобичевания. Это экологичный компас твоих сил.
                </p>
              </div>
              <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] font-mono text-[#86868b]">
                ТРЕЗВЫЙ АНАЛИЗ ЭНЕРГИИ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PILLAR 2: СЕЙФ ДОКАЗАТЕЛЬСТВ (Evidence Vault) ───────────── */}
      <section id="vault" className="py-24 sm:py-32 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 fade-up">
              <span className="apple-eyebrow block mb-4">Безопасность фактов</span>
              <h2 className="apple-section-title mb-6 sm:mb-7">
                Сейф доказательств.
                <br />
                Evidence Vault.
              </h2>
              <p className="apple-body mb-6 text-[#86868b] text-[17px] sm:text-[18px] leading-relaxed">
                Слова забываются, а факты остаются навсегда. Прикрепляй к записям фотографии финишных протоколов, подписанных контрактов, черновиков или моментов преодоления.
              </p>
              <ul className="space-y-4 text-[15px] text-[#f5f5f7]/90 mb-8">
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f56900]" />
                  <span>Привязка медиа к конкретному дню и номеру победы</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f56900]" />
                  <span>Локальное хранение оригиналов на устройстве</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f56900]" />
                  <span>Защита пин-кодом и биометрией девайса</span>
                </li>
              </ul>
              <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[14px]">
                Создать свой сейф ›
              </Link>
            </div>

            <div className="lg:col-span-7 fade-scale delay-200">
              <div className="apple-card overflow-hidden bg-[#161617] border border-white/10 p-3 sm:p-5 shadow-2xl">
                <div className="rounded-[20px] overflow-hidden border border-white/10 bg-black">
                  <MediaSlot
                    name="platform_04_vault.png"
                    width={1440}
                    height={900}
                    ratio="16:10"
                    alt="Интерфейс Evidence Vault"
                    rounded={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PILLAR 3: СТРИК И ПРОФИЛЬ 740 ДНЕЙ ──────────────────────── */}
      <section className="py-24 sm:py-32 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1 fade-scale delay-150">
              <div className="apple-card overflow-hidden bg-[#161617] border border-white/10 p-3 sm:p-5 shadow-2xl">
                <div className="rounded-[20px] overflow-hidden border border-white/10 bg-black">
                  <MediaSlot
                    name="platform_02_profile.png"
                    width={1440}
                    height={900}
                    ratio="16:10"
                    alt="Профиль 740 дней стрика Алексея Черны"
                    rounded={false}
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 fade-up">
              <span className="apple-eyebrow block mb-4">Гуманная математика</span>
              <h2 className="apple-section-title mb-6 sm:mb-7">
                Стрик, который не сгорает.
              </h2>
              <p className="apple-body mb-6 text-[#86868b] text-[17px] sm:text-[18px] leading-relaxed">
                Мы ненавидим приложения, которые наказывают человека за болезнь, форс-мажор или усталость. В «Огоньке» действует правило истинной летописи.
              </p>
              <div className="p-5 rounded-2xl bg-[#161617] border border-white/[0.08] mb-6">
                <div className="text-[15px] font-semibold text-[#f5f5f7] mb-2">
                  Счёт по закрытым дням летописи
                </div>
                <p className="text-[14px] leading-relaxed text-[#86868b]">
                  Пропуск — это просто пауза, а не поражение. 100 дней летописи остаются 100 днями силы, даже если между ними были перерывы на восстановление.
                </p>
              </div>
              <Link href="/how-it-works" className="apple-btn-ghost !px-6 !py-3 !text-[14px]">
                Подробнее о философии стрика ›
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── PILLAR 4: АНАЛИТИКА ПРЕОДОЛЕНИЯ ─────────────────────────── */}
      <section id="analytics" className="py-24 sm:py-32 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-5 fade-up">
              <span className="apple-eyebrow block mb-4">Трезвый аудит</span>
              <h2 className="apple-section-title mb-6 sm:mb-7">
                Аналитика & Выводы ИИ.
              </h2>
              <p className="apple-body mb-6 text-[#86868b] text-[17px] sm:text-[18px] leading-relaxed">
                Наглядные графики динамики за неделю, месяц и год. Система показывает средний балл преодоления и подсказывает, какие сферы жизни дают максимальный эмоциональный подъём.
              </p>
              <div className="p-5 rounded-2xl bg-[#161617] border border-white/[0.08] mb-6">
                <div className="text-[13px] font-mono text-[#2997ff] mb-2 uppercase tracking-wider">
                  Инсайт из реального профиля:
                </div>
                <p className="text-[14px] italic leading-relaxed text-[#f5f5f7]">
                  «Записи, сделанные в первой половине дня, поднимают результативность в сфере Бизнес и работа на 35%.»
                </p>
              </div>
              <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[14px]">
                Попробовать аналитику ›
              </Link>
            </div>

            <div className="lg:col-span-7 fade-scale delay-200">
              <div className="apple-card overflow-hidden bg-[#161617] border border-white/10 p-3 sm:p-5 shadow-2xl">
                <div className="rounded-[20px] overflow-hidden border border-white/10 bg-black">
                  <MediaSlot
                    name="platform_03_analytics.png"
                    width={1440}
                    height={900}
                    ratio="16:10"
                    alt="Графики аналитики и выводы ИИ"
                    rounded={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL BANNER CTA ───────────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1024px] mx-auto px-5 sm:px-8 text-center">
          <h2 className="apple-hero-title mb-6 !text-[36px] sm:!text-[48px]">
            Начни свой первый вечер.
          </h2>
          <p className="apple-body max-w-[580px] mx-auto mb-9 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Создай профиль за 30 секунд. Никаких банковских карт, никакой рекламы. Твои победы принадлежат только тебе.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[15px]">
              Создать летопись бесплатно
            </Link>
            <Link href="/support" className="apple-btn-ghost !px-6 !py-3.5 !text-[14px]">
              Задать вопрос поддержке ›
            </Link>
          </div>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
