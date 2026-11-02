import { useState, type FormEvent } from 'react'
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
 * Approach B: Telegram Hero (Primary 1-Tap) + Collapsible Password Box.
 * Tailored for shop owners who log in with Telegram, while keeping
 * email / password login cleanly accessible for staff without visual clutter.
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
      <div className="space-y-4">
        {/* ── 1. TELEGRAM 1-TAP LOGIN ── */}
        <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-xs">
          <TelegramLogIn withDivider={false} onLoggedIn={() => navigate(from, { replace: true })} />
        </div>

        {/* ── 2. COLLAPSIBLE PASSWORD LOGIN ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs transition-colors">
          <button
            type="button"
            onClick={() => {
              setShowPassword((prev) => !prev)
              setError(null)
            }}
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50/80"
            aria-expanded={showPassword}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <KeyRound className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 truncate">
                <span className="block text-sm font-semibold text-slate-900 truncate">
                  {t.auth.login.loginWithPassword}
                </span>
                <span className="block text-xs text-slate-500 truncate">
                  {t.auth.login.loginWithPasswordDesc}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                showPassword ? 'rotate-180 text-navy-700' : ''
              }`}
              aria-hidden
            />
          </button>

          {showPassword && (
            <form
              onSubmit={submit}
              className="border-t border-slate-100 p-4 pt-3 space-y-4 animate-fade-in"
            >
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
                <div className="mt-1 text-right">
                  <Link
                    to="/forgot-password"
                    state={{ login, byEmail }}
                    className="inline-flex min-h-9 items-center text-xs font-semibold text-navy-700 link hover:text-navy-900"
                  >
                    {t.auth.forgot.link}
                  </Link>
                </div>
              </div>

              <ErrorMessage error={error} />

              <Button
                type="submit"
                variant="secondary"
                size="lg"
                loading={pending}
                className="w-full"
              >
                {t.auth.logIn}
              </Button>

              {pending && <SlowNotice />}
            </form>
          )}
        </div>

        <SocialButtons label={t.auth.social.orLogIn} />
      </div>
    </AuthLayout>
  )
}
