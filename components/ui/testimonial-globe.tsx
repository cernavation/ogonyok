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
  /** One or two sentences. Longer quotes are clamped to four lines. */
  quote: string;
  name: string;
  role?: string;
  company?: string;
  /** City shown on the card and in the pin's accessible name. */
  city: string;
  /** Short country code such as "MD", "KZ", "GE". Distinct values feed the country counter. */
  country?: string;
  /** Pin latitude in degrees (south is negative). */
  lat: number;
  /** Pin longitude in degrees (west is negative). */
  lng: number;
  /** Square portrait shown in the pin and on the card. */
  image: string;
  /** Star rating from 1 to 5. */
  rating?: number;
  /** Ring color token (1: Signal Orange, 2: Apple Blue, 3: Sapphire, 4: Amber, 5: Frost White) */
  tone?: Tone;
}

export interface TestimonialGlobeLabels {
  /** Accessible name of the previous-review button. */
  previous: string;
  /** Accessible name of the next-review button. */
  next: string;
  /** Start of each pin's accessible name, followed by "<name>, <city>". */
  pin: string;
  reviewsCountLabel?: string;
  averageLabel?: string;
  countriesLabel?: string;
}

export interface TestimonialGlobeProps extends React.ComponentProps<"section"> {
  items: GlobeTestimonial[];
  eyebrow?: string;
  heading?: string;
  caption?: string;
  /** Call to action rendered next to the counters, e.g. a link to all reviews. */
  action?: React.ReactNode;
  /** Spin while idle. Always off when the visitor prefers reduced motion. */
  autoRotate?: boolean;
  /** Idle spin speed in radians per second. */
  rotationSpeed?: number;
  /** Feature the reviews one by one, turning each pin to the front. Off by default and never runs with reduced motion. */
  autoplay?: boolean;
  /** Milliseconds between two featured reviews while autoplay runs. */
  interval?: number;
  /** Controlled featured review (index into items), or null for none. */
  active?: number | null;
  /** Called whenever the featured review changes: autoplay, hover, click, keys, or a drag or spin that brings another pin to the front. */
  onActiveChange?: (index: number | null) => void;
  /** Largest globe diameter in pixels. The globe shrinks to fit narrow containers. */
  size?: number;
  labels?: TestimonialGlobeLabels;
}

const GLOBE_RADIUS = 0.8; // cobe draws the sphere at 0.8 of the half-canvas
const THETA = 0.3; // tilt toward the viewer, in radians
const PIN_ALTITUDE = 0.05; // pins float just above the map
const DRAG_FRICTION = 0.92; // per 60 Hz frame
const RELEASE_GRACE_MS = 80;
const TEXTURE_RETRY_MS = [150, 600, 1500];
const TURN_MS = 1200; // a featured pin reaches the front in this time
const SWAP_MS = 220;
const HOLD_MS = 7000; // a clicked pin keeps the globe paused this long
const DRAG_SLOP = 6;
const SWIPE_MIN = 40;
const WIDE_MIN = 620;
const FRONT_MARGIN = 0.06;
const MAX_CONTENT = 1200;

const DEFAULT_LABELS: TestimonialGlobeLabels = {
  previous: "Предыдущий отзыв",
  next: "Следующий отзыв",
  pin: "Показать историю:",
  reviewsCountLabel: "отзывов",
  averageLabel: "средняя оценка",
  countriesLabel: "стран",
};

/* ── Apple-calibrated ring & ping color classes matching Ogonek Design System ── */
const RING = {
  1: "ring-[#f56900]",
  2: "ring-[#0071e3]",
  3: "ring-[#2997ff]",
  4: "ring-[#ff9500]",
  5: "ring-[#f5f5f7]",
} as const;

