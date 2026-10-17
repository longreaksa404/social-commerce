import type { Messages } from '../i18n/core.ts'
import type { DeliveryMethod, DeliveryStatus, ShopOrder } from '../lib/types.ts'

/** The four steps a customer follows (UX check #2, 2026-10-17). The first
 * two come from the order, the last two from its delivery, so a parcel
 * the seller marked delivered reads Delivered even before they complete
 * the order. Nothing here changes a status: the page shows each state
 * machine's own status (CLAUDE.md hard rule 2). */
export const TRACK_STEPS = ['placed', 'confirmed', 'onTheWay', 'delivered'] as const
export type TrackStep = (typeof TRACK_STEPS)[number]

const WITH_DRIVER = new Set<DeliveryStatus>(['assigned', 'picked_up', 'in_transit'])

export function trackStep(order: ShopOrder): TrackStep {
  const { status, delivery } = order
  if (status === 'delivered' || status === 'completed' || delivery.status === 'delivered') return 'delivered'
  if (status === 'pending') return 'placed'
  if (status === 'shipped' || WITH_DRIVER.has(delivery.status)) return 'onTheWay'
  if (order.delivery_method === 'pickup' && status === 'ready') return 'onTheWay'
  return 'confirmed'
}

/** A step's name under the bar; a pickup order is collected, not delivered. */
export const trackLabel = (t: Messages, step: TrackStep, method: DeliveryMethod) =>
  method === 'pickup' && (step === 'onTheWay' || step === 'delivered') ? t.order.track.pickup[step] : t.order.track[step]

/** Where the order stands, in the customer's words. */
export function orderHeadline(t: Messages, order: ShopOrder): string {
  const { status } = order
  const h = t.order.headline
  if (status === 'rejected' || status === 'cancelled') return h[status]
  if (order.delivery.status === 'failed') return h.deliveryFailed
  const pickup = order.delivery_method === 'pickup'
  switch (trackStep(order)) {
    case 'placed':
      return h.pending
    case 'confirmed':
      // The seller's optional steps, for those who use them.
      return status === 'processing' || status === 'ready' ? h[status] : h.accepted
    case 'onTheWay':
      return pickup ? t.order.pickupStep[status === 'shipped' ? 'shipped' : 'ready'] : h.shipped
    case 'delivered':
      return pickup ? t.order.pickupStep.delivered : h.delivered
  }
}

/** Still to pay before it comes: KHQR or a transfer not marked paid yet. */
export const awaitsPayment = (order: ShopOrder) =>
  order.payment.status === 'pending' && order.payment.method !== 'cod'
