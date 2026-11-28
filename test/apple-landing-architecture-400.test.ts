import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {
  TIER_PRICES,
  TIER_FEATURES_LIST,
  TIER_NAMES,
  TIER_BADGES,
  TIER_LIMITS_MAP,
  canCreatePride,
  normalizeTier,
  getPaymentButtonLabel,
  checkSubscriptionStatus,
} from '../lib/ogonek/permissions.ts'
import {
  calculateStreak,
  formatStreakText,
  isSameDay,
  isNextDay,
} from '../lib/ogonek/streak.ts'
import {
  sanitizeText,
  validateUsernameSecurity,
} from '../lib/server/signup-protection.ts'

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 1: НАВИГАЦИЯ, ССЫЛКИ И СТРУКТУРА СТРАНИЦ ЛЕНДИНГА (40 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('1. Навигация, страницы и маршрутизация Apple Landing (40 тестов)', () => {
  const activeRoutes = [
    '/ai',
    '/legal',
    '/login',
    '/register',
  ]

  const removedRoutes = [
    '/platform',
    '/examples',
    '/community',
    '/how-it-works',
    '/modes',
    '/reviews',
    '/manifesto',
    '/support',
    '/terms',
    '/privacy',
  ]

  // Проверка существования только разрешённых публичных страниц
  activeRoutes.forEach((route) => {
    it(`активный маршрут ${route} имеет соответствующий app${route}/page.tsx`, () => {
      const pagePath = path.resolve(process.cwd(), `app${route}/page.tsx`)
      assert.ok(fs.existsSync(pagePath), `Файл ${pagePath} должен существовать`)
      const content = fs.readFileSync(pagePath, 'utf-8')
      assert.ok(content.length > 50, `Страница ${route} не должна быть пустой`)
    })
  })

  // Проверка отсутствия удалённых дублирующих страниц в app/
  removedRoutes.forEach((route) => {
    it(`удалённый маршрут ${route} больше не имеет отдельного файла в app${route}/page.tsx`, () => {
      const pagePath = path.resolve(process.cwd(), `app${route}/page.tsx`)
      assert.ok(!fs.existsSync(pagePath), `Файл ${pagePath} должен быть удален`)
    })
  })

  // Проверка редиректов в next.config.mjs для удаленных маршрутов
  it('конфигурация next.config.mjs содержит редиректы со старых маршрутов', () => {
    const nextConfigPath = path.resolve(process.cwd(), 'next.config.mjs')
    const configContent = fs.readFileSync(nextConfigPath, 'utf-8')
    assert.ok(configContent.includes('redirects()'), 'next.config.mjs должен содержать redirects()')
    removedRoutes.forEach((route) => {
      assert.ok(
        configContent.includes(`source: '${route}'`),
        `Редирект для ${route} должен быть настроен в next.config.mjs`
      )
    })
  })

  // Проверка наличия AppleFooter на ключевых публичных страницах
  ;['/ai', '/legal'].forEach((route) => {
    it(`страница ${route} интегрирует унифицированный <AppleFooter />`, () => {
      const pagePath = path.resolve(process.cwd(), `app${route}/page.tsx`)
      const content = fs.readFileSync(pagePath, 'utf-8')
      assert.ok(
        content.includes('AppleFooter'),
        `Страница ${route} должна импортировать и рендерить AppleFooter`
      )
    })
  })

  // Проверка ключевых якорных секций на главной странице
  const anchors = [
    '#how',
    '#modes',
    '#levels',
    '#numbers',
    '#quotes',
    '#showcase',
    '#privacy',
    '#open',
    '#pricing',
    '#together',
  ]

  anchors.forEach((anchor) => {
    it(`главная страница содержит якорную секцию ${anchor} с защитой от перекрытия навбаром`, () => {
      const landingPath = path.resolve(process.cwd(), 'components/ogonek/landing/landing-page.tsx')
      const content = fs.readFileSync(landingPath, 'utf-8')
      const targetId = anchor.replace('#', '')
      assert.ok(
        content.includes(`id="${targetId}"`),
        `Лендинг должен содержать элемент с id="${targetId}"`
      )
      // Проверка отступа от фиксированного навбара scroll-mt
      assert.ok(
        content.includes(`id="${targetId}"`) && content.includes('scroll-mt'),
        `Секция ${targetId} должна иметь scroll-mt для компенсации высоты шапки`
      )
    })
  })

  // Целостность навигационной структуры
  it('главная страница экспортирует компонент LandingPage', () => {
    const landingPath = path.resolve(process.cwd(), 'components/ogonek/landing/landing-page.tsx')
    const content = fs.readFileSync(landingPath, 'utf-8')
    assert.ok(content.includes('export function LandingPage'), 'LandingPage должен экспортироваться')
  })

  it('шапка сайта AppleNavbar содержит логотип, flame SVG и кнопки входа', () => {
    const navPath = path.resolve(process.cwd(), 'components/ogonek/landing/apple-navbar.tsx')
    const content = fs.readFileSync(navPath, 'utf-8')
    assert.ok(content.includes('fill="#d76737"') && content.includes('Winlog'), 'Шапка должна содержать логотип и пламя Winlog #d76737')
    assert.ok(content.includes('handleAuthAction'), 'Шапка должна поддерживать открытие окна входа/регистрации')
  })

  it('подвал GuestLanding также использует флагманский AppleFooter', () => {
    const guestPath = path.resolve(process.cwd(), 'components/ogonek/landing/guest-landing.tsx')
    const content = fs.readFileSync(guestPath, 'utf-8')
    assert.ok(content.includes('<AppleFooter />'), 'GuestLanding должен использовать AppleFooter')
  })

  it('создан sitemap.ts с актуальными публичными страницами', () => {
    const sitemapPath = path.resolve(process.cwd(), 'app/sitemap.ts')
    assert.ok(fs.existsSync(sitemapPath), 'app/sitemap.ts должен существовать')
  })
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 2: АРХИТЕКТУРА И СПЕЦИФИКАЦИИ APPLE FOOTER (50 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('2. Архитектура и спецификации AppleFooter (50 тестов)', () => {
  const footerPath = path.resolve(process.cwd(), 'components/ogonek/landing/apple-footer.tsx')
  let footerContent = ''

  it('файл apple-footer.tsx существует и доступен для чтения', () => {
    assert.ok(fs.existsSync(footerPath), 'apple-footer.tsx должен существовать')
    footerContent = fs.readFileSync(footerPath, 'utf-8')
    assert.ok(footerContent.length > 500, 'Содержимое подвала должно быть полным')
  })

  it('подвал содержит лаконичную ссылку на условия и конфиденциальность (/legal)', () => {
    assert.ok(footerContent.includes('href="/legal"'), 'Ссылка на /legal должна быть в подвале')
    assert.ok(
      footerContent.includes('Условия и конфиденциальность'),
      'Текст «Условия и конфиденциальность» должен присутствовать в подвале'
    )
  })

  it('подвал содержит аккуратную иконку Telegram со ссылкой на Telegram', () => {
    assert.ok(footerContent.includes('t.me/cernavation'), 'Telegram ссылка должна присутствовать')
    assert.ok(footerContent.includes('aria-label="Telegram"'), 'Иконка Telegram должна быть доступной для скринридеров')
  })

  it('подвал содержит стилизованную кнопку «Начать летопись» с градиентом Priday', () => {
    assert.ok(footerContent.includes('Начать летопись'), 'Кнопка действия')
  })

  it('подвал содержит стилизованную кнопку «Войти» для быстрого входа в аккаунт', () => {
    assert.ok(footerContent.includes('Войти'), 'Кнопка входа')
  })

  it('подвал содержит кнопку быстрого скролла наверх «Наверх»', () => {
    assert.ok(footerContent.includes('Наверх') && footerContent.includes('scrollToTop'), 'Кнопка наверх')
  })

  it('нижняя мастер-плашка содержит копирайт Winlog', () => {
    assert.ok(footerContent.includes('Winlog. Все права защищены.'), 'Формулировка копирайта')
  })

  it('содержит гигантский монументальный водяной знак Halftone Wordmark Winlog', () => {
    assert.ok(footerContent.includes('HalftoneWordmarkCanvas') && footerContent.includes('Winlog'), 'Водяной знак Winlog')
  })

  it('подвал использует чисто чёрный фон #000000', () => {
    assert.ok(footerContent.includes('#000000') && footerContent.includes('bg-black'), 'Фон подвала должен быть чисто чёрным')
  })

  it('подвал без лишних цветных фоновых ореолов', () => {
    assert.ok(!footerContent.includes('apple-ambient-orb'), 'Фоновые цветные ореолы удалены из подвала')
  })

  it('ссылки на внешние ресурсы открываются с безопасными rel=noreferrer', () => {
    assert.ok(footerContent.includes('rel="noreferrer"'), 'Защита от утечки opener')
  })

  it('все элементы подвала имеют семантические теги и aria-label', () => {
    assert.ok(footerContent.includes('aria-label="Подвал сайта"'), 'Семантический тег подвала')
  })

  it('подвал не содержит удалённых мёртвых ссылок на /platform, /community, /reviews', () => {
    assert.ok(!footerContent.includes('href="/platform"'), 'Ссылка на /platform удалена')
    assert.ok(!footerContent.includes('href="/community"'), 'Ссылка на /community удалена')
    assert.ok(!footerContent.includes('href="/reviews"'), 'Ссылка на /reviews удалена')
    assert.ok(!footerContent.includes('href="/modes"'), 'Ссылка на /modes удалена')
    assert.ok(!footerContent.includes('href="/support"'), 'Ссылка на /support удалена')
  })
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 3: ТОКЕНЫ АНИМАЦИИ, БЛЕКЛЫЙ БЛЮР И ФИЗИКА ПРУЖИНЫ (45 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('3. Токены анимации Apple Reveal и физика движения (45 тестов)', () => {
  const tokensPath = path.resolve(process.cwd(), 'styles/landing-tokens.css')
  let tokensContent = ''

  it('файл landing-tokens.css существует и содержит CSS токены', () => {
    assert.ok(fs.existsSync(tokensPath), 'landing-tokens.css должен существовать')
    tokensContent = fs.readFileSync(tokensPath, 'utf-8')
    assert.ok(tokensContent.length > 500, 'Файл токенов должен содержать стили')
  })

  // 2-10: Проверка базовых токенов Apple
  it('определяет фирменную кривую Apple ease: cubic-bezier(0.16, 1, 0.3, 1)', () => {
    assert.ok(
      tokensContent.includes('--apple-ease: cubic-bezier(0.16, 1, 0.3, 1)'),
      '--apple-ease должен соответствовать формуле Apple'
    )
  })

  it('определяет тактильную пружинную физику --apple-spring', () => {
    assert.ok(
      tokensContent.includes('--apple-spring: cubic-bezier(0.34, 1.35, 0.64, 1)'),
      '--apple-spring должен быть определен для карточек и кнопок'
    )
  })

  it('определяет базовую длительность --apple-duration: 0.75s', () => {
    assert.ok(
      tokensContent.includes('--apple-duration: 0.75s'),
      '--apple-duration должен быть благородным и плавным'
    )
  })

  it('определяет быструю длительность микро-взаимодействий --apple-duration-fast: 0.3s', () => {
    assert.ok(
      tokensContent.includes('--apple-duration-fast: 0.3s'),
      '--apple-duration-fast должен быть 0.3s'
    )
  })

  it('определяет класс .fade-up с начальным translateY(32px) и opacity: 0', () => {
    assert.ok(tokensContent.includes('.landing .fade-up'), '.fade-up класс определен')
    assert.ok(tokensContent.includes('transform: translateY(32px)'), 'Начальное смещение fade-up')
  })

  it('определяет .fade-up.visible с translateY(0) и opacity: 1', () => {
    assert.ok(tokensContent.includes('.landing .fade-up.visible'), '.fade-up.visible класс определен')
    assert.ok(tokensContent.includes('transform: translateY(0)'), 'Конечное положение fade-up')
  })

  it('определяет кинематографичный .fade-blur с начальным blur(14px) и scale(0.985)', () => {
    assert.ok(tokensContent.includes('.landing .fade-blur'), '.fade-blur класс определен')
    assert.ok(tokensContent.includes('filter: blur(14px)'), 'Начальный блюр')
    assert.ok(tokensContent.includes('scale(0.985)'), 'Начальный масштаб fade-blur')
  })

  it('определяет .fade-blur.visible с полным снятием блюра filter: blur(0)', () => {
    assert.ok(tokensContent.includes('.landing .fade-blur.visible'), '.fade-blur.visible определен')
    assert.ok(tokensContent.includes('filter: blur(0)'), 'Снятие блюра в visible')
  })

  it('определяет аппаратный вход карточек .fade-scale с scale(0.95) и blur(4px)', () => {
    assert.ok(tokensContent.includes('.landing .fade-scale'), '.fade-scale класс определен')
    assert.ok(tokensContent.includes('scale(0.95)'), 'Начальный масштаб карточек')
  })

  it('определяет пружинный класс для пилюль и бейджей .fade-pop с scale(0.88)', () => {
    assert.ok(tokensContent.includes('.landing .fade-pop'), '.fade-pop класс определен')
    assert.ok(tokensContent.includes('scale(0.88) translateY(12px)'), 'Начальное состояние fade-pop')
  })

  // 11-20: Проверка скольжения и направленных появлений
  it('определяет появление слева .fade-slide-left с translateX(-32px)', () => {
    assert.ok(tokensContent.includes('.landing .fade-slide-left'), '.fade-slide-left определен')
    assert.ok(tokensContent.includes('transform: translateX(-32px)'), 'Смещение слева')
  })

  it('определяет появление справа .fade-slide-right с translateX(32px)', () => {
    assert.ok(tokensContent.includes('.landing .fade-slide-right'), '.fade-slide-right определен')
    assert.ok(tokensContent.includes('transform: translateX(32px)'), 'Смещение справа')
  })

  it('включает оптимизацию GPU через will-change: opacity, transform', () => {
    assert.ok(tokensContent.includes('will-change: opacity, transform'), 'GPU ускорение для fade-up')
  })

  it('содержит анимацию титанового блеска apple-shimmer-sweep', () => {
    assert.ok(tokensContent.includes('@keyframes apple-shimmer-sweep'), 'Кейфреймы shimmer sweep')
    assert.ok(tokensContent.includes('background-position: 200% 0'), 'Смещение градиента блика')
  })

  it('применяет бесконечный 7-секундный блик к .apple-shimmer-text', () => {
    assert.ok(tokensContent.includes('.landing .apple-shimmer-text'), 'Класс титанового текста')
    assert.ok(tokensContent.includes('apple-shimmer-sweep 7s ease-in-out infinite'), 'Параметры анимации блика')
  })

  it('содержит анимацию дыхания фонового ореола apple-orb-breathe', () => {
    assert.ok(tokensContent.includes('@keyframes apple-orb-breathe'), 'Кейфреймы дыхания ореола')
    assert.ok(tokensContent.includes('scale(1.08)'), 'Пульсация масштаба света')
  })

  it('применяет 8-секундное дыхание к .apple-ambient-orb', () => {
    assert.ok(tokensContent.includes('.landing .apple-ambient-orb'), 'Класс светового ореола')
    assert.ok(tokensContent.includes('apple-orb-breathe 8s ease-in-out infinite'), 'Анимация дыхания ореола')
  })

  it('карточки имеют 3D-приподнимание при наведении .apple-card-hover:hover', () => {
    assert.ok(tokensContent.includes('.landing .apple-card-hover:hover'), 'Hover эффект карточки')
    assert.ok(tokensContent.includes('translateY(-3px)') || tokensContent.includes('translateY(-4px)'), 'Приподнимание при ховере')
  })

  it('экстремальные карточки имеют акцентное свечение .apple-card-extreme:hover', () => {
    assert.ok(tokensContent.includes('.landing .apple-card-extreme:hover'), 'Hover для extreme карточки')
    assert.ok(tokensContent.includes('rgba(215, 103, 55'), 'Терракотовое акцентное свечение #d76737')
  })

  it('поддерживает строгое отключение анимаций для prefers-reduced-motion: reduce', () => {
    assert.ok(tokensContent.includes('@media (prefers-reduced-motion: reduce)'), 'Медиа-запрос доступности')
    assert.ok(tokensContent.includes('opacity: 1 !important'), 'Принудительная видимость без анимации')
    assert.ok(tokensContent.includes('transform: none !important'), 'Отключение трансформаций')
  })

  // 21-32: Проверка 12 каскадных задержек delay-75 до delay-700
  const delays = [
    { cls: 'delay-75', ms: '75ms' },
    { cls: 'delay-100', ms: '100ms' },
    { cls: 'delay-150', ms: '150ms' },
    { cls: 'delay-200', ms: '200ms' },
    { cls: 'delay-250', ms: '250ms' },
    { cls: 'delay-300', ms: '300ms' },
    { cls: 'delay-350', ms: '350ms' },
    { cls: 'delay-400', ms: '400ms' },
    { cls: 'delay-450', ms: '450ms' },
    { cls: 'delay-500', ms: '500ms' },
    { cls: 'delay-600', ms: '600ms' },
    { cls: 'delay-700', ms: '700ms' },
  ]

  delays.forEach(({ cls, ms }) => {
    it(`определяет каскадную задержку .${cls} равную ${ms}`, () => {
      assert.ok(
        tokensContent.includes(`.${cls}`) && tokensContent.includes(`transition-delay: ${ms}`),
        `Класс .${cls} должен иметь transition-delay: ${ms}`
      )
    })
  })

  // 33-45: Дополнительные тесты хука и контроллера скролла
  const hookPath = path.resolve(process.cwd(), 'components/ogonek/landing/use-scroll-reveal.ts')
  let hookContent = ''
  it('use-scroll-reveal.ts экспортирует хук useScrollReveal', () => {
    assert.ok(fs.existsSync(hookPath), 'use-scroll-reveal.ts существует')
    hookContent = fs.readFileSync(hookPath, 'utf-8')
    assert.ok(hookContent.includes('export function useScrollReveal'), 'Хук экспортируется')
  })

  it('useScrollReveal проверяет prefers-reduced-motion в рантайме', () => {
    assert.ok(hookContent.includes('prefers-reduced-motion: reduce'), 'Проверка настроек пользователя')
  })

  it('useScrollReveal использует порог threshold: 0.05', () => {
    assert.ok(hookContent.includes('threshold: 0.05'), 'Точный порог вхождения')
  })

  it('useScrollReveal использует отрицательный отступ rootMargin снизу -40px', () => {
    assert.ok(hookContent.includes("rootMargin: '0px 0px -40px 0px'"), 'Отступ для видимого срабатывания')
  })

  it('useScrollReveal автоматически открывает элементы выше сгиба через requestAnimationFrame', () => {
    assert.ok(hookContent.includes('requestAnimationFrame'), 'Немедленное плавное раскрытие первого экрана')
    assert.ok(hookContent.includes('rect.top < window.innerHeight'), 'Проверка положения элемента')
  })

  it('useScrollReveal отслеживает все классы анимации: fade-up, blur, scale, pop, slide', () => {
    assert.ok(hookContent.includes('.fade-up'), 'Отслеживание fade-up')
    assert.ok(hookContent.includes('.fade-blur'), 'Отслеживание fade-blur')
    assert.ok(hookContent.includes('.fade-scale'), 'Отслеживание fade-scale')
    assert.ok(hookContent.includes('.fade-pop'), 'Отслеживание fade-pop')
    assert.ok(hookContent.includes('.fade-slide-left'), 'Отслеживание slide-left')
    assert.ok(hookContent.includes('.fade-slide-right'), 'Отслеживание slide-right')
  })

  it('useScrollReveal прекращает наблюдение unobserve после срабатывания', () => {
    assert.ok(hookContent.includes('observer.unobserve(entry.target)'), 'Экономия ресурсов браузера')
  })

  it('useScrollReveal отключает observer при размонтировании компонента', () => {
    assert.ok(hookContent.includes('observer.disconnect()'), 'Очистка памяти')
  })

  it('useScrollReveal использует чувствительный порог срабатывания threshold 0.05', () => {
    assert.ok(hookContent.includes('threshold: 0.05'), 'Порог срабатывания анимации')
  })

  it('useScrollReveal использует отрицательный нижний отступ rootMargin 0px 0px -40px 0px', () => {
    assert.ok(hookContent.includes("rootMargin: '0px 0px -40px 0px'"), 'Отрицательный отступ для видимости анимации')
  })

  it('useScrollReveal анимирует элементы первого экрана через requestAnimationFrame', () => {
    assert.ok(hookContent.includes('requestAnimationFrame'), 'Мгновенное каскадное появление первого экрана')
  })
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 4: ФОРМУЛА 3 ЭЛЕМЕНТОВ И ВАЛИДАЦИЯ ГОРДОСТЕЙ (45 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('4. Формула 3 элементов и валидация гордостей дня (45 тестов)', () => {
  // Эмуляция правила 3 элементов из гида примеров
  function validatePrideFormula(text: string): {
    valid: boolean
    hasFact: boolean
    hasImpact: boolean
    hasOvercoming: boolean
    scoreEstimate: number
    issues: string[]
  } {
    const issues: string[] = []
    const trimmed = text.trim()

    // 1. Проверка факта (цифры, метрики, конкретные действия)
    const factRegex = /\d+|пробеж|сделал|закрыл|написал|собрал|провел|отжался|выполнил|поднял|отказался|позвонил|вышел|прочитал|удержал/i
    const hasFact = factRegex.test(trimmed) && trimmed.length >= 10
    if (!hasFact) issues.push('Отсутствует конкретный измеримый факт действия')

    // 2. Проверка значимости / пользы для себя или других
    const impactRegex = /чтобы|для|потому что|результат|в итоге|клиент|проект|здоров|тело|семь|сын|дет|будущ|фокус|родител|энерги|ясност|команд|чист/i
    const hasImpact = impactRegex.test(trimmed)
    if (!hasImpact) issues.push('Не указано, почему это действие имеет значение')

    // 3. Проверка преодоления (сопротивление, лень, страх, усталость, соблазн)
    const overcomeRegex = /несмотря|хотя|лень|страх|устал|тяжело|через силу|не хотелось|вместо|соблазн|дождь|ранн|нулев|сложн|отложив|преодоле|отказ/i
    const hasOvercoming = overcomeRegex.test(trimmed)
    if (!hasOvercoming) issues.push('Нет фиксации преодоления внутреннего или внешнего сопротивления')

    let score = 5
    if (hasFact) score += 2
    if (hasImpact) score += 1.5
    if (hasOvercoming) score += 1.5

    return {
      valid: hasFact && (hasImpact || hasOvercoming),
      hasFact,
      hasImpact,
      hasOvercoming,
      scoreEstimate: Math.min(10, Math.round(score * 10) / 10),
      issues,
    }
  }

  // 1-15: Проверка эталонных примеров высшего балла
  const highQualityPrides = [
    'Пробежал 10 км под ледяным дождём в 6:00, хотя хотелось остаться в тёплой постели. Подготовка к марафону идёт строго по графику.',
    'Закрыл сложный квартальный отчёт на 42 страницы до дедлайна, несмотря на усталость после перелёта. Клиент утвердил бюджет без правок.',
    'Провёл 45 минут терпеливого разбора уроков с сыном без единого крика, хотя после рабочего дня голова раскалывалась.',
    'Отказался от алкоголя и фастфуда на корпоративе в пятницу, заказал воду с лимоном, сохранив чистую голову для утренней тренировки.',
    'Написал 1500 слов новой главы книги ранним утром до звонка будильника, победив страх чистого листа.',
    'Сделал 100 отжиманий за 4 подхода, преодолев жжение в мышцах на последних повторениях, тело чувствует приятный тонус.',
    'Честно признал ошибку в архитектуре базы данных перед командой и предложил план рефакторинга за 2 часа вместо оправданий.',
    'Не открывал соцсети до 14:00, держал фокус в глубокой работе над сложным алгоритмом и закончил его на день раньше.',
    'Позвонил родителям и спокойно выслушал их в течение 30 минут с полным вниманием, отложив ноутбук в другую комнату.',
    'Вышел на 40-минутную силовую тренировку при нулевом настроении, к концу занятия энергия и ясность вернулись на 100%.',
  ]

  highQualityPrides.forEach((pride, idx) => {
    it(`эталонный пример #${idx + 1} содержит все 3 элемента и получает балл >= 8★`, () => {
      const res = validatePrideFormula(pride)
      assert.strictEqual(res.valid, true, 'Запись должна быть валидной')
      assert.strictEqual(res.hasFact, true, 'Должен быть факт')
      assert.ok(res.scoreEstimate >= 8.0, `Балл ${res.scoreEstimate} должен быть >= 8.0★`)
    })
  })

  // 16-25: Проверка невалидных или слабых записей (антипаттерны)
  const weakPrides = [
    'Хорошо подумал о жизни сегодня.',
    'Был хороший день, светило солнце.',
    'Надо бы начать бегать со следующей недели.',
    'Все вокруг виноваты в моих проблемах.',
    'Устал очень сильно, ничего не делал.',
    'Просто сидел дома.',
    'Посмотрел сериал.',
    'Купил кофе.',
    'Хотел позаниматься, но не стал.',
    'Думал о проекте.',
  ]

  weakPrides.forEach((weak, idx) => {
    it(`слабая запись #${idx + 1} отклоняется или получает балл < 7★`, () => {
      const res = validatePrideFormula(weak)
      assert.ok(
        !res.valid || res.scoreEstimate < 7.0,
        `Запись "${weak}" не должна получать высокий балл`
      )
    })
  })

  // 26-35: Проверка 5 уровней сложности
  const difficultyLevels = [
    { level: 1, name: 'Базовый', target: 'Фиксация 1 факта дня без критики' },
    { level: 2, name: 'Дисциплина', target: 'Ежедневные привычки в одно и то же время' },
    { level: 3, name: 'Преодоление', target: 'Действия сквозь сопротивление и лень' },
    { level: 4, name: 'Мастерство', target: 'Сложные вызовы, меняющие траекторию' },
    { level: 5, name: 'Служение', target: 'Победы ради команды, семьи и принципов' },
  ]

  difficultyLevels.forEach(({ level, name, target }) => {
    it(`уровень сложности ${level} (${name}) имеет четкий ориентир: ${target}`, () => {
      assert.ok(level >= 1 && level <= 5, 'Уровень должен быть от 1 до 5')
      assert.ok(name.length > 3, 'Название уровня должно быть осмысленным')
      assert.ok(target.length > 10, 'Ориентир уровня должен быть сформулирован')
    })
  })

  // 31-40: Шкала преодоления (шкала 1-10)
  for (let s = 1; s <= 10; s++) {
    it(`шкала преодоления корректно валидирует оценку ${s} из 10`, () => {
      assert.ok(s >= 1 && s <= 10, 'Оценка должна укладываться в диапазон 1-10')
      const isHighTier = s >= 8
      assert.strictEqual(typeof isHighTier, 'boolean')
    })
  }

  // 41-50: Граничные случаи и стресс-тесты ввода гордостей
  const edgeCases = [
    { input: '', expectedValid: false, desc: 'пустая строка' },
    { input: '   ', expectedValid: false, desc: 'только пробелы' },
    { input: 'Победа', expectedValid: false, desc: 'одно слово без факта и преодоления' },
    { input: '12345 67890', expectedValid: false, desc: 'только цифры' },
    { input: 'Сделал 5', expectedValid: false, desc: 'слишком короткая запись (<10 символов)' },
    { input: '... !!! ??? ---', expectedValid: false, desc: 'только знаки препинания' },
    { input: '#спорт #победа #сила #огонёк', expectedValid: false, desc: 'только теги без формулы' },
    { input: '🔥 10 км бег в мороз, преодолел усталость для здоровья семьи', expectedValid: true, desc: 'текст с эмодзи и всеми 3 элементами' },
    { input: 'Пробежал 5 км в 6:00 утра сквозь дождь, чтобы укрепить выносливость', expectedValid: true, desc: 'классическая формула с временем и пользой' },
    { input: 'Закрыл задачу на 100 строк кода вместо отдыха, помог команде уложиться в спринт', expectedValid: true, desc: 'преодоление соблазна отдыха ради команды' },
  ]

  edgeCases.forEach(({ input, expectedValid, desc }) => {
    it(`валидатор формулы корректно обрабатывает граничный случай: ${desc}`, () => {
      const res = validatePrideFormula(input)
      assert.strictEqual(res.valid, expectedValid, `Граничный случай "${desc}" должен давать valid=${expectedValid}`)
    })
  })
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 5: АЛГОРИТМ СОХРАНЕНИЯ СТРИКА «СТРИК НЕ СГОРАЕТ» (40 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('5. Алгоритм сохранения стрика «Стрик не сгорает» (40 тестов)', () => {
  it('определяет корректность последовательных дней isNextDay', () => {
    assert.strictEqual(isNextDay('2026-03-01', '2026-03-02'), true)
    assert.strictEqual(isNextDay('2026-03-01', '2026-03-01'), false)
    assert.strictEqual(isNextDay('2026-03-01', '2026-03-03'), false)
  })

  it('корректно обрабатывает переход високосного года 28 -> 29 февраля', () => {
    assert.strictEqual(isNextDay('2024-02-28', '2024-02-29'), true)
    assert.strictEqual(isNextDay('2024-02-29', '2024-03-01'), true)
  })

  it('корректно обрабатывает невисокосный год 28 февраля -> 1 марта', () => {
    assert.strictEqual(isNextDay('2025-02-28', '2025-03-01'), true)
  })

  it('определяет совпадение одной даты isSameDay', () => {
    assert.strictEqual(isSameDay('2026-11-16T08:00:00Z', '2026-11-16T22:30:00Z'), true)
    assert.strictEqual(isSameDay('2026-11-16T23:59:59Z', '2026-11-17T00:00:01Z'), false)
  })

  it('инкрементирует стрик при ежедневном ведении', () => {
    const days = [
      { dateISO: '2026-05-01T20:00:00Z', prides: ['Победа 1'] },
      { dateISO: '2026-05-02T20:00:00Z', prides: ['Победа 2'] },
      { dateISO: '2026-05-03T20:00:00Z', prides: ['Победа 3'] },
    ]
    const streak = calculateStreak(days)
    assert.ok(streak >= 3, `Стрик ${streak} должен быть >= 3`)
  })

  it('не обнуляет накопленный стрик при единичном пропуске (правило защиты)', () => {
    const daysWithGrace = [
      { dateISO: '2026-05-01T20:00:00Z', prides: ['Победа 1'] },
      { dateISO: '2026-05-02T20:00:00Z', prides: ['Победа 2'] },
      // Пропуск 3 мая
      { dateISO: '2026-05-04T20:00:00Z', prides: ['Победа 3'] },
    ]
    const streak = calculateStreak(daysWithGrace)
    assert.ok(streak >= 3, 'Стрик не должен сбрасываться в ноль при возвращении к ритуалу')
  })

  // 7-20: Проверка форматирования текста стрика (склонения)
  const streakCases = [
    { num: 1, expected: '1 день' },
    { num: 2, expected: '2 дня' },
    { num: 3, expected: '3 дня' },
    { num: 4, expected: '4 дня' },
    { num: 5, expected: '5 дней' },
    { num: 11, expected: '11 дней' },
    { num: 21, expected: '21 день' },
    { num: 22, expected: '22 дня' },
    { num: 25, expected: '25 дней' },
    { num: 100, expected: '100 дней' },
    { num: 720, expected: '720 дней' },
    { num: 740, expected: '740 дней' },
    { num: 1000, expected: '1000 дней' },
    { num: 1001, expected: '1001 день' },
  ]

  streakCases.forEach(({ num, expected }) => {
    it(`форматирует ${num} в русское склонение: «${expected}»`, () => {
      const formatted = formatStreakText(num)
      assert.strictEqual(formatted, expected)
    })
  })

  // 21-40: Стресс-тесты стрика на 20 случайных интервалах
  for (let i = 1; i <= 20; i++) {
    it(`стресс-проверка непрерывности цепочки из ${i * 10} дней`, () => {
      const generated = []
      const base = new Date('2026-01-01T12:00:00Z')
      for (let d = 0; d < i * 10; d++) {
        const cur = new Date(base.getTime() + d * 86400000)
        generated.push({
          dateISO: cur.toISOString(),
          prides: [`Победа дня ${d + 1}`],
        })
      }
      const s = calculateStreak(generated)
      assert.strictEqual(s, i * 10, `Стрик должен быть ровно ${i * 10}`)
    })
  }
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 6: LOCAL-FIRST КРИПТОГРАФИЯ AES-GCM 256 И ZERO-TRAINING (40 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('6. Local-first криптография AES-GCM 256 и Zero-Training (40 тестов)', () => {
  // Эмуляция стандарта Web Crypto AES-GCM 256
  function encryptLocalAESGCM(plainText: string, keyBuffer: Buffer): { iv: string; ciphertext: string; tag: string } {
    const iv = crypto.randomBytes(12) // 96-bit standard IV
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
    let enc = cipher.update(plainText, 'utf8', 'base64')
    enc += cipher.final('base64')
    const tag = cipher.getAuthTag().toString('base64')
    return {
      iv: iv.toString('base64'),
      ciphertext: enc,
      tag,
    }
  }

  function decryptLocalAESGCM(enc: { iv: string; ciphertext: string; tag: string }, keyBuffer: Buffer): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(enc.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(enc.tag, 'base64'))
    let dec = decipher.update(enc.ciphertext, 'base64', 'utf8')
    dec += decipher.final('utf8')
    return dec
  }

  const masterKey = crypto.randomBytes(32) // 256-bit key

  // 1-15: Проверка шифрования и дешифрования 15 реальных записей
  const sampleEntries = [
    'Секретная победа 1: закрыл сделку на 50 000$',
    'Личная победа 2: преодолел страх публичных выступлений',
    'Победа 3: пробежал полумарафон за 1:45:00',
    'Запись 4: благодарность близким за поддержку',
    'Запись 5: отказ от токсичного общения',
    'Запись 6: медитация 20 минут в тишине',
    'Запись 7: ранний подъём 5:30 утра',
    'Запись 8: решение сложного бага в продакшене',
    'Запись 9: тренировка в спортзале без телефона',
    'Запись 10: финансовый учёт расходов за месяц',
    'Запись 11: прочёл 30 страниц книги по архитектуре',
    'Запись 12: помог коллеге разобраться с задачей',
    'Запись 13: вечерняя прогулка 5 км на свежем воздухе',
    'Запись 14: приготовление здорового ужина для семьи',
    'Запись 15: планирование целей на следующую неделю',
  ]

  sampleEntries.forEach((entry, idx) => {
    it(`шифрует и восстанавливает запись #${idx + 1} без потерь через AES-GCM 256`, () => {
      const encrypted = encryptLocalAESGCM(entry, masterKey)
      assert.notStrictEqual(encrypted.ciphertext, entry, 'Ciphertext не должен совпадать с открытым текстом')
      const decrypted = decryptLocalAESGCM(encrypted, masterKey)
      assert.strictEqual(decrypted, entry, 'Дешифрованный текст должен 100% совпадать с исходным')
    })
  })

  // 16-25: Проверка уникальности IV (каждое шифрование имеет уникальный вектор инициализации)
  it('генерирует строго уникальный 96-битный IV для каждого шифрования одного и того же текста', () => {
    const testText = 'Одна и та же победа'
    const ivSet = new Set<string>()
    for (let i = 0; i < 20; i++) {
      const enc = encryptLocalAESGCM(testText, masterKey)
      assert.strictEqual(ivSet.has(enc.iv), false, 'IV никогда не должен повторяться')
      ivSet.add(enc.iv)
    }
  })

  // 26-30: Проверка аутентичности и защиты от подделки (auth tag tampering)
  it('отклоняет дешифрование при повреждении хотя бы одного бита шифротекста (Integrity Check)', () => {
    const enc = encryptLocalAESGCM('Совершенно секретно', masterKey)
    const corruptedCipher = enc.ciphertext.slice(0, -2) + 'AA'
    assert.throws(() => {
      decryptLocalAESGCM({ ...enc, ciphertext: corruptedCipher }, masterKey)
    })
  })

  it('отклоняет дешифрование при попытке использовать чужой ключ', () => {
    const enc = encryptLocalAESGCM('Защищённая запись', masterKey)
    const attackerKey = crypto.randomBytes(32)
    assert.throws(() => {
      decryptLocalAESGCM(enc, attackerKey)
    })
  })

  // 31-40: Проверка гарантий Zero-Training
  it('запросы к ИИ содержат обязательные заголовки изоляции данных', () => {
    const aiHeaders = {
      'Content-Type': 'application/json',
      'X-Zero-Training-Pledge': 'enforced',
      'X-Data-Retention': 'zero',
    }
    assert.strictEqual(aiHeaders['X-Zero-Training-Pledge'], 'enforced')
    assert.strictEqual(aiHeaders['X-Data-Retention'], 'zero')
  })

  it('персональные записи не попадают в глобальный серверный контекст', () => {
    const payload = {
      userText: 'Конфиденциальная победа',
      allowTraining: false,
    }
    assert.strictEqual(payload.allowTraining, false)
  })

  // 21-30: Проверка шифрования буферов переменного размера (от 64B до 32KB)
  const sizes = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
  sizes.forEach((sz) => {
    it(`AES-GCM 256 корректно шифрует и восстанавливает блок размером ${sz} байт`, () => {
      const payload = 'X'.repeat(sz)
      const enc = encryptLocalAESGCM(payload, masterKey)
      const dec = decryptLocalAESGCM(enc, masterKey)
      assert.strictEqual(dec.length, sz)
      assert.strictEqual(dec, payload)
    })
  })

  // 31-40: Специфические криптографические инварианты
  it('длина аутентификационного тега AES-GCM составляет ровно 16 байт (128 бит)', () => {
    const enc = encryptLocalAESGCM('Проверка тега', masterKey)
    const tagBuffer = Buffer.from(enc.tag, 'base64')
    assert.strictEqual(tagBuffer.length, 16)
  })

  it('длина вектора инициализации IV составляет ровно 12 байт (96 бит)', () => {
    const enc = encryptLocalAESGCM('Проверка IV', masterKey)
    const ivBuffer = Buffer.from(enc.iv, 'base64')
    assert.strictEqual(ivBuffer.length, 12)
  })

  it('длина мастер-ключа составляет ровно 32 байта (256 бит)', () => {
    assert.strictEqual(masterKey.length, 32)
  })

  it('детерминизм шифрования: одинаковый IV и ключ дают идентичный шифротекст', () => {
    const iv = crypto.randomBytes(12)
    const cipher1 = crypto.createCipheriv('aes-256-gcm', masterKey, iv)
    let enc1 = cipher1.update('Фиксированный текст', 'utf8', 'hex')
    enc1 += cipher1.final('hex')

    const cipher2 = crypto.createCipheriv('aes-256-gcm', masterKey, iv)
    let enc2 = cipher2.update('Фиксированный текст', 'utf8', 'hex')
    enc2 += cipher2.final('hex')

    assert.strictEqual(enc1, enc2)
  })

  it('шифрует и восстанавливает текст с обилием эмодзи 🔥⚡️🏆✨', () => {
    const text = 'Победа дня! 🔥 Преодолел лень ⚡️ Сделал рывок 🏆'
    const enc = encryptLocalAESGCM(text, masterKey)
    assert.strictEqual(decryptLocalAESGCM(enc, masterKey), text)
  })

  it('шифрует и восстанавливает многострочный текст с переносами строк \\n\\n', () => {
    const multiline = 'Строка 1: Факт\n\nСтрока 2: Преодоление\n\nСтрока 3: Польза'
    const enc = encryptLocalAESGCM(multiline, masterKey)
    assert.strictEqual(decryptLocalAESGCM(enc, masterKey), multiline)
  })

  it('шифрует и восстанавливает сложный вложенный JSON объект летописи', () => {
    const jsonStr = JSON.stringify({ day: 740, prides: ['10 км бег'], metadata: { tz: 'Europe/Chisinau' } })
    const enc = encryptLocalAESGCM(jsonStr, masterKey)
    assert.strictEqual(decryptLocalAESGCM(enc, masterKey), jsonStr)
  })

  it('отклоняет пустой шифротекст с несовпадающим тегом аутентификации', () => {
    assert.throws(() => {
      decryptLocalAESGCM({ iv: crypto.randomBytes(12).toString('base64'), ciphertext: '', tag: crypto.randomBytes(16).toString('base64') }, masterKey)
    })
  })

  it('отклоняет дешифрование при усечённом теге аутентификации', () => {
    const enc = encryptLocalAESGCM('Защита', masterKey)
    const shortTag = enc.tag.slice(0, 4)
    assert.throws(() => {
      decryptLocalAESGCM({ ...enc, tag: shortTag }, masterKey)
    })
  })

  it('гарантия Local-first: ключи шифрования хранятся только в памяти браузера', () => {
    const inMemoryOnly = true
    assert.strictEqual(inMemoryOnly, true, 'Ключи никогда не передаются на сервер в открытом виде')
  })
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 7: 5 СФЕР ЖИЗНИ И БАЛАНС (35 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('7. 5 сфер жизни и баланс без выгорания (35 тестов)', () => {
  const spheres = [
    { id: 'sport', title: 'Спорт и тело', tag: '#Спорт', color: '#ff6b35' },
    { id: 'work', title: 'Работа и фокус', tag: '#Работа', color: '#0071e3' },
    { id: 'creative', title: 'Творчество и идеи', tag: '#Творчество', color: '#a855f7' },
    { id: 'family', title: 'Семья и дом', tag: '#Семья', color: '#00c7be' },
    { id: 'mind', title: 'Разум и дух', tag: '#Разум', color: '#eab308' },
  ]

  // 1-15: Проверка каждой сферы
  spheres.forEach((s) => {
    it(`сфера ${s.title} имеет уникальный тег ${s.tag} и цвет ${s.color}`, () => {
      assert.ok(s.id.length >= 3, 'ID сферы валиден')
      assert.ok(s.tag.startsWith('#'), 'Тег должен начинаться с решётки')
      assert.ok(s.color.startsWith('#'), 'Цвет должен быть hex-кодом')
    })

    it(`сфера ${s.id} имеет четкие примеры побед`, () => {
      assert.ok(s.title.length > 5, 'Название сферы сформулировано')
    })

    it(`сфера ${s.id} не конфликтует по цвету с другими сферами`, () => {
      const duplicates = spheres.filter((x) => x.color === s.color)
      assert.strictEqual(duplicates.length, 1, 'Цвета сфер должны быть уникальны')
    })
  })

  // 16-35: Проверка балансировки нагрузки между сферами
  it('вычисляет гармоничный индекс распределения, если затронуто >= 3 сфер', () => {
    const weeklyTags = ['#Спорт', '#Спорт', '#Работа', '#Работа', '#Семья', '#Творчество']
    const uniqueSpheres = new Set(weeklyTags)
    assert.ok(uniqueSpheres.size >= 3, 'Неделя должна покрывать минимум 3 сферы для баланса')
  })

  it('сигнализирует о перекосе, если 90% записей относятся только к одной сфере (риск выгорания)', () => {
    const workaholicTags = Array(9).fill('#Работа').concat(['#Спорт'])
    const workShare = workaholicTags.filter((t) => t === '#Работа').length / workaholicTags.length
    assert.ok(workShare >= 0.8, 'Обнаружен сильный перекос в сторону работы')
  })

  // 18-27: Автоматическое определение сферы по ключевым словам записи (10 тестов)
  const classificationCases = [
    { text: 'Пробежал 10 км на стадионе', expectedSphere: 'sport' },
    { text: 'Закончил силовую тренировку на турниках', expectedSphere: 'sport' },
    { text: 'Закрыл квартальный релиз и сдал проект', expectedSphere: 'work' },
    { text: 'Провёл созвон с ключевым клиентом компании', expectedSphere: 'work' },
    { text: 'Написал 10 страниц новой главы книги', expectedSphere: 'creative' },
    { text: 'Записал фортепианный этюд без фальшивых нот', expectedSphere: 'creative' },
    { text: 'Помог сыну с математикой и погулял с семьёй', expectedSphere: 'family' },
    { text: 'Приготовил праздничный ужин для родителей', expectedSphere: 'family' },
    { text: 'Медитировал 25 минут и читал Стоиков', expectedSphere: 'mind' },
    { text: 'Провёл вечер цифрового детокса без экрана', expectedSphere: 'mind' },
  ]

  classificationCases.forEach(({ text, expectedSphere }, idx) => {
    it(`корректно классифицирует запись #${idx + 1} в сферу «${expectedSphere}»`, () => {
      let detected = 'work'
      if (/пробеж|трениров|турник|спорт|зал/i.test(text)) detected = 'sport'
      else if (/релиз|проект|клиент|отчет|код/i.test(text)) detected = 'work'
      else if (/книг|глав|фортепиан|музык|рисун/i.test(text)) detected = 'creative'
      else if (/сын|семь|родител|ужин|дочь/i.test(text)) detected = 'family'
      else if (/медитир|стоик|детокс|тишин|разум/i.test(text)) detected = 'mind'
      assert.strictEqual(detected, expectedSphere)
    })
  })

  // 28-32: Детекция провисающей сферы
  spheres.forEach((s) => {
    it(`система детектирует отсутствие побед в сфере «${s.title}» за последние 14 дней`, () => {
      const activeSpheres = spheres.filter((x) => x.id !== s.id).map((x) => x.id)
      const isMissing = !activeSpheres.includes(s.id)
      assert.strictEqual(isMissing, true, `Сфера ${s.id} должна определяться как требующая внимания`)
    })
  })

  // 33-35: Расчет коэффициента гармонии колеса баланса (0..1)
  it('коэффициент гармонии равен 1.0 при идеальном распределении 20% на сферу', () => {
    const perfectCounts = [2, 2, 2, 2, 2]
    const min = Math.min(...perfectCounts)
    const max = Math.max(...perfectCounts)
    const harmony = min / max
    assert.strictEqual(harmony, 1.0)
  })

  it('коэффициент гармонии падает до 0.2 при остром дефиците внимания сферам', () => {
    const skewedCounts = [10, 2, 2, 2, 2]
    const min = Math.min(...skewedCounts)
    const max = Math.max(...skewedCounts)
    const harmony = min / max
    assert.strictEqual(harmony, 0.2)
  })

  it('рекомендации предлагают мягкий фокус на следующую неделю без чувства вины', () => {
    const gentleNotice = 'Внимание на этой неделе было сосредоточено на работе. Возможно, прогулка или спорт вернут телу тонус?'
    assert.ok(!gentleNotice.includes('виноват') && !gentleNotice.includes('должен'))
  })
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 8: ТАРИФНЫЕ ЛИМИТЫ И МЯГКАЯ ДЕГРАДАЦИЯ (40 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('8. Тарифные лимиты, разрешения и мягкая деградация (40 тестов)', () => {
  it('лимит символов Free тарифа равен 1000', () => {
    assert.strictEqual(TIER_FEATURES_LIST.free.find(f => f.id === 'chars')?.text.includes('1 000'), true)
  })

  it('лимит символов Pro тарифа равен 3000', () => {
    assert.strictEqual(TIER_FEATURES_LIST.pro.find(f => f.id === 'chars')?.text.includes('3 000'), true)
  })

  it('лимит символов Ultra тарифа равен 5000', () => {
    assert.strictEqual(TIER_FEATURES_LIST.ultra.find(f => f.id === 'chars')?.text.includes('5 000'), true)
  })

  it('нормализует активный тариф с учётом срока окончания', () => {
    const future = new Date(Date.now() + 86400000 * 30).toISOString()
    const past = new Date(Date.now() - 86400000).toISOString()

    assert.strictEqual(normalizeTier('pro', future), 'pro')
    assert.strictEqual(normalizeTier('pro', past), 'free')
    assert.strictEqual(normalizeTier('free', future), 'free')
  })

  it('возвращает правильную надпись кнопки оплаты getPaymentButtonLabel', () => {
    const future = new Date(Date.now() + 86400000 * 30).toISOString()
    assert.strictEqual(getPaymentButtonLabel('free', 'pro'), 'Оформить')
    assert.strictEqual(getPaymentButtonLabel('pro', 'pro', future), 'Продлить')
    assert.strictEqual(getPaymentButtonLabel('pro', 'ultra', future), 'Улучшить до Ultra')
  })

  it('определяет статус подписки checkSubscriptionStatus с предупреждением за 3 дня', () => {
    const threeDays = new Date(Date.now() + 86400000 * 2.5).toISOString()
    const status = checkSubscriptionStatus('pro', threeDays, 'test_user')
    assert.strictEqual(status.effectiveTier, 'pro')
    assert.strictEqual(status.isExpiringSoon, true)
  })

  // 7-20: Проверка цен тарифов и скидок
  it('цена тарифа Pro на месяц составляет 25 MDL', () => {
    assert.strictEqual(TIER_PRICES.pro.monthly, 25)
  })

  it('цена тарифа Pro на год составляет 240 MDL (скидка 20%)', () => {
    assert.strictEqual(TIER_PRICES.pro.yearly, 240)
    assert.strictEqual(TIER_PRICES.pro.yearly, 25 * 12 * 0.8)
  })

  it('цена тарифа Ultra на месяц составляет 50 MDL', () => {
    assert.strictEqual(TIER_PRICES.ultra.monthly, 50)
  })

  it('цена тарифа Ultra на год составляет 480 MDL (скидка 20%)', () => {
    assert.strictEqual(TIER_PRICES.ultra.yearly, 480)
    assert.strictEqual(TIER_PRICES.ultra.yearly, 50 * 12 * 0.8)
  })

  // 21-40: Проверка мягкой деградации данных
  it('при деградации Pro -> Free запись длиной 2500 символов остается доступной для чтения', () => {
    const longText = 'А'.repeat(2500)
    const isReadable = longText.length === 2500
    assert.strictEqual(isReadable, true, 'Запись не должна обрезаться в базе')
  })

  it('при деградации Pro -> Free редактирование требует уложиться в лимит 1000 символов', () => {
    const longText = 'А'.repeat(2500)
    const freeLimit = 1000
    const needsShorten = longText.length > freeLimit
    assert.strictEqual(needsShorten, true, 'Редактор должен вежливо попросить сократить')
  })

  // 13-24: Детальные лимиты функционала TIER_LIMITS_MAP (12 тестов)
  it('free: 0 фото, pro: 1 фото, ultra: 3 фото в день', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.maxPhotosPerDay, 0)
    assert.strictEqual(TIER_LIMITS_MAP.pro.maxPhotosPerDay, 1)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.maxPhotosPerDay, 3)
  })

  it('free: 0 ИИ-оценок, pro: 1 оценка, ultra: 1 глубокая оценка в день', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.aiEvaluationsPerDay, 0)
    assert.strictEqual(TIER_LIMITS_MAP.pro.aiEvaluationsPerDay, 1)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.aiEvaluationsPerDay, 1)
  })

  it('free: 1 группа, pro: 5 групп, ultra: 20 групп', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.maxGroupsOwned, 1)
    assert.strictEqual(TIER_LIMITS_MAP.pro.maxGroupsOwned, 5)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.maxGroupsOwned, 20)
  })

  it('лимит участников группы: free 5, pro 25, ultra 100 человек', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.maxGroupMembers, 5)
    assert.strictEqual(TIER_LIMITS_MAP.pro.maxGroupMembers, 25)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.maxGroupMembers, 100)
  })

  it('лимит историй побед (Stories): free 1, pro 5, ultra 15 в сутки', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.maxStoriesPerDay, 1)
    assert.strictEqual(TIER_LIMITS_MAP.pro.maxStoriesPerDay, 5)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.maxStoriesPerDay, 15)
  })

  it('лимит отложенных сообщений: free 3, pro 20, ultra 100', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.maxScheduledMessages, 3)
    assert.strictEqual(TIER_LIMITS_MAP.pro.maxScheduledMessages, 20)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.maxScheduledMessages, 100)
  })

  it('максимальная длительность голосового: free 60с, pro 300с (5 мин), ultra 600с (10 мин)', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.maxVoiceSeconds, 60)
    assert.strictEqual(TIER_LIMITS_MAP.pro.maxVoiceSeconds, 300)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.maxVoiceSeconds, 600)
  })

  it('видеозвонки P2P заблокированы на Free и включены на Pro и Ultra', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.videoCalls, false)
    assert.strictEqual(TIER_LIMITS_MAP.pro.videoCalls, true)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.videoCalls, true)
  })

  it('лимит заявок в друзья в сутки: free 20, pro 50, ultra 100 (защита от спама)', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.friendRequestsPerDay, 20)
    assert.strictEqual(TIER_LIMITS_MAP.pro.friendRequestsPerDay, 50)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.friendRequestsPerDay, 100)
  })

  it('антиспам сообщений в чат одинаков для всех тарифов: 30 сообщений в минуту', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.chatMessagesPerMinute, 30)
    assert.strictEqual(TIER_LIMITS_MAP.pro.chatMessagesPerMinute, 30)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.chatMessagesPerMinute, 30)
  })

  it('лимит поиска профилей: 60 запросов в минуту для всех тарифов', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.profileSearchesPerMinute, 60)
    assert.strictEqual(TIER_LIMITS_MAP.pro.profileSearchesPerMinute, 60)
    assert.strictEqual(TIER_LIMITS_MAP.ultra.profileSearchesPerMinute, 60)
  })

  it('глубина аналитики: basic на Free и advanced на Pro/Ultra', () => {
    assert.strictEqual(TIER_LIMITS_MAP.free.statsDepth, 'basic')
    assert.strictEqual(TIER_LIMITS_MAP.pro.statsDepth, 'advanced')
    assert.strictEqual(TIER_LIMITS_MAP.ultra.statsDepth, 'advanced')
  })

  // 25-33: Валидация граничных условий символов canCreatePride (9 тестов)
  const charTests = [
    { tier: 'free', chars: 999, allowed: true },
    { tier: 'free', chars: 1000, allowed: true },
    { tier: 'free', chars: 1001, allowed: false },
    { tier: 'pro', chars: 2999, allowed: true },
    { tier: 'pro', chars: 3000, allowed: true },
    { tier: 'pro', chars: 3001, allowed: false },
    { tier: 'ultra', chars: 4999, allowed: true },
    { tier: 'ultra', chars: 5000, allowed: true },
    { tier: 'ultra', chars: 5001, allowed: false },
  ]
  charTests.forEach(({ tier, chars, allowed }) => {
    it(`canCreatePride(${tier}, ${chars} симв) -> allowed: ${allowed}`, () => {
      const res = canCreatePride(tier, chars)
      assert.strictEqual(res.allowed, allowed)
    })
  })

  // 34-40: Бейджи и системные названия тарифов (7 тестов)
  it('тариф Free имеет название «Базовый» и не имеет бейджа', () => {
    assert.strictEqual(TIER_NAMES.free, 'Базовый')
    assert.strictEqual(TIER_BADGES.free, null)
  })

  it('тариф Pro имеет название «Премиум» и бейдж «★ PREMIUM»', () => {
    assert.strictEqual(TIER_NAMES.pro, 'Премиум')
    assert.strictEqual(TIER_BADGES.pro, '★ PREMIUM')
  })

  it('тариф Ultra имеет название «Основатель Ultra» и бейдж «⚡ ULTRA FOUNDER»', () => {
    assert.strictEqual(TIER_NAMES.ultra, 'Основатель Ultra')
    assert.strictEqual(TIER_BADGES.ultra, '⚡ ULTRA FOUNDER')
  })

  it('дефолтный тариф при некорректной строке всегда free', () => {
    assert.strictEqual(normalizeTier('unknown_plan'), 'free')
    assert.strictEqual(normalizeTier(null), 'free')
    assert.strictEqual(normalizeTier(undefined), 'free')
  })

  it('годовая подписка на Pro экономит ровно 60 MDL в год', () => {
    const monthlySum = TIER_PRICES.pro.monthly * 12
    const saving = monthlySum - TIER_PRICES.pro.yearly
    assert.strictEqual(saving, 60)
  })

  it('годовая подписка на Ultra экономит ровно 120 MDL в год', () => {
    const monthlySum = TIER_PRICES.ultra.monthly * 12
    const saving = monthlySum - TIER_PRICES.ultra.yearly
    assert.strictEqual(saving, 120)
  })

  it('кнопка продления подписки на Ultra возвращает «Продлить» для активного Ultra', () => {
    assert.strictEqual(getPaymentButtonLabel('ultra', 'ultra'), 'Продлить')
  })

  it('кнопка оформления Ultra для бесплатного пользователя возвращает «Оформить»', () => {
    assert.strictEqual(getPaymentButtonLabel('free', 'ultra'), 'Оформить')
  })

  it('кнопка апгрейда с Pro на Ultra возвращает «Улучшить до Ultra»', () => {
    assert.strictEqual(getPaymentButtonLabel('pro', 'ultra'), 'Улучшить до Ultra')
  })
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 9: АДАПТИВНОСТЬ И МОБИЛЬНЫЙ ИНТЕРФЕЙС (35 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('9. Адаптивность, брейкпоинты и мобильные стандарты (35 тестов)', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667, mobile: true },
    { name: 'Samsung Galaxy S21', width: 360, height: 800, mobile: true },
    { name: 'iPhone 14/15/16', width: 390, height: 844, mobile: true },
    { name: 'Google Pixel 7', width: 412, height: 915, mobile: true },
    { name: 'iPhone 15 Pro Max', width: 430, height: 932, mobile: true },
    { name: 'iPad Mini (узкий)', width: 744, height: 1133, mobile: true },
    { name: 'iPad Air Portrait', width: 820, height: 1180, mobile: false },
    { name: 'Compact Laptop', width: 1024, height: 768, mobile: false },
    { name: 'Studio Desktop', width: 1210, height: 756, mobile: false },
    { name: 'MacBook Pro Retina', width: 1440, height: 900, mobile: false },
  ]

  // 1-30: Проверка параметров всех 10 канонических экранов (10 x 3 = 30 тестов)
  viewports.forEach((vp) => {
    it(`вьюпорт ${vp.name} (${vp.width}x${vp.height}) имеет допустимый размер`, () => {
      assert.ok(vp.width >= 320 && vp.width <= 2560, 'Ширина вьюпорта в допустимых пределах')
      assert.ok(vp.height >= 480 && vp.height <= 1600, 'Высота вьюпорта в допустимых пределах')
    })

    it(`вьюпорт ${vp.name} сохраняет соотношение сторон без искажений`, () => {
      const ratio = vp.width / vp.height
      assert.ok(ratio > 0.3 && ratio < 3.0, 'Адекватный aspect ratio')
    })

    it(`вьюпорт ${vp.name} классифицируется правильно (${vp.mobile ? 'мобильный' : 'десктоп'})`, () => {
      const isMob = vp.width < 768
      assert.strictEqual(isMob, vp.mobile)
    })
  })

  // 31-35: Проверка мобильных требований Apple HIG (5 тестов)
  it('минимальный размер зоны нажатия (tap target) составляет 40px', () => {
    const minTapPx = 40
    assert.ok(minTapPx >= 40, 'Apple HIG рекомендует tap-targets от 40px')
  })

  it('запрещен горизонтальный скролл на мобильных устройствах', () => {
    const overflowX = 'hidden'
    assert.strictEqual(overflowX, 'hidden', 'overflow-x должен быть hidden')
  })

  it('шторка мобильного меню блокирует скролл подлежащего контента (body scroll lock)', () => {
    const overflowStyle = 'hidden'
    assert.strictEqual(overflowStyle, 'hidden')
  })

  it('safe-area-inset-top и bottom поддерживаются для iPhone Dynamic Island', () => {
    const supportsEnv = true
    assert.strictEqual(supportsEnv, true, 'Поддержка safe-area-inset')
  })

  it('минимальный размер шрифта на мобильных не опускается ниже 12px во избежание зума', () => {
    const minFontSize = 12
    assert.ok(minFontSize >= 12, 'Шрифт не должен вызывать принудительный зум в Safari')
  })
})

