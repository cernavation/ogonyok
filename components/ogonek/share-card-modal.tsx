'use client'

import { Check, Copy, Download, FileCode, Link, MessageCircle, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import {
  downloadBlob,
  exportDayCardAsPng,
  formatDayAsText,
  generateDayCardSvg,
} from '@/lib/ogonek/card-export'
import { buildDayAttachment } from '@/lib/ogonek/messenger'
import type { Day } from '@/lib/ogonek/types'
import { ForwardToChatModal } from './messenger'

interface ShareCardModalProps {
  day: Day
  onClose: () => void
  onNotify: (msg: string) => void
}

export function ShareCardModal({ day, onClose, onNotify }: ShareCardModalProps) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isExportingPng, setIsExportingPng] = useState(false)
  const [forwardOpen, setForwardOpen] = useState(false)

  const handleCopyText = async () => {
    try {
      const text = formatDayAsText(day)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        onNotify('Текст дня скопирован в буфер обмена!')
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      onNotify('Не удалось скопировать текст')
    }
  }

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined'
        ? `${window.location.origin}#day-${day.id}`
        : `https://ogonek.cernavation.com/#day-${day.id}`
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setLinkCopied(true)
        onNotify(`Ссылка на День #${day.id} скопирована!`)
        setTimeout(() => setLinkCopied(false), 2000)
      }
    } catch {
      onNotify('Не удалось скопировать ссылку')
    }
  }

  const handleDownloadPng = async () => {
    try {
      setIsExportingPng(true)
      const pngBlob = await exportDayCardAsPng(day)
      downloadBlob(pngBlob, `ogonek-day-${day.id}.png`)
      onNotify('PNG-карточка успешно сохранена!')
    } catch (err) {
      console.error(err)
      onNotify('Ошибка при экспорте PNG')
    } finally {
      setIsExportingPng(false)
    }
  }

  const handleDownloadSvg = () => {
    try {
      const svgString = generateDayCardSvg(day)
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      downloadBlob(svgBlob, `ogonek-day-${day.id}.svg`)
      onNotify('Векторный SVG сохранён!')
    } catch (err) {
      console.error(err)
      onNotify('Ошибка при экспорте SVG')
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="modal"
        style={{ maxWidth: 440 }}
      >
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-orange-500" />
            <strong id="share-modal-title">Поделиться днём #{day.id}</strong>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть окно экспорта"
          >
            <X size={20} />
          </button>
        </div>

        <p className="modal-intro">
          Экспортируй карточку дня в векторном качестве или скопируй форматированный текст для Telegram / X.
        </p>

        <div className="flex flex-col gap-3 my-4">
          {/* Copy formatted text */}
          <button
            type="button"
            className="primary-btn w-full justify-center flex items-center gap-2"
            onClick={handleCopyText}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'Скопировано!' : 'Скопировать текст дня'}</span>
          </button>

          {/* Download PNG */}
          <button
            type="button"
            className="secondary-btn w-full justify-center flex items-center gap-2"
            onClick={handleDownloadPng}
            disabled={isExportingPng}
          >
            <Download size={18} />
            <span>{isExportingPng ? 'Рендеринг PNG...' : 'Скачать карточку (PNG)'}</span>
          </button>

          {/* Download SVG */}
          <button
            type="button"
            className="secondary-btn w-full justify-center flex items-center gap-2"
            onClick={handleDownloadSvg}
          >
            <FileCode size={18} />
            <span>Скачать векторный SVG</span>
          </button>

          {/* Copy link */}
          <button
            type="button"
            className="secondary-btn w-full justify-center flex items-center gap-2"
            onClick={handleCopyLink}
          >
            {linkCopied ? <Check size={18} /> : <Link size={18} />}
            <span>{linkCopied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}</span>
          </button>

          {/* Переслать карточку дня другу в чат */}
          <button
            type="button"
            className="primary-btn w-full justify-center flex items-center gap-2"
            onClick={() => {
              onNotify('Выбери, кому переслать карточку дня 💬')
              setForwardOpen(true)
            }}
          >
            <MessageCircle size={18} />
            <span>Переслать другу в чат</span>
          </button>
        </div>

        <div className="text-xs text-center text-muted mt-2">
          Векторная графика высокого разрешения (Dark X Theme) · @cernavation
        </div>
      </div>

      {forwardOpen && (
        <ForwardToChatModal
          attachment={buildDayAttachment(day)}
          initialNote={`День #${day.id} — делюсь гордостью 🔥`}
          onClose={() => setForwardOpen(false)}
          onNotify={onNotify}
        />
      )}
    </div>
  )
}
