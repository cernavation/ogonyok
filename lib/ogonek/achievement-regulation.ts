import type {
  AchievementCategoryId,
  AchievementEvidenceRequirement,
  AchievementRegulation,
  AchievementStatus,
  VerifiedAchievement,
} from './types'

/**
 * ЭТАП 5 — ИИ-регламент доказательств для верифицированных ачивок.
 *
 * Чистый модуль без зависимостей от DOM:
 *  - описывает четыре категории достижений;
 *  - по категории и введённой теме строит строгий регламент — какие именно
 *    файлы-доказательства обязан приложить пользователь;
 *  - считает прогресс сбора доказательств и готовность к верификации.
 *
 * Тот же результат умеет строить серверный ИИ (Gemini) в
 * `app/api/achievements/regulate/route.ts`, а локальная эвристика здесь
 * служит бесшовным оффлайн/ошибочным fallback'ом.
 */

export type AchievementCategory = {
  id: AchievementCategoryId
  label: string
  short: string
  emoji: string
  color: string
  tagline: string
  description: string
  examples: string[]
  topicPlaceholder: string
  defaultTitle: string
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  {
    id: 'sport-record',
    label: 'Спортивный рекорд / Марафон',
    short: 'Спорт / Марафон',
    emoji: '🏆',
    color: '#f59e0b',
    tagline: 'Тело доказало — протокол подтвердит',
    description:
      'Личный рекорд, марафон, ультра, силовой норматив или победа в турнире. Самое жёсткое доказательство — официальные результаты.',
    examples: [
      'Полный марафон 42,2 км босиком',
      'Жим лёжа 50 кг',
      'Победа в шахматном турнире',
      'Ультра 100 км',
    ],
    topicPlaceholder: 'Например: финишировал полный марафон 42,2 км босиком на официальном забеге',
    defaultTitle: 'Спортивный рекорд',
  },
  {
    id: 'business',
    label: 'Бизнес-достижение',
    short: 'Бизнес',
    emoji: '💼',
    color: '#1d9bf0',
    tagline: 'Цифры вместо слов',
    description:
      'Первая выручка, сделка, запуск продукта, раунд инвестиций или рост метрики. Доказательство — деньги, договор или аналитика.',
    examples: [
      'Первая оплата подписки Memernity',
      'Подписанный партнёрский договор',
      'Запуск MVP с реальными пользователями',
      'Раунд инвестиций',
    ],
    topicPlaceholder: 'Например: получил первую оплату подписки Memernity от реального клиента',
    defaultTitle: 'Бизнес-достижение',
  },
  {
    id: 'education',
    label: 'Обучение / Наука',
    short: 'Обучение',
    emoji: '🎓',
    color: '#a855f7',
    tagline: 'Знание подтверждается документом',
    description:
      'Сертификат, диплом, победа в олимпиаде, сданный экзамен или научная публикация. Доказательство — верифицируемый документ.',
    examples: [
      'Диплом олимпиады',
      'Кембриджский сертификат по английскому',
      'Публикация исследования с DOI',
      'Финалист научного конкурса',
    ],
    topicPlaceholder: 'Например: стал призёром республиканской олимпиады по математике',
    defaultTitle: 'Учебное достижение',
  },
  {
    id: 'discipline',
    label: 'Стрик дисциплины',
    short: 'Дисциплина',
    emoji: '🔥',
    color: '#ff6b35',
    tagline: 'Каждый день без пропуска',
    description:
      'Длинная серия ежедневных действий: дневник, тренировки, медитация, отказ от привычки. Доказательство — экспорт треков.',
    examples: [
      '719 дней дневника без пропусков',
      '365 дней тренировок подряд',
      '180 дней медитации',
      'Год без сахара',
    ],
    topicPlaceholder: 'Например: 719 дней подряд вёл дневник гордости без единого пропуска',
    defaultTitle: 'Серия дисциплины',
  },
]

export function getAchievementCategory(id: AchievementCategoryId): AchievementCategory {
  return ACHIEVEMENT_CATEGORIES.find((c) => c.id === id) ?? ACHIEVEMENT_CATEGORIES[0]
}

