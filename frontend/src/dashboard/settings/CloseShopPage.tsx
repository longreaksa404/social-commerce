import { useMutation } from '@tanstack/react-query'
import { ChevronRight, DoorClosed } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth.ts'
import { OnlyTheSeller } from '../ActingBar.tsx'
import { useFeedback } from '../../components/feedback.ts'
import { Button, Card, ErrorMessage, Field, PasswordInput, Section } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { fieldError, formError } from '../../lib/errors.ts'
import { useAccount } from '../queries.ts'

/** Settings → Close shop (founder's choice 2026-10-08): the shop link and
 * logins stop at once; nothing is erased. Oak Order opens it again, or
 * erases it for good, when the seller asks (docs/ADMIN.md). */
export function CloseShopPage() {
  if (useAuth().acting) return <OnlyTheSeller>Only the seller can close their shop, not Oak Order.</OnlyTheSeller>
  return <CloseShop />
}

function CloseShop() {
  const { logout } = useAuth()
  const { toast, confirm } = useFeedback()
  const [password, setPassword] = useState('')
  // An account made with Google may have no password: the confirm is enough.
  const needsPassword = useAccount().data?.has_password ?? true
  const s = useT().settings

  const close = useMutation({
    mutationFn: () =>
      api('/seller/account/close-shop', { method: 'POST', body: needsPassword ? { password } : {} }),
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
        {needsPassword && (
          <>
            {/* For password managers: whose password this is. */}
            <input type="text" autoComplete="username" hidden readOnly />
            <Field label={s.closeShopPassword} error={fieldError(close.error, 'password')}>
              <PasswordInput required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </>
        )}
        <ErrorMessage error={formError(close.error, ['password'])} />
        <Button type="submit" variant="danger" icon={DoorClosed} loading={close.isPending} className="w-full sm:w-auto">
          {s.closeShopButton}
        </Button>
      </Section>
    </form>
  )
}

/** At the bottom of Settings → Shop (settings check, founder 2026-10-19:
 * related things on one page): opens the page above, which explains and
 * asks for the password. Red words, plain card (red as text only). */
export function CloseShopRow() {
  const s = useT().settings
  if (useAuth().acting) return null
  return (
    <Card>
      <Link
        to="/dashboard/settings/close"
        className="flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 active:bg-slate-100"
      >
        <DoorClosed aria-hidden className="size-5 shrink-0 text-red-600" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-red-600">{s.closeShop}</span>
          <span className="mt-0.5 block text-sm text-slate-500">{s.menu.closeHint}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
      </Link>
    </Card>
  )
}
