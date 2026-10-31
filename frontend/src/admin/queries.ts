import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/api.ts'
import type {
  AdminCustomer,
  AdminLogLine,
  AdminOrder,
  AdminOverview,
  AdminPayments,
  AdminProduct,
  AdminSeller,
  AdminSettings,
  AdminShop,
  AdminShopDetail,
  AdminSystem,
} from '../lib/types.ts'

/** The admin panel's data, on the admin's own session (`adminApi`), under
 * one key so logging out of the admin leaves a shop's login alone. */
export const adminKeys = {
  all: ['admin'] as const,
  me: ['admin', 'me'] as const,
  overview: ['admin', 'overview'] as const,
  shops: ['admin', 'shops'] as const,
  shop: (id: string) => ['admin', 'shops', id] as const,
  log: ['admin', 'log'] as const,
  people: ['admin', 'people'] as const,
  person: (id: string) => ['admin', 'people', id] as const,
  payments: ['admin', 'payments'] as const,
  orders: (q: string) => ['admin', 'orders', q] as const,
  customers: ['admin', 'customers'] as const,
  products: ['admin', 'products'] as const,
  settings: ['admin', 'settings'] as const,
  system: ['admin', 'system'] as const,
}

/** Who is logged in to the admin. */
export function useAdminMe() {
  return useQuery({ queryKey: adminKeys.me, queryFn: () => adminApi<{ phone: string; telegram: boolean }>('/admin/auth/me') })
}

/** Home: the numbers, then what needs the admin. Fresh each visit. */
export function useAdminOverview() {
  return useQuery({ queryKey: adminKeys.overview, queryFn: () => adminApi<AdminOverview>('/admin/overview'), staleTime: 0 })
}

/** Every shop's plan. */
export function useAdminShops() {
  return useQuery({ queryKey: adminKeys.shops, queryFn: () => adminApi<AdminShop[]>('/admin/shops') })
}

export function useAdminShop(id: string) {
  return useQuery({ queryKey: adminKeys.shop(id), queryFn: () => adminApi<AdminShopDetail>(`/admin/shops/${id}`) })
}

// The API's page of the log.
const LOG_PAGE = 100

/** The admin's log, newest first, a page at a time; one shop's with
 * `storeId`. Fresh each visit. */
export function useAdminLog(storeId: string | null) {
  return useInfiniteQuery({
    queryKey: [...adminKeys.log, storeId ?? 'all'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (storeId) params.set('store_id', storeId)
      if (pageParam) params.set('before', pageParam)
      return adminApi<AdminLogLine[]>(`/admin/log?${params}`)
    },
    initialPageParam: '',
    getNextPageParam: (page) => (page.length === LOG_PAGE ? page[page.length - 1].created_at : undefined),
    staleTime: 0,
  })
}

/** Mark a payment made by hand (amount "0": free time). */
export function useMarkPaid(id: string) {
  const changed = useShopChanged(id)
  return useMutation({
    mutationFn: (body: { period: 'month' | 'year'; amount: string | null; note: string | null }) =>
      adminApi<AdminShopDetail>(`/admin/shops/${id}/payments`, { method: 'POST', body }),
    onSuccess: changed,
  })
}

/** After an action on a shop: its page from the answer, the list, Home,
 * the payments and the log fresh. */
function useShopChanged(id: string) {
  const queryClient = useQueryClient()
  return (shop: AdminShopDetail) => {
    queryClient.setQueryData(adminKeys.shop(id), shop)
    queryClient.invalidateQueries({ queryKey: adminKeys.shops, exact: true })
    queryClient.invalidateQueries({ queryKey: adminKeys.overview })
    queryClient.invalidateQueries({ queryKey: adminKeys.payments })
    queryClient.invalidateQueries({ queryKey: adminKeys.log })
  }
}

/** Money on a shop (parts 15, 16, 18): its paid-until date moved with
 * why, its latest payment undone, the plan reminder sent now. The answer
 * is the shop again; a reminder's log line says whether it reached them. */
export function useShopMoney(id: string) {
  const changed = useShopChanged(id)
  return useMutation({
    mutationFn: (
      action: { kind: 'paidUntil'; paidUntil: string; reason: string } | { kind: 'undo'; paymentId: string; reason: string } | { kind: 'remind' },
    ) => {
      const url = `/admin/shops/${id}`
      switch (action.kind) {
        case 'paidUntil':
          return adminApi<AdminShopDetail>(`${url}/paid-until`, { method: 'PUT', body: { paid_until: action.paidUntil, reason: action.reason } })
        case 'undo':
          return adminApi<AdminShopDetail>(`${url}/payments/${action.paymentId}/undo`, { method: 'POST', body: { reason: action.reason } })
        case 'remind':
          return adminApi<AdminShopDetail>(`${url}/remind`, { method: 'POST' })
      }
    },
    onSuccess: changed,
  })
}

/** Every shop's payments in a month, or a year (`month` null). Fresh
 * each visit. */
export function useAdminPayments(year: number, month: number | null) {
  return useQuery({
    queryKey: [...adminKeys.payments, year, month ?? 'year'],
    queryFn: () => adminApi<AdminPayments>(`/admin/payments?year=${year}${month ? `&month=${month}` : ''}`),
    staleTime: 0,
  })
}

/** Close a shop with a reason (its link stops, its logins are logged
 * out), or open it again. */
export function useSetShopOpen(id: string) {
  const changed = useShopChanged(id)
  return useMutation({
    mutationFn: ({ open, reason }: { open: boolean; reason: string | null }) =>
      adminApi<AdminShopDetail>(`/admin/shops/${id}/${open ? 'reopen' : 'close'}`, { method: 'POST', body: { reason } }),
    onSuccess: changed,
  })
}

