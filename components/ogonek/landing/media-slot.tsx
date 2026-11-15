'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

interface MediaSlotProps {
  /** File name (with extension) to look for in /media/landing/ */
  name: string
  /** Display width */
  width: number
  /** Display height */
  height: number
  /** Aspect ratio label for placeholder (e.g. "16:9") */
  ratio: string
  /** Alt text for accessibility */
  alt?: string
  /** Additional className */
  className?: string
  /** Whether this is above the fold (priority load) */
  priority?: boolean
  /** Poster image for video (jpg fallback) */
  poster?: string
  /** Use rounded corners */
  rounded?: boolean
  /** Make it a circle (for avatars) */
  circle?: boolean
  /** Fill container */
  fill?: boolean
}

/**
 * Reusable media slot for the landing page.
 * Automatically looks for files in /media/landing/{name}.
 * Shows a dashed placeholder with file name, size & ratio when the file is missing.
 * For video: autoplay, muted, loop, playsInline.
 */
export function MediaSlot({
  name,
  width,
  height,
  ratio,
  alt = '',
  className = '',
  priority = false,
  poster,
  rounded = true,
  circle = false,
  fill = false,
}: MediaSlotProps) {
  const isVideo = name.endsWith('.mp4') || name.endsWith('.webm')
  const src = `/media/landing/${name}`
  const posterSrc = poster ? `/media/landing/${poster}` : undefined

  const [exists, setExists] = useState<boolean | null>(null)

  useEffect(() => {
    // Quick HEAD check to see if the file actually exists
    const controller = new AbortController()
    fetch(src, { method: 'HEAD', signal: controller.signal })
      .then((res) => setExists(res.ok))
      .catch(() => setExists(false))
    return () => controller.abort()
  }, [src])

  const borderRadiusClass = circle
    ? 'rounded-full'
    : rounded
    ? 'rounded-[28px]'
    : ''

  const aspectStyle: React.CSSProperties = fill
    ? { width: '100%', height: '100%' }
    : { width: '100%', aspectRatio: `${width} / ${height}` }

  // Placeholder
  if (exists === false || exists === null) {
    return (
      <div
        className={`media-slot-placeholder overflow-hidden ${borderRadiusClass} ${className}`}
        style={aspectStyle}
        aria-label={`Место для ${name}`}
      >
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="font-mono text-xs opacity-70">{name}</span>
          <span className="text-[11px] opacity-50">
            {width}×{height} ({ratio})
          </span>
        </div>
      </div>
    )
  }

  // Video
  if (isVideo) {
    return (
      <div className={`overflow-hidden ${borderRadiusClass} ${className}`} style={aspectStyle}>
        <video
          src={src}
          poster={posterSrc}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          aria-label={alt || name}
        />
      </div>
    )
  }

  // Image
  if (fill) {
    return (
      <div className={`relative overflow-hidden ${borderRadiusClass} ${className}`} style={aspectStyle}>
        <Image
          src={src}
          alt={alt || name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1440px"
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
        />
      </div>
    )
  }

  return (
    <div className={`overflow-hidden ${borderRadiusClass} ${className}`}>
      <Image
        src={src}
        alt={alt || name}
        width={width}
        height={height}
        className="w-full h-auto object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1440px"
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
      />
    </div>
  )
}
