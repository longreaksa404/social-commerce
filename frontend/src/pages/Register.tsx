import { useCallback, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { PhoneCheck } from '../auth/PhoneCheck.tsx'
import { SocialButtons } from '../auth/SocialButtons.tsx'
import { useAuth } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, Input, PasswordInput, SlowNotice } from '../components/ui.tsx'
import { ApiError } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import type { PhoneCheck as Check } from '../lib/types.ts'
import { useT } from '../i18n/useT.ts'
import { AuthLayout } from './AuthLayout.tsx'

const FIELDS = ['store_name', 'full_name', 'phone_check', 'password']

/** Sign-up with a phone number and password (founder's choice
 * 2026-10-09). The number is the one the seller shares with the Telegram
 * bot, so it's really theirs; that chat also gets the shop's order
 * alerts. */
export function Register() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ store_name: '', full_name: '', password: '' })
  const [phone, setPhone] = useState<Check | null>(null)
  // A new PhoneCheck when the one handed in turned out to be used up.
  const [phoneKey, setPhoneKey] = useState(0)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const t = useT()

  const onPhone = useCallback((check: Check | null) => {
    setPhone(check)
    setError(null)
  }, [])

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!phone || phone.taken) {
      if (!phone) {
        setError(new ApiError(422, 'PHONE_NOT_VERIFIED', 'Verify your phone number with Telegram first.', 'phone_check'))
      }
      return
    }
    setPending(true)
    setError(null)
    try {
      await register({ ...form, phone_check: phone.id })
      navigate('/dashboard/products', { replace: true })
    } catch (err) {
      setError(err)
      if (err instanceof ApiError && err.code === 'PHONE_CHECK_EXPIRED') {
        setPhone(null)
        setPhoneKey((n) => n + 1)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title={t.auth.createYourStore}
      subtitle={t.auth.register.subtitle}
      footer={
        <>
          {t.auth.register.haveAccount}{' '}
          <Link to="/login" className="font-semibold text-navy-700 hover:underline">
            {t.auth.logIn}
          </Link>
        </>
      }
    >
      <SocialButtons />
      <form onSubmit={submit} className="space-y-4">
        <Field label={t.auth.register.storeName} error={fieldError(error, 'store_name')} hint={t.auth.register.storeNameHint}>
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
        <Field label={t.auth.register.yourName} error={fieldError(error, 'full_name')}>
          <Input
            required
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={100}
            value={form.full_name}
            onChange={set('full_name')}
          />
        </Field>
        <PhoneCheck
          key={phoneKey}
          label={t.auth.register.phoneLabel}
          error={fieldError(error, 'phone_check')}
          onChange={onPhone}
          taken={
            <p className="text-sm text-slate-700">
              {t.auth.phoneCheck.taken}{' '}
              <Link to="/login" className="font-semibold text-navy-700 hover:underline">
                {t.auth.logIn}
              </Link>
            </p>
          }
        />
        {/* For password managers: the login this password goes with. */}
        <input type="tel" autoComplete="username" value={phone?.phone ?? ''} hidden readOnly />
        <Field label={t.auth.password} error={fieldError(error, 'password')} hint={t.auth.register.passwordHint}>
          <PasswordInput
            required
            autoComplete="new-password"
            enterKeyHint="go"
            minLength={8}
            value={form.password}
            onChange={set('password')}
          />
        </Field>
        <ErrorMessage error={formError(error, FIELDS)} />
        <Button type="submit" size="lg" loading={pending} disabled={phone?.taken} className="w-full">
          {t.auth.register.submit}
        </Button>
        {pending && <SlowNotice />}
      </form>
    </AuthLayout>
  )
}
