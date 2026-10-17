import { ChevronRight, ReceiptText } from 'lucide-react'
import { Link, useParams } from 'react-router'
import type { ReactNode } from 'react'
import { Card, DotList, EmptyState, Skeleton } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { formatDate } from '../lib/orders.ts'
import { ProductImage } from './components.tsx'
import { awaitsPayment, orderHeadline } from './orderWords.ts'
import { inProgress, useMyOrders, useShop, type MyOrder } from './queries.ts'

/** /shop/:storeSlug/orders: the orders placed (or opened) on this phone,
 * the ones still on their way first. No account: the phone remembers
 * them (02_TECHNICAL.md section 8). */
export function ShopOrders() {
  const { storeSlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const orders = useMyOrders(storeSlug)
  const t = useT()
  const m = t.shop.myOrders
  const current = orders.filter((o) => !o.order || inProgress(o.order))
  const past = orders.filter((o) => o.order && !inProgress(o.order))

  return (
    <div className="mx-auto max-w-xl">
      {shop.data && <title>{m.tab(shop.data.name)}</title>}
      <h1 className="mb-4 text-xl font-bold tracking-tight text-slate-900">{m.title}</h1>
      {orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={m.emptyTitle}
          action={
            <Link to={`/shop/${storeSlug}`} className={buttonClass('primary')}>
              {t.shop.cartPage.browse}
            </Link>
          }
        >
          {m.emptyText}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {current.length > 0 && <OrderGroup title={m.inProgress} orders={current} slug={storeSlug} />}
          {past.length > 0 && <OrderGroup title={m.past} orders={past} slug={storeSlug} />}
        </div>
      )}
      <p className="mt-6 sm:px-1 text-sm leading-6 text-slate-500">{m.otherPhone}</p>
    </div>
  )
}

function OrderGroup({ title, orders, slug }: { title: string; orders: MyOrder[]; slug: string }) {
  return (
    <section>
      <h2 className="mb-2 sm:px-1 text-sm font-semibold text-slate-500">{title}</h2>
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {orders.map((o) => (
          <OrderRow key={o.id} item={o} slug={slug} />
        ))}
      </Card>
    </section>
  )
}

/** One order, by what was bought: its first item's photo and name, the
 * number and date, where it is and whether it's paid as tags, the total. */
function OrderRow({ item, slug }: { item: MyOrder; slug: string }) {
  const t = useT()
  const { order } = item
  const closed = order?.status === 'rejected' || order?.status === 'cancelled'
  const first = order?.items[0]
  const more = order ? order.items.length - 1 : 0
  // Plain words joined by dots, like the seller's order list (UI check #8,
  // founder 2026-10-17); red and amber on the words only (2026-10-15).
  const words: ReactNode[] = []
  if (!order) words.push(<span key="cant" className="text-slate-500">{t.shop.myOrders.cantOpen}</span>)
  else {
    words.push(<span key="status" className={closed ? 'text-red-700' : 'text-slate-800'}>{orderHeadline(t, order)}</span>)
    if (!closed && order.payment.status === 'paid')
      words.push(<span key="paid" className="text-emerald-700">{t.status.paymentBadge.paid}</span>)
    if (inProgress(order) && awaitsPayment(order)) words.push(<span key="unpaid" className="text-amber-700">{t.order.notPaidYet}</span>)
  }
  return (
    <Link
      to={`/shop/${slug}/order/${item.id}`}
      className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100"
    >
      <ProductImage small src={first?.image_url} alt="" className="size-14 shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate font-semibold text-slate-900">
            {first ? t.order.firstItem(first.product_name, more) : t.shop.orderNumber(item.number)}
          </span>
          {order && (
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums">
              {formatMoney(order.total, order.currency)}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {t.order.numberAndDate(item.number, formatDate(item.placedAt))}
        </span>
        {item.loading ? (
          <Skeleton className="mt-1.5 h-5 w-40" />
        ) : (
          <DotList className="mt-1 text-xs font-semibold">{words}</DotList>
        )}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
    </Link>
  )
}
