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

// The admin's Settings in the log (services/admin_settings.py).
const SETTING: Record<string, string> = { khr_per_usd: 'Riel rate', month: 'Month price', year: 'Year price', trial_days: 'Free trial days' }

// What a save made as the seller was, from its address (services/as_seller.py).
const SAVED: [RegExp, string][] = [
  [/^\/seller\/products/, 'a product'],
  [/^\/seller\/categories/, 'a category'],
  [/^\/seller\/orders/, 'an order'],
  [/^\/seller\/customers/, 'a customer'],
  [/^\/seller\/sales/, 'a sale'],
  [/^\/seller\/links/, 'a link'],
  [/^\/seller\/staff/, 'staff'],
  [/^\/seller\/store\/(logo|cover)/, 'a shop photo'],
  [/^\/seller\/store\/telegram/, 'Telegram alerts'],
  [/^\/seller\/store/, 'the shop settings'],
  [/^\/seller\/plan\/open/, 'opened the shop'],
  [/^\/seller\/account/, 'the owner\'s name'],
  [/^\/seller\/notifications/, 'notifications read'],
]

function saved(method: string, path: string) {
  const what = SAVED.find(([pattern]) => pattern.test(path))?.[1] ?? path
  return method === 'DELETE' ? `removed ${what}` : what
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
    case 'open_as_seller':
      title = withShop ? `Opened ${shop} as seller` : 'Opened the shop as seller'
      break
    case 'seller_save':
      title = `Saved as the seller: ${saved(text(d.method), text(d.path))}`
      break
    case 'forget_customer':
      title = withShop ? `Removed a customer's details from ${shop}` : "Removed a customer's details"
      lines.push(d.orders === 1 ? 'Its order kept, without them' : `${d.orders} orders kept, without them`)
      break
    case 'hide_product':
      title = withShop ? `Hid a product of ${shop}` : 'Hid a product'
      lines.push(text(d.product))
      break
    case 'setting':
      title = 'Changed the settings'
      for (const [key, words] of Object.entries(SETTING)) {
        const pair = d[key] as unknown
        if (Array.isArray(pair)) lines.push(`${words} ${words.endsWith('price') ? `$${pair[0]} → $${pair[1]}` : `${pair[0]} → ${pair[1]}`}`)
      }
      break
    case 'run_job':
      title = `Ran ${d.job === 'billing' ? 'the plan reminders' : 'the customer reminders'} now`
      lines.push(d.sent === 1 ? '1 sent' : `${d.sent} sent`)
      break
    case 'test_shop':
      title = withShop ? `Made a test shop: ${shop}` : 'Made as a test shop'
      lines.push(text(d.login))
      break
    case 'erase_shop':
      title = `Erased ${shop}`
      lines.push(`${d.products} products · ${d.orders} orders · ${d.customers} customers`)
      break
    case 'broadcast':
      title = `Sent a message to ${d.sent === 1 ? '1 shop' : `${d.sent} shops`}`
      lines.push(text(d.text))
      if (d.failed) warn = `${d.failed} failed`
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
