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
      title: 'Засыпаешь час, потому что мысли кипят.',
      desc: 'Всё, что осталось незаконченным, крутится в голове ночью. Если записать день, мысли перестают держаться за ночь.',
    },
    calendar: {
      title: 'Что ты делал 12 марта? Не помнишь.',
      desc: 'Сотни дней сливаются в серый шум. Остаются два-три ярких. Остальные как будто не жили.',
    },
    treadmill: {
      title: 'Сто дней в движении. Результата не видно.',
      desc: 'Занят всё время, но непонятно, куда идёшь. Нужен не ещё один план, а честный взгляд на то, что ты на самом деле делал.',
    },
    finalLine: 'Проблема не в тебе. Просто никто не записывал твои победы.',
  },
  ro: {
    head: {
      title: 'Adormi greu pentru că gândurile nu se opresc.',
      desc: 'Tot ce a rămas neterminat îți revine în minte noaptea. Când îți așterni ziua pe hârtie, gândurile se liniștesc.',
    },
    calendar: {
      title: 'Ce ai făcut pe 12 martie? Nu-ți amintești.',
      desc: 'Sute de zile se pierd într-un zgomot cenușiu. Rămân doar două-trei memorabile. Celelalte parcă nici n-au fost trăite.',
    },
    treadmill: {
      title: 'O sută de zile în mișcare. Niciun rezultat vizibil.',
      desc: 'Mereu ocupat, dar fără să știi încotro te îndrepți. Nu ai nevoie de încă un plan, ci de o privire sinceră asupra a ceea ce ai făcut cu adevărat.',
    },
    finalLine: 'Problema nu ești tu. Pur și simplu nimeni nu ți-a notat victoriile.',
  },
  en: {
    head: {
      title: 'Tossing and turning because your mind is racing.',
      desc: 'Everything left undone keeps spinning in your head at night. Once you write down your day, the thoughts stop keeping you awake.',
    },
    calendar: {
      title: "What did you do on March 12th? You don't remember.",
      desc: 'Hundreds of days blur into gray noise. Only two or three stand out. The rest are as if you never lived them.',
    },
    treadmill: {
      title: 'A hundred days of motion. No visible result.',
      desc: "Constantly busy, yet unsure where you're headed. You don't need another plan—you need an honest look at what you actually accomplished.",
    },
    finalLine: "The problem isn't you. Nobody was writing down your wins.",
  },
}

