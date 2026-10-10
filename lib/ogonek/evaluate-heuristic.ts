import type { OvercomeLevel } from './types'

export interface PrideEvaluation {
  scale: number
  overcome: OvercomeLevel
  tags: string[]
  verdict: string
}

const HARD_KEYWORDS_LEVEL_3 = [
  'вопреки',
  'несмотря на',
  'через боль',
  'преодолел страх',
  'пересилил себя',
  'на грани',
  'кризис',
  'паника',
  'прорыв',
  'важнейший',
  'экстремальн',
  'переборол',
]

const MEDIUM_KEYWORDS_LEVEL_2 = [
  'страшн',
  'откладывал',
  'прокрастинац',
  'не хотелось',
  'тяжело',
  'заставил',
  'барьер',
  'сложн',
  'выдержал',
  'сомневался',
  'боялся',
  'устал',
  'тяжёл',
  'неудобн',
]

const LIGHT_KEYWORDS_LEVEL_1 = [
  'лень',
  'встал',
  'доделал',
  'вовремя',
  'выполнил',
  'закончил',
  'собрался',
  'справился',
  'потренировался',
  'пробежал',
  'отправил',
]

export function evaluatePrideItemHeuristic(text: string): PrideEvaluation {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      scale: 5,
      overcome: 0,
      tags: ['Для тебя'],
      verdict: 'Каждое маленькое действие имеет значение.',
    }
  }

  const lower = trimmed.toLowerCase()

  // 1. Determine Overcome Level (0..3)
  let overcome: OvercomeLevel = 0

  if (HARD_KEYWORDS_LEVEL_3.some((kw) => lower.includes(kw))) {
    overcome = 3
  } else if (MEDIUM_KEYWORDS_LEVEL_2.some((kw) => lower.includes(kw))) {
    overcome = 2
  } else if (LIGHT_KEYWORDS_LEVEL_1.some((kw) => lower.includes(kw))) {
    overcome = 1
  }

  // 2. Determine Scale (1..10)
  let scale = 6

  // Length impact
  if (trimmed.length >= 40) scale += 1
  if (trimmed.length >= 80) scale += 1

  // Numbers/metrics impact
  if (/\d+/.test(trimmed)) scale += 1

  // Resistance impact
  if (overcome === 3) scale += 2
  else if (overcome === 2) scale += 1

  scale = Math.min(10, Math.max(1, scale))

  // 3. Extract Tags
  const tags: string[] = []
  if (/бег|трениров|зал|спорт|ходьб|км|километр|пресс|отжиман|сон|питани|вес|пульс/.test(lower)) {
    tags.push('Спорт')
  }
  if (/клиент|проект|доход|продаж|деньг|код|релиз|договор|бизнес|задач|стартап|сделк/.test(lower)) {
    tags.push('Бизнес')
  }
  if (/план|встал|утро|режим|фокус|дисциплин|график|привычк|вовремя/.test(lower)) {
    tags.push('Дисциплина')
  }
  if (/страх|тревог|медитац|спокойств|осознан|мысл|переживан|барьер/.test(lower)) {
    tags.push('Разум')
  }
  if (/семь|разговор|помог|друг|встреч|команд|партнер|любов|мама|папа/.test(lower)) {
    tags.push('Отношения')
  }

  if (tags.length === 0) {
    tags.push('Для тебя')
  }

  // 4. Generate Verdict
  let verdict: string
  if (overcome === 3) {
    verdict = 'Мощнейший прорыв через сильнейшее сопротивление. Это точка роста!'
  } else if (overcome === 2) {
    verdict = 'Отличная победа над внутренним барьером и прокрастинацией.'
  } else if (overcome === 1) {
    verdict = 'Чёткое действие вопреки лени — дисциплина в действии.'
  } else {
    verdict = 'Уверенный кирпичик в фундамент твоей опоры.'
  }

  return {
    scale,
    overcome,
    tags,
    verdict,
  }
}

export function evaluatePridesHeuristic(items: string[]): PrideEvaluation[] {
  return items.map((item) => evaluatePrideItemHeuristic(item))
}
