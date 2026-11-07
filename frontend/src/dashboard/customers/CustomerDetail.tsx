import { Copy, MapPin, Phone, Search, SearchX, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { formatSpent } from '../../lib/customers.ts'
import { formatDate, formatPhone } from '../../lib/orders.ts'
import type { Currency, CustomerDetail as Customer, CustomerSummary } from '../../lib/types.ts'
import { useDebounced } from '../../lib/useDebounced.ts'
import { EAGER_PHOTOS } from '../../shop/components.tsx'
import { MessageCustomerSheet } from '../orders/MessageCustomer.tsx'
import { OrderRow } from '../orders/OrderRow.tsx'
import { useCustomer, useCustomers, useStore } from '../queries.ts'
import { useBackTo } from '../useBackTo.ts'
import { CustomerPhoto } from './CustomerPhoto.tsx'

/** /dashboard/customers/:customerId: who they are, and their orders. */
export function CustomerDetail() {
  const { customerId = '' } = useParams()
  const customer = useCustomer(customerId)
  const back = useBackTo('/dashboard/customers')
  const t = useT()

  if (customer.isPending) return <DetailSkeleton back={back} />
  if (customer.error) {
    return (
      <>
        <PageHeader title={t.customers.customer} back={back} />
        <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
      </>
    )
  }
  return (
    <>
      <div className="lg:hidden">
        <CustomerView customer={customer.data} back={back} onStale={() => customer.refetch()} />
      </div>
      <div className="hidden grid-cols-[minmax(18rem,25rem)_minmax(0,1fr)] items-start gap-6 lg:grid xl:grid-cols-2">
        {/* Both children return fragments. Wrap each one so the grid has
            exactly two cells and their later siblings cannot spill into a
            second row below the other column. */}
        <div className="min-w-0">
          <CustomerPicker selectedId={customer.data.id} />
        </div>
        <div className="min-w-0">
          <CustomerView customer={customer.data} back={back} onStale={() => customer.refetch()} besideList />
        </div>
      </div>
    </>
  )
}

function CustomerView({
  customer,
  back,
  onStale,
  besideList = false,
}: {
  customer: Customer
  back: string
  onStale: () => void
  besideList?: boolean
}) {
  const currency = useStore().data?.currency ?? 'USD'
  const { toast } = useFeedback()
  const location = useLocation()
  const t = useT()
  const c = t.customers
  const [messaging, setMessaging] = useState(false)

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(formatPhone(customer.phone))
      toast(c.phoneCopied)
    } catch {
      toast(c.copyFailed, 'error')
    }
  }
  return (
    <>
      <PageHeader title={customer.name} back={besideList ? undefined : back} />
      <title>{customer.name}</title>

      {/* Laptops: who they are on the left, their orders on the right. */}
      <div
        className={
          besideList
            ? 'space-y-4'
            : 'space-y-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0'
        }
      >
        {/* Who they are, with calling them one tap away (founder's pick,
            2026-10-08). */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <CustomerPhoto url={customer.photo_url} className="size-14" />
            {/* The name is the page's title, so the card starts with the
                phone (founder's pick 5A, 2026-11-06). */}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-900 tabular-nums">{formatPhone(customer.phone)}</p>
              <p className="text-sm text-slate-500">{c.since(formatDate(customer.created_at))}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <a href={`tel:${customer.phone}`} className={`${buttonClass('secondary')} flex-1`}>
              <Phone aria-hidden className="size-4" />
              {c.call}
            </a>
            <Button variant="secondary" icon={Copy} onClick={copyPhone} className="flex-1">
              {c.copyPhone}
            </Button>
          </div>
          {/* As on an order (founder's test list #2, 2026-10-24). */}
          {customer.on_telegram && (
            <>
              <Button variant="secondary" icon={Send} onClick={() => setMessaging(true)} className="mt-3 w-full">
                {t.orders.messageOnTelegram}
              </Button>
              <MessageCustomerSheet
                customer={customer}
                customerId={customer.id}
                open={messaging}
                onClose={() => setMessaging(false)}
                onGone={onStale}
              />
            </>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-sm text-slate-500">{c.orders}</dt>
              <dd className="text-xl font-bold text-slate-900 tabular-nums">{customer.order_count}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-sm text-slate-500">{c.spent}</dt>
              <dd className="text-xl font-bold break-words text-slate-900 tabular-nums">{formatSpent(customer.spent, currency)}</dd>
            </div>
          </dl>

          {customer.address && (
            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{c.latestAddress}</p>
                <p className="whitespace-pre-line break-words text-slate-900">{customer.address}</p>
              </div>
            </div>
          )}
        </Card>

        <section aria-labelledby="customer-orders">
          <h2 id="customer-orders" className="mb-2 sm:px-1 font-semibold text-slate-900">
            {c.orders}
          </h2>
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {customer.orders.map((order, i) => (
              <OrderRow
                key={order.id}
                order={order}
                eager={i < EAGER_PHOTOS}
                showCustomer={false}
                back={`/dashboard/customers/${customer.id}${location.search}`}
              />
            ))}
          </Card>
          {customer.order_count > customer.orders.length && (
            <p className="mt-2 sm:px-1 text-sm text-slate-500">
              {c.latestOrders(customer.orders.length, customer.order_count)}
            </p>
          )}
        </section>
      </div>
    </>
  )
}

/** The laptop master list stays beside an open customer so the seller can
 * move between people without losing the search (founder's pick 2A,
 * 2026-11-07). Phones keep the focused customer screen above. */
function CustomerPicker({ selectedId }: { selectedId: string }) {
  const [params, setParams] = useSearchParams()
  const [typed, setTyped] = useState(() => params.get('q') ?? '')
  const search = useDebounced(typed.trim(), 300)
  const inUrl = params.get('q') ?? ''
  useEffect(() => {
    if (search !== inUrl) setParams(search ? { q: search } : {}, { replace: true })
  }, [search, inUrl, setParams])

  const list = useCustomers(search)
  const currency = useStore().data?.currency ?? 'USD'
  const t = useT()
  const c = t.customers
  const shown = list.data?.pages.flatMap((page) => page.customers) ?? []
  const total = list.data?.pages[0]?.total ?? 0

  return (
    <section aria-labelledby="customer-picker-title" className="min-w-0">
      <PageHeader title={c.title} />
      <h2 id="customer-picker-title" className="sr-only">
        {c.title}
      </h2>
      <Input
        type="search"
        aria-label={c.search}
        placeholder={c.searchPlaceholder}
        enterKeyHint="search"
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        leading={<Search aria-hidden className="size-4.5" />}
      />
      {!list.isPending && !list.error && (
        <p aria-live="polite" className="mt-3 mb-2 px-1 text-sm text-slate-500">
          {search ? c.found(total) : c.count(total)}
        </p>
      )}

      {list.isPending ? (
        <CustomerPickerSkeleton />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState icon={SearchX} title={c.notFoundTitle}>
          {c.notFoundText(search)}
        </EmptyState>
      ) : (
        <Card className={`divide-y divide-slate-100 overflow-hidden transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
          {shown.map((customer) => (
            <PickerRow key={customer.id} customer={customer} currency={currency} search={search} selected={customer.id === selectedId} />
          ))}
        </Card>
      )}
      {list.hasNextPage && (
        <Button
          variant="secondary"
          loading={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
          className="mt-4 w-full"
        >
          {t.orders.showMore}
        </Button>
      )}
    </section>
  )
}

function PickerRow({
  customer,
  currency,
  search,
  selected,
}: {
  customer: CustomerSummary
  currency: Currency
  search: string
  selected: boolean
}) {
  const t = useT()
  return (
    <Link
      to={`/dashboard/customers/${customer.id}${search ? `?q=${encodeURIComponent(search)}` : ''}`}
      aria-current={selected ? 'page' : undefined}
      className={`flex min-h-18 items-center gap-3 border-l-3 px-3 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-600 ${
        selected ? 'border-navy-600 bg-slate-50' : 'border-transparent'
      }`}
    >
      <CustomerPhoto url={customer.photo_url} name={customer.name} className="size-10" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-900">{customer.name}</span>
        <span className="block text-sm text-slate-600 tabular-nums">{formatPhone(customer.phone)}</span>
        <span className="block truncate text-xs text-slate-500">
          {t.customers.orderCount(customer.order_count)}
          {customer.last_order_at && t.customers.lastOrder(formatDate(customer.last_order_at))}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-slate-900">{formatSpent(customer.spent, currency)}</span>
    </Link>
  )
}

function CustomerPickerSkeleton() {
  return (
    <Card className="divide-y divide-slate-100 overflow-hidden">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex min-h-18 items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-10 rounded-full" />
          <span className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </span>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </Card>
  )
}

function DetailSkeleton({ back }: { back: string }) {
  const t = useT()
  return (
    <>
      <PageHeader title={t.customers.customer} back={back} />
      <div className="space-y-4">
        <Card className="space-y-3 p-4 sm:p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </Card>
        <Card className="divide-y divide-slate-100">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2 px-4 py-3 sm:p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
