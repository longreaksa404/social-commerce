import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api, ApiError } from '../lib/api.ts'
import type { PhoneCheck as Check } from '../lib/types.ts'

// The check is made ahead, so "Verify with Telegram" is a plain link: a
// phone browser blocks a new tab opened after waiting for a request. It
// works for 30 minutes; a fresh one is fetched before then.
const CHECK_REFRESH_MS = 20 * 60_000
// While the seller is off in Telegram, look for the number.
const POLL_MS = 2_500

/** The check behind "Verify with Telegram" (sign-up) and "Log in with
 * Telegram" (founder's test list #30, 2026-10-24): made ahead, read every
 * few seconds once the seller opened Telegram, until it has the number
 * (`done`). */
export function usePhoneCheck(resume: Check | null = null) {
  const [attempt, setAttempt] = useState(0)
  const [resumed, setResumed] = useState(resume)
  const [opened, setOpened] = useState(resume !== null)

  const created = useQuery({
    queryKey: ['phone-check', 'new', attempt],
    queryFn: () => api<Check>('/auth/phone-checks', { method: 'POST', auth: false }),
    enabled: resumed === null,
    staleTime: CHECK_REFRESH_MS,
    refetchInterval: opened ? false : CHECK_REFRESH_MS,
    retry: false,
  })
  const check = resumed ?? created.data
  const id = check?.id
  const read = useQuery({
    queryKey: ['phone-check', id],
    queryFn: () => api<Check>(`/auth/phone-checks/${id}`, { auth: false }),
    enabled: opened && id !== undefined,
    refetchInterval: (query) => (query.state.data?.phone ? false : POLL_MS),
    refetchOnWindowFocus: true,
    retry: false,
  })
  const done = read.data?.phone ? read.data : null

  function startOver() {
    setResumed(null)
    setOpened(false)
    setAttempt((n) => n + 1)
  }

  // Took longer than the check lasts (30 minutes): start again.
  const expired = read.error instanceof ApiError && read.error.code === 'PHONE_CHECK_EXPIRED'
  return { check, created, read, done, opened, setOpened, startOver, expired }
}

