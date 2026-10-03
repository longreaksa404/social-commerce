/** What a customer's device remembers between visits: their details for the
 * next checkout, and the orders placed on it with the phone that opens each
 * one's tracking page (02_TECHNICAL.md section 8). No account needed. */

export type CustomerDetails = { name: string; phone: string; address: string; addressNote: string }
export type PlacedOrder = { id: string; shop: string; number: number; phone: string; placedAt: string }

const DETAILS_KEY = 'sc.customer'
const ORDERS_KEY = 'sc.orders'
const MAX_ORDERS = 20

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
