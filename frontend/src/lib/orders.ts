import { currentLang } from '../i18n/core.ts'
import type { OrderStatus } from './types.ts'

export type StatusTone = 'amber' | 'blue' | 'green' | 'red' | 'neutral'

// New orders in blue, so they don't look like the amber "not paid" beside
// them; orders under way stay quiet (redesign 2026-10-07).
export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  pending: 'blue',
  accepted: 'neutral',
  processing: 'neutral',
  ready: 'neutral',
  shipped: 'neutral',
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

/** "2:15 PM" (Khmer "14:15"): the time only, under a day heading. */
export function formatClock(iso: string): string {
  const date = new Date(iso)
  if (currentLang() === 'km') return khmerTime(date)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** A day heading: "Mon, Oct 5" this year, "Oct 5, 2025" before (Khmer:
 * "5 តុលា", "5 តុលា 2025"); Today and Yesterday are the caller's. */
export function formatDay(iso: string, now = new Date()): string {
  const date = new Date(iso)
  if (date.getFullYear() !== now.getFullYear()) return formatDate(iso)
  if (currentLang() === 'km') return khmerDay(date)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

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

/** A calendar day from the API ("2027-04-17", no time): "Sat, Apr 17"
 * (Khmer "17 មេសា"). Read as a local date: `new Date("2027-04-17")` is UTC
 * midnight, the day before in some places. */
export function formatCalendarDay(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (currentLang() === 'km') return khmerDay(date)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "2027-04-14": the date in Phnom Penh `days` from today, as the API
 * counts days (app/core/clock.py). */
export function phnomPenhDate(days = 0): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' }).format(Date.now() + days * 86_400_000)
}

/** Stored numbers are digits only ("012345678"); shown as "012 345 678". */
export function formatPhone(phone: string): string {
  if (/^0\d{8}$/.test(phone)) return phone.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  if (/^0\d{9}$/.test(phone)) return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  return phone
}
