/**
 * ЭТАП 12 — ГЛОБАЛЬНЫЙ ХАБ ИССЛЕДОВАНИЯ (EXPLORE).
 *
 * Чистый модуль без DOM-зависимостей: описывает социальную карту всего
 * сообщества Огонька — людях со всего мира, их тегах-категориях, фото-ленте
 * достижений и лидеров по стрикам. Раздел «Поиск» использует эти данные,
 * чтобы стать живым хабом исследования соцсети, а не списком своих дней.
 *
 * Идентичности в круге друзей (`fr-*`) переиспользуются из `friends.ts`,
 * чтобы карточки людей в хабе и в профиле сходились. Глобальные участники
 * получают префикс `gu-*` и живут только в этом хабе.
 */

import { FRIEND_PROFILES } from './friends.ts'

/* ────────────────────────────────────────────────────────────────────────
   КАТЕГОРИИ-ТЕГИ
   ──────────────────────────────────────────────────────────────────────── */

export type ExploreCategoryId = 'sport' | 'business' | 'education' | 'memernity' | 'health'

export type ExploreCategory = {
  id: ExploreCategoryId
  /** Хэштег категории, например «#Спорт» */
  tag: string
  label: string
  emoji: string
  /** Градиент плитки категории */
  from: string
  to: string
  /** Акцентный цвет текста/иконок */
  accent: string
  description: string
  /** Сколько людей выбрали категорию своим путём */
  memberCount: number
}

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  {
    id: 'sport',
    tag: '#Спорт',
    label: 'Спорт',
    emoji: '🏃',
    from: '#0a1420',
    to: '#123a5a',
    accent: '#66ffd9',
    description: 'Пробежки, зал, марафоны и дисциплина тела',
    memberCount: 18420,
  },
  {
    id: 'business',
    tag: '#Бизнес',
    label: 'Бизнес',
    emoji: '💼',
    from: '#1a1405',
    to: '#6b5210',
    accent: '#ffd76a',
    description: 'Сделки, выручка, партнёрства и своё дело',
    memberCount: 9250,
  },
  {
    id: 'education',
    tag: '#Учеба',
    label: 'Учеба',
    emoji: '📚',
    from: '#120a24',
    to: '#3d1a6b',
    accent: '#c4a6ff',
    description: 'Курсы, книги, языки и вечное обучение',
    memberCount: 14100,
  },
  {
    id: 'memernity',
    tag: '#Memernity',
    label: 'Memernity',
    emoji: '✦',
    from: '#2a1206',
    to: '#7a2f0c',
    accent: '#ffa600',
    description: 'Осознанность, характер и память о преодолении',
    memberCount: 11300,
  },
  {
    id: 'health',
    tag: '#Здоровье',
    label: 'Здоровье',
    emoji: '🌿',
    from: '#0a1a10',
    to: '#14532d',
    accent: '#4ade80',
    description: 'Сон, питание, восстановление и энергия',
    memberCount: 10740,
  },
]

export const EXPLORE_CATEGORY_BY_ID: Record<ExploreCategoryId, ExploreCategory> = EXPLORE_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category
    return acc
  },
  {} as Record<ExploreCategoryId, ExploreCategory>
)

export function getExploreCategory(id: ExploreCategoryId): ExploreCategory {
  return EXPLORE_CATEGORY_BY_ID[id] ?? EXPLORE_CATEGORIES[0]
}

/* ────────────────────────────────────────────────────────────────────────
   ЛЮДИ СООБЩЕСТВА
   ──────────────────────────────────────────────────────────────────────── */

export type CommunityUser = {
  id: string
  name: string
  username: string
  initials: string
  avatarColor: string
  city: string
  country: string
  /** Текущий стрик в днях */
  streak: number
  verified: boolean
  bio: string
  categories: ExploreCategoryId[]
  followers: number
  achievements: number
  /** Человекочитаемая метка активности */
  activeLabel: string
  /** Насколько вырос стрик за сегодня (для бейджа «сегодня в мире») */
  todayDelta?: number
  /** Это — сам пользователь Огонька */
  isMe?: boolean
}

