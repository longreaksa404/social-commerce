import type { Order, OrderStatus } from '../../lib/types.ts'

/** Rejected or cancelled: nothing is left to do. */
export const CLOSED = new Set<OrderStatus>(['rejected', 'cancelled'])

export type NextStep = 'accept' | 'markPaid' | 'send' | 'deliver' | 'complete'

/** The one thing waiting on the seller (founder's pick 1A, 2026-10-15):
 * its row on the order is shaded with the dark button, and on phones that
 * button is pinned at the bottom once the card scrolls away. In the order
 * a seller works: accept; check a payment the customer says they made;
 * send it to a driver; deliver; complete; then a payment still to come.
 * Each button records only what it says (02 section 7). */
export function nextStep(order: Order): NextStep | null {
  const { payment, delivery } = order
  if (order.status === 'pending') return 'accept'
  if (CLOSED.has(order.status) || order.status === 'completed') return null
  const payable = payment.method !== 'cod' && payment.next_statuses.includes('paid')
  if (payable && payment.claimed_at) return 'markPaid'
  if (delivery.method !== 'pickup' && delivery.next_statuses.includes('assigned')) return 'send'
  if (delivery.next_statuses.includes('delivered')) return 'deliver'
  if (order.next_statuses.includes('completed')) return 'complete'
  if (payable) return 'markPaid'
  return null
}

/** Cash on delivery still to be recorded: delivering it can record both
 * at once ("Delivered, cash received"). */
export function cashDue(order: Order): boolean {
  return order.payment.method === 'cod' && order.payment.next_statuses.includes('paid')
}
