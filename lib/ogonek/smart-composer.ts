/**
 * Чистая бизнес-логика умного композера (CONTRACT Шаг 11)
 *
 * Обработка умной вставки (ссылки, списки, длинные тексты, превышение лимитов),
 * раскладывание остатка, навигация клавиатурой и сохранение оценок/звёзд.
 */

export interface ListDistributionResult {
  newValues: string[]
  distributedCount: number
  targetSlots: number[]
  nextFocusSlot: number
}

export interface LargeTextPasteResult {
  newValues: string[]
  targetSlot: number
  nextFocusSlot: number
}

export interface SplitRemainderResult {
  newValues: string[]
  currentPart: string
  remainderPart: string
  targetSlot: number
  remainderSlot: number
}

/**
 * Проверяет, является ли вставленный текст одиночной ссылкой (http/https).
 * Одиночная ссылка не должна переключать слот или разбиваться.
 */
export function isSingleUrl(text: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  if (!/^https?:\/\/[^\s]+$/i.test(trimmed)) return false
  return !/\s/.test(trimmed)
}

/**
 * Парсит текст в элементы списка, если обнаружена:
 * 1) нумерация вида «1.», «1)», «2.» и т.д.
 * 2) маркеры «-», «•», «*», «–», «—»
 * 3) несколько абзацев или строк (>= 2 непустых пунктов)
 * Возвращает массив очищенных строк (без маркеров) или null, если это не список.
 */
export function parseListItems(text: string): string[] | null {
  if (!text) return null
  const trimmed = text.trim()
  if (!trimmed) return null

  // Одиночная ссылка никогда не считается списком
  if (isSingleUrl(trimmed)) return null

  const markerRegex = /^\s*(?:\d+[\.\)]|[-*•–—])\s+/
  const rawLines = trimmed.split(/\r?\n/)

  const hasMarkers = rawLines.some((l) => markerRegex.test(l))

  if (hasMarkers) {
    const items: string[] = []
    let current = ''

    for (const line of rawLines) {
      if (markerRegex.test(line)) {
        if (current.trim().length > 0) {
          items.push(current.trim())
        }
        current = line.replace(markerRegex, '').trim()
      } else if (line.trim().length > 0) {
        if (current.length > 0) {
          current += ' ' + line.trim()
        } else {
          current = line.trim()
        }
      } else {
        if (current.trim().length > 0) {
          items.push(current.trim())
          current = ''
        }
      }
    }
    if (current.trim().length > 0) {
      items.push(current.trim())
    }

    if (items.length >= 2) {
      return items
    }
  }

  // Проверка на разделение абзацами (\n\s*\n)
  const paragraphs = trimmed
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (paragraphs.length >= 2) {
    return paragraphs
  }

  // Проверка на многострочный текст (отдельные непустые строки)
  const nonBlankLines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0)
  if (nonBlankLines.length >= 2) {
    return nonBlankLines
  }

  return null
}

/**
 * Раскладывает элементы списка по слотам (до 3 пунктов):
 * - Если текущий активный слот пуст, первый пункт идёт в него.
 * - Если текущий активный слот занят, пункты идут в ближайшие свободные слоты.
 * - Фокус переходит на следующий пустой слот или слот после последнего заполненного.
 */
export function distributeListItems(
  currentValues: string[],
  activeSlot: number,
  items: string[]
): ListDistributionResult {
  const itemsToDistribute = items.slice(0, 3)
  const newValues = [...currentValues]
  while (newValues.length < 5) newValues.push('')

  const targetSlots: number[] = []

  // 1. Если активный слот пустой, начинаем с него
  const isActiveEmpty = !newValues[activeSlot] || newValues[activeSlot].trim().length === 0
  if (isActiveEmpty) {
    targetSlots.push(activeSlot)
  }

  // 2. Ищем следующие пустые слоты после activeSlot
  for (let offset = 1; offset < 5; offset++) {
    if (targetSlots.length >= itemsToDistribute.length) break
    const slot = (activeSlot + offset) % 5
    if (!targetSlots.includes(slot) && (!newValues[slot] || newValues[slot].trim().length === 0)) {
      targetSlots.push(slot)
    }
  }

  // 3. Если все еще не хватает слотов, заполняем оставшиеся любые слоты
  for (let s = 0; s < 5; s++) {
    if (targetSlots.length >= itemsToDistribute.length) break
    if (!targetSlots.includes(s)) {
      targetSlots.push(s)
    }
  }

  // Заполняем слоты
  const count = Math.min(itemsToDistribute.length, targetSlots.length)
  for (let i = 0; i < count; i++) {
    newValues[targetSlots[i]] = itemsToDistribute[i]
  }

  // Вычисляем следующий слот для фокуса: ближайший пустой
  let nextFocusSlot = -1
  const firstEmpty = newValues.slice(0, 5).findIndex((v) => !v || v.trim().length === 0)
  if (firstEmpty !== -1) {
    nextFocusSlot = firstEmpty
  } else {
    nextFocusSlot = Math.min(4, targetSlots[count - 1] + 1)
  }

  return {
    newValues,
    distributedCount: count,
    targetSlots,
    nextFocusSlot,
  }
}