/* ── Определение контекста темы ─────────────────────────────────────────── */

type TopicFlags = {
  marathon: boolean
  barefoot: boolean
  gym: boolean
  chess: boolean
  extreme: boolean
  revenue: boolean
  funding: boolean
  deal: boolean
  launch: boolean
  exam: boolean
  olympiad: boolean
  course: boolean
  research: boolean
  streak: boolean
  quit: boolean
  meditation: boolean
  training: boolean
}

function normalize(text: string): string {
  return (text ?? '').toLowerCase().replace(/ё/g, 'е').trim()
}

function matches(haystack: string, ...needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle))
}

function detectFlags(topic: string): TopicFlags {
  const t = normalize(topic)
  return {
    marathon: matches(t, 'марафон', '42', '21 км', 'полумарафон', 'ультра', '100 км', 'триатлон'),
    barefoot: matches(t, 'босиком', 'босые', 'barefoot', 'без обуви'),
    gym: matches(t, 'жим', 'присед', 'станов', 'зал', 'штанг', 'кг', 'силов', 'подтяг'),
    chess: matches(t, 'шахмат', 'турнир по шахмат', 'гроссмейстер', 'рейтинг'),
    extreme: matches(t, 'рекорд мира', 'мировой рекорд', 'мировой', 'гуиннес', 'чемпионат мира', 'ironman', 'экстрим'),
    revenue: matches(t, 'выручк', 'оплат', 'продаж', 'первая оплата', 'доход', 'revenue', 'клиент', 'подписк'),
    funding: matches(t, 'инвест', 'раунд', 'венчур', 'seed', 'терм-шит', 'термшит', 'valuation'),
    deal: matches(t, 'сделк', 'договор', 'контракт', 'партнер', 'партнёр', 'b2b', 'контрагент'),
    launch: matches(t, 'запуск', 'mvp', 'релиз', 'стартап', 'продукт', 'приложени', 'сайт'),
    exam: matches(t, 'экзамен', 'егэ', 'ielts', 'toefl', 'sat', 'огэ', 'зачет', 'зачёт', 'тест'),
    olympiad: matches(t, 'олимпиад', 'конкурс', 'соревнован по', 'призер', 'призёр', 'финалист', 'чемпионат по математик'),
    course: matches(t, 'курс', 'сертификат', 'coursera', 'программ', 'обучени', 'академи'),
    research: matches(t, 'исследов', 'наук', 'публикац', 'doi', 'статья', 'эксперимент', 'научн'),
    streak: matches(t, 'стрик', 'серия', 'подряд', 'дней', 'цепочк', 'без пропуск'),
    quit: matches(t, 'бросил', 'отказ', 'не кур', 'не пил', 'зависим', 'вредн', 'сахар'),
    meditation: matches(t, 'медитац', 'осознанн', 'практик', 'дыхан'),
    training: matches(t, 'трениров', 'бег', 'плавани', 'велосипед', 'спортзал', 'качал', 'кроссфит'),
  }
}

function req(
  id: string,
  title: string,
  purpose: string,
  formats: string[],
  required: boolean,
  example: string
): AchievementEvidenceRequirement {
  return { id, title, purpose, formats, required, example }
}

/* ── Базовые наборы требований по категориям ────────────────────────────── */

