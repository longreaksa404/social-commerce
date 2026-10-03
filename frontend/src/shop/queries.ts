import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api.ts'
import type {
  DeliveryMethod,
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
}

export function usePlaceOrder(slug: string) {
  return useMutation({
    mutationFn: (body: OrderRequest) =>
      api<ShopOrder>(`${shopPath(slug)}/orders`, { method: 'POST', body, auth: false }),
  })
}

/** Order tracking: needs the phone the order was placed with. `placed` is
 * the order just returned by checkout, shown while it's fetched again. */
export function useTrackOrder(slug: string, orderId: string, phone: string | null, placed?: ShopOrder) {
  return useQuery({
    initialData: placed?.id === orderId ? placed : undefined,
    queryKey: ['shop', slug, 'order', orderId, phone],
    queryFn: () =>
      api<ShopOrder>(`${shopPath(slug)}/orders/${encodeURIComponent(orderId)}?phone=${encodeURIComponent(phone ?? '')}`, {
        auth: false,
      }),
    enabled: phone !== null,
    retry: options.retry,
    // Customers come back to this page to see if anything has changed.
    refetchOnWindowFocus: true,
  })
}

export function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}
