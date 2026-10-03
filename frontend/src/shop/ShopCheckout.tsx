import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import {
  Button,
  ErrorMessage,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Section,
  Skeleton,
  TextArea,
} from '../components/ui.tsx'
import { ApiError } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import { formatMoney, fromCents, toCents } from '../lib/money.ts'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ORDER } from '../lib/payments.ts'
import { deliveryFeeCents, discountCents } from '../lib/pricing.ts'
import type { Currency, DeliveryArea, DeliveryMethod, PaymentMethod, ShopStore } from '../lib/types.ts'
import { useCart, useCheckedCart, type CheckedLine } from './cart.ts'
import { loadCustomerDetails, rememberOrder, saveCustomerDetails } from './device.ts'
import { usePlaceOrder, useShop } from './queries.ts'

// The server's codes for a cart that no longer matches the shop: the page
// re-checks the cart so the changed lines show what's wrong.
const CART_CHANGED = new Set(['PRODUCT_OUT_OF_STOCK', 'PRODUCT_UNAVAILABLE', 'ORDER_TOTAL_CHANGED'])
// The seller changed how they deliver since the page loaded: reload the shop.
const DELIVERY_CHANGED = new Set(['DELIVERY_METHOD_UNAVAILABLE', 'DELIVERY_AREA_UNAVAILABLE', 'ORDER_TOTAL_CHANGED'])
const FIELDS = ['name', 'phone', 'delivery_method', 'delivery_area', 'delivery_address', 'notes', 'payment_method']

type Form = {
  name: string
  phone: string
  address: string
  notes: string
  payment: PaymentMethod | null
  delivery: DeliveryMethod | null
  area: string | null
}

/** Each part of the price, in cents. `fee` is null until the customer has
 * chosen how to get the order (and where). */
type Price = { subtotal: number; discount: number; fee: number | null; total: number }

// Payment details (QR code, bank account) come on the order page, once
// the order and its total exist.
const PAYMENT_HINTS: Record<PaymentMethod, string> = {
  khqr: "Scan a QR code with your bank app. You'll get it after placing the order.",
  bank_transfer: "Transfer to the seller's account. You'll see it after placing the order.",
  cod: 'Pay in cash when you get your order.',
}

/** /shop/:storeSlug/checkout: guest checkout (customer, delivery or
 * pickup, payment, review). */
