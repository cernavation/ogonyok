'use client'

import React, { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import type { Locale } from '@/src/content/i18n'
import { PROBLEM_MEDIA } from '@/src/lib/problem-media'

interface SafeVideoProps {
  mp4: string
  poster: string
  posterWebp?: string
  alt: string
  width?: number
  height?: number
  className?: string
}

export function SafeVideo({
  mp4,
  poster,
  posterWebp,
  alt,
  width = 2752,
  height = 1536,
  className = '',
}: SafeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Auto-play when near or in viewport, pause when scrolled away
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            video.play().catch(() => {
              // Graceful catch for strict autoplay policies
            })
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.1, rootMargin: '250px' }
    )

    observer.observe(video)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div
      className={`relative w-full overflow-hidden bg-black ${className}`}
      style={{
        maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, #000 65%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, #000 65%, transparent 100%)',
      }}
    >
      <video
        ref={videoRef}
        src={shouldLoad ? mp4 : undefined}
        poster={posterWebp || poster}
        muted
        loop
        playsInline
        preload="none"
        {...({ 'webkit-playsinline': 'true' } as any)}
        className="w-full h-auto block select-none pointer-events-none"
        style={{
          aspectRatio: `${width} / ${height}`,
          backgroundColor: '#000000',
        }}
        aria-label={alt}
      />

      {/* Dimming overlay: rgba(0,0,0,0.18) + radial gradient to edges */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.18)',
          backgroundImage: 'radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.55) 100%)',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

interface ProblemSectionProps {
  locale?: Locale
}

const PROBLEM_TEXTS: Record<
  Locale,
  {
    head: { title: string; desc: string }
    calendar: { title: string; desc: string }
    treadmill: { title: string; desc: string }
    finalLine: string
  }
> = {
  ru: {
    head: {
      title: 'Мысли кипят, уснуть невозможно.',
      desc: 'Всё незаконченное крутится в голове до ночи. Выгрузи день за 2 минуты и спокойно выключи голову.',
    },
    calendar: {
      title: 'Что ты сделал 2 недели назад? Не помнишь.',
      desc: 'Сотни дней сливаются в серый шум. Остаются пара вспышек, а реальный прогресс забывается.',
    },
    treadmill: {
      title: 'Вечно в делах, а чувства результата нет.',
      desc: 'Тебе не нужен ещё один список задач. Нужен честный лог того, чем ты реально гордишься.',
    },
    finalLine: 'Проблема не в тебе. А в отсутствии фиксации.',
  },
  ro: {
    head: {
      title: 'Gândurile fierb, e imposibil să adormi.',
      desc: 'Tot ce a rămas neterminat se învârte în minte până noaptea târziu. Descarcă ziua în 2 minute și oprește liniștit gândurile.',
    },
    calendar: {
      title: 'Ce ai făcut acum 2 săptămâni? Nu-ți amintești.',
      desc: 'Sute de zile se topesc într-un zgomot cenușiu. Rămân doar câteva sclipiri, iar progresul real se uită.',
    },
    treadmill: {
      title: 'Mereu ocupat, dar fără sentimentul unui rezultat.',
      desc: 'Nu ai nevoie de încă o listă de sarcini. Ai nevoie de un jurnal sincer cu lucrurile de care ești cu adevărat mândru.',
    },
    finalLine: 'Problema nu ești tu. Ci lipsa consemnării.',
  },
  en: {
    head: {
      title: 'Your mind is racing, sleep feels impossible.',
      desc: 'Unfinished tasks keep spinning in your head late into the night. Offload your day in 2 minutes and switch off with peace of mind.',
    },
    calendar: {
      title: "What did you do 2 weeks ago? You don't remember.",
      desc: 'Hundreds of days blur into gray noise. Only a few flashes remain, while your real progress gets forgotten.',
    },
    treadmill: {
      title: 'Always busy, yet no real sense of achievement.',
      desc: "You don't need another to-do list. You need an honest log of what you are genuinely proud of.",
    },
    finalLine: "The problem isn't you. It's not logging your wins.",
  },
}

