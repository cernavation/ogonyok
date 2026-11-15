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

  const handleRhythmSelect = (flames: number) => {
    setSelectedRhythm(flames)
    setStep(2)
  }

  const handleAuthenticated = (accountId: string) => {
    // Сохраняем выбранный ритм в профиль
    try {
      updateProfile({
        daily_target: selectedRhythm,
      } as any)
    } catch (e) {
      // Игнорируем если поле не в типе
    }
    router.push('/')
  }

  return (
    <div className="landing min-h-screen flex flex-col justify-between bg-black">
      <AppleNavbar />

      <main className="relative pt-24 pb-20 px-5 sm:px-8 flex-1 flex flex-col justify-center items-center overflow-hidden">
        {/* Soft Ambient Backdrop */}
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 w-full max-w-[680px] mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
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
            <div className="space-y-3.5 animate-in fade-in duration-300">
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
            /* STEP 2: Форма регистрации */
            <div className="apple-card p-6 sm:p-10 bg-[#161617] border border-white/10 shadow-2xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#2997ff] hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent"
                >
                  ‹ Изменить ритм ({selectedRhythm} в день)
                </button>
                <span className="text-xs font-mono text-[#86868b]">Local-first Encryption</span>
              </div>

              <AuthForm
                variant="modal"
                initialMode="register"
                onAuthenticated={handleAuthenticated}
              />
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
