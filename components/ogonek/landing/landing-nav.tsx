'use client'

import React, { useState } from 'react'

interface LandingNavProps {
  onOpenAuth: (mode: 'signin' | 'register') => void
}

const NAV_LINKS = [
  { label: 'Как это работает', href: '#how' },
  { label: 'Режимы', href: '#modes' },
  { label: 'Уровни', href: '#levels' },
  { label: 'Приватность', href: '#privacy' },
]

export function LandingNav({ onOpenAuth }: LandingNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNavClick = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) {
      const topOffset = 64
      const elementPosition = el.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - topOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-12 transition-all duration-300"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="max-w-[1024px] mx-auto h-full px-5 flex items-center justify-between">
        {/* Apple-style Logo with Project SVG Flame */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="flex items-center gap-2 group transition-opacity hover:opacity-85"
          aria-label="Огонёк — главная страница"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <defs>
              <linearGradient id="appleFlameNav" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffa600" />
                <stop offset="100%" stopColor="#ff6b35" />
              </linearGradient>
            </defs>
            <path
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              fill="url(#appleFlameNav)"
            />
          </svg>
          <span className="text-[14px] font-semibold tracking-tight text-[#f5f5f7]">
            Огонёк
          </span>
        </a>

        {/* Center Desktop Links */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Разделы лендинга">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleNavClick(link.href)}
              className="text-[12px] font-normal text-[#d2d2d7] opacity-80 hover:opacity-100 hover:text-white transition-all cursor-pointer border-none bg-transparent tracking-tight"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenAuth('signin')}
            className="text-[12px] font-normal text-[#2997ff] hover:text-[#6cb4ff] transition-colors cursor-pointer border-none bg-transparent px-2 py-1"
          >
            Войти
          </button>

          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="inline-flex items-center justify-center rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 text-white text-[12px] font-medium px-3.5 py-1 transition-all shadow-sm cursor-pointer border-none"
          >
            Регистрация
          </button>

          {/* Minimalist Apple-style Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 cursor-pointer border-none bg-transparent text-[#f5f5f7] p-1"
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

      {/* Mobile Glass Dropdown */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-white/[0.08] px-6 py-6 flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'saturate(180%) blur(30px)',
            WebkitBackdropFilter: 'saturate(180%) blur(30px)',
          }}
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleNavClick(link.href)}
              className="text-left text-[17px] font-medium text-[#f5f5f7] tracking-tight hover:text-[#0071e3] transition-colors border-none bg-transparent cursor-pointer py-1"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
