'use client'

import React from 'react'
import { X, Flame, Copy, Check } from 'lucide-react'
import { generateQrSvg } from '@/lib/ogonek/qr'
import { playClick, playSuccess } from '@/lib/ogonek/sound'

interface Props {
  url: string
  username: string
  displayName: string
  onClose: () => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
}

export function QrModal({
  url,
  username,
  displayName,
  onClose,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [copied, setCopied] = React.useState(false)
  const qrSvg = React.useMemo(() => generateQrSvg(url, 220), [url])

  const handleCopy = async () => {
    playClick(soundEnabled)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      playSuccess(soundEnabled)
      onNotify('Ссылка скопирована в буфер обмена!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      onNotify('Не удалось скопировать ссылку')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[var(--card-bg,#16181c)] border border-[var(--line,#2f3336)] p-6 shadow-2xl flex flex-col items-center text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted,#71767b)] hover:text-[var(--text,#fff)] hover:bg-[var(--bg-hover,#1d1f23)] transition-colors"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent,#ff5722)] uppercase tracking-wider mb-2">
          <Flame size={16} className="fill-[var(--accent,#ff5722)]" />
          <span>Priday · QR-код</span>
        </div>

        <h3 className="text-lg font-bold text-[var(--text,#fff)] mb-1">
          {displayName}
        </h3>
        <p className="text-xs text-[var(--muted,#71767b)] mb-4">
          @{username}
        </p>

        {/* QR Code Canvas/SVG */}
        <div className="p-4 rounded-2xl bg-white text-black shadow-inner mb-4 flex items-center justify-center">
          <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>

        <p className="text-xs text-[var(--muted,#71767b)] max-w-xs mb-4 leading-relaxed">
          Наведи камеру телефона, чтобы открыть карточку приглашения и добавиться в друзья
        </p>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full min-h-[40px] flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-[var(--surface2,#202327)] hover:bg-[var(--line,#2f3336)] text-xs font-bold text-[var(--text,#fff)] border border-[var(--line,#2f3336)] transition-all"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}</span>
        </button>
      </div>
    </div>
  )
}
