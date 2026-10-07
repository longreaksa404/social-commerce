import { Banknote, Check, Landmark, LoaderCircle, MapPin, Plus, QrCode, UserRound, type LucideIcon } from 'lucide-react'
import { lazy, Suspense, useCallback, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  Button,
  Card,
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
import { formatMoney, fromCents } from '../lib/money.ts'
import { PAYMENT_METHOD_ORDER } from '../lib/payments.ts'
import { deliveryFeeCents, discountCents } from '../lib/pricing.ts'
import type { Currency, PaymentMethod, ShopStore } from '../lib/types.ts'
import { useCart, useCheckedCart } from './cart.ts'
import { CartItems, EmptyCart } from './ShopCart.tsx'
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

const PAYMENT_ICON: Record<PaymentMethod, LucideIcon> = { khqr: QrCode, bank_transfer: Landmark, cod: Banknote }

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

/** /shop/:storeSlug/cart: the cart and guest checkout on one page
 * (redesign 2026-10-06): the items, the customer, delivery or pickup,
 * payment, and the total on the Place order button. /checkout, its old
 * address, comes here too. */
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
  // Someone who ordered on this phone before sees their name and phone as
  // one line, with Change, rather than the fields filled in again.
  const [editDetails, setEditDetails] = useState(() => {
    const saved = loadCustomerDetails()
    return !saved?.name || !saved.phone
  })

  // After a successful order the cart is emptied while leaving this page.
  if (!shop.data) return <CheckoutSkeleton />
  if (cart.lines.length === 0 && !place.isSuccess) {
    return (
      <>
        <title>{t.shop.cartPage.tab(shop.data.name)}</title>
        <PageHeader title={c.yourOrder} back={`/shop/${storeSlug}`} />
        <EmptyCart shop={storeSlug} />
      </>
    )
  }
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

  const detailsError = fieldError(place.error, 'name') ?? fieldError(place.error, 'phone')
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
    <form onSubmit={submit} className="mx-auto max-w-xl pb-24 lg:max-w-6xl lg:pb-0">
      <title>{c.tab(shop.data.name)}</title>
      <PageHeader title={c.yourOrder} back={`/shop/${storeSlug}`} />
      {/* One column on phones; on laptops the form on the left and the
          total with Place order on the right, staying in view. */}
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="min-w-0 space-y-4">
          <Section
            step={1}
            title={t.shop.cartBar.items(cart.count)}
            action={
              <Link
                to={`/shop/${storeSlug}`}
                className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-navy-700 hover:underline"
              >
                <Plus aria-hidden className="size-4" />
                {c.addMore}
              </Link>
            }
          >
            {checked.error ? (
              <ErrorState error={checked.error} onRetry={() => checked.refetch()} />
            ) : (
              <CartItems shop={shop.data} checked={checked} />
            )}
          </Section>

          <Section step={2} title={c.yourDetails}>
            {!editDetails && form.name && form.phone && !detailsError ? (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <UserRound aria-hidden className="size-5 shrink-0 text-slate-500" />
                <p className="min-w-0 flex-1 text-sm leading-5">
                  <span className="block truncate font-medium text-slate-900">{form.name}</span>
                  <span className="block text-slate-600 tabular-nums">{form.phone}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setEditDetails(true)}
                  className="-my-2 -mr-2 min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-navy-700 hover:underline"
                >
                  {c.change}
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
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

          <Section step={4} title={c.payment}>
            <fieldset aria-describedby={fieldError(place.error, 'payment_method') ? 'payment-error' : undefined}>
              <legend className="sr-only">{c.howPay}</legend>
              {/* Side by side with short names; what the chosen one means goes
                  underneath, so the three fit a 320px phone in Khmer too. */}
              <div className={`grid gap-2 ${methods.length === 1 ? 'grid-cols-1' : methods.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {methods.map((method) => {
                  const Icon = PAYMENT_ICON[method]
                  return (
                    <label
                      key={method}
                      className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-center text-slate-700 transition-colors has-[:checked]:border-navy-600 has-[:checked]:bg-navy-50/50 has-[:checked]:text-navy-800 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-navy-600/15"
                    >
                      <input
                        type="radio"
                        name="payment"
                        required
                        value={method}
                        checked={payment === method}
                        onChange={() => setForm((f) => ({ ...f, payment: method }))}
                        className="sr-only"
                      />
                      <Icon aria-hidden className="size-6" />
                      <span className="text-sm leading-tight font-medium">{c.paymentShort[method]}</span>
                    </label>
                  )
                })}
              </div>
              {payment && <p className="mt-2.5 text-sm text-slate-600">{c.paymentHint[payment]}</p>}
              {fieldError(place.error, 'payment_method') && (
                <p id="payment-error" className="mt-2 text-sm text-red-600">
                  {fieldError(place.error, 'payment_method')}
                </p>
              )}
            </fieldset>
          </Section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          {!checked.error && <Totals currency={currency} loading={checked.loading} price={price} />}

          <ErrorMessage error={formError(place.error, FIELDS)} />

          {/* Pinned to the bottom on phones so the button is always in reach;
              under the total on laptops. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:pb-0 lg:backdrop-blur-none">
            <div className="mx-auto max-w-xl px-4 py-3 lg:p-0">
              {/* The amount on the button: what tapping it commits to, which
                  matters most before paying by KHQR or bank transfer. */}
              <Button type="submit" size="lg" loading={place.isPending} disabled={!checked.ready} className="w-full justify-between!">
                <span>{c.placeOrder}</span>
                <span className="tabular-nums">
                  {checked.loading ? '…' : formatMoney(price.total / 100, currency)}
                  {price.fee === null && <span className="ml-1 text-sm font-normal opacity-80">{c.plusDelivery}</span>}
                </span>
              </Button>
            </div>
          </div>
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
    <Section step={3} title={choices.length === 1 && choices[0] === PICKUP ? c.pickup : c.delivery}>
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
    <div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-surface text-slate-600">
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center"
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
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 has-[:checked]:border-navy-600 has-[:checked]:bg-navy-50/50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-navy-600/15">
      <input
        type="radio"
        name={name}
        required
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-5 shrink-0 accent-navy-700"
      />
      <span className="min-w-0 flex-1">
        <span className="block break-words font-medium text-slate-900">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-slate-500">{hint}</span>}
      </span>
      {trailing && <span className="shrink-0 text-sm font-medium text-slate-900">{trailing}</span>}
    </label>
  )
}

/** What the order comes to: items, discount, delivery, total. */
function Totals({ currency, loading, price }: { currency: Currency; loading: boolean; price: Price }) {
  const t = useT()
  const summary = t.shop.summary
  const money = (cents: number) => formatMoney(cents / 100, currency)
  return (
    <Card className="p-4 sm:p-6">
      {!loading && (
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">{summary.items}</dt>
            <dd className="text-slate-900 tabular-nums">{money(price.subtotal)}</dd>
          </div>
          {price.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-600">{summary.discount}</dt>
              <dd className="font-medium text-emerald-700 tabular-nums">−{money(price.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate-600">{summary.delivery}</dt>
            <dd className="text-slate-900 tabular-nums">
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
      <div className={`flex items-baseline justify-between ${loading ? '' : 'mt-2 border-t border-slate-200 pt-3'}`}>
        <span className="font-semibold text-slate-900">{summary.total}</span>
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <span className="text-lg font-bold text-slate-900 tabular-nums">{money(price.total)}</span>
        )}
      </div>
    </Card>
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
