'use client'

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import React, { type ReactElement, type ReactNode } from 'react'

interface TooltipProps {
  children: ReactElement
  content: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  hotkey?: string
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <BaseTooltip.Provider delay={400} closeDelay={0} timeout={300}>
      {children}
    </BaseTooltip.Provider>
  )
}

export function Tooltip({
  children,
  content,
  side = 'top',
  hotkey,
}: TooltipProps) {
  if (!content) return children

  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6} className="z-[9999]">
          <BaseTooltip.Popup className="ogonek-tooltip">
            <span>{content}</span>
            {hotkey && <kbd className="ogonek-tooltip-kbd">{hotkey}</kbd>}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
