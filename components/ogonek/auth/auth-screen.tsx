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
        <section className="auth-hero">
          <div className="auth-brand">
            <span className="auth-flame flex items-center justify-center w-8 h-8 rounded-full bg-[#ff6b35]/10 text-[#ff6b35]" aria-hidden="true">
              <Flame size={20} className="fill-[#ff6b35]/20 text-[#ff6b35]" />
            </span>
            <span>Огонёк</span>
          </div>
          <h1 className="auth-hero__title">
            Дневник силы,
            <br />
            который держит слово
          </h1>
          <p className="auth-hero__lead">
            Записывайте победы, ведите стрик, собирайте доказательства достижений и следите за
            прогрессом. {state.auth.accounts.length > 0 ? 'Войдите или зарегистрируйтесь.' : 'Начните прямо сейчас.'}
          </p>
          <ul className="auth-hero__list">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="auth-hero__ico">
                  <Icon size={15} />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="auth-hero__foot">
            <ShieldCheck size={12} /> Local-first: {state.auth.accounts.length} локальных профиля
          </p>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__inner">
            <h2 className="auth-panel__title">Вход и регистрация</h2>
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
