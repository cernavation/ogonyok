'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'
import { MODES } from '@/components/ogonek/landing/apple-modes-panel'

export default function ModesPage() {
  const containerRef = useScrollReveal()
  const [selectedModeId, setSelectedModeId] = useState<string>('sport')

  const currentMode = MODES.find((m) => m.id === selectedModeId) || MODES[0]

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-5 sm:px-8 bg-black text-center overflow-hidden">
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[900px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#f56900"
              />
            </svg>
            <span className="apple-eyebrow">Баланс жизненной энергии</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6">
            Четыре сферы жизни.
            <br />
            <span className="apple-shimmer-text">Никаких перекосов.</span>
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[640px] mb-8 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Настоящая сила заключается в гармонии. Успех в бизнесе не должен стоить здоровья или разрушенных отношений с близкими.
          </p>

          {/* Mode Selector Tabs */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            {MODES.map((mode) => {
              const isActive = selectedModeId === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedModeId(mode.id)}
                  className={`px-5 py-2.5 rounded-full text-[14px] font-medium transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-white text-black border-white shadow-xl scale-105'
                      : 'bg-white/[0.05] text-[#a1a1a6] border-white/[0.08] hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  {mode.title}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── ACTIVE MODE SHOWCASE ──────────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Photos preview */}
            <div className="lg:col-span-7">
              <div className="apple-card overflow-hidden p-3 bg-[#161617] border border-white/10 relative">
                <div className="aspect-[16/9] w-full rounded-[22px] overflow-hidden relative bg-[#222]">
                  <img
                    src={`/media/landing/${currentMode.images[0]}`}
                    alt={currentMode.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white">
                    {currentMode.title} · {currentMode.images.length} фото
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Mode details & examples */}
            <div className="lg:col-span-5">
              <span className="apple-eyebrow block mb-3">{currentMode.label}</span>
              <h2 className="text-[32px] sm:text-[40px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
                {currentMode.title}
              </h2>
              <p className="text-[17px] text-[#f5f5f7]/90 mb-4 leading-relaxed font-medium">
                {currentMode.oneLiner}
              </p>
              <p className="text-[15px] text-[#86868b] leading-relaxed mb-8">
                {currentMode.detail}
              </p>

              <div className="p-6 rounded-2xl bg-[#161617] border border-white/[0.08] mb-8">
                <div className="text-xs font-mono uppercase text-[#f56900] mb-3 tracking-wider">
                  Примеры формулировок побед:
                </div>
                <ul className="space-y-2.5 text-[14px] text-[#f5f5f7]">
                  {selectedModeId === 'sport' && (
                    <>
                      <li>✓ Пробежал 7 км по первому снегу в темпе 5:10</li>
                      <li>✓ Сделал суставную разминку вместо того, чтобы пропустить</li>
                      <li>✓ Восстановил сон: 8 часов без телефона перед сном</li>
                    </>
                  )}
                  {selectedModeId === 'work' && (
                    <>
                      <li>✓ Защитил новую архитектуру перед инвесторами</li>
                      <li>✓ Закрыл сложный баг, который висел две недели</li>
                      <li>✓ Честно отказал токсичному клиенту, сберёг команду</li>
                    </>
                  )}
                  {selectedModeId === 'creative' && (
                    <>
                      <li>✓ Написал 1 200 слов чистового текста второй главы</li>
                      <li>✓ Закончил цветовую палитру для нового брендинга</li>
                      <li>✓ Провёл 2 часа за фортепиано без отвлечений на почту</li>
                    </>
                  )}
                  {selectedModeId === 'family' && (
                    <>
                      <li>✓ Спокойно и с любовью уложил детей без крика</li>
                      <li>✓ Приготовил романтический ужин для супруги</li>
                      <li>✓ Позвонил родителям и выслушал их без спешки</li>
                    </>
                  )}
                </ul>
              </div>

              <Link href="/register" className="apple-btn-primary !px-7 !py-3 !text-[14px]">
                Начать вести режим «{currentMode.label}» ›
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 MODES OVERVIEW GRID ─────────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[600px] mx-auto mb-16">
            <span className="apple-eyebrow block mb-3">Каталог</span>
            <h2 className="apple-section-title mb-4">Все 4 направления</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MODES.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedModeId(m.id)}
                className={`apple-card apple-card-hover p-6 bg-[#161617] cursor-pointer transition-all border ${
                  selectedModeId === m.id ? 'border-[#0071e3] shadow-[0_0_25px_rgba(0,113,227,0.25)]' : 'border-white/[0.08]'
                }`}
              >
                <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-[#222]">
                  <img
                    src={`/media/landing/${m.images[0]}`}
                    alt={m.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-[17px] font-semibold text-[#f5f5f7] mb-1.5">{m.title}</h4>
                <p className="text-[13px] text-[#86868b] leading-relaxed">{m.oneLiner}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
