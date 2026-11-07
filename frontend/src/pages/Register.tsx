import { useCallback, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { CircleCheck } from 'lucide-react'
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

// Phone-check errors belong to PhoneCheck on step one and the form on step two.
const FIELDS = ['store_name', 'password', 'confirm_password']
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

  function editPassword(key: 'password' | 'confirm_password') {
    return (event: { target: { value: string } }) => {
      set(key)(event)
      setConfirmTouched(false)
      setError((current: unknown) =>
        current instanceof ApiError && current.field === 'confirm_password' ? null : current,
      )
    }
  }

  function resetPhone() {
    setPhone(null)
    setOpened(null)
    setPhoneKey((k) => k + 1)
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      const confirmation = event.currentTarget.elements.namedItem('confirm_password') as HTMLInputElement
      confirmation.focus()
      confirmation.scrollIntoView({ block: 'center' })
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
      <StepBar currentStep={isVerified ? 2 : 1} />

      {!isVerified ? (
        // Step 1: verify the phone with Telegram, straight in the card.
        <div className="mt-7 animate-fade-in">
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

          <SocialButtons label={t.auth.social.orSignUp} />
        </div>
      ) : (
        // Step 2: the shop's name and password. Nothing takes focus on
        // arrival, so coming back from Telegram neither opens the keyboard
        // nor jumps past the verified number (2026-11-07).
        <form onSubmit={submit} className="mt-7 space-y-4 animate-fade-in">
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
          >
            <Input
              required
              maxLength={100}
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder={t.common.example('Sokha Fashion')}
              value={form.store_name}
              onChange={set('store_name')}
            />
          </Field>

          {/* For password managers: the login this password goes with */}
          <input type="tel" autoComplete="username" value={phone?.phone ?? ''} hidden readOnly />

          <Field
            label={t.auth.password}
            error={fieldError(error, 'password')}
            hint={t.auth.register.passwordHint}
          >
            <PasswordInput
              required
              name="password"
              autoComplete="new-password"
              enterKeyHint="next"
              minLength={8}
              value={form.password}
              onChange={editPassword('password')}
              onBlur={() => setConfirmTouched(true)}
            />
          </Field>

          {/* Confirm Password */}
          <Field
            label={t.auth.register.confirmPassword}
            error={
              confirmTouched && mismatch
                ? t.auth.register.passwordMismatch
                : fieldError(error, 'confirm_password')
            }
            hint={t.auth.register.confirmPasswordHint}
          >
            <PasswordInput
              required
              autoComplete="new-password"
              name="confirm_password"
              enterKeyHint="go"
              minLength={8}
              value={form.confirm_password}
              onChange={editPassword('confirm_password')}
              onBlur={() => setConfirmTouched(true)}
            />
          </Field>

          <ErrorMessage error={formError(error, FIELDS)} />

          <div className="space-y-3 pt-2">
            <Button type="submit" size="lg" loading={pending} className="w-full">
              {t.auth.register.submit}
            </Button>
            <AgreeLine />
            {pending && <SlowNotice />}
          </div>
        </form>
      )}
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Helpers & Local Components

/** Two numbered milestones joined by a thin neutral line (from one
 * circle's middle to the other's, under them); the current step is navy
 * and named to screen readers. Each label wraps under its own circle. */
function StepBar({ currentStep }: { currentStep: 1 | 2 }) {
  const t = useT()
  const steps = [t.auth.register.step1Title, t.auth.register.step2Title]

  return (
    <ol className="relative mx-auto grid w-full max-w-sm grid-cols-2 before:absolute before:inset-x-1/4 before:top-4 before:h-px before:bg-slate-300">
      {steps.map((label, index) => {
        const step = index + 1
        const current = step === currentStep
        return (
          <li
            key={step}
            aria-current={current ? 'step' : undefined}
            className="relative flex min-w-0 flex-col items-center gap-1.5 px-2 text-center"
          >
            <span
              aria-hidden
              className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-surface ${
                current ? 'bg-accent text-on-accent' : 'border border-slate-300 bg-surface text-slate-500'
              }`}
            >
              {step}
            </span>
            <span className={`text-xs leading-5 ${current ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
