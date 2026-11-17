"use client";

// A portfolio index built as a wheel you turn.
//
// At rest the work sits in a ring around a title, each card tangent to the
// circle. The first notch of scroll blows the ring open into a vertical drum:
// the card at the front lies flat and full size, the ones above and below
// rotate away into hard perspective and run off the top and bottom of the
// frame. Keep turning and the drum carries the next piece round to the front.
import * as React from "react";

import { cn } from "@/lib/utils";

export interface WorksWheelItem {
  /** Project name / headline. Shown beside the front card on the left. */
  title: string;
  /** Subtitle / detailed explanation shown on the card bottom. */
  subtitle?: string;
  /** Sphere or category badge (e.g. "Бизнес", "Спорт", "Семья"). */
  tag?: string;
  /** Cover art. Any src an <img> takes. */
  image: string;
  /** Where the card links to. Omit for a wheel that only browses. */
  href?: string;
}

export interface WorksWheelProps
  extends Omit<React.ComponentPropsWithoutRef<"section">, "children"> {
  items: WorksWheelItem[];
  /** Sits in the middle of the ring at rest. @default "Что записывать в дневник" */
  label?: string;
  /** Label on the card's hover affordance. Omit to drop it. @default undefined */
  action?: string;
  /** Optional reference to the scroll track container to drive wheel via window scroll */
  trackRef?: React.RefObject<HTMLElement | null>;
  /** Notifies parent of turn and interpolation factor m (0 = ring, 1 = drum) */
  onTurnChange?: (turn: number, m: number, activeIndex: number) => void;
}

/* Geometry tuned for +40% larger cards and grand resting ring */
const CARD_H = 0.52; // front card height, fraction of stage
const CARD_MAX_W = 0.50; // front card max width, fraction of stage
const CARD_RATIO = 1.45; // card width / height
const STEP = 44; // degrees between cards on the drum
const DRUM = 2.22; // drum radius
const LENS = 2.8; // perspective distance
const BOW = 1.82; // arc radius
const TITLE = 0.11; // ring label size relative to card height

const CULL = 1.6;

