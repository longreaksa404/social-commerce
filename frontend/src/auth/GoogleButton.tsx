import { useEffect, useRef, useState } from 'react'
import { useLang, useT } from '../i18n/useT.ts'
import { GOOGLE_CLIENT_ID, loadGoogle } from '../lib/google.ts'

// Google draws its button between 200 and 400 px wide.
const MAX_WIDTH = 400

/** Google's own "Continue with Google" button (its look is Google's
 * rule), as wide as the form; or, with `icon`, its square "G" (40 px) for
 * the row of logos under the sign-up and log-in forms. `onCredential` gets
 * the ID token for the API. Nothing when Google sign-in isn't set up.
 * When Google's script doesn't load, the wide button says so under
 * itself; the icon calls `onUnavailable` and leaves the row. */
export function GoogleButton({
  onCredential,
  icon = false,
  onUnavailable,
}: {
  onCredential: (credential: string) => void
  icon?: boolean
  onUnavailable?: () => void
}) {
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
        id.renderButton(
          parent,
          icon
            ? { type: 'icon', theme: 'outline', size: 'large', shape: 'square', locale: lang }
            : {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                logo_alignment: 'center',
                width: Math.min(parent.offsetWidth, MAX_WIDTH),
                locale: lang,
              },
        )
      },
      () => {
        if (cancelled) return
        setFailed(true)
        onUnavailable?.()
      },
    )
    return () => {
      cancelled = true
    }
  }, [lang, icon, onUnavailable])

  if (!GOOGLE_CLIENT_ID) return null
  // Google's button keeps its size while it loads.
  if (icon) return failed ? null : <div ref={box} className="size-10" />
  return (
    <div>
      <div ref={box} className="flex min-h-11 justify-center" />
      {failed && <p className="mt-1.5 text-center text-sm text-slate-500">{t.auth.social.unavailable}</p>}
    </div>
  )
}
