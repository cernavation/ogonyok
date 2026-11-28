'use client'

import React from 'react'
import { Check, Flame, Lock, Send, Sparkles, TrendingUp } from 'lucide-react'
import type { Locale } from '@/src/content/i18n'

function VerifiedDot() {
  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#d76737] text-black shrink-0"
      aria-label="Verified"
    >
      <Check size={9} strokeWidth={3} />
    </span>
  )
}

export function WinlogAiPreview({ locale = 'ru' }: { locale?: Locale }) {
  const copy =
    locale === 'ro'
      ? {
          headerTag: 'Evaluare zi · #48',
          scoreCaption: 'Analiză sinceră, fără clișee',
          scoreDelta: '+18% față de luna trecută',
          chartTitle: 'Dinamica ultimelor 7 zile',
          days: ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'],
          pillarsTitle: 'Sfere active',
          pillars: [
            { label: 'Muncă și focus', pct: 88 },
            { label: 'Sport și tonus', pct: 74 },
            { label: 'Familie', pct: 68 },
          ],
          mentorBadge: 'Winlog AI Mentor',
          mentorQuote:
            'Disciplina a rămas stabilă chiar și într-o zi încărcată: 3 din 3 promisiuni îndeplinite, sportul de seară a consolidat rezultatul.',
          rhythmTitle: 'Ritmul săptămânii',
          goal1: 'Până la 100 zile',
          goal2: 'Prag 1 000',
        }
      : locale === 'en'
        ? {
            headerTag: 'Day Evaluation · #48',
            scoreCaption: 'Objective review, zero flattery',
            scoreDelta: '+18% vs. previous month',
            chartTitle: 'Last 7 days strength score',
            days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
            pillarsTitle: 'Key focus areas',
            pillars: [
              { label: 'Work & Craft', pct: 88 },
              { label: 'Sport & Health', pct: 74 },
              { label: 'Family', pct: 68 },
            ],
            mentorBadge: 'Winlog AI Mentor',
            mentorQuote:
              'Execution held steady even under peak load: 3 of 3 morning commitments delivered, and evening training sealed the day.',
            rhythmTitle: 'Weekly Rhythm',
            goal1: 'To 100 days',
            goal2: 'Milestone 1,000',
          }
        : {
            headerTag: 'Оценка дня · #48',
            scoreCaption: 'Объективный разбор без лести',
            scoreDelta: '+18% к прошлому месяцу',
            chartTitle: 'Динамика последних 7 дней',
            days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            pillarsTitle: 'Сильные сферы',
            pillars: [
              { label: 'Работа и дело', pct: 88 },
              { label: 'Спорт и тонус', pct: 74 },
              { label: 'Семья', pct: 68 },
            ],
            mentorBadge: 'Ментор Winlog AI',
            mentorQuote:
              'Фокус удержан даже в плотный день: 3 из 3 утренних обещаний закрыты, вечерняя пробежка закрепила темп.',
            rhythmTitle: 'Ритм недели',
            goal1: 'До 100 дней',
            goal2: 'Рубеж 1 000',
          }

  const bars = [
    { h: 64, score: '7.9' },
    { h: 72, score: '8.3' },
    { h: 68, score: '8.1' },
    { h: 80, score: '8.6' },
    { h: 86, score: '8.9' },
    { h: 78, score: '8.5' },
    { h: 95, score: '9.2' },
  ]

  return (
    <div className="bg-black p-4 sm:p-6 md:p-7 space-y-5 text-left">
      {/* Top Row: Day Rating Card + 7-Day Trend Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Evaluation Score Card */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#060608] border border-white/[0.1] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/55">
              {copy.headerTag}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-[11px] font-mono text-white/80">
              <TrendingUp size={11} className="text-[#d76737]" />
              {copy.scoreDelta}
            </span>
          </div>

          <div className="flex items-baseline gap-2.5 my-1">
            <span className="text-[44px] sm:text-[50px] font-bold tracking-tight text-white leading-none tabular-nums">
              9.2
            </span>
            <span className="text-[26px] font-bold text-[#d76737] leading-none">★</span>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between">
            <span className="text-[12px] text-[#86868b]">{copy.scoreCaption}</span>
            <span className="text-[12px] font-mono text-white/75">48 d</span>
          </div>
        </div>

        {/* 7-Day Trend Graph */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#060608] border border-white/[0.1] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-semibold text-white">{copy.chartTitle}</span>
            <span className="text-[11px] font-mono text-white/45">WINLOG AI</span>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-28 pt-2">
            {bars.map((bar, idx) => {
              const isPeak = idx === bars.length - 1
              return (
                <div key={copy.days[idx]} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isPeak ? 'text-[#d76737] font-semibold' : 'text-white/45'
                    }`}
                  >
                    {bar.score}
                  </span>
                  <div className="w-full max-w-[30px] flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        isPeak ? 'bg-[#d76737]' : 'bg-white/[0.16]'
                      }`}
                      style={{ height: `${bar.h}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/45">{copy.days[idx]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Mentor Breakdown + Spheres & Weekly Rhythm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#060608] border border-white/[0.1] flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-[#d76737]">
                <Sparkles size={13} />
              </div>
              <span className="text-[13px] font-semibold text-white">{copy.mentorBadge}</span>
              <VerifiedDot />
            </div>
            <p className="text-[14px] text-white/85 leading-relaxed">{copy.mentorQuote}</p>
          </div>

          <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-white/45">
              {copy.rhythmTitle}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[11px] font-mono text-white/70 mb-1">
                  <span>{copy.goal1}</span>
                  <span>48 / 100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full w-[48%] rounded-full bg-[#d76737]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-mono text-white/70 mb-1">
                  <span>{copy.goal2}</span>
                  <span>48 / 1 000</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full w-[5%] rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#060608] border border-white/[0.1] flex flex-col justify-between space-y-3">
          <div className="text-[13px] font-semibold text-white">{copy.pillarsTitle}</div>
          <div className="space-y-3">
            {copy.pillars.map((pillar, i) => (
              <div key={pillar.label}>
                <div className="flex justify-between text-[12px] text-white/75 mb-1">
                  <span>{pillar.label}</span>
                  <span className="font-mono text-white/60">{pillar.pct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${i === 0 ? 'bg-[#d76737]' : 'bg-white/65'}`}
                    style={{ width: `${pillar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function WinlogFriendsPreview({ locale = 'ru' }: { locale?: Locale }) {
  const copy =
    locale === 'ro'
      ? {
          chatsTitle: 'Cerc de încredere',
          online: 'online',
          recent: 'activ azi',
          officialSub: 'cont oficial · @winlog.life',
          friendSub1: 'Ziua #184 închisă acum 5 min',
          friendSub2: 'Alergare de dimineață 10 km',
          sharedLabel: 'Card trimis · Ziua #48',
          sharedText: 'Am lansat actualizarea la timp și am alergat 7 km seara.',
          msg1: 'Super disciplină! 7 km pe ploaie după muncă chiar impune respect.',
          msg2: 'Mulțumesc! Aștept și raportul tău de seară azi.',
          placeholder: 'Scrie un mesaj...',
        }
      : locale === 'en'
        ? {
            chatsTitle: 'Circle of trust',
            online: 'online',
            recent: 'active today',
            officialSub: 'official account · @winlog.life',
            friendSub1: 'Closed Day #184 · 5m ago',
            friendSub2: 'Morning 10 km tempo run',
            sharedLabel: 'Shared card · Day #48',
            sharedText: 'Shipped the core release on schedule and ran 7 km in the evening.',
            msg1: 'Serious consistency. Showing up for 7 km right after a launch is huge.',
            msg2: 'Thanks! Looking forward to seeing your evening log tonight.',
            placeholder: 'Write a message...',
          }
        : {
            chatsTitle: 'Круг доверия',
            online: 'в сети',
            recent: 'был недавно',
            officialSub: 'официальный аккаунт · @winlog.life',
            friendSub1: 'Закрыла день #184 · 5 мин назад',
            friendSub2: 'Утренний кросс 10 км',
            sharedLabel: 'Карточка дня · День #48',
            sharedText: 'Довёл релиз в срок и вечером пробежал 7 км без отговорок.',
            msg1: 'Мощный ритм! Выйти на 7 км после такого рабочего дня - топ.',
            msg2: 'Спасибо! Жду твою запись вечером перед сном.',
            placeholder: 'Написать сообщение...',
          }

  return (
    <div className="rounded-[20px] bg-black border border-white/[0.11] overflow-hidden shadow-2xl text-left">
      {/* Minimal Header */}
      <div className="h-10 px-4 border-b border-white/[0.08] bg-[#060608] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={15} className="text-[#d76737] fill-[#d76737]" />
          <span className="text-[13px] font-bold text-white tracking-tight">Winlog</span>
          <span className="text-[11px] font-mono text-white/40 hidden sm:inline">· @winlog.life</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/55">
          <Lock size={11} className="text-white/50" />
          Private circle
        </span>
      </div>

      {/* Main Split View */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px]">
        {/* Left Friends List */}
        <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#040406] divide-y divide-white/[0.06]">
          <div className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider text-white/45">
            {copy.chatsTitle}
          </div>

          {/* Official Winlog System Chat */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#d76737] text-black flex items-center justify-center shrink-0">
              <Flame size={16} className="fill-current" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                <span>Winlog</span>
                <VerifiedDot />
              </div>
              <div className="text-[11px] text-white/50 truncate">{copy.officialSub}</div>
            </div>
          </div>

          {/* Active Friend 1 (Selected, Honest Online Status) */}
          <div className="px-4 py-3 flex items-center gap-3 bg-white/[0.05]">
            <div className="relative w-9 h-9 rounded-full bg-white/[0.09] border border-white/[0.14] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              AK
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white truncate">
                  <span>Anna Kim</span>
                  <VerifiedDot />
                </span>
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">{copy.online}</span>
              </div>
              <div className="text-[11px] text-white/60 truncate mt-0.5">{copy.friendSub1}</div>
            </div>
          </div>

          {/* Active Friend 2 (Online) */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full bg-white/[0.09] border border-white/[0.14] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              EM
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white truncate">
                  <span>Elena Moraru</span>
                  <VerifiedDot />
                </span>
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">{copy.online}</span>
              </div>
              <div className="text-[11px] text-white/50 truncate mt-0.5">{copy.friendSub2}</div>
            </div>
          </div>

          {/* Friend 3 */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center justify-center text-[11px] font-bold text-white/80 shrink-0">
              MS
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-white truncate">Mark Savin</span>
                <span className="text-[10px] font-mono text-white/40 shrink-0">{copy.recent}</span>
              </div>
              <div className="text-[11px] text-white/45 truncate mt-0.5">@mark_dev · 295 d</div>
            </div>
          </div>
        </div>

        {/* Right Chat Thread */}
        <div className="md:col-span-7 p-4 sm:p-5 bg-black flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full bg-white/[0.09] border border-white/[0.14] flex items-center justify-center text-[11px] font-bold text-white">
                AK
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                  <span>Anna Kim</span>
                  <VerifiedDot />
                </div>
                <div className="text-[11px] text-emerald-400">{copy.online}</div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-white/40">@anna_k</span>
          </div>

          {/* Conversation Messages */}
          <div className="space-y-3 my-auto">
            {/* Shared Winlog Card */}
            <div className="ml-auto max-w-[90%] p-3.5 rounded-2xl bg-[#060608] border border-white/[0.12] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#d76737] uppercase tracking-wider font-semibold">
                <Flame size={12} className="fill-[#d76737]" />
                <span>{copy.sharedLabel}</span>
              </div>
              <p className="text-[13px] text-white/90 leading-snug">{copy.sharedText}</p>
            </div>

            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/[0.09] px-3.5 py-2.5 text-[13px] text-white/90 leading-snug">
              {copy.msg1}
            </div>

            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#d76737] px-3.5 py-2.5 text-[13px] text-black font-semibold leading-snug">
              {copy.msg2}
            </div>
          </div>

          {/* Input Bar */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center gap-2.5">
            <div className="flex-1 px-3.5 py-2 rounded-full bg-[#060608] border border-white/[0.1] text-[12px] text-white/40">
              {copy.placeholder}
            </div>
            <div className="w-8 h-8 rounded-full bg-[#d76737] text-black flex items-center justify-center shrink-0">
              <Send size={13} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
