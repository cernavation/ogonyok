'use client'

import {
  BarChart3,
  ClipboardPaste,
  Clock,
  Copy,
  Database,
  Download,
  FileJson,
  HardDrive,
  KeyRound,
  Layers,
  Link2,
  Loader2,
  RefreshCw,
  Share2,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildPortableBackup,
  buildSyncCode,
  computeBackupStats,
  computeDataFingerprint,
  formatBytes,
  isSyncCode,
  measureStorageUsage,
  parseAnyBackup,
  parseSyncCode,
  type BackupStats,
  type StorageUsage,
} from '@/lib/ogonek/backup'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'

type Props = {
  onNotify: (message: string) => void
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 5) return 'только что'
  if (seconds < 60) return `${seconds} с назад`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} мин назад`
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function BackupSyncPanel({ onNotify }: Props) {
  const { state, importState, syncNow } = useOgonekStore()
  const sound = state.soundEnabled

  const fileRef = useRef<HTMLInputElement>(null)
  const [usage, setUsage] = useState<StorageUsage>(() => measureStorageUsage())
  const [syncCode, setSyncCode] = useState('')
  const [pasteValue, setPasteValue] = useState('')
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | 'sync' | 'code' | 'import'>(null)

  const stats: BackupStats = useMemo(() => computeBackupStats(state), [state])
  const fingerprint = useMemo(() => computeDataFingerprint(state), [state])

  const refreshUsage = useCallback(() => {
    setUsage(measureStorageUsage())
  }, [])

  useEffect(() => {
    refreshUsage()
  }, [state.days.length, refreshUsage])

  const applyImport = useCallback(
    (raw: string, sourceLabel: string) => {
      const result = isSyncCode(raw) ? parseSyncCode(raw) : parseAnyBackup(raw)
      if (!result.success) {
        onNotify(`Ошибка импорта: ${result.error}`)
        return false
      }
      importState(result.data)
      playSuccess(sound)
      refreshUsage()
      onNotify(`Импорт из ${sourceLabel} завершён: ${result.data.days.length} дней восстановлено`)
      return true
    },
    [importState, onNotify, refreshUsage, sound]
  )

  /* ── Полный экспорт / импорт ─────────────────────────────────────────── */

  const handleExport = () => {
    playClick(sound)
    const json = buildPortableBackup(state)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ogonok-full-backup-day-${CURRENT_DAY}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    playSuccess(sound)
    onNotify(`Полный бэкап скачан (${formatBytes(blob.size)} · ${stats.totalRecords} записей)`)
  }

  const handleImportClick = () => {
    playClick(sound)
    fileRef.current?.click()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy('import')
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        applyImport(content, `файла «${file.name}»`)
      }
      setBusy(null)
    }
    reader.onerror = () => {
      onNotify('Не удалось прочитать файл бэкапа')
      setBusy(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  /* ── Код синхронизации ───────────────────────────────────────────────── */

  const handleGenerateCode = () => {
    playClick(sound)
    setBusy('code')
    try {
      setSyncCode(buildSyncCode(state))
      playSuccess(sound)
      onNotify('Код синхронизации собран — скопируйте его на другом устройстве')
    } catch {
      onNotify('Не удалось собрать код синхронизации')
    } finally {
      setBusy(null)
    }
  }

  const handleCopyCode = async () => {
    if (!syncCode) {
      onNotify('Сначала сгенерируйте код синхронизации')
      return
    }
    try {
      await navigator.clipboard.writeText(syncCode)
      playSuccess(sound)
      onNotify('Код синхронизации скопирован в буфер обмена')
    } catch {
      onNotify('Не удалось скопировать — выделите код вручную')
    }
  }

  const handleDownloadCode = () => {
    if (!syncCode) {
      onNotify('Сначала сгенерируйте код синхронизации')
      return
    }
    playClick(sound)
    const blob = new Blob([syncCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ogonok-sync-code-${Date.now()}.txt`
    link.click()
    URL.revokeObjectURL(url)
    onNotify('Код синхронизации сохранён в файл')
  }

  const handlePasteImport = () => {
    const value = pasteValue.trim()
    if (!value) {
      onNotify('Вставьте код синхронизации или JSON-бэкап')
      return
    }
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Импорт заменит текущую базу данных Огонька. Продолжить восстановление?'
      )
      if (!ok) return
    }
    if (applyImport(value, 'кода синхронизации')) {
      setPasteValue('')
    }
  }

  /* ── Синхронизация вкладок (localStorage) ────────────────────────────── */

  const handleSyncNow = () => {
    playClick(sound)
    setBusy('sync')
    try {
      const iso = syncNow()
      setLastSync(iso)
      refreshUsage()
      playSuccess(sound)
      onNotify('База записана в localStorage — открытые вкладки синхронизированы')
    } finally {
      setBusy(null)
    }
  }

  const statCards: { label: string; value: number; accent?: boolean }[] = [
    { label: 'Дней', value: stats.days, accent: true },
    { label: 'Гордостей', value: stats.prides },
    { label: 'Благодарностей', value: stats.gratitudes },
    { label: 'Ачивок', value: stats.achievements },
    { label: 'Сообщений', value: stats.chatMessages },
    { label: 'Комментариев', value: stats.comments },
    { label: 'Сторис', value: stats.stories },
    { label: 'Реакций', value: stats.reactions },
  ]

  return (
    <section className="settings-section backup-sync-panel" aria-labelledby="backup-title">
      <div className="appearance-section-head">
        <div>
          <b id="backup-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={16} className="text-[#53d3a3]" /> Полный экспорт / Импорт базы данных
          </b>
          <small>
            Перенос всей летописи между браузерами и доменами: файл JSON, код синхронизации
            и мгновенная запись в localStorage
          </small>
        </div>
        <span className="backup-fingerprint" title="Отпечаток текущей базы данных">
          <FingerprintGlyph /> {fingerprint}
        </span>
      </div>

      {/* ── Статистика содержимого ──────────────────────────────────────── */}
      <div className="backup-stats">
        {statCards.map((card) => (
          <div key={card.label} className={`backup-stat ${card.accent ? 'is-accent' : ''}`}>
            <b>{card.value.toLocaleString('ru-RU')}</b>
            <span>{card.label}</span>
          </div>
        ))}
      </div>

      {/* ── Индикатор занятого хранилища ────────────────────────────────── */}
      <div className="backup-storage">
        <div className="backup-storage__head">
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HardDrive size={14} /> Занято в localStorage
          </b>
          <span>
            {formatBytes(usage.totalBytes)} из {formatBytes(usage.quotaBytes)}
          </span>
        </div>
        <div className="backup-storage__bar" role="progressbar" aria-valuenow={usage.percent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.max(2, usage.percent)}%` }} />
        </div>
        <small className="backup-storage__note">
          Текущая база Огонька: {formatBytes(usage.storeBytes)} · заполнено {usage.percent}%
          {usage.percent >= 80 ? ' — пора почистить черновики' : ''}
        </small>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        style={{ display: 'none' }}
        onChange={handleFile}
        aria-label="Загрузить файл полного бэкапа"
      />

      {/* ── Действия: экспорт / импорт ──────────────────────────────────── */}
      <div className="backup-actions">
        <button
          type="button"
          className="backup-action primary"
          onClick={handleExport}
          aria-label="Скачать полный JSON-бэкап базы данных"
        >
          <Download size={18} />
          <span className="backup-action__text">
            <b>Экспорт всей базы (.json)</b>
            <small>Все дни, ачивки, чаты, сторис и настройки</small>
          </span>
        </button>

        <button
          type="button"
          className="backup-action"
          onClick={handleImportClick}
          disabled={busy === 'import'}
          aria-label="Импортировать базу из файла"
        >
          {busy === 'import' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          <span className="backup-action__text">
            <b>Импорт из файла (.json / .txt)</b>
            <small>Полная замена текущей базы данными файла</small>
          </span>
        </button>
      </div>

      {/* ── Код синхронизации ───────────────────────────────────────────── */}
      <div className="sync-code-block">
        <div className="appearance-section-head">
          <div>
            <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={14} /> Код синхронизации
            </b>
            <small>
              Компактный код для мгновенного переноса базы между браузерами и доменами —
              вставьте его на другом устройстве
            </small>
          </div>
        </div>

        <div className="sync-code-toolbar">
          <button type="button" className="sec-mini-btn sec-mini-btn--accent" onClick={handleGenerateCode} disabled={busy === 'code'}>
            {busy === 'code' ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
            Собрать код
          </button>
          <button type="button" className="sec-mini-btn" onClick={() => void handleCopyCode()} disabled={!syncCode}>
            <Copy size={13} /> Копировать
          </button>
          <button type="button" className="sec-mini-btn" onClick={handleDownloadCode} disabled={!syncCode}>
            <FileJson size={13} /> В файл
          </button>
        </div>

        <textarea
          className="sync-code-area"
          value={syncCode}
          onChange={(e) => setSyncCode(e.target.value)}
          placeholder="Нажмите «Собрать код», чтобы получить строку переноса (OGN-SYNC1…)"
          spellCheck={false}
          aria-label="Код синхронизации"
        />

        <div className="sync-code-import">
          <div className="sync-code-import__head">
            <ClipboardPaste size={13} />
            <span>Вставить код или JSON для восстановления</span>
          </div>
          <textarea
            className="sync-code-area sync-code-area--paste"
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder="OGN-SYNC1.xxxx.xxxxxx  или  { &quot;days&quot;: [ … ] }"
            spellCheck={false}
            aria-label="Вставка кода синхронизации или JSON"
          />
          <button
            type="button"
            className="backup-action"
            onClick={handlePasteImport}
            disabled={!pasteValue.trim()}
          >
            <Share2 size={16} />
            <span className="backup-action__text">
              <b>Восстановить из вставленного кода</b>
              <small>Заменит текущую базу данными из буфера</small>
            </span>
          </button>
        </div>
      </div>

      {/* ── Синхронизация вкладок ───────────────────────────────────────── */}
      <div className="backup-sync-now">
        <div>
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Мгновенная синхронизация вкладок
          </b>
          <small>
            {lastSync
              ? `Последняя запись: ${timeAgo(lastSync)}`
              : 'Записывает базу в localStorage — соседние вкладки подхватят изменения сразу'}
          </small>
        </div>
        <button
          type="button"
          className="secondary-btn flex items-center gap-2 text-xs py-2 px-3"
          onClick={handleSyncNow}
          disabled={busy === 'sync'}
        >
          {busy === 'sync' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span>Синхронизировать сейчас</span>
        </button>
      </div>

      <div className="backup-local-note">
        <ShieldCheck size={14} />
        <span>
          Данные хранятся локально (ключ <code>ogonek.v2</code>). Экспорт и код синхронизации
          никуда не отправляются — только между вашими устройствами.
        </span>
      </div>

      {/* ── Мини-сводка ─────────────────────────────────────────────────── */}
      <div className="backup-meta">
        <span>
          <Layers size={12} /> Схема v{state.schemaVersion} · день #{CURRENT_DAY}
        </span>
        <span>
          <BarChart3 size={12} /> {stats.totalRecords.toLocaleString('ru-RU')} записей
        </span>
        <span>
          <Clock size={12} /> {new Date().toLocaleDateString('ru-RU')}
        </span>
      </div>
    </section>
  )
}

function FingerprintGlyph() {
  return (
    <span aria-hidden="true" className="backup-fingerprint__glyph">
      <span className="backup-fingerprint__dot" />
      <span className="backup-fingerprint__bar" />
      <span className="backup-fingerprint__bar" />
    </span>
  )
}
