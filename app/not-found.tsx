'use client'

import Link from 'next/link'
import { ArrowLeft, Compass, Flame } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center p-6 selection:bg-[var(--accent)]/30">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/15">
          <Flame size={32} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest text-[var(--accent)] uppercase">
            Ошибка 404
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Страница ушла в историю
          </h1>
          <p className="text-sm text-[var(--text-2)] leading-relaxed">
            Этого адреса больше нет или он никогда не существовал. Твои победы, стрик и дневник в полной безопасности.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] font-bold text-sm transition-all active:scale-95 shadow-md shadow-[var(--accent)]/20"
          >
            <ArrowLeft size={16} />
            <span>На главную</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