const PING = {
  1: "border-[#f56900]",
  2: "border-[#0071e3]",
  3: "border-[#2997ff]",
  4: "border-[#ff9500]",
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

// Same rotation cobe applies on the GPU, so the HTML pins stay glued to the map.
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

/** The rotation that turns a longitude to face the viewer. */
function facingPhi(lng: number) {
  return (3 * Math.PI) / 2 - (lng * Math.PI) / 180;
}

/** The copy of `angle` (mod 2π) closest to `from`, so every turn takes the short way round. */
function nearestTurn(from: number, angle: number) {
  const tau = Math.PI * 2;
  return angle + tau * Math.round((from - angle) / tau);
}

// Pins thin out toward the horizon and vanish once the sphere hides them.
function pinOpacity(depth: number, rim: number) {
  if (depth >= 0) return 0.45 + 0.55 * smooth(clamp01(depth / 0.3));
  const exposed = Math.max(clamp01(rim / 0.04), clamp01(1 + depth * 8));
  return 0.45 * exposed * clamp01(1 + depth * 3);
}

// …and shrink as they roll away, so the face of the globe reads as near and the rim as far.
function pinScale(depth: number) {
  return 0.62 + 0.38 * smooth(clamp01((depth + 0.2) / 0.7));
}

// Exponential ease-out over a fixed time: a quick start, then a long settle onto the target.
function easeOutExpo(t: number) {
  return t >= 1 ? 1 : (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10));
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <polygon
        points="10,1.2 12.4,6.7 18.3,7.3 13.9,11.3 15.2,17.1 10,14.1 4.8,17.1 6.1,11.3 1.7,7.3 7.6,6.7"
        fill="currentColor"
      />
    </svg>
  );
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

