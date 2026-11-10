'use client'

import React from 'react'

export function DayCardSkeleton() {
  return (
    <article
      className="border-b border-[var(--line)] px-4 py-4 animate-pulse select-none"
      aria-hidden="true"
    >
      <div className="flex gap-3">
        {/* Аватар 40x40 с фиксированным размером (CLS = 0) */}
        <div className="w-10 h-10 rounded-full bg-[var(--surface2)] shrink-0 border border-[var(--line)]" />

        {/* Контент карточки */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Заголовок: имя, никнейм, бейдж */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-28 bg-[var(--surface2)] rounded-md" />
            <div className="h-3.5 w-20 bg-[var(--surface2)]/60 rounded-md" />
            <div className="h-3.5 w-14 bg-[var(--surface2)]/40 rounded-full" />
          </div>

          {/* Строки записей дня с фиксированными высотами */}
          <div className="space-y-2 pt-1">
            <div className="h-4 w-full bg-[var(--surface2)]/80 rounded-md" />
            <div className="h-4 w-5/6 bg-[var(--surface2)]/60 rounded-md" />
            <div className="h-4 w-3/4 bg-[var(--surface2)]/50 rounded-md" />
          </div>

          {/* Фиксированный блок фото с aspect-[16/9] (CLS = 0) */}
          <div className="w-full aspect-[16/9] max-h-[300px] rounded-2xl bg-[var(--surface2)]/70 border border-[var(--line)]" />

          {/* Футер карточки: 5 кнопок действий */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--line)] max-w-[460px]">
            <div className="w-7 h-7 rounded-full bg-[var(--surface2)]/50" />
            <div className="w-7 h-7 rounded-full bg-[var(--surface2)]/50" />
            <div className="w-7 h-7 rounded-full bg-[var(--surface2)]/50" />
            <div className="w-7 h-7 rounded-full bg-[var(--surface2)]/50" />
            <div className="w-7 h-7 rounded-full bg-[var(--surface2)]/50" />
          </div>
        </div>
      </div>
    </article>
  )
}
