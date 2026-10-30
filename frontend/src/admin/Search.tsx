import { Check, ChevronRight, Copy, Search as SearchIcon, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cardClass } from '../components/styles.ts'
import { Skeleton } from '../components/ui.tsx'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { formatPhone } from '../lib/orders.ts'
import type { AdminOrder } from '../lib/types.ts'
import { ShopLogo, StageWords } from './AdminShops.tsx'
import { useAdminCustomers, useAdminOrders, useAdminPeople, useAdminShops } from './queries.ts'
import { ago, date, initials, loginOf, useSettled } from './shared.ts'

const digitsOf = (text: string) => text.replace(/\D/g, '').replace(/^855/, '0')

/** Search results (founder's pick 10C): shops and people from the lists
 * the admin already has, customers and orders from the API. `only`: just
 * customers and orders (the Orders page). `onPick`: after a tap (closes
 * the panel). */
export function SearchResults({ q, only, onPick }: { q: string; only?: 'orders'; onPick?: () => void }) {
  const words = q.trim().toLowerCase()
  const digits = digitsOf(words)
  const shops = useAdminShops()
  const people = useAdminPeople()
  const customers = useAdminCustomers(q.trim())
  const orders = useAdminOrders(q.trim())
  if (!words) return null

  const has = (text: string | null | undefined) => (text ?? '').toLowerCase().includes(words)
  const phoneHas = (phone: string | null | undefined) => digits.length > 2 && (phone ?? '').replace(/\D/g, '').includes(digits)
  const foundShops = only ? [] : (shops.data ?? []).filter((s) => has(s.name) || has(s.code) || has(s.slug) || has(s.owner_name) || phoneHas(s.login)).slice(0, 5)
  const foundPeople = only ? [] : (people.data ?? []).filter((p) => has(p.name) || has(p.email) || phoneHas(p.phone)).slice(0, 5)
  const loading = customers.isPending && customers.fetchStatus !== 'idle'
  const nothing =
    !loading && !orders.isFetching && foundShops.length + foundPeople.length + (customers.data?.length ?? 0) + (orders.data?.length ?? 0) === 0

  return (
    <div className="space-y-5">
      {foundShops.length > 0 && (
        <Group title="Shops">
          {foundShops.map((shop) => (
            <Row key={shop.id} to={`/admin/shops/${shop.id}`} onPick={onPick} lead={<ShopLogo shop={shop} size="size-9" />}>
              <span className="block truncate font-medium text-slate-900">{shop.name}</span>
              <span className="block truncate text-slate-500">
                <span className="font-semibold tracking-wide">{shop.code}</span> · <StageWords shop={shop} />
              </span>
            </Row>
          ))}
        </Group>
      )}
      {foundPeople.length > 0 && (
        <Group title="People">
          {foundPeople.map((person) => (
            <Row key={person.id} to={`/admin/people/${person.id}`} onPick={onPick} lead={<Initials name={person.name} />}>
              <span className="block truncate font-medium text-slate-900">{person.name}</span>
              <span className="block truncate text-slate-500">
                {person.role === 'owner' ? 'Owner' : 'Staff'} · {person.shop} · {loginOf(person)}
              </span>
            </Row>
          ))}
        </Group>
      )}
      {loading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : (
        (customers.data?.length ?? 0) > 0 && (
          <Group title="Customers">
            {customers.data!.map((customer) => (
              <Row key={customer.phone} to={`/admin/customers/${encodeURIComponent(customer.phone)}`} onPick={onPick} lead={<Initials name={customer.name} />}>
                <span className="block truncate font-medium text-slate-900">{customer.name}</span>
                <span className="block truncate text-slate-500 tabular-nums">
                  {formatPhone(customer.phone)} · in {customer.shops.length === 1 ? customer.shops[0].shop : `${customer.shops.length} shops`}
                </span>
              </Row>
            ))}
          </Group>
        )
      )}
      {(orders.data?.length ?? 0) > 0 && (
        <section aria-label="Orders" className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 sm:px-1">Orders</h2>
          {orders.data!.map((order) => (
            <OrderCard key={order.id} order={order} onPick={onPick} />
          ))}
        </section>
      )}
      {nothing && <p className="text-sm text-slate-500 sm:px-1">Nothing found.</p>}
      {/^\D+$/.test(words) && <p className="text-xs text-slate-500 sm:px-1">Add a number for an order: {words.split(/\s+/)[0]} 1043.</p>}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-slate-500 sm:px-1">{title}</h2>
      <ul className={`${cardClass} divide-y divide-slate-100`}>{children}</ul>
    </section>
  )
}

function Row({ to, lead, onPick, children }: { to: string; lead: ReactNode; onPick?: () => void; children: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        onClick={onPick}
        className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 sm:[li:first-child>&]:rounded-t-2xl sm:[li:last-child>&]:rounded-b-2xl"
      >
        {lead}
        <span className="min-w-0 flex-1">{children}</span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
      </Link>
    </li>
  )
}