function sportRequirements(f: TopicFlags): AchievementEvidenceRequirement[] {
  const list: AchievementEvidenceRequirement[] = [
    req(
      'sport-protocol',
      'Официальный протокол соревнования',
      'Единственное безоговорочное доказательство результата: организатор фиксирует место, время и дистанцию.',
      ['PDF', 'JPG', 'PNG'],
      true,
      'Скан/скрин официального протокола с твоим именем, номером и финишным временем.'
    ),
  ]

  if (f.marathon || f.extreme) {
    list.push(
      req(
        'sport-result',
        'Чип-тайм / официальное финишное время',
        'Подтверждает именно твоё время, а не время лидера или чужого участника.',
        ['PDF', 'PNG', 'JPG', 'ссылка'],
        true,
        'Официальный результат из личного кабинета забега (Strava-сегмент не считается).'
      ),
      req(
        'sport-track',
        'GPS-трек дистанции',
        'Показывает, что дистанция пройдена полностью, без срезов и транспорта.',
        ['GPX', 'TCX', 'скриншот трека'],
        true,
        'Экспорт трека из часов или скриншот трека Strava/Garmin с картой и графиком темпа.'
      )
    )
  }

  if (f.barefoot) {
    list.push(
      req(
        'sport-barefoot-video',
        'Видео финиша без обуви',
        'Босиком — редкий и экстремальный формат: нужен непрерывный видеофакт, что обувь не использовалась.',
        ['MP4', 'MOV', 'ссылка на видео'],
        true,
        'Видео финишной прямой и стоп после финиша, где видны босые стопы, без монтажа.'
      ),
      req(
        'sport-medical',
        'Медицинский допуск / справка',
        'Подтверждает, что рекорд поставлен легально и без риска для здоровья.',
        ['PDF', 'JPG'],
        false,
        'Допуск спортивного врача с датой, близкой к старту.'
      )
    )
  }

  if (f.gym) {
    list.push(
      req(
        'sport-judge',
        'Протокол судейства силового норматива',
        'Вес без судьи оспорим: нужен независимый зафиксированный подход.',
        ['PDF', 'JPG', 'PNG'],
        true,
        'Протокол зала/соревнования с весом, числом повторений и подписью судьи или тренера.'
      ),
      req(
        'sport-lift-video',
        'Видео выполнения подхода',
        'Показывает глубину/технику и полную амплитуду без читинга.',
        ['MP4', 'MOV'],
        false,
        'Один непрерывный дубль подхода с видимым блином и амплитудой.'
      )
    )
  }

  if (f.chess) {
    list.push(
      req(
        'sport-rating',
        'Турнирная таблица / изменение рейтинга',
        'Доказывает итоговое место и силу соперников.',
        ['PDF', 'ссылка', 'PNG'],
        true,
        'Итоговая таблица турнира с твоим местом или скриншот обновлённого рейтинга (FIDE/lichess).'
      )
    )
  }

  list.push(
    req(
      'sport-photo',
      'Фото с дистанции / финиша',
      'Дополняет сухие цифры человеческим подтверждением.',
      ['JPG', 'PNG'],
      false,
      'Твоё фото с номером на фоне финишной арки или медали.'
    )
  )

  return list
}

function businessRequirements(f: TopicFlags): AchievementEvidenceRequirement[] {
  const list: AchievementEvidenceRequirement[] = []

  if (f.revenue || f.funding || f.deal) {
    list.push(
      req(
        'biz-revenue',
        'Скриншот выручки / поступлений',
        'Деньги — единственное неоспоримое доказательство бизнес-результата.',
        ['PNG', 'JPG', 'PDF', 'CSV'],
        true,
        'Дашборд Stripe/PayPal или выписка банка с суммой, валютой и датой платежа.'
      )
    )
  }

  if (f.funding) {
    list.push(
      req(
        'biz-term-sheet',
        'Term sheet / договор об инвестициях',
        'Подтверждает факт и условия раунда, а не намерение.',
        ['PDF'],
        true,
        'Подписанный term sheet или SAFE с суммой раунда и датой (суммы можно замазать, факт — нет).'
      )
    )
  }

  if (f.deal) {
    list.push(
      req(
        'biz-contract',
        'Подписанный договор с контрагентом',
        'Доказывает реальное партнёрство, а не переписку о намерениях.',
        ['PDF', 'JPG'],
        true,
        'Последняя страница договора с подписями и печатями обеих сторон (реквизиты можно скрыть).'
      )
    )
  }

  if (f.launch) {
    list.push(
      req(
        'biz-product-link',
        'Живая ссылка на продукт',
        'Подтверждает, что продукт действительно существует и работает.',
        ['ссылка'],
        true,
        'Рабочий URL продукта/приложения/лендинга, доступный без VPN и логина.'
      ),
      req(
        'biz-metrics',
        'Скриншот продуктовой метрики',
        'Доказывает реальное использование, а не факт деплоя.',
        ['PNG', 'JPG'],
        false,
        'Дашборд аналитики (GA/PostHog) с DAU, регистрациями или конверсией за период.'
      )
    )
  }

  if (list.length === 0) {
    list.push(
      req(
        'biz-result',
        'Документ о достигнутом результате',
        'Базовое подтверждение коммерческого результата.',
        ['PDF', 'PNG', 'ссылка'],
        true,
        'Любой официальный документ или дашборд, из которого однозначно виден результат.'
      )
    )
  }

  list.push(
    req(
      'biz-media',
      'Публикация / отзыв / пресса',
      'Внешнее независимое подтверждение достижения.',
      ['ссылка', 'PNG'],
      false,
      'Ссылка на публикацию, отзыв клиента или упоминание в СМИ.'
    )
  )

  return list
}

