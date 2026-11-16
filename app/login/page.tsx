'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { AuthForm } from '@/components/ogonek/auth/auth-form'

export default function LoginPage() {
  const router = useRouter()

  const handleAuthenticated = (accountId: string) => {
    router.push('/')
  }

  return (
    <div className="landing min-h-screen flex flex-col justify-between bg-black">
      <AppleNavbar />

      <main className="relative pt-24 pb-20 px-4 sm:px-6 md:px-8 flex-1 flex flex-col justify-center items-center overflow-hidden">
        {/* Ambient Stage Halo */}
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 w-full max-w-[960px] mx-auto">
          {/* Main Card with Split Layout featuring ritual.jpg */}
          <div className="rounded-[28px] sm:rounded-[36px] bg-[#121214]/95 border border-white/[0.12] shadow-[0_32px_100px_rgba(0,0,0,0.9),0_0_50px_rgba(0,113,227,0.12)] overflow-hidden flex flex-col md:flex-row text-white">
            {/* Left Column: Visual Showcase (ritual.jpg) */}
            <div className="relative md:w-[44%] shrink-0 overflow-hidden select-none bg-black flex flex-col justify-between min-h-[220px] md:min-h-[580px]">
              <div className="absolute inset-0 z-0">
                <img
                  src="/media/landing/ritual.jpg"
                  alt="Вечерний ритуал силы"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/55 to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#121214]/80 hidden md:block" />
              </div>

              {/* Top Banner Content */}
              <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono tracking-wider uppercase text-[#f5f5f7]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] animate-pulse" />
                  <span>Вечерний ритуал · 5 минут</span>
                </div>
              </div>

              {/* Bottom Art Typography */}
              <div className="relative z-10 p-5 sm:p-7 hidden sm:flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="loginFlameArt" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffa600" />
                        <stop offset="100%" stopColor="#ff6b35" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                      fill="url(#loginFlameArt)"
                    />
                  </svg>
                  <span className="text-[13px] font-semibold tracking-wide uppercase text-white/90">
                    Огонёк · 2026
                  </span>
                </div>

                <p className="text-[15px] sm:text-[17px] font-medium text-[#f5f5f7] leading-snug tracking-tight">
                  «5 минут вечерней тишины. Время зафиксировать победы дня.»
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

            {/* Right Column: Auth Form */}
            <div className="flex-1 p-6 sm:p-8 md:p-10 bg-[#141416]/95 backdrop-blur-xl flex flex-col justify-center">
              <AuthForm
                variant="modal"
                initialMode="signin"
                onAuthenticated={handleAuthenticated}
              />
            </div>
          </div>

          {/* Switch to Register */}
          <div className="text-center mt-6 text-xs text-[#86868b]">
            Ещё нет дневника?{' '}
            <Link href="/register" className="text-[#2997ff] hover:underline font-medium">
              Создать летопись бесплатно
            </Link>
          </div>
        </div>
      </main>

      <AppleFooter />
    </div>
  )
}
