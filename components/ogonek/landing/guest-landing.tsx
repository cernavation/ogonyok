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
  ChevronDown,
  ChevronRight,
  Mic,
  Lock,
  WifiOff,
  Download,
  Target,
  Heart,
  Briefcase,
  Code2,
  Compass,
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
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const isDark = theme === 'dark'
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'
  const hasSupabase = isSupabaseConfigured()

  const handleGoogleLogin = async () => {
    setError(null)
    setBusy(true)
    try {
      if (!hasSupabase) {
        setBusy(false)
        setError('Supabase ключи пока не настроены. Воспользуйтесь демо-режимом или см. ИНСТРУКЦИЯ_GOOGLE.md.')
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

  const faqItems = [
    {
      q: 'Кто может читать мои записи в дневнике?',
      a: 'Только ты. Каждая запись защищена на уровне базы данных (Row Level Security в Supabase). Никто, кроме владельца аккаунта, не имеет доступа к твоим победам и благодарностям, если ты сам явно не решишь опубликовать конкретный пост в общую ленту.',
    },
    {
      q: 'Сбросится ли мой стрик, если я пропущу день или заболею?',
      a: 'Никогда. В отличие от токсичных трекеров, где один пропуск стирает год работы, в Огоньке стрик равен общему количеству закрытых дней дневника. Твой накопленный опыт и победы принадлежат тебе навсегда.',
    },
    {
      q: 'Сколько стоит использование Огонька?',
      a: 'Огонёк полностью бесплатен для личного ведения дневника, хранения побед в Evidence Vault, общения в чатах соратников и аналитики. Без скрытых подписок и без навязчивой рекламы.',
    },
    {
      q: 'Как устроена авторизация через Google?',
      a: 'Вход выполняется в один клик через официальный OAuth 2.0 от Supabase. Мы не получаем доступ к твоим паролям или почте — только подтверждение твоей личности, имя и аватар для профиля.',
    },
    {
      q: 'Можно ли забрать свои данные, если я решу уйти?',
      a: 'Да, в любой момент. В разделе «Настройки → Резервные копии» доступен экспорт всей истории, файлов и заметок в открытый формат JSON в один клик.',
    },
  ]

  const featureCards = [
    {
      icon: BookOpen,
      title: 'Дневник побед',
      desc: 'Шкала преодоления от 1 до 10. Фиксируй только реальные свершения вместо бесконечных списков дел.',
    },
    {
      icon: Heart,
      title: 'Благодарности',
      desc: 'Фокус на ценности каждого прожитого дня, поддержке близких и важных мелочах.',
    },
    {
      icon: Shield,
      title: 'Evidence Vault',
      desc: 'Сейф артефактов: прикрепляй фото, чеки, скриншоты, отзывы и сертификаты как железные пруфы.',
    },
    {
      icon: MessageSquare,
      title: 'Мессенджер соратников',
      desc: 'Полноэкранный мессенджер в стиле X.com и Telegram Web: голосовые, быстрые реакции, папки диалогов.',
    },
    {
      icon: Trophy,
      title: 'Рейтинг силы',
      desc: 'Лидерборд единомышленников: вдохновляйся стриками соратников без зависти и токсичной конкуренции.',
    },
    {
      icon: Target,
      title: 'Фокус утра',
      desc: '3 главных удара дня и настройка намерений. Начинай утро с кристальной ясности цели.',
    },
    {
      icon: Mic,
      title: 'Голосовые заметки',
      desc: 'Наговаривай победы на ходу. Google Gemini автоматически расшифрует голос в структурированный текст.',
    },
    {
      icon: BarChart3,
      title: 'Аналитика 700+ дней',
      desc: 'Интерактивная карта активности, динамика стрика, статистика силы и отчёты лучших недель.',
    },
    {
      icon: Lock,
      title: 'Приватность Signal',
      desc: 'Row Level Security: твои записи заперты ключом твоей сессии. Никакой продажи данных брокерам.',
    },
    {
      icon: WifiOff,
      title: 'Работа офлайн (PWA)',
      desc: 'Пиши в самолёте, метро или на даче. Приложение мгновенно синхронизирует данные при появлении сети.',
    },
    {
      icon: Download,
      title: 'Экспорт в PDF и JSON',
      desc: 'Твои данные принадлежат только тебе. Резервная копия летописи скачивается в один клик.',
    },
    {
      icon: Sparkles,
      title: 'Без рекламы и спама',
      desc: 'Чистый премиальный опыт. Никаких баннеров, трекеров внимания или навязанных уведомлений.',
    },
  ]

  return (
    <div
      className={`min-h-screen transition-colors duration-200 flex flex-col justify-between selection:bg-[#FF5C00]/30 ${
        isDark ? 'bg-black text-white' : 'bg-[#FAFAFA] text-zinc-900'
      }`}
      data-landing-theme={theme}
    >
      {/* ── 1. НАВИГАЦИОННАЯ ШАПКА С РАЗМЫТИЕМ (X.COM STYLE) ────────────────── */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors px-4 sm:px-8 py-3.5 flex items-center justify-between ${
          isDark
            ? 'bg-black/85 border-zinc-800/80'
            : 'bg-white/85 border-zinc-200/80'
        }`}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF5C00] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#FF5C00]/20 font-bold group-hover:scale-105 transition-transform">
              ✦
            </div>
            <span className="font-extrabold text-lg tracking-tight">Огонёк</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-zinc-400">
            <a href="#about" className="hover:text-white transition-colors">О проекте</a>
            <a href="#how" className="hover:text-white transition-colors">Как это работает</a>
            <a href="#features" className="hover:text-white transition-colors">Функции</a>
            <a href="#for-whom" className="hover:text-white transition-colors">Для кого</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Переключатель темы */}
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
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Кнопка попробовать демо */}
          <button
            type="button"
            onClick={handleDemoClick}
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors border ${
              isDark
                ? 'border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white bg-zinc-900/60'
                : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-950 bg-white'
            }`}
          >
            <Sparkles size={13} className="text-[#FF5C00]" />
            <span>Демо</span>
          </button>

          {/* Альтернативный вход */}
          <button
            type="button"
            onClick={() => setAuthModal(true)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            Вход
          </button>

          {/* Главная кнопка Google в шапке */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={busy}
            className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF5C00]/90 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <GoogleIcon size={14} />
            <span className="hidden sm:inline">Войти через Google</span>
            <span className="sm:hidden">Google</span>
          </button>
        </div>
      </header>

      {/* ── 2. HERO СЕКЦИЯ (ГИГАНТСКАЯ ТИПОГРАФИКА + GLOW ЭФФЕКТ) ───────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 flex flex-col gap-16 sm:gap-24">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Бейдж */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-[#FF5C00] shadow-sm">
            <Flame size={14} className="text-[#FF5C00]" />
            <span>Личный дневник силы · Стрик никогда не сгорает</span>
          </div>

          {/* Гигантский заголовок */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
            Твой личный дневник силы.{' '}
            <br />
            <span className="bg-gradient-to-r from-[#FF5C00] via-[#FF7A18] to-amber-400 bg-clip-text text-transparent">
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

          {/* Блок целевых действий */}
          <div className="w-full max-w-md pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={busy}
              className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-base transition-all shadow-xl active:scale-[0.98] border cursor-pointer ${
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
                  <span>Начать вести бесплатно</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDemoClick}
              className={`w-full py-3 px-6 rounded-2xl font-semibold text-sm transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                isDark
                  ? 'bg-zinc-900/80 hover:bg-zinc-800/80 text-zinc-200 border-zinc-800'
                  : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}
            >
              <Sparkles size={16} className="text-[#FF5C00]" />
              <span>Попробовать демо-режим (без регистрации)</span>
            </button>

            {error && (
              <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500 pt-1">
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Вход в 1 клик
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Без паролей
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check size={14} className="text-emerald-500" /> Ваши записи приватны
              </span>
            </div>
          </div>
        </div>

        {/* ── ИНТЕРАКТИВНЫЙ МАКЕТ С ЛЁГКИМ СВЕЧЕНИЕМ АКЦЕНТА ──────────────── */}
        <div className="relative w-full max-w-4xl mx-auto pt-4">
          {/* Свечение акцента */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#FF5C00]/25 via-amber-500/20 to-[#FF5C00]/25 rounded-[32px] blur-2xl opacity-60 pointer-events-none" />

          <div className="relative rounded-3xl border border-zinc-800/90 bg-[#09090b] shadow-2xl overflow-hidden p-3 sm:p-5 text-white">
            {/* Окно браузера */}
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

            {/* Каркас */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="hidden md:flex md:col-span-3 flex-col gap-2 border-r border-zinc-800/60 pr-3">
                <div className="p-2.5 rounded-xl bg-white/5 font-semibold text-xs flex items-center gap-2 text-white">
                  <BookOpen size={15} className="text-[#FF5C00]" /> Лента дней
                </div>
                <div className="p-2.5 rounded-xl hover:bg-white/5 font-medium text-xs flex items-center gap-2 text-zinc-400">
                  <MessageSquare size={15} /> Чаты соратников
                </div>
                <div className="p-2.5 rounded-xl hover:bg-white/5 font-medium text-xs flex items-center gap-2 text-zinc-400">
                  <Trophy size={15} /> Рейтинг силы
                </div>
                <div className="p-2.5 rounded-xl hover:bg-white/5 font-medium text-xs flex items-center gap-2 text-zinc-400">
                  <BarChart3 size={15} /> Аналитика & ИИ
                </div>
                <div className="p-2.5 rounded-xl hover:bg-white/5 font-medium text-xs flex items-center gap-2 text-zinc-400">
                  <Shield size={15} /> Evidence Vault
                </div>
              </div>

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

                  <div className="space-y-1.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/50 flex items-start justify-between text-xs">
                      <span className="text-zinc-200">
                        1. Вышел на абсолютно новую стадию переговоров с поставщиком по ключевому проекту
                      </span>
                      <span className="text-[#FF5C00] font-bold shrink-0 ml-2">9.5 ★</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/50 flex items-start justify-between text-xs">
                      <span className="text-zinc-200">
                        2. Пробежал 10 км под дождём, когда внутренний голос уговаривал отложить
                      </span>
                      <span className="text-[#FF5C00] font-bold shrink-0 ml-2">9.8 ★</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/50 flex items-start justify-between text-xs">
                      <span className="text-zinc-200">
                        3. Сдержал слово и помог соратнику запустить релиз вовремя
                      </span>
                      <span className="text-[#FF5C00] font-bold shrink-0 ml-2">9.0 ★</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#FF5C00]/10 to-amber-500/5 border border-[#FF5C00]/20 flex items-center gap-2 text-xs">
                    <Sparkles size={14} className="text-[#FF5C00] shrink-0" />
                    <span className="text-zinc-300 text-[11px]">
                      <strong>Google Gemini:</strong> День максимального фокуса. Преодоление внутреннего сопротивления дало ключевой прирост опоры.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. СЕКЦИЯ 3 КЛЮЧЕВЫХ СМЫСЛОВ («ЗАЧЕМ ЭТО НУЖНО») ─────────────── */}
        <section id="about" className="space-y-8 pt-6">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Зачем вести Огонёк?
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              3 фундаментальных отличия от всех существующих трекеров привычек и дневников.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className={`p-7 rounded-3xl border flex flex-col gap-4 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center font-bold">
                <Flame size={24} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Стрик, который никогда не сгорает</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                В обычных приложениях один пропуск из-за болезни стирает месяцы усилий и вызывает апатию. В Огоньке стрик — это общее количество закрытых дней. Твой накопленный опыт навсегда остаётся с тобой.
              </p>
            </div>

            <div
              className={`p-7 rounded-3xl border flex flex-col gap-4 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Target size={24} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">5 побед вместо 100 задач</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Бесконечные списки задач рождают чувство вины и выгорание. Огонёк разворачивает внимание на то, что реально преодолено сегодня. Оценивай масштаб преодоления от 1 до 10.
              </p>
            </div>

            <div
              className={`p-7 rounded-3xl border flex flex-col gap-4 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Shield size={24} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Честность и опора на факты</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Никакого токсичного позитива и пустых аффирмаций. Ты прикрепляешь пруфы в Evidence Vault и видишь реальные артефакты своего прогресса и преодоления за годы.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. СЕКЦИЯ 4 ШАГОВ («КАК ЭТО РАБОТАЕТ») ───────────────────────── */}
        <section id="how" className="space-y-8 pt-6">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Как это работает
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Простой 4-шаговый цикл формирования несокрушимого характера.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: '01',
                title: 'День закрывается вечером',
                desc: 'Перед сном открываешь Огонёк и фиксируешь от 1 до 5 главных побед и благодарностей дня.',
              },
              {
                step: '02',
                title: 'Ты видишь динамику',
                desc: 'Карта активности за 700+ дней, аналитика силы, инсайты и отчёты лучших продуктивных недель.',
              },
              {
                step: '03',
                title: 'Собираешь доказательства',
                desc: 'Прикрепляешь скриншоты, отзывы клиентов, сертификаты и файлы в личный Evidence Vault.',
              },
              {
                step: '04',
                title: 'Растёшь без выгорания',
                desc: 'Формируется железобетонная самооценка, основанная на реальных фактах, а не на эмоциях.',
              },
            ].map((st) => (
              <div
                key={st.step}
                className={`p-6 rounded-3xl border flex flex-col justify-between gap-6 ${
                  isDark
                    ? 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    : 'bg-white border-zinc-200/90 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-[#FF5C00] font-mono">{st.step}</span>
                  <div className="w-2 h-2 rounded-full bg-[#FF5C00]/40" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-base tracking-tight">{st.title}</h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. ИНТЕРАКТИВНАЯ ВИТРИНА ФУНКЦИЙ (СЕТКА 3×4 = 12 КАРТОЧЕК) ──── */}
        <section id="features" className="space-y-8 pt-6">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Всё, что внутри
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              12 продуманных инструментов для жизни, работы и внутренней дисциплины.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureCards.map((feat, idx) => {
              const Icon = feat.icon
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-3xl border transition-all flex flex-col gap-3 group ${
                    isDark
                      ? 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                      : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-sm'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-base tracking-tight">{feat.title}</h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {feat.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 6. СЕКЦИЯ «ДЛЯ КОГО» (3 КАРТОЧКИ) ────────────────────────────── */}
        <section id="for-whom" className="space-y-8 pt-6">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Для кого создан Огонёк
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Для людей, которые ценят результаты, честность и внутреннюю тишину.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className={`p-7 rounded-3xl border flex flex-col gap-4 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Briefcase size={22} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Предприниматели и лидеры</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Каждый день несёт стресс и неопределённость. Огонёк помогает держать фокус на главных сделках, фиксировать ключевые прорывы и сохранять холодную голову в моменты кризисов.
              </p>
            </div>

            <div
              className={`p-7 rounded-3xl border flex flex-col gap-4 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Code2 size={22} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Разработчики и создатели</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Лучшее лекарство от синдрома самозванца. Сохраняй реальные коммиты, успешные архитектурные решения и победы над сложными багами в личный Evidence Vault.
              </p>
            </div>

            <div
              className={`p-7 rounded-3xl border flex flex-col gap-4 ${
                isDark
                  ? 'bg-zinc-950/70 border-zinc-800'
                  : 'bg-white border-zinc-200/90 shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Compass size={22} />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Те, кто устал выгорать</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Выход из порочного круга «я сделал недостаточно». Огонёк даёт твёрдое доказательство того, сколько ты уже преодолел, возвращая спокойствие и самоуважение.
              </p>
            </div>
          </div>
        </section>

        {/* ── 7. БЛОК FAQ (5 АККОРДЕОНОВ) ──────────────────────────────────── */}
        <section id="faq" className="space-y-8 pt-6 max-w-3xl mx-auto w-full">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Частые вопросы
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Всё, что важно знать о безопасности, данных и правилах Огонька.
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-colors overflow-hidden ${
                    isDark
                      ? 'bg-zinc-950/70 border-zinc-800'
                      : 'bg-white border-zinc-200 shadow-sm'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-[#FF5C00] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/50">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 8. ФИНАЛЬНЫЙ ПОЛНОШИРИННЫЙ CTA ───────────────────────────────── */}
        <section className="pt-8">
          <div className="relative rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-8 sm:p-14 text-center overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#FF5C00]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-[#FF5C00]">
                ✦ Начни сегодня
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Начни вести свой дневник силы уже сегодня.
              </h2>

              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                Первый закрытый день займёт всего 3 минуты, а через год станет самым ценным активом твоей памяти и характера.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={busy}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 py-3.5 px-7 rounded-2xl bg-[#FF5C00] hover:bg-[#FF5C00]/90 text-white font-bold text-sm shadow-lg shadow-[#FF5C00]/25 transition-all active:scale-95 cursor-pointer"
                >
                  <GoogleIcon size={18} />
                  <span>Войти через Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleDemoClick}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  Попробовать демо
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── 9. ФУТЕР ПО ТЗ ────────────────────────────────────────────────── */}
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
            <span className="font-semibold text-zinc-400">Огонёк — Дневник силы и благодарности</span>
            <span>· © 2026</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/privacy"
              className="hover:text-zinc-300 transition-colors underline-offset-4 hover:underline"
            >
              Политика конфиденциальности
            </Link>

            <Link
              href="/terms"
              className="hover:text-zinc-300 transition-colors underline-offset-4 hover:underline"
            >
              Условия использования
            </Link>

            <a
              href="https://t.me/ogonek_support"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-300 transition-colors flex items-center gap-1 underline-offset-4 hover:underline"
            >
              <span>Поддержка</span>
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
