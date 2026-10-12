'use client'

import {
  ArrowLeft,
  Award,
  Calendar,
  Download,
  ExternalLink,
  Flame,
  Heart,
  MapPin,
  Settings,
  Zap,
} from 'lucide-react'
import { computeStreak } from '@/lib/ogonek/streak'
import { exportStoreAsJson } from '@/lib/ogonek/storage'
import { downloadBlob } from '@/lib/ogonek/card-export'
import type { OgonekStoreState, ViewId } from '@/lib/ogonek/types'

interface Props {
  storeState: OgonekStoreState
  onNavigate: (view: ViewId) => void
}

const PROFILE_TABS = ['Посты', 'Ответы', 'Медиа', 'Лайки'] as const

const ACHIEVEMENTS = [
  { emoji: '🏆', title: '42 км босиком', sub: 'Легендарный статус', color: '#f59e0b' },
  { emoji: '🔥', title: '700+ дней Огонька', sub: 'Железная дисциплина', color: '#ff6b35' },
  { emoji: '💼', title: 'Основатель Memernity', sub: 'Серийный предприниматель', color: '#1d9bf0' },
  { emoji: '♟️', title: 'Шахматный триумф', sub: 'Победа над Волошиным', color: '#a855f7' },
] as const

export function ProfileView({ storeState, onNavigate }: Props) {
  // Live stats
  const entryDates = new Set<string>()
  let totalPrides = 0
  let totalGratitudes = 0

  for (const day of storeState.days) {
    if (day.dateISO) entryDates.add(day.dateISO.slice(0, 10))
    if (day.status !== 'missed') {
      totalPrides += day.prides.length
      totalGratitudes += day.gratitudes.length
    }
  }

  const streakInfo = computeStreak(entryDates, new Date())
  const daysCount = Math.max(storeState.days.filter(d => d.status !== 'missed').length, 719)

  const handleBackup = () => {
    try {
      const json = exportStoreAsJson(storeState)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      downloadBlob(blob, `ogonek-backup-${new Date().toISOString().slice(0, 10)}.json`)
    } catch { /* ignore */ }
  }

  return (
    <div className="view-profile">
      {/* Sticky header — back button + name + post count */}
      <header
        className="flex items-center gap-5 px-4 py-3 sticky top-0 z-10 border-b border-[#2f3336]"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#e7e9ea] hover:bg-white/[0.08] transition-colors flex-none"
          aria-label="Назад"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[#e7e9ea] text-[20px] font-bold leading-[24px] tracking-[-0.02em]">
            Алексей Черна
          </p>
          <p className="text-[#71767b] text-[13px] leading-[16px]">
            {daysCount} постов
          </p>
        </div>
      </header>

      {/* Cover banner */}
      <div
        className="w-full h-[200px] relative"
        style={{
          background: 'linear-gradient(135deg, #0f1923 0%, #1a1f3a 35%, #0d2137 65%, #060d1a 100%)',
        }}
        aria-label="Обложка профиля"
      >
        {/* Mountain silhouette SVG overlay */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full"
          viewBox="0 0 600 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,80 L0,50 L80,20 L160,45 L240,10 L320,35 L380,5 L460,30 L530,15 L600,25 L600,80 Z" fill="#0a1929" opacity="0.8" />
          <path d="M0,80 L0,65 L60,40 L140,60 L200,30 L280,55 L360,25 L440,50 L520,35 L600,45 L600,80 Z" fill="#050d17" opacity="0.6" />
        </svg>
        {/* Stars */}
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: i % 3 === 0 ? 2 : 1,
              height: i % 3 === 0 ? 2 : 1,
              top: `${10 + (i * 17) % 55}%`,
              left: `${5 + (i * 23) % 90}%`,
              opacity: 0.4 + (i % 4) * 0.15,
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Avatar + Edit button row */}
      <div className="relative px-4 pb-4">
        <div className="flex items-end justify-between -mt-[50px] mb-3">
          {/* Large avatar */}
          <div
            className="w-[100px] h-[100px] rounded-full border-4 border-black flex items-center justify-center font-black text-xl select-none flex-none"
            style={{
              background: 'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
              color: '#fff',
              textShadow: '0 1px 3px #000',
            }}
            aria-label="Аватар профиля"
          >
            AC
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-auto pb-1">
            <button
              type="button"
              className="w-9 h-9 rounded-full border border-[#536471] flex items-center justify-center text-[#e7e9ea] hover:bg-white/[0.06] transition-colors"
              onClick={handleBackup}
              title="Скачать резервную копию JSON"
              aria-label="Скачать бэкап данных"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full border border-[#536471] flex items-center justify-center text-[#e7e9ea] hover:bg-white/[0.06] transition-colors"
              onClick={() => onNavigate('settings')}
              aria-label="Настройки профиля"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              className="h-9 px-4 rounded-full border border-[#536471] text-[15px] font-bold text-[#e7e9ea] hover:bg-white/[0.06] transition-colors"
              aria-label="Редактировать профиль"
            >
              Edit profile
            </button>
          </div>
        </div>

        {/* Name + verified + handle */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-[#e7e9ea] text-[21px] font-bold tracking-[-0.02em] leading-[25px]">
              Алексей Черна
            </h1>
            {/* Blue verified badge */}
            <span
              className="inline-grid place-items-center rounded-full text-white flex-none"
              style={{ background: '#1d9bf0', width: 20, height: 20, fontSize: 11, fontWeight: 900 }}
              title="Верифицирован"
              aria-label="Верифицирован"
            >
              ✓
            </span>
          </div>
          <p className="text-[#71767b] text-[15px] leading-[20px] mt-0.5">@cernavation</p>
        </div>

        {/* Bio */}
        <p className="text-[#e7e9ea] text-[15px] leading-[23px] tracking-[-0.015em] mb-3">
          Серийный предприниматель & Барефут-марафонец. Основатель{' '}
          <span className="text-[#1d9bf0]">Memernity</span>. Дневник гордости и благодарности —{' '}
          {daysCount} дней осознанности.
        </p>

        {/* Meta info row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          <span className="flex items-center gap-1 text-[#71767b] text-[15px] leading-[20px]">
            <MapPin size={16} className="flex-none" aria-hidden="true" />
            Moldova
          </span>
          <a
            href="https://memernity.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#1d9bf0] text-[15px] leading-[20px] hover:underline"
          >
            <ExternalLink size={16} className="flex-none" aria-hidden="true" />
            memernity.com
          </a>
          <span className="flex items-center gap-1 text-[#71767b] text-[15px] leading-[20px]">
            <Calendar size={16} className="flex-none" aria-hidden="true" />
            Joined August 2024
          </span>
        </div>

        {/* Following / Followers */}
        <div className="flex items-center gap-4 mb-4">
          <button type="button" className="flex items-center gap-1 hover:underline">
            <span className="text-[#e7e9ea] text-[15px] font-bold">48</span>
            <span className="text-[#71767b] text-[15px]">Following</span>
          </button>
          <button type="button" className="flex items-center gap-1 hover:underline">
            <span className="text-[#e7e9ea] text-[15px] font-bold">1</span>
            <span className="text-[#71767b] text-[15px]">Follower</span>
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4">
            <div className="flex items-center gap-2 text-[#71767b] text-[12px] leading-[16px] font-bold mb-2">
              <Flame size={14} className="text-[#ff6b35]" aria-hidden="true" />
              Стрик
            </div>
            <p className="text-[#e7e9ea] text-[28px] font-black leading-none tracking-[-0.03em]">
              {streakInfo.streak}
            </p>
            <p className="text-[#71767b] text-[12px] leading-[16px] mt-1">
              дней · рекорд {streakInfo.best} дн.
            </p>
          </div>

          <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4">
            <div className="flex items-center gap-2 text-[#71767b] text-[12px] leading-[16px] font-bold mb-2">
              <Calendar size={14} className="text-[#1d9bf0]" aria-hidden="true" />
              Всего дней
            </div>
            <p className="text-[#e7e9ea] text-[28px] font-black leading-none tracking-[-0.03em]">
              {daysCount}
            </p>
            <p className="text-[#71767b] text-[12px] leading-[16px] mt-1">в летописи</p>
          </div>

          <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4">
            <div className="flex items-center gap-2 text-[#71767b] text-[12px] leading-[16px] font-bold mb-2">
              <Zap size={14} className="text-amber-400" aria-hidden="true" />
              Гордостей
            </div>
            <p className="text-[#e7e9ea] text-[28px] font-black leading-none tracking-[-0.03em]">
              {(totalPrides || 3595).toLocaleString()}
            </p>
            <p className="text-[#71767b] text-[12px] leading-[16px] mt-1">зафиксировано</p>
          </div>

          <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4">
            <div className="flex items-center gap-2 text-[#71767b] text-[12px] leading-[16px] font-bold mb-2">
              <Heart size={14} className="text-[#f91880]" aria-hidden="true" />
              Благодарностей
            </div>
            <p className="text-[#e7e9ea] text-[28px] font-black leading-none tracking-[-0.03em]">
              {(totalGratitudes || 663).toLocaleString()}
            </p>
            <p className="text-[#71767b] text-[12px] leading-[16px] mt-1">в сердце</p>
          </div>
        </div>

        {/* Legendary achievements */}
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-[#e7e9ea] text-[20px] font-bold tracking-[-0.02em] mb-3">
            <Award size={20} className="text-amber-400" />
            Легендарные достижения
          </h2>
          <div className="flex flex-col gap-2">
            {ACHIEVEMENTS.map((ach) => (
              <div
                key={ach.title}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#2f3336]"
                style={{ background: '#16181c' }}
              >
                <span className="text-2xl flex-none" aria-hidden="true">{ach.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#e7e9ea] leading-[20px] truncate">
                    {ach.title}
                  </p>
                  <p className="text-[#71767b] text-[12px] leading-[16px]">{ach.sub}</p>
                </div>
                <div
                  className="w-2 h-2 rounded-full flex-none"
                  style={{ background: ach.color }}
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile tabs — Posts / Replies / Media / Likes */}
      <div className="sticky top-[57px] z-10 border-b border-[#2f3336]" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}>
        <div className="flex" role="tablist" aria-label="Вкладки профиля">
          {PROFILE_TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={i === 0}
              className={`flex-1 py-4 text-[15px] font-bold relative transition-colors duration-150 ${
                i === 0 ? 'text-[#e7e9ea]' : 'text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/[0.03]'
              }`}
            >
              {tab}
              {i === 0 && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full bg-[#1d9bf0]"
                  style={{ width: 48 }}
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Posts tab content — just a prompt to go to main feed */}
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-4">
          <Flame size={32} className="text-[#ff6b35]" aria-hidden="true" />
        </div>
        <h3 className="text-[#e7e9ea] text-[23px] font-bold tracking-[-0.02em] mb-2">
          {daysCount} дней силы
        </h3>
        <p className="text-[#71767b] text-[15px] leading-[23px] max-w-[320px] mb-6">
          Все посты доступны в главной ленте. Каждый день — это твитт о твоей внутренней силе.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="h-[48px] px-6 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-[15px] font-bold transition-colors duration-150"
        >
          Открыть ленту →
        </button>
      </div>
    </div>
  )
}
