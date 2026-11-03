import { formatPriceRange } from './money.ts'
import type { Currency, Product } from './types.ts'

/** Units available: the product's own stock, or the sum over variants. */
export function totalStock(product: Product): number {
  return product.has_variants
    ? product.variants.reduce((sum, v) => sum + v.stock_quantity, 0)
    : (product.stock_quantity ?? 0)
}

/** The lowest and highest price over its variants (or its one price). */
export function priceRange(product: Product): [number, number] {
  const prices = product.has_variants
    ? product.variants.map((v) => Number(v.price_override ?? product.price))
    : [Number(product.price)]
  return [Math.min(...prices), Math.max(...prices)]
}

/** "$8.00", or a range when variants have different prices. */
export function priceLabel(product: Product, currency: Currency): string {
  return formatPriceRange(...priceRange(product), currency)
}

/** The lowest price after a sale today, when one lowers it (the seller's
 * list sends `sale_price`); null when none does. */
export function lowestSalePrice(product: Product): number | null {
  const sales = (product.has_variants ? product.variants.map((v) => v.sale_price) : [product.sale_price])
    .filter((price) => price != null)
    .map(Number)
  return sales.length > 0 ? Math.min(...sales) : null
}
