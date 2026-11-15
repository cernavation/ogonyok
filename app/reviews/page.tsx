'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'
import { ALL_REVIEWS, REVIEWS_CATEGORIES, type ReviewItem } from '@/components/ogonek/landing/reviews-data'

export default function ReviewsPage() {
  const containerRef = useScrollReveal()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const filteredReviews = useMemo(() => {
    return ALL_REVIEWS.filter((rev) => {
      const matchesCategory = selectedCategory === 'all' || rev.category === selectedCategory
      const query = searchQuery.trim().toLowerCase()
      if (!query) return matchesCategory

      const matchesSearch =
        rev.author.toLowerCase().includes(query) ||
        rev.role.toLowerCase().includes(query) ||
        rev.headline.toLowerCase().includes(query) ||
        rev.fullText.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-5 sm:px-8 bg-black text-center overflow-hidden">
        {/* Ambient Stage Glow */}
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[960px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f56900" />
            </svg>
            <span className="apple-eyebrow">Живой опыт участников</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6">
            Истории людей,
            <br />
            <span className="apple-shimmer-text">которые держат слово.</span>
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[680px] mb-10 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            32 проверенные истории от предпринимателей, спортсменов, врачей, художников и родителей. О том, как 5 минут вечерней тишины меняют характер и возвращают веру в себя.
          </p>

          {/* Search bar */}
          <div className="w-full max-w-md mx-auto mb-8 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, профессии или теме..."
              className="w-full h-12 px-5 pl-11 rounded-full bg-[#1c1c1e] border border-white/10 text-white placeholder-[#86868b] text-[14px] focus:outline-none focus:border-[#0071e3] transition-all"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            {REVIEWS_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id
              const count = cat.id === 'all' ? ALL_REVIEWS.length : ALL_REVIEWS.filter((r) => r.category === cat.id).length
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'bg-white/[0.05] text-[#a1a1a6] border-white/[0.08] hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── REVIEWS GRID ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-24 text-[#86868b]">
              <p className="text-lg mb-4">Ничего не найдено по запросу «{searchQuery}»</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all')
                  setSearchQuery('')
                }}
                className="text-[#2997ff] hover:underline text-sm cursor-pointer border-none bg-transparent"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="apple-card apple-card-hover p-7 sm:p-8 bg-[#161617] flex flex-col justify-between"
                >
                  <div>
                    {/* Top Meta: Stars + Streak Badge */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className="flex items-center gap-1 text-[#f56900]">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-[#f5f5f7]">
                          🔥 {rev.streakDays} дней
                        </span>
                        {rev.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-[#f56900]/20 text-[#f56900] text-[10px] font-semibold uppercase">
                            {rev.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Headline */}
                    <h3 className="text-[17px] font-semibold text-[#f5f5f7] mb-3 leading-snug tracking-tight">
                      «{rev.headline}»
                    </h3>

                    {/* Full Review Text */}
                    <p className="text-[14px] leading-relaxed text-[#86868b] mb-6">
                      {rev.fullText}
                    </p>
                  </div>

                  {/* Author Row */}
                  <div className="flex items-center gap-3.5 pt-5 border-t border-white/[0.06] mt-auto">
                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-white/10 relative bg-[#222]">
                      <img
                        src={rev.avatar}
                        alt={rev.author}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to initials if image fails
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#f5f5f7] truncate flex items-center gap-1.5">
                        <span>{rev.author}</span>
                        {rev.verified && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#0071e3" className="shrink-0">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        )}
                      </div>
                      <div className="text-[12px] text-[#86868b] truncate">
                        {rev.role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── BOTTOM CALL TO ACTION ─────────────────────────────────── */}
      <section className="py-24 sm:py-32 bg-black border-t border-white/[0.06] text-center">
        <div className="max-w-[800px] mx-auto px-5 sm:px-8">
          <h2 className="apple-hero-title mb-5 sm:mb-6 !text-[36px] sm:!text-[48px]">
            Начни писать свою историю.
          </h2>
          <p className="apple-body max-w-[500px] mx-auto mb-8 text-[#86868b]">
            Через 30 дней у тебя будет месяц побед. Через год — книга несокрушимого характера.
          </p>
          <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[15px]">
            Создать дневник силы
          </Link>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
