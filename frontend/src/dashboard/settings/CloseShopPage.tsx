import { useMutation } from '@tanstack/react-query'
import { DoorClosed } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { useFeedback } from '../../components/feedback.ts'
import { Button, ErrorMessage, Field, PasswordInput, Section } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { fieldError, formError } from '../../lib/errors.ts'

/** Settings → Close shop (founder's choice 2026-10-08): the shop link and
 * logins stop at once; nothing is erased. Oak Order opens it again, or
 * erases it for good, when the seller asks (docs/ADMIN.md). */
export function CloseShopPage() {
  const { logout } = useAuth()
  const { toast, confirm } = useFeedback()
  const [password, setPassword] = useState('')
  const s = useT().settings

  const close = useMutation({
    mutationFn: () => api('/seller/account/close-shop', { method: 'POST', body: { password } }),
    onSuccess: async () => {
      toast(s.shopClosed)
      await logout()
    },
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    const ok = await confirm({
      title: s.closeShopConfirmTitle,
      message: s.closeShopConfirm,
      confirmLabel: s.closeShopButton,
      danger: true,
    })
    if (ok) close.mutate()
  }

  return (
    <form onSubmit={submit}>
      <Section title={s.closeShopWhat}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
          <li>{s.closeShopLink}</li>
          <li>{s.closeShopLogout}</li>
          <li>{s.closeShopKept}</li>
        </ul>
        {/* For password managers: whose password this is. */}
        <input type="text" autoComplete="username" hidden readOnly />
        <Field label={s.closeShopPassword} error={fieldError(close.error, 'password')}>
          <PasswordInput required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorMessage error={formError(close.error, ['password'])} />
        <Button type="submit" variant="danger" icon={DoorClosed} loading={close.isPending} className="w-full sm:w-auto">
          {s.closeShopButton}
        </Button>
      </Section>
    </form>
  )
}
