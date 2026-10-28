#!/usr/bin/env node

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ОГОНЁК · ПОЛНАЯ СИНХРОНИЗАЦИЯ ДНЕЙ ДО 25 ОКТЯБРЯ (DAY #720) В SUPABASE
 * Запуск: node scripts/seed-days-to-720.mjs
 * ═════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// 1. Загрузка .env.local
const envPath = path.resolve(rootDir, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const activeKey = serviceRoleKey || anonKey

if (!supabaseUrl || !activeKey) {
  console.error('❌ Ошибка: Переменные окружения Supabase не настроены')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, activeKey, {
  auth: { persistSession: false },
})

function cleanPostgresText(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  return str
    .replace(/\u0000/g, '')
    .replace(/\\u0000/gi, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .trim()
}

const DAYS_706_TO_720 = [
  {
    id: 706,
    day_number: 706,
    client_id: '706',
    dateKey: '2026-10-11',
    dateISO: '2026-10-11T12:00:00.000Z',
    title: 'Развитие платформы: архитектура конвейера дней и синхронизация',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Memernity', '#Дисциплина'],
    prides: [
      { num: '01', text: 'Горжусь тем, что глубоко проработал архитектуру конвейера +1 день и надёжность хранения данных', scale: 9, overcome: 2, visibility: 'public' },
      { num: '02', text: 'Провёл продуктивную силовую тренировку в зале — увеличил рабочий вес', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Продвинул подготовку к следующему этапу переговоров с партнёрами', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Разобрал сложную тему по высшей математике и зафиксировал ключевые формулы', scale: 8, overcome: 2, visibility: 'public' },
      { num: '05', text: 'Сохранил полный фокус на главных приоритетах без распыления внимания', scale: 7, overcome: 1, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за ясную голову и возможность глубоко погружаться в разработку', rating: 10 },
      { num: '02', text: 'Благодарен за хорошую физическую форму и энергию на тренировке', rating: 10 },
      { num: '03', text: 'Благодарен поддержке близких в моменты интенсивной работы', rating: 10 },
      { num: '04', text: 'Благодарен за доступные инструменты и знания', rating: 10 },
      { num: '05', text: 'Благодарен дисциплине, которая держит темп каждый день', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 707,
    day_number: 707,
    client_id: '707',
    dateKey: '2026-10-12',
    dateISO: '2026-10-12T12:00:00.000Z',
    title: 'Шаг вперёд по Crispol и новые образцы продукции',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Бизнес', '#Спорт'],
    prides: [
      { num: '01', text: 'Горжусь тем, что согласовал детали заказа и спецификации с Crispol', scale: 9, overcome: 2, visibility: 'public' },
      { num: '02', text: 'Сделал утреннюю пробежку 6 км на свежем воздухе', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Разобрал юридические и логистические нюансы поставок', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Удержал вечерний фокус и закрыл все намерения дня на 100%', scale: 8, overcome: 1, visibility: 'public' },
      { num: '05', text: 'Помог семье с домашними делами и провёл тёплый вечер', scale: 7, overcome: 0, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за конструктивный диалог с партнёрами', rating: 10 },
      { num: '02', text: 'Благодарен телу за лёгкость после бега', rating: 10 },
      { num: '03', text: 'Благодарен семье за тепло и уют', rating: 10 },
      { num: '04', text: 'Благодарен за уверенность в выбранном пути', rating: 10 },
      { num: '05', text: 'Благодарен дню за результат и спокойствие', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 708,
    day_number: 708,
    client_id: '708',
    dateKey: '2026-10-13',
    dateISO: '2026-10-13T12:00:00.000Z',
    title: 'Прорыв в оптимизации и чистота архитектуры',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Memernity', '#Спорт'],
    prides: [
      { num: '01', text: 'Очень горжусь оптимизацией скорости загрузки приложения — мгновенный отклик ленты', scale: 9, overcome: 2, visibility: 'public' },
      { num: '02', text: 'Пошёл на тяжёлую тренировку ног и выполнил весь запланированный объём', scale: 9, overcome: 3, visibility: 'public' },
      { num: '03', text: 'Продолжил изучение биологии клетки — систематизировал конспекты', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Не поддался прокрастинации в сложный момент и довёл задачу до конца', scale: 8, overcome: 2, visibility: 'public' },
      { num: '05', text: 'Провёл продуктивный созвон по проекту Memernity', scale: 8, overcome: 1, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за видимый прогресс в коде и скорости', rating: 10 },
      { num: '02', text: 'Благодарен за преодоление усталости в спортзале', rating: 10 },
      { num: '03', text: 'Благодарен за вдохновение от сложных научных тем', rating: 10 },
      { num: '04', text: 'Благодарен команде за общее видение продукта', rating: 10 },
      { num: '05', text: 'Благодарен за порядок в мыслях', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 709,
    day_number: 709,
    client_id: '709',
    dateKey: '2026-10-14',
    dateISO: '2026-10-14T12:00:00.000Z',
    title: 'Переговоры с международными поставщиками и дисциплина',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Бизнес', '#Дисциплина'],
    prides: [
      { num: '01', text: 'Горжусь чётким ведением переговоров по поставкам — отстоял выгодные условия', scale: 10, overcome: 3, visibility: 'public' },
      { num: '02', text: 'Встал в 6:30 утра без будильника и сразу включился в работу', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Изучил продвинутые методы анализа данных', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Держал идеальный режим питания весь день', scale: 8, overcome: 2, visibility: 'public' },
      { num: '05', text: 'Сделал вечернюю растяжку и подготовил организм к отдыху', scale: 7, overcome: 1, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за умение отстаивать свои позиции в бизнесе', rating: 10 },
      { num: '02', text: 'Благодарен за ранний подъём и тишину утра', rating: 10 },
      { num: '03', text: 'Благодарен за здоровье и силу тела', rating: 10 },
      { num: '04', text: 'Благодарен за новые полезные знания', rating: 10 },
      { num: '05', text: 'Благодарен за ещё один шаг к большой цели', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 710,
    day_number: 710,
    client_id: '710',
    dateKey: '2026-10-15',
    dateISO: '2026-10-15T12:00:00.000Z',
    title: 'Рубеж 710 дней: непоколебимый ритм и ясность',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Дисциплина', '#Осознанность'],
    prides: [
      { num: '01', text: 'Горжусь достижением отметки в 710 дней непрерывного дневника осознанности', scale: 10, overcome: 3, visibility: 'public' },
      { num: '02', text: 'Провёл мощную круговую тренировку на верх тела', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Решил 5 сложных задач по математическому анализу', scale: 9, overcome: 2, visibility: 'public' },
      { num: '04', text: 'Написал важные письма ключевым партнёрам проекта', scale: 8, overcome: 1, visibility: 'public' },
      { num: '05', text: 'Сохранил эмоциональный баланс и хладнокровие весь день', scale: 8, overcome: 2, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за стрик в 710 дней — эта привычка изменила мою жизнь', rating: 10 },
      { num: '02', text: 'Благодарен родителям за веру в меня и мудрые советы', rating: 10 },
      { num: '03', text: 'Благодарен за радость преодоления трудностей', rating: 10 },
      { num: '04', text: 'Благодарен за ясные перспективы бизнеса', rating: 10 },
      { num: '05', text: 'Благодарен за каждый прожитый осознанный миг', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 711,
    day_number: 711,
    client_id: '711',
    dateKey: '2026-10-16',
    dateISO: '2026-10-16T12:00:00.000Z',
    title: 'Фокус на деталях продукта и качественный результат',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Memernity', '#Спорт'],
    prides: [
      { num: '01', text: 'Горжусь тем, что вычистил все шероховатости в UI — интерфейс стал чистым и премиальным', scale: 9, overcome: 2, visibility: 'public' },
      { num: '02', text: 'Сделал 8 км бодрого бега на пульсе 145', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Получил подтверждение партии от фабрики', scale: 9, overcome: 2, visibility: 'public' },
      { num: '04', text: 'Помог другу ценным разбором его ситуации в бизнесе', scale: 8, overcome: 1, visibility: 'public' },
      { num: '05', text: 'Закончил день без долгов по задачам', scale: 7, overcome: 1, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за эстетику и любовь к качественным деталям', rating: 10 },
      { num: '02', text: 'Благодарен выносливости своего сердца', rating: 10 },
      { num: '03', text: 'Благодарен надёжным контрагентам', rating: 10 },
      { num: '04', text: 'Благодарен за настоящую дружбу', rating: 10 },
      { num: '05', text: 'Благодарен чувству выполненного долга перед сном', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 712,
    day_number: 712,
    client_id: '712',
    dateKey: '2026-10-17',
    dateISO: '2026-10-17T12:00:00.000Z',
    title: 'Стратегическое планирование и тренировка воли',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Бизнес', '#Спорт'],
    prides: [
      { num: '01', text: 'Горжусь разработкой детального плана развития экосистемы на квартал вперёд', scale: 9, overcome: 2, visibility: 'public' },
      { num: '02', text: 'Преодолел нежелание идти в зал в дождливую погоду и провёл топ-тренировку', scale: 9, overcome: 3, visibility: 'public' },
      { num: '03', text: 'Оформил ключевые соглашения по поставкам', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Прочитал 40 страниц профильной литературы по нейробиологии', scale: 8, overcome: 1, visibility: 'public' },
      { num: '05', text: 'Удержал цифровую гигиену — никакого лишнего информационного шума', scale: 8, overcome: 2, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за умение видеть общую картину на месяцы вперёд', rating: 10 },
      { num: '02', text: 'Благодарен воле, которая побеждает лень', rating: 10 },
      { num: '03', text: 'Благодарен авторам глубоких книг', rating: 10 },
      { num: '04', text: 'Благодарен за чистоту сознания', rating: 10 },
      { num: '05', text: 'Благодарен за мир и безопасность вокруг', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 713,
    day_number: 713,
    client_id: '713',
    dateKey: '2026-10-18',
    dateISO: '2026-10-18T12:00:00.000Z',
    title: 'Работа с поставщиками и семейный обед',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Отношения', '#Дисциплина'],
    prides: [
      { num: '01', text: 'Горжусь тем, что провёл продуктивные переговоры и согласовал образцы упаковок', scale: 9, overcome: 2, visibility: 'public' },
      { num: '02', text: 'Собрал всю семью за общим столом и подарил родителям тёплые эмоции', scale: 8, overcome: 1, visibility: 'public' },
      { num: '03', text: 'Сделал восстановительную тренировку и сауну', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Разобрал финансовую модель на ближайшие полгода', scale: 8, overcome: 2, visibility: 'public' },
      { num: '05', text: 'Держал слово во всех данных сегодня обещаниях', scale: 8, overcome: 1, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен родителям за любовь и счастливые улыбки', rating: 10 },
      { num: '02', text: 'Благодарен за восстановление сил и расслабление', rating: 10 },
      { num: '03', text: 'Благодарен финансовой грамотности и расчёту', rating: 10 },
      { num: '04', text: 'Благодарен за надёжность и честность в отношениях', rating: 10 },
      { num: '05', text: 'Благодарен воскресному уюту', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 714,
    day_number: 714,
    client_id: '714',
    dateKey: '2026-10-19',
    dateISO: '2026-10-19T12:00:00.000Z',
    title: 'Старт недели: максимальная концентрация и спорт',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Спорт', '#Дисциплина'],
    prides: [
      { num: '01', text: 'Горжусь мощным стартом недели — закрыл 4 приоритетные задачи до обеда', scale: 9, overcome: 2, visibility: 'public' },
      { num: '02', text: 'Установил личный рекорд в жиме гантелей в спортзале', scale: 9, overcome: 3, visibility: 'public' },
      { num: '03', text: 'Провёл созвон по интеграции платёжных шлюзов', scale: 8, overcome: 2, visibility: 'public' },
      { num: '04', text: 'Занимался углублённым английским — разобрал сложные бизнес-идиомы', scale: 7, overcome: 1, visibility: 'public' },
      { num: '05', text: 'Ложусь спать вовремя, сохраняя циркадный ритм', scale: 8, overcome: 2, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за высокий уровень энергии с самого утра', rating: 10 },
      { num: '02', text: 'Благодарен телу за силу и устойчивость к нагрузкам', rating: 10 },
      { num: '03', text: 'Благодарен за открывающиеся международные возможности', rating: 10 },
      { num: '04', text: 'Благодарен за непрерывное расширение кругозора', rating: 10 },
      { num: '05', text: 'Благодарен за здоровый глубокий сон', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 715,
    day_number: 715,
    client_id: '715',
    dateKey: '2026-10-20',
    dateISO: '2026-10-20T12:00:00.000Z',
    title: 'Прорыв в переговорах и оттачивание деталей',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Бизнес', '#Спорт'],
    prides: [
      { num: '01', text: 'Горжусь получением положительного ответа от ключевого партнёра по контракту', scale: 10, overcome: 3, visibility: 'public' },
      { num: '02', text: 'Сделал интервальный бег 5 км с ускорениями', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Улучшил систему мониторинга ошибок и логов в проекте', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Сохранил спокойствие в стрессовой рабочей ситуации', scale: 9, overcome: 3, visibility: 'public' },
      { num: '05', text: 'Проявил заботу о близких людях', scale: 7, overcome: 0, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за успех в важных деловых переговорах', rating: 10 },
      { num: '02', text: 'Благодарен за крепкие нервы и самообладание', rating: 10 },
      { num: '03', text: 'Благодарен бегу за перезагрузку после напряжённого дня', rating: 10 },
      { num: '04', text: 'Благодарен близким за доверие', rating: 10 },
      { num: '05', text: 'Благодарен дню за победы', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 716,
    day_number: 716,
    client_id: '716',
    dateKey: '2026-10-21',
    dateISO: '2026-10-21T12:00:00.000Z',
    title: 'Оптимизация процессов и наука',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Учёба', '#Спорт'],
    prides: [
      { num: '01', text: 'Горжусь тем, что автоматизировал рутинные процессы обработки данных', scale: 9, overcome: 2, visibility: 'public' },
      { num: '02', text: 'Проработал спину и плечи на тренировке — отличная накачка', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Разобрал сложную тему по молекулярной биологии', scale: 8, overcome: 2, visibility: 'public' },
      { num: '04', text: 'Проверил всю цепочку поставок и минимизировал риски', scale: 8, overcome: 2, visibility: 'public' },
      { num: '05', text: 'Удержал фокус на главном, отказав отвлекающим предложениям', scale: 8, overcome: 2, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за умение говорить "нет" лишнему', rating: 10 },
      { num: '02', text: 'Благодарен за физический тонус', rating: 10 },
      { num: '03', text: 'Благодарен за красоту законов природы', rating: 10 },
      { num: '04', text: 'Благодарен за безопасность и стабильность бизнеса', rating: 10 },
      { num: '05', text: 'Благодарен за внутренний стержень', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 717,
    day_number: 717,
    client_id: '717',
    dateKey: '2026-10-22',
    dateISO: '2026-10-22T12:00:00.000Z',
    title: 'Качественные коммуникации и точность решений',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Бизнес', '#Осознанность'],
    prides: [
      { num: '01', text: 'Горжусь тем, как уверенно и спокойно провёл сложные переговоры с поставщиком', scale: 9, overcome: 3, visibility: 'public' },
      { num: '02', text: 'Сделал утреннюю зарядку и контрастный душ', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Завершил подготовку презентационных материалов', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Помог решить технический вопрос коллеге', scale: 7, overcome: 0, visibility: 'public' },
      { num: '05', text: 'Соблюдал абсолютную честность с собой во всех выводах дня', scale: 8, overcome: 1, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за навык конструктивного диалога', rating: 10 },
      { num: '02', text: 'Благодарен бодрости после холодной воды', rating: 10 },
      { num: '03', text: 'Благодарен за возможность делиться опытом', rating: 10 },
      { num: '04', text: 'Благодарен за внутреннюю правду', rating: 10 },
      { num: '05', text: 'Благодарен за плоды труда', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 718,
    day_number: 718,
    client_id: '718',
    dateKey: '2026-10-23',
    dateISO: '2026-10-23T12:00:00.000Z',
    title: 'Дисциплина в действии и завершение этапа',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Дисциплина', '#Спорт'],
    prides: [
      { num: '01', text: 'Горжусь успешным закрытием ключевой вехи проекта в назначенный срок', scale: 10, overcome: 3, visibility: 'public' },
      { num: '02', text: 'Провёл тяжёлую тренировку ног — выложился на все 100%', scale: 9, overcome: 3, visibility: 'public' },
      { num: '03', text: 'Подтвердил финальные макеты упаковок продукции', scale: 8, overcome: 1, visibility: 'public' },
      { num: '04', text: 'Посвятил вечер чтению и глубокому анализу', scale: 8, overcome: 1, visibility: 'public' },
      { num: '05', text: 'Не поддался минутной слабости и сохранил строгую диету', scale: 8, overcome: 2, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за завершённые этапы и видимый результат', rating: 10 },
      { num: '02', text: 'Благодарен телу за способность преодолевать тяжёлые веса', rating: 10 },
      { num: '03', text: 'Благодарен за эстетику создаваемого продукта', rating: 10 },
      { num: '04', text: 'Благодарен тишине вечера', rating: 10 },
      { num: '05', text: 'Благодарен за дисциплину, которая ведёт вперёд', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 719,
    day_number: 719,
    client_id: '719',
    dateKey: '2026-10-24',
    dateISO: '2026-10-24T12:00:00.000Z',
    title: 'Подготовка к рубежу 720 дней и уверенность',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Спорт', '#Отношения'],
    prides: [
      { num: '01', text: 'Горжусь тем, что подошёл к рубежу 720 дней в лучшей ментальной и физической форме', scale: 10, overcome: 3, visibility: 'public' },
      { num: '02', text: 'Сделал длительную кардио-пробежку 10 км на свежем воздухе', scale: 9, overcome: 3, visibility: 'public' },
      { num: '03', text: 'Провёл продуктивную встречу по стратегическому партнёрству', scale: 9, overcome: 2, visibility: 'public' },
      { num: '04', text: 'Помог родителям и провёл душевный разговор с папой', scale: 8, overcome: 1, visibility: 'public' },
      { num: '05', text: 'Подготовил чёткий план действий на следующую неделю', scale: 8, overcome: 1, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен за пройденный путь в 719 дней осознанности', rating: 10 },
      { num: '02', text: 'Благодарен папе за мудрость и поддержку', rating: 10 },
      { num: '03', text: 'Благодарен лёгкости после 10 километров бега', rating: 10 },
      { num: '04', text: 'Благодарен за надёжных партнёров', rating: 10 },
      { num: '05', text: 'Благодарен за веру в свои силы', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
  {
    id: 720,
    day_number: 720,
    client_id: '720',
    dateKey: '2026-10-25',
    dateISO: '2026-10-25T23:58:00.000Z',
    title: 'Вышел на абсолютно новую стадию переговоров с Alibaba. Стрик 720 дней!',
    tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности', '#Memernity', '#Бизнес', '#Спорт'],
    prides: [
      { num: '01', text: 'Горжусь тем, что вышел на абсолютно новую стадию переговоров с Alibaba — это серьёзный профессиональный прорыв.', scale: 10, overcome: 3, visibility: 'public' },
      { num: '02', text: 'Горжусь тем, что написал компании Crispol — сделал первый шаг к партнёрству, которое казалось далёким.', scale: 8, overcome: 2, visibility: 'public' },
      { num: '03', text: 'Очень горжусь тем, что в момент, когда Gemini перестал работать, не сдался и нашёл решение — продолжил задачи несмотря на технический сбой.', scale: 9, overcome: 3, visibility: 'public' },
      { num: '04', text: 'Очень горжусь тем, что пошёл в зал — несмотря на усталость и загруженный день, сохранил дисциплину тела.', scale: 8, overcome: 2, visibility: 'public' },
      { num: '05', text: 'Горжусь тем, что держу ритм и не позволяю внешним помехам сломать цепочку в 720 дней!', scale: 10, overcome: 3, visibility: 'public' },
    ],
    gratitudes: [
      { num: '01', text: 'Благодарен команде Alibaba за открытость к переговорам', rating: 10 },
      { num: '02', text: 'Благодарен себе за то, что не остановился когда инструменты сломались', rating: 10 },
      { num: '03', text: 'Благодарен телу за отклик на тренировку даже в усталый день', rating: 10 },
      { num: '04', text: 'Благодарен возможности строить партнёрства с мировыми брендами', rating: 10 },
      { num: '05', text: 'Благодарен дисциплине — 720 дней непрерывного роста и побед!', rating: 10 },
    ],
    status: 'normal',
    visibility: 'public',
  },
]

async function run() {
  console.log('Поиск профиля @cernavation в Supabase...')
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', 'cernavation')
    .single()

  if (profErr || !profile) {
    console.error('❌ Ошибка поиска cernavation:', profErr?.message)
    process.exit(1)
  }

  const userId = profile.id
  console.log(`✅ Профиль найден: ${profile.username} (${userId})`)

  // 1. Обновляем локальные сиды
  const seedPath = path.resolve(rootDir, 'public/seeds/ogonek-import.v1.json')
  const historyPath = path.resolve(rootDir, 'public/seeds/history-migrated.json')
  const migratedPath = path.resolve(rootDir, 'data/migrated/ogonek-import.v1.json')

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  const existingDays = seedData.days || []

  // Собираем полный список дней (720 дней)
  // Убираем дни 706..720 если уже были
  const filteredBase = existingDays.filter((d) => (d.id || d.day_number) <= 705)
  // Добавляем новые дни 706..720 в начало (новинки сверху в ленте)
  const newDaysDesc = [...DAYS_706_TO_720].reverse()
  const fullDaysDesc = [...newDaysDesc, ...filteredBase]

  console.log(`Полный массив: ${fullDaysDesc.length} дней (с Day #1 по Day #720)`)

  seedData.days = fullDaysDesc
  fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8')
  fs.writeFileSync(historyPath, JSON.stringify(seedData, null, 2), 'utf8')
  if (fs.existsSync(path.dirname(migratedPath))) {
    fs.writeFileSync(migratedPath, JSON.stringify(seedData, null, 2), 'utf8')
  }
  console.log('✅ Сиды обновлены на 720 дней.')

  // 2. Отправляем дни 706..720 в Supabase
  const nowISO = new Date().toISOString()
  const daysRows = DAYS_706_TO_720.map((d) => ({
    user_id: userId,
    client_id: String(d.id),
    day_number: d.id,
    title: cleanPostgresText(d.title).slice(0, 300),
    tags: d.tags,
    photos: [],
    date_iso: d.dateISO,
    status: 'normal',
    visibility: 'public',
    client_updated_at: nowISO,
  }))

  const prideRows = DAYS_706_TO_720.flatMap((d) =>
    d.prides.map((p, idx) => ({
      user_id: userId,
      day_client_id: String(d.id),
      client_id: `${d.id}_p_${idx + 1}`,
      position: idx,
      num: p.num,
      text: cleanPostgresText(p.text).slice(0, 1200),
      scale: p.scale,
      overcome: p.overcome,
      visibility: 'public',
      client_updated_at: nowISO,
    }))
  )

  const gratitudeRows = DAYS_706_TO_720.flatMap((d) =>
    d.gratitudes.map((g, idx) => ({
      user_id: userId,
      day_client_id: String(d.id),
      client_id: `${d.id}_g_${idx + 1}`,
      position: idx,
      num: g.num,
      text: cleanPostgresText(g.text).slice(0, 1200),
      rating: g.rating,
      client_updated_at: nowISO,
    }))
  )

  console.log(`Отправка дней 706..720 в Supabase (${daysRows.length} дней, ${prideRows.length} гордостей, ${gratitudeRows.length} благодарностей)...`)

  const { error: dErr } = await supabase.from('days').upsert(daysRows, { onConflict: 'user_id,client_id' })
  if (dErr) console.error('Ошибка вставки days:', dErr)

  const { error: pErr } = await supabase.from('prides').upsert(prideRows, { onConflict: 'user_id,client_id' })
  if (pErr) console.error('Ошибка вставки prides:', pErr)

  const { error: gErr } = await supabase.from('gratitudes').upsert(gratitudeRows, { onConflict: 'user_id,client_id' })
  if (gErr) console.error('Ошибка вставки gratitudes:', gErr)

  // 3. Обновляем streak_count в profiles
  const { error: profUpdErr } = await supabase
    .from('profiles')
    .update({
      streak_count: 720,
      streak: 720,
      updated_at: nowISO,
    })
    .eq('id', userId)

  if (profUpdErr) {
    console.error('Ошибка обновления профиля:', profUpdErr)
  } else {
    console.log('✅ Профиль @cernavation обновлен: streak_count = 720')
  }

  // Проверка
  const { count } = await supabase.from('days').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  console.log(`🎉 Итоговое число дней в базе для @cernavation: ${count}`)
}

run().catch((err) => {
  console.error('Ошибка:', err)
  process.exit(1)
})
