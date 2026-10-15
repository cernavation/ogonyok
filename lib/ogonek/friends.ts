/**
 * Круг друзей и соратников Огонька.
 *
 * Это демонстрационная социальная карта профиля: люди, с которыми
 * пользователь идёт по пути силы. Данные используются во вкладке «Друзья»
 * профиля и хранятся отдельно от основного дневника (никаких фейковых
 * записей в летописи — только социальный граф).
 */

export type FriendProfile = {
  id: string
  name: string
  /** @username без ведущего символа @ */
  username: string
  initials: string
  /** CSS-градиент аватара-заглушки */
  avatarColor: string
  bio: string
  city: string
  /** Текущий стрик друга в днях */
  streak: number
  /** Сколько раз плечом к плечу держали огонь */
  together: number
  /** Общие знакомые / взаимные подписки */
  mutual: number
  verified: boolean
  /** Как давно был активен (человекочитаемо) */
  lastActive: string
}

export const FRIEND_PROFILES: FriendProfile[] = [
  {
    id: 'fr-voloshin',
    name: 'Михаил Волошин',
    username: 'voloshin',
    initials: 'МВ',
    avatarColor: 'linear-gradient(135deg, #1d9bf0 0%, #0a4d8c 100%)',
    bio: 'Гроссмейстер жизни. Играю партию длиной в 719 дней и не сдаюсь на 40-м ходу.',
    city: 'Кишинёв',
    streak: 512,
    together: 118,
    mutual: 24,
    verified: true,
    lastActive: '5 минут назад',
  },
  {
    id: 'fr-sokolova',
    name: 'Мария Соколова',
    username: 'msokolova',
    initials: 'МС',
    avatarColor: 'linear-gradient(135deg, #f91880 0%, #7d1f4a 100%)',
    bio: 'Продукт-дизайнер и марафонец. Верю, что дисциплина — это форма любви к себе.',
    city: 'Берлин',
    streak: 438,
    together: 96,
    mutual: 31,
    verified: true,
    lastActive: '20 минут назад',
  },
  {
    id: 'fr-orlov',
    name: 'Дмитрий Орлов',
    username: 'dorlov',
    initials: 'ДО',
    avatarColor: 'linear-gradient(135deg, #a855f7 0%, #5b21b6 100%)',
    bio: 'Основатель студии. Каждое утро — 90 минут глубокой работы до рассвета.',
    city: 'Варшава',
    streak: 366,
    together: 74,
    mutual: 12,
    verified: false,
    lastActive: '1 час назад',
  },
  {
    id: 'fr-kovaleva',
    name: 'Анна Ковалёва',
    username: 'akovaleva',
    initials: 'АК',
    avatarColor: 'linear-gradient(135deg, #22c55e 0%, #0f5132 100%)',
    bio: 'Врач и триатлетка. Учусь благодарить тело за каждый километр.',
    city: 'Бухарест',
    streak: 297,
    together: 61,
    mutual: 8,
    verified: true,
    lastActive: '3 часа назад',
  },
  {
    id: 'fr-petrov',
    name: 'Игорь Петров',
    username: 'ipetrov',
    initials: 'ИП',
    avatarColor: 'linear-gradient(135deg, #ff8a50 0%, #c2410c 100%)',
    bio: 'Инженер и отец двоих. Пишу по странице в день уже второй год.',
    city: 'Тбилиси',
    streak: 254,
    together: 45,
    mutual: 5,
    verified: false,
    lastActive: 'вчера',
  },
  {
    id: 'fr-safina',
    name: 'Елена Сафина',
    username: 'esafina',
    initials: 'ЕС',
    avatarColor: 'linear-gradient(135deg, #67e8f9 0%, #155e75 100%)',
    bio: 'Пианистка. 40 минут практики в день, даже когда зал пуст.',
    city: 'Прага',
    streak: 213,
    together: 33,
    mutual: 3,
    verified: false,
    lastActive: '2 дня назад',
  },
  {
    id: 'fr-grinev',
    name: 'Роман Гринёв',
    username: 'rgrinev',
    initials: 'РГ',
    avatarColor: 'linear-gradient(135deg, #ffd76a 0%, #6b5210 100%)',
    bio: 'Предприниматель в edtech. Верю, что характер куётся в мелочах.',
    city: 'Лондон',
    streak: 188,
    together: 27,
    mutual: 17,
    verified: true,
    lastActive: '4 дня назад',
  },
  {
    id: 'fr-belova',
    name: 'Ольга Белова',
    username: 'obelova',
    initials: 'ОБ',
    avatarColor: 'linear-gradient(135deg, #f472b6 0%, #9d174d 100%)',
    bio: 'Коуч и автор рассылки о маленьких шагах. Люблю утренние ритуалы.',
    city: 'Амстердам',
    streak: 142,
    together: 19,
    mutual: 9,
    verified: false,
    lastActive: 'неделю назад',
  },
  {
    id: 'fr-timofeev',
    name: 'Сергей Тимофеев',
    username: 'stimofeev',
    initials: 'СТ',
    avatarColor: 'linear-gradient(135deg, #536471 0%, #1f2429 100%)',
    bio: 'Аналитик и скалолаз. Считаю преодоление главной метрикой роста.',
    city: 'София',
    streak: 96,
    together: 11,
    mutual: 2,
    verified: false,
    lastActive: '2 недели назад',
  },
  {
    id: 'fr-lanskaya',
    name: 'Виктория Ланская',
    username: 'vlanskaya',
    initials: 'ВЛ',
    avatarColor: 'linear-gradient(135deg, #c4a6ff 0%, #3d1a6b 100%)',
    bio: 'Юрист и бегунья. Каждый старт — маленькая победа над собой.',
    city: 'Дубай',
    streak: 74,
    together: 7,
    mutual: 6,
    verified: false,
    lastActive: '3 недели назад',
  },
]

/** Подписки по умолчанию — ближайший круг соратников */
export const DEFAULT_FOLLOWING_IDS: string[] = [
  'fr-voloshin',
  'fr-sokolova',
  'fr-orlov',
  'fr-kovaleva',
]

export function getFriend(id: string): FriendProfile | undefined {
  return FRIEND_PROFILES.find((friend) => friend.id === id)
}
