'use client'

import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { playClick } from '@/lib/ogonek/sound'

type Props = {
  query: string
  onChangeQuery: (q: string) => void
  currentIndex: number
  totalMatches: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  soundEnabled?: boolean
}

export function ChatSearchBar({
  query,
  onChangeQuery,
  currentIndex,
  totalMatches,
  onNext,
  onPrev,
  onClose,
  soundEnabled = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex items-center gap-2 border-b border-white/10 bg-[#16181c] px-4 py-2 animate-in fade-in slide-in-from-top-1">
      <Search size={16} className="text-[#71767b]" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onChangeQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'Enter') {
            if (e.shiftKey) onPrev()
            else onNext()
          }
        }}
        placeholder="Поиск по сообщениям..."
        className="flex-1 bg-transparent text-xs text-white placeholder-[#71767b] outline-none"
      />

      {query && (
        <span className="text-[11px] font-mono text-[#71767b]">
          {totalMatches > 0 ? `${currentIndex + 1} из ${totalMatches}` : 'Нет совпадений'}
        </span>
      )}

      <div className="flex items-center gap-1.5 border-l border-[var(--border)] pl-2" role="group" aria-label="Навигация по совпадениям">
        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            onPrev()
          }}
          disabled={totalMatches === 0}
          className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] disabled:opacity-30 transition-colors"
          title="Предыдущее"
          aria-label="Предыдущее совпадение"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            onNext()
          }}
          disabled={totalMatches === 0}
          className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] disabled:opacity-30 transition-colors"
          title="Следующее"
          aria-label="Следующее совпадение"
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            onClose()
          }}
          className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors"
          title="Закрыть поиск (Esc)"
          aria-label="Закрыть поиск"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
