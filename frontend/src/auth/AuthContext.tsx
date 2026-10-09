import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  api,
  clearTokens,
  hasStoredSession,
  refreshTokens,
  saveTokens,
  setSessionEndedHandler,
  type AccessToken,
} from '../lib/api.ts'

import { AuthContext, type RegisterInput, type Status } from './useAuth.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>(() =>
    hasStoredSession() ? 'loading' : 'anonymous',
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
    setSessionEndedHandler(() => {
      queryClient.clear()
      setStatus('anonymous')
    })
    if (hasStoredSession()) restore()
  }, [queryClient, restore])

  const login = useCallback(async (email: string, password: string) => {
    saveTokens(await api<AccessToken>('/auth/login', { method: 'POST', body: { email, password }, auth: false }))
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
    if (hasStoredSession()) {
      // Best effort: the server revokes the cookie's token and drops the
      // cookie; we log out locally either way.
      await api('/auth/logout', { method: 'POST', auth: false }).catch(() => {})
    }
    clearTokens()
    queryClient.clear()
    setStatus('anonymous')
  }, [queryClient])

  const value = useMemo(
    () => ({ status, restoreError, retryRestore, login, register, startSession, logout }),
    [status, restoreError, retryRestore, login, register, startSession, logout],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