export function ProblemSection({ locale = 'ru' }: ProblemSectionProps) {
  const t = PROBLEM_TEXTS[locale] || PROBLEM_TEXTS.ru

  return (
    <section
      id="problem"
      className="relative z-20 w-full bg-[#000000] text-white overflow-x-clip scroll-mt-16 sm:scroll-mt-20"
      style={{ backgroundColor: '#000000' }}
      aria-label="Проблема"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Блок 2.1 «Голова» */}
        <div className="py-8 sm:py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 flex justify-center lg:justify-start order-1">
            <div className="w-[min(70vw,260px)] sm:w-[320px] lg:w-[370px] max-w-[390px] shrink-0">
              <SafeVideo
                mp4={PROBLEM_MEDIA.headThreads.mp4!}
                poster={PROBLEM_MEDIA.headThreads.poster}
                posterWebp={PROBLEM_MEDIA.headThreads.posterWebp}
                alt={t.head.title}
                width={PROBLEM_MEDIA.headThreads.width}
                height={PROBLEM_MEDIA.headThreads.height}
              />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-center order-2 text-center lg:text-left">
            <h2 className="text-[24px] sm:text-[32px] md:text-[38px] lg:text-[42px] font-bold tracking-tight text-white leading-[1.12] text-balance">
              {t.head.title}
            </h2>
            <p className="mt-2.5 sm:mt-4 text-[15px] sm:text-[17px] md:text-[18px] text-[#86868b] leading-relaxed max-w-[520px] mx-auto lg:mx-0">
              {t.head.desc}
            </p>
          </div>
        </div>

        {/* Блок 2.2 «Календарь» */}
        <div className="py-8 sm:py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1 text-center lg:text-left">
            <h2 className="text-[24px] sm:text-[32px] md:text-[38px] lg:text-[42px] font-bold tracking-tight text-white leading-[1.12] text-balance">
              {t.calendar.title}
            </h2>
            <p className="mt-2.5 sm:mt-4 text-[15px] sm:text-[17px] md:text-[18px] text-[#86868b] leading-relaxed max-w-[520px] mx-auto lg:mx-0">
              {t.calendar.desc}
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="w-[min(70vw,260px)] sm:w-[320px] lg:w-[370px] max-w-[390px] shrink-0">
              <SafeVideo
                mp4={PROBLEM_MEDIA.fadedDays.mp4!}
                poster={PROBLEM_MEDIA.fadedDays.poster}
                posterWebp={PROBLEM_MEDIA.fadedDays.posterWebp}
                alt={t.calendar.title}
                width={PROBLEM_MEDIA.fadedDays.width}
                height={PROBLEM_MEDIA.fadedDays.height}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Блок 2.3 «Дорожка» (сжатый по вертикали) */}
      <div className="relative w-full bg-[#000000] overflow-hidden">
        {/* Десктоп-версия */}
        <div className="hidden lg:flex relative w-full min-h-[440px] xl:min-h-[500px] items-center justify-end px-8 md:px-12 lg:px-16 py-12 lg:py-16">
          <div className="absolute inset-y-0 left-0 w-[64%] pointer-events-none select-none z-0 overflow-hidden">
            <picture className="w-full h-full block">
              {PROBLEM_MEDIA.treadmill.posterWebp && (
                <source srcSet={PROBLEM_MEDIA.treadmill.posterWebp} type="image/webp" />
              )}
              <Image
                src={PROBLEM_MEDIA.treadmill.poster}
                alt={t.treadmill.title}
                fill
                loading="lazy"
                sizes="64vw"
                className="object-cover object-left"
              />
            </picture>
            <div
              className="absolute inset-0 z-10"
              style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0.75) 72%, #000000 100%)',
              }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.18)',
                backgroundImage: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.55) 100%)',
              }}
              aria-hidden="true"
            />
          </div>

          <div className="relative z-20 max-w-[520px] text-left">
            <h2 className="text-[32px] md:text-[38px] lg:text-[42px] font-bold tracking-tight text-white leading-[1.12] text-balance">
              {t.treadmill.title}
            </h2>
            <p className="mt-4 text-[17px] md:text-[18px] text-[#86868b] leading-relaxed">
              {t.treadmill.desc}
            </p>
          </div>
        </div>

        {/* Мобильная версия */}
        <div className="block lg:hidden relative w-full">
          <div className="relative w-full h-[220px] sm:h-[300px] overflow-hidden select-none">
            <picture className="w-full h-full block">
              {PROBLEM_MEDIA.treadmill.posterWebp && (
                <source srcSet={PROBLEM_MEDIA.treadmill.posterWebp} type="image/webp" />
              )}
              <Image
                src={PROBLEM_MEDIA.treadmill.poster}
                alt={t.treadmill.title}
                fill
                loading="lazy"
                sizes="100vw"
                className="object-cover object-left"
              />
            </picture>
            <div
              className="absolute inset-0 z-10"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 40%, rgba(0,0,0,0.82) 82%, #000000 100%)',
              }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.18)',
                backgroundImage: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.55) 100%)',
              }}
              aria-hidden="true"
            />
          </div>

          <div className="px-4 sm:px-8 pt-2 pb-8 text-center">
            <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight text-white leading-[1.14] text-balance">
              {t.treadmill.title}
            </h2>
            <p className="mt-2.5 text-[15px] sm:text-[17px] text-[#86868b] leading-relaxed max-w-[500px] mx-auto">
              {t.treadmill.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Финальная строка секции по центру */}
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-14 md:py-18 text-center">
        <p className="text-[22px] sm:text-[30px] md:text-[38px] font-semibold text-white tracking-tight leading-[1.2] text-balance">
          {t.finalLine}
        </p>
      </div>
    </section>
  )
}
