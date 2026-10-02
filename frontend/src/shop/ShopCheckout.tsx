import { useState, type FormEvent } from 'react'
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
import type { Currency, PaymentMethod } from '../lib/types.ts'
import { useCart, useCheckedCart, type CheckedLine } from './cart.ts'
import { loadCustomerDetails, rememberOrder, saveCustomerDetails } from './device.ts'
import { usePlaceOrder, useShop } from './queries.ts'

// The server's codes for a cart that no longer matches the shop: the page
// re-checks the cart so the changed lines show what's wrong.
const CART_CHANGED = new Set(['PRODUCT_OUT_OF_STOCK', 'PRODUCT_UNAVAILABLE', 'ORDER_TOTAL_CHANGED'])
const FIELDS = ['name', 'phone', 'delivery_address', 'notes', 'payment_method']

type Form = { name: string; phone: string; address: string; notes: string; payment: PaymentMethod | null }

// Payment details (QR code, bank account) come on the order page, once
// the order and its total exist.
const PAYMENT_HINTS: Record<PaymentMethod, string> = {
  khqr: "Scan a QR code with your bank app. You'll get it after placing the order.",
  bank_transfer: "Transfer to the seller's account. You'll see it after placing the order.",
  cod: 'Pay in cash when you get your order.',
}

/** /shop/:storeSlug/checkout: guest checkout (customer, delivery, payment,
 * review). Pickup is added in Phase 5. */
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
    return { name: saved?.name ?? '', phone: saved?.phone ?? '', address: saved?.address ?? '', notes: '', payment: null }
  })
  const set = (key: Exclude<keyof Form, 'payment'>, value: string) => setForm((f) => ({ ...f, [key]: value }))

  // After a successful order the cart is emptied while leaving this page.
  if (cart.lines.length === 0 && !place.isSuccess) return <Navigate to={`/shop/${storeSlug}/cart`} replace />
  if (!shop.data) return <CheckoutSkeleton />
  const currency = shop.data.currency
  const methods = PAYMENT_METHOD_ORDER.filter((m) => shop.data.payment_methods.includes(m))
  // No choice to make when there's one way to pay; otherwise the customer
  // picks, rather than paying in a way they didn't notice was chosen.
  const payment = methods.length === 1 ? methods[0] : form.payment && methods.includes(form.payment) ? form.payment : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!checked.ready || place.isPending || !payment) return
    const details = { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() }
    let order
    try {
      order = await place.mutateAsync({
        name: details.name,
        phone: details.phone,
        delivery_address: details.address,
        notes: form.notes.trim() || null,
        items: checked.lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })),
        expected_total: fromCents(checked.totalCents),
        payment_method: payment,
      })
    } catch (error) {
      if (error instanceof ApiError && CART_CHANGED.has(error.code)) checked.refetch()
      // The seller turned this method off: show what's left.
      if (error instanceof ApiError && error.code === 'PAYMENT_METHOD_UNAVAILABLE') shop.refetch()
      return // shown via place.error
    }
    saveCustomerDetails(details)
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

      <Section title="Delivery">
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
        <Field
          label="Note for the seller"
          hint="Optional. For example, the best time to deliver."
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
      </Section>

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
            totalCents={checked.totalCents}
            cartPath={`/shop/${storeSlug}/cart`}
          />
        )}
      </Section>

      <ErrorMessage error={formError(place.error, FIELDS)} />

      {/* Pinned to the bottom on phones so the button is always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:pb-0">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3 lg:px-0">
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-slate-500">Total</span>
            <span className="block truncate text-lg font-bold text-slate-900">
              {checked.loading ? '…' : formatMoney(checked.totalCents / 100, currency)}
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

function OrderReview({
  lines,
  currency,
  loading,
  totalCents,
  cartPath,
}: {
  lines: CheckedLine[]
  currency: Currency
  loading: boolean
  totalCents: number
  cartPath: string
}) {
  const problems = lines.some((line) => line.problem)
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
      <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
        <span className="font-semibold text-slate-900">Total</span>
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <span className="text-lg font-bold text-slate-900">{formatMoney(totalCents / 100, currency)}</span>
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
