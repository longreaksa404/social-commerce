import { Check, Copy } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, ErrorMessage, ErrorState, Field, Input, Skeleton } from '../components/ui.tsx'
import { ApiError } from '../lib/api.ts'
import { errorText } from '../lib/errors.ts'
import type { AdminSeller } from '../lib/types.ts'
import { PhoneBar } from './AdminHeader.tsx'
import { useListParams } from './listParams.ts'
import { usePasswordAgain } from './usePasswordAgain.tsx'
import { useAdminPerson, usePersonAction } from './queries.ts'
import { ago, initials, loginOf } from './shared.ts'
import { Sheet } from './ui.tsx'

const PROVIDER = { google: 'Google', facebook: 'Facebook' } as const

/** One login (founder's pick 8A, 2026-10-28): who it is and how they log
 * in, before changing anything; then the help a seller asks for, a row
 * each: New password (shown once), Log out every phone, Change login
 * phone; Remove beside a Google or Facebook login. New password, a new
 * phone and Remove ask for the admin's password again (usePasswordAgain). */
export function AdminPerson({ sellerId }: { sellerId: string }) {
  const person = useAdminPerson(sellerId)
  const { listSearch } = useListParams()
  return (
    <div className="min-w-0">
      <PhoneBar back={`/admin/people${listSearch}`} title={person.data?.name ?? 'Person'} sub={person.data ? `${person.data.role === 'owner' ? 'Owner' : 'Staff'} · ${person.data.shop}` : undefined} />
      {person.isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : person.error ? (
        <ErrorState error={person.error} onRetry={() => person.refetch()} />
      ) : (
        <>
          <title>{`${person.data.name} · Oak Order admin`}</title>
          <Person person={person.data} />
        </>
      )}
    </div>
  )
}

/** A card with its title (pick 7A): "Logs in with" and "Help" side by
 * side once the page is wide enough. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`${cardClass} min-w-0`}>
      <h2 className="px-4 pt-3 pb-1 text-sm font-semibold text-slate-900">{title}</h2>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </section>
  )
}

/** One help action: what it does, in a line, before the button. */
function HelpAction({ label, what, button, onClick }: { label: string; what: ReactNode; button: string; onClick: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-900">{label}</span>
        <span className="block text-slate-500">{what}</span>
      </span>
      <Button variant="secondary" onClick={onClick} className="shrink-0">
        {button}
      </Button>
    </li>
  )
}

