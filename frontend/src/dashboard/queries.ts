import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.ts'
import type {
  Category,
  DeliveryStatus,
  Order,
  OrderList,
  OrderStatus,
  PaymentStatus,
  Product,
  Store,
} from '../lib/types.ts'

export const keys = {
  store: ['store'] as const,
  categories: ['categories'] as const,
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  orders: ['orders'] as const,
  orderList: (statuses: OrderStatus[]) => ['orders', 'list', statuses] as const,
  order: (id: string) => ['orders', id] as const,
}

const ORDER_PAGE = 50
// No notifications until Phase 6/7: an open order list checks for new
// orders now and then, and whenever the seller comes back to the app.
const ORDER_POLL_MS = 30_000

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

/** Newest first, a page at a time. Empty `statuses` means all. */
export function useOrders(statuses: OrderStatus[]) {
  return useInfiniteQuery({
    queryKey: keys.orderList(statuses),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(ORDER_PAGE), offset: String(pageParam) })
      statuses.forEach((s) => params.append('status', s))
      return api<OrderList>(`/seller/orders?${params}`)
    },
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.has_more ? pages.length * ORDER_PAGE : undefined),
    // Switching filters keeps the last list (and its counts) until the next arrives.
    placeholderData: keepPreviousData,
    refetchInterval: ORDER_POLL_MS,
    refetchOnWindowFocus: true,
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: keys.order(id),
    queryFn: () => api<Order>(`/seller/orders/${id}`),
    refetchOnWindowFocus: true,
  })
}

export function useChangeOrderStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: OrderStatus) => api<Order>(`/seller/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order(id), order)
      queryClient.invalidateQueries({ queryKey: [...keys.orders, 'list'] })
      // Rejecting or cancelling puts stock back.
      queryClient.invalidateQueries({ queryKey: keys.products })
    },
  })
}

/** Record the order's payment as paid or failed. */
export function useRecordPayment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { status: PaymentStatus; reference: string | null }) =>
      api<Order>(`/seller/orders/${id}/payment`, { method: 'PATCH', body }),
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order(id), order)
      queryClient.invalidateQueries({ queryKey: [...keys.orders, 'list'] })
    },
  })
}

/** Move the order's delivery along, with an optional note on who delivers. */
export function useRecordDelivery(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { status: DeliveryStatus; assignee_note: string | null }) =>
      api<Order>(`/seller/orders/${id}/delivery`, { method: 'PATCH', body }),
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order(id), order)
      queryClient.invalidateQueries({ queryKey: [...keys.orders, 'list'] })
    },
  })
}
