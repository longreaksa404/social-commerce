import { createContext, use } from 'react'
import type { AccessToken } from '../lib/api.ts'

// 'unreachable': a stored session couldn't be restored because the server
// didn't answer; not a logout.
export type AdminStatus = 'loading' | 'in' | 'out' | 'unreachable'

type AdminSession = {
  status: AdminStatus
  restoreError: unknown
  retry: () => void
  /** After the Telegram step (or the first-time setup). */
  startSession: (token: AccessToken) => void
  logOut: () => Promise<void>
}

export const AdminSessionContext = createContext<AdminSession | null>(null)

/** The admin's own session (admin/session.tsx, AdminRoot). */
export function useAdminSession(): AdminSession {
  const value = use(AdminSessionContext)
  if (!value) throw new Error('useAdminSession must be used inside AdminRoot')
  return value
}
