/** "Continue with Google" (founder's choice 2026-10-09). The OAuth client
 * ID from Google Cloud (VITE_GOOGLE_CLIENT_ID, the same as the API's
 * GOOGLE_CLIENT_ID; not a secret). Empty hides every Google button. */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()

/** The parts of Google Identity Services this app uses. */
export type GoogleId = {
  initialize: (config: {
    client_id: string
    callback: (response: { credential: string }) => void
    ux_mode?: 'popup' | 'redirect'
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      text?: 'signin_with' | 'signup_with' | 'continue_with'
      shape?: 'rectangular' | 'pill'
      logo_alignment?: 'left' | 'center'
      width?: number
      locale?: string
    },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let loading: Promise<GoogleId> | null = null

/** Google's script, loaded once, the first time a button needs it. */
export function loadGoogle(): Promise<GoogleId> {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      const id = window.google?.accounts.id
      if (id) resolve(id)
      else reject(new Error('Google sign-in did not load.'))
    }
    script.onerror = () => reject(new Error('Google sign-in did not load.'))
    document.head.append(script)
  }).catch((error: unknown) => {
    loading = null // offline: try again next time
    throw error
  })
  return loading
}
