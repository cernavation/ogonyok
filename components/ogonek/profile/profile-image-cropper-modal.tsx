'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Check,
  Image as ImageIcon,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase/client'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  MAX_FILE_SIZE_BYTES,
  uploadProfileMedia,
  validateMediaFileType,
} from '@/lib/ogonek/profile-media-service'

export const OGONEK_GRADIENTS = [
  {
    id: 'fire',
    label: 'Огненный рассвет',
    background: 'linear-gradient(135deg, #FF6A1A 0%, #D82600 50%, #16181C 100%)',
  },
  {
    id: 'coal',
    label: 'Ночной уголь',
    background: 'linear-gradient(135deg, #242528 0%, #16181C 50%, #0B0E14 100%)',
  },
  {
    id: 'ocean',
    label: 'Глубокий океан',
    background: 'linear-gradient(135deg, #0A4D8C 0%, #032147 60%, #050d17 100%)',
  },
  {
    id: 'streak',
    label: 'Пурпурный стрик',
    background: 'linear-gradient(135deg, #7856FF 0%, #3B0764 60%, #120A24 100%)',
  },
  {
    id: 'cyber',
    label: 'Кибер-зелень',
    background: 'linear-gradient(135deg, #00BA7C 0%, #064E3B 60%, #022016 100%)',
  },
  {
    id: 'gold',
    label: 'Золотой триумф',
    background: 'linear-gradient(135deg, #F59E0B 0%, #B45309 50%, #1E1202 100%)',
  },
]

