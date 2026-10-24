'use client'

import React from 'react'

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800/80 ${className}`}
      {...props}
    />
  )
}
