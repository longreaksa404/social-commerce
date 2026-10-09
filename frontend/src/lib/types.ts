// Mirrors the backend's Pydantic response models. Money arrives as a
// decimal string (e.g. "12.50") to avoid float rounding.

export type Currency = 'USD' | 'KHR'
export type ProductStatus = 'active' | 'inactive'
export type OrderConfirmationMode = 'automatic' | 'manual'
export type PaymentMethod = 'cod' | 'bank_transfer' | 'khqr'
/** 02_TECHNICAL.md section 7.2. */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type DeliveryMethod = 'seller_delivery' | 'pickup'
/** 02_TECHNICAL.md section 7.3. Pickup goes straight to delivered. */
export type DeliveryStatus = 'not_assigned' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed'

/** Which ways to pay the shop takes. A method can only be on with its
 * details filled in; details are kept while it's off. */
export type PaymentSettings = {
  cod: { enabled: boolean }
  bank_transfer: { enabled: boolean; bank_name: string; account_name: string; account_number: string }
  khqr: { enabled: boolean; bakong_account_id: string; merchant_name: string }
}

/** How the shop gets orders to customers: one fee for any delivery
 * (its own or a courier), free from an amount or a number of items. */
export type DeliverySettings = {
  fee: string
  /** Free delivery once the items come to this much (before discounts). */
  free_from_amount: string | null
  /** ... or to this many units. */
  free_from_items: number | null
  own_delivery: { enabled: boolean }
  /** e.g. "J&T Express", "VET Express": the customer picks one. */
  couriers: string[]
  pickup: { enabled: boolean; address: string }
}

/** e.g. 5.00 off once the items come to 40.00; the biggest one reached applies. */
export type DiscountRule = { min_subtotal: string; amount_off: string }

export type Store = {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  currency: Currency
  /** automatic: new orders are accepted at once; manual: they wait as pending. */
  order_confirmation_mode: OrderConfirmationMode
  payment_settings: PaymentSettings
  /** False until Settings → Payments is saved once (the setup checklist). */
  payment_set_up: boolean
  delivery_settings: DeliverySettings
  /** False until Settings → Delivery is saved once: until then delivery
   * is free for customers (the defaults), so the dashboard says so. */
  delivery_set_up: boolean
  discount_settings: { rules: DiscountRule[] }
  /** The seller's own Telegram account, no @: "Ask seller" opens it. */
  telegram_username: string | null
  /** A number customers can call ("012345678") and a Facebook page's
   * username for Messenger (Settings → Contact); null hides each. */
  contact_phone: string | null
  messenger_username: string | null
  /** Not taking orders right now (Settings → Orders); false again once
   * orders_resume_on has come. */
  orders_paused: boolean
  /** The first day orders open again ("2027-04-17"); null: until turned back on. */
  orders_resume_on: string | null
  /** Warn the seller (bell, Telegram) when an order leaves this many or
   * fewer of a product; the seller's product list uses it too. */
  low_stock_alert: number
  /** Order alerts go to a Telegram chat. */
  telegram_connected: boolean
  /** False until the platform's bot is set up. */
  telegram_bot_available: boolean
  created_at: string
}

export type TelegramLink = { url: string; expires_at: string }

/** owner: everything; staff: everything but Settings (founder's choice
 * 2026-10-08). */
export type Role = 'owner' | 'staff'

/** The logged-in person's own details (Settings → Your account). */
export type Account = { email: string; full_name: string; phone: string; role: Role }

/** A helper the owner added (Settings → Staff). */
export type StaffMember = { id: string; full_name: string; email: string; phone: string; created_at: string }

export type Category = {
  id: string
  name: string
  slug: string
  product_count: number
  created_at: string
}

export type Variant = {
  id: string
  name: string
  sku: string | null
  price_override: string | null
  stock_quantity: number
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  category_id: string | null
  price: string
  image_urls: string[]
  status: ProductStatus
  has_variants: boolean
  stock_quantity: number | null
  variants: Variant[]
  created_at: string
  updated_at: string
}

