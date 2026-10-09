import { Minus, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import {
  Button,
  ErrorMessage,
  ErrorState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Section,
  Skeleton,
  TextArea,
} from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { useDebounced } from '../../lib/useDebounced.ts'
import { fieldError, formError } from '../../lib/errors.ts'
import { formatMoney, fromCents, toCents } from '../../lib/money.ts'
import { PAYMENT_METHOD_ORDER } from '../../lib/payments.ts'
import { deliveryFeeCents, discountCents } from '../../lib/pricing.ts'
import type { PaymentMethod, Product, ShopStore, Store, Variant } from '../../lib/types.ts'
import { ProductImage } from '../../shop/components.tsx'
import { useAddOrder, useCustomer, useCustomers, useProducts, useStore } from '../queries.ts'
import { useUnsavedChanges } from '../useUnsavedChanges.ts'

/** One line of the order: a product, or one of its options. */
type Line = { product: Product; variant: Variant | null; quantity: number }

// Delivery choices besides the shop's couriers (whose names can't clash
// with these: they're typed by people). As in the shop's checkout.
const OWN = '\u0000own'
const PICKUP = '\u0000pickup'

const FIELDS = ['name', 'phone', 'items', 'delivery_method', 'courier', 'delivery_address', 'delivery_address_note', 'notes', 'payment_method']

/** /dashboard/orders/new: an order that came by chat (Messenger, Telegram,
 * a call), added by the seller (founder's picks 3A and 4A, 2026-10-09).
 * The shop's own prices, discounts and delivery fee, as at checkout; the
 * server takes the stock and starts it accepted. */
export function NewOrder() {
  const store = useStore()
  const products = useProducts()
  const t = useT()
  if (store.error || products.error) {
    return (
      <>
        <PageHeader title={t.orders.newOrder.title} back="/dashboard/orders" />
        <ErrorState
          error={store.error ?? products.error}
          onRetry={() => {
            store.refetch()
            products.refetch()
          }}
        />
      </>
    )
  }
  if (!store.data || !products.data) {
    return (
      <>
        <PageHeader title={t.orders.newOrder.title} back="/dashboard/orders" />
        <div aria-hidden className="space-y-4">
          {[140, 220, 160].map((h) => (
            <Skeleton key={h} className="w-full rounded-2xl" style={{ height: h }} />
          ))}
        </div>
      </>
    )
  }
  return <NewOrderForm store={store.data} products={products.data.filter((p) => p.status === 'active')} />
}

/** The shop's delivery settings in the shape the shop's pricing uses. */
function shopDelivery(store: Store): ShopStore['delivery'] {
  const d = store.delivery_settings
  return {
    fee: d.fee,
    free_from_amount: d.free_from_amount,
    free_from_items: d.free_from_items,
    own_delivery: d.own_delivery.enabled,
    couriers: d.couriers,
    pickup: d.pickup.enabled ? { address: d.pickup.address } : null,
  }
}

function priceOf(line: { product: Product; variant: Variant | null }): string {
  return line.variant?.price_override ?? line.product.price
}

function stockOf(line: { product: Product; variant: Variant | null }): number {
  return line.variant ? line.variant.stock_quantity : (line.product.stock_quantity ?? 0)
}

/** Digits only, the way the server stores phones ("012345678"). */
function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('855') ? `0${digits.slice(3)}` : digits
}

