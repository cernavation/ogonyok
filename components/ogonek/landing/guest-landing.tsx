'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Flame,
  Users,
  Sparkles,
  Shield,
  ArrowRight,
  MessageSquare,
  Trophy,
  Check,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
  Target,
  BookOpen,
  Video,
  Lock,
  Layers,
  Star,
  Bot,
} from 'lucide-react'
import {
  TIER_PRICES,
  TIER_FEATURES_LIST,
  TIER_NAMES,
  TIER_BADGES,
  type SubscriptionTier,
} from '@/lib/ogonek/permissions'
import { AuthModal } from '../auth/auth-modal'
import { AppleFooter } from './apple-footer'

type Props = {
  onEnterDemo?: () => void
  onNotify?: (msg: string) => void
}

type ShowcaseTab = 'diary' | 'chats' | 'ai' | 'vault' | 'mobile'

export function GuestLanding({ onEnterDemo, onNotify }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [authModal, setAuthModal] = useState<'signin' | 'register' | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month')
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseTab>('diary')

  const isDark = theme === 'dark'

  const handleDemoClick = () => {
    if (onEnterDemo) {
      onEnterDemo()
      return
    }
    try {
      const cur = JSON.parse(localStorage.getItem('ogonek.v2') || '{}')
      cur.auth = { ...(cur.auth || {}), signedIn: true, hasOnboarded: true }
      localStorage.setItem('ogonek.v2', JSON.stringify(cur))
      window.location.reload()
    } catch {
      window.location.href = '/?demo=1'
    }
  }

  const handleSelectFreeTier = () => {
    setAuthModal('register')
  }

  const handleSelectProTier = () => {
    setAuthModal('register')
  }

  const handleSelectUltraTier = () => {
    setAuthModal('register')
  }

  const showcaseTabs: { id: ShowcaseTab; label: string; icon: any; file: string; desc: string }[] = [
    {
      id: 'diary',
      label: 'Дневник побед',
      icon: BookOpen,
      file: '/landing/screen-diary.png',
      desc: 'Главный экран: 1–5 записей вечером, шкала преодоления 1–10★ и статус стрика',
    },
    {
      id: 'chats',
      label: 'Чаты и друзья',
      icon: MessageSquare,
      file: '/landing/screen-chats.png',
      desc: 'Защищённый мессенджер: голосовые, пруфы побед, взаимные стрики и звонки',
    },
    {
      id: 'ai',
      label: 'ИИ-разбор',
      icon: Bot,
      file: '/landing/screen-ai-eval.png',
      desc: 'Бескомпромиссный разбор сопротивления и отчёты юбилейных вех 100/200/300 дней',
    },
    {
      id: 'vault',
      label: 'Evidence Vault',
      icon: Shield,
      file: '/landing/screen-vault.png',
      desc: 'Личный сейф артефактов: фото, чеки, контракты и сертификаты побед навсегда',
    },
    {
      id: 'mobile',
      label: 'Мобильная версия',
      icon: Target,
      file: '/landing/screen-mobile.png',
      desc: 'Полнофункциональный PWA на iPhone и Android с нижней навигацией и быстрым вводом',
    },
  ]

  const faqItems = [
    {
      q: 'Кто может читать мои записи в дневнике?',
      a: 'Только ты. Каждая запись защищена на уровне базы данных строгой политикой Row Level Security (RLS) в Supabase. У каждой отдельной записи есть своя аудитория («Лично / Друзьям / Всем / Группе»). По умолчанию все записи сохраняются со статусом «Лично». Никто, включая администраторов, не имеет доступа к твоим закрытым победам.',
    },
    {
      q: 'Сбросится ли мой стрик, если я пропущу день или заболею?',
      a: 'Никогда. В отличие от токсичных трекеров, где один пропущенный день сжигает месяцы усилий, в Огоньке стрик равен общему количеству закрытых дней дневника. Пропуск ничего не обнуляет: дата и номер привязываются к твоей последней записи. Твой накопленный опыт и самоуважение принадлежат тебе навсегда.',
    },
    {
      q: 'Как работает ИИ с моими данными и записями?',
      a: 'Нейросеть подключается строго по твоему прямому действию («Оценить с ИИ» или в юбилейных отчётах). Запросы передаются через изолированный серверный шлюз без сохранения персональных данных. ИИ никогда не обучается на твоих личных текстах. В отчётах числа и динамику вычисляет строгий детерминированный код, а ИИ лишь бережно и объективно формулирует выводы.',
    },
    {
      q: 'Что происходит с записями и Evidence Vault, если подписка закончится?',
      a: 'Все твои ранее созданные записи, фотографии, прикреплённые документы и артефакты Evidence Vault остаются доступны навсегда. Мы никогда не удаляем и не блокируем уже накопленный опыт. При окончании оплаченного периода аккаунт просто переходит на базовый тариф с сохранением всей истории.',
    },
    {
      q: 'Можно ли забрать свои данные, если я решу экспортировать их?',
      a: 'Да, в любой момент. В разделе «Настройки → Резервные копии» доступен мгновенный экспорт всей летописи, заметок, оценок и метаданных в открытый структурированный формат JSON и читаемый отчёт в один клик.',
    },
  ]

  return (
    <div
      className={`min-h-screen transition-colors duration-200 flex flex-col justify-between selection:bg-[var(--accent,#FF6A1A)]/30 ${
        isDark ? 'bg-black text-white' : 'bg-[#FAFAFA] text-zinc-900'
      }`}
      data-landing-theme={theme}
    >
      {/* ── 1. НАВИГАЦИОННАЯ ШАПКА ────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors px-4 sm:px-8 py-3.5 flex items-center justify-between ${
          isDark ? 'bg-black/85 border-zinc-800/80' : 'bg-white/85 border-zinc-200/80'
        }`}
      >
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Огонёк — главная страница" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[var(--accent,#FF6A1A)] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[var(--accent,#FF6A1A)]/20 font-bold group-hover:scale-105 transition-transform">
              ✦
            </div>
            <span className="font-extrabold text-lg tracking-tight">Огонёк</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-zinc-400" aria-label="Навигация лендинга">
            <a href="#how" aria-label="Перейти к разделу Как это работает" className="hover:text-white transition-colors">Как это работает</a>
            <a href="#showcase" aria-label="Перейти к разделу Витрина интерфейса" className="hover:text-white transition-colors">Витрина</a>
            <a href="#friends" aria-label="Перейти к разделу Друзья и группы" className="hover:text-white transition-colors">Друзья и группы</a>
            <a href="#ai-mentor" aria-label="Перейти к разделу ИИ-оценка и ментор" className="hover:text-white transition-colors">ИИ-оценка</a>
            <a href="#pricing" aria-label="Перейти к разделу Тарифные планы" className="hover:text-white transition-colors">Тарифы</a>
            <a href="#faq" aria-label="Перейти к разделу Частые вопросы" className="hover:text-white transition-colors">FAQ</a>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Переключатель темы */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200'
            }`}
            aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Кнопка попробовать демо */}
          <button
            type="button"
            onClick={handleDemoClick}
            aria-label="Открыть приложение в демо-режиме"
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors border min-h-[40px] cursor-pointer ${
              isDark
                ? 'border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white bg-zinc-900/60'
                : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-950 bg-white'
            }`}
          >
            <Sparkles size={13} className="text-[var(--accent,#FF6A1A)]" />
            <span>Демо</span>
          </button>

          {/* Вход */}
          <button
            type="button"
            onClick={() => setAuthModal('signin')}
            aria-label="Войти в существующий аккаунт"
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors min-h-[40px] cursor-pointer ${
              isDark
                ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            Вход
          </button>

          {/* Регистрация */}
          <button
            type="button"
            onClick={() => setAuthModal('register')}
            aria-label="Начать вести дневник бесплатно"
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[var(--accent,#FF6A1A)] hover:opacity-90 text-black font-extrabold text-xs transition-all shadow-sm active:scale-95 min-h-[40px] cursor-pointer"
          >
            <span>Начать</span>
          </button>
        </div>
      </header>

      {/* ── 2. HERO СЕКЦИЯ ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 flex flex-col gap-16 sm:gap-24">
        <section aria-label="Главный экран Огонька" className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Бейдж стрика */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent,#FF6A1A)]/10 border border-[var(--accent,#FF6A1A)]/30 text-[var(--accent,#FF6A1A)] shadow-sm whitespace-nowrap">
            <Flame size={14} className="text-[var(--accent,#FF6A1A)]" />
            <span>Личный дневник силы · Стрик никогда не сгорает</span>
          </div>

          {/* Заголовок */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
            Твой личный дневник силы.{' '}
            <br />
            <span className="bg-gradient-to-r from-[var(--accent,#FF6A1A)] via-amber-500 to-amber-300 bg-clip-text text-transparent">
              Без фальши и токсичности.
            </span>
          </h1>

          {/* Подзаголовок */}
          <p
            className={`text-base sm:text-xl font-normal leading-relaxed max-w-2xl ${
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}
          >
            Пиши по 1–5 побед и благодарностей в день. Стрик считается по закрытым дням летописи, а не дням подряд: пропуск ничего не обнуляет. За 700 дней ты соберёшь несокрушимый фундамент веры в себя.
          </p>

          {/* Блок целевых кнопок */}
          <div className="w-full max-w-md pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setAuthModal('register')}
              aria-label="Начать вести дневник бесплатно"
              className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-base transition-all shadow-xl active:scale-[0.98] border min-h-[48px] cursor-pointer ${
                isDark
                  ? 'bg-white hover:bg-zinc-100 text-zinc-950 border-white/20'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-white border-zinc-950'
              }`}
            >
              <span>Начать бесплатно</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              onClick={handleDemoClick}
              aria-label="Попробовать демонстрационный режим без регистрации"
              className={`w-full py-3 px-6 rounded-2xl font-semibold text-sm transition-all border flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                isDark
                  ? 'bg-zinc-900/80 hover:bg-zinc-800/80 text-zinc-200 border-zinc-800'
                  : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}
            >
              <Sparkles size={16} className="text-[var(--accent,#FF6A1A)]" />
              <span>Попробовать демо (без регистрации)</span>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400 pt-1">
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Вход по никнейму
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Защита RLS и Signal Privacy
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Без спама и рекламы
              </span>
            </div>
          </div>
        </section>

        {/* ── 3. «КАК ЭТО РАБОТАЕТ» В 3 ШАГА ───────────────────────────────── */}
        <section id="how" aria-label="Как это работает в 3 шага" className="space-y-8 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Как это работает
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Простой и честный 3-шаговый цикл формирования несокрушимого характера.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Шаг 1 */}
            <div
              className={`p-7 rounded-3xl border flex flex-col justify-between gap-6 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-[var(--accent,#FF6A1A)] font-mono">01</span>
                <div className="w-10 h-10 rounded-2xl bg-[var(--accent,#FF6A1A)]/10 text-[var(--accent,#FF6A1A)] flex items-center justify-center font-bold">
                  <BookOpen size={20} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg tracking-tight">Фиксация побед и благодарностей</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Каждый вечер записывай от 1 до 5 главных побед и моментов искренней благодарности. Никаких бесконечных списков дел: только реальные поступки, завершённые сегодня.
                </p>
              </div>
            </div>

            {/* Шаг 2 */}
            <div
              className={`p-7 rounded-3xl border flex flex-col justify-between gap-6 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-[var(--accent,#FF6A1A)] font-mono">02</span>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Bot size={20} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg tracking-tight">Преодоление и разбор ИИ</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Оценивай масштаб преодоления по честной шкале от 1 до 10★. ИИ-ментор анализирует преодолённое сопротивление и даёт трезвый тактический разбор без пустой лести.
                </p>
              </div>
            </div>

            {/* Шаг 3 */}
            <div
              className={`p-7 rounded-3xl border flex flex-col justify-between gap-6 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-[var(--accent,#FF6A1A)] font-mono">03</span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Shield size={20} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg tracking-tight">Сохранение стрика и Evidence Vault</h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Стрик растёт по сумме закрытых дней и никогда не сгорает из-за пропусков. Прикрепляй скриншоты, чеки и фото в личный сейф артефактов как железные доказательства силы.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. РЕАЛЬНЫЕ СКРИНШОТЫ ПРИЛОЖЕНИЯ (SHOWCASE) ─────────────────── */}
        <section id="showcase" aria-label="Реальные скриншоты приложения" className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent,#FF6A1A)]/10 text-[var(--accent,#FF6A1A)] whitespace-nowrap">
              ✦ Живой интерфейс
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Интерфейс уровня X и Telegram
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Никаких картинок-заглушек. Реальные рабочие экраны приложения на десктопе и мобильном.
            </p>
          </div>

          {/* Вкладки переключения экранов */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {showcaseTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeShowcase === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveShowcase(tab.id)}
                  aria-label={`Показать экран: ${tab.label}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all min-h-[44px] cursor-pointer border ${
                    isActive
                      ? 'bg-[var(--accent,#FF6A1A)] text-black font-extrabold border-[var(--accent,#FF6A1A)] shadow-lg shadow-[var(--accent,#FF6A1A)]/20'
                      : isDark
                      ? 'bg-zinc-900/80 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                      : 'bg-white text-zinc-600 hover:text-zinc-950 border-zinc-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Витрина скриншота */}
          <div className="relative w-full max-w-4xl mx-auto pt-3">
            <div className="absolute -inset-2 bg-gradient-to-r from-[var(--accent,#FF6A1A)]/20 via-amber-500/15 to-[var(--accent,#FF6A1A)]/20 rounded-[36px] blur-2xl opacity-60 pointer-events-none" />

            <div className="relative rounded-3xl border border-zinc-800 bg-[#09090b] shadow-2xl overflow-hidden p-3 sm:p-5 text-white">
              {/* Окно браузера */}
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80 mb-3 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-zinc-400 ml-2 font-mono hidden sm:inline">ogonek.app</span>
                </div>
                <div className="text-xs text-zinc-400 font-medium">
                  {showcaseTabs.find((t) => t.id === activeShowcase)?.desc}
                </div>
              </div>

              {/* Реальный скриншот */}
              <div className="rounded-2xl overflow-hidden bg-black border border-zinc-900 flex items-center justify-center">
                {activeShowcase === 'mobile' ? (
                  <div className="py-6 px-4 flex justify-center">
                    <div className="max-w-[340px] rounded-[32px] overflow-hidden border-4 border-zinc-800 shadow-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/landing/screen-mobile.png"
                        alt="Огонёк на мобильном экране 390x844"
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={showcaseTabs.find((t) => t.id === activeShowcase)?.file || '/landing/screen-diary.png'}
                    alt={showcaseTabs.find((t) => t.id === activeShowcase)?.label || 'Скриншот Огонька'}
                    className="w-full h-auto object-cover max-h-[560px]"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. БЛОК «ДРУЗЬЯ И ГРУППЫ» ───────────────────────────────────── */}
        <section id="friends" aria-label="Друзья и закрытые группы" className="space-y-8 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
              <Users size={13} /> Сообщество единомышленников
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Друзья и закрытые группы
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Расти в окружении сильных людей. Без зависти, спама и алгоритмических манипуляций.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-7 rounded-3xl border flex flex-col gap-3.5 ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent,#FF6A1A)]/10 text-[var(--accent,#FF6A1A)] flex items-center justify-center font-bold">
                <Flame size={22} />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Взаимные стрики друзей</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Следи за закрытием дней близких друзей в ленте и профилях. Взаимная поддержка вдохновляет не останавливаться и честно фиксировать свои свершения каждый вечер.
              </p>
            </div>

            <div className={`p-7 rounded-3xl border flex flex-col gap-3.5 ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <Layers size={22} />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Закрытые группы по интересам</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Создавай узкие сообщества («Семья», «Спортсмены», «Команда»). Каждой отдельной записи можно назначать аудиторию, делясь победами только с теми, кому доверяешь.
              </p>
            </div>

            <div className={`p-7 rounded-3xl border flex flex-col gap-3.5 ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <MessageSquare size={22} />
              </div>
              <h3 className="font-bold text-lg tracking-tight">Приватные чаты без спама</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Полноэкранный мессенджер в стиле Telegram Web: голосовые заметки с визуализацией волны, быстрые ответы, черновики для каждого чата и прикрепление артефактов.
              </p>
            </div>

            <div className={`p-7 rounded-3xl border flex flex-col gap-3.5 ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Video size={22} />
              </div>
              <h3 className="font-bold text-lg tracking-tight">P2P аудио и видеозвонки</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Звони друзьям в один клик прямо из диалога с надёжным P2P-соединением и TURN-сервером. Режим «картинка в картинке» позволяет свободно перемещаться по приложению.
              </p>
            </div>
          </div>
        </section>

        {/* ── 6. БЛОК «ИИ-ОЦЕНКА И МЕНТОР СИЛЫ» ────────────────────────────── */}
        <section id="ai-mentor" aria-label="ИИ-оценка и ментор личной силы" className="space-y-8 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              <Bot size={13} /> Трезвый взгляд на личный прогресс
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Бескомпромиссная ИИ-оценка
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Никаких пустых комплиментов и банальных аффирмаций. Только честный разбор преодолённого сопротивления.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`p-7 rounded-3xl border flex flex-col gap-4 ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent,#FF6A1A)]/10 text-[var(--accent,#FF6A1A)] flex items-center justify-center font-bold">
                <Target size={24} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Шкала преодоления 1–10★</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Балл ставится не за механический факт выполнения, а за величину сопротивления, которое ты преодолел: лень, страх, прокрастинацию или усталость.
              </p>
            </div>

            <div className={`p-7 rounded-3xl border flex flex-col gap-4 ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Тактический вердикт дня</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                ИИ-ментор анализирует баланс гордостей и благодарностей дня, подсвечивает точки роста и формулирует трезвый вывод без пустой воды.
              </p>
            </div>

            <div className={`p-7 rounded-3xl border flex flex-col gap-4 ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Trophy size={24} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Юбилейные вехи 100/200/300 дней</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Каждые 100 закрытых дней летописи — глубокий аналитический отчёт. Все числа считает надёжный код, а ИИ формулирует выводы строго по твоим записям.
              </p>
            </div>
          </div>
        </section>

        {/* ── 7. БЛОК ТАРИФОВ (ИЗ PERMISSIONS.TS) ───────────────────────────── */}
        <section id="pricing" aria-label="Тарифные планы" className="space-y-8 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent,#FF6A1A)]/10 text-[var(--accent,#FF6A1A)] whitespace-nowrap">
              ✦ Прозрачные условия
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Простые и честные тарифы
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Базовые функции бесплатны навсегда. Платные тарифы открывают расширенные возможности ИИ и медиа.
            </p>

            {/* Переключатель Месяц / Год */}
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 mt-2">
              <button
                type="button"
                onClick={() => setBillingPeriod('month')}
                aria-label="Оплата помесячно"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                  billingPeriod === 'month'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Месяц
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod('year')}
                aria-label="Оплата за год со скидкой 20 процентов"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[36px] cursor-pointer ${
                  billingPeriod === 'year'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Год</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent,#FF6A1A)] text-black text-[10px] font-black">
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 min-[1100px]:grid-cols-3 gap-6 items-stretch max-w-xl min-[1100px]:max-w-none mx-auto w-full">
            {/* Карточка 1: Базовый */}
            <div
              className={`rounded-3xl p-7 border flex flex-col justify-between transition-all relative ${
                isDark ? 'border-zinc-800 bg-zinc-950/70' : 'border-zinc-200 bg-white shadow-sm'
              }`}
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{TIER_NAMES.free}</h3>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white font-mono">
                    {billingPeriod === 'year' ? 'Бесплатно' : 'Бесплатно'}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Для спокойного личного дневника и формирования привычки
                  </p>
                </div>

                <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
                  {(TIER_FEATURES_LIST.free || []).map((feat) => (
                    <div
                      key={feat.id}
                      className={`flex items-start gap-2.5 text-xs leading-relaxed ${
                        feat.included ? 'text-zinc-200' : 'text-zinc-400 line-through'
                      }`}
                    >
                      <Check
                        size={14}
                        className={`shrink-0 mt-0.5 ${
                          feat.included ? 'text-emerald-500' : 'text-zinc-500'
                        }`}
                      />
                      <span className={feat.highlight ? 'font-bold text-white' : ''}>
                        {feat.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={handleSelectFreeTier}
                  aria-label="Выбрать тариф Базовый"
                  className={`w-full py-3.5 px-5 rounded-2xl font-bold text-sm transition-all min-h-[44px] cursor-pointer flex items-center justify-center gap-2 ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200'
                  }`}
                >
                  <Sparkles size={15} className="text-amber-400" />
                  <span>Начать бесплатно</span>
                </button>
              </div>
            </div>

            {/* Карточка 2: Премиум */}
            <div className="rounded-3xl p-7 border border-[var(--accent,#FF6A1A)]/60 bg-gradient-to-b from-[var(--accent,#FF6A1A)]/10 via-zinc-950 to-zinc-950 shadow-xl shadow-[var(--accent,#FF6A1A)]/10 flex flex-col justify-between transition-all relative">
              {TIER_BADGES.pro && (
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-[var(--accent,#FF6A1A)] to-amber-500 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                  {TIER_BADGES.pro}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{TIER_NAMES.pro}</h3>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white font-mono">
                    {billingPeriod === 'year' ? '240 MDL / год' : '25 MDL / мес'}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Для глубокой работы над собой и ежедневного разбора ИИ
                  </p>
                </div>

                <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
                  {(TIER_FEATURES_LIST.pro || []).map((feat) => (
                    <div
                      key={feat.id}
                      className={`flex items-start gap-2.5 text-xs leading-relaxed ${
                        feat.included ? 'text-zinc-200' : 'text-zinc-500 line-through'
                      }`}
                    >
                      <Check
                        size={14}
                        className={`shrink-0 mt-0.5 ${
                          feat.included ? 'text-emerald-500' : 'text-zinc-600'
                        }`}
                      />
                      <span className={feat.highlight ? 'font-bold text-white' : ''}>
                        {feat.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={handleSelectProTier}
                  aria-label="Выбрать тариф Премиум"
                  className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-sm transition-all min-h-[44px] cursor-pointer flex items-center justify-center gap-2 bg-[var(--accent,#FF6A1A)] hover:opacity-90 text-black shadow-lg shadow-[var(--accent,#FF6A1A)]/20"
                >
                  <Star size={15} />
                  <span>Оформить Премиум</span>
                </button>
              </div>
            </div>

            {/* Карточка 3: Основатель Ultra */}
            <div className="rounded-3xl p-7 border border-amber-500/60 bg-gradient-to-b from-amber-500/10 via-zinc-950 to-zinc-950 shadow-xl shadow-amber-500/10 flex flex-col justify-between transition-all relative">
              {TIER_BADGES.ultra && (
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                  {TIER_BADGES.ultra}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{TIER_NAMES.ultra}</h3>
                  <div className="mt-2 text-3xl font-black tracking-tight text-white font-mono">
                    {billingPeriod === 'year' ? '480 MDL / год' : '50 MDL / мес'}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Полный доступ, Evidence Vault и вклад в развитие проекта
                  </p>
                </div>

                <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
                  {(TIER_FEATURES_LIST.ultra || []).map((feat) => (
                    <div
                      key={feat.id}
                      className={`flex items-start gap-2.5 text-xs leading-relaxed ${
                        feat.included ? 'text-zinc-200' : 'text-zinc-500 line-through'
                      }`}
                    >
                      <Check
                        size={14}
                        className={`shrink-0 mt-0.5 ${
                          feat.included ? 'text-emerald-500' : 'text-zinc-600'
                        }`}
                      />
                      <span className={feat.highlight ? 'font-bold text-white' : ''}>
                        {feat.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={handleSelectUltraTier}
                  aria-label="Выбрать тариф Основатель Ultra"
                  className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-sm transition-all min-h-[44px] cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20"
                >
                  <Flame size={15} />
                  <span>Стать Основателем</span>
                </button>
              </div>
            </div>
          </div>

          {/* Подсказка о безопасности данных после окончания подписки */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 max-w-2xl mx-auto text-center text-xs text-zinc-400">
            <strong className="text-zinc-200">Что будет, если подписка закончится?</strong> Все твои ранее созданные записи, фотографии и артефакты Evidence Vault навсегда сохраняются за тобой. Никакой потери данных.
          </div>
        </section>

        {/* ── 8. FAQ ПРО ПРИВАТНОСТЬ ───────────────────────────────────────── */}
        <section id="faq" aria-label="Частые вопросы про приватность" className="space-y-8 pt-4 max-w-3xl mx-auto w-full">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent,#FF6A1A)]/10 text-[var(--accent,#FF6A1A)] whitespace-nowrap">
              <Lock size={13} /> Безопасность и RLS
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Частые вопросы про приватность
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Всё о защите данных, шифровании сессий и архитектуре Signal Privacy.
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-zinc-800 bg-zinc-950/70 overflow-hidden transition-colors"
                open={idx === 0 ? true : undefined}
              >
                <summary
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base cursor-pointer min-h-[48px] select-none list-none text-zinc-100"
                  aria-label={`Вопрос: ${item.q}`}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    className="text-[var(--accent,#FF6A1A)] shrink-0 transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/50">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── 9. ФИНАЛЬНЫЙ CTA ─────────────────────────────────────────────── */}
        <section aria-label="Финальный призыв к действию" className="pt-4">
          <div className="relative rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-8 sm:p-14 text-center overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--accent,#FF6A1A)]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent,#FF6A1A)]/10 border border-[var(--accent,#FF6A1A)]/30 text-[var(--accent,#FF6A1A)]">
                ✦ Начни сегодня
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Начни вести свой дневник силы уже сегодня.
              </h2>

              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                Первый закрытый день займёт всего 3 минуты, а через год станет самым ценным активом твоей памяти и характера.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthModal('register')}
                  aria-label="Создать аккаунт в Огоньке"
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 py-3.5 px-7 rounded-2xl bg-[var(--accent,#FF6A1A)] hover:opacity-90 text-black font-extrabold text-sm shadow-lg shadow-[var(--accent,#FF6A1A)]/25 transition-all active:scale-95 min-h-[44px] cursor-pointer"
                >
                  <span>Создать аккаунт</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={handleDemoClick}
                  aria-label="Попробовать демо без регистрации"
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:text-white font-semibold text-sm transition-colors min-h-[44px] cursor-pointer"
                >
                  Попробовать демо
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── 10. СЕМАНТИЧЕСКИЙ ФУТЕР В СТИЛЕ APPLE ────────────────────────── */}
      <AppleFooter />

      {/* Модальное окно авторизации */}
      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
          onAuthenticated={() => {
            setAuthModal(null)
            if (onNotify) onNotify('Вход выполнен!')
          }}
          onNotify={onNotify || (() => {})}
        />
      )}
    </div>
  )
}
