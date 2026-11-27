'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  X,
  Sparkles,
  Camera,
  Video,
  Clock,
  Palette,
  ShieldCheck,
  Users,
  BarChart2,
  ExternalLink,
  Crown,
} from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import {
  type SubscriptionTier,
  TIER_NAMES,
  TIER_PRICES,
  getBillingCheckoutUrl,
} from '@/lib/ogonek/permissions'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'

export type UpgradeFeatureKey =
  | 'photos'
  | 'ai_eval'
  | 'intentions_timer'
  | 'accent'
  | 'vault'
  | 'video_call'
  | 'groups'
  | 'analytics'
  | (string & {})

export interface UpgradeFeatureDetail {
  title: string
  subtitle: string
  benefit: string
  requiredTier: 'pro' | 'ultra'
  icon: React.ElementType
  iconColor: string
}

export const UPGRADE_FEATURES_CONFIG: Record<string, UpgradeFeatureDetail> = {
  photos: {
    title: 'Фотографии к победам',
    subtitle: 'Прикрепление фото высокого качества к гордостям и благодарностям',
    benefit:
      'На тарифе Премиум вы можете прикреплять 1 фото каждый день (на Ultra — до 3 фото). Запечатлейте моменты ваших побед визуально!',
    requiredTier: 'pro',
    icon: Camera,
    iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  ai_eval: {
    title: 'ИИ-оценка дня',
    subtitle: 'Персональный разбор летописи нейросетью ИИ',
    benefit:
      'На тарифе Премиум искусственный интеллект анализирует глубину ваших побед, преодоления и динамику личной силы.',
    requiredTier: 'pro',
    icon: Sparkles,
    iconColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  intentions_timer: {
    title: 'Таймеры намерений и Помодоро',
    subtitle: 'Расширенные режимы таймера для утреннего фокуса',
    benefit:
      'Настраивайте гибкие интервалы работы, включайте 25-минутный Помодоро и удерживайте фокус на ключевых задачах дня.',
    requiredTier: 'pro',
    icon: Clock,
    iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  accent: {
    title: 'Эксклюзивный цвет оформления',
    subtitle: 'Кастомные HEX-цвета и оформление профиля',
    benefit:
      'Тариф Основатель Ultra открывает полную свободу персонализации интерфейса: любой цвет акцента и статус основателя.',
    requiredTier: 'ultra',
    icon: Palette,
    iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  vault: {
    title: 'Сейф Evidence Vault',
    subtitle: 'Неограниченное хранение доказательств личной силы',
    benefit:
      'Сейф Evidence Vault сохраняет ваши ключевые преодоления сомнений и страхов навсегда, без ограничений по количеству.',
    requiredTier: 'ultra',
    icon: ShieldCheck,
    iconColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  video_call: {
    title: 'HD Видеозвонки',
    subtitle: 'Зашифрованные видеозвонки один на один с друзьями',
    benefit:
      'Тариф Премиум открывает защищённые WebRTC HD видеозвонки с друзьями без лимитов по времени и с чистым звуком.',
    requiredTier: 'pro',
    icon: Video,
    iconColor: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  },
  groups: {
    title: 'Создание сообществ и групп',
    subtitle: 'Создание до 5 групп на Премиум и до 20 на Ultra',
    benefit:
      'Объединяйте семью, коллег или друзей в отдельные закрытые группы: делитесь победами и ведите общие чаты.',
    requiredTier: 'pro',
    icon: Users,
    iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  analytics: {
    title: 'Расширенная аналитика стрика',
    subtitle: 'Когортный анализ динамики и глубокая статистика',
    benefit:
      'Отслеживайте когорты активности, динамику преодоления барьеров и распределение оценок по дням недели.',
    requiredTier: 'pro',
    icon: BarChart2,
    iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
}

const COOLDOWN_MS = 10 * 60 * 1000 // 10 минут

export function canShowUpgradeModal(feature: string, force = false): boolean {
  if (typeof window === 'undefined') return false
  if (force) return true
  try {
    const dismissed = localStorage.getItem(`ogonek_upgrade_dismissed_${feature}`)
    if (dismissed === 'true') return false

    const lastTimeStr = localStorage.getItem(`ogonek_upgrade_cooldown_${feature}`)
    if (lastTimeStr) {
      const lastTime = parseInt(lastTimeStr, 10)
      if (!isNaN(lastTime) && Date.now() - lastTime < COOLDOWN_MS) {
        return false
      }
    }
    return true
  } catch {
    return true
  }
}

export function recordUpgradeModalShown(feature: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`ogonek_upgrade_cooldown_${feature}`, Date.now().toString())
  } catch {}
}

export function setUpgradeFeatureDismissed(feature: string, dismissed: boolean) {
  if (typeof window === 'undefined') return
  try {
    if (dismissed) {
      localStorage.setItem(`ogonek_upgrade_dismissed_${feature}`, 'true')
    } else {
      localStorage.removeItem(`ogonek_upgrade_dismissed_${feature}`)
    }
  } catch {}
}

export function isUpgradeFeatureDismissed(feature: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(`ogonek_upgrade_dismissed_${feature}`) === 'true'
  } catch {
    return false
  }
}

export interface UpgradeModalProps {
  isOpen: boolean
  feature: UpgradeFeatureKey | null
  onClose: () => void
  onOpenPremiumModal: () => void
  customTitle?: string
  customBenefit?: string
  requiredTier?: 'pro' | 'ultra'
}

export function UpgradeModal({
  isOpen,
  feature,
  onClose,
  onOpenPremiumModal,
  customTitle,
  customBenefit,
  requiredTier: explicitRequiredTier,
}: UpgradeModalProps) {
  const { state, currentUser } = useOgonekStore()
  const soundEnabled = state.soundEnabled

  const currentFeatureKey = feature || 'photos'
  const config: UpgradeFeatureDetail = UPGRADE_FEATURES_CONFIG[currentFeatureKey] || {
    title: customTitle || 'Расширенные возможности',
    subtitle: 'Эта функция доступна на платном тарифе',
    benefit: customBenefit || 'Обновите тариф, чтобы разблокировать доступ ко всем преимуществам Priday.',
    requiredTier: explicitRequiredTier || 'pro',
    icon: Sparkles,
    iconColor: 'text-[var(--accent)] bg-[var(--accent-soft)] border-[var(--accent)]/30',
  }

  const requiredTier = explicitRequiredTier || config.requiredTier
  const requiredTierName = TIER_NAMES[requiredTier]
  const IconComponent = config.icon

  const [neverRemind, setNeverRemind] = useState(false)

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (isOpen && feature) {
      setNeverRemind(isUpgradeFeatureDismissed(feature))
      recordUpgradeModalShown(feature)
    }
  }, [isOpen, feature])

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleToggleNeverRemind = (checked: boolean) => {
    setNeverRemind(checked)
    if (feature) {
      setUpgradeFeatureDismissed(feature, checked)
    }
  }

  const handleOpenAllTiers = () => {
    playClick(soundEnabled)
    onClose()
    onOpenPremiumModal()
  }

  const handleDirectCheckout = () => {
    playClick(soundEnabled)
    const username = currentUser?.username || state.profile.username || 'user'
    const url = getBillingCheckoutUrl(requiredTier, username, 'month')
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!isOpen) return null

  const priceInfo = TIER_PRICES[requiredTier]

  return (
    <div
      id="upgrade-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[4px] animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div
        id="upgrade-modal-container"
        className="w-full max-w-[480px] rounded-2xl bg-[#060608] border border-white/[0.14] shadow-[0_24px_80px_rgba(0,0,0,0.95)] p-5 sm:p-6 flex flex-col gap-4 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          id="upgrade-modal-close-btn"
          onClick={() => {
            playClick(soundEnabled)
            onClose()
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#e7e9ea)] hover:bg-white/10 transition-colors"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        {/* Header Icon + Tier Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${config.iconColor}`}
          >
            <IconComponent size={24} />
          </div>
          <div className="min-w-0 pr-8">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[var(--accent,#FF6A1A)]/15 text-[var(--accent,#FF6A1A)] border border-[var(--accent,#FF6A1A)]/30 mb-1">
              <Crown size={11} />
              Доступно на {requiredTierName}
            </span>
            <h3
              id="upgrade-modal-title"
              className="text-[17px] sm:text-[18px] font-bold text-[var(--text,#e7e9ea)] leading-snug"
            >
              {customTitle || config.title}
            </h3>
          </div>
        </div>

        {/* Feature Subtitle & Specific Benefit */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg,#000000)]/40 border border-[var(--line,#2f3336)] flex flex-col gap-2">
          <p className="text-[13px] text-[var(--text-2,#cfd9de)] font-medium leading-relaxed">
            {config.subtitle}
          </p>
          <p className="text-[12px] text-[var(--muted,#71767b)] leading-relaxed border-t border-[var(--line,#2f3336)]/60 pt-2">
            {customBenefit || config.benefit}
          </p>
        </div>

        {/* Pricing Callout */}
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <span className="text-[11px] text-[var(--muted,#71767b)] font-semibold uppercase tracking-wider">
              Стоимость тарифа
            </span>
            <span className="text-[16px] font-extrabold text-[var(--text,#e7e9ea)]">
              {priceInfo.formattedMonthly}
            </span>
          </div>
          <span className="text-[11px] text-[var(--muted,#71767b)]">
            или {priceInfo.yearly} MDL / год ({priceInfo.discountBadge || '-20%'})
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <button
            type="button"
            id="upgrade-modal-view-tiers-btn"
            onClick={handleOpenAllTiers}
            className="flex-1 min-h-[42px] px-4 rounded-full bg-[var(--accent,#FF6A1A)] hover:opacity-90 active:scale-[0.98] text-white text-[13px] font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>Смотреть все тарифы</span>
          </button>

          <button
            type="button"
            id="upgrade-modal-checkout-btn"
            onClick={handleDirectCheckout}
            className="min-h-[42px] px-4 rounded-full bg-[var(--surface2,#202327)] hover:bg-white/10 active:scale-[0.98] text-[var(--text,#e7e9ea)] border border-[var(--line,#2f3336)] text-[13px] font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <span>Оформить {requiredTierName}</span>
            <ExternalLink size={13} className="text-[var(--muted,#71767b)]" />
          </button>
        </div>

        {/* "Больше не напоминать" checkbox */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--line,#2f3336)]/60 text-xs text-[var(--muted,#71767b)]">
          <label className="flex items-center gap-2 cursor-pointer select-none hover:text-[var(--text-2,#cfd9de)] transition-colors">
            <input
              type="checkbox"
              id="upgrade-modal-dont-remind-checkbox"
              checked={neverRemind}
              onChange={(e) => handleToggleNeverRemind(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[var(--line,#2f3336)] accent-[var(--accent,#FF6A1A)] cursor-pointer"
            />
            <span>Больше не напоминать для этой функции</span>
          </label>
        </div>
      </div>
    </div>
  )
}
