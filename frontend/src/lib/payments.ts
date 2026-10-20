import type { Messages } from '../i18n/core.ts'
import type { StatusTone } from './orders.ts'
import type { OrderStatus, PaymentMethod, PaymentStatus } from './types.ts'

/** The order methods are offered in at checkout. */
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ['khqr', 'bank_transfer', 'cod']

/** The seller's badge for a payment. Cash on delivery isn't paid until the
 * order arrives, so it isn't flagged as unpaid before then ("COD" is what
 * sellers call it). */
export function paymentBadge(
  t: Messages,
  method: PaymentMethod,
  status: PaymentStatus,
): { label: string; tone: StatusTone } {
  const labels = t.status.paymentBadge
  switch (status) {
    case 'paid':
      return { label: labels.paid, tone: 'green' }
    case 'failed':
      return { label: labels.failed, tone: 'red' }
    case 'refunded':
      return { label: labels.refunded, tone: 'neutral' }
    case 'pending':
      return method === 'cod' ? { label: labels.cod, tone: 'neutral' } : { label: labels.unpaid, tone: 'amber' }
  }
}

/** A KHQR code works for 24 hours (02 section 10.3). A KHQR or bank order
 * still unpaid after that, with no "I've paid" from the customer, reads
 * "Not paid after 24 h" for the seller, who checks the bank app and
 * cancels or marks it paid (founder's pick 2026-10-20). Nothing changes by
 * itself: the order's status never follows the payment's (02 section 7). */
export const UNPAID_LONG_MS = 24 * 60 * 60 * 1000

export function unpaidLong(
  order: {
    status: OrderStatus
    createdAt: string
    method: PaymentMethod
    paymentStatus: PaymentStatus
    claimedAt: string | null
  },
  now = Date.now(),
): boolean {
  return (
    order.method !== 'cod' &&
    order.paymentStatus === 'pending' &&
    !order.claimedAt &&
    !['rejected', 'cancelled', 'completed'].includes(order.status) &&
    now - new Date(order.createdAt).getTime() >= UNPAID_LONG_MS
  )
}
