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

export type DeliveryArea = { name: string; fee: string }

/** How the shop gets orders to customers. Without areas, delivery is free. */
export type DeliverySettings = {
  seller_delivery: {
    enabled: boolean
    areas: DeliveryArea[]
    /** Free delivery once the items come to this much (before discounts). */
    free_from_amount: string | null
    /** ... or to this many units. */
    free_from_items: number | null
  }
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
  delivery_settings: DeliverySettings
  discount_settings: { rules: DiscountRule[] }
  created_at: string
}

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
  /** What checkout offers; null = not offered. */
  delivery: {
    seller_delivery: Omit<DeliverySettings['seller_delivery'], 'enabled'> | null
    pickup: { address: string } | null
  }
  discounts: DiscountRule[]
}

export type ShopProductCard = {
  id: string
  name: string
  slug: string
  image_url: string | null
  price_min: string
  price_max: string
  in_stock: boolean
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
}

/** An order's delivery as its customer sees it. */
export type ShopDelivery = {
  method: DeliveryMethod
  status: DeliveryStatus
  area_name: string | null
  /** Where to collect a pickup order, while the order is on. */
  pickup_address: string | null
}

/** An order's delivery as the seller sees it. */
export type Delivery = {
  method: DeliveryMethod
  status: DeliveryStatus
  area_name: string | null
  assignee_note: string | null
  updated_at: string
  /** Where the seller can move it now; the server applies the rules. */
  next_statuses: DeliveryStatus[]
}

/** What a customer sees: the confirmation page and order tracking. */
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
  items: OrderItem[]
  payment: ShopPayment
  delivery: ShopDelivery
}

export type Order = Omit<ShopOrder, 'payment' | 'delivery'> & {
  payment: Payment
  delivery: Delivery
  updated_at: string
  delivery_address: string | null
  notes: string | null
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
