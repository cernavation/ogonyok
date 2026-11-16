'use client'

import React from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

export default function HowItWorksPage() {
  const containerRef = useScrollReveal()

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-5 sm:px-8 bg-black text-center overflow-hidden">
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[880px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="apple-eyebrow">Анатомия вечернего ритуала</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6">
            Пять минут, которые
            <br />
            <span className="apple-shimmer-text">меняют траекторию жизни.</span>
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[660px] mb-8 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Почему большинство трекеров привычек умирают через две недели, и как Priday перепрошивает отношение к собственным силам на физиологическом уровне.
          </p>

          <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[14px]">
            Начать вести летопись ›
          </Link>
        </div>
      </section>

      {/* ── PART 1: ПРОБЛЕМА СОВРЕМЕННОГО ЧЕЛОВЕКА ───────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[840px] mx-auto px-5 sm:px-8">
          <span className="apple-eyebrow block mb-3">Глава 1 · Психология</span>
          <h2 className="text-[28px] sm:text-[36px] font-bold text-[#f5f5f7] mb-6 tracking-tight">
            Почему мы чувствуем себя опустошёнными даже в продуктивные дни?
          </h2>

          <div className="space-y-6 text-[16px] sm:text-[17px] leading-relaxed text-[#a1a1a6]">
            <p>
              Эволюция настроила наш мозг замечать угрозы и незавершённые дела (эффект Зейгарник). В каменном веке это спасало жизнь: забытая опасность стоила выживания.
            </p>
            <p>
              Но в XXI веке эта программа играет против нас. Мы закрываем 20 задач по работе, готовим ужин, занимаемся спортом, а перед сном в голове крутится одна мысль: <em className="text-white">«Я опять ничего толком не успел»</em>.
            </p>
            <p className="p-6 rounded-2xl bg-[#161617] border-l-2 border-[#f56900] text-white font-medium">
              Если ты не фиксируешь свои победы осознанно, твой мозг автоматически считает их несуществующими. Уверенность в себе тает просто потому, что у памяти нет задокументированных фактов.
            </p>
          </div>
        </div>
      </section>

      {/* ── PART 2: ТРИ ШАГА РИТУАЛА ──────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1024px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[680px] mx-auto mb-16">
            <span className="apple-eyebrow block mb-3">Глава 2 · Практика</span>
            <h2 className="apple-section-title mb-4">
              Три шага вечерней тишины
            </h2>
            <p className="apple-body text-[#86868b]">
              Ритуал занимает ровно 5 минут перед отходом ко сну. Никаких сложных инструкций.
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="apple-card p-8 sm:p-12 bg-[#141416] border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#f56900]/20 text-[#f56900] font-semibold">
                  ШАГ 01
                </span>
                <span className="text-xs font-mono text-[#86868b]">ФАКТИЧЕСКИЕ ДЕЙСТВИЯ</span>
              </div>
              <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
                Зафиксируй от 1 до 5 побед
              </h3>
              <p className="text-[16px] leading-relaxed text-[#86868b] mb-6">
                Запиши поступки, за которые тебе не стыдно перед зеркалом. Не планы на завтра, а свершившиеся факты. Даже если день был ужасным: «Не сорвался на близких», «Вышел на 15-минутную прогулку», «Честно признал ошибку».
              </p>
              <div className="p-4 rounded-xl bg-white/[0.04] text-[14px] text-white/90 font-mono">
                → Принцип: Лучше 1 железное дело, чем 10 невыполненных обещаний.
              </div>
            </div>

            {/* Step 2 */}
            <div className="apple-card p-8 sm:p-12 bg-[#141416] border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#0071e3]/20 text-[#2997ff] font-semibold">
                  ШАГ 02
                </span>
                <span className="text-xs font-mono text-[#86868b]">ПЕРЕКЛЮЧЕНИЕ ФОКУСА</span>
              </div>
              <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
                Запиши благодарности
              </h3>
              <p className="text-[16px] leading-relaxed text-[#86868b] mb-6">
                Вспомни людей, которые поддержали тебя, события или простые радости: тёплый кофе, хорошую книгу, звонок друга, своё тело за выдержку. Это снижает уровень кортизола и готовит нервную систему к глубокому сну.
              </p>
              <div className="p-4 rounded-xl bg-white/[0.04] text-[14px] text-white/90 font-mono">
                → Принцип: Благодарность убирает зависть и фокус на дефиците.
              </div>
            </div>

            {/* Step 3 */}
            <div className="apple-card p-8 sm:p-12 bg-[#141416] border border-white/[0.08]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/20 text-white font-semibold">
                  ШАГ 03
                </span>
                <span className="text-xs font-mono text-[#86868b]">ЧЕСТНАЯ ОЦЕНКА</span>
              </div>
              <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
                Выстави шкалу преодоления (1–10★)
              </h3>
              <p className="text-[16px] leading-relaxed text-[#86868b] mb-6">
                Насколько трудно тебе было сегодня держать слово? 2★ означает лёгкий день в потоке. 9★ означает, что ты выстоял вопреки шторму. Это помогает трезво отслеживать уровень усталости и вовремя отдыхать.
              </p>
              <div className="p-4 rounded-xl bg-white/[0.04] text-[14px] text-white/90 font-mono">
                → Принцип: Самосознание без иллюзий и самообмана.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PART 3: ЧТО ПРОИСХОДИТ СО ВРЕМЕНЕМ ──────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1024px] mx-auto px-5 sm:px-8">
          <div className="text-center mb-16">
            <span className="apple-eyebrow block mb-3">Глава 3 · Динамика</span>
            <h2 className="apple-section-title mb-4">
              Как меняется человек
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="apple-card p-8 bg-[#161617]">
              <div className="text-[36px] font-bold font-mono text-[#f56900] mb-3">30 дней</div>
              <h4 className="text-[18px] font-semibold text-[#f5f5f7] mb-2">Первый рубеж</h4>
              <p className="text-[14px] text-[#86868b] leading-relaxed">
                Исчезает постоянная тревога перед сном. Ты начинаешь замечать свои маленькие успехи прямо в течение дня.
              </p>
            </div>

            <div className="apple-card p-8 bg-[#161617]">
              <div className="text-[36px] font-bold font-mono text-[#0071e3] mb-3">100 дней</div>
              <h4 className="text-[18px] font-semibold text-[#f5f5f7] mb-2">Нерушимая привычка</h4>
              <p className="text-[14px] text-[#86868b] leading-relaxed">
                Слово перед собой становится законом. Ты перестаёшь искать оправдания и спокойно берешь ответственность за сложные проекты.
              </p>
            </div>

            <div className="apple-card p-8 bg-[#161617]">
              <div className="text-[36px] font-bold font-mono text-white mb-3">740+ дней</div>
              <h4 className="text-[18px] font-semibold text-[#f5f5f7] mb-2">Несокрушимый дух</h4>
              <p className="text-[14px] text-[#86868b] leading-relaxed">
                Скала уверенности. Любой кризис воспринимается просто как задача на шкале преодоления. Полный контроль над траекторией жизни.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] text-center">
        <div className="max-w-[800px] mx-auto px-5 sm:px-8">
          <h2 className="apple-hero-title mb-5 sm:mb-6 !text-[36px] sm:!text-[48px]">
            Попробуй сегодня вечером.
          </h2>
          <p className="apple-body max-w-[500px] mx-auto mb-8 text-[#86868b]">
            Всего 5 минут перед сном. Ты удивишься, насколько спокойнее станет твой разум.
          </p>
          <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[15px]">
            Начать вести летопись
          </Link>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
