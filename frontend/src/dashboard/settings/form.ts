import type { Messages } from '../../i18n/core.ts'
import { formatPhone } from '../../lib/orders.ts'
import type {
  Currency,
  DeliverySettings,
  OrderConfirmationMode,
  PaymentSettings,
  ShopColor,
  Store,
} from '../../lib/types.ts'

// Rows the seller can add and remove carry a key for React; inputs hold
// strings, turned back into the API's shape by each section's body.
/** `typed`: added with "Other courier", so it shows a box to type in;
 * the others are a plain list (settings check #6). */
export type CourierRow = { key: string; name: string; typed?: boolean }
export type RuleRow = { key: string; min_subtotal: string; amount_off: string }
export type DeliveryForm = {
  fee: string
  free_from_amount: string
  free_from_items: string
  /** Delivery on: the shop's own driver, plus any couriers (founder,
   * 2026-10-18: one Delivery switch, not own delivery and couriers). */
  delivers: boolean
  couriers: CourierRow[]
  pickup: DeliverySettings['pickup']
}

export type Form = {
  name: string
  description: string
  /** Uploaded as soon as picked, but the shop's only once saved. */
  logo_url: string | null
  cover_url: string | null
  color: ShopColor
  currency: Currency
  order_confirmation_mode: OrderConfirmationMode
  orders_paused: boolean
  /** "2027-04-17" or '' (until turned back on). */
  orders_resume_on: string
  payment_settings: PaymentSettings
  delivery: DeliveryForm
  discounts: RuleRow[]
  telegram_username: string
  messenger_username: string
  contact_phone: string
  low_stock_alert: string
}

/** "1.50" -> "1.5", "6000.00" -> "6000": what a person would type. */
const amount = (value: string | null) => (value === null ? '' : String(Number(value)))

export const toForm = (store: Store): Form => {
  const delivery = store.delivery_settings
  return {
    name: store.name,
    description: store.description ?? '',
    logo_url: store.logo_url,
    cover_url: store.cover_url,
    color: store.color,
    currency: store.currency,
    order_confirmation_mode: store.order_confirmation_mode,
    orders_paused: store.orders_paused,
    orders_resume_on: store.orders_resume_on ?? '',
    payment_settings: store.payment_settings,
    delivery: {
      fee: Number(delivery.fee) === 0 ? '' : amount(delivery.fee),
      free_from_amount: amount(delivery.free_from_amount),
      free_from_items: delivery.free_from_items === null ? '' : String(delivery.free_from_items),
      delivers: delivery.own_delivery.enabled || delivery.couriers.length > 0,
      couriers: delivery.couriers.map((name, i) => ({ key: `courier-${i}`, name })),
      pickup: delivery.pickup,
    },
    discounts: store.discount_settings.rules.map((r, i) => ({
      key: `rule-${i}`,
      min_subtotal: amount(r.min_subtotal),
      amount_off: amount(r.amount_off),
    })),
    telegram_username: store.telegram_username ?? '',
    messenger_username: store.messenger_username ?? '',
    contact_phone: store.contact_phone ? formatPhone(store.contact_phone) : '',
    low_stock_alert: String(store.low_stock_alert),
  }
}

export const SECTION_IDS = ['shop', 'orders', 'payments', 'delivery', 'discounts', 'contact'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export const isSectionId = (value: string | undefined): value is SectionId =>
  (SECTION_IDS as readonly (string | undefined)[]).includes(value)

/** Settings pages that aren't part of the store's settings: each has its
 * own form and endpoint (SettingsSection's PAGES). */
export const PAGE_IDS = ['account', 'plan', 'staff', 'close', 'setup', 'export'] as const
export type PageId = (typeof PAGE_IDS)[number]

export const isPageId = (value: string | undefined): value is PageId =>
  (PAGE_IDS as readonly (string | undefined)[]).includes(value)

/** Settings pages that joined another (settings check, founder
 * 2026-10-19): their old addresses open the new place. */
export const MOVED: Record<string, string> = {
  telegram: '/dashboard/settings/orders',
  link: '/dashboard/links',
}

type Section = {
  title: (s: Messages['settings']) => string
  hint?: (s: Messages['settings']) => string
  /** What this page saves: only its own part of the store (PATCH). */
  body: (form: Form) => Record<string, unknown>
  /** Fields the server may name in an error; their message shows by the input. */
  fields: (form: Form) => string[]
}

export const SECTIONS: Record<SectionId, Section> = {
  shop: {
    title: (s) => s.store,
    body: (form) => ({
      name: form.name.trim(),
      description: form.description.trim() || null,
      logo_url: form.logo_url,
      cover_url: form.cover_url,
      color: form.color,
      currency: form.currency,
    }),
    fields: () => ['name', 'description', 'currency', 'logo_url', 'cover_url', 'color'],
  },
  // Orders and Alerts on one page (settings check, founder 2026-10-19).
  // Connecting Telegram saves at once; Save is for the switches and the
  // low-stock level. Export orders is its own page again (test list #17).
  orders: {
    title: (s) => s.ordersAndAlerts,
    body: (form) => ({
      order_confirmation_mode: form.order_confirmation_mode,
      orders_paused: form.orders_paused,
      orders_resume_on: (form.orders_paused && form.orders_resume_on) || null,
      low_stock_alert: Number(form.low_stock_alert),
    }),
    fields: () => ['orders_resume_on', 'low_stock_alert'],
  },
  payments: {
    title: (s) => s.payments,
    body: (form) => ({ payment_settings: form.payment_settings }),
    fields: () => [
      'payment_settings',
      'payment_settings.bank_transfer.bank_name',
      'payment_settings.bank_transfer.account_name',
      'payment_settings.bank_transfer.account_number',
      'payment_settings.khqr.bakong_account_id',
      'payment_settings.khqr.merchant_name',
    ],
  },
  delivery: {
    title: (s) => s.delivery,
    body: ({ delivery }) => ({
      delivery_settings: {
        fee: delivery.fee || '0',
        free_from_amount: delivery.free_from_amount || null,
        free_from_items: delivery.free_from_items ? Number(delivery.free_from_items) : null,
        own_delivery: { enabled: delivery.delivers },
        couriers: delivery.delivers ? delivery.couriers.map(({ name }) => name.trim()) : [],
        pickup: { ...delivery.pickup, address: delivery.pickup.address.trim() },
      },
    }),
    fields: ({ delivery }) => [
      'delivery_settings',
      'delivery_settings.fee',
      'delivery_settings.free_from_amount',
      'delivery_settings.free_from_items',
      'delivery_settings.pickup.address',
      ...delivery.couriers.map((_, i) => `delivery_settings.couriers.${i}`),
    ],
  },
  discounts: {
    title: (s) => s.discounts,
    body: (form) => ({
      discount_settings: {
        rules: form.discounts.map(({ min_subtotal, amount_off }) => ({ min_subtotal, amount_off })),
      },
    }),
    fields: (form) =>
      form.discounts.flatMap((_, i) => [
        `discount_settings.rules.${i}.min_subtotal`,
        `discount_settings.rules.${i}.amount_off`,
      ]),
  },
  contact: {
    title: (s) => s.contact,
    body: (form) => ({
      telegram_username: form.telegram_username.trim() || null,
      messenger_username: form.messenger_username.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
    }),
    fields: () => ['telegram_username', 'messenger_username', 'contact_phone'],
  },
}
