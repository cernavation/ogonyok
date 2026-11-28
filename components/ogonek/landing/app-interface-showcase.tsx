'use client'

import * as React from 'react'
import { Flame, Home, Search, Sparkles, Trophy, MessageCircle, Sun, Check, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/src/content/i18n'

export interface PointerItem {
  id: string
  title: string
  subtitle: string
  targetX: number
  targetY: number
  badgeX: number
  badgeY: number
  align?: 'left' | 'right' | 'top' | 'bottom'
}

export interface ScreenTab {
  id: 'feed' | 'analytics' | 'leaderboard' | 'chats'
  label: string
  title: string
  desktopImage: string
  mobileImage: string
  pointers: PointerItem[]
}

interface HighlightCard {
  id: string
  step: string
  title: string
  subtitle: string
  tab: ScreenTab['id']
}

interface ShowcaseCopy {
  tabs: Array<{ id: ScreenTab['id']; label: string; title: string }>
  desktopLabel: string
  mobileLabel: string
  navItems: string[]
  writeBtn: string
  streakDaysLabel: string
  streakNote: string
  rhythmTitle: string
  milestoneLeft: string
  milestoneRight: string
  nextHundredLeft: string
  nextHundredRight: string
  postDate: string
  postBadge: string
  prideLabel: string
  prideText: string
  gratitudeLabel: string
  gratitudeText: string
  scoreTitle: string
  scoreSub: string
  mentorLabel: string
  mentorText: string
  leadersTitle: string
  officialStatus: string
  onlineStatus: string
  chatIncoming: string
  chatOutgoing: string
  highlights: HighlightCard[]
}

function getShowcaseCopy(locale: Locale): ShowcaseCopy {
  if (locale === 'ro') {
    return {
      tabs: [
        { id: 'feed', label: 'Fluxul zilei', title: 'Fluxul cu victorii' },
        { id: 'analytics', label: 'Analiză și AI', title: 'Analiza progresului' },
        { id: 'leaderboard', label: 'Clasament', title: 'Clasamentul participanților' },
        { id: 'chats', label: 'Prieteni și chaturi', title: 'Chaturi cu apropiații' },
      ],
      desktopLabel: 'Fereastră',
      mobileLabel: 'iPhone',
      navItems: ['Acasă', 'Căutare', 'Focus', 'Analiză', 'Chaturi'],
      writeBtn: 'Notează ziua',
      streakDaysLabel: '752 zile la rând',
      streakNote: 'Winlog nu se arde la o pauză',
      rhythmTitle: 'Ritmul săptămânii',
      milestoneLeft: 'Obiectiv 1 000',
      milestoneRight: '752 / 1 000',
      nextHundredLeft: 'Până la 800 zile',
      nextHundredRight: '52 / 100',
      postDate: 'Astăzi · 21:40',
      postBadge: 'Ziua #752 · 11/10',
      prideLabel: '1. Mândria zilei',
      prideText: 'Am închis lansarea noului modul la timp și mi-am ținut antrenamentul de seară fără scuze.',
      gratitudeLabel: '1. Recunoștință',
      gratitudeText: 'Mulțumesc echipei pentru sprijinul calm și familiei pentru cina caldă împreună.',
      scoreTitle: 'Evaluare AI a zilei',
      scoreSub: 'Bazată pe fapte reale, fără lingușire',
      mentorLabel: 'Notă Winlog AI',
      mentorText: 'Ritmul tău în muncă și disciplină a crescut cu +18% luna aceasta. Continuitatea devine caracter.',
      leadersTitle: 'Top participanți activi',
      officialStatus: 'cont oficial · @winlog.life',
      onlineStatus: 'online',
      chatIncoming: 'Bună! Felicitări pentru ziua #752. Ce victorie ai notat azi?',
      chatOutgoing: 'Am terminat proiectul și am alergat 7 km pe ploaie.',
      highlights: [
        { id: 'feed', step: '01', title: 'Mândria zilei', subtitle: '1–5 victorii reale și recunoștințe în 2 minute seara.', tab: 'feed' },
        { id: 'streak', step: '02', title: 'Serie de nestins', subtitle: 'Winlog păstrează zilele acumulate fără resetări toxice.', tab: 'feed' },
        { id: 'rhythm', step: '03', title: 'Ritmul săptămânii', subtitle: 'Progres clar spre pragul de 1 000 și următoarea sută.', tab: 'analytics' },
        { id: 'friends', step: '04', title: 'Prieteni și chaturi', subtitle: 'Susținere autentică și schimb de carduri cu apropiații.', tab: 'chats' },
      ],
    }
  }

  if (locale === 'en') {
    return {
      tabs: [
        { id: 'feed', label: 'Daily Feed', title: 'Daily victories feed' },
        { id: 'analytics', label: 'AI & Analytics', title: 'Progress analytics' },
        { id: 'leaderboard', label: 'Leaderboard', title: 'Active members ranking' },
        { id: 'chats', label: 'Friends & Chats', title: 'Circle of trust chats' },
      ],
      desktopLabel: 'Desktop',
      mobileLabel: 'iPhone',
      navItems: ['Home', 'Explore', 'Focus', 'Analytics', 'Chats'],
      writeBtn: 'Log day',
      streakDaysLabel: '752 days strong',
      streakNote: 'Winlog never resets on a missed day',
      rhythmTitle: 'Weekly Rhythm',
      milestoneLeft: 'Milestone 1,000',
      milestoneRight: '752 / 1,000',
      nextHundredLeft: 'Next hundred',
      nextHundredRight: '52 / 100',
      postDate: 'Today · 9:40 PM',
      postBadge: 'Day #752 · 11/10',
      prideLabel: '1. Pride of the day',
      prideText: 'Shipped the core release on schedule and still showed up for evening strength training.',
      gratitudeLabel: '1. Gratitude',
      gratitudeText: 'Grateful to the team for steady focus and to family for dinner away from screens.',
      scoreTitle: 'AI Day Strength Score',
      scoreSub: 'Calibrated from real entries, zero fluff',
      mentorLabel: 'Winlog AI Insight',
      mentorText: 'Consistency across work and health rose +18% over last month. Quiet execution compounds.',
      leadersTitle: 'Top active chronicles',
      officialStatus: 'official account · @winlog.life',
      onlineStatus: 'online',
      chatIncoming: 'Huge props on Day #752! What was your toughest win tonight?',
      chatOutgoing: 'Wrapped the launch milestone and ran 7 km in the rain.',
      highlights: [
        { id: 'feed', step: '01', title: 'Pride of the day', subtitle: 'Capture 1–5 genuine wins and gratitudes before sleep.', tab: 'feed' },
        { id: 'streak', step: '02', title: 'Unbreakable streak', subtitle: 'Every closed day stays yours forever without toxic resets.', tab: 'feed' },
        { id: 'rhythm', step: '03', title: 'Weekly rhythm', subtitle: 'Dual progress bars toward 1,000 days and the next 100.', tab: 'analytics' },
        { id: 'friends', step: '04', title: 'Friends & Chats', subtitle: 'Share pride cards and back each other up privately.', tab: 'chats' },
      ],
    }
  }

  return {
    tabs: [
      { id: 'feed', label: 'Лента дня', title: 'Лента побед' },
      { id: 'analytics', label: 'Аналитика и ИИ', title: 'Аналитика роста' },
      { id: 'leaderboard', label: 'Рейтинг', title: 'Рейтинг участников' },
      { id: 'chats', label: 'Друзья и чаты', title: 'Личные чаты и круг' },
    ],
    desktopLabel: 'Десктоп',
    mobileLabel: 'iPhone',
    navItems: ['Лента', 'Поиск', 'Фокус', 'Аналитика', 'Чаты'],
    writeBtn: 'Записать день',
    streakDaysLabel: '752 дня подряд',
    streakNote: 'Winlog не сгорает при пропуске',
    rhythmTitle: 'Ритм недели',
    milestoneLeft: 'Рубеж 1 000',
    milestoneRight: '752 / 1 000',
    nextHundredLeft: 'До 800 дней',
    nextHundredRight: '52 / 100',
    postDate: 'Сегодня · 21:40',
    postBadge: 'День #752 · 11/10',
    prideLabel: '1. Гордость дня',
    prideText: 'Довёл ключевой релиз до продакшена и всё равно пошёл на вечернюю тренировку без отговорок.',
    gratitudeLabel: '1. Благодарность',
    gratitudeText: 'Спасибо команде за спокойную поддержку и близким за тёплый ужин без экранов.',
    scoreTitle: 'Оценка дня от ИИ',
    scoreSub: 'По реальным делам, без дежурной лести',
    mentorLabel: 'Вывод Winlog AI',
    mentorText: 'Ритм в работе и дисциплине вырос на +18% за месяц. Спокойная регулярность даёт главный рычаг.',
    leadersTitle: 'Лидеры летописи',
    officialStatus: 'официальный аккаунт · @winlog.life',
    onlineStatus: 'в сети',
    chatIncoming: 'Привет! Поздравляю с днём #752. Какая победа сегодня далась сложнее всего?',
    chatOutgoing: 'Закрыл релиз вовремя и пробежал 7 км под дождём.',
    highlights: [
      { id: 'feed', step: '01', title: 'Гордость дня', subtitle: '1–5 честных побед и благодарностей за две минуты вечером.', tab: 'feed' },
      { id: 'streak', step: '02', title: 'Несгораемый стрик', subtitle: 'Winlog бережёт прожитые дни и не обнуляет путь при пропуске.', tab: 'feed' },
      { id: 'rhythm', step: '03', title: 'Ритм недели', subtitle: 'Две шкалы прогресса: к большой вехе 1 000 и ближайшей сотне.', tab: 'analytics' },
      { id: 'friends', step: '04', title: 'Друзья и чаты', subtitle: 'Круг доверия, реакции и обмен карточками без лишнего шума.', tab: 'chats' },
    ],
  }
}

function WinlogVerifiedBadge() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#d76737] text-black shrink-0"
      aria-label="Verified"
    >
      <Check size={10} strokeWidth={3} />
    </span>
  )
}

