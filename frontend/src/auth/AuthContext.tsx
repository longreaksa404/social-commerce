import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  api,
  clearTokens,
  hasStoredSession,
  readActing,
  refreshTokens,
  saveTokens,
  setSessionEndedHandler,
  exitActing,
  type AccessToken,
} from '../lib/api.ts'

import { AuthContext, type RegisterInput, type Status } from './useAuth.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // Opened by the admin (D1A): signed in from the start with its token.
  const [acting] = useState(readActing)
  const [status, setStatus] = useState<Status>(() =>
    acting ? 'authenticated' : hasStoredSession() ? 'loading' : 'anonymous',
  )
  const [restoreError, setRestoreError] = useState<unknown>(null)

  // Restore the session after a reload: trade the refresh cookie
  // for a fresh access token. If the server can't be reached, say so (with
  // a retry) instead of spinning forever; the cookie stays.
  const restore = useCallback(() => {
    refreshTokens().then(
      (ok) => setStatus(ok ? 'authenticated' : 'anonymous'),
      (error: unknown) => {
        setRestoreError(error)
        setStatus('unreachable')
      },
    )
  }, [])

  const retryRestore = useCallback(() => {
    setStatus('loading')
    restore()
  }, [restore])

  useEffect(() => {
    // The admin's 30 minutes ran out: the bar says so (ActingBar).
    if (acting) return
    setSessionEndedHandler(() => {
      queryClient.clear()
      setStatus('anonymous')
    })
    if (hasStoredSession()) restore()
  }, [acting, queryClient, restore])

  const login = useCallback(async (login: string, password: string) => {
    saveTokens(await api<AccessToken>('/auth/login', { method: 'POST', body: { login, password }, auth: false }))
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    saveTokens(await api<AccessToken>('/auth/register', { method: 'POST', body: input, auth: false }))
    setStatus('authenticated')
  }, [])

  const startSession = useCallback(
    (token: AccessToken) => {
      queryClient.clear() // nothing left from whoever was logged in before
      saveTokens(token)
      setStatus('authenticated')
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    if (acting) return exitActing()
    if (hasStoredSession()) {
      // Best effort: the server revokes the cookie's token and drops the
      // cookie; we log out locally either way.
      await api('/auth/logout', { method: 'POST', auth: false }).catch(() => {})
    }
    clearTokens()
    queryClient.clear()
    setStatus('anonymous')
  }, [acting, queryClient])

  const value = useMemo(
    () => ({ status, restoreError, retryRestore, login, register, startSession, logout, acting }),
    [status, restoreError, retryRestore, login, register, startSession, logout, acting],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
