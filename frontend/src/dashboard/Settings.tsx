import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, LogOut, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass } from '../components/styles.ts'
import {
  Button,
  ErrorMessage,
  ErrorState,
  Field,
  IconButton,
  Input,
  MoneyInput,
  PageHeader,
  Section,
  Select,
  Skeleton,
  Switch,
  TextArea,
} from '../components/ui.tsx'
import { api } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import type { Currency, DeliverySettings, OrderConfirmationMode, PaymentSettings, Store } from '../lib/types.ts'
import { keys, useStore } from './queries.ts'
import { useUnsavedChanges } from './useUnsavedChanges.ts'

export function Settings() {
  const store = useStore()
  return (
    <>
      <PageHeader title="Settings" />
      {store.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : store.error ? (
        <ErrorState error={store.error} onRetry={() => store.refetch()} />
      ) : (
        <StoreForm store={store.data} />
      )}
      <AccountSection />
    </>
  )
}

// Rows the seller can add and remove carry a key for React; inputs hold
// strings, turned back into the API's shape by toBody.
type CourierRow = { key: string; name: string }
type RuleRow = { key: string; min_subtotal: string; amount_off: string }
type DeliveryForm = {
  fee: string
  free_from_amount: string
  free_from_items: string
  own: boolean
  couriers: CourierRow[]
  pickup: DeliverySettings['pickup']
}

type Form = {
  name: string
  slug: string
  description: string
  currency: Currency
  order_confirmation_mode: OrderConfirmationMode
  payment_settings: PaymentSettings
  delivery: DeliveryForm
  discounts: RuleRow[]
}

/** "1.50" -> "1.5", "6000.00" -> "6000": what a person would type. */
const amount = (value: string | null) => (value === null ? '' : String(Number(value)))

const toForm = (store: Store): Form => {
  const delivery = store.delivery_settings
  return {
    name: store.name,
    slug: store.slug,
    description: store.description ?? '',
    currency: store.currency,
    order_confirmation_mode: store.order_confirmation_mode,
    payment_settings: store.payment_settings,
    delivery: {
      fee: Number(delivery.fee) === 0 ? '' : amount(delivery.fee),
      free_from_amount: amount(delivery.free_from_amount),
      free_from_items: delivery.free_from_items === null ? '' : String(delivery.free_from_items),
      own: delivery.own_delivery.enabled,
      couriers: delivery.couriers.map((name, i) => ({ key: `courier-${i}`, name })),
      pickup: delivery.pickup,
    },
    discounts: store.discount_settings.rules.map((r, i) => ({
      key: `rule-${i}`,
      min_subtotal: amount(r.min_subtotal),
      amount_off: amount(r.amount_off),
    })),
  }
}

const toBody = (form: Form) => ({
  name: form.name.trim(),
  slug: form.slug,
  description: form.description.trim() || null,
  currency: form.currency,
  order_confirmation_mode: form.order_confirmation_mode,
  payment_settings: form.payment_settings,
  delivery_settings: {
    fee: form.delivery.fee || '0',
    free_from_amount: form.delivery.free_from_amount || null,
    free_from_items: form.delivery.free_from_items ? Number(form.delivery.free_from_items) : null,
    own_delivery: { enabled: form.delivery.own },
    couriers: form.delivery.couriers.map(({ name }) => name.trim()),
    pickup: { ...form.delivery.pickup, address: form.delivery.pickup.address.trim() },
  },
  discount_settings: {
    rules: form.discounts.map(({ min_subtotal, amount_off }) => ({ min_subtotal, amount_off })),
  },
})

// Fields the server may name in an error; their message shows by the input.
const PAYMENT_FIELDS = [
  'payment_settings',
  'payment_settings.bank_transfer.bank_name',
  'payment_settings.bank_transfer.account_name',
  'payment_settings.bank_transfer.account_number',
  'payment_settings.khqr.bakong_account_id',
  'payment_settings.khqr.merchant_name',
]

