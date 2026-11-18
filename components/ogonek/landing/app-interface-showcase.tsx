"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PointerItem {
  id: string;
  title: string;
  subtitle: string;
  /** Percentage position (0..100) of the target element on the screenshot */
  targetX: number;
  targetY: number;
  /** Percentage position (0..100) of the label badge */
  badgeX: number;
  badgeY: number;
  /** Position badge on the left or right of target */
  align?: "left" | "right" | "top" | "bottom";
}

export interface ScreenTab {
  id: "feed" | "analytics" | "leaderboard" | "chats";
  label: string;
  title: string;
  desktopImage: string;
  mobileImage: string;
  pointers: PointerItem[];
}

const SCREENS: ScreenTab[] = [
  {
    id: "feed",
    label: "Лента дня",
    title: "Лента с гордостями",
    desktopImage: "/landing/screens/feed.png",
    mobileImage: "/landing/screens/mobile-feed.png",
    pointers: [
      {
        id: "streak",
        title: "Стрик",
        subtitle: "Счётчик дней подряд",
        targetX: 68,
        targetY: 6,
        badgeX: 52,
        badgeY: 3,
        align: "left",
      },
      {
        id: "pride",
        title: "Гордость дня",
        subtitle: "Поле записи",
        targetX: 36,
        targetY: 28,
        badgeX: 12,
        badgeY: 24,
        align: "left",
      },
      {
        id: "gratitude",
        title: "Благодарности",
        subtitle: "Вечерний ритуал",
        targetX: 36,
        targetY: 58,
        badgeX: 12,
        badgeY: 54,
        align: "left",
      },
      {
        id: "friends",
        title: "Друзья",
        subtitle: "Блок друзей",
        targetX: 82,
        targetY: 32,
        badgeX: 74,
        badgeY: 18,
        align: "right",
      },
    ],
  },
  {
    id: "analytics",
    label: "Статистика",
    title: "Страница статистики",
    desktopImage: "/landing/screens/analytics.png",
    mobileImage: "/landing/screens/mobile-analytics.png",
    pointers: [
      {
        id: "ai-eval",
        title: "Оценка ИИ",
        subtitle: "Звезда и анализ",
        targetX: 38,
        targetY: 28,
        badgeX: 14,
        badgeY: 22,
        align: "left",
      },
      {
        id: "streak-dynamics",
        title: "Стрик",
        subtitle: "График динамики",
        targetX: 64,
        targetY: 28,
        badgeX: 74,
        badgeY: 18,
        align: "right",
      },
    ],
  },
  {
    id: "leaderboard",
    label: "Рейтинг",
    title: "Таблица лидеров",
    desktopImage: "/landing/screens/leaderboard.png",
    mobileImage: "/landing/screens/mobile-leaderboard.png",
    pointers: [
      {
        id: "rank",
        title: "Рейтинг",
        subtitle: "Топ участников",
        targetX: 50,
        targetY: 35,
        badgeX: 22,
        badgeY: 26,
        align: "left",
      },
      {
        id: "streak-leaders",
        title: "Стрик",
        subtitle: "Рекорды платформы",
        targetX: 68,
        targetY: 48,
        badgeX: 75,
        badgeY: 40,
        align: "right",
      },
    ],
  },
  {
    id: "chats",
    label: "Чаты",
    title: "Чаты и звонки",
    desktopImage: "/landing/screens/chats.png",
    mobileImage: "/landing/screens/mobile-chats.png",
    pointers: [
      {
        id: "friends-chats",
        title: "Друзья",
        subtitle: "Список диалогов",
        targetX: 28,
        targetY: 38,
        badgeX: 10,
        badgeY: 28,
        align: "left",
      },
      {
        id: "reactions",
        title: "Благодарности",
        subtitle: "Поддержка побед",
        targetX: 65,
        targetY: 48,
        badgeX: 72,
        badgeY: 38,
        align: "right",
      },
    ],
  },
];

