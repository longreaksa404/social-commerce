import { Check, Copy, FlaskConical, Send } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, ErrorMessage, Field, PageHeader, Skeleton, TextArea } from '../components/ui.tsx'
import { errorText } from '../lib/errors.ts'
import { formatPhone } from '../lib/orders.ts'
import type { AdminShop } from '../lib/types.ts'
import { useAdminShops, useBroadcast, useMakeTestShop, useSetShopOpen, useSignups } from './queries.ts'
import { ago, initials } from './shared.ts'
import { Chip, Sheet } from './ui.tsx'
import { usePasswordAgain } from './usePasswordAgain.tsx'

// A test shop logs in with an email like this (services/admin_tools.py).
const isTest = (shop: AdminShop) => /^test-.*@example\.com$/.test(shop.login)

/** /admin/tools: helpers for the admin (01_PRODUCT.md §22.11, "Log and
 * tools"): a Telegram message to every shop, sent to the admin first (part
 * 30, pick 15A); the sign-ups that didn't finish (part 31); a test shop in
 * one tap (part 29), open at once, with a login to copy, and the open test
 * shops, each closed in one tap. */
export function AdminTools() {
  return (
    <>
      <title>Tools · Oak Order admin</title>
      <PageHeader title="Tools" />
      <div className="max-w-3xl space-y-8">
        <Broadcast />
        <Signups />
        <TestShops />
      </div>
    </>
  )
}

type To = 'all' | 'trial' | 'paying'
const TO: Record<To, string> = { all: 'All open shops', trial: 'On trial', paying: 'Paying' }

/** Part 30 (pick 15A): write it once, read it in your own Telegram, then
 * Send to N shops opens; it asks first and for the password again. A
 * change after the test needs a new test. */
function Broadcast() {
  const { toast } = useFeedback()
  const shops = useAdminShops()
  const send = useBroadcast()
  const { guard, sheet } = usePasswordAgain()
  const [text, setText] = useState('')
  const [to, setTo] = useState<To>('all')
  const [tested, setTested] = useState<{ text: string; at: string } | null>(null)
  const [asking, setAsking] = useState(false)
  const reach = (which: To) =>
    (shops.data ?? []).filter(
      (s) => s.is_open && s.telegram && (which === 'all' || (which === 'trial' ? s.on_trial && s.stage !== 'setup' : !s.on_trial)),
    ).length
  const count = reach(to)
  const ready = tested !== null && tested.text === text.trim()
  const shopsWord = count === 1 ? '1 shop' : `${count} shops`

  function test() {
    send.mutate(
      { text: text.trim(), to: 'me' },
      {
        onSuccess: ({ sent }) => {
          if (sent === 0) return toast("Your Telegram didn't get it: log in to the admin with Telegram once", 'error')
          setTested({ text: text.trim(), at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) })
        },
        onError: (error) => toast(errorText(error), 'error'),
      },
    )
  }

  async function sendAll() {
    try {
      const done = await guard(() => send.mutateAsync({ text: text.trim(), to }))
      if (!done) return
      setAsking(false)
      setText('')
      setTested(null)
      toast(`Sent to ${done.sent === 1 ? '1 shop' : `${done.sent} shops`}${done.failed ? ` · ${done.failed} failed` : ''} · in the log`)
    } catch (error) {
      toast(errorText(error), 'error')
    }
  }

  return (
    <Group title="Message every shop">
      <div className={`${cardClass} space-y-4 p-4 sm:p-5`}>
        <Field label="Message">
          <TextArea rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Oak Order is down for 10 minutes tonight at 22:00." />
        </Field>
        <div role="group" aria-label="To" className="flex flex-wrap gap-2">
          {(Object.keys(TO) as To[]).map((key) => (
            <Chip key={key} on={to === key} onClick={() => setTo(key)}>
              {TO[key]} {reach(key)}
            </Chip>
          ))}
        </div>
        {text.trim() && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500">In Telegram</p>
            <div className="rounded-2xl bg-[#dbe4ee] p-3 dark:bg-slate-800">
              <div className="max-w-[88%] rounded-xl rounded-bl-sm bg-surface px-3 py-2 text-sm shadow-xs">
                <p className="font-semibold text-slate-900">📣 Oak Order</p>
                <p className="whitespace-pre-wrap text-slate-900">{text.trim()}</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" loading={send.isPending && !asking} disabled={!text.trim()} onClick={test}>
            <Send aria-hidden className="size-4" />
            Send to me first
          </Button>
          {ready && (
            <span className="text-sm font-semibold text-emerald-700">
              <Check aria-hidden className="mr-1 inline size-4" />
              Sent to you at {tested.at}
            </span>
          )}
          <Button className="sm:ml-auto" disabled={!ready || count === 0} onClick={() => setAsking(true)}>
            Send to {shopsWord}
          </Button>
        </div>
        {!ready && text.trim() && <p className="text-xs text-slate-500">Send it to yourself first to see it in Telegram.</p>}
      </div>
      <Sheet open={asking} onClose={() => setAsking(false)} title={`Send to ${shopsWord}?`}>
        <p className="mt-2 text-sm leading-6 text-slate-600">Each shop's Telegram gets it now. It can't be taken back.</p>
        <ErrorMessage error={send.error} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setAsking(false)}>
            Cancel
          </Button>
          <Button loading={send.isPending} onClick={sendAll}>
            Send
          </Button>
        </div>
      </Sheet>
      {sheet}
    </Group>
  )
}

