'use client'

import React from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'
import { GlowCard } from '@/components/ui/spotlight-card'
import { GlyphBackground } from '@/components/ui/backgrounds-glyph'

export default function AiPage() {
  const containerRef = useScrollReveal()

  return (
    <div
      className="landing relative min-h-screen bg-[#050505] text-white selection:bg-[#FF4D00]/30 selection:text-white overflow-x-hidden"
      ref={containerRef}
    >
      {/* ── FIXED GLYPH CANVAS BACKGROUND (Темный фон с кодом и серыми волнами) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <GlyphBackground
          className="size-full opacity-65"
          glowColor="#333338"
          shapeColor="#d1d1d6"
          fontSize={10}
          rest={0.10}
          haze={0.22}
          hoverInk={0.40}
          interactive={true}
        />
        {/* Мягкая виньетка по краям к #050505 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_40%,#050505_95%)] pointer-events-none" />
      </div>

      {/* ── SCROLLING FOREGROUND STAGE ─────────────────────────────── */}
      <div className="relative z-10">
        <AppleNavbar />

        {/* ── 1. HERO ──────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center text-center pt-28 sm:pt-36 pb-16 sm:pb-24 px-5 sm:px-8 bg-transparent">
          <div className="relative z-10 max-w-[1040px] mx-auto flex flex-col items-center">
            <div className="fade-blur mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#FF4D00]" />
              <span className="text-[12px] font-medium tracking-wide uppercase text-[#a1a1a6]">
                Нейросетевой наставник
              </span>
            </div>

            <h1 className="apple-hero-title fade-blur delay-75 mb-6 max-w-[920px] text-[34px] sm:text-[52px] md:text-[64px] font-bold tracking-tight text-white leading-[1.08]">
              ИИ, который не льстит.
              <br />
              <span className="text-[#FF4D00]">Трезвый разбор твоих побед.</span>
            </h1>

            <p className="apple-body fade-up delay-150 max-w-[680px] mb-10 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Никакой лести и шаблонных комплиментов. Огонёк видит скрытый темп и силу твоих решений.
            </p>

            <div className="fade-scale delay-200 flex items-center justify-center gap-4 flex-wrap mb-14">
              <Link
                href="/register"
                className="apple-btn-primary !px-8 !py-3.5 !text-[15px] !bg-[#FF4D00] hover:!bg-[#ff621f] shadow-[0_0_30px_rgba(255,77,0,0.35)] cursor-pointer"
              >
                Начать бесплатно
              </Link>
              <Link
                href="#pricing-ai"
                className="apple-btn-ghost !px-6 !py-3.5 !text-[15px] backdrop-blur-md bg-white/[0.04] border border-white/10 hover:border-white/20 text-white cursor-pointer"
              >
                Тарифы с ИИ ›
              </Link>
            </div>

            {/* Showcase Visual: Реальный скриншот аналитики в окне macOS */}
            <div className="fade-scale delay-250 w-full max-w-[980px]">
              <div className="p-2 sm:p-3 rounded-[24px] sm:rounded-[28px] bg-[#121215]/90 border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/[0.06] mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-mono text-[#86868b]">
                    Огонёк — AI Mentor & Analytics
                  </span>
                  <span className="text-[11px] font-mono text-[#FF4D00]">
                    Zero Data Training
                  </span>
                </div>

                <div className="relative rounded-[16px] sm:rounded-[20px] overflow-hidden bg-[#0a0a0c]">
                  <picture>
                    <source media="(max-width: 640px)" srcSet="/landing/screens/mobile-analytics.png" />
                    <img
                      src="/landing/screens/analytics.png"
                      alt="Интерфейс ИИ-аналитики и отчётов Огонёк"
                      className="w-full h-auto object-cover block"
                      loading="lazy"
                    />
                  </picture>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. ЧЕТЫРЕ ЗАДАЧИ НАШЕГО ИИ ────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-[#0a0a0c]/60 backdrop-blur-xl border-t border-white/[0.08]">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
            <div className="text-center max-w-[760px] mx-auto mb-14 sm:mb-18">
              <span className="apple-eyebrow fade-up block mb-4">Возможности</span>
              <h2 className="apple-section-title fade-up delay-75 mb-5 text-[28px] sm:text-[40px] font-bold text-white tracking-tight">
                Четыре задачи нашего ИИ
              </h2>
              <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
                Строгий и честный взгляд на твои ежедневные достижения.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Card 1 */}
              <div className="p-7 sm:p-9 rounded-[24px] bg-[#121215]/80 backdrop-blur-2xl border border-white/10 hover:border-[#FF4D00]/40 transition-all flex flex-col justify-between group shadow-xl">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#FF4D00]/10 border border-[#FF4D00]/25 flex items-center justify-center text-[#FF4D00] mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <h3 className="text-[20px] sm:text-[22px] font-semibold text-white mb-2.5 tracking-tight">
                    1. Сила преодоления
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#86868b]">
                    Оценка трудности поступка, а не красоты слога.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/[0.06] mt-6 text-[12px] font-mono text-[#FF4D00]">
                  ФАКТЫ ВЫШЕ ЭМОЦИЙ
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-7 sm:p-9 rounded-[24px] bg-[#121215]/80 backdrop-blur-2xl border border-white/10 hover:border-[#2997ff]/40 transition-all flex flex-col justify-between group shadow-xl">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#2997ff]/10 border border-[#2997ff]/25 flex items-center justify-center text-[#2997ff] mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                      <polyline points="16 7 22 7 22 13" />
                    </svg>
                  </div>
                  <h3 className="text-[20px] sm:text-[22px] font-semibold text-white mb-2.5 tracking-tight">
                    2. Твой реальный темп
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#86868b]">
                    Сравнение динамики текущего месяца с предыдущим без иллюзий.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/[0.06] mt-6 text-[12px] font-mono text-[#2997ff]">
                  ЧЕСТНАЯ ДИНАМИКА
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-7 sm:p-9 rounded-[24px] bg-[#121215]/80 backdrop-blur-2xl border border-white/10 hover:border-emerald-400/40 transition-all flex flex-col justify-between group shadow-xl">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>
                  <h3 className="text-[20px] sm:text-[22px] font-semibold text-white mb-2.5 tracking-tight">
                    3. Баланс сфер жизни
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#86868b]">
                    Умное тегирование: спорт, семья, работа и отдых.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/[0.06] mt-6 text-[12px] font-mono text-emerald-400">
                  ЗАЩИТА БАЛАНСА
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-7 sm:p-9 rounded-[24px] bg-[#121215]/80 backdrop-blur-2xl border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between group shadow-xl">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </div>
                  <h3 className="text-[20px] sm:text-[22px] font-semibold text-white mb-2.5 tracking-tight">
                    4. Вектор на завтра
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#86868b]">
                    Точный совет на утро, основанный на вечерних записях.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/[0.06] mt-6 text-[12px] font-mono text-amber-400">
                  ТОЧНЫЙ ФОКУС
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. ТАРИФЫ С ИИ ────────────────────────────────────────── */}
        <section id="pricing-ai" className="py-16 sm:py-20 md:py-28 bg-transparent border-t border-white/[0.08] scroll-mt-24 sm:scroll-mt-32">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
            <div className="text-center max-w-[760px] mx-auto mb-14 sm:mb-18">
              <span className="apple-eyebrow fade-up block mb-4">Тарифы</span>
              <h2 className="apple-section-title fade-up delay-75 mb-5 text-[28px] sm:text-[40px] font-bold text-white tracking-tight">
                Прозрачные условия навсегда
              </h2>
              <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
                Выбирай уровень: от тихого дневника до глубокого анализа.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Free Tier */}
              <GlowCard glowColor="green" customSize className="p-7 sm:p-8 flex flex-col justify-between bg-[#121215]/85">
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs font-mono text-[#00c7be] uppercase tracking-wider block mb-2 font-semibold">
                      БАЗОВЫЙ
                    </span>
                    <h3 className="text-[22px] sm:text-[24px] font-bold text-white mb-1">Свободный</h3>
                    <div className="text-[32px] font-bold text-white font-sans mb-3">0 MDL</div>
                    <p className="text-[14px] text-[#86868b] mb-6 leading-relaxed">
                      Чистая летопись без нейросетей для спокойного вечера.
                    </p>

                    <div className="space-y-3 text-[14px] text-[#86868b]">
                      <div className="flex items-center gap-2.5 text-white/90">
                        <span className="text-[#00c7be]">✓</span>
                        <span>100% бесплатный дневник побед</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white/90">
                        <span className="text-[#00c7be]">✓</span>
                        <span>Календарь непрерывного стрика</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white/90">
                        <span className="text-[#00c7be]">✓</span>
                        <span>Личный архив без ограничений</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white/40 pt-2 border-t border-white/[0.06]">
                        <span>—</span>
                        <span>Без автоматического ИИ-анализа</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="mt-8 w-full py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-[14px] text-center font-medium block transition-all border border-white/10"
                  >
                    Начать бесплатно
                  </Link>
                </div>
              </GlowCard>

              {/* Pro Tier */}
              <GlowCard glowColor="blue" customSize className="p-7 sm:p-8 flex flex-col justify-between bg-[#121215]/85 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#FF4D00] text-white text-[10px] font-bold uppercase tracking-wider z-20">
                  ★ Выбор практиков
                </div>

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs font-mono text-[#2997ff] uppercase tracking-wider block mb-2 font-semibold">
                      ПРЕМИУМ
                    </span>
                    <h3 className="text-[22px] sm:text-[24px] font-bold text-white mb-1">Поддержка Pro</h3>
                    <div className="text-[32px] font-bold text-white font-sans mb-3">
                      25 MDL <span className="text-xs text-[#86868b] font-normal">/ мес</span>
                    </div>
                    <p className="text-[14px] text-[#86868b] mb-6 leading-relaxed">
                      Ежедневный персональный разбор дня нейросетью.
                    </p>

                    <div className="space-y-3 text-[14px] text-white/90">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[#2997ff]">✓</span>
                        <span>1 ИИ-оценка летописи в день</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[#2997ff]">✓</span>
                        <span>Шкала преодоления 1–10★ и баллы</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[#2997ff]">✓</span>
                        <span>Автоматические теги сфер жизни</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[#2997ff]">✓</span>
                        <span>Сравнение темпа с прошлым месяцем</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="mt-8 apple-btn-primary w-full !py-3 !text-[14px] !bg-[#FF4D00] hover:!bg-[#ff621f] text-center font-medium block"
                  >
                    Начать бесплатно
                  </Link>
                </div>
              </GlowCard>

              {/* Ultra Tier */}
              <GlowCard glowColor="orange" customSize className="p-7 sm:p-8 flex flex-col justify-between bg-[#121215]/85">
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs font-mono text-[#FF4D00] uppercase tracking-wider block mb-2 font-semibold">
                      КЛУБ ОСНОВАТЕЛЕЙ
                    </span>
                    <h3 className="text-[22px] sm:text-[24px] font-bold text-white mb-1">Основатель Ultra</h3>
                    <div className="text-[32px] font-bold text-white font-sans mb-3">
                      50 MDL <span className="text-xs text-[#86868b] font-normal">/ мес</span>
                    </div>
                    <p className="text-[14px] text-[#86868b] mb-6 leading-relaxed">
                      Максимальная глубина и персональный наставник каждого вечера.
                    </p>

                    <div className="space-y-3 text-[14px] text-white/90">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[#FF4D00]">✓</span>
                        <span>Все возможности тарифа Pro</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[#FF4D00]">✓</span>
                        <span>Вердикт Ментора Личной Силы</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[#FF4D00]">✓</span>
                        <span>Глубокий анализ долгосрочных вех</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[#FF4D00]">✓</span>
                        <span>Приоритетная скорость обработки</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="mt-8 w-full py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-[14px] text-center font-medium block transition-all border border-white/10"
                  >
                    Начать бесплатно
                  </Link>
                </div>
              </GlowCard>
            </div>
          </div>
        </section>

        {/* ── 4. ПРИВАТНОСТЬ И ZERO-TRAINING ────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-[#0a0a0c]/60 backdrop-blur-xl border-t border-white/[0.08]">
          <div className="max-w-[860px] mx-auto px-5 sm:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 text-xs text-[#86868b] mb-6">
              <span className="text-[#FF4D00] font-medium">ZERO DATA RETENTION</span>
              <span>·</span>
              <span>КОРПОРАТИВНЫЙ УРОВЕНЬ</span>
            </div>

            <h2 className="text-[26px] sm:text-[36px] font-bold text-white mb-5 tracking-tight">
              Твои записи остаются только твоими
            </h2>

            <p className="text-[16px] sm:text-[18px] text-[#86868b] leading-relaxed mb-8 max-w-[640px] mx-auto">
              Никакого обучения публичных моделей на твоих сокровенных мыслях.
            </p>

            <Link
              href="/legal#privacy"
              className="text-[#FF4D00] hover:underline text-[15px] font-medium inline-flex items-center gap-1.5"
            >
              <span>Читать манифест конфиденциальности</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── 5. FINAL CALL TO ACTION ───────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-transparent border-t border-white/[0.08] text-center">
          <div className="max-w-[760px] mx-auto px-5 sm:px-8">
            <h2 className="apple-hero-title mb-5 !text-[32px] sm:!text-[46px] font-bold text-white tracking-tight">
              Узнай, на что ты способен
            </h2>
            <p className="apple-body max-w-[540px] mx-auto mb-8 text-[#86868b] text-[17px] leading-relaxed">
              Две минуты сегодня вечером — первый честный разбор твоей силы.
            </p>
            <Link
              href="/register"
              className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold !bg-[#FF4D00] hover:!bg-[#ff621f] shadow-[0_0_35px_rgba(255,77,0,0.5)] cursor-pointer"
            >
              Начать бесплатно
            </Link>
          </div>
        </section>

        <AppleFooter />
      </div>
    </div>
  )
}
