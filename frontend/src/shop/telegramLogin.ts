import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { api, ApiError, apiUrl } from '../lib/api.ts'
import type { CartLine } from './cart.ts'

/** Customers log in with Telegram (founder, 2026-10-20): checkout's
 * "Continue with Telegram" opens Oak's bot, the customer shares their
 * phone there, and this device keeps a token for every Oak shop. No
 * password, no profile; each shop still knows its customers by phone. An
 * order placed with the token gets its news on Telegram. */

export type TelegramCustomer = { token: string; name: string; phone: string }
export type ShopCustomer = { name: string; phone: string; address: string | null }
export type TelegramLogin = {
  id: string
  telegram_url: string
  expires_at: string
  customer: (ShopCustomer & { token: string }) | null
}

const KEY = 'sc.telegram'
const pendingKey = (shop: string) => `sc.tglogin.${shop}`
const path = (shop: string) => `/shop/${encodeURIComponent(shop)}`

let snapshot: TelegramCustomer | null | undefined
const listeners = new Set<() => void>()

function stored(): TelegramCustomer | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<TelegramCustomer> | null
    return typeof value?.token === 'string' && typeof value.phone === 'string'
      ? { token: value.token, phone: value.phone, name: value.name ?? '' }
      : null
  } catch {
    return null
  }
}

function set(customer: TelegramCustomer | null) {
  snapshot = customer
  try {
    if (customer) localStorage.setItem(KEY, JSON.stringify(customer))
    else localStorage.removeItem(KEY)
  } catch {
    // Private mode etc.: logged in until the tab closes.
  }
  listeners.forEach((notify) => notify())
}

export const saveTelegramCustomer = (customer: TelegramCustomer) => set(customer)
/** "Not you?", or a token the server no longer takes. */
export const clearTelegramCustomer = () => set(null)

/** The customer logged in on this device, or null. */
export function useTelegramCustomer(): TelegramCustomer | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => (snapshot === undefined ? (snapshot = stored()) : snapshot),
  )
}

/** For the requests that know a logged-in customer (placing an order). */
export function customerHeaders(): Record<string, string> | undefined {
  const customer = snapshot === undefined ? (snapshot = stored()) : snapshot
  return customer ? { 'X-Customer-Token': customer.token } : undefined
}

/** What checkout fills in for the logged-in customer at this shop (its
 * name and address for them). A token the server refuses logs them out. */
export function useShopCustomer(shop: string, customer: TelegramCustomer | null) {
  return useQuery({
    queryKey: ['telegram-customer', shop, customer?.token],
    queryFn: async () => {
      try {
        return await api<ShopCustomer>(`${path(shop)}/me`, {
          auth: false,
          headers: { 'X-Customer-Token': customer?.token ?? '' },
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) clearTelegramCustomer()
        throw error
      }
    },
    enabled: customer !== null,
    staleTime: Infinity,
    retry: false,
  })
}

// The check

const serverLines = (lines: CartLine[]) =>
  lines.map((l) => ({
    product_id: l.productId,
    variant_id: l.variantId,
    quantity: l.quantity,
    product_slug: l.productSlug,
    name: l.name,
    variant_name: l.variantName,
    price: l.price,
    image_url: l.imageUrl,
  }))

// Made ahead, so the button is a plain link (a phone browser blocks
// opening Telegram after waiting for a request); a check works for 30
// minutes, so a fresh one comes before then.
const CHECK_REFRESH_MS = 20 * 60_000
const POLL_MS = 2_500

export function useNewTelegramLogin(shop: string, lines: CartLine[], enabled: boolean) {
  return useQuery({
    queryKey: ['telegram-login', shop, 'new'],
    queryFn: () =>
      api<TelegramLogin>(`${path(shop)}/telegram-login`, {
        method: 'POST',
        body: { lines: serverLines(lines) },
        auth: false,
      }),
    enabled,
    staleTime: CHECK_REFRESH_MS,
    refetchInterval: enabled ? CHECK_REFRESH_MS : false,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

/** Read while the customer is in Telegram, until it holds their token. */
export function useTelegramLoginResult(shop: string, id: string | undefined, waiting: boolean) {
  return useQuery({
    queryKey: ['telegram-login', shop, id],
    queryFn: () => api<TelegramLogin>(`${path(shop)}/telegram-login/${id}`, { auth: false }),
    enabled: waiting && id !== undefined,
    refetchInterval: (query) => (query.state.data?.customer ? false : POLL_MS),
    refetchOnWindowFocus: true,
    retry: false,
  })
}

/** As the page leaves for Telegram: the cart as it is now goes with the
 * check (it may have changed since the check was made), for finishing
 * inside Telegram. A beacon, which outlives the page going away. */
export function sendCartWithLogin(shop: string, id: string, lines: CartLine[]) {
  try {
    navigator.sendBeacon?.(
      apiUrl(`${path(shop)}/telegram-login/${id}/cart`),
      new Blob([JSON.stringify({ lines: serverLines(lines) })], { type: 'text/plain' }),
    )
  } catch {
    // The check keeps the cart it was made with.
  }
}

/** A check opened before the page reloaded (phones often reload a page
 * left for another app), to read again rather than start over. */
export function pendingLogin(shop: string): TelegramLogin | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingKey(shop)) ?? 'null') as TelegramLogin | null
    return value && new Date(value.expires_at).getTime() > Date.now() ? value : null
  } catch {
    return null
  }
}

export function setPendingLogin(shop: string, check: TelegramLogin | null) {
  try {
    if (check) sessionStorage.setItem(pendingKey(shop), JSON.stringify(check))
    else sessionStorage.removeItem(pendingKey(shop))
  } catch {
    // Nothing to resume after a reload.
  }
}
