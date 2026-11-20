"use client"

import React, { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"

// Dynamic import with ssr: false ensures WebGL canvas initializes strictly on client
const GlassRevealPriday = dynamic(
  () => import("@/components/ui/liquid-glass-logo-reveal").then((mod) => mod.GlassRevealPriday),
  { ssr: false }
)

const HEAVY_ASSETS = [
  "/media/landing/mainvideo.mp4",
  "/media/landing/mode-sport.jpg",
  "/media/landing/together.jpg",
  "/media/landing/ritual.jpg",
  "/media/landing/mode-work.jpg",
  "/media/landing/mode-family.jpg",
  "/media/landing/mode-sport-2.jpg",
  "/media/landing/mode-creative-2.jpg",
]

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve() // Don't hang on network error
    img.src = src
  })
}

function preloadVideo(src: string, timeoutMs = 6000): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve()
      return
    }
    const video = document.createElement("video")
    video.preload = "auto"
    video.muted = true
    video.playsInline = true
    let settled = false

    const done = () => {
      if (!settled) {
        settled = true
        video.oncanplay = null
        video.onloadeddata = null
        video.onerror = null
        video.src = ""
        video.load()
        resolve()
      }
    }

    video.oncanplay = done
    video.onloadeddata = done
    video.onerror = done
    video.src = src
    video.load()

    setTimeout(done, timeoutMs) // Safety timeout prevents infinite loading on slow 3G
  })
}

export function Preloader() {
  const [mounted, setMounted] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(10)
  const timerStarted = useRef(false)

  useEffect(() => {
    if (typeof window !== "undefined" && ((window as any).__PRIDAY_SKIP_PRELOADER__ || window.location.search.includes("skip_preloader=1"))) {
      setMounted(false)
      return
    }

    if (timerStarted.current) return
    timerStarted.current = true

    // Lock body scroll while preloader is active
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const MIN_TIME = 3000 // 3.0 seconds minimum display time
    const startTime = performance.now()

    let loadedCount = 0
    const totalCount = HEAVY_ASSETS.length

    const updateProgress = () => {
      loadedCount++
      const assetRatio = loadedCount / totalCount
      setProgress((prev) => Math.max(prev, Math.round(assetRatio * 85)))
    }

    // Preload all heavy assets in background
    const assetPromises = HEAVY_ASSETS.map((asset) => {
      if (asset.endsWith(".mp4") || asset.endsWith(".webm")) {
        return preloadVideo(asset).then(updateProgress)
      } else {
        return preloadImage(asset).then(updateProgress)
      }
    })

    const minTimePromise = new Promise((resolve) => setTimeout(resolve, MIN_TIME))

    Promise.all([Promise.all(assetPromises), minTimePromise]).then(() => {
      setProgress(100)
      // Small 150ms buffer at 100% before initiating smooth fade-out
      setTimeout(() => {
        setIsExiting(true)
        document.body.style.overflow = originalOverflow

        // Unmount after transition duration
        setTimeout(() => {
          setMounted(false)
        }, 750)
      }, 150)
    })

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  if (!mounted) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Загрузка Priday"
      className={`fixed inset-0 z-[99999] bg-[#000000] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting
          ? "opacity-0 pointer-events-none scale-[1.02] filter blur-[2px]"
          : "opacity-100 pointer-events-auto scale-100 filter-none"
      }`}
    >
      {/* Background ambient warm fire glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] sm:w-[460px] sm:h-[460px] bg-gradient-radial from-[#ff6b35]/15 via-[#ffa600]/5 to-transparent rounded-full pointer-events-none blur-3xl animate-pulse"
        style={{ animationDuration: "3s" }}
        aria-hidden="true"
      />

      {/* Center LiquidGlass Animation */}
      <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
        <GlassRevealPriday className="w-full h-full" loop={false} />
      </div>

      {/* Brand Title & Subtle Progress Indicator */}
      <div className="flex flex-col items-center gap-3 mt-6 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[17px] sm:text-[19px] font-semibold tracking-tight text-white/95">
            Priday
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b35] animate-ping" />
        </div>

        <p className="text-[11px] sm:text-[12px] text-[#86868b] tracking-wider uppercase font-medium">
          Твой личный дневник силы
        </p>

        {/* Minimal Apple-style progress track */}
        <div className="w-40 sm:w-48 h-[2px] bg-white/[0.08] rounded-full overflow-hidden mt-3 relative">
          <div
            className="h-full bg-gradient-to-r from-[#ffa600] via-[#ff6b35] to-[#f54700] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default Preloader
