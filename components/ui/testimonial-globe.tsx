"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import createGlobe from "cobe";
import type { Globe } from "cobe";

type Vec3 = [number, number, number];
type GlState = "pending" | "ready" | "unavailable";
type Tone = 1 | 2 | 3 | 4 | 5;

export interface GlobeTestimonial {
  id: string;
  type?: "example" | "real";
  /** One or two sentences starting with «Горжусь тем, что…» */
  quote: string;
  /** City name shown on the card and in the pin's accessible name. */
  city: string;
  /** Short country code such as "MD", "GB", "US". */
  country?: string;
  /** Author name (e.g. "Dan M.", "Michael B.") */
  author?: string;
  /** Formatted location string (e.g. "USA, New York", "Kenya, Nairobi") */
  location?: string;
  /** Topic category (e.g. "Семья", "Спорт", "Работа") */
  topic?: string;
  /** Pin latitude in degrees (south is negative). */
  lat: number;
  /** Pin longitude in degrees (west is negative). */
  lng: number;
  /** Portrait or avatar image */
  image?: string;
  /** Ring color token (1: Signal Orange, 2: Apple Blue, 3: Sapphire, 4: Amber, 5: Frost White) */
  tone?: Tone;
}

export interface ExtraStoryItem {
  id: string;
  type?: "example" | "real";
  city: string;
  country?: string;
  topic?: string;
  quote: string;
}

export interface TestimonialGlobeLabels {
  previous: string;
  next: string;
  pin: string;
  storiesCountLabel?: string;
  citiesLabel?: string;
  exampleBadge?: string;
}

export interface TestimonialGlobeProps extends React.ComponentProps<"section"> {
  items: GlobeTestimonial[];
  eyebrow?: string;
  heading?: string;
  caption?: string;
  /** Call to action rendered next to the counters */
  action?: React.ReactNode;
  /** Spin while idle. Always off when visitor prefers reduced motion. */
  autoRotate?: boolean;
  /** Idle spin speed in radians per second. Continuous without pauses. */
  rotationSpeed?: number;
  /** Controlled featured story index, or null */
  active?: number | null;
  /** Called whenever featured story changes */
  onActiveChange?: (index: number | null) => void;
  /** Largest globe diameter in pixels */
  size?: number;
  labels?: TestimonialGlobeLabels;
}

const GLOBE_RADIUS = 0.8;
const THETA = 0.3; // tilt toward viewer in radians
const PIN_ALTITUDE = 0.05; // pins float just above sphere
const DRAG_FRICTION = 0.94; // smooth inertia decay
const SWAP_MS = 220;
const DRAG_SLOP = 5;
const SWIPE_MIN = 35;
const WIDE_MIN = 620;
const MAX_CONTENT = 1200;

const DEFAULT_LABELS: TestimonialGlobeLabels = {
  previous: "Предыдущая запись",
  next: "Следующая запись",
  pin: "Запись из г.",
  storiesCountLabel: "записей на карте",
  citiesLabel: "городов мира",
  exampleBadge: "Пример записи",
};

/* ── Apple-calibrated ring & ping color classes matching Ogonek Design System ── */
const RING = {
  1: "ring-[#d76737]",
  2: "ring-white/35",
  3: "ring-white/25",
  4: "ring-[#d76737]/75",
  5: "ring-[#f5f5f7]",
} as const;

const PING = {
  1: "border-[#d76737]",
  2: "border-white/35",
  3: "border-white/25",
  4: "border-[#d76737]/75",
  5: "border-[#f5f5f7]",
} as const;

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (t: number) => t * t * (3 - 2 * t);

function toneOf(item: GlobeTestimonial, index: number): Tone {
  return item.tone ?? (((index % 5) + 1) as Tone);
}

function toCartesian(lat: number, lng: number): Vec3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lng * Math.PI) / 180 - Math.PI;
  const c = Math.cos(la);
  return [-c * Math.cos(lo), Math.sin(la), c * Math.sin(lo)];
}

// Exactly matches cobe GPU rotation so HTML pins stay glued to the continents.
function project([x, y, z]: Vec3, phi: number, theta: number, altitude: number) {
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const radius = GLOBE_RADIUS * (1 + altitude);
  const sx = (cp * x + sp * z) * radius;
  const sy = (sp * st * x + ct * y - cp * st * z) * radius;
  const depth = -sp * ct * x + st * y + cp * ct * z;
  return { x: (sx + 1) / 2, y: (1 - sy) / 2, depth, rim: Math.hypot(sx, sy) - GLOBE_RADIUS };
}

function facingPhi(lng: number) {
  return (3 * Math.PI) / 2 - (lng * Math.PI) / 180;
}

