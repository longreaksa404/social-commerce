import { createContext, use } from 'react'

export type ToastTone = 'success' | 'error'
export type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

type Feedback = {
  /** Short message shown briefly at the top of the screen. */
  toast: (message: string, tone?: ToastTone) => void
  /** Ask before something destructive; resolves true if confirmed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

export const FeedbackContext = createContext<Feedback | null>(null)

export function useFeedback(): Feedback {
  const value = use(FeedbackContext)
  if (!value) throw new Error('useFeedback must be used inside FeedbackProvider')
  return value
}
