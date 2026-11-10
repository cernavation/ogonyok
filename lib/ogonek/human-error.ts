/**
 * lib/ogonek/human-error.ts: Человеческие понятные формулировки ошибок интерфейса.
 * Гарантирует, что пользователю не показываются технические ошибки (TypeError, 500, Failed to fetch),
 * а всегда даётся понятное объяснение и рекомендация к действию.
 */

export function humanizeError(
  rawError: unknown,
  fallbackMessage = 'Не удалось выполнить действие. Попробуйте повторить через минуту.'
): string {
  if (!rawError) return fallbackMessage

  const msg = typeof rawError === 'string' ? rawError : (rawError as any)?.message || String(rawError)

  // Сетевые сбои
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('fetch failed') ||
    msg.includes('Load failed') ||
    msg.includes('TypeError')
  ) {
    return 'Проблема со связью. Проверьте подключение к интернету и повторите попытку.'
  }

  // Ошибки лимитов и тарифов
  if (msg.includes('rate_limit') || msg.includes('429') || msg.includes('Слишком много запросов')) {
    return 'Слишком много действий за короткое время. Пожалуйста, подождите немного.'
  }

  // Ошибки авторизации
  if (msg.includes('401') || msg.includes('JWT') || msg.includes('unauthorized')) {
    return 'Сессия авторизации завершена. Пожалуйста, войдите в аккаунт заново.'
  }

  // Ошибки 500/сервера
  if (msg.includes('500') || msg.includes('Internal Server Error')) {
    return 'Сервер временно недоступен. Мы уже устраняем неполадку, попробуйте чуть позже.'
  }

  // Если это короткое и неинформативное "Ошибка"
  if (msg.trim().toLowerCase() === 'ошибка' || msg.trim().toLowerCase() === 'error') {
    return fallbackMessage
  }

  return msg
}
