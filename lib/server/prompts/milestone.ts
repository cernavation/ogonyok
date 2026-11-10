/**
-- ============================================================================
-- lib/server/prompts/milestone.ts: ПРОМПТЫ ЮБИЛЕЙНЫХ ВЕХ (100, 200, 300... ДНЕЙ)
-- ============================================================================
-- Pro ('stats'): готовые числа считает КОД, ИИ только формулирует связующий текст:
--   - средний балл за последние 100 дней против предыдущих 100 и против всего времени
--   - изменение в %
--   - лучший и худший отрезок
--   - самый сильный день
--   - рост доли побед с преодолением
--   - самые частые теги
--   - самая длинная серия сильных дней
--   Тон: рост -> похвала; падение -> поддержка без давления; ровно -> стабильность.
--
-- Ultra ('deep'): всё из Pro + глубокая персонализация по тексту записей за 100 дней:
--   - люди, повторяющиеся темы, кумиры/образцы, события (переезд, потеря, победа),
--     эволюция формулировок, главные достижения.
--   5 строгих правил:
--   1) Утверждать только то, что прямо есть в записях, ничего не домысливать.
--   2) При утрате близкого (напр. отца) отражать бережно формулой: «похоже, для тебя
--      это важно, и это видно по твоим записям», запрещено утверждать от лица умершего.
--   3) Никаких диагнозов психики; при тяжёлом состоянии — тёплое предложение поговорить
--      с близким или специалистом, без паники.
--   4) Без льстивых выдумок и без сравнения с другими людьми.
--   5) Длина: 150-250 слов, 4 структурированных раздела:
--      «Как ты изменился», «Что стало твоей силой», «Кто и что тебя вдохновляет», «Что дальше».
-- ============================================================================
*/

export interface MilestoneStatsSummary {
  milestoneNumber: number
  totalPrides: number
  totalGratitudes: number
  last100AverageScore: number
  averageScore: number // Обратная совместимость с v1
  prev100AverageScore: number | null
  allTimeAverageScore: number
  percentChange: number
  trajectory: 'growth' | 'drop' | 'stable'
  bestSegment: { title: string; averageScore: number }
  worstSegment: { title: string; averageScore: number }
  strongestDay: { dayNumber: number; score: number }
  overcomeGrowthPercent: number
  overcomeDistribution: { level0: number; level1: number; level2: number; level3: number }
  topTags: Array<{ tag: string; count: number }>
  longestStrongStreak: number
  decadeDynamics: Array<{
    decadeIndex: number
    title: string
    averageScore: number
    pridesCount: number
  }>
}

/**
 * Промпт для тарифа PRO:
 * Числа считает КОД, а не ИИ. ИИ только формулирует текст из этих готовых чисел.
 */
export function buildProMilestonePrompt(stats: MilestoneStatsSummary): string {
  const prevComparisonStr = stats.prev100AverageScore !== null
    ? `против предыдущих 100 дней: ${stats.prev100AverageScore.toFixed(1)}★ (изменение: ${stats.percentChange >= 0 ? '+' : ''}${stats.percentChange.toFixed(1)}%)`
    : `первые 100 дней летописи (базовый замер, все время: ${stats.allTimeAverageScore.toFixed(1)}★)`

  const topTagsStr = stats.topTags.length > 0
    ? stats.topTags.map((t) => `${t.tag} (${t.count})`).join(', ')
    : 'теги не указаны'

  return `ЗАДАЧА:
Сформулируй аналитический текст вехи #${stats.milestoneNumber} дней для тарифа Премиум.
Все цифры вычислены КОДОМ и являются абсолютной истиной. Твоя задача — строго опираться на них без домыслов.

ГОТОВЫЕ ЧИСЛА ЗА ${stats.milestoneNumber} ДНЕЙ:
- Средний балл за последние 100 дней: ${stats.last100AverageScore.toFixed(1)}★
- Сравнение: ${prevComparisonStr}
- Средний балл за всё время: ${stats.allTimeAverageScore.toFixed(1)}★
- Траектория динамики: ${stats.trajectory} (изменение ${stats.percentChange >= 0 ? '+' : ''}${stats.percentChange.toFixed(1)}%)
- Лучший отрезок: ${stats.bestSegment.title} (ср. ${stats.bestSegment.averageScore.toFixed(1)}★)
- Худший/труднейший отрезок: ${stats.worstSegment.title} (ср. ${stats.worstSegment.averageScore.toFixed(1)}★)
- Самый сильный день: День #${stats.strongestDay.dayNumber} (балл ${stats.strongestDay.score.toFixed(1)}★)
- Рост доли побед с преодолением: ${stats.overcomeGrowthPercent >= 0 ? '+' : ''}${stats.overcomeGrowthPercent.toFixed(1)}%
- Самые частые теги: ${topTagsStr}
- Самая длинная серия сильных дней (балл >= 8.0): ${stats.longestStrongStreak} дней подряд
- Всего гордостей: ${stats.totalPrides}, благодарностей: ${stats.totalGratitudes}

ТРЕБОВАНИЯ К ТОНУ (ЗАВИСИТ ОТ ТРАЕКТОРИИ):
${
  stats.trajectory === 'growth'
    ? '- Тон: заряженная похвала! Отметь рост среднего балла и увеличение доли волевых преодолений.'
    : stats.trajectory === 'drop'
    ? '- Тон: искренняя поддержка без давления! Формула: «я заметил, что последние недели были тяжелее, и ты всё равно продолжал». Не упрекай, покажи уважение к стойкости.'
    : '- Тон: про непоколебимую стабильность! Отметь железный стержень и способность держать ровную планку без эмоциональных ям.'
}

ПРАВИЛА:
1. Запрещено придумывать или искажать любые числа. Любое упоминание баллов или процентов в тексте обязано совпадать с приведёнными выше.
2. Не составляй глубоких писем себе (это прерогатива тарифа Ultra).
3. Верни строгий JSON:
{
  "title": "Аналитический отчёт рубежа #${stats.milestoneNumber}",
  "summary": "2-3 предложения о динамике с обязательным упоминанием баллов и траектории",
  "dynamicsComment": "2-3 предложения с разбором лучшего (${stats.bestSegment.title}) и сложного (${stats.worstSegment.title}) отрезков",
  "tagsComment": "1-2 предложения о ключевых опорах и тегах автора"
}`
}

