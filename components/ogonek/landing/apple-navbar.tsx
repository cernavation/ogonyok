'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AppleNavbarProps {
  onOpenAuth?: (mode: 'signin' | 'register') => void
}

/* ── Primary direct links visible on desktop ──────────────────────── */
const PRIMARY_NAV = [
  { label: 'Платформа', href: '/platform' },
  { label: 'Примеры', href: '/examples' },
  { label: 'ИИ-наставник', href: '/ai' },
  { label: 'Сообщество', href: '/community' },
  { label: 'Ритуал', href: '/how-it-works' },
  { label: 'Тарифы', href: '/#pricing' },
  { label: 'Отзывы', href: '/reviews' },
]

/* ── Secondary links accessible via desktop «Ещё ▾» dropdown ──────── */
const MORE_NAV = [
  { label: 'Манифест открытости', href: '/#open', sub: '100% бесплатно и без рекламы' },
  { label: 'Сферы жизни', href: '/modes', sub: '5 жизненных опор без перекосов' },
  { label: 'Манифест 740 дней', href: '/manifesto', sub: 'Рекорд стрика и сила ритуала' },
  { label: 'Приватность и секретный режим', href: '/privacy', sub: 'Публичный или закрытый профиль' },
  { label: 'Поддержка & FAQ', href: '/support', sub: 'Ответы и связь с основателем' },
  { label: 'Условия сервиса', href: '/terms', sub: 'Честные прозрачные правила' },
]

/* ── Structured groups for Apple mobile drawer ────────────────────── */
const MOBILE_SECTIONS = [
  {
    category: 'ИНСТРУМЕНТЫ ЛЕТОПИСЦА',
    items: [
      { label: 'Платформа', href: '/platform', sub: 'Возможности и Evidence Vault' },
      { label: 'Примеры гордостей', href: '/examples', sub: 'Формула 3 элементов и шкала 10★' },
      { label: 'ИИ-наставник', href: '/ai', sub: 'Google Gemini и преодоление' },
      { label: 'Сообщество и клубы', href: '/community', sub: 'Напарники по хобби и сторис' },
    ],
  },
  {
    category: 'ПРАКТИКА И ДИСЦИПЛИНА',
    items: [
      { label: 'Вечерний ритуал', href: '/how-it-works', sub: '5 минут тишины перед сном' },
      { label: 'Сферы жизни', href: '/modes', sub: 'Баланс без выгорания' },
      { label: 'Истории участников', href: '/reviews', sub: '32+ проверенных опыта' },
      { label: 'Манифест 740 дней', href: '/manifesto', sub: 'Философия личной силы' },
    ],
  },
  {
    category: 'ДОВЕРИЕ И ПРАВИЛА',
    items: [
      { label: 'Манифест открытости', href: '/#open', sub: 'Бесплатно навсегда и без рекламы' },
      { label: 'Тарифные планы', href: '/#pricing', sub: 'Свободный · Pro · Ultra' },
      { label: 'Приватность и секретный режим', href: '/privacy', sub: 'Публичный или закрытый профиль' },
      { label: 'Поддержка и FAQ', href: '/support', sub: 'Связь с создателем Priday' },
      { label: 'Условия сервиса', href: '/terms', sub: 'Прозрачные гарантии' },
    ],
  },
]

