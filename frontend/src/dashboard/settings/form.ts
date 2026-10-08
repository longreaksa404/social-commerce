import type { Messages } from '../../i18n/core.ts'
import { formatPhone } from '../../lib/orders.ts'
import type { Currency, DeliverySettings, OrderConfirmationMode, PaymentSettings, Store } from '../../lib/types.ts'

// Rows the seller can add and remove carry a key for React; inputs hold
// strings, turned back into the API's shape by each section's body.
export type CourierRow = { key: string; name: string }
export type RuleRow = { key: string; min_subtotal: string; amount_off: string }
export type DeliveryForm = {
  fee: string
  free_from_amount: string
  free_from_items: string
  own: boolean
  couriers: CourierRow[]
  pickup: DeliverySettings['pickup']
}

export type Form = {
  name: string
  slug: string
  description: string
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
    slug: store.slug,
    description: store.description ?? '',
    currency: store.currency,
    order_confirmation_mode: store.order_confirmation_mode,
    orders_paused: store.orders_paused,
    orders_resume_on: store.orders_resume_on ?? '',
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
    messenger_username: store.messenger_username ?? '',
    contact_phone: store.contact_phone ? formatPhone(store.contact_phone) : '',
    low_stock_alert: String(store.low_stock_alert),
  }
}

export const SECTION_IDS = ['shop', 'orders', 'payments', 'delivery', 'discounts', 'contact', 'telegram', 'link'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export const isSectionId = (value: string | undefined): value is SectionId =>
  (SECTION_IDS as readonly (string | undefined)[]).includes(value)

/** Settings pages that aren't part of the store's settings: each has its
 * own form and endpoint (SettingsSection's PAGES). */
export const PAGE_IDS = ['account', 'staff', 'export', 'close'] as const
export type PageId = (typeof PAGE_IDS)[number]

export const isPageId = (value: string | undefined): value is PageId =>
  (PAGE_IDS as readonly (string | undefined)[]).includes(value)

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
      currency: form.currency,
    }),
    fields: () => ['name', 'description', 'currency'],
  },
  orders: {
    title: (s) => s.orders,
    body: (form) => ({
      order_confirmation_mode: form.order_confirmation_mode,
      orders_paused: form.orders_paused,
      orders_resume_on: (form.orders_paused && form.orders_resume_on) || null,
    }),
    fields: () => ['orders_resume_on'],
  },
  payments: {
    title: (s) => s.payments,
    hint: (s) => s.paymentsHint,
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
    hint: (s) => s.deliveryHint,
    body: ({ delivery }) => ({
      delivery_settings: {
        fee: delivery.fee || '0',
        free_from_amount: delivery.free_from_amount || null,
        free_from_items: delivery.free_from_items ? Number(delivery.free_from_items) : null,
        own_delivery: { enabled: delivery.own },
        couriers: delivery.couriers.map(({ name }) => name.trim()),
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
    hint: (s) => s.discountsHint,
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
    hint: (s) => s.contactHint,
    body: (form) => ({
      telegram_username: form.telegram_username.trim() || null,
      messenger_username: form.messenger_username.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
    }),
    fields: () => ['telegram_username', 'messenger_username', 'contact_phone'],
  },
  // Its address stays /settings/telegram: the bot's messages point here.
  telegram: {
    title: (s) => s.alerts,
    hint: (s) => s.alertsHint,
    // Connecting and disconnecting Telegram save at once; Save is for the level.
    body: (form) => ({ low_stock_alert: Number(form.low_stock_alert) }),
    fields: () => ['low_stock_alert'],
  },
  link: {
    title: (s) => s.shopLink,
    hint: (s) => s.shopLinkHint,
    body: (form) => ({ slug: form.slug }),
    fields: () => ['slug'],
  },
}
