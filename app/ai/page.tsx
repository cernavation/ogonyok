'use client'

import React from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { MediaSlot } from '@/components/ogonek/landing/media-slot'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'
import { GlowCard } from '@/components/ui/spotlight-card'
import { AiCeremonyShowcase } from '@/components/ogonek/landing/ai-ceremony-showcase'
import { GlyphBackground } from '@/components/ui/backgrounds-glyph'

export default function AiPage() {
  const containerRef = useScrollReveal()

  return (
    <div className="landing relative min-h-screen" ref={containerRef}>
      {/* ── FIXED GLYPH CANVAS BACKGROUND (Constant across all scrolling blocks) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <GlyphBackground
          className="size-full"
          glowColor="#2997ff"
          shapeColor="#0071e3"
          fontSize={10}
          interactive={true}
        />
        {/* Soft dark vignette over the glyphs for Apple-grade contrast and reading comfort */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 pointer-events-none" />
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#0071e3]/10 top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* ── SCROLLING FOREGROUND STAGE ─────────────────────────────── */}
      <div className="relative z-10">
        <AppleNavbar />

        {/* ── HERO STAGE ────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center text-center pt-28 sm:pt-36 pb-16 sm:pb-24 px-5 sm:px-8 bg-transparent">
          <div className="relative z-10 max-w-[1040px] mx-auto flex flex-col items-center">
            <div className="fade-blur mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                  stroke="#f56900"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="apple-eyebrow">Нейросетевой наставник Priday</span>
            </div>

            <h1 className="apple-hero-title fade-blur delay-75 mb-6 max-w-[960px]">
              ИИ, который не льстит.
              <br />
              <span className="apple-shimmer-text">Трезвый разбор твоих побед.</span>
            </h1>

            <p className="apple-body fade-up delay-150 max-w-[700px] mb-10 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Никаких шаблонных комплиментов и генерации белого шума. Искусственный интеллект Priday анализирует силу сопротивления, взвешивает трудность твоих поступков и находит скрытые закономерности роста.
            </p>

            <div className="fade-scale delay-200 flex items-center justify-center gap-4 flex-wrap mb-14">
              <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[15px] shadow-[0_0_30px_rgba(0,113,227,0.4)]">
                Попробовать ИИ-разбор →
              </Link>
              <Link href="#pricing-ai" className="apple-btn-ghost !px-6 !py-3.5 !text-[15px] backdrop-blur-md bg-white/[0.04]">
                Тарифы с ИИ ›
              </Link>
            </div>

            {/* Real Platform UI Showcase: Dynamic AI Ceremony & Long-term Mentor */}
            <div className="fade-scale delay-250 w-full">
              <AiCeremonyShowcase />
            </div>
          </div>
        </section>

        {/* ── 4 CORE PILLARS OF PRIDAY AI ───────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-black/40 backdrop-blur-md border-t border-white/[0.08]">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
            <div className="text-center max-w-[760px] mx-auto mb-16 sm:mb-20">
              <span className="apple-eyebrow fade-up block mb-4">Архитектура ума</span>
              <h2 className="apple-section-title fade-up delay-75 mb-6">
                4 задачи, которые решает наш ИИ.
              </h2>
              <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
                Мы обучили алгоритм на базе рекордных практик платформы — стриков до 740 дней. Он смотрит на твои поступки глазами строгого, но справедливого наставника.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pillar 1 */}
              <div className="apple-card apple-card-hover fade-up delay-150 p-8 sm:p-10 rounded-[24px] bg-[#141416]/75 backdrop-blur-xl border border-white/10 hover:border-white/20 flex flex-col justify-between shadow-2xl transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#f56900]/10 border border-[#f56900]/20 flex items-center justify-center text-[#f56900] mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <h3 className="text-[22px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                    1. Взвешивание преодоления (Overcome Factor 1–10★)
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#86868b]">
                    ИИ оценивает не красоту слога, а силу преодоленного сопротивления. Выйти на 5-километровую пробежку в ледяной ливень или провести тяжелый разговор с партнером оценивается в разы выше, чем легкая привычная рутина.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] font-mono text-[#f56900]">
                  ФАКТЫ ВЫШЕ НАСТРОЕНИЯ
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="apple-card apple-card-hover fade-up delay-250 p-8 sm:p-10 rounded-[24px] bg-[#141416]/75 backdrop-blur-xl border border-white/10 hover:border-white/20 flex flex-col justify-between shadow-2xl transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#2997ff] mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <h3 className="text-[22px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                    2. Поиск скрытых корреляций (AI Analytics)
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#86868b]">
                    Нейросеть сопоставляет утренние фокусы и вечерние записи за недели и месяцы: «Когда вы тренируетесь до 12:00, результативность в сложных рабочих переговорах возрастает на 35%».
                  </p>
                </div>
                <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] font-mono text-[#2997ff]">
                  ТРЕЗВЫЙ АНАЛИЗ ЗАКОНОМЕРНОСТЕЙ
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="apple-card apple-card-hover fade-up delay-350 p-8 sm:p-10 rounded-[24px] bg-[#141416]/75 backdrop-blur-xl border border-white/10 hover:border-white/20 flex flex-col justify-between shadow-2xl transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#2997ff] mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>
                  <h3 className="text-[22px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                    3. Автоматическое тегирование сфер жизни
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#86868b]">
                    Алгоритм сам классифицирует поступки (#Спорт, #Бизнес, #Семья, #Дисциплина) и бьёт тревогу, если начинается сильный перекос в карьеру ценой здоровья или отношений с близкими.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] text-[#2997ff] font-medium">
                  ЗАЩИТА БАЛАНСА ЖИЗНИ
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="apple-card apple-card-hover fade-up delay-450 p-8 sm:p-10 rounded-[24px] bg-[#141416]/75 backdrop-blur-xl border border-white/10 hover:border-white/20 flex flex-col justify-between shadow-2xl transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#f56900]/10 border border-[#f56900]/20 flex items-center justify-center text-[#f56900] mb-6">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </div>
                  <h3 className="text-[22px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                    4. Напутствие Ментора Личной Силы (Mentor Verdict)
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#86868b]">
                    В тарифе Ultra ИИ формулирует персональный вердикт дня: трезвый итог преодоленного и конкретный вектор приложения усилий на завтрашнее утро. Никаких шаблонных цитат из интернета.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/[0.06] mt-8 text-[12px] text-[#f56900] font-medium">
                  ЭКСКЛЮЗИВ ДЛЯ ТАРИФА ULTRA
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── REAL UI SCREENSHOT: ANALYTICS & INSIGHTS ───────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-transparent border-t border-white/[0.08]">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-5 fade-up">
                <span className="apple-eyebrow block mb-4 !text-[#2997ff]">Аналитика и инсайты</span>
                <h2 className="apple-section-title mb-6">
                  Сравнение обещаний с реальными делами.
                </h2>
                <p className="apple-body mb-6 text-[#86868b] text-[17px] sm:text-[18px] leading-relaxed">
                  Панель AI Insight сопоставляет утренние намерения (Morning Focus) с тем, что ты фактически записал вечером.
                </p>
                <div className="p-5 rounded-2xl bg-[#161617]/75 backdrop-blur-xl border border-white/10 mb-6 shadow-xl">
                  <div className="text-[13px] text-[#2997ff] mb-2 uppercase tracking-wider font-semibold">
                    Классификация рекомендаций:
                  </div>
                  <div className="space-y-2 text-[14px] text-[#f5f5f7]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span><strong>Сильная сторона:</strong> ключевой фактор твоего роста</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span><strong>Внимание:</strong> сигнал о приближающемся спаде</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2997ff]" />
                      <span><strong>Фокус:</strong> вектор приложения усилий на завтра</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 fade-scale delay-200">
                <div className="apple-card overflow-hidden rounded-[24px] bg-[#161617]/70 backdrop-blur-xl border border-white/10 p-3 sm:p-5 shadow-2xl">
                  <div className="rounded-[20px] overflow-hidden border border-white/10 bg-black">
                    <MediaSlot
                      name="platform_03_analytics.png"
                      width={1440}
                      height={900}
                      ratio="16:10"
                      alt="Панель аналитики и ИИ-инсайтов в платформе Priday"
                      rounded={false}
                    />
                  </div>
                  <div className="pt-3 text-center text-xs font-mono text-[#86868b]">
                    Реальный экран аналитики: графики преодоления 1–10★ и выводы искусственного интеллекта
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TIERS COMPARISON FOR AI ────────────────────────────────── */}
        <section id="pricing-ai" className="py-16 sm:py-20 md:py-28 bg-black/40 backdrop-blur-md border-t border-white/[0.08]">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
            <div className="text-center max-w-[760px] mx-auto mb-16">
              <span className="apple-eyebrow fade-up block mb-4">Доступность по тарифам</span>
              <h2 className="apple-section-title fade-up delay-75 mb-6">
                В каких тарифах работает ИИ?
              </h2>
              <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
                Мы уважаем право на чистый дневник без нейросетей и предлагаем честное разделение возможностей.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Free */}
              <GlowCard
                glowColor="green"
                customSize
                className="p-8 flex flex-col justify-between"
              >
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs font-mono text-[#00c7be] uppercase tracking-wider block mb-2 font-semibold">
                      БАЗОВЫЙ
                    </span>
                    <h3 className="text-[24px] font-bold text-white mb-2">Свободный</h3>
                    <div className="text-[32px] font-bold text-white font-sans mb-4">0 MDL</div>
                    <p className="text-[14px] text-[#86868b] mb-6">
                      Чистая летопись без нейросетей для тех, кому важна только вечерняя тишина.
                    </p>

                    <div className="space-y-3 text-[14px] text-[#86868b]">
                      <div className="flex items-center gap-2.5 text-rose-400/90">
                        <span>✗</span>
                        <span>ИИ-оценка летописи: 0 в сутки</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-rose-400/90">
                        <span>✗</span>
                        <span>Анализ преодоления нейросетью</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-rose-400/90">
                        <span>✗</span>
                        <span>Вердикт Ментора Личной Силы</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white/90 pt-3 border-t border-white/5">
                        <span className="text-[#00c7be]">✓</span>
                        <span>100% бесплатный дневник и стрик</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="mt-8 w-full py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-[14px] text-center font-medium block transition-all border border-white/10"
                  >
                    Начать без ИИ
                  </Link>
                </div>
              </GlowCard>

              {/* Pro */}
              <GlowCard
                glowColor="blue"
                customSize
                className="p-8 flex flex-col justify-between relative"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#0071e3] text-white text-[10px] font-bold uppercase tracking-wider z-20">
                  ★ Выбор практиков
                </div>

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs font-mono text-[#2997ff] uppercase tracking-wider block mb-2 font-semibold">
                      ПРЕМИУМ
                    </span>
                    <h3 className="text-[24px] font-bold text-white mb-2">Priday Pro</h3>
                    <div className="text-[32px] font-bold text-white font-sans mb-4">
                      25 MDL <span className="text-xs text-[#86868b] font-normal">/ мес (240 MDL/год)</span>
                    </div>
                    <p className="text-[14px] text-[#86868b] mb-6">
                      Ежедневный персональный разбор дня нейросетью Google Gemini.
                    </p>

                    <div className="space-y-3 text-[14px] text-[#f5f5f7]">
                      <div className="flex items-center gap-2.5 text-white font-medium">
                        <span className="text-[#0071e3]">✓</span>
                        <span><strong>1 ИИ-оценка в день</strong> (Google Gemini)</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white">
                        <span className="text-[#0071e3]">✓</span>
                        <span>Шкала преодоления 1–10★ и баллы</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white">
                        <span className="text-[#0071e3]">✓</span>
                        <span>Автоматические теги сфер жизни</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white">
                        <span className="text-[#0071e3]">✓</span>
                        <span>Сравнение обещаний и реальных дел</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#86868b]">
                        <span>✗</span>
                        <span>Напутствие Ментора Личной Силы</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="mt-8 apple-btn-primary w-full !py-3 !text-[14px] text-center font-medium block"
                  >
                    Подключить Pro с ИИ →
                  </Link>
                </div>
              </GlowCard>

              {/* Ultra */}
              <GlowCard
                glowColor="orange"
                customSize
                className="p-8 flex flex-col justify-between"
              >
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-xs font-mono text-[#f56900] uppercase tracking-wider block mb-2 font-semibold">
                      КЛУБ ОСНОВАТЕЛЕЙ
                    </span>
                    <h3 className="text-[24px] font-bold text-white mb-2">Основатель Ultra</h3>
                    <div className="text-[32px] font-bold text-white font-sans mb-4">
                      50 MDL <span className="text-xs text-[#86868b] font-normal">/ мес (480 MDL/год)</span>
                    </div>
                    <p className="text-[14px] text-[#86868b] mb-6">
                      Максимальная глубина: персональный Ментор Личной Силы на каждый вечер.
                    </p>

                    <div className="space-y-3 text-[14px] text-[#f5f5f7]">
                      <div className="flex items-center gap-2.5 text-white font-medium">
                        <span className="text-[#f56900]">✓</span>
                        <span><strong>Все возможности тарифа Pro</strong></span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#f56900] font-medium">
                        <span className="text-[#f56900]">✓</span>
                        <span><strong>Вердикт Ментора Личной Силы</strong></span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white">
                        <span className="text-[#f56900]">✓</span>
                        <span>Приоритетные вычислительные квоты</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white">
                        <span className="text-[#f56900]">✓</span>
                        <span>Глубокий анализ вех (100, 200, 300+ дней)</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-white">
                        <span className="text-[#f56900]">✓</span>
                        <span>Прямой контакт с основателем</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="mt-8 w-full py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-[14px] text-center font-medium block transition-all border border-white/10"
                  >
                    Стать Основателем
                  </Link>
                </div>
              </GlowCard>
            </div>
          </div>
        </section>

        {/* ── ZERO-TRAINING PRIVACY PLEDGE ──────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-transparent border-t border-white/[0.08]">
          <div className="max-w-[860px] mx-auto px-5 sm:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 text-xs text-[#86868b] mb-6">
              <span className="text-[#2997ff] font-medium">ШИФРОВАНИЕ SHA-256</span>
              <span>·</span>
              <span>ZERO DATA TRAINING</span>
            </div>

            <h2 className="text-[28px] sm:text-[38px] font-bold text-white mb-6 tracking-tight">
              Твои сокровенные мысли никогда не уйдут в публичные модели.
            </h2>

            <p className="text-[16px] sm:text-[18px] text-[#86868b] leading-relaxed mb-8">
              Мы используем закрытые API корпоративного уровня с нулевым сохранением данных (Zero Data Retention). Ни один символ твоих побед или благодарностей не используется для обучения нейросетей. Ты сам решаешь, быть публичным или вести секретную летопись, скрытую от всех.
            </p>

            <Link href="/privacy" className="text-[#2997ff] hover:underline text-[15px] font-medium inline-flex items-center gap-1.5">
              <span>Читать манифест приватности и секретного режима</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── FINAL CALL TO ACTION ──────────────────────────────────── */}
        <section className="py-16 sm:py-20 md:py-28 bg-black/40 backdrop-blur-md border-t border-white/[0.08] text-center">
          <div className="max-w-[760px] mx-auto px-5 sm:px-8">
            <h2 className="apple-hero-title mb-5 sm:mb-6 !text-[36px] sm:!text-[48px]">
              Узнай, на что ты способен на самом деле.
            </h2>
            <p className="apple-body max-w-[540px] mx-auto mb-8 text-[#86868b] text-[17px]">
              Начни фиксировать победы сегодня вечером и получи первый честный разбор своей внутренней силы.
            </p>
            <Link href="/register" className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold shadow-[0_0_35px_rgba(0,113,227,0.6)]">
              Попробовать Priday с ИИ →
            </Link>
          </div>
        </section>

        <AppleFooter />
      </div>
    </div>
  )
}
