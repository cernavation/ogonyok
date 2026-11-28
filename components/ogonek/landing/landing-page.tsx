'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { resolveBrowserSession } from '@/lib/ogonek/client-session'
import { syncSupabaseAuthNow } from '@/lib/ogonek/use-ogonek-store'
import { AppleNavbar } from './apple-navbar'
import { AppleFooter } from './apple-footer'
import { MediaSlot } from './media-slot'
import { WorksWheel } from '@/components/ui/works-wheel'
import { useScrollReveal } from './use-scroll-reveal'
import { AuthModal } from '../auth/auth-modal'
import type { AuthMode } from '../auth/auth-form'
import { TestimonialGlobe } from '@/components/ui/testimonial-globe'
import { GlowCard } from '@/components/ui/spotlight-card'
import { AppInterfaceShowcase } from './app-interface-showcase'
import { ProblemSection } from './problem-section'
import { WinlogAiPreview, WinlogFriendsPreview } from './winlog-previews'
import {
  type Locale,
  getLandingContent,
  LOCALIZED_STORIES,
} from '@/src/content/i18n'

type Props = {
  onNotify?: (msg: string) => void
  onAuthenticated?: (accountId: string) => void
  locale?: Locale
}

export function LandingPage({ onNotify, onAuthenticated, locale = 'ru' }: Props) {
  const containerRef = useScrollReveal()
  const modesTrackRef = React.useRef<HTMLDivElement>(null)
  const [authModal, setAuthModal] = useState<AuthMode | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const content = getLandingContent(locale)
  const stories = LOCALIZED_STORIES[locale] || LOCALIZED_STORIES.ru

  // Автоматический перевод авторизованного пользователя в приложение (/app)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const isExplicitLandingView =
      window.location.search.includes('landing=1') ||
      window.location.search.includes('view=landing')
    if (isExplicitLandingView) return

    let active = true
    ;(async () => {
      const synced = await syncSupabaseAuthNow()
      const session = synced ? { authenticated: true } : await resolveBrowserSession()
      if (active && session.authenticated) {
        const search = window.location.search || ''
        window.location.replace(search.includes('view=') ? `/app${search}` : '/app')
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const openAuth = (mode: AuthMode) => setAuthModal(mode)
  const closeAuth = () => setAuthModal(null)

  const aiHref = `/ai/${locale}`
  const legalPrivacyHref = `/legal/${locale}#privacy`

  return (
    <div className="landing" ref={containerRef}>
      {/* ── Fixed Apple Header with Desktop & Mobile Language Switchers ─ */}
      <AppleNavbar onOpenAuth={openAuth} locale={locale} />

      {/* ── Auth Modal ──────────────────────────────────────────────── */}
      {authModal && (
        <AuthModal
          onClose={closeAuth}
          onNotify={(msg) => onNotify?.(msg)}
          initialMode={authModal}
          onAuthenticated={(accountId) => {
            closeAuth()
            if (onAuthenticated) {
              onAuthenticated(accountId)
            } else {
              window.location.href = '/app'
            }
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          1. HERO (Кинематографичная видео-витрина)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-[92vh] flex flex-col justify-center items-center overflow-hidden pt-28 sm:pt-36 md:pt-40 pb-20 sm:pb-28 md:pb-32 px-4 sm:px-6 md:px-8 scroll-mt-24 sm:scroll-mt-32"
        aria-label="Главный экран Winlog"
      >
        {/* Full-width video slot in background */}
        <div className="absolute inset-0 z-0 w-full h-full">
          <MediaSlot
            name={content.hero.videoSrc}
            poster="mode-sport.jpg"
            width={2560}
            height={1440}
            ratio="16:9"
            alt="Видео-витрина главного экрана Winlog"
            priority
            rounded={false}
            fill
            isHero
          />
          <div className="apple-video-overlay" aria-hidden="true" />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-[1080px] mx-auto text-center flex flex-col items-center">
          <div className="fade-blur mb-5 sm:mb-6 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#d76737"
              />
            </svg>
            <span className="apple-eyebrow !text-[#d76737]">
              {content.hero.eyebrow}
            </span>
          </div>

          <h1 className="apple-hero-title apple-hero-shadow fade-blur delay-75 mb-6 sm:mb-8 max-w-[960px] text-wrap-balance">
            {content.hero.title}
          </h1>

          <p className="apple-body apple-hero-subtitle apple-hero-shadow fade-up delay-150 max-w-[720px] mb-8 sm:mb-10 !text-[#f5f5f7] text-[17px] sm:text-[19px] md:text-[20px] leading-[1.38] font-normal text-wrap-balance">
            {content.hero.subtitle}
          </p>

          <div className="fade-scale delay-200 flex items-center justify-center gap-3.5 sm:gap-4 flex-wrap mb-6 sm:mb-8">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="apple-btn-primary !px-7 sm:!px-8 !py-3.5 !text-[15px] cursor-pointer whitespace-nowrap"
            >
              {content.hero.ctaPrimary}&nbsp;→
            </button>
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="apple-btn-ghost !px-6 !py-3.5 !text-[15px] cursor-pointer whitespace-nowrap"
            >
              {content.hero.ctaSecondary}&nbsp;›
            </button>
          </div>

          <div className="fade-up delay-250 text-[12px] sm:text-[13px] font-mono text-[#c7c7cc] apple-hero-shadow tracking-wider px-2">
            {content.hero.trustBadge}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          ПРОБЛЕМА (Мысли кипят, серый шум дней, бег на месте)
          ═══════════════════════════════════════════════════════════ */}
      <ProblemSection locale={locale} />

      {/* ═══════════════════════════════════════════════════════════
          2. «ГОРЖУСЬ ТЕМ, ЧТО…» (Кольцо из 9 карточек)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="modes"
        ref={modesTrackRef}
        className="relative bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        style={{ height: '480vh' }}
        aria-label={content.prideWheel.title}
      >

        {/* Section Header */}
        <div className="modes-header-block relative z-20 max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-24 text-center sm:text-left">
          <div className="fade-up mb-3 sm:mb-4">
            <span className="apple-eyebrow">{content.prideWheel.eyebrow}</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6 max-w-[920px]">
            {content.prideWheel.title}
          </h2>
          <p className="apple-body fade-up delay-100 max-w-[680px] text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            {content.prideWheel.subtitle}
          </p>
        </div>

        {/* Pinned Interactive Wheel */}
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center overflow-visible z-10 px-3 sm:px-6 md:px-8">
          <div className="relative z-20 w-full max-w-[1440px] mx-auto flex-1 flex items-center justify-center min-h-0 overflow-visible">
            <WorksWheel
              items={content.prideWheel.items}
              label={content.prideWheel.wheelLabel}
              action={content.prideWheel.actionText}
              galleryLabel={content.prideWheel.galleryLabel}
              hintLabel={content.prideWheel.hintLabel}
              scrollDownLabel={content.prideWheel.scrollDownLabel}
              trackRef={modesTrackRef}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          3. КАК ЭТО РАБОТАЕТ (Интерфейс)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="how"
        className="relative py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] overflow-hidden scroll-mt-24 sm:scroll-mt-32"
        aria-label={content.howItWorks.title}
      >
        <div id="showcase" className="scroll-mt-24 sm:scroll-mt-32" />

        <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center max-w-[820px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">{content.howItWorks.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              {content.howItWorks.title}
            </h2>
            <p className="apple-body fade-up delay-100 max-w-[700px] mx-auto text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {content.howItWorks.subtitle}
            </p>
          </div>

          {/* Interactive Interface Showcase */}
          <div className="fade-scale delay-150 mb-16 sm:mb-20">
            <AppInterfaceShowcase locale={locale} />
          </div>

          {/* 3 Actionable Ritual Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-[1100px] mx-auto items-stretch">
            {content.howItWorks.steps.map((item) => (
              <div
                key={item.step}
                className="p-6 sm:p-7 bg-[#060608] border border-white/[0.1] rounded-2xl flex flex-col justify-between min-h-[180px]"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[12px] font-mono text-white/75 tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.12]">
                      {item.step}
                    </span>
                    <h3 className="text-[18px] sm:text-[19px] font-semibold text-white tracking-tight">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#86868b]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. ТЕМП (Выбор ритма 1–5)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="levels"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label={content.tempo.title}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">{content.tempo.eyebrow}</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
            {content.tempo.title}
          </h2>
          <p className="apple-body fade-up delay-150 max-w-[680px] mb-12 sm:mb-16 md:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            {content.tempo.subtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">
            {content.tempo.levels.map((lvl) => (
              <div
                key={lvl.count}
                onClick={() => openAuth('register')}
                className={`apple-card-hover fade-up ${lvl.delay} p-5 sm:p-5.5 rounded-2xl border flex flex-col justify-between min-h-[220px] sm:min-h-[240px] cursor-pointer group ${
                  lvl.extreme
                    ? 'border-[#d76737]/40 bg-[#08080a] sm:col-span-2 lg:col-span-1'
                    : 'border-white/[0.1] bg-[#060608]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-3.5 rounded-full transition-all duration-300 ${
                          i < lvl.flames
                            ? lvl.extreme
                              ? 'bg-[#d76737]'
                              : 'bg-white'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>

                  <span className="block text-[38px] font-bold tracking-tight text-[#f5f5f7] leading-none mb-2 font-mono">
                    {lvl.count}
                  </span>
                  <h3 className="text-[17px] font-semibold text-[#f5f5f7] mb-1 tracking-tight leading-snug">
                    {lvl.title}
                  </h3>
                  <div className={`text-[12px] font-medium mb-2.5 ${lvl.extreme ? 'text-[#d76737]' : 'text-white/60'}`}>
                    {lvl.sub}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#86868b] group-hover:text-[#a1a1a6] transition-colors">
                    {lvl.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center fade-up delay-200">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#d76737] hover:text-[#e0784b] transition-colors cursor-pointer"
            >
              <span>{content.tempo.cta}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5. ИИ-АНАЛИЗ (Нейросетевой наставник)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="ai"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] relative scroll-mt-24 sm:scroll-mt-32 overflow-hidden"
        aria-label={content.aiAnalysis.title}
      >
        <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center max-w-[840px] mx-auto mb-10 sm:mb-14">
            <span className="apple-eyebrow fade-up block mb-4">{content.aiAnalysis.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6">
              {content.aiAnalysis.title}
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {content.aiAnalysis.subtitle}
            </p>
          </div>

          {/* Три чистые карточки с монохромными иконками */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-[1040px] mx-auto mb-12 sm:mb-16 items-stretch">
            {content.aiAnalysis.cards.map((card, idx) => (
              <div
                key={card.id}
                className={`fade-up delay-${(idx + 1) * 75} p-6 sm:p-7 rounded-2xl bg-[#060608] border border-white/[0.1] hover:border-white/20 transition-all flex flex-col justify-between group min-h-[190px]`}
              >
                <div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-white/[0.05] border border-white/[0.1] text-white/85 transition-transform group-hover:scale-105">
                    {card.icon === 'TrendingUp' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                        <polyline points="16 7 22 7 22 13" />
                      </svg>
                    )}
                    {card.icon === 'Sparkles' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l1.912 4.986L19 9.898l-4.088 3.002L16.824 18 12 14.544 7.176 18l1.912-5.1L5 9.898l5.088-.912L12 3z" />
                      </svg>
                    )}
                    {card.icon === 'Clock' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                  </div>
                  <h3 className="text-[18px] sm:text-[19px] font-semibold text-white tracking-tight mb-2">
                    {card.title}
                  </h3>
                  <p className="text-[14px] sm:text-[15px] text-[#86868b] leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Живое превью ИИ-аналитики Winlog в окне */}
          <div className="max-w-[1040px] mx-auto fade-scale delay-200">
            <div className="p-2 sm:p-3 rounded-[24px] sm:rounded-[28px] bg-[#060608] border border-white/[0.1] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/[0.06] mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                </div>
                <span className="text-[11px] sm:text-[12px] font-mono text-[#86868b]">
                  {content.aiAnalysis.windowTitle}
                </span>
                <span className="text-[11px] font-mono text-[#d76737]">
                  {content.aiAnalysis.statusBadge}
                </span>
              </div>

              <div className="relative rounded-[16px] sm:rounded-[20px] overflow-hidden bg-black">
                <WinlogAiPreview locale={locale} />
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href={aiHref}
                className="inline-flex items-center gap-2 text-[15px] font-medium text-[#d76737] hover:text-[#e0784b] transition-colors cursor-pointer"
              >
                <span>{content.aiAnalysis.learnMore}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6. ДРУЗЬЯ И СЕМЬЯ (Лента, реакции, чаты)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="friends"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] overflow-hidden scroll-mt-24 sm:scroll-mt-32"
        aria-label={content.friendsFamily.title}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center max-w-[820px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">{content.friendsFamily.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6">
              {content.friendsFamily.title}
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {content.friendsFamily.subtitle}
            </p>
          </div>

          {/* Live Winlog Friends & Chat Preview + Feature Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-10">
            <div className="lg:col-span-8 fade-scale delay-150">
              <WinlogFriendsPreview locale={locale} />
            </div>

            {/* Feature Highlights */}
            <div className="lg:col-span-4 flex flex-col gap-4 fade-up delay-200">
              {content.friendsFamily.features.map((feat) => (
                <div
                  key={feat.title}
                  className="p-5 rounded-2xl bg-[#060608] border border-white/[0.1] hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                    <h3 className="text-[17px] font-semibold text-white tracking-tight">
                      {feat.title}
                    </h3>
                  </div>
                  <p className="text-[14px] text-[#86868b] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}

              <button
                type="button"
                onClick={() => openAuth('register')}
                className="w-full py-3.5 px-6 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black font-semibold text-[14px] text-center mt-2 cursor-pointer transition-all active:scale-95"
              >
                {content.friendsFamily.cta}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          7. ЗЕМЛЯ (Примеры записей со всего мира)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="quotes"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label={content.globe.title}
      >
        <TestimonialGlobe
          items={stories.globeStories as any}
          extraItems={stories.extraStories as any}
          eyebrow={content.globe.eyebrow}
          heading={content.globe.title}
          caption={content.globe.subtitle}
          autoRotate
          rotationSpeed={0.08}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          8. ПРИВАТНОСТЬ (Делись или храни в тайне)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="privacy"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label={content.privacy.title}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="fade-up mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/75" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="apple-eyebrow">{content.privacy.eyebrow}</span>
          </div>

          <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6 max-w-[920px]">
            {content.privacy.title}
          </h2>

          <p className="apple-body fade-up delay-150 max-w-[740px] mb-12 sm:mb-16 md:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            {content.privacy.subtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
            {content.privacy.cards.map((card) => (
              <div
                key={card.title}
                className="apple-card-hover fade-up p-6 sm:p-7 bg-[#060608] border border-white/[0.1] rounded-2xl flex flex-col justify-between min-h-[230px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-[#a1a1a6]">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-semibold text-[#f5f5f7] mb-2.5 tracking-tight leading-snug">
                    {card.title}
                  </h3>
                </div>
                <p className="text-[14px] leading-relaxed text-[#86868b] mt-auto">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center fade-up delay-200">
            <Link
              href={legalPrivacyHref}
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#d76737] hover:text-[#e0784b] transition-colors"
            >
              <span>{content.privacy.readMoreText}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          9. ФАКТЫ (Только проверяемые значения)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="numbers"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label={content.facts.title}
      >
        <div id="open" className="scroll-mt-24 sm:scroll-mt-32" />
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center max-w-[760px] mx-auto mb-14 sm:mb-18 md:mb-20">
            <span className="apple-eyebrow fade-up block mb-4">{content.facts.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              {content.facts.title}
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {content.facts.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1240px] mx-auto items-stretch">
            {content.facts.facts.map((fact) => (
              <div
                key={fact.label}
                className="apple-card-hover fade-scale p-8 text-center bg-[#060608] border border-white/[0.1] flex flex-col justify-between rounded-2xl min-h-[220px]"
              >
                <div>
                  <span className="apple-shimmer-text block text-[42px] sm:text-[50px] font-bold tracking-tight leading-none mb-3 font-mono">
                    {fact.val}
                  </span>
                  <p className="text-[17px] sm:text-[18px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
                    {fact.label}
                  </p>
                </div>
                <p className="text-[14px] leading-relaxed text-[#86868b]">
                  {fact.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          10. ТАРИФЫ (Честная модель навсегда)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] relative scroll-mt-24 sm:scroll-mt-32 overflow-hidden"
        aria-label={content.pricing.title}
      >
        <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center max-w-[800px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">{content.pricing.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6">
              {content.pricing.title}
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {content.pricing.subtitle}
            </p>

            {/* Billing Switcher */}
            <div className="fade-scale delay-150 inline-flex items-center p-1 rounded-full bg-white/[0.06] border border-white/10 mt-8">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                {content.pricing.monthlyToggle}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-[#d76737] text-black font-semibold shadow-md'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                <span>{content.pricing.yearlyToggle}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    billingCycle === 'yearly' ? 'bg-black/15 text-black' : 'bg-white/15 text-white'
                  }`}
                >
                  {content.pricing.saveBadge}
                </span>
              </button>
            </div>
          </div>

          {/* 3 Tier Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 max-w-[1240px] mx-auto items-stretch">
            {/* TIER 1: FREE */}
            <GlowCard
              glowColor="green"
              customSize
              className="p-6 sm:p-9 flex flex-col justify-between fade-up delay-150 lg:min-h-[580px] rounded-2xl bg-[#060608] border border-white/[0.1]"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="text-[12px] font-mono text-white/60 uppercase tracking-wider mb-2 font-semibold">
                    {content.pricing.tiers[0].badge}
                  </div>
                  <h3 className="text-[24px] sm:text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                    {content.pricing.tiers[0].name}
                  </h3>
                  <p className="text-[14px] text-[#86868b] mb-6 sm:min-h-[40px]">
                    {content.pricing.tiers[0].desc}
                  </p>

                  <div className="mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/[0.08] flex items-baseline flex-wrap gap-x-2 gap-y-1">
                    <span className="text-[34px] sm:text-[44px] font-bold font-sans text-white tabular-nums">
                      {content.pricing.tiers[0].priceMonthly}
                    </span>
                    <span className="text-[13px] sm:text-[14px] text-[#86868b]">
                      {content.pricing.tiers[0].period}
                    </span>
                  </div>

                  <ul className="space-y-3 sm:space-y-3.5 text-[14px] text-[#f5f5f7]/90 mb-7 sm:mb-8 lg:min-h-[220px]">
                    {content.pricing.tiers[0].features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-white/70 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="w-full py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] text-[14px] font-semibold transition-all text-center cursor-pointer border border-white/[0.12]"
                >
                  {content.pricing.tiers[0].cta}
                </button>
              </div>
            </GlowCard>

            {/* TIER 2: PRO */}
            <div className="relative h-full">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#d76737] text-black text-[11px] font-semibold tracking-wider uppercase z-20 whitespace-nowrap shadow-[0_6px_20px_rgba(215,103,55,0.28)]">
                {content.pricing.recommendedBadge}
              </div>
              <GlowCard
                glowColor="orange"
                customSize
                className="p-6 sm:p-9 flex flex-col justify-between fade-scale delay-200 relative rounded-2xl bg-[#060608] !border-[#d76737]/60 lg:min-h-[580px] h-full"
              >
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="text-[12px] font-mono text-[#d76737] uppercase tracking-wider mb-2 font-semibold">
                      {content.pricing.tiers[1].badge}
                    </div>
                    <h3 className="text-[24px] sm:text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                      {content.pricing.tiers[1].name}
                    </h3>
                    <p className="text-[14px] text-[#86868b] mb-6 sm:min-h-[40px]">
                      {content.pricing.tiers[1].desc}
                    </p>

                    <div className="mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/[0.08] flex items-baseline flex-wrap gap-x-2 sm:gap-x-2.5 gap-y-1">
                      {billingCycle === 'monthly' && content.pricing.tiers[1].oldPriceMonthly && (
                        <span className="text-[17px] sm:text-[20px] font-medium font-sans text-[#86868b] line-through tabular-nums">
                          {content.pricing.tiers[1].oldPriceMonthly}
                        </span>
                      )}
                      <span className="text-[34px] sm:text-[44px] font-bold font-sans text-white tabular-nums">
                        {billingCycle === 'yearly'
                          ? content.pricing.tiers[1].priceYearly
                          : content.pricing.tiers[1].priceMonthly}
                      </span>
                      <span className="text-[13px] sm:text-[14px] text-[#86868b]">
                        {billingCycle === 'yearly'
                          ? content.pricing.tiers[1].periodYearly
                          : content.pricing.tiers[1].periodMonthly}
                      </span>
                    </div>

                    <ul className="space-y-3 sm:space-y-3.5 text-[14px] text-[#f5f5f7] mb-7 sm:mb-8 lg:min-h-[220px]">
                      {content.pricing.tiers[1].features.map((feat, idx) => (
                        <li key={feat} className={`flex items-center gap-3 ${idx < 2 ? 'font-medium text-white' : ''}`}>
                          <svg className="w-4 h-4 text-[#d76737] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAuth('register')}
                    className="w-full py-3.5 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black text-[15px] font-semibold transition-all text-center cursor-pointer active:scale-95"
                  >
                    {content.pricing.tiers[1].cta}
                  </button>
                </div>
              </GlowCard>
            </div>

            {/* TIER 3: WINLOG ULTRA */}
            <GlowCard
              glowColor="orange"
              customSize
              className="p-6 sm:p-9 flex flex-col justify-between fade-up delay-300 lg:min-h-[580px] rounded-2xl bg-[#060608] border border-white/[0.12]"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="text-[12px] font-mono text-white/75 uppercase tracking-wider mb-2 font-semibold">
                    {content.pricing.tiers[2].badge}
                  </div>
                  <h3 className="text-[24px] sm:text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                    {content.pricing.tiers[2].name}
                  </h3>
                  <p className="text-[14px] text-[#86868b] mb-6 sm:min-h-[40px]">
                    {content.pricing.tiers[2].desc}
                  </p>

                  <div className="mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/[0.08] flex items-baseline flex-wrap gap-x-2 gap-y-1">
                    <span className="text-[34px] sm:text-[44px] font-bold font-sans text-white tabular-nums">
                      {billingCycle === 'yearly'
                        ? content.pricing.tiers[2].priceYearly
                        : content.pricing.tiers[2].priceMonthly}
                    </span>
                    <span className="text-[13px] sm:text-[14px] text-[#86868b]">
                      {billingCycle === 'yearly'
                        ? content.pricing.tiers[2].periodYearly
                        : content.pricing.tiers[2].periodMonthly}
                    </span>
                  </div>

                  <ul className="space-y-3 sm:space-y-3.5 text-[14px] text-[#f5f5f7]/90 mb-7 sm:mb-8 lg:min-h-[220px]">
                    {content.pricing.tiers[2].features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3 font-medium text-white">
                        <svg className="w-4 h-4 text-white/75 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="w-full py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] text-[14px] font-semibold transition-all text-center cursor-pointer border border-white/[0.12] hover:border-white/25"
                >
                  {content.pricing.tiers[2].cta}
                </button>
              </div>
            </GlowCard>
          </div>

          {/* Callout to /ai */}
          <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-[#060608] border border-white/[0.1] flex flex-col sm:flex-row items-center justify-between gap-6 fade-up">
            <div>
              <h4 className="text-[17px] font-semibold text-white tracking-tight">
                {content.pricing.aiCalloutTitle}
              </h4>
              <p className="text-[14px] text-[#86868b] mt-1">
                {content.pricing.aiCalloutDesc}
              </p>
            </div>
            <Link
              href={aiHref}
              className="apple-btn-secondary !px-6 !py-3 !text-[14px] whitespace-nowrap shrink-0 hover:bg-white/[0.14] transition-all"
            >
              {content.pricing.aiCalloutBtn}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          11. ФИНАЛЬНЫЙ ПРИЗЫВ (Начни свой Winlog)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="together"
        className="relative w-full min-h-[420px] sm:min-h-[560px] md:min-h-[640px] flex items-center justify-center text-center overflow-hidden bg-black px-4 sm:px-6 md:px-8 py-16 sm:py-24 md:py-28 scroll-mt-24 sm:scroll-mt-32"
        aria-label={content.finalCta.title}
      >
        {/* Full-bleed Background Image */}
        <div className="absolute inset-0 z-0 w-full h-full">
          <MediaSlot
            name={content.finalCta.image}
            width={2560}
            height={1100}
            ratio="21:9"
            alt={content.finalCta.title}
            rounded={false}
            fill
            isHero
            objectPosition="58% 35%"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/80 z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.72)_100%)] z-10 pointer-events-none" />
        </div>

        {/* Overlaid Banner Content */}
        <div className="relative z-20 max-w-[700px] mx-auto flex flex-col items-center">
          <h2 className="apple-hero-title fade-blur delay-75 mb-5 !text-[34px] sm:!text-[52px] leading-[1.12] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            {content.finalCta.title}
          </h2>
          <p className="apple-body fade-up delay-150 !text-white max-w-[580px] mb-8 text-[17px] sm:text-[19px] leading-relaxed drop-shadow-[0_2px_14px_rgba(0,0,0,0.98)] font-normal">
            {content.finalCta.subtitle}
          </p>
          <div className="fade-scale delay-200 flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold cursor-pointer"
            >
              {content.finalCta.ctaButton} →
            </button>
          </div>
        </div>
      </section>

      {/* ── Apple Universal Footer with Language Link ───────────────── */}
      <AppleFooter locale={locale} />
    </div>
  )
}
