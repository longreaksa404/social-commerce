import { useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../lib/api.ts'
import { PasswordSheet } from './PasswordSheet.tsx'

/** The admin's password again before a critical action (01_PRODUCT.md
 * §22.11, founder 2026-10-28): the action is tried first; when the API
 * says PASSWORD_AGAIN, a sheet asks for the password, then the action is
 * tried again. Not again for 10 minutes in this browser.
 *
 * `guard(action)` resolves to the action's answer, or null when the admin
 * cancelled; other errors are thrown as usual. Render `sheet`. */
export function usePasswordAgain(): { guard: <T>(action: () => Promise<T>) => Promise<T | null>; sheet: ReactNode } {
  const [open, setOpen] = useState(false)
  const answer = useRef<(ok: boolean) => void>(() => {})

  async function guard<T>(action: () => Promise<T>): Promise<T | null> {
    try {
      return await action()
    } catch (error) {
      if (!(error instanceof ApiError && error.code === 'PASSWORD_AGAIN')) throw error
    }
    const ok = await new Promise<boolean>((resolve) => {
      answer.current = resolve
      setOpen(true)
    })
    return ok ? action() : null
  }

  function close(ok: boolean) {
    setOpen(false)
    answer.current(ok)
  }

  return { guard, sheet: <PasswordSheet open={open} onDone={close} /> }
}