type Props = {
  mode: 'cover' | 'avatar'
  initialFile?: File | null
  currentPreset?: string
  userId?: string
  onClose: () => void
  onApplyImage: (imageUrl: string) => void
  onRemovePhoto?: () => void
  onSelectPreset?: (presetId: string, background: string) => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function ProfileImageCropperModal({
  mode,
  initialFile,
  currentPreset,
  userId,
  onClose,
  onApplyImage,
  onRemovePhoto,
  onSelectPreset,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isUploading, setIsUploading] = useState(false)
  const [showGradients, setShowGradients] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageObjRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isCover = mode === 'cover'
  const aspectRatio = isCover ? 3 / 1 : 1 / 1
  const targetLongEdge = isCover ? 1500 : 400
  const targetShortEdge = Math.round(targetLongEdge / aspectRatio)

  // Load and read image from File
  const handleLoadFile = useCallback((file: File) => {
    const check = validateMediaFileType(file)
    if (!check.valid) {
      onNotify(check.error || 'Формат не поддерживается. Используйте JPG, PNG, WebP или HEIC.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      setImageSrc(src)
      setSelectedFile(file)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
    reader.onerror = () => {
      onNotify('Ошибка при чтении файла изображения.')
    }
    reader.readAsDataURL(file)
  }, [onNotify])

  useEffect(() => {
    if (initialFile) {
      handleLoadFile(initialFile)
    }
  }, [initialFile, handleLoadFile])

  // Create image object once source is ready
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrc
    img.onload = () => {
      imageObjRef.current = img
      drawPreview()
    }
  }, [imageSrc])

  // Draw preview on canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageObjRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

    // Calculate base scale to fill canvas
    const imgAspect = img.width / img.height
    const canvasAspect = cw / ch

    let renderW = cw
    let renderH = ch

    if (imgAspect > canvasAspect) {
      renderH = ch
      renderW = ch * imgAspect
    } else {
      renderW = cw
      renderH = cw / imgAspect
    }

    // Apply zoom
    renderW *= zoom
    renderH *= zoom

    // Center + Pan
    const cx = (cw - renderW) / 2 + pan.x
    const cy = (ch - renderH) / 2 + pan.y

    ctx.drawImage(img, cx, cy, renderW, renderH)

    // Grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cw / 3, 0)
    ctx.lineTo(cw / 3, ch)
    ctx.moveTo((cw * 2) / 3, 0)
    ctx.lineTo((cw * 2) / 3, ch)
    ctx.moveTo(0, ch / 3)
    ctx.lineTo(cw, ch / 3)
    ctx.moveTo(0, (ch * 2) / 3)
    ctx.lineTo(cw, (ch * 2) / 3)
    ctx.stroke()
  }, [zoom, pan])

  useEffect(() => {
    drawPreview()
  }, [drawPreview])

  // Mouse / Touch Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))))
  }

  // Compress and Apply
  const handleSaveAndApply = async () => {
    const img = imageObjRef.current
    if (!img) return

    setIsUploading(true)
    playClick(soundEnabled)

    try {
      // 1. Render to high-res target canvas
      const targetCanvas = document.createElement('canvas')
      targetCanvas.width = targetLongEdge
      targetCanvas.height = targetShortEdge
      const ctx = targetCanvas.getContext('2d')

      if (!ctx) throw new Error('Canvas context failed')

      const imgAspect = img.width / img.height
      const targetAspect = targetLongEdge / targetShortEdge

      let renderW = targetLongEdge
      let renderH = targetShortEdge

      if (imgAspect > targetAspect) {
        renderH = targetShortEdge
        renderW = targetShortEdge * imgAspect
      } else {
        renderW = targetLongEdge
        renderH = targetLongEdge / imgAspect
      }

      renderW *= zoom
      renderH *= zoom

      const scaleRatio = targetLongEdge / (canvasRef.current?.width || 600)
      const cx = (targetLongEdge - renderW) / 2 + pan.x * scaleRatio
      const cy = (targetShortEdge - renderH) / 2 + pan.y * scaleRatio

      ctx.drawImage(img, cx, cy, renderW, renderH)

      // 2. Сжатие в WebP (<= 2 МБ) и загрузка в бакет ogonyok-media (avatars/${userId}-${Date.now()}.jpg)
      const res = await uploadProfileMedia({
        kind: isCover ? 'banner' : 'avatar',
        fileOrCanvas: targetCanvas,
        userId,
      })

      if (!res.ok || !res.url) {
        throw new Error(res.error || 'Не удалось сохранить изображение')
      }

      // 3. Мгновенное обновление UI с cache-busting (?v=timestamp)
      onApplyImage(res.url)
      playSuccess(soundEnabled)
      if (res.fallbackApplied) {
        onNotify(isCover ? 'Обложка обновлена локально ✨' : 'Аватар обновлён локально ✨')
      } else {
        onNotify(isCover ? 'Обложка сохранена в облаке ✨' : 'Аватар сохранён в облаке ✨')
      }
      onClose()
    } catch (err: any) {
      onNotify(err?.message || 'Ошибка при обработке изображения. Попробуйте другой файл.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none overflow-x-hidden w-full max-w-full"
      onClick={onClose}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file) handleLoadFile(file)
      }}
    >
      <div
        className="w-full max-w-xl bg-[var(--bg-elev)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-bold text-base text-[var(--text)]">
              {isCover ? 'Настройка обложки профиля' : 'Настройка аватара'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {imageSrc ? (
            <>
              {/* Crop Area */}
              <div
                className="relative w-full bg-black/40 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{
                  aspectRatio: isCover ? '3 / 1' : '1 / 1',
                  maxHeight: isCover ? '220px' : '300px',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <canvas
                  ref={canvasRef}
                  width={isCover ? 600 : 360}
                  height={isCover ? 200 : 360}
                  className="w-full h-full object-contain pointer-events-none"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/60 text-[11px] text-white/80 backdrop-blur-sm pointer-events-none">
                  Перетащите для сдвига · Колёсико для масштаба
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-3 px-2">
                <ZoomIn className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[var(--accent)] h-1.5 bg-[var(--border)] rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                  }}
                  title="Сбросить масштаб и положение"
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            /* Empty State / File Picker */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 border-2 border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shadow-inner">
                <Upload className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-[var(--text)]">
                  Нажмите для выбора файла
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  JPG, PNG, WebP или HEIC (до 5 МБ)
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLoadFile(file)
            }}
          />

          {/* Preset Gradients Drawer / Toggle */}
          {isCover && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowGradients((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  <Palette className="w-4 h-4" />
                  {showGradients ? 'Скрыть готовые градиенты' : 'Выбрать готовый градиент Огонька'}
                </button>

                {onRemovePhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      onRemovePhoto()
                      onNotify('Фото обложки удалено, возвращён градиент')
                      onClose()
                    }}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Удалить фото
                  </button>
                )}
              </div>

              {showGradients && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {OGONEK_GRADIENTS.map((g) => {
                    const isCurrent = currentPreset === g.id
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          playClick(soundEnabled)
                          onSelectPreset?.(g.id, g.background)
                          onNotify(`Выбран градиент «${g.label}»`)
                          onClose()
                        }}
                        className={`h-12 rounded-lg relative overflow-hidden border transition-all ${
                          isCurrent
                            ? 'border-white scale-105 shadow-md'
                            : 'border-white/10 hover:border-white/40'
                        }`}
                        style={{ background: g.background }}
                        title={g.label}
                      >
                        {isCurrent && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white/90 drop-shadow">
                          {g.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)] bg-[var(--bg)]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text)] transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            {imageSrc ? 'Другой файл' : 'Выбрать файл'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={!imageSrc || isUploading}
              onClick={handleSaveAndApply}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shadow-md"
            >
              {isUploading ? 'Сохранение...' : 'Применить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