/**
 * Промпт для тарифа ULTRA:
 * Глубокая персонализация по тексту записей за 100 дней по 5 строгим правилам.
 */
export function buildUltraMilestonePrompt(params: {
  milestoneNumber: number
  stats: MilestoneStatsSummary
  dayHighlights: Array<{
    dayNumber: number
    prides: string[]
    gratitudes: string[]
    score?: number
  }>
}): string {
  const { milestoneNumber, stats, dayHighlights } = params

  const sampleHighlights = dayHighlights
    .slice(0, 40)
    .map((d) => `[День #${d.dayNumber}] Победы: ${d.prides.join('; ')} | Благодарность: ${d.gratitudes.join('; ')}`)
    .join('\n')

  return `ТЫ — МЕНТОР ЛИЧНОЙ СИЛЫ СИСТЕМЫ «ОГОНЁК».
Автор закрыл рубеж #${milestoneNumber} дней.
Перед тобой данные: точные цифры и выдержки из реальных записей автора за этот период.

ВЫЧИСЛЕННЫЕ ЧИСЛА:
- Средний балл: ${stats.last100AverageScore.toFixed(1)}★ (траектория: ${stats.trajectory})
- Серия сильных дней: ${stats.longestStrongStreak} дней подряд
- Лучший отрезок: ${stats.bestSegment.title} (ср. ${stats.bestSegment.averageScore.toFixed(1)}★)
- Побед всего: ${stats.totalPrides}

ВЫДЕРЖКИ ИЗ ЗАПИСЕЙ АВТОРА ЗА ПЕРИОД:
${sampleHighlights}

5 ЖЕЛЕЗНЫХ ПРАВИЛ (НАРУШЕНИЕ НЕДОПУСТИМО):
1. УТВЕРЖДАТЬ МОЖНО ТОЛЬКО ТО, ЧТО ПРЯМО ЕСТЬ В ЗАПИСЯХ. Ничего не домысливать и не сочинять несуществующих фактов, людей или событий.
2. ЕСЛИ АВТОР ПИСАЛ ОБ УТРАТЕ БЛИЗКОГО (НАПРИМЕР, ОТЦА) ИЛИ О ЖЕЛАНИИ, ЧТОБЫ ИМ ГОРДИЛИСЬ:
   Бережно отрази это и скажи, что такая гордость и такая любовь видны в его записях.
   КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО утверждать от лица умершего («он гордился бы тобой») как непреложный факт.
   ОБЯЗАТЕЛЬНО используй деликатную формулу: «похоже, для тебя это важно, и это видно по твоим записям».
3. НИКАКИХ ДИАГНОЗОВ И ОЦЕНОК ПСИХИЧЕСКОГО СОСТОЯНИЯ. Если в записях встречаются признаки тяжёлого состояния, выгорания или кризиса — текст должен быть тёплым, спокойным и без паники предложить поговорить с близким человеком или специалистом.
4. БЕЗ ЛЬСТИВЫХ ВЫДУМОК И БЕЗ СРАВНЕНИЯ С ДРУГИМИ ЛЮДЬМИ. Тон зрелый, братский, сдержанный.
5. ОБЪЁМ 150-250 СЛОВ СТРОГО. Структурируй ответ ровно на 4 раздела:
   - «Как ты изменился»
   - «Что стало твоей силой»
   - «Кто и что тебя вдохновляет»
   - «Что дальше»

ВЕРНИ СТРОГИЙ JSON:
{
  "howYouChanged": "Текст раздела 'Как ты изменился' (эволюция формулировок и привычек)",
  "whatBecameYourStrength": "Текст раздела 'Что стало твоей силой' (пройденные барьеры, преодоления)",
  "whoAndWhatInspiresYou": "Текст раздела 'Кто и что тебя вдохновляет' (люди, образцы, близкие)",
  "whatIsNext": "Текст раздела 'Что дальше' (вектор следующей сотни дней)",
  "letterToSelf": "Полный связный текст из 4 разделов общим объёмом строго от 150 до 250 слов",
  "transformationSummary": "2-3 предложения о ключевом изменении автора"
}`
}