function StoreForm({ store }: { store: Store }) {
  const queryClient = useQueryClient()
  const { toast, confirm } = useFeedback()
  const [form, setForm] = useState(() => toForm(store))
  const dirty = JSON.stringify(toBody(form)) !== JSON.stringify(toBody(toForm(store)))
  useUnsavedChanges(dirty)

  const save = useMutation({
    mutationFn: () => api<Store>('/seller/store', { method: 'PATCH', body: toBody(form) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.store, updated)
      setForm(toForm(updated))
      toast('Settings saved')
    },
  })

  const set = (key: Exclude<keyof Form, 'payment_settings' | 'delivery' | 'discounts'>, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))
  const setPayment = <M extends keyof PaymentSettings>(method: M, changes: Partial<PaymentSettings[M]>) =>
    setForm((f) => ({
      ...f,
      payment_settings: { ...f.payment_settings, [method]: { ...f.payment_settings[method], ...changes } },
    }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (form.slug !== store.slug) {
      const ok = await confirm({
        title: 'Change your shop link?',
        message: 'Links you already shared on social media will stop working.',
        confirmLabel: 'Change link',
      })
      if (!ok) return
    }
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-4">
      <Section title="Store">
        <Field label="Store name" error={fieldError(save.error, 'name')}>
          <Input
            required
            maxLength={100}
            autoCapitalize="words"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field
          label="Description"
          error={fieldError(save.error, 'description')}
          hint="Optional. A line about what you sell, shown on your shop page."
        >
          <TextArea
            maxLength={2000}
            autoCapitalize="sentences"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field label="Currency" hint="Prices are shown in this currency. Existing prices are not converted.">
          <Select value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
            <option value="USD">US dollar ($)</option>
            <option value="KHR">Cambodian riel (៛)</option>
          </Select>
        </Field>
      </Section>

      <Section title="Orders">
        <Switch
          checked={form.order_confirmation_mode === 'automatic'}
          onChange={(on) => set('order_confirmation_mode', on ? 'automatic' : 'manual')}
          label="Accept new orders automatically"
          description={
            form.order_confirmation_mode === 'automatic'
              ? 'New orders are accepted right away. You can still cancel one later.'
              : 'New orders wait for you to accept or reject them.'
          }
        />
      </Section>

      <PaymentsSection settings={form.payment_settings} onChange={setPayment} error={save.error} />

      <DeliverySection
        delivery={form.delivery}
        currency={form.currency}
        onChange={(changes) => setForm((f) => ({ ...f, delivery: { ...f.delivery, ...changes } }))}
        error={save.error}
      />

      <DiscountsSection
        rules={form.discounts}
        currency={form.currency}
        onChange={(discounts) => setForm((f) => ({ ...f, discounts }))}
        error={save.error}
      />

      <Section title="Shop link" description="The address you share with customers.">
        <Field label="Link name" error={fieldError(save.error, 'slug')}>
          <Input
            required
            minLength={2}
            maxLength={50}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and single hyphens"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={form.slug}
            onChange={(e) => set('slug', e.target.value.toLowerCase())}
          />
        </Field>
        <p className="break-all rounded-xl bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-700">
          {window.location.host}/shop/<span className="font-semibold text-slate-900">{form.slug || '…'}</span>
        </p>
        {/* The saved link: an unsaved new slug doesn't work yet. */}
        <Link
          to={`/shop/${store.slug}`}
          target="_blank"
          className={`${buttonClass('secondary')} w-full sm:w-auto`}
        >
          <ExternalLink aria-hidden className="size-4" />
          Open shop
        </Link>
      </Section>

      <ErrorMessage
        error={formError(save.error, [
          'name',
          'slug',
          'description',
          ...PAYMENT_FIELDS,
          ...deliveryFields(form.delivery.couriers.length),
          ...discountFields(form.discounts.length),
        ])}
      />
      <Button type="submit" size="lg" loading={save.isPending} disabled={!dirty} className="w-full sm:w-auto">
        Save settings
      </Button>
    </form>
  )
}

