/**
 * src/content/i18n.ts
 * Multi-language content engine for Winlog Landing (RU, RO, EN).
 */

export type Locale = 'ru' | 'ro' | 'en'

export interface WheelItem {
  title: string
  subtitle: string
  tag: string
  image: string
}

export interface LevelItem {
  count: string
  flames: number
  title: string
  sub: string
  desc: string
  extreme?: boolean
  delay: string
}

export interface FactItem {
  label: string
  val: string
  desc: string
}

export interface PrivacyCardItem {
  badge: string
  title: string
  desc: string
}

export interface PricingTier {
  id: string
  name: string
  desc: string
  oldPriceYearly?: string
  priceMonthly: string
  priceYearly: string
  period?: string
  periodMonthly?: string
  periodYearly?: string
  badge: string
  features: string[]
  cta: string
  popular: boolean
}

export interface LandingContent {
  meta: {
    title: string
    description: string
  }
  nav: {
    modes: string
    how: string
    ai: string
    quotes: string
    privacy: string
    pricing: string
    signin: string
    signup: string
    navigation: string
    home: string
    legal: string
    mobileCta: string
    mobileSignin: string
    langLabel: string
  }
  hero: {
    eyebrow: string
    title: string
    subtitle: string
    ctaPrimary: string
    ctaSecondary: string
    trustBadge: string
    videoSrc: string
  }
  prideWheel: {
    eyebrow: string
    title: string
    subtitle: string
    wheelLabel: string
    actionText: string
    galleryLabel: string
    hintLabel: string
    scrollDownLabel: string
    items: WheelItem[]
  }
  howItWorks: {
    eyebrow: string
    title: string
    subtitle: string
    steps: {
      step: string
      title: string
      desc: string
    }[]
    showcase: {
      feedTab: string
      analyticsTab: string
      leaderboardTab: string
      chatsTab: string
      streakTitle: string
      streakDesc: string
      prideTitle: string
      prideDesc: string
      gratitudeTitle: string
      gratitudeDesc: string
      friendsTitle: string
      friendsDesc: string
      aiEvalTitle: string
      aiEvalDesc: string
      leaderboardTitle: string
      leaderboardDesc: string
      chatTitle: string
      chatDesc: string
    }
  }
  tempo: {
    eyebrow: string
    title: string
    subtitle: string
    cta: string
    levels: LevelItem[]
  }
  aiAnalysis: {
    eyebrow: string
    title: string
    subtitle: string
    screenshot: string
    mobileScreenshot: string
    windowTitle: string
    statusBadge: string
    learnMore: string
    cards: {
      id: string
      title: string
      desc: string
      icon: 'TrendingUp' | 'Sparkles' | 'Clock'
      tone: string
    }[]
  }
  friendsFamily: {
    eyebrow: string
    title: string
    subtitle: string
    screenshot: string
    cta: string
    features: {
      title: string
      desc: string
    }[]
  }
  globe: {
    eyebrow: string
    title: string
    subtitle: string
    globeHeadline: string
    globeCaption: string
    carouselHeading: string
    labels: {
      previous: string
      next: string
      pin: string
      storiesCountLabel: string
      citiesLabel: string
      exampleBadge: string
    }
  }
  privacy: {
    eyebrow: string
    title: string
    subtitle: string
    readMoreText: string
    cards: PrivacyCardItem[]
  }
  facts: {
    eyebrow: string
    title: string
    subtitle: string
    facts: FactItem[]
  }
  pricing: {
    eyebrow: string
    title: string
    subtitle: string
    freeForeverBanner: string
    monthlyToggle: string
    yearlyToggle: string
    saveBadge: string
    recommendedBadge: string
    aiCalloutTitle: string
    aiCalloutDesc: string
    aiCalloutBtn: string
    tiers: PricingTier[]
  }
  finalCta: {
    title: string
    subtitle: string
    ctaButton: string
    image: string
  }
  footer: {
    title: string
    tagline: string
    ctaBtn: string
    signinBtn: string
    scrollTop: string
    legalLink: string
    copyright: string
  }
}

