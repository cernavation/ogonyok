/**
 * CRON РОУТ ДОСТАВКИ ЗАПЛАНИРОВАННЫХ СООБЩЕНИЙ — /api/cron/deliver-scheduled
 * 
 * Безопасность: проверяет секретный токен CRON_SECRET через заголовок
 * authorization ('Bearer <CRON_SECRET>') или параметр ?secret=<CRON_SECRET>.
 */

import { handleScheduledDelivery } from '@/lib/server/cron-delivery'

export async function GET(request: Request) {
  // Проверяет CRON_SECRET и Bearer authorization
  return handleScheduledDelivery(request)
}

export async function POST(request: Request) {
  // Проверяет CRON_SECRET и Bearer authorization
  return handleScheduledDelivery(request)
}
