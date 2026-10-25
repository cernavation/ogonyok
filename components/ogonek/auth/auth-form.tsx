'use client'

import { motion } from 'framer-motion'
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  isSupabaseConfigured,
  isUsernameAvailable,
  signInWithUsername,
  signUpWithUsername,
  validatePassword,
  validateUsername,
  getSupabase,
} from '@/lib/ogonek/supabase-client'

export type AuthMode = 'signin' | 'register'

type Props = {
  variant?: 'screen' | 'modal'
  initialMode?: AuthMode
  onAuthenticated?: (accountId: string) => void
  onNotify?: (message: string) => void
}

const DIFFICULTY_LEVELS = [
  { level: 1, label: 'Легко', desc: '1 гордость в день', emoji: '🌱' },
  { level: 2, label: 'Стандарт', desc: '3 гордости, 2 благодарности', emoji: '⚡' },
  { level: 3, label: 'Вызов', desc: '5 гордостей, рейтинг сложности', emoji: '🔥' },
  { level: 4, label: 'Огонь', desc: '7 гордостей + ежевечерний обзор', emoji: '💥' },
  { level: 5, label: 'Мастер', desc: 'Максимум + публичная видимость', emoji: '🏆' },
]

export function AuthForm({ variant = 'screen', initialMode = 'signin', onAuthenticated, onNotify }: Props) {
  const { state, continueAsGuest, registerWithEmail, signInWithEmail, applyUserSession } = useOgonekStore()
  const sound = state.soundEnabled

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Registration multi-step
  const [registrationStep, setRegistrationStep] = useState<1 | 2 | 3>(1)
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null)
  const [registeredUsername, setRegisteredUsername] = useState('')

  // Step 2 fields
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')

  // Step 3 fields
  const [selectedLevel, setSelectedLevel] = useState(2)
  const [avatarFile, setAvatarFile] = useState<string | null>(null) // base64

  // Проверка уникальности никнейма на лету (debounce 400ms)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null)

  const hasSupabase = isSupabaseConfigured()
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

  // Валидация на лету
  const usernameCheck = validateUsername(username)
  const passwordCheck = validatePassword(password)

  // Reset registration step when switching mode
  useEffect(() => {
    setRegistrationStep(1)
    setError(null)
  }, [mode])

  // Debounced проверка доступности ника при регистрации
  useEffect(() => {
    if (mode !== 'register' || registrationStep !== 1 || !usernameCheck.valid) {
      setCheckingUsername(false)
      setIsAvailable(null)
      return
    }

    setCheckingUsername(true)
    setIsAvailable(null)

    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current)
    }

    checkTimerRef.current = setTimeout(async () => {
      const avail = await isUsernameAvailable(usernameCheck.clean)
      setIsAvailable(avail)
      setCheckingUsername(false)
    }, 400)

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
  }, [username, mode, registrationStep, usernameCheck.valid, usernameCheck.clean])

  const finish = (accountId: string, message: string) => {
    playSuccess(sound)
    onNotify?.(message)
    onAuthenticated?.(accountId)
  }

  const handleGuest = () => {
    playClick(sound)
    const result = continueAsGuest()
    if (result.ok && result.accountId) {
      finish(result.accountId, 'Включён гостевой режим')
    } else {
      setError('Не удалось войти как гость')
    }
  }

  // Step 1: create account, advance to step 2
  const handleStep1Submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return

    if (!usernameCheck.valid) {
      setError(usernameCheck.error || 'Укажи корректный ник')
      return
    }
    if (!passwordCheck.valid) {
      setError(passwordCheck.error || 'Пароль должен содержать минимум 8 символов')
      return
    }
    if (isAvailable === false) {
      setError('Этот ник уже занят')
      return
    }

    const targetNick = usernameCheck.clean

    playClick(sound)
    setBusy(true)
    setError(null)

    try {
      const res = await signUpWithUsername({
        username: targetNick,
        password: password,
        displayName: '',
      })
      if (!res.ok) {
        setError(res.error || 'Ошибка при регистрации')
        return
      }

      const userId = res.user?.id || `user-${targetNick}`
      setRegisteredUserId(userId)
      setRegisteredUsername(targetNick)
      setRegistrationStep(2)
    } catch (err: any) {
      setError(err?.message || 'Ошибка подключения к серверу авторизации')
    } finally {
      setBusy(false)
    }
  }

  // Step 2: collect name/age/city, advance to step 3
  const handleStep2Submit = (e: FormEvent) => {
    e.preventDefault()
    playClick(sound)
    setRegistrationStep(3)
  }

  // Step 3: save profile, call onAuthenticated
  const handleStep3Submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !registeredUserId) return
    playClick(sound)
    setBusy(true)

    try {
      const userId = registeredUserId
      const targetNick = registeredUsername

      await applyUserSession({
        userId,
        username: targetNick,
        displayName: displayName || targetNick,
        email: `${targetNick}@ogonek.local`,
      })

      // Save extra profile data to Supabase
      const supabase = getSupabase()
      if (supabase) {
        await supabase.from('profiles').upsert({
          id: userId,
          username: targetNick,
          display_name: displayName || targetNick,
          city: city || null,
          level: selectedLevel,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }

      finish(userId, `Добро пожаловать в Огонёк, @${targetNick}!`)
    } catch (err: any) {
      setError(err?.message || 'Ошибка сохранения профиля')
    } finally {
      setBusy(false)
    }
  }

  // Signin handler
  const handleSignin = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return

    if (!usernameCheck.valid) {
      setError(usernameCheck.error || 'Укажи корректный ник')
      return
    }
    if (!password) {
      setError('Введи пароль')
      return
    }

    const targetNick = usernameCheck.clean
    playClick(sound)
    setBusy(true)
    setError(null)

    try {
      const res = await signInWithUsername({ username: targetNick, password })
      if (!res.ok) {
        setError(res.error || 'Неверный логин или пароль')
        return
      }

      const userId = res.user?.id || `user-${targetNick}`
      await applyUserSession({
        userId,
        username: targetNick,
        displayName: res.user?.user_metadata?.display_name || targetNick,
        email: `${targetNick}@ogonek.local`,
      })

      finish(userId, `С возвращением, @${targetNick}!`)
    } catch (err: any) {
      setError(err?.message || 'Ошибка подключения к серверу авторизации')
    } finally {
      setBusy(false)
    }
  }

  // Блокировка кнопки шага 1
  const isStep1Disabled =
    busy ||
    !usernameCheck.valid ||
    !passwordCheck.valid ||
    isAvailable === false ||
    checkingUsername

  return (
    <div className={`auth-form auth-form--${variant} max-w-md mx-auto w-full`}>
      {/* Вкладки «Вход» / «Регистрация» в стиле X.com */}
      <div className="flex border-b border-[var(--border)] mb-5" role="tablist" aria-label="Вход или регистрация">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          onClick={() => {
            playClick(sound)
            setMode('signin')
            setError(null)
          }}
          className={`flex-1 py-3 text-[15px] font-bold text-center border-b-2 transition-colors ${
            mode === 'signin'
              ? 'border-[var(--accent)] text-[var(--text)]'
              : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => {
            playClick(sound)
            setMode('register')
            setError(null)
          }}
          className={`flex-1 py-3 text-[15px] font-bold text-center border-b-2 transition-colors ${
            mode === 'register'
              ? 'border-[var(--accent)] text-[var(--text)]'
              : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          Регистрация
        </button>
      </div>

      {/* Ошибка */}
      {error && (
        <motion.div
          className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] flex items-center gap-2"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
        >
          <span>{error}</span>
        </motion.div>
      )}

      {/* ——— SIGN IN ——— */}
      {mode === 'signin' && (
        <form onSubmit={handleSignin} noValidate className="flex flex-col gap-4">
          {/* Поле @никнейм */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[var(--text-2)] flex items-center gap-1.5">
              <UserRound size={14} /> Никнейм
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[var(--text-3)] font-mono text-[15px] select-none">
                @
              </span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                placeholder="alex_cerna"
                onChange={(e) => {
                  const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                  setUsername(clean)
                  if (error) setError(null)
                }}
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
            </div>
          </div>

          {/* Поле Пароль */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[var(--text-2)] flex items-center gap-1.5">
              <KeyRound size={14} /> Пароль
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                placeholder="Твой пароль"
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                className="w-full pl-4 pr-11 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !usernameCheck.valid || !password}
            className="x-primary-btn w-full py-3.5 px-5 rounded-2xl text-[15px] font-bold mt-2 shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Входим…</span>
              </>
            ) : (
              <span>Войти</span>
            )}
          </button>
        </form>
      )}

      {/* ——— REGISTER STEP 1: username + password ——— */}
      {mode === 'register' && registrationStep === 1 && (
        <form onSubmit={handleStep1Submit} noValidate className="flex flex-col gap-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= registrationStep ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--text-3)] -mt-2">Шаг 1 из 3 — Аккаунт</p>

          {/* Поле @никнейм */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[var(--text-2)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserRound size={14} /> Никнейм
              </span>
              {username.length > 0 && (
                <span className="text-[12px] font-normal">
                  {checkingUsername ? (
                    <span className="text-[var(--text-3)] flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> проверяем…
                    </span>
                  ) : isAvailable === true ? (
                    <span className="text-emerald-500 flex items-center gap-1 font-bold">
                      <Check size={12} /> свободен
                    </span>
                  ) : isAvailable === false ? (
                    <span className="text-rose-400 flex items-center gap-1 font-bold">
                      <X size={12} /> занят
                    </span>
                  ) : null}
                </span>
              )}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[var(--text-3)] font-mono text-[15px] select-none">
                @
              </span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                placeholder="alex_cerna"
                onChange={(e) => {
                  const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                  setUsername(clean)
                  if (error) setError(null)
                }}
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
            </div>
            <p className="text-[11px] text-[var(--text-3)] px-1">
              От 3 до 20 символов: латиница, цифры и _
            </p>
          </div>

          {/* Поле Пароль */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[var(--text-2)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound size={14} /> Пароль
              </span>
              {password.length > 0 && (
                <span className={`text-[12px] font-bold ${
                  passwordCheck.score <= 2 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {passwordCheck.label}
                </span>
              )}
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                value={password}
                placeholder="Минимум 8 символов"
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                className="w-full pl-4 pr-11 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex gap-1 h-1 mt-1 px-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div
                    key={lvl}
                    className={`flex-1 rounded-full transition-colors ${
                      lvl <= passwordCheck.score
                        ? passwordCheck.score <= 2
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        : 'bg-[var(--border)]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isStep1Disabled}
            className="x-primary-btn w-full py-3.5 px-5 rounded-2xl text-[15px] font-bold mt-2 shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Создаём аккаунт…</span>
              </>
            ) : (
              <>
                <span>Далее</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>
      )}

      {/* ——— REGISTER STEP 2: name / age / city ——— */}
      {mode === 'register' && registrationStep === 2 && (
        <form onSubmit={handleStep2Submit} noValidate className="flex flex-col gap-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= registrationStep ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--text-3)] -mt-2">Шаг 2 из 3 — О тебе</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[var(--text-2)]">Имя Фамилия</label>
            <input
              type="text"
              value={displayName}
              placeholder="Алексей Черна"
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[var(--text-2)]">Возраст (необязательно)</label>
            <input
              type="number"
              value={age}
              placeholder="25"
              min={1}
              max={120}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[var(--text-2)]">Страна / Город</label>
            <input
              type="text"
              value={city}
              placeholder="Молдова, Кишинёв"
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <button
            type="submit"
            className="x-primary-btn w-full py-3.5 px-5 rounded-2xl text-[15px] font-bold mt-2 shadow-md flex items-center justify-center gap-2"
          >
            <span>Далее →</span>
          </button>
        </form>
      )}

      {/* ——— REGISTER STEP 3: level + avatar ——— */}
      {mode === 'register' && registrationStep === 3 && (
        <form onSubmit={handleStep3Submit} noValidate className="flex flex-col gap-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= registrationStep ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--text-3)] -mt-2">Шаг 3 из 3 — Уровень сложности</p>

          <div className="flex flex-col gap-2">
            {DIFFICULTY_LEVELS.map((lvl) => (
              <button
                key={lvl.level}
                type="button"
                onClick={() => {
                  playClick(sound)
                  setSelectedLevel(lvl.level)
                }}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                  selectedLevel === lvl.level
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span className="text-2xl">{lvl.emoji}</span>
                <div>
                  <p className={`text-[14px] font-bold ${selectedLevel === lvl.level ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                    Уровень {lvl.level} — {lvl.label}
                  </p>
                  <p className="text-[12px] text-[var(--text-3)]">{lvl.desc}</p>
                </div>
                {selectedLevel === lvl.level && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} className="text-[var(--accent-text)]" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Аватар (необязательно) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[var(--text-2)]">
              Аватар (необязательно)
            </label>
            <div className="flex items-center gap-3">
              {avatarFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarFile}
                  alt="Аватар"
                  className="w-14 h-14 rounded-full object-cover border-2 border-[var(--accent)]"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-3)]">
                  <UserRound size={24} />
                </div>
              )}
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] text-[13px] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors">
                <Flame size={14} />
                Загрузить фото
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) {
                      onNotify?.('Максимум 5 МБ')
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setAvatarFile(reader.result)
                      }
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
              {avatarFile && (
                <button
                  type="button"
                  onClick={() => setAvatarFile(null)}
                  className="text-[var(--text-3)] hover:text-rose-400 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="x-primary-btn w-full py-3.5 px-5 rounded-2xl text-[15px] font-bold mt-2 shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Сохраняем профиль…</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Завершить регистрацию</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Демо-вход для гостя / автотестов */}
      {isDemo && (
        <div className="mt-4 pt-3 border-t border-[var(--border)] text-center">
          <button
            type="button"
            onClick={handleGuest}
            className="text-[13px] text-amber-500 hover:text-amber-400 font-semibold inline-flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-amber-500/10 transition-colors min-h-[36px]"
          >
            <Sparkles size={14} /> Войти в демо-режиме (без регистрации)
          </button>
        </div>
      )}
    </div>
  )
}
