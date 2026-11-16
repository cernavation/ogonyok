'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

interface FAQItem {
  q: string
  a: string
  category: 'account' | 'diary' | 'privacy' | 'sync'
}

const FAQ_LIST: FAQItem[] = [
  {
    category: 'account',
    q: 'Что делать, если я забыл пароль?',
    a: 'В Priday вы сами управляете доступом: вы можете восстановить вход через привязанный e-mail или аккаунт Google, либо восстановить летопись из резервной копии JSON в один клик.',
  },
  {
    category: 'diary',
    q: 'Что происходит, если я пропустил один вечер и не сделал запись?',
    a: 'Ничего страшного не происходит. В Priday действует правило истинной летописи: ваш стрик считает количество закрытых дней силы, а не календарные сутки подряд. Накопленные дни не сгорают при пропуске. Вы продолжаете вести дневник с того же дня, без чувства вины.',
  },
  {
    category: 'diary',
    q: 'Как правильно формулировать победы дня?',
    a: 'Главное правило — факты, а не настроение. Записывайте реальные завершённые действия: «Пробежал 5 км под дождём», «Закрыл сложный тикет без споров», «Спокойно поговорил с близким». Избегайте общих фраз вроде «Был хорошим человеком». Конкретика формирует уверенность.',
  },
  {
    category: 'privacy',
    q: 'Кто может видеть мои записи и фотографии?',
    a: 'Ты сам полностью управляешь видимостью: ты можешь сделать профиль публичным и делиться победами со всем миром, а можешь включить секретный режим — тогда тебя никто не найдёт на платформе, а твои записи не увидит никто, кроме тех, кому ты лично разрешишь доступ.',
  },
  {
    category: 'privacy',
    q: 'Есть ли в приложении реклама или скрытая аналитика?',
    a: 'Нет. В Priday нет рекламных пикселей, сторонних трекеров активности и продажи данных. Это осознанная позиция проекта: персональный дневник силы должен оставаться священным пространством.',
  },
  {
    category: 'sync',
    q: 'Как перенести данные на новый телефон или ноутбук?',
    a: 'Вы можете в любой момент зайти в Настройки → Экспорт данных и скачать файл резервной копии, либо подключить синхронизацию базы данных через ваш защищённый профиль.',
  },
  {
    category: 'sync',
    q: 'Работает ли Priday без доступа к интернету?',
    a: 'Да, на 100%. Вы можете писать записи в самолёте, в горах или в метро. Приложение сохранит всё и синхронизирует статус, как только появится сеть.',
  },
]

