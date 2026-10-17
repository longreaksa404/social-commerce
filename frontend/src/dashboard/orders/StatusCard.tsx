import { LoaderCircle, MapPin, Plus, Send, ShoppingBag, Truck, Wallet, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode, type Ref } from 'react'
import { Button, Card, Field, Input } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { deliveryAction, deliveryBadge } from '../../lib/delivery.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatOrderTime, ORDER_STATUS_TONES, type StatusTone } from '../../lib/orders.ts'
import { paymentBadge } from '../../lib/payments.ts'
import type { Order, OrderStatus } from '../../lib/types.ts'
import { cashDue, CLOSED, nextStep, unpaidTransfer } from './orderSteps.ts'
import { SendAgain } from './SendToDriver.tsx'
import type { OrderActions } from './useOrderActions.ts'

// A status in its colour, on the words only (founder, 2026-10-15).
const TONE_TEXT: Record<StatusTone, string> = {
  neutral: 'text-slate-900',
  blue: 'text-sky-700',
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
}

// The order's own steps between Accept and Complete: optional since the
// short path (founder's pick 1C, 2026-10-09), for customers who follow
// along. Its "delivered" is left out: the delivery's own Delivered says it.
const OPTIONAL_STEPS = new Set<OrderStatus>(['processing', 'ready', 'shipped'])

/** Where the order stands, at the top of the page (founder's pick 1A,
 * 2026-10-15): a row each for the order, the delivery and the payment,
 * with that status's own buttons, so every button shows once and changes
 * only its own row (02 section 7). The row waiting on the seller
 * (`nextStep`) is shaded and has the dark button. A new order shows no
 * delivery or payment buttons until it's accepted; a closed one none. */
