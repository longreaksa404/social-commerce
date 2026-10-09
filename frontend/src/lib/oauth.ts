/** "Continue with Facebook" and "Continue with TikTok" (founder's choice
 * 2026-10-09). The browser goes to the provider's sign-in page and comes
 * back to /auth/<provider>/callback with a one-time code, which the API
 * trades for the account (it has the app's secret). The app ID / client
 * key below are public. Empty hides that provider's buttons. */
export const FACEBOOK_APP_ID = (import.meta.env.VITE_FACEBOOK_APP_ID ?? '').trim()
export const TIKTOK_CLIENT_KEY = (import.meta.env.VITE_TIKTOK_CLIENT_KEY ?? '').trim()
// The same Graph API version as the API (FACEBOOK_GRAPH in app/core/oauth.py).
const FACEBOOK_VERSION = 'v26.0'

export type OAuthProvider = 'facebook' | 'tiktok'
/** Signing in, or connecting the account in Settings → Your account. */
export type OAuthIntent = 'login' | 'connect'

export function oauthAvailable(provider: OAuthProvider): boolean {
  return provider === 'facebook' ? FACEBOOK_APP_ID !== '' : TIKTOK_CLIENT_KEY !== ''
}

/** The page the provider sends the browser back to. It must be listed in
 * the provider's app settings, exactly. */
export function callbackUrl(provider: OAuthProvider): string {
  return `${window.location.origin}/auth/${provider}/callback`
}

type Pending = { provider: OAuthProvider; state: string; intent: OAuthIntent; at: number }
const PENDING_KEY = 'sc.oauth'
// Longer than anyone takes on the provider's page.
const PENDING_MS = 15 * 60_000

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Off to the provider. `state` comes back with the code: only a sign-in
 * this tab started is finished (no one can slip their own code in). */
export function startOAuth(provider: OAuthProvider, intent: OAuthIntent) {
  const state = randomState()
  const pending: Pending = { provider, state, intent, at: Date.now() }
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {
    // Without it the callback can't check the state and will refuse.
  }
  const redirect = callbackUrl(provider)
  const url =
    provider === 'facebook'
      ? `https://www.facebook.com/${FACEBOOK_VERSION}/dialog/oauth?` +
        new URLSearchParams({
          client_id: FACEBOOK_APP_ID,
          redirect_uri: redirect,
          state,
          response_type: 'code',
          scope: 'public_profile,email',
        })
      : 'https://www.tiktok.com/v2/auth/authorize/?' +
        new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          response_type: 'code',
          scope: 'user.info.basic',
          redirect_uri: redirect,
          state,
        })
  window.location.assign(url)
}

/** The sign-in this tab started, if `state` is its own and it's recent. */
export function pendingOAuth(provider: string | undefined, state: string | null): Pending | null {
  try {
    const saved = sessionStorage.getItem(PENDING_KEY)
    const pending = saved ? (JSON.parse(saved) as Pending) : null
    if (!pending || !state || pending.state !== state || pending.provider !== provider) return null
    return Date.now() - pending.at < PENDING_MS ? pending : null
  } catch {
    return null
  }
}

/** Done with it (a code works once). */
export function forgetOAuth() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // ignore
  }
}

/** Brand names: the same in every language. */
export const PROVIDER_NAMES = { google: 'Google', facebook: 'Facebook', tiktok: 'TikTok' } as const