export type ImageUpload = {
  upload_url: string
  public_url: string
  headers: Record<string, string>
  /** Where the small copy goes (as image/jpeg), when one was asked for. */
  thumbnail_upload_url: string | null
}

// Public storefront (/shop/{slug}): only what customers may see.

export type ShopCategoryRef = { name: string; slug: string }

export type ShopStore = {
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  currency: Currency
  /** Only categories with at least one product on sale. */
  categories: (ShopCategoryRef & { product_count: number })[]
  /** For checkout; the details come with the order. */
  payment_methods: PaymentMethod[]
  /** What checkout offers. */
  delivery: Omit<DeliverySettings, 'own_delivery' | 'pickup'> & {
    own_delivery: boolean
    /** null = no pickup. */
    pickup: { address: string } | null
  }
  discounts: DiscountRule[]
  /** null = no "Ask seller" button. */
  telegram_username: string | null
  /** Call and Messenger buttons; null hides each. */
  contact_phone: string | null
  messenger_username: string | null
  /** Not taking orders now: browsing works, checkout is refused. */
  orders_paused: boolean
  /** The day it opens again, if the seller set one. */
  orders_resume_on: string | null
}

export type ShopProductCard = {
  id: string
  name: string
  slug: string
  image_url: string | null
  price_min: string
  price_max: string
  in_stock: boolean
  has_variants: boolean
  /** null when has_variants: stock is per variant. */
  stock_quantity: number | null
}

export type ShopVariant = { id: string; name: string; price: string; stock_quantity: number }

export type ShopProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  price: string
  image_urls: string[]
  has_variants: boolean
  /** null when has_variants: stock is per variant. */
  stock_quantity: number | null
  variants: ShopVariant[]
  category: ShopCategoryRef | null
}

export type ShopCategoryPage = { category: ShopCategoryRef; products: ShopProductCard[] }

// Orders (02_TECHNICAL.md section 7.1 for the statuses).

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'processing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export type OrderItem = {
  product_id: string
  /** null once the seller deletes the variant; the name stays. */
  variant_id: string | null
  product_name: string
  variant_name: string | null
  unit_price: string
  quantity: number
  line_total: string
}

export type BankAccount = { bank_name: string; account_name: string; account_number: string }

/** An order's payment as its customer sees it. */
export type ShopPayment = {
  method: PaymentMethod
  status: PaymentStatus
  amount: string
  /** How to pay: only while it's unpaid and the order is still on, and
   * only for the chosen method. Both null for cash on delivery. */
  bank_account: BankAccount | null
  khqr: { code: string; merchant_name: string } | null
  /** When they last tapped "I've paid", if ever. */
  claimed_at: string | null
}

/** An order's payment as the seller sees it. */
export type Payment = {
  method: PaymentMethod
  status: PaymentStatus
  amount: string
  reference: string | null
  paid_at: string | null
  /** What the seller can record now; the server applies the rules. */
  next_statuses: PaymentStatus[]
  /** When the customer last tapped "I've paid", if ever; still to check. */
  claimed_at: string | null
}

/** An order's delivery as its customer sees it. */
export type ShopDelivery = {
  method: DeliveryMethod
  status: DeliveryStatus
  /** null = the shop's own delivery (or pickup). */
  courier: string | null
  /** Where to collect a pickup order, while the order is on. */
  pickup_address: string | null
}

/** An order's delivery as the seller sees it. */
export type Delivery = {
  method: DeliveryMethod
  status: DeliveryStatus
  courier: string | null
  assignee_note: string | null
  updated_at: string
  /** Where the seller can move it now; the server applies the rules. */
  next_statuses: DeliveryStatus[]
}

/** What a customer sees: the confirmation page and order tracking. */
/** Each line also has the product's photo now (not a snapshot). */
export type ShopOrderItem = OrderItem & { image_url: string | null }

export type ShopOrder = {
  id: string
  number: number
  status: OrderStatus
  created_at: string
  currency: Currency
  subtotal: string
  discount: string
  delivery_fee: string
  /** subtotal - discount + delivery_fee */
  total: string
  delivery_method: DeliveryMethod
  items: ShopOrderItem[]
  payment: ShopPayment
  delivery: ShopDelivery
}

