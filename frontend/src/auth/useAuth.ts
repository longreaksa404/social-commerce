import { createContext, use } from 'react'

export type Status = 'loading' | 'authenticated' | 'anonymous'

export type RegisterInput = {
  email: string
  password: string
  full_name: string
  phone: string
  store_name: string
}

type AuthValue = {
  status: Status
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
