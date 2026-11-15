'use client'

import React from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

export default function ManifestoPage() {
  const containerRef = useScrollReveal()

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-5 sm:px-8 bg-black text-center overflow-hidden">
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[840px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="apple-eyebrow">Манифест основателя</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6">
            740 дней, которые
            <br />
            <span className="apple-shimmer-text">доказали: ты сильнее, чем думаешь.</span>
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[620px] mb-8 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Открытое письмо Александра Церны к каждому, кто устал от пустых обещаний самому себе, выгорания и вечной суеты.
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-[#86868b]">
            <span>Александр Церна</span>
            <span>·</span>
            <span>740+ дней непрерывной летописи</span>
          </div>
        </div>
      </section>

      {/* ── ESSAY CONTENT ──────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8 space-y-10 text-[17px] leading-relaxed text-[#a1a1a6]">
          <div className="flex items-center gap-4 p-6 rounded-2xl bg-[#161617] border border-white/10">
            <img
              src="/media/landing/quote-1.jpg"
              alt="Александр Церна"
              className="w-16 h-16 rounded-full object-cover border border-white/20 shrink-0"
            />
            <div>
              <div className="text-[17px] font-semibold text-[#f5f5f7]">Александр Церна</div>
              <div className="text-[13px] text-[#86868b]">Основатель проекта «Огонёк» · Серийный предприниматель</div>
            </div>
          </div>

          <p>
            Я начал вести этот дневник больше двух лет назад в один из самых мрачных периодов жизни. В бизнесе рушились договорённости, здоровье давало сбои, а в голове царил бесконечный белый шум.
          </p>

          <p>
            Я перепробовал десятки приложений: трекеры привычек, планировщики задач, дневники благодарности. Все они требовали от меня слишком многого: ставить цели на 10 лет вперёд, визуализировать идеальное будущее или чувствовать вину за то, что я не сделал сегодня 25 запланированных дел.
          </p>

          <p className="text-[20px] text-white font-medium pl-6 border-l-2 border-[#f56900] py-2">
            В один из вечеров я сказал себе: «Хватит врать. Пусть сегодня был кошмарный день, но я сделал одну вещь, за которую мне не стыдно. И я запишу её».
          </p>

          <p>
            Так родился «Огонёк». Не как коммерческий стартап, а как личный спасательный круг. Каждый вечер перед сном я открывал чистый лист и записывал от 1 до 5 реальных фактов преодоления. И за 740 дней эта простая практика изменила во мне буквально всё.
          </p>

          {/* 5 Principles */}
          <div className="pt-8 pb-4">
            <h2 className="text-[26px] sm:text-[32px] font-bold text-[#f5f5f7] mb-8 tracking-tight">
              Пять нерушимых законов Огонька:
            </h2>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#161617] border border-white/[0.08]">
                <h3 className="text-[18px] font-semibold text-white mb-2">1. Факты выше настроения</h3>
                <p className="text-[15px] text-[#86868b]">
                  Эмоции переменчивы: сегодня ты на подъёме, завтра в яме. Записанный факт победы остаётся фактом навсегда. Опирайся на то, что сделано, а не на то, что кажется в момент усталости.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#161617] border border-white/[0.08]">
                <h3 className="text-[18px] font-semibold text-white mb-2">2. Слово перед собой — высшая валюта</h3>
                <p className="text-[15px] text-[#86868b]">
                  Когда ты держишь слово перед зеркалом, исчезает необходимость кому-то что-то доказывать. Самоуважение рождается из завершённых дел, какими бы малыми они ни казались со стороны.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#161617] border border-white/[0.08]">
                <h3 className="text-[18px] font-semibold text-white mb-2">3. Стрик не сгорает</h3>
                <p className="text-[15px] text-[#86868b]">
                  Мы не роботы. Жизнь приносит болезни, травмы, шторма. Пропуск одного вечера — это не повод обнулять 100 дней труда. Ты продолжаешь с той же точки.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#161617] border border-white/[0.08]">
                <h3 className="text-[18px] font-semibold text-white mb-2">4. Приватность неприкосновенна</h3>
                <p className="text-[15px] text-[#86868b]">
                  Твои мысли, сомнения и победы принадлежат только тебе. Они хранятся локально на твоём устройстве. Никаких алгоритмов, анализирующих твою жизнь ради продажи рекламы.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#161617] border border-white/[0.08]">
                <h3 className="text-[18px] font-semibold text-white mb-2">5. Вместе гордиться легче</h3>
                <p className="text-[15px] text-[#86868b]">
                  Когда рядом есть те, кто так же каждый вечер выбирает дисциплину вместо жалости к себе, путь становится радостным. Огонёк — это сообщество людей чести.
                </p>
              </div>
            </div>
          </div>

          <p>
            Если ты читаешь эти строки — начни сегодня. Не жди понедельника, нового года или идеального момента. Запиши хотя бы один поступок, за который ты уважаешь себя сегодня.
          </p>

          <div className="pt-8 border-t border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="text-[18px] font-serif italic text-[#f5f5f7]">Александр Церна</div>
              <div className="text-xs text-[#86868b]">Основатель «Огонька»</div>
            </div>
            <Link href="/register" className="apple-btn-primary !px-7 !py-3 !text-[14px]">
              Зажечь свой огонёк ›
            </Link>
          </div>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
