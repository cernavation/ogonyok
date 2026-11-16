'use client'

import React from 'react'
import Link from 'next/link'

export function AppleFooter() {
  return (
    <footer
      className="pt-16 pb-12 bg-[#0c0c0e] border-t border-white/[0.08] text-[#86868b] text-[12px]"
      aria-label="Подвал сайта"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* Footnote / Disclaimer */}
        <div className="pb-8 border-b border-white/[0.06] text-[11px] leading-relaxed text-[#6e6e73]">
          <p className="mb-2">
            1. «Огонёк» построен по философии Local-first: персональные записи побед, благодарностей и медиа-доказательства по умолчанию сохраняются на локальном накопителе вашего устройства с поддержкой шифрования Web Crypto.
          </p>
          <p>
            2. Правило «Стрик не сгорает»: стрик рассчитывается по числу фактически закрытых страниц летописи. Пропуск одного дня не обнуляет накопленные результаты и не начисляет штрафов.
          </p>
        </div>

        {/* 5-Column Apple España Directory Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 py-12 border-b border-white/[0.06]">
          {/* Column 1: Платформа */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
              Платформа
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/platform" className="hover:text-[#f5f5f7] transition-colors">
                  Возможности и функции
                </Link>
              </li>
              <li>
                <Link href="/examples" className="hover:text-[#f5f5f7] transition-colors text-[#f56900]">
                  Примеры гордостей (Гид)
                </Link>
              </li>
              <li>
                <Link href="/ai" className="hover:text-[#f5f5f7] transition-colors text-[#2997ff]">
                  ИИ-наставник (Gemini)
                </Link>
              </li>
              <li>
                <Link href="/platform#vault" className="hover:text-[#f5f5f7] transition-colors">
                  Сейф доказательств (Vault)
                </Link>
              </li>
              <li>
                <Link href="/examples#high-score" className="hover:text-[#f5f5f7] transition-colors">
                  Шкала преодоления 1–10★
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Сообщество */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
              Сообщество
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/community#groups" className="hover:text-[#f5f5f7] transition-colors">
                  Клубы по хобби
                </Link>
              </li>
              <li>
                <Link href="/community#search" className="hover:text-[#f5f5f7] transition-colors">
                  Поиск напарников по целям
                </Link>
              </li>
              <li>
                <Link href="/community#stories" className="hover:text-[#f5f5f7] transition-colors text-[#f91880]">
                  Сторис побед 24ч
                </Link>
              </li>
              <li>
                <Link href="/community#calls" className="hover:text-[#f5f5f7] transition-colors">
                  Зашифрованные P2P звонки
                </Link>
              </li>
              <li>
                <Link href="/community#duo" className="hover:text-[#f5f5f7] transition-colors">
                  Парный огонёк (Duo Streak)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Ритм и сферы */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
              Ритм и сферы
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/how-it-works" className="hover:text-[#f5f5f7] transition-colors">
                  Вечерний ритуал (5 минут)
                </Link>
              </li>
              <li>
                <Link href="/modes" className="hover:text-[#f5f5f7] transition-colors">
                  5 сфер жизни
                </Link>
              </li>
              <li>
                <Link href="/examples#levels-guide" className="hover:text-[#f5f5f7] transition-colors">
                  Выбор уровня из 5
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-[#f5f5f7] transition-colors">
                  Истории участников (32+)
                </Link>
              </li>
              <li>
                <Link href="/manifesto" className="hover:text-[#f5f5f7] transition-colors">
                  Манифест 740 дней
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Открытость и тарифы */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
              Открытость
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/#open" className="hover:text-[#f5f5f7] transition-colors text-[#00c7be]">
                  Манифест независимости
                </Link>
              </li>
              <li>
                <Link href="/#open" className="hover:text-[#f5f5f7] transition-colors">
                  100% бесплатно навсегда
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-[#f5f5f7] transition-colors">
                  Тарифы Pro и Ultra
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-[#f5f5f7] transition-colors">
                  Поддержка независимых
                </Link>
              </li>
              <li>
                <Link href="/#open" className="hover:text-[#f5f5f7] transition-colors">
                  0% рекламы и трекеров
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Безопасность и центр заботы */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3.5 tracking-tight uppercase font-mono">
              Безопасность
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/privacy" className="hover:text-[#f5f5f7] transition-colors">
                  Манифест Local-first
                </Link>
              </li>
              <li>
                <Link href="/privacy#encryption" className="hover:text-[#f5f5f7] transition-colors">
                  Шифрование Web Crypto
                </Link>
              </li>
              <li>
                <Link href="/ai#privacy-pledge" className="hover:text-[#f5f5f7] transition-colors">
                  Гарантии Zero-Training
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#f5f5f7] transition-colors">
                  Условия сервиса
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-[#f5f5f7] transition-colors">
                  Центр заботы & FAQ
                </Link>
              </li>
              <li>
                <Link href="/support#contact" className="hover:text-[#f5f5f7] transition-colors">
                  Связаться с создателем
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright and brand row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-2.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#86868b"
              />
            </svg>
            <span className="font-semibold text-[#d2d2d7]">Огонёк</span>
            <span className="text-[#555558]">· Твой личный дневник силы</span>
            <span className="text-[#333336]">|</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Все системы в строю</span>
            </span>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-[#f5f5f7] transition-colors">
              Конфиденциальность
            </Link>
            <Link href="/terms" className="hover:text-[#f5f5f7] transition-colors">
              Условия
            </Link>
            <Link href="/support" className="hover:text-[#f5f5f7] transition-colors">
              Поддержка
            </Link>
            <Link href="/support#status" className="hover:text-[#f5f5f7] transition-colors">
              Статус
            </Link>
          </div>

          <div className="text-[#6e6e73]">
            © {new Date().getFullYear()} Огонёк. Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  )
}
