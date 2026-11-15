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
            <span className="apple-eyebrow !text-[#2997ff]">Манифест Local-First Приватности</span>
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
            <span>Шифрование: Web Crypto 256-bit</span>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ──────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1024px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[640px] mx-auto mb-16">
            <span className="apple-eyebrow block mb-3">Стандарты честности</span>
            <h2 className="apple-section-title mb-4">
              Обычные сервисы vs Огонёк
            </h2>
          </div>

          <div className="apple-card overflow-hidden bg-[#161617] border border-white/10">
            <div className="grid grid-cols-12 p-5 border-b border-white/[0.08] text-xs font-mono text-[#86868b] uppercase tracking-wider">
              <div className="col-span-4 sm:col-span-5">Параметр</div>
              <div className="col-span-4 sm:col-span-3 text-rose-400">Облачные трекеры</div>
              <div className="col-span-4 sm:col-span-4 text-[#2997ff]">Огонёк Local-first</div>
            </div>

            {[
              {
                feature: 'Где хранятся записи',
                cloud: 'На чужом сервере в открытом виде',
                ogonek: 'Только на твоём устройстве (IndexedDB)',
              },
              {
                feature: 'Реклама и трекеры',
                cloud: 'Meta Pixel, Google Analytics, спам',
                ogonek: '0 рекламных трекеров, 0 телеметрии',
              },
              {
                feature: 'Обучение нейросетей',
                cloud: 'Парсинг текстов для LLM моделей',
                ogonek: 'Полный запрет на публичное обучение',
              },
              {
                feature: 'Работа без интернета',
                cloud: 'Блокировка экрана или ошибки сети',
                ogonek: '100% автономная оффлайн работа',
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
      <section id="encryption" className="py-20 sm:py-28 bg-black border-t border-white/[0.06]">
        <div className="max-w-[840px] mx-auto px-5 sm:px-8 space-y-12">
          <div>
            <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
              1. Локальная база данных и криптография
            </h3>
            <p className="text-[16px] leading-relaxed text-[#86868b]">
              Дневник использует аппаратно-ускоренный API <strong className="text-white">Web Crypto</strong> современных браузеров (SHA-256 хэширование паролей и PBKDF2 деривация ключей). Ваши тексты шифруются ключом, который знает только ваше устройство. Даже если физический накопитель попадёт в чужие руки, прочитать записи без мастер-ключа невозможно.
            </p>
          </div>

          <div>
            <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
              2. Row Level Security в облачной синхронизации
            </h3>
            <p className="text-[16px] leading-relaxed text-[#86868b]">
              Если вы добровольно включаете резервное копирование в облако, доступ защищается протоколом <strong className="text-white">PostgreSQL Row Level Security (RLS)</strong>. Это означает, что правила доступа проверяются на уровне ядра базы: ни один другой пользователь физически не может отправить запрос к чужим приватным таблицам.
            </p>
          </div>

          <div>
            <h3 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] mb-4 tracking-tight">
              3. Право на забвение и полный контроль
            </h3>
            <p className="text-[16px] leading-relaxed text-[#86868b] mb-4">
              В любой момент в разделе «Настройки → Данные» вы можете нажать одну кнопку, чтобы выгрузить полный архив всех дней в открытом формате JSON, либо нажать «Удалить аккаунт», что моментально и безвозвратно сотрёт все локальные ключи и записи.
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
