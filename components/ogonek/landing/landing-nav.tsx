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
          aria-label="Winlog - главная страница"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              fill="#d76737"
            />
          </svg>
          <span className="text-[14px] font-semibold tracking-tight text-[#f5f5f7]">
            Winlog
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
            className="text-[12px] font-normal text-white/75 hover:text-white transition-colors cursor-pointer border-none bg-transparent px-2 py-1"
          >
            Войти
          </button>

          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="inline-flex items-center justify-center rounded-full bg-[#d76737] hover:bg-[#e0784b] active:scale-95 text-black text-[12px] font-semibold px-3.5 py-1 transition-all cursor-pointer border-none"
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

      {/* Mobile Apple Full-Screen Drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-[48px] bottom-0 bg-[#000000] z-50 px-7 py-8 flex flex-col justify-between overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ minHeight: 'calc(100vh - 48px)' }}
        >
          <nav className="flex flex-col gap-5" aria-label="Мобильная навигация">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleNavClick(link.href)}
                className="text-left text-[22px] font-semibold text-[#f5f5f7] tracking-tight hover:text-[#d76737] transition-colors border-none bg-transparent cursor-pointer pb-3 border-b border-white/[0.08]"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="pt-8 pb-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                onOpenAuth('register')
              }}
              className="w-full py-3.5 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black text-[16px] font-semibold text-center cursor-pointer border-none transition-all active:scale-95"
            >
              Регистрация
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                onOpenAuth('signin')
              }}
              className="w-full py-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-[16px] font-medium text-center cursor-pointer transition-all active:scale-95"
            >
              Войти
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
