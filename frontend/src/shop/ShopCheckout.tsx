import { Check, LoaderCircle, MapPin } from 'lucide-react'
import { lazy, Suspense, useCallback, useState, type FormEvent, type ReactNode } from 'react'
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
import { useT } from '../i18n/useT.ts'
import { ApiError } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import { formatMoney, fromCents, toCents } from '../lib/money.ts'
import { PAYMENT_METHOD_ORDER } from '../lib/payments.ts'
import { deliveryFeeCents, discountCents } from '../lib/pricing.ts'
import type { Currency, PaymentMethod, ShopStore } from '../lib/types.ts'
import { useCart, useCheckedCart, type CheckedLine } from './cart.ts'
import { loadCustomerDetails, rememberedLink, rememberOrder, saveCustomerDetails } from './device.ts'
import { usePlaceOrder, useShop } from './queries.ts'

// The server's codes for a cart that no longer matches the shop: the page
// re-checks the cart so the changed lines show what's wrong.
const CART_CHANGED = new Set(['PRODUCT_OUT_OF_STOCK', 'PRODUCT_UNAVAILABLE', 'ORDER_TOTAL_CHANGED'])
// The seller changed how they deliver since the page loaded: reload the shop.
const DELIVERY_CHANGED = new Set(['DELIVERY_METHOD_UNAVAILABLE', 'DELIVERY_OPTION_UNAVAILABLE', 'ORDER_TOTAL_CHANGED'])
const FIELDS = [
  'name',
  'phone',
  'delivery_method',
  'courier',
  'delivery_address',
  'delivery_lat',
  'delivery_address_note',
  'notes',
  'payment_method',
]

type Form = {
  name: string
  phone: string
  address: string
  notes: string
  payment: PaymentMethod | null
  /** The delivery choice: OWN, PICKUP, or a courier's name. */
  how: string | null
  addressNote: string
  location: Location | null
}

type Location = { lat: number; lng: number }

// Delivery choices besides the shop's couriers (whose names can't clash
// with these: they're typed by people).
const OWN = '\u0000own'
const PICKUP = '\u0000pickup'

/** The shop's delivery choices, in the order they're offered. */
function deliveryChoices(options: ShopStore['delivery']): string[] {
  return [...(options.own_delivery ? [OWN] : []), ...options.couriers, ...(options.pickup ? [PICKUP] : [])]
}

/** Each part of the price, in cents. `fee` is null until the customer has
 * chosen how to get the order (and where). */
type Price = { subtotal: number; discount: number; fee: number | null; total: number }

/** /shop/:storeSlug/checkout: guest checkout (customer, delivery or
 * pickup, payment, review). */
