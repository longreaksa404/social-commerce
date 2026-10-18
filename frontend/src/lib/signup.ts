import { useEffect, useState } from 'react'
import type { PhoneCheck, SignupStart } from './types.ts'

// Someone new from Google, kept for the tab so /register/google survives
// a reload. The token in it works for 30 minutes.
const SIGNUP_KEY = 'sc.signup'

export function savedSignup(): SignupStart | null {
  try {
    const saved = sessionStorage.getItem(SIGNUP_KEY)
    return saved ? (JSON.parse(saved) as SignupStart) : null
  } catch {
    return null
  }
}

export function forgetSignup() {
  try {
    sessionStorage.removeItem(SIGNUP_KEY)
  } catch {
    // ignore
  }
}

export function saveSignup(signup: SignupStart) {
  try {
    sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(signup))
  } catch {
    // Private mode: the next page reads it from the navigation instead.
  }
}

// What a seller typed on Create your shop (or Set up your shop after
// Google, Facebook or TikTok), kept on this phone so coming back from
// Telegram to a reloaded page doesn't lose it (founder's pick 2A,
// 2026-10-18). localStorage, not sessionStorage: an in-app browser can
// drop the tab's storage while the seller is in Telegram. Never the
// password. 30 minutes, as long as a phone check works.
const DRAFT_MS = 30 * 60_000

export type SignupDraft = {
  store_name: string
  full_name: string
  /** The link the seller typed; null while it follows the shop name. */
  slug: string | null
  /** The phone check opened in Telegram, to pick up again. */
  check: PhoneCheck | null
  /** Set up your shop: the sign-up it belongs to. */
  token?: string
}

function loadDraft(key: string): SignupDraft | null {
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return null
    const { at, draft } = JSON.parse(saved) as { at: number; draft: SignupDraft }
    if (Date.now() - at > DRAFT_MS) {
      localStorage.removeItem(key)
      return null
    }
    // A check past its time can't be picked up; a new one starts.
    if (draft.check && Date.parse(draft.check.expires_at) <= Date.now()) draft.check = null
    return draft
  } catch {
    return null
  }
}

export function forgetDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** The draft saved under `key` when the page opened (only the one for
 * `token` on Set up your shop), or null. */
export function useSavedDraft(key: string, token?: string): SignupDraft | null {
  const [draft] = useState(() => {
    const saved = loadDraft(key)
    return saved && saved.token === token ? saved : null
  })
  return draft
}

/** Keeps `draft` saved under `key` as it changes; nothing typed, nothing kept. */
export function useKeepDraft(key: string, draft: SignupDraft) {
  const json = JSON.stringify(draft)
  useEffect(() => {
    const value = JSON.parse(json) as SignupDraft
    if (!value.store_name && !value.full_name && !value.slug && !value.check) {
      forgetDraft(key)
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), draft: value }))
    } catch {
      // Private mode or full: the page works as before, without the draft.
    }
  }, [key, json])
}