export function ShopCheckout() {
  const { storeSlug = '' } = useParams()
  const navigate = useNavigate()
  const shop = useShop(storeSlug)
  const cart = useCart(storeSlug)
  const checked = useCheckedCart(storeSlug, cart.lines)
  const place = usePlaceOrder(storeSlug)
  // Prefilled from this device's last order.
  const [form, setForm] = useState<Form>(() => {
    const saved = loadCustomerDetails()
    return {
      name: saved?.name ?? '',
      phone: saved?.phone ?? '',
      address: saved?.address ?? '',
      notes: '',
      payment: null,
      delivery: null,
      area: null,
    }
  })
  const set = (key: 'name' | 'phone' | 'address' | 'notes', value: string) => setForm((f) => ({ ...f, [key]: value }))

  // After a successful order the cart is emptied while leaving this page.
  if (cart.lines.length === 0 && !place.isSuccess) return <Navigate to={`/shop/${storeSlug}/cart`} replace />
  if (!shop.data) return <CheckoutSkeleton />
  const currency = shop.data.currency
  const methods = PAYMENT_METHOD_ORDER.filter((m) => shop.data.payment_methods.includes(m))
  // No choice to make when there's one way to pay; otherwise the customer
  // picks, rather than paying in a way they didn't notice was chosen.
  const payment = methods.length === 1 ? methods[0] : form.payment && methods.includes(form.payment) ? form.payment : null
  // The same for delivery: picked for them only when there's one choice.
  const options = shop.data.delivery
  const deliveryMethods = (['seller_delivery', 'pickup'] as const).filter((m) =>
    m === 'pickup' ? options.pickup : options.seller_delivery,
  )
  const delivery =
    deliveryMethods.length === 1
      ? deliveryMethods[0]
      : form.delivery && deliveryMethods.includes(form.delivery)
        ? form.delivery
        : null
  const areas = options.seller_delivery?.areas ?? []
  const area =
    delivery !== 'seller_delivery' ? null : areas.length === 1 ? areas[0] : (areas.find((a) => a.name === form.area) ?? null)
  const deliveryChosen = delivery === 'pickup' || (delivery === 'seller_delivery' && (areas.length === 0 || area !== null))

  const discount = discountCents(checked.subtotalCents, shop.data.discounts)
  const fee = deliveryChosen ? deliveryFeeCents(delivery!, area, checked.subtotalCents, checked.itemCount, options) : null
  const price: Price = {
    subtotal: checked.subtotalCents,
    discount,
    fee,
    total: checked.subtotalCents - discount + (fee ?? 0),
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!checked.ready || place.isPending || !payment || !delivery || !deliveryChosen) return
    const pickup = delivery === 'pickup'
    const details = { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() }
    let order
    try {
      order = await place.mutateAsync({
        name: details.name,
        phone: details.phone,
        delivery_method: delivery,
        delivery_area: area?.name ?? null,
        delivery_address: pickup ? null : details.address,
        notes: form.notes.trim() || null,
        items: checked.lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })),
        expected_total: fromCents(price.total),
        payment_method: payment,
      })
    } catch (error) {
      if (error instanceof ApiError && CART_CHANGED.has(error.code)) checked.refetch()
      // The seller turned this method off, or changed fees: show what's left.
      if (error instanceof ApiError && (error.code === 'PAYMENT_METHOD_UNAVAILABLE' || DELIVERY_CHANGED.has(error.code))) {
        shop.refetch()
      }
      return // shown via place.error
    }
    // A pickup order has no address; keep the one saved from a delivery.
    saveCustomerDetails(pickup ? { ...details, address: loadCustomerDetails()?.address ?? '' } : details)
    rememberOrder({ id: order.id, shop: storeSlug, number: order.number, phone: details.phone, placedAt: order.created_at })
    navigate(`/shop/${storeSlug}/order/${order.id}`, { replace: true, state: { placed: order, phone: details.phone } })
    cart.clear()
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 pb-24 lg:pb-0">
      <title>{`Checkout · ${shop.data.name}`}</title>
      <PageHeader title="Checkout" back={`/shop/${storeSlug}/cart`} />

      <Section title="Your details">
        <Field label="Name" error={fieldError(place.error, 'name')}>
          <Input
            required
            maxLength={100}
            autoComplete="name"
            autoCapitalize="words"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field
          label="Phone number"
          hint="The seller will contact you on this number. You'll also need it to check your order."
          error={fieldError(place.error, 'phone')}
        >
          <Input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={32}
            placeholder="012 345 678"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
      </Section>

      <DeliverySection
        options={options}
        methods={deliveryMethods}
        method={delivery}
        area={area}
        currency={currency}
        price={price}
        error={place.error}
        onMethod={(method) => setForm((f) => ({ ...f, delivery: method }))}
        onArea={(name) => setForm((f) => ({ ...f, area: name }))}
      >
        {delivery !== 'pickup' && (
          <Field
            label="Delivery address"
            hint="House and street number, area, and city."
            error={fieldError(place.error, 'delivery_address')}
          >
            <TextArea
              required
              minLength={3}
              maxLength={500}
              autoComplete="street-address"
              autoCapitalize="sentences"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>
        )}
        <Field
          label="Note for the seller"
          hint={
            delivery === 'pickup'
              ? 'Optional. For example, when you will come.'
              : 'Optional. For example, the best time to deliver.'
          }
          error={fieldError(place.error, 'notes')}
        >
          <TextArea
            rows={2}
            maxLength={500}
            autoCapitalize="sentences"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </DeliverySection>

      <Section title="Payment">
        <fieldset aria-describedby={fieldError(place.error, 'payment_method') ? 'payment-error' : undefined}>
          <legend className="sr-only">How will you pay?</legend>
          <div className="space-y-2">
            {methods.map((method) => (
              <label
                key={method}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50/50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-emerald-600/15"
              >
                <input
                  type="radio"
                  name="payment"
                  required
                  value={method}
                  checked={payment === method}
                  onChange={() => setForm((f) => ({ ...f, payment: method }))}
                  className="mt-0.5 size-5 shrink-0 accent-emerald-700"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">{PAYMENT_METHOD_LABELS[method]}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{PAYMENT_HINTS[method]}</span>
                </span>
              </label>
            ))}
          </div>
          {fieldError(place.error, 'payment_method') && (
            <p id="payment-error" className="mt-2 text-sm text-red-600">
              {fieldError(place.error, 'payment_method')}
            </p>
          )}
        </fieldset>
      </Section>

      <Section
        title="Your order"
        action={
          <Link
            to={`/shop/${storeSlug}/cart`}
            className="-my-2 -mr-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-emerald-700 hover:underline"
          >
            Edit cart
          </Link>
        }
      >
        {checked.error ? (
          <ErrorState error={checked.error} onRetry={() => checked.refetch()} />
        ) : (
          <OrderReview
            lines={checked.lines}
            currency={currency}
            loading={checked.loading}
            price={price}
            cartPath={`/shop/${storeSlug}/cart`}
          />
        )}
      </Section>

      <ErrorMessage error={formError(place.error, FIELDS)} />

      {/* Pinned to the bottom on phones so the button is always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:pb-0">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3 lg:px-0">
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-slate-500">{price.fee === null ? 'Total before delivery' : 'Total'}</span>
            <span className="block truncate text-lg font-bold text-slate-900">
              {checked.loading ? '…' : formatMoney(price.total / 100, currency)}
            </span>
          </span>
          <Button type="submit" size="lg" loading={place.isPending} disabled={!checked.ready} className="min-w-40">
            Place order
          </Button>
        </div>
      </div>
    </form>
  )
}

function DeliverySection({
  options,
  methods,
  method,
  area,
  currency,
  price,
  error,
  onMethod,
  onArea,
  children,
}: {
  options: ShopStore['delivery']
  methods: DeliveryMethod[]
  method: DeliveryMethod | null
  area: DeliveryArea | null
  currency: Currency
  price: Price
  error: unknown
  onMethod: (method: DeliveryMethod) => void
  onArea: (name: string) => void
  children: ReactNode
}) {
  const money = (amount: string) => formatMoney(amount, currency)
  const areas = options.seller_delivery?.areas ?? []
  const fees = areas.map((a) => toCents(a.fee))
  const feeHint =
    areas.length === 0
      ? 'Free delivery.'
      : Math.min(...fees) === Math.max(...fees)
        ? `Delivery fee ${money(areas[0].fee)}.`
        : `Delivery fee from ${formatMoney(Math.min(...fees) / 100, currency)}, depending on where you live.`
  const free = options.seller_delivery
  const freeRules = [
    free?.free_from_amount != null && `orders from ${money(free.free_from_amount)}`,
    free?.free_from_items != null && `${free.free_from_items} or more items`,
  ].filter(Boolean)
  const hints: Record<DeliveryMethod, string> = {
    seller_delivery: `The seller brings it to you. ${feeHint}`,
    pickup: `Collect it from the seller, for free.`,
  }
  // A free-delivery rule applies to this order (the area alone has a fee).
  const freeNow = area !== null && price.fee === 0 && toCents(area.fee) > 0
  const methodError = fieldError(error, 'delivery_method')
  const areaError = fieldError(error, 'delivery_area')
  return (
    <Section title={methods.length === 1 && methods[0] === 'pickup' ? 'Pickup' : 'Delivery'}>
      {methods.length > 1 && (
        <fieldset aria-describedby={methodError ? 'delivery-method-error' : undefined}>
          <legend className="sr-only">How do you want to get your order?</legend>
          <div className="space-y-2">
            {methods.map((m) => (
              <ChoiceCard
                key={m}
                name="delivery-method"
                checked={method === m}
                onChange={() => onMethod(m)}
                label={m === 'pickup' ? 'Pickup' : 'Delivery'}
                hint={hints[m]}
              />
            ))}
          </div>
          {methodError && (
            <p id="delivery-method-error" className="mt-2 text-sm text-red-600">
              {methodError}
            </p>
          )}
        </fieldset>
      )}

      {method === 'seller_delivery' && areas.length > 1 && (
        <fieldset aria-describedby={areaError ? 'delivery-area-error' : undefined}>
          <legend className="mb-1.5 block text-sm font-medium text-slate-700">Where should we deliver?</legend>
          <div className="space-y-2">
            {areas.map((a) => (
              <ChoiceCard
                key={a.name}
                name="delivery-area"
                checked={area?.name === a.name}
                onChange={() => onArea(a.name)}
                label={a.name}
                trailing={money(a.fee)}
              />
            ))}
          </div>
          {areaError && (
            <p id="delivery-area-error" className="mt-2 text-sm text-red-600">
              {areaError}
            </p>
          )}
        </fieldset>
      )}
      {method === 'seller_delivery' && areas.length === 1 && methods.length === 1 && (
        <p className="text-sm text-slate-600">
          Delivery to {areas[0].name}: {money(areas[0].fee)}
        </p>
      )}
      {method === 'seller_delivery' && freeRules.length > 0 && (
        <p
          className={`rounded-xl px-3.5 py-2.5 text-sm ${freeNow ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'}`}
        >
          {freeNow ? 'Your delivery is free' : 'Free delivery'} on {freeRules.join(' or ')}.
        </p>
      )}

      {method === 'pickup' && options.pickup && (
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
          <p className="text-xs font-medium text-slate-500">Pick up at</p>
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">{options.pickup.address}</p>
        </div>
      )}

      {children}
    </Section>
  )
}

/** A radio choice as a full-width card. */
function ChoiceCard({
  name,
  checked,
  onChange,
  label,
  hint,
  trailing,
}: {
  name: string
  checked: boolean
  onChange: () => void
  label: string
  hint?: string
  trailing?: string
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50/50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-emerald-600/15">
      <input
        type="radio"
        name={name}
        required
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-5 shrink-0 accent-emerald-700"
      />
      <span className="min-w-0 flex-1">
        <span className="block break-words font-medium text-slate-900">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-slate-500">{hint}</span>}
      </span>
      {trailing && <span className="shrink-0 text-sm font-medium text-slate-900">{trailing}</span>}
    </label>
  )
}

function OrderReview({
  lines,
  currency,
  loading,
  price,
  cartPath,
}: {
  lines: CheckedLine[]
  currency: Currency
  loading: boolean
  price: Price
  cartPath: string
}) {
  const problems = lines.some((line) => line.problem)
  const money = (cents: number) => formatMoney(cents / 100, currency)
  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {lines.map((line) => (
          <li key={`${line.productId}:${line.variantId}`} className="flex gap-3 py-2.5 first:pt-0">
            <span className="min-w-0 flex-1 text-sm">
              <span className="block break-words text-slate-900">
                {line.name}
                {line.variantName && <span className="text-slate-500"> · {line.variantName}</span>}
              </span>
              <span className="text-slate-500">
                {line.quantity} × {formatMoney(line.price, currency)}
              </span>
              {line.problem && <span className="block font-medium text-red-700">{line.problem}</span>}
            </span>
            <span className="text-sm font-medium text-slate-900">
              {formatMoney((toCents(line.price) * line.quantity) / 100, currency)}
            </span>
          </li>
        ))}
      </ul>
      {!loading && (
        <dl className="mt-2 space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Items</dt>
            <dd className="text-slate-900">{money(price.subtotal)}</dd>
          </div>
          {price.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-600">Discount</dt>
              <dd className="font-medium text-emerald-700">−{money(price.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate-600">Delivery</dt>
            <dd className="text-slate-900">
              {price.fee === null ? <span className="text-slate-500">Choose above</span> : price.fee === 0 ? 'Free' : money(price.fee)}
            </dd>
          </div>
        </dl>
      )}
      <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
        <span className="font-semibold text-slate-900">Total</span>
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <span className="text-lg font-bold text-slate-900">{money(price.total)}</span>
        )}
      </div>
      {problems && (
        <p className="mt-2 text-sm text-red-700">
          Some items changed since you added them.{' '}
          <Link to={cartPath} className="font-medium underline">
            Update your cart
          </Link>{' '}
          to continue.
        </p>
      )}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-xl space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-52 w-full rounded-2xl" />
    </div>
  )
}
