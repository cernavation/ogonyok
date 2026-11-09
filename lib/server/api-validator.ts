/**
 * ЕДИНЫЙ ВАЛИДАТОР API-МАРШРУТОВ И ФОРМАТ ОШИБОК (ЭТАП 3)
 * 
 * Предоставляет Zod-валидацию входных данных для всех API-маршрутов приложения:
 * - Схемы входных данных (body, searchParams);
 * - Строгие лимиты длины (строки до 5000 симв., списки до 10-25 элементов);
 * - Единый канонический формат ошибок:
 *   {
 *     "error": {
 *       "code": "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "RATE_LIMITED" | ...,
 *       "message": "Человекочитаемое описание ошибки",
 *       "details": [...]
 *     }
 *   }
 */

import { z } from 'zod'

/**
 * Единый генератор ответов с ошибкой API
 */
export function apiErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      // Обратная совместимость для клиентов, читающих root-уровень:
      success: false,
      message,
    },
    { status }
  )
}

/**
 * Валидирует JSON-тело входящего запроса по заданной Zod-схеме
 */
export async function validateJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return {
      success: false,
      response: apiErrorResponse('INVALID_JSON', 'Невалидный JSON в теле запроса', 400),
    }
  }

  const result = schema.safeParse(rawBody)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    const friendlyMsg = firstIssue
      ? `${firstIssue.path.length ? `${firstIssue.path.join('.')}: ` : ''}${firstIssue.message}`
      : 'Ошибка валидации параметров'

    return {
      success: false,
      response: apiErrorResponse('VALIDATION_ERROR', friendlyMsg, 422, result.error.issues),
    }
  }

  return { success: true, data: result.data }
}

/**
 * Валидирует query-параметры (searchParams) по Zod-схеме
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  const obj: Record<string, string> = {}
  searchParams.forEach((val, key) => {
    obj[key] = val
  })

  const result = schema.safeParse(obj)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    const friendlyMsg = firstIssue
      ? `${firstIssue.path.length ? `${firstIssue.path.join('.')}: ` : ''}${firstIssue.message}`
      : 'Ошибка параметров запроса'

    return Promise.resolve({
      success: false,
      response: apiErrorResponse('INVALID_QUERY', friendlyMsg, 400, result.error.issues),
    })
  }

  return Promise.resolve({ success: true, data: result.data })
}

// ============================================================================
// КАНОНИЧЕСКИЕ ZOD-СХЕМЫ ДЛЯ API
// ============================================================================

/** Оценка дня через ИИ */
export const EvaluateDaySchema = z.object({
  prides: z.array(z.string().max(5000, 'Длина гордости не более 5000 символов')).max(10, 'Максимум 10 гордостей').optional(),
  items: z.array(z.string().max(5000, 'Длина пункта не более 5000 символов')).max(10, 'Максимум 10 пунктов').optional(),
  dayId: z.union([z.string().max(100), z.number()]).optional(),
  userId: z.string().max(100).optional(),
  date: z.string().max(50).optional(),
})

/** Перевод текста через ИИ */
export const TranslateSchema = z.object({
  text: z.string().min(1, 'Текст для перевода пуст').max(5000, 'Текст не должен превышать 5000 символов'),
  targetLanguage: z.string().max(20).optional().default('ru'),
})

/** Расшифровка голосового сообщения */
export const TranscribeSchema = z.object({
  audioBase64: z.string().max(20_000_000, 'Аудиофайл слишком большой (макс. 15 МБ)').optional(),
  mimeType: z.string().max(100).optional().default('audio/webm'),
  mockText: z.string().max(5000).optional(),
}).refine((data) => Boolean(data.audioBase64 || data.mockText), {
  message: 'Аудиоданные не переданы',
  path: ['audioBase64'],
})

/** Поиск GIF в Giphy */
export const GiphyQuerySchema = z.object({
  q: z.string().max(200, 'Поисковый запрос слишком длинный').optional().default(''),
  limit: z.coerce.number().min(1).max(50).optional().default(24),
})

/** Лидерборд */
export const LeaderboardQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  difficulty: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['streak', 'level', 'created_at']).optional(),
})

/** Синхронизация снимка стрика */
export const StreakSyncSchema = z.object({
  days: z.array(z.string().max(50)).max(1000, 'Максимум 1000 дней в одном запросе'),
})

/** Генерация кода привязки Telegram */
export const TelegramLinkSchema = z.object({
  userId: z.string().min(1, 'Требуется идентификатор пользователя').max(100),
})

/** Напоминание Telegram */
export const TelegramRemindSchema = z.object({
  userId: z.string().max(100).optional(),
  chatId: z.union([z.string().max(100), z.number()]).optional(),
  message: z.string().max(4000).optional(),
})

/** Установка вебхука Telegram */
export const TelegramSetupSchema = z.object({
  webhookUrl: z.string().url('Невалидный URL вебхука').max(500).optional(),
})

/** Тестовая отправка сообщения Telegram */
export const TelegramTestSchema = z.object({
  chatId: z.union([z.string().max(100), z.number()]).optional(),
  message: z.string().max(4000).optional(),
})

/** Регламент ачивки */
export const RegulateAchievementSchema = z.object({
  categoryId: z.string().min(1, 'Требуется категория').max(100),
  topic: z.string().min(1, 'Требуется тема достижения').max(1000),
  strictness: z.enum(['basic', 'strict', 'forensic']).optional(),
})