function educationRequirements(f: TopicFlags): AchievementEvidenceRequirement[] {
  const list: AchievementEvidenceRequirement[] = [
    req(
      'edu-cert',
      'Сертификат / диплом',
      'Основной документ, удостоверяющий достижение.',
      ['PDF', 'JPG', 'PNG'],
      true,
      'Скан или PDF сертификата с именем, датой выдачи и названием программы.'
    ),
  ]

  if (f.olympiad) {
    list.push(
      req(
        'edu-protocol',
        'Протокол олимпиады / конкурса',
        'Фиксирует место и подтверждает, что это официальное соревнование.',
        ['PDF', 'ссылка', 'PNG'],
        true,
        'Итоговый протокол организатора с твоим именем и занятым местом.'
      )
    )
  }

  if (f.exam) {
    list.push(
      req(
        'edu-score-report',
        'Официальный score report',
        'Итоговый балл должен быть из официального личного кабинета, а не из переписки.',
        ['PDF', 'PNG'],
        true,
        'Официальный отчёт с баллом (IELTS TRF, College Board, ФИПИ и т.п.).'
      )
    )
  }

  if (f.course) {
    list.push(
      req(
        'edu-verify-link',
        'Ссылка на верификацию сертификата',
        'Позволяет верификатору проверить подлинность онлайн.',
        ['ссылка', 'ID сертификата'],
        true,
        'Ссылка или Verify ID с платформы (Coursera, edX, Google) для мгновенной проверки.'
      )
    )
  }

  if (f.research) {
    list.push(
      req(
        'edu-publication',
        'Публикация с DOI',
        'Индекс DOI — единственный надёжный признак научной публикации.',
        ['ссылка', 'DOI', 'PDF'],
        true,
        'Ссылка на статью с действующим DOI или страницей рецензируемого журнала.'
      )
    )
  }

  list.push(
    req(
      'edu-transcript',
      'Ведомость / транскрипт с оценками',
      'Подтверждает системность, а не единичный сертификат.',
      ['PDF', 'PNG'],
      false,
      'Официальная ведомость за период обучения.'
    )
  )

  return list
}

