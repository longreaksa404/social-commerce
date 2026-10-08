import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useFeedback } from '../../components/feedback.ts'
import { Button, ErrorMessage, ErrorState, Field, Input, PasswordInput, Section, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api, saveTokens, type TokenPair } from '../../lib/api.ts'
import { fieldError, formError } from '../../lib/errors.ts'
import type { Account } from '../../lib/types.ts'
import { keys, useAccount } from '../queries.ts'
import { useUnsavedChanges } from '../useUnsavedChanges.ts'

/** Settings → Your account: the person's own name, phone and login email,
 * and their password. Not the store's settings. */
export function AccountPage() {
  const account = useAccount()
  if (account.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />
  if (account.error) return <ErrorState error={account.error} onRetry={() => account.refetch()} />
  return (
    <div className="space-y-4">
      <DetailsForm account={account.data} />
      <PasswordForm email={account.data.email} />
    </div>
  )
}

const DETAIL_FIELDS = ['full_name', 'phone', 'email'] as const

function DetailsForm({ account }: { account: Account }) {
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [form, setForm] = useState(account)
  const t = useT()
  const s = t.settings
  const body = { full_name: form.full_name.trim(), phone: form.phone.trim(), email: form.email.trim() }
  const dirty = DETAIL_FIELDS.some((field) => body[field] !== account[field])
  useUnsavedChanges(dirty)

  const save = useMutation({
    mutationFn: () => api<Account>('/seller/account', { method: 'PATCH', body }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.account, updated)
      setForm(updated)
      toast(s.detailsSaved)
    },
  })
  const set = (field: keyof Account) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <Section title={s.yourDetails}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={s.yourName} error={fieldError(save.error, 'full_name')}>
          <Input required maxLength={100} autoComplete="name" autoCapitalize="words" value={form.full_name} onChange={set('full_name')} />
        </Field>
        <Field label={s.yourPhone} error={fieldError(save.error, 'phone')}>
          <Input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="012 345 678"
            value={form.phone}
            onChange={set('phone')}
          />
        </Field>
        <Field label={t.auth.email} error={fieldError(save.error, 'email')} hint={s.loginEmailHint}>
          <Input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={form.email}
            onChange={set('email')}
          />
        </Field>
        <ErrorMessage error={formError(save.error, [...DETAIL_FIELDS])} />
        <Button type="submit" loading={save.isPending} disabled={!dirty} className="w-full sm:w-auto">
          {t.common.save}
        </Button>
      </form>
    </Section>
  )
}

function PasswordForm({ email }: { email: string }) {
  const { toast } = useFeedback()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const t = useT()
  const s = t.settings

  const change = useMutation({
    mutationFn: () =>
      api<TokenPair>('/seller/account/password', {
        method: 'POST',
        body: { current_password: current, new_password: next },
      }),
    onSuccess: (pair) => {
      // Every other session ended; this one carries on with the new pair.
      saveTokens(pair)
      setCurrent('')
      setNext('')
      toast(s.passwordChanged)
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    change.mutate()
  }

  return (
    <Section title={s.changePassword} description={s.changePasswordHint}>
      <form onSubmit={submit} className="space-y-4">
        {/* For password managers: whose password this is. */}
        <input type="email" autoComplete="username" value={email} hidden readOnly />
        <Field label={s.currentPassword} error={fieldError(change.error, 'current_password')}>
          <PasswordInput required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
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
        <Button
          type="submit"
          variant="secondary"
          loading={change.isPending}
          disabled={!current || !next}
          className="w-full sm:w-auto"
        >
          {s.changePassword}
        </Button>
      </form>
    </Section>
  )
}
