import { BanknoteX, ChevronRight, CircleCheck, CircleX, Copy, Link2, MapPinned, MessagesSquare, PackageX, Phone, Send, ShoppingBag, Undo2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { reducedMotion } from '../../components/effects.ts'
import { useFeedback } from '../../components/feedback.ts'
import { SourceLogo } from '../../components/SourceLogo.tsx'
import { buttonClass } from '../../components/styles.ts'
import { Button, Card, ErrorState, MenuButton, PageHeader, Skeleton, type MenuItem } from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { sourceLabel } from '../../lib/links.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatOrderTime, formatPhone } from '../../lib/orders.ts'
import { hasLogo } from '../../lib/sourceLogos.ts'
import type { Order, OrderStatus } from '../../lib/types.ts'
import { ProductImage } from '../../shop/components.tsx'
import { useOrder, useStore } from '../queries.ts'
import { useBackTo } from '../useBackTo.ts'
import { cashDue, CLOSED } from './orderSteps.ts'
import { PinnedStep } from './PinnedStep.tsx'
import { SendToDriverSheet } from './SendToDriver.tsx'
import { StatusCard } from './StatusCard.tsx'
import { useOrderActions, type OrderActions } from './useOrderActions.ts'

/** The next new order in the list, and how many new ones are left. */
export type NextNew = { id: string; count: number }

/** /dashboard/orders/:orderId. A new order rejected here opens the next
 * new one; accepted, it stays open, where its next step is (sending it to
 * a driver), with "Next ›" to the following new order (UX check #6,
 * 2026-10-17; before, it opened the next at once: founder's pick 1B). */
export function OrderDetail({ nextNew, onNext }: { nextNew?: NextNew; onNext?: () => void }) {
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
  return (
    <OrderView
      key={order.data.id}
      order={order.data}
      back={back}
      onStale={() => order.refetch()}
      nextNew={nextNew}
      onNext={onNext}
    />
  )
}

/** The seller's order page (founder's picks 1A-6A, 2026-10-15): the
 * customer's name on top with the number, time and total; one card with
 * where the order, delivery and payment stand and their buttons; the
 * items; then the customer and where it goes. Rare actions in a ⋯ menu;
 * on phones the next button stays in reach once the card scrolls away. */
function OrderView({
  order,
  back,
  onStale,
  nextNew,
  onNext,
}: {
  order: Order
  back: string
  onStale: () => void
  nextNew?: NextNew
  onNext?: () => void
}) {
  const t = useT()
  const [accepted, setAccepted] = useState(false)
  const actions = useOrderActions(order, onStale, (status) => {
    if (status === 'accepted') setAccepted(true)
    else onNext?.()
  })
  const [paying, setPaying] = useState(false)
  const [sending, setSending] = useState(false)
  const card = useRef<HTMLElement>(null)
  const menu = useMenuItems(order, actions)
  // From the pinned button: open the note form and bring it into view.
  function pay() {
    setPaying(true)
    requestAnimationFrame(() =>
      document.getElementById('mark-paid')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' }),
    )
  }
  return (
    <>
      <PageHeader
        title={order.customer.name}
        subtitle={
          <>
            <span className="text-base font-bold text-slate-900">#{order.number}</span>
            {' · '}
            {formatOrderTime(order.created_at)}
            {' · '}
            {formatMoney(order.total, order.currency)}
          </>
        }
        back={back}
        backOnPhonesOnly
        action={
          menu.length > 0 && <MenuButton label={t.orders.more(order.number)} items={menu} disabled={actions.busy} />
        }
      />
      <title>{t.shop.orderNumber(order.number)}</title>
      <div className="space-y-4">
        {accepted && nextNew && onNext && (
          <div className="flex items-center gap-3 rounded-2xl bg-navy-50 px-4 py-2.5 text-sm text-slate-700">
            <CircleCheck aria-hidden className="size-4.5 shrink-0 text-emerald-700" />
            <span className="min-w-0 flex-1">{t.orders.acceptedMore(nextNew.count)}</span>
            <Button variant="secondary" onClick={onNext} className="shrink-0">
              {t.orders.nextOrder}
              <ChevronRight aria-hidden className="size-4" />
            </Button>
          </div>
        )}
        {CLOSED.has(order.status) && <ClosedNote status={order.status} />}
        <StatusCard
          ref={card}
          order={order}
          actions={actions}
          paying={paying}
          setPaying={setPaying}
          onSend={() => setSending(true)}
        />
        <ItemsCard order={order} />
        <CustomerCard order={order} />
      </div>
      <PinnedStep
        order={order}
        actions={actions}
        card={card}
        paying={paying}
        onPay={pay}
        onSend={() => setSending(true)}
      />
      <SendToDriverSheet order={order} open={sending} onClose={() => setSending(false)} onAssign={actions.assign} />
    </>
  )
}

/** Rare actions that are hard to undo, out of the way of the everyday
 * buttons (founder's pick 5A, 2026-10-15). */
function useMenuItems(order: Order, actions: OrderActions): MenuItem[] {
  const t = useT()
  const o = t.orders
  const { payment, delivery } = order
  const on = order.status !== 'pending' && !CLOSED.has(order.status)
  // A failed payment shows Cancel order and Back to not paid on the card.
  const onCard = on && payment.status === 'failed'
  const items: MenuItem[] = []
  if (on && !onCard && order.next_statuses.includes('cancelled')) {
    items.push({ label: o.action.cancelled, icon: CircleX, danger: true, onSelect: () => actions.move('cancelled') })
  }
  // The card's button records the cash too; rarely the cash comes later.
  if (on && order.next_statuses.includes('completed') && cashDue(order)) {
    items.push({ label: o.completeWithoutCash, icon: CircleCheck, onSelect: () => actions.move('completed') })
  }
  if (on && delivery.next_statuses.includes('failed')) {
    items.push({ label: t.status.deliveryAction.failed, icon: PackageX, danger: true, onSelect: actions.deliveryFailed })
  }
  if (on && payment.next_statuses.includes('failed')) {
    items.push({ label: o.paymentFailed, icon: BanknoteX, danger: true, onSelect: actions.paymentFailed })
  }
  if (!onCard && payment.next_statuses.includes('pending')) {
    items.push({
      label: payment.status === 'paid' ? o.notPaidAfterAll : o.backToNotPaid,
      icon: Undo2,
      onSelect: actions.notPaid,
    })
  }
  return items
}

/** A rejected or cancelled order says so first: nothing is left to do.
 * Red on the words only (founder, 2026-10-15). */
function ClosedNote({ status }: { status: OrderStatus }) {
  const o = useT().orders
  return (
    <p className="flex items-start gap-2.5 text-sm font-medium text-red-700">
      <CircleX aria-hidden className="mt-0.5 size-4.5 shrink-0" />
      {o.closedNote[status as 'rejected' | 'cancelled']}
    </p>
  )
}

/** What was bought first (founder's pick 3A): before accepting you check
 * you have it, after accepting you pack it. The customer's note sits above
 * the items it's usually about. */
function ItemsCard({ order }: { order: Order }) {
  const t = useT()
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-1 flex items-baseline gap-2 font-semibold text-slate-900">
        {t.order.items}
        <span className="font-normal text-slate-500 tabular-nums">{count}</span>
      </h2>
      <CustomerNote order={order} />
      <ul className="divide-y divide-slate-100">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 py-2.5">
            {item.image_url ? (
              <ProductImage small src={item.image_url} alt="" className="size-12 shrink-0 rounded-xl" />
            ) : (
              // No photo: the same soft bag as the order list.
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-500">
                <ShoppingBag aria-hidden className="size-5.5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block break-words text-slate-900">
                {item.product_name}
                {item.variant_name && <span className="text-slate-500"> · {item.variant_name}</span>}
              </span>
              <span className="text-sm text-slate-500 tabular-nums">
                {item.quantity} × {formatMoney(item.unit_price, order.currency)}
              </span>
            </span>
            <span className="font-medium text-slate-900 tabular-nums">{formatMoney(item.line_total, order.currency)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1 border-t border-slate-200 pt-3 text-sm tabular-nums">
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
        <span className="text-lg font-bold text-slate-900 tabular-nums">{formatMoney(order.total, order.currency)}</span>
      </div>
    </Card>
  )
}

/** The customer's note as a message from them, a grey bubble like in
 * Messenger or Telegram (founder's pick 7A): no coloured box. On an order
 * from a chat it's the seller's own note. */
function CustomerNote({ order }: { order: Order }) {
  const o = useT().orders
  if (!order.notes) return null
  return (
    <div className="mt-2 mb-3">
      <p className="text-xs text-slate-500">{order.source === 'chat' ? o.yourNote : o.customerNote}</p>
      <p className="mt-1 inline-block max-w-full rounded-[4px_18px_18px_18px] bg-slate-100 px-3.5 py-2 whitespace-pre-line break-words text-slate-900">
        {order.notes}
      </p>
    </div>
  )
}

/** What the customer's Telegram proved (they asked for updates there):
 * this number, or another one of theirs, which is worth a call too. */
function TelegramPhone({ customer }: { customer: Order['customer'] }) {
  const o = useT().orders
  if (customer.telegram_phone === null) return null
  if (customer.telegram_phone === customer.phone) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-emerald-700">
        <CircleCheck aria-hidden className="size-4" />
        {o.phoneConfirmed}
      </p>
    )
  }
  return (
    <div>
      <a
        href={`tel:${customer.telegram_phone}`}
        className="-mx-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium text-navy-700 link focus-visible:outline-2 focus-visible:outline-navy-600"
      >
        <Send aria-hidden className="size-4" />
        {formatPhone(customer.telegram_phone)}
      </a>
      <p className="text-xs text-slate-500">{o.telegramPhone}</p>
    </div>
  )
}

const ROUND_BUTTON =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-surface text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 active:scale-95'

/** Who and where in one card (founder's pick 3A): the name, the phone with
 * Call and Copy beside it, then the address and the map. */
function CustomerCard({ order }: { order: Order }) {
  const t = useT()
  const o = t.orders
  const c = t.customers
  const { toast } = useFeedback()
  const { customer } = order
  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(customer.phone)
      toast(c.phoneCopied)
    } catch {
      toast(formatPhone(customer.phone))
    }
  }
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 font-semibold break-words text-slate-900">{customer.name}</h2>
        <Link
          to={`/dashboard/customers/${customer.id}`}
          state={{ back: `/dashboard/orders/${order.id}` }}
          className="-my-2 -mr-2 inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-navy-700 link focus-visible:outline-2 focus-visible:outline-navy-600"
        >
          {o.viewCustomer}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-900 tabular-nums">{formatPhone(customer.phone)}</p>
          <TelegramPhone customer={customer} />
        </div>
        <a href={`tel:${customer.phone}`} aria-label={c.call} title={c.call} className={ROUND_BUTTON}>
          <Phone aria-hidden className="size-4.5" />
        </a>
        <button type="button" onClick={copyPhone} aria-label={c.copyPhone} title={c.copyPhone} className={ROUND_BUTTON}>
          <Copy aria-hidden className="size-4.5" />
        </button>
      </div>
      {/* An order from a chat: the customer hasn't seen the order page,
          where they follow it and see how to pay (KHQR, bank). */}
      {order.source === 'chat' && <CopyOrderLink order={order} />}
      <Source order={order} />
      {order.delivery_method === 'seller_delivery' && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm text-slate-500">{o.deliverTo}</h3>
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
        </div>
      )}
    </Card>
  )
}

