import type { Order, OrderStatus } from '../../lib/types.ts'

/** Rejected or cancelled: nothing is left to do. */
export const CLOSED = new Set<OrderStatus>(['rejected', 'cancelled'])

export type NextStep = 'accept' | 'retryPayment' | 'markPaid' | 'send' | 'deliver' | 'complete'

/** KHQR or a bank transfer not marked paid yet. */
export const unpaidTransfer = (order: Order) =>
  order.payment.method !== 'cod' && order.payment.next_statuses.includes('paid')

/** The one thing waiting on the seller (founder's pick 1A, 2026-10-15):
 * its row on the order is shaded with the dark button, and on phones that
 * button is pinned at the bottom once the card scrolls away. In the order
 * a seller works: accept; a payment that failed (ask again, or cancel);
 * check a KHQR or bank payment before the parcel goes out (UX check #7,
 * 2026-10-17: before, sending came first); send it to a driver; deliver;
 * complete. The delivery's buttons stay, so a seller who trusts the
 * customer can still send it unpaid. Each button records only what it
 * says (02 section 7). */
export function nextStep(order: Order): NextStep | null {
  const { payment, delivery } = order
  if (order.status === 'pending') return 'accept'
  if (CLOSED.has(order.status) || order.status === 'completed') return null
  if (payment.status === 'failed') return 'retryPayment'
  if (unpaidTransfer(order)) return 'markPaid'
  if (delivery.method !== 'pickup' && delivery.next_statuses.includes('assigned')) return 'send'
  if (delivery.next_statuses.includes('delivered')) return 'deliver'
  if (order.next_statuses.includes('completed')) return 'complete'
  return null
}

/** Cash on delivery still to be recorded: delivering it can record both
 * at once ("Delivered, cash received"). */
export function cashDue(order: Order): boolean {
  return order.payment.method === 'cod' && order.payment.next_statuses.includes('paid')
}
