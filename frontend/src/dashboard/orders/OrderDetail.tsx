import { ChevronDown, ChevronRight, Link2, MapPin, MapPinned, MessageSquareText, Phone, ShoppingBag, Truck, Wallet, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { buzz } from '../../components/effects.ts'
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
import { useOrder, useRecordDelivery, useRecordPayment } from '../queries.ts'
import { useBackTo } from '../useBackTo.ts'
import { ENDS_ORDER, useMoveOrder } from './useMoveOrder.ts'

/** /dashboard/orders/:orderId */
export function OrderDetail() {
  const { orderId = '' } = useParams()
  const order = useOrder(orderId)
  // Back to the tab it was opened from (the list keeps it in ?show=).
  const back = useBackTo(`/dashboard/orders${useLocation().search}`)
  const t = useT()

  if (order.isPending) return <DetailSkeleton back={back} />
  if (order.error) {
    return (
      <>
        <PageHeader title={t.orders.order} back={back} backOnPhonesOnly />
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      </>
    )
  }
  // Keyed: another order starts fresh (its statuses don't pop as changes).
  return <OrderView key={order.data.id} order={order.data} back={back} onStale={() => order.refetch()} />
}

function OrderView({ order, back, onStale }: { order: Order; back: string; onStale: () => void }) {
  const t = useT()
  return (
    <>
      <PageHeader
        title={t.shop.orderNumber(order.number)}
        back={back}
        backOnPhonesOnly
        action={<span className="shrink-0 text-sm text-slate-500">{formatOrderTime(order.created_at)}</span>}
      />
      <title>{t.shop.orderNumber(order.number)}</title>
      <div className="space-y-4">
        {CLOSED.has(order.status) ? <ClosedNote status={order.status} /> : <TodoCard order={order} onStale={onStale} />}
        <SummaryCard order={order} />
        <CustomerCard order={order} />
        <ItemsCard order={order} />
        <DeliverySection order={order} onStale={onStale} />
        <PaymentSection order={order} onStale={onStale} />
      </div>
    </>
  )
}

/** A rejected or cancelled order says so first: nothing is left to do. */
function ClosedNote({ status }: { status: OrderStatus }) {
  const o = useT().orders
  return (
    <p className="-mx-4 flex items-start gap-2.5 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 sm:mx-0 sm:rounded-2xl sm:px-5">
      <XCircle aria-hidden className="mt-0.5 size-4.5 shrink-0" />
      {o.closedNote[status as 'rejected' | 'cancelled']}
    </p>
  )
}

/** Scrolls to a card and flashes a ring around it, so it's clear which
 * block the tap went to. */
function scrollToSection(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const target = document.getElementById(id)
  if (!target) return
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  const ring = 'var(--color-brand)'
  target.animate(
    [
      { boxShadow: `0 0 0 3px ${ring}` },
      { boxShadow: `0 0 0 3px ${ring}`, offset: 0.6 },
      { boxShadow: '0 0 0 3px transparent' },
    ],
    // After a smooth scroll has mostly arrived; held still without motion.
    { duration: 1800, delay: reduce ? 0 : 300, easing: 'ease-out' },
  )
}

/** What the order needs from the seller now, first thing on the page: the
 * order's own next step with its buttons (accept or reject a new order;
 * move it on, or cancel), and, as links to their cards, a payment to check
 * or a driver to assign. The three never set each other (02 section 7). */
function TodoCard({ order, onStale }: { order: Order; onStale: () => void }) {
  const t = useT()
  const o = t.orders
  const { move, change } = useMoveOrder(order.id, order.number, onStale)
  const ends = order.next_statuses.filter((s) => ENDS_ORDER.has(s))
  const forward = order.next_statuses.filter((s) => !ENDS_ORDER.has(s))
  const closed = CLOSED.has(order.status)
  const { payment, delivery } = order

  const links: { id: string; text: string }[] = []
  if (!closed && order.status !== 'pending' && payment.next_statuses.includes('paid')) {
    if (payment.method !== 'cod') links.push({ id: 'payment', text: o.todo.payment })
    // Cash is in hand once it's been handed over.
    else if (delivery.status === 'delivered' || order.status === 'delivered') links.push({ id: 'payment', text: o.todo.cash })
  }
  if (!closed && order.status !== 'pending' && delivery.method !== 'pickup' && delivery.status === 'not_assigned') {
    links.push({ id: 'delivery', text: o.todo.driver })
  }
  if (ends.length + forward.length + links.length === 0) return null

  return (
    <section
      aria-label={o.todo.label}
      className="-mx-4 border-y-2 border-brand/40 bg-surface p-4 sm:mx-0 sm:rounded-2xl sm:border-2 sm:p-5"
    >
      <p className="text-xs font-bold tracking-wide text-brand">{o.todo.label}</p>
      {(ends.length > 0 || forward.length > 0) && (
        <>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {order.status === 'pending' ? o.todo.accept : o.todo.next}
          </h2>
          <div className="mt-3 flex gap-3">
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
        </>
      )}
      {links.length > 0 && (
        <ul className={`divide-y divide-slate-100 ${ends.length + forward.length > 0 ? 'mt-3 border-t border-slate-100' : 'mt-1'}`}>
          {links.map((link) => (
            <li key={link.text}>
              <button
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="flex min-h-11 w-full items-center gap-2 py-2 text-left font-medium text-slate-900 hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-navy-600"
              >
                <span className="flex-1">{link.text}</span>
                <ChevronDown aria-hidden className="size-4.5 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The order at a glance: what it comes to, and its three statuses in
 * one strip (order, delivery, payment). They move independently (02
 * section 7); a dot marks the one waiting on the seller, and delivery and
 * payment jump to their cards. */
function SummaryCard({ order }: { order: Order }) {
  const t = useT()
  const o = t.orders
  const payment = paymentBadge(t, order.payment.method, order.payment.status)
  const delivery = deliveryBadge(t, order.delivery.method, order.delivery.status)
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const closed = CLOSED.has(order.status)
  // Order, then delivery, then payment; each with its own status.
  const parts = [
    {
      key: 'order',
      icon: ShoppingBag,
      label: o.order,
      status: order.status,
      badge: { label: t.status.order[order.status], tone: ORDER_STATUS_TONES[order.status] },
      needs: order.status === 'pending',
      target: null,
    },
    {
      key: 'delivery',
      icon: order.delivery.method === 'pickup' ? MapPin : Truck,
      label: order.delivery.method === 'pickup' ? t.checkout.pickup : o.delivery,
      status: order.delivery.status,
      badge: delivery,
      needs:
        !closed &&
        (order.delivery.status === 'failed' ||
          (order.status !== 'pending' && order.delivery.method !== 'pickup' && order.delivery.status === 'not_assigned')),
      target: 'delivery',
    },
    {
      key: 'payment',
      icon: Wallet,
      label: o.payment,
      status: order.payment.status,
      badge: payment,
      needs: !closed && order.payment.status === 'pending' && order.payment.method !== 'cod' && order.status !== 'pending',
      target: 'payment',
    },
  ]
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{formatMoney(order.total, order.currency)}</p>
        <p className="text-sm text-slate-500">{o.items(count)}</p>
      </div>
      {/* One strip in three (three rows on a phone): an icon in the
          status's colour, the name small, the status in bold; a dot on
          the icon marks what waits on the seller. */}
      <ul className="mt-4 grid divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {parts.map(({ key, icon: Icon, label, status, badge, needs, target }) => {
          const body = (
            <>
              <span className={`relative flex size-9 shrink-0 items-center justify-center rounded-full ${TONE_CIRCLE[badge.tone]}`}>
                <Icon aria-hidden className="size-4.5" />
                {needs && (
                  <span aria-hidden className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-amber-500" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-slate-500">{label}</span>
                <span key={status} className="block animate-pop truncate font-semibold text-slate-900">
                  {badge.label}
                </span>
              </span>
              {target && <ChevronDown aria-hidden className="size-4 shrink-0 text-slate-400 sm:hidden" />}
            </>
          )
          // A closed order's delivery and payment no longer matter: faded.
          const cell = `flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left ${closed && key !== 'order' ? 'opacity-50' : ''}`
          return (
            <li key={key} className="min-w-0">
              {target ? (
                <button
                  type="button"
                  onClick={() => scrollToSection(target)}
                  className={`${cell} transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600`}
                >
                  {body}
                </button>
              ) : (
                <div className={cell}>{body}</div>
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
              <Button variant="danger" onClick={markFailed} disabled={record.isPending}>
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

// The status icon's circle, in the status's colour.
const TONE_CIRCLE: Record<'neutral' | 'red' | 'green' | 'amber' | 'blue', string> = {
  neutral: 'bg-slate-100 text-slate-600',
  red: 'bg-red-50 text-red-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-sky-50 text-sky-700',
}

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
                <Button key={status} variant="danger" onClick={() => save(status)} disabled={record.isPending}>
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
      <PageHeader title={t.orders.order} back={back} backOnPhonesOnly />
      <div aria-hidden className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </>
  )
}
