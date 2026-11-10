'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Crown,
  ExternalLink,
  Flame,
  HelpCircle,
  Image as ImageIcon,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Smartphone,
  TrendingUp,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import type { OgonekProfile, ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  type SubscriptionTier,
  normalizeTier,
  getBillingCheckoutUrl,
  getPaymentButtonLabel,
  TIER_NAMES,
  TIER_LIMITS_MAP,
} from '@/lib/ogonek/permissions'

type Props = {
  onNavigate: (view: ViewId) => void
  onUpdateProfile?: (patch: Partial<OgonekProfile>) => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
  verified?: boolean
  subscriptionTier?: SubscriptionTier | 'premium'
}

type BillingPeriod = 'monthly' | 'yearly'

const FAQS = [
  {
    q: 'Что будет, если подписка закончится?',
    a: 'Твои данные НИКОГДА не удаляются. Все созданные записи, группы, вехи и достижения сохраняются навсегда. Записи длиннее 1 000 символов останутся полностью читаемыми в ленте и профиле. При их последующем редактировании система попросит сократить текст до лимита Базового тарифа либо возобновить подписку. Платные возможности (видеозвонки, ИИ-оценка, Сейф доказательств) временно заблокируются до продления.',
  },
  {
    q: 'Можно ли отменить подписку в любой момент?',
    a: 'Да, в любой момент без скрытых штрафов или комиссий. До конца оплаченного периода все возможности тарифа останутся активными.',
  },
  {
    q: 'Безопасна ли онлайн-оплата?',
    a: 'Оплата проходит через защищённый биллинг-шлюз с шифрованием PCI DSS уровня банковской безопасности (Visa, Mastercard, Apple Pay). Мы не храним номера банковских карт.',
  },
  {
    q: 'Чем тариф Ultra отличается от Премиум?',
    a: 'Ultra даёт золотую галочку основателя ⚡, лимит до 5 000 символов, до 3 фото в день, до 20 групп, персональное напутствие Ментора при ИИ-оценке и золотые карточки 100-дневных вех трансформации.',
  },
]

const COMPARISON_ROWS = [
  {
    title: 'Объём записи гордости',
    free: `${TIER_LIMITS_MAP.free.maxCharsPerEntry.toLocaleString('ru-RU')} симв.`,
    pro: `${TIER_LIMITS_MAP.pro.maxCharsPerEntry.toLocaleString('ru-RU')} симв.`,
    ultra: `${TIER_LIMITS_MAP.ultra.maxCharsPerEntry.toLocaleString('ru-RU')} симв.`,
  },
  {
    title: 'Фото дня к летописи',
    free: '—',
    pro: '1 фото в день',
    ultra: 'До 3 фото в день',
  },
  {
    title: 'ИИ-оценка летописи',
    free: '—',
    pro: '1 в день (шкалы)',
    ultra: '1 в день + напутствие Ментора',
  },
  {
    title: 'Видеозвонки соратникам',
    free: '—',
    pro: 'Включено (HD)',
    ultra: 'Включено (HD + приоритет)',
  },
  {
    title: 'Аудиозвонки соратникам',
    free: 'Бесплатно',
    pro: 'Бесплатно',
    ultra: 'Бесплатно',
  },
  {
    title: 'Создание своих сообществ',
    free: `${TIER_LIMITS_MAP.free.maxGroupsOwned} группа`,
    pro: `До ${TIER_LIMITS_MAP.pro.maxGroupsOwned} групп`,
    ultra: `До ${TIER_LIMITS_MAP.ultra.maxGroupsOwned} групп`,
  },
  {
    title: 'Участников в группе',
    free: `${TIER_LIMITS_MAP.free.maxGroupMembers}`,
    pro: `${TIER_LIMITS_MAP.pro.maxGroupMembers}`,
    ultra: `${TIER_LIMITS_MAP.ultra.maxGroupMembers}`,
  },
  {
    title: 'Сейф доказательств (Свод силы)',
    free: 'Превью',
    pro: 'Полный доступ',
    ultra: 'Золотые вехи + экспорт',
  },
  {
    title: 'Утренний фокус & таймеры',
    free: 'Базовый',
    pro: 'Таймер фокуса 25 мин',
    ultra: 'Таймер + аналитика фокуса',
  },
  {
    title: 'Кастомизация темы и цвета',
    free: '6 пресетов',
    pro: 'Любой HEX-цвет',
    ultra: 'Эксклюзивное золото',
  },
  {
    title: 'Расширенная аналитика',
    free: 'Базовая',
    pro: 'В 5 раз больше метрик',
    ultra: 'Глубокий разбор Ментора',
  },
]

