'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Tooltip } from './tooltip'

type Props = {
  onScrollTop?: () => void
  onScrollBottom?: () => void
}

export function ScrollPill({ onScrollTop, onScrollBottom }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down a bit or keep accessible
      const y = window.scrollY || document.documentElement.scrollTop
      setVisible(y > 80)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleTop = () => {
    if (onScrollTop) {
      onScrollTop()
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBottom = () => {
    if (onScrollBottom) {
      onScrollBottom()
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    }
  }

  return (
    <aside
      className={`fixed right-3.5 bottom-20 md:bottom-7 z-40 flex flex-col items-center bg-neutral-900/90 backdrop-blur-md border border-neutral-700/80 shadow-2xl rounded-full p-1 gap-1 text-neutral-300 transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-70 md:opacity-90'
      }`}
      aria-label="Быстрая навигация по ленте"
    >
      <Tooltip content="В самый верх (к свежим записям)" side="left">
        <button
          type="button"
          onClick={handleTop}
          aria-label="Прокрутить в самый верх"
          className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full hover:bg-neutral-800 hover:text-white transition-colors active:scale-95 cursor-pointer"
        >
          <ArrowUp size={18} />
        </button>
      </Tooltip>
      <div className="w-4 h-px bg-neutral-800" />
      <Tooltip content="В самый низ (к старым записям)" side="left">
        <button
          type="button"
          onClick={handleBottom}
          aria-label="Прокрутить в самый низ"
          className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full hover:bg-neutral-800 hover:text-white transition-colors active:scale-95 cursor-pointer"
        >
          <ArrowDown size={18} />
        </button>
      </Tooltip>
    </aside>
  )
}