function NewOrderForm({ store, products }: { store: Store; products: Product[] }) {
  const t = useT()
  const n = t.orders.newOrder
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const add = useAddOrder()
  const currency = store.currency
  const delivery = shopDelivery(store)

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [addressNote, setAddressNote] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const choices = [...(delivery.own_delivery ? [OWN] : []), ...delivery.couriers, ...(delivery.pickup ? [PICKUP] : [])]
  const [how, setHow] = useState<string | null>(choices.length === 1 ? choices[0] : null)
  const methods = PAYMENT_METHOD_ORDER.filter((m) => store.payment_settings[m].enabled)
  const [payment, setPayment] = useState<PaymentMethod | null>(methods.length === 1 ? methods[0] : null)
  const dirty = phone !== '' || name !== '' || lines.length > 0 || address !== '' || notes !== ''
  const { allowLeave } = useUnsavedChanges(dirty && !add.isSuccess)

  // Someone who ordered before: found by phone, their name and latest
  // address filled in if not typed yet.
  const digits = useDebounced(phoneDigits(phone), 400)
  const found = useCustomers(digits.length >= 8 ? digits : '')
  const match =
    digits.length >= 8
      ? found.data?.pages.flatMap((page) => page.customers).find((c) => c.phone === digits)
      : undefined
  const known = useCustomer(match?.id ?? '', { enabled: match !== undefined })
  const [filledFor, setFilledFor] = useState<string | null>(null)
  if (known.data && filledFor !== known.data.id) {
    setFilledFor(known.data.id)
    if (!name) setName(known.data.name)
    if (!address && known.data.address) setAddress(known.data.address)
  }

  const pickup = how === PICKUP
  const subtotal = lines.reduce((sum, line) => sum + toCents(priceOf(line)) * line.quantity, 0)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  const discount = discountCents(subtotal, store.discount_settings.rules)
  const fee = how === null ? 0 : deliveryFeeCents(pickup ? 'pickup' : 'seller_delivery', subtotal, itemCount, delivery)
  const total = subtotal - discount + fee

  function addLine(product: Product, variant: Variant | null) {
    setLines((current) => {
      const i = current.findIndex((l) => l.product.id === product.id && l.variant?.id === variant?.id)
      if (i === -1) return [...current, { product, variant, quantity: 1 }]
      return current.map((l, j) => (j === i ? { ...l, quantity: Math.min(l.quantity + 1, stockOf(l)) } : l))
    })
  }

  function setQuantity(index: number, quantity: number) {
    setLines((current) =>
      quantity <= 0 ? current.filter((_, j) => j !== index) : current.map((l, j) => (j === index ? { ...l, quantity } : l)),
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const order = await add.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim() || null,
        items: lines.map((l) => ({ product_id: l.product.id, variant_id: l.variant?.id ?? null, quantity: l.quantity })),
        payment_method: payment,
        delivery_method: pickup ? 'pickup' : 'seller_delivery',
        courier: how && how !== OWN && how !== PICKUP ? how : null,
        delivery_address: pickup ? null : address.trim() || null,
        delivery_address_note: pickup ? null : addressNote.trim() || null,
        expected_total: fromCents(total),
      })
      allowLeave()
      toast(n.saved(order.number))
      navigate(`/dashboard/orders/${order.id}`, { replace: true })
    } catch {
      // Shown by the fields and under the form.
    }
  }

  const missingItems = lines.length === 0
  return (
    <>
      <PageHeader title={n.title} back="/dashboard/orders" />
      <title>{n.title}</title>
      <p className="mb-4 text-sm text-slate-600">{n.intro}</p>
      <form onSubmit={submit} className="space-y-4">
        <Section title={n.customer}>
          <Field label={n.phone} error={fieldError(add.error, 'phone')} hint={match ? n.known(match.order_count) : undefined}>
            <Input
              required
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="012 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leading={match ? <UserRound aria-hidden className="size-4 text-emerald-600" /> : undefined}
            />
          </Field>
          <Field label={n.name} error={fieldError(add.error, 'name')}>
            <Input required maxLength={100} autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </Section>

        <Section title={n.items}>
          {lines.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {lines.map((line, i) => (
                <li key={`${line.product.id}-${line.variant?.id ?? ''}`} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-slate-900">
                      {line.product.name}
                      {line.variant && <span className="text-slate-500"> · {line.variant.name}</span>}
                    </span>
                    <span className="text-sm text-slate-500">
                      {formatMoney(priceOf(line), currency)} · {n.left(stockOf(line))}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <IconButton
                      icon={line.quantity === 1 ? Trash2 : Minus}
                      label={line.quantity === 1 ? n.remove(line.product.name) : n.fewer}
                      onClick={() => setQuantity(i, line.quantity - 1)}
                    />
                    <span className="w-6 text-center font-medium tabular-nums">{line.quantity}</span>
                    <IconButton
                      icon={Plus}
                      label={n.more}
                      disabled={line.quantity >= stockOf(line)}
                      onClick={() => setQuantity(i, line.quantity + 1)}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <ProductPicker products={products} currency={currency} onPick={addLine} />
          {fieldError(add.error, 'items') && <p className="text-sm text-red-700">{fieldError(add.error, 'items')}</p>}
        </Section>

        <Section title={n.delivery}>
          {choices.length > 1 && (
            <div role="radiogroup" aria-label={n.delivery} className="grid gap-2">
              {choices.map((choice) => (
                <ChoiceRow key={choice} checked={how === choice} onChoose={() => setHow(choice)}>
                  {choice === OWN ? t.orders.ownDelivery : choice === PICKUP ? t.checkout.pickup : choice}
                </ChoiceRow>
              ))}
            </div>
          )}
          {choices.length === 1 && (
            <p className="text-slate-900">
              {how === OWN ? t.orders.ownDelivery : how === PICKUP ? t.checkout.pickup : how}
            </p>
          )}
          {!pickup && (
            <>
              <Field label={n.address} hint={n.addressHint} error={fieldError(add.error, 'delivery_address')}>
                <TextArea required rows={2} maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
              <Field label={n.addressNote} error={fieldError(add.error, 'delivery_address_note')}>
                <Input maxLength={300} value={addressNote} onChange={(e) => setAddressNote(e.target.value)} />
              </Field>
            </>
          )}
        </Section>

        <Section title={n.payment}>
          {methods.length > 1 ? (
            <div role="radiogroup" aria-label={n.payment} className="grid gap-2">
              {methods.map((method) => (
                <ChoiceRow key={method} checked={payment === method} onChoose={() => setPayment(method)}>
                  {t.status.paymentMethod[method]}
                </ChoiceRow>
              ))}
            </div>
          ) : (
            <p className="text-slate-900">{payment && t.status.paymentMethod[payment]}</p>
          )}
          <Field label={n.note} hint={n.noteHint} error={fieldError(add.error, 'notes')}>
            <TextArea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Section>

        {lines.length > 0 && (
          <dl className="space-y-1 rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ring-slate-900/6 sm:px-6">
            <div className="flex justify-between">
              <dt className="text-slate-600">{t.shop.summary.items}</dt>
              <dd>{formatMoney(fromCents(subtotal), currency)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">{t.shop.summary.discount}</dt>
                <dd>−{formatMoney(fromCents(discount), currency)}</dd>
              </div>
            )}
            {how !== null && (
              <div className="flex justify-between">
                <dt className="text-slate-600">{pickup ? t.checkout.pickup : t.shop.summary.delivery}</dt>
                <dd>{fee > 0 ? formatMoney(fromCents(fee), currency) : t.shop.summary.free}</dd>
              </div>
            )}
          </dl>
        )}

        <ErrorMessage error={formError(add.error, FIELDS)} />

        {/* Pinned like the product form's Save. */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:sticky lg:bottom-4 lg:mt-4 lg:rounded-2xl lg:border-0 lg:bg-surface/95 lg:pb-0 lg:shadow-card lg:ring-1 lg:ring-slate-900/6">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 text-sm text-slate-500" aria-live="polite">
              {missingItems ? (
                n.noItems
              ) : (
                <>
                  {t.shop.summary.total}{' '}
                  <span className="text-lg font-bold text-slate-900 tabular-nums">{formatMoney(fromCents(total), currency)}</span>
                </>
              )}
            </span>
            <Button type="submit" loading={add.isPending} disabled={missingItems || how === null || payment === null} className="min-w-32">
              {n.save}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}

/** One choice of a radio list, as a full-width row. */
function ChoiceRow({ checked, onChoose, children }: { checked: boolean; onChoose: () => void; children: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onChoose}
      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3.5 text-left font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 ${
        checked ? 'border-brand bg-navy-50 text-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-brand' : 'border-slate-300'}`}
      >
        {checked && <span className="size-2.5 rounded-full bg-brand" />}
      </span>
      {children}
    </button>
  )
}

/** Find a product by name and tap it to add one; a product with options
 * opens its options first. Sold-out ones can't be added. */
function ProductPicker({
  products,
  currency,
  onPick,
}: {
  products: Product[]
  currency: Store['currency']
  onPick: (product: Product, variant: Variant | null) => void
}) {
  const n = useT().orders.newOrder
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    const matching = q ? products.filter((p) => p.name.toLocaleLowerCase().includes(q)) : products
    return matching.slice(0, q ? 20 : 8)
  }, [products, query])

  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder={n.findProduct}
        aria-label={n.findProduct}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leading={<Search aria-hidden className="size-4 text-slate-400" />}
      />
      {shown.length === 0 ? (
        <p className="px-1 text-sm text-slate-500">{n.noProducts}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {shown.map((product) => {
            const left = product.has_variants
              ? product.variants.reduce((sum, v) => sum + v.stock_quantity, 0)
              : (product.stock_quantity ?? 0)
            const expanded = open === product.id
            return (
              <li key={product.id}>
                <button
                  type="button"
                  disabled={left <= 0}
                  aria-expanded={product.has_variants ? expanded : undefined}
                  onClick={() => (product.has_variants ? setOpen(expanded ? null : product.id) : onPick(product, null))}
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-600 disabled:opacity-50"
                >
                  {product.image_urls[0] ? (
                    <ProductImage small src={product.image_urls[0]} alt="" className="size-10 shrink-0 rounded-lg" />
                  ) : (
                    <span className="size-10 shrink-0 rounded-lg bg-navy-100" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-medium text-slate-900">{product.name}</span>
                    <span className="text-sm text-slate-500">
                      {formatMoney(product.price, currency)} · {left > 0 ? n.left(left) : n.soldOut}
                    </span>
                  </span>
                  <Plus aria-hidden className="size-5 shrink-0 text-slate-400" />
                </button>
                {expanded && (
                  <div className="px-3 pb-3">
                    <p className="mb-1.5 text-xs text-slate-500">{n.pickOption}</p>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          disabled={variant.stock_quantity <= 0}
                          onClick={() => onPick(product, variant)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-300 px-3.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600 disabled:line-through disabled:opacity-50 sm:min-h-9"
                        >
                          {variant.name}
                          <span className="text-slate-500">
                            {formatMoney(variant.price_override ?? product.price, currency)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