export function PremiumView({
  onNavigate,
  onUpdateProfile,
  onNotify,
  soundEnabled = true,
  verified = false,
  subscriptionTier,
}: Props) {
  const { state } = useOgonekStore()
  const [billing, setBilling] = useState<BillingPeriod>('monthly')
  const [modalTier, setModalTier] = useState<'pro' | 'ultra' | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  useBodyScrollLock(Boolean(modalTier))

  // Единый источник истины для активного тарифа
  const activeTier: SubscriptionTier = normalizeTier(
    subscriptionTier || state.profile.subscription_tier,
    state.profile.subscription_expires_at || state.profile.subscription_valid_until
  )
  const validUntil = state.profile.subscription_valid_until || state.profile.subscription_expires_at

  const username = state.profile.username || 'user'

  // Закрытие модального окна по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalTier(null)
      }
    }
    if (modalTier) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalTier])

  const handleSelectTier = (tier: SubscriptionTier) => {
    playClick(soundEnabled)

    if (tier === 'free') {
      if (activeTier === 'free') return
      onUpdateProfile?.({ subscription_tier: 'free' })
      onNotify('Тариф «Базовый» активен')
      playSuccess(soundEnabled)
      return
    }

    const checkoutUrl = getBillingCheckoutUrl({
      tier,
      username,
      period: billing === 'yearly' ? 'year' : 'month',
    })

    // По ТЗ кнопка ведёт прямо на https://memernity.com/checkout
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
    onNotify?.(`Переход к оформлению: ${TIER_NAMES[tier]}`)
  }

  const openTelegramSupport = () => {
    playClick(soundEnabled)
    window.open('https://t.me/cernavation', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="view-premium min-h-screen pb-24 text-[var(--text)]">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => onNavigate('home')}
          aria-label="Назад"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)] flex items-center gap-2">
            Премиум в Огоньке
            <BadgeCheck size={18} className="text-[#1d9bf0]" />
          </h1>
          <p className="text-[13px] text-[var(--muted)] font-normal">
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
          Выберите подходящий тариф: от базового доступа до синей галочки верификации и расширенной ИИ-оценки от Огонёк ИИ.
        </p>

        {/* Индикатор срока действия подписки */}
        {validUntil && activeTier !== 'free' && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-[var(--bg-elev)] border border-[var(--line)] inline-flex items-center gap-2 text-xs text-[var(--text)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Тариф <strong>{TIER_NAMES[activeTier]}</strong> активен до{' '}
              <strong>{new Date(validUntil).toLocaleDateString('ru-RU')}</strong>
            </span>
          </div>
        )}

        {/* Billing Switcher (Ежемесячно / Ежегодно) */}
        <div className="mt-6 inline-flex p-1 rounded-full bg-[var(--bg-elev)] border border-[var(--line)] relative" role="radiogroup" aria-label="Период оплаты">
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

      {/* 3 Tariff Cards: вертикальное расположение в колонку (X.com standard внутри 600px) */}
      <div className="flex flex-col gap-6 p-4 items-stretch w-full">
        {/* TARIFF 1: БАЗОВЫЙ (0 MDL / Бесплатно навсегда) */}
        <div
          className={`flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-[var(--bg-elev)] border transition-all relative ${
            activeTier === 'free'
              ? 'border-[var(--text)] ring-2 ring-[var(--text)]/20'
              : 'border-[var(--line)] hover:border-[var(--border-strong)]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-2)]">
                Для дисциплины
              </span>
              {activeTier === 'free' && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-[var(--text)] border border-[var(--line)]">
                  Текущий план
                </span>
              )}
            </div>

            <h3 className="text-xl font-[800] text-[var(--text)] tracking-tight">
              Базовый
            </h3>
            <p className="text-xs text-[var(--text-2)] mt-1 min-h-[32px]">
              Необходимый набор для ежедневной летописи и дисциплины
            </p>

            {/* Price: 0 MDL / Бесплатно навсегда */}
            <div className="my-5 pb-5 border-b border-[var(--line)]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-[900] text-[var(--text)]">
                  0 MDL
                </span>
                <span className="text-xs text-[#00ba7c] font-bold">
                  Бесплатно навсегда
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-3)] mt-1">
                Всегда доступен · без скрытых списаний
              </p>
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-3 text-[13px] text-[var(--text)]">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center flex-none mt-0.5 text-[var(--text)]">
                  <Smartphone size={12} strokeWidth={2.5} />
                </span>
                <span>Доступ ко всем устройствам (Web, PWA на iPhone)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center flex-none mt-0.5 text-[var(--text)]">
                  <Flame size={12} strokeWidth={2.5} className="text-[#ff6b35]" />
                </span>
                <span>Безлимитный стрик летописи</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center flex-none mt-0.5 text-[var(--text)]">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span>Утренний фокус и таймеры</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6">
            <button
              type="button"
              disabled={activeTier === 'free'}
              onClick={() => handleSelectTier('free')}
              className={`w-full h-11 rounded-full text-[14px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTier === 'free'
                  ? 'bg-transparent border border-[var(--line)] text-[var(--text-2)] cursor-default'
                  : 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90 active:scale-95'
              }`}
            >
              {activeTier === 'free' ? 'Текущий план' : 'Перейти на Базовый'}
            </button>
          </div>
        </div>

        {/* TARIFF 2: ПРЕМИУМ (25 MDL / $1.5 в месяц) [ХИТ] */}
        <div
          className={`flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-[var(--bg-elev)] border transition-all relative ${
            activeTier === 'pro'
              ? 'border-[#1d9bf0] ring-2 ring-[#1d9bf0]/20'
              : 'border-[#1d9bf0]/70 hover:border-[#1d9bf0]'
          }`}
        >
          {/* Top Badge: ХИТ */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-[#1d9bf0] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={11} /> Хит
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#1d9bf0]">
                Популярный
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#1d9bf0] px-2 py-0.5 rounded-full bg-[#1d9bf0]/10 border border-[#1d9bf0]/20">
                <BadgeCheck size={12} />
                Премиум
              </span>
            </div>

            <h3 className="text-xl font-[800] text-[var(--text)] tracking-tight flex items-center gap-1.5">
              Премиум
              <BadgeCheck size={19} className="text-[#1d9bf0]" />
            </h3>
            <p className="text-xs text-[var(--text-2)] mt-1 min-h-[32px]">
              Официальный статус, ИИ-оценка дня и расширенные лимиты
            </p>

            {/* Price: 25 MDL / $1.5 в месяц */}
            <div className="my-5 pb-5 border-b border-[var(--line)]">
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
                  <b>Лимит записей до 3 000 символов</b>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1d9bf0]/20 text-[#1d9bf0] flex items-center justify-center flex-none mt-0.5">
                  <Sparkles size={12} />
                </span>
                <span>
                  <b>Огонёк ИИ:</b> 1 авто-оценка в день и мудрые советы
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1d9bf0]/20 text-[#1d9bf0] flex items-center justify-center flex-none mt-0.5">
                  <ImageIcon size={12} />
                </span>
                <span>До 1 фото в день к записям</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1d9bf0]/20 text-[#1d9bf0] flex items-center justify-center flex-none mt-0.5">
                  <TrendingUp size={12} />
                </span>
                <span>Видеозвонки, до 5 групп и расширенная аналитика</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6">
            <button
              type="button"
              onClick={() => handleSelectTier('pro')}
              className={`w-full h-11 rounded-full text-[14px] font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                activeTier === 'pro'
                  ? 'bg-[#1d9bf0] text-white ring-2 ring-[#1d9bf0]/50'
                  : 'bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white'
              }`}
            >
              {activeTier === 'pro' ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>{getPaymentButtonLabel(activeTier, 'pro')}</span>
                </>
              ) : (
                <>
                  <BadgeCheck size={16} />
                  <span>{getPaymentButtonLabel(activeTier, 'pro')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* TARIFF 3: ОСНОВАТЕЛЬ ULTRA (50 MDL / $3 в месяц) */}
        <div
          className={`flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-[var(--bg-elev)] border transition-all relative ${
            activeTier === 'ultra'
              ? 'border-[#f5b942] ring-2 ring-[#f5b942]/30'
              : 'border-[var(--line)] hover:border-[#f5b942]/60'
          }`}
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
              Основатель Ultra
              <Crown size={18} className="text-[#f5b942]" />
            </h3>
            <p className="text-xs text-[var(--text-2)] mt-1 min-h-[32px]">
              Золотая галочка основателя и неограниченная аналитика
            </p>

            {/* Price: 50 MDL / $3 в месяц */}
            <div className="my-5 pb-5 border-b border-[var(--line)]">
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
                <span>Сейф доказательств с семантическим поиском</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#f5b942]/20 text-[#f5b942] flex items-center justify-center flex-none mt-0.5">
                  <Crown size={12} />
                </span>
                <span>Максимальный приоритет в рейтинге</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6">
            <button
              type="button"
              onClick={() => handleSelectTier('ultra')}
              className={`w-full h-11 rounded-full text-[14px] font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                activeTier === 'ultra'
                  ? 'bg-[#f5b942] text-black ring-2 ring-[#f5b942]/50'
                  : 'bg-[var(--text)] text-[var(--bg)] hover:bg-[#f5b942] hover:text-black'
              }`}
            >
              {activeTier === 'ultra' ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>{getPaymentButtonLabel(activeTier, 'ultra')}</span>
                </>
              ) : (
                <>
                  <Crown size={16} />
                  <span>{getPaymentButtonLabel(activeTier, 'ultra')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Сравнительная таблица всех возможностей (Этап 13) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-12 w-full">
        <div className="text-center mb-6">
          <span className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
            Сравнение тарифов
          </span>
          <h3 className="text-xl sm:text-2xl font-[900] text-[var(--text)] tracking-tight mt-1">
            Матрица возможностей
          </h3>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface2)]">
                <th className="p-3.5 sm:p-4 font-bold text-[var(--text)]">Функция</th>
                <th className="p-3.5 sm:p-4 font-bold text-[var(--text-2)]">Базовый</th>
                <th className="p-3.5 sm:p-4 font-bold text-[#1d9bf0]">Премиум</th>
                <th className="p-3.5 sm:p-4 font-bold text-[#f5b942]">Ultra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] text-[var(--text)]">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-[var(--text)]">{row.title}</td>
                  <td className="p-3.5 sm:p-4 text-[var(--text-2)]">{row.free}</td>
                  <td className="p-3.5 sm:p-4 font-medium text-[#1d9bf0]">{row.pro}</td>
                  <td className="p-3.5 sm:p-4 font-medium text-[#f5b942]">{row.ultra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ: Часто задаваемые вопросы (Этап 13) */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-14 w-full">
        <div className="text-center mb-6">
          <span className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
            Вопросы и ответы
          </span>
          <h3 className="text-xl sm:text-2xl font-[900] text-[var(--text)] tracking-tight mt-1">
            Часто задаваемые вопросы
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setOpenFaq(isOpen ? null : idx)
                  }}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base text-[var(--text)] hover:text-[var(--accent)] transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp size={18} className="flex-none text-[var(--text-2)]" />
                  ) : (
                    <ChevronDown size={18} className="flex-none text-[var(--text-2)]" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-[13px] text-[var(--text-2)] leading-relaxed border-t border-[var(--line)]/50">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
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

      {/* Модальное окно онлайн-оплаты в разработке */}
      {modalTier && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalTier(null)
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-left"
          >
            {/* Close X */}
            <button
              type="button"
              onClick={() => setModalTier(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>

            {/* Header Icon */}
            <div className="w-12 h-12 rounded-2xl bg-[#1d9bf0]/10 text-[#1d9bf0] flex items-center justify-center mb-4">
              {modalTier === 'ultra' ? (
                <Crown size={24} className="text-[#f5b942]" />
              ) : (
                <Sparkles size={24} className="text-[#1d9bf0]" />
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--text-2)]">
                Подключение тарифа
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  modalTier === 'ultra'
                    ? 'bg-[#f5b942]/15 text-[#f5b942]'
                    : 'bg-[#1d9bf0]/15 text-[#1d9bf0]'
                }`}
              >
                {modalTier === 'ultra' ? '50 MDL / $3' : '25 MDL / $1.5'}
              </span>
            </div>

            <h3 className="text-xl font-[800] text-[var(--text)] tracking-tight">
              {modalTier === 'ultra' ? 'Основатель Ultra' : 'Премиум в Огоньке'}
            </h3>

            {/* Текст по ТЗ: Подключение онлайн-оплаты в разработке. Для активации обратитесь к @cernavation */}
            <div className="mt-3 p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[14px] text-[var(--text)] leading-relaxed">
              <p>
                Подключение онлайн-оплаты в разработке. Для активации обратитесь к{' '}
                <a
                  href="https://t.me/cernavation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#1d9bf0] hover:underline"
                >
                  @cernavation
                </a>
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (modalTier) {
                    window.open(
                      getBillingCheckoutUrl({
                        tier: modalTier,
                        username,
                        period: billing === 'yearly' ? 'year' : 'month',
                      }),
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                }}
                className="w-full h-12 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <span>Оплатить онлайн (Memernity Checkout)</span>
                <ExternalLink size={14} className="opacity-70" />
              </button>

              <button
                type="button"
                onClick={openTelegramSupport}
                className="w-full h-11 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow transition-all active:scale-95"
              >
                <MessageCircle size={18} />
                <span>Написать в Telegram (@cernavation)</span>
                <ExternalLink size={14} className="opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => setModalTier(null)}
                className="w-full h-10 rounded-full border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] font-semibold text-[13px] transition-colors"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
