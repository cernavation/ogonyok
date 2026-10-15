'use client'

import { CheckCircle2, Circle, Paperclip, Upload } from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { savePhoto } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type {
  AchievementEvidenceFile,
  AchievementEvidenceRequirement,
} from '@/lib/ogonek/types'
import { EvidenceFilePreview } from './evidence-file-preview'

type Props = {
  requirements: AchievementEvidenceRequirement[]
  evidence: AchievementEvidenceFile[]
  onAttach: (file: Omit<AchievementEvidenceFile, 'id' | 'addedAtISO'>) => void
  onRemove: (evidenceId: string) => void
  onNotify?: (message: string) => void
  soundEnabled?: boolean
  readOnly?: boolean
}

const MAX_FILE_BYTES = 25 * 1024 * 1024

/**
 * Пошаговый сбор файлов-доказательств по регламенту.
 * Каждый обязательный пункт подсвечивается, пока не закрыт.
 */
export function AchievementEvidenceUploader({
  requirements,
  evidence,
  onAttach,
  onRemove,
  onNotify,
  soundEnabled = true,
  readOnly = false,
}: Props) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const byRequirement = useMemo(() => {
    const map: Record<string, AchievementEvidenceFile[]> = {}
    for (const file of evidence) {
      const key = file.requirementId || 'unassigned'
      if (!map[key]) map[key] = []
      map[key].push(file)
    }
    return map
  }, [evidence])

  const required = requirements.filter((r) => r.required)
  const requiredCovered = required.filter((r) => (byRequirement[r.id] ?? []).length > 0).length
  const ratio = required.length === 0 ? (evidence.length > 0 ? 1 : 0) : requiredCovered / required.length

  const handleFiles = async (requirementId: string, e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    playClick(soundEnabled)
    setBusyId(requirementId)
    try {
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) {
          onNotify?.(`Файл «${file.name}» больше 25 МБ — верификатор может отклонить`)
        }
        const ref = await savePhoto(file)
        onAttach({
          requirementId,
          fileName: file.name,
          ref,
          mime: file.type || 'application/octet-stream',
          size: file.size,
        })
      }
      playSuccess(soundEnabled)
      onNotify?.(`Прикреплено файлов: ${files.length} ✓`)
    } catch {
      onNotify?.('Не удалось сохранить файл-доказательство')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="ach-ev">
      <div className="ach-ev-progress">
        <div className="ach-ev-progress-head">
          <span>
            Доказательства: <b>{requiredCovered}</b> / {required.length} обязательных
          </span>
          <span className="ach-ev-progress-note">
            {ratio >= 1 ? 'Комплект полон ✓' : 'Не хватает файлов для верификации'}
          </span>
        </div>
        <div className="ach-ev-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
          <i style={{ width: `${Math.round(ratio * 100)}%`, background: ratio >= 1 ? '#22c55e' : '#ff6b35' }} />
        </div>
      </div>

      <ul className="ach-ev-list">
        {requirements.map((req) => {
          const files = byRequirement[req.id] ?? []
          const covered = files.length > 0
          return (
            <li key={req.id} className={`ach-ev-req ${req.required ? 'is-required' : ''} ${covered ? 'is-covered' : ''}`}>
              <div className="ach-ev-req-head">
                <span className="ach-ev-req-mark" aria-hidden="true">
                  {covered ? (
                    <CheckCircle2 size={17} className="text-[#22c55e]" />
                  ) : (
                    <Circle size={17} className={req.required ? 'text-[#ff8a50]' : 'text-[#71767b]'} />
                  )}
                </span>
                <span className="ach-ev-req-titlebox">
                  <span className="ach-ev-req-title">
                    {req.title}
                    <span className={`ach-ev-req-badge ${req.required ? 'is-required' : ''}`}>
                      {req.required ? 'обязательно' : 'по желанию'}
                    </span>
                  </span>
                  {req.purpose && <span className="ach-ev-req-purpose">{req.purpose}</span>}
                </span>
              </div>

              <div className="ach-ev-req-formats">
                {req.formats.map((fmt) => (
                  <span key={fmt} className="ach-ev-format">
                    {fmt}
                  </span>
                ))}
              </div>

              {req.example && (
                <p className="ach-ev-req-example">
                  <b>Пример:</b> {req.example}
                </p>
              )}

              {files.length > 0 && (
                <div className="ach-ev-files">
                  {files.map((file) => (
                    <EvidenceFilePreview
                      key={file.id}
                      file={file}
                      onRemove={readOnly ? undefined : onRemove}
                      compact
                    />
                  ))}
                </div>
              )}

              {!readOnly && (
                <div className="ach-ev-req-actions">
                  <button
                    type="button"
                    className="ach-ev-attach"
                    onClick={() => {
                      playClick(soundEnabled)
                      inputRefs.current[req.id]?.click()
                    }}
                    disabled={busyId === req.id}
                  >
                    <Paperclip size={14} />
                    {busyId === req.id ? 'Сохраняю…' : covered ? 'Добавить ещё' : 'Прикрепить файл'}
                  </button>
                  <input
                    ref={(el) => {
                      inputRefs.current[req.id] = el
                    }}
                    type="file"
                    multiple
                    className="sr-only"
                    accept={req.formats.some((f) => /pdf/i.test(f)) ? 'application/pdf,image/*,video/*,.gpx,.tcx,.csv,.json' : '*/*'}
                    onChange={(e) => handleFiles(req.id, e)}
                    aria-label={`Прикрепить файл: ${req.title}`}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {!readOnly && (
        <p className="ach-ev-hint">
          <Upload size={12} /> Файлы хранятся локально в этом браузере и отправляются верификатору
          только вместе с заявкой.
        </p>
      )}
    </div>
  )
}
