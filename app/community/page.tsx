'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'

interface GroupCard {
  id: string
  name: string
  category: string
  members: number
  streak: number
  description: string
  rule: string
  badgeColor: string
  tags: string[]
}

const FEATURED_GROUPS: GroupCard[] = [
  {
    id: 'runners',
    name: 'Марафон 42.2 & Утренний бег',
    category: 'Спорт и выносливость',
    members: 78,
    streak: 412,
    description: 'Для тех, кто выходит на асфальт и тропы в любую погоду. Делимся километражем, темпом и подготовкой к стартам.',
    rule: 'Минимум 3 пробежки в неделю с фото-доказательством трекера.',
    badgeColor: '#00c7be',
    tags: ['#Бег', '#Марафон', '#Пульс', '#Дисциплина'],
  },
  {
    id: 'founders',
    name: 'Solo Founders & IT Builders',
    category: 'Бизнес и продукты',
    members: 124,
    streak: 580,
    description: 'Инди-хакеры, разработчики и создатели сервисов. Никаких пустых разговоров — только закрытые спринты, фичи и выручка.',
    rule: '1 твёрдый факт продуктовой разработки каждый рабочий вечер.',
    badgeColor: '#2997ff',
    tags: ['#IT', '#Стартап', '#Код', '#Релизы'],
  },
  {
    id: 'earlybirds',
    name: 'Клуб 05:30 (Первый час силы)',
    category: 'Режим и энергия',
    members: 260,
    streak: 740,
    description: 'Участники, которые забирают победу в первый час суток. Пробежка, холодный душ и чтение до открытия рабочих мессенджеров.',
    rule: 'Фиксация пробуждения до 06:00 в утреннем фокусе дня.',
    badgeColor: '#f56900',
    tags: ['#РаннийПодъем', '#Режим', '#Утро', '#Энергия'],
  },
  {
    id: 'readers',
    name: 'Глубокое чтение & Мышление',
    category: 'Интеллект и книги',
    members: 94,
    streak: 320,
    description: 'Антидот от клипового мышления и рилсов. 30–50 страниц сложной литературы в день с конспектом ключевых инсайтов.',
    rule: '1 выписанная и осмысленная мысль в дневник каждый день.',
    badgeColor: '#8668ff',
    tags: ['#Книги', '#Философия', '#Интеллект'],
  },
  {
    id: 'health',
    name: 'Железный ЗОЖ & Без сахара',
    category: 'Здоровье и тело',
    members: 142,
    streak: 290,
    description: 'Чистый рацион, отказ от алкоголя и сахара, регулярный силовой тренинг и восстановление нервной системы.',
    rule: 'Честная фиксация соблазнов и их преодоления в летописи.',
    badgeColor: '#30d158',
    tags: ['#ЗОЖ', '#БезСахара', '#Сон', '#Здоровье'],
  },
]

const STORY_PREVIEWS = [
  {
    theme: 'Тёплый уголь',
    bg: 'from-[#2a1206] to-[#7a2f0c]',
    accent: '#ffa600',
    name: 'Алексей Р.',
    streak: 184,
    city: 'Кишинёв',
    pride: 'Шёл холодный дождь, мозг умолял остаться дома. Пробежал 10.2 км в темпе 5:08. Чистая победа воли.',
    overcome: '8.9★',
    tag: '#Бег',
  },
  {
    theme: 'Глубокий космос',
    bg: 'from-[#0a1420] to-[#123a5a]',
    accent: '#66ffd9',
    name: 'Дмитрий В.',
    streak: 312,
    city: 'Бухарест',
    pride: 'Закрыл архитектуру WebSocket-шлюза без единой утечки памяти. Релиз выкачен в прод.',
    overcome: '9.4★',
    tag: '#IT',
  },
  {
    theme: 'Лес силы',
    bg: 'from-[#0a1a10] to-[#14532d]',
    accent: '#4ade80',
    name: 'Елена М.',
    streak: 92,
    city: 'Вена',
    pride: 'Убрала телефон в сейф на 4 часа. Провели вечер с детьми за настольной игрой в полной тишине.',
    overcome: '8.6★',
    tag: '#Семья',
  },
  {
    theme: 'Закатный огонь',
    bg: 'from-[#240a17] to-[#6b1846]',
    accent: '#f91880',
    name: 'Михаил Т.',
    streak: 240,
    city: 'Берлин',
    pride: '30 дней полного отказа от сахара и алкоголя. Энергия на максимуме, ясный сон.',
    overcome: '9.0★',
    tag: '#ЗОЖ',
  },
]

