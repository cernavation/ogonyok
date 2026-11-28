import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

describe('ЭТАП 2: Редизайн тостов, спокойная палитра чатов, умное меню и Google Translate', () => {
  it('1. Все нижние/системные тосты переведены на тёмное стекло с ховер-паузой, × и 2px полосой (никаких белых плашек)', () => {
    const toastSrc = read('components/ogonek/toast.tsx')
    const desktopToastSrc = read('components/ogonek/notifications/desktop-toast-stack.tsx')
    const globalsSrc = read('app/globals.css')
    const appShellSrc = read('components/ogonek/app-shell.tsx')
    const fsMessengerSrc = read('components/ogonek/messenger/fullscreen-messenger.tsx')
    const standaloneSrc = read('components/ogonek/messenger/standalone-chat-page.tsx')
    const composerSrc = read('components/ogonek/composer.tsx')

    assert.ok(toastSrc.includes('bg-[#0a0a0c]/95') && toastSrc.includes('backdrop-blur-xl'))
    assert.ok(toastSrc.includes('border-white/[0.14]') && toastSrc.includes('border-red-500/40'))
    assert.ok(toastSrc.includes('flex-col-reverse') && toastSrc.includes('bottom-6'))
    assert.ok(toastSrc.includes('whitespace-pre-wrap break-words') && !toastSrc.includes('line-clamp-'))
    assert.ok(toastSrc.includes('rounded-xl object-cover max-h-44 w-full'))
    assert.ok(toastSrc.includes('4500') && toastSrc.includes('6000'))
    assert.ok(toastSrc.includes('onMouseEnter') && toastSrc.includes('onMouseLeave'))
    assert.ok(toastSrc.includes('Закрыть уведомление'))
    assert.ok(toastSrc.includes('h-[2px]') && toastSrc.includes('bg-[#d76737]') && toastSrc.includes('bg-red-500'))

    assert.ok(desktopToastSrc.includes('rounded-xl object-cover max-h-44 w-full'))
    assert.ok(!desktopToastSrc.includes('line-clamp-2') && desktopToastSrc.includes('whitespace-pre-wrap break-words'))
    assert.ok(appShellSrc.includes('imageUrl: broadcast.media_url'))

    assert.ok(!globalsSrc.includes('background: #e7e9ea;'), '.toast в globals.css больше не белый')
    assert.ok(!composerSrc.includes('bg-[#e7e9ea] text-[#090a0b]'), 'composer-smart-toast больше не белый')
    assert.ok(composerSrc.includes('id="composer-smart-toast"') && composerSrc.includes('actionId="composer-smart-toast-undo"'))
    assert.ok(!appShellSrc.includes('2400'), 'app-shell не обрывает тост через 2.4с')
    assert.ok(!fsMessengerSrc.includes('2500'), 'fullscreen-messenger не обрывает тост через 2.5с')
    assert.ok(!standaloneSrc.includes('2500'), 'standalone-chat-page не обрывает тост через 2.5с')
  })

  it('2. Убраны кричащие оранжевые пятна: кнопка «Перейти к дню →», «Новый чат» и исходящие пузыри', () => {
    const cardSrc = read('components/ogonek/messenger/chat-attachment-card.tsx')
    const modalSrc = read('components/ogonek/messenger/chat-attachment-modal.tsx')
    const listSrc = read('components/ogonek/messenger/messenger-dialog-list.tsx')
    const bubbleSrc = read('components/ogonek/messenger/chat-message-bubble.tsx')

    assert.ok(cardSrc.includes('bg-[#d76737]') && cardSrc.includes('text-black'))
    assert.ok(!cardSrc.includes('bg-[#ff5a1f]'))
    assert.ok(modalSrc.includes('bg-[#d76737]') && modalSrc.includes('text-black'))
    assert.ok(!modalSrc.includes('bg-[#ff5a1f]'))

    assert.ok(listSrc.includes('bg-white/[0.08]') && listSrc.includes('border-white/[0.12]') && listSrc.includes('text-white/80'))
    assert.ok(!listSrc.includes('bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center'))

    assert.ok(bubbleSrc.includes('bg-[#241611]') && bubbleSrc.includes('border-[#d76737]/35'))
    assert.ok(bubbleSrc.includes('text-white/95') && bubbleSrc.includes('text-white/45'))
    assert.ok(!bubbleSrc.includes("rounded-[20px] rounded-br-[6px] bg-[var(--accent)]"))
    assert.ok(!bubbleSrc.includes("bg-[var(--accent)]/85"))
  })

  it('3. Умное позиционирование меню сообщений: портал + проверка <220px сверху для раскрытия вниз', () => {
    const bubbleSrc = read('components/ogonek/messenger/chat-message-bubble.tsx')
    const pickerSrc = read('components/ogonek/messenger/message-reaction-picker.tsx')
    const contextSrc = read('components/ogonek/messenger/chat-context-menu.tsx')

    assert.ok(bubbleSrc.includes('createPortal(') && bubbleSrc.includes('getBoundingClientRect()'))
    assert.ok(bubbleSrc.includes('rect.top < 220'), 'меню ⋯ должно раскрываться вниз, если сверху меньше 220px')
    assert.ok(pickerSrc.includes('createPortal(') && pickerSrc.includes('rect.top < 220'))
    assert.ok(contextSrc.includes('y >= 220') && contextSrc.includes('createPortal('))
  })

  it('4. Реальный /api/translate через Google Translate без заглушек + UI перевода в пузырях', () => {
    const apiSrc = read('app/api/translate/route.ts')
    const bubbleSrc = read('components/ogonek/messenger/chat-message-bubble.tsx')
    const paneSrc = read('components/ogonek/messenger/messenger-chat-pane.tsx')
    const winSrc = read('components/ogonek/messenger/chat-window.tsx')

    assert.ok(apiSrc.includes('https://translate.googleapis.com/translate_a/single'))
    assert.ok(apiSrc.includes('client=gtx') && apiSrc.includes('sl=') && apiSrc.includes('tl='))
    assert.ok(!apiSrc.includes('[Перевод]'), 'фейковые заглушки [Перевод] удалены')
    assert.ok(!apiSrc.includes('GEMINI_API_KEY'), 'зависимость от LLM удалена из /api/translate')
    assert.ok(apiSrc.includes('detectedSourceLang') && apiSrc.includes('translatedText') && apiSrc.includes('targetLang'))

    assert.ok(bubbleSrc.includes('Перевод...'))
    assert.ok(bubbleSrc.includes('Перевод') && bubbleSrc.includes('Оригинал'))
    assert.ok(bubbleSrc.includes('border-t border-white/[0.08]') && bubbleSrc.includes('text-[11px] text-white/45'))
    assert.ok(bubbleSrc.includes('min-w-[200px]') && bubbleSrc.includes('text-white/55') && bubbleSrc.includes('В важное'))
    assert.ok(!bubbleSrc.includes('Переведено через ИИ'))
    assert.ok(paneSrc.includes('translateChatMessage(friendId, id, lang || \'ru\', text)'))
    assert.ok(winSrc.includes('translateChatMessage(friendId, id, lang || \'ru\', text)'))
  })
})
