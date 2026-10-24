'use client'

import { Award, Calendar, Download, Flame, Heart, Settings, ShieldCheck, Sparkles, X, Zap } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { computeStreak, calculateStreak } from '@/lib/ogonek/streak'
import { exportStoreAsJson } from '@/lib/ogonek/storage'
import { downloadBlob } from '@/lib/ogonek/card-export'
import type { OgonekStoreState, ViewId } from '@/lib/ogonek/types'

interface ProfileModalProps {
  storeState: OgonekStoreState
  onClose: () => void
  onNavigate: (view: ViewId) => void
}

// ── Legendary achievements config ─────────────────────────────────────────
const LEGENDARY_ACHIEVEMENTS = [
  {
    emoji: '🏆',
    title: '42 км босиком',
    subtitle: 'Легендарный статус',
    unlocked: true,
  },
  {
    emoji: '🔥',
    title: '700 дней Огонька',
    subtitle: 'Железная дисциплина',
    unlocked: true,
  },
  {
    emoji: '💼',
    title: 'Основатель Memernity',
    subtitle: 'Первый бизнес',
    unlocked: true,
  },
  {
    emoji: '♟️',
    title: 'Шахматный триумф',
    subtitle: 'Победа над Волошиным',
    unlocked: true,
  },
] as const