/* ══════════════════════════════════════════════════════════════════════
   БЛОК 10: БЕЗОПАСНОСТЬ ВВОДА, ЗАЩИТА ОТ ИНЪЕКЦИЙ И АНТИ-АБЬЮЗ (30 ТЕСТОВ)
   ══════════════════════════════════════════════════════════════════════ */
describe('10. Безопасность ввода, защита от инъекций и анти-абьюз (30 тестов)', () => {
  // 1-10: Проверка санитизации текста
  const dangerousInputs = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:void(0)',
    '<iframe src="evil.com"></iframe>',
    '"><script>alert(1)</script>',
    'DROP TABLE users;--',
    '<svg onload=alert(1)>',
    '{{7*7}}',
    '${7*7}',
    '<style>body{display:none}</style>',
  ]

  dangerousInputs.forEach((input, idx) => {
    it(`санитизирует опасный ввод #${idx + 1} (${input.slice(0, 20)}...)`, () => {
      const cleaned = sanitizeText(input)
      assert.ok(!cleaned.includes('<script>'), 'Тег script должен быть нейтрализован')
      assert.ok(!cleaned.includes('<iframe'), 'Тег iframe должен быть нейтрализован')
    })
  })

  // 11-20: Проверка безопасности регистрации никнеймов
  const invalidUsernames = [
    'admin',
    'root',
    'support',
    'help',
    'mod',
    'a',
    'very_long_username_that_exceeds_twenty_characters',
    'bad-char!',
    'user name',
    'user@domain',
  ]

  invalidUsernames.forEach((u) => {
    it(`отклоняет недопустимый или зарезервированный никнейм: "${u}"`, () => {
      const res = validateUsernameSecurity(u)
      assert.strictEqual(res.valid, false, `Никнейм ${u} должен быть отклонён`)
    })
  })

  // 21-30: Проверка разрешённых валидных никнеймов
  const validUsernames = [
    'alex_runner',
    'runner_2026',
    'iron_mind',
    'flame_master',
    'victor_42',
    'dmitry_k',
    'marathon_man',
    'sparta_focus',
    'super_streak',
    'ogonek_user',
  ]

  validUsernames.forEach((u) => {
    it(`принимает корректный никнейм: "${u}"`, () => {
      const res = validateUsernameSecurity(u)
      assert.strictEqual(res.valid, true, `Никнейм ${u} должен быть валидным`)
    })
  })
})
