import { useState, type FormEvent } from 'react'
import { Button, ErrorMessage, Field, PasswordInput } from '../components/ui.tsx'
import { adminApi } from '../lib/api.ts'
import { Sheet } from './ui.tsx'

/** The admin's password, typed again (usePasswordAgain.tsx). */
export function PasswordSheet({ open, onDone }: { open: boolean; onDone: (ok: boolean) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminApi('/admin/auth/password', { method: 'POST', body: { password } })
      setPassword('')
      onDone(true)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    setPassword('')
    setError(null)
    onDone(false)
  }

  return (
    <Sheet open={open} onClose={cancel} title="Your admin password">
      <form onSubmit={submit}>
        <p className="mt-2 text-sm leading-6 text-slate-600">Asked again for this, then not for 10 minutes.</p>
        <Field label="Password" className="mt-4">
          <PasswordInput autoFocus autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorMessage error={error} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!password}>
            Continue
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