function PaymentsSection({
  settings,
  onChange,
  error,
}: {
  settings: PaymentSettings
  onChange: <M extends keyof PaymentSettings>(method: M, changes: Partial<PaymentSettings[M]>) => void
  error: unknown
}) {
  const { cod, bank_transfer: bank, khqr } = settings
  const noneOn = !cod.enabled && !bank.enabled && !khqr.enabled
  const fieldErr = (field: string) => fieldError(error, `payment_settings.${field}`)
  return (
    <Section
      title="Payments"
      description="How customers can pay. You confirm each payment yourself on the order, after checking your bank app."
    >
      <Switch
        checked={khqr.enabled}
        onChange={(enabled) => onChange('khqr', { enabled })}
        label="KHQR"
        description="Customers get a QR code for their exact total, to scan with any Cambodian bank app."
      />
      {khqr.enabled && (
        <div className="space-y-4 border-l-2 border-slate-100 pl-4">
          <Field
            label="Bakong ID"
            error={fieldErr('khqr.bakong_account_id')}
            hint="In your bank app, with your Bakong or KHQR details. It looks like name@aclb."
          >
            <Input
              required
              maxLength={32}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="name@bank"
              value={khqr.bakong_account_id}
              onChange={(e) => onChange('khqr', { bakong_account_id: e.target.value })}
            />
          </Field>
          <Field
            label="Name customers see"
            error={fieldErr('khqr.merchant_name')}
            hint="Shown in the customer's bank app when they scan. Use the name on your account, in English letters."
          >
            <Input
              required
              maxLength={25}
              pattern="[ -~]*"
              title="English letters, numbers, and spaces"
              autoCapitalize="characters"
              value={khqr.merchant_name}
              onChange={(e) => onChange('khqr', { merchant_name: e.target.value })}
            />
          </Field>
        </div>
      )}

      <Switch
        checked={bank.enabled}
        onChange={(enabled) => onChange('bank_transfer', { enabled })}
        label="Bank transfer"
        description="Customers see this account after they order, and transfer the total."
      />
      {bank.enabled && (
        <div className="space-y-4 border-l-2 border-slate-100 pl-4">
          <Field label="Bank" error={fieldErr('bank_transfer.bank_name')}>
            <Input
              required
              maxLength={50}
              placeholder="ABA"
              value={bank.bank_name}
              onChange={(e) => onChange('bank_transfer', { bank_name: e.target.value })}
            />
          </Field>
          <Field label="Name on the account" error={fieldErr('bank_transfer.account_name')}>
            <Input
              required
              maxLength={100}
              autoCapitalize="characters"
              value={bank.account_name}
              onChange={(e) => onChange('bank_transfer', { account_name: e.target.value })}
            />
          </Field>
          <Field label="Account number" error={fieldErr('bank_transfer.account_number')}>
            <Input
              required
              maxLength={50}
              autoComplete="off"
              value={bank.account_number}
              onChange={(e) => onChange('bank_transfer', { account_number: e.target.value })}
            />
          </Field>
        </div>
      )}

      <Switch
        checked={cod.enabled}
        onChange={(enabled) => onChange('cod', { enabled })}
        label="Cash on delivery"
        description="Customers pay in cash when they get their order."
      />

      {(noneOn || fieldError(error, 'payment_settings')) && (
        <p role="alert" className="text-sm text-red-600">
          {fieldError(error, 'payment_settings') ?? 'Turn on at least one way to pay.'}
        </p>
      )}
    </Section>
  )
}

/** The fields the server may name for the delivery settings. */
function deliveryFields(courierCount: number): string[] {
  return [
    'delivery_settings',
    'delivery_settings.fee',
    'delivery_settings.free_from_amount',
    'delivery_settings.free_from_items',
    'delivery_settings.pickup.address',
    ...Array.from({ length: courierCount }, (_, i) => `delivery_settings.couriers.${i}`),
  ]
}

function discountFields(ruleCount: number): string[] {
  return Array.from({ length: ruleCount }, (_, i) => [
    `discount_settings.rules.${i}.min_subtotal`,
    `discount_settings.rules.${i}.amount_off`,
  ]).flat()
}

const MAX_COURIERS = 10
const MAX_DISCOUNTS = 5
// The couriers most Cambodian sellers use, one tap to add.
const COMMON_COURIERS = ['J&T Express', 'VET Express']

