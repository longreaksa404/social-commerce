import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth, type RegisterInput } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, Input } from '../components/ui.tsx'
import { fieldError, formError } from '../lib/errors.ts'
import { AuthLayout } from './AuthLayout.tsx'

const empty: RegisterInput = { store_name: '', full_name: '', phone: '', email: '', password: '' }

export function Register() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

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
      title="Create your store"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Store name" error={fieldError(error, 'store_name')} hint="You can change this later.">
          <Input required maxLength={100} value={form.store_name} onChange={set('store_name')} />
        </Field>
        <Field label="Your name" error={fieldError(error, 'full_name')}>
          <Input required autoComplete="name" maxLength={100} value={form.full_name} onChange={set('full_name')} />
        </Field>
        <Field label="Phone" error={fieldError(error, 'phone')}>
          <Input required type="tel" autoComplete="tel" placeholder="012 345 678" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Email" error={fieldError(error, 'email')}>
          <Input required type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Password" error={fieldError(error, 'password')} hint="At least 8 characters.">
          <Input
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={set('password')}
          />
        </Field>
        <ErrorMessage error={formError(error, Object.keys(empty))} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating…' : 'Create store'}
        </Button>
      </form>
    </AuthLayout>
  )
}