/** Where the order came from: a chat (added by the seller) or a shop link. */
function Source({ order }: { order: Order }) {
  const o = useT().orders
  if (order.source === 'chat') {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
        <MessagesSquare aria-hidden className="size-4 shrink-0" />
        {o.fromChat}
      </p>
    )
  }
  if (!order.source) return null
  return (
    <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
      {hasLogo(order.source) ? (
        <SourceLogo source={order.source} className="size-5" />
      ) : (
        <Link2 aria-hidden className="size-4 shrink-0" />
      )}
      {o.cameThrough(sourceLabel(order.source))}
    </p>
  )
}

/** The customer's own page for this order, to send in the chat. They
 * open it with their phone number. */
function CopyOrderLink({ order }: { order: Order }) {
  const o = useT().orders
  const { toast } = useFeedback()
  const store = useStore()
  if (!store.data) return null
  const url = `${window.location.origin}/shop/${store.data.slug}/order/${order.id}`
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast(o.orderLinkCopied)
    } catch {
      toast(url)
    }
  }
  return (
    <Button variant="secondary" icon={Copy} onClick={copy} className="mt-3 w-full sm:w-auto">
      {o.copyOrderLink}
    </Button>
  )
}

function DetailSkeleton({ back }: { back: string }) {
  const t = useT()
  return (
    <>
      <PageHeader title={t.orders.order} back={back} backOnPhonesOnly />
      <div aria-hidden className="space-y-4">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </>
  )
}
