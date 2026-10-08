import { MessageCircle, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { buttonClass } from '../components/styles.ts'
import { Button, ErrorMessage, Field, Input, SlowNotice } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { api } from '../lib/api.ts'
import { SUPPORT_TELEGRAM, supportLink } from '../lib/support.ts'
import { AuthLayout } from './AuthLayout.tsx'

/** /forgot-password: a link to choose a new password goes to the shop's
 * Telegram chat (no email in the MVP). The API answers the same whether
 * or not the email has an account, so this page can't say which. */
export function ForgotPassword() {
  const location = useLocation()
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)
  const t = useT()
  const f = t.auth.forgot

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api('/auth/password-reset', { method: 'POST', body: { email: email.trim() }, auth: false })
      setSentTo(email.trim())
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title={sentTo ? f.sentTitle : f.title}
      subtitle={sentTo ? undefined : f.subtitle}
      footer={
        <Link to="/login" className="font-semibold text-navy-700 hover:underline">
          {f.backToLogin}
        </Link>
      }
    >
      <title>{f.title}</title>
      {sentTo ? (
        <div className="space-y-4">
          <p className="flex items-start gap-3 rounded-xl bg-navy-50 px-4 py-3.5 text-sm leading-6 text-navy-900">
            <Send aria-hidden className="mt-1 size-4 shrink-0 text-navy-700" />
            {f.sent(sentTo)}
          </p>
          <Support email={sentTo} />
          <p className="text-sm leading-6 text-slate-500">{f.staff}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label={t.auth.email}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <ErrorMessage error={error} />
          <Button type="submit" size="lg" loading={pending} className="w-full">
            {f.send}
          </Button>
          {pending && <SlowNotice />}
          <Support email={email} />
          <p className="text-sm leading-6 text-slate-500">{f.staff}</p>
        </form>
      )}
    </AuthLayout>
  )
}

/** For shops without Telegram: the founder resets it (docs/ADMIN.md). */
function Support({ email }: { email: string }) {
  const f = useT().auth.forgot
  if (!SUPPORT_TELEGRAM) return null
  return (
    <div className="border-t border-slate-200 pt-4">
      <p className="text-sm leading-6 text-slate-600">{f.noTelegram}</p>
      <a
        href={supportLink(f.supportText(email.trim() || '…'))}
        target="_blank"
        rel="noreferrer"
        className={`${buttonClass('secondary')} mt-3 w-full`}
      >
        <MessageCircle aria-hidden className="size-4" />
        {f.askSupport}
      </a>
    </div>
  )
}