export function AppleNavbar({ onOpenAuth }: AppleNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const pathname = usePathname()
  const moreRef = useRef<HTMLDivElement>(null)

  // Apple-grade UX: lock body scroll and support Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setMoreOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    if (mobileOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = prevOverflow
      }
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  // Close desktop "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-12 transition-all duration-300"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="max-w-[1200px] mx-auto h-full px-5 sm:px-8 flex items-center justify-between">
        {/* Apple-style Logo with Project SVG Flame */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-85 select-none shrink-0"
          aria-label="Priday — главная страница"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <defs>
              <linearGradient id="appleFlameNavbar" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffa600" />
                <stop offset="100%" stopColor="#ff6b35" />
              </linearGradient>
            </defs>
            <path
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              fill="url(#appleFlameNavbar)"
            />
          </svg>
          <span className="text-[14px] font-semibold tracking-tight text-[#f5f5f7]">
            Priday
          </span>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6 shrink-0" aria-label="Разделы сайта">
          {PRIMARY_NAV.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap text-[12px] tracking-tight transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'text-[#f5f5f7] font-semibold opacity-100'
                    : 'text-[#d2d2d7] opacity-75 hover:opacity-100 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}

          {/* Desktop «Ещё ▾» Flyout Dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={`whitespace-nowrap text-[12px] tracking-tight transition-all duration-200 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 ${
                moreOpen
                  ? 'text-white font-semibold opacity-100'
                  : 'text-[#d2d2d7] opacity-75 hover:opacity-100 hover:text-white'
              }`}
              aria-expanded={moreOpen}
              aria-haspopup="true"
            >
              <span>Ещё</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {moreOpen && (
              <div
                className="absolute top-8 left-1/2 -translate-x-1/2 w-[280px] p-2 rounded-2xl bg-[#161617]/95 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                style={{
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="space-y-0.5">
                  {MORE_NAV.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      onClick={() => setMoreOpen(false)}
                      className="block p-2.5 rounded-xl hover:bg-white/[0.08] transition-colors group text-left"
                    >
                      <span className="text-[13px] font-semibold text-white block group-hover:text-[#2997ff] transition-colors">
                        {subItem.label}
                      </span>
                      <span className="text-[11px] text-[#86868b] block mt-0.5 truncate">
                        {subItem.sub}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {onOpenAuth ? (
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="text-[12px] font-normal text-[#2997ff] hover:text-[#6cb4ff] transition-colors cursor-pointer border-none bg-transparent px-2 py-1"
            >
              Войти
            </button>
          ) : (
            <Link
              href="/login"
              className="text-[12px] font-normal text-[#2997ff] hover:text-[#6cb4ff] transition-colors cursor-pointer px-2 py-1"
            >
              Войти
            </Link>
          )}

          {onOpenAuth ? (
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="inline-flex items-center justify-center rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 text-white text-[12px] font-medium px-3.5 py-1 transition-all shadow-sm cursor-pointer border-none"
            >
              Начать
            </button>
          ) : (
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 text-white text-[12px] font-medium px-3.5 py-1 transition-all shadow-sm cursor-pointer border-none"
            >
              Начать
            </Link>
          )}

          {/* Minimalist Apple-style Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 cursor-pointer border-none bg-transparent text-[#f5f5f7] p-1 ml-1"
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            <span
              className={`block w-4 h-0.5 bg-current transition-transform duration-300 ${
                mobileOpen ? 'rotate-45 translate-y-1' : ''
              }`}
            />
            <span
              className={`block w-4 h-0.5 bg-current transition-transform duration-300 ${
                mobileOpen ? '-rotate-45 -translate-y-1' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── MOBILE APPLE HIGH-END DRAWER ──────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-[48px] bottom-0 bg-black/98 z-50 px-5 sm:px-8 py-6 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-300 backdrop-blur-2xl"
          style={{ minHeight: 'calc(100vh - 48px)' }}
        >
          <div className="space-y-6">
            {/* Quick Home Pill */}
            <div className="pb-3 border-b border-white/[0.08] flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2"
              >
                <span>🔥</span>
                <span>Главная страница</span>
              </Link>
              <span className="text-[11px] font-mono text-[#00c7be] uppercase">
                Priday 2026
              </span>
            </div>

            {/* Categorized Apple Directory */}
            {MOBILE_SECTIONS.map((section) => (
              <div key={section.category} className="space-y-2">
                <div className="text-[11px] font-mono text-[#86868b] uppercase tracking-wider px-1">
                  {section.category}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-white/[0.12] text-white font-semibold'
                            : 'bg-white/[0.03] text-[#f5f5f7] hover:bg-white/[0.08]'
                        }`}
                      >
                        <div>
                          <div className="text-[15px] font-medium tracking-tight">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-[#86868b] mt-0.5">
                            {item.sub}
                          </div>
                        </div>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-[#86868b]"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action Footer inside Drawer */}
          <div className="pt-8 pb-4 mt-8 border-t border-white/[0.08] flex flex-col gap-3">
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="w-full py-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-semibold text-center shadow-lg cursor-pointer border-none transition-all active:scale-95 block"
            >
              Создать летопись силы →
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="w-full py-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#f5f5f7] text-[14px] font-medium text-center transition-all block border border-white/5"
            >
              Войти в существующий профиль
            </Link>
            <div className="text-center text-[11px] font-mono text-[#86868b] pt-1">
              Публичный или секретный профиль · Без рекламы и трекеров
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
