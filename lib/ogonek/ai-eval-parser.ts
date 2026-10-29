/**
 * Модуль безопасного парсинга и конфигурации ответов Gemini AI.
 * Гарантирует извлечение валидного JSON даже при наличии вводных слов,
 * префиксов ментора (например, "Calibrated...", "Mentor analysis:") или markdown-обёрток.
 */

export const AI_GENERATION_CONFIG = {
  responseMimeType: 'application/json' as const,
  temperature: 0.4,
  maxOutputTokens: 600,
}

export function extractAndParseJson(rawText: string): any {
  const trimmed = (rawText || '').trim()
  if (!trimmed) {
    throw new Error('Пустой ответ от Gemini API')
  }

  // 1. Попытка прямого парсинга
  try {
    return JSON.parse(trimmed)
  } catch {}

  // 2. Снятие markdown code block ```json ... ```
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  try {
    return JSON.parse(withoutFences)
  } catch {}

  // 3. Вырезание по первым скобкам { ... }
  // Гарантированно отсекает любые префиксы (например, "Calibrated: ", "Calibrated Mentor:")
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = withoutFences.slice(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(candidate)
    } catch {}
  }

  throw new Error(`Ответ Gemini не является валидным JSON: "${trimmed.slice(0, 120)}"`)
}
