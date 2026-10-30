import { formatMoney } from '../lib/money.ts'
import { formatPhone } from '../lib/orders.ts'
import type { AdminLogLine } from '../lib/types.ts'

const PROVIDER: Record<string, string> = { google: 'Google', facebook: 'Facebook' }

/** "28 Nov" from "2026-11-28". */
const dayMonth = (ymd: unknown) =>
  typeof ymd === 'string' ? new Date(`${ymd}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''

const text = (value: unknown) => (typeof value === 'string' ? value : '')

/** A plan payment in words: "$9.99 month", "Free month". */
function paid(details: AdminLogLine['details']) {
  const amount = Number(details.amount ?? 0)
  return amount === 0 ? `Free ${details.period}` : `${formatMoney(amount, 'USD')} ${details.period}`
}

/** A line of the admin's log in words (founder's pick 13A, 2026-10-28):
 * what was done, then the details under it. `withShop`: name the shop
 * (the whole log), or leave it out (a shop's own Activity). */
export function logWords(line: AdminLogLine, withShop = true): { title: string; lines: string[]; warn?: string } {
  const d = line.details
  const shop = line.shop ?? 'a shop'
  const person = text(d.person) || 'a login'
  const lines: string[] = []
  let title: string
  let warn: string | undefined
  switch (line.action) {
    case 'mark_paid':
      title = d.claim ? `Found ${withShop ? `${shop}'s` : 'the'} "I've paid"` : withShop ? `Marked ${shop} paid` : 'Marked paid'
      lines.push(`${paid(d)} · until ${dayMonth(d.until)}`)
      if (d.note) lines.push(text(d.note))
      break
    case 'claim_not_found':
      title = `"I've paid" not found${withShop ? `: ${shop}` : ''}`
      lines.push(`${paid(d)} · ${text(d.note)}`)
      break
    case 'paid_until':
      title = withShop ? `Moved ${shop}'s paid-until date` : 'Moved the paid-until date'
      lines.push(`${dayMonth(d.before)} → ${dayMonth(d.after)}`)
      break
    case 'undo_payment':
      title = withShop ? `Undid a payment of ${shop}` : 'Undid a payment'
      lines.push(`${paid(d)} · paid until ${d.after ? dayMonth(d.after) : 'none (setup)'}`)
      break
    case 'remind':
      title = withShop ? `Reminded ${shop} to pay` : 'Reminded them to pay'
      if (!d.sent) warn = `Not sent${d.error ? `: ${text(d.error)}` : ''}`
      break
    case 'close_shop':
      title = withShop ? `Closed ${shop}` : 'Closed the shop'
      break
    case 'reopen_shop':
      title = withShop ? `Reopened ${shop}` : 'Reopened the shop'
      break
    case 'reset_password':
      title = `New password for ${person}`
      break
    case 'logout_all':
      title = `Logged out every phone of ${person}`
      break
    case 'change_phone':
      title = `New login phone for ${person}`
      lines.push(`${formatPhone(text(d.before))} → ${formatPhone(text(d.after))}`)
      break
    case 'remove_login':
      title = `Removed ${person}'s ${PROVIDER[text(d.provider)] ?? text(d.provider)} login`
      if (d.label) lines.push(text(d.label))
      break
    default:
      title = line.action.replaceAll('_', ' ')
  }
  // A login's line names its shop under it.
  if (withShop && d.person && line.shop) lines.push(line.shop)
  if (line.reason) lines.push(line.reason)
  return { title, lines, warn }
}

/** A row of a day list (AdminLog.tsx): what happened, the details under it. */
export type DayItem = { id: string; at: string; title: string; lines: string[]; href?: string; warn?: string }

/** A log line as a day list's row; `withShop`: name the shop and link to it. */
export function logItem(line: AdminLogLine, withShop = true): DayItem {
  const { title, lines, warn } = logWords(line, withShop)
  return { id: line.id, at: line.created_at, title, lines, warn, href: withShop && line.store_id ? `/admin/shops/${line.store_id}` : undefined }
}
