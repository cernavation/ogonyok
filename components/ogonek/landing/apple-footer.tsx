'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowUp } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { HalftoneWordmarkCanvas } from '@/components/ui/halftone-wordmark-footer'
import { type Locale, getLandingContent, getLocaleFromPath } from '@/src/content/i18n'

interface AppleFooterProps {
  locale?: Locale
}

export function AppleFooter({ locale: propLocale }: AppleFooterProps) {
  const pathname = usePathname()
  const activeLocale = propLocale || getLocaleFromPath(pathname)
  const content = getLandingContent(activeLocale)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpenAuth = (mode: 'login' | 'register') => {
    window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode } }))
  }

  const legalHref = activeLocale === 'ru' ? '/legal' : `/legal/${activeLocale}`

  return (
    <footer
      className="relative pt-12 sm:pt-16 pb-8 bg-[#050507] text-[#86868b] text-[12px] border-t border-white/[0.08] overflow-hidden"
      aria-label="Подвал сайта"
    >
      {/* Apple Subtle Ambient Halo in center */}
      <div
        className="apple-ambient-orb w-[700px] h-[350px] bg-[#0071e3]/10 -bottom-24 left-1/2 -translate-x-1/2 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        {/* ── 1. HEADER ROW: BRAND & STYLED ACTION BUTTONS ──────────────────── */}
        <div className="fade-up pb-8 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                <defs>
                  <linearGradient id="appleFlameFooterTop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffa600" />
                    <stop offset="100%" stopColor="#ff6b35" />
                  </linearGradient>
                </defs>
                <path
                  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  fill="url(#appleFlameFooterTop)"
                />
              </svg>
              <h3 className="text-[17px] sm:text-[19px] font-semibold text-white tracking-tight">
                {content.footer?.title || 'Личная летопись побед и дисциплины'}
              </h3>
            </div>
            <p className="text-[13px] text-[#86868b] max-w-[540px] leading-relaxed">
              {content.footer?.tagline || 'Фиксируй настоящие преодоления каждый вечер. Твой путь в Priday принадлежит только тебе.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAuth('register')}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#f56900] to-[#ff8c00] hover:from-[#ff7714] hover:to-[#ffa024] text-white font-semibold text-[13px] shadow-[0_4px_20px_rgba(245,105,0,0.35)] hover:shadow-[0_6px_25px_rgba(245,105,0,0.5)] transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>{content.footer?.ctaBtn || 'Начать летопись'}</span>
              <span className="text-white/80">→</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAuth('login')}
              className="px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-[#f5f5f7] font-medium text-[13px] transition-all active:scale-95 cursor-pointer"
            >
              {content.footer?.signinBtn || 'Войти'}
            </button>

            <button
              type="button"
              onClick={scrollToTop}
              className="px-3.5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[#86868b] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[12px]"
              title="Прокрутить страницу наверх"
            >
              <span>{content.footer?.scrollTop || 'Наверх'}</span>
              <ArrowUp size={13} />
            </button>
          </div>
        </div>

        {/* ── 2. BOTTOM BAR: COPYRIGHT, LEGAL LINK & TELEGRAM ICON ─────────── */}
        <div className="fade-up pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]">
          <div className="flex items-center gap-2 text-[#86868b]">
            <span className="font-medium text-[#f5f5f7]">Priday</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} {content.footer?.copyright || 'Priday Inc. Все права защищены.'}</span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href={legalHref} /* href="/legal" */
              className="text-[#86868b] hover:text-[#d2d2d7] transition-colors text-[12px] underline-offset-4 hover:underline"
            >
              {content.footer?.legalLink || 'Условия и конфиденциальность'}
            </Link>

            {/* Small Telegram Icon Link */}
            <a
              href="https://t.me/ogonek_support"
              target="_blank"
              rel="noreferrer"
              className="text-[#86868b] hover:text-[#2997ff] transition-colors p-1"
              title="Telegram поддержка"
              aria-label="Telegram"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </a>
          </div>
        </div>

        {/* ── 3. GIANT INTERACTIVE HALFTONE WORDMARK CANVAS (PRIDAY) ──────── */}
        <div
          className="fade-blur pt-6 sm:pt-8 pb-2 text-center select-none overflow-hidden relative"
          aria-hidden="true"
        >
          <HalftoneWordmarkCanvas
            wordmark="Priday"
            height="clamp(160px, 22vw, 280px)"
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
