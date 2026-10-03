import { Check, LocateFixed } from 'lucide-react'
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
import type { Currency, PaymentMethod, ShopStore } from '../lib/types.ts'
import { useCart, useCheckedCart, type CheckedLine } from './cart.ts'
import { loadCustomerDetails, rememberOrder, saveCustomerDetails } from './device.ts'
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
              label={form.location ? 'Address (optional)' : 'Address'}
              hint={
                form.location
                  ? 'Your location is shared. Add the address too if you can.'
                  : 'House and street number, village, district, and province. Or share your location above.'
              }
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
              label="Address note"
              hint="Optional. Helps the driver find you, e.g. blue gate, next to the pagoda."
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
          label="Note for the seller"
          hint={pickup ? 'Optional. For example, when you will come.' : 'Optional. For example, the best time to deliver.'}
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
  const money = (amount: string) => formatMoney(amount, currency)
  const feeText = Number(options.fee) > 0 ? money(options.fee) : 'Free'
  const freeRules = [
    options.free_from_amount !== null && `orders from ${money(options.free_from_amount)}`,
    options.free_from_items !== null && `${options.free_from_items} or more items`,
  ].filter(Boolean)
  const delivering = how !== null && how !== PICKUP
  // A free-delivery rule applies to this order (the shop charges otherwise).
  const freeNow = delivering && price.fee === 0 && Number(options.fee) > 0
  const label = (choice: string) =>
    choice === OWN ? 'Delivery by the shop' : choice === PICKUP ? 'Pickup' : choice
  const hint = (choice: string) =>
    choice === OWN
      ? 'The seller brings it to you.'
      : choice === PICKUP
        ? 'Collect it from the seller.'
        : 'Sent with this delivery company.'
  const choiceError = fieldError(error, 'delivery_method') ?? fieldError(error, 'courier')
  return (
    <Section title={choices.length === 1 && choices[0] === PICKUP ? 'Pickup' : 'Delivery'}>
      {choices.length > 1 ? (
        <fieldset aria-describedby={choiceError ? 'delivery-choice-error' : undefined}>
          <legend className="mb-1.5 block text-sm font-medium text-slate-700">How do you want to get your order?</legend>
          <div className="space-y-2">
            {choices.map((choice) => (
              <ChoiceCard
                key={choice}
                name="delivery-choice"
                checked={how === choice}
                onChange={() => onChoose(choice)}
                label={label(choice)}
                hint={hint(choice)}
                trailing={choice === PICKUP ? 'Free' : feeText}
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
          {label(choices[0])}: {choices[0] === PICKUP ? 'Free' : feeText}
        </p>
      )}
      {delivering && freeRules.length > 0 && Number(options.fee) > 0 && (
        <p
          className={`rounded-xl px-3.5 py-2.5 text-sm ${freeNow ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'}`}
        >
          {freeNow ? 'Your delivery is free' : 'Free delivery'} on {freeRules.join(' or ')}.
        </p>
      )}

      {how === PICKUP && options.pickup && (
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
          <p className="text-xs font-medium text-slate-500">Pick up at</p>
          <p className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">{options.pickup.address}</p>
        </div>
      )}

      {children}
    </Section>
  )
}

/** "Use my current location": the phone's GPS position, so the seller
 * can open it in Google Maps. Needs https (or localhost). */
function LocationField({
  location,
  onChange,
  error,
}: {
  location: Location | null
  onChange: (location: Location | null) => void
  error: string | null
}) {
  const [locating, setLocating] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)

  function locate() {
    if (!('geolocation' in navigator)) {
      setProblem("This browser can't share your location. Type your address instead.")
      return
    }
    setLocating(true)
    setProblem(null)
    setBlocked(false)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (failure) => {
        setLocating(false)
        if (failure.code === failure.PERMISSION_DENIED) setBlocked(true)
        else setProblem("Couldn't find your location. Try again outside, or type your address.")
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  const message = problem ?? error
  return (
    <div>
      {location ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          <Check aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Location shared.{' '}
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              Check it on the map
            </a>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="-my-2 -mr-2 min-h-11 rounded-lg px-2 font-medium hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <Button variant="secondary" icon={LocateFixed} loading={locating} onClick={locate} className="w-full">
          Use my current location
        </Button>
      )}
      {blocked && !location && <LocationBlocked onRetry={locate} retrying={locating} />}
      {message && (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  )
}

/** A web page can't open the phone's settings, so say exactly where to tap
 * for this phone and browser. */
function locationSteps(): { title: string; steps: string[] } {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (/FBAN|FBAV|FB_IAB|Instagram|BytedanceWebview|musical_ly|TikTok|Line\//i.test(ua)) {
    return {
      title: "This app's browser can't share your location",
      steps: [
        `Tap ••• (top right) → “Open in ${ios ? 'Safari' : 'browser'}”.`,
        'Your cart stays in this app, so add the items again there, then tap “Use my current location”.',
      ],
    }
  }
  if (ios && /CriOS/.test(ua)) {
    return {
      title: 'Location is off for Chrome',
      steps: ['Open the Settings app → Chrome → Location → “While Using the App”.', 'Come back here and tap Try again.'],
    }
  }
  if (ios) {
    return {
      title: 'Location is off for this site',
      steps: [
        'Tap the ᴀA (or ☰) button next to the address bar → Website Settings → Location → Allow.',
        'Still blocked? Settings app → Privacy & Security → Location Services: turn it on, and set Safari Websites to “While Using the App”.',
        'Come back here and tap Try again.',
      ],
    }
  }
  if (/Android/.test(ua)) {
    return {
      title: 'Location is off for this site',
      steps: [
        'Tap the icon left of the web address → Permissions (or Site settings) → Location → Allow.',
        "Make sure your phone's Location is on (swipe down from the top).",
        'Come back here and tap Try again.',
      ],
    }
  }
  return {
    title: 'Location is off for this site',
    steps: ['Allow location for this site in your browser settings.', 'Then tap Try again.'],
  }
}

function LocationBlocked({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const { title, steps } = locationSteps()
  return (
    <div role="alert" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
      <p className="font-medium">{title}</p>
      <ol className="mt-1.5 list-decimal space-y-1 pl-5">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Button variant="secondary" loading={retrying} onClick={onRetry} className="mt-3 w-full">
        Try again
      </Button>
      <p className="mt-2 text-amber-800">Or just type your address below. That works too.</p>
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
