'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AppleNavbarProps {
  onOpenAuth?: (mode: 'signin' | 'register') => void
}

const NAV_ITEMS = [
  { label: 'О платформе', href: '/platform' },
  { label: 'Примеры гордостей', href: '/examples' },
  { label: 'ИИ-наставник', href: '/ai' },
  { label: 'Как это работает', href: '/how-it-works' },
  { label: 'Открытость', href: '/#open' },
  { label: 'Тарифы', href: '/#pricing' },
  { label: 'Отзывы (30+)', href: '/reviews' },
  { label: 'Манифест', href: '/manifesto' },
  { label: 'Поддержка', href: '/support' },
]

export function AppleNavbar({ onOpenAuth }: AppleNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Apple-grade UX: lock body scroll and support Escape key when drawer is open
  useEffect(() => {
    if (!mobileOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileOpen])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-12 transition-all duration-300"
      style={{
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="max-w-[1200px] mx-auto h-full px-5 sm:px-8 flex items-center justify-between">
        {/* Apple-style Logo with Project SVG Flame */}
        <Link
          href="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-85 select-none"
          aria-label="Огонёк — главная страница"
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
            Огонёк
          </span>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6" aria-label="Разделы сайта">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[12px] tracking-tight transition-all duration-200 ${
                  isActive
                    ? 'text-[#f5f5f7] font-semibold opacity-100'
                    : 'text-[#d2d2d7] opacity-75 hover:opacity-100 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2.5 sm:gap-3">
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
            className="lg:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 cursor-pointer border-none bg-transparent text-[#f5f5f7] p-1"
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

      {/* Mobile Apple Full-Screen Drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-[48px] bottom-0 bg-[#000000] z-50 px-7 py-8 flex flex-col justify-between overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ minHeight: 'calc(100vh - 48px)' }}
        >
          <nav className="flex flex-col gap-4" aria-label="Мобильная навигация">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="text-left text-[20px] font-semibold text-[#f5f5f7] tracking-tight hover:text-[#2997ff] transition-colors pb-3 border-b border-white/[0.08]"
            >
              Главная
            </Link>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="text-left text-[20px] font-semibold text-[#f5f5f7] tracking-tight hover:text-[#2997ff] transition-colors pb-3 border-b border-white/[0.08]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="pt-8 pb-4 flex flex-col gap-3">
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="w-full py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[16px] font-medium text-center shadow-lg cursor-pointer border-none transition-all active:scale-95"
            >
              Начать бесплатно
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="w-full py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] text-[15px] font-medium text-center transition-all"
            >
              Войти в существующий аккаунт
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