export const I18N_LANDING: Record<Locale, LandingContent> = {
  /* ══════════════════════════════════════════════════════════════
     RUSSIAN (RU)
     ══════════════════════════════════════════════════════════════ */
  ru: {
    meta: {
      title: 'Winlog - Твоя жизнь состоит из побед. Запиши их.',
      description: 'Winlog - личная летопись гордости и благодарности. Две минуты в день, бесплатно.',
    },
    nav: {
      modes: 'Галерея',
      how: 'Как это работает',
      ai: 'ИИ-наставник',
      quotes: 'Примеры',
      privacy: 'Приватность',
      pricing: 'Тарифы',
      signin: 'Войти',
      signup: 'Начать',
      navigation: 'Навигация',
      home: 'Главная',
      legal: 'Условия и конфиденциальность',
      mobileCta: 'Начать свою летопись',
      mobileSignin: 'Войти в аккаунт',
      langLabel: 'Язык интерфейса',
    },
    hero: {
      eyebrow: 'Личная летопись силы',
      title: 'Твоя жизнь состоит из побед. Запиши их.',
      subtitle: 'Winlog - личная летопись гордости и благодарности. Две минуты в день, бесплатно.',
      ctaPrimary: 'Начать бесплатно',
      ctaSecondary: 'Войти',
      trustBadge: 'Бесплатно · Без рекламы · Без банковской карты',
      videoSrc: 'mainvideo.mp4',
    },
    prideWheel: {
      eyebrow: 'Примеры ежедневных побед',
      title: 'Горжусь тем, что…',
      subtitle: 'Любая победа считается. Вот что записывают в Winlog.',
      wheelLabel: 'Горжусь тем, что…',
      actionText: 'В летопись',
      galleryLabel: 'Интерактивная галерея',
      hintLabel: 'Нажми на карточку или листай страницу вниз',
      scrollDownLabel: 'Скролль вниз ↓',
      items: [
        {
          tag: 'Бизнес',
          title: 'Горжусь тем, что договорился о сделке, к которой шёл полгода.',
          subtitle: 'Горжусь тем, что договорился о сделке, к которой шёл полгода.',
          image: '/media/landing/mode-work.jpg',
        },
        {
          tag: 'Спорт',
          title: 'Горжусь тем, что выехал на тренировку на рассвете, хотя хотелось остаться в кровати.',
          subtitle: 'Горжусь тем, что выехал на тренировку на рассвете, хотя хотелось остаться в кровати.',
          image: '/media/landing/mode-sport-3.jpg',
        },
        {
          tag: 'Семья',
          title: 'Горжусь тем, что весь вечер был рядом с семьёй, без телефона.',
          subtitle: 'Горжусь тем, что весь вечер был рядом с семьёй, без телефона.',
          image: '/media/landing/mode-family.jpg',
        },
        {
          tag: 'Работа',
          title: 'Горжусь тем, что решил задачу, над которой бился неделю.',
          subtitle: 'Горжусь тем, что решил задачу, над которой бился неделю.',
          image: '/media/landing/mode-work-2.jpg',
        },
        {
          tag: 'Учёба',
          title: 'Горжусь тем, что сдал экзамен, которого боялся.',
          subtitle: 'Горжусь тем, что сдал экзамен, которого боялся.',
          image: '/media/landing/mode-creative-2.jpg',
        },
        {
          tag: 'Дисциплина',
          title: 'Горжусь тем, что доплыл дистанцию до конца и не сбавил темп на последнем круге.',
          subtitle: 'Горжусь тем, что доплыл дистанцию до конца и не сбавил темп на последнем круге.',
          image: '/media/landing/mode-sport-2.jpg',
        },
        {
          tag: 'Характер',
          title: 'Горжусь тем, что не свернул на крутом подъёме и прошёл весь маршрут до конца.',
          subtitle: 'Горжусь тем, что не свернул на крутом подъёме и прошёл весь маршрут до конца.',
          image: '/media/landing/mode-sport-5.jpg',
        },
        {
          tag: 'Трудный период',
          title: 'Горжусь тем, что прошёл тяжёлое время и не сдался.',
          subtitle: 'Горжусь тем, что прошёл тяжёлое время и не сдался.',
          image: '/media/landing/mode-sport.jpg',
        },
        {
          tag: 'Мечта',
          title: 'Горжусь тем, что наконец сделал то, о чём мечтал годами.',
          subtitle: 'Горжусь тем, что наконец сделал то, о чём мечтал годами.',
          image: '/media/landing/mode-sport-4.jpg',
        },
      ],
    },
    howItWorks: {
      eyebrow: 'Вечерний ритуал',
      title: 'Две минуты вечером',
      subtitle: 'Пять побед и пять благодарностей за день. Остальное делает Winlog.',
      steps: [
        {
          step: '01',
          title: '1–5 фактов гордости',
          desc: 'Зафиксируй реальные поступки преодоления за день. Без лишней воды - только дела, за которые себя уважаешь.',
        },
        {
          step: '02',
          title: 'Искренняя благодарность',
          desc: 'Переключи мозг с тревоги на спокойствие. Заметь поддержку близких, случайную удачу и моменты радости.',
        },
        {
          step: '03',
          title: 'Несгораемый стрик',
          desc: 'Твой стрик считает закрытые дни силы, а не дни без единого пропуска. Никакого чувства вины и выгорания.',
        },
      ],
      showcase: {
        feedTab: 'Лента дня',
        analyticsTab: 'Статистика',
        leaderboardTab: 'Рейтинг',
        chatsTab: 'Чаты',
        streakTitle: 'Стрик',
        streakDesc: 'Счётчик дней подряд',
        prideTitle: 'Гордость дня',
        prideDesc: 'Поле записи',
        gratitudeTitle: 'Благодарности',
        gratitudeDesc: 'Вечерний ритуал',
        friendsTitle: 'Друзья',
        friendsDesc: 'Блок друзей',
        aiEvalTitle: 'Оценка ИИ',
        aiEvalDesc: 'Звезда и анализ',
        leaderboardTitle: 'Топ участников',
        leaderboardDesc: 'Длинные стрики',
        chatTitle: 'Личные чаты',
        chatDesc: 'Защищённый диалог',
      },
    },
    tempo: {
      eyebrow: 'Договор с собой',
      title: 'Выбери темп, который удержишь',
      subtitle: 'От одной гордости в день до пяти. Первые 3 смены темпа доступны сразу после регистрации, далее - раз в 30 дней.',
      cta: 'Выбрать свой темп и начать летопись →',
      levels: [
        {
          count: '1',
          flames: 1,
          title: '1 факт',
          sub: 'Антивыгорание',
          desc: 'Минимальный рубеж честности. Спасает даже в дни шторма и усталости.',
          extreme: false,
          delay: 'delay-100',
        },
        {
          count: '2',
          flames: 2,
          title: '2 факта',
          sub: 'Стандарт жизни',
          desc: 'Одно дело для работы, одно для тела или дома. Твёрдый шаг каждый день.',
          extreme: false,
          delay: 'delay-200',
        },
        {
          count: '3',
          flames: 3,
          title: '3 факта',
          sub: 'Режим прорыва',
          desc: 'Осознанный фокус на ключевых победах без надрыва нервной системы.',
          extreme: false,
          delay: 'delay-300',
        },
        {
          count: '4',
          flames: 4,
          title: '4 факта',
          sub: 'Серьёзный темп',
          desc: 'Для тех, кто ведёт масштабные проекты, держит спорт и команду.',
          extreme: false,
          delay: 'delay-400',
        },
        {
          count: '5',
          flames: 5,
          title: '5 фактов',
          sub: 'Extreme Режим',
          desc: 'Предельная концентрация и закалка несокрушимого характера.',
          extreme: true,
          delay: 'delay-500',
        },
      ],
    },
    aiAnalysis: {
      eyebrow: 'ИИ-анализ',
      title: 'Winlog видит рост, который ты не замечаешь',
      subtitle: 'Нейросеть читает твои записи и показывает сильные стороны, темп и то, куда уходит время.',
      screenshot: '/landing/screens/analytics.png',
      mobileScreenshot: '/landing/screens/mobile-analytics.png',
      windowTitle: 'Winlog - Аналитика и рост',
      statusBadge: 'AI Active',
      learnMore: 'Подробнее о том, как работает ИИ в Winlog →',
      cards: [
        {
          id: 'pace',
          title: 'Твой темп',
          desc: 'Сравнение с твоим прошлым месяцем.',
          icon: 'TrendingUp',
          tone: '#e4e4e7',
        },
        {
          id: 'strengths',
          title: 'Твои сильные стороны',
          desc: 'Темы, в которых ты растёшь быстрее всего.',
          icon: 'Sparkles',
          tone: '#d76737',
        },
        {
          id: 'time',
          title: 'Куда уходит время',
          desc: 'Заметь привычки, которые мешают целям.',
          icon: 'Clock',
          tone: '#a1a1aa',
        },
      ],
    },
    friendsFamily: {
      eyebrow: 'Круг доверия',
      title: 'Победы лучше вместе',
      subtitle: 'Добавляй друзей и семью, читай их гордости, поддерживай. Твои достижения рядом с теми, кому они важны.',
      screenshot: '/landing/screen-chats.png',
      cta: 'Попробовать вместе с друзьями →',
      features: [
        {
          title: 'Лента близких',
          desc: 'Видь настоящие дела друзей без хвастовства и фильтров.',
        },
        {
          title: 'Тихие реакции',
          desc: 'Поддерживай отметкой, сжатым кулаком или тёплым словом в один клик.',
        },
        {
          title: 'Защищённые чаты',
          desc: 'Личные сообщения и обмен карточками без посторонних глаз и спама.',
        },
      ],
    },
    globe: {
      eyebrow: 'ПРИМЕРЫ ЗАПИСЕЙ В WINLOG',
      title: 'Примеры записей',
      subtitle: 'Люди по всему миру записывают победы. Вот как это выглядит в разных странах.',
      globeHeadline: 'Горжусь тем, что…',
      globeCaption: 'Короткие примеры ежедневных преодолений из разных городов мира.',
      carouselHeading: 'Ещё примеры записей',
      labels: {
        previous: 'Предыдущая запись',
        next: 'Следующая запись',
        pin: 'Запись из г.',
        storiesCountLabel: 'записей на карте',
        citiesLabel: 'городов мира',
        exampleBadge: 'Пример записи',
      },
    },
    privacy: {
      eyebrow: 'Полный контроль',
      title: 'Делись или храни в тайне',
      subtitle: 'Каждая запись: личная, для друзей, группы или открытая. Решаешь только ты.',
      readMoreText: 'Подробнее об условиях и конфиденциальности →',
      cards: [
        {
          badge: 'ПО УМОЛЧАНИЮ',
          title: 'Лично (только для тебя)',
          desc: 'По умолчанию твои записи закрыты. Их видишь только ты - никакой рекламы и никакого обучения ИИ на твоих текстах.',
        },
        {
          badge: 'ГИБКИЙ ДОСТУП',
          title: 'Друзьям, группе или всему миру',
          desc: 'Сам решаешь для каждого дня или даже отдельной гордости: оставить себе, показать взаимным друзьям, отправить в закрытую группу или открыть публично.',
        },
      ],
    },
    facts: {
      eyebrow: 'Твёрдая основа',
      title: 'Не обещания. Факты.',
      subtitle: 'Только проверяемые параметры системы без накрученных цифр.',
      facts: [
        {
          val: '100%',
          label: 'твои данные',
          desc: 'Записи принадлежат только тебе и выгружаются в один клик без ограничений.',
        },
        {
          val: '1–5',
          label: 'побед в день',
          desc: 'Гибкий темп фиксации без выгорания и навязанных гонок.',
        },
        {
          val: '0 MDL',
          label: 'чтобы начать',
          desc: 'Базовый функционал летописи доступен каждому человеку даром и навсегда.',
        },
        {
          val: '0%',
          label: 'рекламы и трекеров',
          desc: 'Чистое пространство без рекламных баннеров, продажи данных и коммерческого шума.',
        },
      ],
    },
    pricing: {
      eyebrow: 'Тарифы',
      title: 'Начни бесплатно. Расти дальше, когда захочешь',
      subtitle: 'Прозрачные условия без скрытых подписок.',
      freeForeverBanner: 'Базовый Winlog бесплатен навсегда - 0 MDL, без рекламы и скрытых списаний. Оплачиваются только расширенные функции.',
      monthlyToggle: 'Ежемесячно',
      yearlyToggle: 'На год',
      saveBadge: '-20%',
      recommendedBadge: '★ Рекомендуемый',
      aiCalloutTitle: 'Как именно работает нейросетевой наставник?',
      aiCalloutDesc: 'Изучите 4 ключевые задачи ИИ, шкалу преодоления 1–10★ и гарантии Zero-Training.',
      aiCalloutBtn: 'Подробнее об ИИ Winlog →',
      tiers: [
        {
          id: 'free',
          name: 'Базовый',
          desc: 'Всё необходимое для ежедневной летописи и стрика.',
          priceMonthly: '0 MDL',
          priceYearly: '0 MDL',
          period: '/ навсегда',
          badge: 'БАЗОВЫЙ ПЛАН',
          features: [
            'Дневник и стрик навсегда бесплатно',
            'Без ограничения длины записей',
            'Личные чаты, друзья и обмен карточками',
            'Группы для близких',
            'Без скрытых списаний и рекламы',
          ],
          cta: 'Начать бесплатно',
          popular: false,
        },
        {
          id: 'pro',
          name: 'Премиум',
          desc: 'Официальная верификация и умный ИИ-анализ каждого дня.',
          oldPriceYearly: '240 MDL',
          priceMonthly: '20 MDL',
          priceYearly: '192 MDL',
          periodMonthly: '/ месяц',
          periodYearly: '/ год (~16 MDL/мес)',
          badge: 'РЕКОМЕНДУЕМЫЙ ПЛАН',
          features: [
            'Все возможности Базового тарифа',
            'ИИ-аналитика дня и оценка преодоления',
            'Глубокие инсайты за 100 и 365+ дней',
            'До 3 фото в записи каждый день',
            'Экспорт красивых карточек и сторис',
            'Приоритетные обновления и группы до 25 человек',
          ],
          cta: 'Выбрать',
          popular: true,
        },
        {
          id: 'ultra',
          name: 'Winlog Ultra',
          desc: 'Максимальная глубина, персональный ментор и полный доступ.',
          oldPriceYearly: '600 MDL',
          priceMonthly: '50 MDL',
          priceYearly: '480 MDL',
          periodMonthly: '/ месяц',
          periodYearly: '/ год (~40 MDL/мес)',
          badge: 'WINLOG ULTRA',
          features: [
            'Все возможности тарифа Премиум',
            'Глубокий разбор от персонального ИИ-ментора',
            'Статус и галочка верификации в профиле',
            'Большие сообщества до 100 участников',
            'Полный архив и экспорт летописи',
            'Приоритетная поддержка и ранний доступ к фичам',
          ],
          cta: 'Выбрать',
          popular: false,
        },
      ],
    },
    finalCta: {
      title: 'Начни свой Winlog',
      subtitle: 'Регистрация - один шаг. Платить не нужно.',
      ctaButton: 'Начать бесплатно',
      image: 'together.jpg',
    },
    footer: {
      title: 'Личная летопись побед и дисциплины',
      tagline: 'Фиксируй настоящие преодоления каждый вечер. Твой путь в Winlog принадлежит только тебе.',
      ctaBtn: 'Начать летопись',
      signinBtn: 'Войти',
      scrollTop: 'Наверх',
      legalLink: 'Условия и конфиденциальность',
      copyright: `© ${new Date().getFullYear()} Winlog. Все права защищены.`,
    },
  },

  /* ══════════════════════════════════════════════════════════════
     ROMANIAN (RO)
     ══════════════════════════════════════════════════════════════ */
  ro: {
    meta: {
      title: 'Winlog — Viața ta e formată din victorii. Notează-le.',
      description: 'Winlog — cronica personală a mândriei și recunoștinței. Două minute pe zi, gratuit.',
    },
    nav: {
      modes: 'Galerie',
      how: 'Cum funcționează',
      ai: 'Mentor AI',
      quotes: 'Exemple',
      privacy: 'Confidențialitate',
      pricing: 'Tarife',
      signin: 'Intră',
      signup: 'Începe',
      navigation: 'Navigare',
      home: 'Acasă',
      legal: 'Termeni și confidențialitate',
      mobileCta: 'Începe cronica ta',
      mobileSignin: 'Intră în cont',
      langLabel: 'Limba interfeței',
    },
    hero: {
      eyebrow: 'Cronica personală a puterii',
      title: 'Viața ta e formată din victorii. Notează-le.',
      subtitle: 'Winlog — cronica personală a mândriei și recunoștinței. Două minute pe zi, gratuit.',
      ctaPrimary: 'Începe gratuit',
      ctaSecondary: 'Intră',
      trustBadge: 'Gratuit · Fără reclame · Fără card bancar',
      videoSrc: 'mainvideo.mp4',
    },
    prideWheel: {
      eyebrow: 'Exemple de victorii zilnice',
      title: 'Sunt mândru că…',
      subtitle: 'Fiecare victorie contează. Iată ce notează oamenii în Winlog.',
      wheelLabel: 'Sunt mândru că…',
      actionText: 'În cronică',
      galleryLabel: 'Galerie interactivă',
      hintLabel: 'Apasă pe card sau derulează în jos',
      scrollDownLabel: 'Derulează în jos ↓',
      items: [
        {
          tag: 'Afaceri',
          title: 'Sunt mândru că am încheiat tranzacția la care am lucrat jumătate de an.',
          subtitle: 'Sunt mândru că am încheiat tranzacția la care am lucrat jumătate de an.',
          image: '/media/landing/mode-work.jpg',
        },
        {
          tag: 'Sport',
          title: 'Sunt mândru că am ieșit la antrenament în zori, deși voiam să rămân în pat.',
          subtitle: 'Sunt mândru că am ieșit la antrenament în zori, deși voiam să rămân în pat.',
          image: '/media/landing/mode-sport-3.jpg',
        },
        {
          tag: 'Familie',
          title: 'Sunt mândru că am petrecut toată seara cu familia, fără telefon.',
          subtitle: 'Sunt mândru că am petrecut toată seara cu familia, fără telefon.',
          image: '/media/landing/mode-family.jpg',
        },
        {
          tag: 'Muncă',
          title: 'Sunt mândru că am rezolvat sarcina la care mă chinuiam de o săptămână.',
          subtitle: 'Sunt mândru că am rezolvat sarcina la care mă chinuiam de o săptămână.',
          image: '/media/landing/mode-work-2.jpg',
        },
        {
          tag: 'Studii',
          title: 'Sunt mândru că am promovat examenul de care mă temeam cel mai mult.',
          subtitle: 'Sunt mândru că am promovat examenul de care mă temeam cel mai mult.',
          image: '/media/landing/mode-creative-2.jpg',
        },
        {
          tag: 'Disciplină',
          title: 'Sunt mândru că am înotat distanța până la capăt și nu am încetinit pe ultima tură.',
          subtitle: 'Sunt mândru că am înotat distanța până la capăt și nu am încetinit pe ultima tură.',
          image: '/media/landing/mode-sport-2.jpg',
        },
        {
          tag: 'Caracter',
          title: 'Sunt mândru că nu am renunțat pe urcarea grea și am parcurs tot traseul până la capăt.',
          subtitle: 'Sunt mândru că nu am renunțat pe urcarea grea și am parcurs tot traseul până la capăt.',
          image: '/media/landing/mode-sport-5.jpg',
        },
        {
          tag: 'Perioadă grea',
          title: 'Sunt mândru că am trecut printr-o perioadă grea fără să renunț.',
          subtitle: 'Sunt mândru că am trecut printr-o perioadă grea fără să renunț.',
          image: '/media/landing/mode-sport.jpg',
        },
        {
          tag: 'Vis',
          title: 'Sunt mândru că am realizat în sfârșit ceea ce visam de ani de zile.',
          subtitle: 'Sunt mândru că am realizat în sfârșit ceea ce visam de ani de zile.',
          image: '/media/landing/mode-sport-4.jpg',
        },
      ],
    },
    howItWorks: {
      eyebrow: 'Ritualul de seară',
      title: 'Două minute seara',
      subtitle: 'Cinci victorii și cinci recunoștințe pe zi. De restul se ocupă Winlog.',
      steps: [
        {
          step: '01',
          title: '1–5 fapte de mândrie',
          desc: 'Notează faptele reale de depășire de peste zi. Fără cuvinte de umplutură — doar lucruri pentru care te respecți.',
        },
        {
          step: '02',
          title: 'Recunoștință sinceră',
          desc: 'Comută mintea de la anxietate la liniște. Observă sprijinul celor apropiați, norocul și clipele de bucurie.',
        },
        {
          step: '03',
          title: 'Serie de nestins',
          desc: 'Seria ta contorizează zilele de putere împlinite, nu zilele fără nicio pauză. Fără vinovăție și fără epuizare.',
        },
      ],
      showcase: {
        feedTab: 'Fluxul zilei',
        analyticsTab: 'Statistici',
        leaderboardTab: 'Clasament',
        chatsTab: 'Chaturi',
        streakTitle: 'Serie',
        streakDesc: 'Zile consecutive',
        prideTitle: 'Mândria zilei',
        prideDesc: 'Câmp de scriere',
        gratitudeTitle: 'Recunoștințe',
        gratitudeDesc: 'Ritualul de seară',
        friendsTitle: 'Prieteni',
        friendsDesc: 'Secțiunea prieteni',
        aiEvalTitle: 'Evaluare AI',
        aiEvalDesc: 'Stea și analiză',
        leaderboardTitle: 'Top participanți',
        leaderboardDesc: 'Liderii constanței',
        chatTitle: 'Chaturi private',
        chatDesc: 'Dialog securizat',
      },
    },
    tempo: {
      eyebrow: 'Acordul cu tine însuți',
      title: 'Alege ritmul pe care îl poți susține',
      subtitle: 'De la o mândrie pe zi până la cinci. Primele 3 schimbări ale ritmului sunt disponibile imediat după înregistrare, apoi o dată la 30 de zile.',
      cta: 'Alege ritmul tău și începe cronica →',
      levels: [
        {
          count: '1',
          flames: 1,
          title: '1 fapt',
          sub: 'Anti-epuizare',
          desc: 'Pragul minim de onestitate. Te salvează chiar și în zile de furtună și oboseală.',
          extreme: false,
          delay: 'delay-100',
        },
        {
          count: '2',
          flames: 2,
          title: '2 fapte',
          sub: 'Standard de viață',
          desc: 'Un pas pentru muncă, unul pentru corp sau casă. Un pas sigur în fiecare zi.',
          extreme: false,
          delay: 'delay-200',
        },
        {
          count: '3',
          flames: 3,
          title: '3 fapte',
          sub: 'Mod de avans',
          desc: 'Focalizare conștientă pe victorii cheie fără supraîncărcarea sistemului nervos.',
          extreme: false,
          delay: 'delay-300',
        },
        {
          count: '4',
          flames: 4,
          title: '4 fapte',
          sub: 'Ritm serios',
          desc: 'Pentru cei care conduc proiecte mari, fac sport și își susțin echipa.',
          extreme: false,
          delay: 'delay-400',
        },
        {
          count: '5',
          flames: 5,
          title: '5 fapte',
          sub: 'Mod Extrem',
          desc: 'Concentrare maximă și călirea unui caracter de neclintit.',
          extreme: true,
          delay: 'delay-500',
        },
      ],
    },
    aiAnalysis: {
      eyebrow: 'Analiză AI',
      title: 'Winlog vede progresul pe care nu îl observi',
      subtitle: 'Inteligența artificială analizează notițele tale și evidențiază punctele forte, ritmul și timpul investit.',
      screenshot: '/landing/screens/analytics.png',
      mobileScreenshot: '/landing/screens/mobile-analytics.png',
      windowTitle: 'Winlog — Analiză și evoluție',
      statusBadge: 'AI Active',
      learnMore: 'Află mai multe despre cum funcționează AI în Winlog →',
      cards: [
        {
          id: 'pace',
          title: 'Ritmul tău',
          desc: 'Comparație realistă cu luna ta precedentă.',
          icon: 'TrendingUp',
          tone: '#e4e4e7',
        },
        {
          id: 'strengths',
          title: 'Punctele tale forte',
          desc: 'Domeniile în care progresezi cel mai rapid.',
          icon: 'Sparkles',
          tone: '#d76737',
        },
        {
          id: 'time',
          title: 'Unde merge timpul',
          desc: 'Observă obiceiurile care îți frânează obiectivele.',
          icon: 'Clock',
          tone: '#a1a1aa',
        },
      ],
    },
    friendsFamily: {
      eyebrow: 'Cercul de încredere',
      title: 'Victoriile sunt mai bune împreună',
      subtitle: 'Adaugă prietenii și familia, citește reușitele lor, oferă susținere. Reușitele tale alături de cei apropiați.',
      screenshot: '/landing/screen-chats.png',
      cta: 'Încearcă împreună cu prietenii →',
      features: [
        {
          title: 'Fluxul celor apropiați',
          desc: 'Vezi acțiunile reale ale prietenilor, fără lăudăroșenie și filtre.',
        },
        {
          title: 'Reacții discrete',
          desc: 'Sprijină cu o flacără, un pumn strâns sau o vorbă caldă dintr-un singur clic.',
        },
        {
          title: 'Chaturi securizate',
          desc: 'Mesaje private și schimb de carduri fără priviri străine și fără spam.',
        },
      ],
    },
    globe: {
      eyebrow: 'EXEMPLE DE ÎNSEMNĂRI ÎN WINLOG',
      title: 'Exemple de însemnări',
      subtitle: 'Oameni din întreaga lume își notează victoriile. Iată cum arată în diferite țări.',
      globeHeadline: 'Sunt mândru că…',
      globeCaption: 'Exemple scurte de depășiri zilnice din diferite orașe ale lumii.',
      carouselHeading: 'Mai multe exemple de însemnări',
      labels: {
        previous: 'Însemnarea anterioară',
        next: 'Însemnarea următoare',
        pin: 'Însemnare din',
        storiesCountLabel: 'însemnări pe hartă',
        citiesLabel: 'orașe din lume',
        exampleBadge: 'Exemplu',
      },
    },
    privacy: {
      eyebrow: 'Control total',
      title: 'Împărtășește sau păstrează secretul',
      subtitle: 'Fiecare însemnare: privată, pentru prieteni, grup sau publică. Tu decizi în totalitate.',
      readMoreText: 'Află mai multe despre termeni și confidențialitate →',
      cards: [
        {
          badge: 'IMPLICIT PRIVAT',
          title: 'Personal (doar pentru tine)',
          desc: 'Implicit, însemnările tale sunt închise. Doar tu le poți vedea - fără reclame și fără antrenarea AI-ului pe textele tale.',
        },
        {
          badge: 'ACCES FLEXIBIL',
          title: 'Prietenilor, grupului sau întregii lumi',
          desc: 'Decizi singur pentru fiecare zi sau chiar pentru fiecare mândrie în parte: să o păstrezi pentru tine, să o arăți prietenilor reciproci, unui grup închis sau public.',
        },
      ],
    },
    facts: {
      eyebrow: 'Bază solidă',
      title: 'Nu promisiuni. Fapte.',
      subtitle: 'Doar indicatori verificabili ai sistemului, fără numere exagerate.',
      facts: [
        {
          val: '100%',
          label: 'datele tale',
          desc: 'Însemnările îți aparțin doar ție și se exportă într-un clic fără restricții.',
        },
        {
          val: '1–5',
          label: 'victorii pe zi',
          desc: 'Ritm flexibil de consemnare fără epuizare sau competiții artificiale.',
        },
        {
          val: '0 MDL',
          label: 'pentru a începe',
          desc: 'Funcționalitatea de bază a cronicii este accesibilă gratuit oricui, pentru totdeauna.',
        },
        {
          val: '0%',
          label: 'reclame și trackere',
          desc: 'Spațiu curat fără bannere publicitare, vânzare de date și zgomot comercial.',
        },
      ],
    },
    pricing: {
      eyebrow: 'Tarife',
      title: 'Începe gratuit. Crește mai departe când dorești',
      subtitle: 'Condiții transparente fără abonamente ascunse.',
      freeForeverBanner: 'Winlog de bază este gratuit pentru totdeauna - 0 MDL, fără reclame și fără plăți ascunse. Se plătesc doar funcțiile avansate.',
      monthlyToggle: 'Lunar',
      yearlyToggle: 'Anual',
      saveBadge: '-20%',
      recommendedBadge: '★ Recomandat',
      aiCalloutTitle: 'Cum funcționează mentorul cu inteligență artificială?',
      aiCalloutDesc: 'Descoperă cele 4 obiective cheie ale AI, scara depășirii 1–10★ și garanțiile Zero-Training.',
      aiCalloutBtn: 'Află mai multe despre AI Winlog →',
      tiers: [
        {
          id: 'free',
          name: 'De bază',
          desc: 'Tot ce ai nevoie pentru cronica zilnică și serie.',
          priceMonthly: '0 MDL',
          priceYearly: '0 MDL',
          period: '/ pentru totdeauna',
          badge: 'PLAN DE BAZĂ',
          features: [
            'Jurnal și serie gratuite pentru totdeauna',
            'Fără limită de lungime a însemnărilor',
            'Chaturi private, prieteni și schimb de carduri',
            'Grupuri pentru cei apropiați',
            'Fără taxe ascunse și fără reclame',
          ],
          cta: 'Începe gratuit',
          popular: false,
        },
        {
          id: 'pro',
          name: 'Premium',
          desc: 'Verificare oficială și analiză inteligentă AI pentru fiecare zi.',
          oldPriceYearly: '240 MDL',
          priceMonthly: '20 MDL',
          priceYearly: '192 MDL',
          periodMonthly: '/ lună',
          periodYearly: '/ an (~16 MDL/lună)',
          badge: 'PLAN RECOMANDAT',
          features: [
            'Toate beneficiile planului De bază',
            'Analiză AI zilnică și evaluare pe scară 1–10★',
            'Analize aprofundate pentru 100 și 365+ zile',
            'Până la 3 fotografii la însemnări zilnic',
            'Export elegant de carduri și stories',
            'Actualizări prioritare și grupuri de până la 25 persoane',
          ],
          cta: 'Alege',
          popular: true,
        },
        {
          id: 'ultra',
          name: 'Winlog Ultra',
          desc: 'Profunzime maximă, mentor personal și acces complet.',
          oldPriceYearly: '600 MDL',
          priceMonthly: '50 MDL',
          priceYearly: '480 MDL',
          periodMonthly: '/ lună',
          periodYearly: '/ an (~40 MDL/lună)',
          badge: 'WINLOG ULTRA',
          features: [
            'Toate facilitățile planului Premium',
            'Analiză aprofundată de la mentorul AI personal',
            'Statut și bifă de verificare în profil',
            'Comunități extinse de până la 100 participanți',
            'Arhivă completă și export al cronicii',
            'Suport prioritar și acces timpuriu la funcții',
          ],
          cta: 'Alege',
          popular: false,
        },
      ],
    },
    finalCta: {
      title: 'Începe propriul Winlog',
      subtitle: 'Înregistrarea este singurul pas. Nu trebuie să plătești nimic.',
      ctaButton: 'Începe gratuit',
      image: 'together.jpg',
    },
    footer: {
      title: 'Cronica personală a victoriilor și disciplinei',
      tagline: 'Notează adevăratele depășiri în fiecare seară. Drumul tău în Winlog îți aparține doar ție.',
      ctaBtn: 'Începe cronica',
      signinBtn: 'Intră',
      scrollTop: 'Sus',
      legalLink: 'Termeni și confidențialitate',
      copyright: `© ${new Date().getFullYear()} Winlog. Toate drepturile rezervate.`,
    },
  },

  /* ══════════════════════════════════════════════════════════════
     ENGLISH (EN)
     ══════════════════════════════════════════════════════════════ */
  en: {
    meta: {
      title: 'Winlog — Your life is made of victories. Write them down.',
      description: 'Winlog is a personal journal of pride and gratitude. Two minutes a day, free.',
    },
    nav: {
      modes: 'Gallery',
      how: 'How it works',
      ai: 'AI Mentor',
      quotes: 'Stories',
      privacy: 'Privacy',
      pricing: 'Pricing',
      signin: 'Sign in',
      signup: 'Get started',
      navigation: 'Navigation',
      home: 'Home',
      legal: 'Terms & Privacy',
      mobileCta: 'Start your journal',
      mobileSignin: 'Sign in to account',
      langLabel: 'Interface Language',
    },
    hero: {
      eyebrow: 'A personal chronicle of strength',
      title: 'Your life is made of victories. Write them down.',
      subtitle: 'Winlog is a personal journal of pride and gratitude. Two minutes a day, free.',
      ctaPrimary: 'Start for free',
      ctaSecondary: 'Sign in',
      trustBadge: 'Free · Ad-free · No credit card required',
      videoSrc: 'mainvideo.mp4',
    },
    prideWheel: {
      eyebrow: 'Examples of daily victories',
      title: 'Proud that I…',
      subtitle: 'Every victory counts. Here is what people record in Winlog.',
      wheelLabel: 'Proud that I…',
      actionText: 'To journal',
      galleryLabel: 'Interactive gallery',
      hintLabel: 'Click a card or scroll down',
      scrollDownLabel: 'Scroll down ↓',
      items: [
        {
          tag: 'Business',
          title: 'Proud that I closed the deal I had pursued for six months.',
          subtitle: 'Proud that I closed the deal I had pursued for six months.',
          image: '/media/landing/mode-work.jpg',
        },
        {
          tag: 'Sport',
          title: 'Proud that I rode out for a sunrise workout even when I wanted to stay in bed.',
          subtitle: 'Proud that I rode out for a sunrise workout even when I wanted to stay in bed.',
          image: '/media/landing/mode-sport-3.jpg',
        },
        {
          tag: 'Family',
          title: 'Proud that I spent the whole evening with my family, phone-free.',
          subtitle: 'Proud that I spent the whole evening with my family, phone-free.',
          image: '/media/landing/mode-family.jpg',
        },
        {
          tag: 'Work',
          title: 'Proud that I solved the problem I had wrestled with all week.',
          subtitle: 'Proud that I solved the problem I had wrestled with all week.',
          image: '/media/landing/mode-work-2.jpg',
        },
        {
          tag: 'Study',
          title: 'Proud that I passed the exam I was dreading the most.',
          subtitle: 'Proud that I passed the exam I was dreading the most.',
          image: '/media/landing/mode-creative-2.jpg',
        },
        {
          tag: 'Discipline',
          title: 'Proud that I swam the full distance without slowing down on the final lap.',
          subtitle: 'Proud that I swam the full distance without slowing down on the final lap.',
          image: '/media/landing/mode-sport-2.jpg',
        },
        {
          tag: 'Character',
          title: 'Proud that I did not turn back on the steep climb and finished the entire trail.',
          subtitle: 'Proud that I did not turn back on the steep climb and finished the entire trail.',
          image: '/media/landing/mode-sport-5.jpg',
        },
        {
          tag: 'Tough Times',
          title: 'Proud that I persevered through a hard season without giving up.',
          subtitle: 'Proud that I persevered through a hard season without giving up.',
          image: '/media/landing/mode-sport.jpg',
        },
        {
          tag: 'Dream',
          title: 'Proud that I finally took action on what I had dreamed about for years.',
          subtitle: 'Proud that I finally took action on what I had dreamed about for years.',
          image: '/media/landing/mode-sport-4.jpg',
        },
      ],
    },
    howItWorks: {
      eyebrow: 'Evening ritual',
      title: 'Two minutes each evening',
      subtitle: 'Five victories and five gratitudes daily. Winlog handles the rest.',
      steps: [
        {
          step: '01',
          title: '1–5 moments of pride',
          desc: 'Capture genuine accomplishments from your day. No fluff — just actions you truly respect yourself for.',
        },
        {
          step: '02',
          title: 'Genuine gratitude',
          desc: 'Shift your mindset from anxiety to calm. Notice support from loved ones, lucky breaks, and joy.',
        },
        {
          step: '03',
          title: 'Unbreakable streak',
          desc: 'Your streak counts completed days of strength, not consecutive unbroken days. No guilt and no burnout.',
        },
      ],
      showcase: {
        feedTab: 'Daily Feed',
        analyticsTab: 'Analytics',
        leaderboardTab: 'Leaderboard',
        chatsTab: 'Chats',
        streakTitle: 'Streak',
        streakDesc: 'Day counter',
        prideTitle: 'Daily pride',
        prideDesc: 'Input field',
        gratitudeTitle: 'Gratitude',
        gratitudeDesc: 'Evening ritual',
        friendsTitle: 'Friends',
        friendsDesc: 'Friends section',
        aiEvalTitle: 'AI Review',
        aiEvalDesc: 'Star rating & advice',
        leaderboardTitle: 'Top streaks',
        leaderboardDesc: 'Longest runs',
        chatTitle: 'Private chats',
        chatDesc: 'Encrypted dialogs',
      },
    },
    tempo: {
      eyebrow: 'A promise to yourself',
      title: 'Choose a pace you can sustain',
      subtitle: 'From one pride entry a day up to five. Your first 3 pace changes are available right after registration, then once every 30 days.',
      cta: 'Choose your pace and begin your journal →',
      levels: [
        {
          count: '1',
          flames: 1,
          title: '1 fact',
          sub: 'Anti-burnout',
          desc: 'The minimum threshold of honesty. Keeps you anchored even on stormy, exhausting days.',
          extreme: false,
          delay: 'delay-100',
        },
        {
          count: '2',
          flames: 2,
          title: '2 facts',
          sub: 'Life standard',
          desc: 'One achievement for work, one for body or home. A steady pace every day.',
          extreme: false,
          delay: 'delay-200',
        },
        {
          count: '3',
          flames: 3,
          title: '3 facts',
          sub: 'Breakthrough mode',
          desc: 'Mindful focus on core milestones without straining your nervous system.',
          extreme: false,
          delay: 'delay-300',
        },
        {
          count: '4',
          flames: 4,
          title: '4 facts',
          sub: 'High momentum',
          desc: 'For leaders running ambitious projects, disciplined training, and teams.',
          extreme: false,
          delay: 'delay-400',
        },
        {
          count: '5',
          flames: 5,
          title: '5 facts',
          sub: 'Extreme Mode',
          desc: 'Ultimate concentration and forging an unbreakable character.',
          extreme: true,
          delay: 'delay-500',
        },
      ],
    },
    aiAnalysis: {
      eyebrow: 'AI Analysis',
      title: 'Winlog spots growth you might overlook',
      subtitle: 'AI analyzes your entries to reveal your strengths, pacing, and where your time truly goes.',
      screenshot: '/landing/screens/analytics.png',
      mobileScreenshot: '/landing/screens/mobile-analytics.png',
      windowTitle: 'Winlog — Analytics & Growth',
      statusBadge: 'AI Active',
      learnMore: 'Learn how AI works in Winlog →',
      cards: [
        {
          id: 'pace',
          title: 'Your pace',
          desc: 'Clear comparison with your previous month.',
          icon: 'TrendingUp',
          tone: '#e4e4e7',
        },
        {
          id: 'strengths',
          title: 'Your strengths',
          desc: 'The areas where you grow the fastest.',
          icon: 'Sparkles',
          tone: '#d76737',
        },
        {
          id: 'time',
          title: 'Where time goes',
          desc: 'Notice patterns holding you back from your goals.',
          icon: 'Clock',
          tone: '#a1a1aa',
        },
      ],
    },
    friendsFamily: {
      eyebrow: 'Circle of trust',
      title: 'Victories are better together',
      subtitle: 'Add friends and family, follow their wins, and support one another. Share accomplishments with those who care.',
      screenshot: '/landing/screen-chats.png',
      cta: 'Try it with friends →',
      features: [
        {
          title: 'Circle feed',
          desc: 'See real accomplishments of loved ones without boasting or filters.',
        },
        {
          title: 'Quiet reactions',
          desc: 'Support with a flame, a fist bump, or a kind word in one click.',
        },
        {
          title: 'Secure chats',
          desc: 'Private messages and card sharing with zero prying eyes and no spam.',
        },
      ],
    },
    globe: {
      eyebrow: 'JOURNAL ENTRIES IN WINLOG',
      title: 'Real entries',
      subtitle: 'People around the world write down their victories. Here is what it looks like globally.',
      globeHeadline: 'Proud that I…',
      globeCaption: 'Short glimpses of daily courage from cities around the world.',
      carouselHeading: 'More journal examples',
      labels: {
        previous: 'Previous story',
        next: 'Next story',
        pin: 'Story from',
        storiesCountLabel: 'stories on map',
        citiesLabel: 'cities worldwide',
        exampleBadge: 'Example',
      },
    },
    privacy: {
      eyebrow: 'Full control',
      title: 'Share or keep it private',
      subtitle: 'Every entry: private, for friends, a group, or public. You are in full control.',
      readMoreText: 'Learn more about terms and privacy →',
      cards: [
        {
          badge: 'PRIVATE BY DEFAULT',
          title: 'Private (just for you)',
          desc: 'Your entries are private by default. Only you can see them - zero ads and zero AI training on your writing.',
        },
        {
          badge: 'FLEXIBLE SHARING',
          title: 'Friends, a group, or the world',
          desc: 'You decide for every day or even each individual win: keep it private, share with mutual friends, post to a closed group, or make it public.',
        },
      ],
    },
    facts: {
      eyebrow: 'Solid foundation',
      title: 'Not promises. Facts.',
      subtitle: 'Only verifiable platform metrics without inflated numbers.',
      facts: [
        {
          val: '100%',
          label: 'your data',
          desc: 'Your entries belong strictly to you and can be exported in one click anytime.',
        },
        {
          val: '1–5',
          label: 'wins per day',
          desc: 'Flexible journaling pace without burnout or artificial pressure.',
        },
        {
          val: '0 MDL',
          label: 'to get started',
          desc: 'The core journaling experience is available to everyone for free, forever.',
        },
        {
          val: '0%',
          label: 'ads and trackers',
          desc: 'A clean space without banner ads, data selling, or commercial noise.',
        },
      ],
    },
    pricing: {
      eyebrow: 'Pricing',
      title: 'Start for free. Scale up when you are ready',
      subtitle: 'Transparent terms without hidden subscriptions.',
      freeForeverBanner: 'Basic Winlog is free forever - 0 MDL, with zero ads and no hidden fees. Only advanced features are paid.',
      monthlyToggle: 'Monthly',
      yearlyToggle: 'Yearly',
      saveBadge: '-20%',
      recommendedBadge: '★ Recommended',
      aiCalloutTitle: 'How does the AI Mentor work?',
      aiCalloutDesc: 'Explore the 4 key AI tasks, the 1–10★ evaluation scale, and our Zero-Training guarantee.',
      aiCalloutBtn: 'Learn more about Winlog AI →',
      tiers: [
        {
          id: 'free',
          name: 'Basic',
          desc: 'Everything you need for your daily journal and streak.',
          priceMonthly: '0 MDL',
          priceYearly: '0 MDL',
          period: '/ forever',
          badge: 'BASIC PLAN',
          features: [
            'Journal and streak free forever',
            'Unlimited entry length',
            'Private chats, friends, and card sharing',
            'Groups for close friends and family',
            'No hidden fees and no advertisements',
          ],
          cta: 'Start for free',
          popular: false,
        },
        {
          id: 'pro',
          name: 'Pro',
          desc: 'Official verification and smart daily AI analysis.',
          oldPriceYearly: '240 MDL',
          priceMonthly: '20 MDL',
          priceYearly: '192 MDL',
          periodMonthly: '/ month',
          periodYearly: '/ year (~16 MDL/mo)',
          badge: 'RECOMMENDED PLAN',
          features: [
            'All Basic plan features included',
            'Daily AI analytics and 1–10★ strength score',
            'Deep insights for 100 and 365+ days',
            'Up to 3 photos per entry every day',
            'Clean card and story exports',
            'Priority updates and groups up to 25 members',
          ],
          cta: 'Choose Pro',
          popular: true,
        },
        {
          id: 'ultra',
          name: 'Winlog Ultra',
          desc: 'Maximum depth, personal mentor, and full access.',
          oldPriceYearly: '600 MDL',
          priceMonthly: '50 MDL',
          priceYearly: '480 MDL',
          periodMonthly: '/ month',
          periodYearly: '/ year (~40 MDL/mo)',
          badge: 'WINLOG ULTRA',
          features: [
            'All Premium plan features included',
            'Deep breakdown from personal AI mentor',
            'Verified badge and status on your profile',
            'Large communities up to 100 members',
            'Complete chronicle archive and export',
            'Priority support and early feature access',
          ],
          cta: 'Choose Ultra',
          popular: false,
        },
      ],
    },
    finalCta: {
      title: 'Start your Winlog',
      subtitle: 'Registration is the only step. No payment needed.',
      ctaButton: 'Start for free',
      image: 'together.jpg',
    },
    footer: {
      title: 'A personal chronicle of victories and discipline',
      tagline: 'Record genuine accomplishments every evening. Your journey in Winlog belongs to you alone.',
      ctaBtn: 'Start journaling',
      signinBtn: 'Sign in',
      scrollTop: 'Top',
      legalLink: 'Terms & Privacy',
      copyright: `© ${new Date().getFullYear()} Winlog. All rights reserved.`,
    },
  },
}

