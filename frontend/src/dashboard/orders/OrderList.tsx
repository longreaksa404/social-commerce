import { ChevronRight, ExternalLink, Inbox, SearchX } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { buttonClass } from '../../components/styles.ts'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { formatMoney } from '../../lib/money.ts'
import { formatOrderTime, ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '../../lib/orders.ts'
import { paymentBadge } from '../../lib/payments.ts'
import type { OrderStatus, OrderSummary } from '../../lib/types.ts'
import { useOrders, useStore } from '../queries.ts'

const FILTERS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: 'all', label: 'All', statuses: [] },
  { key: 'new', label: 'New', statuses: ['pending'] },
  { key: 'active', label: 'In progress', statuses: ['accepted', 'processing', 'ready', 'shipped'] },
  { key: 'done', label: 'Delivered', statuses: ['delivered', 'completed'] },
  { key: 'closed', label: 'Cancelled', statuses: ['rejected', 'cancelled'] },
]

export function OrderList() {
  // In the URL, so it survives opening an order and coming back.
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.find((f) => f.key === params.get('show')) ?? FILTERS[0]
  const orders = useOrders(filter.statuses)
  const store = useStore()

  const counts = orders.data?.pages[0].counts
  const countOf = (statuses: OrderStatus[]) =>
    counts ? Object.entries(counts).reduce((n, [s, c]) => (statuses.length === 0 || statuses.includes(s as OrderStatus) ? n + c : n), 0) : null
  const shown = orders.data?.pages.flatMap((page) => page.orders) ?? []

  if (orders.isPending) return <ListSkeleton />
  if (orders.error) {
    return (
      <>
        <PageHeader title="Orders" />
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      </>
    )
  }

  if (countOf([]) === 0) {
    return (
      <>
        <PageHeader title="Orders" />
        <EmptyState
          icon={Inbox}
          title="No orders yet"
          action={
            store.data && (
              <Link to={`/shop/${store.data.slug}`} target="_blank" className={buttonClass('secondary')}>
                <ExternalLink aria-hidden className="size-4" />
                Open your shop
              </Link>
            )
          }
        >
          Share your shop link on Facebook, TikTok, or Telegram. Orders customers place show up here.
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Orders" />
      <nav aria-label="Filter orders" className="-mx-4 mb-4 overflow-x-auto [scrollbar-width:none] lg:mx-0">
        <ul className="flex w-max gap-2 px-4 lg:px-0">
          {FILTERS.map((f) => {
            const active = f.key === filter.key
            return (
              <li key={f.key}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setParams(f.key === 'all' ? {} : { show: f.key }, { replace: true })}
                  className={`flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                    active
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                  <span className={active ? 'text-emerald-100' : 'text-slate-500'}>{countOf(f.statuses)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No orders here">
          Orders move between these lists as you update them.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {shown.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </Card>
      )}
      {orders.hasNextPage && (
        <Button
          variant="secondary"
          loading={orders.isFetchingNextPage}
          onClick={() => orders.fetchNextPage()}
          className="mt-4 w-full"
        >
          Show more
        </Button>
      )}
    </>
  )
}

function OrderRow({ order }: { order: OrderSummary }) {
  const payment = paymentBadge(order.payment_method, order.payment_status)
  return (
    <Link
      to={`/dashboard/orders/${order.id}`}
      className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-900">#{order.number}</span>
          <Badge tone={ORDER_STATUS_TONES[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          <Badge tone={payment.tone}>{payment.label}</Badge>
        </span>
        <span className="mt-0.5 block truncate text-sm text-slate-700">{order.customer_name}</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {order.item_count} {order.item_count === 1 ? 'item' : 'items'} · {formatOrderTime(order.created_at)}
        </span>
      </span>
      <span className="shrink-0 font-semibold text-slate-900">{formatMoney(order.total, order.currency)}</span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
    </Link>
  )
}

function ListSkeleton() {
  return (
    <>
      <PageHeader title="Orders" />
      <Skeleton className="mb-4 h-10 w-full rounded-full" />
      <Card className="divide-y divide-slate-100">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 p-3 sm:p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </Card>
    </>
  )
}
