import { ChevronDown, ChevronRight, Link2, MapPin, MapPinned, MessageSquareText, Phone, Truck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { buzz, confetti } from '../../components/effects.ts'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card, ErrorState, Field, Input, LiveBadge, PageHeader, Skeleton } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { ApiError } from '../../lib/api.ts'
import { deliveryAction, deliveryBadge } from '../../lib/delivery.ts'
import { sourceLabel } from '../../lib/links.ts'
import { errorText } from '../../lib/errors.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatOrderTime, formatPhone, ORDER_STATUS_TONES } from '../../lib/orders.ts'
import { paymentBadge } from '../../lib/payments.ts'
import type { DeliveryStatus, Order, OrderStatus } from '../../lib/types.ts'
import { useChangeOrderStatus, useOrder, useRecordDelivery, useRecordPayment } from '../queries.ts'
import { useBackTo } from '../useBackTo.ts'

// Ending an order: asks first, and its items go back into stock.
const ENDS_ORDER = new Set<OrderStatus>(['rejected', 'cancelled'])

/** /dashboard/orders/:orderId */
export function OrderDetail() {
  const { orderId = '' } = useParams()
  const order = useOrder(orderId)
  const back = useBackTo('/dashboard/orders')
  const t = useT()

  if (order.isPending) return <DetailSkeleton back={back} />
  if (order.error) {
    return (
      <>
        <PageHeader title={t.orders.order} back={back} />
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </>
    )
  }
  // Keyed: another order starts fresh (its statuses don't pop as changes).
  return <OrderView key={order.data.id} order={order.data} back={back} onStale={() => order.refetch()} />
}

