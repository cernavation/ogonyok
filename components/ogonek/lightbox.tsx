'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { formatPhotoAttachmentCaption, type AttachedPhotoTarget } from '@/lib/ogonek/attached-targets'

type Props = {
  src: string | null
  caption?: string | null
  attachedTargets?: AttachedPhotoTarget[] | null
  prides?: any[] | null
  gratitudes?: any[] | null
  onClose: () => void
}

export function Lightbox({ src, caption, attachedTargets, prides, gratitudes, onClose }: Props) {
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

  const displayCaption = caption || formatPhotoAttachmentCaption(attachedTargets, prides, gratitudes)

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
      <div className="flex flex-col items-center justify-center max-w-full max-h-full p-4">
        <img
          src={src}
          alt={displayCaption || "Увеличенное воспоминание"}
          onClick={(e) => e.stopPropagation()}
        />
        {displayCaption && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-4 px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 text-white text-sm font-medium shadow-2xl text-center max-w-lg"
          >
            {displayCaption}
          </div>
        )}
      </div>
    </motion.div>
  )
}
