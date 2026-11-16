'use client'

import React from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

export default function PrivacyPage() {
  const containerRef = useScrollReveal()

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-5 sm:px-8 bg-black text-center overflow-hidden">
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[840px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="apple-eyebrow !text-[#2997ff]">Манифест Приватности и Секретного Режима</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6">
            Твои мысли принадлежат
            <br />
            <span className="apple-shimmer-text">только тебе.</span>
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[640px] mb-8 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Мы не собираем персональные профили для рекламы, не продаём твои записи дата-брокерам и не сканируем мысли без твоего ведома.
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-[#86868b]">
            <span>Обновлено: ноябрь 2026 г.</span>
            <span>·</span>
            <span>Приватность: Публичный или секретный профиль</span>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ──────────────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1024px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-16">
            <span className="apple-eyebrow block mb-3">Стандарты честности</span>
            <h2 className="apple-section-title mb-4">
              Обычные сервисы vs Priday
            </h2>
          </div>

          <div className="apple-card overflow-hidden bg-[#161617] border border-white/10">
            <div className="grid grid-cols-12 p-5 border-b border-white/[0.08] text-xs font-mono text-[#86868b] uppercase tracking-wider">
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
                cloud: 'Meta Pixel, Google Analytics, спам',
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
                className="grid grid-cols-12 p-5 border-b border-white/[0.04] text-[14px] items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-4 sm:col-span-5 font-medium text-[#f5f5f7]">
                  {row.feature}
                </div>
                <div className="col-span-4 sm:col-span-3 text-rose-400/90 text-[13px]">
                  ✗ {row.cloud}
                </div>
                <div className="col-span-4 sm:col-span-4 text-[#2997ff] font-medium text-[13px]">
                  ✓ {row.ogonek}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECHNICAL DEEP DIVE ────────────────────────────────────── */}
      <section id="encryption" className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06]">
        <div className="max-w-[840px] mx-auto px-5 sm:px-8 space-y-12">
          <div>
            <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
              1. Свобода выбора: публичность или секретный режим
            </h3>
            <p className="text-[16px] leading-relaxed text-[#86868b]">
              Ты сам решаешь, какой уровень открытости тебе нужен. Ты можешь сделать свой профиль полностью публичным — делиться победами со всем миром, вдохновлять других и участвовать в общих рейтингах. А можешь включить секретный режим: в этом случае тебя никто не сможет найти на платформе через поиск, а твои записи не увидит никто на свете, кроме тех избранных людей, кому ты лично откроешь закрытый доступ.
            </p>
          </div>

          <div>
            <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
              2. Защищённое разграничение доступа
            </h3>
            <p className="text-[16px] leading-relaxed text-[#86868b]">
              Доступ к закрытым записям защищается протоколом <strong className="text-white">Row Level Security (RLS)</strong>. Это означает, что правила проверяются на уровне базы данных: ни один другой пользователь физически не может получить доступ к твоим секретным записям без выданного тобой разрешения.
            </p>
          </div>

          <div>
            <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
              3. Право на забвение и полный контроль
            </h3>
            <p className="text-[16px] leading-relaxed text-[#86868b] mb-4">
              В любой момент в разделе «Настройки → Данные» вы можете нажать одну кнопку, чтобы выгрузить полный архив всех дней в открытом формате JSON, либо нажать «Удалить аккаунт», что моментально и безвозвратно сотрёт весь профиль и все записи.
            </p>
            <div className="p-5 rounded-2xl bg-[#161617] border border-white/10 text-xs text-[#86868b]">
              Вопросы по безопасности и аудиту кода можно направлять на <a href="mailto:security@ogonek.app" className="text-[#2997ff] underline">security@ogonek.app</a>
            </div>
          </div>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
