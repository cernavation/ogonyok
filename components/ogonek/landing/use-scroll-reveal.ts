'use client'

import { useEffect, useRef } from 'react'

/**
 * High-End Apple.com Scroll Reveal Controller
 * Observes elements with .fade-up, .fade-blur, .fade-scale, .fade-slide-left, .fade-slide-right
 * and applies .visible when they scroll into viewport.
 * Fully respects prefers-reduced-motion.
 */
export function useScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const revealSelector =
      '.fade-up, .fade-blur, .fade-scale, .fade-slide-left, .fade-slide-right, [data-reveal]'

    // Check if user prefers reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      container.querySelectorAll(revealSelector).forEach((el) => {
        el.classList.add('visible')
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -20px 0px',
      }
    )

    const targets = container.querySelectorAll(revealSelector)
    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return containerRef
}
