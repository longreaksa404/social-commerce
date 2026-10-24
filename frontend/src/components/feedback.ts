import { createContext, use } from 'react'
import { useT } from '../i18n/useT.ts'

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

/** Ask before removing something, even from a form that waits for Save
 * (founder's test list #14, 2026-10-24: "before remove something should
 * ask again first"). Resolves true for Remove. */
export function useAskRemove() {
  const { confirm } = useFeedback()
  const remove = useT().common.remove
  return (title: string) => confirm({ title, confirmLabel: remove, danger: true })
}
