'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Закрывать ли по Escape (по умолчанию true) */
  closeOnEscape?: boolean
  /** Скрыть дефолтный заголовок для кастомного хедера (композер X) */
  hideHeader?: boolean
}

export function ModalShell({ title, onClose, children, closeOnEscape = true, hideHeader = false }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onCloseRef.current()
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Initial focus on mount: only if focus is not already inside an interactive element in the modal
    const timer = setTimeout(() => {
      if (
        modalRef.current &&
        !modalRef.current.contains(document.activeElement) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        modalRef.current.focus()
      }
    }, 40)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [closeOnEscape])

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        ref={modalRef}
        tabIndex={-1}
        className="modal outline-none"
        initial={{ y: 25, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 25, scale: 0.98 }}
      >
        {!hideHeader && (
          <header>
            <h2>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </header>
        )}
        {children}
      </motion.div>
    </motion.div>
  )
}