export function AppInterfaceShowcase({ locale = 'ru' }: { locale?: Locale }) {
  const copy = React.useMemo(() => getShowcaseCopy(locale), [locale])
  const [activeTab, setActiveTab] = React.useState<ScreenTab['id']>('feed')
  const [activeHighlight, setActiveHighlight] = React.useState<string>('feed')
  const [deviceView, setDeviceView] = React.useState<'desktop' | 'mobile'>('desktop')
  const currentTab = copy.tabs.find((t) => t.id === activeTab) || copy.tabs[0]

  const selectHighlight = (item: HighlightCard) => {
    setActiveHighlight(item.id)
    setActiveTab(item.tab)
  }

  const renderMainPane = () => {
    if (activeTab === 'analytics') {
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-black border border-white/[0.11] flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-white/50">{copy.scoreTitle}</div>
              <div className="text-[28px] font-bold text-white tracking-tight mt-0.5 tabular-nums">
                9.2 <span className="text-[#d76737]">★</span>
              </div>
              <p className="text-[12px] text-[#86868b] mt-0.5">{copy.scoreSub}</p>
            </div>
            <div className="flex items-end gap-1.5 h-12 px-2">
              {[42, 65, 58, 74, 88, 79, 96].map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2.5 rounded-t-sm transition-all',
                    i === 6 ? 'bg-[#d76737]' : 'bg-white/20'
                  )}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black border border-white/[0.11]">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-white mb-2">
              <Sparkles size={14} className="text-[#d76737]" />
              <span>{copy.mentorLabel}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-white/80">{copy.mentorText}</p>
          </div>

          <div className="p-4 rounded-xl bg-black border border-white/[0.11]">
            <div className="text-[12px] font-semibold text-white mb-3">{copy.rhythmTitle}</div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] font-mono text-white/70 mb-1">
                  <span>{copy.milestoneLeft}</span>
                  <span>{copy.milestoneRight}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full w-[75.2%] rounded-full bg-[#d76737]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-mono text-white/70 mb-1">
                  <span>{copy.nextHundredLeft}</span>
                  <span>{copy.nextHundredRight}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full w-[52%] rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'leaderboard') {
      const leaders = [
        { rank: 1, name: 'Alexei Cerna', handle: '@alex_cerna', days: 752, verified: true, score: '9.4' },
        { rank: 2, name: 'Elena Moraru', handle: '@elena_fit', days: 418, verified: true, score: '9.1' },
        { rank: 3, name: 'Mark Savin', handle: '@mark_dev', days: 295, verified: false, score: '8.9' },
        { rank: 4, name: 'Anna Kim', handle: '@anna_k', days: 184, verified: true, score: '8.8' },
      ]
      return (
        <div className="rounded-xl bg-black border border-white/[0.11] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.09] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-white flex items-center gap-2">
              <Trophy size={14} className="text-[#d76737]" />
              {copy.leadersTitle}
            </span>
            <span className="text-[11px] font-mono text-white/50">750+ MAX</span>
          </div>
          <div className="divide-y divide-white/[0.07]">
            {leaders.map((u) => (
              <div key={u.handle} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[12px] font-mono text-white/45 w-4">{u.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {u.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white truncate">
                      <span className="truncate">{u.name}</span>
                      {u.verified && <WinlogVerifiedBadge />}
                    </div>
                    <div className="text-[11px] font-mono text-white/45 truncate">{u.handle}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-white tabular-nums">{u.days} d</div>
                  <div className="text-[11px] font-mono text-[#d76737]">{u.score} ★</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (activeTab === 'chats') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-12 rounded-xl bg-black border border-white/[0.11] overflow-hidden min-h-[270px]">
          <div className="sm:col-span-5 border-b sm:border-b-0 sm:border-r border-white/[0.09] divide-y divide-white/[0.07]">
            <div className="px-3.5 py-3 flex items-center gap-2.5 bg-white/[0.04]">
              <div className="w-8 h-8 rounded-full bg-[#d76737] text-black flex items-center justify-center shrink-0">
                <Flame size={15} className="fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[13px] font-semibold text-white">
                  <span>Winlog</span>
                  <WinlogVerifiedBadge />
                </div>
                <div className="text-[11px] text-white/50 truncate">@winlog.life</div>
              </div>
            </div>
            <div className="px-3.5 py-3 flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                AK
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">Anna Kim</div>
                <div className="text-[11px] text-emerald-400">{copy.onlineStatus}</div>
              </div>
            </div>
          </div>

          <div className="sm:col-span-7 p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-white">Winlog</span>
                <WinlogVerifiedBadge />
              </div>
              <span className="text-[11px] font-mono text-white/45">{copy.officialStatus}</span>
            </div>
            <div className="space-y-2.5 text-[12px] leading-relaxed">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/[0.1] px-3 py-2 text-white/90">
                {copy.chatIncoming}
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#d76737] px-3 py-2 text-black font-medium">
                {copy.chatOutgoing}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Default: real Winlog daily feed card (pure black + 1px borders + single real pride card)
    return (
      <div className="rounded-xl bg-black border border-white/[0.11] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-[12px] font-bold text-white shrink-0">
              AC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
                <span className="truncate">Alexei Cerna</span>
                <WinlogVerifiedBadge />
              </div>
              <div className="text-[11px] font-mono text-white/45">@alex_cerna · {copy.postDate}</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-[11px] font-mono text-white/85 shrink-0">
            {copy.postBadge}
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#d76737] mb-1 font-semibold">
              {copy.prideLabel}
            </div>
            <p className="text-[13px] sm:text-[14px] text-white/95 leading-snug">{copy.prideText}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.07]">
            <div className="text-[11px] font-mono uppercase tracking-wider text-white/50 mb-1">
              {copy.gratitudeLabel}
            </div>
            <p className="text-[13px] text-white/75 leading-snug">{copy.gratitudeText}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.07] text-[12px] text-white/55">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[#d76737] font-medium">
              <Flame size={14} className="fill-current" /> 18
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart size={14} /> 9
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={14} /> 4
            </span>
          </div>
          <span className="text-[11px] font-mono text-white/45">★ 9.2</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1140px] mx-auto px-1 sm:px-4">
      {/* Top Toolbar: Tabs & Device Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
        <div
          className="flex items-center gap-1 p-1 rounded-full bg-[#060608] border border-white/[0.1] backdrop-blur-md overflow-x-auto max-w-full scrollbar-none"
          role="tablist"
        >
          {copy.tabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border-0',
                  isActive ? 'bg-[#d76737] text-black' : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[#060608] border border-white/[0.1]">
          <button
            type="button"
            onClick={() => setDeviceView('desktop')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border-0',
              deviceView === 'desktop' ? 'bg-white/[0.14] text-white' : 'text-white/55 hover:text-white'
            )}
          >
            {copy.desktopLabel}
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border-0',
              deviceView === 'mobile' ? 'bg-white/[0.14] text-white' : 'text-white/55 hover:text-white'
            )}
          >
            {copy.mobileLabel}
          </button>
        </div>
      </div>

      {/* Live Winlog App Window (Zero broken arrows, zero legacy banner) */}
      <div className="relative mx-auto w-full flex justify-center">
        {deviceView === 'mobile' ? (
          <div className="relative w-full max-w-[360px] rounded-[38px] p-3 bg-[#060608] border border-white/[0.14] shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-1 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-[#d76737] fill-[#d76737]" />
                <span className="text-[15px] font-bold tracking-tight text-white">Winlog</span>
              </div>
              <span className="text-[11px] font-mono text-white/60">{copy.streakDaysLabel}</span>
            </div>
            <div className="pt-3 bg-black rounded-[24px]">{renderMainPane()}</div>
          </div>
        ) : (
          <div className="relative w-full rounded-[20px] sm:rounded-[24px] bg-[#060608] border border-white/[0.11] shadow-2xl overflow-hidden">
            {/* Clean Window Chrome */}
            <div className="h-9 sm:h-10 px-4 flex items-center justify-between border-b border-white/[0.08] bg-black">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
              </div>
              <div className="text-[11px] text-white/45 font-mono flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#d76737]" />
                <span>winlog.life - {currentTab.title}</span>
              </div>
              <div className="w-10" />
            </div>

            {/* Real 3-column Winlog UI */}
            <div className="p-4 sm:p-6 bg-black grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Sidebar */}
              <div className="hidden lg:flex lg:col-span-3 flex-col justify-between h-full space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-3 py-2 mb-3">
                    <Flame size={18} className="text-[#d76737] fill-[#d76737]" />
                    <span className="text-[16px] font-bold tracking-tight text-white">Winlog</span>
                  </div>
                  {[
                    { icon: Home, label: copy.navItems[0], tab: 'feed' as const },
                    { icon: Search, label: copy.navItems[1], tab: 'leaderboard' as const },
                    { icon: Sun, label: copy.navItems[2], tab: 'feed' as const },
                    { icon: Sparkles, label: copy.navItems[3], tab: 'analytics' as const },
                    { icon: MessageCircle, label: copy.navItems[4], tab: 'chats' as const },
                  ].map((item, idx) => {
                    const Icon = item.icon
                    const isItemActive =
                      (idx === 0 && activeTab === 'feed') ||
                      (idx === 1 && activeTab === 'leaderboard') ||
                      (idx === 3 && activeTab === 'analytics') ||
                      (idx === 4 && activeTab === 'chats')
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setActiveTab(item.tab)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors text-left cursor-pointer border-0',
                          isItemActive ? 'bg-white/[0.08] text-white font-semibold' : 'bg-transparent text-white/60 hover:text-white'
                        )}
                      >
                        <Icon size={15} className={isItemActive ? 'text-[#d76737]' : 'text-white/55'} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="px-3">
                  <span className="block w-full py-2.5 rounded-full bg-[#d76737] text-black text-center text-[13px] font-semibold">
                    {copy.writeBtn}
                  </span>
                </div>
              </div>

              {/* Center Interactive View */}
              <div
                className={cn(
                  'lg:col-span-6 rounded-xl transition-all duration-300',
                  activeHighlight === 'feed' && activeTab === 'feed' ? 'ring-1 ring-[#d76737]/45' : ''
                )}
              >
                {renderMainPane()}
              </div>

              {/* Right Rail: Streak + Weekly Rhythm (2 progress lines) */}
              <div className="lg:col-span-3 space-y-3">
                <div
                  className={cn(
                    'p-4 rounded-xl bg-black border transition-all',
                    activeHighlight === 'streak' ? 'border-[#d76737]/60' : 'border-white/[0.11]'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Flame size={15} className="text-[#d76737] fill-[#d76737]" />
                    <span className="text-[15px] font-bold text-white tracking-tight">{copy.streakDaysLabel}</span>
                  </div>
                  <p className="text-[12px] text-[#86868b] leading-snug">{copy.streakNote}</p>
                </div>

                <div
                  className={cn(
                    'p-4 rounded-xl bg-black border transition-all space-y-3',
                    activeHighlight === 'rhythm' ? 'border-[#d76737]/60' : 'border-white/[0.11]'
                  )}
                >
                  <div className="text-[12px] font-semibold text-white">{copy.rhythmTitle}</div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-white/60 mb-1">
                      <span>{copy.milestoneLeft}</span>
                      <span>{copy.milestoneRight}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full w-[75.2%] rounded-full bg-[#d76737]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-white/60 mb-1">
                      <span>{copy.nextHundredLeft}</span>
                      <span>{copy.nextHundredRight}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full w-[52%] rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Neat Clickable Feature Explanations Below the Mockup (No overlapping arrows) */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {copy.highlights.map((item) => {
          const isSelected = activeHighlight === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectHighlight(item)}
              className={cn(
                'text-left p-4 rounded-2xl bg-[#060608] border transition-all cursor-pointer',
                isSelected ? 'border-[#d76737]/55' : 'border-white/[0.1] hover:border-white/[0.22]'
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-mono text-white/50">{item.step}</span>
                <span className="text-[14px] font-semibold text-white">{item.title}</span>
              </div>
              <p className="text-[12px] text-[#86868b] leading-relaxed">{item.subtitle}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AppInterfaceShowcase
