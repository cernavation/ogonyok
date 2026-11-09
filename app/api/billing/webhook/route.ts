/**
 * ВЕБХУК ОПЛАТЫ ПОДПИСКИ — /api/billing/webhook (ЭТАП 4)
 * 
 * Принимает события оплаты от Memernity Checkout.
 * 1. Проверяет наличие секрета BILLING_WEBHOOK_SECRET (иначе 503 Service Unavailable).
 * 2. Проверяет подпись HMAC SHA256 (заголовок x-billing-signature, иначе 401 Unauthorized).
 * 3. Обеспечивает строгую идемпотентность по event_id через таблицу public.billing_events (повтор -> 200).
 * 4. Обновляет тариф пользователя в public.profiles через service_role.
 * 5. Записывает аудит-лог в public.subscription_audit.
 */

import crypto from 'node:crypto'
import { z } from 'zod'
import { getServerSupabase } from '../../../../lib/supabase/server.ts'
import { apiErrorResponse } from '../../../../lib/server/api-validator.ts'

const BillingWebhookSchema = z.object({
  event_id: z.string().min(1, 'Требуется event_id'),
  event_type: z.string().min(1, 'Требуется event_type'),
  user_id: z.string().uuid().optional(),
  username: z.string().min(1).optional(),
  tier: z.enum(['free', 'pro', 'ultra']),
  period: z.enum(['month', 'year']).optional().default('month'),
  days: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  // 1. Проверка наличия секрета вебхука в переменных окружения
  const secret = process.env.BILLING_WEBHOOK_SECRET
  if (!secret) {
    return apiErrorResponse(
      'SERVICE_UNAVAILABLE',
      'BILLING_WEBHOOK_SECRET не настроен на сервере',
      503
    )
  }

  // 2. Считываем сырое тело для вычисления HMAC
  let rawBodyText = ''
  try {
    rawBodyText = await request.text()
  } catch {
    return apiErrorResponse('INVALID_BODY', 'Не удалось прочитать тело запроса', 400)
  }

  // Проверка подписи HMAC SHA-256
  const signatureHeader =
    request.headers.get('x-billing-signature') ||
    request.headers.get('x-signature-sha256') ||
    request.headers.get('x-hub-signature-256') ||
    ''

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBodyText)
    .digest('hex')

  const cleanProvidedSignature = signatureHeader.replace(/^sha256=/i, '').trim()

  const sigMatches =
    cleanProvidedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(cleanProvidedSignature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    )

  if (!sigMatches) {
    return apiErrorResponse('UNAUTHORIZED', 'Неверная или отсутствующая подпись вебхука', 401)
  }

  // 3. Парсинг и валидация JSON полезной нагрузки
  let json: unknown
  try {
    json = JSON.parse(rawBodyText)
  } catch {
    return apiErrorResponse('INVALID_JSON', 'Невалидный JSON в теле вебхука', 400)
  }

  const parseResult = BillingWebhookSchema.safeParse(json)
  if (!parseResult.success) {
    return apiErrorResponse(
      'VALIDATION_ERROR',
      parseResult.error.issues[0]?.message || 'Ошибка формата полезной нагрузки',
      422,
      parseResult.error.issues
    )
  }

  const payload = parseResult.data
  const supabase = getServerSupabase()
  if (!supabase) {
    return apiErrorResponse('DATABASE_ERROR', 'Подключение к базе данных недоступно', 500)
  }

  // 4. Проверка идемпотентности по event_id
  const { data: existingEvent } = await supabase
    .from('billing_events')
    .select('event_id')
    .eq('event_id', payload.event_id)
    .maybeSingle()

  if (existingEvent) {
    return Response.json(
      {
        ok: true,
        message: 'Событие уже было обработано ранее (идемпотентный ответ)',
        idempotent: true,
        event_id: payload.event_id,
      },
      { status: 200 }
    )
  }

  // 5. Поиск пользователя
  let targetUserId = payload.user_id

  if (!targetUserId && payload.username) {
    const cleanNick = payload.username.replace(/^@/, '').toLowerCase().trim()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .ilike('username', cleanNick)
      .maybeSingle()

    if (profile) {
      targetUserId = profile.id
    }
  }

  if (!targetUserId) {
    return apiErrorResponse('USER_NOT_FOUND', 'Пользователь для применения тарифа не найден', 404)
  }

  // Текущий профиль для аудита
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('subscription_tier, verified')
    .eq('id', targetUserId)
    .single()

  const oldTier = currentProfile?.subscription_tier || 'free'
  const newTier = payload.tier

  // 6. Расчёт даты окончания подписки
  let validUntil: string | null = null
  if (newTier !== 'free') {
    const daysToAdd =
      payload.days !== undefined
        ? payload.days
        : payload.period === 'year'
        ? 365
        : 30

    const date = new Date()
    date.setDate(date.getDate() + daysToAdd)
    validUntil = date.toISOString()
  }

  const nowISO = new Date().toISOString()

  // 7. Обновление тарифа в profiles (через service_role)
  const updateData: Record<string, unknown> = {
    subscription_tier: newTier,
    subscription_valid_until: validUntil,
    updated_at: nowISO,
  }
  if (newTier === 'ultra') {
    updateData.verified = true
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', targetUserId)

  if (updateError) {
    return apiErrorResponse(
      'UPDATE_FAILED',
      `Ошибка обновления тарифа: ${updateError.message}`,
      500
    )
  }

  // 8. Запись в subscription_audit
  await supabase.from('subscription_audit').insert({
    user_id: targetUserId,
    old_tier: oldTier,
    new_tier: newTier,
    until: validUntil,
    changed_by: 'billing_webhook:memernity',
    reason: `${payload.event_type} (event_id: ${payload.event_id})`,
    created_at: nowISO,
  })

  // 9. Сохранение события в billing_events для обеспечения идемпотентности
  await supabase.from('billing_events').insert({
    event_id: payload.event_id,
    event_type: payload.event_type,
    user_id: targetUserId,
    tier: newTier,
    period: payload.period,
    payload: json as any,
    processed_at: nowISO,
  })

  return Response.json({
    ok: true,
    event_id: payload.event_id,
    user_id: targetUserId,
    tier: newTier,
    subscription_valid_until: validUntil,
  })
}
