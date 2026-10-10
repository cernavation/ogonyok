'use client'

import React from 'react'
import type { StreakStatus } from '@/lib/ogonek/streak'

interface FlameIconProps {
  status: StreakStatus
  hoursLeft?: number | null
  streak?: number
  size?: number
  className?: string
}

export function FlameIcon({
  status,
  hoursLeft,
  size = 20,
  className = '',
}: FlameIconProps) {
  if (status === 'burned') {
    return (
      <span
        className={`flame-icon flame--burned ${className}`}
        style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
        title="Огонёк угас. Сделай запись, чтобы разжечь пламя снова!"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#71767b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Flame outline in ash gray */}
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          <line x1="4" y1="20" x2="20" y2="20" stroke="#555" strokeWidth="2" />
        </svg>
      </span>
    )
  }

  if (status === 'grace') {
    return (
      <span
        className={`flame-icon flame--grace ${className}`}
        style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
        title={`Льготный период! До угасания осталось ${hoursLeft ?? 'несколько'} ч.`}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="url(#graceFlameGrad)"
          aria-hidden="true"
          className="animate-pulse"
        >
          <defs>
            <linearGradient id="graceFlameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffb703" />
              <stop offset="50%" stopColor="#fb8500" />
              <stop offset="100%" stopColor="#d90429" />
            </linearGradient>
          </defs>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
        {hoursLeft !== undefined && hoursLeft !== null && (
          <span className="flame-grace-badge">{hoursLeft}ч</span>
        )}
      </span>
    )
  }

  // Safe status
  return (
    <span
      className={`flame-icon flame--safe ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
      title="Огонёк горит уверенно и ровно!"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="url(#safeFlameGrad)"
        aria-hidden="true"
        className="flame-pulse-glow"
      >
        <defs>
          <linearGradient id="safeFlameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffa600" />
            <stop offset="100%" stopColor="#ff6b35" />
          </linearGradient>
        </defs>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    </span>
  )
}
