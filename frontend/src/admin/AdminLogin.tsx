import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { usePhoneCheck } from '../auth/usePhoneCheck.ts'
import { OakMark } from '../components/OakMark.tsx'
import { buttonClass } from '../components/styles.ts'
import { Button, ErrorMessage, Field, Input, PasswordInput } from '../components/ui.tsx'
import { adminApi, ApiError, type AccessToken } from '../lib/api.ts'
import { formatPhone } from '../lib/orders.ts'
import { useAdminSession } from './useAdminSession.ts'

type Mode = { kind: 'password' } | { kind: 'telegram'; stepToken: string } | { kind: 'setup' }

/** /admin/login: the admin's own login (founder's pick 2A, 2026-10-28):
 * the password, then a confirmation in Telegram (the admin's number
 * shared with Oak's bot, as at sign-up). The first time: Telegram, then
 * a password. English only (D5A). */
export function AdminLogin() {
  const { status, startSession } = useAdminSession()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  const [mode, setMode] = useState<Mode>({ kind: 'password' })
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()
  // Each Telegram step starts a new phone check: one already used (by the
  // setup, or a login before) is gone on the server.
  function go(next: Mode) {
    queryClient.removeQueries({ queryKey: ['phone-check'] })
    setMode(next)
  }

  if (status === 'in') return <Navigate to={from?.startsWith('/admin') ? from : '/admin'} replace />

  function loggedIn(token: AccessToken) {
    startSession(token)
    navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <title>Oak Order admin</title>
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-surface p-6 shadow-card ring-1 ring-slate-900/6 sm:p-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <OakMark className="mb-2 h-9 w-auto text-navy-700" />
          <h1 className="text-xl font-bold text-slate-900">Oak Order</h1>
          <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">Admin</p>
        </div>
        {mode.kind === 'password' && (
          <PasswordStep
            notice={notice}
            onStep={(stepToken) => {
              setNotice(null)
              go({ kind: 'telegram', stepToken })
            }}
            onSetup={() => go({ kind: 'setup' })}
          />
        )}
        {mode.kind === 'telegram' && (
          <ConfirmStep
            stepToken={mode.stepToken}
            onLoggedIn={loggedIn}
            onBack={(message) => {
              setNotice(message)
              setMode({ kind: 'password' })
            }}
          />
        )}
        {mode.kind === 'setup' && <SetupSteps onLoggedIn={loggedIn} onBack={() => setMode({ kind: 'password' })} />}
      </div>
    </main>
  )
}

