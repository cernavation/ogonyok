'use client'

import { useState } from 'react'
import { Database, AlertTriangle, ExternalLink, Check, Copy } from 'lucide-react'

type Props = {
  isConfigured: boolean
  onNotify: (msg: string) => void
}

export function ConnectSupabaseCard({ isConfigured, onNotify }: Props) {
  const [copied, setCopied] = useState(false)

  const copyCommand = () => {
    navigator.clipboard.writeText('npm run check-setup')
    setCopied(true)
    onNotify('Команда скопирована: npm run check-setup')
    setTimeout(() => setCopied(false), 2000)
  }

  if (isConfigured) {
    return (
      <div className="settings-card rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Database size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Облачная база Supabase</h3>
              <p className="text-xs text-emerald-300/80">База данных подключена. Данные сохраняются навсегда в облаке.</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
            <Check size={13} strokeWidth={3} /> Активна
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-card rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-base text-white">База данных Supabase не подключена</h3>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">
            Сейчас приложение работает в изолированном локальном режиме на этом компьютере.
            Чтобы твои друзья могли регистрироваться со своих телефонов, видеть твои записи и переписываться в чатах —
            подключи бесплатный проект Supabase.
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ff5722] text-white text-xs font-semibold hover:bg-[#ff5722]/90 transition-all shadow-sm"
            >
              Создать проект на supabase.com <ExternalLink size={13} />
            </a>

            <button
              type="button"
              onClick={copyCommand}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/15 transition-all"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              Проверить настройку: npm run check-setup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
