/**
 * Конфигурация фолбэк-провайдера DeepSeek API:
 * - Эндпоинт: 'https://api.deepseek.com/chat/completions'
 * - Модель: 'deepseek-chat'
 * - Секрет: DEEPSEEK_API_KEY
 * - Формат: response_format: { type: 'json_object' }
 * - Параметры: temperature: 0.5
 * - Формирует prideEvaluations, gratitudeEvaluations: []
 * - Вычисляет средний балл: prideScoresSum / prideEvaluations.length
 */
const DEEPSEEK_CONFIG = {
  endpoint: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  envKey: 'DEEPSEEK_API_KEY',
  response_format: 'json_object',
  temperature: 0.5,
}

export { POST } from '@/app/api/ai/evaluate-day/route'
