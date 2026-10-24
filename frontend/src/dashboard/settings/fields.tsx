import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Camera,
  Check,
  CircleCheck,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  Plus,
  QrCode,
  Send,
  Store as StoreIcon,
  Trash2,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useAskRemove, useFeedback } from '../../components/feedback.ts'
import { buttonClass } from '../../components/styles.ts'
import {
  Button,
  ErrorMessage,
  Field,
  IconButton,
  Input,
  MenuButton,
  MoneyInput,
  Select,
  Switch,
  TextArea,
} from '../../components/ui.tsx'
import { useT } from '../../i18n/useT.ts'
import { api } from '../../lib/api.ts'
import { errorText, fieldError } from '../../lib/errors.ts'
import { prepareCover, prepareLogo, uploadStoreCover, uploadStoreLogo } from '../../lib/images.ts'
import { formatMoney } from '../../lib/money.ts'
import { formatPhone, phnomPenhDate } from '../../lib/orders.ts'
import { parseKhqr, readQrImages, type KhqrAccount } from '../../lib/readKhqr.ts'
import type { Currency, PaymentSettings, ShopColor, Store, TelegramLink } from '../../lib/types.ts'
import { DEEP_COLORS, LIGHT_COLORS } from '../../shop/colors.ts'
import { keys } from '../queries.ts'
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
      <ShopTop form={form} update={update} error={error} />
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
      <Field label={s.currency} hint={s.currencyHint(formatMoney(store.khr_per_usd, 'KHR'))}>
        <Select value={form.currency} onChange={(e) => update({ currency: e.target.value as Currency })}>
          <option value="USD">{s.usd}</option>
          <option value="KHR">{s.khr}</option>
        </Select>
      </Field>
    </>
  )
}

/** The top of the shop as it will look with the picks, before Save
 * (settings check #8, founder 2026-10-19): the cover, the logo, the name
 * and a button in the shop's colour. The cover and the logo are their own
 * buttons (founder's test list #13, 2026-10-24): a tap picks a picture, or
 * with one there opens Change / Remove. */
function ShopTop({ form, update, error }: PictureProps) {
  const t = useT()
  const s = t.settings
  const askRemove = useAskRemove()
  const { input: coverInput, send: coverSend, pick: pickCover, choose: chooseCover } = usePictureUpload(
    prepareCover,
    uploadStoreCover,
  )
  const { input: logoInput, send: logoSend, pick: pickLogo, choose: chooseLogo } = usePictureUpload(
    prepareLogo,
    uploadStoreLogo,
  )
  const problem =
    coverSend.error ??
    logoSend.error ??
    (fieldError(error, 'cover_url') || fieldError(error, 'logo_url') ? error : null)

  const coverLook = (
    <>
      {form.cover_url ? (
        <img src={form.cover_url} alt="" className="aspect-[3/1] w-full rounded-t-xl bg-slate-100 object-cover" />
      ) : (
        <div className="aspect-[3/1] w-full rounded-t-xl bg-navy-50" />
      )}
      <PictureBadge busy={coverSend.isPending} className="top-2 right-2 size-9" />
    </>
  )
  const logoLook = (
    <>
      {form.logo_url ? (
        <img src={form.logo_url} alt="" className="size-14 rounded-full object-cover ring-4 ring-surface" />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-full bg-brand text-white ring-4 ring-surface">
          <StoreIcon aria-hidden className="size-6" />
        </span>
      )}
      <PictureBadge busy={logoSend.isPending} className="-right-1 -bottom-1 size-7" />
    </>
  )

  return (
    <div>
      <div data-shop-color={form.color} className="rounded-xl bg-surface ring-1 ring-slate-200">
        <PictureButton
          has={Boolean(form.cover_url)}
          label={form.cover_url ? s.changeCover : s.addCover}
          busy={coverSend.isPending}
          onPick={chooseCover}
          onRemove={async () => (await askRemove(s.removeCoverAsk)) && update({ cover_url: null })}
          changeLabel={s.changeCover}
          removeLabel={s.removeCover}
          className="relative block w-full rounded-t-xl"
          menuClassName="top-12 right-2"
        >
          {coverLook}
        </PictureButton>
        <div className="relative -mt-7 flex items-end gap-3 px-4 pb-4">
          <PictureButton
            has={Boolean(form.logo_url)}
            label={form.logo_url ? s.changeLogo : s.addLogo}
            busy={logoSend.isPending}
            onPick={chooseLogo}
            onRemove={async () => (await askRemove(s.removeLogoAsk)) && update({ logo_url: null })}
            changeLabel={s.changeLogo}
            removeLabel={s.removeLogo}
            className="relative z-10 size-14 shrink-0 rounded-full"
            menuClassName="top-full left-0 mt-2"
          >
            {logoLook}
          </PictureButton>
          <span aria-hidden className="min-w-0 flex-1 truncate pb-1 font-semibold text-slate-900">
            {form.name}
          </span>
          <span aria-hidden className="shrink-0 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent">
            {t.shop.product.buyNow}
          </span>
        </div>
      </div>
      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        tabIndex={-1}
        hidden
        onChange={(e) => pickCover(e, (cover_url) => update({ cover_url }))}
      />
      <input
        ref={logoInput}
        type="file"
        accept="image/*"
        tabIndex={-1}
        hidden
        onChange={(e) => pickLogo(e, (logo_url) => update({ logo_url }))}
      />
      {problem ? (
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {errorText(problem)}
        </p>
      ) : (
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{s.pictureHint}</p>
      )}
    </div>
  )
}