function Initials({ name }: { name: string }) {
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-navy-700">
      {initials(name) || '?'}
    </span>
  )
}

/** An order as the admin sees it (part 19): its three statuses, what was
 * ordered, the money and the seller to call. Look only. */
export function OrderCard({ order, onPick }: { order: AdminOrder; onPick?: () => void }) {
  const st = useT().status
  const money = (amount: string) => formatMoney(amount, order.currency)
  const payment =
    order.payment_status === 'paid'
      ? st.paymentBadge.paid
      : order.payment_status === 'failed'
        ? st.paymentBadge.failed
        : order.payment_status === 'refunded'
          ? st.paymentBadge.refunded
          : order.payment_method === 'cod'
            ? st.paymentBadge.cod
            : st.paymentBadge.unpaid
  const delivery =
    order.delivery_method === 'pickup' && (order.delivery_status === 'not_assigned' || order.delivery_status === 'delivered')
      ? st.pickup[order.delivery_status]
      : st.delivery[order.delivery_status]
  return (
    <article className={`${cardClass} divide-y divide-slate-100 text-sm`}>
      <div className="px-4 py-3">
        <p className="font-semibold text-slate-900">
          #{order.number} ·{' '}
          <Link to={`/admin/shops/${order.store_id}`} onClick={onPick} className="underline-offset-4 hover:underline">
            {order.shop}
          </Link>
        </p>
        <p className="text-slate-500 tabular-nums">
          {order.customer_name} · {formatPhone(order.customer_phone)} · {date(order.created_at)} ({ago(order.created_at)})
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3 px-4 py-3">
        <Status label="Order" value={st.order[order.status as keyof typeof st.order] ?? order.status} />
        <Status
          label="Payment"
          value={order.payment_method === 'cod' && order.payment_status === 'pending' ? payment : `${payment} · ${st.paymentMethod[order.payment_method]}`}
          tone={order.payment_status === 'paid' ? 'text-emerald-700' : undefined}
        />
        <Status label="Delivery" value={delivery} tone={order.delivery_status === 'failed' ? 'text-red-700' : undefined} />
      </dl>
      <div className="px-4 py-3">
        <p className="text-slate-900">{order.items.join(' · ')}</p>
        <p className="text-slate-500 tabular-nums">
          {Number(order.delivery_fee) > 0 && `Delivery ${money(order.delivery_fee)} · `}Total{' '}
          <span className="font-semibold text-slate-900">{money(order.total)}</span>
        </p>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="min-w-0 flex-1">
          <span className="block font-medium text-slate-900">Seller: {order.seller}</span>
          {order.seller_phone && <span className="block text-slate-500 tabular-nums">{formatPhone(order.seller_phone)}</span>}
        </p>
        {order.seller_phone && <CopyButton text={order.seller_phone} />}
      </div>
    </article>
  )
}

function Status({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`font-semibold break-words ${tone ?? 'text-slate-900'}`}>{value}</dd>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // No clipboard: the number is on screen.
        }
      }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-600"
    >
      {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** The search from every page (pick 10C): `wide`, the box at the top of
 * a laptop's page, which also opens on `/` anywhere; else the phone's
 * button. Opens a panel over the page. */
export function SearchBox({ wide = false }: { wide?: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!wide) return
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (event.key !== '/' || event.metaKey || event.ctrlKey || target.closest('input, textarea, [contenteditable="true"], dialog')) return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wide])
  return (
    <>
      {wide ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-80 items-center gap-2 rounded-xl bg-surface px-3 text-sm text-slate-500 ring-1 ring-slate-200 transition hover:ring-slate-300 focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          <SearchIcon aria-hidden className="size-4" />
          <span className="flex-1 text-left">Search shops, people, orders</span>
          <kbd className="rounded-md px-1.5 font-sans text-xs ring-1 ring-slate-200">/</kbd>
        </button>
      ) : (
        <button
          type="button"
          aria-label="Search"
          onClick={() => setOpen(true)}
          className="inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          <SearchIcon aria-hidden className="size-5" />
        </button>
      )}
      {open && <SearchPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const q = useSettled(query)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-label="Search"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-slate-50 p-0 lg:mx-auto lg:mt-16 lg:h-auto lg:max-h-[80dvh] lg:max-w-2xl lg:rounded-2xl lg:shadow-xl"
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-surface px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] lg:pt-2">
        <SearchIcon aria-hidden className="ml-1 size-5 shrink-0 text-slate-400" />
        <input
          autoFocus
          type="text"
          enterKeyHint="search"
          aria-label="Search shops, people, customers and orders"
          placeholder="A shop, a phone, or a shop and order number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 sm:text-sm"
        />
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="inline-flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="p-4">
        {q.trim() ? <SearchResults q={q} onPick={onClose} /> : <p className="text-sm text-slate-500">Type what the caller says: "sokha 1043", a phone, a name.</p>}
      </div>
    </dialog>
  )
}
