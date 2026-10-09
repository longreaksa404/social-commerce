import type { SignupStart } from './types.ts'

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
