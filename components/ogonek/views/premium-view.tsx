'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Crown,
  Flame,
  HelpCircle,
  Image as ImageIcon,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Smartphone,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { OgonekProfile, ViewId } from '@/lib/ogonek/types'
import { MobileHeader } from '../mobile-header'

type Props = {
  onNavigate: (view: ViewId) => void
  onUpdateProfile?: (patch: Partial<OgonekProfile>) => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
  verified?: boolean
}

type BillingPeriod = 'monthly' | 'yearly'

type TariffTier = 'basic' | 'premium' | 'ultra'

export function PremiumView({
  onNavigate,
  onUpdateProfile,
  onNotify,
  soundEnabled = true,
  verified = false,
}: Props) {
  const [billing, setBilling] = useState<BillingPeriod>('monthly')
  const [selectedTier, setSelectedTier] = useState<TariffTier | null>(verified ? 'premium' : null)
  const [busyTier, setBusyTier] = useState<TariffTier | null>(null)

  const handleSelectTier = (tier: TariffTier) => {
    playClick(soundEnabled)
    setBusyTier(tier)

    setTimeout(() => {
      setSelectedTier(tier)
      setBusyTier(null)
      playSuccess(soundEnabled)

      if (tier === 'premium') {
        onUpdateProfile?.({ verified: true })
        onNotify('Тариф «Премиум» активирован! Синяя галочка включена в профиле ✓')
      } else if (tier === 'ultra') {
        onUpdateProfile?.({ verified: true })
        onNotify('Тариф «Ultra» активирован! Статус основателя и золотая галочка подключены ✓')
      } else {
        onNotify('Тариф «Базовый» активирован! Доступ ко всем устройствам подключен ✓')
      }
    }, 400)
  }

  return (
    <div className="view-premium min-h-screen pb-24 text-[var(--text)]">
      <MobileHeader title="Премиум" onOpenProfile={() => onNavigate('profile')} />

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => onNavigate('home')}
          aria-label="Назад"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-[19px] font-extrabold text-[var(--text)] tracking-[-0.02em] leading-tight flex items-center gap-2">
            Премиум в Огоньке
            <BadgeCheck size={18} className="text-[#1d9bf0]" />
          </h1>
          <p className="text-[13px] text-[var(--text-2)]">
            Расширенные возможности, верификация и синхронизация
          </p>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-6 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold mb-3 border border-[var(--accent)]/20">
          <Sparkles size={13} />
          <span>X Premium Experience</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-[900] tracking-tight max-w-2xl leading-tight">
          Улучшите свой опыт в Огоньке
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--text-2)] mt-2 max-w-xl">
          Выберите подходящий тариф: от базового доступа до синей галочки верификации и расширенной AI-оценки от Google Gemini.
        </p>

        {/* Billing Switcher (Ежемесячно / Ежегодно) */}
        <div className="mt-6 inline-flex p-1 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] relative" role="radiogroup" aria-label="Период оплаты">
          <button
            type="button"
            role="radio"
            aria-checked={billing === 'monthly'}
            onClick={() => {
              playClick(soundEnabled)
              setBilling('monthly')
            }}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              billing === 'monthly'
                ? 'bg-[var(--text)] text-[var(--bg)] shadow-sm'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            Ежемесячно
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={billing === 'yearly'}
            onClick={() => {
              playClick(soundEnabled)
              setBilling('yearly')
            }}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              billing === 'yearly'
                ? 'bg-[var(--text)] text-[var(--bg)] shadow-sm'
                : 'text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            <span>Ежегодно</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[#00ba7c]/20 text-[#00ba7c]">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* 3 Tariff Cards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {/* TARIFF 1: БАЗОВЫЙ */}
        <div
          className={`flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-[var(--bg-elev)] border transition-all relative ${
            selectedTier === 'basic'
              ? 'border-[var(--text)] ring-2 ring-[var(--text)]/20 shadow-xl'
              : 'border-[var(--border)] hover:border-[var(--border-strong)]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-2)]">
                Для дисциплины
              </span>
              {selectedTier === 'basic' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[var(--text)]">
                  Текущий
                </span>
              )}
            </div>

            <h3 className="text-xl font-[800] text-[var(--text)] tracking-tight">
              Базовый
            </h3>
            <p className="text-xs text-[var(--text-2)] mt-1 min-h-[32px]">
              Необходимый набор для ежедневной летописи и дисциплины
            </p>

            {/* Price */}
            <div className="my-5 pb-5 border-b border-[var(--border)]">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-[900] text-[var(--text)]">
                  {billing === 'monthly' ? '10 MDL' : '100 MDL'}
                </span>
                <span className="text-xs text-[var(--text-2)] font-semibold">
                  {billing === 'monthly' ? '/ месяц' : '/ год'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-3)] mt-1">
                Около $0.5 в месяц · списание в MDL
              </p>
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-3 text-[13px] text-[var(--text)]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center flex-none mt-0.5 text-[var(--text)]">
                  <Smartphone size={12} strokeWidth={2.5} />
                </span>
                <span>Доступ ко всем устройствам (Web, PWA на iPhone)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center flex-none mt-0.5 text-[var(--text)]">
                  <Flame size={12} strokeWidth={2.5} className="text-[#ff6b35]" />
                </span>
                <span>Безлимитный стрик летописи</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center flex-none mt-0.5 text-[var(--text)]">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>Утренний фокус и таймеры</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6">
            <button
              type="button"
              disabled={busyTier === 'basic'}
              onClick={() => handleSelectTier('basic')}
              className={`w-full h-11 rounded-full text-[14px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedTier === 'basic'
                  ? 'bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]'
                  : 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90 active:scale-95'
              }`}
            >
              {selectedTier === 'basic' ? 'Текущий план' : 'Выбрать Базовый'}
            </button>
          </div>
        </div>

        {/* TARIFF 2: ПРЕМИУМ (ХИТ) */}
        <div
          className={`flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-[var(--bg-elev)] border-2 transition-all relative shadow-2xl ${
            selectedTier === 'premium'
              ? 'border-[#1d9bf0] ring-4 ring-[#1d9bf0]/20'
              : 'border-[#1d9bf0]/70 hover:border-[#1d9bf0]'
          }`}
          style={{
            background: 'linear-gradient(180deg, rgba(29, 155, 240, 0.08) 0%, var(--bg-elev) 30%)',
          }}
        >
          {/* Top Badge: ХИТ */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#1d9bf0] text-white text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
            <Sparkles size={11} /> Хит выбора
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#1d9bf0]">
                Популярный
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#1d9bf0] px-2 py-0.5 rounded-full bg-[#1d9bf0]/10 border border-[#1d9bf0]/20">
                <BadgeCheck size={12} />
                Синяя галочка
              </span>
            </div>

            <h3 className="text-xl font-[800] text-[var(--text)] tracking-tight flex items-center gap-1.5">
              Премиум
              <BadgeCheck size={19} className="text-[#1d9bf0]" />
            </h3>
            <p className="text-xs text-[var(--text-2)] mt-1 min-h-[32px]">
              Официальная верификация и умный ИИ-анализ записей
            </p>

            {/* Price */}
            <div className="my-5 pb-5 border-b border-[var(--border)]">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-[900] text-[var(--text)]">
                  {billing === 'monthly' ? '25 MDL' : '240 MDL'}
                </span>
                <span className="text-xs text-[var(--text-2)] font-semibold">
                  {billing === 'monthly' ? '/ $1.5 в месяц' : '/ $14 в год'}
                </span>
              </div>
              <p className="text-[11px] text-[#1d9bf0] mt-1 font-semibold">
                Все преимущества Базового включены
              </p>
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-3 text-[13px] text-[var(--text)]">
              <li className="flex items-start gap-2.5 font-medium">
                <span className="w-5 h-5 rounded-full bg-[#1d9bf0] text-white flex items-center justify-center flex-none mt-0.5">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>
                  <b>Синяя галочка верификации</b> в профиле и комментариях
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1d9bf0]/20 text-[#1d9bf0] flex items-center justify-center flex-none mt-0.5">
                  <Sparkles size={12} />
                </span>
                <span>
                  <b>Google Gemini AI:</b> автоматическая оценка и мудрые советы
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1d9bf0]/20 text-[#1d9bf0] flex items-center justify-center flex-none mt-0.5">
                  <ImageIcon size={12} />
                </span>
                <span>До 4 фото высокого качества к каждому дню</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1d9bf0]/20 text-[#1d9bf0] flex items-center justify-center flex-none mt-0.5">
                  <TrendingUp size={12} />
                </span>
                <span>Приоритет в ленте друзей и поиске</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6">
            <button
              type="button"
              disabled={busyTier === 'premium'}
              onClick={() => handleSelectTier('premium')}
              className={`w-full h-11 rounded-full text-[14px] font-black transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95 ${
                selectedTier === 'premium'
                  ? 'bg-[#1d9bf0] text-white ring-2 ring-[#1d9bf0]/50'
                  : 'bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white'
              }`}
            >
              {selectedTier === 'premium' ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Премиум подключён</span>
                </>
              ) : (
                <>
                  <BadgeCheck size={16} />
                  <span>Подключить Премиум</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* TARIFF 3: ULTRA */}
        <div
          className={`flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-[var(--bg-elev)] border transition-all relative ${
            selectedTier === 'ultra'
              ? 'border-[#f5b942] ring-2 ring-[#f5b942]/30 shadow-xl'
              : 'border-[var(--border)] hover:border-[#f5b942]/60'
          }`}
          style={{
            background: 'linear-gradient(180deg, rgba(245, 185, 66, 0.05) 0%, var(--bg-elev) 30%)',
          }}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#f5b942]">
                Основатель
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#f5b942] px-2 py-0.5 rounded-full bg-[#f5b942]/10 border border-[#f5b942]/20">
                <Crown size={12} />
                Ultra
              </span>
            </div>

            <h3 className="text-xl font-[800] text-[var(--text)] tracking-tight flex items-center gap-1.5">
              Ultra
              <Crown size={18} className="text-[#f5b942]" />
            </h3>
            <p className="text-xs text-[var(--text-2)] mt-1 min-h-[32px]">
              Золотая галочка основателя и неограниченная аналитика
            </p>

            {/* Price */}
            <div className="my-5 pb-5 border-b border-[var(--border)]">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-[900] text-[var(--text)]">
                  {billing === 'monthly' ? '50 MDL' : '480 MDL'}
                </span>
                <span className="text-xs text-[var(--text-2)] font-semibold">
                  {billing === 'monthly' ? '/ $3 в месяц' : '/ $28 в год'}
                </span>
              </div>
              <p className="text-[11px] text-[#f5b942] mt-1 font-semibold">
                Все преимущества Премиум включены
              </p>
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-3 text-[13px] text-[var(--text)]">
              <li className="flex items-start gap-2.5 font-medium">
                <span className="w-5 h-5 rounded-full bg-[#f5b942] text-black flex items-center justify-center flex-none mt-0.5">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>
                  <b>Золотая галочка основателя</b>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#f5b942]/20 text-[#f5b942] flex items-center justify-center flex-none mt-0.5">
                  <TrendingUp size={12} />
                </span>
                <span>Полная аналитика и графики продуктивности</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#f5b942]/20 text-[#f5b942] flex items-center justify-center flex-none mt-0.5">
                  <Zap size={12} />
                </span>
                <span>Evidence Vault с семантическим поиском</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6">
            <button
              type="button"
              disabled={busyTier === 'ultra'}
              onClick={() => handleSelectTier('ultra')}
              className={`w-full h-11 rounded-full text-[14px] font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                selectedTier === 'ultra'
                  ? 'bg-[#f5b942] text-black ring-2 ring-[#f5b942]/50'
                  : 'bg-[var(--text)] text-[var(--bg)] hover:bg-[#f5b942] hover:text-black'
              }`}
            >
              {selectedTier === 'ultra' ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Ultra подключён</span>
                </>
              ) : (
                <>
                  <Crown size={16} />
                  <span>Выбрать Ultra</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Security & Guarantee Notes */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-12 pt-8 border-t border-[var(--border)] text-center text-xs text-[var(--text-2)] flex flex-col sm:flex-row items-center justify-center gap-6">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-[#00ba7c]" />
          Безопасная оплата картами Visa / Mastercard и Apple Pay
        </span>
        <span className="flex items-center gap-1.5">
          <HelpCircle size={15} />
          Отмена подписки в любой момент в 1 клик
        </span>
      </div>
    </div>
  )
}
