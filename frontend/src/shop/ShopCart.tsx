import { ChevronRight, ReceiptText, ShoppingCart, Tag, Trash2, Truck, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Card, EmptyState, IconButton } from '../components/ui.tsx'
import { buttonClass } from '../components/styles.ts'
import { useT } from '../i18n/useT.ts'
import { formatMoney, toCents } from '../lib/money.ts'
import { freeDeliveryNudge, nextDiscount } from '../lib/pricing.ts'
import type { Currency, ShopStore } from '../lib/types.ts'
import { MAX_QUANTITY, useCart, useCheckedCart, type CheckedLine } from './cart.ts'
import { ProductImage, QuantityStepper } from './components.tsx'
import { placedOrders } from './device.ts'

/** The cart's items at the top of the order page: each line with its
 * quantity, what's wrong with any of them, and what a little more would
 * get (a discount, free delivery): one navy line each, under the items,
 * that opens the shop, once the cart is halfway there (cart page check
 * 7A, founder 2026-11-04; green boxes with bars before). */
export function CartItems({
  shop,
  checked,
}: {
  shop: ShopStore
  checked: ReturnType<typeof useCheckedCart>
}) {
  const cart = useCart(shop.slug)
  const t = useT()
  const page = t.shop.cartPage
  const money = (cents: number) => formatMoney(cents / 100, shop.currency)
  const next = nextDiscount(checked.subtotalCents, shop.discounts)
  const freeDelivery = freeDeliveryNudge(checked.subtotalCents, checked.itemCount, shop.delivery)
  // Only from halfway: far from the goal ("add $861 more") it's noise.
  const discountLine =
    next && checked.subtotalCents >= next.missing ? page.addMoreForDiscount(money(next.missing), money(next.off)) : null
  const deliveryLine =
    freeDelivery?.kind === 'free'
      ? page.deliveryIsFree
      : freeDelivery && freeDelivery.progress >= HALFWAY
        ? freeDelivery.kind === 'amount'
          ? page.addMoreForFreeDelivery(money(freeDelivery.missing))
          : page.addItemsForFreeDelivery(freeDelivery.missing)
        : null

  return (
    <div>
      <ul className="-mx-4 divide-y divide-slate-100 border-y border-slate-100 sm:-mx-6">
        {checked.lines.map((line) => (
          <li key={`${line.productId}:${line.variantId}`}>
            <CartRow
              shop={shop.slug}
              line={line}
              currency={shop.currency}
              onQuantity={(n) => cart.setQuantity(line.productId, line.variantId, n)}
              onRemove={() => cart.remove(line.productId, line.variantId)}
            />
          </li>
        ))}
      </ul>
      {!checked.loading && !checked.ready && !checked.error && (
        <p className="mt-3 text-sm text-red-700">{page.fixItems}</p>
      )}
      {!checked.loading && (discountLine || deliveryLine) && (
        <ul className="-mx-4 divide-y divide-slate-100 border-b border-slate-100 sm:-mx-6">
          {discountLine && (
            <li>
              <Nudge shop={shop.slug} icon={Tag} text={discountLine} />
            </li>
          )}
          {deliveryLine && (
            <li>
              {freeDelivery?.kind === 'free' ? (
                <p className="flex min-h-12 items-center gap-2.5 px-4 text-sm font-medium text-navy-700 sm:px-6">
                  <Truck aria-hidden className="size-4.5 shrink-0" />
                  {deliveryLine}
                </p>
              ) : (
                <Nudge shop={shop.slug} icon={Truck} text={deliveryLine} />
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/** Nothing in the cart yet: back to the products, and the orders already
 * placed on this phone. */
export function EmptyCart({ shop }: { shop: string }) {
  const t = useT()
  const page = t.shop.cartPage
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        icon={ShoppingCart}
        title={page.emptyTitle}
        action={
          <Link to={`/shop/${shop}`} className={buttonClass('primary')}>
            {page.browse}
          </Link>
        }
      >
        {page.emptyText}
      </EmptyState>
      <YourOrders shop={shop} />
    </div>
  )
}

// The cart is at least this far toward a discount or free delivery before
// the line saying what's left shows (cart page check 7A).
const HALFWAY = 0.5

/** A nudge toward a discount or free delivery: one navy line, no box,
 * that opens the shop to add more. */
function Nudge({ shop, icon: Icon, text }: { shop: string; icon: LucideIcon; text: string }) {
  return (
    <Link
      to={`/shop/${shop}`}
      className="flex min-h-12 items-center gap-2.5 px-4 text-sm font-medium text-navy-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 active:bg-slate-100 sm:px-6"
    >
      <Icon aria-hidden className="size-4.5 shrink-0" />
      <span className="min-w-0 flex-1">{text}</span>
      <ChevronRight aria-hidden className="size-4.5 shrink-0" />
    </Link>
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
    <div className="flex gap-3 px-4 py-3 sm:px-6">
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
          {/* Out of stock: no stepper, so the bin stays here. Otherwise the
              stepper's − turns into it at 1 (cart page check 6A). */}
          {unavailable && (
            <IconButton icon={Trash2} label={t.shop.cartPage.remove(line.name)} onClick={onRemove} className="-mt-2 -mr-2" />
          )}
        </div>
        {line.problem && <p className="mt-1 text-sm font-medium text-red-700">{line.problem}</p>}
        {!unavailable && (
          // The line's total goes under the buttons when there's no room
          // beside them (320px phones, bigger amounts).
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <QuantityStepper
              value={line.quantity}
              max={max}
              onChange={onQuantity}
              label={t.shop.quantityOf(line.name)}
              onRemove={onRemove}
              removeLabel={t.shop.cartPage.remove(line.name)}
            />
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