/** Тематика и география для людей из круга друзей (`fr-*`) */
const FRIEND_EXPLORE_META: Record<
  string,
  {
    country: string
    categories: ExploreCategoryId[]
    followers: number
    achievements: number
    todayDelta?: number
  }
> = {
  'fr-voloshin': { country: 'Молдова', categories: ['education', 'memernity'], followers: 48200, achievements: 64, todayDelta: 1 },
  'fr-sokolova': { country: 'Германия', categories: ['business', 'sport'], followers: 39600, achievements: 58, todayDelta: 2 },
  'fr-orlov': { country: 'Польша', categories: ['business', 'education'], followers: 27400, achievements: 41 },
  'fr-kovaleva': { country: 'Румыния', categories: ['health', 'sport'], followers: 22100, achievements: 37, todayDelta: 1 },
  'fr-petrov': { country: 'Грузия', categories: ['education', 'memernity'], followers: 9800, achievements: 25 },
  'fr-safina': { country: 'Чехия', categories: ['education', 'health'], followers: 7600, achievements: 21 },
  'fr-grinev': { country: 'Великобритания', categories: ['business', 'education'], followers: 18300, achievements: 33, todayDelta: 1 },
  'fr-belova': { country: 'Нидерланды', categories: ['health', 'memernity'], followers: 6400, achievements: 18 },
  'fr-timofeev': { country: 'Болгария', categories: ['sport', 'education'], followers: 4100, achievements: 12 },
  'fr-lanskaya': { country: 'ОАЭ', categories: ['sport', 'business'], followers: 5200, achievements: 15, todayDelta: 1 },
}

