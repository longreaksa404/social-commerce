import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  CircleCheck,
  Copy,
  ExternalLink,
  ImagePlus,
  Plus,
  QrCode,
  Send,
  Share2,
  Store as StoreIcon,
  Trash2,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import {
  Badge,
  Button,
  ErrorMessage,
  Field,
  IconButton,
  Input,
  MoneyInput,
  Select,
  Switch,
  TextArea,
} from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { errorText, fieldError } from '../../lib/errors.ts'
import { prepareCover, prepareLogo, uploadStoreCover, uploadStoreLogo } from '../../lib/images.ts'
import { phnomPenhDate } from '../../lib/orders.ts'
import { parseKhqr, readQrImage } from '../../lib/readKhqr.ts'
import type { Currency, PaymentSettings, ShopColor, Store, TelegramLink } from '../../lib/types.ts'
import { DEEP_COLORS, LIGHT_COLORS } from '../../shop/colors.ts'
import { keys } from '../queries.ts'
import { useShareShop } from '../ShareShop.tsx'
import type { DeliveryForm, Form, RuleRow } from './form.ts'

/** What every settings page's fields get from the page. */
export type FieldsProps = {
  store: Store
  form: Form
  update: (changes: Partial<Form>) => void
  error: unknown
}

export function ShopFields({ store, form, update, error }: FieldsProps) {
  const s = useT().settings
  return (
    <>
      <CoverField form={form} update={update} error={error} />
      <LogoField form={form} update={update} error={error} />
      <ColorField store={store} form={form} update={update} />
      <Field label={s.storeName} error={fieldError(error, 'name')}>
        <Input
          required
          maxLength={100}
          autoCapitalize="words"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </Field>
      <Field label={s.description} error={fieldError(error, 'description')}>
        <TextArea
          maxLength={2000}
          autoCapitalize="sentences"
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </Field>
      <Field label={s.currency} hint={s.currencyHint}>
        <Select value={form.currency} onChange={(e) => update({ currency: e.target.value as Currency })}>
          <option value="USD">{s.usd}</option>
          <option value="KHR">{s.khr}</option>
        </Select>
      </Field>
    </>
  )
}

type PictureProps = Pick<FieldsProps, 'form' | 'update' | 'error'>

/** A picture for the shop, picked from the phone: shrunk and uploaded to
 * storage right away (that takes a moment), but the shop keeps its old one
 * until Save (founder, 2026-10-15: nothing changes before Save). */
function usePictureUpload(prepare: (file: File) => Promise<Blob>, upload: (picture: Blob) => Promise<string>) {
  const input = useRef<HTMLInputElement>(null)
  const send = useMutation({ mutationFn: async (file: File) => upload(await prepare(file)) })
  function pick(event: ChangeEvent<HTMLInputElement>, done: (url: string) => void) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) send.mutate(file, { onSuccess: done })
  }
  return { input, send, pick, choose: () => input.current?.click() }
}

/** The wide photo at the top of the shop and on its link card (founder's
 * picks 3A 4A, 2026-10-15); the box shows the strip that was kept. */
