import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageOutlet } from '../components/ui.tsx'
import { admin, adminApi, type AccessToken } from '../lib/api.ts'
import { adminKeys } from './queries.ts'
import { AdminSessionContext, type AdminStatus } from './useAdminSession.ts'

/** /admin: the admin's own session (01_PRODUCT.md §22.11, founder
 * 2026-10-28), apart from a shop's login: its own token, cookie and
 * cached data, so either can log out without the other. */
export function AdminRoot() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AdminStatus>(() => (admin.hasStoredSession() ? 'loading' : 'out'))
  const [restoreError, setRestoreError] = useState<unknown>(null)

  const restore = useCallback(() => {
    admin.refreshTokens().then(
      (ok) => setStatus(ok ? 'in' : 'out'),
      (error: unknown) => {
        setRestoreError(error)
        setStatus('unreachable')
      },
    )
  }, [])

  useEffect(() => {
    admin.setSessionEndedHandler(() => {
      queryClient.removeQueries({ queryKey: adminKeys.all })
      setStatus('out')
    })
    if (admin.hasStoredSession()) restore()
  }, [queryClient, restore])

  const retry = useCallback(() => {
    setStatus('loading')
    restore()
  }, [restore])

  const startSession = useCallback(
    (token: AccessToken) => {
      queryClient.removeQueries({ queryKey: adminKeys.all })
      admin.saveTokens(token)
      setStatus('in')
    },
    [queryClient],
  )

  const logOut = useCallback(async () => {
    if (admin.hasStoredSession()) {
      await adminApi('/admin/auth/logout', { method: 'POST', auth: false }).catch(() => {})
    }
    admin.clearTokens()
    queryClient.removeQueries({ queryKey: adminKeys.all })
    setStatus('out')
  }, [queryClient])

  const value = useMemo(
    () => ({ status, restoreError, retry, startSession, logOut }),
    [status, restoreError, retry, startSession, logOut],
  )
  return (
    <AdminSessionContext value={value}>
      <PageOutlet depth={2} />
    </AdminSessionContext>
  )
}