export function ShopCheckout() {
  const { storeSlug = '' } = useParams()
  const navigate = useNavigate()
  const shop = useShop(storeSlug)
  const cart = useCart(storeSlug)
  const checked = useCheckedCart(storeSlug, cart.lines)
  const place = usePlaceOrder(storeSlug)
  const t = useT()
  const c = t.checkout
  // Prefilled from this device's last order.
  const [form, setForm] = useState<Form>(() => {
    const saved = loadCustomerDetails()
    return {
      name: saved?.name ?? '',
      phone: saved?.phone ?? '',
      address: saved?.address ?? '',
      notes: '',
      payment: null,
      how: null,
      addressNote: saved?.addressNote ?? '',
      location: null,
    }
  })
  const set = (key: 'name' | 'phone' | 'address' | 'notes' | 'addressNote', value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

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
  const choices = deliveryChoices(options)
  const how = choices.length === 1 ? choices[0] : form.how && choices.includes(form.how) ? form.how : null
  const pickup = how === PICKUP
  const courier = how && how !== OWN && how !== PICKUP ? how : null

  const discount = discountCents(checked.subtotalCents, shop.data.discounts)
  const fee =
    how === null
      ? null
      : deliveryFeeCents(pickup ? 'pickup' : 'seller_delivery', checked.subtotalCents, checked.itemCount, options)
  const price: Price = {
    subtotal: checked.subtotalCents,
    discount,
    fee,
    total: checked.subtotalCents - discount + (fee ?? 0),
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!checked.ready || place.isPending || !payment || !how) return
    const details = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      addressNote: form.addressNote.trim(),
    }
    let order
    try {
      order = await place.mutateAsync({
        name: details.name,
        phone: details.phone,
        delivery_method: pickup ? 'pickup' : 'seller_delivery',
        courier,
        delivery_address: pickup ? null : details.address || null,
        delivery_lat: pickup ? null : (form.location?.lat ?? null),
        delivery_lng: pickup ? null : (form.location?.lng ?? null),
        delivery_address_note: pickup ? null : details.addressNote || null,
        notes: form.notes.trim() || null,
        items: checked.lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })),
        expected_total: fromCents(price.total),
        link: rememberedLink(storeSlug),
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
    if (!pickup) saveCustomerDetails(details)
    else {
      const saved = loadCustomerDetails()
      saveCustomerDetails({ ...details, address: saved?.address ?? '', addressNote: saved?.addressNote ?? '' })
    }
    rememberOrder({ id: order.id, shop: storeSlug, number: order.number, phone: details.phone, placedAt: order.created_at })
    navigate(`/shop/${storeSlug}/order/${order.id}`, { replace: true, state: { placed: order, phone: details.phone } })
    cart.clear()
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 pb-24 lg:pb-0">
      <title>{c.tab(shop.data.name)}</title>
      <PageHeader title={c.title} back={`/shop/${storeSlug}/cart`} />

      <Section title={c.yourDetails}>
        <Field label={c.name} error={fieldError(place.error, 'name')}>
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
          label={c.phone}
          hint={c.phoneHint}
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
        choices={choices}
        how={how}
        currency={currency}
        price={price}
        error={place.error}
        onChoose={(choice) => setForm((f) => ({ ...f, how: choice }))}
      >
        {how !== null && !pickup && (
          <>
            <LocationField
              location={form.location}
              onChange={(location) => setForm((f) => ({ ...f, location }))}
              error={fieldError(place.error, 'delivery_lat')}
            />
            <Field
              label={form.location ? c.addressOptional : c.address}
              hint={form.location ? c.addressHintPinned : c.addressHint}
              error={fieldError(place.error, 'delivery_address')}
            >
              <TextArea
                required={!form.location}
                minLength={3}
                maxLength={500}
                autoComplete="street-address"
                autoCapitalize="sentences"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </Field>
            <Field
              label={c.addressNote}
              hint={c.addressNoteHint}
              error={fieldError(place.error, 'delivery_address_note')}
            >
              <Input
                maxLength={500}
                autoCapitalize="sentences"
                value={form.addressNote}
                onChange={(e) => set('addressNote', e.target.value)}
              />
            </Field>
          </>
        )}
        <Field
          label={c.noteForSeller}
          hint={pickup ? c.noteHintPickup : c.noteHintDelivery}
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

      <Section title={c.payment}>
        <fieldset aria-describedby={fieldError(place.error, 'payment_method') ? 'payment-error' : undefined}>
          <legend className="sr-only">{c.howPay}</legend>
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
                  <span className="block font-medium text-slate-900">{t.status.paymentMethod[method]}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{c.paymentHint[method]}</span>
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
        title={c.yourOrder}
        action={
          <Link
            to={`/shop/${storeSlug}/cart`}
            className="-my-2 -mr-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-emerald-700 hover:underline"
          >
            {c.editCart}
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
            <span className="block text-xs text-slate-500">{price.fee === null ? c.totalBeforeDelivery : t.shop.summary.total}</span>
            <span className="block truncate text-lg font-bold text-slate-900">
              {checked.loading ? '…' : formatMoney(price.total / 100, currency)}
            </span>
          </span>
          <Button type="submit" size="lg" loading={place.isPending} disabled={!checked.ready} className="min-w-40">
            {c.placeOrder}
          </Button>
        </div>
      </div>
    </form>
  )
}

