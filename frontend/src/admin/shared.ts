import { formatPhone } from '../lib/orders.ts'
import type { AdminSeller } from '../lib/types.ts'


/** A calendar day from the API with its year: "Nov 30, 2026" ("" for none:
 * a shop in setup has no paid-until date). */
export const day = (ymd: string | null) =>
  ymd ? new Date(`${ymd}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

/** A moment from the API, in English: "Oct 14, 2026". */
export const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** How long ago, roughly: "5 min ago", "3 hours ago", "2 days ago", then the date. */
export function ago(iso: string, now = Date.now()) {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  const days = Math.round(hours / 24)
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`
  return date(iso)
}

/** A calendar day from the API, short and in English (the admin is
 * English only): "Fri 31 Oct". */
export const shortDay = (ymd: string) =>
  new Date(`${ymd}T00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** "Sokha Chan" → "SC", "Pisey" → "P". */
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? '')
    .join('')
}

/** A login's phone, or its email for older accounts. */
export const loginOf = (person: AdminSeller) => (person.phone ? formatPhone(person.phone) : (person.email ?? ''))
