'use client'

import { motion } from 'framer-motion'
import { Flame, ShieldCheck, Sparkles } from 'lucide-react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { AuthForm } from './auth-form'

type Props = {
  onAuthenticated?: (accountId: string) => void
  onNotify?: (message: string) => void
}

const HIGHLIGHTS = [
  { icon: Flame, text: 'Личная летопись гордости и благодарности' },
  { icon: ShieldCheck, text: 'Данные и пароли остаются только на устройстве' },
  { icon: Sparkles, text: 'Стрики, ачивки, аналитика и мессенджер внутри' },
]

/**
 * ЭТАП 18 — ПОЛНОЭКРАННЫЙ ЭКРАН ВХОДА/РЕГИСТРАЦИИ.
 * Показывается, когда пользователь вышел из аккаунта. Слева — витрина
 * Огонька, справа — форма входа, регистрации, Google и гостевого режима.
 */
export function AuthScreen({ onAuthenticated, onNotify }: Props) {
  const { state } = useOgonekStore()

  return (
    <motion.div
      className="auth-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Вход в Огонёк"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="auth-screen__glow" aria-hidden="true" />

      <div className="auth-screen__grid">
        <section className="auth-hero w-full min-w-0" aria-label="О проекте Огонёк">
          <div className="auth-brand flex items-center gap-2 mb-2">
            <span className="auth-flame flex items-center justify-center w-9 h-9 rounded-full bg-[var(--accent,#FF6A1A)]/10 text-[var(--accent,#FF6A1A)]" aria-hidden="true">
              <Flame size={22} className="fill-[var(--accent,#FF6A1A)]/20 text-[var(--accent,#FF6A1A)]" />
            </span>
            <span className="font-extrabold text-xl text-[var(--text)]">Огонёк</span>
          </div>
          <h1 className="auth-hero__title text-[var(--text)] flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">🔥</span>
            <span>ОГОНЁК</span>
          </h1>
          <p className="auth-hero__lead text-[var(--text-2)]">
            Дневник силы и личная летопись побед. Записывайте гордости, держите стрик, собирайте доказательства достижений и следите за
            прогрессом. {state.auth.accounts.length > 0 ? 'Войдите или зарегистрируйтесь.' : 'Начните прямо сейчас.'}
          </p>
          <ul className="auth-hero__list">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="text-[var(--text-2)]">
                <span className="auth-hero__ico text-[var(--accent,#FF6A1A)]">
                  <Icon size={15} />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <div className="auth-hero__foot text-[var(--text-2)] flex items-center gap-1.5 text-xs whitespace-nowrap">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>Local-first: {state.auth.accounts.length} локальных профиля</span>
          </div>
        </section>

        <section className="auth-panel w-full min-w-0" aria-label="Форма входа и регистрации">
          <div className="auth-panel__inner">
            <h2 className="auth-panel__title text-[var(--text)]">Вход и регистрация</h2>
            <AuthForm
              variant="screen"
              onAuthenticated={onAuthenticated}
              onNotify={onNotify}
            />
          </div>
        </section>
      </div>
    </motion.div>
  )
}
