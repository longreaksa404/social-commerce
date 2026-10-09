import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.ts'
import type {
  Account,
  Category,
  CustomerDetail,
  CustomerList,
  DeliveryStatus,
  LinkStats,
  LinkTarget,
  NotificationList,
  Order,
  OrderList,
  OrderStatus,
  PaymentStatus,
  Product,
  ShareLink,
  StaffMember,
  Store,
} from '../lib/types.ts'

export const keys = {
  store: ['store'] as const,
  account: ['account'] as const,
  staff: ['staff'] as const,
  telegramLink: ['telegram-link'] as const,
  categories: ['categories'] as const,
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  orders: ['orders'] as const,
  orderList: (statuses: OrderStatus[]) => ['orders', 'list', statuses] as const,
  order: (id: string) => ['orders', id] as const,
  notifications: ['notifications'] as const,
  notificationList: ['notifications', 'list'] as const,
  unreadNotifications: ['notifications', 'unread'] as const,
  customers: ['customers'] as const,
  customerList: (search: string) => ['customers', 'list', search] as const,
  customer: (id: string) => ['customers', id] as const,
  links: ['links'] as const,
  link: (id: string) => ['links', id] as const,
}

const ORDER_PAGE = 50
const NOTIFICATION_PAGE = 20
const CUSTOMER_PAGE = 50
// No push notifications in the MVP: the bell and an open order list check
// for news now and then, and whenever the seller comes back to the app.
const POLL_MS = 30_000

export function useStore() {
  return useQuery({ queryKey: keys.store, queryFn: () => api<Store>('/seller/store') })
}

export function useAccount() {
  return useQuery({ queryKey: keys.account, queryFn: () => api<Account>('/seller/account') })
}

/** The logged-in person's role, once known: staff see no store settings. */
export function useRole() {
  return useAccount().data?.role
}

export function useStaff() {
  return useQuery({ queryKey: keys.staff, queryFn: () => api<StaffMember[]>('/seller/staff') })
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
    refetchInterval: POLL_MS,
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

/** An order that came by chat, added by the seller (founder's pick 3A). */
export function useAddOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) => api<Order>('/seller/orders', { method: 'POST', body }),
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order(order.id), order)
      queryClient.invalidateQueries({ queryKey: [...keys.orders, 'list'] })
      // It took stock, and made or updated a customer.
      queryClient.invalidateQueries({ queryKey: keys.products })
      queryClient.invalidateQueries({ queryKey: keys.customers })
    },
  })
}

/** Cash on delivery: delivered (or collected) and the cash received, in
 * one tap. The server records each in its own state machine. */
export function useCashHandover(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<Order>(`/seller/orders/${id}/cash-handover`, { method: 'POST' }),
    onSuccess: (order) => {
      queryClient.setQueryData(keys.order(id), order)
      queryClient.invalidateQueries({ queryKey: [...keys.orders, 'list'] })
    },
  })
}

/** The count on the bell. */
export function useUnreadNotifications() {
  return useQuery({
    queryKey: keys.unreadNotifications,
    queryFn: () => api<{ unread: number }>('/seller/notifications/unread'),
    select: (data) => data.unread,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  })
}

/** Newest first, a page at a time. */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: keys.notificationList,
    queryFn: ({ pageParam }) =>
      api<NotificationList>(`/seller/notifications?limit=${NOTIFICATION_PAGE}&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.has_more ? pages.length * NOTIFICATION_PAGE : undefined),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  })
}

/** Marks read everything up to the newest notification shown (its
 * created_at as it came), on every device; one that arrived since stays
 * unread. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (upTo: string) =>
      api<{ unread: number }>('/seller/notifications/read', { method: 'POST', body: { up_to: upTo } }),
    onSuccess: (data) => queryClient.setQueryData(keys.unreadNotifications, data),
  })
}

/** Whoever ordered last first, a page at a time. `search` finds part of a
 * name or of a phone number. */
export function useCustomers(search: string) {
  return useInfiniteQuery({
    queryKey: keys.customerList(search),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(CUSTOMER_PAGE), offset: String(pageParam) })
      if (search) params.set('q', search)
      return api<CustomerList>(`/seller/customers?${params}`)
    },
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.has_more ? pages.length * CUSTOMER_PAGE : undefined),
    // While a new search loads, the last results stay.
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.customer(id),
    queryFn: () => api<CustomerDetail>(`/seller/customers/${id}`),
    enabled,
  })
}

/** Newest first, each with its views and orders. */
export function useLinks() {
  return useQuery({ queryKey: keys.links, queryFn: () => api<ShareLink[]>('/seller/links') })
}

export function useLinkStats(id: string) {
  return useQuery({
    queryKey: keys.link(id),
    queryFn: () => api<LinkStats>(`/seller/links/${id}/stats`),
    refetchOnWindowFocus: true,
  })
}

export type NewLink = {
  target_type: LinkTarget
  target_id: string | null
  source: string
  campaign: string | null
}

/** Make a link; the same page, place and name gives back the existing one. */
export function useCreateLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NewLink) => api<ShareLink>('/seller/links', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.links }),
  })
}