export function AppInterfaceShowcase() {
  const [activeTab, setActiveTab] = React.useState<"feed" | "analytics" | "leaderboard" | "chats">("feed");
  const [deviceMode, setDeviceMode] = React.useState<"desktop" | "phone">("desktop");
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const currentScreen = SCREENS.find((s) => s.id === activeTab) || SCREENS[0];

  return (
    <div ref={containerRef} className="w-full">
      {/* Top Controls: Screen Tabs & Device Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-10">
        {/* Screen Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#16161a] border border-white/10 shadow-lg overflow-x-auto max-w-full">
          {SCREENS.map((screen) => {
            const isActive = screen.id === activeTab;
            return (
              <button
                key={screen.id}
                type="button"
                onClick={() => setActiveTab(screen.id)}
                className={cn(
                  "px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-[#FF4D00] text-white shadow-[0_0_20px_rgba(255,77,0,0.5)] font-semibold"
                    : "text-[#86868b] hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {screen.label}
              </button>
            );
          })}
        </div>

        {/* Device Switcher */}
        <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-[#121215] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setDeviceMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer",
              deviceMode === "desktop"
                ? "bg-white/15 text-white"
                : "text-[#86868b] hover:text-white"
            )}
            title="Показать в окне компьютера"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Окно
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode("phone")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer",
              deviceMode === "phone"
                ? "bg-white/15 text-white"
                : "text-[#86868b] hover:text-white"
            )}
            title="Показать в рамке телефона"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
            </svg>
            Телефон
          </button>
        </div>
      </div>

      {/* Main Display Frame */}
      {deviceMode === "desktop" ? (
        /* ── macOS Window Frame with Soft Shadow & Ambient Ember Glow ── */
        <div className="relative mx-auto max-w-[1100px]">
          {/* Ambient soft orange ember aura */}
          <div className="absolute -inset-4 bg-gradient-to-r from-[#FF4D00]/15 via-transparent to-[#FF4D00]/15 blur-2xl opacity-40 pointer-events-none -z-10" />

          <div className="relative rounded-2xl sm:rounded-[24px] bg-[#121215] border border-white/[0.12] shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(255,77,0,0.08)] overflow-hidden">
            {/* macOS Title Bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#18181c]/80 backdrop-blur-md select-none">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-[#ff5f56]/80 border border-[#e0443e]" />
                <span className="size-3 rounded-full bg-[#ffbd2e]/80 border border-[#dea123]" />
                <span className="size-3 rounded-full bg-[#27c93f]/80 border border-[#1aab29]" />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#86868b]">
                <span className="size-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
                <span>ogonek.app — {currentScreen.title}</span>
              </div>
              <div className="w-12 hidden sm:block" />
            </div>

            {/* Screenshot Stage with Interactive Orange Pointer Arrows */}
            <div className="relative w-full aspect-[16/10] bg-[#09090b] overflow-hidden">
              <img
                src={currentScreen.desktopImage}
                alt={currentScreen.title}
                className="w-full h-full object-cover select-none"
                draggable={false}
              />

              {/* Overlaid Thin Orange (#FF4D00) Arrow Lines & Callouts on Desktop/Tablet (>=768px) */}
              <div className="hidden md:block absolute inset-0 pointer-events-none">
                <svg className="absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <marker
                      id="arrow-orange"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 8 5 L 0 9 z" fill="#FF4D00" />
                    </marker>
                    <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FF4D00" floodOpacity="0.8" />
                    </filter>
                  </defs>

                  {currentScreen.pointers.map((p, idx) => {
                    const delayClass =
                      idx === 0
                        ? "delay-[150ms]"
                        : idx === 1
                        ? "delay-[300ms]"
                        : idx === 2
                        ? "delay-[450ms]"
                        : "delay-[600ms]";

                    // Calculate path from badge center to target point
                    const startX = p.badgeX > p.targetX ? p.badgeX - 1 : p.badgeX + 15;
                    const startY = p.badgeY + 2.5;
                    const endX = p.targetX;
                    const endY = p.targetY;
                    const midX = (startX + endX) / 2;

                    return (
                      <g
                        key={p.id}
                        className={cn(
                          "transition-all duration-700 ease-out",
                          delayClass,
                          isVisible ? "opacity-100" : "opacity-0"
                        )}
                      >
                        {/* Thin orange #FF4D00 connecting curved line */}
                        <path
                          d={`M ${startX}% ${startY}% C ${midX}% ${startY}%, ${midX}% ${endY}%, ${endX}% ${endY}%`}
                          fill="none"
                          stroke="#FF4D00"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          filter="url(#glow-orange)"
                          markerEnd="url(#arrow-orange)"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Badges & Pulsing Target Anchors */}
                {currentScreen.pointers.map((p, idx) => {
                  const delayClass =
                    idx === 0
                      ? "delay-[150ms]"
                      : idx === 1
                      ? "delay-[300ms]"
                      : idx === 2
                      ? "delay-[450ms]"
                      : "delay-[600ms]";

                  return (
                    <React.Fragment key={p.id}>
                      {/* Pulsing target point on the screenshot element */}
                      <div
                        className={cn(
                          "absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500",
                          delayClass,
                          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
                        )}
                        style={{ left: `${p.targetX}%`, top: `${p.targetY}%` }}
                      >
                        <span className="relative flex size-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D00] opacity-75" />
                          <span className="relative inline-flex rounded-full size-3.5 bg-[#FF4D00] border-2 border-white shadow-[0_0_12px_#FF4D00]" />
                        </span>
                      </div>

                      {/* Callout Badge (Orange accent, up to 3 words) */}
                      <div
                        className={cn(
                          "absolute transition-all duration-500 ease-out",
                          delayClass,
                          isVisible
                            ? "opacity-100 translate-y-0 scale-100"
                            : "opacity-0 translate-y-3 scale-95"
                        )}
                        style={{ left: `${p.badgeX}%`, top: `${p.badgeY}%` }}
                      >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-[#FF4D00]/50 shadow-[0_8px_24px_rgba(0,0,0,0.8),0_0_15px_rgba(255,77,0,0.3)] pointer-events-auto">
                          <span className="size-2 rounded-full bg-[#FF4D00] shadow-[0_0_8px_#FF4D00]" />
                          <div className="flex flex-col text-left">
                            <span className="text-[13px] font-bold text-white leading-tight">
                              {p.title}
                            </span>
                            <span className="text-[11px] font-medium text-[#FF4D00] leading-tight">
                              {p.subtitle}
                            </span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Smartphone Mockup Frame with Soft Shadow & Ambient Glow ── */
        <div className="relative mx-auto max-w-[340px]">
          {/* Ambient soft orange ember aura */}
          <div className="absolute -inset-4 bg-gradient-to-r from-[#FF4D00]/20 via-transparent to-[#FF4D00]/20 blur-2xl opacity-40 pointer-events-none -z-10" />

          <div className="relative rounded-[40px] p-3 bg-[#1c1c20] border border-white/[0.15] shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_40px_rgba(255,77,0,0.12)]">
            {/* Phone Screen Container with Dynamic Island */}
            <div className="relative rounded-[32px] overflow-hidden bg-black aspect-[9/19.5]">
              {/* Dynamic Island */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 border border-white/[0.08]" />

              <img
                src={currentScreen.mobileImage}
                alt={currentScreen.title}
                className="w-full h-full object-cover select-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Layout (<768px): Structured list UNDER the screenshot, not over it! ── */}
      <div className="md:hidden mt-6 flex flex-col gap-2.5">
        <span className="text-xs uppercase tracking-wider text-[#FF4D00] font-semibold text-center mb-1">
          Ключевые элементы интерфейса
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {currentScreen.pointers.map((p, idx) => {
            const delayClass =
              idx === 0
                ? "delay-[100ms]"
                : idx === 1
                ? "delay-[200ms]"
                : idx === 2
                ? "delay-[300ms]"
                : "delay-[400ms]";

            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl bg-[#141418] border border-white/[0.08] shadow-md transition-all duration-500",
                  delayClass,
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )}
              >
                <div className="size-8 rounded-lg bg-[#FF4D00]/15 border border-[#FF4D00]/40 flex items-center justify-center shrink-0">
                  <span className="size-2 rounded-full bg-[#FF4D00] shadow-[0_0_8px_#FF4D00]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[14px] font-semibold text-white leading-tight">
                    {p.title}
                  </span>
                  <span className="text-[12px] text-[#FF4D00] font-medium leading-tight mt-0.5">
                    {p.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AppInterfaceShowcase;
