import { CalendarClock, ChevronRight, ExternalLink, Inbox, MousePointerClick, Package, Plus, SearchX, Truck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card, EmptyState, ErrorState, Skeleton } from '../../components/ui.tsx'
import type { Messages } from '../../i18n/core.ts'
import { useT } from '../../i18n/useT.ts'
import { formatCalendarDay, formatDay } from '../../lib/orders.ts'
import type { OrderStatus, OrderSummary } from '../../lib/types.ts'
import { useOrders, useProducts, useRole, useStore } from '../queries.ts'
import { OrderDetail } from './OrderDetail.tsx'
import { OrderRow } from './OrderRow.tsx'

const FILTERS: { key: 'all' | 'new' | 'active' | 'done' | 'closed'; statuses: OrderStatus[] }[] = [
  { key: 'all', statuses: [] },
  { key: 'new', statuses: ['pending'] },
  { key: 'active', statuses: ['accepted', 'processing', 'ready', 'shipped'] },
  { key: 'done', statuses: ['delivered', 'completed'] },
  { key: 'closed', statuses: ['rejected', 'cancelled'] },
]

/** /dashboard/orders and /dashboard/orders/:orderId. Phones show one or the
 * other; laptops show the list with the open order beside it, like an
 * inbox, so going through new orders needs no going back and forth. */
