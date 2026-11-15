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

      <main className="relative pt-24 pb-20 px-5 sm:px-8 flex-1 flex flex-col justify-center items-center overflow-hidden">
        {/* Ambient Stage Halo */}
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 w-full max-w-[520px] mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  fill="#f56900"
                />
              </svg>
              <span className="text-xs font-mono uppercase tracking-wider text-[#86868b]">
                Личный вход
              </span>
            </div>
            <h1 className="text-[32px] sm:text-[40px] font-bold text-[#f5f5f7] tracking-tight">
              Войти в Огонёк
            </h1>
            <p className="text-[14px] sm:text-[15px] text-[#86868b] mt-2">
              Продолжи свою летопись гордости и побед.
            </p>
          </div>

          {/* Login Card */}
          <div className="apple-card p-6 sm:p-10 bg-[#161617] border border-white/10 shadow-2xl">
            <AuthForm
              variant="modal"
              initialMode="signin"
              onAuthenticated={handleAuthenticated}
            />
          </div>

          {/* Switch to Register */}
          <div className="text-center mt-8 text-xs text-[#86868b]">
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
