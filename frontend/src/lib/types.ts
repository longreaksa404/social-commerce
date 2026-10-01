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