function OrderView({ order, back, onStale }: { order: Order; back: string; onStale: () => void }) {
  const { toast, confirm } = useFeedback()
  const t = useT()
  const o = t.orders
  const change = useChangeOrderStatus(order.id)
  const ends = order.next_statuses.filter((s) => ENDS_ORDER.has(s))
  const forward = order.next_statuses.filter((s) => !ENDS_ORDER.has(s))

  async function move(status: OrderStatus, button: HTMLElement) {
    // Read now: the button goes once the order has moved on.
    const from = button.getBoundingClientRect()
    if (ENDS_ORDER.has(status)) {
      const reject = status === 'rejected'
      const ok = await confirm({
        title: reject ? o.rejectTitle(order.number) : o.cancelTitle(order.number),
        message: reject ? o.rejectMessage : o.cancelMessage,
        confirmLabel: reject ? o.rejectConfirm : o.cancelConfirm,
        danger: true,
      })
      if (!ok) return
    }
    try {
      await change.mutateAsync(status)
      buzz()
      // The end of the road for an order: a little celebration.
      if (status === 'completed') confetti(from.left + from.width / 2, from.top + from.height / 2)
      toast(o.changed(order.number, t.status.order[status]))
    } catch (error) {
      toast(errorText(error), 'error')
      // Most likely changed on another device: show where it is now.
      if (error instanceof ApiError && error.status === 409) onStale()
    }
  }

  return (
    <>
      <PageHeader title={t.shop.orderNumber(order.number)} back={back} />
      <title>{t.shop.orderNumber(order.number)}</title>

      {/* Phones: one column, what was ordered first. Wide screens: items and
          customer beside delivery and payment. */}
      <div className="space-y-4">
        <SummaryCard order={order} />
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
          <div className="space-y-4">
            <ItemsCard order={order} />
            <CustomerCard order={order} />
          </div>
          <div className="space-y-4">
            <DeliverySection order={order} onStale={onStale} />
            <PaymentSection order={order} onStale={onStale} />
          </div>
        </div>
      </div>

      {order.next_statuses.length > 0 && (
        // Pinned to the bottom, in reach of a thumb (floating at the bottom
        // of the page on wide screens, so the next step needs no scrolling).
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:sticky lg:bottom-4 lg:mt-4 lg:rounded-2xl lg:border-0 lg:bg-surface/95 lg:pb-0 lg:shadow-card lg:ring-1 lg:ring-slate-900/6">
          <div className="mx-auto flex max-w-3xl gap-3 px-4 py-3 lg:max-w-none">
            {ends.map((status) => (
              <Button key={status} variant="danger" disabled={change.isPending} onClick={(e) => move(status, e.currentTarget)}>
                {o.action[status as keyof typeof o.action]}
              </Button>
            ))}
            {forward.map((status) => (
              <Button
                key={status}
                loading={change.isPending && change.variables === status}
                disabled={change.isPending}
                onClick={(e) => move(status, e.currentTarget)}
                className="flex-1"
              >
                {o.action[status as keyof typeof o.action]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/** The order at a glance: what it comes to, and where each of its three
 * statuses stands. They move independently (02 section 7); each line
 * jumps to its card. */
function SummaryCard({ order }: { order: Order }) {
  const t = useT()
  const o = t.orders
  const payment = paymentBadge(t, order.payment.method, order.payment.status)
  const delivery = deliveryBadge(t, order.delivery.method, order.delivery.status)
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const rows = [
    {
      label: o.order,
      status: order.status,
      badge: { label: t.status.order[order.status], tone: ORDER_STATUS_TONES[order.status] },
      href: null,
    },
    { label: o.payment, status: order.payment.status, badge: payment, href: '#payment' },
    {
      label: order.delivery.method === 'pickup' ? t.checkout.pickup : o.delivery,
      status: order.delivery.status,
      badge: delivery,
      href: '#delivery',
    },
  ]
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{formatMoney(order.total, order.currency)}</p>
          <p className="mt-0.5 text-sm text-slate-500">{o.items(count)}</p>
        </div>
        <span className="pt-1.5 text-right text-sm text-slate-500">{o.placed(formatOrderTime(order.created_at))}</span>
      </div>
      <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {rows.map(({ label, status, badge, href }) => {
          const content = (
            <>
              <span className="text-sm text-slate-600">{label}</span>
              <span className="flex items-center gap-1">
                <LiveBadge value={status} tone={badge.tone}>
                  {badge.label}
                </LiveBadge>
                {href && <ChevronDown aria-hidden className="size-4 text-slate-400" />}
              </span>
            </>
          )
          const row =
            'flex min-h-11 items-center justify-between gap-3 px-3.5 py-2 lg:flex-col lg:items-start lg:justify-center lg:gap-1 lg:py-3'
          return (
            <li key={label}>
              {href ? (
                <a
                  href={href}
                  onClick={(e) => {
                    // Scroll only: a #hash entry would drop the back arrow's
                    // destination (useBackTo reads the page's history state).
                    e.preventDefault()
                    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                    document.querySelector(href)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
                  }}
                  className={`${row} transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600`}
                >
                  {content}
                </a>
              ) : (
                <div className={row}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
      {order.source && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
          <Link2 aria-hidden className="size-4 shrink-0" />
          {o.cameThrough(sourceLabel(order.source))}
        </p>
      )}
      {order.notes && (
        <div className="mt-3 flex gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">{o.noteFromCustomer}</span>
            <span className="whitespace-pre-line break-words">{order.notes}</span>
          </p>
        </div>
      )}
    </Card>
  )
}

function ItemsCard({ order }: { order: Order }) {
  const t = useT()
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-2 font-semibold text-slate-900">{t.order.items}</h2>
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
          <dt className="text-slate-600">{t.shop.summary.items}</dt>
          <dd className="text-slate-900">{formatMoney(order.subtotal, order.currency)}</dd>
        </div>
        {Number(order.discount) > 0 && (
          <div className="flex justify-between">
            <dt className="text-slate-600">{t.shop.summary.discount}</dt>
            <dd className="text-slate-900">−{formatMoney(order.discount, order.currency)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-slate-600">{order.delivery_method === 'pickup' ? t.checkout.pickup : t.shop.summary.delivery}</dt>
          <dd className="text-slate-900">
            {Number(order.delivery_fee) > 0 ? formatMoney(order.delivery_fee, order.currency) : t.shop.summary.free}
          </dd>
        </div>
      </dl>
      <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
        <span className="font-semibold text-slate-900">{t.shop.summary.total}</span>
        <span className="text-lg font-bold text-slate-900">{formatMoney(order.total, order.currency)}</span>
      </div>
    </Card>
  )
}

function CustomerCard({ order }: { order: Order }) {
  const o = useT().orders
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{o.customer}</h2>
        <Link
          to={`/dashboard/customers/${order.customer.id}`}
          state={{ back: `/dashboard/orders/${order.id}` }}
          className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-navy-700 hover:underline focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          {o.viewCustomer}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      <p className="mt-2 break-words text-slate-900">{order.customer.name}</p>
      <a
        href={`tel:${order.customer.phone}`}
        className="-mx-2 mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium text-navy-700 hover:underline focus-visible:outline-2 focus-visible:outline-navy-600"
      >
        <Phone aria-hidden className="size-4" />
        {formatPhone(order.customer.phone)}
      </a>
      {order.delivery_method === 'seller_delivery' && (
        <>
          <h3 className="mt-3 text-sm font-medium text-slate-500">{o.deliverTo}</h3>
          {order.delivery_address && (
            <p className="mt-0.5 whitespace-pre-line break-words text-slate-900">{order.delivery_address}</p>
          )}
          {order.delivery_address_note && (
            <p className="mt-1 text-sm break-words text-slate-600">
              <span className="text-slate-500">{o.note}</span>
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
              {o.openMaps}
            </a>
          )}
        </>
      )}
    </Card>
  )
}

/** The payment is its own state machine (02 section 7.2): recording it
 * never moves the order, but an order that isn't cash on delivery can only
 * be completed once it's paid (section 7.4). */
function PaymentSection({ order, onStale }: { order: Order; onStale: () => void }) {
  const { toast, confirm } = useFeedback()
  const t = useT()
  const o = t.orders
  const record = useRecordPayment(order.id)
  const [confirming, setConfirming] = useState(false)
  const [reference, setReference] = useState('')
  const { payment } = order
  const badge = paymentBadge(t, payment.method, payment.status)
  const cod = payment.method === 'cod'
  // Delivered both ways, but the payment still holds up completing (02 section 7.4).
  const waitsForPayment =
    order.status === 'delivered' && order.delivery.status === 'delivered' && !order.next_statuses.includes('completed')

  async function save(status: 'paid' | 'failed') {
    try {
      await record.mutateAsync({ status, reference: reference.trim() || null })
      buzz()
      toast(o.changed(order.number, status === 'paid' ? o.paidToast : o.failedToast))
      setConfirming(false)
    } catch (error) {
      toast(errorText(error), 'error')
      if (error instanceof ApiError && error.status === 409) onStale()
    }
  }

  async function markFailed() {
    const ok = await confirm({
      title: o.failTitle,
      message: o.failMessage,
      confirmLabel: o.paymentFailed,
      danger: true,
    })
    if (ok) save('failed')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save('paid')
  }

  return (
    <Card id="payment" className="scroll-mt-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{o.payment}</h2>
        <LiveBadge value={payment.status} tone={badge.tone}>
          {badge.label}
        </LiveBadge>
      </div>
      <p className="mt-2 text-slate-900">
        {t.status.paymentMethod[payment.method]} · {formatMoney(payment.amount, order.currency)}
      </p>
      {payment.paid_at && (
        <p className="mt-0.5 text-sm text-slate-500">{o.markedPaid(formatOrderTime(payment.paid_at))}</p>
      )}
      {payment.reference && (
        <p className="mt-1 text-sm break-words text-slate-600">
          <span className="text-slate-500">{o.note}</span>
          {payment.reference}
        </p>
      )}
      {waitsForPayment && (
        <p className="mt-2 text-sm text-amber-800">{o.waitsForPayment}</p>
      )}

      {payment.next_statuses.includes('paid') &&
        (confirming ? (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Field
              label={o.noteOptional}
              hint={cod ? o.noteHintCod : o.noteHintTransfer}
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
                {t.common.back}
              </Button>
              <Button type="submit" loading={record.isPending} className="flex-1">
                {cod ? o.confirmCash : o.confirmPaid}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex gap-3">
            {payment.next_statuses.includes('failed') && (
              <Button variant="ghost" onClick={markFailed} disabled={record.isPending}>
                {o.paymentFailed}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setConfirming(true)} className="flex-1">
              {cod ? o.cashReceived : o.markPaid}
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
  const t = useT()
  const o = t.orders
  const record = useRecordDelivery(order.id)
  const [assigning, setAssigning] = useState(false)
  const [note, setNote] = useState('')
  const { delivery } = order
  const pickup = delivery.method === 'pickup'
  const badge = deliveryBadge(t, delivery.method, delivery.status)
  const Icon = pickup ? MapPin : Truck
  // Nothing to deliver once the order is off, so no buttons (the server
  // would still allow it: the two never set each other).
  const actions = CLOSED.has(order.status) ? [] : delivery.next_statuses
  const waitsForDelivery = order.status === 'delivered' && delivery.status !== 'delivered'

  async function save(status: DeliveryStatus) {
    try {
      await record.mutateAsync({ status, assignee_note: status === 'assigned' ? note.trim() || null : null })
      buzz()
      toast(o.changed(order.number, deliveryBadge(t, delivery.method, status).label))
      setAssigning(false)
      setNote('')
    } catch (error) {
      toast(errorText(error), 'error')
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
    <Card id="delivery" className="scroll-mt-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Icon aria-hidden className="size-4.5 text-slate-500" />
          {pickup ? t.checkout.pickup : o.delivery}
        </h2>
        <LiveBadge value={delivery.status} tone={badge.tone}>
          {badge.label}
        </LiveBadge>
      </div>
      <p className="mt-2 text-slate-900">
        {pickup ? o.customerCollects : delivery.courier ? o.sendWith(delivery.courier) : o.ownDelivery}
        {' · '}
        {Number(order.delivery_fee) > 0 ? formatMoney(order.delivery_fee, order.currency) : t.shop.summary.free}
      </p>
      {delivery.assignee_note && (
        <p className="mt-1 text-sm break-words text-slate-600">
          <span className="text-slate-500">{delivery.courier ? o.note : o.delivering}</span>
          {delivery.assignee_note}
        </p>
      )}
      {waitsForDelivery && (
        <p className="mt-2 text-sm text-amber-800">
          {pickup ? o.waitsCollected : o.waitsDelivered}
        </p>
      )}

      {assigning ? (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field
            label={delivery.courier ? o.courierNote : o.driverNote}
            hint={delivery.courier ? o.courierNoteHint(delivery.courier) : o.driverNoteHint}
          >
            <Input maxLength={200} autoFocus value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setAssigning(false)} disabled={record.isPending}>
              {t.common.back}
            </Button>
            <Button type="submit" loading={record.isPending} className="flex-1">
              {deliveryAction(t, delivery, 'assigned')}
            </Button>
          </div>
        </form>
      ) : (
        actions.length > 0 && (
          <div className="mt-4 flex gap-3">
            {actions.map((status) =>
              status === 'failed' ? (
                <Button key={status} variant="ghost" onClick={() => save(status)} disabled={record.isPending}>
                  {deliveryAction(t, delivery, status)}
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
                  {deliveryAction(t, delivery, status)}
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
  const t = useT()
  return (
    <>
      <PageHeader title={t.orders.order} back={back} />
      <div aria-hidden className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </>
  )
}
