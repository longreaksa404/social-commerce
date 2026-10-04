import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { deliveryBadge } from '../../lib/delivery.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatOrderTime, ORDER_STATUS_TONES } from '../../lib/orders.ts'
import { paymentBadge } from '../../lib/payments.ts'
import type { OrderSummary } from '../../lib/types.ts'

/** A row in an order list (the Orders tab, a customer's page). `back` is
 * where the order's back arrow returns to, if not the Orders tab. */
export function OrderRow({
  order,
  showCustomer = true,
  back,
  arrived = false,
}: {
  order: OrderSummary
  showCustomer?: boolean
  back?: string
  /** Just came in while the list was open: slides in, highlighted. */
  arrived?: boolean
}) {
  const t = useT()
  const payment = paymentBadge(t, order.payment_method, order.payment_status)
  // Only what needs the seller's eye: a pickup, or a delivery that failed.
  const delivery =
    order.delivery_status === 'failed'
      ? deliveryBadge(t, order.delivery_method, 'failed')
      : order.delivery_method === 'pickup'
        ? { label: t.checkout.pickup, tone: 'neutral' as const }
        : null
  return (
    <Link
      to={`/dashboard/orders/${order.id}`}
      state={back ? { back } : undefined}
      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:p-4 ${arrived ? 'animate-arrive' : ''}`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-900">#{order.number}</span>
          <Badge tone={ORDER_STATUS_TONES[order.status]}>{t.status.order[order.status]}</Badge>
          <Badge tone={payment.tone}>{payment.label}</Badge>
          {delivery && <Badge tone={delivery.tone}>{delivery.label}</Badge>}
        </span>
        {showCustomer && <span className="mt-0.5 block truncate text-sm text-slate-700">{order.customer_name}</span>}
        <span className="mt-0.5 block text-xs text-slate-500">
          {t.orders.items(order.item_count)} · {formatOrderTime(order.created_at)}
        </span>
      </span>
      <span className="shrink-0 font-semibold text-slate-900">{formatMoney(order.total, order.currency)}</span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-slate-300" />
    </Link>
  )
}
