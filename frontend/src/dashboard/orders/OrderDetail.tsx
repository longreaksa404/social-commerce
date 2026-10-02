import { MessageSquareText, Phone } from 'lucide-react'
import { useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton } from '../../components/ui.tsx'
import { ApiError } from '../../lib/api.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatOrderTime, formatPhone, ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '../../lib/orders.ts'
import type { Order, OrderStatus } from '../../lib/types.ts'
import { useChangeOrderStatus, useOrder } from '../queries.ts'

// The button for moving an order to each status.
const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  accepted: 'Accept',
  processing: 'Start preparing',
  ready: 'Mark ready',
  shipped: 'Mark shipped',
  delivered: 'Mark delivered',
  completed: 'Complete',
  rejected: 'Reject',
  cancelled: 'Cancel order',
}

// Ending an order: asks first, and its items go back into stock.
const ENDS_ORDER = new Set<OrderStatus>(['rejected', 'cancelled'])

/** /dashboard/orders/:orderId */
export function OrderDetail() {
  const { orderId = '' } = useParams()
  const order = useOrder(orderId)

  if (order.isPending) return <DetailSkeleton />
  if (order.error) {
    return (
      <>
        <PageHeader title="Order" back="/dashboard/orders" />
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </>
    )
  }
  return <OrderView order={order.data} onStale={() => order.refetch()} />
}

function OrderView({ order, onStale }: { order: Order; onStale: () => void }) {
  const { toast, confirm } = useFeedback()
  const change = useChangeOrderStatus(order.id)
  const ends = order.next_statuses.filter((s) => ENDS_ORDER.has(s))
  const forward = order.next_statuses.filter((s) => !ENDS_ORDER.has(s))

  async function move(status: OrderStatus) {
    if (ENDS_ORDER.has(status)) {
      const reject = status === 'rejected'
      const ok = await confirm({
        title: reject ? `Reject order #${order.number}?` : `Cancel order #${order.number}?`,
        message: `Its items go back into stock, and the customer sees it was ${
          reject ? 'not accepted' : 'cancelled'
        } on their order page. This can't be undone.`,
        confirmLabel: reject ? 'Reject order' : 'Cancel order',
        danger: true,
      })
      if (!ok) return
    }
    try {
      await change.mutateAsync(status)
      toast(`Order #${order.number}: ${ORDER_STATUS_LABELS[status]}`)
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.', 'error')
      // Most likely changed on another device: show where it is now.
      if (error instanceof ApiError && error.status === 409) onStale()
    }
  }

  return (
    <>
      <PageHeader title={`Order #${order.number}`} back="/dashboard/orders" />
      <title>{`Order #${order.number}`}</title>

      <div className="space-y-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Badge tone={ORDER_STATUS_TONES[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            <span className="text-sm text-slate-500">Placed {formatOrderTime(order.created_at)}</span>
          </div>
          {order.notes && (
            <div className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-semibold">Note from the customer: </span>
                <span className="whitespace-pre-line break-words">{order.notes}</span>
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="font-semibold text-slate-900">Customer</h2>
          <p className="mt-2 break-words text-slate-900">{order.customer.name}</p>
          <a
            href={`tel:${order.customer.phone}`}
            className="-mx-2 mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <Phone aria-hidden className="size-4" />
            {formatPhone(order.customer.phone)}
          </a>
          {order.delivery_address && (
            <>
              <h3 className="mt-3 text-sm font-medium text-slate-500">Deliver to</h3>
              <p className="mt-0.5 whitespace-pre-line break-words text-slate-900">{order.delivery_address}</p>
            </>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="mb-2 font-semibold text-slate-900">Items</h2>
          <ul className="divide-y divide-slate-100">
            {order.items.map((item, i) => (
              <li key={i} className="flex gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-slate-900">
                    {item.product_name}
                    {item.variant_name && <span className="text-slate-500"> · {item.variant_name}</span>}
                  </span>
                  <span className="text-sm text-slate-500">
                    {item.quantity} × {formatMoney(item.unit_price, order.currency)}
                  </span>
                </span>
                <span className="font-medium text-slate-900">{formatMoney(item.line_total, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatMoney(order.total, order.currency)}</span>
          </div>
        </Card>
      </div>

      {order.next_statuses.length > 0 && (
        // Pinned to the bottom on phones, in reach of a thumb.
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:pb-0">
          <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3 lg:px-0">
            {ends.map((status) => (
              <Button key={status} variant="danger" disabled={change.isPending} onClick={() => move(status)}>
                {ACTION_LABELS[status]}
              </Button>
            ))}
            {forward.map((status) => (
              <Button
                key={status}
                loading={change.isPending && change.variables === status}
                disabled={change.isPending}
                onClick={() => move(status)}
                className="flex-1"
              >
                {ACTION_LABELS[status]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function DetailSkeleton() {
  return (
    <>
      <PageHeader title="Order" back="/dashboard/orders" />
      <div aria-hidden className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </>
  )
}
