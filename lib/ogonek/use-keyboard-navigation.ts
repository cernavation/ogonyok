'use client'

import { useEffect } from 'react'

type KeyboardNavigationOptions = {
  onOpenComposer: () => void
  onNavigateExplore: () => void
  onCloseModals: () => void
  onToggleHotkeysModal: () => void
}

export function useKeyboardNavigation({
  onOpenComposer,
  onNavigateExplore,
  onCloseModals,
  onToggleHotkeysModal,
}: KeyboardNavigationOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)

      if (e.key === 'Escape') {
        onCloseModals()
        return
      }

      // If user is currently typing inside an input, do not intercept single-key hotkeys
      if (isInput) return

      // C / с -> Open Composer
      if (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') {
        e.preventDefault()
        onOpenComposer()
        return
      }

      // / -> Switch to Explore and focus search input
      if (e.key === '/') {
        e.preventDefault()
        onNavigateExplore()
        setTimeout(() => {
          const searchInput = document.querySelector<HTMLInputElement>(
            '.search-bar input, input[type="search"]'
          )
          searchInput?.focus()
        }, 120)
        return
      }

      // ? -> Open hotkeys cheat-sheet
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        onToggleHotkeysModal()
        return
      }

      // J -> Scroll to next day card
      if (e.key === 'j' || e.key === 'J' || e.key === 'о' || e.key === 'О') {
        e.preventDefault()
        scrollToCard(1)
        return
      }

      // K -> Scroll to previous day card
      if (e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л') {
        e.preventDefault()
        scrollToCard(-1)
        return
      }
    }

    const scrollToCard = (direction: 1 | -1) => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.day-card'))
      if (cards.length === 0) return

      const scrollPos = window.scrollY + 100
      let targetIndex = -1

      if (direction === 1) {
        targetIndex = cards.findIndex((card) => card.offsetTop > scrollPos)
        if (targetIndex === -1) targetIndex = cards.length - 1
      } else {
        for (let i = cards.length - 1; i >= 0; i--) {
          if (cards[i].offsetTop < scrollPos - 120) {
            targetIndex = i
            break
          }
        }
        if (targetIndex === -1) targetIndex = 0
      }

      if (cards[targetIndex]) {
        cards[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenComposer, onNavigateExplore, onCloseModals, onToggleHotkeysModal])
}