export function OrdersPage() {
  const { orderId } = useParams()
  const t = useT()
  const navigate = useNavigate()
  const { search, state } = useLocation()
  const { orders } = useFiltered()
  // Going through new orders: once the open one is accepted or rejected,
  // the next new one opens (founder's pick 1B, 2026-10-08). Not when it
  // was opened from a customer's or a link's page: back goes there.
  const fromElsewhere = typeof (state as { back?: unknown } | null)?.back === 'string'
  const next =
    orderId && !fromElsewhere
      ? nextNewOrder(orders.data?.pages.flatMap((page) => page.orders) ?? [], orderId)
      : undefined
  // The title and tabs run across the top on laptops, above both columns,
  // so all the tabs fit on one line.
  return (
    <>
      <div className={orderId ? 'max-lg:hidden' : ''}>
        <OrdersHeader />
        <PausedReminder />
        <DeliveryReminder />
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <div className={orderId ? 'max-lg:hidden' : ''}>
          <OrderList selectedId={orderId} />
        </div>
        {orderId ? (
          <div className="lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:rounded-2xl lg:pb-2">
            <OrderDetail
              key={orderId}
              onDecided={next ? () => navigate(`/dashboard/orders/${next}${search}`, { replace: true }) : undefined}
            />
          </div>
        ) : (
          <div className="hidden lg:block">
            <Card className="flex flex-col items-center px-6 py-16 text-center">
              <MousePointerClick aria-hidden className="mb-3 size-8 text-slate-300" />
              <p className="text-sm text-slate-500">{t.orders.pickOrder}</p>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}

/** While the shop isn't taking orders (Settings → Orders): easy to forget
 * after a holiday, and new orders simply stop coming. */
function PausedReminder() {
  const store = useStore()
  const role = useRole()
  const t = useT()
  if (!store.data?.orders_paused) return null
  const day = store.data.orders_resume_on
  return (
    <Reminder icon={CalendarClock} setting="orders">
      {day ? t.orders.pausedUntil(formatCalendarDay(day)) : role === 'owner' ? t.orders.paused : t.orders.pausedStaff}
    </Reminder>
  )
}

/** Until Settings → Delivery is saved once, the shop delivers for free
 * (the defaults): a seller who never looked would give it away. */
function DeliveryReminder() {
  const store = useStore()
  const role = useRole()
  const t = useT()
  if (!store.data || store.data.delivery_set_up) return null
  return (
    <Reminder icon={Truck} setting="delivery">
      {role === 'owner' ? t.orders.deliveryNotSet : t.orders.deliveryNotSetStaff}
    </Reminder>
  )
}

/** An amber strip above the list that opens the setting it's about (for
 * the owner; staff can't open Settings, so they just get the news). */
function Reminder({ icon: Icon, setting, children }: { icon: LucideIcon; setting: string; children: string }) {
  const role = useRole()
  const className =
    '-mx-4 mb-4 flex min-h-12 items-center gap-3 border-y border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:mx-0 sm:rounded-2xl sm:border'
  const content = (
    <>
      <Icon aria-hidden className="size-5 shrink-0 text-amber-700" />
      <span className="min-w-0 flex-1">{children}</span>
    </>
  )
  if (role !== 'owner') return <p className={className}>{content}</p>
  return (
    <Link
      to={`/dashboard/settings/${setting}`}
      className={`${className} transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600`}
    >
      {content}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-amber-700" />
    </Link>
  )
}

/** Which tab is showing, from the URL (so it survives opening an order and
 * coming back), and that tab's orders; the header and the list share the
 * same query. */
function useFiltered() {
  const [params, setParams] = useSearchParams()
  const filter = FILTERS.find((f) => f.key === params.get('show')) ?? FILTERS[0]
  const orders = useOrders(filter.statuses)
  const counts = orders.data?.pages[0].counts
  const countOf = (statuses: OrderStatus[]) =>
    counts ? Object.entries(counts).reduce((n, [s, c]) => (statuses.length === 0 || statuses.includes(s as OrderStatus) ? n + c : n), 0) : null
  const choose = (key: (typeof FILTERS)[number]['key']) => setParams(key === 'all' ? {} : { show: key }, { replace: true })
  return { filter, orders, countOf, choose }
}

/** "Orders" and the status tabs. Laptops: one slim line, the tabs beside
 * the title (founder's pick, 2026-10-07), so the list and the open order
 * below start level. Phones: the title, then the tabs in one row that
 * scrolls sideways. Underline tabs: the chosen one has a navy line under
 * it; New's count is filled in while there are new orders. */
function OrdersHeader() {
  const { filter, orders, countOf, choose } = useFiltered()
  const t = useT()
  return (
    <div className="mb-2 lg:mb-5 lg:flex lg:items-center lg:gap-8">
      <h1 className="mb-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:mb-0">{t.orders.title}</h1>
      {orders.isPending ? (
        <Skeleton className="h-10 w-full rounded-lg lg:w-[32rem]" />
      ) : (
        countOf([]) !== 0 &&
        !orders.error && (
          <nav
            aria-label={t.orders.filterLabel}
            className="-mx-4 min-w-0 overflow-x-auto [scrollbar-width:none] lg:mx-0 lg:flex-1"
          >
            <ul className="flex w-max min-w-full gap-1 border-b border-slate-200 px-4 lg:px-0">
              {FILTERS.map((f) => {
                const active = f.key === filter.key
                const count = countOf(f.statuses)
                const hot = f.key === 'new' && (count ?? 0) > 0
                return (
                  <li key={f.key}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => choose(f.key)}
                      className={`relative flex min-h-11 items-center gap-2 rounded-t-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 ${
                        active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {t.orders.filter[f.key]}
                      <span
                        className={`min-w-6 rounded-full px-1.5 text-center text-xs font-bold tabular-nums ${
                          hot ? 'bg-brand text-white' : `bg-slate-100 text-slate-500 ${count === 0 ? 'opacity-60' : ''}`
                        }`}
                      >
                        {count}
                      </span>
                      {active && <span aria-hidden className="absolute inset-x-2 -bottom-px h-[3px] rounded-t-full bg-brand" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        )
      )}
    </div>
  )
}

function OrderList({ selectedId }: { selectedId: string | undefined }) {
  const { filter, orders, countOf } = useFiltered()
  const t = useT()
  const shown = orders.data?.pages.flatMap((page) => page.orders) ?? []
  const arrived = useArrivals(orders.data && !orders.isPlaceholderData ? shown : undefined, filter.key)

  if (orders.isPending) return <ListSkeleton />
  if (orders.error) return <ErrorState error={orders.error} onRetry={() => orders.refetch()} />

  if (countOf([]) === 0) return <NoOrdersYet />

  return (
    <>
      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title={t.orders.noneHereTitle}>
          {t.orders.noneHereText}
        </EmptyState>
      ) : (
        <div className="space-y-1">
          {byDay(shown).map(({ day, orders: ofDay }, i) => (
            <section key={day} aria-label={dayHeading(t, ofDay[0].created_at)}>
              <h2 className={`px-1 pb-2 text-sm font-semibold text-slate-500 ${i === 0 ? 'pt-4 lg:pt-0' : 'pt-4'}`}>
                {dayHeading(t, ofDay[0].created_at)}
              </h2>
              <Card className="divide-y divide-slate-100 overflow-hidden">
                {ofDay.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    arrived={arrived.has(order.id)}
                    selected={order.id === selectedId}
                    timeOnly
                  />
                ))}
              </Card>
            </section>
          ))}
        </div>
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

/** A shop's first days. With no products yet, sharing the link would
 * bring customers to an empty shop: adding one comes first. */
function NoOrdersYet() {
  const store = useStore()
  const products = useProducts()
  const t = useT()
  if (products.isPending) return <ListSkeleton />
  if (products.data?.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t.orders.noProductsTitle}
        action={
          <Link to="/dashboard/products/new" className={buttonClass('primary')}>
            <Plus aria-hidden className="size-4" />
            {t.products.addProduct}
          </Link>
        }
      >
        {t.orders.noProductsText}
      </EmptyState>
    )
  }
  return (
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
  )
}

/** The new order to open after `id`: the next one down the list (older),
 * else the nearest above; the first new one if `id` isn't in this list. */
function nextNewOrder(orders: OrderSummary[], id: string): string | undefined {
  const i = orders.findIndex((o) => o.id === id)
  const isNew = (o: OrderSummary) => o.status === 'pending' && o.id !== id
  const below = orders.slice(i + 1).find(isNew)
  const above = orders.slice(0, Math.max(i, 0)).findLast(isNew)
  return (below ?? above)?.id
}

/** The orders split by the day they came in (on this phone's clock),
 * newest day first; the list is newest first already. */
function byDay(orders: OrderSummary[]): { day: string; orders: OrderSummary[] }[] {
  const days: { day: string; orders: OrderSummary[] }[] = []
  for (const order of orders) {
    const day = new Date(order.created_at).toDateString()
    const last = days[days.length - 1]
    if (last?.day === day) last.orders.push(order)
    else days.push({ day, orders: [order] })
  }
  return days
}

function dayHeading(t: Messages, iso: string): string {
  const day = new Date(iso).toDateString()
  const now = new Date()
  if (day === now.toDateString()) return t.orders.today
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (day === yesterday.toDateString()) return t.orders.yesterday
  return formatDay(iso, now)
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
  return (
    <>
      <Card className="mt-4 divide-y divide-slate-100">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 px-4 py-3 sm:p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </Card>
    </>
  )
}
