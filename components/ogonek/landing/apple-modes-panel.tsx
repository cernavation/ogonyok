'use client'

import React, { useState } from 'react'
import { MediaSlot } from './media-slot'

export interface LifeMode {
  id: string
  label: string
  title: string
  image: string
  oneLiner: string
  detail: string
}

export const MODES: LifeMode[] = [
  {
    id: 'sport',
    label: 'Спорт',
    title: 'Спорт и тело',
    image: 'mode-sport.jpg',
    oneLiner: 'Тренировки, забеги, личные рекорды и восстановление.',
    detail: 'Фиксируй каждый пройденный километр, поднятый вес и преодоление лени в дни, когда не хотелось выходить на пробежку. Тело помнит каждую победу.',
  },
  {
    id: 'work',
    label: 'Работа',
    title: 'Работа и фокус',
    image: 'mode-work.jpg',
    oneLiner: 'Дедлайны, переговоры, запуски и карьерные победы.',
    detail: 'Закрытые спринты, сложные решения под давлением и завершённые проекты. Твоя профессиональная летопись без офисной суеты и пустого шума.',
  },
  {
    id: 'creative',
    label: 'Творчество',
    title: 'Творчество и идеи',
    image: 'mode-creative.jpg',
    oneLiner: 'Музыка, рисование, писательство и сценические выступления.',
    detail: 'Преодоление страха чистого листа, часы репетиций и первый завершённый черновик. Доказательство того, что вдохновение рождается из дисциплины.',
  },
  {
    id: 'family',
    label: 'Семья',
    title: 'Семья и дом',
    image: 'mode-family.jpg',
    oneLiner: 'Время вместе, поддержка, воспитание и семейные традиции.',
    detail: 'Тёплые вечера, терпение в трудные моменты и искренняя забота о близких. Самые важные победы в жизни, которые чаще всего остаются незамеченными.',
  },
]

export function AppleModesPanel() {
  // activeIndex: 0..3 for active mode, or null for all collapsed
  const [activeIndex, setActiveIndex] = useState<number | null>(0)

  const activeMode = activeIndex !== null ? MODES[activeIndex] : MODES[0]
  const isExpanded = activeIndex !== null

  const handleSelect = (idx: number) => {
    setActiveIndex(idx)
  }

  const handleClose = () => {
    setActiveIndex(null)
  }

  const handlePrev = () => {
    if (activeIndex !== null && activeIndex > 0) {
      setActiveIndex(activeIndex - 1)
    }
  }

  const handleNext = () => {
    if (activeIndex !== null && activeIndex < MODES.length - 1) {
      setActiveIndex(activeIndex + 1)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* ── Left Column: Big Rounded Photo Stage ─────────────────── */}
      <div className="lg:col-span-7 fade-up">
        <div className="apple-card overflow-hidden p-2 sm:p-3 bg-[#161617] relative">
          {/* Subtle transition wrapper for active mode photo */}
          <div key={activeMode.id} className="animate-in fade-in duration-500">
            <MediaSlot
              name={activeMode.image}
              width={1920}
              height={1080}
              ratio="16:9"
              alt={`Режим: ${activeMode.label}`}
              rounded={true}
            />
          </div>

          {/* Bottom badge indicating current mode on photo */}
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs">
            <span className="w-2 h-2 rounded-full bg-[#f56900] animate-pulse" />
            <span className="font-medium">{activeMode.title}</span>
          </div>
        </div>
      </div>

      {/* ── Right Column: Apple Interactive Accordion & Controls ─── */}
      <div className="lg:col-span-5 fade-up relative">
        <div className={`apple-panel-wrapper relative flex flex-col gap-3.5 ${isExpanded ? 'is-expanded' : ''}`}>
          
          {/* Top header inside panel with Controls (Arrows + Close) */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
              {isExpanded ? 'Режим активен' : 'Выберите сферу жизни'}
            </span>

            {/* Navigation Buttons Cluster (Mac / Apple Watch Style) */}
            {isExpanded && (
              <div className="flex items-center gap-2 animate-in fade-in duration-300">
                {/* Arrow Up / Prev */}
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={activeIndex === 0}
                  className={`w-8 h-8 rounded-full bg-[rgba(40,40,42,0.6)] backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer hover:bg-[rgba(80,80,82,0.7)] ${
                    activeIndex === 0 ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'hover:scale-105 active:scale-95'
                  }`}
                  aria-label="Предыдущий режим"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                </button>

                {/* Arrow Down / Next */}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={activeIndex === MODES.length - 1}
                  className={`w-8 h-8 rounded-full bg-[rgba(40,40,42,0.6)] backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer hover:bg-[rgba(80,80,82,0.7)] ${
                    activeIndex === MODES.length - 1 ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'hover:scale-105 active:scale-95'
                  }`}
                  aria-label="Следующий режим"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Close Button (X) */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-[rgba(40,40,42,0.6)] backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer hover:bg-[rgba(80,80,82,0.7)] hover:scale-105 active:scale-95 ml-1"
                  aria-label="Свернуть режим"
                  title="Свернуть карточку"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* List of Mode Items (Pill View or Expanded Card View) */}
          <div className="flex flex-col gap-3">
            {MODES.map((mode, idx) => {
              const isActive = activeIndex === idx

              if (isActive) {
                // ── Expanded Apple Glass Card View ──────────────────
                return (
                  <div
                    key={mode.id}
                    className="relative rounded-[24px] bg-[rgba(30,30,32,0.75)] backdrop-blur-xl border border-white/15 p-6 shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]" />
                        <span className="text-[14px] font-semibold tracking-wider uppercase text-[#0071e3]">
                          {mode.label}
                        </span>
                      </div>
                      <span className="text-[12px] font-mono text-white/40">
                        0{idx + 1} / 0{MODES.length}
                      </span>
                    </div>

                    <div className="text-[15px] leading-relaxed text-[#a1a1a6]">
                      <strong className="text-white font-semibold block text-[17px] mb-1.5 tracking-tight">
                        {mode.oneLiner}
                      </strong>
                      <p className="text-[14px] leading-relaxed text-[#a1a1a6]">
                        {mode.detail}
                      </p>
                    </div>
                  </div>
                )
              }

              // ── Collapsed Apple Glass Pill View ─────────────────
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  className="group flex items-center justify-between w-full h-[50px] px-5 rounded-full bg-[rgba(30,30,32,0.5)] hover:bg-[rgba(44,44,46,0.65)] backdrop-blur-md border border-white/[0.08] hover:border-white/20 transition-all duration-300 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* Circle with Plus Icon */}
                    <div className="w-5 h-5 rounded-full border border-white/40 group-hover:border-white/80 group-hover:rotate-90 flex items-center justify-center text-white/70 group-hover:text-white transition-all duration-300 shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                    <span className="text-[15px] font-medium text-white tracking-tight">
                      {mode.label}
                    </span>
                  </div>

                  <span className="text-[12px] font-mono text-white/30 group-hover:text-white/60 transition-colors">
                    0{idx + 1}
                  </span>
                </button>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
