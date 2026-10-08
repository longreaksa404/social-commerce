import { ShoppingBag } from 'lucide-react'
import { Fragment } from 'react'
import { Link, useLocation } from 'react-router'
import { useT } from '../../i18n/useT.ts'
import { deliveryBadge } from '../../lib/delivery.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatClock, formatOrderTime, ORDER_STATUS_TONES, type StatusTone } from '../../lib/orders.ts'
import { paymentBadge } from '../../lib/payments.ts'
import type { OrderSummary } from '../../lib/types.ts'
import { ProductImage } from '../../shop/components.tsx'

/** A row in an order list (the Orders tab, a customer's page, a link's
 * page), led by who ordered (founder's pick 2B, 2026-10-08): the customer
 * and the total, then what was bought with the number and time, then the
 * order's statuses as quiet words (only what needs an eye for delivery).
 * No buttons: a new order is accepted or rejected in the open order, which
 * then opens the next new one (OrdersPage). On a customer's own page the
 * item leads instead. `back` is where the order's back arrow returns to,
 * if not the Orders tab. */
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
  /** Open beside the list (laptops): a navy line down its left edge. */
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
  // Unpaid doesn't matter once an order is off; paid (to refund) still does.
  const closed = order.status === 'rejected' || order.status === 'cancelled'
  const words = [{ label: t.status.order[order.status], tone: ORDER_STATUS_TONES[order.status] }]
  if (!(closed && order.payment_status === 'pending')) words.push(payment)
  if (delivery && !closed) words.push(delivery)
  const item = t.order.firstItem(order.first_item_name, order.line_count - 1)
  const numberTime = t.orders.rowNumberTime(
    order.number,
    timeOnly ? formatClock(order.created_at) : formatOrderTime(order.created_at),
  )
  return (
    <div
      className={`relative transition-colors ${selected ? 'bg-navy-100/60 shadow-[inset_4px_0_0_var(--color-brand)]' : ''} ${arrived ? 'animate-arrive' : ''}`}
    >
      <Link
        to={`/dashboard/orders/${order.id}${search}`}
        state={back ? { back } : undefined}
        aria-current={selected ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${selected ? '' : 'hover:bg-slate-50 active:bg-slate-100'} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600`}
      >
        {order.first_item_image_url ? (
          <ProductImage small src={order.first_item_image_url} alt="" className="size-12 shrink-0 rounded-xl" />
        ) : (
          // No photo yet: a soft bag, not a broken picture (founder's pick 4A).
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-500">
            <ShoppingBag aria-hidden className="size-5.5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate font-semibold text-slate-900">{showCustomer ? order.customer_name : item}</span>
            <span className="shrink-0 font-semibold text-slate-900 tabular-nums">
              {formatMoney(order.total, order.currency)}
            </span>
          </span>
          <span className="mt-0.5 flex justify-between gap-3 text-sm text-slate-500">
            {showCustomer ? (
              <>
                <span className="truncate">{item}</span>
                <span className="shrink-0 tabular-nums">{numberTime}</span>
              </>
            ) : (
              <span className="truncate tabular-nums">{numberTime}</span>
            )}
          </span>
          <StatusWords words={words} />
        </span>
      </Link>
    </div>
  )
}

const DOTS: Record<StatusTone, string> = {
  neutral: 'bg-slate-400',
  blue: 'bg-sky-600',
  green: 'bg-emerald-600',
  amber: 'bg-amber-600',
  red: 'bg-red-600',
}

// Payment and delivery take colour only when they need the seller (or
// went well): amber unpaid, red failed, green paid.
const WORDS: Record<StatusTone, string> = {
  neutral: '',
  blue: '',
  green: 'font-semibold text-emerald-700',
  amber: 'font-semibold text-amber-700',
  red: 'font-semibold text-red-600',
}

/** The statuses as words, "● New · Unpaid" (founder's pick 3A): a dot in
 * the order status's colour, then payment and delivery. */
function StatusWords({ words: [status, ...rest] }: { words: { label: string; tone: StatusTone }[] }) {
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-500">
      <span className={`inline-flex items-center gap-1.5 font-semibold ${status.tone === 'red' ? 'text-red-600' : 'text-slate-900'}`}>
        <span aria-hidden className={`size-[7px] rounded-full ${DOTS[status.tone]}`} />
        {status.label}
      </span>
      {rest.map((word) => (
        <Fragment key={word.label}>
          <span className="text-slate-400">
            <span aria-hidden>·</span>
            <span className="sr-only">,</span>
          </span>
          <span className={WORDS[word.tone]}>{word.label}</span>
        </Fragment>
      ))}
    </span>
  )
}
