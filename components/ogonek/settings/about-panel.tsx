'use client'

import React from 'react'
import {
  ExternalLink,
  Flame,
  Heart,
  Info,
  Lock,
  Shield,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

export function AboutPanel() {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-label="О приложении">
      {/* ── 1. Карточка приложения ───────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white shadow-lg shadow-[var(--accent)]/20 mb-3">
          <Flame size={32} />
        </div>

        <h3 className="text-xl font-black text-[var(--text)] tracking-tight">Огонёк</h3>
        <p className="text-xs font-mono font-bold text-[var(--accent)] mt-0.5">
          Версия 2.0.0 (Step 16)
        </p>
        <p className="text-xs text-[var(--text-2)] max-w-sm mt-2 leading-relaxed">
          Твой честный дневник силы, преодолений и благодарностей без токсичной продуктивности
        </p>
      </div>

      {/* ── 2. Манифест Огонька ─────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <h4 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent)]" /> Манифест ценностей
        </h4>

        <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-2)]">
          <div className="flex items-start gap-2.5">
            <Flame size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
            <div>
              <b className="text-[var(--text)] block text-[13px]">Стрик никогда не сгорает</b>
              <p className="mt-0.5 leading-relaxed">
                В Огоньке стрик равен общему количеству закрытых дней. Пропущенный день — это просто день отдыха,
                а не повод начинать всё с нуля.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Heart size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-[var(--text)] block text-[13px]">Без токсичной продуктивности</b>
              <p className="mt-0.5 leading-relaxed">
                Никакого навязанного чувства вины. Мы фиксируем реальные усилия и внутреннее преодоление,
                а не искусственные списки дел.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Lock size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-[var(--text)] block text-[13px]">Приватность на уровне архитектуры</b>
              <p className="mt-0.5 leading-relaxed">
                Все настройки аудитории и доступа валидируются на сервере PostgreSQL через Row Level Security.
                Личные записи остаются строго личными.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Правовые документы и соглашения ──────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-2">
        <h4 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2 mb-1">
          <Info size={16} className="text-[var(--accent)]" /> Правовая информация
        </h4>

        <div className="flex flex-col gap-1.5 text-xs">
          <Link
            href="/terms"
            className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] transition-colors"
          >
            <span className="font-semibold">Пользовательское соглашение</span>
            <ExternalLink size={13} className="text-[var(--text-3)]" />
          </Link>

          <Link
            href="/privacy"
            className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] transition-colors"
          >
            <span className="font-semibold">Политика конфиденциальности</span>
            <ExternalLink size={13} className="text-[var(--text-3)]" />
          </Link>
        </div>
      </div>
    </div>
  )
}
