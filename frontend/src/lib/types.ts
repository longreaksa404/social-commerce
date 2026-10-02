// Mirrors the backend's Pydantic response models. Money arrives as a
// decimal string (e.g. "12.50") to avoid float rounding.

export type Currency = 'USD' | 'KHR'
export type ProductStatus = 'active' | 'inactive'
export type OrderConfirmationMode = 'automatic' | 'manual'

export type Store = {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  currency: Currency
  /** automatic: new orders are accepted at once; manual: they wait as pending. */
  order_confirmation_mode: OrderConfirmationMode
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

/** What a customer sees: the confirmation page and order tracking. */
export type ShopOrder = {
  id: string
  number: number
  status: OrderStatus
  created_at: string
  currency: Currency
  subtotal: string
  delivery_fee: string
  total: string
  delivery_method: 'seller_delivery' | 'pickup'
  items: OrderItem[]
}

export type Order = ShopOrder & {
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
}

export type OrderList = {
  orders: OrderSummary[]
  has_more: boolean
  /** Per status, ignoring the status filter. */
  counts: Record<OrderStatus, number>
}
