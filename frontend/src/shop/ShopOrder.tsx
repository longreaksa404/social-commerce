import { Check, CircleCheck, Copy, MapPin, Truck, XCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass } from '../components/styles.ts'
import { Button, Card, ErrorState, Field, Input, Skeleton } from '../components/ui.tsx'
import type { Messages } from '../i18n/core.ts'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { formatDate } from '../lib/orders.ts'
import type { DeliveryMethod, DeliveryStatus, OrderStatus, ShopOrder, ShopStore } from '../lib/types.ts'
import { orderPhone, rememberOrder } from './device.ts'
import { PaymentCard } from './PaymentCard.tsx'
import { isNotFound, useShop, useTrackOrder } from './queries.ts'

/**
 * /shop/:storeSlug/order/:orderId: the confirmation right after checkout,
 * and order tracking afterwards. Opening it needs the phone the order was
 * placed with (02_TECHNICAL.md section 8); the device that placed it
 * remembers that, so the customer only types it on another phone.
 */
export function ShopOrderPage() {
  const { storeSlug = '', orderId = '' } = useParams()
  const state = useLocation().state as { placed?: ShopOrder; phone?: string } | null
  const placed = state?.placed
  const shop = useShop(storeSlug)
  // Straight from checkout, the phone comes along too, in case this
  // device can't store anything (private browsing).
  const [phone, setPhone] = useState(() => orderPhone(orderId) ?? (placed?.id === orderId ? (state?.phone ?? null) : null))
  const order = useTrackOrder(storeSlug, orderId, phone, placed)

  if (!shop.data) return <OrderSkeleton />
  if (phone === null || isNotFound(order.error)) {
    return (
      <PhoneGate
        shop={shop.data}
        wrongPhone={phone !== null}
        onSubmit={(value) => setPhone(value)}
      />
    )
  }
  if (order.error) return <ErrorState error={order.error} onRetry={() => order.refetch()} />
  if (!order.data) return <OrderSkeleton />
  return <OrderView shop={shop.data} order={order.data} phone={phone} justPlaced={placed?.id === orderId} />
}

function PhoneGate({
  shop,
  wrongPhone,
  onSubmit,
}: {
  shop: ShopStore
  wrongPhone: boolean
  onSubmit: (phone: string) => void
}) {
  const [value, setValue] = useState('')
  const t = useT()
  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(value.trim())
  }
  return (
    <div className="mx-auto max-w-md">
      <title>{t.order.tab(shop.name)}</title>
      <Card className="p-5 sm:p-6">
        <h1 className="text-lg font-bold text-slate-900">{t.order.checkTitle}</h1>
        <p className="mt-1 text-sm text-slate-600">{t.order.checkText}</p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field
            label={t.checkout.phone}
            error={wrongPhone ? t.order.wrongPhone : null}
          >
            <Input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={32}
              placeholder="012 345 678"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full">
            {t.order.showOrder}
          </Button>
        </form>
      </Card>
    </div>
  )
}

// The order statuses the progress list shows, in order.
const STEPS = ['pending', 'accepted', 'processing', 'ready', 'shipped', 'delivered'] as const

// A pickup order goes through the same order statuses; its customer reads
// some of them differently.
const stepLabel = (t: Messages, status: OrderStatus, label: string, method: DeliveryMethod) =>
  (method === 'pickup' && (status === 'ready' || status === 'shipped' || status === 'delivered')
    ? t.order.pickupStep[status]
    : null) || label

// The delivery's own status (02 section 7.3), in the customer's words.
function deliveryWords(t: Messages, method: DeliveryMethod, status: DeliveryStatus): string {
  if (method === 'pickup') {
    return status === 'not_assigned' || status === 'delivered' ? t.order.pickupDelivery[status] : status
  }
  return t.order.delivery[status]
}