const EASE = 0.12;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Stage = { w: number; h: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

const bowAt = (drumDeg: number, bow: number) =>
  -bow * (1 - Math.cos(rad(drumDeg)));

function place(
  ringDeg: number,
  drumDeg: number,
  ringR: number,
  drumR: number,
  bow: number,
  m: number,
) {
  return (
    `translateX(${m * bowAt(drumDeg, bow)}px)` +
    ` rotateZ(${(1 - m) * ringDeg}deg) translateY(${-(1 - m) * ringR}px)` +
    ` rotateX(${m * drumDeg}deg) translateZ(${m * drumR}px)`
  );
}

export function WorksWheel({
  items,
  label = "Что записывать в дневник",
  action = "Открыть",
  trackRef,
  onTurnChange,
  className,
  ...props
}: WorksWheelProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const wheelRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);
  const labelRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLDivElement>(null);

  const turn = React.useRef(0);
  const target = React.useRef(0);
  const [active, setActive] = React.useState(0);
  
  // Initialize with window dimensions so cards are NEVER 0px/collapsed from first render
  const [stage, setStage] = React.useState<Stage>(() => {
    if (typeof window !== "undefined") {
      return { w: window.innerWidth, h: window.innerHeight };
    }
    return { w: 1440, h: 900 };
  });

  const count = items.length;
  const last = Math.max(count - 1, 0);

  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setStage({ w: el.clientWidth, h: el.clientHeight });
      }
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const metrics = React.useMemo(() => {
    const w = stage.w || 1440;
    const h = stage.h || 900;
    const isNarrow = w < 1024;
    const isMobile = w < 768;

    const maxW = isNarrow ? (isMobile ? 0.88 : 0.65) : CARD_MAX_W;
    const cardHFrac = isNarrow ? (isMobile ? 0.36 : 0.44) : CARD_H;
    const cardW = Math.min(h * cardHFrac * CARD_RATIO, w * maxW);
    const cardH = cardW / CARD_RATIO;
    const drumR = cardH * DRUM;

    // +40% larger resting ring radius:
    // Forms a grand 680px-720px diameter ring on desktop
    const maxRingR = isNarrow
      ? Math.min(h * 0.32, w * 0.38, 240)
      : Math.min(h * 0.38, w * 0.28, 350);
    const ringR = Math.max(maxRingR, 145);

    // +40% larger card scale inside the ring (~210-220px wide cards on desktop)
    const ringScale = count
      ? clamp((((2 * Math.PI * ringR) / count) * 0.86) / (cardW || 1), 0.28, 0.46)
      : 0.35;

    return {
      cardW,
      cardH,
      ringR,
      ringScale,
      drumR,
      bow: cardH * BOW,
      depth: cardH * LENS,
      title: Math.max(cardH * TITLE, 24),
    };
  }, [stage, count]);

  // Use ref for onTurnChange to avoid restarting rAF draw loop on every parent render
  const onTurnChangeRef = React.useRef(onTurnChange);
  React.useEffect(() => {
    onTurnChangeRef.current = onTurnChange;
  }, [onTurnChange]);

  React.useEffect(() => {
    let frame = 0;
    const { ringR, ringScale, drumR, bow } = metrics;
    const isNarrow = stage.w < 1024;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const gap = target.current - turn.current;
      if (Math.abs(gap) < 0.0005) turn.current = target.current;
      else turn.current += gap * (reduced ? 1 : EASE);

      const t = turn.current;
      const m = clamp(t, 0, 1);
      const pos = Math.max(0, t - 1);

      // On desktop (>=1024px), smoothly shift drum to the RIGHT (+190px) into the freed space!
      const drumShiftX = isNarrow ? 0 : Math.min(stage.w * 0.14, 190) * m;
      // Lift slightly vertically in drum mode to provide generous clearance above Dynamic Island
      const drumShiftY = isNarrow ? -m * 20 : -(1 - m) * 15 - m * 35;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `translateX(${drumShiftX}px) translateY(${drumShiftY}px) translateZ(${-m * drumR}px)`;
      }

      for (let i = 0; i < count; i++) {
        const d = i - pos;
        const drumDeg = d * STEP;
        const card = cardRefs.current[i];
        if (card) {
          card.style.transform = place(
            d * (360 / count),
            drumDeg,
            ringR,
            drumR,
            bow,
            m,
          );
          // On mobile/tablet: cull non-active cards when turned to keep screen clean and clear
          if (isNarrow && m > 0.25) {
            const op = Math.max(0, 1 - Math.abs(d) * 1.6);
            card.style.opacity = Math.abs(d) > 0.65 ? "0" : String(op);
          } else {
            // Soft contrast: active card 1.0, distant neighbor cards fade slightly
            const op = Math.max(0.2, 1 - Math.abs(d) * 0.45);
            card.style.opacity = m > 0.5 && Math.abs(d) > CULL ? "0" : (m > 0.5 ? String(op) : "1");
          }
          card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
        }
        const face = card?.firstElementChild as HTMLElement | null;
        if (face) {
          face.style.transform = `scale(${lerp(ringScale, 1, m)})`;
          // Subtitle overlay only fades in when turned into drum, keeping the resting ring pure and uncluttered
          const sub = face.querySelector(".card-subtitle-overlay") as HTMLElement | null;
          if (sub) {
            sub.style.opacity = m > 0.25 ? String(clamp((m - 0.25) / 0.5, 0, 1)) : "0";
          }
        }
      }

      if (labelRef.current) labelRef.current.style.opacity = String(1 - m);
      if (titleRef.current) titleRef.current.style.opacity = String(m);
      const near = clamp(Math.round(pos), 0, last);
      setActive((prev) => (prev === near ? prev : near));

      if (onTurnChangeRef.current) {
        onTurnChangeRef.current(t, m, near);
      }
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, [metrics, stage.w, count, last, reduced]);

  const to = React.useCallback(
    (next: number) => {
      target.current = clamp(next, 0, last + 1);
    },
    [last],
  );

  // Sync with page scroll track (Scroll-Driven / Scroll-Pinned)
  // Animation starts ONLY after user reaches the center of the circle of cards!
  React.useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const track =
          trackRef?.current ||
          (stageRef.current?.closest("#modes") as HTMLElement | null);
        if (!track) return;

        // Measure header block above the sticky stage
        const header = track.querySelector(".modes-header-block");
        const headerH = header ? (header as HTMLElement).offsetHeight : 280;

        const rect = track.getBoundingClientRect();
        // Animation scroll range inside track
        const totalAnimScroll = track.offsetHeight - headerH - window.innerHeight;
        if (totalAnimScroll <= 0) return;

        // Start animation ONLY when user scrolled past the header and the circle is at viewport center
        const currentAnimScroll = -rect.top - headerH;

        if (currentAnimScroll <= 0) {
          // Still scrolling down to reach circle center: keep at rest (turn = 0)
          target.current = 0;
          return;
        }

        const progress = clamp(currentAnimScroll / totalAnimScroll, 0, 1);

        // Map scroll progress to wheel turn:
        // 0.00 -> 0.06: Dwell at rest circle so user can appreciate the centered ring (turn = 0)
        // 0.06 -> 0.16: Expand ring to 3D drum, item 0 at front (turn 0 -> 1)
        // 0.16 -> 0.92: Turn through items 0..8 (turn 1 -> count)
        // 0.92 -> 1.00: Settle on item 8 (turn = count)
        let nextTarget = 0;
        if (progress <= 0.06) {
          nextTarget = 0;
        } else if (progress <= 0.16) {
          const p = (progress - 0.06) / (0.16 - 0.06);
          nextTarget = p * 1;
        } else if (progress <= 0.92) {
          const p = (progress - 0.16) / (0.92 - 0.16);
          nextTarget = 1 + p * (count - 1);
        } else {
          nextTarget = count;
        }

        target.current = clamp(nextTarget, 0, count);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [trackRef, count]);

  // Navigate to item by index, smoothly scrolling the window track
  const scrollToItem = React.useCallback(
    (itemIndex: number) => {
      const track =
        trackRef?.current ||
        (stageRef.current?.closest("#modes") as HTMLElement | null);
      if (!track) {
        to(itemIndex + 1);
        return;
      }
      const header = track.querySelector(".modes-header-block");
      const headerH = header ? (header as HTMLElement).offsetHeight : 280;
      const totalAnimScroll = track.offsetHeight - headerH - window.innerHeight;
      if (totalAnimScroll <= 0) {
        to(itemIndex + 1);
        return;
      }
      const targetProgress =
        itemIndex === 0
          ? 0.16
          : 0.16 + (itemIndex / (count - 1)) * (0.92 - 0.16);
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      const targetY = trackTop + headerH + targetProgress * totalAnimScroll;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    },
    [trackRef, count, to],
  );

  const drag = React.useRef<number | null>(null);

  return (
    <div
      aria-label={label}
      className={cn(
        "relative h-full min-h-[580px] sm:min-h-[660px] md:min-h-[760px] w-full overflow-visible select-none bg-transparent",
        className,
      )}
      {...props}
    >
      {/* Soft atmospheric ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(0,113,227,0.12),transparent_75%)]" />

      {/* Interactive stage */}
      <div
        ref={stageRef}
        tabIndex={0}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`works-wheel-${active}`}
        className="focus-visible:outline-foreground absolute inset-0 cursor-grab touch-pan-x outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 active:cursor-grabbing overflow-visible z-10"
        style={{ perspective: `${metrics.depth}px` }}
        onPointerDown={(event) => {
          drag.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current === null) return;
          const delta = drag.current - event.clientY;
          drag.current = event.clientY;
          // Smoothly scroll window when dragging on stage
          window.scrollBy({ top: delta * 1.5, behavior: "instant" as ScrollBehavior });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            scrollToItem(Math.min(count - 1, active + 1));
          } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            scrollToItem(Math.max(0, active - 1));
          } else {
            return;
          }
          event.preventDefault();
        }}
      >
        <div
          ref={wheelRef}
          className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]"
        >
          {items.map((item, i) => {
            const Tag = (item.href ? "a" : "div") as "a";
            const isCurrent = i === active;
            return (
              <React.Fragment key={item.title}>
                <Tag
                  id={`works-wheel-${i}`}
                  role="option"
                  aria-selected={isCurrent}
                  href={item.href}
                  ref={(node: HTMLElement | null) => {
                    cardRefs.current[i] = node;
                  }}
                  className="group absolute [backface-visibility:hidden] transition-shadow duration-300"
                  style={{
                    width: metrics.cardW,
                    height: metrics.cardH,
                    marginLeft: -metrics.cardW / 2,
                    marginTop: -metrics.cardH / 2,
                  }}
                >
                  <span className="relative block size-full overflow-hidden rounded-2xl bg-[#16161a] border border-white/[0.12] shadow-[0_32px_70px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-[1.01]">
                    <img
                      src={item.image}
                      alt={item.title}
                      draggable={false}
                      className="size-full object-cover select-none"
                    />

                    {/* Subtle bottom gradient and description ONLY in drum mode - completely clean ring at rest! */}
                    {item.subtitle && (
                      <div className="card-subtitle-overlay opacity-0 absolute bottom-0 inset-x-0 p-4 sm:p-5 md:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none transition-opacity duration-300">
                        <p className="text-[#f5f5f7] text-xs sm:text-sm md:text-base font-normal leading-relaxed drop-shadow-md">
                          {item.subtitle}
                        </p>
                      </div>
                    )}

                    {action && item.href ? (
                      <span className="bg-black/70 text-white border border-white/20 pointer-events-none absolute right-3.5 top-3.5 flex translate-y-1 items-center gap-1.5 rounded-full px-3 py-1 text-xs backdrop-blur-md opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                        <svg
                          viewBox="0 0 12 12"
                          className="size-3"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 9 9 3M4 3h5v5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {action}
                      </span>
                    ) : null}
                  </span>
                </Tag>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Ring center label (visible when at rest before scroll) */}
      <div
        ref={labelRef}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4 tracking-tight z-20"
      >
        <span className="text-[#2997ff] text-[11px] sm:text-xs md:text-sm uppercase tracking-widest font-semibold mb-1.5 sm:mb-2 drop-shadow">
          Интерактивная галерея
        </span>
        <h3 className="text-xl sm:text-3xl md:text-4xl font-bold text-white max-w-[240px] sm:max-w-[340px] md:max-w-[420px] leading-tight drop-shadow-lg">
          {label}
        </h3>
        <p className="text-[#86868b] text-[11px] sm:text-xs md:text-sm mt-1.5 sm:mt-2.5 max-w-[220px] sm:max-w-[320px] drop-shadow">
          Листай страницу вниз, чтобы исследовать ключевые победы
        </p>
        <div className="mt-3 sm:mt-4 flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-[11px] sm:text-xs text-[#a1a1a6]">
          <span className="inline-block size-1.5 sm:size-2 rounded-full bg-[#0071e3] animate-pulse" />
          Скролль вниз ↓
        </div>
      </div>

      {/* Front-card headline on the left side of the stage on desktop (>=1024px), or top glass card on mobile & tablet */}
      <div
        ref={titleRef}
        className="pointer-events-none absolute top-[68px] sm:top-20 lg:top-1/2 left-4 sm:left-6 lg:left-[5%] xl:left-[8%] right-4 sm:right-6 lg:right-auto lg:-translate-y-1/2 flex flex-col items-center lg:items-start text-center lg:text-left max-w-full lg:max-w-[340px] xl:max-w-[420px] tracking-tight opacity-0 z-30 transition-opacity duration-300"
      >
        <div className="inline-flex flex-col items-center lg:items-start px-4 py-2.5 sm:px-5 sm:py-3 lg:p-0 rounded-2xl lg:rounded-none bg-black/80 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border border-white/12 lg:border-0 shadow-[0_8px_32px_rgba(0,0,0,0.6)] lg:shadow-none">
          {items[active]?.tag && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] lg:text-xs font-semibold tracking-wider uppercase mb-1.5 lg:mb-2 bg-[#0071e3]/25 text-[#2997ff] border border-[#0071e3]/30">
              <span className="size-1.5 rounded-full bg-[#2997ff]" />
              {items[active].tag}
            </span>
          )}
          <h3 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-bold text-white tracking-tight leading-snug drop-shadow-md">
            {items[active]?.title}
          </h3>
        </div>
      </div>

      {/* Dynamic Island Floating Control Bar (Fixed to bottom with offset, docking upon completion) */}
      <div className="absolute bottom-6 sm:bottom-8 md:bottom-10 inset-x-0 flex justify-center items-center pointer-events-auto z-40">
        <div className="flex items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-full bg-[#121215]/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.85)]">
          {/* Previous Arrow Button */}
          <button
            type="button"
            onClick={() => scrollToItem(Math.max(0, active - 1))}
            className="size-8 sm:size-9 rounded-full bg-white/[0.08] hover:bg-white/[0.18] active:scale-95 border border-white/10 flex items-center justify-center text-white/90 hover:text-white transition cursor-pointer"
            aria-label="Предыдущая победа"
          >
            <svg className="size-3.5 sm:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Dots Island */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-black/60 border border-white/[0.06]">
            {items.map((item, i) => {
              const isCurrent = i === active;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => scrollToItem(i)}
                  className="group relative py-1 flex items-center justify-center cursor-pointer border-0 bg-transparent outline-none"
                  aria-label={`Перейти к: ${item.title}`}
                >
                  <span
                    className={cn(
                      "block rounded-full transition-all duration-300 pointer-events-none",
                      isCurrent
                        ? "w-5 sm:w-6 h-1.5 sm:h-2 bg-[#2997ff] shadow-[0_0_12px_rgba(41,151,255,0.85)]"
                        : "size-1.5 sm:size-2 bg-white/30 hover:bg-white/55"
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Next Arrow Button */}
          <button
            type="button"
            onClick={() => scrollToItem(Math.min(count - 1, active + 1))}
            className="size-8 sm:size-9 rounded-full bg-white/[0.08] hover:bg-white/[0.18] active:scale-95 border border-white/10 flex items-center justify-center text-white/90 hover:text-white transition cursor-pointer"
            aria-label="Следующая победа"
          >
            <svg className="size-3.5 sm:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorksWheel;
