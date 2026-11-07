import { useId, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ChevronDown, KeyRound } from 'lucide-react'
import { SocialButtons } from '../auth/SocialButtons.tsx'
import { TelegramLogIn } from '../auth/TelegramLogIn.tsx'
import { useAuth } from '../auth/useAuth.ts'
import { Button, ErrorMessage, Field, PasswordInput, SlowNotice } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { AuthLayout } from './AuthLayout.tsx'
import { LoginField } from './LoginField.tsx'

/**
 * Telegram first for shop owners, then the password login folded under a
 * line for staff and password accounts, all in AuthLayout's one card (no
 * boxes inside it, 2026-11-07).
 */
export function Login() {
  const { status, login: logIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const initialByEmail = Boolean((location.state as { byEmail?: boolean } | null)?.byEmail)
  const [showPassword, setShowPassword] = useState(initialByEmail)
  const [login, setLogin] = useState('')
  const [byEmail, setByEmail] = useState(initialByEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const formId = useId()
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
      footer={
        <>
          {t.auth.login.newHere}{' '}
          <Link to="/register" className="font-semibold text-navy-700 link">
            {t.auth.createYourStore}
          </Link>
        </>
      }
    >
      {/* 1. Telegram, the one strong button, and a plain line under it. */}
      <TelegramLogIn onLoggedIn={() => navigate(from, { replace: true })} />

      {/* 2. Password login for staff and password accounts, folded away
          unless the page was opened for it (route state byEmail). */}
      <div>
        <button
          type="button"
          onClick={() => {
            setShowPassword((prev) => !prev)
            setError(null)
          }}
          className="-mx-2 flex w-[calc(100%+1rem)] min-h-14 items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-600"
          aria-expanded={showPassword}
          aria-controls={showPassword ? formId : undefined}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <KeyRound className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">{t.auth.login.loginWithPassword}</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">{t.auth.login.loginWithPasswordDesc}</span>
          </span>
          <ChevronDown
            className={`size-5 shrink-0 text-slate-400 transition-transform duration-200 ${
              showPassword ? 'rotate-180 text-navy-700' : ''
            }`}
            aria-hidden
          />
        </button>

        {showPassword && (
          <form id={formId} onSubmit={submit} className="mt-4 space-y-4 animate-fade-in">
            <LoginField
              value={login}
              onChange={setLogin}
              byEmail={byEmail}
              onByEmailChange={setByEmail}
              enterKeyHint="next"
            />

            <div>
              <Field label={t.auth.password}>
                <PasswordInput
                  autoComplete="current-password"
                  enterKeyHint="go"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  state={{ login, byEmail }}
                  className="inline-flex min-h-11 items-center text-xs font-semibold text-navy-700 link hover:text-navy-900"
                >
                  {t.auth.forgot.link}
                </Link>
              </div>
            </div>

            <ErrorMessage error={error} />

            <Button type="submit" variant="secondary" size="lg" loading={pending} className="w-full">
              {t.auth.logIn}
            </Button>

            {pending && <SlowNotice />}
          </form>
        )}
      </div>

      <SocialButtons label={t.auth.social.orLogIn} />
    </AuthLayout>
  )
}
