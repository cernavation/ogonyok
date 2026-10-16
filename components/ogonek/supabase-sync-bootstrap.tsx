'use client'

import { useSupabaseSync } from '@/lib/ogonek/use-supabase-sync'

/**
 * ЭТАП 19 — ОБЩЕПРИЛОЖЕНЧЕСКИЙ ПЛАНИРОВЩИК СИНХРОНИЗАЦИИ.
 *
 * Монтируется один раз в AppShell и незаметно включает offline-first
 * синхронизацию с Supabase на всё приложение: при старте, по таймеру, при
 * возврате в сеть и при переключении на вкладку. Без ключей в .env.local
 * компонент ровно ничего не делает — приложение живёт локально.
 *
 * Рендерит null: это чистый побочный эффект без собственного UI
 * (кнопки и статус живут в панели «Синхронизация с Supabase» в Настройках).
 */
export function SupabaseSyncBootstrap() {
  useSupabaseSync({ autoSync: true })
  return null
}
