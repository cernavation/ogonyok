import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import {
  getClientIp,
  getSubnet24,
  checkRateLimit,
} from '@/lib/server/rate-limit'
import {
  validateUsernameSecurity,
  validatePasswordSecurity,
  validateFormTiming,
  verifyTurnstileToken,
} from '@/lib/server/signup-protection'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const subnet = getSubnet24(ip)

  // 1. Rate limiting: максимум 3 регистрации в сутки на один IP
  const ipRate = await checkRateLimit(`signup:ip:${ip}`, 3, 86400)
  if (!ipRate.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Превышен лимит регистраций с вашего IP (максимум 3 в сутки)',
          retryAfter: ipRate.retryAfter,
        },
      },
      { status: 429, headers: { 'Retry-After': String(ipRate.retryAfter) } }
    )
  }

  // 2. Rate limiting: максимум 10 регистраций в сутки на подсеть /24
  const subnetRate = await checkRateLimit(`signup:subnet:${subnet}`, 10, 86400)
  if (!subnetRate.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Превышен лимит регистраций для вашей подсети (максимум 10 в сутки)',
          retryAfter: subnetRate.retryAfter,
        },
      },
      { status: 429, headers: { 'Retry-After': String(subnetRate.retryAfter) } }
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Невалидный формат JSON' } },
      { status: 400 }
    )
  }

  // 3. Проверка honeypot-поля (боты заполняют скрытые поля)
  const honeypot = body.website || body.company || body.hp_field
  if (honeypot && String(honeypot).trim() !== '') {
    return NextResponse.json(
      { error: { code: 'BOT_DETECTED', message: 'Автоматическая регистрация отклонена' } },
      { status: 400 }
    )
  }

  // 4. Минимальное время заполнения формы (≥ 3 секунды)
  const timing = validateFormTiming(body.formStartTime, 3)
  if (!timing.valid) {
    return NextResponse.json(
      { error: { code: 'FORM_SUBMITTED_TOO_FAST', message: timing.error } },
      { status: 400 }
    )
  }

  // 5. Валидация никнейма и защита от зарезервированных имен
  const usernameVal = validateUsernameSecurity(body.username || '')
  if (!usernameVal.valid) {
    return NextResponse.json(
      { error: { code: 'INVALID_USERNAME', message: usernameVal.error } },
      { status: 400 }
    )
  }
  const cleanUsername = usernameVal.normalized

  // 6. Валидация пароля
  const passwordVal = validatePasswordSecurity(body.password || '')
  if (!passwordVal.valid) {
    return NextResponse.json(
      { error: { code: 'INVALID_PASSWORD', message: passwordVal.error } },
      { status: 400 }
    )
  }

  // 7. Проверка капчи Turnstile
  const turnstileRes = await verifyTurnstileToken(body.turnstileToken, ip)
  if (!turnstileRes.ok) {
    return NextResponse.json(
      { error: { code: 'CAPTCHA_FAILED', message: turnstileRes.error } },
      { status: 400 }
    )
  }

  // 8. Создание пользователя через Supabase Auth Admin API (service_role)
  const email = `${cleanUsername}@ogonek.app`
  const displayName = (body.displayName || cleanUsername).trim()

  try {
    const supabase = getServerSupabase()

    // Проверяем, существует ли уже профиль с таким ником
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: { code: 'USERNAME_TAKEN', message: 'Этот никнейм уже занят' } },
        { status: 409 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
        display_name: displayName,
      },
    })

    if (authError || !authData.user) {
      const msg = authError?.message || 'Не удалось создать пользователя'
      return NextResponse.json(
        { error: { code: 'AUTH_CREATE_ERROR', message: msg } },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Создаем запись профиля в таблице profiles
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        username: cleanUsername,
        display_name: displayName,
        subscription_tier: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.warn('[SIGNUP_PROFILE_WARN]:', profileError)
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email,
        username: cleanUsername,
        displayName,
      },
    })
  } catch (err: any) {
    console.error('[SIGNUP_FATAL_ERROR]:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err?.message || 'Внутренняя ошибка сервера' } },
      { status: 500 }
    )
  }
}
