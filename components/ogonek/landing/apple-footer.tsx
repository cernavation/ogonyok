'use client'

import React from 'react'
import Link from 'next/link'

export function AppleFooter() {
  return (
    <footer
      className="pt-16 pb-12 bg-[#111111] border-t border-white/[0.08] text-[#86868b] text-[12px]"
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

        {/* 4-Column Apple Directory */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-b border-white/[0.06]">
          {/* Column 1 */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
              О платформе
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/platform" className="hover:text-[#f5f5f7] transition-colors">
                  Возможности и функции
                </Link>
              </li>
              <li>
                <Link href="/ai" className="hover:text-[#f5f5f7] transition-colors text-[#2997ff]">
                  ИИ-наставник (AI Gemini)
                </Link>
              </li>
              <li>
                <Link href="/#open" className="hover:text-[#f5f5f7] transition-colors">
                  Манифест открытости
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-[#f5f5f7] transition-colors">
                  Тарифы и поддержка
                </Link>
              </li>
              <li>
                <Link href="/platform#vault" className="hover:text-[#f5f5f7] transition-colors">
                  Сейф доказательств (Vault)
                </Link>
              </li>
              <li>
                <Link href="/platform#analytics" className="hover:text-[#f5f5f7] transition-colors">
                  Шкала преодоления 1–10★
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
              Ритм и сферы
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/examples" className="hover:text-[#f5f5f7] transition-colors text-[#f56900]">
                  Примеры гордостей (Гид)
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-[#f5f5f7] transition-colors text-[#2997ff]">
                  Сообщество, группы и сторис
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#f5f5f7] transition-colors">
                  Как это работает (Ритуал)
                </Link>
              </li>
              <li>
                <Link href="/modes" className="hover:text-[#f5f5f7] transition-colors">
                  Сферы жизни
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-[#f5f5f7] transition-colors">
                  Истории участников (30+)
                </Link>
              </li>
              <li>
                <Link href="/manifesto" className="hover:text-[#f5f5f7] transition-colors">
                  Манифест 740 дней
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
              Приватность
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/privacy" className="hover:text-[#f5f5f7] transition-colors">
                  Манифест Local-first
                </Link>
              </li>
              <li>
                <Link href="/privacy#encryption" className="hover:text-[#f5f5f7] transition-colors">
                  Шифрование данных
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#f5f5f7] transition-colors">
                  Условия сервиса
                </Link>
              </li>
              <li>
                <Link href="/support#status" className="hover:text-[#f5f5f7] transition-colors">
                  Статус систем
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#f5f5f7] mb-3 tracking-tight">
              Центр заботы
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/support" className="hover:text-[#f5f5f7] transition-colors">
                  Помощь и FAQ
                </Link>
              </li>
              <li>
                <Link href="/support#contact" className="hover:text-[#f5f5f7] transition-colors">
                  Связаться с создателем
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-[#2997ff] hover:text-[#52a9ff] transition-colors font-medium">
                  Создать летопись ›
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#f5f5f7] transition-colors">
                  Войти в профиль
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright and brand row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                fill="#86868b"
              />
            </svg>
            <span className="font-semibold text-[#d2d2d7]">Огонёк</span>
            <span className="text-[#555558]">· Твой личный дневник силы</span>
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
          </div>

          <div className="text-[#6e6e73]">
            © {new Date().getFullYear()} Огонёк. Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  )
}
