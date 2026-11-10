'use client'

/**
 * ============================================================================
 * components/ogonek/billing/upgrade-modal.tsx: ЕДИНАЯ МОДАЛКА АПСЕЛЛА (ЭТАП 13)
 * ============================================================================
 * Общая точка входа для всех платных функций:
 * - Вызывается из <Gate>, композера, звонков, хранилища, настроек, аналитики
 *   и при перехвате кодов tier_required / quota_exceeded из API.
 * - Принцип: НЕ РАЗДРАЖАТЬ.
 *   * Появляется ТОЛЬКО когда пользователь сам коснулся функции или упёрся в лимит.
 *   * Антираздражитель: не показывать чаще 1 раза в 10 минут на одну фичу.
 *   * Опция «Больше не напоминать об этом» с сохранением на сервере.
 *   * Доступна клавиатурой, закрывается по Esc.
 * - Аналитика воронки (upsell_events): shown, clicked, dismissed.
 * ============================================================================
 */

import React, { useState, useEffect, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Sparkles,
  Crown,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  type SubscriptionTier,
  UPSELL_FEATURES,
  TIER_PRICING,
  TIER_NAMES,
  getBillingCheckoutUrl,
  getPaymentButtonLabel,
  normalizeTier,
} from '@/lib/ogonek/permissions'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'

export interface UpgradeModalProps {
  isOpen: boolean
  feature: string
  reason?: string
  force?: boolean // Если пользователь сам явно нажал «Улучшить» — игнорировать кулдаун
  onClose: () => void
  onSelectTier?: (tier: 'pro' | 'ultra') => void
  soundEnabled?: boolean
}

// 10 минут кулдаун антираздражителя
const COOLDOWN_MS = 10 * 60 * 1000

