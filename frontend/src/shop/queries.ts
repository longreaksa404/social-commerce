import { queryOptions, useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, ApiError } from '../lib/api.ts'
import { placedOrders, type PlacedOrder } from './device.ts'
import type {
  DeliveryMethod,
  OrderStatus,
  PaymentMethod,
  ShopCategoryPage,
  ShopOrder,
  ShopProduct,
  ShopProductCard,
  ShopStore,
} from '../lib/types.ts'

// Public storefront data: no login, so `auth: false`. A minute of
// freshness keeps back/forward between pages instant on slow mobile data.
const options = {
  staleTime: 60_000,
  // A missing shop or product won't appear by asking again.
  retry: (failures: number, error: Error) =>
    !(error instanceof ApiError && error.status === 404) && failures < 1,
}

const shopPath = (slug: string) => `/shop/${encodeURIComponent(slug)}`

export function useShop(slug: string) {
  return useQuery({
    ...options,
    queryKey: ['shop', slug],
    queryFn: () => api<ShopStore>(shopPath(slug), { auth: false }),
  })
}

export function useShopProducts(slug: string) {
  return useQuery({
    ...options,
    queryKey: ['shop', slug, 'products'],
    queryFn: () => api<ShopProductCard[]>(`${shopPath(slug)}/products`, { auth: false }),
  })
}

/** Also used by the cart to check each product's current price and stock. */
export const shopProductQuery = (slug: string, productSlug: string) =>
  queryOptions({
    ...options,
    queryKey: ['shop', slug, 'product', productSlug],
    queryFn: () =>
      api<ShopProduct>(`${shopPath(slug)}/products/${encodeURIComponent(productSlug)}`, { auth: false }),
  })

export function useShopProduct(slug: string, productSlug: string) {
  return useQuery(shopProductQuery(slug, productSlug))
}

export function useShopCategory(slug: string, categorySlug: string) {
  return useQuery({
    ...options,
    queryKey: ['shop', slug, 'category', categorySlug],
    queryFn: () =>
      api<ShopCategoryPage>(`${shopPath(slug)}/categories/${encodeURIComponent(categorySlug)}`, { auth: false }),
  })
}

export type OrderRequest = {
  name: string
  phone: string
  delivery_method: DeliveryMethod
  /** One of the shop's couriers; null = the shop's own delivery, or pickup. */
  courier: string | null
  /** A delivery needs the address, the GPS location, or both; null for pickup. */
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  delivery_address_note: string | null
  notes: string | null
  items: { product_id: string; variant_id: string | null; quantity: number }[]
  /** What the customer was shown; the server refuses the order if prices,
   * fees or discounts changed. */
  expected_total: string
  payment_method: PaymentMethod
  /** The shop link this device opened in the last 7 days; the order counts for it. */
  link: string | null
}

export function usePlaceOrder(slug: string) {
  return useMutation({
    mutationFn: (body: OrderRequest) =>
      api<ShopOrder>(`${shopPath(slug)}/orders`, { method: 'POST', body, auth: false }),
  })
}

/** Order tracking: needs the phone the order was placed with. `placed` is
 * the order just returned by checkout, shown while it's fetched again. */
// Finished, from the customer's side: nothing more is coming.
const DONE = new Set<OrderStatus>(['delivered', 'completed', 'rejected', 'cancelled'])

/** Still on its way to the customer. */
export const inProgress = (order: ShopOrder) => !DONE.has(order.status)

// While a tracking page is open on an order in progress, check this often.
const TRACK_REFRESH_MS = 30_000

const trackOrder = (slug: string, orderId: string, phone: string | null) =>
  queryOptions({
    queryKey: ['shop', slug, 'order', orderId, phone],
    queryFn: () =>
      api<ShopOrder>(`${shopPath(slug)}/orders/${encodeURIComponent(orderId)}?phone=${encodeURIComponent(phone ?? '')}`, {
        auth: false,
      }),
    staleTime: options.staleTime,
    retry: options.retry,
  })

export function useTrackOrder(slug: string, orderId: string, phone: string | null, placed?: ShopOrder) {
  return useQuery({
    ...trackOrder(slug, orderId, phone),
    initialData: placed?.id === orderId ? placed : undefined,
    enabled: phone !== null,
    // Customers wait on this page to see what has changed: check again
    // while it's open (not in a background tab) and when they come back.
    staleTime: 0,
    refetchInterval: (query) => (query.state.data && inProgress(query.state.data) ? TRACK_REFRESH_MS : false),
    refetchOnWindowFocus: true,
  })
}

export type MyOrder = PlacedOrder & {
  /** Undefined while loading, or if it can't be opened any more. */
  order: ShopOrder | undefined
  loading: boolean
}

// The current-order bar only looks at the last few, recent orders.
const RECENT_DAYS = 30
const RECENT_COUNT = 3

/** Orders placed (or opened) on this device in this shop, newest first,
 * each with its current state from the tracking endpoint. `recent` keeps
 * to the last few of the past month, for the bar on every page. */
export function useMyOrders(slug: string, { recent = false } = {}): MyOrder[] {
  // Once per page: "the past month" doesn't need to move while it's open.
  const [since] = useState(() => Date.now() - RECENT_DAYS * 86_400_000)
  let placed = placedOrders(slug)
  if (recent) {
    placed = placed.filter((o) => new Date(o.placedAt).getTime() >= since).slice(0, RECENT_COUNT)
  }
  const results = useQueries({ queries: placed.map((o) => trackOrder(slug, o.id, o.phone)) })
  return placed.map((o, i) => ({ ...o, order: results[i].data, loading: results[i].isPending }))
}

/** A page was opened through one of the shop's links. Fire and forget: a
 * missed view never bothers the customer. */
export function trackView(slug: string, token: string) {
  api(`${shopPath(slug)}/track-view`, { method: 'POST', body: { token }, auth: false }).catch(() => {})
}

export function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}
