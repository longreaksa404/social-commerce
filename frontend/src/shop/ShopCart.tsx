import { ChevronRight, ReceiptText, ShoppingBag, Trash2, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Card, EmptyState, ErrorState, IconButton, Skeleton } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { useT } from '../i18n/useT.ts'
import { formatMoney, toCents } from '../lib/money.ts'
import { discountCents, freeDeliveryNudge, nextDiscount } from '../lib/pricing.ts'
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
  const t = useT()
  const page = t.shop.cartPage
  const summary = t.shop.summary

  if (!shop.data) return <CartSkeleton />
  const currency = shop.data.currency
  const money = (cents: number) => formatMoney(cents / 100, currency)
  const discount = discountCents(checked.subtotalCents, shop.data.discounts)
  const next = nextDiscount(checked.subtotalCents, shop.data.discounts)
  const freeDelivery = freeDeliveryNudge(checked.subtotalCents, checked.itemCount, shop.data.delivery)
  // Unless the customer picks pickup (or a free-delivery rule applies).
  const feeLater = Number(shop.data.delivery.fee) > 0 && freeDelivery?.kind !== 'free'
  const filled = cart.lines.length > 0 && !checked.error

  return (
    // Bottom padding on phones: room for the pinned Checkout bar.
    <div className={`mx-auto max-w-xl ${filled ? 'pb-24 lg:pb-0' : ''}`}>
      <title>{page.tab(shop.data.name)}</title>
      <h1 className="mb-4 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{page.title}</h1>

      {cart.lines.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={page.emptyTitle}
          action={
            <Link to={`/shop/${storeSlug}`} className={buttonClass('primary')}>
              {page.browse}
            </Link>
          }
        >
          {page.emptyText}
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
          {!checked.loading && !checked.ready && (
            <p className="mt-2 px-1 text-sm text-red-700">{page.fixItems}</p>
          )}

          {/* What a little more would get them, with bars filling up. */}
          {!checked.loading && (next || freeDelivery) && (
            <div className="mt-4 space-y-2">
              {next && (
                <Nudge
                  text={page.addMoreForDiscount(money(next.missing), money(next.off))}
                  progress={checked.subtotalCents / (checked.subtotalCents + next.missing)}
                />
              )}
              {freeDelivery?.kind === 'free' ? (
                <p className="flex animate-rise items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
                  <Truck aria-hidden className="size-4.5 shrink-0" />
                  {page.deliveryIsFree}
                </p>
              ) : (
                freeDelivery && (
                  <Nudge
                    text={
                      freeDelivery.kind === 'amount'
                        ? page.addMoreForFreeDelivery(money(freeDelivery.missing))
                        : page.addItemsForFreeDelivery(freeDelivery.missing)
                    }
                    progress={freeDelivery.progress}
                  />
                )
              )}
            </div>
          )}

          {!checked.loading && discount > 0 && (
            <dl className="mt-4 space-y-1 px-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">{summary.items}</dt>
                <dd className="text-slate-900">{money(checked.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">{summary.discount}</dt>
                <dd className="font-medium text-emerald-700">−{money(discount)}</dd>
              </div>
            </dl>
          )}
          {!checked.loading && feeLater && <p className="mt-2 px-1 text-xs text-slate-500">{page.feeAtCheckout}</p>}

          {/* Pinned to the bottom on phones, like checkout's Place order. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:mt-2 lg:border-0 lg:bg-transparent lg:pb-0">
            <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3 lg:px-1">
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-slate-500">{summary.total}</span>
                {checked.loading ? (
                  <Skeleton className="mt-1 h-6 w-24" />
                ) : (
                  <span className="block truncate text-lg font-bold text-slate-900">
                    {money(checked.subtotalCents - discount)}
                  </span>
                )}
              </span>
              {checked.ready ? (
                <Link to={`/shop/${storeSlug}/checkout`} className={`${buttonClass('primary', 'lg')} min-w-36`}>
                  {page.checkout}
                </Link>
              ) : (
                <button type="button" disabled className={`${buttonClass('primary', 'lg')} min-w-36`}>
                  {page.checkout}
                </button>
              )}
            </div>
          </div>
          <Link to={`/shop/${storeSlug}`} className={`${buttonClass('ghost')} mt-3 w-full lg:mt-1`}>
            {page.continueShopping}
          </Link>
        </>
      )}

      <YourOrders shop={storeSlug} />
    </div>
  )
}

/** A nudge toward a discount or free delivery: the line, and a bar that
 * fills as the cart gets closer (it says the same as the line). */
function Nudge({ text, progress }: { text: string; progress: number }) {
  return (
    <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5">
      <p className="text-sm text-emerald-800">{text}</p>
      <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(4, Math.min(100, Math.round(progress * 100)))}%` }}
        />
      </div>
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
  const t = useT()
  const unavailable = line.available === 0
  const max = Math.min(MAX_QUANTITY, Math.max(line.available ?? MAX_QUANTITY, line.quantity))
  return (
    <div className="flex gap-3 p-3 sm:p-4">
      {/* Same place as the name's link, so hidden from screen readers and Tab. */}
      <Link to={`/shop/${shop}/product/${line.productSlug}`} aria-hidden tabIndex={-1} className="shrink-0 rounded-xl">
        <ProductImage
          small
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
          <IconButton icon={Trash2} label={t.shop.cartPage.remove(line.name)} onClick={onRemove} className="-mt-2 -mr-2" />
        </div>
        {line.problem && <p className="mt-1 text-sm font-medium text-red-700">{line.problem}</p>}
        {!unavailable && (
          // The line's total goes under the buttons when there's no room
          // beside them (320px phones, bigger amounts).
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <QuantityStepper value={line.quantity} max={max} onChange={onQuantity} label={t.shop.quantityOf(line.name)} />
            <span className="ml-auto font-semibold text-slate-900">
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
  const t = useT()
  if (placedOrders(shop).length === 0) return null
  return (
    <Card className="mt-8 overflow-hidden">
      <Link
        to={`/shop/${shop}/orders`}
        className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-slate-50 active:bg-slate-100"
      >
        <ReceiptText aria-hidden className="size-5 shrink-0 text-slate-500" />
        <span className="flex-1 font-medium text-slate-900">{t.shop.cartPage.yourOrders}</span>
        <ChevronRight aria-hidden className="size-5 text-slate-300" />
      </Link>
    </Card>
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
