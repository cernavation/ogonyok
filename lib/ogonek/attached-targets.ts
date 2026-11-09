import type { GratitudeEntry, PrideEntry } from './types'

export type AttachedPhotoTarget = {
  type: 'pride' | 'gratitude'
  index: number // 1-based (1..5)
}

/**
 * Форматирует подпись привязки фото к гордостям и благодарностям дня:
 * - 1 гордость: "🔥 Иллюстрация к Гордости #1: Текст гордости"
 * - 1 благодарность: "❤️ Иллюстрация к Благодарности #1"
 * - несколько гордостей: "Иллюстрация к Гордостям #2, #3"
 * - несколько благодарностей: "Иллюстрация к Благодарностям #1, #2"
 * - смешанная привязка: "Иллюстрация к Гордостям #1 · Благодарностям #2"
 */
export function formatPhotoAttachmentCaption(
  targets?: AttachedPhotoTarget[] | null,
  prides?: (PrideEntry | string)[] | null,
  gratitudes?: (GratitudeEntry | string)[] | null
): string | null {
  if (!targets || !Array.isArray(targets) || targets.length === 0) {
    return null
  }

  // Нормализуем индексы (если пришёл 0-based, превращаем в 1-based)
  const normalized = targets
    .filter((t) => t && (t.type === 'pride' || t.type === 'gratitude'))
    .map((t) => ({
      type: t.type,
      index: typeof t.index === 'number' && t.index >= 1 ? t.index : (typeof t.index === 'number' ? t.index + 1 : 1),
    }))

  if (normalized.length === 0) return null

  const prideTargets = normalized
    .filter((t) => t.type === 'pride')
    .sort((a, b) => a.index - b.index)

  const gratitudeTargets = normalized
    .filter((t) => t.type === 'gratitude')
    .sort((a, b) => a.index - b.index)

  // 1. Только 1 гордость
  if (prideTargets.length === 1 && gratitudeTargets.length === 0) {
    const idx = prideTargets[0].index
    const prideItem = prides?.[idx - 1]
    const rawText = typeof prideItem === 'string' ? prideItem : prideItem?.text
    const text = rawText && rawText !== '—' ? rawText.trim() : ''
    if (text) {
      const shortText = text.length > 60 ? text.slice(0, 57) + '...' : text
      return `🔥 Иллюстрация к Гордости #${idx}: ${shortText}`
    }
    return `🔥 Иллюстрация к Гордости #${idx}`
  }

  // 2. Только 1 благодарность
  if (gratitudeTargets.length === 1 && prideTargets.length === 0) {
    const idx = gratitudeTargets[0].index
    return `❤️ Иллюстрация к Благодарности #${idx}`
  }

  // 3. Только гордости (больше 1)
  if (prideTargets.length > 1 && gratitudeTargets.length === 0) {
    const indicesStr = prideTargets.map((t) => `#${t.index}`).join(', ')
    return `Иллюстрация к Гордостям ${indicesStr}`
  }

  // 4. Только благодарности (больше 1)
  if (gratitudeTargets.length > 1 && prideTargets.length === 0) {
    const indicesStr = gratitudeTargets.map((t) => `#${t.index}`).join(', ')
    return `Иллюстрация к Благодарностям ${indicesStr}`
  }

  // 5. Смешанная привязка (и гордости, и благодарности)
  const parts: string[] = []
  if (prideTargets.length === 1) {
    parts.push(`Гордости #${prideTargets[0].index}`)
  } else if (prideTargets.length > 1) {
    parts.push(`Гордостям ${prideTargets.map((t) => `#${t.index}`).join(', ')}`)
  }

  if (gratitudeTargets.length === 1) {
    parts.push(`Благодарности #${gratitudeTargets[0].index}`)
  } else if (gratitudeTargets.length > 1) {
    parts.push(`Благодарностям ${gratitudeTargets.map((t) => `#${t.index}`).join(', ')}`)
  }

  return `Иллюстрация к ${parts.join(', ')}`
}
