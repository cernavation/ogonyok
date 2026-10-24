'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Flame, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'flame' | 'error' | 'info'

export interface ToastProps {
  id?: string
  message: string
  description?: string
  type?: ToastType
  onClose?: () => void
}

export function Toast({
  message,
  description,
  type = 'flame',
  onClose,
}: ToastProps) {
  if (!message) return null

  const icons = {
    flame: <Flame className="w-5 h-5 text-[#FF5C00] shrink-0 fill-[#FF5C00]/20" />,
    success: <Check className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-zinc-400 shrink-0" />,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed bottom-24 sm:bottom-8 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900/95 dark:bg-zinc-900/95 border border-zinc-800 text-white shadow-2xl backdrop-blur-xl max-w-sm w-[calc(100vw-32px)] sm:w-auto"
      role="status"
      aria-live="polite"
    >
      {icons[type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100 truncate">{message}</p>
        {description && (
          <p className="text-xs text-zinc-400 mt-0.5 truncate">{description}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}
