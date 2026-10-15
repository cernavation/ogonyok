'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  BUILTIN_EMOJIS,
  EMOJI_PALETTE,
} from '@/lib/ogonek/reactions'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ModalShell } from './modal-shell'

type Props = {
  /** Цель, для которой открыт подбор реакций: "day:12" или "day:12:pride:0" */
  target: string
  onClose: () => void
  onNotify?: (msg: string) => void
  soundEnabled?: boolean
}

function isLikelyEmoji(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 8) return false
  try {
    // Любой пиктографический символ (смайлик). Запасной вариант — не буква/цифра.
    return /\p{Extended_Pictographic}/u.test(trimmed) || /[^\p{L}\p{N}\s]/u.test(trimmed)
  } catch {
    return true
  }
}

/**
 * КОНСТРУКТОР СМАЙЛИКОВ И РЕАКЦИЙ
 * 1) Быстрая палитра: один клик — реакция поставлена (или снята).
 * 2) Собственный смайлик: выбираешь символ, даёшь название — он сохраняется в store
 *    и сразу доступен во всех днях и записях.
 */
export function EmojiReactionPicker({ target, onClose, onNotify, soundEnabled = true }: Props) {
  const {
    state,
    toggleReaction,
    getReactionsFor,
    getMyReactionsFor,
    addCustomEmoji,
    removeCustomEmoji,
  } = useOgonekStore()

  const [charInput, setCharInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const reduce = useReducedMotion()

  // Реакции рендерим из локального стейта, чтобы модалка обновлялась мгновенно
  const counts = useMemo(
    () => getReactionsFor(target),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, state.dayReactions, getReactionsFor]
  )
  const mine = useMemo(
    () => getMyReactionsFor(target),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, state.myReactions, getMyReactionsFor]
  )

  const customEmojis = state.customEmojis

  const handlePick = (emojiId: string, char: string, label: string) => {
    const becameActive = toggleReaction(target, emojiId)
    if (becameActive) {
      playClick(soundEnabled)
      onNotify?.(`Реакция ${char} добавлена`)
    } else {
      playClick(soundEnabled)
      onNotify?.(`Реакция ${char} (${label}) снята`)
    }
  }

  const handleAddCustom = () => {
    const char = charInput.trim()
    if (!char) {
      onNotify?.('Введите смайлик или выберите из палитры')
      return
    }
    if (!isLikelyEmoji(char)) {
      onNotify?.('Похоже, это не смайлик. Выберите эмодзи из палитры.')
      return
    }
    const id = addCustomEmoji(char, labelInput)
    if (!id) {
      onNotify?.('Не удалось добавить смайлик')
      return
    }
    playSuccess(soundEnabled)
    onNotify?.(`Смайлик ${char} сохранён в коллекцию!`)
    // Сразу ставим реакцию новым смайликом
    if (!mine.includes(id)) {
      toggleReaction(target, id)
    }
    setCharInput('')
    setLabelInput('')
  }

  const handleDeleteCustom = (id: string, char: string) => {
    playClick(soundEnabled)
    removeCustomEmoji(id)
    onNotify?.(`Смайлик ${char} удалён из коллекции`)
  }

  return (
    <ModalShell title="Реакции и свои смайлики" onClose={onClose}>
      <p className="modal-intro" style={{ marginTop: 8 }}>
        Ставьте живые реакции одним кликом. Создайте собственный смайлик — и он появится под каждым днём
        и записью.
      </p>

      {/* ── Быстрая палитра встроенных реакций ─────────────────────────── */}
      <section style={{ marginTop: 18 }}>
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#71767b] mb-2">
          Быстрые реакции
        </h3>
        <div className="flex flex-wrap gap-2">
          {BUILTIN_EMOJIS.map((emoji) => {
            const active = mine.includes(emoji.id)
            const count = counts[emoji.id] ?? 0
            return (
              <motion.button
                key={emoji.id}
                type="button"
                whileTap={reduce ? undefined : { scale: 0.85 }}
                aria-pressed={active}
                title={emoji.label}
                onClick={() => handlePick(emoji.id, emoji.char, emoji.label)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[18px] leading-none transition-colors duration-150 ${
                  active
                    ? 'border-[#ff6b35] bg-[#ff6b35]/15 text-[#ffad5a]'
                    : 'border-[#2f3336] bg-[#16181c] text-[#e7e9ea] hover:border-[#4a4f54] hover:bg-[#1c1e22]'
                }`}
              >
                <span aria-hidden="true">{emoji.char}</span>
                <span className="text-[12px] font-bold tabular-nums text-[#71767b]">{count}</span>
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* ── Конструктор собственного смайлика ─────────────────────────── */}
      <section style={{ marginTop: 22 }}>
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-[#71767b] mb-2">
          <Wand2 size={13} /> Конструктор смайлика
        </h3>

        <div className="rounded-2xl border border-[#2f3336] bg-[#0f1011] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="grid place-items-center rounded-2xl border border-[#2f3336] bg-[#16181c]"
              style={{ width: 60, height: 60, fontSize: 30 }}
              aria-hidden="true"
            >
              {charInput.trim() || '❔'}
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#71767b] mb-1">
                Символ смайлика
              </label>
              <input
                type="text"
                value={charInput}
                maxLength={8}
                onChange={(e) => setCharInput(e.target.value)}
                placeholder="Вставьте эмодзи, например 🦾"
                className="w-full rounded-lg border border-[#2f3336] bg-[#0b0c0d] px-3 py-2 text-[15px] text-[#e7e9ea] outline-none focus:border-[#ff6b35] transition-colors"
              />
            </div>
          </div>

          {/* Палитра-подсказка */}
          <div className="mb-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#71767b] mb-1.5">
              Или выберите из палитры
            </span>
            <div className="flex flex-wrap gap-1">
              {EMOJI_PALETTE.map((char) => (
                <button
                  key={char}
                  type="button"
                  aria-label={`Выбрать ${char}`}
                  onClick={() => {
                    playClick(soundEnabled)
                    setCharInput(char)
                  }}
                  className={`grid place-items-center rounded-lg text-[20px] leading-none transition-colors duration-100 ${
                    charInput.trim() === char
                      ? 'bg-[#ff6b35]/20 ring-1 ring-[#ff6b35]'
                      : 'hover:bg-white/[0.08]'
                  }`}
                  style={{ width: 34, height: 34 }}
                >
                  <span aria-hidden="true">{char}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#71767b] mb-1">
            Название (для подсказок)
          </label>
          <input
            type="text"
            value={labelInput}
            maxLength={40}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Например: Железная воля"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustom()
              }
            }}
            className="w-full rounded-lg border border-[#2f3336] bg-[#0b0c0d] px-3 py-2 text-[14px] text-[#e7e9ea] outline-none focus:border-[#ff6b35] transition-colors mb-3"
          />

          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!charInput.trim()}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition-colors duration-150 ${
              charInput.trim()
                ? 'bg-[#ff6b35] text-white hover:bg-[#ff7f4f]'
                : 'bg-[#1c1e22] text-[#71767b] cursor-not-allowed'
            }`}
          >
            <Plus size={15} /> Добавить в коллекцию
          </button>
        </div>
      </section>

      {/* ── Коллекция пользовательских смайликов ──────────────────────── */}
      <section style={{ marginTop: 22 }}>
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-[#71767b] mb-2">
          <Sparkles size={13} /> Моя коллекция ({customEmojis.length})
        </h3>

        {customEmojis.length === 0 ? (
          <p className="text-[13px] text-[#71767b]">
            Пока пусто. Создайте первый собственный смайлик выше.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customEmojis.map((emoji) => {
              const active = mine.includes(emoji.id)
              const count = counts[emoji.id] ?? 0
              return (
                <div
                  key={emoji.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border pl-3 pr-1.5 py-1.5 transition-colors duration-150 ${
                    active
                      ? 'border-[#ff6b35] bg-[#ff6b35]/15'
                      : 'border-[#2f3336] bg-[#16181c]'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    title={emoji.label}
                    onClick={() => handlePick(emoji.id, emoji.char, emoji.label)}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span className="text-[18px] leading-none" aria-hidden="true">
                      {emoji.char}
                    </span>
                    <span className="text-[12px] font-semibold text-[#e7e9ea] max-w-[120px] truncate">
                      {emoji.label}
                    </span>
                    {count > 0 && (
                      <span className="text-[11px] font-bold tabular-nums text-[#71767b]">
                        {count}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Удалить смайлик ${emoji.label}`}
                    onClick={() => handleDeleteCustom(emoji.id, emoji.char)}
                    className="p-1 rounded-full text-[#71767b] hover:text-[#ff5058] hover:bg-[#ff5058]/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <footer>
        <span className="char-count">Реакции сохраняются автоматически</span>
      </footer>
    </ModalShell>
  )
}