/** Дополнительные глобальные участники со всего мира (префикс `gu-`) */
const GLOBAL_COMMUNITY_USERS: CommunityUser[] = [
  {
    id: 'gu-hana',
    name: 'Хана Мори',
    username: 'hana_mori',
    initials: 'ХМ',
    avatarColor: 'linear-gradient(135deg, #f472b6 0%, #9d174d 100%)',
    city: 'Токио',
    country: 'Япония',
    streak: 812,
    verified: true,
    bio: 'Марафон в дождливую погоду — мой лучший день. Держу огонь 800+ дней и бегу каждое утро.',
    categories: ['sport', 'health'],
    followers: 128000,
    achievements: 92,
    activeLabel: 'сейчас',
    todayDelta: 2,
  },
  {
    id: 'gu-nordstrom',
    name: 'Эрик Нордстрём',
    username: 'nordictrail',
    initials: 'ЭН',
    avatarColor: 'linear-gradient(135deg, #67e8f9 0%, #155e75 100%)',
    city: 'Стокгольм',
    country: 'Швеция',
    streak: 765,
    verified: true,
    bio: 'Холодные утренние пробежки и дневник благодарности. Тело — храм характера.',
    categories: ['sport', 'health'],
    followers: 96400,
    achievements: 81,
    activeLabel: '5 минут назад',
    todayDelta: 1,
  },
  {
    id: 'gu-adeyemi',
    name: 'Фола Адейеми',
    username: 'folabuilds',
    initials: 'ФА',
    avatarColor: 'linear-gradient(135deg, #ff8a50 0%, #c2410c 100%)',
    city: 'Лагос',
    country: 'Нигерия',
    streak: 731,
    verified: true,
    bio: 'Три стартапа, одна цель в месяц. Выручка растёт, привычка — крепче.',
    categories: ['business', 'memernity'],
    followers: 201000,
    achievements: 74,
    activeLabel: '12 минут назад',
    todayDelta: 3,
  },
  {
    id: 'gu-garcia',
    name: 'Лусия Гарсиа',
    username: 'luciaaprende',
    initials: 'ЛГ',
    avatarColor: 'linear-gradient(135deg, #c4a6ff 0%, #3d1a6b 100%)',
    city: 'Мадрид',
    country: 'Испания',
    streak: 698,
    verified: false,
    bio: 'Учу китайский каждый день. Слово за словом — 700 дней без пропуска.',
    categories: ['education', 'memernity'],
    followers: 58200,
    achievements: 66,
    activeLabel: '40 минут назад',
  },
  {
    id: 'gu-okafor',
    name: 'Чинеду Окафор',
    username: 'chinedu_ok',
    initials: 'ЧО',
    avatarColor: 'linear-gradient(135deg, #4ade80 0%, #14532d 100%)',
    city: 'Торонто',
    country: 'Канада',
    streak: 654,
    verified: true,
    bio: 'Врач и отец. Сон вовремя — главная победа дня. Благодарность вместо тревоги.',
    categories: ['health', 'education'],
    followers: 73200,
    achievements: 59,
    activeLabel: '1 час назад',
    todayDelta: 1,
  },
  {
    id: 'gu-tanaka',
    name: 'Кэн Танака',
    username: 'ken_builds',
    initials: 'КТ',
    avatarColor: 'linear-gradient(135deg, #ffd76a 0%, #6b5210 100%)',
    city: 'Осака',
    country: 'Япония',
    streak: 601,
    verified: false,
    bio: 'Инди-разработчик. Пишу продукт каждый вечер после работы.',
    categories: ['business', 'education'],
    followers: 41900,
    achievements: 48,
    activeLabel: '2 часа назад',
  },
  {
    id: 'gu-mwangi',
    name: 'Амина Мванги',
    username: 'aminaruns',
    initials: 'АМ',
    avatarColor: 'linear-gradient(135deg, #f91880 0%, #7d1f4a 100%)',
    city: 'Найроби',
    country: 'Кения',
    streak: 543,
    verified: true,
    bio: 'Бегунья на длинные дистанции. Марафон за марафоном, с улыбкой.',
    categories: ['sport', 'health'],
    followers: 88400,
    achievements: 52,
    activeLabel: '3 часа назад',
    todayDelta: 2,
  },
  {
    id: 'gu-petrova',
    name: 'Ирина Петрова',
    username: 'irinafocus',
    initials: 'ИП',
    avatarColor: 'linear-gradient(135deg, #536471 0%, #1f2429 100%)',
    city: 'Тбилиси',
    country: 'Грузия',
    streak: 487,
    verified: false,
    bio: 'Глубокая работа по утрам. Один большой проект, разбитый на маленькие шаги.',
    categories: ['business', 'memernity'],
    followers: 30400,
    achievements: 39,
    activeLabel: 'вчера',
  },
  {
    id: 'gu-silva',
    name: 'Рафаэль Силва',
    username: 'rafa_journey',
    initials: 'РС',
    avatarColor: 'linear-gradient(135deg, #a855f7 0%, #5b21b6 100%)',
    city: 'Сан-Паулу',
    country: 'Бразилия',
    streak: 421,
    verified: false,
    bio: 'Дневник каждый вечер. Благодарность за мелочи держит меня на плаву.',
    categories: ['memernity', 'health'],
    followers: 26700,
    achievements: 34,
    activeLabel: 'вчера',
  },
  {
    id: 'gu-chan',
    name: 'Вэй Чан',
    username: 'weichan_read',
    initials: 'ВЧ',
    avatarColor: 'linear-gradient(135deg, #22c55e 0%, #0f5132 100%)',
    city: 'Сингапур',
    country: 'Сингапур',
    streak: 356,
    verified: true,
    bio: 'Книга в неделю. Учусь медленно и глубоко — без гонки.',
    categories: ['education', 'memernity'],
    followers: 45300,
    achievements: 29,
    activeLabel: '2 дня назад',
    todayDelta: 1,
  },
  {
    id: 'gu-almeida',
    name: 'Беатрис Алмейда',
    username: 'bea_strong',
    initials: 'БА',
    avatarColor: 'linear-gradient(135deg, #1d9bf0 0%, #0a4d8c 100%)',
    city: 'Лиссабон',
    country: 'Португалия',
    streak: 289,
    verified: false,
    bio: 'Силовые тренировки и здоровое питание. Каждый подход — маленькая победа.',
    categories: ['sport', 'health'],
    followers: 19800,
    achievements: 24,
    activeLabel: '2 дня назад',
  },
  {
    id: 'gu-hassan',
    name: 'Омар Хассан',
    username: 'omar_grows',
    initials: 'ОХ',
    avatarColor: 'linear-gradient(135deg, #ffa600 0%, #7a2f0c 100%)',
    city: 'Дубай',
    country: 'ОАЭ',
    streak: 233,
    verified: false,
    bio: 'Строю команду и характер одновременно. Бизнес — это тоже дисциплина.',
    categories: ['business', 'sport'],
    followers: 15200,
    achievements: 19,
    activeLabel: '3 дня назад',
  },
]

