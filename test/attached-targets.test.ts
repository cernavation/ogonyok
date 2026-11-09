import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { formatPhotoAttachmentCaption, type AttachedPhotoTarget } from '../lib/ogonek/attached-targets.ts'

describe('Мульти-привязка фото к гордостям и благодарностям дня', () => {
  it('formatPhotoAttachmentCaption: возвращает null если целей нет', () => {
    assert.strictEqual(formatPhotoAttachmentCaption(null), null)
    assert.strictEqual(formatPhotoAttachmentCaption([]), null)
    assert.strictEqual(formatPhotoAttachmentCaption(undefined), null)
  })

  it('formatPhotoAttachmentCaption: форматирует одиночную гордость с текстом', () => {
    const targets: AttachedPhotoTarget[] = [{ type: 'pride', index: 2 }]
    const prides = [
      { num: '1', text: 'Первое дело', scale: 8, overcome: 1 as const },
      { num: '2', text: 'Пробежал полумарафон 21 км', scale: 10, overcome: 3 as const },
    ]
    const caption = formatPhotoAttachmentCaption(targets, prides, [])
    assert.strictEqual(caption, '🔥 Иллюстрация к Гордости #2: Пробежал полумарафон 21 км')
  })

  it('formatPhotoAttachmentCaption: форматирует одиночную гордость без текста', () => {
    const targets: AttachedPhotoTarget[] = [{ type: 'pride', index: 1 }]
    const caption = formatPhotoAttachmentCaption(targets, [], [])
    assert.strictEqual(caption, '🔥 Иллюстрация к Гордости #1')
  })

  it('formatPhotoAttachmentCaption: форматирует одиночную благодарность', () => {
    const targets: AttachedPhotoTarget[] = [{ type: 'gratitude', index: 3 }]
    const gratitudes = [
      { text: 'Спасибо родителям' },
      { text: 'Спасибо другу' },
      { text: 'Благодарен наставнику за ценный совет' },
    ]
    const caption = formatPhotoAttachmentCaption(targets, [], gratitudes)
    assert.strictEqual(caption, '❤️ Иллюстрация к Благодарности #3')
  })

  it('formatPhotoAttachmentCaption: форматирует несколько гордостей (мультивыбор)', () => {
    const targets: AttachedPhotoTarget[] = [
      { type: 'pride', index: 2 },
      { type: 'pride', index: 3 },
    ]
    const caption = formatPhotoAttachmentCaption(targets, [], [])
    assert.strictEqual(caption, 'Иллюстрация к Гордостям #2, #3')
  })

  it('formatPhotoAttachmentCaption: форматирует несколько благодарностей', () => {
    const targets: AttachedPhotoTarget[] = [
      { type: 'gratitude', index: 1 },
      { type: 'gratitude', index: 4 },
    ]
    const caption = formatPhotoAttachmentCaption(targets, [], [])
    assert.strictEqual(caption, 'Иллюстрация к Благодарностям #1, #4')
  })

  it('formatPhotoAttachmentCaption: форматирует смешанный мультивыбор (гордости + благодарности)', () => {
    const targets: AttachedPhotoTarget[] = [
      { type: 'pride', index: 1 },
      { type: 'gratitude', index: 2 },
    ]
    const caption = formatPhotoAttachmentCaption(targets, [], [])
    assert.strictEqual(caption, 'Иллюстрация к Гордости #1, Благодарности #2')
  })

  it('composer.tsx содержит селектор привязки с двумя рядами чипов 1..5 и вопросом', () => {
    const composerCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/ogonek/composer.tsx'),
      'utf8'
    )
    assert.ok(composerCode.includes('К чему относится это фото?'), 'Содержит вопрос о привязке фото')
    assert.ok(composerCode.includes('attachedTargets'), 'Использует attachedTargets')
    assert.ok(composerCode.includes('attached_targets'), 'Сохраняет attached_targets в payload')
    assert.ok(composerCode.includes("isTargetActive('pride'"), 'Проверяет активность чипа гордости')
    assert.ok(composerCode.includes("isTargetActive('gratitude'"), 'Проверяет активность чипа благодарности')
    assert.ok(composerCode.includes("handleToggleTarget('pride'"), 'Обрабатывает клик по чипам гордости')
    assert.ok(composerCode.includes("handleToggleTarget('gratitude'"), 'Обрабатывает клик по чипам благодарности')
  })

  it('day-card.tsx, lightbox.tsx и media-lightbox.tsx выводят точную привязку фото', () => {
    const cardCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/ogonek/day-card.tsx'),
      'utf8'
    )
    assert.ok(cardCode.includes('photoCaption'), 'Формирует photoCaption в карточке дня')
    assert.ok(cardCode.includes('attached_targets'), 'Использует attached_targets в карточке дня')
    assert.ok(cardCode.includes('attachedTargets={day.attached_targets'), 'Передает attachedTargets в MediaLightbox')

    const lightboxCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/ogonek/lightbox.tsx'),
      'utf8'
    )
    assert.ok(lightboxCode.includes('formatPhotoAttachmentCaption'), 'Использует formatPhotoAttachmentCaption в lightbox')

    const mediaLightboxCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/ogonek/media-lightbox.tsx'),
      'utf8'
    )
    assert.ok(mediaLightboxCode.includes('attachedCaption'), 'Выводит attachedCaption в MediaLightbox')
  })

  it('use-ogonek-store.ts сохраняет attached_targets в локальное хранилище и Supabase', () => {
    const storeCode = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/ogonek/use-ogonek-store.ts'),
      'utf8'
    )
    assert.ok(storeCode.includes('attached_targets: day.attached_targets'), 'Сохраняет attached_targets в syncDayToSupabase')
    assert.ok(storeCode.includes('attached_targets: payload.attachedTargets'), 'Сохраняет attached_targets в addNewDay')
  })
})
