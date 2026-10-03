import { Bell, ShoppingBag, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui.tsx'
import { formatMoney } from '../lib/money.ts'
import { formatOrderTime } from '../lib/orders.ts'
import type { SellerNotification } from '../lib/types.ts'
import { useMarkNotificationsRead, useNotifications } from './queries.ts'

/** /dashboard/notifications: new orders, and products running low or sold
 * out because of one. Newest first. */
export function Notifications() {
  const list = useNotifications()
  const { mutate: markRead } = useMarkNotificationsRead()
  // The ones that were unread when they came on screen: marked read at
  // once, but highlighted until the seller leaves the page.
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set())

  // Seeing them is reading them: the bell clears, on every device.
  useEffect(() => {
    const shown = list.data?.pages.flatMap((page) => page.notifications) ?? []
    const unread = shown.filter((n) => !n.read).map((n) => n.id)
    if (unread.length === 0) return
    markRead(shown[0].created_at, {
      onSuccess: () => setFresh((ids) => new Set([...ids, ...unread])),
    })
  }, [list.data, markRead])

  if (list.isPending) return <ListSkeleton />
  if (list.error) {
    return (
      <>
        <PageHeader title="Notifications" />
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      </>
    )
  }

  const shown = uniqueById(list.data.pages.flatMap((page) => page.notifications))
  return (
    <>
      <PageHeader title="Notifications" />
      {shown.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet">
          New orders show up here, and products running low or sold out.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {shown.map((n) => (
            <NotificationRow key={n.id} notification={n} unread={!n.read || fresh.has(n.id)} />
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
          Show more
        </Button>
      )}
    </>
  )
}

/** Pages are by position: if new ones arrived since the first page, the
 * next one starts with the last few of the first again. */
function uniqueById(notifications: SellerNotification[]): SellerNotification[] {
  const seen = new Set<string>()
  return notifications.filter((n) => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
}

type Shown = {
  icon: LucideIcon
  iconClass: string
  title: string
  body: string
  to: string
}

function describe(n: SellerNotification): Shown | null {
  if (n.event_type === 'new_order' && n.order) {
    const { order } = n
    const items = `${order.item_count} ${order.item_count === 1 ? 'item' : 'items'}`
    const parts = [order.customer_name, items, formatMoney(order.total, order.currency)]
    if (order.accepted_automatically) parts.push('Accepted automatically')
    return {
      icon: ShoppingBag,
      iconClass: 'bg-emerald-50 text-emerald-700',
      title: `New order #${order.number}`,
      body: parts.join(' · '),
      to: `/dashboard/orders/${order.id}`,
    }
  }
  if (n.event_type === 'low_stock' && n.items.length > 0) {
    const products = new Set(n.items.map((item) => item.product_id))
    return {
      icon: TriangleAlert,
      iconClass: 'bg-amber-50 text-amber-700',
      title: n.items.every((item) => item.left === 0) ? 'Sold out' : 'Running low',
      body: n.items.map((item) => `${item.name}: ${item.left === 0 ? 'sold out' : `${item.left} left`}`).join(' · '),
      // One product (maybe several of its options): straight to it.
      to: products.size === 1 ? `/dashboard/products/${n.items[0].product_id}` : '/dashboard/products',
    }
  }
  return null
}

function NotificationRow({ notification, unread }: { notification: SellerNotification; unread: boolean }) {
  const shown = describe(notification)
  if (!shown) return null
  const { icon: Icon } = shown
  return (
    <Link
      to={shown.to}
      state={{ back: '/dashboard/notifications' }}
      className={`flex items-start gap-3 p-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4 ${
        unread ? 'bg-emerald-50/50' : ''
      }`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${shown.iconClass}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-slate-900 ${unread ? 'font-semibold' : 'font-medium'}`}>
            {unread && <span className="sr-only">Unread: </span>}
            {shown.title}
          </span>
          <time dateTime={notification.created_at} className="shrink-0 text-xs text-slate-500">
            {formatOrderTime(notification.created_at)}
          </time>
        </span>
        <span className="mt-0.5 block text-sm break-words text-slate-600">{shown.body}</span>
      </span>
      <span
        aria-hidden
        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${unread ? 'bg-emerald-600' : 'bg-transparent'}`}
      />
    </Link>
  )
}

function ListSkeleton() {
  return (
    <>
      <PageHeader title="Notifications" />
      <Card className="divide-y divide-slate-100">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3 p-3 sm:p-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-0.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        ))}
      </Card>
    </>
  )
}