/** Текущий пользователь Огонька в социальной карте хаба */
const ME_USER: CommunityUser = {
  id: 'me',
  name: 'Алексей Черна',
  username: 'cernavation',
  initials: 'AC',
  avatarColor:
    'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
  city: 'Moldova',
  country: 'Молдова',
  streak: 720,
  verified: true,
  bio: 'Серийный предприниматель & Барефут-марафонец. Основатель Memernity.',
  categories: ['business', 'sport', 'memernity'],
  followers: 412000,
  achievements: 87,
  activeLabel: 'сейчас',
  todayDelta: 1,
  isMe: true,
}

export const COMMUNITY_USERS: CommunityUser[] = [
  ME_USER,
  ...FRIEND_PROFILES.map(
    (friend): CommunityUser => {
      const meta = FRIEND_EXPLORE_META[friend.id] ?? {
        country: '',
        categories: ['memernity'],
        followers: 1000,
        achievements: 5,
      }
      return {
        id: friend.id,
        name: friend.name,
        username: friend.username,
        initials: friend.initials,
        avatarColor: friend.avatarColor,
        city: friend.city,
        country: meta.country,
        streak: friend.streak,
        verified: friend.verified,
        bio: friend.bio,
        categories: meta.categories,
        followers: meta.followers,
        achievements: meta.achievements,
        activeLabel: friend.lastActive,
        todayDelta: meta.todayDelta,
      }
    }
  ),
  ...GLOBAL_COMMUNITY_USERS,
]

export const COMMUNITY_USER_IDS: string[] = COMMUNITY_USERS.map((u) => u.id)

export function getCommunityUser(id: string): CommunityUser | undefined {
  return COMMUNITY_USERS.find((user) => user.id === id)
}

/* ────────────────────────────────────────────────────────────────────────
   ФОТО-ЛЕНТА ДОСТИЖЕНИЙ СООБЩЕСТВА
   ──────────────────────────────────────────────────────────────────────── */

