import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, type FormEvent } from 'react'
import { CircleCheck } from 'lucide-react'
import { GoogleButton } from '../../auth/GoogleButton.tsx'
import { ProviderButton, ProviderLogo } from '../../auth/ProviderLogo.tsx'
import { PhoneCheck } from '../../auth/PhoneCheck.tsx'
import { useFeedback } from '../../components/feedback.ts'
import { Badge, Button, ErrorMessage, ErrorState, Field, Input, PasswordInput, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api, saveTokens, type AccessToken } from '../../lib/api.ts'
import { fieldError, formError } from '../../lib/errors.ts'
import { GOOGLE_CLIENT_ID } from '../../lib/google.ts'
import { oauthAvailable, PROVIDER_NAMES, startOAuth } from '../../lib/oauth.ts'
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
      <OtherLogins account={account.data} />
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

/** Google, Facebook and TikTok for this account: which ones log in to it,
 * and connecting one (or another account of that kind). Google's button
 * gives the token here; Facebook and TikTok go off to their page and come
 * back through /auth/<provider>/callback. Only providers that are set up;
 * nothing when none is. */
function OtherLogins({ account }: { account: Account }) {
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const t = useT()
  const s = t.settings
  const connectGoogle = useMutation({
    mutationFn: (credential: string) =>
      api<Account>('/seller/account/google', { method: 'POST', body: { credential } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.account, updated)
      toast(s.loginConnected(PROVIDER_NAMES.google))
    },
  })
  const { mutate } = connectGoogle

  const providers = (['google', 'facebook', 'tiktok'] as const).filter((p) =>
    p === 'google' ? GOOGLE_CLIENT_ID !== '' : oauthAvailable(p),
  )
  if (providers.length === 0) return null
  return (
    <Section title={s.otherLogins} description={s.otherLoginsHint}>
      <ul className="-my-2 divide-y divide-slate-100">
        {providers.map((provider) => {
          const login = account.logins.find((l) => l.provider === provider)
          const name = PROVIDER_NAMES[provider]
          return (
            <li key={provider} className="space-y-3 py-3">
              <div className="flex items-center gap-3">
                <ProviderLogo provider={provider} className="size-6" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-900">{name}</span>
                  {login && <span className="block truncate text-sm text-slate-500">{login.label ?? name}</span>}
                </span>
                {login && (
                  <Badge tone="green">
                    <CircleCheck aria-hidden className="mr-1 size-3.5" />
                    {s.connectedAccount}
                  </Badge>
                )}
              </div>
              {provider === 'google' ? (
                <GoogleButton onCredential={mutate} />
              ) : (
                <ProviderButton
                  provider={provider}
                  label={login ? s.useAnotherAccount : t.auth.social.continueWith(name)}
                  onClick={() => startOAuth(provider, 'connect')}
                />
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-3">
        <ErrorMessage error={connectGoogle.error} />
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
