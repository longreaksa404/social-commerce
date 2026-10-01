import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, Input } from '../components/ui.tsx'
import { AuthLayout } from './AuthLayout.tsx'

export function Login() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  if (status === 'authenticated') return <Navigate to={from} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title="Log in"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-emerald-700 hover:underline">
            Create your store
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <ErrorMessage error={error} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