export function getLandingContent(locale: Locale = 'ru'): LandingContent {
  return I18N_LANDING[locale] || I18N_LANDING.ru
}

export const LOCALES: readonly Locale[] = ['ru', 'ro', 'en'] as const

export function isValidLocale(lang: string): lang is Locale {
  return LOCALES.includes(lang as Locale)
}

/**
 * Extracts locale from a pathname ending: e.g. /ru, /ro, /en, /ai/ru, /legal/ro
 */
export function getLocaleFromPath(pathname: string | null | undefined): Locale {
  if (!pathname) return 'ru'
  const clean = pathname.replace(/\/$/, '')
  if (clean.endsWith('/ro') || clean === '/ro') return 'ro'
  if (clean.endsWith('/en') || clean === '/en') return 'en'
  if (clean.endsWith('/ru') || clean === '/ru') return 'ru'
  return 'ru'
}

/**
 * Given current pathname and target locale, returns the path with the target locale at the end.
 * Examples:
 *   ('/', 'ro') -> '/ro'
 *   ('/ru', 'ro') -> '/ro'
 *   ('/ai', 'ro') -> '/ai/ro'
 *   ('/ai/ru', 'ro') -> '/ai/ro'
 *   ('/legal/en', 'ru') -> '/legal/ru'
 */