/** The small camera on the cover and the logo that says they're buttons;
 * a spinner while the picture uploads. */
function PictureBadge({ busy, className }: { busy: boolean; className: string }) {
  const Icon = busy ? LoaderCircle : Camera
  return (
    <span
      aria-hidden
      className={`absolute flex items-center justify-center rounded-full bg-slate-900/60 text-white ring-2 ring-surface ${className}`}
    >
      <Icon className={`size-4 ${busy ? 'animate-spin' : ''}`} />
    </span>
  )
}

/** No picture yet: a tap picks one. With one: Change / Remove. */
function PictureButton({
  has,
  label,
  busy,
  onPick,
  onRemove,
  changeLabel,
  removeLabel,
  className,
  menuClassName,
  children,
}: {
  has: boolean
  label: string
  busy: boolean
  onPick: () => void
  onRemove: () => void
  changeLabel: string
  removeLabel: string
  className: string
  menuClassName: string
  children: ReactNode
}) {
  if (!has) {
    return (
      <button
        type="button"
        aria-label={label}
        disabled={busy}
        onClick={onPick}
        className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600`}
      >
        {children}
      </button>
    )
  }
  return (
    <MenuButton
      label={label}
      disabled={busy}
      className={className}
      menuClassName={menuClassName}
      items={[
        { label: changeLabel, icon: ImagePlus, onSelect: onPick },
        { label: removeLabel, icon: Trash2, danger: true, onSelect: onRemove },
      ]}
    >
      {children}
    </MenuButton>
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

/** Settings → Orders and alerts (settings check, founder 2026-10-19):
 * taking orders, accepting them, and hearing about them (Telegram, low
 * stock). */
export function OrdersFields({ store, form, update, error }: FieldsProps) {
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
      <hr className="border-slate-100" />
      <TelegramAlerts store={store} />
      <hr className="border-slate-100" />
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
    </>
  )
}

/** "Upload your bank's QR": the seller's own KHQR picture, read on the
 * phone (lib/readKhqr.ts), fills in the Bakong ID, the account and the
 * name. Warns when the QR's account isn't in the shop's currency (an ABA
 * QR points at the default account, often the riel one). A "dual" picture
 * with a dollar and a riel QR (founder's test list #20, 2026-10-24) uses
 * the one in the shop's currency, or asks which when it can't tell. */
function QrUpload({
  again,
  shopCurrency,
  onRead,
}: {
  again: boolean
  shopCurrency: Currency
  onRead: (account: KhqrAccount) => void
}) {
  const s = useT().settings
  const { toast } = useFeedback()
  const input = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  // Two accounts in the picture and none, or both, in the shop's currency.
  const [choices, setChoices] = useState<KhqrAccount[]>([])

  function take(account: KhqrAccount, message = s.qrRead) {
    setChoices([])
    onRead(account)
    toast(message)
    if (account.currency && account.currency !== shopCurrency) setProblem(s.qrCurrency(account.currency, shopCurrency))
  }

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReading(true)
    setProblem(null)
    setChoices([])
    let results: ReturnType<typeof parseKhqr>[]
    try {
      const texts = await readQrImages(file)
      results = texts.length ? texts.map(parseKhqr) : ['no_qr']
    } catch {
      results = ['no_qr']
    }
    setReading(false)
    const accounts = results.filter((r): r is KhqrAccount => typeof r !== 'string')
    if (accounts.length === 0) {
      const result = results[0]
      setProblem(result === 'no_qr' ? s.qrNone : result === 'business' ? s.qrBusiness : s.qrNotKhqr)
      return
    }
    if (accounts.length === 1) return take(accounts[0])
    const inShopCurrency = accounts.filter((a) => a.currency === shopCurrency)
    if (inShopCurrency.length === 1) return take(inShopCurrency[0], s.qrUsedOne(shopCurrency))
    setChoices(accounts)
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Button variant="secondary" icon={QrCode} loading={reading} onClick={() => input.current?.click()} className="w-full sm:w-auto">
        {again ? s.uploadAnother : s.uploadQr}
      </Button>
      {!again && <p className="text-xs leading-5 text-slate-500">{s.uploadQrHint}</p>}
      {choices.length > 0 && (
        <div role="group" aria-labelledby="qr-choose" className="space-y-2">
          <p id="qr-choose" className="text-sm font-medium text-slate-700">
            {s.qrChoose}
          </p>
          {choices.map((account, i) => (
            <button
              key={i}
              type="button"
              onClick={() => take(account)}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 ring-slate-200 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-600"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{s.qrAccount(account.currency)}</span>
                <span className="block truncate text-sm text-slate-500">
                  {account.accountInformation
                    ? `${account.acquiringBank || account.bakongAccountId} ···${account.accountInformation.slice(-4)}`
                    : account.bakongAccountId}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {problem && <p role="alert" className="text-sm leading-6 font-medium text-amber-800">{problem}</p>}
    </div>
  )
}

export function PaymentsFields({ store, form, update, error }: FieldsProps) {
  const { cod, bank_transfer: bank, khqr } = form.payment_settings
  const t = useT()
  const s = t.settings
  const noneOn = !cod.enabled && !bank.enabled && !khqr.enabled
  const fieldErr = (field: string) => fieldError(error, `payment_settings.${field}`)
  const [typing, setTyping] = useState(false)
  const [editingBank, setEditingBank] = useState(false)
  const khqrError = ['bakong_account_id', 'merchant_name', 'account_information', 'acquiring_bank'].some((f) => fieldErr(`khqr.${f}`))
  const showKhqrFields = typing || Boolean(khqrError)
  const bankError = ['bank_name', 'account_name', 'account_number'].some((f) => fieldErr(`bank_transfer.${f}`))
  // Only details already saved: typing a new account keeps its boxes.
  const savedBank = store.payment_settings.bank_transfer
  const showBankCard =
    !editingBank &&
    !bankError &&
    Boolean(savedBank.bank_name && savedBank.account_name && savedBank.account_number) &&
    (['bank_name', 'account_name', 'account_number'] as const).every((f) => bank[f] === savedBank[f])
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
            {showKhqrFields ? s.uploadInstead : khqr.bakong_account_id ? s.editDetails : s.typeInstead}
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
          {/* Filled in: a card like KHQR's, the boxes behind "Edit the
              details" (settings check #5, founder 2026-10-19). */}
          {showBankCard ? (
            <>
              <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 ring-inset">
                <p className="text-xs font-medium text-slate-500">{s.transferTo}</p>
                <p className="font-semibold text-slate-900">{bank.account_name}</p>
                <p className="text-sm text-slate-600">
                  {bank.bank_name} · {bank.account_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBank(true)}
                className="inline-flex min-h-11 items-center text-sm font-medium text-navy-700 link"
              >
                {s.editDetails}
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
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
  const addCourier = (name: string, typed = false) =>
    onChange({ couriers: [...couriers, { key: crypto.randomUUID(), name, typed }] })
  const setCourier = (key: string, name: string) =>
    onChange({ couriers: couriers.map((c) => (c.key === key ? { ...c, name } : c)) })
  const missingCommon = COMMON_COURIERS.filter(
    (name) => !couriers.some((c) => c.name.trim().toLowerCase() === name.toLowerCase()),
  )
  const noneOn = !delivery.delivers && !pickup.enabled
  const s = useT().settings
  const askRemove = useAskRemove()
  return (
    <>
      {/* One Delivery switch: the shop's own driver, plus any couriers it
          sends with (founder, 2026-10-18). Fee and couriers under it. */}
      <Switch checked={delivery.delivers} onChange={(delivers) => onChange({ delivers })} label={s.delivery} />
      {delivery.delivers && (
        <div className="space-y-4 border-l-2 border-slate-100 pl-4">
          <Field label={s.fee} error={fieldErr('fee')} hint={s.feeHint}>
            <MoneyInput currency={currency} placeholder={s.free} value={delivery.fee} onChange={(fee) => onChange({ fee })} />
          </Field>
          {/* Labels that say the rule; either one makes delivery free
              (settings check #6, founder 2026-10-19). */}
          <Field label={s.freeFrom} error={fieldErr('free_from_amount')}>
            <div className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <MoneyInput
                  currency={currency}
                  placeholder={s.off}
                  value={delivery.free_from_amount}
                  onChange={(free_from_amount) => onChange({ free_from_amount })}
                />
              </div>
              <span className="text-sm text-slate-600">{s.orMore}</span>
            </div>
          </Field>
          <Field label={s.freeFromItems} error={fieldErr('free_from_items')}>
            <div className="flex items-center gap-3">
              <div className="w-40 shrink-0">
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
              </div>
              <span className="text-sm text-slate-600">{s.items}</span>
            </div>
          </Field>

          <div>
            <h3 className="text-sm font-medium text-slate-700">{s.couriers}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{s.couriersHint}</p>
          </div>
          {/* A list of names; a box only for one being typed, or one Save
              found a problem with (settings check #6). */}
          {couriers.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {couriers.map((courier, index) => {
                const problem = fieldErr(`couriers.${index}`)
                const remove = (
                  <IconButton
                    icon={Trash2}
                    tone="danger"
                    label={s.removeCourier(courier.name || s.thisCourier)}
                    className={courier.typed || problem ? 'mt-7' : ''}
                    onClick={async () => {
                      // A row with nothing typed yet goes without asking.
                      if (courier.name.trim() && !(await askRemove(s.removeCourierAsk(courier.name.trim())))) return
                      onChange({ couriers: couriers.filter((c) => c.key !== courier.key) })
                    }}
                  />
                )
                return (
                  <li key={courier.key} className="flex items-start gap-2 py-1 pr-1 pl-3.5">
                    {courier.typed || problem ? (
                      <div className="min-w-0 flex-1 py-2">
                        <Field label={s.courier} error={problem}>
                          <Input
                            required
                            maxLength={50}
                            autoCapitalize="words"
                            value={courier.name}
                            onChange={(e) => setCourier(courier.key, e.target.value)}
                          />
                        </Field>
                      </div>
                    ) : (
                      <span className="min-w-0 flex-1 self-center py-2 font-medium text-slate-900">{courier.name}</span>
                    )}
                    {remove}
                  </li>
                )
              })}
            </ul>
          )}
          {couriers.length < MAX_COURIERS && (
            <div className="flex flex-wrap gap-2">
              {missingCommon.map((name) => (
                <Button key={name} variant="secondary" icon={Plus} onClick={() => addCourier(name)}>
                  {name}
                </Button>
              ))}
              <Button variant="secondary" icon={Plus} onClick={() => addCourier('', true)}>
                {s.otherCourier}
              </Button>
            </div>
          )}
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
  const askRemove = useAskRemove()
  return (
    <>
      {rules.length === 0 && <p className="text-sm text-slate-500">{s.noDiscounts}</p>}
      {rules.map((rule, index) => (
        <div key={rule.key}>
          <div className="flex items-start gap-2">
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
              onClick={async () => {
                if ((rule.min_subtotal || rule.amount_off) && !(await askRemove(s.removeDiscountAsk))) return
                onChange(rules.filter((r) => r.key !== rule.key))
              }}
            />
          </div>
          {/* The rule in words (settings check #9, founder 2026-10-19). */}
          {Number(rule.min_subtotal) > 0 && Number(rule.amount_off) > 0 && (
            <p className="mt-1.5 text-sm text-slate-600">
              {s.discountRule(formatMoney(rule.min_subtotal, form.currency), formatMoney(rule.amount_off, form.currency))}
            </p>
          )}
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

/** The Telegram chat new-order and low-stock alerts go to. Connecting and
 * turning off save at once, apart from the page's Save. Every shop starts
 * connected (the sign-up's chat with the bot), so connected is one line
 * with Turn off; Connect shows only when off, e.g. after the seller
 * blocked the bot (founder's test list #16, 2026-10-24). */
function TelegramAlerts({ store }: { store: Store }) {
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

  if (connected) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-700">{s.telegram}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-emerald-700">
              <CircleCheck aria-hidden className="size-4 shrink-0" />
              {s.alertsOn}
            </p>
          </div>
          <Button variant="ghost" loading={disconnect.isPending} onClick={askDisconnect} className="shrink-0">
            {s.disconnect}
          </Button>
        </div>
        {disconnect.error && <ErrorMessage error={disconnect.error} />}
      </div>
    )
  }

  return (
    <>
      <div>
        <h3 className="text-sm font-medium text-slate-700">{s.telegram}</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {!store.telegram_bot_available ? s.alertsUnavailable : s.alertsOff}
        </p>
      </div>
      {canConnect && (
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
      )}
    </>
  )
}

/** How customers with a question reach the seller: buttons on products and
 * orders in the shop. Telegram types the question in; Messenger (a
 * Facebook page) and a phone call are there for those who don't use it.
 * A saved one gets "Try it", opening what a customer's button opens, and
 * the boxes have no grey example that looks filled in (settings check #10,
 * founder 2026-10-19). */
export function ContactFields({ store, form, update, error }: FieldsProps) {
  const s = useT().settings
  // What the shop's buttons open now: saved, and not being changed.
  const saved = {
    telegram: store.telegram_username && form.telegram_username === store.telegram_username,
    messenger: store.messenger_username && form.messenger_username === store.messenger_username,
    instagram: store.instagram_username && form.instagram_username === store.instagram_username,
    phone: store.contact_phone && form.contact_phone === formatPhone(store.contact_phone),
  }
  return (
    <>
      <div>
        <Field label={s.username} error={fieldError(error, 'telegram_username')}>
          <Input
            maxLength={60}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            leading={<span className="text-sm font-medium">@</span>}
            value={form.telegram_username}
            onChange={(e) => update({ telegram_username: e.target.value.replace(/^@/, '') })}
          />
        </Field>
        {saved.telegram && <TryIt href={`https://t.me/${store.telegram_username}`} />}
      </div>
      <div>
        <Field label={s.messenger} error={fieldError(error, 'messenger_username')} hint={s.messengerHint}>
          <Input
            maxLength={200}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={form.messenger_username}
            onChange={(e) => update({ messenger_username: e.target.value })}
          />
        </Field>
        {saved.messenger && <TryIt href={`https://m.me/${store.messenger_username}`} />}
      </div>
      {/* Test list #22, 2026-10-24. */}
      <div>
        <Field label={s.instagram} error={fieldError(error, 'instagram_username')}>
          <Input
            maxLength={200}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            leading={<span className="text-sm font-medium">@</span>}
            value={form.instagram_username}
            onChange={(e) => update({ instagram_username: e.target.value.replace(/^@/, '') })}
          />
        </Field>
        {saved.instagram && <TryIt href={`https://ig.me/m/${store.instagram_username}`} />}
      </div>
      <div>
        <Field label={s.contactPhone} error={fieldError(error, 'contact_phone')} hint={s.contactPhoneHint}>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={32}
            value={form.contact_phone}
            onChange={(e) => update({ contact_phone: e.target.value })}
          />
        </Field>
        {saved.phone && <TryIt href={`tel:${store.contact_phone}`} newTab={false} />}
      </div>
    </>
  )
}

function TryIt({ href, newTab = true }: { href: string; newTab?: boolean }) {
  const s = useT().settings
  return (
    <a
      href={href}
      {...(newTab ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="mt-1 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-navy-700 link focus-visible:outline-2 focus-visible:outline-navy-600"
    >
      <ExternalLink aria-hidden className="size-4" />
      {s.tryIt}
    </a>
  )
}
