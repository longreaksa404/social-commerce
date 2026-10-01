import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.ts'
import type { Category, Product, Store } from '../lib/types.ts'

export const keys = {
  store: ['store'] as const,
  categories: ['categories'] as const,
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
}

export function useStore() {
  return useQuery({ queryKey: keys.store, queryFn: () => api<Store>('/seller/store') })
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: () => api<Category[]>('/seller/categories') })
}

export function useProducts() {
  return useQuery({ queryKey: keys.products, queryFn: () => api<Product[]>('/seller/products') })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: keys.product(id ?? ''),
    queryFn: () => api<Product>(`/seller/products/${id}`),
    enabled: Boolean(id),
  })
}

/** Save a product and keep the list and detail caches in sync. */
export function useSaveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: unknown }) =>
      id
        ? api<Product>(`/seller/products/${id}`, { method: 'PATCH', body })
        : api<Product>('/seller/products', { method: 'POST', body }),
    onSuccess: (product) => {
      queryClient.setQueryData(keys.product(product.id), product)
      queryClient.invalidateQueries({ queryKey: keys.products, exact: true })
      queryClient.invalidateQueries({ queryKey: keys.categories })
    },
  })
}
