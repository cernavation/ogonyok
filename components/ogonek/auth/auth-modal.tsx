'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { AuthForm, type AuthMode } from './auth-form'

type Props = {
  onClose: () => void
  onNotify?: (message: string) => void
  initialMode?: AuthMode
  onAuthenticated?: (accountId: string) => void
}

export function AuthModal({ onClose, onNotify, initialMode = 'signin', onAuthenticated }: Props) {
  useBodyScrollLock(true)
  const [mode, setMode] = useState<AuthMode>(initialMode)

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const isRegister = mode === 'register'
  const activeImage = isRegister ? '/media/landing/finish.jpg' : '/media/landing/ritual.jpg'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/80 backdrop-blur-2xl overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={isRegister ? 'Регистрация в Огоньке' : 'Вход в Огонёк'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Ambient background glow orb */}
      <div
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] opacity-20 -z-10"
        style={{
          background: isRegister
            ? 'radial-gradient(circle, #f56900 0%, #0071e3 70%, transparent 100%)'
            : 'radial-gradient(circle, #0071e3 0%, #f56900 70%, transparent 100%)',
        }}
      />

      {/* Main Glass Dialog Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[960px] max-h-[92vh] sm:max-h-[88vh] rounded-[28px] sm:rounded-[36px] bg-[#121214]/95 border border-white/[0.12] shadow-[0_32px_100px_rgba(0,0,0,0.9),0_0_50px_rgba(255,106,26,0.12)] overflow-hidden flex flex-col md:flex-row text-white my-auto"
      >
        {/* ── LEFT COLUMN: Cinematic Art Showcase (finish.jpg / ritual.jpg) ── */}
        <div className="relative md:w-[44%] shrink-0 overflow-hidden select-none bg-black flex flex-col justify-between">
          {/* Dynamic Cross-fading Background Image */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage}
                src={activeImage}
                alt={isRegister ? 'Финиш и преодоление' : 'Вечерний ритуал силы'}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
                className="w-full h-full object-cover object-center"
              />
            </AnimatePresence>

            {/* Dark Apple Cinematic Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/55 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#121214]/80 hidden md:block" />
          </div>

          {/* Top Banner Content */}
          <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono tracking-wider uppercase text-[#f5f5f7]">
              {isRegister ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f56900] animate-pulse" />
                  <span>Старт летописи · Local-first</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] animate-pulse" />
                  <span>Вечерний ритуал · 5 минут</span>
                </>
              )}
            </div>

            {/* Mobile-only close button on top of banner */}
            <button
              type="button"
              onClick={onClose}
              className="md:hidden w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center border border-white/15 cursor-pointer transition-transform active:scale-90"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          {/* Bottom Art Typography */}
          <div className="relative z-10 p-5 sm:p-7 hidden sm:flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="modalFlameArt" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffa600" />
                    <stop offset="100%" stopColor="#ff6b35" />
                  </linearGradient>
                </defs>
                <path
                  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  fill="url(#modalFlameArt)"
                />
              </svg>
              <span className="text-[13px] font-semibold tracking-wide uppercase text-white/90">
                Огонёк · 2026
              </span>
            </div>

            <p className="text-[15px] sm:text-[17px] font-medium text-[#f5f5f7] leading-snug tracking-tight">
              {isRegister
                ? '«Характер куётся не в триумфе, а в тихом вечернем преодолении.»'
                : '«5 минут вечерней тишины. Время зафиксировать победы дня.»'}
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

        {/* ── RIGHT COLUMN: Interactive Apple Auth Interface ── */}
        <div className="flex-1 p-6 sm:p-8 md:p-10 overflow-y-auto bg-[#141416]/95 backdrop-blur-xl relative flex flex-col justify-center">
          {/* Desktop Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="hidden md:flex absolute top-6 right-6 w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#86868b] hover:text-[#f5f5f7] items-center justify-center border border-white/5 cursor-pointer transition-all active:scale-95 z-20"
            aria-label="Закрыть окно"
          >
            <X size={16} />
          </button>

          <AuthForm
            variant="modal"
            initialMode={initialMode}
            mode={mode}
            onModeChange={(newMode) => setMode(newMode)}
            onNotify={onNotify}
            onAuthenticated={(accountId) => {
              onAuthenticated?.(accountId)
              onClose()
            }}
          />
        </div>
      </motion.div>
    </div>
  )
}
