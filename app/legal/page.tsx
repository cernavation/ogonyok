'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

export default function LegalPage() {
  const containerRef = useScrollReveal()
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms')

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-5 sm:px-8 bg-black text-center overflow-hidden">
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[840px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="apple-eyebrow !text-[#2997ff]">Правовые стандарты и защита данных</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6">
            Условия и конфиденциальность
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[640px] mb-8 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Честные, прозрачные правила сервиса Priday. Твой контент остаётся твоей собственностью, а данные защищены.
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-[#86868b] mb-10">
            <span>Редакция: ноябрь 2026 г.</span>
            <span>·</span>
            <span>Полный контроль видимости</span>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex items-center p-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md">
            <a
              href="#terms"
              onClick={() => setActiveTab('terms')}
              className={`px-6 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeTab === 'terms'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              Условия сервиса
            </a>
            <a
              href="#privacy"
              onClick={() => setActiveTab('privacy')}
              className={`px-6 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeTab === 'privacy'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              Политика конфиденциальности
            </a>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: УСЛОВИЯ ИСПОЛЬЗОВАНИЯ (TERMS) ────────────────── */}
      <section id="terms" className="py-16 sm:py-20 md:py-24 bg-[#0c0c0e] border-t border-white/[0.06] scroll-mt-20">
        <div className="max-w-[800px] mx-auto px-5 sm:px-8 space-y-10 text-[16px] sm:text-[17px] leading-relaxed text-[#a1a1a6]">
          <div className="border-b border-white/[0.08] pb-6">
            <span className="apple-eyebrow block mb-2 !text-[#f56900]">Раздел 1</span>
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#f5f5f7] tracking-tight">
              Условия использования
            </h2>
          </div>

          {/* Summary Box */}
          <div className="apple-card p-6 sm:p-8 bg-[#161617] border border-white/10">
            <span className="text-xs font-mono text-[#f56900] uppercase tracking-wider block mb-2 font-semibold">
              Кратко и по делу
            </span>
            <p className="text-[15px] sm:text-[16px] text-[#f5f5f7] leading-relaxed">
              «Priday» создан для фиксации личных достижений, побед и благодарностей. Твой контент — это твоя исключительная собственность. Мы не продаём твои данные, не навязываем скрытых платежей и не передаём твои записи рекламным сетям.
            </p>
          </div>

          {/* 1. Принятие условий */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              1. Принятие условий
            </h3>
            <p>
              Используя сервис «Priday» (веб-приложение, сайт или PWA-версию), вы подтверждаете согласие с настоящими Условиями и Политикой приватности. Если вы не согласны с какими-либо положениями, пожалуйста, воздержитесь от использования сервиса.
            </p>
          </div>

          {/* 2. Право собственности */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              2. Право собственности на контент и режимы приватности
            </h3>
            <p>
              Все тексты побед, благодарностей, личные цели, прикреплённые фотографии и аудиозаписи принадлежат исключительно вам. Мы не претендуем ни на какие авторские права на ваш личный контент.
            </p>
            <p>
              Ты сам решаешь: быть публичным и делиться победами со всем миром, или вести секретную летопись, скрытую от всех (тебя никто не найдёт в поиске платформы, или найдут только те, кому ты лично разрешишь доступ).
            </p>
          </div>

          {/* 3. Правила использования */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              3. Правила использования и аккаунты
            </h3>
            <p>
              Вы несёте ответственность за сохранность доступа к своему аккаунту и паролю. Запрещается использовать сервис для распространения вредоносного ПО, спама или попыток несанкционированного доступа к чужим профилям.
            </p>
          </div>

          {/* 4. Экспорт и удаление */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              4. Экспорт и удаление данных
            </h3>
            <p>
              Вы имеете право в любой момент бесплатно экспортировать весь архив своих записей в стандартном формате JSON через меню «Настройки → Данные». Также вы можете в 1 клик удалить свой профиль и все связанные записи навсегда.
            </p>
          </div>

          {/* 5. Обратная связь */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              5. Обратная связь
            </h3>
            <p>
              По любым вопросам относительно настоящих Условий и работы сервиса вы можете связаться с командой проекта через Telegram-поддержку{' '}
              <a href="https://t.me/ogonek_support" target="_blank" rel="noreferrer" className="text-[#2997ff] hover:underline font-medium">
                @ogonek_support
              </a>.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ (PRIVACY) ───────── */}
      <section id="privacy" className="py-16 sm:py-20 md:py-24 bg-black border-t border-white/[0.06] scroll-mt-20">
        <div className="max-w-[840px] mx-auto px-5 sm:px-8 space-y-12">
          <div className="border-b border-white/[0.08] pb-6">
            <span className="apple-eyebrow block mb-2 !text-[#2997ff]">Раздел 2</span>
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#f5f5f7] tracking-tight mb-4">
              Политика конфиденциальности и защиты данных
            </h2>
            <p className="text-[#86868b] text-[16px] leading-relaxed">
              Мы не собираем персональные профили для рекламы, не продаём твои записи дата-брокерам и не сканируем мысли без твоего ведома.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="apple-card overflow-hidden bg-[#161617] border border-white/10">
            <div className="grid grid-cols-12 p-4 sm:p-5 border-b border-white/[0.08] text-xs font-mono text-[#86868b] uppercase tracking-wider">
              <div className="col-span-4 sm:col-span-5">Параметр</div>
              <div className="col-span-4 sm:col-span-3 text-rose-400">Обычные соцсети</div>
              <div className="col-span-4 sm:col-span-4 text-[#2997ff]">Priday</div>
            </div>

            {[
              {
                feature: 'Видимость записей',
                cloud: 'Видны всем без разбора в ленте',
                ogonek: 'Свободный выбор: делись со всеми или держи у себя',
              },
              {
                feature: 'Поиск по платформе',
                cloud: 'Профиль индексируется и виден всем',
                ogonek: 'В секретном режиме тебя никто не найдёт',
              },
              {
                feature: 'Реклама и трекеры',
                cloud: 'Meta Pixel, рекламный спам',
                ogonek: '0 рекламных трекеров, 0 продажи данных',
              },
              {
                feature: 'Обучение нейросетей',
                cloud: 'Парсинг текстов для LLM моделей',
                ogonek: 'Zero-Training: закрытый stateless анализ',
              },
              {
                feature: 'Экспорт и удаление',
                cloud: 'Сложные запросы, данные сохраняются',
                ogonek: 'Экспорт в JSON в 1 клик, мгновенный вайп',
              },
            ].map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-12 p-4 sm:p-5 border-b border-white/[0.04] text-[13px] sm:text-[14px] items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-4 sm:col-span-5 font-medium text-[#f5f5f7]">
                  {row.feature}
                </div>
                <div className="col-span-4 sm:col-span-3 text-rose-400/90 text-[12px] sm:text-[13px]">
                  ✗ {row.cloud}
                </div>
                <div className="col-span-4 sm:col-span-4 text-[#2997ff] font-medium text-[12px] sm:text-[13px]">
                  ✓ {row.ogonek}
                </div>
              </div>
            ))}
          </div>

          {/* Privacy Points */}
          <div className="space-y-10 text-[16px] leading-relaxed text-[#a1a1a6]">
            <div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] mb-3 tracking-tight">
                1. Свобода выбора: публичность или секретный режим
              </h3>
              <p className="text-[#86868b]">
                Ты сам решаешь, какой уровень открытости тебе нужен. Ты можешь сделать свой профиль полностью публичным — делиться победами со всем миром, вдохновлять других и участвовать в общих рейтингах. А можешь включить секретный режим: в этом случае тебя никто не сможет найти на платформе через поиск, а твои записи не увидит никто на свете, кроме тех избранных людей, кому ты лично откроешь закрытый доступ.
              </p>
            </div>

            <div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] mb-3 tracking-tight">
                2. Защищённое разграничение доступа
              </h3>
              <p className="text-[#86868b]">
                Доступ к закрытым записям защищается протоколом <strong className="text-white">Row Level Security (RLS)</strong>. Это означает, что правила проверяются на уровне базы данных: ни один другой пользователь физически не может получить доступ к твоим секретным записям без выданного тобой разрешения.
              </p>
            </div>

            <div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] mb-3 tracking-tight">
                3. Право на забвение и полный контроль
              </h3>
              <p className="text-[#86868b] mb-4">
                В любой момент в разделе «Настройки → Данные» вы можете нажать одну кнопку, чтобы выгрузить полный архив всех дней в открытом формате JSON, либо нажать «Удалить аккаунт», что моментально и безвозвратно сотрёт весь профиль и все записи.
              </p>
              <div className="p-5 rounded-2xl bg-[#161617] border border-white/10 text-xs text-[#86868b]">
                Вопросы по безопасности и аудиту кода можно направлять в Telegram-поддержку{' '}
                <a href="https://t.me/ogonek_support" target="_blank" rel="noreferrer" className="text-[#2997ff] underline">
                  @ogonek_support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