export function StatusCard({
  order,
  actions,
  paying,
  setPaying,
  onSend,
  ref,
}: {
  order: Order
  actions: OrderActions
  /** The Mark paid note form is open (the pinned button opens it too). */
  paying: boolean
  setPaying: (open: boolean) => void
  onSend: () => void
  ref?: Ref<HTMLElement>
}) {
  const o = useT().orders
  const step = nextStep(order)
  const closed = CLOSED.has(order.status)
  return (
    <section ref={ref} aria-label={o.statuses} className="scroll-mt-4">
      <Card className="divide-y divide-slate-100 overflow-hidden">
        <OrderRow order={order} actions={actions} step={step} />
        <div className={closed ? 'opacity-50' : ''}>
          <DeliveryRow order={order} actions={actions} step={step} onSend={onSend} />
        </div>
        <div className={closed ? 'opacity-50' : ''}>
          <PaymentRow order={order} actions={actions} step={step} paying={paying} setPaying={setPaying} />
        </div>
      </Card>
    </section>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  tone,
  shaded,
  children,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: StatusTone
  shaded: boolean
  children?: ReactNode
}) {
  return (
    <div className={`flex gap-3 px-4 py-3.5 transition-colors sm:px-5 ${shaded ? 'bg-navy-50' : ''}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon aria-hidden className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`font-semibold break-words ${TONE_TEXT[tone]}`}>{value}</p>
        {children}
      </div>
    </div>
  )
}

/** On the shaded row's dark button: the pinned bar on phones shows while
 * it's off the screen. */
const NEXT = { 'data-next-step': true }
const nextIf = (on: boolean) => (on ? NEXT : {})

const Sub = ({ children }: { children: ReactNode }) => <p className="mt-0.5 text-sm break-words text-slate-500">{children}</p>
const Buttons = ({ children }: { children: ReactNode }) => <div className="mt-3 flex flex-wrap gap-2.5">{children}</div>

function OrderRow({ order, actions, step }: { order: Order; actions: OrderActions; step: ReturnType<typeof nextStep> }) {
  const t = useT()
  const o = t.orders
  const { busy, change, move } = actions
  const [showSteps, setShowSteps] = useState(false)
  const ends = order.next_statuses.filter((s) => s === 'rejected')
  const optional = order.next_statuses.filter((s) => OPTIONAL_STEPS.has(s))
  // The delivery's own optional steps, once someone has it.
  const { delivery } = order
  const out = delivery.status === 'assigned' || delivery.status === 'picked_up' || delivery.status === 'in_transit'
  const deliverySteps =
    out && !CLOSED.has(order.status) ? delivery.next_statuses.filter((s) => s === 'picked_up' || s === 'in_transit') : []
  const canComplete = order.next_statuses.includes('completed')
  let body: ReactNode = null
  if (order.status === 'pending') {
    body = (
      <Buttons>
        {ends.map((status) => (
          <Button key={status} variant="danger" disabled={busy} onClick={() => move(status)}>
            {o.action.rejected}
          </Button>
        ))}
        <Button
          {...NEXT}
          loading={change.isPending && change.variables === 'accepted'}
          disabled={busy}
          onClick={() => move('accepted')}
          className="flex-1"
        >
          {o.action.accepted}
        </Button>
      </Buttons>
    )
  } else if (canComplete) {
    // Cash still to record: both in one tap (UX check #8); "Complete
    // without the cash" is in the ⋯ menu.
    const cash = cashDue(order)
    body = (
      <Buttons>
        <Button
          {...nextIf(step === 'complete')}
          loading={(change.isPending && change.variables === 'completed') || (cash && actions.payment.isPending)}
          disabled={busy}
          onClick={cash ? actions.cashAndComplete : () => move('completed')}
          className="flex-1"
        >
          {cash ? o.cashAndComplete : o.action.completed}
        </Button>
      </Buttons>
    )
  } else if (optional.length > 0 || deliverySteps.length > 0) {
    // Preparing, Ready, Shipped, Picked up, On the way: optional, so one
    // quiet link until wanted (UX check #14, 2026-10-17).
    body = showSteps ? (
      <>
        <p className="mt-2 text-xs text-slate-500">{o.tellStepHint}</p>
        <div className="flex flex-wrap gap-x-2">
          <StepChips
            steps={optional}
            label={(s) => t.status.order[s]}
            busy={busy}
            pending={change.isPending ? change.variables : undefined}
            onPick={(s) => move(s)}
          />
          <StepChips
            steps={deliverySteps}
            label={(s) => deliveryAction(t, order.delivery, s)}
            busy={busy}
            pending={actions.delivery.isPending ? actions.delivery.variables?.status : undefined}
            onPick={(s) => actions.deliver(s)}
          />
        </div>
      </>
    ) : (
      <button
        type="button"
        onClick={() => setShowSteps(true)}
        className="-my-1 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-navy-700 hover:underline focus-visible:outline-2 focus-visible:outline-navy-600 sm:min-h-9"
      >
        <Plus aria-hidden className="size-4" />
        {o.tellStep}
      </button>
    )
  }
  return (
    <Row
      icon={ShoppingBag}
      label={o.order}
      value={t.status.order[order.status]}
      tone={ORDER_STATUS_TONES[order.status]}
      shaded={step === 'accept' || step === 'complete'}
    >
      {body}
    </Row>
  )
}

function DeliveryRow({
  order,
  actions,
  step,
  onSend,
}: {
  order: Order
  actions: OrderActions
  step: ReturnType<typeof nextStep>
  onSend: () => void
}) {
  const t = useT()
  const o = t.orders
  const { delivery } = order
  const { busy } = actions
  const pickup = delivery.method === 'pickup'
  const badge = deliveryBadge(t, delivery.method, delivery.status, delivery.courier)
  // Nothing to deliver before it's accepted, after it's off or once it's
  // completed (the server would still allow it: the two never set each other).
  const live = order.status !== 'pending' && order.status !== 'completed' && !CLOSED.has(order.status)
  const next = live ? delivery.next_statuses : []
  const canSend = !pickup && next.includes('assigned')
  const canDeliver = next.includes('delivered')
  const out = delivery.status === 'assigned' || delivery.status === 'picked_up' || delivery.status === 'in_transit'
  const cash = cashDue(order)
  const pending = (status: string) => actions.delivery.isPending && actions.delivery.variables?.status === status

  const handover = (primary: boolean) => (
    <Button
      {...nextIf(primary)}
      variant={primary ? 'primary' : 'secondary'}
      loading={actions.handover.isPending}
      disabled={busy}
      onClick={actions.handOver}
      className="flex-1"
    >
      {pickup ? o.collectedCash : o.cashHandover}
    </Button>
  )
  const delivered = (primary: boolean) => (
    <Button
      {...nextIf(primary)}
      variant={primary ? 'primary' : 'secondary'}
      loading={pending('delivered')}
      disabled={busy}
      onClick={() => actions.deliver()}
      className={primary ? 'flex-1' : ''}
    >
      {deliveryAction(t, delivery, 'delivered')}
    </Button>
  )

  let buttons: ReactNode = null
  if (canSend) {
    // Not sent out yet: send it to a driver, or hand it over yourself
    // (the short path, founder's pick 1C, 2026-10-09).
    buttons = (
      <Buttons>
        <Button
          {...nextIf(step === 'send')}
          variant={step === 'send' ? 'primary' : 'secondary'}
          icon={Send}
          disabled={busy}
          onClick={onSend}
          className="flex-1"
        >
          {delivery.status === 'failed'
            ? t.status.deliveryAction.tryAgain
            : delivery.courier
              ? // The line above names the courier ("Send with J&T Express").
                o.send
              : o.sendToDriver}
        </Button>
        {canDeliver && (cash ? handover(false) : delivered(false))}
      </Buttons>
    )
  } else if (canDeliver) {
    // With the driver (or waiting for the customer to collect): the
    // driver may keep the cash for later, so plain Delivered stays too.
    buttons = (
      <Buttons>
        {cash && handover(step === 'deliver')}
        {delivered(!cash && step === 'deliver')}
      </Buttons>
    )
  }

  return (
    <Row
      icon={pickup ? MapPin : Truck}
      label={pickup ? t.checkout.pickup : o.delivery}
      value={badge.label}
      tone={badge.tone}
      shaded={step === 'send' || step === 'deliver'}
    >
      <Sub>
        {pickup ? o.customerCollects : delivery.courier ? o.sendWith(delivery.courier) : o.ownDelivery}
        {' · '}
        {Number(order.delivery_fee) > 0 ? formatMoney(order.delivery_fee, order.currency) : t.shop.summary.free}
      </Sub>
      {delivery.assignee_note && (
        <Sub>
          {delivery.courier ? o.tracking : o.delivering}
          {delivery.assignee_note}
        </Sub>
      )}
      {live && out && (
        <div className="mt-1">
          <SendAgain order={order} />
        </div>
      )}
      {buttons}
      {/* Sending is still possible, but the payment comes first (UX check #7). */}
      {buttons && unpaidTransfer(order) && <p className="mt-2 text-xs font-semibold text-amber-700">{o.notPaidYet}</p>}
    </Row>
  )
}

/** The payment is its own state machine (02 section 7.2): recording it
 * never moves the order, but an order that isn't cash on delivery can only
 * be completed once it's paid (section 7.4). Cash on delivery: "Delivered,
 * cash received" in the delivery row is the usual way; "Cash received" on
 * its own once it's delivered (a driver handing the cash over later). */
function PaymentRow({
  order,
  actions,
  step,
  paying,
  setPaying,
}: {
  order: Order
  actions: OrderActions
  step: ReturnType<typeof nextStep>
  paying: boolean
  setPaying: (open: boolean) => void
}) {
  const t = useT()
  const o = t.orders
  const { payment } = order
  // Once the customer tapped "I've paid", that is the status line (UX
  // check #5); the payment stays pending until the seller marks it paid.
  const claimedAt = payment.status === 'pending' ? payment.claimed_at : null
  const badge = claimedAt
    ? { label: o.saysPaidAt(formatOrderTime(claimedAt)), tone: 'amber' as const }
    : paymentBadge(t, payment.method, payment.status)
  const live = order.status !== 'pending' && !CLOSED.has(order.status)
  const canPay = live && payment.next_statuses.includes('paid')
  const cod = payment.method === 'cod'

  let buttons: ReactNode = null
  if (step === 'retryPayment') {
    // A failed payment: ask the customer to pay again, or cancel (UX
    // check #7). The ⋯ menu leaves these out meanwhile.
    buttons = (
      <Buttons>
        {order.next_statuses.includes('cancelled') && (
          <Button variant="danger" disabled={actions.busy} onClick={() => actions.move('cancelled')}>
            {o.action.cancelled}
          </Button>
        )}
        <Button {...NEXT} loading={actions.payment.isPending} disabled={actions.busy} onClick={actions.notPaid} className="flex-1">
          {o.backToNotPaid}
        </Button>
      </Buttons>
    )
  } else if (canPay && !cod) {
    buttons = paying ? (
      <PaidForm onBack={() => setPaying(false)} actions={actions} onDone={() => setPaying(false)} />
    ) : (
      <Buttons>
        <Button
          {...nextIf(step === 'markPaid')}
          variant={step === 'markPaid' ? 'primary' : 'secondary'}
          disabled={actions.busy}
          onClick={() => setPaying(true)}
          className="flex-1"
        >
          {o.markPaid}
        </Button>
      </Buttons>
    )
  } else if (canPay && order.delivery.status === 'delivered' && !order.next_statuses.includes('completed')) {
    buttons = (
      <Buttons>
        <Button
          variant={step === null ? 'primary' : 'secondary'}
          loading={actions.payment.isPending}
          disabled={actions.busy}
          onClick={() => actions.markPaid(null)}
          className="flex-1"
        >
          {o.cashReceived}
        </Button>
      </Buttons>
    )
  }

  return (
    <Row
      icon={Wallet}
      label={o.payment}
      value={badge.label}
      tone={badge.tone}
      shaded={step === 'markPaid' || step === 'retryPayment'}
    >
      <Sub>
        {t.status.paymentMethod[payment.method]} · {formatMoney(payment.amount, order.currency)}
      </Sub>
      {step === 'retryPayment' && <Sub>{o.paymentFailedHint}</Sub>}
      {payment.paid_at && payment.status === 'paid' && <Sub>{o.markedPaid(formatOrderTime(payment.paid_at))}</Sub>}
      {payment.reference && (
        <Sub>
          {o.note}
          {payment.reference}
        </Sub>
      )}
      {/* "I've paid" from the customer (founder's pick 6B): still to check. */}
      {claimedAt && <Sub>{o.checkBankFor(formatMoney(payment.amount, order.currency))}</Sub>}
      {buttons}
    </Row>
  )
}

/** Mark paid, with an optional note to find the transfer again later. */
function PaidForm({ actions, onBack, onDone }: { actions: OrderActions; onBack: () => void; onDone: () => void }) {
  const t = useT()
  const o = t.orders
  const [reference, setReference] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (await actions.markPaid(reference.trim() || null)) onDone()
  }
  return (
    <form id="mark-paid" onSubmit={submit} className="mt-3 scroll-mt-24 space-y-3">
      <Field label={o.noteOptional} hint={o.noteHintTransfer}>
        <Input maxLength={200} autoFocus value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} disabled={actions.payment.isPending}>
          {t.common.back}
        </Button>
        <Button type="submit" loading={actions.payment.isPending} className="flex-1">
          {o.confirmPaid}
        </Button>
      </div>
    </form>
  )
}

/** Small buttons for optional steps, in state-machine order. */
function StepChips<S extends string>({
  steps,
  label,
  busy,
  pending,
  onPick,
}: {
  steps: S[]
  label: (step: S) => string
  busy: boolean
  pending?: S
  onPick: (step: S) => void
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {steps.map((step) => (
        <button
          key={step}
          type="button"
          disabled={busy}
          aria-busy={pending === step || undefined}
          onClick={() => onPick(step)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:opacity-50 sm:min-h-9"
        >
          {pending === step ? <LoaderCircle aria-hidden className="size-3.5 animate-spin" /> : <Plus aria-hidden className="size-3.5" />}
          {label(step)}
        </button>
      ))}
    </div>
  )
}
