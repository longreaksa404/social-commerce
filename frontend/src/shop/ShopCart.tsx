import { ChevronRight, ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Card, EmptyState, ErrorState, IconButton, Skeleton } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { formatMoney, toCents } from '../lib/money.ts'
import { discountCents, nextDiscount } from '../lib/pricing.ts'
import type { Currency } from '../lib/types.ts'
import { MAX_QUANTITY, useCart, useCheckedCart, type CheckedLine } from './cart.ts'
import { ProductImage, QuantityStepper } from './components.tsx'
import { placedOrders } from './device.ts'
import { useShop } from './queries.ts'

/** /shop/:storeSlug/cart */
export function ShopCart() {
  const { storeSlug = '' } = useParams()
  const shop = useShop(storeSlug)
  const cart = useCart(storeSlug)
  const checked = useCheckedCart(storeSlug, cart.lines)

  if (!shop.data) return <CartSkeleton />
  const currency = shop.data.currency
  const money = (cents: number) => formatMoney(cents / 100, currency)
  const discount = discountCents(checked.subtotalCents, shop.data.discounts)
  const next = nextDiscount(checked.subtotalCents, shop.data.discounts)
  // Unless the customer picks pickup (or a free-delivery rule applies).
  const feeLater = Number(shop.data.delivery.fee) > 0

  return (
    <div className="mx-auto max-w-xl">
      <title>{`Your cart · ${shop.data.name}`}</title>
      <h1 className="mb-4 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Your cart</h1>

      {cart.lines.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          action={
            <Link to={`/shop/${storeSlug}`} className={buttonClass('primary')}>
              Browse products
            </Link>
          }
        >
          Add products from the shop, then come back here to order.
        </EmptyState>
      ) : checked.error ? (
        <ErrorState error={checked.error} onRetry={() => checked.refetch()} />
      ) : (
        <>
          <Card className="divide-y divide-slate-100">
            {checked.lines.map((line) => (
              <CartRow
                key={`${line.productId}:${line.variantId}`}
                shop={storeSlug}
                line={line}
                currency={currency}
                onQuantity={(n) => cart.setQuantity(line.productId, line.variantId, n)}
                onRemove={() => cart.remove(line.productId, line.variantId)}
              />
            ))}
          </Card>

          {!checked.loading && discount > 0 && (
            <dl className="mt-4 space-y-1 px-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Items</dt>
                <dd className="text-slate-900">{money(checked.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Discount</dt>
                <dd className="font-medium text-emerald-700">−{money(discount)}</dd>
              </div>
            </dl>
          )}
          <div className="mt-4 flex items-baseline justify-between px-1">
            <span className="font-medium text-slate-700">Total</span>
            {checked.loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <span className="text-xl font-bold text-slate-900">{money(checked.subtotalCents - discount)}</span>
            )}
          </div>
          {!checked.loading && feeLater && (
            <p className="px-1 text-right text-xs text-slate-500">Delivery fee is added at checkout.</p>
          )}
          {!checked.loading && next && (
            <p className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
              Add {money(next.missing)} more to get {money(next.off)} off.
            </p>
          )}
          {!checked.loading && !checked.ready && (
            <p className="mt-2 px-1 text-sm text-red-700">Fix the items marked in red to continue.</p>
          )}
          {checked.ready ? (
            <Link to={`/shop/${storeSlug}/checkout`} className={`${buttonClass('primary', 'lg')} mt-4 w-full`}>
              Checkout
            </Link>
          ) : (
            <button type="button" disabled className={`${buttonClass('primary', 'lg')} mt-4 w-full`}>
              Checkout
            </button>
          )}
          <Link to={`/shop/${storeSlug}`} className={`${buttonClass('ghost')} mt-2 w-full`}>
            Continue shopping
          </Link>
        </>
      )}

      <YourOrders shop={storeSlug} />
    </div>
  )
}

function CartRow({
  shop,
  line,
  currency,
  onQuantity,
  onRemove,
}: {
  shop: string
  line: CheckedLine
  currency: Currency
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const unavailable = line.available === 0
  const max = Math.min(MAX_QUANTITY, Math.max(line.available ?? MAX_QUANTITY, line.quantity))
  return (
    <div className="flex gap-3 p-3 sm:p-4">
      {/* Same place as the name's link, so hidden from screen readers and Tab. */}
      <Link to={`/shop/${shop}/product/${line.productSlug}`} aria-hidden tabIndex={-1} className="shrink-0 rounded-xl">
        <ProductImage
          src={line.imageUrl}
          alt=""
          className={`size-20 rounded-xl ${unavailable ? 'opacity-50' : ''}`}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={`/shop/${shop}/product/${line.productSlug}`}
              className="line-clamp-2 font-medium leading-snug break-words text-slate-900 hover:underline"
            >
              {line.name}
            </Link>
            {line.variantName && <p className="mt-0.5 text-sm text-slate-500">{line.variantName}</p>}
            <p className="mt-0.5 text-sm text-slate-700">{formatMoney(line.price, currency)}</p>
          </div>
          <IconButton icon={Trash2} label={`Remove ${line.name}`} onClick={onRemove} className="-mt-2 -mr-2" />
        </div>
        {line.problem && <p className="mt-1 text-sm font-medium text-red-700">{line.problem}</p>}
        {!unavailable && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <QuantityStepper value={line.quantity} max={max} onChange={onQuantity} label={`Quantity of ${line.name}`} />
            <span className="font-semibold text-slate-900">
              {formatMoney((toCents(line.price) * line.quantity) / 100, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** Orders placed on this device, so customers can find them again. */
function YourOrders({ shop }: { shop: string }) {
  const orders = placedOrders(shop)
  if (orders.length === 0) return null
  return (
    <section className="mt-8">
      <h2 className="mb-2 px-1 text-sm font-semibold text-slate-900">Your orders</h2>
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/shop/${shop}/order/${order.id}`}
            className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <span className="flex-1">
              <span className="block font-medium text-slate-900">Order #{order.number}</span>
              <span className="block text-sm text-slate-500">
                {new Date(order.placedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-5 text-slate-300" />
          </Link>
        ))}
      </Card>
    </section>
  )
}

function CartSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-xl">
      <Skeleton className="mb-4 h-7 w-32" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-12 w-full rounded-xl" />
    </div>
  )
}
