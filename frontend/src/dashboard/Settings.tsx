import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, ExternalLink, LogOut, Plus, Send, Share2, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.ts'
import { useFeedback } from '../components/feedback.ts'
import { buttonClass } from '../components/styles.ts'
import {
  Badge,
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
import { LanguageSwitch } from '../i18n/LanguageSwitch.tsx'
import { useT } from '../i18n/useT.ts'
import { ThemeSwitch } from '../theme/ThemeSwitch.tsx'
import { api } from '../lib/api.ts'
import { fieldError, formError } from '../lib/errors.ts'
import type {
  Currency,
  DeliverySettings,
  OrderConfirmationMode,
  PaymentSettings,
  Store,
  TelegramLink,
} from '../lib/types.ts'
import { keys, useStore } from './queries.ts'
import { useUnsavedChanges } from './useUnsavedChanges.ts'

export function Settings() {
  const store = useStore()
  const t = useT()
  return (
    <>
      <PageHeader title={t.settings.title} />
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
      <div className="space-y-4">
        <DisplaySection />
        <AccountSection />
      </div>
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
  telegram_username: string
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
    telegram_username: store.telegram_username ?? '',
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
  telegram_username: form.telegram_username.trim() || null,
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
  const t = useT()
  const s = t.settings
  const dirty = JSON.stringify(toBody(form)) !== JSON.stringify(toBody(toForm(store)))
  useUnsavedChanges(dirty)

  const save = useMutation({
    mutationFn: () => api<Store>('/seller/store', { method: 'PATCH', body: toBody(form) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.store, updated)
      setForm(toForm(updated))
      toast(s.saved)
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
        title: s.changeLinkTitle,
        message: s.changeLinkMessage,
        confirmLabel: s.changeLink,
      })
      if (!ok) return
    }
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-4">
      <Section title={s.store}>
        <Field label={s.storeName} error={fieldError(save.error, 'name')}>
          <Input
            required
            maxLength={100}
            autoCapitalize="words"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field
          label={s.description}
          error={fieldError(save.error, 'description')}
          hint={s.descriptionHint}
        >
          <TextArea
            maxLength={2000}
            autoCapitalize="sentences"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field label={s.currency} hint={s.currencyHint}>
          <Select value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
            <option value="USD">{s.usd}</option>
            <option value="KHR">{s.khr}</option>
          </Select>
        </Field>
      </Section>

      <Section title={s.orders}>
        <Switch
          checked={form.order_confirmation_mode === 'automatic'}
          onChange={(on) => set('order_confirmation_mode', on ? 'automatic' : 'manual')}
          label={s.autoAccept}
          description={form.order_confirmation_mode === 'automatic' ? s.autoAcceptOn : s.autoAcceptOff}
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

      <TelegramSection
        store={store}
        username={form.telegram_username}
        onUsernameChange={(telegram_username) => setForm((f) => ({ ...f, telegram_username }))}
        error={save.error}
      />

      <Section title={s.shopLink} description={s.shopLinkHint}>
        <Field label={s.linkName} error={fieldError(save.error, 'slug')}>
          <Input
            required
            minLength={2}
            maxLength={50}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title={s.linkNameTitle}
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
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* The saved link: an unsaved new slug doesn't work yet. */}
          <Link
            to={`/shop/${store.slug}`}
            target="_blank"
            className={`${buttonClass('secondary')} w-full sm:w-auto`}
          >
            <ExternalLink aria-hidden className="size-4" />
            {s.openShop}
          </Link>
          <Link to="/dashboard/links/new" className={`${buttonClass('secondary')} w-full sm:w-auto`}>
            <Share2 aria-hidden className="size-4" />
            {s.shareTracked}
          </Link>
        </div>
      </Section>

      <ErrorMessage
        error={formError(save.error, [
          'name',
          'slug',
          'description',
          'telegram_username',
          ...PAYMENT_FIELDS,
          ...deliveryFields(form.delivery.couriers.length),
          ...discountFields(form.discounts.length),
        ])}
      />
      <Button type="submit" size="lg" loading={save.isPending} disabled={!dirty} className="w-full sm:w-auto">
        {s.save}
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
  const t = useT()
  const s = t.settings
  const noneOn = !cod.enabled && !bank.enabled && !khqr.enabled
  const fieldErr = (field: string) => fieldError(error, `payment_settings.${field}`)
  return (
    <Section
      title={s.payments}
      description={s.paymentsHint}
    >
      <Switch
        checked={khqr.enabled}
        onChange={(enabled) => onChange('khqr', { enabled })}
        label={t.status.paymentMethod.khqr}
        description={s.khqrHint}
      />
      {khqr.enabled && (
        <div className="space-y-4 border-l-2 border-slate-100 pl-4">
          <Field
            label={s.bakongId}
            error={fieldErr('khqr.bakong_account_id')}
            hint={s.bakongIdHint}
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
            label={s.merchantName}
            error={fieldErr('khqr.merchant_name')}
            hint={s.merchantNameHint}
          >
            <Input
              required
              maxLength={25}
              pattern="[ -~]*"
              title={s.merchantNameTitle}
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
        label={t.status.paymentMethod.bank_transfer}
        description={s.bankHint}
      />
      {bank.enabled && (
        <div className="space-y-4 border-l-2 border-slate-100 pl-4">
          <Field label={s.bank} error={fieldErr('bank_transfer.bank_name')}>
            <Input
              required
              maxLength={50}
              placeholder="ABA"
              value={bank.bank_name}
              onChange={(e) => onChange('bank_transfer', { bank_name: e.target.value })}
            />
          </Field>
          <Field label={s.accountName} error={fieldErr('bank_transfer.account_name')}>
            <Input
              required
              maxLength={100}
              autoCapitalize="characters"
              value={bank.account_name}
              onChange={(e) => onChange('bank_transfer', { account_name: e.target.value })}
            />
          </Field>
          <Field label={s.accountNumber} error={fieldErr('bank_transfer.account_number')}>
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
        label={t.status.paymentMethod.cod}
        description={s.codHint}
      />

      {(noneOn || fieldError(error, 'payment_settings')) && (
        <p role="alert" className="text-sm text-red-600">
          {fieldError(error, 'payment_settings') ?? s.noPayment}
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
  const s = useT().settings
  return (
    <Section title={s.delivery} description={s.deliveryHint}>
      <Field
        label={s.fee}
        error={fieldErr('fee')}
        hint={s.feeHint}
      >
        <MoneyInput
          currency={currency}
          placeholder={s.free}
          value={delivery.fee}
          onChange={(fee) => onChange({ fee })}
        />
      </Field>
      <Field
        label={s.freeFrom}
        error={fieldErr('free_from_amount')}
        hint={s.freeFromHint}
      >
        <MoneyInput
          currency={currency}
          placeholder={s.off}
          value={delivery.free_from_amount}
          onChange={(free_from_amount) => onChange({ free_from_amount })}
        />
      </Field>
      <Field
        label={s.freeFromItems}
        error={fieldErr('free_from_items')}
        hint={s.freeFromItemsHint}
      >
        <Input
          type="number"
          inputMode="numeric"
          min="1"
          max="999"
          step="1"
          placeholder={s.off}
          value={delivery.free_from_items}
          onWheel={(e) => e.currentTarget.blur()}
          onChange={(e) => onChange({ free_from_items: e.target.value })}
        />
      </Field>

      <Switch
        checked={delivery.own}
        onChange={(own) => onChange({ own })}
        label={s.ownDelivery}
        description={s.ownDeliveryHint}
      />

      <div>
        <h3 className="text-sm font-medium text-slate-900">{s.couriers}</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {s.couriersHint}
        </p>
      </div>
      {couriers.map((courier, index) => (
        <div key={courier.key} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Field label={s.courier} error={fieldErr(`couriers.${index}`)}>
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
            label={s.removeCourier(courier.name || s.thisCourier)}
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
            {s.otherCourier}
          </Button>
        </div>
      )}

      <Switch
        checked={pickup.enabled}
        onChange={(enabled) => onChange({ pickup: { ...pickup, enabled } })}
        label={s.pickup}
        description={s.pickupHint}
      />
      {pickup.enabled && (
        <div className="border-l-2 border-slate-100 pl-4">
          <Field
            label={s.pickupAddress}
            error={fieldErr('pickup.address')}
            hint={s.pickupAddressHint}
          >
            <TextArea
              required
              maxLength={500}
              autoCapitalize="sentences"
              placeholder={s.pickupPlaceholder}
              value={pickup.address}
              onChange={(e) => onChange({ pickup: { ...pickup, address: e.target.value } })}
            />
          </Field>
        </div>
      )}

      {(noneOn || fieldError(error, 'delivery_settings')) && (
        <p role="alert" className="text-sm text-red-600">
          {fieldError(error, 'delivery_settings') ?? s.noDelivery}
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
  const s = useT().settings
  return (
    <Section
      title={s.discounts}
      description={s.discountsHint}
    >
      {rules.length === 0 && <p className="text-sm text-slate-500">{s.noDiscounts}</p>}
      {rules.map((rule, index) => (
        <div key={rule.key} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Field label={s.whenItemsReach} error={fieldError(error, `discount_settings.rules.${index}.min_subtotal`)}>
              <MoneyInput
                required
                currency={currency}
                value={rule.min_subtotal}
                onChange={(min_subtotal) => setRule(rule.key, { min_subtotal })}
              />
            </Field>
          </div>
          <div className="min-w-0 flex-1">
            <Field label={s.takeOff} error={fieldError(error, `discount_settings.rules.${index}.amount_off`)}>
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
            label={s.removeDiscount}
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
          {s.addDiscount}
        </Button>
      )}
    </Section>
  )
}

// Fetched ahead so "Connect Telegram" is a plain link: a phone browser
// blocks opening a new tab after waiting for a request. The code in it
// works for 30 minutes.
const LINK_REFRESH_MS = 20 * 60_000
// While the seller is off in Telegram tapping Start, check for the chat.
const CONNECT_POLL_MS = 3_000

function TelegramSection({
  store,
  username,
  onUsernameChange,
  error,
}: {
  store: Store
  username: string
  onUsernameChange: (username: string) => void
  error: unknown
}) {
  const queryClient = useQueryClient()
  const { toast, confirm } = useFeedback()
  const [opened, setOpened] = useState(false)
  const s = useT().settings
  const connected = store.telegram_connected
  // Opened the link and not connected yet: poll until the bot has the chat.
  const waiting = opened && !connected
  const canConnect = store.telegram_bot_available && !connected

  const link = useQuery({
    queryKey: keys.telegramLink,
    queryFn: () => api<TelegramLink>('/seller/store/telegram/link', { method: 'POST' }),
    enabled: canConnect,
    staleTime: LINK_REFRESH_MS,
    refetchInterval: LINK_REFRESH_MS,
  })
  // Same data as the page's store query; this one only adds the polling.
  useQuery({
    queryKey: keys.store,
    queryFn: () => api<Store>('/seller/store'),
    enabled: waiting,
    refetchInterval: CONNECT_POLL_MS,
    refetchOnWindowFocus: true,
  })

  const disconnect = useMutation({
    mutationFn: () => api<Store>('/seller/store/telegram', { method: 'DELETE' }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.store, updated)
      setOpened(false)
      toast(s.disconnected)
    },
  })

  async function askDisconnect() {
    const ok = await confirm({
      title: s.disconnectTitle,
      message: s.disconnectMessage,
      confirmLabel: s.disconnect,
    })
    if (ok) disconnect.mutate()
  }

  return (
    <Section title={s.telegram} description={s.telegramHint}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-900">{s.orderAlerts}</h3>
          {connected && (
            <Badge tone="green">
              <CircleCheck aria-hidden className="mr-1 size-3.5" />
              {s.connected}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {!store.telegram_bot_available ? s.alertsUnavailable : connected ? s.alertsOn : s.alertsOff}
        </p>
      </div>
      {connected ? (
        <Button
          variant="danger"
          loading={disconnect.isPending}
          onClick={askDisconnect}
          className="w-full sm:w-auto"
        >
          {s.disconnect}
        </Button>
      ) : (
        canConnect && (
          <div>
            {link.error ? (
              <ErrorMessage error={link.error} />
            ) : (
              <a
                href={link.data?.url}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!link.data}
                onClick={() => setOpened(true)}
                className={`${buttonClass('primary')} w-full sm:w-auto ${link.data ? '' : 'pointer-events-none opacity-50'}`}
              >
                <Send aria-hidden className="size-4" />
                {s.connect}
              </a>
            )}
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {waiting ? s.connectWaiting : s.connectHint}
            </p>
          </div>
        )
      )}
      {disconnect.error && <ErrorMessage error={disconnect.error} />}

      <Field
        label={s.username}
        error={fieldError(error, 'telegram_username')}
        hint={s.usernameHint}
      >
        <Input
          maxLength={60}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="your_shop"
          leading={<span className="text-sm font-medium">@</span>}
          value={username}
          onChange={(e) => onUsernameChange(e.target.value.replace(/^@/, ''))}
        />
      </Field>
    </Section>
  )
}

/** Applies at once and stays on this device; not part of the store's settings. */
function DisplaySection() {
  const s = useT().settings
  return (
    <Section title={s.display} description={s.displayHint}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-sm font-medium text-slate-900">{s.language}</span>
        <LanguageSwitch />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-sm font-medium text-slate-900">{s.theme}</span>
        <ThemeSwitch />
      </div>
    </Section>
  )
}

function AccountSection() {
  const { logout } = useAuth()
  const s = useT().settings
  return (
    <Section title={s.account}>
      <Button variant="secondary" icon={LogOut} onClick={logout} className="w-full sm:w-auto">
        {s.logOut}
      </Button>
    </Section>
  )
}
