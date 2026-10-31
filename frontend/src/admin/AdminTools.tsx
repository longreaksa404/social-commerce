import { Check, Copy, FlaskConical } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, ErrorMessage, PageHeader } from '../components/ui.tsx'
import { errorText } from '../lib/errors.ts'
import type { AdminShop } from '../lib/types.ts'
import { useAdminShops, useMakeTestShop, useSetShopOpen } from './queries.ts'
import { ago } from './shared.ts'
import { Sheet } from './ui.tsx'

// A test shop logs in with an email like this (services/admin_tools.py).
const isTest = (shop: AdminShop) => /^test-.*@example\.com$/.test(shop.login)

/** /admin/tools: helpers for the admin (01_PRODUCT.md §22.11, "Log and
 * tools"). A test shop in one tap (part 29), open at once, with a login to
 * copy; the open test shops, each closed in one tap. */
export function AdminTools() {
  return (
    <>
      <title>Tools · Oak Order admin</title>
      <PageHeader title="Tools" />
      <div className="max-w-3xl space-y-8">
        <TestShops />
      </div>
    </>
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