/**
 * Обработка вставки большого куска текста (>= 120 символов):
 * - вставляется в ТЕКУЩУЮ гордость/благодарность, если она пустая;
 * - если текущая уже заполнена, вставляется в ближайшую пустую;
 * - фокус автоматически переходит на следующую пустую гордость/благодарность.
 */
export function handleLargeTextPaste(
  currentValues: string[],
  activeSlot: number,
  text: string
): LargeTextPasteResult {
  const newValues = [...currentValues]
  while (newValues.length < 5) newValues.push('')

  let targetSlot = activeSlot
  const isActiveEmpty = !newValues[activeSlot] || newValues[activeSlot].trim().length === 0

  if (!isActiveEmpty) {
    // Текущий слот занят: ищем ближайший пустой
    let found = -1
    // Проверяем вперед: activeSlot + 1 ... 4
    for (let s = activeSlot + 1; s < 5; s++) {
      if (!newValues[s] || newValues[s].trim().length === 0) {
        found = s
        break
      }
    }
    // Если вперед нет, проверяем с 0 до activeSlot - 1
    if (found === -1) {
      for (let s = 0; s < activeSlot; s++) {
        if (!newValues[s] || newValues[s].trim().length === 0) {
          found = s
          break
        }
      }
    }
    if (found !== -1) {
      targetSlot = found
    }
  }

  // Вставляем текст в targetSlot
  newValues[targetSlot] = text

  // Ищем следующий пустой слот для фокуса
  let nextFocusSlot = -1
  for (let s = targetSlot + 1; s < 5; s++) {
    if (!newValues[s] || newValues[s].trim().length === 0) {
      nextFocusSlot = s
      break
    }
  }
  if (nextFocusSlot === -1) {
    for (let s = 0; s < targetSlot; s++) {
      if (!newValues[s] || newValues[s].trim().length === 0) {
        nextFocusSlot = s
        break
      }
    }
  }
  if (nextFocusSlot === -1) {
    nextFocusSlot = targetSlot
  }

  return {
    newValues,
    targetSlot,
    nextFocusSlot,
  }
}

/**
 * Разделяет остаток текста, превышающего лимит тарифа:
 * - Основная часть обрезается аккуратно по границе слова перед maxChars.
 * - Остаток переносится в следующий слот (или ближайший пустой).
 */
export function splitRemainder(
  currentValues: string[],
  activeSlot: number,
  maxChars: number
): SplitRemainderResult {
  const newValues = [...currentValues]
  while (newValues.length < 5) newValues.push('')

  const fullText = newValues[activeSlot] || ''
  if (fullText.length <= maxChars) {
    return {
      newValues,
      currentPart: fullText,
      remainderPart: '',
      targetSlot: activeSlot,
      remainderSlot: Math.min(4, activeSlot + 1),
    }
  }

  // Ищем границу слова перед maxChars
  let splitIndex = maxChars
  const candidateSlice = fullText.slice(0, maxChars)
  const lastSpace = candidateSlice.search(/\s[^\s]*$/)
  if (lastSpace > Math.floor(maxChars * 0.7)) {
    splitIndex = lastSpace
  }

  const currentPart = fullText.slice(0, splitIndex).trim()
  const remainderPart = fullText.slice(splitIndex).trim()

  newValues[activeSlot] = currentPart

  // Переносим остаток в следующий слот
  let remainderSlot = activeSlot + 1
  if (remainderSlot > 4) {
    const firstEmpty = newValues.slice(0, 5).findIndex((v) => !v || v.trim().length === 0)
    remainderSlot = firstEmpty !== -1 ? firstEmpty : 4
  }

  if (remainderSlot <= 4 && remainderSlot !== activeSlot) {
    const existing = newValues[remainderSlot] || ''
    newValues[remainderSlot] = existing.trim().length > 0 ? `${existing} ${remainderPart}` : remainderPart
  }

  return {
    newValues,
    currentPart,
    remainderPart,
    targetSlot: activeSlot,
    remainderSlot,
  }
}

/**
 * Форматирует счётчик символов вида «742/1000» или «1 340/1000» с разделителем тысяч.
 */
export function formatCharCount(current: number, max: number): string {
  const formattedCurrent = current > 999 ? current.toLocaleString('ru-RU') : String(current)
  return `${formattedCurrent}/${max}`
}