function disciplineRequirements(f: TopicFlags): AchievementEvidenceRequirement[] {
  const list: AchievementEvidenceRequirement[] = [
    req(
      'disc-tracker',
      'Скриншот серии из трекера',
      'Подтверждает непрерывность: даты должны идти подряд без разрывов.',
      ['PNG', 'JPG'],
      true,
      'Экран трекера/приложения с числом дней и видимыми датами начала и конца серии.'
    ),
  ]

  if (f.streak) {
    list.push(
      req(
        'disc-consistency',
        'Экспорт полного календаря серии',
        'Разовый скриншот подделывается — нужен выгружаемый лог за весь период.',
        ['JSON', 'CSV', 'PDF', 'скриншот календаря'],
        true,
        'Экспорт из Огонька или календарная сетка с отметкой каждого дня серии.'
      )
    )
  }

  if (f.training || f.gym) {
    list.push(
      req(
        'disc-training-log',
        'Лог тренировок за период',
        'Показывает регулярность, а не разовый подвиг.',
        ['CSV', 'GPX', 'PNG'],
        true,
        'Список тренировок с датами и длительностью (Strava, Garmin, дневник тренировок).'
      )
    )
  }

  if (f.quit) {
    list.push(
      req(
        'disc-quit-counter',
        'Счётчик отказа от привычки',
        'Подтверждает непрерывный отказ с датой старта.',
        ['PNG', 'JPG'],
        true,
        'Экран приложения-счётчика с датой начала и текущим числом дней.'
      )
    )
  }

  if (f.meditation) {
    list.push(
      req(
        'disc-practice-log',
        'Лог практики (медитация)',
        'Показывает суммарное время и непрерывность.',
        ['CSV', 'PNG'],
        false,
        'Экспорт из приложения медитации со статистикой по дням.'
      )
    )
  }

  list.push(
    req(
      'disc-witness',
      'Подтверждение свидетеля',
      'Внешний человек подтверждает, что серия реальна.',
      ['текст', 'ссылка на профиль'],
      false,
      'Публичное подтверждение от человека, который наблюдал серию (соцсеть/сообщение).'
    ),
    req(
      'disc-journal',
      'Фрагменты записей за период',
      'Доказывает, что серия наполнена смыслом, а не механическими галочками.',
      ['PNG', 'PDF'],
      false,
      'Несколько показательных записей из начала, середины и конца серии.'
    )
  )

  return list
}

/* ── Основная функция регламента ────────────────────────────────────────── */

function buildSummary(
  category: AchievementCategory,
  topic: string,
  strictness: AchievementRegulation['strictness'],
  required: number,
  total: number
): string {
  const strictLabel =
    strictness === 'forensic' ? 'форензическая' : strictness === 'strict' ? 'строгая' : 'базовая'
  const cleanTopic = topic.trim() || category.defaultTitle
  return (
    `Тема «${cleanTopic}» отнесена к категории «${category.label}». ` +
    `Проверка — ${strictLabel}: обязательных доказательств ${required} из ${total}. ` +
    `Без полного комплекта обязательных файлов ачивка не может быть подтверждена — статус останется «Черновик» или «Отклонено».`
  )
}

function verifierFor(categoryId: AchievementCategoryId, f: TopicFlags): string {
  switch (categoryId) {
    case 'sport-record':
      if (f.barefoot) {
        return 'Судейская коллегия забега + медицинский делегат (подтверждение формата «босиком»)'
      }
      if (f.chess) return 'Главный судья турнира / национальная шахматная федерация'
      if (f.gym) return 'Аттестованный судья зала или тренер с правом фиксации норматива'
      return 'Официальный организатор соревнования / судейская коллегия'
    case 'business':
      if (f.funding) return 'Финансовый аудитор Огонька + юрист по инвестициям'
      if (f.deal) return 'Юридический отдел Огонька + верификация контрагента'
      return 'Финансовый аудитор Огонька (сверка с платёжной платформой / банком)'
    case 'education':
      if (f.research) return 'Редакция рецензируемого журнала / индекс DOI'
      return 'Аккредитованное учебное заведение или организатор соревнования'
    case 'discipline':
      return 'Система трекинга «Огонёк» + независимый свидетель серии'
    default:
      return 'Команда верификации Огонька'
  }
}

function freshnessFor(categoryId: AchievementCategoryId): string {
  switch (categoryId) {
    case 'sport-record':
      return 'Протокол опубликован организатором; дата финиша в доказательствах совпадает с заявленной (отклонение 0 дней).'
    case 'business':
      return 'Финансовые скриншоты — не старше 30 дней до момента подачи; период выручки указан явно.'
    case 'education':
      return 'Документ с действующим ID/ссылкой проверки; бессрочно, если верифицируется онлайн.'
    case 'discipline':
      return 'Экспорт серии должен заканчиваться не позднее 48 часов до подачи заявки.'
    default:
      return 'Доказательства должны быть актуальны на момент подачи.'
  }
}