export function UpgradeModal({
  isOpen,
  feature,
  reason,
  force = false,
  onClose,
  onSelectTier,
  soundEnabled = true,
}: UpgradeModalProps) {
  const titleId = useId()
  const { state, updateProfile } = useOgonekStore()
  const [neverRemind, setNeverRemind] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  const userTier = normalizeTier(
    state.profile?.subscription_tier,
    state.profile?.subscription_valid_until
  )
  const username = state.profile?.username || 'user'
  const dismissedList = state.profile?.dismissed_upsells || []

  // Получаем конфигурацию для переданной фичи (или дефолтную)
  const info = UPSELL_FEATURES[feature] || {
    title: 'Расширенные возможности',
    defaultReason: reason || 'Эта функция доступна на тарифах Премиум и Ultra',
    pro: ['Расширенные лимиты и приоритетный доступ', '1 ИИ-оценка в день от Огонёк ИИ', 'Синхронизация и поддержка соратников'],
    ultra: ['Все преимущества Премиум', 'Золотой бейдж основателя ⚡', 'Неограниченная аналитика и личные вехи'],
  }

  // Проверка антираздражителя (10 минут) и списка «Больше не напоминать»
  useEffect(() => {
    if (!isOpen) {
      setShouldRender(false)
      return
    }

    // Если фича уже отключена навсегда пользователем (и это не явный клик)
    if (!force && dismissedList.includes(feature)) {
      setShouldRender(false)
      onClose()
      return
    }

    // Проверка 10-минутного кулдауна в localStorage
    if (!force && typeof window !== 'undefined') {
      try {
        const lastShownStr = localStorage.getItem(`ogonek_upsell_cooldown_${feature}`)
        if (lastShownStr) {
          const lastShown = Number(lastShownStr)
          if (!isNaN(lastShown) && Date.now() - lastShown < COOLDOWN_MS) {
            setShouldRender(false)
            onClose()
            return
          }
        }
      } catch {}
    }

    setShouldRender(true)

    // Запоминаем время показа в localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ogonek_upsell_cooldown_${feature}`, String(Date.now()))
      } catch {}
    }

    // Фиксируем событие воронки 'shown'
    fetch('/api/analytics/upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature,
        action: 'shown',
        metadata: { userTier, reason: reason || info.defaultReason },
      }),
    }).catch(() => {})
  }, [isOpen, feature, force, dismissedList, userTier, reason, info.defaultReason, onClose])

  // Закрытие по нажатию Esc
  useEffect(() => {
    if (!shouldRender) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shouldRender])

  // Обработка закрытия или кнопки «Не сейчас»
  const handleDismiss = () => {
    playClick(soundEnabled)

    // Фиксация события 'dismissed' и флага neverRemind
    fetch('/api/analytics/upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature,
        action: 'dismissed',
        neverRemind,
        metadata: { userTier },
      }),
    }).catch(() => {})

    if (neverRemind) {
      const nextDismissed = Array.from(new Set([...dismissedList, feature]))
      updateProfile({ dismissed_upsells: nextDismissed })
    }

    onClose()
  }

  // Клик по кнопке выбора тарифа (Премиум или Ultra)
  const handleSelect = (tier: 'pro' | 'ultra') => {
    playSuccess(soundEnabled)

    // Фиксация события 'clicked' в аналитике
    fetch('/api/analytics/upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature,
        action: 'clicked',
        metadata: { chosenTier: tier, userTier },
      }),
    }).catch(() => {})

    if (onSelectTier) {
      onSelectTier(tier)
    } else {
      const checkoutUrl = getBillingCheckoutUrl({
        tier,
        username,
        period: 'month',
      })
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
    }

    onClose()
  }

  if (!shouldRender) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)] my-auto"
        >
          {/* Крестик закрытия */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
            aria-label="Закрыть модальное окно"
          >
            <X size={18} />
          </button>

          {/* Иконка и заголовок */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/30 flex-none">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[var(--accent)]">
                Платная функция
              </span>
              <h2 id={titleId} className="text-xl sm:text-2xl font-[900] text-[var(--text)] tracking-tight">
                {info.title}
              </h2>
            </div>
          </div>

          {/* Что заблокировано (причина) */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--line)] my-3.5 flex items-start gap-2.5 text-xs sm:text-[13px] text-[var(--text-2)]">
            <Lock size={16} className="text-amber-400 flex-none mt-0.5" />
            <span>{reason || info.defaultReason}</span>
          </div>

          {/* Сравнение карточек: Премиум и Ultra для ЭТОЙ функции */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
            {/* Карточка PRO */}
            <div className="p-4 rounded-2xl border border-[#1d9bf0]/40 bg-[#1d9bf0]/5 flex flex-col justify-between relative">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#1d9bf0]">
                    Премиум
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1d9bf0]/20 text-[#1d9bf0]">
                    Хит
                  </span>
                </div>
                <div className="text-base font-extrabold text-[var(--text)] mb-2.5">
                  {TIER_PRICING.pro.monthlyMdl} MDL{' '}
                  <span className="text-[11px] font-normal text-[var(--text-2)]">/ $1.5 в мес</span>
                </div>
                <ul className="flex flex-col gap-1.5 text-xs text-[var(--text)]">
                  {info.pro.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check size={13} className="text-[#1d9bf0] flex-none mt-0.5 stroke-[3]" />
                      <span className="leading-tight">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleSelect('pro')}
                className="mt-4 w-full h-9 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
              >
                <span>Выбрать Премиум</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Карточка ULTRA */}
            <div className="p-4 rounded-2xl border border-[#f5b942]/40 bg-[#f5b942]/5 flex flex-col justify-between relative">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#f5b942]">
                    Основатель Ultra
                  </span>
                  <Crown size={14} className="text-[#f5b942]" />
                </div>
                <div className="text-base font-extrabold text-[var(--text)] mb-2.5">
                  {TIER_PRICING.ultra.monthlyMdl} MDL{' '}
                  <span className="text-[11px] font-normal text-[var(--text-2)]">/ $3 в мес</span>
                </div>
                <ul className="flex flex-col gap-1.5 text-xs text-[var(--text)]">
                  {info.ultra.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check size={13} className="text-[#f5b942] flex-none mt-0.5 stroke-[3]" />
                      <span className="leading-tight">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => handleSelect('ultra')}
                className="mt-4 w-full h-9 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
              >
                <span>Выбрать Ultra</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Нижняя панель: чекбокс «Больше не напоминать» и кнопка «Не сейчас» */}
          <div className="mt-4 pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-2)] hover:text-[var(--text)] select-none">
              <input
                type="checkbox"
                checked={neverRemind}
                onChange={(e) => setNeverRemind(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-0 cursor-pointer"
              />
              <span>Больше не напоминать об этом</span>
            </label>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-bold text-[var(--text-2)] hover:text-[var(--text)] hover:underline py-1 px-3"
            >
              Не сейчас
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

/**
 * Хелпер глобального вызова UpgradeModal из любого места приложения
 */
export function dispatchUpgradeModal(params: {
  feature: string
  reason?: string
  force?: boolean
}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('ogonek:upgrade-modal', {
      detail: params,
    })
  )
}
