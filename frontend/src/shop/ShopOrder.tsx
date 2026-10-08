import { ChevronDown, Copy, MapPin, Package, Truck, XCircle } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { buzz, confettiFrom } from '../components/effects.ts'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass } from '../components/styles.ts'
import { Button, Card, ErrorState, Field, Input, Skeleton, SuccessTick } from '../components/ui.tsx'
import type { Messages } from '../i18n/core.ts'
import { useT } from '../i18n/useT.ts'
import { formatMoney } from '../lib/money.ts'
import { formatDate, formatOrderTime } from '../lib/orders.ts'
import type { DeliveryMethod, DeliveryStatus, OrderStatus, ShopOrder, ShopStore } from '../lib/types.ts'
import { ProductImage, ShopLogo } from './components.tsx'
import { contactChannels, useContactLink, type Channel } from './contact.ts'
import { ChannelIcon } from './ContactSeller.tsx'
import { loadCustomerDetails, orderPhone, rememberOrder } from './device.ts'
import { orderHeadline, stepLabel } from './orderWords.ts'
import { PaymentCard } from './PaymentCard.tsx'
import { inProgress, isNotFound, useShop, useTrackOrder } from './queries.ts'

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
  return (
    <OrderView
      shop={shop.data}
      order={order.data}
      phone={phone}
      justPlaced={placed?.id === orderId}
      updatedAt={order.dataUpdatedAt}
    />
  )
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
  updatedAt,
}: {
  shop: ShopStore
  order: ShopOrder
  phone: string
  justPlaced: boolean
  /** When it was last checked (ms); it checks again by itself while in progress. */
  updatedAt: number
}) {
  const { toast } = useFeedback()
  const t = useT()
  const tick = useRef<HTMLSpanElement>(null)
  useCelebration(justPlaced ? order.id : null, tick)
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

  const total = formatMoney(order.total, order.currency)
  const payment = showPayment && <PaymentCard shop={shop} order={order} />

  // One column on phones; on laptops the order on the left and payment on
  // the right, staying in view. Paying first on a phone when it's what's
  // left to do.
  const left = 'lg:col-start-1'
  // The payment column runs beside all of the left one's cards.
  const leftCards = contactChannels(shop).length > 0 ? 4 : 3
  const payWrap = (card: ReactNode) => (
    <div
      style={{ '--left-cards': leftCards } as CSSProperties}
      className="lg:sticky lg:top-20 lg:col-start-2 lg:[grid-row:1/span_var(--left-cards)]"
    >
      {card}
    </div>
  )
  return (
    <div className="mx-auto max-w-xl lg:max-w-6xl">
      <title>{`${t.shop.orderNumber(order.number)} · ${shop.name}`}</title>
      {justPlaced && (
        <ThankYou
          tick={tick}
          name={loadCustomerDetails()?.name ?? null}
          tag={t.order.placedTag(order.number, total)}
          text={order.status === 'pending' ? t.order.willConfirm(shop.name) : t.order.willContact(shop.name)}
          next={
            payNow
              ? { text: t.order.nextPay(total, t.status.paymentMethod[order.payment.method]), urgent: true }
              : showPayment && order.payment.method === 'cod' && order.payment.status === 'pending'
                ? { text: t.order.nextCod(total), urgent: false }
                : null
          }
        />
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-6">
        {payNow && payWrap(payment)}
        <StatusCard order={order} shop={shop} closed={closed} updatedAt={updatedAt} titleIsPage={!justPlaced} className={left} />
        {contactChannels(shop).length > 0 && <SellerCard shop={shop} order={order} className={left} />}
        {!payNow && payment && payWrap(payment)}
        <ItemsCard order={order} className={left} />
        <Card className={`p-4 sm:p-6 ${left}`}>
          <p className="text-sm text-slate-600">{t.order.comeBack(shop.name)}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" icon={Copy} onClick={copyLink} className="sm:flex-1">
              {t.order.copyLink}
            </Button>
            <Link to={`/shop/${shop.slug}/orders`} className={`${buttonClass('ghost')} sm:flex-1`}>
              {t.order.yourOrders}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

/** Straight after checkout: a big tick that draws itself (confetti comes
 * from it), the customer's name, the order number and total, and what's
 * left to do. */
function ThankYou({
  tick,
  name,
  tag,
  text,
  next,
}: {
  tick: RefObject<HTMLSpanElement | null>
  name: string | null
  tag: string
  text: string
  next: { text: string; urgent: boolean } | null
}) {
  const t = useT()
  return (
    <div className="-mx-4 -mt-4 mb-4 bg-linear-to-b from-emerald-50 to-transparent px-4 pt-8 pb-2 text-center sm:-mt-6 sm:pt-10 lg:mx-0 lg:rounded-3xl">
      <SuccessTick ref={tick} className="mx-auto mb-3" />
      <h1 className="text-xl font-bold text-balance text-slate-900 sm:text-2xl">
        {name ? t.order.thanksName(name) : t.order.thanks}
      </h1>
      <p className="mt-2 inline-flex rounded-full bg-surface px-3 py-0.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-900/10 tabular-nums">
        {tag}
      </p>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
      {next && (
        <p
          className={`mx-auto mt-4 max-w-md rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
            next.urgent ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {next.text}
        </p>
      )}
    </div>
  )
}

/** Where the order is: the number, the step in words, the progress bar
 * with its truck, and how it's being delivered or collected. */
function StatusCard({
  order,
  shop,
  closed,
  updatedAt,
  titleIsPage,
  className,
}: {
  order: ShopOrder
  shop: ShopStore
  closed: boolean
  updatedAt: number
  titleIsPage: boolean
  className: string
}) {
  const t = useT()
  const Title = titleIsPage ? 'h1' : 'h2'
  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <Title className="text-lg font-bold text-slate-900">{t.shop.orderNumber(order.number)}</Title>
        <span className="text-sm text-slate-500">{formatDate(order.created_at)}</span>
      </div>
      <p
        className={`mt-1 flex items-center gap-1.5 font-semibold ${closed ? 'text-red-700' : 'text-navy-700'}`}
        aria-live="polite"
      >
        {closed && <XCircle aria-hidden className="size-4.5" />}
        {orderHeadline(t, order)}
      </p>
      {closed ? (
        <p className="mt-2 text-sm text-slate-600">{t.order.contactShop(shop.name)}</p>
      ) : (
        <>
          <Progress status={order.status} method={order.delivery_method} />
          <DeliveryLine order={order} />
        </>
      )}
      {inProgress(order) && (
        <p className="mt-3 text-xs text-slate-500">{t.order.updated(formatOrderTime(new Date(updatedAt).toISOString()))}</p>
      )}
    </Card>
  )
}

/** The shop, with the ways to ask it right beside it (Settings → Contact):
 * asking the seller sits where the seller is. One way fits beside the
 * name; more go in a row under it. */
function SellerCard({ shop, order, className }: { shop: ShopStore; order: ShopOrder; className: string }) {
  const t = useT()
  const link = useContactLink(shop, t.order.askAboutText(order.number, window.location.href))
  const channels = contactChannels(shop)
  const pill = (channel: Channel) => (
    <a
      key={channel}
      {...link(channel)}
      rel="noreferrer"
      aria-label={t.order.askAboutOn(t.shop.contact.short[channel])}
      className="inline-flex min-h-11 min-w-0 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-300 bg-surface px-4 text-sm font-semibold text-slate-800 shadow-xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600"
    >
      <ChannelIcon channel={channel} />
      <span className="truncate">{t.shop.contact.short[channel]}</span>
    </a>
  )
  return (
    <Card className={`p-4 sm:px-6 ${className}`}>
      <div className="flex items-center gap-3">
        <ShopLogo shop={shop} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{shop.name}</p>
          <p className="text-sm text-slate-500">{t.order.questions}</p>
        </div>
        {channels.length === 1 && pill(channels[0])}
      </div>
      {channels.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2 [&>a]:grow [&>a]:basis-28">{channels.map(pill)}</div>
      )}
    </Card>
  )
}

/** The items fold into one line: the customer just chose them. */
function ItemsCard({ order, className }: { order: ShopOrder; className: string }) {
  const t = useT()
  const money = (amount: string) => formatMoney(amount, order.currency)
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  return (
    <Card className={`${className}`}>
      <details className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-slate-900">{t.shop.cartBar.items(count)}</span>
            <span className="block text-sm font-medium text-navy-700">{t.order.showItems}</span>
          </span>
          <span className="text-lg font-bold text-slate-900 tabular-nums">{money(order.total)}</span>
          <ChevronDown aria-hidden className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 sm:px-6 sm:pb-6">
          <ul className="divide-y divide-slate-100">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 py-3 text-sm">
                <ProductImage small src={item.image_url} alt="" className="size-12 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-slate-900">
                    {item.product_name}
                    {item.variant_name && <span className="text-slate-500"> · {item.variant_name}</span>}
                  </span>
                  <span className="text-slate-500 tabular-nums">
                    {item.quantity} × {money(item.unit_price)}
                  </span>
                </span>
                <span className="font-medium text-slate-900 tabular-nums">{money(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">{t.shop.summary.items}</dt>
              <dd className="text-slate-900 tabular-nums">{money(order.subtotal)}</dd>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">{t.shop.summary.discount}</dt>
                <dd className="font-medium text-emerald-700 tabular-nums">−{money(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-600">{order.delivery_method === 'pickup' ? t.checkout.pickup : t.shop.summary.delivery}</dt>
              <dd className="text-slate-900 tabular-nums">
                {Number(order.delivery_fee) > 0 ? money(order.delivery_fee) : t.shop.summary.free}
              </dd>
            </div>
          </dl>
          <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
            <span className="font-semibold text-slate-900">{t.shop.summary.total}</span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">{money(order.total)}</span>
          </div>
        </div>
      </details>
    </Card>
  )
}

/** Straight after checkout: confetti from the tick, once per order (not
 * again when the page is reloaded). Marked when it plays, so React's
 * development double run doesn't use it up. */
function useCelebration(orderId: string | null, from: RefObject<Element | null>) {
  useEffect(() => {
    const key = `sc.celebrated.${orderId}`
    if (!orderId || sessionValue(key)) return
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(key, '1')
      } catch {
        // Storage blocked: it may play again on a reload. Harmless.
      }
      buzz(20)
      confettiFrom(from.current)
    }, 350)
    return () => clearTimeout(timer)
  }, [orderId, from])
}

function sessionValue(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

/** How it's being delivered or collected, under the progress bar. */
function DeliveryLine({ order }: { order: ShopOrder }) {
  const { delivery } = order
  const pickup = delivery.method === 'pickup'
  const Icon = pickup ? MapPin : Truck
  const t = useT()
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <p className="flex items-center gap-2 text-sm">
        <Icon aria-hidden className="size-4.5 shrink-0 text-slate-500" />
        <span className="min-w-0 flex-1 text-slate-700">
          {pickup ? t.checkout.pickup : delivery.courier ? t.order.deliveryBy(delivery.courier) : t.checkout.deliveryByShop}
        </span>
        <span
          className={`shrink-0 font-medium ${delivery.status === 'failed' ? 'text-red-700' : delivery.status === 'delivered' ? 'text-emerald-700' : 'text-slate-900'}`}
        >
          {deliveryWords(t, delivery.method, delivery.status)}
        </span>
      </p>
      {pickup && delivery.status !== 'delivered' && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
          <p className="text-xs font-medium text-slate-500">{t.checkout.pickUpAt}</p>
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">
            {delivery.pickup_address ?? t.order.askWhereCollect}
          </p>
        </div>
      )}
    </div>
  )
}

// How long each part of the bar takes to fill, one after another.
const FILL_MS = 260

/** Six parts that fill in turn up to where the order is, with a truck (a
 * parcel for pickup) driving along to it; it moves on by itself when the
 * seller updates the order (the page checks every 30 seconds). */
function Progress({ status, method }: { status: OrderStatus; method: DeliveryMethod }) {
  const t = useT()
  // The last step reached; a completed order has reached them all.
  const reached = status === 'completed' ? STEPS.length - 1 : STEPS.findIndex((step) => step === status)
  // How far the bar has filled so far: from nothing on opening, then one
  // part at a time up to `reached`.
  const [shown, setShown] = useState(-1)
  useEffect(() => {
    if (shown === reached) return
    const timer = setTimeout(() => setShown((n) => n + (n < reached ? 1 : -1)), shown < 0 ? 150 : FILL_MS)
    return () => clearTimeout(timer)
  }, [shown, reached])
  const Icon = method === 'pickup' ? Package : Truck
  const moving = reached < STEPS.length - 1
  const at = Math.max(0, shown)
  const labels = STEPS.map((step) => stepLabel(t, step, t.order.step[step], method))

  return (
    <div className="mt-4">
      {/* For screen readers the steps as a list; the bar is for the eye. */}
      <ol className="sr-only">
        {labels.map((label, i) => (
          <li key={label} aria-current={i === reached ? 'step' : undefined}>
            {label}
            {i <= reached ? t.order.stepDone : t.order.stepNotYet}
          </li>
        ))}
      </ol>
      <div aria-hidden>
        <div className="relative h-7">
          <span
            className="absolute bottom-1 -translate-x-1/2 text-brand transition-[left] duration-300 ease-out"
            style={{ left: `${((at + 0.5) / STEPS.length) * 100}%` }}
          >
            <Icon className={`size-5 ${moving && shown === reached ? 'animate-drive' : ''}`} />
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {STEPS.map((step, i) => (
            <span key={step} className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <span
                className={`block h-full rounded-full bg-brand transition-[width] duration-300 ease-out ${i <= shown ? 'w-full' : 'w-0'}`}
              />
            </span>
          ))}
        </div>
        {/* The step names fit from a small tablet up; phones read the
            step in words above the bar. */}
        <div className="mt-1.5 hidden grid-cols-6 gap-1 text-center text-xs leading-4 sm:grid">
          {labels.map((label, i) => (
            <span key={label} className={i === reached ? 'font-semibold text-slate-900' : 'text-slate-500'}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
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
