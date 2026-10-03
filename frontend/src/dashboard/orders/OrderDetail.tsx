import { ChevronRight, MapPin, MapPinned, MessageSquareText, Phone, Truck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Badge, Button, Card, ErrorState, Field, Input, PageHeader, Skeleton } from '../../components/ui.tsx'
import { ApiError } from '../../lib/api.ts'
import { deliveryAction, deliveryBadge } from '../../lib/delivery.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatOrderTime, formatPhone, ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '../../lib/orders.ts'
import { PAYMENT_METHOD_LABELS, paymentBadge } from '../../lib/payments.ts'
import type { DeliveryStatus, Order, OrderStatus } from '../../lib/types.ts'
import { useChangeOrderStatus, useOrder, useRecordDelivery, useRecordPayment } from '../queries.ts'
import { useBackTo } from '../useBackTo.ts'

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
  const back = useBackTo('/dashboard/orders')

  if (order.isPending) return <DetailSkeleton back={back} />
  if (order.error) {
    return (
      <>
        <PageHeader title="Order" back={back} />
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </>
    )
  }
  return <OrderView order={order.data} back={back} onStale={() => order.refetch()} />
}

function OrderView({ order, back, onStale }: { order: Order; back: string; onStale: () => void }) {
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
      <PageHeader title={`Order #${order.number}`} back={back} />
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

        <DeliverySection order={order} onStale={onStale} />

        <PaymentSection order={order} onStale={onStale} />

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Customer</h2>
            <Link
              to={`/dashboard/customers/${order.customer.id}`}
              state={{ back: `/dashboard/orders/${order.id}` }}
              className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              View customer
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="mt-2 break-words text-slate-900">{order.customer.name}</p>
          <a
            href={`tel:${order.customer.phone}`}
            className="-mx-2 mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            <Phone aria-hidden className="size-4" />
            {formatPhone(order.customer.phone)}
          </a>
          {order.delivery_method === 'seller_delivery' && (
            <>
              <h3 className="mt-3 text-sm font-medium text-slate-500">Deliver to</h3>
              {order.delivery_address && (
                <p className="mt-0.5 whitespace-pre-line break-words text-slate-900">{order.delivery_address}</p>
              )}
              {order.delivery_address_note && (
                <p className="mt-1 text-sm break-words text-slate-600">
                  <span className="text-slate-500">Note: </span>
                  {order.delivery_address_note}
                </p>
              )}
              {order.delivery_lat !== null && order.delivery_lng !== null && (
                <a
                  href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${buttonClass('secondary')} mt-3 w-full sm:w-auto`}
                >
                  <MapPinned aria-hidden className="size-4" />
                  Open in Google Maps
                </a>
              )}
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
          <dl className="mt-2 space-y-1 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Items</dt>
              <dd className="text-slate-900">{formatMoney(order.subtotal, order.currency)}</dd>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Discount</dt>
                <dd className="text-slate-900">−{formatMoney(order.discount, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-600">{order.delivery_method === 'pickup' ? 'Pickup' : 'Delivery'}</dt>
              <dd className="text-slate-900">
                {Number(order.delivery_fee) > 0 ? formatMoney(order.delivery_fee, order.currency) : 'Free'}
              </dd>
            </div>
          </dl>
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

/** The payment is its own state machine (02 section 7.2): recording it
 * never moves the order, but an order that isn't cash on delivery can only
 * be completed once it's paid (section 7.4). */
function PaymentSection({ order, onStale }: { order: Order; onStale: () => void }) {
  const { toast, confirm } = useFeedback()
  const record = useRecordPayment(order.id)
  const [confirming, setConfirming] = useState(false)
  const [reference, setReference] = useState('')
  const { payment } = order
  const badge = paymentBadge(payment.method, payment.status)
  const cod = payment.method === 'cod'
  // Delivered both ways, but the payment still holds up completing (02 section 7.4).
  const waitsForPayment =
    order.status === 'delivered' && order.delivery.status === 'delivered' && !order.next_statuses.includes('completed')

  async function save(status: 'paid' | 'failed') {
    try {
      await record.mutateAsync({ status, reference: reference.trim() || null })
      toast(status === 'paid' ? `Order #${order.number}: paid` : `Order #${order.number}: payment failed`)
      setConfirming(false)
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.', 'error')
      if (error instanceof ApiError && error.status === 409) onStale()
    }
  }

  async function markFailed() {
    const ok = await confirm({
      title: 'Mark the payment as failed?',
      message: "Use this when the customer didn't pay, or the transfer never arrived. This can't be undone.",
      confirmLabel: 'Payment failed',
      danger: true,
    })
    if (ok) save('failed')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save('paid')
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Payment</h2>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <p className="mt-2 text-slate-900">
        {PAYMENT_METHOD_LABELS[payment.method]} · {formatMoney(payment.amount, order.currency)}
      </p>
      {payment.paid_at && (
        <p className="mt-0.5 text-sm text-slate-500">Marked paid {formatOrderTime(payment.paid_at)}</p>
      )}
      {payment.reference && (
        <p className="mt-1 text-sm break-words text-slate-600">
          <span className="text-slate-500">Note: </span>
          {payment.reference}
        </p>
      )}
      {waitsForPayment && (
        <p className="mt-2 text-sm text-amber-800">Mark it paid to complete this order.</p>
      )}

      {payment.next_statuses.includes('paid') &&
        (confirming ? (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Field
              label="Note (optional)"
              hint={cod ? 'For example, who collected the cash.' : 'For example: ABA, 2:05 PM, last digits 123.'}
            >
              <Input
                maxLength={200}
                autoFocus
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={record.isPending}>
                Back
              </Button>
              <Button type="submit" loading={record.isPending} className="flex-1">
                {cod ? 'Confirm cash received' : 'Confirm paid'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex gap-3">
            {payment.next_statuses.includes('failed') && (
              <Button variant="ghost" onClick={markFailed} disabled={record.isPending}>
                Payment failed
              </Button>
            )}
            <Button variant="secondary" onClick={() => setConfirming(true)} className="flex-1">
              {cod ? 'Cash received' : 'Mark paid'}
            </Button>
          </div>
        ))}
    </Card>
  )
}

const CLOSED = new Set<OrderStatus>(['rejected', 'cancelled'])

/** The delivery is its own state machine too (02 section 7.3): moving it
 * never moves the order, but an order can only be completed once its
 * delivery is delivered (section 7.4). */
function DeliverySection({ order, onStale }: { order: Order; onStale: () => void }) {
  const { toast } = useFeedback()
  const record = useRecordDelivery(order.id)
  const [assigning, setAssigning] = useState(false)
  const [note, setNote] = useState('')
  const { delivery } = order
  const pickup = delivery.method === 'pickup'
  const badge = deliveryBadge(delivery.method, delivery.status)
  const Icon = pickup ? MapPin : Truck
  // Nothing to deliver once the order is off, so no buttons (the server
  // would still allow it: the two never set each other).
  const actions = CLOSED.has(order.status) ? [] : delivery.next_statuses
  const waitsForDelivery = order.status === 'delivered' && delivery.status !== 'delivered'

  async function save(status: DeliveryStatus) {
    try {
      await record.mutateAsync({ status, assignee_note: status === 'assigned' ? note.trim() || null : null })
      toast(`Order #${order.number}: ${deliveryBadge(delivery.method, status).label.toLowerCase()}`)
      setAssigning(false)
      setNote('')
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.', 'error')
      if (error instanceof ApiError && error.status === 409) onStale()
    }
  }

  function startAssigning() {
    setNote(delivery.assignee_note ?? '')
    setAssigning(true)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save('assigned')
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Icon aria-hidden className="size-4.5 text-slate-500" />
          {pickup ? 'Pickup' : 'Delivery'}
        </h2>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <p className="mt-2 text-slate-900">
        {pickup ? 'The customer collects it' : delivery.courier ? `Send with ${delivery.courier}` : 'Your own delivery'}
        {' · '}
        {Number(order.delivery_fee) > 0 ? formatMoney(order.delivery_fee, order.currency) : 'Free'}
      </p>
      {delivery.assignee_note && (
        <p className="mt-1 text-sm break-words text-slate-600">
          <span className="text-slate-500">{delivery.courier ? 'Note: ' : 'Delivering: '}</span>
          {delivery.assignee_note}
        </p>
      )}
      {waitsForDelivery && (
        <p className="mt-2 text-sm text-amber-800">
          {pickup ? 'Mark it collected to complete this order.' : 'Mark the delivery delivered to complete this order.'}
        </p>
      )}

      {assigning ? (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field
            label={delivery.courier ? 'Courier branch or tracking number (optional)' : "Who's delivering? (optional)"}
            hint={
              delivery.courier
                ? `For example: ${delivery.courier} Takeo branch, no. 123456. Only you see this.`
                : 'For example: Sokha, 012 999 888. Only you see this.'
            }
          >
            <Input maxLength={200} autoFocus value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setAssigning(false)} disabled={record.isPending}>
              Back
            </Button>
            <Button type="submit" loading={record.isPending} className="flex-1">
              {deliveryAction(delivery, 'assigned')}
            </Button>
          </div>
        </form>
      ) : (
        actions.length > 0 && (
          <div className="mt-4 flex gap-3">
            {actions.map((status) =>
              status === 'failed' ? (
                <Button key={status} variant="ghost" onClick={() => save(status)} disabled={record.isPending}>
                  {deliveryAction(delivery, status)}
                </Button>
              ) : (
                <Button
                  key={status}
                  variant="secondary"
                  loading={record.isPending && record.variables?.status === status}
                  disabled={record.isPending}
                  onClick={() => (status === 'assigned' ? startAssigning() : save(status))}
                  className="flex-1"
                >
                  {deliveryAction(delivery, status)}
                </Button>
              ),
            )}
          </div>
        )
      )}
    </Card>
  )
}

function DetailSkeleton({ back }: { back: string }) {
  return (
    <>
      <PageHeader title="Order" back={back} />
      <div aria-hidden className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </>
  )
}