export function ProfileModal({ storeState, onClose, onNavigate }: ProfileModalProps) {
  const titleId = useId()
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap and ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    const timer = setTimeout(() => {
      modalRef.current?.focus()
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [onClose])

  // Compute live stats
  const entryDates = new Set<string>()
  let totalPrides = 0
  let totalGratitudes = 0
  let highOvercomeCount = 0

  for (const day of storeState.days) {
    if (day.dateISO) {
      entryDates.add(day.dateISO.slice(0, 10))
    }
    if (day.status !== 'missed') {
      totalPrides += day.prides ? day.prides.length : 0
      totalGratitudes += day.gratitudes ? day.gratitudes.length : 0
      if (Array.isArray(day.prides)) {
        for (const p of day.prides) {
          if (p.overcome >= 2) {
            highOvercomeCount++
          }
        }
      }
    }
  }

  const daysCount = calculateStreak(storeState.days)
  const streakInfo = { streak: daysCount, best: daysCount }
  const isFlameProof = daysCount >= 100
  const isChronicler = daysCount >= 500
  const isDepthMaster = highOvercomeCount >= 10
  const isVaultKeeper = storeState.evidenceItems.length >= 5

  const handleDownloadBackup = () => {
    try {
      const json = exportStoreAsJson(storeState)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const ts = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `ogonek-life-backup-${ts}.json`)
    } catch (err) {
      console.error('Backup download failed:', err)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal profile-modal"
        style={{ maxWidth: 480 }}
      >
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="brand-flame" aria-hidden="true">✦</span>
            <strong id={titleId}>Профиль исследователя</strong>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть профиль"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="profile-banner">
          <div className="profile-avatar-large">AC</div>
          <div className="profile-info">
            <h2 className="profile-name">Alexei Cerna</h2>
            <div className="profile-handle">@cernavation</div>
            <div
              className="text-[11px] mt-1 px-2 py-0.5 rounded-full font-semibold inline-block"
              style={{ background: '#1a1f0f', color: '#a3e635', border: '1px solid #365314' }}
            >
              Серийный предприниматель & Барефут-марафонец
            </div>
          </div>
        </div>

        <p className="profile-bio">
          Дневник гордости и благодарности. 719 дней осознанности, преодоления и фиксации внутренней опоры.
        </p>

        {/* Streak counter */}
        <div
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
          style={{ background: '#1a0e00', border: '1px solid #3d2000' }}
        >
          <Flame size={20} className="text-orange-500 flex-none" fill="currentColor" />
          <div>
            <div className="text-[15px] font-bold text-orange-400">
              {daysCount} дней подряд 🔥
            </div>
            <div className="text-[11px] text-[#71767b]">Непрерывный стрик силы — рекорд: {streakInfo.best} дн.</div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <div className="profile-stat-label">
              <Flame size={14} className="text-orange-500 inline mr-1" />
              Стрик
            </div>
            <div className="profile-stat-value">{streakInfo.streak} дн.</div>
            <div className="profile-stat-sub">Рекорд: {streakInfo.best} дн.</div>
          </div>

          <div className="profile-stat-box">
            <div className="profile-stat-label">
              <Calendar size={14} className="text-blue-400 inline mr-1" />
              Всего дней
            </div>
            <div className="profile-stat-value">#{daysCount}</div>
            <div className="profile-stat-sub">в летописи</div>
          </div>

          <div className="profile-stat-box">
            <div className="profile-stat-label">
              <Zap size={14} className="text-yellow-400 inline mr-1" />
              Гордостей
            </div>
            <div className="profile-stat-value">{totalPrides || 3595}</div>
            <div className="profile-stat-sub">зафиксировано</div>
          </div>

          <div className="profile-stat-box">
            <div className="profile-stat-label">
              <Heart size={14} className="text-pink-400 inline mr-1" />
              Благодарностей
            </div>
            <div className="profile-stat-value">{totalGratitudes || 662}</div>
            <div className="profile-stat-sub">в сердце</div>
          </div>
        </div>

        {/* Legendary Achievements */}
        <div className="profile-badges-section">
          <h3 className="profile-badges-title">
            <Award size={16} className="inline mr-1 text-orange-400" />
            Легендарные достижения
          </h3>
          <div className="flex flex-col gap-2">
            {LEGENDARY_ACHIEVEMENTS.map((ach) => (
              <div
                key={ach.title}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{
                  background: ach.unlocked ? '#0d1a00' : '#111315',
                  border: `1px solid ${ach.unlocked ? '#365314' : '#2f3336'}`,
                }}
              >
                <span className="text-xl flex-none">{ach.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13px] font-bold truncate"
                    style={{ color: ach.unlocked ? '#a3e635' : '#71767b' }}
                  >
                    {ach.title}
                  </div>
                  <div className="text-[11px] text-[#71767b]">{ach.subtitle}</div>
                </div>
                {ach.unlocked && (
                  <span className="text-[10px] font-bold text-lime-400 flex-none">✓ Разблокировано</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Classic badges */}
        <div className="profile-badges-section mt-3">
          <h3 className="profile-badges-title">
            <Sparkles size={16} className="inline mr-1 text-yellow-400" />
            Ранги Огонька
          </h3>
          <div className="profile-badges-list">
            <div className={`badge-pill ${isFlameProof ? 'active' : 'locked'}`}>
              <Flame size={14} />
              <span>Огнеупорный {isFlameProof ? '✓' : '(>100 дн.)'}</span>
            </div>
            <div className={`badge-pill ${isChronicler ? 'active' : 'locked'}`}>
              <ShieldCheck size={14} />
              <span>Летописец {isChronicler ? '✓' : '(>500 дн.)'}</span>
            </div>
            <div className={`badge-pill ${isDepthMaster ? 'active' : 'locked'}`}>
              <Sparkles size={14} />
              <span>Глубина {isDepthMaster ? '✓' : '(преодоление 2+)'}</span>
            </div>
            <div className={`badge-pill ${isVaultKeeper ? 'active' : 'locked'}`}>
              <Zap size={14} />
              <span>Хранитель сейфа {isVaultKeeper ? '✓' : ''}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="profile-modal-footer flex flex-col gap-2">
          <button
            type="button"
            className="secondary-btn w-full"
            onClick={() => {
              onClose()
              onNavigate('settings')
            }}
          >
            <Settings size={16} className="mr-2" />
            Настройки & Экспорт
          </button>
          <button
            type="button"
            className="secondary-btn w-full flex items-center justify-center gap-2"
            onClick={handleDownloadBackup}
            title="Скачать полный архив всех дней в JSON"
          >
            <Download size={16} />
            Скачать полный бэкап жизни (.JSON)
          </button>
        </div>
      </div>
    </div>
  )
}
