import { formatPriceRange } from './money.ts'
import type { Currency, Product } from './types.ts'

/** Units available: the product's own stock, or the sum over variants. */
export function totalStock(product: Product): number {
  return product.has_variants
    ? product.variants.reduce((sum, v) => sum + v.stock_quantity, 0)
    : (product.stock_quantity ?? 0)
}

/** "$8.00", or a range when variants have different prices. */
export function priceLabel(product: Product, currency: Currency): string {
  const prices = product.has_variants
    ? product.variants.map((v) => Number(v.price_override ?? product.price))
    : [Number(product.price)]
  return formatPriceRange(Math.min(...prices), Math.max(...prices), currency)
}
