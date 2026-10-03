/** What a customer's device remembers between visits: their details for the
 * next checkout, the orders placed on it with the phone that opens each
 * one's tracking page (02_TECHNICAL.md section 8), and the seller's link it
 * last came through (section 9.2). No account needed. */

export type CustomerDetails = { name: string; phone: string; address: string; addressNote: string }
export type PlacedOrder = { id: string; shop: string; number: number; phone: string; placedAt: string }

const DETAILS_KEY = 'sc.customer'
const ORDERS_KEY = 'sc.orders'
const MAX_ORDERS = 20
const LINKS_KEY = 'sc.links'
// An order counts for the last link opened in this many days (decided
// 2026-10-03), and opening the same link again within VIEW_GAP_MS isn't
// another view (a reload, coming back from another app).
const LINK_DAYS = 7
const VIEW_GAP_MS = 30 * 60_000

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode etc.: nothing is remembered.
  }
}

export function loadCustomerDetails(): CustomerDetails | null {
  const details = read(DETAILS_KEY) as Partial<CustomerDetails> | null
  return typeof details?.name === 'string' && typeof details.phone === 'string'
    ? {
        name: details.name,
        phone: details.phone,
        address: details.address ?? '',
        addressNote: details.addressNote ?? '',
      }
    : null
}

export function saveCustomerDetails(details: CustomerDetails) {
  write(DETAILS_KEY, details)
}

function allOrders(): PlacedOrder[] {
  const orders = read(ORDERS_KEY)
  return Array.isArray(orders)
    ? orders.filter((o) => typeof o?.id === 'string' && typeof o.phone === 'string' && typeof o.shop === 'string')
    : []
}

/** Newest first. */
export function placedOrders(shop: string): PlacedOrder[] {
  return allOrders().filter((order) => order.shop === shop)
}

export function rememberOrder(order: PlacedOrder) {
  write(ORDERS_KEY, [order, ...allOrders().filter((o) => o.id !== order.id)].slice(0, MAX_ORDERS))
}

/** The phone this device placed (or opened) the order with. */
export function orderPhone(orderId: string): string | null {
  return allOrders().find((order) => order.id === orderId)?.phone ?? null
}

type OpenedLink = { token: string; openedAt: number; viewedAt: number }

function openedLinks(): Record<string, OpenedLink> {
  const links = read(LINKS_KEY)
  return links && typeof links === 'object' && !Array.isArray(links) ? (links as Record<string, OpenedLink>) : {}
}

/** The shop was opened through one of its links (?l=<token>); it becomes
 * the shop's link on this device. True if this counts as a view. */
export function openedLink(shop: string, token: string): boolean {
  const links = openedLinks()
  const last = links[shop]
  const now = Date.now()
  const counts = !(last?.token === token && now - last.viewedAt < VIEW_GAP_MS)
  links[shop] = { token, openedAt: now, viewedAt: counts ? now : last.viewedAt }
  write(LINKS_KEY, links)
  return counts
}

/** The token of the shop's link this device opened in the last 7 days. */
export function rememberedLink(shop: string): string | null {
  const link = openedLinks()[shop]
  if (typeof link?.token !== 'string' || typeof link.openedAt !== 'number') return null
  return Date.now() - link.openedAt < LINK_DAYS * 86_400_000 ? link.token : null
}