export function ProblemSection({ locale = 'ru' }: ProblemSectionProps) {
  const t = PROBLEM_TEXTS[locale] || PROBLEM_TEXTS.ru

  return (
    <section
      id="problem"
      className="relative w-full bg-[#000000] text-white overflow-hidden scroll-mt-24 sm:scroll-mt-32"
      style={{ backgroundColor: '#000000' }}
      aria-label="Проблема"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8">
        {/* ═══════════════════════════════════════════════════════════
            Блок 2.1 «Голова» (Видео слева, текст справа на десктопе)
            ═══════════════════════════════════════════════════════════ */}
        <div className="py-16 sm:py-24 md:py-32 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Медиа: ширина 380-440px на десктопе, min(78vw, 340px) по центру на мобильных */}
          <div className="lg:col-span-6 flex justify-center lg:justify-start order-1">
            <div className="w-[min(78vw,340px)] sm:w-[380px] lg:w-[420px] max-w-[440px] shrink-0">
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

          {/* Текст */}
          <div className="lg:col-span-6 flex flex-col justify-center order-2 text-center lg:text-left">
            <h2 className="text-[26px] sm:text-[34px] md:text-[40px] lg:text-[44px] font-bold tracking-tight text-white leading-[1.14] text-balance">
              {t.head.title}
            </h2>
            <p className="mt-4 sm:mt-6 text-[16px] sm:text-[18px] md:text-[19px] text-[#86868b] leading-relaxed max-w-[540px] mx-auto lg:mx-0">
              {t.head.desc}
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            Блок 2.2 «Календарь» (Текст слева, видео справа на десктопе)
            ═══════════════════════════════════════════════════════════ */}
        <div className="py-16 sm:py-24 md:py-32 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Текст: на мобильных order-2 (после медиа), на десктопе order-1 (слева) */}
          <div className="lg:col-span-6 flex flex-col justify-center order-2 lg:order-1 text-center lg:text-left">
            <h2 className="text-[26px] sm:text-[34px] md:text-[40px] lg:text-[44px] font-bold tracking-tight text-white leading-[1.14] text-balance">
              {t.calendar.title}
            </h2>
            <p className="mt-4 sm:mt-6 text-[16px] sm:text-[18px] md:text-[19px] text-[#86868b] leading-relaxed max-w-[540px] mx-auto lg:mx-0">
              {t.calendar.desc}
            </p>
          </div>

          {/* Медиа: на мобильных order-1 (сверху), на десктопе order-2 (справа, 380-440px) */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="w-[min(78vw,340px)] sm:w-[380px] lg:w-[420px] max-w-[440px] shrink-0">
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

      {/* ═══════════════════════════════════════════════════════════
          Блок 2.3 «Дорожка»
          Десктоп: min-height 85vh, фото слева растворяется вправо в чёрный, текст в правом верхнем углу (max-width 520px).
          Мобильные: фото сверху 60vh (градиент снизу к чёрному), текст под ним.
          ═══════════════════════════════════════════════════════════ */}
      <div className="relative w-full bg-[#000000] overflow-hidden">
        {/* Десктоп-версия (hidden на мобильных, flex на lg) */}
        <div className="hidden lg:flex relative w-full min-h-[85vh] items-start justify-end px-8 md:px-12 lg:px-16 py-20 lg:py-28">
          {/* Фото на всю высоту, прижато к левому краю */}
          <div className="absolute inset-y-0 left-0 w-[68%] pointer-events-none select-none z-0 overflow-hidden">
            <picture className="w-full h-full block">
              {PROBLEM_MEDIA.treadmill.posterWebp && (
                <source srcSet={PROBLEM_MEDIA.treadmill.posterWebp} type="image/webp" />
              )}
              <Image
                src={PROBLEM_MEDIA.treadmill.poster}
                alt={t.treadmill.title}
                fill
                loading="lazy"
                sizes="68vw"
                className="object-cover object-left"
              />
            </picture>
            {/* Градиент растворения правого края фото в чистый чёрный (#000000) */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.7) 70%, #000000 100%)',
              }}
              aria-hidden="true"
            />
            {/* Затемнение: rgba(0,0,0,0.18) + радиальный градиент */}
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.18)',
                backgroundImage: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.55) 100%)',
              }}
              aria-hidden="true"
            />
          </div>

          {/* Текст в правом верхнем углу, max-width 520px */}
          <div className="relative z-20 max-w-[520px] text-left">
            <h2 className="text-[34px] md:text-[40px] lg:text-[44px] font-bold tracking-tight text-white leading-[1.14] text-balance">
              {t.treadmill.title}
            </h2>
            <p className="mt-6 text-[18px] md:text-[19px] text-[#86868b] leading-relaxed">
              {t.treadmill.desc}
            </p>
          </div>
        </div>

        {/* Мобильная версия (блок на мобильных, hidden на lg) */}
        <div className="block lg:hidden relative w-full">
          {/* Фото сверху: высота 60vh, object-position: left center, градиент снизу к чёрному */}
          <div className="relative w-full h-[60vh] overflow-hidden select-none">
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
            {/* Градиент снизу к чёрному */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.8) 80%, #000000 100%)',
              }}
              aria-hidden="true"
            />
            {/* Затемнение поверх медиа */}
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.18)',
                backgroundImage: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.55) 100%)',
              }}
              aria-hidden="true"
            />
          </div>

          {/* Текст под фото */}
          <div className="px-5 sm:px-8 pt-4 pb-16 text-center">
            <h2 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-white leading-[1.16] text-balance">
              {t.treadmill.title}
            </h2>
            <p className="mt-4 text-[16px] sm:text-[17px] text-[#86868b] leading-relaxed max-w-[500px] mx-auto">
              {t.treadmill.desc}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Финальная строка секции по центру, крупнее
          ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 md:px-8 py-24 sm:py-32 md:py-40 text-center">
        <p className="text-[24px] sm:text-[32px] md:text-[40px] lg:text-[48px] font-semibold text-white tracking-tight leading-[1.22] text-balance">
          {t.finalLine}
        </p>
      </div>
    </section>
  )
}
