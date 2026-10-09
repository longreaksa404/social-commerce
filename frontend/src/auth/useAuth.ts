import { createContext, use } from 'react'
import type { AccessToken } from '../lib/api.ts'

// 'unreachable': a stored session couldn't be restored because the server
// didn't answer (offline, or the API isn't running); not a logout.
export type Status = 'loading' | 'authenticated' | 'anonymous' | 'unreachable'

/** The phone number isn't typed: it's the one shared with the Telegram
 * bot, handed in as the phone check's id. */
export type RegisterInput = {
  store_name: string
  full_name: string
  password: string
  phone_check: string
}

type AuthValue = {
  status: Status
  restoreError: unknown
  retryRestore: () => void
  /** `login`: a phone number, or an older account's email. */
  login: (login: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  /** Logged in by another way than the login form (a password reset link). */
  startSession: (token: AccessToken) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
