'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Tooltip } from './tooltip'

type Props = {
  onScrollTop?: () => void
  onScrollBottom?: () => void
}

export function ScrollPill({ onScrollTop, onScrollBottom }: Props) {
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hide pill when top sentinel is visible (we're near the top)
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
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
    <>
      {/* Sentinel at the top of the page to track scroll position */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, pointerEvents: 'none' }}
      />

      <aside
        className={`fixed right-4 bottom-20 md:bottom-6 z-40 flex flex-col items-center border border-[#2f3336] shadow-2xl rounded-full p-1 gap-1 text-[#71767b] transition-all duration-200 ${
          visible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        style={{ background: 'rgba(22, 24, 28, 0.92)', backdropFilter: 'blur(14px)' }}
        aria-label="Быстрая навигация по ленте"
      >
        <Tooltip content="В самый верх (к свежим записям)" side="left">
          <button
            type="button"
            onClick={handleTop}
            aria-label="Прокрутить в самый верх"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.08] hover:text-[#e7e9ea] transition-colors active:scale-95"
          >
            <ArrowUp size={17} />
          </button>
        </Tooltip>
        <div className="w-4 h-px bg-[#2f3336]" />
        <Tooltip content="В самый низ (к старым записям)" side="left">
          <button
            type="button"
            onClick={handleBottom}
            aria-label="Прокрутить в самый низ"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.08] hover:text-[#e7e9ea] transition-colors active:scale-95"
          >
            <ArrowDown size={17} />
          </button>
        </Tooltip>
      </aside>
    </>
  )
}
