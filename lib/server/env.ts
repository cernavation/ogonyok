/**
 * СЕРВЕРНАЯ ВАЛИДАЦИЯ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ (ЭТАП 3)
 * 
 * Проверяет наличие и формат обязательных и опциональных переменных окружения
 * при старте сервера или вызове защищенных серверных эндпоинтов.
 * Выдаёт структурированные понятные сообщения об ошибках со ссылкой на .env.example.
 */

export interface ServerEnv {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL: string
  DEEPSEEK_API_KEY?: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_BOT_USERNAME?: string
  CRON_SECRET?: string
  GIPHY_API_KEY?: string
  TURN_URL?: string
  TURN_USERNAME?: string
  TURN_PASSWORD?: string
  IS_PRODUCTION: boolean
}

let cachedEnv: ServerEnv | null = null

export function validateServerEnv(options: { requireServiceRole?: boolean; strict?: boolean } = {}): ServerEnv {
  const missingCritical: string[] = []
  const missingOptional: string[] = []

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || url.includes('your-project-ref')) {
    missingCritical.push('NEXT_PUBLIC_SUPABASE_URL (URL проекта Supabase)')
  }
  if (!anon || anon.includes('your-anon-key')) {
    missingCritical.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (публичный anon-ключ)')
  }

  if (options.requireServiceRole && (!serviceRole || serviceRole.includes('your-service-role'))) {
    missingCritical.push('SUPABASE_SERVICE_ROLE_KEY (сервисный ключ для админских операций)')
  }

  // Опциональные сервисы
  if (!process.env.GEMINI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    missingOptional.push('GEMINI_API_KEY / DEEPSEEK_API_KEY (ИИ-оценка и перевод будут недоступны)')
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    missingOptional.push('TELEGRAM_BOT_TOKEN (интеграция с Telegram-ботом отключена)')
  }
  if (!process.env.CRON_SECRET) {
    missingOptional.push('CRON_SECRET (cron-задачи не защищены секретным заголовком)')
  }

  if (missingCritical.length > 0) {
    const errorDetails = [
      '❌ [ENV_VALIDATION_ERROR] Отсутствуют обязательные переменные окружения для работы сервера:',
      ...missingCritical.map((item) => `   - ${item}`),
      '',
      '👉 Пожалуйста, настройте .env.local на основе .env.example',
    ].join('\n')

    if (options.strict) {
      throw new Error(errorDetails)
    } else {
      console.error(errorDetails)
    }
  }

  if (missingOptional.length > 0 && process.env.NODE_ENV !== 'test') {
    // В dev/staging логируем предупреждение один раз
    // console.warn('ℹ️ [ENV_WARNING] Опциональные сервисы не настроены:', missingOptional.join(', '))
  }

  cachedEnv = {
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole || undefined,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
    CRON_SECRET: process.env.CRON_SECRET,
    GIPHY_API_KEY: process.env.GIPHY_API_KEY,
    TURN_URL: process.env.TURN_URL,
    TURN_USERNAME: process.env.TURN_USERNAME,
    TURN_PASSWORD: process.env.TURN_PASSWORD,
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
  }

  return cachedEnv
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv
  return validateServerEnv()
}
