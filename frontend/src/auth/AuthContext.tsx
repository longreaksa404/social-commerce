import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  api,
  clearTokens,
  hasStoredSession,
  readRefreshToken,
  refreshTokens,
  saveTokens,
  setSessionEndedHandler,
  type TokenPair,
} from '../lib/api.ts'

import { AuthContext, type RegisterInput, type Status } from './useAuth.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>(() =>
    hasStoredSession() ? 'loading' : 'anonymous',
  )
  const [restoreError, setRestoreError] = useState<unknown>(null)

  // Restore the session after a reload: trade the stored refresh token
  // for a fresh access token. If the server can't be reached, say so (with
  // a retry) instead of spinning forever; the tokens stay stored.
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
    saveTokens(await api<TokenPair>('/auth/login', { method: 'POST', body: { email, password }, auth: false }))
    setStatus('authenticated')
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    saveTokens(await api<TokenPair>('/auth/register', { method: 'POST', body: input, auth: false }))
    setStatus('authenticated')
  }, [])

  const startSession = useCallback(
    (pair: TokenPair) => {
      queryClient.clear() // nothing left from whoever was logged in before
      saveTokens(pair)
      setStatus('authenticated')
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    const refreshToken = readRefreshToken()
    if (refreshToken) {
      // Best effort: the server revokes it; we log out locally either way.
      await api('/auth/logout', { method: 'POST', body: { refresh_token: refreshToken }, auth: false }).catch(
        () => {},
      )
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
