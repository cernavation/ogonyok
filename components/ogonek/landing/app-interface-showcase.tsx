"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/src/content/i18n";

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

function getLocalizedScreens(locale: Locale): ScreenTab[] {
  if (locale === "ro") {
    return [
      {
        id: "feed",
        label: "Fluxul zilei",
        title: "Fluxul cu victorii",
        desktopImage: "/landing/screens/feed.png",
        mobileImage: "/landing/screens/mobile-feed.png",
        pointers: [
          {
            id: "streak",
            title: "Serie",
            subtitle: "Zile consecutive",
            targetX: 68,
            targetY: 6,
            badgeX: 52,
            badgeY: 3,
            align: "left",
          },
          {
            id: "pride",
            title: "Mândria zilei",
            subtitle: "Câmp de scriere",
            targetX: 36,
            targetY: 28,
            badgeX: 12,
            badgeY: 24,
            align: "left",
          },
          {
            id: "gratitude",
            title: "Recunoștințe",
            subtitle: "Ritualul de seară",
            targetX: 36,
            targetY: 58,
            badgeX: 12,
            badgeY: 54,
            align: "left",
          },
          {
            id: "friends",
            title: "Prieteni",
            subtitle: "Secțiunea prieteni",
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
        label: "Statistici",
        title: "Pagina de statistici",
        desktopImage: "/landing/screens/analytics.png",
        mobileImage: "/landing/screens/mobile-analytics.png",
        pointers: [
          {
            id: "ai-eval",
            title: "Evaluare AI",
            subtitle: "Stea și analiză",
            targetX: 38,
            targetY: 28,
            badgeX: 14,
            badgeY: 22,
            align: "left",
          },
          {
            id: "streak-dynamics",
            title: "Serie",
            subtitle: "Graficul dinamicii",
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
        label: "Clasament",
        title: "Tabelul liderilor",
        desktopImage: "/landing/screens/leaderboard.png",
        mobileImage: "/landing/screens/mobile-leaderboard.png",
        pointers: [
          {
            id: "rank",
            title: "Clasament",
            subtitle: "Top participanți",
            targetX: 50,
            targetY: 35,
            badgeX: 22,
            badgeY: 26,
            align: "left",
          },
          {
            id: "streak-leaders",
            title: "Serie",
            subtitle: "Recordurile comunității",
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
        label: "Chaturi",
        title: "Chaturi și apeluri",
        desktopImage: "/landing/screens/chats.png",
        mobileImage: "/landing/screens/mobile-chats.png",
        pointers: [
          {
            id: "friends-chats",
            title: "Prieteni",
            subtitle: "Lista de dialoguri",
            targetX: 28,
            targetY: 38,
            badgeX: 10,
            badgeY: 28,
            align: "left",
          },
          {
            id: "reactions",
            title: "Recunoștințe",
            subtitle: "Sprijin pentru victorii",
            targetX: 65,
            targetY: 48,
            badgeX: 72,
            badgeY: 38,
            align: "right",
          },
        ],
      },
    ];
  }

  if (locale === "en") {
    return [
      {
        id: "feed",
        label: "Daily Feed",
        title: "Feed with victories",
        desktopImage: "/landing/screens/feed.png",
        mobileImage: "/landing/screens/mobile-feed.png",
        pointers: [
          {
            id: "streak",
            title: "Streak",
            subtitle: "Consecutive days",
            targetX: 68,
            targetY: 6,
            badgeX: 52,
            badgeY: 3,
            align: "left",
          },
          {
            id: "pride",
            title: "Daily pride",
            subtitle: "Journal input",
            targetX: 36,
            targetY: 28,
            badgeX: 12,
            badgeY: 24,
            align: "left",
          },
          {
            id: "gratitude",
            title: "Gratitude",
            subtitle: "Evening ritual",
            targetX: 36,
            targetY: 58,
            badgeX: 12,
            badgeY: 54,
            align: "left",
          },
          {
            id: "friends",
            title: "Friends",
            subtitle: "Circle section",
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
        label: "Analytics",
        title: "Statistics overview",
        desktopImage: "/landing/screens/analytics.png",
        mobileImage: "/landing/screens/mobile-analytics.png",
        pointers: [
          {
            id: "ai-eval",
            title: "AI Review",
            subtitle: "Rating & insights",
            targetX: 38,
            targetY: 28,
            badgeX: 14,
            badgeY: 22,
            align: "left",
          },
          {
            id: "streak-dynamics",
            title: "Streak",
            subtitle: "Momentum chart",
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
        label: "Leaderboard",
        title: "Community standings",
        desktopImage: "/landing/screens/leaderboard.png",
        mobileImage: "/landing/screens/mobile-leaderboard.png",
        pointers: [
          {
            id: "rank",
            title: "Leaderboard",
            subtitle: "Top members",
            targetX: 50,
            targetY: 35,
            badgeX: 22,
            badgeY: 26,
            align: "left",
          },
          {
            id: "streak-leaders",
            title: "Streak",
            subtitle: "Community records",
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
        label: "Chats",
        title: "Private messenger",
        desktopImage: "/landing/screens/chats.png",
        mobileImage: "/landing/screens/mobile-chats.png",
        pointers: [
          {
            id: "friends-chats",
            title: "Friends",
            subtitle: "Direct conversations",
            targetX: 28,
            targetY: 38,
            badgeX: 10,
            badgeY: 28,
            align: "left",
          },
          {
            id: "reactions",
            title: "Gratitude",
            subtitle: "Victory reactions",
            targetX: 65,
            targetY: 48,
            badgeX: 72,
            badgeY: 38,
            align: "right",
          },
        ],
      },
    ];
  }

  // Default: Russian
  return [
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
}

interface AppInterfaceShowcaseProps {
  locale?: Locale;
}

export function AppInterfaceShowcase({ locale = "ru" }: AppInterfaceShowcaseProps) {
  const [activeTab, setActiveTab] = React.useState<"feed" | "analytics" | "leaderboard" | "chats">("feed");
  const [deviceMode, setDeviceMode] = React.useState<"desktop" | "phone">("desktop");
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const screens = React.useMemo(() => getLocalizedScreens(locale), [locale]);

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

  const currentScreen = screens.find((s) => s.id === activeTab) || screens[0];

  const windowLabel = locale === "ro" ? "Fereastră" : locale === "en" ? "Window" : "Окно";
  const phoneLabel = locale === "ro" ? "Telefon" : locale === "en" ? "Phone" : "Телефон";

  return (
    <div ref={containerRef} className="w-full">
      {/* Top Controls: Screen Tabs & Device Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 sm:mb-10">
        {/* Screen Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#16161a] border border-white/10 shadow-lg overflow-x-auto max-w-full">
          {screens.map((screen) => {
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
            title="Desktop window"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            {windowLabel}
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
            title="Mobile phone"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="3" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
            </svg>
            {phoneLabel}
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
                <span>priday.app — {currentScreen.title}</span>
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
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FF4D00" />
                    </marker>
                  </defs>

                  {currentScreen.pointers.map((pointer, idx) => {
                    const startX = pointer.badgeX + (pointer.align === "right" ? -2 : 14);
                    const startY = pointer.badgeY + 3;
                    const endX = pointer.targetX;
                    const endY = pointer.targetY;

                    return (
                      <g key={pointer.id} className="transition-opacity duration-500" style={{ opacity: isVisible ? 1 : 0, transitionDelay: `${idx * 150}ms` }}>
                        <line
                          x1={`${startX}%`}
                          y1={`${startY}%`}
                          x2={`${endX}%`}
                          y2={`${endY}%`}
                          stroke="#FF4D00"
                          strokeWidth="1.75"
                          strokeDasharray="4 3"
                          markerEnd="url(#arrow-orange)"
                          className="drop-shadow-[0_0_6px_rgba(255,77,0,0.6)]"
                        />
                        <circle
                          cx={`${endX}%`}
                          cy={`${endY}%`}
                          r="4"
                          fill="#FF4D00"
                          className="animate-ping"
                          style={{ animationDuration: "2.5s" }}
                        />
                        <circle
                          cx={`${endX}%`}
                          cy={`${endY}%`}
                          r="3"
                          fill="#FF4D00"
                          className="drop-shadow-[0_0_6px_rgba(255,77,0,0.8)]"
                        />
                      </g>
                    );
                  })}
                </svg>

                {currentScreen.pointers.map((pointer, idx) => (
                  <div
                    key={pointer.id}
                    className="absolute z-20 pointer-events-auto transition-all duration-500"
                    style={{
                      left: `${pointer.badgeX}%`,
                      top: `${pointer.badgeY}%`,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? "translateY(0)" : "translateY(8px)",
                      transitionDelay: `${idx * 150}ms`,
                    }}
                  >
                    <div className="group cursor-default flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-[#FF4D00]/50 shadow-[0_4px_16px_rgba(0,0,0,0.8),0_0_12px_rgba(255,77,0,0.3)] hover:scale-105 transition-transform">
                      <span className="size-1.5 rounded-full bg-[#FF4D00] shadow-[0_0_6px_#FF4D00]" />
                      <div className="flex flex-col text-left leading-none">
                        <span className="text-[12px] font-semibold text-white tracking-tight">
                          {pointer.title}
                        </span>
                        <span className="text-[10px] text-[#a1a1a6] mt-0.5">
                          {pointer.subtitle}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Mobile Phone Frame (Dynamic Island + Soft Border) ── */
        <div className="relative mx-auto max-w-[340px]">
          <div className="relative rounded-[44px] bg-[#1a1a1e] p-3 border-4 border-[#2c2c30] shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_40px_rgba(255,77,0,0.1)]">
            <div className="relative rounded-[36px] overflow-hidden bg-black aspect-[9/19.5]">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-end px-2.5">
                <span className="size-2 rounded-full bg-[#1c1c1e]" />
              </div>
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

      {/* Mobile/Tablet Fallback Description Cards (<768px) */}
      <div className="md:hidden mt-6 grid grid-cols-2 gap-2.5">
        {currentScreen.pointers.map((pointer) => (
          <div
            key={pointer.id}
            className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-start gap-2"
          >
            <span className="size-1.5 rounded-full bg-[#FF4D00] mt-1 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white tracking-tight">
                {pointer.title}
              </div>
              <div className="text-[11px] text-[#86868b] mt-0.5">
                {pointer.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
