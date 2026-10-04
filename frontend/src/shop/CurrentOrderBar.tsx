import { ChevronRight, Package } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '../i18n/useT.ts'
import { awaitsPayment, orderHeadline } from './orderWords.ts'
import { inProgress, useMyOrders } from './queries.ts'

/** At the top of the shop's pages while an order placed on this phone is
 * on its way: a customer coming back through any of the seller's links
 * lands one tap from it. Gone once it's delivered or closed. */
export function CurrentOrderBar({ slug }: { slug: string }) {
  const t = useT()
  const active = useMyOrders(slug, { recent: true }).filter((o) => o.order && inProgress(o.order))
  if (active.length === 0) return null

  const one = active.length === 1 ? active[0].order! : null
  const text = one
    ? [orderHeadline(t, one), ...(awaitsPayment(one) ? [t.order.notPaidYet] : [])].join(' · ')
    : t.shop.myOrders.seeThem
  return (
    <Link
      to={one ? `/shop/${slug}/order/${one.id}` : `/shop/${slug}/orders`}
      className="mb-4 flex min-h-14 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:mb-6"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <Package aria-hidden className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-emerald-900">
          {one ? t.shop.orderNumber(one.number) : t.shop.myOrders.inProgressCount(active.length)}
        </span>
        <span className="block truncate text-sm text-emerald-800">{text}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-emerald-700" />
    </Link>
  )
}
