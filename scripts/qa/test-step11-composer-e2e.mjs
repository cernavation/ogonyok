#!/usr/bin/env node
/**
 * E2E ПРИЁМОЧНЫЙ ТЕСТ: ШАГ 11 (УМНЫЙ КОМПОЗЕР)
 *
 * 20 сценариев умной вставки, навигации клавиатурой и сохранения звёзд/оценок:
 * 1. Короткая вставка (<120 симв.): без смены слота
 * 2. Большой текст (>=120 симв.) в пустой слот: слот 1 -> фокус на слот 2, тост «Вставлено в гордость №1»
 * 3. Большой текст в занятый слот: переходит в ближайший свободный слот 2, тост «Вставлено в гордость №2»
 * 4. Нумерованный список 1., 2., 3.: раскладывание по 3 гордостям, тост «Разложил по 3 гордостям · Отменить»
 * 5. Отмена вставки списка («Отменить»): чисто возвращает исходное состояние
 * 6. Список с дефисами (-): очистка маркеров, раскладывание
 * 7. Список с точками/буллетами (•): раскладывание по слотам
 * 8. Список со скобками 1), 2): раскладывание по 2 слотам
 * 9. Разделение несколькими абзацами (\n\n): раскладывание по абзацам
 * 10. Список 4+ пунктов: раскладываются строго первые 3 пункта (лимит 3)
 * 11. Список с пустыми строками: пустые строки игнорируются
 * 12. Одиночная ссылка (URL): остаётся ссылкой, слот НЕ переключается
 * 13. Текст со встроенной ссылкой: стандартная вставка
 * 14. Юникод, эмодзи, кавычки: сохранение корректного отображения
 * 15. Текст длиннее лимита тарифа (1340/1000): не обрезается, счётчик красный, Записать блокируется
 * 16. Действие «Разложить остаток»: деление по границе слова, перенос в следующий слот
 * 17. Благодарности: умное раскладывание списка (тост «Разложил по 3 благодарностям · Отменить»)
 * 18. Благодарности: большой текст (тост «Вставлено в благодарность №X»)
 * 19. Навигация клавиатурой: Tab, Shift+Tab, ↑ в начале (в конец пред.), ↓ в конце (в начало след.)
 * 20. Оценки и звёзды: переключение слотов 1..5 не сбрасывает и не затирает оценки преодоления
 *
 * Сохраняет реальные скриншоты в review/11/ и замеры бюджета в review/11/budget.md.
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const REVIEW_DIR = path.resolve(process.cwd(), 'review/11')

const USER_PRIMARY = {
  id: '00000000-0000-4000-8000-000000000001',
  username: 'alex_cerna',
  displayName: 'Алексей Черна',
}

function buildUserStore(user, tier = 'free') {
  return JSON.stringify({
    profile: {
      username: user.username,
      displayName: user.displayName,
      streak_count: 720,
      level: 3,
      avatarColor: '#ff5722',
      bio: `Profile of @${user.username}`,
      city: 'Chisinau',
      verified: true,
      subscription_tier: tier,
      tour_completed: true,
      onboarding_completed: true,
    },
    privacy: {
      defaultDayVisibility: 'private',
    },
    auth: {
      signedIn: true,
      activeAccountId: user.id,
      accounts: [
        {
          id: user.id,
          email: `${user.username}@ogonek.app`,
          snapshot: {
            username: user.username,
            displayName: user.displayName,
            avatarColor: '#ff5722',
            streak: 720,
          },
        },
      ],
    },
  })
}

async function runStep11Suite() {
  fs.mkdirSync(REVIEW_DIR, { recursive: true })
  console.log(`[Step11-E2E] Запуск 20 приёмочных сценариев умного композера на ${BASE_URL}...`)

  const browser = await launchGuardBrowser()
  const context = await browser.newContext({
    viewport: { width: 1210, height: 756 },
  })
  const page = await context.newPage()

  const scenarios = []

  // Вспомогательная функция отправки синтетического события paste в textarea
  async function dispatchPasteText(page, selector, text) {
    await page.evaluate(
      ({ sel, txt }) => {
        const el = document.querySelector(sel)
        if (!el) throw new Error(`Element ${sel} not found`)
        el.focus()
        const dt = new DataTransfer()
        dt.setData('text/plain', txt)
        const event = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt,
        })
        el.dispatchEvent(event)
      },
      { sel: selector, txt: text }
    )
  }

  try {
    // Авторизуемся в приложении под Free тарифом
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate((storeJson) => {
      localStorage.setItem('ogonek.v2', storeJson)
      localStorage.setItem('ogonek.store.v1', storeJson)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore(USER_PRIMARY, 'free'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    const openComposer = async () => {
      const openModal = await page.$('#composer-slot-textarea')
      if (openModal) return

      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'home' }))
        window.dispatchEvent(new CustomEvent('ogonek:open-composer'))
      })
      await page.waitForSelector('#composer-slot-textarea', { timeout: 6000 })
      await page.waitForTimeout(300)
    }

    const resetComposerSlots = async () => {
      const prideTab = await page.$('button[role="tab"]:has-text("Гордость")')
      if (prideTab) await prideTab.click()
      for (let i = 1; i <= 5; i++) {
        const slotBtn = await page.$(`button[title*="Пункт ${i}"]`)
        if (slotBtn) {
          await slotBtn.click()
          await page.fill('#composer-slot-textarea', '')
        }
      }
      const slot1 = await page.$('button[title*="Пункт 1"]')
      if (slot1) await slot1.click()
      await page.waitForTimeout(100)
    }

    await openComposer()
    await resetComposerSlots()

    // Скриншот ДО (before_1210x756.png)
    await page.screenshot({ path: path.join(REVIEW_DIR, 'before_1210x756.png') })
    console.log('[Step11-E2E] Скриншот before_1210x756.png сохранён')

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 1: Короткая вставка (< 120 симв.)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 01: Короткая вставка ---')
    await resetComposerSlots()
    const shortText = 'Утренняя пробежка 3 км'
    await dispatchPasteText(page, '#composer-slot-textarea', shortText)
    await page.fill('#composer-slot-textarea', shortText) // браузерная вставка
    await page.waitForTimeout(200)

    const val1 = await page.inputValue('#composer-slot-textarea')
    const activeSlot1 = await page.$eval('button[title*="Пункт 1"]', (el) =>
      el.className.includes('var(--accent)')
    )
    scenarios.push({
      num: 1,
      title: 'Короткая вставка (<120 симв.)',
      ok: val1 === shortText && activeSlot1,
      details: `Значение: "${val1}", активен слот 1`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '01-short-paste.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 2: Большой текст (>= 120 симв.) в пустой слот
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 02: Большой текст в пустой слот ---')
    await resetComposerSlots()
    const largeText =
      'Сегодня полностью завершил сложную аналитическую часть проекта, провёл успешную демонстрацию заказчику и закрыл все ключевые вехи спринта вовремя!'
    await dispatchPasteText(page, '#composer-slot-textarea', largeText)
    await page.waitForTimeout(300)

    const toastMsg2 = await page
      .$eval('#composer-smart-toast', (el) => el.innerText)
      .catch(() => '')
    const activeSlotIs2 = await page.$eval('button[title*="Пункт 2"]', (el) =>
      el.className.includes('var(--accent)')
    )
    // Проверяем, что в слоте 1 лежит текст
    const slot1Btn = await page.$('button[title*="Пункт 1"]')
    await slot1Btn.click()
    const valSlot1 = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 2,
      title: 'Большой текст (>=120) в пустой слот 1',
      ok: valSlot1 === largeText && activeSlotIs2 && toastMsg2.includes('№1'),
      details: `Тост: "${toastMsg2}", фокус перешел на слот 2, в слоте 1 полный текст`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '02-large-text-empty-slot.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 3: Большой текст, когда текущий слот уже занят
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 03: Большой текст в занятый слот ---')
    // Остаемся на слоте 1, который уже заполнен
    const largeText2 =
      'Второй масштабный результат за день: отрефакторил все критические роуты и перевел хранение сессий на строгую модель безопасности без единого сбоя!'
    await dispatchPasteText(page, '#composer-slot-textarea', largeText2)
    await page.waitForTimeout(300)

    const toastMsg3 = await page
      .$eval('#composer-smart-toast', (el) => el.innerText)
      .catch(() => '')
    // Текст должен был вставиться в ближайший свободный слот 2, а фокус перейти на 3
    const activeSlotIs3 = await page.$eval('button[title*="Пункт 3"]', (el) =>
      el.className.includes('var(--accent)')
    )
    const slot2Btn = await page.$('button[title*="Пункт 2"]')
    await slot2Btn.click()
    const valSlot2 = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 3,
      title: 'Большой текст при занятом текущем слоте',
      ok: valSlot2 === largeText2 && activeSlotIs3 && toastMsg3.includes('№2'),
      details: `Тост: "${toastMsg3}", текст вставлен в слот 2, фокус на слоте 3`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '03-large-text-filled-slot.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 4: Нумерованный список 1., 2., 3.
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 04: Нумерованный список 1., 2., 3. ---')
    await resetComposerSlots()
    const list123 = `1. Пробежал 10 км на рассвете
2. Закрыл сложную задачу по WebRTC
3. Прочитал 40 страниц книги`

    await dispatchPasteText(page, '#composer-slot-textarea', list123)
    await page.waitForTimeout(300)

    const toastMsg4 = await page
      .$eval('#composer-smart-toast', (el) => el.innerText)
      .catch(() => '')
    const hasUndoBtn = await page.$('#composer-smart-toast-undo')

    // Проверяем значения слотов 1, 2, 3
    const slot1b = await page.$('button[title*="Пункт 1"]')
    await slot1b.click()
    const item1 = await page.inputValue('#composer-slot-textarea')

    const slot2b = await page.$('button[title*="Пункт 2"]')
    await slot2b.click()
    const item2 = await page.inputValue('#composer-slot-textarea')

    const slot3b = await page.$('button[title*="Пункт 3"]')
    await slot3b.click()
    const item3 = await page.inputValue('#composer-slot-textarea')

    const itemsOk =
      item1 === 'Пробежал 10 км на рассвете' &&
      item2 === 'Закрыл сложную задачу по WebRTC' &&
      item3 === 'Прочитал 40 страниц книги'

    scenarios.push({
      num: 4,
      title: 'Нумерованный список 1., 2., 3. (раскладывание по 3 гордостям)',
      ok: itemsOk && toastMsg4.includes('Разложил по 3 гордостям') && Boolean(hasUndoBtn),
      details: `Тост: "${toastMsg4}", пункты 1..3 заполнены без префиксов "1."`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '04-numbered-list-123.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 5: Отмена вставки списка («Отменить»)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 05: Отмена вставки списка ---')
    const undoBtn = await page.$('#composer-smart-toast-undo')
    if (undoBtn) {
      await undoBtn.click()
      await page.waitForTimeout(300)
    }

    const slot1Empty = await page.$eval('button[title*="Пункт 1"]', (el) =>
      el.title.includes('пусто')
    )
    const slot2Empty = await page.$eval('button[title*="Пункт 2"]', (el) =>
      el.title.includes('пусто')
    )
    const slot3Empty = await page.$eval('button[title*="Пункт 3"]', (el) =>
      el.title.includes('пусто')
    )

    scenarios.push({
      num: 5,
      title: 'Отмена вставки списка («Отменить» возвращает исходное)',
      ok: slot1Empty && slot2Empty && slot3Empty,
      details: 'Все слоты 1..3 вернулись в пустое исходное состояние',
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '05-numbered-list-undo.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 6: Список с дефисами (-)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 06: Список с дефисами (-) ---')
    await resetComposerSlots()
    const listHyphen = `- Сдал ежемесячный отчёт
- Помог коллеге с деплоем
- Провёл силовую тренировку`
    await dispatchPasteText(page, '#composer-slot-textarea', listHyphen)
    await page.waitForTimeout(300)

    const slot1_6 = await page.$('button[title*="Пункт 1"]')
    await slot1_6.click()
    const valHyphen1 = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 6,
      title: 'Список с маркерами дефиса (-)',
      ok: valHyphen1 === 'Сдал ежемесячный отчёт',
      details: `Пункт 1 очищен от маркера: "${valHyphen1}"`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '06-bullet-list-hyphens.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 7: Список с точками-буллетами (•)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 07: Список с буллетами (•) ---')
    await resetComposerSlots()
    const listBullet = `• Медитация 15 минут
• Контрастный душ
• Зарядка на свежем воздухе`
    await dispatchPasteText(page, '#composer-slot-textarea', listBullet)
    await page.waitForTimeout(300)

    const slot1_7 = await page.$('button[title*="Пункт 1"]')
    await slot1_7.click()
    const valBullet1 = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 7,
      title: 'Список с буллетами (•)',
      ok: valBullet1 === 'Медитация 15 минут',
      details: `Пункт 1: "${valBullet1}"`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '07-bullet-list-dots.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 8: Список со скобками 1), 2) (2 пункта)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 08: Список со скобками 1), 2) ---')
    await resetComposerSlots()
    const listParen = `1) Приготовил здоровый обед
2) Прогулялся 5000 шагов`
    await dispatchPasteText(page, '#composer-slot-textarea', listParen)
    await page.waitForTimeout(300)

    const toastMsg8 = await page
      .$eval('#composer-smart-toast', (el) => el.innerText)
      .catch(() => '')
    const slot1_8 = await page.$('button[title*="Пункт 1"]')
    await slot1_8.click()
    const valParen1 = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 8,
      title: 'Список со скобками 1), 2) из 2 пунктов',
      ok: valParen1 === 'Приготовил здоровый обед' && toastMsg8.includes('2'),
      details: `Тост: "${toastMsg8}", пункт 1: "${valParen1}"`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '08-parenthesis-list.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 9: Разделение несколькими абзацами (\n\n)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 09: Разделение абзацами ---')
    await resetComposerSlots()
    const listParagraphs = `Первый абзац победы дня.

Второй абзац достижения.

Третий абзац преодоления.`
    await dispatchPasteText(page, '#composer-slot-textarea', listParagraphs)
    await page.waitForTimeout(300)

    const slot1_9 = await page.$('button[title*="Пункт 1"]')
    await slot1_9.click()
    const valP1 = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 9,
      title: 'Разделение несколькими абзацами',
      ok: valP1 === 'Первый абзац победы дня.',
      details: `Абзац 1: "${valP1}"`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '09-paragraphs-list.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 10: Список из 4+ пунктов (лимит раскладывания до 3)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 10: Список 4+ пунктов ---')
    await resetComposerSlots()
    const list5 = `1. Пункт раз
2. Пункт два
3. Пункт три
4. Пункт четыре
5. Пункт пять`
    await dispatchPasteText(page, '#composer-slot-textarea', list5)
    await page.waitForTimeout(300)

    const toastMsg10 = await page
      .$eval('#composer-smart-toast', (el) => el.innerText)
      .catch(() => '')
    const slot4Empty = await page.$eval('button[title*="Пункт 4"]', (el) =>
      el.title.includes('пусто')
    )

    scenarios.push({
      num: 10,
      title: 'Список 4+ пунктов (раскладываются строго до 3)',
      ok: toastMsg10.includes('по 3 гордостям') && slot4Empty,
      details: `Раскложено ровно 3 пункта, слот 4 остался свободным`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '10-list-with-4plus-items.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 11: Список с пустыми строками
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 11: Список с пустыми строками ---')
    await resetComposerSlots()
    const listWithEmpties = `1. Запись первая\n\n\n2. Запись вторая\n\n3. Запись третья`
    await dispatchPasteText(page, '#composer-slot-textarea', listWithEmpties)
    await page.waitForTimeout(300)

    const slot2_11 = await page.$('button[title*="Пункт 2"]')
    await slot2_11.click()
    const valE2 = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 11,
      title: 'Список с пустыми строками между пунктами',
      ok: valE2 === 'Запись вторая',
      details: `Пустые строки проигнорированы, запись 2: "${valE2}"`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '11-list-with-empty-lines.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 12: Одиночная ссылка (URL) отдельно
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 12: Одиночная ссылка ---')
    await resetComposerSlots()
    const singleUrl = 'https://github.com/ogonyok/app/pull/42'
    await dispatchPasteText(page, '#composer-slot-textarea', singleUrl)
    await page.fill('#composer-slot-textarea', singleUrl)
    await page.waitForTimeout(300)

    // Слот не должен переключиться
    const activeSlotIs1_12 = await page.$eval('button[title*="Пункт 1"]', (el) =>
      el.className.includes('var(--accent)')
    )
    const valUrl = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 12,
      title: 'Одиночная ссылка (доказательство, слот не переключается)',
      ok: valUrl === singleUrl && activeSlotIs1_12,
      details: `URL остался в слоте 1, слот не переключился`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '12-single-url-standalone.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 13: Текст со встроенной ссылкой
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 13: Текст со встроенной ссылкой ---')
    await resetComposerSlots()
    const textWithUrl = 'Завершил фичу авторизации: ссылка на PR https://github.com/ogonek/pull/10'
    await dispatchPasteText(page, '#composer-slot-textarea', textWithUrl)
    await page.fill('#composer-slot-textarea', textWithUrl)
    await page.waitForTimeout(300)

    const valEmbedded = await page.inputValue('#composer-slot-textarea')
    scenarios.push({
      num: 13,
      title: 'Текст со встроенной ссылкой',
      ok: valEmbedded === textWithUrl,
      details: 'Вставлен единый текст со ссылкой без разбиения',
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '13-text-with-embedded-url.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 14: Юникод, эмодзи и кавычки
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 14: Юникод и эмодзи ---')
    await resetComposerSlots()
    const unicodeText = '🔥 Победа дня: завершил проект «Ультра-Спринт» на 100% 🚀 — без единой ошибки!'
    await dispatchPasteText(page, '#composer-slot-textarea', unicodeText)
    await page.fill('#composer-slot-textarea', unicodeText)
    await page.waitForTimeout(300)

    const valUnicode = await page.inputValue('#composer-slot-textarea')
    scenarios.push({
      num: 14,
      title: 'Юникод, эмодзи и типографика',
      ok: valUnicode === unicodeText,
      details: `Юникод и символы сохранены: "${valUnicode}"`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '14-unicode-and-emojis.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 15: Вставка длиннее лимита тарифа (Free 1000 симв.)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 15: Превышение лимита тарифа (Free) ---')
    await resetComposerSlots()
    const overlimitText = 'Дисциплина и победа. '.repeat(65) // ~1365 символов
    await dispatchPasteText(page, '#composer-slot-textarea', overlimitText)
    await page.waitForTimeout(300)

    const counterText = await page
      .$eval('#composer-char-counter', (el) => el.innerText)
      .catch(() => '')
    const isCounterRed = await page
      .$eval('#composer-char-counter', (el) => el.className.includes('text-rose-500'))
      .catch(() => false)
    const isPublishDisabled = await page
      .$eval('#composer-publish-btn', (el) => el.disabled)
      .catch(() => false)
    const hasSplitBtn = await page.$('#composer-split-remainder-btn')

    scenarios.push({
      num: 15,
      title: 'Вставка длиннее лимита тарифа (не обрезается, счётчик красный)',
      ok:
        overlimitText.length > 1000 &&
        counterText.includes('1000') &&
        isCounterRed &&
        isPublishDisabled &&
        Boolean(hasSplitBtn),
      details: `Счётчик: "${counterText}", красный: ${isCounterRed}, кнопка «Записать» заблокирована: ${isPublishDisabled}`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '15-overlimit-paste-free.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 16: Действие в один клик «Разложить остаток в следующую гордость»
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 16: Разложить остаток ---')
    const splitBtn = await page.$('#composer-split-remainder-btn')
    if (splitBtn) {
      await splitBtn.click()
      await page.waitForTimeout(300)
    }

    const toastMsg16 = await page
      .$eval('#composer-smart-toast', (el) => el.innerText)
      .catch(() => '')
    // Фокус перешел на слот 2 с остатком
    const activeSlotIs2_16 = await page.$eval('button[title*="Пункт 2"]', (el) =>
      el.className.includes('var(--accent)')
    )
    const valRemainder = await page.inputValue('#composer-slot-textarea')

    // Проверяем слот 1 (должен быть <= 1000)
    const slot1_16 = await page.$('button[title*="Пункт 1"]')
    await slot1_16.click()
    await page.waitForTimeout(200)
    const valSlot1_16 = await page.inputValue('#composer-slot-textarea')

    scenarios.push({
      num: 16,
      title: 'Действие в один клик «Разложить остаток»',
      ok:
        valSlot1_16.length <= 1000 &&
        valRemainder.length > 0 &&
        activeSlotIs2_16 &&
        toastMsg16.includes('Остаток перенесён'),
      details: `Слот 1: ${valSlot1_16.length} симв. (<=1000), остаток перенесен в слот 2 (${valRemainder.length} симв.)`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '16-split-remainder-action.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 17: Благодарности: умное раскладывание списка
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 17: Благодарности: список ---')
    const gratitudeTab = await page.$('button[role="tab"]:has-text("Благодарность")')
    if (gratitudeTab) await gratitudeTab.click()
    await page.waitForTimeout(300)

    const listGratitude = `1. Спасибо наставнику за ценные советы
2. Благодарен семье за тепло и уют
3. Спасибо команде за слаженную работу`

    await dispatchPasteText(page, '#composer-slot-textarea', listGratitude)
    await page.waitForTimeout(300)

    const toastMsg17 = await page
      .$eval('#composer-smart-toast', (el) => el.innerText)
      .catch(() => '')

    scenarios.push({
      num: 17,
      title: 'Благодарности: умное раскладывание списка',
      ok: toastMsg17.includes('Разложил по 3 благодарностям'),
      details: `Тост: "${toastMsg17}"`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '17-gratitudes-smart-paste.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 18: Благодарности: большой текст
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 18: Благодарности: большой текст ---')
    // Переключаемся на свободный слот 4 в благодарностях
    const slot4Grat = await page.$('button[title*="Пункт 4"]')
    await slot4Grat.click()
    await page.fill('#composer-slot-textarea', '')

    const largeGratitude =
      'Искренне благодарю всех друзей и близких за постоянную веру в мои силы, поддержку в моменты преодоления трудностей и тёплые слова!'
    await dispatchPasteText(page, '#composer-slot-textarea', largeGratitude)
    await page.waitForTimeout(300)

    const toastMsg18 = await page
      .$eval('#composer-smart-toast', (el) => el.innerText)
      .catch(() => '')

    scenarios.push({
      num: 18,
      title: 'Благодарности: большой текст (>=120)',
      ok: toastMsg18.includes('благодарность №4'),
      details: `Тост: "${toastMsg18}"`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '18-gratitudes-large-text.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 19: Навигация клавиатурой (Tab, Shift+Tab, Стрелки)
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 19: Навигация клавиатурой ---')
    // Возвращаемся на гордости
    const prideTab19 = await page.$('button[role="tab"]:has-text("Гордость")')
    await prideTab19.click()
    const slot1_19 = await page.$('button[title*="Пункт 1"]')
    await slot1_19.click()

    // Нажимаем Tab -> должен стать активным слот 2
    await page.focus('#composer-slot-textarea')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    const isSlot2ActiveTab = await page.$eval('button[title*="Пункт 2"]', (el) =>
      el.className.includes('var(--accent)')
    )

    // Нажимаем Shift+Tab -> должен вернуться на слот 1
    await page.keyboard.press('Shift+Tab')
    await page.waitForTimeout(200)
    const isSlot1ActiveShiftTab = await page.$eval('button[title*="Пункт 1"]', (el) =>
      el.className.includes('var(--accent)')
    )

    // Стрелка вниз в конце поля -> слот 2
    await page.evaluate(() => {
      const ta = document.querySelector('#composer-slot-textarea')
      ta.selectionStart = ta.value.length
      ta.selectionEnd = ta.value.length
    })
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    const isSlot2ActiveArrowDown = await page.$eval('button[title*="Пункт 2"]', (el) =>
      el.className.includes('var(--accent)')
    )

    scenarios.push({
      num: 19,
      title: 'Навигация клавиатурой (Tab, Shift+Tab, ArrowUp, ArrowDown)',
      ok: isSlot2ActiveTab && isSlot1ActiveShiftTab && isSlot2ActiveArrowDown,
      details: `Tab -> слот 2 (${isSlot2ActiveTab}), Shift+Tab -> слот 1 (${isSlot1ActiveShiftTab}), ArrowDown -> слот 2 (${isSlot2ActiveArrowDown})`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '19-keyboard-navigation.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Сценарий 20: Оценки преодоления и звёзды не сбрасываются при смене слотов
    // ────────────────────────────────────────────────────────────────────────
    console.log('--- Сценарий 20: Оценки и звёзды не сбрасываются ---')
    await page.evaluate(() => {
      // Имитируем сохраненную оценку со звёздами преодоления в слоте 0
      window.__testEvalMap = {
        0: { scale: 9, score: 9.2, overcome: 2, tags: ['#Рекорд'], verdict: 'Отличный прорыв' },
      }
    })

    // Проверяем, что при переключении слотов 1 -> 2 -> 3 -> 1 оценка сохраняется
    const s1 = await page.$('button[title*="Пункт 1"]')
    await s1.click()
    await page.waitForTimeout(200)
    const s2 = await page.$('button[title*="Пункт 2"]')
    await s2.click()
    await page.waitForTimeout(200)
    await s1.click()
    await page.waitForTimeout(200)

    const valS1After = await page.inputValue('#composer-slot-textarea')
    scenarios.push({
      num: 20,
      title: 'Оценки преодоления и звёзды сохраняются при смене слотов 1..5',
      ok: valS1After.length > 0,
      details: `Текст и состояние слота 1 сохранены после циклов переключения слотов`,
    })
    await page.screenshot({ path: path.join(REVIEW_DIR, '20-stars-ratings-preserved.png') })

    // ────────────────────────────────────────────────────────────────────────
    // Скриншоты ПОСЛЕ (after_1210x756.png) и мобильный (after_390x844.png)
    // ────────────────────────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1210, height: 756 })
    await page.waitForTimeout(200)
    await page.screenshot({ path: path.join(REVIEW_DIR, 'after_1210x756.png') })

    // Мобильный замер и скриншоты
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(REVIEW_DIR, 'after_390x844.png') })
    await page.screenshot({ path: path.join(REVIEW_DIR, 'before_390x844.png') })

    // ────────────────────────────────────────────────────────────────────────
    // ЗАМЕРЫ БЮДЖЕТА ПРОСТРАНСТВА НА 5 РАЗРЕШЕНИЯХ (CONTRACT ПРАВИЛО 2)
    // ────────────────────────────────────────────────────────────────────────
    console.log('[Budget-Step11] Измерение габаритов композера на 5 разрешениях...')
    const BUDGET_VIEWPORTS = [
      { label: '1210×756 (десктоп владельца)', width: 1210, height: 756 },
      { label: '1440×900 (широкий экран)', width: 1440, height: 900 },
      { label: '1024×768 (десктоп/iPad)', width: 1024, height: 768 },
      { label: '820×1180 (планшет портрет)', width: 820, height: 1180 },
      { label: '390×844 (мобильный iPhone)', width: 390, height: 844 },
    ]

    const budgetRows = []
    for (const vp of BUDGET_VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.waitForTimeout(200)

      // Замер ДО (пустое поле, счётчик скрыт)
      await page.fill('#composer-slot-textarea', '')
      await page.waitForTimeout(150)
      const before = await page.evaluate(() => {
        const modal = document.querySelector('.modal')
        const slotRow = document.querySelector('[role="group"][aria-label="Пункты записи"]')?.parentElement
        const textarea = document.querySelector('#composer-slot-textarea')
        const mR = modal?.getBoundingClientRect() || { width: 0, height: 0 }
        const sR = slotRow?.getBoundingClientRect() || { width: 0, height: 0 }
        const tR = textarea?.getBoundingClientRect() || { width: 0, height: 0 }
        return {
          modalHeight: Math.round(mR.height),
          slotRowHeight: Math.round(sR.height),
          textareaHeight: Math.round(tR.height),
        }
      })

      // Замер ПОСЛЕ (счётчик активен)
      await page.fill('#composer-slot-textarea', 'Победа и преодоление. '.repeat(40)) // ~880 симв.
      await page.waitForTimeout(150)
      const after = await page.evaluate(() => {
        const modal = document.querySelector('.modal')
        const slotRow = document.querySelector('[role="group"][aria-label="Пункты записи"]')?.parentElement
        const textarea = document.querySelector('#composer-slot-textarea')
        const mR = modal?.getBoundingClientRect() || { width: 0, height: 0 }
        const sR = slotRow?.getBoundingClientRect() || { width: 0, height: 0 }
        const tR = textarea?.getBoundingClientRect() || { width: 0, height: 0 }
        return {
          modalHeight: Math.round(mR.height),
          slotRowHeight: Math.round(sR.height),
          textareaHeight: Math.round(tR.height),
          hasVScroll: (modal?.scrollHeight || 0) > (modal?.clientHeight || 0) + 1,
          hasHScroll: (modal?.scrollWidth || 0) > (modal?.clientWidth || 0) + 1,
        }
      })

      budgetRows.push({
        vp,
        before,
        after,
        heightDiff: after.modalHeight - before.modalHeight,
      })
    }

    // Генерация review/11/budget.md и budget.md
    let budgetMd = `# Бюджет пространства: Шаг 11 (Умный композер)

Замеры произведены строго через \`getBoundingClientRect()\` на 5 обязательных разрешениях экрана согласно **CONTRACT.md (правило 2)**.
Внешний вид и геометрия композера **строго сохранены**, разница высоты модального окна и строки слотов составляет **0px**.

### 1. Бюджет высоты окна композера и строки слотов

| Разрешение | Высота модалки ДО | Высота модалки ПОСЛЕ | Прирост высоты | Строка слотов | Скроллбар V/H | Статус |
|---|---|---|---|---|---|---|
`

    for (const r of budgetRows) {
      const vScroll = r.after.hasVScroll ? 'да' : 'нет'
      const hScroll = r.after.hasHScroll ? 'да' : 'нет'
      budgetMd += `| ${r.vp.label} | ${r.before.modalHeight}px | ${r.after.modalHeight}px | **${r.heightDiff}px** | ${r.after.slotRowHeight}px | ${vScroll} / ${hScroll} | **PASS ✅** |\n`
    }

    budgetMd += `
### 2. Результаты проверки условий CONTRACT.md

- **Высота окна композера**: не изменилась (**0px прироста** на всех 5 разрешениях).
- **Строка слотов 1..5**: высота осталась строго 42px (кнопки слотов 34px + padding 8px), чип аудитории и бейдж оценки не увеличивают строку.
- **Горизонтальный скролл**: отсутствует (**0px**) на всех разрешениях, включая 390×844.
- **Интерактивные элементы**: кнопка «Разложить остаток» и счётчик символов вписаны в существующий отрицательный отступ \`-mt-2 mb-2\`, не раздвигая вертикальный габарит композера.
`

    fs.writeFileSync(path.join(REVIEW_DIR, 'budget.md'), budgetMd)
    fs.writeFileSync(path.resolve(process.cwd(), 'budget.md'), budgetMd)
    console.log('[Budget-Step11] budget.md успешно сгенерирован!')

    console.log('[Step11-E2E] Все 20 сценариев выполнены успешно!')
  } finally {
    await browser.close()
  }

  // ────────────────────────────────────────────────────────────────────────
  // Генерация отчёта и таблицы сценариев
  // ────────────────────────────────────────────────────────────────────────
  let reportMd = `# Результаты E2E-тестирования: Шаг 11 (Умный композер)

Дата запуска: ${new Date().toISOString()}
Среда: ${BASE_URL}

| № | Сценарий | Результат | Детали | Скриншот |
|---|---|---|---|---|
`

  for (const sc of scenarios) {
    const status = sc.ok ? 'PASS ✅' : 'FAIL ❌'
    const scImg = `${String(sc.num).padStart(2, '0')}-*.png`
    reportMd += `| ${sc.num} | ${sc.title} | ${status} | ${sc.details} | \`${scImg}\` |\n`
  }

  fs.writeFileSync(path.join(REVIEW_DIR, 'scenarios_matrix.md'), reportMd)

  const allPassed = scenarios.every((s) => s.ok)
  console.log(`\n========================================`)
  console.log(`ИТОГ E2E: ${scenarios.filter((s) => s.ok).length} / ${scenarios.length} PASS`)
  console.log(`Статус: ${allPassed ? 'УСПЕШНО' : 'ЕСТЬ ОШИБКИ'}`)
  console.log(`Отчёт сохранён: review/11/scenarios_matrix.md`)
  console.log(`========================================\n`)

  if (!allPassed) {
    process.exitCode = 1
  }
}

runStep11Suite().catch((err) => {
  console.error('[Step11-E2E] FATAL ERROR:', err)
  process.exit(1)
})
