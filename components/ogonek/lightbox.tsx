'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'

type Props = {
  src: string | null
  onClose: () => void
}

export function Lightbox({ src, onClose }: Props) {
  useBodyScrollLock(Boolean(src))
  useEffect(() => {
    if (!src) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [src, onClose])

  if (!src) return null

  return (
    <motion.div
      className="lightbox"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-label="Просмотр фотографии"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
      >
        <X size={24} />
      </button>
      <img
        src={src}
        alt="Увеличенное воспоминание"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  )
}
