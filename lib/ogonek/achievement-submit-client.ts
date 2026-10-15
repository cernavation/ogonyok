'use client'

import { getPhotoBlob } from './photos'
import type { ModerationEmailAttachment, ModerationEmailPackage } from './achievement-moderation'
import type { AchievementEvidenceFile } from './types'

/**
 * ЭТАП 6 — клиентская сборка вложений письма-заявки.
 *
 * Файлы-доказательства хранятся в IndexedDB (id), как `blob:`-URL, `data:`-URL
 * или внешняя ссылка. Для отправки модератору:
 *  - внешние ссылки остаются ссылками в теле письма;
 *  - `data:`-URL встраиваются как есть;
 *  - IndexedDB-id и `blob:`-URL читаются в Blob и превращаются в base64 data URL.
 *
 * Есть защитные лимиты, чтобы письмо не превысило лимиты почтовых API.
 */

const MAX_ATTACHMENT_BYTES = 2_500_000 // 2.5 МБ на файл
const MAX_TOTAL_BYTES = 12_000_000 // 12 МБ суммарно
const MAX_ATTACHMENTS = 6

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    } catch {
      resolve(null)
    }
  })
}

async function readBlobForRef(ref: string): Promise<Blob | null> {
  if (ref.startsWith('blob:')) {
    try {
      const res = await fetch(ref)
      return await res.blob()
    } catch {
      return null
    }
  }
  return getPhotoBlob(ref)
}

export async function collectSubmissionAttachments(
  evidence: AchievementEvidenceFile[]
): Promise<ModerationEmailAttachment[]> {
  const result: ModerationEmailAttachment[] = []
  let totalBytes = 0

  for (const file of evidence) {
    if (result.length >= MAX_ATTACHMENTS) break
    const ref = file.ref ?? ''
    if (!ref || /^https?:\/\//i.test(ref)) continue // ссылки уходят в теле письма

    if (ref.startsWith('data:')) {
      if (file.size > MAX_ATTACHMENT_BYTES || totalBytes + file.size > MAX_TOTAL_BYTES) continue
      result.push({ fileName: file.fileName, mime: file.mime, size: file.size, dataUrl: ref })
      totalBytes += file.size
      continue
    }

    const blob = await readBlobForRef(ref)
    if (!blob) continue
    if (blob.size > MAX_ATTACHMENT_BYTES || totalBytes + blob.size > MAX_TOTAL_BYTES) continue

    const dataUrl = await blobToDataUrl(blob)
    if (!dataUrl) continue

    result.push({
      fileName: file.fileName,
      mime: file.mime || blob.type || 'application/octet-stream',
      size: blob.size,
      dataUrl,
    })
    totalBytes += blob.size
  }

  return result
}

function base64Utf8(value: string): string {
  try {
    return btoa(
      encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, hex: string) =>
        String.fromCharCode(parseInt(hex, 16))
      )
    )
  } catch {
    return ''
  }
}

function encodeHeader(value: string): string {
  const safe = value.replace(/[\r\n]+/g, ' ').trim()
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(safe)) return safe
  return `=?UTF-8?B?${base64Utf8(safe)}?=`
}

/** Собирает RFC-совместимый `.eml` из готового пакета письма */
export function buildEmlFile(emailPackage: ModerationEmailPackage): string {
  const boundary = `ogonek-${Date.now().toString(36)}`
  const headers = [
    `To: ${emailPackage.to}`,
    `From: ${emailPackage.from}`,
    `Reply-To: ${emailPackage.replyTo}`,
    `Subject: ${encodeHeader(emailPackage.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
  ].join('\r\n')

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    emailPackage.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    emailPackage.html,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n')

  return headers + body
}

export const SUBMISSION_ATTACHMENT_LIMITS = {
  maxFileBytes: MAX_ATTACHMENT_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
  maxFiles: MAX_ATTACHMENTS,
}