function DeliverySection({
  delivery,
  currency,
  onChange,
  error,
}: {
  delivery: DeliveryForm
  currency: Currency
  onChange: (changes: Partial<DeliveryForm>) => void
  error: unknown
}) {
  const fieldErr = (field: string) => fieldError(error, `delivery_settings.${field}`)
  const { couriers, pickup } = delivery
  const addCourier = (name: string) => onChange({ couriers: [...couriers, { key: crypto.randomUUID(), name }] })
  const setCourier = (key: string, name: string) =>
    onChange({ couriers: couriers.map((c) => (c.key === key ? { ...c, name } : c)) })
  const missingCommon = COMMON_COURIERS.filter(
    (name) => !couriers.some((c) => c.name.trim().toLowerCase() === name.toLowerCase()),
  )
  const delivers = delivery.own || couriers.length > 0
  const noneOn = !delivers && !pickup.enabled
  return (
    <Section title="Delivery" description="How customers get their orders. You update each delivery on the order.">
      <Field
        label="Delivery fee"
        error={fieldErr('fee')}
        hint="One price wherever the customer lives, for your own delivery or a courier. Leave empty for free delivery."
      >
        <MoneyInput
          currency={currency}
          placeholder="Free"
          value={delivery.fee}
          onChange={(fee) => onChange({ fee })}
        />
      </Field>
      <Field
        label="Free delivery from"
        error={fieldErr('free_from_amount')}
        hint="Optional. Free when the items come to this much or more."
      >
        <MoneyInput
          currency={currency}
          placeholder="Off"
          value={delivery.free_from_amount}
          onChange={(free_from_amount) => onChange({ free_from_amount })}
        />
      </Field>
      <Field
        label="Free delivery from (items)"
        error={fieldErr('free_from_items')}
        hint="Optional. Free when the customer buys this many items or more, e.g. 3."
      >
        <Input
          type="number"
          inputMode="numeric"
          min="1"
          max="999"
          step="1"
          placeholder="Off"
          value={delivery.free_from_items}
          onWheel={(e) => e.currentTarget.blur()}
          onChange={(e) => onChange({ free_from_items: e.target.value })}
        />
      </Field>

      <Switch
        checked={delivery.own}
        onChange={(own) => onChange({ own })}
        label="Own delivery"
        description="You, or someone you send, bring the order to the customer."
      />

      <div>
        <h3 className="text-sm font-medium text-slate-900">Couriers</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          Delivery companies you send with. The customer chooses one at checkout, and you see their location to pick
          the branch.
        </p>
      </div>
      {couriers.map((courier, index) => (
        <div key={courier.key} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Field label="Courier" error={fieldErr(`couriers.${index}`)}>
              <Input
                required
                maxLength={50}
                autoCapitalize="words"
                value={courier.name}
                onChange={(e) => setCourier(courier.key, e.target.value)}
              />
            </Field>
          </div>
          <IconButton
            icon={Trash2}
            tone="danger"
            label={`Remove ${courier.name || 'courier'}`}
            className="mt-7"
            onClick={() => onChange({ couriers: couriers.filter((c) => c.key !== courier.key) })}
          />
        </div>
      ))}
      {couriers.length < MAX_COURIERS && (
        <div className="flex flex-wrap gap-2">
          {missingCommon.map((name) => (
            <Button key={name} variant="secondary" icon={Plus} onClick={() => addCourier(name)}>
              {name}
            </Button>
          ))}
          <Button variant="secondary" icon={Plus} onClick={() => addCourier('')}>
            Other courier
          </Button>
        </div>
      )}

      <Switch
        checked={pickup.enabled}
        onChange={(enabled) => onChange({ pickup: { ...pickup, enabled } })}
        label="Pickup"
        description="Customers collect their order from you, for free."
      />
      {pickup.enabled && (
        <div className="border-l-2 border-slate-100 pl-4">
          <Field
            label="Pickup address"
            error={fieldErr('pickup.address')}
            hint="Shown at checkout and on the order page."
          >
            <TextArea
              required
              maxLength={500}
              autoCapitalize="sentences"
              placeholder="Shop 12, Orussey Market, Phnom Penh"
              value={pickup.address}
              onChange={(e) => onChange({ pickup: { ...pickup, address: e.target.value } })}
            />
          </Field>
        </div>
      )}

      {(noneOn || fieldError(error, 'delivery_settings')) && (
        <p role="alert" className="text-sm text-red-600">
          {fieldError(error, 'delivery_settings') ?? 'Turn on your own delivery, add a courier, or turn on pickup.'}
        </p>
      )}
    </Section>
  )
}

function DiscountsSection({
  rules,
  currency,
  onChange,
  error,
}: {
  rules: RuleRow[]
  currency: Currency
  onChange: (rules: RuleRow[]) => void
  error: unknown
}) {
  const setRule = (key: string, changes: Partial<RuleRow>) =>
    onChange(rules.map((r) => (r.key === key ? { ...r, ...changes } : r)))
  return (
    <Section
      title="Discounts"
      description="Money off when the items in an order come to an amount. If an order reaches more than one, the biggest applies."
    >
      {rules.length === 0 && <p className="text-sm text-slate-500">No discounts.</p>}
      {rules.map((rule, index) => (
        <div key={rule.key} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Field label="When items reach" error={fieldError(error, `discount_settings.rules.${index}.min_subtotal`)}>
              <MoneyInput
                required
                currency={currency}
                value={rule.min_subtotal}
                onChange={(min_subtotal) => setRule(rule.key, { min_subtotal })}
              />
            </Field>
          </div>
          <div className="min-w-0 flex-1">
            <Field label="Take off" error={fieldError(error, `discount_settings.rules.${index}.amount_off`)}>
              <MoneyInput
                required
                currency={currency}
                value={rule.amount_off}
                onChange={(amount_off) => setRule(rule.key, { amount_off })}
              />
            </Field>
          </div>
          <IconButton
            icon={Trash2}
            tone="danger"
            label="Remove discount"
            className="mt-7"
            onClick={() => onChange(rules.filter((r) => r.key !== rule.key))}
          />
        </div>
      ))}
      {rules.length < MAX_DISCOUNTS && (
        <Button
          variant="secondary"
          icon={Plus}
          onClick={() => onChange([...rules, { key: crypto.randomUUID(), min_subtotal: '', amount_off: '' }])}
        >
          Add discount
        </Button>
      )}
    </Section>
  )
}

function AccountSection() {
  const { logout } = useAuth()
  return (
    <Section title="Account">
      <Button variant="secondary" icon={LogOut} onClick={logout} className="w-full sm:w-auto">
        Log out
      </Button>
    </Section>
  )
}
