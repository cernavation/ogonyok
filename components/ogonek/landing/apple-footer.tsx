'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Send,
  Lock,
  Heart,
  Globe,
  Sparkles,
  Flame,
  CheckCircle2,
} from 'lucide-react'

export function AppleFooter() {
  // Mobile accordion state for directory columns
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    platform: false,
    community: false,
    methodology: false,
    pricing: false,
    security: false,
  })

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <footer
      className="relative pt-14 pb-8 bg-[#050507] text-[#86868b] text-[12px] border-t border-white/[0.08] overflow-hidden"
      aria-label="Подвал сайта"
    >
      {/* Apple Subtle Ambient Halo in center-bottom */}
      <div
        className="apple-ambient-orb w-[700px] h-[350px] bg-[#0071e3]/10 -bottom-24 left-1/2 -translate-x-1/2"
        aria-hidden="true"
      />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative z-10">
        {/* ── 1. APPLE BREADCRUMBS BAR ────────────────────────────────────── */}
        <div className="fade-up pb-6 border-b border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868b] flex-wrap gap-3">
          <nav aria-label="Навигационная цепочка" className="flex items-center gap-2 flex-wrap">
            <Link
              href="/"
              className="text-[#f5f5f7] hover:text-[#0071e3] transition-colors flex items-center gap-1.5 font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path
                  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  fill="#f56900"
                />
              </svg>
              <span>Огонёк</span>
            </Link>
            <span className="text-[#424245]">›</span>
            <Link href="/platform" className="hover:text-[#f5f5f7] transition-colors">
              Дневник силы и побед
            </Link>
            <span className="text-[#424245]">›</span>
            <span className="text-[#d2d2d7] font-medium">Летопись</span>
          </nav>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AES-GCM 256 · Local-first</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#6e6e73]">
              <span>Ежевечерний ритуал в 21:00</span>
            </span>
          </div>
        </div>

        {/* ── 2. APPLE TRIPLE VALUE STAGE (DOUBLE-BEZEL HARDWARE CARDS) ───── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 py-8 sm:py-10 border-b border-white/[0.06]">
          {/* Card 1: Telegram вечерний бот */}
          <div className="fade-scale delay-150 rounded-[1.5rem] p-1 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 group">
            <div className="h-full rounded-[calc(1.5rem-0.25rem)] p-5 sm:p-6 bg-[#0c0c0e]/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#2997ff]/10 border border-[#2997ff]/20 flex items-center justify-center text-[#2997ff]">
                    <Send size={15} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b]">
                    Без спама
                  </span>
                </div>
                <h4 className="text-[15px] font-semibold text-[#f5f5f7] mb-1.5 group-hover:text-[#2997ff] transition-colors">
                  Вечерний ритуал в Telegram
                </h4>
                <p className="text-[12px] text-[#86868b] leading-relaxed mb-4">
                  В 21:00 бот задаёт один вопрос: «Чем гордишься сегодня?». Твой ответ моментально сохраняется в зашифрованную летопись.
                </p>
              </div>
              <a
                href="https://t.me/ogonek_support"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-[#0071e3] text-[#f5f5f7] hover:text-white text-[12px] font-medium transition-all duration-200 group/btn"
              >
                <span>Подключить напоминания</span>
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover/btn:translate-x-0.5 transition-transform">
                  <ExternalLink size={10} />
                </div>
              </a>
            </div>
          </div>

          {/* Card 2: 100% Local-first и приватность */}
          <div className="fade-scale delay-250 rounded-[1.5rem] p-1 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 group">
            <div className="h-full rounded-[calc(1.5rem-0.25rem)] p-5 sm:p-6 bg-[#0c0c0e]/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Lock size={15} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                    Zero-Training
                  </span>
                </div>
                <h4 className="text-[15px] font-semibold text-[#f5f5f7] mb-1.5 group-hover:text-emerald-400 transition-colors">
                  Нулевой сбор данных
                </h4>
                <p className="text-[12px] text-[#86868b] leading-relaxed mb-4">
                  Ключи шифрования создаются исключительно на процессоре твоего устройства. Мы физически не можем прочитать записи побед или продать рекламу.
                </p>
              </div>
              <Link
                href="/privacy"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-emerald-500 text-[#f5f5f7] hover:text-black text-[12px] font-medium transition-all duration-200 group/btn"
              >
                <span>Манифест Local-first</span>
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover/btn:translate-x-0.5 transition-transform font-bold">
                  ›
                </div>
              </Link>
            </div>
          </div>

          {/* Card 3: Авторский независимый проект */}
          <div className="fade-scale delay-350 rounded-[1.5rem] p-1 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 group">
            <div className="h-full rounded-[calc(1.5rem-0.25rem)] p-5 sm:p-6 bg-[#0c0c0e]/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#f56900]/10 border border-[#f56900]/20 flex items-center justify-center text-[#f56900]">
                    <Heart size={15} />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b]">
                    740+ дней
                  </span>
                </div>
                <h4 className="text-[15px] font-semibold text-[#f5f5f7] mb-1.5 group-hover:text-[#f56900] transition-colors">
                  Создан для людей, а не алгоритмов
                </h4>
                <p className="text-[12px] text-[#86868b] leading-relaxed mb-4">
                  Никаких венчурных фондов, токсичных пушей и накруток дофамина. Только честная опора на себя и уважение к твоему пути.
                </p>
              </div>
              <Link
                href="/manifesto"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-[#f56900] text-[#f5f5f7] hover:text-white text-[12px] font-medium transition-all duration-200 group/btn"
              >
                <span>Манифест создателя</span>
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover/btn:translate-x-0.5 transition-transform font-bold">
                  ›
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 3. 5-COLUMN APPLE ESPAÑA DIRECTORY WITH MOBILE ACCORDIONS ────── */}
        <div className="fade-up delay-200 py-10 border-b border-white/[0.06]">
          {/* Desktop 5-Column Grid */}
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-8">
            {/* Column 1: Платформа */}
            <div>
              <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
                Платформа
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/platform" className="hover:text-[#f5f5f7] transition-colors">
                    Возможности и функции
                  </Link>
                </li>
                <li>
                  <Link href="/examples" className="hover:text-[#f5f5f7] transition-colors inline-flex items-center gap-1.5">
                    <span>Примеры побед</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#f56900]/20 text-[#f56900] font-mono">Гид</span>
                  </Link>
                </li>
                <li>
                  <Link href="/ai" className="hover:text-[#f5f5f7] transition-colors inline-flex items-center gap-1.5">
                    <span>ИИ-наставник</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#2997ff]/20 text-[#2997ff] font-mono">Gemini 2.5</span>
                  </Link>
                </li>
                <li>
                  <Link href="/platform#vault" className="hover:text-[#f5f5f7] transition-colors">
                    Сейф доказательств (Vault)
                  </Link>
                </li>
                <li>
                  <Link href="/examples#high-score" className="hover:text-[#f5f5f7] transition-colors">
                    Шкала преодоления 1–10★
                  </Link>
                </li>
                <li>
                  <Link href="/support#export" className="hover:text-[#f5f5f7] transition-colors">
                    Резервный экспорт в JSON
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Сообщество */}
            <div>
              <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
                Сообщество
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/community#groups" className="hover:text-[#f5f5f7] transition-colors">
                    Клубы по хобби и целям
                  </Link>
                </li>
                <li>
                  <Link href="/community#search" className="hover:text-[#f5f5f7] transition-colors">
                    Поиск напарников
                  </Link>
                </li>
                <li>
                  <Link href="/community#stories" className="hover:text-[#f5f5f7] transition-colors inline-flex items-center gap-1.5">
                    <span>Сторис побед</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#f91880]/20 text-[#f91880] font-mono">24 часа</span>
                  </Link>
                </li>
                <li>
                  <Link href="/community#calls" className="hover:text-[#f5f5f7] transition-colors">
                    Зашифрованные P2P звонки
                  </Link>
                </li>
                <li>
                  <Link href="/community#duo" className="hover:text-[#f5f5f7] transition-colors">
                    Парный огонёк (Duo Streak)
                  </Link>
                </li>
                <li>
                  <Link href="/community" className="hover:text-[#f5f5f7] transition-colors">
                    Экологичная лента побед
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Ритм и сферы */}
            <div>
              <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
                Ритм и сферы
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/how-it-works" className="hover:text-[#f5f5f7] transition-colors">
                    Вечерний ритуал (5 минут)
                  </Link>
                </li>
                <li>
                  <Link href="/modes" className="hover:text-[#f5f5f7] transition-colors">
                    5 сфер баланса жизни
                  </Link>
                </li>
                <li>
                  <Link href="/examples#levels-guide" className="hover:text-[#f5f5f7] transition-colors">
                    Выбор уровня сложности
                  </Link>
                </li>
                <li>
                  <Link href="/reviews" className="hover:text-[#f5f5f7] transition-colors">
                    Истории участников (32+)
                  </Link>
                </li>
                <li>
                  <Link href="/manifesto" className="hover:text-[#f5f5f7] transition-colors">
                    Манифест 740 дней
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works#streak" className="hover:text-[#f5f5f7] transition-colors">
                    Правило «Стрик не сгорает»
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Открытость и тарифы */}
            <div>
              <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
                Открытость
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/#open" className="hover:text-[#f5f5f7] transition-colors inline-flex items-center gap-1.5">
                    <span>100% бесплатно навсегда</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-mono">Free</span>
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-[#f5f5f7] transition-colors">
                    Тарифы Pro и Ultra
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-[#f5f5f7] transition-colors">
                    Годовая подписка (-20%)
                  </Link>
                </li>
                <li>
                  <Link href="/#open" className="hover:text-[#f5f5f7] transition-colors">
                    0% рекламы и трекеров
                  </Link>
                </li>
                <li>
                  <Link href="/#open" className="hover:text-[#f5f5f7] transition-colors">
                    Поддержка независимых
                  </Link>
                </li>
                <li>
                  <Link href="/privacy#local-first" className="hover:text-[#f5f5f7] transition-colors">
                    Философия Local-first
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: Безопасность */}
            <div>
              <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
                Безопасность
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/privacy" className="hover:text-[#f5f5f7] transition-colors">
                    Политика приватности
                  </Link>
                </li>
                <li>
                  <Link href="/privacy#encryption" className="hover:text-[#f5f5f7] transition-colors">
                    Шифрование Web Crypto
                  </Link>
                </li>
                <li>
                  <Link href="/ai#privacy-pledge" className="hover:text-[#f5f5f7] transition-colors inline-flex items-center gap-1.5">
                    <span>Zero-Training ИИ</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/20 text-blue-400 font-mono">100%</span>
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[#f5f5f7] transition-colors">
                    Условия сервиса
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:text-[#f5f5f7] transition-colors">
                    Центр заботы & FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/support#status" className="hover:text-[#f5f5f7] transition-colors">
                    Статус серверов
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile Apple-style Collapsible Accordion (< md) */}
          <div className="md:hidden divide-y divide-white/[0.08]">
            {/* Accordion 1: Платформа */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleSection('platform')}
                className="w-full flex items-center justify-between text-left text-[13px] font-semibold text-[#f5f5f7] py-1"
                aria-expanded={openSections.platform}
              >
                <span>Платформа</span>
                <ChevronDown
                  size={15}
                  className={`text-[#86868b] transition-transform duration-200 ${
                    openSections.platform ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>
              {openSections.platform && (
                <ul className="pt-2.5 pb-2 space-y-2 text-[12px] pl-2 border-l border-white/[0.1] mt-1.5">
                  <li><Link href="/platform" className="hover:text-white transition-colors block py-0.5">Возможности и функции</Link></li>
                  <li><Link href="/examples" className="hover:text-white transition-colors block py-0.5 text-[#f56900]">Примеры побед (Гид)</Link></li>
                  <li><Link href="/ai" className="hover:text-white transition-colors block py-0.5 text-[#2997ff]">ИИ-наставник (Gemini 2.5)</Link></li>
                  <li><Link href="/platform#vault" className="hover:text-white transition-colors block py-0.5">Сейф доказательств (Vault)</Link></li>
                  <li><Link href="/examples#high-score" className="hover:text-white transition-colors block py-0.5">Шкала преодоления 1–10★</Link></li>
                  <li><Link href="/support#export" className="hover:text-white transition-colors block py-0.5">Экспорт данных в JSON</Link></li>
                </ul>
              )}
            </div>

            {/* Accordion 2: Сообщество */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleSection('community')}
                className="w-full flex items-center justify-between text-left text-[13px] font-semibold text-[#f5f5f7] py-1"
                aria-expanded={openSections.community}
              >
                <span>Сообщество</span>
                <ChevronDown
                  size={15}
                  className={`text-[#86868b] transition-transform duration-200 ${
                    openSections.community ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>
              {openSections.community && (
                <ul className="pt-2.5 pb-2 space-y-2 text-[12px] pl-2 border-l border-white/[0.1] mt-1.5">
                  <li><Link href="/community#groups" className="hover:text-white transition-colors block py-0.5">Клубы по хобби и целям</Link></li>
                  <li><Link href="/community#search" className="hover:text-white transition-colors block py-0.5">Поиск напарников</Link></li>
                  <li><Link href="/community#stories" className="hover:text-white transition-colors block py-0.5 text-[#f91880]">Сторис побед 24ч</Link></li>
                  <li><Link href="/community#calls" className="hover:text-white transition-colors block py-0.5">Зашифрованные P2P звонки</Link></li>
                  <li><Link href="/community#duo" className="hover:text-white transition-colors block py-0.5">Парный огонёк (Duo Streak)</Link></li>
                  <li><Link href="/community" className="hover:text-white transition-colors block py-0.5">Экологичная лента побед</Link></li>
                </ul>
              )}
            </div>

            {/* Accordion 3: Ритм и сферы */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleSection('methodology')}
                className="w-full flex items-center justify-between text-left text-[13px] font-semibold text-[#f5f5f7] py-1"
                aria-expanded={openSections.methodology}
              >
                <span>Ритм и сферы</span>
                <ChevronDown
                  size={15}
                  className={`text-[#86868b] transition-transform duration-200 ${
                    openSections.methodology ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>
              {openSections.methodology && (
                <ul className="pt-2.5 pb-2 space-y-2 text-[12px] pl-2 border-l border-white/[0.1] mt-1.5">
                  <li><Link href="/how-it-works" className="hover:text-white transition-colors block py-0.5">Вечерний ритуал (5 минут)</Link></li>
                  <li><Link href="/modes" className="hover:text-white transition-colors block py-0.5">5 сфер баланса жизни</Link></li>
                  <li><Link href="/examples#levels-guide" className="hover:text-white transition-colors block py-0.5">Выбор уровня сложности</Link></li>
                  <li><Link href="/reviews" className="hover:text-white transition-colors block py-0.5">Истории участников (32+)</Link></li>
                  <li><Link href="/manifesto" className="hover:text-white transition-colors block py-0.5">Манифест 740 дней</Link></li>
                  <li><Link href="/how-it-works#streak" className="hover:text-white transition-colors block py-0.5">Правило «Стрик не сгорает»</Link></li>
                </ul>
              )}
            </div>

            {/* Accordion 4: Открытость и тарифы */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleSection('pricing')}
                className="w-full flex items-center justify-between text-left text-[13px] font-semibold text-[#f5f5f7] py-1"
                aria-expanded={openSections.pricing}
              >
                <span>Открытость и тарифы</span>
                <ChevronDown
                  size={15}
                  className={`text-[#86868b] transition-transform duration-200 ${
                    openSections.pricing ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>
              {openSections.pricing && (
                <ul className="pt-2.5 pb-2 space-y-2 text-[12px] pl-2 border-l border-white/[0.1] mt-1.5">
                  <li><Link href="/#open" className="hover:text-white transition-colors block py-0.5 text-emerald-400">100% бесплатно навсегда</Link></li>
                  <li><Link href="/#pricing" className="hover:text-white transition-colors block py-0.5">Тарифы Pro и Ultra</Link></li>
                  <li><Link href="/#pricing" className="hover:text-white transition-colors block py-0.5">Годовая подписка (-20%)</Link></li>
                  <li><Link href="/#open" className="hover:text-white transition-colors block py-0.5">0% рекламы и трекеров</Link></li>
                  <li><Link href="/#open" className="hover:text-white transition-colors block py-0.5">Поддержка независимых</Link></li>
                  <li><Link href="/privacy#local-first" className="hover:text-white transition-colors block py-0.5">Философия Local-first</Link></li>
                </ul>
              )}
            </div>

            {/* Accordion 5: Безопасность */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleSection('security')}
                className="w-full flex items-center justify-between text-left text-[13px] font-semibold text-[#f5f5f7] py-1"
                aria-expanded={openSections.security}
              >
                <span>Безопасность</span>
                <ChevronDown
                  size={15}
                  className={`text-[#86868b] transition-transform duration-200 ${
                    openSections.security ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>
              {openSections.security && (
                <ul className="pt-2.5 pb-2 space-y-2 text-[12px] pl-2 border-l border-white/[0.1] mt-1.5">
                  <li><Link href="/privacy" className="hover:text-white transition-colors block py-0.5">Политика приватности</Link></li>
                  <li><Link href="/privacy#encryption" className="hover:text-white transition-colors block py-0.5">Шифрование Web Crypto</Link></li>
                  <li><Link href="/ai#privacy-pledge" className="hover:text-white transition-colors block py-0.5 text-blue-400">Zero-Training ИИ</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors block py-0.5">Условия сервиса</Link></li>
                  <li><Link href="/support" className="hover:text-white transition-colors block py-0.5">Центр заботы & FAQ</Link></li>
                  <li><Link href="/support#status" className="hover:text-white transition-colors block py-0.5">Статус серверов</Link></li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. APPLE DEEP FOOTNOTES & LEGAL SPECIFICATIONS ───────────────── */}
        <div className="fade-up delay-250 py-8 border-b border-white/[0.06] text-[11px] leading-relaxed text-[#6e6e73] space-y-2.5">
          <p>
            1. <strong className="text-[#86868b]">Философия Local-first:</strong> все личные записи побед, заметки благодарностей, шкала преодоления и медиа-доказательства по умолчанию сохраняются во внутреннем хранилище вашего устройства с использованием аппаратного шифрования Web Crypto (AES-GCM 256). Ни один байт ваших записей не передаётся на удалённые серверы без вашей прямой команды.
          </p>
          <p>
            2. <strong className="text-[#86868b]">Защита от выгорания и «Стрик не сгорает»:</strong> алгоритм «Огонька» ориентирован на долгосрочную устойчивость психики. Пропуск одного дня не обнуляет накопленный стрик и не начисляет штрафов. «Огонёк» — это инструмент возвращения к себе, а не конвейер вины.
          </p>
          <p>
            3. <strong className="text-[#86868b]">Конфиденциальность ИИ-слоя:</strong> подсказки и анализ на базе ИИ функционируют в изолированной stateless-среде с нулевым хранением контекста. Действует строгое гарантийное соглашение Zero-Training: ваши персональные данные никогда не используются для обучения или дообучения больших языковых моделей.
          </p>
          <p>
            4. <strong className="text-[#86868b]">Независимость и отсутствие рекламы:</strong> платформа существует исключительно за счёт добровольных платных подписок Pro и Ultra. Мы не продаём рекламные места, не встраиваем маркетинговые пиксели и не передаём профили пользователей сторонним брокерам данных.
          </p>
        </div>

        {/* ── 5. APPLE BOTTOM MASTER ROW (COPYRIGHT, REGION, STATUS) ──────── */}
        <div className="fade-up delay-300 pt-8 flex flex-col lg:flex-row items-center justify-between gap-5 text-[11px]">
          {/* Brand & Copyright */}
          <div className="flex items-center gap-3 flex-wrap justify-center lg:justify-start">
            <div className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path
                  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  fill="#f56900"
                />
              </svg>
              <span className="font-semibold text-[#f5f5f7]">Огонёк</span>
            </div>
            <span className="text-[#424245]">·</span>
            <span className="text-[#6e6e73]">
              © {new Date().getFullYear()} Огонёк Inc. Все права защищены.
            </span>
          </div>

          {/* Legal Quick Links */}
          <nav aria-label="Юридическая информация" className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center text-[#86868b]">
            <Link href="/privacy" className="hover:text-[#f5f5f7] transition-colors">
              Конфиденциальность
            </Link>
            <Link href="/terms" className="hover:text-[#f5f5f7] transition-colors">
              Условия сервиса
            </Link>
            <Link href="/support" className="hover:text-[#f5f5f7] transition-colors">
              Центр заботы
            </Link>
            <Link href="/privacy#encryption" className="hover:text-[#f5f5f7] transition-colors">
              Безопасность
            </Link>
            <Link href="/support#status" className="hover:text-[#f5f5f7] transition-colors">
              Статус систем
            </Link>
          </nav>

          {/* Region Picker & Status Pulse */}
          <div className="flex items-center gap-4 flex-wrap justify-center lg:justify-end">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Все системы в строю (24 мс)</span>
            </span>
            <span className="text-[#333336]">|</span>
            <div className="inline-flex items-center gap-1.5 text-[#d2d2d7] hover:text-white transition-colors cursor-default">
              <Globe size={13} className="text-[#86868b]" />
              <span>СНГ · Русский (Local-first)</span>
            </div>
          </div>
        </div>

        {/* ── 6. GIANT APPLE METALLIC FOIL WATERMARK ──────────────────────── */}
        <div
          className="fade-blur delay-350 pt-12 sm:pt-16 pb-2 text-center select-none pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <span className="font-[900] tracking-[0.22em] text-[52px] sm:text-[92px] md:text-[130px] lg:text-[164px] leading-none uppercase text-transparent bg-clip-text bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent inline-block">
            ОГОНЁК
          </span>
        </div>
      </div>
    </footer>
  )
}