function nearestTurn(from: number, angle: number) {
  const tau = Math.PI * 2;
  return angle + tau * Math.round((from - angle) / tau);
}

function pinOpacity(depth: number, rim: number) {
  if (depth >= 0) return 0.45 + 0.55 * smooth(clamp01(depth / 0.3));
  const exposed = Math.max(clamp01(rim / 0.04), clamp01(1 + depth * 8));
  return 0.45 * exposed * clamp01(1 + depth * 3);
}

function pinScale(depth: number) {
  return 0.65 + 0.35 * smooth(clamp01((depth + 0.2) / 0.7));
}

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10));
}

function QuoteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M9.6 5.5C6.4 6.5 4.4 9.3 4.4 12.9v5.6h6.2v-6.2H7.7c.2-2 1.4-3.6 3.2-4.3L9.6 5.5Zm9.4 0c-3.2 1-5.2 3.8-5.2 7.4v5.6H20v-6.2h-2.9c.2-2 1.4-3.6 3.2-4.3L19 5.5Z" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

const COUNTRY_NAMES: Record<string, string> = {
  MD: "Moldova",
  GB: "UK",
  US: "USA",
  JP: "Japan",
  AU: "Australia",
  KE: "Kenya",
  BR: "Brazil",
  DE: "Germany",
  IN: "India",
  CA: "Canada",
  TR: "Turkey",
  KR: "South Korea",
  MX: "Mexico",
  ZA: "South Africa",
  PL: "Poland",
  KZ: "Kazakhstan",
  GE: "Georgia",
  FR: "France",
  NO: "Norway",
  SG: "Singapore",
};

export function formatGlobeLocation(item: GlobeTestimonial): string {
  if (item.location) return item.location;
  const country = item.country ? (COUNTRY_NAMES[item.country] || item.country) : "";
  if (country && item.city) {
    return `${country}, ${item.city}`;
  }
  return item.city || country || "";
}

interface QuoteCardProps {
  item: GlobeTestimonial;
  index: number;
  tone: Tone;
  roomy: boolean;
  mode: "current" | "leaving" | "sizer";
  exampleBadge?: string;
  ref?: React.ComponentProps<"figure">["ref"];
}

const QuoteCard = React.memo(function QuoteCard({ item, index, tone, roomy, mode, exampleBadge = "Пример записи", ref }: QuoteCardProps) {
  const hidden = mode !== "current";
  const isExample = item.type !== "real";

  return (
    <figure
      ref={ref}
      data-quote-card={mode === "current" ? "" : undefined}
      data-quote-leaving={mode === "leaving" ? "" : undefined}
      data-index={mode === "current" ? index : undefined}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cx(
        "relative col-start-1 row-start-1 m-0 flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#141418]/95 backdrop-blur-2xl text-[#f5f5f7] shadow-[0_24px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(255,77,0,0.08)]",
        roomy ? "p-7" : "px-5 py-4",
        mode === "sizer" && "invisible",
        mode === "leaving" && "pointer-events-none",
      )}
    >
      <div className={cx("relative flex items-center flex-wrap gap-2.5 pr-28", roomy ? "min-h-7" : "min-h-6")}>
        <div className="flex items-center gap-2.5">
          <QuoteMark className={cx("shrink-0 text-[#d76737]", roomy ? "w-6 h-6" : "w-5 h-5")} />
          {item.topic && (
            <span className="text-[12px] font-semibold text-[#d76737] tracking-wider uppercase">
              {item.topic}
            </span>
          )}
        </div>
        {/* Only show example badge when type === 'example', kept clear of top-right pagination */}
        {isExample && (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[#86868b] border border-white/10">
            {exampleBadge}
          </span>
        )}
      </div>

      <blockquote
        className={cx(
          "relative m-0 text-pretty text-white font-normal",
          roomy ? "mt-4 text-[17px] sm:text-[18px] leading-relaxed" : "mt-2.5 text-[15px] sm:text-[16px] leading-snug",
        )}
      >
        <p>«{item.quote}»</p>
      </blockquote>

      <figcaption className={cx("relative mt-auto flex items-center justify-between border-t border-white/[0.08]", roomy ? "pt-5 mt-5" : "pt-3.5 mt-3")}>
        <div className="flex items-center gap-3 min-w-0">
          {item.image ? (
            <img
              src={item.image}
              alt={item.author || item.city}
              width={roomy ? 40 : 36}
              height={roomy ? 40 : 36}
              className={cx(
                "relative shrink-0 rounded-full object-cover border border-white/20 shadow-sm ring-1 ring-white/10 select-none",
                roomy ? "size-10" : "size-9",
              )}
              loading="lazy"
            />
          ) : (
            <span
              className={cx(
                "relative flex items-center justify-center shrink-0 rounded-full bg-[#d76737]/15 text-[#d76737] border border-[#d76737]/40 font-mono font-bold text-xs",
                roomy ? "size-9" : "size-8",
              )}
            >
              {index + 1}
            </span>
          )}
          <div className="flex flex-col text-left min-w-0">
            <span className="text-[15px] font-semibold text-white leading-tight truncate">
              {item.author || item.city}
            </span>
            {item.author ? (
              <span className="text-xs text-[#86868b] font-medium truncate">
                {item.city}
              </span>
            ) : item.country ? (
              <span className="text-xs text-[#86868b] font-medium truncate">
                {item.country}
              </span>
            ) : null}
          </div>
        </div>

        <span className="text-xs font-mono text-[#86868b] tracking-tight shrink-0 pl-2">
          {formatGlobeLocation(item)}
        </span>
      </figcaption>
    </figure>
  );
});

