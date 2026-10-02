import type { StatusTone } from './orders.ts'
import type { PaymentMethod, PaymentStatus } from './types.ts'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  khqr: 'KHQR',
  bank_transfer: 'Bank transfer',
  cod: 'Cash on delivery',
}

/** The order methods are offered in at checkout. */
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ['khqr', 'bank_transfer', 'cod']

/** The seller's badge for a payment. Cash on delivery isn't paid until the
 * order arrives, so it isn't flagged as unpaid before then ("COD" is what
 * sellers call it). */
export function paymentBadge(method: PaymentMethod, status: PaymentStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case 'paid':
      return { label: 'Paid', tone: 'green' }
    case 'failed':
      return { label: 'Payment failed', tone: 'red' }
    case 'refunded':
      return { label: 'Refunded', tone: 'neutral' }
    case 'pending':
      return method === 'cod' ? { label: 'COD', tone: 'neutral' } : { label: 'Unpaid', tone: 'amber' }
  }
}
