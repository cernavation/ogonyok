import type { Day, EvidenceItem, PrideEntry } from './types'

export const CURRENT_DAY = 719

export const STATS = {
  streak: 719,
  prides: 719,
  gratitudes: 662,
  entries: '3585+',
} as const

export const PHOTOS: string[] = []

export const INITIAL_PRIDES: PrideEntry[] = [
  {
    num: '01',
    text: 'Сделал 45 минут глубокой работы над проектом',
    scale: 7,
    overcome: 2,
  },
  {
    num: '02',
    text: 'Сделал тренировку и сохранил дисциплину',
    scale: 8,
    overcome: 2,
  },
  {
    num: '03',
    text: 'Позвонил родителям и был по-настоящему внимательным',
    scale: 5,
    overcome: 1,
  },
  {
    num: '04',
    text: 'Опубликовал новую версию Огонька',
    scale: 9,
    overcome: 3,
  },
  {
    num: '05',
    text: 'Лёг спать вовремя и сохранил энергию',
    scale: 6,
    overcome: 2,
  },
]

export const INITIAL_GRATITUDES: string[] = [
  'Благодарен маме за поддержку и спокойный разговор',
  'Благодарен Мише за челлендж в шахматы',
  'Благодарен телу за энергию двигаться',
  'Благодарен команде за честный фидбэк',
  'Благодарен себе за то, что начал без идеальных условий',
]

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'ev-1',
    date: '14 МАРТА 2025',
    title: 'Проехал 130 км, хотя хотел остановиться',
    description: 'Ты продолжил, когда было проще остановиться. Характер стал сильнее.',
    category: 'Спорт',
    pinned: true,
  },
  {
    id: 'ev-2',
    date: '02 ФЕВРАЛЯ 2025',
    title: 'Опубликовал проект, несмотря на страх оценки',
    description: 'Ты продолжил, когда было проще остановиться. Характер стал сильнее.',
    category: 'Memernity',
    pinned: true,
  },
  {
    id: 'ev-3',
    date: '18 ЯНВАРЯ 2025',
    title: 'Три недели возвращался к маленьким шагам',
    description: 'Ты продолжил, когда было проще остановиться. Характер стал сильнее.',
    category: 'Сомнения',
    pinned: false,
  },
]

export const EVIDENCE_CATEGORIES = [
  'Все',
  'Сомнения',
  'Memernity',
  'Спорт',
  'Школа',
] as const

export const FEED_TABS = [
  'Для тебя',
  '🔥 Гордости',
  '❤️ Благодарности',
  '#Memernity',
  '#Спорт',
  '#Учёба',
] as const

export const TRENDING_TAGS = [
  '#Memernity',
  '#Спорт',
  '#Учёба',
  '#Дисциплина',
  '#Осознанность',
] as const

export const INITIAL_DAYS: Day[] = [
  {
    id: CURRENT_DAY,
    title: 'Сегодня не искал мотивацию — просто начал. Маленькие победы тоже строят большую историю.',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Memernity', '#Спорт'],
    prides: INITIAL_PRIDES,
    gratitudes: INITIAL_GRATITUDES,
    photos: undefined,
    dateISO: '2026-10-09T09:14:00.000Z',
    status: 'normal',
  },
]