export type Order = Omit<ShopOrder, 'payment' | 'delivery'> & {
  payment: Payment
  delivery: Delivery
  updated_at: string
  delivery_address: string | null
  /** The customer's GPS location, if they shared it. */
  delivery_lat: string | null
  delivery_lng: string | null
  /** For the driver, e.g. "blue gate, next to the pagoda". */
  delivery_address_note: string | null
  notes: string | null
  /** Where the shop link it came through was posted, e.g. "tiktok". */
  source: string | null
  customer: { id: string; name: string; phone: string; address: string | null }
  /** Where the seller can move the order now; the server applies the rules. */
  next_statuses: OrderStatus[]
}

export type OrderSummary = {
  id: string
  number: number
  status: OrderStatus
  created_at: string
  currency: Currency
  total: string
  customer_name: string
  /** Units, not lines. */
  item_count: number
  /** What the row leads with: the biggest line, how many lines, its photo now. */
  first_item_name: string
  line_count: number
  first_item_image_url: string | null
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  delivery_method: DeliveryMethod
  delivery_status: DeliveryStatus
}

export type OrderList = {
  orders: OrderSummary[]
  has_more: boolean
  /** Per status, ignoring the status filter. */
  counts: Record<OrderStatus, number>
}

// The dashboard's notifications (the bell): things the seller didn't do.

/** The order as it was placed; opening it shows where it is now. */
export type NotificationOrder = {
  id: string
  number: number
  customer_name: string
  /** Units, not lines. */
  item_count: number
  total: string
  currency: Currency
  accepted_automatically: boolean
}

/** e.g. "Red T-shirt (XL)" with 2 left; 0 = sold out. */
export type StockItem = { product_id: string; name: string; left: number }

export type SellerNotification = {
  id: string
  /** payment_claimed: the customer tapped "I've paid" (founder's pick 6B). */
  event_type: 'new_order' | 'low_stock' | 'payment_claimed'
  /** Sent back as is to mark it read (the server's microseconds matter). */
  created_at: string
  read: boolean
  /** new_order only. */
  order: NotificationOrder | null
  /** low_stock only. */
  items: StockItem[]
}

export type NotificationList = {
  notifications: SellerNotification[]
  has_more: boolean
  unread: number
}

// The seller's customers: one per phone number, made at checkout.

export type Amount = { currency: Currency; amount: string }

export type CustomerSummary = {
  id: string
  /** As typed at their latest order. */
  name: string
  phone: string
  /** Every order, rejected and cancelled ones too. */
  order_count: number
  last_order_at: string | null
  /** Their orders except rejected and cancelled ones, per currency
   * (usually one; two if the shop changed its currency). */
  spent: Amount[]
}

export type CustomerList = {
  customers: CustomerSummary[]
  has_more: boolean
  /** Matching the search, on every page. */
  total: number
}

/** A customer's page: who they are and their orders. */
export type CustomerDetail = {
  id: string
  name: string
  phone: string
  /** Their latest delivery address (each order keeps its own). */
  address: string | null
  /** Their first order. */
  created_at: string
  order_count: number
  /** As in CustomerSummary. */
  spent: Amount[]
  /** Newest first; only the latest 100 if there are more (order_count). */
  orders: OrderSummary[]
}

// Shareable links (02_TECHNICAL.md section 9)

export type LinkTarget = 'store' | 'product' | 'category'

/** A link the seller made to share in one place, with what it brought. */
export type ShareLink = {
  id: string
  target_type: LinkTarget
  /** The product or category; null for the whole shop. */
  target_id: string | null
  /** The product's or category's current name; null for the shop, or once
   * the category is deleted. */
  target_name: string | null
  /** The address to share, from the site's root; null while its page
   * doesn't open (product hidden, category deleted). */
  path: string | null
  token: string
  /** Where it's posted: one of LINK_SOURCES, or what the seller typed. */
  source: string | null
  /** The seller's own name for it. */
  campaign: string | null
  created_at: string
  view_count: number
  order_count: number
}

export type LinkStats = ShareLink & {
  /** The orders it brought, newest first (at most 100). */
  orders: OrderSummary[]
}