function rejectionReasons(categoryId: AchievementCategoryId, f: TopicFlags): string[] {
  const common = [
    'Отсутствует хотя бы один обязательный файл из регламента.',
    'Файл обрезан так, что не видно имени, даты или ключевого числа.',
    'Обнаружены признаки монтажа, редактирования или несоответствия дат.',
  ]

  switch (categoryId) {
    case 'sport-record':
      return [
        ...common,
        'Указан только сегмент приложения вместо официального протокола.',
        f.barefoot
          ? 'На видео не видно, что дистанция пройдена именно без обуви.'
          : 'Дистанция короче заявленной или трек содержит срез.',
      ]
    case 'business':
      return [
        ...common,
        'Суммы/метрики нельзя сверить с платёжной платформой или выпиской.',
        'Договор без подписей сторон или переписка вместо документа.',
      ]
    case 'education':
      return [
        ...common,
        'Сертификат не проходит онлайн-верификацию по ID.',
        'Отсутствует официальный протокол для соревновательного достижения.',
      ]
    case 'discipline':
      return [
        ...common,
        'В серии обнаруживаются пропуски, скрытые на скриншоте.',
        'Лог обрывается задолго до заявленной даты окончания.',
      ]
    default:
      return common
  }
}

function pickRequirements(categoryId: AchievementCategoryId, f: TopicFlags): AchievementEvidenceRequirement[] {
  switch (categoryId) {
    case 'sport-record':
      return sportRequirements(f)
    case 'business':
      return businessRequirements(f)
    case 'education':
      return educationRequirements(f)
    case 'discipline':
      return disciplineRequirements(f)
    default:
      return []
  }
}

/**
 * Строит строгий регламент доказательств по категории и теме.
 * Детерминированная локальная эвристика — надёжный fallback и основа offline.
 */
export function regulateAchievement(
  categoryId: AchievementCategoryId,
  topic: string,
  aiGenerated = false
): AchievementRegulation {
  const category = getAchievementCategory(categoryId)
  const flags = detectFlags(topic)
  const requirements = pickRequirements(categoryId, flags)

  // Гарантируем хотя бы одно обязательное требование в любой категории.
  if (!requirements.some((r) => r.required) && requirements.length > 0) {
    requirements[0] = { ...requirements[0], required: true }
  }

  const strictness: AchievementRegulation['strictness'] =
    flags.barefoot || flags.extreme || flags.funding || flags.research || flags.olympiad
      ? 'forensic'
      : 'strict'

  const requiredCount = requirements.filter((r) => r.required).length

  return {
    categoryId,
    interpretedTopic: topic.trim() || category.defaultTitle,
    summary: buildSummary(category, topic, strictness, requiredCount, requirements.length),
    requirements,
    verifier: verifierFor(categoryId, flags),
    freshnessRule: freshnessFor(categoryId),
    rejectionCriteria: rejectionReasons(categoryId, flags),
    strictness,
    aiGenerated,
  }
}

/* ── Валидация ответа ИИ / внешних данных ───────────────────────────────── */

const CATEGORY_IDS: AchievementCategoryId[] = [
  'sport-record',
  'business',
  'education',
  'discipline',
]

export function isAchievementCategoryId(value: unknown): value is AchievementCategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as string[]).includes(value)
}

