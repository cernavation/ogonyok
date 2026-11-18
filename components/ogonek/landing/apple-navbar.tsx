'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AppleNavbarProps {
  onOpenAuth?: (mode: 'signin' | 'register') => void
}

/* ── Primary direct links visible on desktop ──────────────────────── */
const NAV_LINKS = [
  { label: 'Как это работает', href: '/#how' },
  { label: 'ИИ-наставник', href: '/ai' },
  { label: 'Отзывы', href: '/#quotes' },
  { label: 'Тарифы', href: '/#pricing' },
]

export function AppleNavbar({ onOpenAuth }: AppleNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Apple-grade UX: lock body scroll and support Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
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

  const handleAuthAction = (mode: 'signin' | 'register') => {
    setMobileOpen(false)
    if (onOpenAuth) {
      onOpenAuth(mode)
    } else {
      window.location.href = mode === 'register' ? '/register' : '/login'
    }
  }

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
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 shrink-0" aria-label="Разделы сайта">
          {NAV_LINKS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap text-[13px] tracking-tight transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'text-[#f5f5f7] font-semibold opacity-100'
                    : 'text-[#d2d2d7] opacity-80 hover:opacity-100 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right CTA Actions: Signin + Register */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleAuthAction('signin')}
            className="text-[13px] text-[#d2d2d7] hover:text-[#f5f5f7] transition-colors px-3 py-1.5 cursor-pointer font-normal"
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => handleAuthAction('register')}
            className="apple-btn-primary !px-4 !py-1.5 !text-[12px] !font-medium"
          >
            Начать
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 text-[#f5f5f7] focus:outline-none"
          aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={mobileOpen}
        >
          <span
            className={`block w-4 h-[1.5px] bg-white transition-all duration-200 ${
              mobileOpen ? 'rotate-45 translate-y-[4.5px]' : ''
            }`}
          />
          <span
            className={`block w-4 h-[1.5px] bg-white transition-all duration-200 ${
              mobileOpen ? '-rotate-45 -translate-y-[4.5px]' : ''
            }`}
          />
        </button>
      </div>

      {/* ── MOBILE FULLSCREEN DRAWER ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-12 bottom-0 z-40 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="space-y-6">
            <div className="text-[11px] font-mono tracking-wider uppercase text-[#86868b] px-2">
              Навигация
            </div>
            <nav className="flex flex-col space-y-3">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="text-[18px] font-medium text-white px-2 py-1.5 hover:text-[#2997ff] transition-colors"
              >
                Главная
              </Link>
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-[18px] font-medium text-[#d2d2d7] px-2 py-1.5 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/legal"
                onClick={() => setMobileOpen(false)}
                className="text-[15px] font-normal text-[#86868b] px-2 py-1.5 hover:text-white transition-colors"
              >
                Условия и конфиденциальность
              </Link>
            </nav>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleAuthAction('register')}
              className="apple-btn-primary w-full !py-3.5 !text-[15px] text-center"
            >
              Начать свою летопись
            </button>
            <button
              type="button"
              onClick={() => handleAuthAction('signin')}
              className="w-full py-3 rounded-full bg-white/[0.06] text-white text-[14px] font-medium text-center hover:bg-white/[0.1] transition-colors"
            >
              Войти в аккаунт
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
