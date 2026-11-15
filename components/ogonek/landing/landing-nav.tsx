'use client'

import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'

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
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header
      className="landing-nav fixed top-0 left-0 right-0 z-50 h-12"
      style={{
        background: 'rgba(0, 0, 0, 0.72)',
      }}
    >
      <div className="max-w-[var(--page-max-width)] mx-auto h-full px-5 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 shrink-0" aria-label="Огонёк — на главную">
          <span className="text-lg" aria-hidden="true">🔥</span>
          <span
            className="text-[15px] font-bold tracking-tight"
            style={{ color: 'var(--color-frost-white)' }}
          >
            Огонёк
          </span>
        </a>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Навигация по лендингу">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleNavClick(link.href)}
              className="text-[12px] font-normal cursor-pointer border-none bg-transparent transition-colors hover:opacity-100"
              style={{ color: 'var(--color-frost-white)', opacity: 0.8 }}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right side: login + register + burger */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenAuth('signin')}
            className="text-[12px] font-normal cursor-pointer border-none bg-transparent transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-halo-blue)' }}
          >
            Войти
          </button>

          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="pill-btn pill-btn--primary text-[12px] !py-1.5 !px-4"
          >
            Регистрация
          </button>

          {/* Burger for mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 cursor-pointer border-none bg-transparent"
            style={{ color: 'var(--color-frost-white)' }}
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="md:hidden landing-nav"
          style={{
            background: 'rgba(0, 0, 0, 0.94)',
            borderTop: '1px solid var(--color-graphite)',
          }}
        >
          <nav className="flex flex-col px-5 py-4 gap-4" aria-label="Навигация по лендингу (мобильная)">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleNavClick(link.href)}
                className="text-left text-[15px] font-medium cursor-pointer border-none bg-transparent"
                style={{ color: 'var(--color-frost-white)' }}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