interface PinProps {
  item: GlobeTestimonial;
  index: number;
  tone: Tone;
  size: number;
  label: string;
  featured: boolean;
  register: (index: number, el: HTMLButtonElement | null) => void;
  onEnter: (index: number, event: React.PointerEvent) => void;
  onPress: (index: number) => void;
}

const Pin = React.memo(function Pin({
  item,
  index,
  tone,
  size,
  label,
  featured,
  register,
  onEnter,
  onPress,
}: PinProps) {
  return (
    <button
      ref={(el) => register(index, el)}
      type="button"
      data-pin={index}
      data-featured={featured ? "" : undefined}
      tabIndex={0}
      aria-label={label}
      aria-current={featured ? "true" : undefined}
      className="group/pin absolute left-0 top-0 rounded-full opacity-0 outline-none will-change-transform cursor-pointer"
      style={{ width: size, height: size }}
      onPointerEnter={(event) => onEnter(index, event)}
      onClick={() => onPress(index)}
    >
      <span
        aria-hidden="true"
        data-ping
        className={cx(
          "pointer-events-none absolute inset-0 rounded-full border-2 animate-ping [animation-duration:2.8s] motion-reduce:hidden",
          PING[tone],
          featured ? "opacity-90" : "opacity-30",
        )}
        style={{ animationDelay: `${(index % 5) * 0.5}s` }}
      />
      <span
        data-pin-face
        className={cx(
          "relative flex items-center justify-center w-full h-full rounded-full bg-[#16161a] border overflow-hidden shadow-lg transition-[transform,box-shadow,border-color] duration-200 ease-out",
          RING[tone],
          featured
            ? "scale-[1.35] ring-[3px] border-[#d76737] shadow-[0_0_20px_rgba(215,103,55,0.45)]"
            : "ring-1 border-white/30 hover:scale-115 hover:border-white/60",
        )}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.author || item.city}
            className="w-full h-full object-cover select-none pointer-events-none rounded-full"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <span
            className={cx(
              "rounded-full transition-all duration-200",
              featured
                ? "size-2.5 bg-[#d76737] shadow-[0_0_10px_#d76737]"
                : "size-2 bg-white/80 group-hover/pin:bg-white",
            )}
          />
        )}
      </span>
      {featured && (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#d76737] border-2 border-black shadow-[0_0_6px_#d76737] pointer-events-none z-10"
          aria-hidden="true"
        />
      )}
    </button>
  );
});