/** Приводит произвольный объект (в т.ч. ответ ИИ) к строгому регламенту. */
export function sanitizeRegulation(
  value: unknown,
  categoryId: AchievementCategoryId,
  fallbackTopic = ''
): AchievementRegulation {
  const base = regulateAchievement(categoryId, fallbackTopic)
  if (!value || typeof value !== 'object') return base

  const v = value as Partial<AchievementRegulation>

  const requirements: AchievementEvidenceRequirement[] = Array.isArray(v.requirements)
    ? v.requirements
        .filter((r): r is AchievementEvidenceRequirement => !!r && typeof r === 'object')
        .map((r, index) => ({
          id: typeof r.id === 'string' && r.id ? r.id.slice(0, 60) : `req-${index + 1}`,
          title: typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 120) : 'Файл-доказательство',
          purpose: typeof r.purpose === 'string' ? r.purpose.trim().slice(0, 400) : '',
          formats: Array.isArray(r.formats)
            ? r.formats.filter((x): x is string => typeof x === 'string').slice(0, 6)
            : ['PDF', 'JPG', 'PNG'],
          required: Boolean(r.required),
          example: typeof r.example === 'string' ? r.example.trim().slice(0, 300) : '',
        }))
    : []

  // Если ИИ вернул пустой список — не теряем доказательную базу, берём эвристику.
  const finalRequirements = requirements.length > 0 ? requirements : base.requirements
  if (!finalRequirements.some((r) => r.required)) {
    finalRequirements[0] = { ...finalRequirements[0], required: true }
  }

  const strictness: AchievementRegulation['strictness'] =
    v.strictness === 'forensic' || v.strictness === 'basic' || v.strictness === 'strict'
      ? v.strictness
      : base.strictness

  const rejectionCriteria = Array.isArray(v.rejectionCriteria)
    ? v.rejectionCriteria.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 8)
    : base.rejectionCriteria

  return {
    categoryId,
    interpretedTopic:
      typeof v.interpretedTopic === 'string' && v.interpretedTopic.trim()
        ? v.interpretedTopic.trim().slice(0, 200)
        : base.interpretedTopic,
    summary: typeof v.summary === 'string' && v.summary.trim() ? v.summary.trim().slice(0, 600) : base.summary,
    requirements: finalRequirements,
    verifier: typeof v.verifier === 'string' && v.verifier.trim() ? v.verifier.trim().slice(0, 200) : base.verifier,
    freshnessRule:
      typeof v.freshnessRule === 'string' && v.freshnessRule.trim()
        ? v.freshnessRule.trim().slice(0, 300)
        : base.freshnessRule,
    rejectionCriteria: rejectionCriteria.length > 0 ? rejectionCriteria : base.rejectionCriteria,
    strictness,
    aiGenerated: Boolean(v.aiGenerated ?? true),
  }
}

/* ── Прогресс и статус ──────────────────────────────────────────────────── */

export type AchievementProgress = {
  /** Прикреплено файлов всего */
  attached: number
  /** Всего требований */
  total: number
  /** Обязательных требований */
  requiredTotal: number
  /** Закрыто обязательных требований */
  requiredCovered: number
  /** Все обязательные доказательства приложены */
  complete: boolean
  /** Доля закрытых обязательных требований (0..1) */
  ratio: number
}

export function computeAchievementProgress(
  achievement: Pick<VerifiedAchievement, 'regulation' | 'evidence'>
): AchievementProgress {
  const requirements = achievement.regulation?.requirements ?? []
  const requiredIds = requirements.filter((r) => r.required).map((r) => r.id)
  const covered = new Set(achievement.evidence.map((e) => e.requirementId))

  const requiredCovered = requiredIds.filter((id) => covered.has(id)).length
  const requiredTotal = requiredIds.length

  return {
    attached: achievement.evidence.length,
    total: requirements.length,
    requiredTotal,
    requiredCovered,
    complete: requiredTotal === 0 ? requirements.length <= achievement.evidence.length : requiredCovered === requiredTotal,
    ratio: requiredTotal === 0 ? (requirements.length > 0 && achievement.evidence.length >= requirements.length ? 1 : 0) : requiredCovered / requiredTotal,
  }
}

export type AchievementStatusMeta = {
  label: string
  color: string
  description: string
}

export const ACHIEVEMENT_STATUS_META: Record<AchievementStatus, AchievementStatusMeta> = {
  draft: {
    label: 'Черновик',
    color: '#71767b',
    description: 'Регламент получен, доказательства собираются.',
  },
  submitted: {
    label: 'На проверке',
    color: '#1d9bf0',
    description: 'Комплект отправлен верификатору.',
  },
  verified: {
    label: 'Подтверждена',
    color: '#22c55e',
    description: 'Достижение верифицировано и подтверждено.',
  },
  rejected: {
    label: 'Отклонена',
    color: '#ef4444',
    description: 'Верификатор нашёл несоответствия — нужно исправить.',
  },
}

export function formatAchievementDate(dateISO: string): string {
  if (!dateISO) return 'Без даты'
  const date = new Date(dateISO)
  if (Number.isNaN(date.getTime())) return 'Без даты'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
