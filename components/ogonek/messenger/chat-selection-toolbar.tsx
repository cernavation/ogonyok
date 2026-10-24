'use client'

import { Forward, Trash2, X } from 'lucide-react'

import { playClick } from '@/lib/ogonek/sound'

type Props = {
  selectedCount: number
  onForward: () => void
  onDelete: () => void
  onCancel: () => void
  soundEnabled?: boolean
}

export function ChatSelectionToolbar({
  selectedCount,
  onForward,
  onDelete,
  onCancel,
  soundEnabled = true,
}: Props) {
  return (
    <div className="flex items-center justify-between border-t border-white/10 bg-[#16181c] px-4 py-3 animate-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            onCancel()
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71767b] hover:bg-white/10 hover:text-white"
          aria-label="Отменить выбор"
        >
          <X size={18} />
        </button>
        <span className="text-xs font-semibold text-white">
          Выбрано: {selectedCount}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            onForward()
          }}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          <Forward size={14} />
          <span>Переслать</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            onDelete()
          }}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 disabled:opacity-30 transition-colors"
        >
          <Trash2 size={14} />
          <span>Удалить</span>
        </button>
      </div>
    </div>
  )
}