export default function CommunityPage() {
  const containerRef = useScrollReveal()
  const [selectedStory, setSelectedStory] = useState(0)
  const [activeFilter, setActiveFilter] = useState('all')

  const currentStory = STORY_PREVIEWS[selectedStory]

  const filteredGroups = activeFilter === 'all'
    ? FEATURED_GROUPS
    : FEATURED_GROUPS.filter((g) => g.tags.some((t) => t.toLowerCase().includes(activeFilter.toLowerCase())))

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex flex-col justify-start sm:justify-center items-center text-center pt-24 sm:pt-36 pb-16 sm:pb-24 px-5 sm:px-8 overflow-hidden bg-black">
        {/* Ambient Halo Glow */}
        <div className="apple-ambient-orb w-[640px] h-[640px] bg-[#f56900] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-15" />
        <div className="apple-ambient-orb w-[450px] h-[450px] bg-[#f91880] top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 -z-0 opacity-10" />

        <div className="relative z-10 max-w-[1040px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                stroke="#f56900"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="apple-eyebrow !text-[#f56900]">Круг силы Priday</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-75 mb-6 max-w-[980px]">
            Окружение, которое
            <br />
            <span className="apple-shimmer-text">тянет тебя наверх.</span>
          </h1>

          <p className="apple-body fade-up delay-150 max-w-[720px] mb-10 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
            В одиночку дисциплина рано или поздно ломается об усталость. В «Priday» нет алгоритмической ленты с бессмысленным скроллом — здесь собираются люди дела. Находи единомышленников по хобби, объединяйся в группы и делись сторис настоящих побед.
          </p>

          <div className="fade-scale delay-200 flex items-center justify-center gap-3.5 sm:gap-4 flex-wrap mb-12">
            <Link href="/register" className="apple-btn-primary !px-8 !py-3.5 !text-[15px]">
              Найти напарника по целям →
            </Link>
            <a href="#groups" className="apple-btn-ghost !px-6 !py-3.5 !text-[15px]">
              Клубы по интересам ↓
            </a>
            <a href="#stories" className="apple-btn-ghost !px-6 !py-3.5 !text-[15px]">
              Как работают сторис ↓
            </a>
          </div>

          {/* Social Proof Metric Trio */}
          <div className="fade-up delay-250 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-[840px]">
            <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 text-center">
              <span className="text-[28px] font-bold text-white font-mono block">126+</span>
              <span className="text-xs text-[#86868b] uppercase tracking-wider font-mono">Практиков в строю</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 text-center">
              <span className="text-[28px] font-bold text-[#00c7be] font-mono block">0%</span>
              <span className="text-xs text-[#86868b] uppercase tracking-wider font-mono">Рекламы и спама</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#141416] border border-white/10 text-center">
              <span className="text-[28px] font-bold text-[#f56900] font-mono block">740 дн.</span>
              <span className="text-xs text-[#86868b] uppercase tracking-wider font-mono">Максимальный стрик</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: ПОИСК ЕДИНОМЫШЛЕННИКОВ ПО ХОББИ ──────────────── */}
      <section id="search" className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[780px] mx-auto mb-16 sm:mb-20">
            <span className="apple-eyebrow fade-up block mb-4 !text-[#2997ff]">Умный поиск напарников</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              Как найти друзей по общим интересам?
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              В Priday действует закрытый социальный граф. Ты находишь не случайных френдов для лайков, а напарников по подотчётности (accountability partners), которые разделяют твои ценности.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Pillar 1 */}
            <div className="apple-card p-8 bg-[#161617] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-bold text-white mb-3 tracking-tight">
                  1. Поиск по #тегам хобби
                </h3>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Ищи людей по сферам жизни: #Бег, #IT, #Бизнес, #СиловойСпорт, #Книги, #РаннийПодъем, #Языки. Алгоритм показывает пользователей с подтверждёнными реальными победами в этих направлениях.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-[12px] font-mono text-[#2997ff]">
                ФИЛЬТРАЦИЯ ПО ДЕЛАМ
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="apple-card p-8 bg-[#161617] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#00c7be]/15 border border-[#00c7be]/30 flex items-center justify-center text-[#00c7be] mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-bold text-white mb-3 tracking-tight">
                  2. Персональная инвайт-ссылка
                </h3>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Поделись своей уникальной ссылкой <code className="text-white bg-white/10 px-2 py-0.5 rounded text-xs">ogonek.app/invite/твой_ник</code> со своим другом, супругом или бизнес-партнером, чтобы держать стрик плечом к плечу.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-[12px] font-mono text-[#00c7be]">
                ПАРТНЁР ПО ДИСЦИПЛИНЕ
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="apple-card p-8 bg-[#161617] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#f56900]/15 border border-[#f56900]/30 flex items-center justify-center text-[#f56900] mb-6">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-bold text-white mb-3 tracking-tight">
                  3. Парный огонёк (Duo Streak)
                </h3>
                <p className="text-[14px] text-[#86868b] leading-relaxed">
                  Когда вы оба закрываете день в летописи, ваш общий огонёк дружбы растёт. Пропустить вечер стыдно перед напарником — это мощнейший психологический барьер от лени.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-[12px] font-mono text-[#f56900]">
                ВЗАИМНАЯ ОТВЕТСТВЕННОСТЬ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: ГРУППЫ И КРУГИ СИЛЫ ─────────────────────────── */}
      <section id="groups" className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[800px] mx-auto mb-16 sm:mb-20">
            <span className="apple-eyebrow fade-up block mb-4 !text-[#f56900]">Клубы по направлениям</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              Группы, где нет флуда — только факты.
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              Это не чаты с бесконечными стикерами и токсичными спорами. В группах Priday участники объединяются вокруг конкретной цели и подтверждают действия каждый день.
            </p>

            {/* Quick Filter Bar */}
            <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
              {['all', 'Бег', 'IT', 'Утро', 'Книги', 'ЗОЖ'].map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setActiveFilter(filterKey)}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    activeFilter === filterKey
                      ? 'bg-white text-black font-bold shadow'
                      : 'bg-white/[0.06] text-[#86868b] hover:text-white'
                  }`}
                >
                  {filterKey === 'all' ? 'Все клубы' : `#${filterKey}`}
                </button>
              ))}
            </div>
          </div>

          {/* Groups Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="apple-card apple-card-hover p-7 sm:p-8 bg-[#141416] border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={{
                        backgroundColor: `${group.badgeColor}15`,
                        color: group.badgeColor,
                        border: `1px solid ${group.badgeColor}30`,
                      }}
                    >
                      {group.category}
                    </span>
                    <span className="text-xs font-mono text-[#86868b]">
                      🔥 Стрик {group.streak} дн.
                    </span>
                  </div>

                  <h3 className="text-[20px] font-bold text-white mb-2 tracking-tight">
                    {group.name}
                  </h3>

                  <p className="text-[14px] text-[#86868b] mb-4 leading-relaxed">
                    {group.description}
                  </p>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 mb-4 text-[12px] text-[#a1a1a6]">
                    <span className="text-white font-medium block mb-1">Правило вступления:</span>
                    {group.rule}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-5">
                    {group.tags.map((tag) => (
                      <span key={tag} className="text-[11px] font-mono text-[#86868b] bg-white/[0.04] px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-[#86868b]">
                      Участников: <strong>{group.members}</strong>
                    </span>
                    <Link
                      href="/register"
                      className="text-[13px] font-medium text-[#2997ff] hover:text-[#0071e3] transition-colors inline-flex items-center gap-1"
                    >
                      <span>Вступить в клуб</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Create Group Banner */}
          <div className="p-8 rounded-[24px] bg-[#161617] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs font-mono text-[#00c7be] uppercase tracking-wider block mb-1">
                ЛИЧНЫЙ КЛУБ
              </span>
              <h4 className="text-[20px] font-bold text-white mb-1">
                Хочешь создать группу для своей команды или друзей?
              </h4>
              <p className="text-[14px] text-[#86868b] max-w-[680px]">
                В Priday можно создать закрытый круг силы со своими правилами, минимальным уровнем (1–5) и совместной статистикой побед.
              </p>
            </div>
            <Link
              href="/register"
              className="apple-btn-secondary !px-6 !py-3 !text-[14px] whitespace-nowrap shrink-0"
            >
              Создать круг силы →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: СТОРИС ПОБЕД (КАК СОЗДАВАТЬ И ПУБЛИКОВАТЬ) ──── */}
      <section id="stories" className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-[780px] mx-auto mb-16 sm:mb-20">
            <span className="apple-eyebrow fade-up block mb-4 !text-[#f91880]">Сторис в Priday</span>
            <h2 className="apple-section-title fade-up delay-75 mb-6">
              Сторис побед, а не фальшивого успеха.
            </h2>
            <p className="apple-body fade-up delay-100 text-[#86868b] text-[17px] sm:text-[19px] leading-relaxed">
              В Priday сторис создаются прямо из вечерней летописи в один клик. Это честный отчёт дня с доказательством, оценкой преодоления и счётчиком непрерывного стрика.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Interactive Phone Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[340px] aspect-[9/18] rounded-[44px] p-3.5 bg-[#1a1a1c] border-4 border-white/20 shadow-[0_24px_80px_rgba(0,0,0,0.9)] relative flex flex-col justify-between overflow-hidden">
                {/* Dynamic Story Canvas Background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${currentStory.bg} transition-all duration-500 z-0`}
                />

                {/* Top Story Header */}
                <div className="relative z-10 pt-4 px-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-xs text-white">
                      {currentStory.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
                        <span>{currentStory.name}</span>
                        <span className="text-[10px] text-amber-300">🔥 {currentStory.streak} дн.</span>
                      </div>
                      <span className="text-[10px] text-white/70 block">{currentStory.city} · 2 ч. назад</span>
                    </div>
                  </div>

                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-black/40 text-white border border-white/20"
                    style={{ color: currentStory.accent }}
                  >
                    {currentStory.overcome}
                  </span>
                </div>

                {/* Center Pride Quote */}
                <div className="relative z-10 px-5 py-6 my-auto text-center">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-white/60 block mb-3">
                    ГОРДОСТЬ ДНЯ {currentStory.tag}
                  </span>
                  <p className="text-[17px] font-medium text-white leading-relaxed drop-shadow-md">
                    «{currentStory.pride}»
                  </p>
                </div>

                {/* Bottom Reactions & Proof Badge */}
                <div className="relative z-10 pb-4 px-4">
                  <div className="p-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs text-white/90">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">🔥 24</span>
                      <span className="text-emerald-400">⚡ 18</span>
                      <span className="text-blue-400">👏 12</span>
                    </div>
                    <span className="text-[11px] font-mono text-white/60">Verified Priday</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Feature Breakdown & Theme Switcher */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-mono text-[#f56900] uppercase tracking-wider block mb-2">
                  КЛИКНИ И ВЫБЕРИ СТИЛЬ СТОРИС:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {STORY_PREVIEWS.map((st, i) => (
                    <button
                      key={st.theme}
                      type="button"
                      onClick={() => setSelectedStory(i)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedStory === i
                          ? 'border-white bg-white/10 shadow-md'
                          : 'border-white/10 bg-[#161617] hover:border-white/30'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full mb-2"
                        style={{ backgroundColor: st.accent }}
                      />
                      <span className="text-xs font-semibold text-white block truncate">
                        {st.theme}
                      </span>
                      <span className="text-[11px] text-[#86868b]">{st.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#00c7be]/15 text-[#00c7be] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-white mb-1">
                      Публикация в 1 клик прямо из ритуала
                    </h4>
                    <p className="text-[13px] text-[#86868b] leading-relaxed">
                      После закрытия дня в модальном окне появляется кнопка «Поделиться в сторис». Не нужно ничего верстать в сторонних редакторах.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2997ff]/15 text-[#2997ff] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-white mb-1">
                      Evidence Vault: реальные фото-доказательства
                    </h4>
                    <p className="text-[13px] text-[#86868b] leading-relaxed">
                      Прикрепи фото из своего Сейфа Доказательств (скриншот трекера, страницу книги, подписанный акт или фото кроссовок в грязи).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#f56900]/15 text-[#f56900] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-[16px] font-semibold text-white mb-1">
                      24 часа жизни — только живой ритм
                    </h4>
                    <p className="text-[13px] text-[#86868b] leading-relaxed">
                      Сторис исчезает через 24 часа. Здесь важен твой сегодняшний огонь, а не пыльный архив полугодовой давности.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: ЗАШИФРОВАННЫЕ ЧАТЫ И P2P СОЗВОНЫ ─────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-black border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <span className="apple-eyebrow block mb-4 !text-[#00c7be]">Приватный мессенджер</span>
              <h2 className="apple-section-title mb-6">
                Зашифрованные чаты и P2P созвоны без слежки.
              </h2>
              <p className="apple-body mb-6 text-[#86868b] text-[17px] leading-relaxed">
                В Priday встроен полноценный мессенджер с технологией WebRTC. Голосовые и видеосозвоны идут напрямую между вашими устройствами (Peer-to-Peer), минуя центральные серверы корпораций.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#141416] border border-white/5">
                  <h4 className="text-[15px] font-semibold text-white mb-1">
                    🎙️ Голосовые с авто-транскрипцией
                  </h4>
                  <p className="text-[13px] text-[#86868b]">
                    Нейросеть мгновенно расшифровывает голосовые сообщения в текст.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#141416] border border-white/5">
                  <h4 className="text-[15px] font-semibold text-white mb-1">
                    🔒 Секретный или публичный режим
                  </h4>
                  <p className="text-[13px] text-[#86868b]">
                    Ты сам решаешь, кто видит диалог: полный приват без индексации в поиске или открытый профиль.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="p-8 rounded-[28px] bg-gradient-to-b from-[#18181b] to-[#101012] border border-white/10 shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-[#00c7be]/15 border border-[#00c7be]/30 flex items-center justify-center text-[#00c7be] mx-auto mb-5">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <h4 className="text-[20px] font-bold text-white mb-2">
                  Безлимитные P2P звонки
                </h4>
                <p className="text-[14px] text-[#86868b] mb-6">
                  Созванивайся с напарником по целям, проводи утренние чек-ины и поддерживайте огонь без ограничений.
                </p>
                <Link
                  href="/register"
                  className="apple-btn-primary w-full !py-3 !text-[14px] block text-center"
                >
                  Открыть доступ к мессенджеру →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL BANNER ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 bg-[#0c0c0e] border-t border-white/[0.06] text-center">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8">
          <h2 className="apple-hero-title mb-5 sm:mb-6 !text-[36px] sm:!text-[48px]">
            Вместе гордиться легче.
          </h2>
          <p className="apple-body max-w-[540px] mx-auto mb-8 text-[#86868b] text-[17px]">
            Найди напарника, вступи в свой первый клуб силы и начни путь к несокрушимой дисциплине.
          </p>
          <Link
            href="/register"
            className="apple-btn-primary !px-9 !py-4 !text-[15px] !font-semibold shadow-[0_0_35px_rgba(245,105,0,0.6)] !bg-[#f56900] hover:!bg-[#e05f00]"
          >
            Присоединиться к сообществу →
          </Link>
        </div>
      </section>

      <AppleFooter />
    </div>
  )
}
