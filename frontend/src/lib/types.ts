// Mirrors the backend's Pydantic response models. Money arrives as a
// decimal string (e.g. "12.50") to avoid float rounding.

export type Currency = 'USD' | 'KHR'
export type ProductStatus = 'active' | 'inactive'

export type Store = {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  currency: Currency
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
