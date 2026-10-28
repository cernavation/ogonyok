'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'

export type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  actionButton?: ReactNode
  children: ReactNode
  maxWidth?: string | number
  showClose?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  actionButton,
  children,
  maxWidth = '600px',
  showClose = true,
}: ModalProps) {
  useBodyScrollLock(isOpen)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(91,112,131,0.4)] backdrop-blur-sm animate-in fade-in duration-150 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{ maxWidth }}
        className="w-full max-h-[92vh] flex flex-col rounded-t-[20px] sm:rounded-2xl border-0 sm:border border-[var(--border)] bg-[var(--bg)] shadow-2xl text-[var(--text)] overflow-hidden"
      >
        {/* Mobile drag bar */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-[var(--border)]" />
        </div>

        {/* X Header: Close on top-left, title in center/left, primary action on top-right */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] min-h-[53px]">
          <div className="flex items-center gap-3">
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            )}
            {title && (
              <h2 className="text-[17px] font-bold text-[var(--text)] tracking-tight">
                {title}
              </h2>
            )}
          </div>
          {actionButton && <div>{actionButton}</div>}
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </motion.div>
    </div>,
    document.body
  )
}