export function TestimonialGlobe({
  items,
  eyebrow = "Примеры записей в Winlog",
  heading = "Примеры записей",
  caption = "Люди по всему миру записывают победы. Вот как это выглядит в разных странах.",
  action,
  autoRotate = true,
  rotationSpeed = 0.08, // Serene, continuous rotation without stops or pauses
  active,
  onActiveChange,
  size = 460,
  labels,
  className,
  ...rest
}: TestimonialGlobeProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const count = items.length;
  const headingId = React.useId();
  const rootRef = React.useRef<HTMLElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const globeBoxRef = React.useRef<HTMLDivElement | null>(null);
  const canvasHostRef = React.useRef<HTMLDivElement | null>(null);
  const pinRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const regionRef = React.useRef<HTMLDivElement | null>(null);
  const cardRef = React.useRef<HTMLElement | null>(null);
  const leavingRef = React.useRef<HTMLElement | null>(null);
  const leaderRef = React.useRef<SVGGElement | null>(null);
  const lineRef = React.useRef<SVGLineElement | null>(null);
  const startDotRef = React.useRef<SVGCircleElement | null>(null);
  const endDotRef = React.useRef<SVGCircleElement | null>(null);
  const globeRef = React.useRef<Globe | null>(null);
  const kickRef = React.useRef(() => {});
  const swipeRef = React.useRef<{ id: number; x: number; y: number } | null>(null);
  const writtenRef = React.useRef<{ el: HTMLElement; opacity: number; z: string; hit: string }[]>([]);

  const [width, setWidth] = React.useState(0);
  const [glState, setGlState] = React.useState<GlState>("pending");
  const [glVersion, setGlVersion] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [internal, setInternal] = React.useState<number | null>(count > 0 ? 0 : null);

  const controlled = active !== undefined;
  const requested = controlled ? active : internal;
  const featured = requested !== null && requested >= 0 && requested < count ? Math.floor(requested) : null;

  const pad = width >= 1024 ? 48 : width >= 620 ? 28 : width >= 420 ? 20 : 16;
  const inner = Math.max(0, Math.min(width, MAX_CONTENT) - pad * 2);
  const wide = inner >= WIDE_MIN;
  const diameter = Math.max(
    0,
    Math.round(width === 0 ? Math.min(size, 320) : wide ? Math.min(size, inner * 0.48) : Math.min(size, 320, inner * 0.8)),
  );
  const pinSize = diameter >= 380 ? 36 : diameter >= 300 ? 30 : 26;
  const columnGap = width >= 1024 ? 72 : 36;
  const roomy = wide && Math.min(inner - diameter - columnGap, 544) >= 400;
  const ready = glState !== "pending";

  const live = React.useRef({
    phi: 0,
    theta: THETA,
    velocity: 0,
    dragging: false,
    interacting: false,
    pressed: false,
    moved: false,
    pointerId: -1,
    pressX: 0,
    pressY: 0,
    lastX: 0,
    lastMoveAt: 0,
    moveGap: 0,
    turn: null as { from: number; to: number; start: number; index: number } | null,
    vectors: [] as Vec3[],
    longitudes: [] as number[],
    depths: [] as number[],
    size: diameter,
    pin: pinSize,
    wide,
    featured: null as number | null,
    speed: rotationSpeed,
    reduced: false,
    onScreen: true,
    started: false,
    globeX: 0,
    globeY: 0,
    anchorX: 0,
    anchorY: 0,
    anchored: false,
    leaderShown: false,
    growStart: 0,
    growing: false,
    controlled,
    onChange: onActiveChange,
  });

  const kick = () => kickRef.current();

  const select = React.useCallback((index: number | null) => {
    const s = live.current;
    if (index === s.featured) return;
    s.featured = index;
    s.growStart = performance.now();
    if (!s.controlled) {
      setInternal(index);
    }
    s.onChange?.(index);
  }, []);

  const turnTo = React.useCallback((index: number) => {
    const s = live.current;
    const lng = s.longitudes[index];
    if (lng === undefined) return;
    const to = nearestTurn(s.phi, facingPhi(lng));
    s.velocity = 0;
    if (s.reduced) {
      s.phi = to;
      s.turn = null;
    } else {
      s.turn = { from: s.phi, to, start: performance.now(), index };
    }
    kickRef.current();
  }, []);

  React.useLayoutEffect(() => {
    const s = live.current;
    if (s.vectors.length !== items.length) {
      s.depths.length = items.length;
    }
    s.vectors = items.map((item) => toCartesian(item.lat, item.lng));
    s.longitudes = items.map((item) => item.lng);
    if (!s.started && diameter > 0) {
      s.started = true;
      const first = featured === null ? undefined : items[featured];
      if (first) s.phi = facingPhi(first.lng);
    }
    if (s.featured !== featured) {
      s.featured = featured;
      s.growStart = performance.now();
    }
    s.size = diameter;
    s.pin = pinSize;
    s.wide = wide;
    s.speed = rotationSpeed;
    s.reduced = reduced;
    s.controlled = controlled;
    s.onChange = onActiveChange;
    kickRef.current();
  });

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setWidth(root.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();
    return () => observer.disconnect();
  }, []);

  const measureAnchor = React.useCallback(() => {
    const stage = stageRef.current;
    const box = globeBoxRef.current;
    const region = regionRef.current;
    const s = live.current;
    if (!stage || !box || !region) {
      s.anchored = false;
      return;
    }
    const sr = stage.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    const rr = region.getBoundingClientRect();
    s.globeX = br.left - sr.left;
    s.globeY = br.top - sr.top;
    s.anchorX = rr.left - sr.left;
    s.anchorY = rr.top - sr.top + Math.min(44, rr.height / 2);
    s.anchored = rr.width > 0;
    kickRef.current();
  }, []);

  React.useLayoutEffect(() => {
    measureAnchor();
    const stage = stageRef.current;
    const region = regionRef.current;
    if (!stage || !region) return;
    const observer = new ResizeObserver(measureAnchor);
    observer.observe(stage);
    observer.observe(region);
    return () => observer.disconnect();
  }, [measureAnchor, wide, diameter]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const s = live.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      s.reduced = motion.matches;
      setReduced(motion.matches);
      kickRef.current();
    };
    const sync = () => {
      setVisible(s.onScreen && !document.hidden);
      kickRef.current();
    };
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      s.onScreen = entry?.isIntersecting ?? true;
      sync();
    });
    onMotion();
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", sync);
    observer.observe(root);
    return () => {
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", sync);
      observer.disconnect();
    };
  }, []);

  const place = React.useCallback((now: number) => {
    const s = live.current;
    const written = writtenRef.current;
    const { vectors, size: d, phi, theta } = s;
    let featuredPoint: { x: number; y: number; depth: number; scale: number } | null = null;

    for (let i = 0; i < vectors.length; i++) {
      const vector = vectors[i];
      if (!vector) continue;
      const point = project(vector, phi, theta, PIN_ALTITUDE);
      s.depths[i] = point.depth;

      const el = pinRefs.current[i];
      if (!el) continue;
      const isFeatured = i === s.featured;
      const opacity = Math.round(pinOpacity(point.depth, point.rim) * 100) / 100;
      const scale = pinScale(point.depth);
      const z = String((isFeatured ? 100 : 0) + Math.round((point.depth + 1) * 40));
      const hit = opacity > 0.4 ? "auto" : "none";
      const prev = written[i]?.el === el ? written[i] : undefined;

      if (!prev || prev.opacity !== opacity) el.style.opacity = String(opacity);
      if (!prev || prev.z !== z) el.style.zIndex = z;
      if (!prev || prev.hit !== hit) el.style.pointerEvents = hit;
      written[i] = { el, opacity, z, hit };

      if (opacity > 0) {
        el.style.transform = `translate3d(${(point.x * d).toFixed(2)}px, ${(point.y * d).toFixed(2)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      }
      if (isFeatured) featuredPoint = { x: point.x * d, y: point.y * d, depth: point.depth, scale };
    }

    // Leader line pointing from card to active pin
    const group = leaderRef.current;
    const line = lineRef.current;
    const startDot = startDotRef.current;
    const endDot = endDotRef.current;
    s.growing = false;
    if (!group || !line || !startDot || !endDot) return;
    const show = s.wide && s.anchored && !s.turn && !!featuredPoint && featuredPoint.depth > 0.15;
    if (show !== s.leaderShown) {
      s.leaderShown = show;
      group.style.opacity = show ? "1" : "0";
      if (show) s.growStart = now;
    }
    if (!show || !featuredPoint) return;
    const x0 = s.globeX + featuredPoint.x;
    const y0 = s.globeY + featuredPoint.y;
    const dx = s.anchorX - x0;
    const dy = s.anchorY - y0;
    const distance = Math.hypot(dx, dy) || 1;
    const gap = (s.pin / 2) * 1.35 * featuredPoint.scale + 6;
    const length = Math.max(0, distance - gap);
    const grow = s.reduced ? 1 : smooth(clamp01((now - s.growStart) / 360));
    s.growing = grow < 1;
    const sx = x0 + (dx / distance) * gap;
    const sy = y0 + (dy / distance) * gap;
    line.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) rotate(${Math.atan2(dy, dx).toFixed(4)}rad) scaleX(${Math.max(0.001, length * grow).toFixed(2)})`;
    startDot.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px)`;
    endDot.style.transform = `translate(${s.anchorX.toFixed(2)}px, ${s.anchorY.toFixed(2)}px) scale(${grow >= 1 ? 1 : 0})`;
  }, []);

  React.useLayoutEffect(() => {
    place(performance.now());
  }, [place, diameter, pinSize, featured, wide, count]);

  const hasSize = diameter > 0;

  // WebGL Cobe Canvas Setup & Smooth Uninterrupted Continuous Rotation Loop
  React.useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !hasSize) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block";
    host.appendChild(canvas);

    const s = live.current;
    let globe: Globe | null = null;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2),
        width: s.size,
        height: s.size,
        phi: s.phi,
        theta: s.theta,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 5.5,
        baseColor: [0.06, 0.06, 0.08], // Pure charcoal black base
        markerColor: [0.843, 0.404, 0.216], // Winlog Terracotta #d76737
        glowColor: [0.12, 0.12, 0.14], // Subtle monochrome atmosphere
        markers: [],
        markerElevation: 0,
      });
    } catch {
      globe = null;
    }

    const gl = globe ? ((canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null) : null;
    globeRef.current = globe;

    let raf = 0;
    let last = 0;
    let renderedSize = s.size;

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      const turn = s.turn;

      if (turn) {
        // Quick smooth orientation animation when user explicitly navigates
        const t = s.reduced ? 1 : clamp01((now - turn.start) / 800);
        s.phi = turn.from + (turn.to - turn.from) * easeOutExpo(t);
        s.velocity = 0;
        if (t >= 1) {
          s.turn = null;
          s.phi = turn.to;
        }
      } else if (!s.dragging) {
        // Drag inertia or continuous uninterrupted idle spin
        if (Math.abs(s.velocity) > 1e-4) {
          const steps = dt * 60;
          s.phi += s.velocity * steps;
          s.velocity *= Math.pow(DRAG_FRICTION, steps);
        } else {
          s.velocity = 0;
          // CONTINUOUS ROTATION WITHOUT STOPS OR PAUSES:
          if (!s.reduced && autoRotate) {
            s.phi += s.speed * dt;
          }
        }
      }

      if (globe) {
        if (s.size !== renderedSize) {
          renderedSize = s.size;
          globe.update({ phi: s.phi, theta: s.theta, width: s.size, height: s.size });
        } else {
          globe.update({ phi: s.phi, theta: s.theta });
        }
      }
      place(now);

      // Globe keeps turning continuously unless visitor prefers reduced motion
      if (s.onScreen && !document.hidden && (!s.reduced || s.dragging || s.turn !== null)) {
        raf = requestAnimationFrame(frame);
      } else {
        last = 0;
      }
    };

    kickRef.current = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    kickRef.current();

    const onLost = (event: Event) => {
      event.preventDefault();
      setGlState("unavailable");
    };
    const onRestored = () => setGlVersion((v) => v + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    setGlState(gl ? "ready" : "unavailable");

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      kickRef.current = () => {};
      globe?.destroy();
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      globeRef.current = null;
      host.replaceChildren();
      setGlState("pending");
    };
  }, [hasSize, glVersion, autoRotate]);

  const [cards, setCards] = React.useState({ shown: featured, leaving: null as number | null, key: 0 });
  if (cards.shown !== featured) {
    setCards({ shown: featured, leaving: reduced ? null : cards.shown, key: cards.key + 1 });
  }

  React.useLayoutEffect(() => {
    if (cards.key === 0 || live.current.reduced) return;
    const enter = cardRef.current;
    const exit = leavingRef.current;
    enter?.animate(
      [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: SWAP_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    exit?.animate(
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(12px) scale(0.98)" },
      ],
      { duration: SWAP_MS, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    const key = cards.key;
    const id = window.setTimeout(() => setCards((c) => (c.key === key ? { ...c, leaving: null } : c)), SWAP_MS);
    return () => window.clearTimeout(id);
  }, [cards.key]);

  const step = (delta: number) => {
    if (count === 0) return;
    const next = (((featured ?? (delta > 0 ? -1 : 0)) + delta) % count + count) % count;
    select(next);
    turnTo(next);
  };

  const registerPin = React.useCallback((index: number, el: HTMLButtonElement | null) => {
    pinRefs.current[index] = el;
  }, []);

  const onPinEnter = React.useCallback(
    (index: number, event: React.PointerEvent) => {
      if (event.pointerType === "touch" || live.current.dragging) return;
      flushSync(() => {
        select(index);
      });
    },
    [select],
  );

  const onPinPress = React.useCallback(
    (index: number) => {
      const s = live.current;
      if (s.moved) {
        s.moved = false;
        return;
      }
      select(index);
      turnTo(index);
    },
    [select, turnTo],
  );

  const beginDrag = (event: React.PointerEvent) => {
    const s = live.current;
    s.dragging = true;
    s.interacting = true;
    s.turn = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    kick();
  };

  const endDrag = () => {
    const s = live.current;
    s.dragging = false;
    s.pressed = false;
    s.pointerId = -1;
    kick();
  };

  const countries = new Set(items.map((item) => item.city)).size;
  const shownItem = cards.shown === null ? undefined : items[cards.shown];
  const leavingItem = cards.leaving === null ? undefined : items[cards.leaving];

  return (
    <section
      {...rest}
      ref={rootRef}
      data-slot="testimonial-globe"
      data-layout={wide ? "wide" : "stacked"}
      data-active={featured ?? ""}
      aria-labelledby={rest["aria-labelledby"] ?? (heading ? headingId : undefined)}
      className={cx("relative isolate w-full overflow-hidden bg-black text-[#f5f5f7]", className)}
    >
      {/* Ambient Stage Glow Halo behind globe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: wide
            ? "radial-gradient(42% 60% at 28% 50%, rgba(255, 77, 0, 0.12), transparent 72%)"
            : "radial-gradient(70% 38% at 50% 48%, rgba(255, 77, 0, 0.12), transparent 72%)",
        }}
      />

      <div
        ref={stageRef}
        className={cx(
          "relative mx-auto w-full",
          wide ? "grid items-center gap-y-8 py-10" : "flex flex-col items-center gap-6 py-6"
        )}
        style={{
          maxWidth: MAX_CONTENT,
          paddingInline: pad,
          ...(wide
            ? { gridTemplateColumns: `${diameter}px minmax(0, 34rem)`, columnGap, justifyContent: "center" }
            : {}),
        }}
      >
        <header
          className={cx(
            "flex min-w-0 flex-col",
            wide ? "col-start-2 row-start-1 items-start self-end text-left" : "w-full items-center text-center",
          )}
        >
          {eyebrow && (
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#d76737] mb-2">{eyebrow}</p>
          )}
          {heading && (
            <h2 id={headingId} className="apple-section-title m-0 text-balance font-bold tracking-tight text-white">
              {heading}
            </h2>
          )}
          {caption && <p className="m-0 mt-3 max-w-prose text-pretty text-[16px] text-[#86868b] leading-relaxed">{caption}</p>}

          {/* Honest counters without fake ratings or numbers */}
          <div className={cx("flex flex-wrap items-center gap-x-5 gap-y-2", wide ? "mt-5 justify-start" : "mt-4 justify-center")}>
            <dl className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#86868b]">
              <div className="flex items-baseline gap-1.5">
                <dd className="order-1 m-0 font-bold tabular-nums text-white">{count}</dd>
                <dt className="order-2 font-normal">{text.storiesCountLabel || "записей на карте"}</dt>
              </div>
              <span aria-hidden="true" className="h-3 w-px bg-white/20" />
              <div className="flex items-baseline gap-1.5">
                <dd className="order-1 m-0 font-bold tabular-nums text-white">{countries}</dd>
                <dt className="order-2 font-normal">{text.citiesLabel || "городов мира"}</dt>
              </div>
            </dl>
            {action}
          </div>
        </header>

        {/* 3D Globe Box with Draggable Interactive Surface */}
        <div
          ref={globeBoxRef}
          data-globe-box
          className={cx("relative shrink-0 touch-pan-y select-none", wide && "col-start-1 row-span-2 row-start-1 self-center")}
          style={{ width: diameter, height: diameter }}
          onPointerDown={(event) => {
            if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
            const s = live.current;
            s.pressed = true;
            s.moved = false;
            s.pointerId = event.pointerId;
            s.pressX = s.lastX = event.clientX;
            s.pressY = event.clientY;
            s.lastMoveAt = event.timeStamp;
            s.moveGap = 0;
            s.velocity = 0;
            if (!(event.target as Element).closest("[data-pin]")) beginDrag(event);
          }}
          onPointerMove={(event) => {
            const s = live.current;
            if (!s.pressed || event.pointerId !== s.pointerId) return;
            if (!s.dragging) {
              if (Math.hypot(event.clientX - s.pressX, event.clientY - s.pressY) < DRAG_SLOP) return;
              s.moved = true;
              beginDrag(event);
            }
            const now = event.timeStamp;
            const delta = ((event.clientX - s.lastX) / Math.max(s.size, 1)) * Math.PI;
            const elapsed = Math.max(now - s.lastMoveAt, 1);
            s.moveGap = elapsed;
            s.lastX = event.clientX;
            s.lastMoveAt = now;
            s.phi += delta;
            s.velocity = (delta / elapsed) * (1000 / 60);
            if (Math.abs(event.clientX - s.pressX) > DRAG_SLOP) s.moved = true;
          }}
          onPointerUp={(event) => {
            const s = live.current;
            if (event.pointerId !== s.pointerId) return;
            if (s.dragging) {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }
            endDrag();
          }}
          onPointerCancel={() => {
            live.current.velocity = 0;
            endDrag();
          }}
          onLostPointerCapture={(event) => {
            if (event.pointerId === live.current.pointerId) endDrag();
          }}
        >
          {glState === "unavailable" && (
            <div
              aria-hidden="true"
              data-globe-fallback
              className="pointer-events-none absolute inset-[10%] overflow-hidden rounded-full border border-white/10"
              style={{
                background:
                  "radial-gradient(circle at 36% 30%, rgba(255, 77, 0, 0.2), rgba(0, 0, 0, 0.9) 72%)",
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full text-white/10" fill="none" stroke="currentColor" strokeWidth="0.6">
                <ellipse cx="50" cy="50" rx="50" ry="14" />
                <ellipse cx="50" cy="50" rx="50" ry="32" />
                <line x1="0" y1="50" x2="100" y2="50" />
                <ellipse cx="50" cy="50" rx="18" ry="50" />
                <ellipse cx="50" cy="50" rx="36" ry="50" />
                <line x1="50" y1="0" x2="50" y2="100" />
              </svg>
            </div>
          )}

          <div
            ref={canvasHostRef}
            data-globe
            aria-hidden="true"
            className={cx(
              "absolute inset-0 cursor-grab transition-opacity duration-150 active:cursor-grabbing motion-reduce:transition-none",
              ready ? "opacity-100" : "opacity-0",
            )}
          />

          {/* HTML Pins Placed Over Land Coordinates */}
          <div className="pointer-events-none absolute inset-0">
            {items.map((item, i) => (
              <Pin
                key={item.id}
                item={item}
                index={i}
                tone={toneOf(item, i)}
                size={pinSize}
                label={`${text.pin} ${item.city}`}
                featured={i === featured}
                register={registerPin}
                onEnter={onPinEnter}
                onPress={onPinPress}
              />
            ))}
          </div>
        </div>

        {/* Selected Story Card */}
        <div
          className={cx("relative w-full min-w-0", wide ? "col-start-2 row-start-2 self-start" : "max-w-md")}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 -bottom-4 -z-10 h-10 rounded-[100%] bg-black opacity-70 blur-2xl"
          />
          <div
            ref={regionRef}
            data-quote-region
            aria-live="polite"
            aria-atomic="true"
            className="grid touch-pan-y"
            onPointerDown={(event) => {
              if (event.pointerType === "mouse") return;
              swipeRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
            }}
            onPointerUp={(event) => {
              const swipe = swipeRef.current;
              if (!swipe || swipe.id !== event.pointerId) return;
              swipeRef.current = null;
              const dx = event.clientX - swipe.x;
              const dy = event.clientY - swipe.y;
              if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
            }}
            onPointerCancel={() => {
              swipeRef.current = null;
            }}
          >
            {items.map((item, i) => (
              <QuoteCard key={`sizer-${item.id}`} item={item} index={i} tone={toneOf(item, i)} roomy={roomy} mode="sizer" exampleBadge={text.exampleBadge} />
            ))}
            {leavingItem && cards.leaving !== null && (
              <QuoteCard
                key={`leaving-${cards.key}`}
                ref={leavingRef}
                item={leavingItem}
                index={cards.leaving}
                tone={toneOf(leavingItem, cards.leaving)}
                roomy={roomy}
                mode="leaving"
                exampleBadge={text.exampleBadge}
              />
            )}
            {shownItem && cards.shown !== null && (
              <QuoteCard
                key={`card-${cards.key}`}
                ref={cardRef}
                item={shownItem}
                index={cards.shown}
                tone={toneOf(shownItem, cards.shown)}
                roomy={roomy}
                mode="current"
                exampleBadge={text.exampleBadge}
              />
            )}
          </div>

          {count > 1 && (
            <div className={cx("absolute z-10 flex items-center gap-1", roomy ? "right-5 top-5" : "right-3.5 top-3")}>
              <button
                type="button"
                aria-label={text.previous}
                className="grid size-8 place-items-center rounded-full text-[#86868b] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d76737] cursor-pointer"
                onClick={() => step(-1)}
              >
                <Chevron direction="left" />
              </button>
              <span className="min-w-12 text-center text-xs tabular-nums text-[#86868b] font-medium">
                {featured === null ? "–" : featured + 1} / {count}
              </span>
              <button
                type="button"
                aria-label={text.next}
                className="grid size-8 place-items-center rounded-full text-[#86868b] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d76737] cursor-pointer"
                onClick={() => step(1)}
              >
                <Chevron direction="right" />
              </button>
            </div>
          )}
        </div>

        {wide && (
          <svg aria-hidden="true" data-leader className="pointer-events-none absolute left-0 top-0 z-[95] w-px h-px overflow-visible text-[#d76737]">
            <g ref={leaderRef} className="opacity-0 transition-opacity duration-200 motion-reduce:transition-none">
              <line
                ref={lineRef}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
              <circle ref={startDotRef} r="2.5" className="fill-[#d76737]" />
              <circle ref={endDotRef} r="3.5" className="fill-black stroke-[#d76737]" strokeWidth="1.5" />
            </g>
          </svg>
        )}
      </div>
    </section>
  );
}

export default TestimonialGlobe;
