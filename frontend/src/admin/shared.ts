import { useEffect, useState } from 'react'
import { formatPhone } from '../lib/orders.ts'
import type { AdminSeller } from '../lib/types.ts'

// Every date and time in the admin reads in Phnom Penh time, as the API
// counts its days and months, whatever the device's own time zone. A
// calendar day from the API ("2026-11-30") has no clock: it is read and
// written in UTC so no zone can move it to the day before or after.
const PHNOM_PENH = 'Asia/Phnom_Penh'
const calendar = (ymd: string) => new Date(`${ymd}T00:00:00Z`)

/** A calendar day from the API with its year: "Nov 30, 2026" ("" for none:
 * a shop in setup has no paid-until date). */
export const day = (ymd: string | null) =>
  ymd ? calendar(ymd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : ''

/** A calendar day from the API, short and in English (the admin is
 * English only): "Fri 31 Oct". */
export const shortDay = (ymd: string) =>
  calendar(ymd).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

/** "31 Oct", or "31 Oct 2025" outside the given year. */
export const dayMonth = (ymd: string, thisYear?: string) =>
  calendar(ymd).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: thisYear && ymd.slice(0, 4) !== thisYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  })

/** "2026-11" → "November 2026"; `short`: "Nov", or "Nov 26" with the year. */
export const monthName = (ym: string, style: 'long' | 'short' | 'shortYear' = 'long') =>
  calendar(`${ym}-01`).toLocaleDateString('en-GB', {
    month: style === 'long' ? 'long' : 'short',
    year: style === 'long' ? 'numeric' : style === 'shortYear' ? '2-digit' : undefined,
    timeZone: 'UTC',
  })

/** The calendar day after (or `by` days after) "2026-11-30". */
export function addDays(ymd: string, by = 1) {
  const next = calendar(ymd)
  next.setUTCDate(next.getUTCDate() + by)
  return next.toISOString().slice(0, 10)
}

/** The Phnom Penh day of a moment from the API: "2026-11-06". */
export const ppDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: PHNOM_PENH }).format(new Date(iso))

/** A moment from the API, in English: "Oct 14, 2026". */
export const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: PHNOM_PENH })

/** A moment's time of day in Phnom Penh: "14:05". */
export const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: PHNOM_PENH })

/** A moment with its day and time in Phnom Penh: "Fri 6 Nov, 14:05". */
export const dayTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: PHNOM_PENH })

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

/** What was typed, a moment after the typing stops (a search). */
export function useSettled(value: string, ms = 250) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return settled
}
