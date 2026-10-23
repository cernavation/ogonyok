'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Flame,
  Calendar,
  Users,
  Sparkles,
  BarChart3,
  BookOpen,
  Shield,
  ArrowRight,
  MessageSquare,
  Trophy,
  Check,
  Sun,
  Moon,
  ExternalLink,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { GoogleIcon } from '../auth/google-icon'
import { signInWithGoogle, isSupabaseConfigured } from '@/lib/supabase/client'
import { AuthModal } from '../auth/auth-modal'

type Props = {
  onEnterDemo?: () => void
  onNotify?: (msg: string) => void
}

export function GuestLanding({ onEnterDemo, onNotify }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [busy, setBusy] = useState(false)
  const [authModal, setAuthModal] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const isDark = theme === 'dark'
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'
  const hasSupabase = isSupabaseConfigured()

  const handleGoogleLogin = async () => {
    setError(null)
    setBusy(true)
    try {
      if (!hasSupabase) {
        setBusy(false)
        setError('Supabase ключи пока не добавлены в .env.local. Смотрите инструкцию в ИНСТРУКЦИЯ_GOOGLE.md.')
        return
      }
      const res = await signInWithGoogle()
      if (!res.ok) {
        setBusy(false)
        setError(res.error || 'Не удалось открыть авторизацию Google')
      }
    } catch (e: any) {
      setBusy(false)
      setError(e?.message || 'Ошибка запуска Google OAuth')
    }
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 flex flex-col justify-between selection:bg-[#FF5C00]/30 ${
        isDark ? 'bg-black text-white' : 'bg-[#FAFAFA] text-zinc-900'
      }`}
      data-landing-theme={theme}
    >
      {/* ── НАВИГАЦИОННАЯ ШАПКА ────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors px-4 sm:px-8 py-3.5 flex items-center justify-between ${
          isDark
            ? 'bg-black/80 border-zinc-800/80'
            : 'bg-white/80 border-zinc-200/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF5C00] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#FF5C00]/20 font-bold">
            ✦
          </div>
          <span className="font-extrabold text-lg tracking-tight">Огонёк</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Переключатель темы (dark / light) */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-full transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200'
            }`}
            aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Кнопка альтернативного входа */}
          <button
            type="button"
            onClick={() => setAuthModal(true)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            Другие способы входа
          </button>

          {/* Быстрый вход Google в шапке */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF5C00]/90 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
          >
            <GoogleIcon size={14} />
            <span className="hidden sm:inline">Войти через Google</span>
            <span className="sm:hidden">Войти</span>
          </button>
        </div>
      </header>

      {/* ── ОСНОВНОЙ ГЕРОИЧЕСКИЙ БЛОК (X.COM STYLE) ──────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col gap-12 sm:gap-16">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          {/* Бейдж-слоган */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FF5C00]/10 border border-[#FF5C00]/25 text-[#FF5C00]">
            <Flame size={13} className="text-[#FF5C00]" />
            <span>CRM твоей жизни · 700 дней осознанности</span>
          </div>

          {/* Главный заголовок */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08]">
            Огонёк — <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#FF5C00] via-[#FF7A18] to-amber-400 bg-clip-text text-transparent">
              CRM твоей жизни
            </span>
          </h1>

          {/* Одна фраза по ТЗ */}
          <p
            className={`text-base sm:text-xl font-normal leading-relaxed max-w-2xl ${
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            }`}
          >
            Пиши по 1–5 гордостей и благодарностей в день. Через 700 дней сможешь открыть любой день и увидеть, чем жил.
          </p>

          {/* Большая кнопка входа через Google */}
          <div className="w-full max-w-md pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={busy}
              className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-base transition-all shadow-xl active:scale-[0.98] border ${
                isDark
                  ? 'bg-white hover:bg-zinc-100 text-zinc-950 border-white/20'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-white border-zinc-950'
              }`}
            >
              {busy ? (
                <>
                  <Loader2 size={20} className="animate-spin text-[#FF5C00]" />
                  <span>Переход в Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon size={20} />
                  <span>Войти через Google</span>
                </>
              )}
            </button>

            {error && (
              <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                {error}
              </p>
            )}

            <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 pt-1">
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Без пароля
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Полная приватность
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Данные в облаке
              </span>
            </div>

            {/* Тестовый демо-режим (если активен флаг) */}
            {isDemo && onEnterDemo && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="w-full py-2.5 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} /> Открыть тестовый демо-режим (без входа)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 3 ПРЕИМУЩЕСТВА С ИКОНКАМИ ПО ТЗ ───────────────────────────── */}
        <section
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-4"
          aria-label="Преимущества Огонька"
        >
          {/* Пункт 1: Дневник за 2 года */}
          <div
            className={`p-6 rounded-3xl border transition-all flex flex-col gap-3 ${
              isDark
                ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-sm'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center mb-1">
              <BookOpen size={24} />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Дневник за 2 года</h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Летопись побед и внутренней опоры. Огонёк никогда не сбрасывается при пропуске, а новая запись всегда идёт в первый незакрытый день.
            </p>
          </div>

          {/* Пункт 2: Друзья и сторис */}
          <div
            className={`p-6 rounded-3xl border transition-all flex flex-col gap-3 ${
              isDark
                ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-sm'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-1">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Друзья и сторис</h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Поддержка близких соратников. Публикуй отдельные победы в ленту, смотри 24-часовые сторис и общайся в мессенджере Telegram Web UX.
            </p>
          </div>

          {/* Пункт 3: Аналитика и ИИ-разбор */}
          <div
            className={`p-6 rounded-3xl border transition-all flex flex-col gap-3 ${
              isDark
                ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-sm'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-1">
              <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Аналитика и ИИ-разбор</h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Оценка глубины преодоления через Google Gemini API. Карта активности 730 дней, анализ лучших недель и текстовые выводы личной силы.
            </p>
          </div>
        </section>

        {/* ── СТАТИЧНЫЙ КРАСИВЫЙ МАКЕТ ПРИЛОЖЕНИЯ (НЕ ИЗ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ) ── */}
        <section
          className="flex flex-col items-center pt-6"
          aria-label="Интерфейс приложения Огонёк"
        >
          <div className="w-full max-w-4xl rounded-3xl border border-zinc-800/90 bg-[#09090b] shadow-2xl overflow-hidden p-3 sm:p-5 text-white">
            {/* Имитация окна браузера / ОС */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-zinc-500 ml-2 font-mono">ogonek.app/journal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] text-xs font-bold flex items-center gap-1">
                  <Flame size={12} /> Стрик: 705 дней закрыто
                </span>
              </div>
            </div>

            {/* Каркас интерфейса */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Левая мини-колонка */}
              <div className="hidden md:flex md:col-span-3 flex-col gap-2 border-r border-zinc-800/60 pr-3">
                <div className="p-2.5 rounded-xl bg-white/5 font-semibold text-xs flex items-center gap-2 text-white">
                  <BookOpen size={15} className="text-[#FF5C00]" /> Лента дней
                </div>
                <div className="p-2.5 rounded-xl hover:bg-white/5 font-medium text-xs flex items-center gap-2 text-zinc-400">
                  <MessageSquare size={15} /> Чаты соратников
                </div>
                <div className="p-2.5 rounded-xl hover:bg-white/5 font-medium text-xs flex items-center gap-2 text-zinc-400">
                  <Trophy size={15} /> Рейтинг лидеров
                </div>
                <div className="p-2.5 rounded-xl hover:bg-white/5 font-medium text-xs flex items-center gap-2 text-zinc-400">
                  <BarChart3 size={15} /> Аналитика & ИИ
                </div>
                <div className="p-2.5 rounded-xl hover:bg-white/5 font-medium text-xs flex items-center gap-2 text-zinc-400">
                  <Shield size={15} /> Evidence Vault
                </div>
              </div>

              {/* Центральная лента дней (статичный пример дня) */}
              <div className="md:col-span-9 flex flex-col gap-3">
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#FF5C00] text-white flex items-center justify-center font-bold text-xs">
                        ✦
                      </div>
                      <div>
                        <div className="font-bold text-xs">День #705 · Пятница</div>
                        <div className="text-[10px] text-zinc-400">24 октября 2026 · Закрыт вовремя</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                      Норма выполнена (3/3)
                    </span>
                  </div>

                  {/* Список гордостей */}
                  <div className="space-y-1.5 pt-1">
                    <div className="p-2 rounded-xl bg-black/40 border border-zinc-800/50 flex items-start justify-between text-xs">
                      <span className="text-zinc-200">
                        1. Завершил ключевую задачу квартала без компромиссов в качестве
                      </span>
                      <span className="text-[#FF5C00] font-bold shrink-0 ml-2">9.5 ★</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-zinc-800/50 flex items-start justify-between text-xs">
                      <span className="text-zinc-200">
                        2. Пробежал 10 км под дождём, когда хотелось остаться дома
                      </span>
                      <span className="text-[#FF5C00] font-bold shrink-0 ml-2">9.8 ★</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-zinc-800/50 flex items-start justify-between text-xs">
                      <span className="text-zinc-200">
                        3. Сдержал слово и помог другу с запуском его проекта
                      </span>
                      <span className="text-[#FF5C00] font-bold shrink-0 ml-2">9.0 ★</span>
                    </div>
                  </div>

                  {/* Блок ИИ-оценки */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#FF5C00]/10 to-amber-500/5 border border-[#FF5C00]/20 flex items-center gap-2 text-xs">
                    <Sparkles size={14} className="text-[#FF5C00] shrink-0" />
                    <span className="text-zinc-300 text-[11px]">
                      <strong>Google Gemini:</strong> День максимального фокуса и характера. Преодоление лени дало максимальный прирост опоры.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── ФУТЕР ПО ТЗ ─────────────────────────────────────────────────── */}
      <footer
        className={`border-t transition-colors px-4 sm:px-8 py-8 ${
          isDark
            ? 'bg-black border-zinc-800 text-zinc-500'
            : 'bg-white border-zinc-200 text-zinc-500'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#FF5C00] font-bold">✦</span>
            <span className="font-semibold text-zinc-400">Огонёк — CRM твоей жизни</span>
            <span>· © 2026</span>
          </div>

          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="hover:text-zinc-300 transition-colors underline-offset-4 hover:underline"
            >
              Политика конфиденциальности
            </Link>

            <a
              href="https://t.me/ogonek_support"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-300 transition-colors flex items-center gap-1 underline-offset-4 hover:underline"
            >
              <span>Связаться с нами</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>

      {/* Модальное окно резервного входа */}
      {authModal && (
        <AuthModal
          onClose={() => setAuthModal(false)}
          onAuthenticated={() => {
            setAuthModal(false)
            if (onNotify) onNotify('Вход выполнен!')
          }}
          onNotify={onNotify || (() => {})}
        />
      )}
    </div>
  )
}
