import { toCents } from './money.ts'
import type { DeliveryMethod, DiscountRule, ShopStore } from './types.ts'

// What an order costs, in whole cents: the same math as the server's
// app/services/pricing.py, which refuses the order if the totals differ.
// A change there must be made here too.

/** The biggest discount the items reach (they never add up), and never
 * more than the items themselves. */
export function discountCents(subtotal: number, rules: DiscountRule[]): number {
  const reached = rules.filter((r) => subtotal >= toCents(r.min_subtotal)).map((r) => toCents(r.amount_off))
  return Math.min(Math.max(0, ...reached), subtotal)
}

/** The shop's one delivery fee, whoever delivers. Pickup is free, and so
 * is delivery when the items come to enough (before any discount) or
 * there are enough of them. */
export function deliveryFeeCents(
  method: DeliveryMethod,
  subtotal: number,
  itemCount: number,
  delivery: ShopStore['delivery'],
): number {
  if (method === 'pickup') return 0
  if (delivery.free_from_amount !== null && subtotal >= toCents(delivery.free_from_amount)) return 0
  if (delivery.free_from_items !== null && itemCount >= delivery.free_from_items) return 0
  return toCents(delivery.fee)
}

/** The next discount the customer could reach, for a nudge in the cart. */
export function nextDiscount(subtotal: number, rules: DiscountRule[]): { missing: number; off: number } | null {
  const current = discountCents(subtotal, rules)
  const better = rules
    .map((r) => ({ missing: toCents(r.min_subtotal) - subtotal, off: toCents(r.amount_off) }))
    .filter((r) => r.missing > 0 && r.off > current)
    .sort((a, b) => a.missing - b.missing)
  return better[0] ?? null
}

export type FreeDeliveryNudge =
  | { kind: 'free' }
  | { kind: 'amount'; missing: number; progress: number }
  | { kind: 'items'; missing: number; progress: number }

/** How close the items are to free delivery, for a nudge in the cart:
 * free already, or what's missing toward the rule the cart is closest to
 * (`progress` 0–1). Null when there's nothing to say: no fee, no rule, or
 * pickup only. */
export function freeDeliveryNudge(
  subtotal: number,
  itemCount: number,
  delivery: ShopStore['delivery'],
): FreeDeliveryNudge | null {
  const delivers = delivery.own_delivery || delivery.couriers.length > 0
  const amount = delivery.free_from_amount === null ? null : toCents(delivery.free_from_amount)
  const items = delivery.free_from_items
  if (!delivers || toCents(delivery.fee) === 0 || (amount === null && items === null)) return null
  if (deliveryFeeCents('seller_delivery', subtotal, itemCount, delivery) === 0) return { kind: 'free' }
  const byAmount = amount === null ? -1 : subtotal / amount
  const byItems = items === null ? -1 : itemCount / items
  return byAmount >= byItems
    ? { kind: 'amount', missing: amount! - subtotal, progress: byAmount }
    : { kind: 'items', missing: items! - itemCount, progress: byItems }
}
