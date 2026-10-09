import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, PasswordInput, SlowNotice } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { AuthLayout } from './AuthLayout.tsx'
import { LoginField } from './LoginField.tsx'

export function Login() {
  const { status, login: logIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [login, setLogin] = useState('')
  const [byEmail, setByEmail] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const t = useT()

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  if (status === 'authenticated') return <Navigate to={from} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await logIn(login.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title={t.auth.login.title}
      subtitle={t.auth.login.subtitle}
      footer={
        <>
          {t.auth.login.newHere}{' '}
          <Link to="/register" className="font-semibold text-navy-700 hover:underline">
            {t.auth.createYourStore}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <LoginField value={login} onChange={setLogin} byEmail={byEmail} onByEmailChange={setByEmail} enterKeyHint="next" />
        <Field label={t.auth.password}>
          <PasswordInput
            autoComplete="current-password"
            enterKeyHint="go"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <p className="-mt-2 text-right">
          <Link
            to="/forgot-password"
            state={{ login, byEmail }}
            className="inline-flex min-h-11 items-center text-sm font-medium text-navy-700 hover:underline"
          >
            {t.auth.forgot.link}
          </Link>
        </p>
        <ErrorMessage error={error} />
        <Button type="submit" size="lg" loading={pending} className="w-full">
          {t.auth.logIn}
        </Button>
        {pending && <SlowNotice />}
      </form>
    </AuthLayout>
  )
}
