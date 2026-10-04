import { ExternalLink, Inbox, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import type { OrderStatus, OrderSummary } from '../../lib/types.ts'
import { useOrders, useStore } from '../queries.ts'
import { OrderRow } from './OrderRow.tsx'

const FILTERS: { key: 'all' | 'new' | 'active' | 'done' | 'closed'; statuses: OrderStatus[] }[] = [
  { key: 'all', statuses: [] },
  { key: 'new', statuses: ['pending'] },
  { key: 'active', statuses: ['accepted', 'processing', 'ready', 'shipped'] },
  { key: 'done', statuses: ['delivered', 'completed'] },
  { key: 'closed', statuses: ['rejected', 'cancelled'] },
]

export function OrderList() {
  // In the URL, so it survives opening an order and coming back.
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.find((f) => f.key === params.get('show')) ?? FILTERS[0]
  const orders = useOrders(filter.statuses)
  const store = useStore()
  const t = useT()

  const counts = orders.data?.pages[0].counts
  const countOf = (statuses: OrderStatus[]) =>
    counts ? Object.entries(counts).reduce((n, [s, c]) => (statuses.length === 0 || statuses.includes(s as OrderStatus) ? n + c : n), 0) : null
  const shown = orders.data?.pages.flatMap((page) => page.orders) ?? []
  const arrived = useArrivals(orders.data && !orders.isPlaceholderData ? shown : undefined, filter.key)

  if (orders.isPending) return <ListSkeleton />
  if (orders.error) {
    return (
      <>
        <PageHeader title={t.orders.title} />
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      </>
    )
  }

  if (countOf([]) === 0) {
    return (
      <>
        <PageHeader title={t.orders.title} />
        <EmptyState
          icon={Inbox}
          title={t.orders.emptyTitle}
          action={
            store.data && (
              <Link to={`/shop/${store.data.slug}`} target="_blank" className={buttonClass('secondary')}>
                <ExternalLink aria-hidden className="size-4" />
                {t.orders.openShop}
              </Link>
            )
          }
        >
          {t.orders.emptyText}
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t.orders.title} />
      <nav aria-label={t.orders.filterLabel} className="-mx-4 mb-4 overflow-x-auto [scrollbar-width:none] lg:mx-0">
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
                      ? 'border-accent bg-accent text-white'
                      : 'border-slate-300 bg-surface text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t.orders.filter[f.key]}
                  <span className={active ? 'text-white/80' : 'text-slate-500'}>{countOf(f.statuses)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title={t.orders.noneHereTitle}>
          {t.orders.noneHereText}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {shown.map((order) => (
            <OrderRow key={order.id} order={order} arrived={arrived.has(order.id)} />
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
          {t.orders.showMore}
        </Button>
      )}
    </>
  )
}

/** Orders that came in while the list was open (it checks every 30 s), to
 * highlight. Not on the first load, a change of filter, or "Show more"
 * (older orders): order numbers only go up, so new ones are above the
 * highest number seen. `orders` is undefined until the filter's own list
 * has loaded. */
function useArrivals(orders: OrderSummary[] | undefined, filter: string): Set<string> {
  const top = orders ? Math.max(0, ...orders.map((o) => o.number)) : null
  const [seen, setSeen] = useState<{ filter: string; top: number | null }>({ filter, top })
  const [arrived, setArrived] = useState<Set<string>>(() => new Set())
  if (seen.filter !== filter) {
    setSeen({ filter, top })
    setArrived(new Set())
  } else if (seen.top === null) {
    if (top !== null) setSeen({ filter, top })
  } else if (orders && top !== null && top > seen.top) {
    const before = seen.top
    setArrived(new Set(orders.filter((o) => o.number > before).map((o) => o.id)))
    setSeen({ filter, top })
  }
  return arrived
}

function ListSkeleton() {
  const t = useT()
  return (
    <>
      <PageHeader title={t.orders.title} />
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
