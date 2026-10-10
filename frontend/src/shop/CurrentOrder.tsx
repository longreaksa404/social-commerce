import { Package, Truck } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '../i18n/useT.ts'
import type { ShopOrder } from '../lib/types.ts'
import { awaitsPayment, orderHeadline } from './orderWords.ts'
import { inProgress, useMyOrders } from './queries.ts'

/** In the shop's header while an order placed on this phone is on its
 * way: a truck (a box when it's for pickup), idling as on the order's own
 * page, that opens it (or Your orders, with several). A customer coming
 * back through any of the seller's links is one tap from it, and a truck
 * doesn't read as a second cart. Gone once it's delivered or closed. */
export function CurrentOrderButton({ slug }: { slug: string }) {
  const t = useT()
  const active = useMyOrders(slug, { recent: true })
    .map((o) => o.order)
    .filter((o): o is ShopOrder => o !== undefined && inProgress(o))
  if (active.length === 0) return null

  const one = active.length === 1 ? active[0] : null
  const to = one ? `/shop/${slug}/order/${one.id}` : `/shop/${slug}/orders`
  const first = one?.items[0]
  const unpaid = active.filter(awaitsPayment).length
  const label = (
    one
      ? [
          first ? t.order.firstItem(first.product_name, one.items.length - 1) : t.shop.orderNumber(one.number),
          orderHeadline(t, one),
          awaitsPayment(one) && t.order.notPaidYet,
        ]
      : [t.shop.myOrders.inProgressCount(active.length), unpaid > 0 && t.shop.myOrders.notPaidCount(unpaid)]
  )
    .filter(Boolean)
    .join(', ')
  const Icon = active.every((o) => o.delivery_method === 'pickup') ? Package : Truck

  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-600"
    >
      <Icon aria-hidden className="size-6 animate-drive" />
      <span aria-hidden className="absolute top-2 right-1 size-2.5 rounded-full bg-navy-600 ring-2 ring-surface" />
    </Link>
  )
}
