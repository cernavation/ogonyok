/**
 * Единая утилита вычисления инициалов для аватарок, сторис и постов («Огонёк»).
 * 
 * Правила:
 * - Если имя не заполнено (или совпадает с никнеймом), инициал берётся строго
 *   из первой буквы никнейма (например, ник "cernavation" без имени -> "C").
 * - Только когда пользователь явно заполнил имя:
 *   - "Алексей Церна" (или варианты с "Церна" / "Черна") -> "АЦ".
 *   - 2+ слова -> первые буквы первых двух слов (например, "Иван Иванов" -> "ИИ").
 *   - 1 слово (если не ник) -> 2 первые буквы или 1 первая буква.
 * - Фолбэк -> "ОГ".
 */

export function getInitials(name?: string | null, username?: string | null): string {
  const cleanName = (name || '').trim()
  const cleanUser = (username || '').trim().replace(/^@/, '')

  // 1. Проверяем, заполнено ли отображаемое имя (и это не просто повтор никнейма)
  const isNameFilled = Boolean(
    cleanName && (!cleanUser || cleanName.toLowerCase() !== cleanUser.toLowerCase())
  )

  if (isNameFilled) {
    const lowerName = cleanName.toLowerCase()
    // Специальное правило: только когда руками написано имя с фамилией Церна / Черна
    if (
      lowerName.includes('церна') ||
      lowerName.includes('черна') ||
      lowerName.includes('cerna') ||
      lowerName === 'алексей церна' ||
      lowerName === 'алексей черна' ||
      lowerName === 'alexei cerna'
    ) {
      return 'АЦ'
    }

    let parts = cleanName.split(/\s+/).filter(Boolean)
    if (parts.length === 1 && (parts[0].includes('_') || parts[0].includes('-') || parts[0].includes('.'))) {
      parts = parts[0].split(/[_\-.]+/).filter(Boolean)
    }
    if (parts.length >= 2) {
      const first = parts[0].charAt(0).toUpperCase()
      const second = parts[1].charAt(0).toUpperCase()
      if (first && second) return `${first}${second}`
    } else if (parts.length === 1) {
      const single = parts[0]
      if (single.length >= 2) {
        return single.slice(0, 2).toUpperCase()
      }
      return single.toUpperCase()
    }
  }

  // 2. Если имя ещё не заполнено: строго первая буква никнейма
  // (например, для cernavation -> "C", а не русское "АЦ")
  if (cleanUser) {
    const parts = cleanUser.split(/[_\-.\s]+/).filter(Boolean)
    if (parts.length >= 2) {
      const first = parts[0].charAt(0).toUpperCase()
      const second = parts[1].charAt(0).toUpperCase()
      if (first && second) return `${first}${second}`
    }
    return cleanUser.charAt(0).toUpperCase()
  }

  // 3. Если передано только имя, равное нику (одно слово)
  if (cleanName) {
    return cleanName.charAt(0).toUpperCase()
  }

  return 'ОГ'
}