/** The founder checks a seller's "I've paid": found (paid, with the
 * amount found if different) or not (the seller sees the note). */
export function useCheckClaim(storeId: string) {
  const changed = useShopChanged(storeId)
  return useMutation({
    mutationFn: ({ paymentId, found, amount, note }: { paymentId: string; found: boolean; amount?: string | null; note: string | null }) =>
      adminApi<AdminShopDetail>(`/admin/shops/${storeId}/payments/${paymentId}/${found ? 'confirm' : 'reject'}`, {
        method: 'POST',
        body: found ? { amount: amount ?? null, note } : { note },
      }),
    onSuccess: changed,
  })
}

/** Everyone who logs in: owners and staff of every shop. */
export function useAdminPeople() {
  return useQuery({ queryKey: adminKeys.people, queryFn: () => adminApi<AdminSeller[]>('/admin/sellers') })
}

export function useAdminPerson(id: string) {
  return useQuery({ queryKey: adminKeys.person(id), queryFn: () => adminApi<AdminSeller>(`/admin/sellers/${id}`) })
}

/** The help a seller asks for (parts 9 to 12). The answer is the person
 * again, except a new password, shown once. */
export function usePersonAction(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      action: { kind: 'password' } | { kind: 'logout' } | { kind: 'phone'; phone: string } | { kind: 'remove'; provider: string },
    ): Promise<AdminSeller | { password: string }> => {
      const url = `/admin/sellers/${id}`
      switch (action.kind) {
        case 'password':
          return adminApi<{ password: string }>(`${url}/password`, { method: 'POST' })
        case 'logout':
          return adminApi<AdminSeller>(`${url}/logout`, { method: 'POST' })
        case 'phone':
          return adminApi<AdminSeller>(`${url}/phone`, { method: 'POST', body: { phone: action.phone } })
        case 'remove':
          return adminApi<AdminSeller>(`${url}/logins/${action.provider}`, { method: 'DELETE' })
      }
    },
    onSuccess: (answer) => {
      if ('id' in answer) queryClient.setQueryData(adminKeys.person(id), answer)
      else queryClient.invalidateQueries({ queryKey: adminKeys.person(id) })
      queryClient.invalidateQueries({ queryKey: adminKeys.people, exact: true })
      queryClient.invalidateQueries({ queryKey: adminKeys.shops })
      queryClient.invalidateQueries({ queryKey: adminKeys.log })
    },
  })
}

/** Part 19: orders by "sokha 1043", "1043" or a customer's phone. */
export function useAdminOrders(q: string) {
  return useQuery({
    queryKey: adminKeys.orders(q),
    queryFn: () => adminApi<AdminOrder[]>(`/admin/orders?q=${encodeURIComponent(q)}`),
    enabled: q.length > 0,
  })
}

/** Part 20: a phone or a name in every shop, one entry per phone. */
export function useAdminCustomers(q: string) {
  return useQuery({
    queryKey: [...adminKeys.customers, q],
    queryFn: () => adminApi<AdminCustomer[]>(`/admin/customers?q=${encodeURIComponent(q)}`),
    enabled: q.length > 1,
  })
}

/** Part 21: a customer's details removed from one shop (`storeId`) or
 * every shop; REMOVE typed and the admin's password every time. */
export function useForgetCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { phone: string; store_id: string | null; password: string }) =>
      adminApi<{ shops: number; orders: number }>('/admin/customers/forget', { method: 'POST', body: { ...body, confirm: 'REMOVE' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.customers })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.log })
    },
  })
}

// The API's page of products.
const PRODUCTS_PAGE = 40

/** Part 22: the newest products of every shop, 40 at a time. */
export function useAdminProducts(q: string) {
  return useInfiniteQuery({
    queryKey: [...adminKeys.products, q],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (pageParam) params.set('before', pageParam)
      return adminApi<AdminProduct[]>(`/admin/products?${params}`)
    },
    initialPageParam: '',
    getNextPageParam: (page) => (page.length === PRODUCTS_PAGE ? page[page.length - 1].created_at : undefined),
  })
}

/** Hide a product from its shop; the seller can show it again. */
export function useHideProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string | null }) =>
      adminApi<AdminProduct>(`/admin/products/${id}/hide`, { method: 'POST', body: { reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products })
      queryClient.invalidateQueries({ queryKey: adminKeys.log })
    },
  })
}

/** Oak Order's own settings (D2B): the riel rate, the prices, the trial. */
export function useAdminSettings() {
  return useQuery({ queryKey: adminKeys.settings, queryFn: () => adminApi<AdminSettings>('/admin/settings') })
}

/** One Save for all of them (pick 11A); asks for the password again. */
export function useSaveSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Pick<AdminSettings, 'khr_per_usd' | 'month' | 'year' | 'trial_days'>) =>
      adminApi<AdminSettings>('/admin/settings', { method: 'PUT', body }),
    onSuccess: (settings) => {
      queryClient.setQueryData(adminKeys.settings, settings)
      queryClient.invalidateQueries({ queryKey: adminKeys.log })
    },
  })
}

/** The System page: fresh each visit, and every 30 seconds while open. */
export function useAdminSystem() {
  return useQuery({ queryKey: adminKeys.system, queryFn: () => adminApi<AdminSystem>('/admin/system'), staleTime: 0, refetchInterval: 30_000 })
}

/** Run a job now (part 25), as cron-job.org would. */
export function useRunJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: 'billing' | 'reminders') => adminApi<{ sent: number }>(`/admin/jobs/${name}/run`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.system })
      queryClient.invalidateQueries({ queryKey: adminKeys.log })
    },
  })
}