function CoverField({ form, update, error }: PictureProps) {
  const s = useT().settings
  const { input, send, pick, choose } = usePictureUpload(prepareCover, uploadStoreCover)
  const problem = send.error ?? (fieldError(error, 'cover_url') ? error : null)

  return (
    <div role="group" aria-labelledby="cover-label" aria-describedby="cover-desc">
      <p id="cover-label" className="mb-1.5 text-sm font-medium text-slate-700">
        {s.cover}
      </p>
      {form.cover_url ? (
        <img
          src={form.cover_url}
          alt=""
          className="aspect-[3/1] w-full rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200"
        />
      ) : (
        <div
          aria-hidden
          className="flex aspect-[3/1] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400"
        >
          <ImagePlus className="size-7" />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" icon={ImagePlus} loading={send.isPending} onClick={choose}>
          {form.cover_url ? s.changeCover : s.addCover}
        </Button>
        {form.cover_url && (
          <Button variant="ghost" disabled={send.isPending} onClick={() => update({ cover_url: null })}>
            {s.removeCover}
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        tabIndex={-1}
        hidden
        onChange={(e) => pick(e, (cover_url) => update({ cover_url }))}
      />
      {problem ? (
        <p id="cover-desc" role="alert" className="mt-1.5 text-sm text-red-600">
          {errorText(problem)}
        </p>
      ) : (
        <p id="cover-desc" className="mt-1.5 text-xs leading-5 text-slate-500">
          {s.coverHint}
        </p>
      )}
    </div>
  )
}

function LogoField({ form, update, error }: PictureProps) {
  const s = useT().settings
  const { input, send, pick, choose } = usePictureUpload(prepareLogo, uploadStoreLogo)
  const problem = send.error ?? (fieldError(error, 'logo_url') ? error : null)

  return (
    <div role="group" aria-labelledby="logo-label" aria-describedby="logo-desc">
      <p id="logo-label" className="mb-1.5 text-sm font-medium text-slate-700">
        {s.logo}
      </p>
      <div className="flex items-center gap-4">
        {form.logo_url ? (
          <img src={form.logo_url} alt="" className="size-16 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <StoreIcon aria-hidden className="size-7" />
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={ImagePlus} loading={send.isPending} onClick={choose}>
            {form.logo_url ? s.changeLogo : s.addLogo}
          </Button>
          {form.logo_url && (
            <Button variant="ghost" disabled={send.isPending} onClick={() => update({ logo_url: null })}>
              {s.removeLogo}
            </Button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        tabIndex={-1}
        hidden
        onChange={(e) => pick(e, (logo_url) => update({ logo_url }))}
      />
      {problem ? (
        <p id="logo-desc" role="alert" className="mt-1.5 text-sm text-red-600">
          {errorText(problem)}
        </p>
      ) : (
        <p id="logo-desc" className="mt-1.5 text-xs leading-5 text-slate-500">
          {s.logoHint}
        </p>
      )}
    </div>
  )
}

/** The shop's colour, for customers and the seller's dashboard (founder's
 * picks 1A, 2026-10-15; the light ones the same day), used once saved. Each
 * swatch carries its own colour (shop/colors.css), so it shows as it will
 * look, light or dark. */
function ColorField({ store, form, update }: Pick<FieldsProps, 'store' | 'form' | 'update'>) {
  const s = useT().settings
  const swatch = (color: ShopColor) => {
    const on = color === form.color
    return (
      <label
        key={color}
        data-shop-color={color}
        className="flex aspect-square cursor-pointer items-center justify-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-navy-600"
      >
        <input
          type="radio"
          name="shop-color"
          value={color}
          checked={on}
          onChange={() => update({ color })}
          aria-label={s.colors[color]}
          className="sr-only"
        />
        <span
          className={`flex size-9 items-center justify-center rounded-full bg-accent text-on-accent transition-shadow ${
            on ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-slate-900/10'
          }`}
        >
          {on && <Check aria-hidden className="size-5" />}
        </span>
      </label>
    )
  }

  return (
    <fieldset aria-describedby="color-desc">
      <legend className="mb-1.5 text-sm font-medium text-slate-700">{s.shopColor}</legend>
      {/* A row of deep colours, then the light ones; each row fits any
          phone (the cells shrink a little on narrow ones). */}
      <div className="-mx-1 grid max-w-sm grid-cols-8">{DEEP_COLORS.map(swatch)}</div>
      <div className="-mx-1 grid max-w-sm grid-cols-8">{LIGHT_COLORS.map(swatch)}</div>
      <p id="color-desc" className="mt-1.5 text-xs leading-5 text-slate-500">
        <span className="font-medium text-slate-700">{s.colors[form.color]}</span> · {s.colorHint}
      </p>
      <Link
        to={`/shop/${store.slug}`}
        target="_blank"
        className="-mx-1 mt-1 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-navy-700 link focus-visible:outline-2 focus-visible:outline-navy-600"
      >
        <ExternalLink aria-hidden className="size-4" />
        {s.seeShop}
      </Link>
    </fieldset>
  )
}

export function OrdersFields({ form, update, error }: FieldsProps) {
  const s = useT().settings
  return (
    <>
      {/* Off for a while (Khmer New Year, a trip, no stock): the shop stays
          open to look around, checkout is refused. */}
      <Switch
        checked={!form.orders_paused}
        onChange={(on) => update({ orders_paused: !on, orders_resume_on: '' })}
        label={s.takeOrders}
        description={form.orders_paused ? s.takeOrdersOff : undefined}
      />
      {form.orders_paused && (
        <Field label={s.resumeOn} error={fieldError(error, 'orders_resume_on')} hint={s.resumeOnHint}>
          <Input
            type="date"
            min={phnomPenhDate(1)}
            value={form.orders_resume_on}
            onChange={(e) => update({ orders_resume_on: e.target.value })}
          />
        </Field>
      )}
      <hr className="border-slate-100" />
      <Switch
      checked={form.order_confirmation_mode === 'automatic'}
      onChange={(on) => update({ order_confirmation_mode: on ? 'automatic' : 'manual' })}
        label={s.autoAccept}
        description={form.order_confirmation_mode === 'automatic' ? s.autoAcceptOn : s.autoAcceptOff}
      />
    </>
  )
}

/** "Upload your bank's QR": the seller's own KHQR picture, read on the
 * phone (lib/readKhqr.ts), fills in the Bakong ID, the account and the
 * name. Warns when the QR's account isn't in the shop's currency (an ABA
 * QR points at the default account, often the riel one). */
function QrUpload({
  again,
  shopCurrency,
  onRead,
}: {
  again: boolean
  shopCurrency: Currency
  onRead: (account: Exclude<ReturnType<typeof parseKhqr>, string>) => void
}) {
  const s = useT().settings
  const { toast } = useFeedback()
  const input = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReading(true)
    setProblem(null)
    let result: ReturnType<typeof parseKhqr>
    try {
      result = parseKhqr(await readQrImage(file))
    } catch {
      result = 'no_qr'
    }
    setReading(false)
    if (typeof result === 'string') {
      setProblem(result === 'no_qr' ? s.qrNone : result === 'business' ? s.qrBusiness : s.qrNotKhqr)
      return
    }
    onRead(result)
    toast(s.qrRead)
    if (result.currency && result.currency !== shopCurrency) setProblem(s.qrCurrency(result.currency, shopCurrency))
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Button variant="secondary" icon={QrCode} loading={reading} onClick={() => input.current?.click()} className="w-full sm:w-auto">
        {again ? s.uploadAnother : s.uploadQr}
      </Button>
      {!again && <p className="text-xs leading-5 text-slate-500">{s.uploadQrHint}</p>}
      {problem && <p role="alert" className="text-sm leading-6 font-medium text-amber-800">{problem}</p>}
    </div>
  )
}

export function PaymentsFields({ form, update, error }: FieldsProps) {
  const { cod, bank_transfer: bank, khqr } = form.payment_settings
  const t = useT()
  const s = t.settings
  const noneOn = !cod.enabled && !bank.enabled && !khqr.enabled
  const fieldErr = (field: string) => fieldError(error, `payment_settings.${field}`)
  const [typing, setTyping] = useState(false)
  const khqrError = ['bakong_account_id', 'merchant_name', 'account_information', 'acquiring_bank'].some((f) => fieldErr(`khqr.${f}`))
  const showKhqrFields = typing || Boolean(khqrError)
  const set = <M extends keyof PaymentSettings>(method: M, changes: Partial<PaymentSettings[M]>) =>
    update({ payment_settings: { ...form.payment_settings, [method]: { ...form.payment_settings[method], ...changes } } })
  return (
    <>
      <Switch
        checked={khqr.enabled}
        onChange={(enabled) => set('khqr', { enabled })}
        label={t.status.paymentMethod.khqr}
      />
      {khqr.enabled && (
        <div className="space-y-4 border-l-2 border-slate-100 pl-4">
          {/* Uploading the bank's QR is the whole step; typing the four
              fields is the fallback, or where Save found a problem. */}
          {!showKhqrFields && khqr.bakong_account_id && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 ring-inset">
              <p className="text-xs font-medium text-slate-500">{s.payTo}</p>
              <p className="font-semibold text-slate-900">{khqr.merchant_name || khqr.bakong_account_id}</p>
              <p className="text-sm text-slate-600">
                {khqr.account_information
                  ? `${khqr.acquiring_bank || khqr.bakong_account_id} ···${khqr.account_information.slice(-4)}`
                  : khqr.bakong_account_id}
              </p>
            </div>
          )}
          {!showKhqrFields && (
            <QrUpload
              again={Boolean(khqr.bakong_account_id)}
              shopCurrency={form.currency}
              onRead={(account) =>
                set('khqr', {
                  bakong_account_id: account.bakongAccountId,
                  account_information: account.accountInformation,
                  acquiring_bank: account.acquiringBank,
                  ...(account.name ? { merchant_name: account.name } : {}),
                })
              }
            />
          )}
          {showKhqrFields && (
            <>
              <Field label={s.bakongId} error={fieldErr('khqr.bakong_account_id')} hint={s.bakongIdHint}>
                <Input
                  required
                  maxLength={32}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="name@bank"
                  value={khqr.bakong_account_id}
                  onChange={(e) => set('khqr', { bakong_account_id: e.target.value })}
                />
              </Field>
              <Field label={s.merchantName} error={fieldErr('khqr.merchant_name')} hint={s.merchantNameHint}>
                <Input
                  required
                  maxLength={25}
                  pattern="[ -~]*"
                  title={s.merchantNameTitle}
                  autoCapitalize="characters"
                  value={khqr.merchant_name}
                  onChange={(e) => set('khqr', { merchant_name: e.target.value })}
                />
              </Field>
              <Field label={s.accountInfo} error={fieldErr('khqr.account_information')} hint={s.accountInfoHint}>
                <Input
                  maxLength={32}
                  inputMode="numeric"
                  value={khqr.account_information}
                  onChange={(e) => set('khqr', { account_information: e.target.value })}
                />
              </Field>
              <Field label={s.acquiringBank} error={fieldErr('khqr.acquiring_bank')}>
                <Input maxLength={32} placeholder="ABA Bank" value={khqr.acquiring_bank} onChange={(e) => set('khqr', { acquiring_bank: e.target.value })} />
              </Field>
            </>
          )}
          <button
            type="button"
            onClick={() => setTyping(!showKhqrFields)}
            className="inline-flex min-h-11 items-center text-sm font-medium text-navy-700 link"
          >
            {showKhqrFields ? s.uploadInstead : khqr.bakong_account_id ? s.editKhqr : s.typeInstead}
          </button>
        </div>
      )}

      <Switch
        checked={bank.enabled}
        onChange={(enabled) => set('bank_transfer', { enabled })}
        label={t.status.paymentMethod.bank_transfer}
      />
      {bank.enabled && (
        <div className="space-y-4 border-l-2 border-slate-100 pl-4">
          <Field label={s.bank} error={fieldErr('bank_transfer.bank_name')}>
            <Input
              required
              maxLength={50}
              placeholder="ABA"
              value={bank.bank_name}
              onChange={(e) => set('bank_transfer', { bank_name: e.target.value })}
            />
          </Field>
          <Field label={s.accountName} error={fieldErr('bank_transfer.account_name')}>
            <Input
              required
              maxLength={100}
              autoCapitalize="characters"
              value={bank.account_name}
              onChange={(e) => set('bank_transfer', { account_name: e.target.value })}
            />
          </Field>
          <Field label={s.accountNumber} error={fieldErr('bank_transfer.account_number')}>
            <Input
              required
              maxLength={50}
              autoComplete="off"
              value={bank.account_number}
              onChange={(e) => set('bank_transfer', { account_number: e.target.value })}
            />
          </Field>
        </div>
      )}

      <Switch
        checked={cod.enabled}
        onChange={(enabled) => set('cod', { enabled })}
        label={t.status.paymentMethod.cod}
      />

      {(noneOn || fieldError(error, 'payment_settings')) && (
        <p role="alert" className="text-sm text-red-600">
          {fieldError(error, 'payment_settings') ?? s.noPayment}
        </p>
      )}
    </>
  )
}

const MAX_COURIERS = 10
const MAX_DISCOUNTS = 5
// The couriers most Cambodian sellers use, one tap to add.
const COMMON_COURIERS = ['J&T Express', 'VET Express']

export function DeliveryFields({ form, update, error }: FieldsProps) {
  const { delivery, currency } = form
  const onChange = (changes: Partial<DeliveryForm>) => update({ delivery: { ...delivery, ...changes } })
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
    <>
      <Field label={s.fee} error={fieldErr('fee')} hint={s.feeHint}>
        <MoneyInput currency={currency} placeholder={s.free} value={delivery.fee} onChange={(fee) => onChange({ fee })} />
      </Field>
      <Field label={s.freeFrom} error={fieldErr('free_from_amount')}>
        <MoneyInput
          currency={currency}
          placeholder={s.off}
          value={delivery.free_from_amount}
          onChange={(free_from_amount) => onChange({ free_from_amount })}
        />
      </Field>
      <Field label={s.freeFromItems} error={fieldErr('free_from_items')}>
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

      <Switch checked={delivery.own} onChange={(own) => onChange({ own })} label={s.ownDelivery} />

      <div>
        <h3 className="text-sm font-medium text-slate-700">{s.couriers}</h3>
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
      />
      {pickup.enabled && (
        <div className="border-l-2 border-slate-100 pl-4">
          <Field label={s.pickupAddress} error={fieldErr('pickup.address')}>
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
    </>
  )
}

export function DiscountsFields({ form, update, error }: FieldsProps) {
  const rules = form.discounts
  const onChange = (discounts: RuleRow[]) => update({ discounts })
  const setRule = (key: string, changes: Partial<RuleRow>) =>
    onChange(rules.map((r) => (r.key === key ? { ...r, ...changes } : r)))
  const s = useT().settings
  return (
    <>
      {rules.length === 0 && <p className="text-sm text-slate-500">{s.noDiscounts}</p>}
      {rules.map((rule, index) => (
        <div key={rule.key} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Field label={s.whenItemsReach} error={fieldError(error, `discount_settings.rules.${index}.min_subtotal`)}>
              <MoneyInput
                required
                currency={form.currency}
                value={rule.min_subtotal}
                onChange={(min_subtotal) => setRule(rule.key, { min_subtotal })}
              />
            </Field>
          </div>
          <div className="min-w-0 flex-1">
            <Field label={s.takeOff} error={fieldError(error, `discount_settings.rules.${index}.amount_off`)}>
              <MoneyInput
                required
                currency={form.currency}
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
    </>
  )
}

// Fetched ahead so "Connect Telegram" is a plain link: a phone browser
// blocks opening a new tab after waiting for a request. The code in it
// works for 30 minutes.
const LINK_REFRESH_MS = 20 * 60_000
// While the seller is off in Telegram tapping Start, check for the chat.
const CONNECT_POLL_MS = 3_000

/** Settings → Alerts: when to warn about low stock (bell and Telegram),
 * and the Telegram chat the alerts go to. */
export function AlertsFields({ store, form, update, error }: FieldsProps) {
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
    <>
      <Field label={s.lowStockAlert} error={fieldError(error, 'low_stock_alert')} hint={s.lowStockAlertHint}>
        <Input
          required
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={form.low_stock_alert}
          onChange={(e) => update({ low_stock_alert: e.target.value })}
          className="max-w-32"
        />
      </Field>
      <hr className="border-slate-100" />
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-700">{s.telegram}</h3>
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
        <Button variant="danger" loading={disconnect.isPending} onClick={askDisconnect} className="w-full sm:w-auto">
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
            <p className="mt-2 text-xs leading-5 text-slate-500">{waiting ? s.connectWaiting : s.connectHint}</p>
          </div>
        )
      )}
      {disconnect.error && <ErrorMessage error={disconnect.error} />}
    </>
  )
}

/** How customers with a question reach the seller: buttons on products and
 * orders in the shop. Telegram types the question in; Messenger (a
 * Facebook page) and a phone call are there for those who don't use it. */
export function ContactFields({ form, update, error }: FieldsProps) {
  const s = useT().settings
  return (
    <>
      <Field label={s.username} error={fieldError(error, 'telegram_username')}>
        <Input
          maxLength={60}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="your_shop"
          leading={<span className="text-sm font-medium">@</span>}
          value={form.telegram_username}
          onChange={(e) => update({ telegram_username: e.target.value.replace(/^@/, '') })}
        />
      </Field>
      <Field label={s.messenger} error={fieldError(error, 'messenger_username')} hint={s.messengerHint}>
        <Input
          maxLength={200}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="sokhafashion"
          value={form.messenger_username}
          onChange={(e) => update({ messenger_username: e.target.value })}
        />
      </Field>
      <Field label={s.contactPhone} error={fieldError(error, 'contact_phone')} hint={s.contactPhoneHint}>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={32}
          placeholder="012 345 678"
          value={form.contact_phone}
          onChange={(e) => update({ contact_phone: e.target.value })}
        />
      </Field>
    </>
  )
}

export function LinkFields({ store, form, update, error }: FieldsProps) {
  const s = useT().settings
  return (
    <>
      <Field label={s.linkName} error={fieldError(error, 'slug')} hint={s.linkNameHint}>
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
          onChange={(e) => update({ slug: e.target.value.toLowerCase() })}
        />
      </Field>
      <p className="break-all rounded-xl bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-700">
        {window.location.host}/shop/<span className="font-semibold text-slate-900">{form.slug || '…'}</span>
      </p>
      {/* The saved link (an unsaved new slug doesn't work yet): Copy and
          Share first, the most common job (UX check #10, 2026-10-17). */}
      <ShopLinkButtons slug={store.slug} />
    </>
  )
}

function ShopLinkButtons({ slug }: { slug: string }) {
  const t = useT()
  const s = t.settings
  const { copy, share } = useShareShop()
  const canShare = typeof navigator.share === 'function'
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button icon={Copy} onClick={copy} className="flex-1 sm:flex-none">
          {t.links.copyLink}
        </Button>
        {canShare && (
          <Button variant="secondary" icon={Share2} onClick={share} className="flex-1 sm:flex-none">
            {t.common.share}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5">
        <Link
          to={`/shop/${slug}`}
          target="_blank"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-navy-700 link"
        >
          <ExternalLink aria-hidden className="size-4" />
          {s.viewShop}
        </Link>
        <Link
          to="/dashboard/links/new"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-navy-700 link"
        >
          <Share2 aria-hidden className="size-4" />
          {s.shareTracked}
        </Link>
      </div>
    </div>
  )
}
