import { handleScheduledDelivery } from '../../../../lib/server/cron-delivery.ts'

export async function GET(request: Request) {
  return handleScheduledDelivery(request)
}

export async function POST(request: Request) {
  return handleScheduledDelivery(request)
}