/** Part 31: numbers checked in Telegram that never made a shop, to call
 * and help them finish. Kept 30 days. */
function Signups() {
  const signups = useSignups()
  return (
    <Group title="Sign-ups that didn't finish">
      <p className="-mt-1 mb-2 text-xs text-slate-500 sm:px-1">Kept 30 days.</p>
      {signups.isPending ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : (signups.data ?? []).length === 0 ? (
        <p className={`${cardClass} px-4 py-3 text-sm text-slate-500`}>None in the last 30 days.</p>
      ) : (
        <ul className={`${cardClass} divide-y divide-slate-100`}>
          {signups.data!.map((signup) => (
            <li key={signup.phone} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-navy-700">
                {signup.telegram_name ? initials(signup.telegram_name) : '?'}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-medium ${signup.telegram_name ? 'text-slate-900' : 'text-slate-500'}`}>
                  {signup.telegram_name ?? 'No Telegram name'}
                </span>
                <span className="block text-slate-500 tabular-nums">
                  {formatPhone(signup.phone)} · {ago(signup.checked_at)}
                </span>
              </span>
              <CopyPhone phone={signup.phone} />
            </li>
          ))}
        </ul>
      )}
    </Group>
  )
}

function CopyPhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(phone)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // No clipboard: the number is on screen.
        }
      }}
    >
      {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

function TestShops() {
  const make = useMakeTestShop()
  const shops = useAdminShops()
  const [made, setMade] = useState<{ store_id: string; shop: string; login: string; password: string } | null>(null)
  const open = (shops.data ?? []).filter((s) => isTest(s) && s.is_open).sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <Group title="Test shop">
      <div className={`${cardClass} flex flex-wrap items-center gap-3 p-4 sm:p-5`}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
          <FlaskConical aria-hidden className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-sm text-slate-600">A shop to try things on, open at once.</p>
        <Button loading={make.isPending} onClick={() => make.mutate(undefined, { onSuccess: setMade })}>
          Make a test shop
        </Button>
        <div className="w-full">
          <ErrorMessage error={make.error} />
        </div>
      </div>
      {open.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-semibold text-slate-500 sm:px-1">Open test shops · {open.length}</h3>
          <ul className={`${cardClass} divide-y divide-slate-100`}>
            {open.map((shop) => (
              <TestShopRow key={shop.id} shop={shop} />
            ))}
          </ul>
        </>
      )}
      <Sheet open={made !== null} onClose={() => setMade(null)} title={made?.shop ?? ''}>
        {made && (
          <>
            <p className="mt-2 text-sm text-slate-600">Its login. The password shows only now.</p>
            <dl className="mt-4 space-y-3">
              <Secret label="Login" value={made.login} />
              <Secret label="Password" value={made.password} />
            </dl>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link to={`/admin/shops/${made.store_id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-navy-700 hover:bg-slate-50">
                Its page
              </Link>
              <Button onClick={() => setMade(null)}>Done</Button>
            </div>
          </>
        )}
      </Sheet>
    </Group>
  )
}

function Secret({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="truncate text-base font-semibold tracking-wide text-slate-900 select-all">{value}</dd>
      </div>
      <button
        type="button"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            // No clipboard: it's on screen.
          }
        }}
        className="inline-flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
      >
        {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      </button>
    </div>
  )
}

/** An open test shop: Close in one tap, after asking. */
function TestShopRow({ shop }: { shop: AdminShop }) {
  const { confirm, toast } = useFeedback()
  const close = useSetShopOpen(shop.id)

  async function ask() {
    const ok = await confirm({ title: `Close ${shop.name}?`, message: 'Its link and login stop. Erase it from its page later.', confirmLabel: 'Close' })
    if (!ok) return
    close.mutate({ open: false, reason: 'Test shop' }, { onSuccess: () => toast(`${shop.name} closed`), onError: (error) => toast(errorText(error), 'error') })
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <Link to={`/admin/shops/${shop.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900 hover:underline">{shop.name}</span>
        <span className="block truncate text-slate-500">
          {shop.login} · made {ago(shop.created_at)}
        </span>
      </Link>
      <Button variant="secondary" loading={close.isPending} onClick={ask}>
        Close
      </Button>
    </li>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">{title}</h2>
      {children}
    </section>
  )
}
