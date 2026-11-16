'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ExternalLink,
  ChevronDown,
  Sparkles,
  Flame,
  Globe2,
  Lock,
  ArrowUp,
  UserCheck,
  EyeOff,
  ShieldCheck,
} from 'lucide-react'
import { HalftoneWordmarkCanvas } from '@/components/ui/halftone-wordmark-footer'

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpenAuth = (mode: 'login' | 'register') => {
    window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode } }))
  }

  return (
    <footer
      className="relative pt-12 sm:pt-16 pb-6 bg-[#050507] text-[#86868b] text-[12px] border-t border-white/[0.08] overflow-hidden"
      aria-label="Подвал сайта"
    >
      {/* Apple Subtle Ambient Halo in center */}
      <div
        className="apple-ambient-orb w-[700px] h-[350px] bg-[#0071e3]/10 -bottom-24 left-1/2 -translate-x-1/2 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative z-10">
        {/* ── 1. HEADER ROW: BRAND, BREADCRUMBS & STYLED ACTION BUTTONS ────── */}
        <div className="fade-up pb-8 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            {/* Breadcrumbs */}
            <nav aria-label="Навигационная цепочка" className="flex items-center gap-2 flex-wrap text-[11px] text-[#86868b]">
              <Link
                href="/"
                className="text-[#f5f5f7] hover:text-[#f56900] transition-colors flex items-center gap-1.5 font-medium"
              >
                <Flame size={14} className="text-[#f56900]" />
                <span>Priday</span>
              </Link>
              <span className="text-[#424245]">›</span>
              <Link href="/platform" className="hover:text-[#f5f5f7] transition-colors">
                Дневник силы и побед
              </Link>
              <span className="text-[#424245]">›</span>
              <span className="text-[#d2d2d7] font-medium">Летопись</span>
            </nav>

            <h3 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight flex items-center gap-2">
              <span>Личная летопись побед и дисциплины</span>
            </h3>
            <p className="text-[13px] text-[#86868b] max-w-[540px] leading-relaxed">
              Фиксируй настоящие преодоления каждый вечер. Твой рекорд непрерывного огонька принадлежит тебе навсегда.
            </p>
          </div>

          {/* Styled Action Buttons for Footer */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAuth('register')}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#f56900] to-[#ff8c00] hover:from-[#ff7714] hover:to-[#ffa024] text-white font-semibold text-[13px] shadow-[0_4px_20px_rgba(245,105,0,0.35)] hover:shadow-[0_6px_25px_rgba(245,105,0,0.5)] transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>Начать летопись</span>
              <span className="text-white/80">→</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAuth('login')}
              className="px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-[#f5f5f7] font-medium text-[13px] transition-all active:scale-95 cursor-pointer"
            >
              Войти
            </button>

            <button
              type="button"
              onClick={scrollToTop}
              className="px-3.5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[#86868b] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[12px]"
              title="Прокрутить страницу наверх"
            >
              <span>Наверх</span>
              <ArrowUp size={13} />
            </button>
          </div>
        </div>

        {/* ── 2. PRIVACY FREEDOM PANEL: ПУБЛИЧНЫЙ ИЛИ СЕКРЕТНЫЙ РЕЖИМ ─────── */}
        <div className="fade-scale delay-150 my-8 p-6 sm:p-7 rounded-[1.75rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-[620px]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f56900]/15 border border-[#f56900]/30 text-[#f56900] text-[11px] font-medium">
                <ShieldCheck size={13} />
                <span>Полный контроль видимости</span>
              </div>
              <h4 className="text-[17px] sm:text-[19px] font-semibold text-white tracking-tight">
                Ты сам решаешь: открыться миру или оставаться в полной секретности
              </h4>
              <p className="text-[13px] text-[#86868b] leading-relaxed">
                В Priday ты можешь сделать профиль публичным и делиться победами со всем миром, вдохновляя окружающих. А можешь включить секретный режим — тогда тебя невозможно найти в поиске платформы, а твои записи не увидит никто, кроме тех, кому ты лично откроешь доступ.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] min-w-[200px]">
                <div className="flex items-center gap-2 text-[#2997ff] text-[12px] font-semibold mb-1">
                  <Globe2 size={14} />
                  <span>Публичный профиль</span>
                </div>
                <p className="text-[11px] text-[#86868b] leading-snug">
                  Делись победами с миром, попадай в общую ленту и рейтинги.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] min-w-[200px]">
                <div className="flex items-center gap-2 text-emerald-400 text-[12px] font-semibold mb-1">
                  <EyeOff size={14} />
                  <span>Секретный режим</span>
                </div>
                <p className="text-[11px] text-[#86868b] leading-snug">
                  Полная невидимость в поиске. Доступ только по твоему личному разрешению.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. 5-COLUMN DIRECTORY WITH MOBILE ACCORDIONS ────────────────── */}
        <div className="fade-up delay-200 py-8 border-b border-white/[0.08]">
          {/* Desktop 5-Column Grid */}
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-8 text-[12px]">
            {/* Column 1: Платформа */}
            <div>
              <h4 className="text-[11px] font-semibold text-[#f5f5f7] mb-3.5 tracking-wider uppercase font-mono">
                Платформа
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/platform" className="hover:text-white transition-colors">
                    Возможности и функции
                  </Link>
                </li>
                <li>
                  <Link href="/examples" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                    <span>Примеры побед</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#f56900]/15 text-[#f56900] font-medium">Гид</span>
                  </Link>
                </li>
                <li>
                  <Link href="/ai" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                    <span>ИИ-наставник</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#2997ff]/20 text-[#2997ff] font-medium">Gemini 2.5</span>
                  </Link>
                </li>
                <li>
                  <Link href="/platform#vault" className="hover:text-white transition-colors">
                    Сейф доказательств (Vault)
                  </Link>
                </li>
                <li>
                  <Link href="/examples#high-score" className="hover:text-white transition-colors">
                    Шкала преодоления 1–10★
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Сообщество */}
            <div>
              <h4 className="text-[11px] font-semibold text-[#f5f5f7] mb-3.5 tracking-wider uppercase font-mono">
                Сообщество
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/community#groups" className="hover:text-white transition-colors">
                    Клубы по хобби и целям
                  </Link>
                </li>
                <li>
                  <Link href="/community#search" className="hover:text-white transition-colors">
                    Поиск напарников
                  </Link>
                </li>
                <li>
                  <Link href="/community#stories" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                    <span>Сторис побед</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/[0.08] text-[#f5f5f7] font-medium">24 часа</span>
                  </Link>
                </li>
                <li>
                  <Link href="/community#calls" className="hover:text-white transition-colors">
                    Зашифрованные P2P звонки
                  </Link>
                </li>
                <li>
                  <Link href="/community#duo" className="hover:text-white transition-colors">
                    Парный огонёк (Duo Streak)
                  </Link>
                </li>
                <li>
                  <a
                    href="https://t.me/ogonek_support"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Telegram-сообщество</span>
                    <ExternalLink size={10} className="text-[#86868b]" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Ритм и сферы */}
            <div>
              <h4 className="text-[11px] font-semibold text-[#f5f5f7] mb-3.5 tracking-wider uppercase font-mono">
                Ритм и сферы
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/how-it-works" className="hover:text-white transition-colors">
                    Вечерний ритуал (5 минут)
                  </Link>
                </li>
                <li>
                  <Link href="/modes" className="hover:text-white transition-colors">
                    5 сфер баланса жизни
                  </Link>
                </li>
                <li>
                  <Link href="/reviews" className="hover:text-white transition-colors">
                    Истории участников (32+)
                  </Link>
                </li>
                <li>
                  <Link href="/manifesto" className="hover:text-white transition-colors">
                    Рекорд платформы 740 дней
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works#streak" className="hover:text-white transition-colors">
                    Правило «Стрик не сгорает»
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Открытость */}
            <div>
              <h4 className="text-[11px] font-semibold text-[#f5f5f7] mb-3.5 tracking-wider uppercase font-mono">
                Открытость
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/#open" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                    <span>100% бесплатно навсегда</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-medium">Free</span>
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-white transition-colors">
                    Тарифы Pro и Ultra
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-white transition-colors">
                    Годовая подписка (-20%)
                  </Link>
                </li>
                <li>
                  <Link href="/#open" className="hover:text-white transition-colors">
                    0% рекламы и трекеров
                  </Link>
                </li>
                <li>
                  <Link href="/#open" className="hover:text-white transition-colors">
                    Поддержка независимых
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: Безопасность и приватность */}
            <div>
              <h4 className="text-[11px] font-semibold text-[#f5f5f7] mb-3.5 tracking-wider uppercase font-mono">
                Безопасность
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Политика приватности
                  </Link>
                </li>
                <li>
                  <Link href="/privacy#modes" className="hover:text-white transition-colors">
                    Публичный или секретный профиль
                  </Link>
                </li>
                <li>
                  <Link href="/ai#privacy-pledge" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                    <span>Zero-Training ИИ</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#0071e3]/15 text-[#2997ff] font-medium">100%</span>
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Условия сервиса
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:text-white transition-colors">
                    Центр заботы & FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/privacy#encryption" className="hover:text-white transition-colors">
                    Защита персональных данных
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile Collapsible Accordion (< md) */}
          <div className="md:hidden divide-y divide-white/[0.08]">
            {/* Accordion 1 */}
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
                </ul>
              )}
            </div>

            {/* Accordion 2 */}
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
                  <li><a href="https://t.me/ogonek_support" target="_blank" rel="noreferrer" className="hover:text-white transition-colors block py-0.5">Telegram-сообщество</a></li>
                </ul>
              )}
            </div>

            {/* Accordion 3 */}
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
                  <li><Link href="/reviews" className="hover:text-white transition-colors block py-0.5">Истории участников (32+)</Link></li>
                  <li><Link href="/manifesto" className="hover:text-white transition-colors block py-0.5">Рекорд платформы 740 дней</Link></li>
                  <li><Link href="/how-it-works#streak" className="hover:text-white transition-colors block py-0.5">Правило «Стрик не сгорает»</Link></li>
                </ul>
              )}
            </div>

            {/* Accordion 4 */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleSection('pricing')}
                className="w-full flex items-center justify-between text-left text-[13px] font-semibold text-[#f5f5f7] py-1"
                aria-expanded={openSections.pricing}
              >
                <span>Открытость</span>
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
                </ul>
              )}
            </div>

            {/* Accordion 5 */}
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
                  <li><Link href="/privacy#modes" className="hover:text-white transition-colors block py-0.5">Публичный или секретный профиль</Link></li>
                  <li><Link href="/ai#privacy-pledge" className="hover:text-white transition-colors block py-0.5 text-blue-400">Zero-Training ИИ</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors block py-0.5">Условия сервиса</Link></li>
                  <li><Link href="/support" className="hover:text-white transition-colors block py-0.5">Центр заботы & FAQ</Link></li>
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. MASTER ROW (CLEAN, NO SYSTEMS STATUS, NO LANGUAGE SELECTOR) ─ */}
        <div className="fade-up delay-250 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-[#f56900]" />
            <span className="font-semibold text-[#f5f5f7]">Priday</span>
            <span className="text-[#424245]">·</span>
            <span className="text-[#6e6e73]">
              © {new Date().getFullYear()} Priday Inc. Все права защищены.
            </span>
          </div>

          <nav aria-label="Юридическая информация" className="flex items-center gap-5 flex-wrap justify-center text-[#86868b]">
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
          </nav>
        </div>

        {/* ── 5. GIANT INTERACTIVE HALFTONE WORDMARK CANVAS (PRIDAY) ──────── */}
        <div
          className="fade-blur delay-300 pt-8 sm:pt-12 pb-2 text-center select-none overflow-hidden relative"
          aria-hidden="true"
        >
          <HalftoneWordmarkCanvas
            wordmark="Priday"
            height="clamp(220px, 28vw, 380px)"
            dotGap={6}
            radius={90}
            crop={0.22}
            grain={0.4}
            interactive={true}
            className="w-full rounded-2xl"
            palette={{
              background: '#050507',
              ink: '#f5f5f7',
              warm: '#f56900',
            }}
          />
        </div>
      </div>
    </footer>
  )
}