function DeliverySection({
  options,
  choices,
  how,
  currency,
  price,
  error,
  onChoose,
  children,
}: {
  options: ShopStore['delivery']
  choices: string[]
  how: string | null
  currency: Currency
  price: Price
  error: unknown
  onChoose: (choice: string) => void
  children: ReactNode
}) {
  const t = useT()
  const c = t.checkout
  const free = t.shop.summary.free
  const money = (amount: string) => formatMoney(amount, currency)
  const feeText = Number(options.fee) > 0 ? money(options.fee) : free
  const freeRules = [
    options.free_from_amount !== null && c.freeFromAmount(money(options.free_from_amount)),
    options.free_from_items !== null && c.freeFromItems(options.free_from_items),
  ].filter((rule) => rule !== false)
  const delivering = how !== null && how !== PICKUP
  // A free-delivery rule applies to this order (the shop charges otherwise).
  const freeNow = delivering && price.fee === 0 && Number(options.fee) > 0
  const label = (choice: string) => (choice === OWN ? c.deliveryByShop : choice === PICKUP ? c.pickup : choice)
  const hint = (choice: string) => (choice === OWN ? c.hintOwn : choice === PICKUP ? c.hintPickup : c.hintCourier)
  const choiceError = fieldError(error, 'delivery_method') ?? fieldError(error, 'courier')
  return (
    <Section title={choices.length === 1 && choices[0] === PICKUP ? c.pickup : c.delivery}>
      {choices.length > 1 ? (
        <fieldset aria-describedby={choiceError ? 'delivery-choice-error' : undefined}>
          <legend className="mb-1.5 block text-sm font-medium text-slate-700">{c.howGet}</legend>
          <div className="space-y-2">
            {choices.map((choice) => (
              <ChoiceCard
                key={choice}
                name="delivery-choice"
                checked={how === choice}
                onChange={() => onChoose(choice)}
                label={label(choice)}
                hint={hint(choice)}
                trailing={choice === PICKUP ? free : feeText}
              />
            ))}
          </div>
          {choiceError && (
            <p id="delivery-choice-error" className="mt-2 text-sm text-red-600">
              {choiceError}
            </p>
          )}
        </fieldset>
      ) : (
        <p className="text-sm text-slate-700">
          {label(choices[0])}: {choices[0] === PICKUP ? free : feeText}
        </p>
      )}
      {delivering && freeRules.length > 0 && Number(options.fee) > 0 && (
        <p
          className={`rounded-xl px-3.5 py-2.5 text-sm ${freeNow ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'}`}
        >
          {c.freeDelivery(freeRules, freeNow)}
        </p>
      )}

      {how === PICKUP && options.pickup && (
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
          <p className="text-xs font-medium text-slate-500">{c.pickUpAt}</p>
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">{options.pickup.address}</p>
        </div>
      )}

      {children}
    </Section>
  )
}

// The map (Leaflet) loads only when a customer opens it. If the file is
// gone (a new deploy since the page loaded) or the connection drops, say
// so instead of breaking checkout: the typed address still works.
const MapPicker = lazy(() =>
  import('./MapPicker.tsx').catch(() => ({ default: MapUnavailable })),
)

/** Where to deliver: a pin on the map, so the seller can open it in
 * Google Maps. Optional when the customer types an address. */
function LocationField({
  location,
  onChange,
  error,
}: {
  location: Location | null
  onChange: (location: Location | null) => void
  error: string | null
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const t = useT()

  return (
    <div>
      {location ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          <Check aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {t.checkout.locationPinned}{' '}
            <button type="button" onClick={() => setOpen(true)} className="font-medium underline">
              {t.checkout.change}
            </button>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="-my-2 -mr-2 min-h-11 rounded-lg px-2 font-medium hover:underline"
          >
            {t.common.remove}
          </button>
        </div>
      ) : (
        <Button variant="secondary" icon={MapPin} onClick={() => setOpen(true)} className="w-full">
          {t.checkout.pinLocation}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
      {open && (
        <Suspense fallback={<MapLoading />}>
          <MapPicker
            initial={location}
            onClose={close}
            onConfirm={(picked) => {
              onChange(picked)
              setOpen(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

function MapLoading() {
  const t = useT()
  return (
    <div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-white text-slate-600">
      <LoaderCircle aria-hidden className="mr-2 size-5 animate-spin" />
      {t.checkout.openingMap}
    </div>
  )
}

function MapUnavailable({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="map-unavailable"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center"
    >
      <p id="map-unavailable" className="text-slate-800">
        {t.checkout.mapUnavailable}
      </p>
      <Button variant="secondary" onClick={onClose}>
        {t.checkout.backToCheckout}
      </Button>
    </div>
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
  const t = useT()
  const summary = t.shop.summary
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
            <dt className="text-slate-600">{summary.items}</dt>
            <dd className="text-slate-900">{money(price.subtotal)}</dd>
          </div>
          {price.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-600">{summary.discount}</dt>
              <dd className="font-medium text-emerald-700">−{money(price.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate-600">{summary.delivery}</dt>
            <dd className="text-slate-900">
              {price.fee === null ? (
                <span className="text-slate-500">{t.checkout.chooseAbove}</span>
              ) : price.fee === 0 ? (
                summary.free
              ) : (
                money(price.fee)
              )}
            </dd>
          </div>
        </dl>
      )}
      <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
        <span className="font-semibold text-slate-900">{summary.total}</span>
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <span className="text-lg font-bold text-slate-900">{money(price.total)}</span>
        )}
      </div>
      {problems && (
        <p className="mt-2 text-sm text-red-700">
          {t.checkout.itemsChanged}{' '}
          <Link to={cartPath} className="font-medium underline">
            {t.checkout.updateCart}
          </Link>{' '}
          {t.checkout.toContinue}
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
