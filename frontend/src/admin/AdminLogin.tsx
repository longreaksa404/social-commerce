import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { usePhoneCheck } from '../auth/usePhoneCheck.ts'
import { OakMark } from '../components/OakMark.tsx'
import { buttonClass } from '../components/styles.ts'
import { Button, ErrorMessage, Field, PasswordInput } from '../components/ui.tsx'
import { adminApi, ApiError, type AccessToken } from '../lib/api.ts'
import { formatPhone } from '../lib/orders.ts'
import { useAdminSession } from './useAdminSession.ts'

/** Telegram proved an admin's number; the password comes next. `new`: no
 * account yet, so the password is a new one. */
type Step = { step_token: string; phone: string; new: boolean }

const TOO_LONG = 'That took too long. Start again.'

/** /admin/login: the admin's own login (01 §22.11, English only, D5A):
 * Telegram first (the admin's number shared with Oak's bot, as at
 * sign-up), then only the password (founder, 2026-11-06: no phone to
 * type). The first time, the password is a new one. */
export function AdminLogin() {
  const { status, startSession } = useAdminSession()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from
  const [step, setStep] = useState<Step | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()

  if (status === 'in') return <Navigate to={from?.startsWith('/admin') ? from : '/admin'} replace />

  function loggedIn(token: AccessToken) {
    startSession(token)
    navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true })
  }

  // Back to Telegram with a new phone check: the one used is gone on the server.
  function startOver(message: string | null) {
    queryClient.removeQueries({ queryKey: ['phone-check'] })
    setNotice(message)
    setStep(null)
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
        {step === null ? (
          <TelegramLogin
            notice={notice}
            onStep={(next) => {
              setNotice(null)
              setStep(next)
            }}
          />
        ) : (
          <PasswordStep step={step} onLoggedIn={loggedIn} onStartOver={startOver} />
        )}
      </div>
    </main>
  )
}

/** Step 1: the admin's number from Telegram. Only numbers set as admins
 * on Render get past it. */
function TelegramLogin({ notice, onStep }: { notice: string | null; onStep: (step: Step) => void }) {
  const telegram = useMutation({
    mutationFn: (phoneCheck: string) =>
      adminApi<Step>('/admin/auth/telegram', { method: 'POST', body: { phone_check: phoneCheck }, auth: false }),
    onSuccess: onStep,
  })
  const { mutate } = telegram
  const onDone = useCallback((checkId: string) => mutate(checkId), [mutate])
  return (
    <TelegramStep
      notice={notice}
      onDone={onDone}
      working={telegram.isPending}
      error={telegram.error}
      onRetry={() => telegram.reset()}
    />
  )
}

/** Step 2: the password, or a new one the first time. A wrong one can be
 * typed again while the step lasts (5 minutes). */
function PasswordStep({
  step,
  onLoggedIn,
  onStartOver,
}: {
  step: Step
  onLoggedIn: (token: AccessToken) => void
  onStartOver: (message: string | null) => void
}) {
  const [password, setPassword] = useState('')
  const send = useMutation({
    mutationFn: () =>
      adminApi<AccessToken>(step.new ? '/admin/auth/setup' : '/admin/auth/login', {
        method: 'POST',
        body: { step_token: step.step_token, password },
        auth: false,
      }),
    onSuccess: onLoggedIn,
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') onStartOver(TOO_LONG)
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    send.mutate()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h2 className="font-semibold text-slate-900">{step.new ? 'Set your admin password' : 'Enter your password'}</h2>
        <p className="text-sm text-slate-500 tabular-nums">{formatPhone(step.phone)}, confirmed in Telegram.</p>
      </div>
      {/* For password managers: the account the password belongs to. */}
      <input type="text" name="username" autoComplete="username" value={step.phone} readOnly hidden />
      <Field label="Password" hint={step.new ? 'At least 8 characters.' : undefined}>
        <PasswordInput
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={step.new ? 'new-password' : 'current-password'}
          minLength={step.new ? 8 : undefined}
          required
        />
      </Field>
      <ErrorMessage error={send.error} />
      <Button type="submit" size="lg" loading={send.isPending} disabled={step.new ? password.length < 8 : !password} className="w-full">
        {step.new ? 'Save and log in' : 'Log in'}
      </Button>
      <p className="text-center">
        <button type="button" onClick={() => onStartOver(null)} className="text-sm font-medium text-navy-700 link">
          Back
        </button>
      </p>
    </form>
  )
}

/** Open Oak's bot, share the phone, come back: `onDone` once the bot has
 * the number. */
function TelegramStep({
  notice,
  onDone,
  working,
  error,
  onRetry,
}: {
  notice: string | null
  onDone: (checkId: string) => void
  working: boolean
  error: unknown
  onRetry: () => void
}) {
  const { check, created, read, done, opened, setOpened, startOver, expired } = usePhoneCheck()
  const doneId = done?.id
  // Once per finished check (a refetch brings the same one back).
  useEffect(() => {
    if (doneId) onDone(doneId)
  }, [doneId, onDone])

  function again() {
    onRetry()
    startOver()
  }

  const problem = error ?? created.error ?? (expired ? read.error : null)
  return (
    <div className="space-y-4 text-center">
      {notice && <p className="text-sm font-medium text-amber-700">{notice}</p>}
      <div>
        <h2 className="font-semibold text-slate-900">Log in</h2>
        <p className="mt-1 text-sm text-slate-500">Share your phone with Oak's bot. This page goes on by itself.</p>
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
          Checking your number…
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
    </div>
  )
}
