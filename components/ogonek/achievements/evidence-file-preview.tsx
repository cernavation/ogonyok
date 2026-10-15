'use client'

import {
  ExternalLink,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  File as FileIcon,
  Link2,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import type { AchievementEvidenceFile } from '@/lib/ogonek/types'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'

type Props = {
  file: AchievementEvidenceFile
  onRemove?: (id: string) => void
  /** Убрать внешние отступы — для компактных списков */
  compact?: boolean
}

function isStoredRef(ref: string): boolean {
  return !ref.startsWith('http://') && !ref.startsWith('https://')
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

function iconFor(file: AchievementEvidenceFile): LucideIcon {
  const mime = file.mime
  if (mime.startsWith('image/')) return FileImage
  if (mime.startsWith('video/')) return FileVideo
  if (mime === 'application/pdf') return FileText
  if (
    mime.includes('csv') ||
    mime.includes('json') ||
    mime.includes('spreadsheet') ||
    mime.includes('xml')
  ) {
    return FileSpreadsheet
  }
  if (mime.includes('zip') || mime.includes('archive')) return FileArchive
  if (file.ref.startsWith('http')) return Link2
  return FileIcon
}

function formatSize(size: number): string {
  if (!size) return 'внешняя ссылка'
  if (size < 1024) return `${size} Б`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}

/**
 * Превью одного прикреплённого доказательства.
 * Хранимые фото (IndexedDB) показываются картинкой, внешние ссылки — чипом.
 */
export function EvidenceFilePreview({ file, onRemove, compact = false }: Props) {
  const stored = isStoredRef(file.ref)
  const canPreview = stored || file.ref.startsWith('data:') || file.ref.startsWith('blob:')
  const resolved = usePhotoUrl(canPreview ? file.ref : null)
  const showImage = canPreview && isImageMime(file.mime) && Boolean(resolved)
  const Icon = iconFor(file)

  return (
    <div className={`ach-ev-file ${compact ? 'is-compact' : ''}`}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ach-ev-file-thumb" src={resolved ?? ''} alt={file.fileName} />
      ) : (
        <span className="ach-ev-file-icon" aria-hidden="true">
          <Icon size={compact ? 14 : 16} />
        </span>
      )}

      <span className="ach-ev-file-meta">
        <span className="ach-ev-file-name" title={file.fileName}>
          {file.fileName}
        </span>
        <span className="ach-ev-file-size">{formatSize(file.size)}</span>
      </span>

      {file.ref.startsWith('http') && (
        <a
          className="ach-ev-file-open"
          href={file.ref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Открыть ${file.fileName}`}
        >
          <ExternalLink size={14} />
        </a>
      )}

      {onRemove && (
        <button
          type="button"
          className="ach-ev-file-remove"
          onClick={() => onRemove(file.id)}
          aria-label={`Удалить ${file.fileName}`}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
