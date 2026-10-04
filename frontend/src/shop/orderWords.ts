import type { Messages } from '../i18n/core.ts'
import type { DeliveryMethod, OrderStatus, ShopOrder } from '../lib/types.ts'

// A pickup order goes through the same order statuses; its customer reads
// some of them differently.
export const stepLabel = (t: Messages, status: OrderStatus, label: string, method: DeliveryMethod) =>
  (method === 'pickup' && (status === 'ready' || status === 'shipped' || status === 'delivered')
    ? t.order.pickupStep[status]
    : null) || label

/** Where the order stands, in the customer's words. */
export const orderHeadline = (t: Messages, order: ShopOrder) =>
  stepLabel(t, order.status, t.order.headline[order.status], order.delivery_method)

/** Still to pay before it comes: KHQR or a transfer not marked paid yet. */
export const awaitsPayment = (order: ShopOrder) =>
  order.payment.status === 'pending' && order.payment.method !== 'cod'
