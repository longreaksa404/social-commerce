import { useEffect, useRef, useState } from 'react'
import { useLang, useT } from '../i18n/useT.ts'
import { GOOGLE_CLIENT_ID, loadGoogle } from '../lib/google.ts'

// Google draws its button between 200 and 400 px wide.
const MAX_WIDTH = 400

/** Google's own "Continue with Google" button (its look is Google's
 * rule), as wide as the form. `onCredential` gets the ID token for the
 * API. Nothing when Google sign-in isn't set up. */
export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const latest = useRef(onCredential)
  const [failed, setFailed] = useState(false)
  const { lang } = useLang()
  const t = useT()

  useEffect(() => {
    latest.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false
    loadGoogle().then(
      (id) => {
        const parent = box.current
        if (cancelled || !parent) return
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => latest.current(response.credential),
          ux_mode: 'popup',
        })
        id.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(parent.offsetWidth, MAX_WIDTH),
          locale: lang,
        })
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [lang])

  if (!GOOGLE_CLIENT_ID) return null
  return (
    <div>
      {/* Google's button keeps 44 px of height while it loads. */}
      <div ref={box} className="flex min-h-11 justify-center" />
      {failed && <p className="mt-1.5 text-center text-sm text-slate-500">{t.auth.google.unavailable}</p>}
    </div>
  )
}
