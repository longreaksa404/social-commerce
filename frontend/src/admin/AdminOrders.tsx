import { ChevronLeft, ChevronRight, Search, UserX } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { cardClass } from '../components/styles.ts'
import { Button, EmptyState, ErrorMessage, ErrorState, Field, Input, PageHeader, PasswordInput, Skeleton } from '../components/ui.tsx'
import { formatPhone } from '../lib/orders.ts'
import type { AdminCustomer } from '../lib/types.ts'
import { useAdminCustomers, useForgetCustomer } from './queries.ts'
import { SearchResults } from './Search.tsx'
import { ago, initials, useSettled } from './shared.ts'
import { Sheet } from './ui.tsx'

/** /admin/orders (parts 19 and 20): find an order ("sokha 1043", "1043")
 * or a customer (a phone or a name) in every shop; look only. The same
 * search as the one on every page (pick 10C), without shops and people. */
export function AdminOrders() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const q = useSettled(query).trim()

  useEffect(() => {
    setParams(q ? { q } : {}, { replace: true })
  }, [q, setParams])

  return (
    <>
      <title>Orders · Oak Order admin</title>
      <PageHeader title="Orders and customers" />
      <div className="max-w-3xl space-y-5">
        <div>
          <Input
            type="search"
            autoFocus
            leading={<Search aria-hidden className="size-4" />}
            placeholder="sokha 1043, or a phone"
            aria-label="Find an order or a customer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-slate-500 sm:px-1">A shop and an order number, or a phone or name.</p>
        </div>
        {q ? <SearchResults q={q} only="orders" /> : <EmptyState icon={Search} title="Find an order or a customer" />}
      </div>
    </>
  )
}

/** /admin/customers/:phone (part 20, and 21): one phone in every shop it
 * ordered from, then Remove from one shop or every shop, for a request
 * from the Data deletion page. */
export function AdminCustomerPage() {
  const { phone = '' } = useParams()
  const found = useAdminCustomers(phone)
  const customer = found.data?.find((c) => c.phone === phone)
  return (
    <div className="max-w-3xl">
      <Link to="/admin/orders" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-navy-700">
        <ChevronLeft aria-hidden className="size-4" />
        Orders and customers
      </Link>
      {found.isPending ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : found.error ? (
        <ErrorState error={found.error} onRetry={() => found.refetch()} />
      ) : !customer ? (
        <EmptyState icon={UserX} title="No customer with this phone" />
      ) : (
        <Customer customer={customer} />
      )}
    </div>
  )
}

function Customer({ customer }: { customer: AdminCustomer }) {
  const [removing, setRemoving] = useState<{ storeId: string | null; shop: string } | null>(null)
  const every = customer.shops.length > 1
  return (
    <>
      <title>{`${customer.name} · Oak Order admin`}</title>
      <div className={`${cardClass} flex items-center gap-3 p-4 sm:p-5`}>
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy-50 text-base font-bold text-navy-700">
          {initials(customer.name) || '?'}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{customer.name}</h1>
          <p className="text-sm text-slate-500 tabular-nums">
            {formatPhone(customer.phone)} · in {customer.shops.length === 1 ? '1 shop' : `${customer.shops.length} shops`}
          </p>
        </div>
      </div>
      <h2 className="mt-6 mb-2 text-sm font-semibold text-slate-500 sm:px-1">Shops</h2>
      <ul className={`${cardClass} divide-y divide-slate-100`}>
        {customer.shops.map((s) => (
          <li key={s.customer_id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <Link to={`/admin/shops/${s.store_id}`} className="group flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900 group-hover:underline">{s.shop}</span>
                <span className="block text-slate-500">
                  {s.orders === 1 ? '1 order' : `${s.orders} orders`}
                  {s.last_order_at && ` · last ${ago(s.last_order_at)}`}
                  {s.telegram && ' · Telegram on'}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-400" />
            </Link>
            {every && (
              <Button variant="secondary" onClick={() => setRemoving({ storeId: s.store_id, shop: s.shop })}>
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Button variant="danger" className="mt-4 w-full sm:w-auto" onClick={() => setRemoving({ storeId: every ? null : customer.shops[0].store_id, shop: every ? 'every shop' : customer.shops[0].shop })}>
        {every ? 'Remove from every shop' : `Remove from ${customer.shops[0].shop}`}
      </Button>
      <p className="mt-1.5 text-xs text-slate-500 sm:px-1">The name becomes "(removed)"; orders and money stay.</p>
      <Forget customer={customer} target={removing} onClose={() => setRemoving(null)} />
    </>
  )
}

/** Asks first (pick 7A), with REMOVE typed and the admin's password every
 * time (01_PRODUCT.md §22.11). */
function Forget({ customer, target, onClose }: { customer: AdminCustomer; target: { storeId: string | null; shop: string } | null; onClose: () => void }) {
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const forget = useForgetCustomer()
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')

  function close() {
    setTyped('')
    setPassword('')
    forget.reset()
    onClose()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!target) return
    forget.mutate(
      { phone: customer.phone, store_id: target.storeId, password },
      {
        onSuccess: (done) => {
          toast(`Removed from ${done.shops === 1 ? '1 shop' : `${done.shops} shops`} · in the log`)
          close()
          if (target.storeId === null || customer.shops.length === 1) navigate('/admin/orders')
        },
      },
    )
  }

  return (
    <Sheet open={target !== null} onClose={close} title={target ? `Remove ${customer.name} from ${target.shop}?` : ''}>
      <form onSubmit={submit}>
        <p className="mt-2 text-sm leading-6 text-slate-600">Their name, phone, addresses, map pins and notes go for good. Orders and money stay.</p>
        <Field label="Type REMOVE" className="mt-4">
          <Input autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="REMOVE" />
        </Field>
        <Field label="Your admin password" className="mt-4">
          <PasswordInput autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorMessage error={forget.error} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={forget.isPending} disabled={typed !== 'REMOVE' || !password}>
            Remove
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
