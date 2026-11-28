'use client'

import React from 'react'
import {
  Check,
  Crown,
  ExternalLink,
  Flame,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  TIER_BADGES,
  TIER_LIMITS_MAP,
  TIER_NAMES,
  normalizeTier,
  type SubscriptionTier,
} from '@/lib/ogonek/permissions'
import { playClick } from '@/lib/ogonek/sound'
import type { OgonekProfile } from '@/lib/ogonek/types'

type Props = {
  profile: OgonekProfile
  soundEnabled?: boolean
  onNotify: (msg: string) => void
}

const PLANS: {
  id: SubscriptionTier
  price: string
  period: string
  features: string[]
  recommended?: boolean
}[] = [
  {
    id: 'free',
    price: '0 MDL',
    period: 'навсегда',
    features: [
      'До 1 000 символов в записи',
      'Бесконечный стрик побед',
      'Evidence Vault (доказательства)',
      'Аудиозвонки и личные чаты',
      '1 личная группа (до 5 участников)',
    ],
  },
  {
    id: 'pro',
    price: '20 MDL',
    period: 'в месяц',
    recommended: true,
    features: [
      'До 3 000 символов в записи',
      'Ежедневный ИИ-анализ преодоления',
      'Видеозвонки WebRTC HD',
      'До 5 групп (до 25 участников)',
      'Статистический отчёт о вехах',
      'Золотой бейдж ★ PREMIUM',
    ],
  },
  {
    id: 'ultra',
    price: '50 MDL',
    period: 'в месяц',
    features: [
      'До 5 000 символов в записи',
      'Глубокая церемония с ИИ-ментором',
      'Приоритетная поддержка и статус основателя',
      'До 20 групп (до 100 участников)',
      'Глубокая аналитика и персонализация вех',
      'Эксклюзивный бейдж ⚡ ULTRA FOUNDER',
    ],
  },
]

export function TariffPanel({ profile, soundEnabled = true, onNotify }: Props) {
  const currentTier = normalizeTier(
    profile.subscription_tier,
    profile.subscription_expires_at || (profile as any)?.subscription_valid_until
  )

  const handleOpenPremiumModal = () => {
    playClick(soundEnabled)
    window.dispatchEvent(new CustomEvent('ogonek:open-premium'))
  }

  const handleDirectCheckout = (tier: SubscriptionTier) => {
    playClick(soundEnabled)
    const username = profile.username || 'user'
    const url = `https://memernity.com/checkout?service=ogonek&tier=${tier}&username=${encodeURIComponent(username)}&period=month`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-label="Тариф и подписка">
      {/* ── 1. Текущий тариф пользователя ────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-[var(--text)]">
              Текущий тариф: {TIER_NAMES[currentTier]}
            </h3>
            {TIER_BADGES[currentTier] && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {TIER_BADGES[currentTier]}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            {currentTier === 'free'
              ? 'Базовый бесплатный доступ ко всем основным функциям'
              : profile.subscription_expires_at
              ? `Действует до ${new Date(profile.subscription_expires_at).toLocaleDateString('ru-RU')}`
              : 'Активная бессрочная подписка'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenPremiumModal}
          className="h-8 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Sparkles size={13} />
          <span>{currentTier === 'free' ? 'Улучшить тариф' : 'Управление'}</span>
        </button>
      </div>

      {/* ── 2. Сетка 3 карточек тарифов ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id
          return (
            <div
              key={plan.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                plan.recommended
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20'
                  : isCurrent
                  ? 'border-[var(--text)] bg-[var(--bg-elev)]'
                  : 'border-[var(--border)] bg-[var(--bg-elev)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-[15px] font-bold text-[var(--text)]">
                    {TIER_NAMES[plan.id]}
                  </h4>
                  {plan.recommended && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent)] text-[var(--accent-text)]">
                      Хит
                    </span>
                  )}
                </div>

                <div className="mt-2 mb-3">
                  <span className="text-xl font-black text-[var(--text)]">{plan.price}</span>
                  <span className="text-xs text-[var(--text-3)] ml-1">/ {plan.period}</span>
                </div>

                <ul className="flex flex-col gap-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-2)]">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 mt-auto">
                {isCurrent ? (
                  <div className="w-full py-2 rounded-xl text-center text-xs font-bold text-[var(--text-2)] bg-[var(--bg)] border border-[var(--border)]">
                    Текущий тариф
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDirectCheckout(plan.id)}
                    className={`w-full py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      plan.recommended
                        ? 'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]'
                        : 'border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span>Выбрать {TIER_NAMES[plan.id]}</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
