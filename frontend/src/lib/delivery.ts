import type { Messages } from '../i18n/core.ts'
import type { StatusTone } from './orders.ts'
import type { Delivery, DeliveryMethod, DeliveryStatus } from './types.ts'

const TONES: Record<DeliveryStatus, StatusTone> = {
  not_assigned: 'neutral',
  assigned: 'blue',
  picked_up: 'blue',
  in_transit: 'blue',
  delivered: 'green',
  failed: 'red',
}

/** The seller's words for a delivery's status (02 section 7.3); pickup
 * has its own for the two it uses. */
export function deliveryBadge(
  t: Messages,
  method: DeliveryMethod,
  status: DeliveryStatus,
): { label: string; tone: StatusTone } {
  const pickup = method === 'pickup' && (status === 'not_assigned' || status === 'delivered')
  return { label: pickup ? t.status.pickup[status] : t.status.delivery[status], tone: TONES[status] }
}

/** The button for moving a delivery to each status. */
export function deliveryAction(t: Messages, delivery: Delivery, to: DeliveryStatus): string {
  const actions = t.status.deliveryAction
  if (delivery.method === 'pickup') return actions.customerCollected
  if (to === 'assigned') {
    return delivery.status === 'failed' ? actions.tryAgain : delivery.courier ? actions.bookCourier : actions.assign
  }
  return actions[to as 'picked_up' | 'in_transit' | 'delivered' | 'failed']
}
