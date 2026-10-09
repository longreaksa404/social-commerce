import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, type FormEvent } from 'react'
import { CircleCheck } from 'lucide-react'
import { GoogleButton } from '../../auth/GoogleButton.tsx'
import { PhoneCheck } from '../../auth/PhoneCheck.tsx'
import { useFeedback } from '../../components/feedback.ts'
import { Button, ErrorMessage, ErrorState, Field, Input, PasswordInput, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api, saveTokens, type AccessToken } from '../../lib/api.ts'
import { fieldError, formError } from '../../lib/errors.ts'
import { GOOGLE_CLIENT_ID } from '../../lib/google.ts'
import { formatPhone } from '../../lib/orders.ts'
import type { Account, PhoneCheck as PhoneCheckState } from '../../lib/types.ts'
import { keys, useAccount } from '../queries.ts'
import { useUnsavedChanges } from '../useUnsavedChanges.ts'

/** Settings → Your account: the person's own name, the phone number they
 * log in with (changed through Telegram, like at sign-up), and their
 * password. Not the store's settings. */
export function AccountPage() {
  const account = useAccount()
  if (account.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />
  if (account.error) return <ErrorState error={account.error} onRetry={() => account.refetch()} />
  return (
    <div className="space-y-4">
      <DetailsForm account={account.data} />
      <LoginPhone account={account.data} />
      <GoogleLogin account={account.data} />
      <PasswordForm login={account.data.phone ?? account.data.email ?? ''} hasPassword={account.data.has_password} />
    </div>
  )
}

function DetailsForm({ account }: { account: Account }) {
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [name, setName] = useState(account.full_name)
  const t = useT()
  const s = t.settings
  const dirty = name.trim() !== account.full_name
  useUnsavedChanges(dirty)

  const save = useMutation({
    mutationFn: () => api<Account>('/seller/account', { method: 'PATCH', body: { full_name: name.trim() } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.account, updated)
      setName(updated.full_name)
      toast(s.detailsSaved)
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <Section title={s.yourDetails}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={s.yourName} error={fieldError(save.error, 'full_name')}>
          <Input required maxLength={100} autoComplete="name" autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {account.email && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">{s.loginEmail}</p>
            <p className="text-slate-900">{account.email}</p>
          </div>
        )}
        <ErrorMessage error={formError(save.error, ['full_name'])} />
        <Button type="submit" loading={save.isPending} disabled={!dirty} className="w-full sm:w-auto">
          {t.common.save}
        </Button>
      </form>
    </Section>
  )
}

/** The login number. A new one is shared with the bot like at sign-up,
 * then saved at once. */
function LoginPhone({ account }: { account: Account }) {
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [changing, setChanging] = useState(false)
  const [check, setCheck] = useState<PhoneCheckState | null>(null)
  const t = useT()
  const s = t.settings

  const save = useMutation({
    mutationFn: (checkId: string) =>
      api<Account>('/seller/account/phone', { method: 'POST', body: { phone_check: checkId } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.account, updated)
      setChanging(false)
      setCheck(null)
      toast(s.phoneChanged)
    },
  })
  const { mutate } = save
  const takenByOther = check !== null && check.taken && check.phone !== account.phone

  const onCheck = useCallback(
    (done: PhoneCheckState | null) => {
      setCheck(done)
      if (!done) return
      if (done.phone === account.phone) setChanging(false) // the same number: nothing to do
      else if (!done.taken) mutate(done.id)
    },
    [account.phone, mutate],
  )

  return (
    <Section title={s.loginPhone}>
      <div className="space-y-4">
        {account.phone ? (
          <p className="font-semibold text-slate-900 tabular-nums">{formatPhone(account.phone)}</p>
        ) : (
          <p className="text-sm leading-6 text-slate-500">{s.noLoginPhone}</p>
        )}
        {changing ? (
          <PhoneCheck
            label={s.newPhone}
            onChange={onCheck}
            taken={takenByOther && <p className="text-sm text-red-600">{s.phoneTakenByOther}</p>}
          />
        ) : (
          <Button variant="secondary" onClick={() => setChanging(true)} className="w-full sm:w-auto">
            {account.phone ? s.changePhone : s.addPhone}
          </Button>
        )}
        <ErrorMessage error={save.error} />
      </div>
    </Section>
  )
}

/** "Continue with Google" for this account: shows which Google account
 * logs in to it, and connects one (or another one). Hidden when Google
 * sign-in isn't set up. */
function GoogleLogin({ account }: { account: Account }) {
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const s = useT().settings
  const connect = useMutation({
    mutationFn: (credential: string) =>
      api<Account>('/seller/account/google', { method: 'POST', body: { credential } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.account, updated)
      toast(s.googleConnected)
    },
  })
  const { mutate } = connect

  if (!GOOGLE_CLIENT_ID) return null
  return (
    <Section title={s.google} description={account.google_connected ? s.googleOn : s.googleOff}>
      <div className="space-y-3">
        {account.google_connected && (
          <p className="flex items-center gap-2 font-medium text-slate-900">
            <CircleCheck aria-hidden className="size-5 text-emerald-600" />
            {account.google_email ?? s.googleAccount}
          </p>
        )}
        {account.google_connected && <p className="text-xs text-slate-500">{s.googleSwitch}</p>}
        <GoogleButton onCredential={mutate} />
        <ErrorMessage error={connect.error} />
      </div>
    </Section>
  )
}

/** Change the password, or (an account made with Google) add a first one,
 * to log in with the phone number too. */
function PasswordForm({ login, hasPassword }: { login: string; hasPassword: boolean }) {
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const t = useT()
  const s = t.settings

  const change = useMutation({
    mutationFn: () =>
      api<AccessToken>('/seller/account/password', {
        method: 'POST',
        body: hasPassword ? { current_password: current, new_password: next } : { new_password: next },
      }),
    onSuccess: (token) => {
      // Every other session ended; this one carries on with a new token.
      saveTokens(token)
      setCurrent('')
      setNext('')
      toast(hasPassword ? s.passwordChanged : s.passwordAdded)
      if (!hasPassword) queryClient.invalidateQueries({ queryKey: keys.account })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    change.mutate()
  }

  return (
    <Section
      title={hasPassword ? s.changePassword : s.addPassword}
      description={hasPassword ? s.changePasswordHint : s.addPasswordHint}
    >
      <form onSubmit={submit} className="space-y-4">
        {/* For password managers: whose password this is. */}
        <input type="text" autoComplete="username" value={login} hidden readOnly />
        {hasPassword && (
          <Field label={s.currentPassword} error={fieldError(change.error, 'current_password')}>
            <PasswordInput required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
        )}
        <Field
          label={s.newPassword}
          error={fieldError(change.error, 'new_password')}
          hint={t.auth.register.passwordHint}
        >
          <PasswordInput
            required
            minLength={8}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <ErrorMessage error={formError(change.error, ['current_password', 'new_password'])} />
        <Button type="submit" variant="secondary" loading={change.isPending} className="w-full sm:w-auto">
          {hasPassword ? s.changePassword : s.addPassword}
        </Button>
      </form>
    </Section>
  )
}
