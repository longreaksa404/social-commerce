import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth, type RegisterInput } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, Input, PasswordInput, SlowNotice } from '../components/ui.tsx'
import { fieldError, formError } from '../lib/errors.ts'
import { useT } from '../i18n/useT.ts'
import { AuthLayout } from './AuthLayout.tsx'

const empty: RegisterInput = { store_name: '', full_name: '', phone: '', email: '', password: '' }

export function Register() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const t = useT()

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  const set = (key: keyof RegisterInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await register(form)
      navigate('/dashboard/products', { replace: true })
    } catch (err) {
      setError(err)
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
        <Field label={t.auth.register.phone} error={fieldError(error, 'phone')}>
          <Input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            placeholder="012 345 678"
            value={form.phone}
            onChange={set('phone')}
          />
        </Field>
        <Field label={t.auth.email} error={fieldError(error, 'email')} hint={t.auth.register.emailHint}>
          <Input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={form.email}
            onChange={set('email')}
          />
        </Field>
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
        <ErrorMessage error={formError(error, Object.keys(empty))} />
        <Button type="submit" size="lg" loading={pending} className="w-full">
          {t.auth.register.submit}
        </Button>
        {pending && <SlowNotice />}
      </form>
    </AuthLayout>
  )
}
