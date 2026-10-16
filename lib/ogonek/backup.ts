import { STORAGE_KEY, validateAndImportJson } from './storage'
import {
  measureStorageUsageFor,
  parseAnyBackupWith,
  parseSyncCodeWith,
  type ImportResult,
  type StorageUsage,
} from './sync-code'

/* ══════════════════════════════════════════════════════════════════════════
   ЭТАП 16 — ПОЛНЫЙ ЭКСПОРТ / ИМПОРТ И СИНХРОНИЗАЦИЯ БАЗЫ ДАННЫХ
   Слой поверх чистых функций sync-code, связанный с хранилищем приложения:
   разбор кода синхронизации/JSON через validateAndImportJson и измерение
   занятого localStorage по реальному ключу Огонька.
   ══════════════════════════════════════════════════════════════════════════ */

export * from './sync-code'
export type { ImportResult, StorageUsage } from './sync-code'

/** Разбирает код синхронизации с валидацией через хранилище приложения */
export function parseSyncCode(code: string): ImportResult {
  return parseSyncCodeWith(code, validateAndImportJson)
}

/**
 * Универсальный разбор вставленного текста: код синхронизации или JSON-бэкап.
 * Формат определяется автоматически, поэтому одна кнопка «Импорт» работает
 * и для файла, и для скопированного кода.
 */
export function parseAnyBackup(raw: string): ImportResult {
  return parseAnyBackupWith(raw, validateAndImportJson)
}

/** Измеряет занятое хранилище браузера по ключу Огонька */
export function measureStorageUsage(): StorageUsage {
  return measureStorageUsageFor(STORAGE_KEY)
}
