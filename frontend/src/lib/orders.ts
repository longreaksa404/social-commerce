import type { OrderStatus } from './types.ts'

/** The seller's words for each order status. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'New',
  accepted: 'Accepted',
  processing: 'Preparing',
  ready: 'Ready',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export type StatusTone = 'amber' | 'blue' | 'green' | 'red' | 'neutral'

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  pending: 'amber',
  accepted: 'blue',
  processing: 'blue',
  ready: 'blue',
  shipped: 'blue',
  delivered: 'green',
  completed: 'green',
  rejected: 'red',
  cancelled: 'red',
}

/** "2:15 PM" today, "Oct 2, 2:15 PM" this year, "Oct 2, 2025" before. */
export function formatOrderTime(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const time = { hour: 'numeric', minute: '2-digit' } as const
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString(undefined, time)
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', ...time })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Stored numbers are digits only ("012345678"); shown as "012 345 678". */
export function formatPhone(phone: string): string {
  if (/^0\d{8}$/.test(phone)) return phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  if (/^0\d{9}$/.test(phone)) return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  return phone
}
