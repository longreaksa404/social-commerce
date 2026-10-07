import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Badge, Button } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { deliveryBadge } from '../../lib/delivery.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatClock, formatOrderTime, ORDER_STATUS_TONES } from '../../lib/orders.ts'
import { paymentBadge } from '../../lib/payments.ts'
import type { OrderSummary } from '../../lib/types.ts'
import { ProductImage } from '../../shop/components.tsx'
import { keys } from '../queries.ts'
import { useMoveOrder } from './useMoveOrder.ts'

/** A row in an order list (the Orders tab, a customer's page), led by what
 * was bought: its photo and name, then the customer, number and time, the
 * order's three statuses as tags (only what needs an eye for delivery),
 * and the total. A new order has Accept and Reject right here, so a pile
 * of new orders needs no opening one by one. `back` is where the order's
 * back arrow returns to, if not the Orders tab. */
export function OrderRow({
  order,
  showCustomer = true,
  back,
  arrived = false,
  selected = false,
  timeOnly = false,
}: {
  order: OrderSummary
  showCustomer?: boolean
  back?: string
  /** Just came in while the list was open: slides in, highlighted. */
  arrived?: boolean
  /** Open beside the list (laptops). */
  selected?: boolean
  /** Under a day heading: the time is enough. */
  timeOnly?: boolean
}) {
  const t = useT()
  const { search } = useLocation()
  const payment = paymentBadge(t, order.payment_method, order.payment_status)
  // Only what needs the seller's eye: a pickup, or a delivery that failed.
  const delivery =
    order.delivery_status === 'failed'
      ? deliveryBadge(t, order.delivery_method, 'failed')
      : order.delivery_method === 'pickup'
        ? { label: t.checkout.pickup, tone: 'neutral' as const }
        : null
  const isNew = order.status === 'pending'
  // Unpaid doesn't matter once an order is off; paid (to refund) still does.
  const closed = order.status === 'rejected' || order.status === 'cancelled'
  const showPayment = !(closed && order.payment_status === 'pending')
  const time = timeOnly ? formatClock(order.created_at) : formatOrderTime(order.created_at)
  return (
    <div
      className={`relative transition-colors ${selected ? 'bg-navy-50' : ''} ${arrived ? 'animate-arrive' : ''} ${
        // A new order is marked down its left edge.
        isNew ? 'shadow-[inset_3px_0_0_var(--color-brand)]' : ''
      }`}
    >
      <Link
        to={`/dashboard/orders/${order.id}${search}`}
        state={back ? { back } : undefined}
        aria-current={selected ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${selected ? '' : 'hover:bg-slate-50 active:bg-slate-100'} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600`}
      >
        <ProductImage small src={order.first_item_image_url} alt="" className="size-12 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate font-semibold text-slate-900">
              {t.order.firstItem(order.first_item_name, order.line_count - 1)}
            </span>
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums">
              {formatMoney(order.total, order.currency)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-slate-500">
            {showCustomer
              ? t.orders.rowMeta(order.customer_name, order.number, time)
              : t.orders.rowMetaNoCustomer(order.number, time)}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={ORDER_STATUS_TONES[order.status]}>{t.status.order[order.status]}</Badge>
            {showPayment && <Badge tone={payment.tone}>{payment.label}</Badge>}
            {delivery && !closed && <Badge tone={delivery.tone}>{delivery.label}</Badge>}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
      </Link>
      {isNew && <NewOrderActions order={order} />}
    </div>
  )
}

/** Reject (asks first) and Accept, under a new order's row. */
function NewOrderActions({ order }: { order: OrderSummary }) {
  const queryClient = useQueryClient()
  const t = useT()
  const { move, change } = useMoveOrder(order.id, order.number, () =>
    queryClient.invalidateQueries({ queryKey: [...keys.orders, 'list'] }),
  )
  return (
    <div className="flex gap-2 px-4 pb-3 pl-19 sm:px-5 sm:pl-20">
      <Button variant="danger" disabled={change.isPending} onClick={(e) => move('rejected', e.currentTarget)}>
        {t.orders.action.rejected}
      </Button>
      <Button
        loading={change.isPending && change.variables === 'accepted'}
        disabled={change.isPending}
        onClick={(e) => move('accepted', e.currentTarget)}
        className="flex-1"
      >
        {t.orders.action.accepted}
      </Button>
    </div>
  )
}
