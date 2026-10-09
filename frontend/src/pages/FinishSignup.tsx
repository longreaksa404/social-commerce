import { useCallback, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { PhoneCheck } from '../auth/PhoneCheck.tsx'
import { useAuth } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, Input, SlowNotice } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api, ApiError, type AccessToken } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import { forgetSignup, savedSignup } from '../lib/signup.ts'
import type { PhoneCheck as Check, SignupStart } from '../lib/types.ts'
import { AuthLayout } from './AuthLayout.tsx'

const FIELDS = ['store_name', 'full_name', 'phone_check']

/** /register/google: someone new from "Continue with Google" names their
 * shop and proves a phone number in Telegram, like any sign-up, so every
 * shop has a real number. No password: Google is how they log in (they
 * can add one in Settings). */
export function FinishSignup() {
  const location = useLocation()
  const signup = (location.state as SignupStart | null) ?? savedSignup()
  const { status } = useAuth()
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  if (!signup) return <Navigate to="/register" replace />
  return <FinishForm signup={signup} />
}

function FinishForm({ signup }: { signup: SignupStart }) {
  const { startSession } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ store_name: '', full_name: signup.full_name })
  const [phone, setPhone] = useState<Check | null>(null)
  const [phoneKey, setPhoneKey] = useState(0)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const t = useT()
  const g = t.auth.google

  const onPhone = useCallback((check: Check | null) => {
    setPhone(check)
    setError(null)
  }, [])

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!phone) {
      setError(new ApiError(422, 'PHONE_NOT_VERIFIED', 'Verify your phone number with Telegram first.', 'phone_check'))
      return
    }
    if (phone.taken) return
    setPending(true)
    setError(null)
    try {
      const token = await api<AccessToken>('/auth/social/register', {
        method: 'POST',
        body: { ...form, signup_token: signup.signup_token, phone_check: phone.id },
        auth: false,
      })
      forgetSignup()
      startSession(token)
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

  const expired = error instanceof ApiError && error.code === 'SIGNUP_EXPIRED'

  return (
    <AuthLayout
      title={g.finishTitle}
      subtitle={g.signedInAs(signup.email ?? signup.full_name)}
      footer={
        <>
          {t.auth.register.haveAccount}{' '}
          <Link to="/login" onClick={forgetSignup} className="font-semibold text-navy-700 hover:underline">
            {t.auth.logIn}
          </Link>
        </>
      }
    >
      <title>{g.finishTitle}</title>
      {expired ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-700">{g.expired}</p>
          <Link to="/register" onClick={forgetSignup} className="font-semibold text-navy-700 hover:underline">
            {t.auth.createYourStore}
          </Link>
        </div>
      ) : (
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
              maxLength={100}
              value={form.full_name}
              onChange={set('full_name')}
            />
          </Field>
          <div>
            <PhoneCheck
              key={phoneKey}
              label={t.auth.phone}
              error={fieldError(error, 'phone_check')}
              onChange={onPhone}
              taken={<p className="text-sm text-slate-700">{g.phoneHasShop}</p>}
            />
            {!phone && <p className="mt-1.5 text-xs leading-5 text-slate-500">{g.phoneWhy}</p>}
          </div>
          <ErrorMessage error={formError(error, FIELDS)} />
          <Button type="submit" size="lg" loading={pending} disabled={phone?.taken} className="w-full">
            {t.auth.register.submit}
          </Button>
          {pending && <SlowNotice />}
        </form>
      )}
    </AuthLayout>
  )
}
