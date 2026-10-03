import type { StatusTone } from './orders.ts'
import type { DeliveryMethod, DeliveryStatus } from './types.ts'

/** The seller's words for each delivery status (02 section 7.3). */
const LABELS: Record<DeliveryStatus, string> = {
  not_assigned: 'Not assigned',
  assigned: 'Assigned',
  picked_up: 'Picked up',
  in_transit: 'On the way',
  delivered: 'Delivered',
  failed: 'Delivery failed',
}

// Pickup only has these two.
const PICKUP_LABELS: Partial<Record<DeliveryStatus, string>> = {
  not_assigned: 'Not collected',
  delivered: 'Collected',
}

const TONES: Record<DeliveryStatus, StatusTone> = {
  not_assigned: 'neutral',
  assigned: 'blue',
  picked_up: 'blue',
  in_transit: 'blue',
  delivered: 'green',
  failed: 'red',
}

export function deliveryBadge(method: DeliveryMethod, status: DeliveryStatus): { label: string; tone: StatusTone } {
  return { label: (method === 'pickup' && PICKUP_LABELS[status]) || LABELS[status], tone: TONES[status] }
}

/** The button for moving a delivery to each status. */
export function deliveryAction(method: DeliveryMethod, from: DeliveryStatus, to: DeliveryStatus): string {
  if (method === 'pickup') return 'Customer collected'
  if (to === 'assigned') return from === 'failed' ? 'Try again' : 'Assign'
  return { picked_up: 'Picked up', in_transit: 'On the way', delivered: 'Delivered', failed: 'Delivery failed' }[
    to as 'picked_up' | 'in_transit' | 'delivered' | 'failed'
  ]
}
