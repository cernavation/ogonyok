'use client'

import { Award, Calendar, Flame, Heart, Settings, ShieldCheck, Sparkles, X, Zap } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { computeStreak } from '@/lib/ogonek/streak'
import type { OgonekStoreState, ViewId } from '@/lib/ogonek/types'

interface ProfileModalProps {
  storeState: OgonekStoreState
  onClose: () => void
  onNavigate: (view: ViewId) => void
}

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
      totalPrides += day.prides.length
      totalGratitudes += day.gratitudes.length
      for (const p of day.prides) {
        if (p.overcome >= 2) {
          highOvercomeCount++
        }
      }
    }
  }

  const streakInfo = computeStreak(entryDates, new Date())
  const daysCount = Math.max(storeState.days.length, 719)
  const isFlameProof = streakInfo.best >= 100
  const isChronicler = daysCount >= 500
  const isDepthMaster = highOvercomeCount >= 10
  const isVaultKeeper = storeState.evidenceItems.length >= 5

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
          </div>
        </div>

        <p className="profile-bio">
          Дневник гордости и благодарности. 719 дней осознанности, преодоления и фиксации внутренней опоры.
        </p>

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

        {/* Badges / Achievements */}
        <div className="profile-badges-section">
          <h3 className="profile-badges-title">
            <Award size={16} className="inline mr-1 text-orange-400" />
            Достижения и ранги
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
        <div className="profile-modal-footer">
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
        </div>
      </div>
    </div>
  )
}
