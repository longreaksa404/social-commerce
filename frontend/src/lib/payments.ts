import type { Messages } from '../i18n/core.ts'
import type { StatusTone } from './orders.ts'
import type { PaymentMethod, PaymentStatus } from './types.ts'

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
