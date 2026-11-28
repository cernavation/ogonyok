'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  BadgeCheck,
  Check,
  Crown,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Zap,
  HelpCircle,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  type SubscriptionTier,
  TIER_NAMES,
  TIER_PRICES,
  TIER_FEATURES_LIST,
  normalizeTier,
  getBillingCheckoutUrl,
  getPaymentButtonLabel,
  checkSubscriptionStatus,
} from '@/lib/ogonek/permissions'

type BillingPeriod = 'monthly' | 'yearly'

export interface PremiumModalProps {
  isOpen: boolean
  onClose: () => void
  onNotify?: (msg: string) => void
}

export function PremiumModal({ isOpen, onClose, onNotify }: PremiumModalProps) {
  const { state, currentUser } = useOgonekStore()
  const soundEnabled = state.soundEnabled

  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [showFaq, setShowFaq] = useState(false)

  useBodyScrollLock(isOpen)

  // Escape listener
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

  if (!isOpen) return null

  const username = currentUser?.username || state.profile.username || 'user'
  const isCerna = username.toLowerCase().replace(/^@/, '') === 'cernavation'
  const rawTier = state.profile.subscription_tier || (isCerna ? 'ultra' : 'free')
  const validUntil = state.profile.subscription_expires_at || (state.profile as any).subscription_valid_until
  const status = checkSubscriptionStatus(rawTier, validUntil, username)
  const effectiveTier = isCerna ? 'ultra' : status.effectiveTier

  const handleCheckout = (tier: 'pro' | 'ultra') => {
    playClick(soundEnabled)
    const url = getBillingCheckoutUrl(tier, username, period === 'yearly' ? 'year' : 'month')
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const tiers: SubscriptionTier[] = ['free', 'pro', 'ultra']

  return (
    <div
      id="premium-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-[4px] animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-modal-title"
    >
      <div
        id="premium-modal-container"
        className="w-full max-w-[880px] rounded-2xl bg-[#060608] border border-white/[0.14] shadow-[0_24px_80px_rgba(0,0,0,0.95)] p-4 sm:p-5 flex flex-col gap-3 relative animate-in zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[720px] overflow-y-auto sm:overflow-visible max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-b-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          id="premium-modal-close-btn"
          onClick={() => {
            playClick(soundEnabled)
            onClose()
          }}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#e7e9ea)] hover:bg-white/10 transition-colors z-10"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        {/* Header & Switcher Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="premium-modal-title"
                className="text-[18px] sm:text-[20px] font-[900] tracking-tight text-[var(--text,#e7e9ea)] flex items-center gap-1.5"
              >
                <span>Тарифы Winlog</span>
                <BadgeCheck size={20} className="text-[#1d9bf0]" />
              </h2>
            </div>
            <p className="text-[12px] sm:text-[13px] text-[var(--muted,#71767b)] mt-0.5">
              Инструменты личной дисциплины, верификация и расширенные лимиты
            </p>
          </div>

          {/* Billing Switcher (Месяц / Год) */}
          <div
            className="inline-flex items-center p-1 rounded-full bg-[var(--bg,#000000)]/60 border border-[var(--line,#2f3336)] shrink-0 self-start sm:self-auto"
            role="radiogroup"
            aria-label="Период оплаты"
          >
            <button
              type="button"
              id="billing-switch-monthly"
              role="radio"
              aria-checked={period === 'monthly'}
              onClick={() => {
                playClick(soundEnabled)
                setPeriod('monthly')
              }}
              className={`px-3.5 py-1 rounded-full text-[12px] font-bold transition-all ${
                period === 'monthly'
                  ? 'bg-[var(--text,#e7e9ea)] text-[var(--bg,#000000)] shadow-sm'
                  : 'text-[var(--muted,#71767b)] hover:text-[var(--text,#e7e9ea)]'
              }`}
            >
              Месяц
            </button>
            <button
              type="button"
              id="billing-switch-yearly"
              role="radio"
              aria-checked={period === 'yearly'}
              onClick={() => {
                playClick(soundEnabled)
                setPeriod('yearly')
              }}
              className={`px-3.5 py-1 rounded-full text-[12px] font-bold transition-all flex items-center gap-1 ${
                period === 'yearly'
                  ? 'bg-[var(--text,#e7e9ea)] text-[var(--bg,#000000)] shadow-sm'
                  : 'text-[var(--muted,#71767b)] hover:text-[var(--text,#e7e9ea)]'
              }`}
            >
              <span>Год</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[var(--accent,#FF6A1A)] text-white">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Expiration date reminder if user has active paid subscription */}
        {status.isPaid && status.expiresAtFormatted && (
          <div
            id="premium-active-expiration-banner"
            className="px-3 py-1.5 rounded-xl bg-[var(--accent,#FF6A1A)]/10 border border-[var(--accent,#FF6A1A)]/30 text-[12px] text-[var(--text-2,#cfd9de)] flex items-center justify-between"
          >
            <span>
              Ваш тариф <b>{TIER_NAMES[effectiveTier]}</b> активен
            </span>
            <span className="font-semibold text-[var(--accent,#FF6A1A)]">
              Действует до {status.expiresAtFormatted}
            </span>
          </div>
        )}

        {/* 3 Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tiers.map((tier) => {
            const isCurrent = effectiveTier === tier
            const price = TIER_PRICES[tier]
            const features = TIER_FEATURES_LIST[tier]
            const isPro = tier === 'pro'
            const isUltra = tier === 'ultra'

            const cardBorder = isCurrent
              ? 'border-[var(--accent,#FF6A1A)] ring-1 ring-[var(--accent,#FF6A1A)]/50'
              : isUltra
              ? 'border-amber-500/30'
              : 'border-[var(--line,#2f3336)]'

            return (
              <div
                key={tier}
                id={`tier-card-${tier}`}
                className={`rounded-2xl p-3.5 bg-[var(--bg,#000000)]/40 border flex flex-col justify-between transition-all relative ${cardBorder}`}
              >
                {/* Current Plan Badge */}
                {isCurrent && (
                  <span className="absolute -top-2.5 left-3.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--accent,#FF6A1A)] text-white shadow-sm">
                    Текущий план
                  </span>
                )}

                <div>
                  {/* Card Header: Tier Title */}
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[15px] font-bold text-[var(--text,#e7e9ea)] flex items-center gap-1.5">
                      {tier === 'ultra' && <Zap size={14} className="text-amber-400" />}
                      {tier === 'pro' && <Sparkles size={14} className="text-[#1d9bf0]" />}
                      <span>{TIER_NAMES[tier]}</span>
                    </h3>
                  </div>

                  {/* Price */}
                  <div className="mb-2.5">
                    <div className="flex items-baseline gap-1.5">
                      {period === 'monthly' && price.oldMonthly && (
                        <span className="text-[13px] font-semibold text-[var(--muted,#71767b)] line-through leading-tight">
                          {price.oldMonthly} MDL
                        </span>
                      )}
                      <span className="text-[20px] font-[900] text-[var(--text,#e7e9ea)] leading-tight">
                        {tier === 'free'
                          ? '0 MDL'
                          : period === 'monthly'
                          ? `${price.monthly} MDL`
                          : `${price.yearly} MDL`}
                      </span>
                      <span className="text-[11px] text-[var(--muted,#71767b)]">
                        {tier === 'free'
                          ? 'навсегда'
                          : period === 'monthly'
                          ? '/ месяц'
                          : '/ год'}
                      </span>
                    </div>
                    {tier !== 'free' && period === 'yearly' && (
                      <p className="text-[10px] text-[var(--muted,#71767b)] mt-0.5">
                        Всего {Math.round(price.yearly / 12)} MDL в месяц (скидка 20%)
                      </p>
                    )}
                  </div>

                  {/* Feature Bullets (permissions.ts as single source of truth) */}
                  <ul className="flex flex-col gap-1.5 border-t border-[var(--line,#2f3336)]/70 pt-2 mb-3">
                    {features.slice(0, 5).map((feat) => (
                      <li
                        key={feat.id}
                        className="flex items-start gap-1.5 text-[11px] sm:text-[11.5px] leading-snug"
                      >
                        <Check
                          size={13}
                          className={`shrink-0 mt-0.5 ${
                            feat.included
                              ? feat.highlight
                                ? 'text-[var(--accent,#FF6A1A)] font-bold'
                                : 'text-emerald-400'
                              : 'text-[var(--muted,#71767b)] opacity-30'
                          }`}
                        />
                        <span
                          className={
                            feat.included
                              ? feat.highlight
                                ? 'text-[var(--text,#e7e9ea)] font-bold'
                                : 'text-[var(--text-2,#cfd9de)]'
                              : 'text-[var(--muted,#71767b)] line-through opacity-50'
                          }
                        >
                          {feat.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Action Button */}
                <div>
                  {tier === 'free' ? (
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        playClick(soundEnabled)
                        onNotify?.('Вы на базовом тарифе')
                      }}
                      className="w-full h-8 rounded-full text-[12px] font-bold border border-[var(--line,#2f3336)] text-[var(--muted,#71767b)] hover:text-[var(--text,#e7e9ea)] disabled:opacity-60 disabled:cursor-default transition-all flex items-center justify-center"
                    >
                      {isCurrent ? 'ТЕКУЩИЙ ПЛАН' : 'Базовый доступ'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      id={`checkout-btn-${tier}`}
                      onClick={() => handleCheckout(tier)}
                      className={`w-full h-8 rounded-full text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] ${
                        isCurrent
                          ? 'bg-[var(--surface2,#202327)] text-[var(--text,#e7e9ea)] border border-[var(--line,#2f3336)] hover:border-[var(--accent,#FF6A1A)]'
                          : isUltra
                          ? 'bg-amber-500 hover:bg-amber-600 text-black'
                          : 'bg-[var(--accent,#FF6A1A)] hover:opacity-90 text-white'
                      }`}
                    >
                      {isCurrent && <Check size={12} strokeWidth={3} className="text-emerald-400" />}
                      <span>
                        {getPaymentButtonLabel(effectiveTier, tier, validUntil)}
                      </span>
                      <ExternalLink size={12} className="opacity-70" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Collapsible FAQ Section */}
        <div className="border-t border-[var(--line,#2f3336)]/70 pt-2.5">
          <button
            type="button"
            id="premium-faq-toggle"
            onClick={() => {
              playClick(soundEnabled)
              setShowFaq((prev) => !prev)
            }}
            className="w-full flex items-center justify-between text-left text-[12px] font-semibold text-[var(--text-2,#cfd9de)] hover:text-[var(--text,#e7e9ea)] transition-colors py-1"
            aria-expanded={showFaq}
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle size={14} className="text-[var(--muted,#71767b)]" />
              <span>Что будет, когда подписка закончится?</span>
            </span>
            <ChevronDown
              size={14}
              className={`text-[var(--muted,#71767b)] transition-transform duration-200 ${
                showFaq ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showFaq && (
            <div
              id="premium-faq-content"
              className="mt-1.5 p-3 rounded-xl bg-[var(--bg,#000000)]/40 border border-[var(--line,#2f3336)] text-[11.5px] text-[var(--muted,#71767b)] leading-relaxed animate-in fade-in duration-150"
            >
              Ваши данные сохраняются навсегда: все ранее добавленные гордости, фото и группы останутся доступными для просмотра. Если у вас были записи длиннее 1000 символов, они продолжат отображаться полностью. Для редактирования таких записей потребуется уложиться в лимит бесплатного тарифа (1000 символов).
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
