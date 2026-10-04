import { currentLang } from '../i18n/core.ts'
import type { OrderStatus } from './types.ts'

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

// Khmer dates are spelled out here rather than by the browser: Chrome
// builds without Khmer locale data (Android's among them) fall back to
// English. Times are 24-hour, digits as everywhere else in the app.
const KHMER_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']

const khmerDay = (date: Date) => `${date.getDate()} ${KHMER_MONTHS[date.getMonth()]}`
const khmerTime = (date: Date) => `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

/** "2:15 PM" today, "Oct 2, 2:15 PM" this year, "Oct 2, 2025" before
 * (Khmer: "14:15", "2 តុលា, 14:15", "2 តុលា 2025"). */
export function formatOrderTime(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const today = date.toDateString() === now.toDateString()
  const thisYear = date.getFullYear() === now.getFullYear()
  if (currentLang() === 'km') {
    if (today) return khmerTime(date)
    return thisYear ? `${khmerDay(date)}, ${khmerTime(date)}` : formatDate(iso)
  }
  const time = { hour: 'numeric', minute: '2-digit' } as const
  if (today) return date.toLocaleTimeString('en-US', time)
  if (thisYear) return date.toLocaleString('en-US', { month: 'short', day: 'numeric', ...time })
  return formatDate(iso)
}

/** "Oct 2, 2026" (Khmer: "2 តុលា 2026"). */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (currentLang() === 'km') return `${khmerDay(date)} ${date.getFullYear()}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Stored numbers are digits only ("012345678"); shown as "012 345 678". */
export function formatPhone(phone: string): string {
  if (/^0\d{8}$/.test(phone)) return phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  if (/^0\d{9}$/.test(phone)) return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  return phone
}
