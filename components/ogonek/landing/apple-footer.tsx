'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowUp, Mail } from 'lucide-react'
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
      className="relative pt-12 sm:pt-16 pb-8 bg-black text-[#86868b] text-[12px] border-t border-white/[0.08] overflow-hidden"
      aria-label="Подвал сайта"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        {/* ── 1. HEADER ROW: BRAND & STYLED ACTION BUTTONS ──────────────────── */}
        <div className="fade-up pb-8 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                <path
                  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  fill="#d76737"
                />
              </svg>
              <h3 className="text-[17px] sm:text-[19px] font-semibold text-white tracking-tight">
                {content.footer?.title || 'Личная летопись побед и дисциплины'}
              </h3>
            </div>
            <p className="text-[13px] text-[#86868b] max-w-[540px] leading-relaxed">
              {content.footer?.tagline || 'Фиксируй настоящие преодоления каждый вечер. Твой путь в Winlog принадлежит только тебе.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAuth('register')}
              className="px-5 py-2.5 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black font-semibold text-[13px] transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>{content.footer?.ctaBtn || 'Начать летопись'}</span>
              <span>→</span>
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
            <span className="font-medium text-[#f5f5f7]">Winlog</span>
            <span>·</span>
            <span>{content.footer?.copyright || `© ${new Date().getFullYear()} Winlog. Все права защищены.`}</span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href={legalHref} /* href="/legal" */
              className="text-[#86868b] hover:text-[#d2d2d7] transition-colors text-[12px] underline-offset-4 hover:underline"
            >
              {content.footer?.legalLink || 'Условия и конфиденциальность'}
            </Link>

            {/* Support Email Link */}
            <a
              href="mailto:support@winlog.life"
              className="text-[#86868b] hover:text-[#d76737] transition-colors min-w-[40px] min-h-[40px] inline-flex items-center justify-center -mr-2"
              title="support@winlog.life"
              aria-label="Support"
            >
              <Mail size={16} />
            </a>
          </div>
        </div>

        {/* ── 3. GIANT INTERACTIVE HALFTONE WORDMARK CANVAS (WINLOG) ──────── */}
        <div
          className="fade-blur pt-6 sm:pt-8 pb-2 text-center select-none overflow-hidden relative"
          aria-hidden="true"
        >
          <HalftoneWordmarkCanvas
            wordmark="Winlog"
            height="clamp(160px, 22vw, 280px)"
            dotGap={6}
            radius={90}
            crop={0.22}
            grain={0.4}
            interactive={true}
            className="w-full rounded-2xl"
            palette={{
              background: '#000000',
              ink: '#f5f5f7',
              warm: '#d76737',
            }}
          />
        </div>
      </div>
    </footer>
  )
}
