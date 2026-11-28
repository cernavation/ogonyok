'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type ContextMenuItem = {
  id: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  dividerBefore?: boolean
  onSelect: () => void
}

type Props = {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

/**
 * Custom dark Apple/Telegram style context menu rendered in a viewport-clamped portal.
 */
export function ChatContextMenu({ x, y, items, onClose }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleScrollOrBlur = () => onClose()
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.closest('[data-chat-context-menu="true"]')) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('scroll', handleScrollOrBlur, true)
    window.addEventListener('blur', handleScrollOrBlur)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('scroll', handleScrollOrBlur, true)
      window.removeEventListener('blur', handleScrollOrBlur)
    }
  }, [onClose])

  if (!mounted || typeof document === 'undefined' || items.length === 0) return null

  const menuWidth = 232
  const menuHeight = items.length * 40 + 16
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const clampedX = Math.max(8, Math.min(x, vw - menuWidth - 12))
  // Если снизу не хватает места И сверху >= 220px свободного пространства (не залезая на шапку) — открываем вверх; иначе вниз
  const openUpward = y + menuHeight > vh - 12 && y >= 220 && y - menuHeight >= 76
  const rawY = openUpward ? y - menuHeight : y
  const minSafeTop = y < 220 ? Math.max(76, y) : 76
  const clampedY = Math.max(Math.min(minSafeTop, vh - menuHeight - 12), Math.min(rawY, vh - menuHeight - 12))

  return createPortal(
    <div
      data-chat-context-menu="true"
      role="menu"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      style={{
        position: 'fixed',
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        width: `${menuWidth}px`,
      }}
      className="z-[9999] rounded-2xl border border-white/15 bg-[#16181c]/95 backdrop-blur-xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.75)] text-[#e7e9ea] animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>
          {item.dividerBefore && <div className="my-1 h-px bg-white/10" />}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              onClose()
              item.onSelect()
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors ${
              item.disabled
                ? 'opacity-40 cursor-not-allowed'
                : item.danger
                  ? 'text-rose-400 hover:bg-rose-500/15 active:bg-rose-500/20'
                  : 'text-[#e7e9ea] hover:bg-white/10 active:bg-white/15'
            }`}
          >
            {item.icon && <span className="shrink-0 opacity-90">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>,
    document.body
  )
}