export type CommunityPost = {
  id: string
  authorId: string
  emoji: string
  kicker: string
  caption: string
  tags: string[]
  category: ExploreCategoryId
  likes: number
  comments: number
  dateLabel: string
  city: string
  /** Опубликовано сегодня — попадает в «Лучшее за сегодня в мире» */
  isToday: boolean
  verified: boolean
  from: string
  to: string
  accent: string
  /** Реальный фото-реф (id из IndexedDB / data URL); по умолчанию градиент */
  photo?: string | null
}

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'cp-1',
    authorId: 'gu-hana',
    emoji: '🏔️',
    kicker: 'ГОРНЫЙ ЗАБЕГ',
    caption: 'Финишировала 3-й среди женщин на горном марафоне. 42 км по камням — и ни шагу назад.',
    tags: ['#Спорт', '#Здоровье'],
    category: 'sport',
    likes: 12840,
    comments: 412,
    dateLabel: 'сегодня',
    city: 'Нагано',
    isToday: true,
    verified: true,
    from: '#0a1420',
    to: '#123a5a',
    accent: '#66ffd9',
  },
  {
    id: 'cp-2',
    authorId: 'gu-adeyemi',
    emoji: '🚀',
    kicker: 'ПЕРВАЯ СДЕЛКА',
    caption: 'Закрыл первый контракт на $50K. Три месяца переговоров, 60 отказов — и вот да.',
    tags: ['#Бизнес', '#Memernity'],
    category: 'business',
    likes: 9420,
    comments: 318,
    dateLabel: 'сегодня',
    city: 'Лагос',
    isToday: true,
    verified: true,
    from: '#1a1405',
    to: '#6b5210',
    accent: '#ffd76a',
  },
  {
    id: 'cp-3',
    authorId: 'gu-garcia',
    emoji: '🀄',
    kicker: '3000 ИЕРОГЛИФОВ',
    caption: 'Достигла рубежа в 3000 иероглифов. Учила по 15 минут в день — почти два года.',
    tags: ['#Учеба', '#Memernity'],
    category: 'education',
    likes: 7310,
    comments: 244,
    dateLabel: 'сегодня',
    city: 'Мадрид',
    isToday: true,
    verified: false,
    from: '#120a24',
    to: '#3d1a6b',
    accent: '#c4a6ff',
  },
  {
    id: 'cp-4',
    authorId: 'gu-okafor',
    emoji: '😴',
    kicker: '100 НОЧЕЙ СНА',
    caption: '100 ночей подряд ложился до 23:00. Энергия вернулась, тревога ушла.',
    tags: ['#Здоровье', '#Memernity'],
    category: 'health',
    likes: 6890,
    comments: 203,
    dateLabel: 'сегодня',
    city: 'Торонто',
    isToday: true,
    verified: true,
    from: '#0a1a10',
    to: '#14532d',
    accent: '#4ade80',
  },
  {
    id: 'cp-5',
    authorId: 'gu-mwangi',
    emoji: '🏃‍♀️',
    kicker: 'ЛИЧНЫЙ РЕКОРД',
    caption: 'Полумарафон за 1:28. Три года назад не могла пробежать и километра.',
    tags: ['#Спорт'],
    category: 'sport',
    likes: 11250,
    comments: 356,
    dateLabel: 'сегодня',
    city: 'Найроби',
    isToday: true,
    verified: true,
    from: '#240a17',
    to: '#6b1846',
    accent: '#f91880',
  },
  {
    id: 'cp-6',
    authorId: 'fr-voloshin',
    emoji: '♟️',
    kicker: 'ПАРТИЯ ДЛИНОЮ В ЖИЗНЬ',
    caption: '719 дней без пропуска. Каждый день — один ход вперёд, даже когда не хочется.',
    tags: ['#Учеба', '#Memernity'],
    category: 'education',
    likes: 15620,
    comments: 528,
    dateLabel: 'вчера',
    city: 'Кишинёв',
    isToday: false,
    verified: true,
    from: '#2a1206',
    to: '#7a2f0c',
    accent: '#ffa600',
  },
  {
    id: 'cp-7',
    authorId: 'fr-sokolova',
    emoji: '💻',
    kicker: 'ЗАПУСК ПРОДУКТА',
    caption: 'Выпустила редизайн приложения. 2000 пользователей в первый же день.',
    tags: ['#Бизнес'],
    category: 'business',
    likes: 8340,
    comments: 276,
    dateLabel: 'вчера',
    city: 'Берлин',
    isToday: false,
    verified: true,
    from: '#0a1420',
    to: '#123a5a',
    accent: '#66ffd9',
  },
  {
    id: 'cp-8',
    authorId: 'gu-tanaka',
    emoji: '🛠️',
    kicker: 'MVP ГОТОВ',
    caption: 'Собрал первую версию продукта за 30 вечеров после работы. Запуск — на этой неделе.',
    tags: ['#Бизнес', '#Учеба'],
    category: 'business',
    likes: 5210,
    comments: 168,
    dateLabel: 'вчера',
    city: 'Осака',
    isToday: false,
    verified: false,
    from: '#120a24',
    to: '#3d1a6b',
    accent: '#c4a6ff',
  },
  {
    id: 'cp-9',
    authorId: 'fr-kovaleva',
    emoji: '🚴',
    kicker: 'ТРИАТЛОН',
    caption: 'Прошла первый олимпийский триатлон. Плавание далось тяжелее всего — но финиш есть.',
    tags: ['#Спорт', '#Здоровье'],
    category: 'sport',
    likes: 7180,
    comments: 231,
    dateLabel: '3 дня назад',
    city: 'Бухарест',
    isToday: false,
    verified: true,
    from: '#0a1a10',
    to: '#14532d',
    accent: '#4ade80',
  },
  {
    id: 'cp-10',
    authorId: 'gu-chan',
    emoji: '📖',
    kicker: '52 КНИГИ',
    caption: 'Закрыл годовой вызов: 52 книги за 52 недели. Медленно, но по-настоящему.',
    tags: ['#Учеба', '#Memernity'],
    category: 'education',
    likes: 6040,
    comments: 197,
    dateLabel: '4 дня назад',
    city: 'Сингапур',
    isToday: false,
    verified: true,
    from: '#1a1405',
    to: '#6b5210',
    accent: '#ffd76a',
  },
  {
    id: 'cp-11',
    authorId: 'gu-silva',
    emoji: '🙏',
    kicker: 'ГОД БЛАГОДАРНОСТИ',
    caption: '365 дней записывал три благодарности. Стал замечать хорошее раньше плохого.',
    tags: ['#Memernity', '#Здоровье'],
    category: 'memernity',
    likes: 8830,
    comments: 289,
    dateLabel: '5 дней назад',
    city: 'Сан-Паулу',
    isToday: false,
    verified: false,
    from: '#2a1206',
    to: '#7a2f0c',
    accent: '#ffa600',
  },
  {
    id: 'cp-12',
    authorId: 'fr-grinev',
    emoji: '💰',
    kicker: 'ВЫРУЧКА ×3',
    caption: 'Утроил выручку за квартал. Не магией — а скучной ежедневной дисциплиной.',
    tags: ['#Бизнес', '#Memernity'],
    category: 'business',
    likes: 9640,
    comments: 341,
    dateLabel: '6 дней назад',
    city: 'Лондон',
    isToday: false,
    verified: true,
    from: '#1a1405',
    to: '#6b5210',
    accent: '#ffd76a',
  },
  {
    id: 'cp-13',
    authorId: 'gu-almeida',
    emoji: '🏋️',
    kicker: 'ДВОЙНОЙ ВЕС',
    caption: 'Приседание с двойным весом тела. Год назад боялся даже штанги.',
    tags: ['#Спорт', '#Здоровье'],
    category: 'sport',
    likes: 6890,
    comments: 210,
    dateLabel: 'неделю назад',
    city: 'Лиссабон',
    isToday: false,
    verified: false,
    from: '#0a1420',
    to: '#123a5a',
    accent: '#66ffd9',
  },
  {
    id: 'cp-14',
    authorId: 'gu-petrova',
    emoji: '🎯',
    kicker: 'ГЛУБОКАЯ РАБОТА',
    caption: '100 дней по 90 минут глубокой работы до рассвета. Проект вырос в бизнес.',
    tags: ['#Бизнес', '#Memernity'],
    category: 'business',
    likes: 5420,
    comments: 176,
    dateLabel: 'неделю назад',
    city: 'Тбилиси',
    isToday: false,
    verified: false,
    from: '#120a24',
    to: '#3d1a6b',
    accent: '#c4a6ff',
  },
  {
    id: 'cp-15',
    authorId: 'gu-hassan',
    emoji: '🥗',
    kicker: '90 ДНЕЙ БЕЗ САХАРА',
    caption: 'Отказался от сахара на три месяца. Ясность в голове стоит отказа от десерта.',
    tags: ['#Здоровье'],
    category: 'health',
    likes: 4760,
    comments: 158,
    dateLabel: 'неделю назад',
    city: 'Дубай',
    isToday: false,
    verified: false,
    from: '#0a1a10',
    to: '#14532d',
    accent: '#4ade80',
  },
  {
    id: 'cp-16',
    authorId: 'fr-safina',
    emoji: '🎹',
    kicker: 'ЧАС ПРАКТИКИ',
    caption: '40 минут у пианино каждый день 500 дней. Даже когда зал пуст.',
    tags: ['#Учеба', '#Memernity'],
    category: 'education',
    likes: 3980,
    comments: 134,
    dateLabel: 'неделю назад',
    city: 'Прага',
    isToday: false,
    verified: false,
    from: '#120a24',
    to: '#3d1a6b',
    accent: '#c4a6ff',
  },
]

