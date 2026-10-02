import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api.ts'
import type { ShopCategoryPage, ShopProduct, ShopProductCard, ShopStore } from '../lib/types.ts'

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

export function useShopProduct(slug: string, productSlug: string) {
  return useQuery({
    ...options,
    queryKey: ['shop', slug, 'product', productSlug],
    queryFn: () =>
      api<ShopProduct>(`${shopPath(slug)}/products/${encodeURIComponent(productSlug)}`, { auth: false }),
  })
}

export function useShopCategory(slug: string, categorySlug: string) {
  return useQuery({
    ...options,
    queryKey: ['shop', slug, 'category', categorySlug],
    queryFn: () =>
      api<ShopCategoryPage>(`${shopPath(slug)}/categories/${encodeURIComponent(categorySlug)}`, { auth: false }),
  })
}

export function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}
