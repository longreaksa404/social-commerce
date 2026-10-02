import { useQueries } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { toCents } from '../lib/money.ts'
import { isNotFound, shopProductQuery } from './queries.ts'

/** One product, or one option of it, in the cart. Carries what's needed to
 * show the cart without a request; price and stock are checked again on the
 * cart and checkout pages (useCheckedCart) and by the server. */
export type CartLine = {
  productId: string
  variantId: string | null
  quantity: number
  productSlug: string
  name: string
  variantName: string | null
  price: string
  imageUrl: string | null
}

/** The server takes at most 99 of one item per order. */
export const MAX_QUANTITY = 99

// Each shop has its own cart, kept on this device (no server cart before
// checkout, 03_DEVELOPMENT.md Phase 3). Snapshots are cached per shop so
// useSyncExternalStore sees the same array until something changes.
const storageKey = (shop: string) => `sc.cart.${shop}`
const snapshots = new Map<string, CartLine[]>()
const listeners = new Set<() => void>()

function isLine(value: unknown): value is CartLine {
  const line = value as Partial<CartLine> | null
  return (
    typeof line?.productId === 'string' &&
    typeof line.productSlug === 'string' &&
    typeof line.name === 'string' &&
    typeof line.price === 'string' &&
    Number.isInteger(line.quantity) &&
    (line.quantity ?? 0) > 0
  )
}

function read(shop: string): CartLine[] {
  let lines = snapshots.get(shop)
  if (!lines) {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey(shop)) ?? '[]')
      lines = Array.isArray(stored) ? stored.filter(isLine) : []
    } catch {
      lines = []
    }
    snapshots.set(shop, lines)
  }
  return lines
}

function write(shop: string, lines: CartLine[]) {
  snapshots.set(shop, lines)
  try {
    if (lines.length) localStorage.setItem(storageKey(shop), JSON.stringify(lines))
    else localStorage.removeItem(storageKey(shop))
  } catch {
    // Private mode etc.: the cart lasts until the tab is closed.
  }
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// A cart changed in another tab.
window.addEventListener('storage', (event) => {
  if (event.key === null || event.key.startsWith('sc.cart.')) {
    snapshots.clear()
    listeners.forEach((notify) => notify())
  }
})

const matches = (line: CartLine, productId: string, variantId: string | null) =>
  line.productId === productId && line.variantId === variantId

export function useCart(shop: string) {
  const lines = useSyncExternalStore(subscribe, () => read(shop))
  const change = (productId: string, variantId: string | null, edit: (line: CartLine) => CartLine | null) =>
    write(
      shop,
      read(shop).flatMap((line) => {
        if (!matches(line, productId, variantId)) return [line]
        const edited = edit(line)
        return edited ? [edited] : []
      }),
    )

  return {
    lines,
    /** Units, not lines. */
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    quantityOf: (productId: string, variantId: string | null) =>
      lines.find((line) => matches(line, productId, variantId))?.quantity ?? 0,
    /** Adds to the line if it's already there (and refreshes its copy). */
    add(line: CartLine) {
      const existing = read(shop).find((l) => matches(l, line.productId, line.variantId))
      if (!existing) return write(shop, [...read(shop), line])
      change(line.productId, line.variantId, () => ({
        ...line,
        quantity: Math.min(MAX_QUANTITY, existing.quantity + line.quantity),
      }))
    },
    setQuantity: (productId: string, variantId: string | null, quantity: number) =>
      change(productId, variantId, (line) => ({ ...line, quantity })),
    remove: (productId: string, variantId: string | null) => change(productId, variantId, () => null),
    clear: () => write(shop, []),
  }
}

export type CheckedLine = CartLine & {
  /** Why it can't be ordered as it is, or null. */
  problem: string | null
  /** In stock now, once known. */
  available: number | null
}

/**
 * The cart with each line's current name, price, and stock from the shop.
 * Reuses (and refreshes) the product page's cached data. The server checks
 * all of this again when the order is placed.
 */
export function useCheckedCart(shop: string, lines: CartLine[]) {
  const slugs = [...new Set(lines.map((line) => line.productSlug))]
  const results = useQueries({
    queries: slugs.map((slug) => ({ ...shopProductQuery(shop, slug), staleTime: 0 })),
  })
  const bySlug = new Map(slugs.map((slug, i) => [slug, results[i]]))

  const checked = lines.map((line): CheckedLine => {
    const result = bySlug.get(line.productSlug)
    const product = result?.data
    const gone = { ...line, problem: 'No longer available', available: 0 }
    if (!product) return isNotFound(result?.error) ? gone : { ...line, problem: null, available: null }
    if (product.id !== line.productId) return gone

    const variant = product.has_variants ? product.variants.find((v) => v.id === line.variantId) : null
    if (product.has_variants ? !variant : line.variantId !== null) return gone
    const stock = variant ? variant.stock_quantity : (product.stock_quantity ?? 0)
    return {
      ...line,
      name: product.name,
      variantName: variant?.name ?? null,
      price: variant?.price ?? product.price,
      imageUrl: product.image_urls[0] ?? null,
      available: stock,
      problem: stock <= 0 ? 'Sold out' : line.quantity > stock ? `Only ${stock} left` : null,
    }
  })

  const loading = results.some((r) => r.isPending)
  const error = results.find((r) => r.error && !isNotFound(r.error))?.error ?? null
  return {
    lines: checked,
    loading,
    error,
    refetch: () => Promise.all(results.map((r) => r.refetch())),
    totalCents: checked.reduce((sum, line) => sum + toCents(line.price) * line.quantity, 0),
    /** Everything checked and orderable as it is. */
    ready: !loading && !error && checked.length > 0 && checked.every((line) => !line.problem),
  }
}
