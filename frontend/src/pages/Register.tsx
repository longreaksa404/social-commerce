import { useCallback, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { CircleCheck, Store } from 'lucide-react'
import { PhoneCheck } from '../auth/PhoneCheck.tsx'
import { SocialButtons } from '../auth/SocialButtons.tsx'
import { buttonClass } from '../components/styles.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, Input, PasswordInput, SlowNotice } from '../components/ui.tsx'
import { ApiError } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import { formatPhone } from '../lib/orders.ts'
import { forgetDraft, useKeepDraft, useSavedDraft } from '../lib/signup.ts'
import type { PhoneCheck as Check } from '../lib/types.ts'
import { useT } from '../i18n/useT.ts'
import { AgreeLine } from './AgreeLine.tsx'
import { AuthLayout } from './AuthLayout.tsx'

const FIELDS = ['store_name', 'phone_check', 'password', 'confirm_password']
const DRAFT_KEY = 'sc.register'

/** Verify a phone first, then name the shop and choose its password. */
export function Register() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const draft = useSavedDraft(DRAFT_KEY)
  const [form, setForm] = useState({
    store_name: draft?.store_name ?? '',
    password: '',
    confirm_password: '',
  })
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [phone, setPhone] = useState<Check | null>(null)
  // The check opened in Telegram, kept in the draft.
  const [opened, setOpened] = useState<Check | null>(draft?.check ?? null)
  // A new PhoneCheck when the one handed in turned out to be used up.
  const [phoneKey, setPhoneKey] = useState(0)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const t = useT()
  useKeepDraft(DRAFT_KEY, { store_name: form.store_name, check: opened })

  const onPhone = useCallback((check: Check | null) => {
    setPhone(check)
    if (!check) setOpened(null)
    setError(null)
  }, [])

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const isVerified = Boolean(phone && !phone.taken)
  const mismatch = Boolean(
    form.confirm_password.length > 0 && form.password !== form.confirm_password,
  )

  function resetPhone() {
    setPhone(null)
    setOpened(null)
    setPhoneKey((k) => k + 1)
    setError(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!phone || phone.taken) {
      if (!phone) {
        setError(
          new ApiError(
            422,
            'PHONE_NOT_VERIFIED',
            'Verify your phone number with Telegram first.',
            'phone_check',
          ),
        )
      }
      return
    }

    if (form.password !== form.confirm_password) {
      setConfirmTouched(true)
      setError(
        new ApiError(
          422,
          'PASSWORD_MISMATCH',
          t.auth.register.passwordMismatch,
          'confirm_password',
        ),
      )
      return
    }

    setPending(true)
    setError(null)
    try {
      await register({
        store_name: form.store_name,
        password: form.password,
        phone_check: phone.id,
      })
      forgetDraft(DRAFT_KEY)
      navigate('/dashboard/products', { replace: true })
    } catch (err) {
      setError(err)
      if (err instanceof ApiError && err.code === 'PHONE_CHECK_EXPIRED') {
        setPhone(null)
        setOpened(null)
        setPhoneKey((n) => n + 1)
      }
    } finally {
      setPending(false)
    }
  }

  // Password strength calculation
  const strength = calculateStrength(form.password)

  return (
    <AuthLayout
      title={isVerified ? t.auth.register.setupTitle : t.auth.createYourStore}
      footer={
        <>
          {t.auth.register.haveAccount}{' '}
          <Link to="/login" className="font-semibold text-navy-700 link">
            {t.auth.logIn}
          </Link>
        </>
      }
    >
      {/* ── 2-Step Centered Stepper ── */}
      <StepBar currentStep={isVerified ? 2 : 1} />

      {!isVerified ? (
        /* ──────── STEP 1: VERIFY PHONE WITH TELEGRAM ──────── */
        <div className="mt-6 space-y-4 animate-fade-in">
          {/* Telegram Phone Check Button / Component */}
          <div className="rounded-xl border border-slate-300 bg-surface p-4">
            <PhoneCheck
              key={phoneKey}
              label={t.auth.register.phoneLabel}
              error={fieldError(error, 'phone_check')}
              onChange={onPhone}
              resume={opened}
              onOpen={setOpened}
              required
              taken={{
                message: t.auth.phoneCheck.taken,
                action: (
                  <Link to="/login" className={buttonClass()}>
                    {t.auth.logIn}
                  </Link>
                ),
              }}
            />
          </div>

          <SocialButtons label={t.auth.social.orSignUp} />
        </div>
      ) : (
        /* ──────── STEP 2: SHOP NAME & PASSWORDS ──────── */
        <form onSubmit={submit} className="mt-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-hidden />
            <span className="sr-only">{t.auth.phoneCheck.verified}</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatPhone(phone?.phone ?? '')}
            </span>
            <button
              type="button"
              onClick={resetPhone}
              disabled={pending}
              className="ml-auto min-h-11 min-w-11 shrink-0 px-2 text-sm font-semibold text-navy-700 link disabled:opacity-50"
            >
              {t.auth.register.changePhone}
            </button>
          </div>

          {/* Shop Name */}
          <Field
            label={t.auth.register.storeName}
            error={fieldError(error, 'store_name')}
            hint={t.auth.register.storeNameHint}
          >
            <Input
              required
              autoFocus
              maxLength={100}
              autoCapitalize="words"
              enterKeyHint="next"
              leading={<Store className="size-4 text-slate-400" aria-hidden />}
              placeholder={t.common.example('Sokha Fashion')}
              value={form.store_name}
              onChange={set('store_name')}
            />
          </Field>

          {/* Live Store Link Preview Card */}
          {form.store_name.trim().length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-3.5 py-2 text-xs text-slate-600 transition-all animate-fade-in">
              <span className="text-slate-400 font-normal">{t.auth.register.storeLinkPreview}</span>
              <span className="truncate font-semibold text-navy-800">
                order.oaksolve.com/{formatStoreSlug(form.store_name)}
              </span>
            </div>
          )}

          {/* For password managers: the login this password goes with */}
          <input type="tel" autoComplete="username" value={phone?.phone ?? ''} hidden readOnly />

          {/* Password with Strength Meter */}
          <div>
            <Field
              label={t.auth.password}
              error={fieldError(error, 'password')}
              hint={t.auth.register.passwordHint}
            >
              <PasswordInput
                required
                autoComplete="new-password"
                enterKeyHint="next"
                minLength={8}
                value={form.password}
                onChange={set('password')}
              />
            </Field>

            {/* Password strength bar */}
            {form.password.length > 0 && (
              <div className="mt-2 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-slate-500">Security</span>
                  <span className={strength.textColor}>
                    {strength.score === 1 && t.auth.register.passwordStrength.weak}
                    {strength.score === 2 && t.auth.register.passwordStrength.fair}
                    {strength.score === 3 && t.auth.register.passwordStrength.strong}
                  </span>
                </div>
                <div className="flex gap-1.5 h-1">
                  <div
                    className={`h-full flex-1 rounded-full transition-colors ${
                      strength.score >= 1 ? strength.barColor : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full transition-colors ${
                      strength.score >= 2 ? strength.barColor : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full transition-colors ${
                      strength.score >= 3 ? strength.barColor : 'bg-slate-200'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <Field
            label={t.auth.register.confirmPassword}
            error={
              confirmTouched && mismatch
                ? t.auth.register.passwordMismatch
                : fieldError(error, 'confirm_password')
            }
            hint={
              !mismatch && form.confirm_password.length > 0 ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CircleCheck className="size-3.5" aria-hidden />
                  {t.auth.register.passwordsMatch}
                </span>
              ) : (
                t.auth.register.confirmPasswordHint
              )
            }
          >
            <PasswordInput
              required
              autoComplete="new-password"
              enterKeyHint="go"
              minLength={8}
              value={form.confirm_password}
              onChange={(e) => {
                setConfirmTouched(true)
                set('confirm_password')(e)
              }}
            />
          </Field>

          <ErrorMessage error={formError(error, FIELDS)} />

          <Button type="submit" size="lg" loading={pending} className="w-full">
            {t.auth.register.submit}
          </Button>

          {pending && <SlowNotice />}
          <AgreeLine />
        </form>
      )}
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Helpers & Local Components

function formatStoreSlug(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\u1780-\u17FF-]/g, '')
  return cleaned || 'my-shop'
}

function calculateStrength(password: string): {
  score: 0 | 1 | 2 | 3
  barColor: string
  textColor: string
} {
  if (!password) return { score: 0, barColor: 'bg-slate-200', textColor: 'text-slate-400' }
  let score = 0
  if (password.length >= 8) score++
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 12) score++

  if (score <= 1) return { score: 1, barColor: 'bg-red-500', textColor: 'text-red-600' }
  if (score === 2) return { score: 2, barColor: 'bg-amber-500', textColor: 'text-amber-600' }
  return { score: 3, barColor: 'bg-emerald-500', textColor: 'text-emerald-600' }
}

/** Two numbered milestones; the current step is also named to screen readers. */
function StepBar({ currentStep }: { currentStep: 1 | 2 }) {
  const t = useT()
  const steps = [t.auth.register.step1Title, t.auth.register.step2Title]

  return (
    <ol className="mx-auto grid w-full max-w-sm grid-cols-2 gap-4">
      {steps.map((label, index) => {
        const step = index + 1
        const current = step === currentStep
        return (
          <li
            key={step}
            aria-current={current ? 'step' : undefined}
            className="flex min-w-0 flex-col items-center gap-1.5 text-center"
          >
            <span
              aria-hidden
              className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                current
                  ? 'bg-accent text-on-accent'
                  : 'border border-slate-300 bg-surface text-slate-500'
              }`}
            >
              {step}
            </span>
            <span className={`text-xs ${current ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