function Portrait({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const [shownSrc, setShownSrc] = React.useState(src);
  if (shownSrc !== src) {
    setShownSrc(src);
    setFailed(false);
  }
  if (failed) {
    return (
      <span className={cx("grid place-items-center bg-[#242426] text-white/40", className)}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-3/5 h-3/5" fill="currentColor">
          <circle cx="12" cy="8.5" r="4" />
          <path d="M4.5 21c.8-4.1 3.8-6.4 7.5-6.4s6.7 2.3 7.5 6.4Z" />
        </svg>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      decoding="async"
      className={cx("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}

interface QuoteCardProps {
  item: GlobeTestimonial;
  index: number;
  tone: Tone;
  roomy: boolean;
  mode: "current" | "leaving" | "sizer";
  ref?: React.ComponentProps<"figure">["ref"];
}

const QuoteCard = React.memo(function QuoteCard({ item, index, tone, roomy, mode, ref }: QuoteCardProps) {
  const rating = item.rating === undefined ? null : Math.max(0, Math.min(5, Math.round(item.rating)));
  const hidden = mode !== "current";
  const meta = [item.role, item.company].filter(Boolean).join(", ");
  return (
    <figure
      ref={ref}
      data-quote-card={mode === "current" ? "" : undefined}
      data-quote-leaving={mode === "leaving" ? "" : undefined}
      data-index={mode === "current" ? index : undefined}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cx(
        "relative col-start-1 row-start-1 m-0 flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#161618]/95 backdrop-blur-2xl text-[#f5f5f7] shadow-[0_24px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(245,105,0,0.06)]",
        roomy ? "p-7" : "px-5 py-4",
        mode === "sizer" && "invisible",
        mode === "leaving" && "pointer-events-none",
      )}
    >
      <div className={cx("relative flex items-center justify-between gap-3", roomy ? "h-7" : "h-6")}>
        <div className="flex items-center gap-2">
          <QuoteMark className={cx("shrink-0 text-[#f56900]/40", roomy ? "w-6 h-6" : "w-5 h-5")} />
          {rating !== null && (
            <span role="img" aria-label={`Оценка ${rating} из 5`} className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((k) => (
                <StarIcon key={k} className={cx("w-3.5 h-3.5", k < rating ? "text-[#f56900]" : "text-white/20")} />
              ))}
            </span>
          )}
        </div>
      </div>
      <blockquote
        className={cx(
          "relative m-0 line-clamp-4 text-pretty text-[#f5f5f7] font-normal",
          roomy ? "mt-4 text-[17px] leading-relaxed" : "mt-2.5 text-[15px] leading-snug",
        )}
      >
        <p>«{item.quote}»</p>
      </blockquote>
      <figcaption className={cx("relative mt-auto flex items-center gap-3.5 border-t border-white/[0.08]", roomy ? "pt-5 mt-5" : "pt-3.5 mt-3")}>
        <span
          className={cx(
            "relative block shrink-0 overflow-hidden rounded-full bg-black/50 ring-2 ring-offset-2 ring-offset-[#161618]",
            RING[tone],
            roomy ? "w-11 h-11" : "w-9 h-9",
          )}
        >
          {mode !== "sizer" && <Portrait src={item.image} className="w-full h-full" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-[#f5f5f7]">{item.name}</span>
          {meta && <span className="block truncate text-xs text-[#86868b]">{meta}</span>}
        </span>
        <span className="shrink-0 text-right text-xs leading-tight text-[#86868b]">
          <span className="block font-medium text-white/90">{item.city}</span>
          {item.country && (
            <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-[#86868b] font-medium">
              {item.country}
            </span>
          )}
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
  approaching: boolean;
  pressed: boolean;
  tabbable: boolean;
  register: (index: number, el: HTMLButtonElement | null) => void;
  onEnter: (index: number, event: React.PointerEvent) => void;
  onLeave: (index: number, event: React.PointerEvent) => void;
  onPress: (index: number) => void;
  onKey: (index: number, event: React.KeyboardEvent) => void;
  onFocusPin: (index: number, target: HTMLElement) => void;
}

const Pin = React.memo(function Pin({
  item,
  index,
  tone,
  size,
  label,
  featured,
  approaching,
  pressed,
  tabbable,
  register,
  onEnter,
  onLeave,
  onPress,
  onKey,
  onFocusPin,
}: PinProps) {
  return (
    <button
      ref={(el) => register(index, el)}
      type="button"
      data-pin={index}
      data-featured={featured ? "" : undefined}
      data-target={approaching ? "" : undefined}
      tabIndex={tabbable ? 0 : -1}
      aria-label={label}
      aria-current={featured ? "true" : undefined}
      aria-pressed={pressed}
      className="group/pin absolute left-0 top-0 rounded-full opacity-0 outline-none will-change-transform cursor-pointer"
      style={{ width: size, height: size }}
      onPointerEnter={(event) => onEnter(index, event)}
      onPointerLeave={(event) => onLeave(index, event)}
      onClick={() => onPress(index)}
      onKeyDown={(event) => onKey(index, event)}
      onFocus={(event) => onFocusPin(index, event.currentTarget)}
    >
      <span
        aria-hidden="true"
        data-ping
        className={cx(
          "pointer-events-none absolute inset-0 rounded-full border-2 animate-ping [animation-duration:3s] motion-reduce:hidden",
          PING[tone],
          featured || approaching ? "opacity-80" : "opacity-25",
        )}
        style={{ animationDelay: `${(index % 5) * 0.6}s` }}
      />
      <span
        data-pin-face
        className={cx(
          "relative block w-full h-full overflow-hidden rounded-full bg-black/60 shadow-lg ring-offset-2 ring-offset-black transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          "group-focus-visible/pin:outline-2 group-focus-visible/pin:outline-offset-[5px] group-focus-visible/pin:outline-[#f56900]",
          RING[tone],
          featured ? "scale-[1.35] ring-[3px]" : "ring-2",
        )}
      >
        <Portrait src={item.image} className="block w-full h-full" />
      </span>
    </button>
  );
});

interface Turn {
  from: number;
  to: number;
  start: number;
  index: number;
  commit: boolean;
}

export function TestimonialGlobe({
  items,
  eyebrow,
  heading,
  caption,
  action,
  autoRotate = true,
  rotationSpeed = 0.12,
  autoplay = false,
  interval = 3500,
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
  const [pinned, setPinned] = React.useState(false);
  const [hoverPin, setHoverPin] = React.useState<number | null>(null);
  const [cardHover, setCardHover] = React.useState(false);
  const [keyboard, setKeyboard] = React.useState(false);
  const [interacting, setInteracting] = React.useState(false);
  const [target, setTarget] = React.useState<number | null>(null);

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
  const pinSize = diameter >= 380 ? 44 : diameter >= 300 ? 38 : 34;
  const columnGap = width >= 1024 ? 72 : 36;
  const roomy = wide && Math.min(inner - diameter - columnGap, 544) >= 400;
  const ready = glState !== "pending";
  const running =
    autoplay && !reduced && count > 1 && !pinned && hoverPin === null && !cardHover && !keyboard && !interacting && visible;

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
    turn: null as Turn | null,
    vectors: [] as Vec3[],
    longitudes: [] as number[],
    depths: [] as number[],
    size: diameter,
    pin: pinSize,
    wide,
    featured: null as number | null,
    requested: null as number | null,
    front: -1,
    spin: false,
    follow: false,
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
    pinnedNow: false,
    onChange: onActiveChange,
  });

  const handlers = React.useRef({
    arrive: (_index: number) => {},
    front: (_index: number) => {},
    settle: () => {},
  });

  const kick = () => kickRef.current();

  const select = React.useCallback((index: number | null) => {
    const s = live.current;
    if (index === s.featured) return;
    s.requested = index;
    if (!s.controlled) {
      s.featured = index;
      s.growStart = performance.now();
      setInternal(index);
    }
    s.onChange?.(index);
  }, []);

  const turnTo = React.useCallback((index: number, commit: boolean) => {
    const s = live.current;
    const lng = s.longitudes[index];
    if (lng === undefined) return;
    if (s.turn && s.turn.index === index && s.turn.commit === commit) return;
    const to = nearestTurn(s.phi, facingPhi(lng));
    s.velocity = 0;
    if (s.reduced) {
      s.phi = to;
      s.turn = null;
      if (commit) handlers.current.arrive(index);
    } else {
      s.turn = { from: s.phi, to, start: performance.now(), index, commit };
    }
    kickRef.current();
  }, []);

  const go = React.useCallback(
    (index: number) => {
      select(index);
      turnTo(index, false);
    },
    [select, turnTo],
  );

  React.useLayoutEffect(() => {
    const s = live.current;
    if (s.vectors.length !== items.length) {
      s.front = -1;
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
      const fromHost = controlled && featured !== s.requested;
      s.featured = featured;
      s.requested = featured;
      s.growStart = performance.now();
      if (fromHost && featured !== null && s.started) turnTo(featured, false);
    }
    s.size = diameter;
    s.pin = pinSize;
    s.wide = wide;
    s.speed = rotationSpeed;
    s.reduced = reduced;
    s.controlled = controlled;
    s.pinnedNow = pinned;
    s.onChange = onActiveChange;
    s.spin = autoRotate && !reduced && !pinned && !keyboard;
    s.follow = (!autoplay || interacting) && !pinned && hoverPin === null && !keyboard && !cardHover;
    handlers.current = {
      arrive: (index) => {
        setTarget(null);
        select(index);
      },
      front: (index) => select(index),
      settle: () => setInteracting(false),
    };
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
    let front = -1;
    let frontDepth = -Infinity;
    let featuredPoint: { x: number; y: number; depth: number; scale: number } | null = null;
    for (let i = 0; i < vectors.length; i++) {
      const vector = vectors[i];
      if (!vector) continue;
      const point = project(vector, phi, theta, PIN_ALTITUDE);
      s.depths[i] = point.depth;
      if (point.depth > frontDepth) {
        frontDepth = point.depth;
        front = i;
      }
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

    if (front >= 0 && front !== s.front) {
      const current = s.depths[s.front] ?? -Infinity;
      if (s.front < 0) s.front = front;
      else if (frontDepth > current + FRONT_MARGIN) {
        s.front = front;
        if (s.follow && !s.turn) handlers.current.front(front);
      }
    }

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
        baseColor: [0.06, 0.08, 0.12], // Deep sapphire-black base
        markerColor: [0.96, 0.41, 0.0], // Signal Orange #f56900
        glowColor: [0.0, 0.28, 0.58], // Apple Blue glow
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
        const t = s.reduced ? 1 : clamp01((now - turn.start) / TURN_MS);
        s.phi = turn.from + (turn.to - turn.from) * easeOutExpo(t);
        s.velocity = 0;
        if (t >= 1) {
          s.turn = null;
          s.phi = turn.to;
          if (turn.commit) handlers.current.arrive(turn.index);
        }
      } else if (!s.dragging) {
        if (Math.abs(s.velocity) > 1e-4) {
          const steps = dt * 60;
          s.phi += s.velocity * steps;
          s.velocity *= Math.pow(DRAG_FRICTION, steps);
        } else {
          s.velocity = 0;
          if (s.spin) s.phi += s.speed * dt;
        }
      }
      if (s.interacting && !s.dragging && s.velocity === 0) {
        s.interacting = false;
        handlers.current.settle();
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
      const isBusy =
        s.dragging ||
        s.interacting ||
        s.turn !== null ||
        s.growing ||
        Math.abs(s.velocity) > 1e-4 ||
        (s.spin && s.speed !== 0);

      if (isBusy && s.onScreen && !document.hidden) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    kickRef.current = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    kickRef.current();

    const retries = TEXTURE_RETRY_MS.map((ms) => window.setTimeout(() => kickRef.current(), ms));

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
      retries.forEach((id) => window.clearTimeout(id));
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      kickRef.current = () => {};
      globe?.destroy();
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      globeRef.current = null;
      host.replaceChildren();
      setGlState("pending");
    };
  }, [hasSize, glVersion]);

  // Autoplay
  React.useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      const next = ((live.current.featured ?? -1) + 1) % count;
      setTarget(next);
      turnTo(next, true);
    }, Math.max(0, interval - TURN_MS));
    return () => window.clearTimeout(id);
  }, [running, featured, interval, count, turnTo]);

  React.useEffect(() => {
    if (running) return;
    const s = live.current;
    if (s.turn?.commit) {
      s.turn = null;
      kickRef.current();
    }
    setTarget(null);
  }, [running]);

  React.useEffect(() => {
    if (!pinned) return;
    const id = window.setTimeout(() => setPinned(false), HOLD_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPinned(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned, featured]);

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
    go((((featured ?? (delta > 0 ? -1 : 0)) + delta) % count + count) % count);
  };

  const registerPin = React.useCallback((index: number, el: HTMLButtonElement | null) => {
    pinRefs.current[index] = el;
  }, []);

  const onPinEnter = React.useCallback(
    (index: number, event: React.PointerEvent) => {
      if (event.pointerType === "touch" || live.current.dragging) return;
      flushSync(() => {
        setHoverPin(index);
        select(index);
      });
    },
    [select],
  );

  const onPinLeave = React.useCallback((index: number, event: React.PointerEvent) => {
    if (event.pointerType === "touch") return;
    setHoverPin((current) => (current === index ? null : current));
  }, []);

  const onPinKey = React.useCallback(
    (index: number, event: React.KeyboardEvent) => {
      const total = live.current.vectors.length;
      if (event.altKey || event.ctrlKey || event.metaKey || total === 0) return;
      let next: number;
      if (event.key === "ArrowRight") next = (index + 1) % total;
      else if (event.key === "ArrowLeft") next = (index - 1 + total) % total;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = total - 1;
      else return;
      event.preventDefault();
      go(next);
      pinRefs.current[next]?.focus({ preventScroll: true });
    },
    [go],
  );

  const onPinPress = React.useCallback(
    (index: number) => {
      const s = live.current;
      if (s.moved) {
        s.moved = false;
        return;
      }
      if (s.pinnedNow && s.featured === index) {
        setPinned(false);
        return;
      }
      select(index);
      setPinned(true);
      turnTo(index, false);
    },
    [select, turnTo],
  );

  const onPinFocus = React.useCallback(
    (index: number, target: HTMLElement) => {
      if (!target.matches(":focus-visible")) return;
      select(index);
      if ((live.current.depths[index] ?? -1) < 0.55) turnTo(index, false);
    },
    [select, turnTo],
  );

  const beginDrag = (event: React.PointerEvent) => {
    const s = live.current;
    s.dragging = true;
    s.interacting = true;
    s.turn = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteracting(true);
    kick();
  };

  const endDrag = () => {
    const s = live.current;
    s.dragging = false;
    s.pressed = false;
    s.pointerId = -1;
    kick();
  };

  const tabStop = featured ?? 0;
  const avg = (() => {
    const rated = items.filter((item) => typeof item.rating === "number");
    if (rated.length === 0) return null;
    return (rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length).toFixed(1);
  })();
  const countries = new Set(items.map((item) => item.country ?? item.city)).size;
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
      onFocus={(event) => {
        if ((event.target as HTMLElement).matches(":focus-visible")) setKeyboard(true);
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !event.currentTarget.contains(next)) setKeyboard(false);
      }}
    >
      {/* Apple Ambient Stage Glow Halo behind globe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: wide
            ? "radial-gradient(42% 60% at 28% 50%, rgba(0, 113, 227, 0.14), transparent 72%)"
            : "radial-gradient(70% 38% at 50% 48%, rgba(0, 113, 227, 0.14), transparent 72%)",
        }}
      />
      <div
        ref={stageRef}
        className={cx("relative mx-auto w-full", wide ? "grid items-center gap-y-8 py-12" : "flex flex-col items-center gap-6 py-6")}
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
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#f56900] mb-2">{eyebrow}</p>
          )}
          {heading && (
            <h2 id={headingId} className="apple-section-title m-0 text-balance font-bold tracking-tight text-white">
              {heading}
            </h2>
          )}
          {caption && <p className="m-0 mt-3 max-w-prose text-pretty text-[16px] text-[#86868b] leading-relaxed">{caption}</p>}
          <div className={cx("flex flex-wrap items-center gap-x-5 gap-y-2", wide ? "mt-5 justify-start" : "mt-4 justify-center")}>
            <dl className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#86868b]">
              <div className="flex items-baseline gap-1">
                <dt className="order-2 font-normal">{text.reviewsCountLabel || "отзывов"}</dt>
                <dd className="order-1 m-0 font-bold tabular-nums text-white">{count}</dd>
              </div>
              {avg !== null && (
                <>
                  <span aria-hidden="true" className="h-3 w-px bg-white/20" />
                  <div className="flex items-baseline gap-1">
                    <dt className="order-2 font-normal">{text.averageLabel || "средняя"}</dt>
                    <dd className="order-1 m-0 inline-flex items-center gap-1 font-bold tabular-nums text-white">
                      <StarIcon className="w-3.5 h-3.5 self-center text-[#f56900]" />
                      {avg}
                    </dd>
                  </div>
                </>
              )}
              <span aria-hidden="true" className="h-3 w-px bg-white/20" />
              <div className="flex items-baseline gap-1">
                <dt className="order-2 font-normal">{text.countriesLabel || "стран"}</dt>
                <dd className="order-1 m-0 font-bold tabular-nums text-white">{countries}</dd>
              </div>
            </dl>
            {action}
          </div>
        </header>

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
              const grace = Math.min(250, Math.max(RELEASE_GRACE_MS, s.moveGap * 1.5));
              if (s.reduced || event.timeStamp - s.lastMoveAt > grace) s.velocity = 0;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
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
                  "radial-gradient(circle at 36% 30%, rgba(0, 113, 227, 0.2), rgba(0, 0, 0, 0.9) 72%)",
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

          <div className="pointer-events-none absolute inset-0">
            {items.map((item, i) => (
              <Pin
                key={item.id}
                item={item}
                index={i}
                tone={toneOf(item, i)}
                size={pinSize}
                label={`${text.pin} ${item.name}, ${item.city}`}
                featured={i === featured}
                approaching={target === i}
                pressed={i === featured && pinned}
                tabbable={i === tabStop}
                register={registerPin}
                onEnter={onPinEnter}
                onLeave={onPinLeave}
                onPress={onPinPress}
                onKey={onPinKey}
                onFocusPin={onPinFocus}
              />
            ))}
          </div>
        </div>

        <div
          className={cx("relative w-full min-w-0", wide ? "col-start-2 row-start-2 self-start" : "max-w-md")}
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") setCardHover(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") setCardHover(false);
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 -bottom-4 -z-10 h-10 rounded-[100%] bg-black opacity-70 blur-2xl"
          />
          <div
            ref={regionRef}
            data-quote-region
            aria-live={running ? "off" : "polite"}
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
              <QuoteCard key={`sizer-${item.id}`} item={item} index={i} tone={toneOf(item, i)} roomy={roomy} mode="sizer" />
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
              />
            )}
          </div>
          {count > 1 && (
            <div className={cx("absolute z-10 flex items-center gap-1", roomy ? "right-5 top-5" : "right-3.5 top-3")}>
              <button
                type="button"
                aria-label={text.previous}
                className="grid w-8 h-8 place-items-center rounded-full text-[#86868b] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
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
                className="grid w-8 h-8 place-items-center rounded-full text-[#86868b] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
                onClick={() => step(1)}
              >
                <Chevron direction="right" />
              </button>
            </div>
          )}
        </div>

        {wide && (
          <svg aria-hidden="true" data-leader className="pointer-events-none absolute left-0 top-0 z-[95] w-px h-px overflow-visible text-[#f56900]">
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
              <circle ref={startDotRef} r="2.5" className="fill-[#f56900]" />
              <circle ref={endDotRef} r="3.5" className="fill-black stroke-[#f56900]" strokeWidth="1.5" />
            </g>
          </svg>
        )}
      </div>
    </section>
  );
}

export default TestimonialGlobe;
