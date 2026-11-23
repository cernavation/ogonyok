'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { AuthForm } from '@/components/ogonek/auth/auth-form'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'

const RHYTHMS = [
  {
    flames: 1,
    title: '1 гордость',
    sub: 'Мягкий старт',
    desc: 'Одна главная победа за вечер. Идеально для формирования привычки.',
  },
  {
    flames: 2,
    title: '2 гордости',
    sub: 'Стандарт',
    desc: 'Баланс между работой и личной жизнью. Твёрдый шаг каждый день.',
  },
  {
    flames: 3,
    title: '3 гордости',
    sub: 'Режим роста',
    desc: 'Осознанный фокус на ключевых направлениях без надрыва.',
  },
  {
    flames: 4,
    title: '4 гордости',
    sub: 'Серьёзный темп',
    desc: 'Высокая интенсивность. Спорт, карьера и проекты.',
  },
  {
    flames: 5,
    title: '5 гордостей',
    sub: 'Extreme',
    desc: 'Предельный уровень концентрации для несокрушимого характера.',
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const { updateProfile } = useOgonekStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedRhythm, setSelectedRhythm] = useState(2) // 3 гордости по умолчанию

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('ogonek.store.v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.auth?.signedIn && parsed?.auth?.activeAccountId) {
          window.location.replace('/app')
        }
      }
    } catch {}
  }, [])

  const handleRhythmSelect = (flames: number) => {
    setSelectedRhythm(flames)
    setStep(2)
  }

  const handleAuthenticated = (accountId: string) => {
    try {
      updateProfile({
        daily_target: selectedRhythm,
      } as any)
    } catch (e) {
      // Ignore if field is not typed in mock
    }
    window.location.href = '/app'
  }

  return (
    <div className="landing min-h-screen flex flex-col justify-between bg-black">
      <AppleNavbar />

      <main className="relative pt-24 pb-20 px-4 sm:px-6 md:px-8 flex-1 flex flex-col justify-center items-center overflow-hidden">
        {/* Soft Ambient Backdrop */}
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 w-full max-w-[960px] mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#f56900] animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#86868b]">
                {step === 1 ? 'Шаг 1 из 2 · Выбор ритма' : 'Шаг 2 из 2 · Создание ключа'}
              </span>
            </div>
            <h1 className="text-[32px] sm:text-[44px] font-bold text-[#f5f5f7] tracking-tight leading-tight">
              {step === 1 ? 'Выбери свой ритм силы.' : 'Создай личный дневник.'}
            </h1>
            <p className="text-[15px] sm:text-[17px] text-[#86868b] max-w-[500px] mx-auto mt-2.5">
              {step === 1
                ? 'Сколько поступков ты готов фиксировать каждый вечер? Ритм можно изменить в любой момент.'
                : 'Данные шифруются на твоём устройстве. Никакой рекламы и спама.'}
            </p>
          </div>

          {step === 1 ? (
            /* STEP 1: Выбор темпа дисциплины */
            <div className="max-w-[680px] mx-auto space-y-3.5 animate-in fade-in duration-300">
              {RHYTHMS.map((r) => {
                const isChosen = selectedRhythm === r.flames
                return (
                  <button
                    key={r.flames}
                    type="button"
                    onClick={() => handleRhythmSelect(r.flames)}
                    className={`w-full p-5 rounded-[22px] text-left transition-all duration-200 cursor-pointer border flex items-center justify-between gap-4 ${
                      isChosen
                        ? 'bg-[#1c1c1f] border-[#0071e3] shadow-[0_0_30px_rgba(0,113,227,0.25)]'
                        : 'bg-[#141416] border-white/[0.08] hover:bg-[#1a1a1d] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Flame indicators */}
                      <div className="flex items-center gap-1 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-4 rounded-full ${
                              i < r.flames
                                ? 'bg-[#f56900] shadow-[0_0_6px_rgba(245,105,0,0.5)]'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>

                      <div>
                        <div className="text-[16px] font-semibold text-[#f5f5f7] tracking-tight flex items-baseline gap-2 flex-wrap">
                          <span className="whitespace-nowrap">{r.title}</span>
                          <span className="text-[12px] font-medium text-[#f56900] whitespace-nowrap">· {r.sub}</span>
                        </div>
                        <div className="text-[13px] text-[#86868b] mt-0.5">{r.desc}</div>
                      </div>
                    </div>

                    <span className="text-white/40 text-xl font-light shrink-0">›</span>
                  </button>
                )
              })}

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="apple-btn-primary !px-8 !py-3 !text-[14px]"
                >
                  Продолжить с {selectedRhythm} {selectedRhythm === 1 ? 'гордостью' : selectedRhythm < 5 ? 'гордостями' : 'гордостями'} ›
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Форма регистрации со сплит-экраном и картинкой finish.jpg */
            <div className="rounded-[28px] sm:rounded-[36px] bg-[#121214]/95 border border-white/[0.12] shadow-[0_32px_100px_rgba(0,0,0,0.9),0_0_50px_rgba(245,105,0,0.12)] overflow-hidden flex flex-col md:flex-row text-white animate-in fade-in duration-300">
              {/* Left Column: Visual Showcase (finish.jpg) */}
              <div className="relative md:w-[44%] shrink-0 overflow-hidden select-none bg-black flex flex-col justify-between min-h-[220px] md:min-h-[580px]">
                <div className="absolute inset-0 z-0">
                  <img
                    src="/media/landing/finish.jpg"
                    alt="Финиш и преодоление"
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/55 to-black/30" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#121214]/80 hidden md:block" />
                </div>

                {/* Top Banner Content */}
                <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono tracking-wider uppercase text-[#f5f5f7]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f56900] animate-pulse" />
                    <span>Старт летописи · {selectedRhythm} в день</span>
                  </div>
                </div>

                {/* Bottom Art Typography */}
                <div className="relative z-10 p-5 sm:p-7 hidden sm:flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="registerFlameArt" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffa600" />
                          <stop offset="100%" stopColor="#ff6b35" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                        fill="url(#registerFlameArt)"
                      />
                    </svg>
                    <span className="text-[13px] font-semibold tracking-wide uppercase text-white/90">
                      Priday · 2026
                    </span>
                  </div>

                  <p className="text-[15px] sm:text-[17px] font-medium text-[#f5f5f7] leading-snug tracking-tight">
                    «Характер куётся не в триумфе, а в тихом вечернем преодолении.»
                  </p>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-white/60 pt-1">
                    <span>0% рекламы</span>
                    <span>·</span>
                    <span>Сквозной шифр</span>
                    <span>·</span>
                    <span>Твой чип</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Form */}
              <div className="flex-1 p-6 sm:p-8 md:p-10 bg-[#141416]/95 backdrop-blur-xl flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-[#2997ff] hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent"
                  >
                    ‹ Изменить ритм ({selectedRhythm} в день)
                  </button>
                  <span className="text-xs font-mono text-[#86868b]">Private & Secure</span>
                </div>

                <AuthForm
                  variant="modal"
                  initialMode="register"
                  onAuthenticated={handleAuthenticated}
                />
              </div>
            </div>
          )}

          {/* Bottom Switch to Login */}
          <div className="text-center mt-8 text-xs text-[#86868b]">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-[#2997ff] hover:underline font-medium">
              Войти в профиль
            </Link>
          </div>
        </div>
      </main>

      <AppleFooter />
    </div>
  )
}
