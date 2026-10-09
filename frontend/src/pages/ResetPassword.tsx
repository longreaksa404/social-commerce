import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { buttonClass } from '../components/styles.ts'
import { Button, ErrorMessage, Field, PasswordInput, SlowNotice } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api, ApiError, type AccessToken } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import { AuthLayout } from './AuthLayout.tsx'

/** /reset-password#<token>: the link the bot sends to the shop's Telegram.
 * The token is after the #, so it never reaches a server's logs. Saving
 * logs the seller in here and out everywhere else. */
export function ResetPassword() {
  const { startSession } = useAuth()
  const navigate = useNavigate()
  const token = useLocation().hash.slice(1)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const t = useT()
  const r = t.auth.reset

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const session = await api<AccessToken>('/auth/password-reset/confirm', {
        method: 'POST',
        body: { token, new_password: password },
        auth: false,
      })
      startSession(session)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err)
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title={r.title}
      subtitle={token ? r.subtitle : undefined}
      footer={
        <Link to="/login" className="font-semibold text-navy-700 hover:underline">
          {t.auth.forgot.backToLogin}
        </Link>
      }
    >
      <title>{r.title}</title>
      {token ? (
        <form onSubmit={submit} className="space-y-4">
          <Field label={t.settings.newPassword} error={fieldError(error, 'new_password')} hint={t.auth.register.passwordHint}>
            <PasswordInput
              required
              minLength={8}
              autoComplete="new-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <ErrorMessage error={formError(error, ['new_password'])} />
          <Button type="submit" size="lg" loading={pending} className="w-full">
            {r.save}
          </Button>
          {pending && <SlowNotice />}
          {error instanceof ApiError && error.code === 'RESET_LINK_INVALID' && (
            <Link to="/forgot-password" className={`${buttonClass('secondary')} w-full`}>
              {r.askAgain}
            </Link>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">{r.noLink}</p>
          <Link to="/forgot-password" className={`${buttonClass('primary')} w-full`}>
            {r.askAgain}
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}
