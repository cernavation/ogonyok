'use client'

import React from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

export default function TermsPage() {
  const containerRef = useScrollReveal()

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-5 sm:px-8 bg-black text-center overflow-hidden">
        {/* Soft Ambient Orb */}
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[840px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span className="apple-eyebrow !text-[#2997ff]">Правовые стандарты</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6">
            Условия использования
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[620px] mb-8 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Честные, прозрачные и понятные правила сервиса Priday. Твой контент остаётся только твоим.
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-[#86868b]">
            <span>Редакция действует с: 24 октября 2026 г.</span>
            <span>·</span>
            <span>Стандарт: Полный контроль приватности</span>
          </div>
        </div>
      </section>

      {/* ── TERMS CONTENT ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8 space-y-10 text-[16px] sm:text-[17px] leading-relaxed text-[#a1a1a6]">
          {/* Summary Box */}
          <div className="apple-card p-6 sm:p-8 bg-[#161617] border border-white/10">
            <span className="text-xs font-mono text-[#f56900] uppercase tracking-wider block mb-2 font-semibold">
              Кратко и по делу
            </span>
            <p className="text-[15px] sm:text-[16px] text-[#f5f5f7] leading-relaxed">
              «Priday» создан для фиксации личных достижений, побед и благодарностей. Твой контент — это твоя исключительная собственность. Мы не продаём твои данные, не навязываем скрытых платежей и не передаём твои записи рекламным сетям.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-4">
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#f5f5f7] tracking-tight">
              1. Принятие условий
            </h2>
            <p>
              Используя сервис «Priday» (веб-приложение, сайт или PWA-версию), вы подтверждаете согласие с настоящими Условиями и Политикой приватности. Если вы не согласны с какими-либо положениями, пожалуйста, воздержитесь от использования сервиса.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#f5f5f7] tracking-tight">
              2. Право собственности на контент и режимы приватности
            </h2>
            <p>
              Все тексты побед, благодарностей, личные цели, прикреплённые фотографии и аудиозаписи принадлежат исключительно вам. Мы не претендуем ни на какие авторские права на ваш личный контент.
            </p>
            <p>
              Ты сам решаешь: быть публичным и делиться победами со всем миром, или вести секретную летопись, скрытую от всех (тебя никто не найдёт в поиске платформы, или найдут только те, кому ты лично разрешишь доступ).
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-4">
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#f5f5f7] tracking-tight">
              3. Правила использования и аккаунты
            </h2>
            <p>
              Вы несёте ответственность за сохранность доступа к своему аккаунту и паролю. Запрещается использовать сервис для распространения вредоносного ПО, спама или попыток несанкционированного доступа к чужим профилям.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-4">
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#f5f5f7] tracking-tight">
              4. Экспорт и удаление данных
            </h2>
            <p>
              Вы имеете право в любой момент бесплатно экспортировать весь архив своих записей в стандартном формате JSON через меню «Настройки → Экспорт». Также вы можете в 1 клик удалить свой профиль и все связанные записи навсегда.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-4">
            <h2 className="text-[22px] sm:text-[26px] font-bold text-[#f5f5f7] tracking-tight">
              5. Обратная связь
            </h2>
            <p>
              По любым вопросам относительно настоящих Условий вы можете написать нам через страницу{' '}
              <Link href="/support" className="text-[#2997ff] hover:underline font-medium">
                Поддержки и связи
              </Link>{' '}
              или отправить запрос команде проекта.
            </p>
          </div>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