export function buildLocaleUrl(pathname: string | null | undefined, targetLocale: Locale): string {
  if (!pathname || pathname === '/' || pathname === '/ru' || pathname === '/ro' || pathname === '/en') {
    return `/${targetLocale}`
  }

  // Remove trailing slashes and existing locale suffix if present
  let base = pathname.replace(/\/$/, '')
  for (const loc of LOCALES) {
    if (base.endsWith(`/${loc}`)) {
      base = base.slice(0, -`/${loc}`.length)
      break
    }
  }

  if (!base || base === '') {
    return `/${targetLocale}`
  }

  return `${base}/${targetLocale}`
}

/**
 * Localized stories for the 3D globe and carousel
 */
export const LOCALIZED_STORIES: Record<
  Locale,
  {
    globeStories: Array<{
      id: string
      type?: string
      city: string
      country: string
      lat: number
      lng: number
      topic: string
      quote: string
      image?: string
      tone?: number
      author?: string
      location?: string
    }>
    extraStories: Array<{
      id: string
      type?: string
      city: string
      country: string
      topic: string
      quote: string
    }>
  }
> = {
  ru: {
    globeStories: [
      { id: 'chisinau', type: 'example', city: 'Кишинёв', country: 'MD', author: 'Дан М.', location: 'Moldova, Chisinau', lat: 47.01, lng: 28.86, topic: 'Семья', quote: 'Горжусь тем, что впервые за год позвонил маме и просто поговорил без спешки.', image: '/media/avatars/avatar-1.jpg', tone: 1 },
      { id: 'london', type: 'example', city: 'Лондон', country: 'GB', author: 'Оливер С.', location: 'UK, London', lat: 51.51, lng: -0.13, topic: 'Работа', quote: 'Горжусь тем, что защитил сложный проект перед советом директоров и отстоял команду.', image: '/media/avatars/avatar-2.jpg', tone: 2 },
      { id: 'new-york', type: 'example', city: 'Нью-Йорк', country: 'US', author: 'Майкл Б.', location: 'USA, New York', lat: 40.71, lng: -74.01, topic: 'Здоровье', quote: 'Горжусь тем, что уже 90 дней не прикасаюсь к сигаретам и чувствую лёгкость в лёгких.', image: '/media/avatars/avatar-3.jpg', tone: 3 },
      { id: 'tokyo', type: 'example', city: 'Токио', country: 'JP', author: 'Кэндзи Т.', location: 'Japan, Tokyo', lat: 35.68, lng: 139.69, topic: 'Учёба', quote: 'Горжусь тем, что сдал сложнейший международный экзамен по языку с первой попытки.', image: '/media/avatars/avatar-4.jpg', tone: 4 },
      { id: 'sydney', type: 'example', city: 'Сидней', country: 'AU', author: 'Лиам У.', location: 'Australia, Sydney', lat: -33.87, lng: 151.21, topic: 'Спорт', quote: 'Горжусь тем, что пробежал свой первый полумарафон на рассвете вдоль океана.', image: '/media/avatars/avatar-5.jpg', tone: 2 },
      { id: 'nairobi', type: 'example', city: 'Найроби', country: 'KE', author: 'Дэвид К.', location: 'Kenya, Nairobi', lat: -1.29, lng: 36.82, topic: 'Мечта', quote: 'Горжусь тем, что открыл свою небольшую мастерскую, о которой грезил пять лет.', image: '/media/avatars/avatar-6.jpg', tone: 1 },
      { id: 'rio', type: 'example', city: 'Рио-де-Жанейро', country: 'BR', author: 'Лукас С.', location: 'Brazil, Rio de Janeiro', lat: -22.91, lng: -43.17, topic: 'Страх', quote: 'Горжусь тем, что переборол панический страх высоты и поднялся на смотровую площадку.', image: '/media/avatars/avatar-7.jpg', tone: 4 },
      { id: 'berlin', type: 'example', city: 'Берлин', country: 'DE', author: 'Лукас М.', location: 'Germany, Berlin', lat: 52.52, lng: 13.4, topic: 'Характер', quote: 'Горжусь тем, что вежливо отказался от токсичного контракта ради своего спокойствия.', image: '/media/avatars/avatar-8.jpg', tone: 3 },
      { id: 'mumbai', type: 'example', city: 'Мумбаи', country: 'IN', author: 'Аарав П.', location: 'India, Mumbai', lat: 19.08, lng: 72.88, topic: 'Дружба', quote: 'Горжусь тем, что поддержал старого друга в трудную минуту, когда все отвернулись.', image: '/media/avatars/avatar-9.jpg', tone: 5 },
      { id: 'toronto', type: 'example', city: 'Торонто', country: 'CA', author: 'Даниэль Р.', location: 'Canada, Toronto', lat: 43.65, lng: -79.38, topic: 'Семья', quote: 'Горжусь тем, что провёл целые выходные с детьми за городом, оставив рабочий ноутбук дома.', image: '/media/avatars/avatar-10.jpg', tone: 2 },
      { id: 'istanbul', type: 'example', city: 'Стамбул', country: 'TR', author: 'Эмре Й.', location: 'Turkey, Istanbul', lat: 41.01, lng: 28.98, topic: 'Преодоление', quote: 'Горжусь тем, что не опустил руки после провала первого стартапа и запустил новый.', image: '/media/avatars/avatar-11.jpg', tone: 1 },
      { id: 'seoul', type: 'example', city: 'Сеул', country: 'KR', author: 'Мин-джун К.', location: 'South Korea, Seoul', lat: 37.57, lng: 126.98, topic: 'Творчество', quote: 'Горжусь тем, что дописал и отправил в издательство рукопись своей первой книги.', image: '/media/avatars/avatar-12.jpg', tone: 3 },
      { id: 'mexico-city', type: 'example', city: 'Мехико', country: 'MX', author: 'Матео Г.', location: 'Mexico, Mexico City', lat: 19.43, lng: -99.13, topic: 'Здоровье', quote: 'Горжусь тем, что восстановился после тяжёлой травмы ноги и снова начал ходить в горы.', image: '/media/avatars/avatar-13.jpg', tone: 4 },
      { id: 'cape-town', type: 'example', city: 'Кейптаун', country: 'ZA', author: 'Табо Н.', location: 'South Africa, Cape Town', lat: -33.92, lng: 18.42, topic: 'Мечта', quote: 'Горжусь тем, что решился изменить профессию в 35 лет и получил первый оффер в IT.', image: '/media/avatars/avatar-14.jpg', tone: 2 },
      { id: 'warsaw', type: 'example', city: 'Варшава', country: 'PL', author: 'Якуб В.', location: 'Poland, Warsaw', lat: 52.23, lng: 21.01, topic: 'Доброта', quote: 'Горжусь тем, что помог пожилой соседке с ремонтом и продуктами на зиму.', image: '/media/avatars/avatar-15.jpg', tone: 5 },
    ],
    extraStories: [
      { id: 'almaty', type: 'example', city: 'Алматы', country: 'KZ', topic: 'Спорт', quote: 'Горжусь тем, что поднялся на пик в предгорьях без одышки и встретил рассвет.' },
      { id: 'tbilisi', type: 'example', city: 'Тбилиси', country: 'GE', topic: 'Семья', quote: 'Горжусь тем, что собрал за одним столом три поколения нашей большой семьи.' },
      { id: 'paris', type: 'example', city: 'Париж', country: 'FR', topic: 'Творчество', quote: 'Горжусь тем, что выставил свои акварельные этюды в небольшой галерее.' },
      { id: 'oslo', type: 'example', city: 'Осло', country: 'NO', topic: 'Здоровье', quote: 'Горжусь тем, что приучил себя к контрастному душу и утренней зарядке каждый день.' },
      { id: 'singapore', type: 'example', city: 'Сингапур', country: 'SG', topic: 'Работа', quote: 'Горжусь тем, что автоматизировал рутинную отчётность и сэкономил команде 10 часов в неделю.' },
    ],
  },
  ro: {
    globeStories: [
      { id: 'chisinau', type: 'example', city: 'Chișinău', country: 'MD', author: 'Dan M.', location: 'Moldova, Chisinau', lat: 47.01, lng: 28.86, topic: 'Familie', quote: 'Sunt mândru că am sunat-o pe mama pentru prima dată în acest an și am vorbit fără grabă.', image: '/media/avatars/avatar-1.jpg', tone: 1 },
      { id: 'london', type: 'example', city: 'Londra', country: 'GB', author: 'Oliver S.', location: 'UK, London', lat: 51.51, lng: -0.13, topic: 'Muncă', quote: 'Sunt mândru că am susținut un proiect dificil în fața consiliului de administrație și am apărat echipa.', image: '/media/avatars/avatar-2.jpg', tone: 2 },
      { id: 'new-york', type: 'example', city: 'New York', country: 'US', author: 'Michael B.', location: 'USA, New York', lat: 40.71, lng: -74.01, topic: 'Sănătate', quote: 'Sunt mândru că au trecut 90 de zile de când nu mai fumez și simt din nou respirația curată.', image: '/media/avatars/avatar-3.jpg', tone: 3 },
      { id: 'tokyo', type: 'example', city: 'Tokyo', country: 'JP', author: 'Kenji T.', location: 'Japan, Tokyo', lat: 35.68, lng: 139.69, topic: 'Studii', quote: 'Sunt mândru că am promovat cel mai greu examen internațional de limbă din prima încercare.', image: '/media/avatars/avatar-4.jpg', tone: 4 },
      { id: 'sydney', type: 'example', city: 'Sydney', country: 'AU', author: 'Liam W.', location: 'Australia, Sydney', lat: -33.87, lng: 151.21, topic: 'Sport', quote: 'Sunt mândru că am alergat primul meu semimaraton la răsărit pe malul oceanului.', image: '/media/avatars/avatar-5.jpg', tone: 2 },
      { id: 'nairobi', type: 'example', city: 'Nairobi', country: 'KE', author: 'David K.', location: 'Kenya, Nairobi', lat: -1.29, lng: 36.82, topic: 'Vis', quote: 'Sunt mândru că am deschis micul meu atelier la care visam de cinci ani.', image: '/media/avatars/avatar-6.jpg', tone: 1 },
      { id: 'rio', type: 'example', city: 'Rio de Janeiro', country: 'BR', author: 'Lucas S.', location: 'Brazil, Rio de Janeiro', lat: -22.91, lng: -43.17, topic: 'Curaj', quote: 'Sunt mândru că am învins frica de înălțime și am urcat pe platforma panoramică.', image: '/media/avatars/avatar-7.jpg', tone: 4 },
      { id: 'berlin', type: 'example', city: 'Berlin', country: 'DE', author: 'Lukas M.', location: 'Germany, Berlin', lat: 52.52, lng: 13.4, topic: 'Caracter', quote: 'Sunt mândru că am refuzat politicos un contract toxic pentru liniștea mea sufletească.', image: '/media/avatars/avatar-8.jpg', tone: 3 },
      { id: 'mumbai', type: 'example', city: 'Mumbai', country: 'IN', author: 'Aarav P.', location: 'India, Mumbai', lat: 19.08, lng: 72.88, topic: 'Prietenie', quote: 'Sunt mândru că am sprijinit un vechi prieten într-un moment greu, când toți se îndepărtaseră.', image: '/media/avatars/avatar-9.jpg', tone: 5 },
      { id: 'toronto', type: 'example', city: 'Toronto', country: 'CA', author: 'Daniel R.', location: 'Canada, Toronto', lat: 43.65, lng: -79.38, topic: 'Familie', quote: 'Sunt mândru că am petrecut tot weekendul cu copiii în afara orașului, lăsând laptopul acasă.', image: '/media/avatars/avatar-10.jpg', tone: 2 },
      { id: 'istanbul', type: 'example', city: 'Istanbul', country: 'TR', author: 'Emre Y.', location: 'Turkey, Istanbul', lat: 41.01, lng: 28.98, topic: 'Perseverență', quote: 'Sunt mândru că nu am renunțat după eșecul primului startup și am lansat altul.', image: '/media/avatars/avatar-11.jpg', tone: 1 },
      { id: 'seoul', type: 'example', city: 'Seul', country: 'KR', author: 'Min-jun K.', location: 'South Korea, Seoul', lat: 37.57, lng: 126.98, topic: 'Creativitate', quote: 'Sunt mândru că am terminat și am trimis la editură manuscrisul primei mele cărți.', image: '/media/avatars/avatar-12.jpg', tone: 3 },
      { id: 'mexico-city', type: 'example', city: 'Ciudad de México', country: 'MX', author: 'Mateo G.', location: 'Mexico, Mexico City', lat: 19.43, lng: -99.13, topic: 'Sănătate', quote: 'Sunt mândru că m-am recuperat după o accidentare grea la picior și merg din nou pe munte.', image: '/media/avatars/avatar-13.jpg', tone: 4 },
      { id: 'cape-town', type: 'example', city: 'Cape Town', country: 'ZA', author: 'Thabo N.', location: 'South Africa, Cape Town', lat: -33.92, lng: 18.42, topic: 'Vis', quote: 'Sunt mândru că am avut curajul să schimb profesia la 35 de ani și am primit prima ofertă în IT.', image: '/media/avatars/avatar-14.jpg', tone: 2 },
      { id: 'warsaw', type: 'example', city: 'Varșovia', country: 'PL', author: 'Jakub W.', location: 'Poland, Warsaw', lat: 52.23, lng: 21.01, topic: 'Bunătate', quote: 'Sunt mândru că am ajutat o vecină în vârstă cu reparațiile și proviziile pentru iarnă.', image: '/media/avatars/avatar-15.jpg', tone: 5 },
    ],
    extraStories: [
      { id: 'almaty', type: 'example', city: 'Almaty', country: 'KZ', topic: 'Sport', quote: 'Sunt mândru că am urcat pe vârful montan fără să mă opresc și am privit răsăritul.' },
      { id: 'tbilisi', type: 'example', city: 'Tbilisi', country: 'GE', topic: 'Familie', quote: 'Sunt mândru că am adunat la aceeași masă trei generații din marea noastră familie.' },
      { id: 'paris', type: 'example', city: 'Paris', country: 'FR', topic: 'Creativitate', quote: 'Sunt mândru că am expus picturile mele în acuarelă într-o mică galerie.' },
      { id: 'oslo', type: 'example', city: 'Oslo', country: 'NO', topic: 'Sănătate', quote: 'Sunt mândru că am deprins obiceiul dușului rece și al mișcării în fiecare dimineață.' },
      { id: 'singapore', type: 'example', city: 'Singapore', country: 'SG', topic: 'Muncă', quote: 'Sunt mândru că am automatizat rapoartele de rutină și am salvat 10 ore săptămânal.' },
    ],
  },
  en: {
    globeStories: [
      { id: 'chisinau', type: 'example', city: 'Chisinau', country: 'MD', author: 'Dan M.', location: 'Moldova, Chisinau', lat: 47.01, lng: 28.86, topic: 'Family', quote: 'Proud that I called my mom for the first time in a year and had a long, unhurried conversation.', image: '/media/avatars/avatar-1.jpg', tone: 1 },
      { id: 'london', type: 'example', city: 'London', country: 'GB', author: 'Oliver S.', location: 'UK, London', lat: 51.51, lng: -0.13, topic: 'Work', quote: 'Proud that I defended a challenging project before the board and backed my team.', image: '/media/avatars/avatar-2.jpg', tone: 2 },
      { id: 'new-york', type: 'example', city: 'New York', country: 'US', author: 'Michael B.', location: 'USA, New York', lat: 40.71, lng: -74.01, topic: 'Health', quote: 'Proud that I have been smoke-free for 90 days and feel the lightness in my lungs.', image: '/media/avatars/avatar-3.jpg', tone: 3 },
      { id: 'tokyo', type: 'example', city: 'Tokyo', country: 'JP', author: 'Kenji T.', location: 'Japan, Tokyo', lat: 35.68, lng: 139.69, topic: 'Study', quote: 'Proud that I passed a rigorous international language exam on my very first try.', image: '/media/avatars/avatar-4.jpg', tone: 4 },
      { id: 'sydney', type: 'example', city: 'Sydney', country: 'AU', author: 'Liam W.', location: 'Australia, Sydney', lat: -33.87, lng: 151.21, topic: 'Sport', quote: 'Proud that I ran my first half-marathon at dawn along the ocean.', image: '/media/avatars/avatar-5.jpg', tone: 2 },
      { id: 'nairobi', type: 'example', city: 'Nairobi', country: 'KE', author: 'David K.', location: 'Kenya, Nairobi', lat: -1.29, lng: 36.82, topic: 'Dream', quote: 'Proud that I opened my own small workshop after dreaming about it for five years.', image: '/media/avatars/avatar-6.jpg', tone: 1 },
      { id: 'rio', type: 'example', city: 'Rio de Janeiro', country: 'BR', author: 'Lucas S.', location: 'Brazil, Rio de Janeiro', lat: -22.91, lng: -43.17, topic: 'Courage', quote: 'Proud that I overcame my fear of heights and stepped out onto the observation deck.', image: '/media/avatars/avatar-7.jpg', tone: 4 },
      { id: 'berlin', type: 'example', city: 'Berlin', country: 'DE', author: 'Lukas M.', location: 'Germany, Berlin', lat: 52.52, lng: 13.4, topic: 'Character', quote: 'Proud that I politely turned down a toxic contract to protect my peace of mind.', image: '/media/avatars/avatar-8.jpg', tone: 3 },
      { id: 'mumbai', type: 'example', city: 'Mumbai', country: 'IN', author: 'Aarav P.', location: 'India, Mumbai', lat: 19.08, lng: 72.88, topic: 'Friendship', quote: 'Proud that I stood by an old friend during a hard moment when everyone else walked away.', image: '/media/avatars/avatar-9.jpg', tone: 5 },
      { id: 'toronto', type: 'example', city: 'Toronto', country: 'CA', author: 'Daniel R.', location: 'Canada, Toronto', lat: 43.65, lng: -79.38, topic: 'Family', quote: 'Proud that I spent the whole weekend in nature with my kids, leaving my work laptop behind.', image: '/media/avatars/avatar-10.jpg', tone: 2 },
      { id: 'istanbul', type: 'example', city: 'Istanbul', country: 'TR', author: 'Emre Y.', location: 'Turkey, Istanbul', lat: 41.01, lng: 28.98, topic: 'Grit', quote: 'Proud that I did not give up after my first startup failed and launched a new one.', image: '/media/avatars/avatar-11.jpg', tone: 1 },
      { id: 'seoul', type: 'example', city: 'Seoul', country: 'KR', author: 'Min-jun K.', location: 'South Korea, Seoul', lat: 37.57, lng: 126.98, topic: 'Creativity', quote: 'Proud that I completed and submitted the manuscript of my first book to the publisher.', image: '/media/avatars/avatar-12.jpg', tone: 3 },
      { id: 'mexico-city', type: 'example', city: 'Mexico City', country: 'MX', author: 'Mateo G.', location: 'Mexico, Mexico City', lat: 19.43, lng: -99.13, topic: 'Health', quote: 'Proud that I recovered from a severe leg injury and started hiking in the mountains again.', image: '/media/avatars/avatar-13.jpg', tone: 4 },
      { id: 'cape-town', type: 'example', city: 'Cape Town', country: 'ZA', author: 'Thabo N.', location: 'South Africa, Cape Town', lat: -33.92, lng: 18.42, topic: 'Dream', quote: 'Proud that I took the leap to switch careers at 35 and accepted my first tech offer.', image: '/media/avatars/avatar-14.jpg', tone: 2 },
      { id: 'warsaw', type: 'example', city: 'Warsaw', country: 'PL', author: 'Jakub W.', location: 'Poland, Warsaw', lat: 52.23, lng: 21.01, topic: 'Kindness', quote: 'Proud that I helped an elderly neighbor with home repairs and groceries for the winter.', image: '/media/avatars/avatar-15.jpg', tone: 5 },
    ],
    extraStories: [
      { id: 'almaty', type: 'example', city: 'Almaty', country: 'KZ', topic: 'Sport', quote: 'Proud that I hiked to the mountain peak with ease and watched the sunrise.' },
      { id: 'tbilisi', type: 'example', city: 'Tbilisi', country: 'GE', topic: 'Family', quote: 'Proud that I brought together three generations of our large family at one table.' },
      { id: 'paris', type: 'example', city: 'Paris', country: 'FR', topic: 'Creativity', quote: 'Proud that I exhibited my watercolor sketches in a small neighborhood gallery.' },
      { id: 'oslo', type: 'example', city: 'Oslo', country: 'NO', topic: 'Health', quote: 'Proud that I built the habit of cold showers and morning mobility every day.' },
      { id: 'singapore', type: 'example', city: 'Singapore', country: 'SG', topic: 'Work', quote: 'Proud that I automated routine reporting and saved the team 10 hours every week.' },
    ],
  },
}
