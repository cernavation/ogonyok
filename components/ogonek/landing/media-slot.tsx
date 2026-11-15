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
  /** If this is the Hero background, adjust placeholder position to avoid text overlap */
  isHero?: boolean
}

/**
 * Reusable media slot for the Apple-style landing page.
 * Automatically looks for files in /media/landing/{name}.
 * Shows a refined, high-end Apple dark-stage placeholder with file name, dimensions & ratio when missing.
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
  isHero = false,
}: MediaSlotProps) {
  const isVideo = name.endsWith('.mp4') || name.endsWith('.webm')
  const src = `/media/landing/${name}`
  const posterSrc = poster ? `/media/landing/${poster}` : undefined

  const [exists, setExists] = useState<boolean | null>(null)

  useEffect(() => {
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

  // High-End Apple Dark Stage Placeholder
  if (exists === false || exists === null) {
    if (circle) {
      return (
        <div
          className={`relative flex items-center justify-center overflow-hidden rounded-full border border-dashed border-white/20 bg-[#161617] text-white/40 shadow-inner ${className}`}
          style={{ width: `${width}px`, height: `${height}px` }}
          aria-label={`Место для ${name}`}
        >
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-[9px] font-mono mt-1 opacity-70 truncate max-w-[50px]">{name}</span>
          </div>
        </div>
      )
    }

    if (isHero) {
      return (
        <div
          className={`relative overflow-hidden w-full h-full bg-[#0a0a0c] border border-dashed border-white/10 ${className}`}
          style={aspectStyle}
          aria-label={`Место для ${name}`}
        >
          {/* Subtle ambient stage backlight */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_75%)] pointer-events-none" />
          
          {/* Subtle Apple-style tech spec badge positioned in bottom corner so it never collides with headline */}
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/60 text-xs shadow-2xl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span className="font-mono text-[11px] text-[#f5f5f7]">{name}</span>
            <span className="text-[10px] text-[#86868b]">{width}×{height} ({ratio})</span>
          </div>
        </div>
      )
    }

    return (
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden border border-dashed border-white/15 bg-[#121214] text-white/50 transition-colors hover:border-white/25 ${borderRadiusClass} ${className}`}
        style={aspectStyle}
        aria-label={`Место для ${name}`}
      >
        {/* Subtle hardware vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/60">
            {isVideo ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <span className="font-mono text-xs text-[#f5f5f7]">{name}</span>
            <span className="text-[11px] text-[#86868b]">• {width}×{height} ({ratio})</span>
          </div>
        </div>
      </div>
    )
  }

  // Real Video
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

  // Real Image (Fill mode)
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

  // Real Image
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