function OrderView({
  shop,
  order,
  phone,
  justPlaced,
}: {
  shop: ShopStore
  order: ShopOrder
  phone: string
  justPlaced: boolean
}) {
  const { toast } = useFeedback()
  const t = useT()
  // Opened with a typed phone: remember it, so next time it opens directly
  // and the order shows in "Your orders" on the cart page.
  useEffect(() => {
    rememberOrder({ id: order.id, shop: shop.slug, number: order.number, phone, placedAt: order.created_at })
  }, [order.id, order.number, order.created_at, shop.slug, phone])
  const closed = order.status === 'rejected' || order.status === 'cancelled'
  // Nothing to pay for a closed order, unless it was already paid.
  const showPayment = !(closed && order.payment.status === 'pending')
  // Paying is what the customer has to do next: put it first.
  const payNow = showPayment && order.payment.status === 'pending' && order.payment.method !== 'cod'

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast(t.order.linkCopied)
    } catch {
      toast(t.order.copyLinkFailed, 'error')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <title>{`${t.shop.orderNumber(order.number)} · ${shop.name}`}</title>

      {justPlaced && (
        <div className="flex flex-col items-center px-4 pt-2 pb-2 text-center">
          <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CircleCheck aria-hidden className="size-8" />
          </span>
          <h1 className="text-xl font-bold text-slate-900">{t.order.thanks}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {order.status === 'pending' ? t.order.willConfirm(shop.name) : t.order.willContact(shop.name)}
          </p>
        </div>
      )}

      {payNow && <PaymentCard shop={shop} order={order} />}

      <Card className="p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          {justPlaced ? (
            <h2 className="text-lg font-bold text-slate-900">{t.shop.orderNumber(order.number)}</h2>
          ) : (
            <h1 className="text-lg font-bold text-slate-900">{t.shop.orderNumber(order.number)}</h1>
          )}
          <span className="text-sm text-slate-500">
            {formatDate(order.created_at)}
          </span>
        </div>
        <p
          className={`mt-1 flex items-center gap-1.5 font-medium ${closed ? 'text-red-700' : 'text-emerald-700'}`}
          aria-live="polite"
        >
          {closed && <XCircle aria-hidden className="size-4.5" />}
          {stepLabel(t, order.status, t.order.headline[order.status], order.delivery_method)}
        </p>
        {closed ? (
          <p className="mt-2 text-sm text-slate-600">{t.order.contactShop(shop.name)}</p>
        ) : (
          <Progress status={order.status} method={order.delivery_method} />
        )}
      </Card>

      {!closed && <DeliveryCard order={order} />}

      {showPayment && !payNow && <PaymentCard shop={shop} order={order} />}

      <Card className="p-4 sm:p-6">
        <h2 className="mb-2 font-semibold text-slate-900">{t.order.items}</h2>
        <ul className="divide-y divide-slate-100">
          {order.items.map((item, i) => (
            <li key={i} className="flex gap-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-slate-900">
                  {item.product_name}
                  {item.variant_name && <span className="text-slate-500"> · {item.variant_name}</span>}
                </span>
                <span className="text-slate-500">
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
              <dd className="font-medium text-emerald-700">−{formatMoney(order.discount, order.currency)}</dd>
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

      <Card className="p-4 sm:p-6">
        <p className="text-sm text-slate-600">
          {t.order.comeBack}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" icon={Copy} onClick={copyLink} className="sm:flex-1">
            {t.order.copyLink}
          </Button>
          <Link to={`/shop/${shop.slug}`} className={`${buttonClass('ghost')} sm:flex-1`}>
            {t.shop.cartPage.continueShopping}
          </Link>
        </div>
      </Card>
    </div>
  )
}

function DeliveryCard({ order }: { order: ShopOrder }) {
  const { delivery } = order
  const pickup = delivery.method === 'pickup'
  const Icon = pickup ? MapPin : Truck
  const t = useT()
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <Icon aria-hidden className="size-4.5 text-slate-500" />
        {pickup ? t.checkout.pickup : delivery.courier ? t.order.deliveryBy(delivery.courier) : t.checkout.deliveryByShop}
      </h2>
      <p
        className={`mt-1 text-sm font-medium ${delivery.status === 'failed' ? 'text-red-700' : delivery.status === 'delivered' ? 'text-emerald-700' : 'text-slate-700'}`}
      >
        {deliveryWords(t, delivery.method, delivery.status)}
      </p>
      {pickup && delivery.status !== 'delivered' && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
          <p className="text-xs font-medium text-slate-500">{t.checkout.pickUpAt}</p>
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">
            {delivery.pickup_address ?? t.order.askWhereCollect}
          </p>
        </div>
      )}
    </Card>
  )
}

function Progress({ status, method }: { status: OrderStatus; method: DeliveryMethod }) {
  const t = useT()
  // The last step reached; a completed order has reached them all.
  const reached = status === 'completed' ? STEPS.length - 1 : STEPS.findIndex((step) => step === status)
  return (
    <ol className="mt-4">
      {STEPS.map((step, i) => {
        const done = i <= reached
        const latest = i === reached
        return (
          <li key={step} className="relative flex min-h-10 items-start gap-3">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`absolute top-6 left-[11px] h-[calc(100%-1rem)] w-0.5 ${i < reached ? 'bg-brand' : 'bg-slate-200'}`}
              />
            )}
            <span
              aria-hidden
              className={`relative flex size-6 shrink-0 items-center justify-center rounded-full ${
                done ? 'bg-brand text-white' : 'border-2 border-slate-200 bg-surface'
              }`}
            >
              {done && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span
              aria-current={latest ? 'step' : undefined}
              className={`pt-0.5 text-sm ${latest ? 'font-semibold text-slate-900' : done ? 'text-slate-700' : 'text-slate-500'}`}
            >
              {stepLabel(t, step, t.order.step[step], method)}
              <span className="sr-only">{done ? t.order.stepDone : t.order.stepNotYet}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function OrderSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-xl space-y-4">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}