export default function SupportPage() {
  const containerRef = useScrollReveal()
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ticketSent, setTicketSent] = useState(false)
  const [ticketForm, setTicketForm] = useState({ name: '', email: '', message: '' })

  const filteredFaq = FAQ_LIST.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketForm.message.trim()) return
    setTicketSent(true)
  }

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-5 sm:px-8 bg-black text-center overflow-hidden">
        {/* Soft Amber Glow */}
        <div className="apple-ambient-orb w-[600px] h-[600px] bg-[#0071e3] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />

        <div className="relative z-10 max-w-[840px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2997ff" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="apple-eyebrow !text-[#2997ff]">Центр заботы Priday</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-5 sm:mb-6">
            Чем мы можем помочь?
          </h1>

          <p className="apple-body fade-up delay-250 max-w-[620px] mb-8 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            Ответы на популярные вопросы о приватности, вечернем ритуале и прямая связь с основателем и командой поддержки.
          </p>

          {/* Search bar */}
          <div className="w-full max-w-lg mx-auto relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по базе знаний (пароль, стрик, приватность)..."
              className="w-full h-13 px-5 pl-12 rounded-full bg-[#161617] border border-white/10 text-white placeholder-[#86868b] text-[15px] focus:outline-none focus:border-[#0071e3] transition-all shadow-xl"
            />
            <svg
              className="absolute left-4.5 top-1/2 -translate-y-1/2 text-[#86868b]"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── SYSTEM STATUS MONITOR ─────────────────────────────────── */}
      <section id="status" className="py-6 bg-[#0f0f11] border-y border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#86868b]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[#f5f5f7] font-semibold">Все системы работают в штатном режиме</span>
            </div>
            <div className="flex items-center gap-6">
              <span>Приватность: <strong className="text-emerald-400">Публично / Секретно</strong></span>
              <span>Zero-Training: <strong className="text-emerald-400">Active</strong></span>
              <span>P2P Audio/Video: <strong className="text-emerald-400">Operational</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e]">
        <div className="max-w-[840px] mx-auto px-5 sm:px-8">
          <div className="mb-12">
            <span className="apple-eyebrow block mb-3">База знаний</span>
            <h2 className="text-[32px] sm:text-[40px] font-bold text-[#f5f5f7] tracking-tight">
              Часто задаваемые вопросы
            </h2>
          </div>

          <div className="space-y-4">
            {filteredFaq.map((item, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div
                  key={idx}
                  className="apple-card overflow-hidden bg-[#161617] border border-white/[0.08] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer border-none bg-transparent"
                  >
                    <span className="text-[17px] font-semibold text-[#f5f5f7] tracking-tight">
                      {item.q}
                    </span>
                    <span
                      className={`w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 text-[#a1a1a6] transition-transform duration-300 ${
                        isOpen ? 'rotate-180 bg-white/15 text-white' : ''
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-0 text-[15px] leading-relaxed text-[#86868b] border-t border-white/[0.04]">
                      <div className="pt-4">{item.a}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── DIRECT CONTACT STAGE ───────────────────────────────────── */}
      <section id="contact" className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left: Contact Options */}
            <div className="lg:col-span-5">
              <span className="apple-eyebrow block mb-3">Прямая связь</span>
              <h2 className="text-[32px] sm:text-[40px] font-bold text-[#f5f5f7] mb-5 tracking-tight leading-tight">
                Мы всегда рядом, чтобы поддержать.
              </h2>
              <p className="apple-body mb-8 text-[#86868b] text-[15px] leading-relaxed">
                Если у вас возник вопрос по работе дневника, предложение по новым функциям или вы хотите поделиться своей историей побед — напишите нам напрямую.
              </p>

              <div className="space-y-4">
                <a
                  href="https://t.me/cernavation"
                  target="_blank"
                  rel="noreferrer"
                  className="apple-card p-5 bg-[#161617] hover:border-[#0071e3]/50 flex items-center gap-4 transition-all block group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#2997ff] shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-[#f5f5f7] group-hover:text-[#2997ff] transition-colors">
                      Telegram создателя
                    </div>
                    <div className="text-[12px] text-[#86868b]">@cernavation · быстрый ответ</div>
                  </div>
                </a>

                <div className="apple-card p-5 bg-[#161617] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#f5f5f7] shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-[#f5f5f7]">Электронная почта</div>
                    <div className="text-[12px] text-[#86868b]">support@ogonek.app</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Message Form */}
            <div className="lg:col-span-7">
              <div className="apple-card p-8 sm:p-10 bg-[#161617] border border-white/10">
                <h3 className="text-[22px] font-semibold text-[#f5f5f7] mb-2 tracking-tight">
                  Отправить обращение
                </h3>
                <p className="text-[14px] text-[#86868b] mb-6">
                  Мы читаем каждое сообщение и отвечаем в течение 24 часов.
                </p>

                {ticketSent ? (
                  <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-in fade-in duration-300">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                      ✓
                    </div>
                    <div className="text-[17px] font-semibold text-white mb-1">Сообщение отправлено!</div>
                    <p className="text-[13px] text-emerald-200/80 mb-4">
                      Спасибо за обращение. Мы обязательно свяжемся с вами в ближайшее время.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTicketSent(false)
                        setTicketForm({ name: '', email: '', message: '' })
                      }}
                      className="text-xs text-[#2997ff] underline cursor-pointer border-none bg-transparent"
                    >
                      Отправить ещё одно сообщение
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTicketSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#86868b] mb-1.5 font-medium">Ваше имя</label>
                        <input
                          type="text"
                          required
                          value={ticketForm.name}
                          onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                          placeholder="Иван"
                          className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/10 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#0071e3]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#86868b] mb-1.5 font-medium">Email для ответа</label>
                        <input
                          type="email"
                          required
                          value={ticketForm.email}
                          onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                          placeholder="ivan@example.com"
                          className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/10 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#0071e3]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#86868b] mb-1.5 font-medium">Текст вопроса или идеи</label>
                      <textarea
                        required
                        rows={4}
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                        placeholder="Опишите вопрос, с которым столкнулись, или идею по улучшению..."
                        className="w-full p-4 rounded-xl bg-black/40 border border-white/10 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#0071e3] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="apple-btn-primary w-full !py-3 !text-[14px] cursor-pointer"
                    >
                      Отправить сообщение
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