function PasswordStep({ notice, onStep, onSetup }: { notice: string | null; onStep: (token: string) => void; onSetup: () => void }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const login = useMutation({
    mutationFn: () =>
      adminApi<{ step_token: string }>('/admin/auth/login', { method: 'POST', body: { phone, password }, auth: false }),
    onSuccess: (step) => onStep(step.step_token),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    login.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {notice && <p className="text-sm font-medium text-amber-700">{notice}</p>}
      <Field label="Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="username" required />
      </Field>
      <Field label="Password">
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </Field>
      <ErrorMessage error={login.error} />
      <Button type="submit" size="lg" loading={login.isPending} disabled={!phone || !password} className="w-full">
        Log in
      </Button>
      <p className="text-center text-sm text-slate-500">
        First time?{' '}
        <button type="button" onClick={onSetup} className="font-medium text-navy-700 link">
          Set up with Telegram
        </button>
      </p>
    </form>
  )
}

/** Step 2 of a login: the admin's own number from Telegram. */
function ConfirmStep({
  stepToken,
  onLoggedIn,
  onBack,
}: {
  stepToken: string
  onLoggedIn: (token: AccessToken) => void
  onBack: (message: string | null) => void
}) {
  const confirm = useMutation({
    mutationFn: (phoneCheck: string) =>
      adminApi<AccessToken>('/admin/auth/confirm', { method: 'POST', body: { step_token: stepToken, phone_check: phoneCheck }, auth: false }),
    onSuccess: onLoggedIn,
    onError: (error) => {
      // The step lasts 5 minutes.
      if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') onBack('That took too long. Log in again.')
    },
  })
  const { mutate } = confirm
  const onDone = useCallback((checkId: string) => mutate(checkId), [mutate])
  return (
    <TelegramStep
      title="Confirm in Telegram"
      onDone={onDone}
      working={confirm.isPending}
      error={confirm.error}
      onRetry={() => confirm.reset()}
      footer={
        <button type="button" onClick={() => onBack(null)} className="text-sm font-medium text-navy-700 link">
          Back
        </button>
      }
    />
  )
}

/** The first time: Telegram proves the number (it must be in ADMIN_PHONES
 * on Render), then the password it will log in with. */
function SetupSteps({ onLoggedIn, onBack }: { onLoggedIn: (token: AccessToken) => void; onBack: () => void }) {
  const [check, setCheck] = useState<{ id: string; phone: string } | null>(null)
  const onDone = useCallback((id: string, phone: string) => setCheck({ id, phone }), [])
  const [password, setPassword] = useState('')
  const setup = useMutation({
    mutationFn: () =>
      adminApi<AccessToken>('/admin/auth/setup', { method: 'POST', body: { phone_check: check?.id, password }, auth: false }),
    onSuccess: onLoggedIn,
  })

  if (check === null) {
    return (
      <TelegramStep
        title="First time here"
        hint="Only numbers set as admins on Render."
        onDone={onDone}
        footer={
          <button type="button" onClick={onBack} className="text-sm font-medium text-navy-700 link">
            Back to Log in
          </button>
        }
      />
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setup.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h2 className="font-semibold text-slate-900">Set your admin password</h2>
        <p className="text-sm text-slate-500 tabular-nums">{formatPhone(check.phone)}, confirmed in Telegram.</p>
      </div>
      <Field label="Password" hint="At least 8 characters.">
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
      </Field>
      <ErrorMessage error={setup.error} />
      <Button type="submit" size="lg" loading={setup.isPending} disabled={password.length < 8} className="w-full">
        Save and log in
      </Button>
    </form>
  )
}

/** Open Oak's bot, share the phone, come back: `onDone` once the bot has
 * the number. */
function TelegramStep({
  title,
  hint = "Share your phone with Oak's bot. This page goes on by itself.",
  onDone,
  working = false,
  error = null,
  onRetry,
  footer,
}: {
  title: string
  hint?: string
  onDone: (checkId: string, phone: string) => void
  working?: boolean
  error?: unknown
  onRetry?: () => void
  footer: ReactNode
}) {
  const { check, created, read, done, opened, setOpened, startOver, expired } = usePhoneCheck()
  const doneId = done?.id
  const donePhone = done?.phone
  // Once per finished check (a refetch brings the same one back).
  useEffect(() => {
    if (doneId && donePhone) onDone(doneId, donePhone)
  }, [doneId, donePhone, onDone])

  function again() {
    onRetry?.()
    startOver()
  }

  const problem = error ?? created.error ?? (expired ? read.error : null)
  return (
    <div className="space-y-4 text-center">
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{hint}</p>
      </div>
      {problem ? (
        <div className="space-y-3 text-left">
          <ErrorMessage error={problem} />
          <Button variant="secondary" icon={RotateCcw} onClick={again} className="w-full">
            Try again
          </Button>
        </div>
      ) : done || working ? (
        <p role="status" className="flex min-h-12 items-center justify-center gap-2 text-sm font-medium text-slate-700">
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
          Logging in…
        </p>
      ) : (
        <div>
          <a
            href={check?.telegram_url}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!check}
            onClick={() => setOpened(true)}
            className={`${buttonClass(opened ? 'secondary' : 'primary', 'lg')} w-full ${check ? '' : 'pointer-events-none opacity-50'}`}
          >
            <Send aria-hidden className="size-4" />
            Open Telegram
          </a>
          <p aria-live="polite" className="mt-2 text-xs text-slate-500">
            {opened ? 'Waiting for Telegram…' : ' '}
          </p>
        </div>
      )}
      {footer}
    </div>
  )
}
