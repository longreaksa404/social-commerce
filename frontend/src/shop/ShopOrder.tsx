import { Check, CircleCheck, Copy, XCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass } from '../components/styles.ts'
import { Button, Card, ErrorState, Field, Input, Skeleton } from '../components/ui.tsx'
import { formatMoney } from '../lib/money.ts'
import type { OrderStatus, ShopOrder, ShopStore } from '../lib/types.ts'
import { orderPhone, rememberOrder } from './device.ts'
import { isNotFound, useShop, useTrackOrder } from './queries.ts'

/**
 * /shop/:storeSlug/order/:orderId: the confirmation right after checkout,
 * and order tracking afterwards. Opening it needs the phone the order was
 * placed with (02_TECHNICAL.md section 8); the device that placed it
 * remembers that, so the customer only types it on another phone.
 */
export function ShopOrderPage() {
  const { storeSlug = '', orderId = '' } = useParams()
  const placed = (useLocation().state as { placed?: ShopOrder } | null)?.placed
  const shop = useShop(storeSlug)
  const [phone, setPhone] = useState(() => orderPhone(orderId))
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
  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(value.trim())
  }
  return (
    <div className="mx-auto max-w-md">
      <title>{`Your order · ${shop.name}`}</title>
      <Card className="p-5 sm:p-6">
        <h1 className="text-lg font-bold text-slate-900">Check your order</h1>
        <p className="mt-1 text-sm text-slate-600">Enter the phone number you used when you placed this order.</p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field
            label="Phone number"
            error={wrongPhone ? "This number doesn't match the order. Check it and try again." : null}
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
            Show my order
          </Button>
        </form>
      </Card>
    </div>
  )
}

// What customers read for each order status.
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Order placed' },
  { status: 'accepted', label: 'Confirmed by the seller' },
  { status: 'processing', label: 'Being prepared' },
  { status: 'ready', label: 'Packed and ready' },
  { status: 'shipped', label: 'On the way' },
  { status: 'delivered', label: 'Delivered' },
]

const HEADLINES: Record<OrderStatus, string> = {
  pending: 'Waiting for the seller to confirm',
  accepted: 'Confirmed by the seller',
  processing: 'Being prepared',
  ready: 'Packed and ready',
  shipped: 'On the way to you',
  delivered: 'Delivered',
  completed: 'Completed',
  rejected: "The seller couldn't take this order",
  cancelled: 'This order was cancelled',
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
  // Opened with a typed phone: remember it, so next time it opens directly
  // and the order shows in "Your orders" on the cart page.
  useEffect(() => {
    rememberOrder({ id: order.id, shop: shop.slug, number: order.number, phone, placedAt: order.created_at })
  }, [order.id, order.number, order.created_at, shop.slug, phone])
  const closed = order.status === 'rejected' || order.status === 'cancelled'

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Link copied')
    } catch {
      toast("Couldn't copy. Copy the address from your browser instead.", 'error')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <title>{`Order #${order.number} · ${shop.name}`}</title>

      {justPlaced && (
        <div className="flex flex-col items-center px-4 pt-2 pb-2 text-center">
          <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CircleCheck aria-hidden className="size-8" />
          </span>
          <h1 className="text-xl font-bold text-slate-900">Thank you! Your order is placed.</h1>
          <p className="mt-1 text-sm text-slate-600">
            {order.status === 'pending'
              ? `${shop.name} will confirm it and contact you soon.`
              : `${shop.name} will contact you about delivery.`}
          </p>
        </div>
      )}

      <Card className="p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          {justPlaced ? (
            <h2 className="text-lg font-bold text-slate-900">Order #{order.number}</h2>
          ) : (
            <h1 className="text-lg font-bold text-slate-900">Order #{order.number}</h1>
          )}
          <span className="text-sm text-slate-500">
            {new Date(order.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <p
          className={`mt-1 flex items-center gap-1.5 font-medium ${closed ? 'text-red-700' : 'text-emerald-700'}`}
          aria-live="polite"
        >
          {closed && <XCircle aria-hidden className="size-4.5" />}
          {HEADLINES[order.status]}
        </p>
        {closed ? (
          <p className="mt-2 text-sm text-slate-600">Contact {shop.name} if you have questions about it.</p>
        ) : (
          <Progress status={order.status} />
        )}
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-2 font-semibold text-slate-900">Items</h2>
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
        <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
          <span className="font-semibold text-slate-900">Total</span>
          <span className="text-lg font-bold text-slate-900">{formatMoney(order.total, order.currency)}</span>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <p className="text-sm text-slate-600">
          Come back to this page to see how your order is going. It opens on this phone; on another one, you'll need
          your phone number.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" icon={Copy} onClick={copyLink} className="sm:flex-1">
            Copy link
          </Button>
          <Link to={`/shop/${shop.slug}`} className={`${buttonClass('ghost')} sm:flex-1`}>
            Continue shopping
          </Link>
        </div>
      </Card>
    </div>
  )
}

function Progress({ status }: { status: OrderStatus }) {
  // The last step reached; a completed order has reached them all.
  const reached = status === 'completed' ? STEPS.length - 1 : STEPS.findIndex((step) => step.status === status)
  return (
    <ol className="mt-4">
      {STEPS.map((step, i) => {
        const done = i <= reached
        const latest = i === reached
        return (
          <li key={step.status} className="relative flex min-h-10 items-start gap-3">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`absolute top-6 left-[11px] h-[calc(100%-1rem)] w-0.5 ${i < reached ? 'bg-emerald-600' : 'bg-slate-200'}`}
              />
            )}
            <span
              aria-hidden
              className={`relative flex size-6 shrink-0 items-center justify-center rounded-full ${
                done ? 'bg-emerald-600 text-white' : 'border-2 border-slate-200 bg-white'
              }`}
            >
              {done && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span
              aria-current={latest ? 'step' : undefined}
              className={`pt-0.5 text-sm ${latest ? 'font-semibold text-slate-900' : done ? 'text-slate-700' : 'text-slate-500'}`}
            >
              {step.label}
              <span className="sr-only">{done ? ' (done)' : ' (not yet)'}</span>
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
