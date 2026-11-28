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
  galleryLabel?: string;
  hintLabel?: string;
  scrollDownLabel?: string;
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
  galleryLabel = "Интерактивная галерея",
  hintLabel = "Нажми на карточку или листай страницу вниз",
  scrollDownLabel = "Скролль вниз ↓",
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

  // Card hover & select states for smooth enlargement and dimming of other cards
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [selected, setSelected] = React.useState<number | null>(null);
  const hoveredRef = React.useRef<number | null>(null);
  const selectedRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  React.useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  
  // Initialize with window dimensions so cards are NEVER 0px/collapsed from first render
  const [stage, setStage] = React.useState<Stage>(() => {
    if (typeof window !== "undefined") {
      return { w: window.innerWidth, h: window.innerHeight };
    }
    return { w: 1440, h: 900 };
  });

  const count = items.length;
  const last = Math.max(count - 1, 0);

  // Per-card smooth animation states (scale, opacity, subtitle opacity)
  const currentScales = React.useRef<number[]>([]);
  const currentOpacities = React.useRef<number[]>([]);
  const currentSubOpacities = React.useRef<number[]>([]);

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

    // Grand resting ring radius
    const maxRingR = isNarrow
      ? Math.min(h * 0.32, w * 0.38, 240)
      : Math.min(h * 0.38, w * 0.28, 350);
    const ringR = Math.max(maxRingR, 145);

    // Card scale inside the ring (~210-220px wide cards on desktop)
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

    // Ensure interpolation arrays match count
    if (currentScales.current.length !== count) {
      currentScales.current = new Array(count).fill(ringScale);
      currentOpacities.current = new Array(count).fill(1);
      currentSubOpacities.current = new Array(count).fill(0);
    }

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const gap = target.current - turn.current;
      if (Math.abs(gap) < 0.0005) turn.current = target.current;
      else turn.current += gap * (reduced ? 1 : EASE);

      const t = turn.current;
      const m = clamp(t, 0, 1);
      const pos = Math.max(0, t - 1);
      const near = clamp(Math.round(pos), 0, last);

      // On desktop (>=1024px), smoothly shift drum to the RIGHT (+190px) into the freed space!
      const drumShiftX = isNarrow ? 0 : Math.min(stage.w * 0.14, 190) * m;
      // Lift slightly vertically in drum mode to provide generous clearance above Dynamic Island
      const drumShiftY = isNarrow ? -m * 20 : -(1 - m) * 15 - m * 35;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `translateX(${drumShiftX}px) translateY(${drumShiftY}px) translateZ(${-m * drumR}px)`;
      }

      const hoveredIdx = hoveredRef.current;
      const selectedIdx = selectedRef.current;
      const anyFocus = hoveredIdx !== null || selectedIdx !== null;

      for (let i = 0; i < count; i++) {
        const d = i - pos;
        const drumDeg = d * STEP;
        const card = cardRefs.current[i];
        const isHovered = hoveredIdx === i;
        const isSelected = selectedIdx === i;
        const hasFocus = isHovered || isSelected;

        if (card) {
          card.style.transform = place(
            d * (360 / count),
            drumDeg,
            ringR,
            drumR,
            bow,
            m,
          );

          // Calculate base opacity
          let baseOp = 1;
          if (m > 0.25) {
            if (isNarrow) {
              baseOp = Math.abs(d) > 0.65 ? 0 : Math.max(0, 1 - Math.abs(d) * 1.6);
            } else {
              baseOp =
                m > 0.5 && Math.abs(d) > CULL
                  ? 0
                  : Math.max(0.2, 1 - Math.abs(d) * 0.45);
            }
          }

          // In drum mode (m > 0.25), focused card is fully opaque; other cards slightly dimmed
          let targetOp = baseOp;
          if (m > 0.25) {
            if (hasFocus) {
              targetOp = 1.0;
            } else if (anyFocus) {
              targetOp = baseOp * 0.32;
            }
          }

          const curOp = currentOpacities.current[i] ?? targetOp;
          const nextOp = curOp + (targetOp - curOp) * (reduced ? 1 : 0.18);
          currentOpacities.current[i] = nextOp;
          card.style.opacity = Math.abs(nextOp) < 0.005 ? "0" : nextOp.toFixed(3);

          // Z-index: focused card stays on top
          if (hasFocus) {
            card.style.zIndex = "450";
          } else {
            card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
          }
        }

        const face = card?.firstElementChild as HTMLElement | null;
        if (face) {
          const baseScale = lerp(ringScale, 1, m);
          // Pure scroll-driven scale: strictly no hover enlargement
          const targetScale = baseScale;

          const curScale = currentScales.current[i] ?? targetScale;
          const nextScale = curScale + (targetScale - curScale) * (reduced ? 1 : 0.18);
          currentScales.current[i] = nextScale;
          face.style.transform = `scale(${nextScale.toFixed(4)})`;

          // Subtitle / Full phrase overlay opacity:
          // Shows in drum mode when front or focused
          let targetSubOp = 0;
          if (m > 0.25) {
            if (hasFocus) {
              targetSubOp = 1.0;
            } else {
              targetSubOp =
                clamp((m - 0.25) / 0.5, 0, 1) * Math.max(0, 1 - Math.abs(d) * 0.75);
            }
          } else {
            targetSubOp = 0;
          }

          const curSubOp = currentSubOpacities.current[i] ?? targetSubOp;
          const nextSubOp = curSubOp + (targetSubOp - curSubOp) * (reduced ? 1 : 0.22);
          currentSubOpacities.current[i] = nextSubOp;

          const sub = face.querySelector(".card-subtitle-overlay") as HTMLElement | null;
          if (sub) {
            sub.style.opacity = Math.abs(nextSubOp) < 0.005 ? "0" : nextSubOp.toFixed(3);
          }
        }
      }

      // Center ring label opacity: fades out smoothly as user scrolls into drum
      if (labelRef.current) {
        const ringLabelBase = 1 - m;
        labelRef.current.style.opacity = Math.max(0, ringLabelBase).toFixed(3);
      }

      // Left title overlay opacity in drum mode
      if (titleRef.current) {
        titleRef.current.style.opacity = m.toFixed(3);
      }

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
        const totalAnimScroll = track.offsetHeight - headerH - window.innerHeight;
        if (totalAnimScroll <= 0) return;

        const currentAnimScroll = -rect.top - headerH;

        if (currentAnimScroll <= 0) {
          target.current = 0;
          return;
        }

        const progress = clamp(currentAnimScroll / totalAnimScroll, 0, 1);

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

  // Determine currently focused item for side headline
  const focusedIndex = hovered ?? selected ?? active;
  const currentItem = items[focusedIndex] ?? items[active] ?? items[0];

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
        role="region"
        aria-label={label}
        className="focus-visible:outline-foreground absolute inset-0 cursor-grab touch-pan-x outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 active:cursor-grabbing overflow-visible z-10"
        style={{ perspective: `${metrics.depth}px` }}
        onPointerDown={(event) => {
          if (event.target === stageRef.current) {
            setSelected(null);
            selectedRef.current = null;
          }
          drag.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current === null) return;
          const delta = drag.current - event.clientY;
          drag.current = event.clientY;
          window.scrollBy({ top: delta * 1.5, behavior: "instant" as ScrollBehavior });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            const next = Math.min(count - 1, active + 1);
            setSelected(next);
            selectedRef.current = next;
            scrollToItem(next);
          } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            const prev = Math.max(0, active - 1);
            setSelected(prev);
            selectedRef.current = prev;
            scrollToItem(prev);
          } else if (event.key === "Escape") {
            setSelected(null);
            selectedRef.current = null;
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
            const isCurrent = i === active;
            const isHovered = hovered === i;
            const isSelected = selected === i;
            const hasFocus = isHovered || isSelected;

            return (
              <React.Fragment key={item.title}>
                <div
                  id={`works-wheel-${i}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.tag ? `${item.tag}: ` : ""}${item.title}`}
                  aria-selected={isCurrent || isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedRef.current === i) {
                      setSelected(null);
                      selectedRef.current = null;
                    } else {
                      setSelected(i);
                      selectedRef.current = i;
                      if (turn.current > 0.4) {
                        scrollToItem(i);
                      }
                    }
                  }}
                  onPointerEnter={() => {
                    setHovered(i);
                    hoveredRef.current = i;
                  }}
                  onPointerLeave={() => {
                    setHovered(null);
                    hoveredRef.current = null;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const next = selectedRef.current === i ? null : i;
                      setSelected(next);
                      selectedRef.current = next;
                    }
                  }}
                  ref={(node: HTMLElement | null) => {
                    cardRefs.current[i] = node;
                  }}
                  className={cn(
                    "group absolute [backface-visibility:hidden] cursor-pointer outline-none transition-shadow duration-300",
                    hasFocus && "z-50",
                  )}
                  style={{
                    width: metrics.cardW,
                    height: metrics.cardH,
                    marginLeft: -metrics.cardW / 2,
                    marginTop: -metrics.cardH / 2,
                  }}
                >
                  <span
                    className={cn(
                      "relative block size-full overflow-hidden rounded-2xl bg-[#060608] border transition-all duration-300",
                      isSelected
                        ? "border-white/35 shadow-[0_24px_80px_rgba(0,0,0,0.95)] ring-1 ring-white/25"
                        : "border-white/[0.12] shadow-[0_32px_70px_rgba(0,0,0,0.85)]",
                    )}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      draggable={false}
                      className="size-full object-cover select-none"
                    />

                    {/* Category tag pill in top-left corner of each card */}
                    {item.tag && (
                      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-colors duration-300 backdrop-blur-md",
                            hasFocus
                              ? "bg-white/[0.14] text-white border border-white/[0.22]"
                              : "bg-white/[0.08] text-white/80 border border-white/[0.12]",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              hasFocus ? "bg-white" : "bg-white/60",
                            )}
                          />
                          {item.tag}
                        </span>
                      </div>
                    )}

                    {/* Full phrase overlay with gradient at bottom (strictly >= 16px font, no cut-off words) */}
                    <div
                      className={cn(
                        "card-subtitle-overlay absolute bottom-0 inset-x-0 p-4 sm:p-5 md:p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-none transition-opacity duration-300 z-20 flex flex-col justify-end",
                      )}
                    >
                      <p className="text-white text-[16px] sm:text-[17px] md:text-[18px] font-medium leading-snug drop-shadow-md break-words">
                        {item.title}
                      </p>
                    </div>

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
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Ring center label (visible when at rest before scroll) */}
      <div
        ref={labelRef}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4 tracking-tight z-20 transition-opacity duration-300"
      >
        <span className="text-white/60 text-[11px] sm:text-xs md:text-sm uppercase tracking-widest font-semibold mb-1.5 sm:mb-2 drop-shadow">
          {galleryLabel}
        </span>
        <h3 className="text-xl sm:text-3xl md:text-4xl font-bold text-white max-w-[240px] sm:max-w-[340px] md:max-w-[420px] leading-tight drop-shadow-lg">
          {label}
        </h3>
        <p className="text-[#86868b] text-[11px] sm:text-xs md:text-sm mt-1.5 sm:mt-2.5 max-w-[220px] sm:max-w-[320px] drop-shadow">
          {hintLabel}
        </p>
        <div className="mt-3 sm:mt-4 flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-[11px] sm:text-xs text-[#a1a1a6]">
          <span className="inline-block size-1.5 sm:size-2 rounded-full bg-white/75 animate-pulse" />
          {scrollDownLabel}
        </div>
      </div>

      {/* Front-card headline on the left side of the stage on desktop (>=1024px), or top glass card on mobile & tablet */}
      <div
        ref={titleRef}
        className="pointer-events-none absolute top-[68px] sm:top-20 lg:top-1/2 left-4 sm:left-6 lg:left-[5%] xl:left-[8%] right-4 sm:right-6 lg:right-auto lg:-translate-y-1/2 flex flex-col items-center lg:items-start text-center lg:text-left max-w-full lg:max-w-[340px] xl:max-w-[420px] tracking-tight opacity-0 z-30 transition-opacity duration-300"
      >
        <div className="inline-flex flex-col items-center lg:items-start px-4 py-2.5 sm:px-5 sm:py-3 lg:p-0 rounded-2xl lg:rounded-none bg-black/80 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border border-white/12 lg:border-0 shadow-[0_8px_32px_rgba(0,0,0,0.6)] lg:shadow-none">
          {currentItem?.tag && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] lg:text-xs font-semibold tracking-wider uppercase mb-1.5 lg:mb-2 bg-white/[0.08] border border-white/[0.12] text-white/80 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-white/80" />
              {currentItem.tag}
            </span>
          )}
          <h3 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-bold text-white tracking-tight leading-snug drop-shadow-md">
            {currentItem?.title}
          </h3>
        </div>
      </div>

      {/* Dynamic Island Floating Control Bar (Fixed to bottom with offset) */}
      <div className="absolute bottom-6 sm:bottom-8 md:bottom-10 inset-x-0 flex justify-center items-center pointer-events-auto z-40">
        <div className="flex items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-full bg-[#121215]/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_rgba(0,0,0,0.85)]">
          {/* Previous Arrow Button */}
          <button
            type="button"
            onClick={() => {
              const prev = Math.max(0, active - 1);
              setSelected(prev);
              selectedRef.current = prev;
              scrollToItem(prev);
            }}
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
              const isCurrent = i === focusedIndex;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setSelected(i);
                    selectedRef.current = i;
                    scrollToItem(i);
                  }}
                  className="group relative py-1 flex items-center justify-center cursor-pointer border-0 bg-transparent outline-none"
                  aria-label={`Перейти к: ${item.tag ?? item.title}`}
                >
                  <span
                    className={cn(
                      "block rounded-full transition-all duration-300 pointer-events-none",
                      isCurrent
                        ? "w-5 sm:w-6 h-1.5 sm:h-2 bg-white shadow-[0_0_10px_rgba(255,255,255,0.45)]"
                        : "size-1.5 sm:size-2 bg-white/30 hover:bg-white/55",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Next Arrow Button */}
          <button
            type="button"
            onClick={() => {
              const next = Math.min(count - 1, active + 1);
              setSelected(next);
              selectedRef.current = next;
              scrollToItem(next);
            }}
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
