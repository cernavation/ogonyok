'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AppleNavbar } from './apple-navbar'
import { AppleFooter } from './apple-footer'
import { MediaSlot } from './media-slot'
import { WorksWheel } from '@/components/ui/works-wheel'
import { useScrollReveal } from './use-scroll-reveal'
import { AuthModal } from '../auth/auth-modal'
import type { AuthMode } from '../auth/auth-form'
import { TestimonialGlobe } from '@/components/ui/testimonial-globe'
import { GlowCard } from '@/components/ui/spotlight-card'
import { AiCeremonyShowcase } from './ai-ceremony-showcase'
import { GLOBE_TESTIMONIALS } from './reviews-data'
import {
  HERO_CONTENT,
  PRIDE_WHEEL_CONTENT,
  HOW_IT_WORKS_CONTENT,
  TEMPO_CONTENT,
  AI_ANALYSIS_CONTENT,
  FRIENDS_FAMILY_CONTENT,
  GLOBE_CONTENT,
  PRIVACY_CONTENT,
  FACTS_CONTENT,
  PRICING_CONTENT,
  FINAL_CTA_CONTENT,
} from '@/src/content/landing'

type Props = {
  onNotify?: (msg: string) => void
  onAuthenticated?: (accountId: string) => void
}

export function LandingPage({ onNotify, onAuthenticated }: Props) {
  const containerRef = useScrollReveal()
  const modesTrackRef = React.useRef<HTMLDivElement>(null)
  const [authModal, setAuthModal] = useState<AuthMode | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')

  const openAuth = (mode: AuthMode) => setAuthModal(mode)
  const closeAuth = () => setAuthModal(null)

  return (
    <div className="landing" ref={containerRef}>
      {/* ── Fixed Apple Header ──────────────────────────────────────── */}
      <AppleNavbar onOpenAuth={openAuth} />

      {/* ── Auth Modal ──────────────────────────────────────────────── */}
      {authModal && (
        <AuthModal
          onClose={closeAuth}
          onNotify={(msg) => onNotify?.(msg)}
          initialMode={authModal}
          onAuthenticated={(accountId) => {
            closeAuth()
            onAuthenticated?.(accountId)
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          1. HERO (Кинематографичная видео-витрина)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-[92vh] flex flex-col justify-center items-center overflow-hidden pt-16 pb-20 px-5 sm:px-8 scroll-mt-24 sm:scroll-mt-32"
        aria-label="Главный экран Огонёк"
      >
        {/* Full-width video slot in background */}
        <div className="absolute inset-0 z-0 w-full h-full">
          <MediaSlot
            name={HERO_CONTENT.videoSrc}
            poster="mode-sport.jpg"
            width={2560}
            height={1440}
            ratio="16:9"
            alt="Видео-витрина главного экрана Огонёк"
            priority
            rounded={false}
            fill
            isHero
          />
          <div className="apple-video-overlay" aria-hidden="true" />
        </div>

        {/* Top blue halo accent */}
        <div className="apple-ambient-orb w-[500px] h-[140px] bg-[#0071e3]/20 top-0 left-1/2 -translate-x-1/2 -z-0 pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-20 max-w-[1080px] mx-auto text-center flex flex-col items-center">
          <div className="fade-blur mb-5 sm:mb-6 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="apple-eyebrow">
              {HERO_CONTENT.eyebrow}
            </span>
          </div>

          <h1 className="apple-hero-title apple-hero-shadow fade-blur delay-75 mb-6 sm:mb-8 max-w-[1040px]">
            <span className="inline-block">{HERO_CONTENT.title}</span>
          </h1>

          <p className="apple-body apple-hero-subtitle apple-hero-shadow fade-up delay-150 max-w-[740px] mb-8 sm:mb-10 !text-[#f5f5f7] text-[17px] sm:text-[20px] leading-relaxed font-normal">
            {HERO_CONTENT.subtitle}
          </p>

          <div className="fade-scale delay-200 flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => openAuth('register')}
              className="apple-btn-primary !px-8 !py-3.5 !text-[15px] shadow-[0_0_24px_rgba(0,113,227,0.4)] cursor-pointer"
            >
              {HERO_CONTENT.ctaPrimary}&nbsp;→
            </button>
            <button
              type="button"
              onClick={() => openAuth('signin')}
              className="apple-btn-ghost !px-6 !py-3.5 !text-[15px] cursor-pointer"
            >
              {HERO_CONTENT.ctaSecondary}&nbsp;›
            </button>
          </div>

          <div className="fade-up delay-250 mt-6 text-[12px] font-mono text-[#b0b0b5] apple-hero-shadow tracking-wider">
            {HERO_CONTENT.trustBadge}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          2. «ГОРЖУСЬ ТЕМ, ЧТО…» (Кольцо из 9 карточек)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="modes"
        ref={modesTrackRef}
        className="relative bg-[#0c0c0e] border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        style={{ height: '480vh' }}
        aria-label="Горжусь тем, что"
      >
        <div className="apple-ambient-orb w-[700px] h-[700px] bg-[#0071e3] top-1/2 -right-40 -z-0 opacity-10 pointer-events-none" />

        {/* Section Header */}
        <div className="modes-header-block relative z-20 max-w-[1200px] mx-auto px-5 sm:px-8 pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-24 text-center sm:text-left">
          <div className="fade-up mb-3 sm:mb-4">
            <span className="apple-eyebrow">{PRIDE_WHEEL_CONTENT.eyebrow}</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6 max-w-[920px]">
            {PRIDE_WHEEL_CONTENT.title}
          </h2>
          <p className="apple-body fade-up delay-100 max-w-[680px] text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            {PRIDE_WHEEL_CONTENT.subtitle}
          </p>
        </div>

        {/* Pinned Interactive Wheel */}
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center overflow-visible z-10 px-4 sm:px-8">
          <div className="relative z-20 w-full max-w-[1440px] mx-auto flex-1 flex items-center justify-center min-h-0 overflow-visible">
            <WorksWheel
              items={PRIDE_WHEEL_CONTENT.items}
              label={PRIDE_WHEEL_CONTENT.wheelLabel}
              action="В летопись"
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
        aria-label="Как это работает"
      >
        <div id="showcase" className="scroll-mt-24 sm:scroll-mt-32" />
        <div className="apple-ambient-orb w-[500px] h-[500px] bg-[#f56900] top-1/3 -left-32 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">{HOW_IT_WORKS_CONTENT.eyebrow}</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-6 max-w-[920px]">
            {HOW_IT_WORKS_CONTENT.title}
          </h2>
          <p className="apple-body fade-up delay-100 max-w-[700px] mb-16 sm:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            {HOW_IT_WORKS_CONTENT.subtitle}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Real platform interface preview */}
            <div className="lg:col-span-7 fade-scale delay-150">
              <div className="apple-card apple-card-hover overflow-hidden p-2.5 sm:p-3 bg-[#121214] border border-white/10 shadow-2xl rounded-[24px]">
                <MediaSlot
                  name={HOW_IT_WORKS_CONTENT.interfaceScreenshot}
                  width={1440}
                  height={900}
                  ratio="16:10"
                  alt="Интерфейс дневника Огонёк"
                  rounded={false}
                  priority
                />
              </div>
            </div>

            {/* Right: 3 actionable steps */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              {HOW_IT_WORKS_CONTENT.steps.map((item, idx) => (
                <div
                  key={item.step}
                  className={`fade-slide-left delay-${(idx + 2) * 100} ${
                    idx !== HOW_IT_WORKS_CONTENT.steps.length - 1 ? 'border-b border-white/[0.08] pb-10' : ''
                  }`}
                >
                  <div className="flex items-baseline gap-3.5 mb-2.5">
                    <span className="text-[13px] font-mono text-[#f56900] tracking-wider font-semibold">
                      {item.step}
                    </span>
                    <h3 className="text-[22px] font-semibold tracking-tight text-[#f5f5f7]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[15px] leading-relaxed text-[#86868b] pl-8">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. ТЕМП (Выбор ритма 1–5)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="levels"
        className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Выбор темпа"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4">
            <span className="apple-eyebrow">{TEMPO_CONTENT.eyebrow}</span>
          </div>
          <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
            {TEMPO_CONTENT.title}
          </h2>
          <p className="apple-body fade-up delay-150 max-w-[680px] mb-14 sm:mb-16 md:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            {TEMPO_CONTENT.subtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {TEMPO_CONTENT.levels.map((lvl) => (
              <div
                key={lvl.count}
                onClick={() => openAuth('register')}
                className={`apple-card apple-card-hover fade-up ${lvl.delay} p-5 sm:p-5.5 flex flex-col justify-between cursor-pointer group ${
                  lvl.extreme
                    ? 'apple-card-extreme border-orange-500/30 bg-gradient-to-b from-[#1c1815] to-[#141210] sm:col-span-2 lg:col-span-1'
                    : 'bg-[#161617]'
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
                              ? 'bg-[#f56900] shadow-[0_0_8px_rgba(245,105,0,0.6)]'
                              : 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]'
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
                  <div className="text-[12px] font-medium text-[#f56900] mb-3">
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
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#2997ff] hover:text-[#0071e3] transition-colors cursor-pointer"
            >
              <span>Выбрать свой темп и начать летопись →</span>
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
        aria-label="ИИ-наставник Огонёк"
      >
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[840px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">{AI_ANALYSIS_CONTENT.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              {AI_ANALYSIS_CONTENT.title}
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {AI_ANALYSIS_CONTENT.subtitle}
            </p>
          </div>

          <AiCeremonyShowcase />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6. ДРУЗЬЯ И СЕМЬЯ (Лента, реакции, чаты)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="friends"
        className="py-16 sm:py-20 md:py-28 bg-[#0a0a0c] border-t border-white/[0.06] overflow-hidden scroll-mt-24 sm:scroll-mt-32"
        aria-label="Друзья и семья"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[820px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">{FRIENDS_FAMILY_CONTENT.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6">
              {FRIENDS_FAMILY_CONTENT.title}
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {FRIENDS_FAMILY_CONTENT.subtitle}
            </p>
          </div>

          {/* Screenshot & Feature Cards Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-10">
            {/* Real app screenshot */}
            <div className="lg:col-span-8 fade-scale delay-150">
              <div className="apple-card overflow-hidden p-2 sm:p-3 bg-[#141416] border border-white/10 shadow-2xl rounded-[24px]">
                <img
                  src={FRIENDS_FAMILY_CONTENT.screenshot}
                  alt="Лента друзей, реакции и чаты Огонёк"
                  className="w-full h-auto rounded-[18px] object-cover"
                />
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="lg:col-span-4 flex flex-col gap-4 fade-up delay-200">
              {FRIENDS_FAMILY_CONTENT.features.map((feat, idx) => (
                <div
                  key={feat.title}
                  className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[#f56900]" />
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
                className="apple-btn-primary !py-3.5 !text-[14px] w-full text-center mt-2 cursor-pointer"
              >
                Попробовать вместе с друзьями →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          7. ЗЕМЛЯ (3D Глобус отзывов со всего мира)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="quotes"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Люди по всему миру"
      >
        <TestimonialGlobe
          items={GLOBE_TESTIMONIALS}
          eyebrow={GLOBE_CONTENT.eyebrow}
          heading={GLOBE_CONTENT.title}
          caption={GLOBE_CONTENT.subtitle}
          autoplay
          interval={3600}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          8. ПРИВАТНОСТЬ (Делись или храни в тайне)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="privacy"
        className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Приватность и секретный режим"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="fade-up mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f56900" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="apple-eyebrow">{PRIVACY_CONTENT.eyebrow}</span>
          </div>

          <h2 className="apple-section-title fade-up delay-75 mb-5 sm:mb-6 max-w-[920px]">
            {PRIVACY_CONTENT.title}
          </h2>

          <p className="apple-body fade-up delay-150 max-w-[740px] mb-14 sm:mb-16 md:mb-20 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            {PRIVACY_CONTENT.subtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {PRIVACY_CONTENT.cards.map((card, idx) => (
              <div
                key={card.title}
                className="apple-card apple-card-hover fade-up p-6 sm:p-7 bg-[#161617] flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#a1a1a6]">
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
              href="/legal#privacy"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-[#2997ff] hover:text-[#0071e3] transition-colors"
            >
              <span>{PRIVACY_CONTENT.readMoreText}</span>
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
        aria-label="Факты"
      >
        <div id="open" className="scroll-mt-24 sm:scroll-mt-32" />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[760px] mx-auto mb-14 sm:mb-18 md:mb-20">
            <span className="apple-eyebrow fade-up block mb-4">{FACTS_CONTENT.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              {FACTS_CONTENT.title}
            </h2>
            <p className="apple-body fade-up delay-150 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {FACTS_CONTENT.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1200px] mx-auto">
            {FACTS_CONTENT.facts.map((fact, idx) => (
              <div
                key={fact.label}
                className="apple-card apple-card-hover fade-scale p-8 text-center bg-[#161617] flex flex-col justify-between rounded-[24px]"
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
          10. ТАРИФЫ (Честная подписка)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06] relative scroll-mt-24 sm:scroll-mt-32"
        aria-label="Тарифы и подписка"
      >
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 right-1/4 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[800px] mx-auto mb-12 sm:mb-16">
            <span className="apple-eyebrow fade-up block mb-4">{PRICING_CONTENT.eyebrow}</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6 sm:mb-7">
              {PRICING_CONTENT.title}
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              {PRICING_CONTENT.subtitle}
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
                Ежемесячно
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-[#0071e3] text-white font-semibold shadow-md'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                <span>На год</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white">
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* 3 Tier Cards with Spotlight Glow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto items-stretch">
            {/* TIER 1: FREE */}
            <GlowCard
              glowColor="green"
              customSize
              className="p-8 sm:p-10 flex flex-col justify-between fade-up delay-150"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="text-[12px] font-mono text-[#00c7be] uppercase tracking-wider mb-2 font-semibold">
                    БАЗОВЫЙ ПЛАН
                  </div>
                  <h3 className="text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                    Свободный
                  </h3>
                  <p className="text-[14px] text-[#86868b] mb-6">
                    Для тех, кому нужна точка внутренней опоры и спокойный сон.
                  </p>

                  <div className="mb-8 pb-6 border-b border-white/[0.08]">
                    <span className="text-[44px] font-bold font-sans text-white tabular-nums">
                      0 MDL
                    </span>
                    <span className="text-[14px] text-[#86868b] ml-2">/ навсегда</span>
                  </div>

                  <ul className="space-y-3.5 text-[14px] text-[#f5f5f7]/90 mb-8">
                    <li className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Дневник гордостей и благодарностей</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Стрик, который не сгорает</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Публичный или секретный профиль</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#00c7be] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Защищённые P2P звонки и чаты</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="w-full py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] text-[14px] font-medium transition-all text-center cursor-pointer border border-white/10"
                >
                  Начать бесплатно
                </button>
              </div>
            </GlowCard>

            {/* TIER 2: PRO */}
            <GlowCard
              glowColor="blue"
              customSize
              className="p-8 sm:p-10 flex flex-col justify-between fade-scale delay-200 relative"
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#0071e3] text-white text-[11px] font-semibold tracking-wider uppercase shadow-md z-20">
                ★ Выбор сообщества
              </div>

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="text-[12px] font-mono text-[#2997ff] uppercase tracking-wider mb-2 font-semibold">
                    ПРЕМИУМ ПЛАН
                  </div>
                  <h3 className="text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                    Огонёк Pro
                  </h3>
                  <p className="text-[14px] text-[#86868b] mb-6">
                    Нейросетевой разбор дня и сейф фото-доказательств.
                  </p>

                  <div className="mb-8 pb-6 border-b border-white/[0.08]">
                    <span className="text-[44px] font-bold font-sans text-white tabular-nums">
                      {billingCycle === 'yearly' ? '240 MDL' : '25 MDL'}
                    </span>
                    <span className="text-[14px] text-[#86868b] ml-2">
                      {billingCycle === 'yearly' ? '/ год (~20 MDL/мес)' : '/ месяц'}
                    </span>
                  </div>

                  <ul className="space-y-3.5 text-[14px] text-[#f5f5f7] mb-8">
                    <li className="flex items-center gap-3 font-medium text-[#2997ff]">
                      <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>1 ИИ-оценка летописи в сутки нейросетью</span>
                    </li>
                    <li className="flex items-center gap-3 font-medium text-white">
                      <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Evidence Vault: фото-доказательства побед</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Зашифрованные видеозвонки HD</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#0071e3] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Расширенная аналитика стрика и вех</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="apple-btn-primary w-full !py-3.5 !text-[15px] !font-semibold shadow-[0_0_25px_rgba(0,113,227,0.5)] cursor-pointer"
                >
                  Выбрать Премиум Pro →
                </button>
              </div>
            </GlowCard>

            {/* TIER 3: ULTRA */}
            <GlowCard
              glowColor="orange"
              customSize
              className="p-8 sm:p-10 flex flex-col justify-between fade-up delay-300"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="text-[12px] font-mono text-[#f56900] uppercase tracking-wider mb-2 font-semibold">
                    КЛУБ ОСНОВАТЕЛЕЙ
                  </div>
                  <h3 className="text-[26px] font-bold text-[#f5f5f7] mb-2 tracking-tight">
                    Основатель Ultra
                  </h3>
                  <p className="text-[14px] text-[#86868b] mb-6">
                    Максимальная глубина, золотой статус и прямой вклад в проект.
                  </p>

                  <div className="mb-8 pb-6 border-b border-white/[0.08]">
                    <span className="text-[44px] font-bold font-sans text-white tabular-nums">
                      {billingCycle === 'yearly' ? '480 MDL' : '50 MDL'}
                    </span>
                    <span className="text-[14px] text-[#86868b] ml-2">
                      {billingCycle === 'yearly' ? '/ год (~40 MDL/мес)' : '/ месяц'}
                    </span>
                  </div>

                  <ul className="space-y-3.5 text-[14px] text-[#f5f5f7]/90 mb-8">
                    <li className="flex items-center gap-3 font-medium text-white">
                      <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>До 5 000 символов на запись</span>
                    </li>
                    <li className="flex items-center gap-3 font-medium text-white">
                      <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>До 3 фото в сутки в Evidence Vault</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Глубокие отчёты о вехах (100, 200, 300+ дней)</span>
                    </li>
                    <li className="flex items-center gap-3 text-[#f56900] font-medium">
                      <svg className="w-4 h-4 text-[#f56900] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Золотой статус ⚡ ULTRA FOUNDER</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="w-full py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] text-[14px] font-medium transition-all text-center cursor-pointer border border-white/10"
                >
                  Стать Основателем
                </button>
              </div>
            </GlowCard>
          </div>

          {/* Callout to /ai */}
          <div className="mt-12 p-6 sm:p-8 rounded-[24px] bg-gradient-to-r from-[#0071e3]/15 via-[#00c7be]/10 to-transparent border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 fade-up">
            <div>
              <h4 className="text-[17px] font-semibold text-white tracking-tight">
                Как именно работает нейросетевой наставник?
              </h4>
              <p className="text-[14px] text-[#86868b] mt-1">
                Изучите 4 ключевые задачи ИИ, шкалу преодоления 1–10★ и гарантии Zero-Training.
              </p>
            </div>
            <Link
              href="/ai"
              className="apple-btn-secondary !px-6 !py-3 !text-[14px] whitespace-nowrap shrink-0 hover:bg-white/[0.14] transition-all"
            >
              Подробнее об ИИ Огонёк →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          11. ФИНАЛЬНЫЙ ПРИЗЫВ (Зажги свой огонёк)
          ═══════════════════════════════════════════════════════════ */}
      <section
        id="together"
        className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06] scroll-mt-24 sm:scroll-mt-32"
        aria-label="Финальный призыв к действию"
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="apple-card apple-card-hover fade-scale delay-100 overflow-hidden relative min-h-[500px] sm:min-h-[560px] flex items-center justify-center text-center p-8 sm:p-16 bg-[#121214]">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <MediaSlot
                name={FINAL_CTA_CONTENT.image}
                width={2560}
                height={1100}
                ratio="21:9"
                alt="Зажги свой огонёк"
                rounded={false}
                fill
                isHero
                objectPosition="center 30%"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/60 z-10" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.75)_100%)] z-10 pointer-events-none" />
            </div>

            <div className="apple-ambient-orb w-[500px] h-[500px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-20" />

            {/* Overlaid Banner Content */}
            <div className="relative z-20 max-w-[700px] mx-auto flex flex-col items-center">
              <h2 className="apple-hero-title fade-blur delay-75 mb-5 !text-[34px] sm:!text-[50px] leading-[1.12] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
                {FINAL_CTA_CONTENT.title}
              </h2>
              <p className="apple-body fade-up delay-150 !text-white max-w-[580px] mb-8 text-[17px] sm:text-[19px] leading-relaxed drop-shadow-[0_2px_14px_rgba(0,0,0,0.98)] font-normal">
                {FINAL_CTA_CONTENT.subtitle}
              </p>
              <div className="fade-scale delay-200 flex items-center justify-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold shadow-[0_0_35px_rgba(0,113,227,0.6)] hover:shadow-[0_0_45px_rgba(0,113,227,0.85)] cursor-pointer"
                >
                  {FINAL_CTA_CONTENT.ctaButton} →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Apple Universal Footer ─────────────────────────────────── */}
      <AppleFooter />
    </div>
  )
}