function Person({ person }: { person: AdminSeller }) {
  const { confirm, toast } = useFeedback()
  const action = usePersonAction(person.id)
  const { guard, sheet } = usePasswordAgain()
  const [password, setPassword] = useState<string | null>(null)
  const [changingPhone, setChangingPhone] = useState(false)
  const first = person.name.split(/\s+/)[0]
  const telegram = person.role === 'owner' && person.phone !== null

  async function run<T>(task: () => Promise<T>): Promise<T | null> {
    try {
      return await guard(task)
    } catch (error) {
      toast(errorText(error), 'error')
      return null
    }
  }

  async function newPassword() {
    const ok = await confirm({
      title: `New password for ${person.name}?`,
      message: "Every phone on this login is logged out. You'll see it once.",
      confirmLabel: 'Make new password',
    })
    if (!ok) return
    const made = await run(() => action.mutateAsync({ kind: 'password' }))
    if (made && 'password' in made) setPassword(made.password)
  }

  async function logOutAll() {
    const ok = await confirm({
      title: `Log out every phone of ${person.name}?`,
      message: 'They log in again with their password.',
      confirmLabel: 'Log out every phone',
    })
    if (!ok) return
    if (await run(() => action.mutateAsync({ kind: 'logout' }))) toast('Every phone logged out · in the log')
  }

  async function remove(provider: 'google' | 'facebook', label: string | null) {
    const ok = await confirm({
      title: `Remove ${first}'s ${PROVIDER[provider]} login?`,
      message: `${label ?? PROVIDER[provider]} stops logging in to ${person.shop}. Their phone login stays.`,
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    if (await run(() => action.mutateAsync({ kind: 'remove', provider }))) toast(`${PROVIDER[provider]} login removed · in the log`)
  }

  const ways = [
    person.phone ? (person.has_password ? 'Phone and password' : 'Phone') : person.has_password ? 'Email and password' : null,
    telegram ? 'Telegram' : null,
  ].filter(Boolean)

  return (
    <>
      <div className={`${cardClass} flex items-start gap-3 p-4 sm:p-5`}>
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy-50 text-lg font-semibold text-navy-700">
          {initials(person.name)}
        </span>
        <div className="min-w-0">
          <h1 className="text-lg leading-snug font-bold break-words text-slate-900">{person.name}</h1>
          <p className="text-sm break-words text-slate-500">
            {person.role === 'owner' ? 'Owner' : 'Staff'} ·{' '}
            <Link to={`/admin/shops/${person.store_id}`} className="font-medium text-navy-700 hover:underline">
              {person.shop}
            </Link>
            {!person.is_open && ' · closed'}
          </p>
          <p className="text-sm break-words text-slate-500 tabular-nums">
            {loginOf(person)} · {person.last_seen ? `used the app ${ago(person.last_seen)}` : 'not logged in on any phone now'}
            {person.devices > 0 && ` · logged in on ${person.devices === 1 ? '1 phone or browser' : `${person.devices} phones or browsers`}`}
          </p>
        </div>
      </div>

      <div className="@container mt-4">
        <div className="grid items-start gap-4 @2xl:grid-cols-2">
          <Panel title="Logs in with">
            {ways.length > 0 && <li className="px-4 py-3 text-sm text-slate-900">{ways.join(' · ')}</li>}
            {person.logins.map((login) => (
              <li key={login.provider} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-900">{PROVIDER[login.provider]}</span>
                  {login.label && <span className="block break-words text-slate-500">{login.label}</span>}
                </span>
                <Button variant="danger" onClick={() => remove(login.provider, login.label)}>
                  Remove
                </Button>
              </li>
            ))}
          </Panel>

          <Panel title="Help">
            <HelpAction label="New password" what="Logs out every phone. You see it once." button="Make" onClick={newPassword} />
            <HelpAction label="Log out every phone" what="They log in again with their password." button="Log out" onClick={logOutAll} />
            <HelpAction
              label="Change login phone"
              what={
                <>
                  Ask them for their shop code first: <span className="font-semibold tracking-wide text-slate-700">{person.code}</span>
                </>
              }
              button="Change"
              onClick={() => setChangingPhone(true)}
            />
          </Panel>
        </div>
      </div>

      <NewPassword name={person.name} password={password} onDone={() => setPassword(null)} />
      <ChangePhone person={person} open={changingPhone} onClose={() => setChangingPhone(false)} run={run} />
      {sheet}
    </>
  )
}

/** The new password, once, to send on Telegram or read out on a call. */
function NewPassword({ name, password, onDone }: { name: string; password: string | null; onDone: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      // No clipboard (an old browser): it's on screen to read out.
    }
  }

  function done() {
    setCopied(false)
    onDone()
  }

  return (
    <Sheet open={password !== null} onClose={done} title={`New password for ${name}`}>
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3.5 text-center text-2xl font-semibold tracking-wide text-slate-900 select-all">{password}</p>
      <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy} className="mt-3 w-full">
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <p className="mt-3 text-sm text-slate-600">Shown once. Send it on Telegram or read it on a call.</p>
      <Button onClick={done} className="mt-5 w-full">
        Done
      </Button>
    </Sheet>
  )
}

/** A new login number (a lost SIM): ask for their shop code first. */
function ChangePhone({
  person,
  open,
  onClose,
  run,
}: {
  person: AdminSeller
  open: boolean
  onClose: () => void
  run: <T>(task: () => Promise<T>) => Promise<T | null>
}) {
  const { toast } = useFeedback()
  const action = usePersonAction(person.id)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<unknown>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    // Their typing mistakes show in the box; anything else as a toast.
    const changed = await run(async () => {
      try {
        return await action.mutateAsync({ kind: 'phone', phone })
      } catch (err) {
        if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
          setError(err)
          return null
        }
        throw err
      }
    })
    if (changed) {
      toast('Login phone changed · in the log')
      setPhone('')
      onClose()
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`New login phone for ${person.name}`}>
      <form onSubmit={submit}>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ask for their shop code first: <span className="font-semibold tracking-wide text-slate-900">{person.code}</span>
        </p>
        <Field label="New phone number" className="mt-4">
          <Input type="tel" inputMode="tel" autoComplete="off" required placeholder={person.phone ?? '012 345 678'} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <ErrorMessage error={error} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={action.isPending} disabled={!phone.trim()}>
            Change phone
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
