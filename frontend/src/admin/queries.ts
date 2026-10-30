import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/api.ts'
import type { AdminLogLine, AdminOverview, AdminShop, AdminShopDetail } from '../lib/types.ts'

/** The admin panel's data, on the admin's own session (`adminApi`), under
 * one key so logging out of the admin leaves a shop's login alone. */
export const adminKeys = {
  all: ['admin'] as const,
  me: ['admin', 'me'] as const,
  overview: ['admin', 'overview'] as const,
  shops: ['admin', 'shops'] as const,
  shop: (id: string) => ['admin', 'shops', id] as const,
  log: ['admin', 'log'] as const,
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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { period: 'month' | 'year'; amount: string | null; note: string | null }) =>
      adminApi<AdminShopDetail>(`/admin/shops/${id}/payments`, { method: 'POST', body }),
    onSuccess: (shop) => {
      queryClient.setQueryData(adminKeys.shop(id), shop)
      queryClient.invalidateQueries({ queryKey: adminKeys.shops, exact: true })
      queryClient.invalidateQueries({ queryKey: adminKeys.overview })
      queryClient.invalidateQueries({ queryKey: adminKeys.log })
    },
  })
}

/** The founder checks a seller's "I've paid": found (paid, with the
 * amount found if different) or not (the seller sees the note). */
export function useCheckClaim(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, found, amount, note }: { paymentId: string; found: boolean; amount?: string | null; note: string | null }) =>
      adminApi<AdminShopDetail>(`/admin/shops/${storeId}/payments/${paymentId}/${found ? 'confirm' : 'reject'}`, {
        method: 'POST',
        body: found ? { amount: amount ?? null, note } : { note },
      }),
    onSuccess: (shop) => {
      queryClient.setQueryData(adminKeys.shop(storeId), shop)
      queryClient.invalidateQueries({ queryKey: adminKeys.shops, exact: true })
      queryClient.invalidateQueries({ queryKey: adminKeys.overview })
      queryClient.invalidateQueries({ queryKey: adminKeys.log })
    },
  })
}