export const COMMUNITY_POST_IDS: string[] = COMMUNITY_POSTS.map((post) => post.id)

export function getCommunityPost(id: string): CommunityPost | undefined {
  return COMMUNITY_POSTS.find((post) => post.id === id)
}

export function getPostsByAuthor(authorId: string, limit = 6): CommunityPost[] {
  return COMMUNITY_POSTS.filter((post) => post.authorId === authorId).slice(0, limit)
}

/* ────────────────────────────────────────────────────────────────────────
   ДОПОЛНИТЕЛЬНЫЕ ТЕГИ ДЛЯ ОБЛАКА ТРЕНДОВ И ПОИСКА
   ──────────────────────────────────────────────────────────────────────── */

export type ExploreTag = {
  tag: string
  count: number
  categoryId?: ExploreCategoryId
}

export const EXPLORE_TRENDING_TAGS: ExploreTag[] = [
  { tag: '#Марафон', count: 4820, categoryId: 'sport' },
  { tag: '#РаннийПодъём', count: 3110, categoryId: 'health' },
  { tag: '#Стартап', count: 2740, categoryId: 'business' },
  { tag: '#Чтение', count: 2390, categoryId: 'education' },
  { tag: '#Медитация', count: 2050, categoryId: 'health' },
  { tag: '#Дисциплина', count: 5120, categoryId: 'memernity' },
  { tag: '#Осознанность', count: 1880, categoryId: 'memernity' },
  { tag: '#Переговоры', count: 1420, categoryId: 'business' },
]

/** Все теги хаба: категории + дополнительные тренды */
export function getAllExploreTags(): ExploreTag[] {
  return [
    ...EXPLORE_CATEGORIES.map((c) => ({ tag: c.tag, count: c.memberCount, categoryId: c.id })),
    ...EXPLORE_TRENDING_TAGS,
  ]
}

/* ────────────────────────────────────────────────────────────────────────
   ПОИСК И ПОДБОРКИ
   ──────────────────────────────────────────────────────────────────────── */

/** Нормализует текст: нижний регистр, без «#», ё→е — для терпимого поиска */
export function normalizeExploreQuery(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[#@]/g, '')
    .trim()
}

function matches(haystack: string, query: string): boolean {
  return normalizeExploreQuery(haystack).includes(query)
}

export type ExploreSearchResults = {
  categories: ExploreCategory[]
  users: CommunityUser[]
  posts: CommunityPost[]
  tags: ExploreTag[]
  total: number
}

/** Живой поиск по всем людям, тегам, категориям и фото-достижениям */
export function searchExplore(rawQuery: string, limit = 10): ExploreSearchResults {
  const query = normalizeExploreQuery(rawQuery)
  if (!query) {
    return { categories: [], users: [], posts: [], tags: [], total: 0 }
  }

  const categories = EXPLORE_CATEGORIES.filter(
    (c) =>
      matches(c.label, query) ||
      matches(c.tag, query) ||
      matches(c.description, query) ||
      matches(c.id, query)
  )

  const tagPool = getAllExploreTags()
  const tags = tagPool
    .filter((t) => matches(t.tag, query))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  const users = COMMUNITY_USERS.filter((u) => {
    if (matches(u.name, query)) return true
    if (matches(u.username, query)) return true
    if (matches(u.city, query)) return true
    if (matches(u.country, query)) return true
    if (matches(u.bio, query)) return true
    return u.categories.some((id) => {
      const cat = EXPLORE_CATEGORY_BY_ID[id]
      return matches(cat.label, query) || matches(cat.tag, query)
    })
  })
    .sort((a, b) => b.streak - a.streak)
    .slice(0, limit)

  const posts = COMMUNITY_POSTS.filter((p) => {
    if (matches(p.caption, query)) return true
    if (matches(p.kicker, query)) return true
    if (matches(p.city, query)) return true
    if (p.tags.some((t) => matches(t, query))) return true
    const author = getCommunityUser(p.authorId)
    if (author && (matches(author.name, query) || matches(author.username, query))) return true
    const cat = EXPLORE_CATEGORY_BY_ID[p.category]
    return matches(cat.label, query) || matches(cat.tag, query)
  })
    .sort((a, b) => Number(b.isToday) - Number(a.isToday) || b.likes - a.likes)
    .slice(0, limit)

  return {
    categories,
    users,
    posts,
    tags,
    total: categories.length + users.length + posts.length + tags.length,
  }
}

/** Лучшее за сегодня в мире: свежие публикации дня по вовлечённости */
export function getTodayHighlights(limit = 5): CommunityPost[] {
  return COMMUNITY_POSTS.filter((p) => p.isToday)
    .sort((a, b) => b.likes + b.comments * 3 - (a.likes + a.comments * 3))
    .slice(0, limit)
}

/** Топ лидеров по стрикам среди всего сообщества */
export function getTopStreakLeaders(limit = 8): CommunityUser[] {
  return [...COMMUNITY_USERS].sort((a, b) => b.streak - a.streak).slice(0, limit)
}

export type CommunityFeedFilter = {
  categoryId?: ExploreCategoryId | null
  tag?: string | null
  query?: string
  limit?: number
}

/** Живая фото-лента достижений с фильтром по категории/тегу/поиску */
export function getCommunityFeed(filter: CommunityFeedFilter = {}): CommunityPost[] {
  const { categoryId, tag, query = '', limit } = filter
  const normTag = normalizeExploreQuery(tag ?? '')
  const normQuery = normalizeExploreQuery(query)

  const filtered = COMMUNITY_POSTS.filter((post) => {
    if (categoryId && post.category !== categoryId) return false
    if (normTag && !post.tags.some((t) => normalizeExploreQuery(t) === normTag)) return false
    if (normQuery) {
      const inCaption = matches(post.caption, normQuery)
      const inKicker = matches(post.kicker, normQuery)
      const inTags = post.tags.some((t) => matches(t, normQuery))
      const author = getCommunityUser(post.authorId)
      const inAuthor = author ? matches(author.name, normQuery) || matches(author.username, normQuery) : false
      if (!inCaption && !inKicker && !inTags && !inAuthor) return false
    }
    return true
  })

  const sorted = filtered.sort(
    (a, b) =>
      Number(b.isToday) - Number(a.isToday) ||
      b.likes + b.comments * 2 - (a.likes + a.comments * 2)
  )

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}

/** Сколько публикаций в категории (для бейджей) */
export function countPostsByCategory(categoryId: ExploreCategoryId): number {
  return COMMUNITY_POSTS.filter((post) => post.category === categoryId).length
}

/** Компактный формат числа: 12840 → «12,8K» */
export function formatCommunityCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value < 1000) return String(Math.round(value))
  if (value < 1_000_000) {
    const k = value / 1000
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace('.0', '')}K`
  }
  const m = value / 1_000_000
  return `${m.toFixed(1).replace('.0', '')}M`
}
